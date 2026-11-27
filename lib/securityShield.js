/**
 * lib/securityShield.js
 * 🛡️ Enterprise Anti-SSRF, Origin IP Leak Prevention & Direct-IP Scanner Shield
 *
 * Bảo vệ VPS khỏi:
 * 1. Lộ IP gốc qua các route proxy (/api/proxy/m3u8, /media, /vtt, /vidsrc/hls, /ping-server, /phim-ngan/proxy-hls)
 * 2. Tấn công SSRF quét mạng nội bộ (127.0.0.1, 10.x, 172.16-31.x, 192.168.x, 169.254.169.254 Cloud Metadata, IPv6 nội bộ)
 * 3. Quét trực tiếp vào IP VPS (Shodan, Censys, FOFA, ZGrab, Masscan) không qua tên miền chính thức
 */

const dns = require('dns');
const net = require('net');
const crypto = require('crypto');

// Khóa bí mật nội bộ dùng để ký HMAC cho các URL được server tự động rewrite trong playlist m3u8
const PROXY_HMAC_SECRET = crypto
    .createHash('sha256')
    .update(String(process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_KEY || 'aphim-origin-shield-2026') + ':proxy-hmac')
    .digest();

// Danh sách tên miền chính thức của hệ thống (cho phép truy cập HTTP Host)
const ALLOWED_SITE_HOSTS = new Set([
    'aphim.store',
    'www.aphim.store',
    'aphim.io.vn',
    'www.aphim.io.vn',
    'localhost',
    '127.0.0.1',
    '[::1]'
]);

if (process.env.SITE_PUBLIC_URL) {
    try {
        const u = new URL(process.env.SITE_PUBLIC_URL);
        if (u.hostname) ALLOWED_SITE_HOSTS.add(u.hostname.toLowerCase());
    } catch (_) {}
}

// Danh sách các domain / dịch vụ thu thập IP (IP Logger, Webhook, Tunnel, Collaborator) bị cấm tuyệt đối
const BLOCKED_TRAP_DOMAINS = [
    'webhook.site',
    'requestbin.com',
    'pipedream.net',
    'ngrok.io',
    'ngrok-free.app',
    'ngrok.app',
    'trycloudflare.com',
    'burpcollaborator.net',
    'oastify.com',
    'oast.pro',
    'oast.live',
    'oast.site',
    'oast.online',
    'oast.fun',
    'oast.me',
    'interact.sh',
    'interactsh.com',
    'canarytokens.com',
    'canarytokens.org',
    'grabify.link',
    'iplogger.org',
    'iplogger.com',
    'iplogger.ru',
    '2no.co',
    'yip.su',
    'beeceptor.com',
    'hookbin.com',
    'requestcatcher.com',
    'smee.io',
    'localtunnel.me',
    'loca.lt',
    'serveo.net',
    'localhost.run',
    'pinggy.io',
    'playit.gg',
    'tailscale.com',
    'ts.net',
    'aphim.store',
    'aphim.io.vn',
    'trouble-free.net'
];

// Danh sách các root domain CDN phim, phụ đề, ảnh hợp lệ đã xác minh của hệ thống
const ALLOWED_UPSTREAM_DOMAINS = [
    // Nguồn phim & CDN chính
    'oncdn.vip',
    'tophim.vip',
    'vicdn.cc',
    'vsmov.com',
    'streamvsmov.com',
    'chophim.cc',
    'chophim.tv',
    'chophim.ink',
    'chophim.lat',
    'phimapi.com',
    'phimimg.com',
    'nguonc.com',
    'ophim1.com',
    'ophim.live',
    'ophim17.cc',
    'kkphim.vip',
    'kkphim.com',
    'kkphim1.com',
    'phim1280.tv',
    'kvp726.com',
    // Nguồn Song Ngữ / Sofaflix / VidSrc / Embed
    'onflixcdn.com',
    'edgecontent.site',
    'sofaflix.cam',
    'playembed.vip',
    'vidsrc.sh',
    'vidsrc.me',
    'vidsrc.to',
    'vidsrc.xyz',
    'vidsrc.net',
    'stellarconductornexus.com',
    // Nguồn Phim Ngắn & Drama CDN
    'narto-drama.com',
    'nartodrama-api.online',
    'allshorts.net',
    'vietshort.com',
    'stardust-tv.com',
    'stardusttv.cc',
    'shorttv.live',
    'flextv.cc',
    'netshort.com',
    'goodreels.com',
    'playlet.com',
    'miniepisode.media',
    'nsstorage.space',
    'cdreader.com',
    'cubetv.cc',
    'bilitv.com',
    'vyntagetv.com',
    'mydramawave.com',
    'crazymaplestudios.com',
    'idrama.video',
    'saros-tv.com',
    'kdramaworlds.com',
    'guphimz.com',
    'fffgood.com',
    // Cloud Storage & Global Video CDNs
    'r2.dev',
    'cloudflarestorage.com',
    'cloudfront.net',
    'tiktokcdn.com',
    'tiktokcdn-us.com',
    'byteimg.com',
    'ibyteimg.com',
    'byteoversea.com',
    'akamaized.net',
    'akamaihd.net',
    'fastly.net',
    'bunnycdn.com',
    'b-cdn.net',
    'cdn.jsdelivr.net',
    'raw.githubusercontent.com',
    'ex-cdn.com',
    'upanhlaylink.com',
    'momocdn.net'
];

// Cho phép mở rộng qua biến môi trường ALLOWED_PROXY_DOMAINS (phân cách bằng dấu phẩy)
if (process.env.ALLOWED_PROXY_DOMAINS) {
    process.env.ALLOWED_PROXY_DOMAINS.split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean)
        .forEach(d => ALLOWED_UPSTREAM_DOMAINS.push(d));
}

// Mẫu regex cho các cụm CDN động của nguồn phim (ví dụ vip.ffzy-play9.com, vip.ffzy-play10.com, ...)
const ALLOWED_UPSTREAM_PATTERNS = [
    /(^|\.)ffzy-play\d*\.com$/i,
    /(^|\.)ffzyapi\.com$/i,
    /(^|\.)phimcdn[a-z0-9-]*\.(com|net|xyz|tv|cc|vip)$/i,
    /(^|\.)streamc\.(xyz|net|com)$/i,
    /(^|\.)opstream\d*\.(com|net|xyz)$/i,
    /(^|\.)kkphim[a-z0-9-]*\.(com|net|vip|cc)$/i,
    /(^|\.)ophim[a-z0-9-]*\.(com|net|live|cc|tv)$/i,
    /(^|\.)nguonc[a-z0-9-]*\.(com|net|cc|tv)$/i
];

// Bộ nhớ đệm các host CDN động đã được chính server xác thực (từ playlist m3u8 hoặc VidSrc resolver)
const trustedDynamicHosts = new Map(); // hostname -> expireTimestamp
const DYNAMIC_HOST_TTL_MS = 6 * 60 * 60 * 1000; // 6 giờ

// Bộ nhớ đệm kết quả kiểm tra DNS an toàn để không làm chậm luồng phát video (<1ms sau lần đầu)
const safeDnsCache = new Map(); // hostname -> { safe: boolean, ts: number, reason?: string }
const DNS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 phút

/**
 * Tạo chữ ký HMAC ngắn (16 ký tự hex) cho URL proxy được chính server sinh ra
 */
function signProxyUrl(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') return '';
    return crypto
        .createHmac('sha256', PROXY_HMAC_SECRET)
        .update(targetUrl.trim())
        .digest('hex')
        .slice(0, 16);
}

/**
 * Kiểm tra chữ ký HMAC của URL proxy
 */
function verifyProxyUrlSignature(targetUrl, sig) {
    if (!targetUrl || !sig || typeof sig !== 'string' || sig.length !== 16) return false;
    const expected = signProxyUrl(targetUrl);
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'));
    } catch (_) {
        return false;
    }
}

/**
 * Ghi nhận một hostname CDN động là đáng tin cậy (chỉ gọi từ luồng xử lý nội bộ của server)
 */
function trustUpstreamHost(urlOrHost) {
    if (!urlOrHost) return;
    try {
        const hostname = urlOrHost.includes('://')
            ? new URL(urlOrHost).hostname.toLowerCase()
            : String(urlOrHost).toLowerCase().trim();
        if (!hostname || net.isIP(hostname) !== 0) return;
        if (isTrapDomain(hostname)) return;
        if (trustedDynamicHosts.size > 1000) {
            const oldest = trustedDynamicHosts.keys().next().value;
            trustedDynamicHosts.delete(oldest);
        }
        trustedDynamicHosts.set(hostname, Date.now() + DYNAMIC_HOST_TTL_MS);
    } catch (_) {}
}

/**
 * Kiểm tra IP (IPv4 hoặc IPv6) có phải là IP nội bộ, loopback, link-local, metadata, hoặc IP của chính VPS không
 */
function isPrivateOrReservedIp(ip) {
    if (!ip || typeof ip !== 'string') return true;
    const cleanIp = ip.trim().toLowerCase().replace(/^\[|\]$/g, '');

    // Chặn IP gốc của VPS để không thể tự gọi chính mình (loopback qua public IP)
    if (cleanIp === '64.20.62.71' || (process.env.VPS_PUBLIC_IP && cleanIp === process.env.VPS_PUBLIC_IP.trim())) {
        return true;
    }

    // Xử lý IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (cleanIp.startsWith('::ffff:')) {
        const v4Part = cleanIp.slice(7);
        if (net.isIPv4(v4Part)) return isPrivateOrReservedIp(v4Part);
    }

    if (net.isIPv4(cleanIp)) {
        const parts = cleanIp.split('.').map(Number);
        if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return true;
        const [a, b, c] = parts;

        if (a === 0) return true;                                  // 0.0.0.0/8 (Current network)
        if (a === 10) return true;                                 // 10.0.0.0/8 (Private LAN)
        if (a === 127) return true;                                // 127.0.0.0/8 (Loopback)
        if (a === 169 && b === 254) return true;                   // 169.254.0.0/16 (AWS/Cloud Metadata & Link-local)
        if (a === 172 && b >= 16 && b <= 31) return true;          // 172.16.0.0/12 (Private LAN / Docker)
        if (a === 192 && b === 168) return true;                   // 192.168.0.0/16 (Private LAN)
        if (a === 100 && b >= 64 && b <= 127) return true;         // 100.64.0.0/10 (Carrier-grade NAT / Tailscale)
        if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, 192.0.2.0/24 (TEST-NET)
        if (a === 198 && (b === 18 || b === 19)) return true;      // 198.18.0.0/15 (Benchmarking)
        if (a === 198 && b === 51 && c === 100) return true;       // 198.51.100.0/24 (TEST-NET-2)
        if (a === 203 && b === 0 && c === 113) return true;        // 203.0.113.0/24 (TEST-NET-3)
        if (a >= 224) return true;                                 // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
        return false;
    }

    if (net.isIPv6(cleanIp)) {
        if (cleanIp === '::' || cleanIp === '::1') return true;
        if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true; // Unique Local (fc00::/7)
        if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true; // Link-local (fe80::/10)
        if (cleanIp.startsWith('ff')) return true; // Multicast (ff00::/8)
        if (cleanIp.startsWith('2001:db8:')) return true; // Documentation
        return false;
    }

    return true;
}

/**
 * Kiểm tra domain có nằm trong danh sách bẫy thu thập IP / Webhook không
 */
function isTrapDomain(hostname) {
    const h = String(hostname || '').toLowerCase().trim();
    if (!h) return true;
    for (const trap of BLOCKED_TRAP_DOMAINS) {
        if (h === trap || h.endsWith('.' + trap)) return true;
    }
    return false;
}

/**
 * Kiểm tra domain có nằm trong danh sách CDN nguồn phim/phụ đề được phép proxy không
 */
function isAllowedUpstreamDomain(hostname) {
    const h = String(hostname || '').toLowerCase().trim();
    if (!h) return false;
    if (isTrapDomain(h)) return false;

    // 1. Kiểm tra danh sách domain tĩnh
    for (const domain of ALLOWED_UPSTREAM_DOMAINS) {
        if (h === domain || h.endsWith('.' + domain)) {
            return true;
        }
    }

    // 2. Kiểm tra pattern các cụm CDN động
    for (const pattern of ALLOWED_UPSTREAM_PATTERNS) {
        if (pattern.test(h)) {
            return true;
        }
    }

    // 3. Kiểm tra danh sách host động đã được server xác thực trong phiên
    const dynamicExp = trustedDynamicHosts.get(h);
    if (dynamicExp && dynamicExp > Date.now()) {
        return true;
    }

    return false;
}

/**
 * Kiểm tra toàn diện một URL trước khi server thực hiện kết nối outbound (Chống SSRF & Chống rò rỉ IP VPS)
 * @param {string} rawUrl - URL cần kiểm tra
 * @param {object} [opts] - Tùy chọn: { sig: chữ ký HMAC nếu có, allowSignedDynamic: true }
 * @returns {Promise<{ safe: boolean, url?: string, parsed?: URL, reason?: string }>}
 */
async function validateSafeUpstreamUrl(rawUrl, opts = {}) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return { safe: false, reason: 'Missing URL' };
    }

    const trimmed = rawUrl.trim();
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch (_) {
        return { safe: false, reason: 'Malformed URL' };
    }

    // 1. Chỉ cho phép giao thức HTTP/HTTPS chuẩn
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, reason: 'Disallowed protocol' };
    }

    // 2. Cấm truyền thông tin xác thực user:pass@host trong URL
    if (parsed.username || parsed.password) {
        return { safe: false, reason: 'Credentials in URL not allowed' };
    }

    // 3. Chỉ cho phép cổng mặc định (80 / 443) để chặn các dịch vụ lắng nghe cổng lạ
    if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
        return { safe: false, reason: 'Non-standard port not allowed' };
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan')) {
        return { safe: false, reason: 'Local hostname not allowed' };
    }

    // 4. Cấm tuyệt đối truy cập trực tiếp bằng địa chỉ IP trần (IPv4, IPv6, số nguyên/hex IP)
    if (net.isIP(hostname) !== 0 || /^[0-9.]+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) {
        return { safe: false, reason: 'Direct IP literals are forbidden' };
    }

    // 5. Cấm tuyệt đối các dịch vụ IP Logger / Webhook / Tunnel
    if (isTrapDomain(hostname)) {
        return { safe: false, reason: 'Blocked webhook/trap domain' };
    }

    // 6. Kiểm tra Whitelist Domain hoặc chữ ký HMAC hợp lệ từ Server
    const hasValidSig = opts.sig && verifyProxyUrlSignature(trimmed, opts.sig);
    if (!hasValidSig && !isAllowedUpstreamDomain(hostname)) {
        return { safe: false, reason: `Untrusted upstream domain: ${hostname}` };
    }

    // Nếu có chữ ký HMAC hợp lệ từ server, tự động gia hạn host này vào bộ nhớ đệm động
    if (hasValidSig) {
        trustUpstreamHost(hostname);
    }

    // 7. Phân giải DNS và kiểm tra IP đích (Chống DNS Rebinding trỏ domain về 127.0.0.1 / 169.254.169.254 / IP VPS)
    const cachedDns = safeDnsCache.get(hostname);
    if (cachedDns && (Date.now() - cachedDns.ts < DNS_CACHE_TTL_MS)) {
        if (!cachedDns.safe) {
            return { safe: false, reason: cachedDns.reason || 'DNS resolved to restricted IP' };
        }
        return { safe: true, url: parsed.href, parsed };
    }

    try {
        const records = await dns.promises.lookup(hostname, { all: true });
        if (!records || records.length === 0) {
            return { safe: false, reason: 'DNS resolution failed' };
        }
        for (const rec of records) {
            if (isPrivateOrReservedIp(rec.address)) {
                safeDnsCache.set(hostname, { safe: false, ts: Date.now(), reason: 'DNS resolved to private/reserved IP' });
                return { safe: false, reason: 'DNS resolved to private/reserved IP' };
            }
        }
        if (safeDnsCache.size > 2000) {
            const oldestKey = safeDnsCache.keys().next().value;
            safeDnsCache.delete(oldestKey);
        }
        safeDnsCache.set(hostname, { safe: true, ts: Date.now() });
    } catch (_) {
        return { safe: false, reason: 'DNS lookup failed' };
    }

    return { safe: true, url: parsed.href, parsed };
}

/**
 * Middleware chặn truy cập trực tiếp bằng IP VPS (Chống Shodan / Censys / FOFA / Bot quét IP gốc)
 * Nếu ai đó gọi http://64.20.62.71 (Host header là IP hoặc domain lạ), ngắt kết nối ngay lập tức,
 * tuyệt đối không trả về giao diện hay dấu hiệu nhận diện của APhim.
 */
function originIpShieldMiddleware(req, res, next) {
    const rawHost = String(req.headers.host || '').trim().toLowerCase();
    const hostWithoutPort = rawHost.replace(/:\d+$/, '');

    // Cho phép truy cập nội bộ trên máy chủ / môi trường dev (localhost, 127.0.0.1)
    const remoteIp = String(req.socket?.remoteAddress || '').toLowerCase();
    const isLocalLoopback =
        remoteIp === '127.0.0.1' ||
        remoteIp === '::1' ||
        remoteIp === '::ffff:127.0.0.1';

    if (isLocalLoopback && (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1')) {
        return next();
    }

    // 1. Nếu truy cập bằng IP trần (ví dụ http://64.20.62.71) hoặc thiếu Host hoặc Host không thuộc APhim:
    const isDirectIpHost = net.isIP(hostWithoutPort.replace(/^\[|\]$/g, '')) !== 0 || /^[0-9.]+$/.test(hostWithoutPort);
    const isAllowedHost = ALLOWED_SITE_HOSTS.has(hostWithoutPort) || hostWithoutPort.endsWith('.aphim.store') || hostWithoutPort.endsWith('.aphim.io.vn');

    if (!hostWithoutPort || isDirectIpHost || !isAllowedHost) {
        // Ngắt thẳng socket hoặc trả mã 403 trống không kèm bất kỳ thông tin nhận diện nào của APhim
        res.status(403).set('Connection', 'close').end();
        return;
    }

    // 2. Nếu bật chế độ bắt buộc chỉ nhận traffic qua Cloudflare (ENFORCE_CLOUDFLARE_ONLY=true)
    if (process.env.ENFORCE_CLOUDFLARE_ONLY === 'true' && !isLocalLoopback) {
        const hasCfHeaders = Boolean(req.headers['cf-ray'] && req.headers['cf-connecting-ip']);
        if (!hasCfHeaders) {
            res.status(403).set('Connection', 'close').end();
            return;
        }
    }

    next();
}

module.exports = {
    signProxyUrl,
    verifyProxyUrlSignature,
    trustUpstreamHost,
    isPrivateOrReservedIp,
    isTrapDomain,
    isAllowedUpstreamDomain,
    validateSafeUpstreamUrl,
    originIpShieldMiddleware
};
