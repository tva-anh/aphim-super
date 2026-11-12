
// 🌟 DANH SÁCH 24 BỘ PHIM MỚI NHẤT ĐƯỢC GHIM ĐẦU TRANG 1
const PINNED_BILINGUAL_SLUGS = [
    'viec-ma-luong-quai',
    'bac-si-x-mafia-ao-trang',
    '100-ngay-doi-tra',
    'buoc-vao-tim-em',
    'giua-nhung-buoc-chan',
    'nap-day-trai-tim',
    'keo-ngot-tinh-yeu',
    'tai-phiet-va-canh-sat-phan-2',
    'sep-chinh-la-than-tuong',
    'trung-so-doc-dac-van-phai-di-lam',
    'ga-kim-thoa',
    'thuong-cong-chua',
    'mi-anh-than-bo',
    'ban-gai-thien-tai',
    'khong-the-thay-the-2026',
    'tieu-thanh-luong-phuong',
    'ngu-dinh-dao',
    'vision-truy-tim-ban-nga',
    'vung-dat-quy-du-2026',
    'quy-quyet-ranh-gioi-vo-dinh',
    'carrie-2026',
    'tau-buon-nguoi-2026',
    'tieng-yeu-nay-anh-dich-duoc-khong',
    'dac-vu-kim-tai-khoi-dong',
    'tinh-yeu-doc-nhat'
];

// 🌟 METADATA TẬP & NGÔN NGỮ CHUẨN XÁC CHO PHIM SONG NGỮ
const BILINGUAL_EPISODE_METADATA = {
    'viec-ma-luong-quai': { ep: 'Hoàn Tất (8/8)', lang: 'Vietsub + Thuyết Minh', avail: ['PD:8', 'SN', 'TM:8'] },
    'bac-si-x-mafia-ao-trang': { ep: 'Tập 8', lang: 'Vietsub + Thuyết Minh', avail: ['PD:8', 'SN:4', 'TM:8'] },
    '100-ngay-doi-tra': { ep: 'Tập 8', lang: 'Vietsub + Thuyết Minh', avail: ['PD:8', 'SN:8', 'TM:8'] },
    'buoc-vao-tim-em': { ep: 'Tập 12', lang: 'Vietsub', avail: ['PD:12', 'SN'] },
    'giua-nhung-buoc-chan': { ep: 'Tập 10', lang: 'Vietsub', avail: ['PD:10', 'SN'] },
    'nap-day-trai-tim': { ep: 'Hoàn Tất (10/10)', lang: 'Vietsub + Thuyết Minh', avail: ['PD:10', 'SN:10', 'TM:10'] },
    'keo-ngot-tinh-yeu': { ep: 'Hoàn Tất (12/12)', lang: 'Vietsub + Lồng Tiếng', avail: ['PD:12', 'SN:12', 'LT:12'] },
    'tai-phiet-va-canh-sat-phan-2': { ep: 'Tập 14', lang: 'Vietsub + Thuyết Minh', avail: ['PD:14', 'SN:14', 'TM:14'] },
    'sep-chinh-la-than-tuong': { ep: 'Tập 12', lang: 'Vietsub + Thuyết Minh', avail: ['PD:12', 'SN:12', 'TM:12'] },
    'trung-so-doc-dac-van-phai-di-lam': { ep: 'Tập 10', lang: 'Vietsub + Thuyết Minh', avail: ['PD:10', 'SN:10', 'TM:10'] },
    'ga-kim-thoa': { ep: 'Tập 30', lang: 'Vietsub + Thuyết Minh', avail: ['PD:27', 'SN:18', 'TM:27'] },
    'thuong-cong-chua': { ep: 'Tập 25', lang: 'Vietsub + Thuyết Minh + Lồng Tiếng', avail: ['PD:25', 'SN:25', 'TM:25', 'LT:25'] },
    'mi-anh-than-bo': { ep: 'Tập 30', lang: 'Vietsub + Thuyết Minh', avail: ['PD:30', 'SN:30', 'TM:30'] },
    'ban-gai-thien-tai': { ep: 'Hoàn Tất (28/28)', lang: 'Vietsub + Thuyết Minh', avail: ['PD:28', 'SN:28', 'TM:28'] },
    'khong-the-thay-the-2026': { ep: 'Tập 20', lang: 'Vietsub + Thuyết Minh', avail: ['PD:20', 'SN:20', 'TM:20'] },
    'tieu-thanh-luong-phuong': { ep: 'Tập 28', lang: 'Vietsub + Thuyết Minh', avail: ['PD:28', 'SN:28', 'TM:28'] },
    'ngu-dinh-dao': { ep: 'Hoàn Tất (32/32)', lang: 'Vietsub + Thuyết Minh', avail: ['PD:32', 'SN:32', 'TM:32'] },
    'vision-truy-tim-ban-nga': { ep: 'Tập 7', lang: 'Vietsub', avail: ['PD:7', 'SN:7'] },
    'vung-dat-quy-du-2026': { ep: 'Hoàn Tất (1/1)', lang: 'Vietsub', avail: ['PD:Full', 'SN'] },
    'quy-quyet-ranh-gioi-vo-dinh': { ep: 'Tập 1', lang: 'Vietsub + Thuyết Minh', avail: ['PD:1', 'SN:1', 'TM:1'] },
    'carrie-2026': { ep: 'Tập 8', lang: 'Vietsub', avail: ['PD:8', 'SN:8'] },
    'tau-buon-nguoi-2026': { ep: 'Tập 1', lang: 'Vietsub', avail: ['PD:1', 'SN'] },
    'tieng-yeu-nay-anh-dich-duoc-khong': { ep: 'Hoàn tất (12/12)', lang: 'Vietsub + Lồng Tiếng', avail: ['PD:12', 'SN:12', 'LT:12'] },
    'dac-vu-kim-tai-khoi-dong': { ep: 'Hoàn tất (10/10)', lang: 'Vietsub + Thuyết Minh', avail: ['PD:10', 'SN:10', 'TM:10'] },
    'tinh-yeu-doc-nhat': { ep: 'Tập 2 / 12', lang: 'Song Ngữ (Việt-Hàn-Anh)', avail: ['PD:2', 'SN', 'TM:2'] }
};

function getMovieEpInfo(slug, name = '', item = null) {
    if (item && item.episode_current && !item.episode_current.toLowerCase().includes('song ngữ')) {
        return {
            ep: item.episode_current,
            lang: item.lang || 'Vietsub + Thuyết Minh',
            available_languages: item.available_languages || []
        };
    }
    if (BILINGUAL_EPISODE_METADATA[slug]) {
        return {
            ep: BILINGUAL_EPISODE_METADATA[slug].ep,
            lang: BILINGUAL_EPISODE_METADATA[slug].lang,
            available_languages: BILINGUAL_EPISODE_METADATA[slug].avail || []
        };
    }
    // Tự động phân tích theo tên hoặc slug
    const cleanName = (name + ' ' + slug).toLowerCase();
    const isSingle = cleanName.includes('2026') && (cleanName.includes('movie') || cleanName.includes('phim lẻ') || cleanName.includes('chiếu rạp'));
    if (isSingle) {
        return { ep: 'Full', lang: 'Vietsub + Thuyết Minh', available_languages: ['PD:Full', 'SN'] };
    }
    // Hash deterministically ra số tập từ 8 đến 24 tập cho phim bộ
    let hash = 0;
    for (let i = 0; i < slug.length; i++) hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    const epCounts = [8, 10, 12, 16, 20, 24];
    const epNum = epCounts[Math.abs(hash) % epCounts.length];
    return { ep: 'Tập ' + epNum, lang: 'Vietsub + Thuyết Minh', available_languages: ['PD:' + epNum, 'SN', 'TM:' + epNum] };
}

require('dotenv').config();
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Cloudflare R2 Credentials
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_SUBTITLES_BUCKET || 'aphim-subtitles';
const PUBLIC_DOMAIN = process.env.R2_SUBTITLES_PUBLIC_DOMAIN || 'https://pub-ab37deb7159143cba56caba0d6c322d3.r2.dev';

let s3Client = null;
let PutObjectCommand = null;
let HeadObjectCommand = null;

if (ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
    try {
        const s3Sdk = require('@aws-sdk/client-s3');
        const S3Client = s3Sdk.S3Client;
        PutObjectCommand = s3Sdk.PutObjectCommand;
        HeadObjectCommand = s3Sdk.HeadObjectCommand;
        s3Client = new S3Client({
            region: 'auto',
            endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: ACCESS_KEY_ID,
                secretAccessKey: SECRET_ACCESS_KEY,
            },
        });
        console.log('[Bilingual Service] Connected to Cloudflare R2 Bucket:', BUCKET_NAME);
    } catch (err) {
        console.warn('[Bilingual Service] R2 S3 Client disabled (module not found or error):', err.message);
    }
}

// ChoPhim Upstream Mirrors (Cập nhật domain chophim.cc đang hoạt động)
const CHOPHIM_MIRRORS = [
    'https://chophim.cc',
    'https://chophim.tv',
    'https://chophim.cam',
    'https://chophim.lat'
];

// In-memory cache for bilingual servers (TTL: 1 hour)
const bilingualCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
// Kết quả null (không tìm thấy) chỉ giữ 30 giây để sớm thử lại, tránh "dính" lâu khi Tophim rate-limit
const NULL_CACHE_TTL_MS = 30 * 1000;
// File dự phòng DUY NHẤT cho toàn bộ phim Song Ngữ (map theo slug), tự cập nhật khi lấy nguồn thành công
const BILINGUAL_FALLBACK_FILE = path.join(__dirname, '../data/bilingual_fallback.json');

/**
 * Nguồn Song Ngữ chỉ được coi là "sạch" khi là OnCDN hoặc ViCDN (video không dính sub hardcode).
 * PhimAPI (a.kvp726.com / kkphimplayer / phim1280.tv) và Playembed đều KHÔNG sạch.
 */
function hasCleanBilingualStream(server) {
    if (!server || !Array.isArray(server.server_data)) return false;
    return server.server_data.some((ep) => {
        const link = String((ep && ep.link_m3u8) || '');
        return link.includes('oncdn.vip') || link.includes('vicdn.cc');
    });
}

function isPhimApiStream(link) {
    const l = String(link || '');
    return l.includes('a.kvp726.com') || l.includes('kkphimplayer') || l.includes('phim1280.tv');
}

function persistBilingualFallbackFile(cleanSlug, server) {
    try {
        if (!server || !Array.isArray(server.server_data) || server.server_data.length === 0) return;
        const unproxify = (u) => {
            if (!u) return u;
            if (u.includes('/api/proxy/m3u8?url=') || u.includes('/api/proxy/vtt?url=')) {
                try { return decodeURIComponent(u.split('?url=')[1]); } catch (_) {}
            }
            return u;
        };
        const episodes = server.server_data.map(ep => ({
            name: ep.name,
            slug: ep.slug,
            link_m3u8: unproxify(ep.link_m3u8),
            link_embed: ep.link_embed || '',
            subtitles: (ep.subtitles || []).map(s => ({
                label: s.label || '',
                language: s.language || '',
                url: s.direct_url || unproxify(s.url)
            })).filter(s => s.url)
        }));
        let fallbackMap = {};
        if (fs.existsSync(BILINGUAL_FALLBACK_FILE)) {
            try { fallbackMap = JSON.parse(fs.readFileSync(BILINGUAL_FALLBACK_FILE, 'utf-8')) || {}; } catch (_) {}
        }
        fallbackMap[cleanSlug] = episodes;
        fs.writeFileSync(BILINGUAL_FALLBACK_FILE, JSON.stringify(fallbackMap, null, 2), 'utf-8');
        console.log(`[Bilingual Service] Fallback updated: ${cleanSlug} (${episodes.length} eps)`);
    } catch (e) {
        console.warn('[Bilingual Service] Fallback persist failed:', e.message);
    }
}

// ── Cache server Song Ngữ ra đĩa (gitignored) — restart không bị cold ──────────────
const BILINGUAL_SERVER_CACHE_FILE = path.join(__dirname, '../data/bilingual_server_cache.json');
const BILINGUAL_SERVER_CACHE_MAX = 500;
const BILINGUAL_SERVER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let bilingualServerCacheMap = null;
let bilingualServerCacheLoaded = false;
let bilingualServerCacheWriteTimer = null;

function loadBilingualServerCache() {
    if (bilingualServerCacheLoaded) return bilingualServerCacheMap;
    bilingualServerCacheLoaded = true;
    bilingualServerCacheMap = {};
    try {
        if (fs.existsSync(BILINGUAL_SERVER_CACHE_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(BILINGUAL_SERVER_CACHE_FILE, 'utf-8'));
            if (parsed && typeof parsed === 'object') bilingualServerCacheMap = parsed;
        }
    } catch (_) {
        bilingualServerCacheMap = {};
    }
    return bilingualServerCacheMap;
}

function persistBilingualServerCache(cleanSlug, server) {
    try {
        if (!cleanSlug || !server || !Array.isArray(server.server_data) || server.server_data.length === 0) return;
        const map = loadBilingualServerCache();
        map[cleanSlug] = { ts: Date.now(), server };
        const keys = Object.keys(map);
        if (keys.length > BILINGUAL_SERVER_CACHE_MAX) {
            keys.sort((a, b) => ((map[a] && map[a].ts) || 0) - ((map[b] && map[b].ts) || 0));
            for (const k of keys.slice(0, keys.length - BILINGUAL_SERVER_CACHE_MAX)) delete map[k];
        }
        if (bilingualServerCacheWriteTimer) clearTimeout(bilingualServerCacheWriteTimer);
        bilingualServerCacheWriteTimer = setTimeout(() => {
            try { fs.writeFileSync(BILINGUAL_SERVER_CACHE_FILE, JSON.stringify(map)); } catch (_) {}
        }, 800);
    } catch (_) {}
}

function readBilingualServerCache(cleanSlug) {
    try {
        const map = loadBilingualServerCache();
        const entry = map[cleanSlug];
        if (!entry || !entry.server || !Array.isArray(entry.server.server_data) || entry.server.server_data.length === 0) return null;
        if (Date.now() - (entry.ts || 0) > BILINGUAL_SERVER_CACHE_TTL_MS) return null;
        return entry.server;
    } catch (_) {
        return null;
    }
}

/**
 * Tải file subtitle (.vtt) từ nguồn và lưu vĩnh viễn lên Cloudflare R2
 */
async function uploadSubtitleToR2(slug, epSlug, lang, sourceUrl) {
    let fullSourceUrl = sourceUrl || '';
    if (fullSourceUrl && !fullSourceUrl.startsWith('http')) {
        fullSourceUrl = `${CHOPHIM_MIRRORS[0]}${fullSourceUrl.startsWith('/') ? '' : '/'}${fullSourceUrl}`;
    }
    if (!s3Client || !fullSourceUrl) return fullSourceUrl;
    sourceUrl = fullSourceUrl;

    const cleanEpSlug = (epSlug || 'tap-1').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanLang = (lang || 'sub').replace(/[^a-zA-Z0-9_-]/g, '');
    const r2Key = `subtitles/${slug}/${cleanEpSlug}_${cleanLang}.vtt`;
    const r2PublicUrl = `${PUBLIC_DOMAIN.replace(/\/$/, '')}/${r2Key}`;

    try {
        // 1. Kiểm tra xem file đã tồn tại trên R2 chưa (nếu đã có và dung lượng hợp lệ > 300B thì dùng lại)
        try {
            const head = await s3Client.send(new HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Key
            }));
            if (head && head.ContentLength && head.ContentLength > 300) {
                return r2PublicUrl;
            }
        } catch (headErr) {
            // File chưa tồn tại hoặc là file rác dummy, tiếp tục tải và upload
        }

        // 2. Tải nội dung phụ đề từ nguồn (hỗ trợ cả link tuyệt đối và tương đối)
        let downloadUrl = sourceUrl;
        if (!downloadUrl.startsWith('http')) {
            downloadUrl = `${CHOPHIM_MIRRORS[0]}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        };
        if (downloadUrl.includes('oncdn.vip') || downloadUrl.includes('tophim.vip')) {
            headers['Referer'] = 'https://tophim.vip/';
            headers['Origin'] = 'https://tophim.vip';
        }

        const subRes = await axios.get(downloadUrl, {
            timeout: 8000,
            responseType: 'text',
            headers
        });

        if (!subRes.data || typeof subRes.data !== 'string' || subRes.data.length < 100 || subRes.data.includes('Empty Subtitle')) {
            return sourceUrl;
        }

        // 3. Đẩy lên Cloudflare R2
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: r2Key,
            Body: subRes.data,
            ContentType: 'text/vtt; charset=utf-8',
            CacheControl: 'public, max-age=31536000, immutable'
        }));

        console.log(`[R2 Subtitle Saved] 🌟 ${slug} (${cleanEpSlug} - ${cleanLang}) -> ${r2PublicUrl}`);
        return r2PublicUrl;
    } catch (err) {
        console.warn(`[R2 Subtitle Upload Failed] ${r2Key}:`, err.message);
        return sourceUrl;
    }
}

/**
 * Trích xuất số phần (Season) từ slug hoặc tên phim để chặn đứng lỗi ghép nhầm Season 1 với Season 2
 */
function extractSeasonNumber(str) {
    const s = String(str || '').toLowerCase();
    const match = s.match(/(?:phan|season|ss|phần)\s*[-_]?\s*(\d+)/i) || s.match(/[-_](\d+)$/);
    return match ? parseInt(match[1], 10) : 1;
}

/**
 * Trích xuất năm sản xuất từ chuỗi
 */
function extractYearNumber(str) {
    const m = String(str || '').match(/\b(19\d{2}|20\d{2})\b/);
    return m ? parseInt(m[1], 10) : null;
}

// Danh sách alias đặc biệt giữa tên trên hệ thống và Tophim.vip
const KNOWN_TOPHIM_ALIASES = {
    '100-ngay-doi-tra': '100-ngay-lua-doi-phan-1',
    '100-ngay-lua-doi': '100-ngay-lua-doi-phan-1',
    'bac-si-x': 'bac-si-x-mafia-ao-trang',
    'bac-si-x-mafia-ao-trang': 'bac-si-x-mafia-ao-trang',
    'vision-truy-tim-ban-nga': 'visionquest',
    'vision-hanh-trinh-tim-lai-ky-uc': 'visionquest',
    'visionquest': 'visionquest'
};

/**
 * Danh sách ánh xạ định danh URL chuẩn giữa ChoPhim và Trang Chủ để SEO Canonical & 301 Redirect
 */
const { KNOWN_SLUG_ALIASES } = require('./bilingual-aliases');

function removeVietnameseDiacritics(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .trim();
}

function cleanAlphanumeric(str) {
    return removeVietnameseDiacritics(str).replace(/[^a-z0-9]/g, '');
}

function getCanonicalSlug(slug) {
    if (!slug) return slug;
    const clean = String(slug).trim().toLowerCase();
    return KNOWN_SLUG_ALIASES[clean] || clean;
}

/**
 * Tự động tìm slug tương ứng trên ChoPhim dựa trên slug, tên phim hoặc tên gốc tiếng Anh
 * Có rào chắn kiểm tra Season, Năm sản xuất và độ dài ký tự tránh ghép nhầm
 */
function resolveBilingualSlug(slug, name = '', originName = '', year = null, movieType = '', expectedEpCount = 0) {
    if (!slug) return slug;
    const cleanSlug = String(slug).trim().toLowerCase();
    const cleanName = cleanAlphanumeric(name);
    const cleanOrigin = cleanAlphanumeric(originName);
    const targetSeason = extractSeasonNumber(cleanSlug + ' ' + (name || ''));
    const targetYear = year ? parseInt(year, 10) : extractYearNumber(cleanSlug + ' ' + (name || '') + ' ' + (originName || ''));

    const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
    if (!fs.existsSync(catalogPath)) return cleanSlug;

    try {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        if (!Array.isArray(catalog)) return cleanSlug;

        // Rào chắn an toàn: Khớp Season, chênh lệch năm <= 1, đúng loại phim (Lẻ vs Bộ) và tên gốc không mâu thuẫn
        const isSafeCandidate = (m) => {
            const catSeason = extractSeasonNumber(m.slug + ' ' + (m.name || ''));
            if (targetSeason !== catSeason) return false;

            const catYear = m.year ? parseInt(m.year, 10) : extractYearNumber(m.slug + ' ' + (m.name || '') + ' ' + (m.origin_name || ''));
            if (targetYear && catYear && !isNaN(targetYear) && !isNaN(catYear) && Math.abs(targetYear - catYear) > 1) {
                return false;
            }

            const isTargetSingle = movieType === 'single' || movieType === 'movie' || expectedEpCount === 1;
            const isCatSeries = m.type === 'series' || (m.episode_current && /(\d+)\s*tập/i.test(m.episode_current) && parseInt(m.episode_current.match(/(\d+)/)?.[1] || 0) > 1);
            if (isTargetSingle && isCatSeries) {
                return false;
            }
            const isTargetSeries = movieType === 'series' || expectedEpCount > 1;
            if (isTargetSeries && m.type === 'single') {
                return false;
            }

            if (cleanOrigin && cleanOrigin.length >= 4 && m.origin_name) {
                const catOrigin = cleanAlphanumeric(m.origin_name);
                if (catOrigin && catOrigin.length >= 4) {
                    const matchOrg = catOrigin === cleanOrigin || catOrigin.includes(cleanOrigin) || cleanOrigin.includes(catOrigin);
                    if (!matchOrg) return false;
                }
            }

            return true;
        };

        // 1. Khớp chính xác 100% slug
        const exact = catalog.find(m => m.slug === cleanSlug);
        if (exact && isSafeCandidate(exact)) return exact.slug;

        // 2. Khớp slug không có đuôi năm (vd: anh-hung-2026 vs anh-hung)
        const cleanNoYear = cleanSlug.replace(/-(19|20)\d{2}$/, '');
        let match = catalog.find(m => {
            const mNoYear = (m.slug || '').replace(/-(19|20)\d{2}$/, '');
            return mNoYear === cleanNoYear && isSafeCandidate(m);
        });
        if (match) return match.slug;

        // 3. Khớp prefix / suffix an toàn (e.g. bac-si-x vs bac-si-x-mafia-ao-trang)
        match = catalog.find(m => {
            const isPrefix = m.slug.startsWith(cleanSlug + '-') || cleanSlug.startsWith(m.slug + '-');
            return isPrefix && isSafeCandidate(m);
        });
        if (match) return match.slug;

        // 4. Khớp theo Origin Name (Tên tiếng Anh TMDB / Quốc tế)
        if (cleanOrigin && cleanOrigin.length >= 5) {
            match = catalog.find(m => {
                const catOrigin = cleanAlphanumeric(m.origin_name);
                if (!catOrigin || catOrigin.length < 5) return false;
                const isMatch = catOrigin === cleanOrigin || (cleanOrigin.length >= 8 && (catOrigin.startsWith(cleanOrigin) || cleanOrigin.startsWith(catOrigin)));
                return isMatch && isSafeCandidate(m);
            });
            if (match) return match.slug;
        }

        // 5. Khớp theo Tên tiếng Việt - Chuẩn hóa có dấu đầy đủ, yêu cầu >= 6 ký tự
        if (cleanName && cleanName.length >= 6) {
            match = catalog.find(m => {
                const catName = cleanAlphanumeric(m.name);
                if (!catName || catName.length < 6) return false;
                const isMatch = catName === cleanName || (cleanName.length >= 10 && (catName.startsWith(cleanName) || cleanName.startsWith(catName)));
                return isMatch && isSafeCandidate(m);
            });
            if (match) return match.slug;
        }
    } catch (e) {}

    return cleanSlug;
}

/**
 * Tự động tìm nạp nguồn Song Ngữ từ ChoPhim API và đồng bộ Phụ đề lên R2
 */
async function getBilingualServer(slug, movieName = '', originName = '', year = null, movieType = '', expectedEpCount = 0) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();

    // 1. Kiểm tra Cache RAM cho slug này
    const cached = bilingualCache.get(cleanSlug);
    if (cached && (Date.now() - cached.ts < (cached.ttl || CACHE_TTL_MS))) {
        return cached.data;
    }

    // 2. Tìm slug tương ứng trên ChoPhim hoặc Tophim nếu có lệch định danh
    const targetSlug = resolveBilingualSlug(cleanSlug, movieName, originName, year, movieType, expectedEpCount);
    if (targetSlug !== cleanSlug) {
        const cachedTarget = bilingualCache.get(targetSlug);
        if (cachedTarget && (Date.now() - cachedTarget.ts < (cachedTarget.ttl || CACHE_TTL_MS))) {
            bilingualCache.set(cleanSlug, cachedTarget);
            return cachedTarget.data;
        }
    }

    // 2.5 Cache đĩa (gitignored) — restart không cold
    const diskServer = readBilingualServerCache(cleanSlug) || (targetSlug !== cleanSlug ? readBilingualServerCache(targetSlug) : null);
    if (diskServer) {
        bilingualCache.set(cleanSlug, { data: diskServer, ts: Date.now() });
        if (targetSlug !== cleanSlug) bilingualCache.set(targetSlug, { data: diskServer, ts: Date.now() });
        return diskServer;
    }

    // 3. 🚀 ƯU TIÊN SỐ 1 TUYỆT ĐỐI: Lấy nguồn OnCDN chất lượng cao từ Tophim.vip (Full HD 1080p, 36 thứ tiếng, bypass Anti-Leech)
    const cleanNoYear = cleanSlug.replace(/-(19|20)\d{2}$/, '');
    const targetNoYear = targetSlug.replace(/-(19|20)\d{2}$/, '');
    const candidateSlugs = [
        KNOWN_TOPHIM_ALIASES[cleanSlug],
        KNOWN_TOPHIM_ALIASES[targetSlug],
        KNOWN_TOPHIM_ALIASES[cleanNoYear],
        KNOWN_TOPHIM_ALIASES[targetNoYear],
        targetSlug,
        cleanSlug,
        cleanNoYear,
        targetNoYear,
        `${cleanSlug}-phan-1`,
        `${targetSlug}-phan-1`
    ].filter(Boolean);

    // 🧠 Tự động tìm kiếm thông minh theo Origin Name (Tên tiếng Anh TMDB) và Tên phim trong Catalog Tophim
    try {
        const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
        if (fs.existsSync(catalogPath)) {
            const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            const catItem = catalog.find(m => m.slug === cleanSlug || m.slug === targetSlug || m.slug === cleanNoYear || m.slug === targetNoYear);
            if (catItem) {
                if (catItem.source === 'tophim') candidateSlugs.unshift(catItem.slug);
                if (!originName && catItem.origin_name) originName = catItem.origin_name;
                if (!movieName && catItem.name) movieName = catItem.name;
            }
            const cleanOrg = cleanAlphanumeric(originName);
            const cleanNm = cleanAlphanumeric(movieName);
            const isTargetSingle = movieType === 'single' || movieType === 'movie' || expectedEpCount === 1;
            const tophimMovies = catalog.filter(m => m.source === 'tophim');
            for (const tm of tophimMovies) {
                if (isTargetSingle && tm.type === 'series') continue;
                if ((movieType === 'series' || expectedEpCount > 1) && tm.type === 'single') continue;

                const tOrg = cleanAlphanumeric(tm.origin_name);
                const tNm = cleanAlphanumeric(tm.name);

                if (cleanOrg && cleanOrg.length >= 5 && tOrg && tOrg.length >= 5) {
                    if (tOrg === cleanOrg || (cleanOrg.length >= 8 && (tOrg.startsWith(cleanOrg) || cleanOrg.startsWith(tOrg)))) {
                        candidateSlugs.push(tm.slug);
                    }
                } else if (cleanNm && cleanNm.length >= 6 && tNm && tNm.length >= 6) {
                    if (tNm === cleanNm || (cleanNm.length >= 10 && (tNm.startsWith(cleanNm) || cleanNm.startsWith(tNm)))) {
                        candidateSlugs.push(tm.slug);
                    }
                }
            }
        }
    } catch (e) {}

    // Thêm các biến thể slugify từ originName (ví dụ: 'Vision Quest' -> 'vision-quest', 'visionquest')
    if (originName) {
        const noSpace = originName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (noSpace) candidateSlugs.push(noSpace);
        const dashed = originName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (dashed) candidateSlugs.push(dashed);
    }

    // ⚡ Chạy SONG SONG tất cả slug tiềm năng + giới hạn 1800ms tổng thể
    // → Cold load tối đa 1.8s thay vì 9s worst case
    const { fetchTophimMovie } = require('./tophim.service');
    const isTargetSingle = movieType === 'single' || movieType === 'movie' || expectedEpCount === 1;
    const slugsToTry = Array.from(new Set(candidateSlugs)).slice(0, 3);

    // Hàm thử 1 slug, trả về null nếu không hợp lệ
    const trySlug = async (s) => {
        try {
            const tophimData = await fetchTophimMovie(s);
            if (!tophimData || !tophimData.server || !Array.isArray(tophimData.server.server_data) || tophimData.server.server_data.length === 0) return null;
            const epLen = tophimData.server.server_data.length;
            if (isTargetSingle && epLen > 1) return null; // phim lẻ nhưng server bộ → bỏ
            if (expectedEpCount >= 4 && epLen === 1 && s !== cleanSlug && s !== targetSlug) return null; // phim bộ nhưng chỉ 1 tập → bỏ
            return { data: tophimData, fromSlug: s };
        } catch (_) { return null; }
    };

    // ⏱️ Overall timeout: nếu tất cả slug mất > 1800ms → bỏ qua, dùng catalog fallback ngay
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 1800));

    let winnerResult = null;
    try {
        // Promise.any lấy kết quả HỢP LỆ ĐẦU TIÊN (không chờ các slug khác fail)
        // Race với timeout 1800ms để đảm bảo luôn trả về trong vòng 2 giây
        const raceResult = await Promise.race([
            Promise.any(
                slugsToTry.map(s =>
                    trySlug(s).then(r => { if (!r) throw new Error('null'); return r; })
                )
            ).catch(() => null),
            timeoutPromise
        ]);
        winnerResult = raceResult;
    } catch (_) {}

    if (winnerResult) {
        const { data: tophimData, fromSlug: s } = winnerResult;
        if (!tophimData.server.server_name || !tophimData.server.server_name.toLowerCase().includes('song ngữ')) {
            tophimData.server.server_name = 'Song Ngữ (Việt-Hàn-Anh)';
        }
        if (!tophimData.server.original_server_name || !tophimData.server.original_server_name.toLowerCase().includes('song ngữ')) {
            tophimData.server.original_server_name = 'Song Ngữ (OnCDN)';
        }
        // ⚡ TỨC THÌ 0MS: Chuẩn bị URL phụ đề dùng ngay không làm nghẽn request
        tophimData.server.server_data.forEach((ep) => {
            if (Array.isArray(ep.subtitles)) {
                ep.subtitles.forEach((sub) => {
                    const sourceSub = sub.direct_url || sub.url;
                    if (sourceSub) {
                        sub.direct_url = sourceSub;
                        sub.url = `/api/proxy/vtt?url=${encodeURIComponent(sourceSub)}`;
                    }
                });
            }
        });

        // Sao lưu phụ đề .vtt lên Cloudflare R2 hoàn toàn trong nền (Background Async)
        setImmediate(async () => {
            try {
                for (const ep of tophimData.server.server_data) {
                    if (Array.isArray(ep.subtitles)) {
                        for (const sub of ep.subtitles) {
                            const sSub = sub.direct_url || sub.url;
                            if (sSub && sSub.startsWith('http') && !sSub.includes('r2.dev')) {
                                try {
                                    const r2Url = await uploadSubtitleToR2(cleanSlug, ep.slug || ep.name, sub.language || sub.label, sSub);
                                    if (r2Url && r2Url.startsWith('http')) {
                                        sub.direct_url = r2Url;
                                        sub.url = `/api/proxy/vtt?url=${encodeURIComponent(r2Url)}`;
                                    }
                                } catch (_) {}
                            }
                        }
                    }
                }
            } catch (_) {}
        });

        bilingualCache.set(cleanSlug, { data: tophimData.server, ts: Date.now() });
        persistBilingualFallbackFile(cleanSlug, tophimData.server);
        persistBilingualServerCache(cleanSlug, tophimData.server);
        console.log(`[Bilingual Service] ✅ Đã nạp thành công luồng OnCDN chính chủ từ Tophim (${s}) cho ${cleanSlug}`);
        return tophimData.server;
    }

    // 4. Fallback (Chỉ dùng khi Tophim không có): Kiểm tra catalog ChoPhim cũ cục bộ
    try {
        const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
        if (fs.existsSync(catalogPath)) {
            const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            const catItem = catalog.find(m => m.slug === cleanSlug || m.slug === targetSlug);
            if (catItem && Array.isArray(catItem.episodes) && catItem.episodes.length > 0) {
                const serverObj = {
                    server_name: "Song Ngữ (Việt-Hàn-Anh)",
                    original_server_name: "Song Ngữ",
                    server_data: catItem.episodes
                };
                bilingualCache.set(cleanSlug, { data: serverObj, ts: Date.now() });
                return serverObj;
            }
        }
    } catch (catErr) {}

    // 4. Fallback tức thì (0ms): đọc bản dự phòng trong file map chung, ưu tiên trước crawl mirror
    try {
        if (fs.existsSync(BILINGUAL_FALLBACK_FILE)) {
            const fallbackMap = JSON.parse(fs.readFileSync(BILINGUAL_FALLBACK_FILE, 'utf-8')) || {};
            const localData = fallbackMap[cleanSlug];
            if (Array.isArray(localData) && localData.length > 0) {
                const serverObj = {
                    server_name: "Song Ngữ (Việt-Hàn)",
                    original_server_name: "Song Ngữ (Việt-Hàn)",
                    server_data: localData.map(e => ({
                        ...e,
                        link_m3u8: `/api/proxy/m3u8?url=${encodeURIComponent(e.link_m3u8)}`,
                        subtitles: (e.subtitles || []).map(s => ({
                            ...s,
                            url: `/api/proxy/vtt?url=${encodeURIComponent(s.url)}`
                        }))
                    }))
                };
                bilingualCache.set(cleanSlug, { data: serverObj, ts: Date.now() });
                return serverObj;
            }
        }
    } catch (e) {
        // ignore
    }

    // 4b. Fallback online: race tất cả slug × mirror, timeout tổng 2500ms
    let rawMovieData = null;
    try {
        const combos = [];
        for (const s of slugsToTry) {
            for (const mirror of CHOPHIM_MIRRORS) combos.push({ s, mirror });
        }
        const fetchCombo = async ({ s, mirror }) => {
            const apiUrl = `${mirror}/api/movie/${s}`;
            const res = await axios.get(apiUrl, {
                timeout: 2200,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (res.data && res.data.episodes && res.data.episodes.length > 0) {
                return { mirror, ...res.data };
            }
            return null;
        };
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
        rawMovieData = await Promise.race([
            Promise.any(combos.map(c => fetchCombo(c).then(r => {
                if (!r) throw new Error('empty');
                return r;
            }))).catch(() => null),
            timeoutPromise
        ]);
    } catch (_) {
        rawMovieData = null;
    }

    // 4c. Không có dữ liệu online lẫn cục bộ → ghi nhận null trong thời gian NGẮN để sớm thử lại
    if (!rawMovieData) {
        bilingualCache.set(cleanSlug, { data: null, ts: Date.now(), ttl: NULL_CACHE_TTL_MS });
        return null;
    }

    // 4. Tìm server có chứa phụ đề đa ngữ (Song Ngữ)
    const servers = rawMovieData.episodes || [];
    let targetServer = servers.find(s => {
        const sName = (s.server_name || '').toLowerCase();
        if (sName.includes('song ngữ')) return true;
        return (s.server_data || []).some(ep => ep.subtitles && ep.subtitles.length > 0);
    });

    if (!targetServer && servers.length > 0) {
        targetServer = servers.find(s => (s.server_data || []).some(ep => ep.subtitles && ep.subtitles.length > 0));
    }

    if (!targetServer) {
        bilingualCache.set(cleanSlug, { data: null, ts: Date.now(), ttl: NULL_CACHE_TTL_MS });
        return null;
    }

    // 5. Giữ nguyên tên server hiển thị gốc từ nguồn (Việt-Trung-Anh, Việt-Hàn, v.v.)
    let displayServerName = targetServer.server_name || '';
    if (!displayServerName.toLowerCase().includes('song ngữ')) {
        const langs = [];
        (targetServer.server_data || []).forEach(ep => {
            (ep.subtitles || []).forEach(sub => {
                const l = (sub.language || sub.label || '').toLowerCase();
                if ((l === 'vi' || l.includes('việt')) && !langs.includes('Việt')) langs.push('Việt');
                if ((l === 'zh' || l === 'cn' || l.includes('trung') || l.includes('hoa')) && !langs.includes('Trung')) langs.push('Trung');
                if ((l === 'en' || l.includes('anh')) && !langs.includes('Anh')) langs.push('Anh');
                if ((l === 'ko' || l.includes('hàn')) && !langs.includes('Hàn')) langs.push('Hàn');
                if ((l === 'ja' || l.includes('nhật')) && !langs.includes('Nhật')) langs.push('Nhật');
                if ((l === 'th' || l.includes('thái')) && !langs.includes('Thái')) langs.push('Thái');
            });
        });
        displayServerName = langs.length > 1 ? `Song Ngữ (${langs.join('-')})` : 'Song Ngữ';
    }

    // 6. Xử lý từng tập phim và đồng bộ phụ đề lên Cloudflare R2
    const mirrorBase = rawMovieData.mirror;
    const processedEpisodes = await Promise.all((targetServer.server_data || []).map(async (ep) => {
        // Link stream m3u8
        let m3u8Url = ep.link_m3u8 || '';
        if (m3u8Url && !m3u8Url.startsWith('http')) {
            m3u8Url = `${mirrorBase}${m3u8Url.startsWith('/') ? '' : '/'}${m3u8Url}`;
        }
        const proxyM3u8 = m3u8Url ? `/api/proxy/m3u8?url=${encodeURIComponent(m3u8Url)}` : '';

        // ⚡ Phụ đề tức thì 0ms (Upload lên R2 trong nền, không bắt người dùng chờ)
        const subs = (ep.subtitles || []).map((sub) => {
            let rawSubUrl = sub.url || '';
            if (rawSubUrl && !rawSubUrl.startsWith('http')) {
                rawSubUrl = `${mirrorBase || CHOPHIM_MIRRORS[0]}${rawSubUrl.startsWith('/') ? '' : '/'}${rawSubUrl}`;
            }
            return {
                ...sub,
                url: `/api/proxy/vtt?url=${encodeURIComponent(rawSubUrl)}`,
                direct_url: rawSubUrl
            };
        });

        setImmediate(async () => {
            try {
                for (const sub of subs) {
                    if (sub.direct_url && sub.direct_url.startsWith('http') && !sub.direct_url.includes('r2.dev')) {
                        try {
                            const r2Url = await uploadSubtitleToR2(cleanSlug, ep.slug || ep.name, sub.language || sub.label, sub.direct_url);
                            if (r2Url && r2Url.startsWith('http')) {
                                sub.direct_url = r2Url;
                                sub.url = `/api/proxy/vtt?url=${encodeURIComponent(r2Url)}`;
                            }
                        } catch (_) {}
                    }
                }
            } catch (_) {}
        });

        return {
            name: ep.name || 'Full',
            slug: ep.slug || 'full',
            filename: ep.filename || ep.name,
            link_m3u8: proxyM3u8,
            link_embed: ep.link_embed || '',
            subtitles: subs
        };
    }));

    const resultServer = {
        server_name: displayServerName,
        original_server_name: targetServer.original_server_name || targetServer.server_name,
        server_data: processedEpisodes
    };

    bilingualCache.set(cleanSlug, { data: resultServer, ts: Date.now() });
    if (typeof targetSlug !== 'undefined' && targetSlug !== cleanSlug) {
        bilingualCache.set(targetSlug, { data: resultServer, ts: Date.now() });
    }
    persistBilingualFallbackFile(cleanSlug, resultServer);
    persistBilingualServerCache(cleanSlug, resultServer);
    return resultServer;
}

// In-memory cache for bilingual movie list (TTL: 15 mins)
const bilingualListCache = new Map();
const LIST_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Tải danh sách phim Song Ngữ theo phân trang từ ChoPhim (có tự động chuyển mirror nếu bị chặn)
 * @param {number} page 
 */
async function fetchBilingualMoviesPage(page = 1) {
    const pageNum = Math.max(1, parseInt(page) || 1);

    // 1. Kiểm tra cache RAM
    const cached = bilingualListCache.get(pageNum);
    if (cached && (Date.now() - cached.ts < LIST_CACHE_TTL_MS)) {
        return cached.data;
    }

    // 2. Ưu tiên đọc từ Catalog quét toàn diện (chứa đầy đủ tất cả trang & chuyên mục ChoPhim)
    const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
    if (fs.existsSync(catalogPath)) {
        try {
            const allCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            if (Array.isArray(allCatalog) && allCatalog.length > 0) {
                const pageSize = 16; // Chuẩn 16 phim/trang giống Tophim -> hiển thị trọn vẹn 64+ trang (1.238+ phim)
                const totalPages = Math.ceil(allCatalog.length / pageSize);
                const safePage = Math.min(pageNum, totalPages);
                const start = (safePage - 1) * pageSize;
                const items = allCatalog.slice(start, start + pageSize).map(m => {
                    const epInfo = getMovieEpInfo(m.slug, m.name, m);
                    return {
                        name: m.name,
                        origin_name: m.origin_name || m.name,
                        slug: m.slug,
                        poster_url: m.poster_url || m.thumb_url,
                        thumb_url: m.thumb_url || m.poster_url,
                        episode_current: m.episode_current || epInfo.ep,
                        is_song_ngu: true,
                        lang: m.lang || epInfo.lang,
                        available_languages: m.available_languages || epInfo.available_languages || []
                    };
                });
                const result = {
                    status: 'success',
                    items,
                    pagination: {
                        currentPage: safePage,
                        totalPages,
                        totalItems: allCatalog.length
                    }
                };
                bilingualListCache.set(pageNum, { data: result, ts: Date.now() });
                return result;
            }
        } catch (catErr) {
            console.warn('[Bilingual Service] Lỗi đọc bilingual_catalog.json:', catErr.message);
        }
    }

    let html = '';
    for (const mirror of CHOPHIM_MIRRORS) {
        try {
            const url = `${mirror}/phim-song-ngu?page=${pageNum}`;
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 8000
            });
            if (res.data && typeof res.data === 'string' && res.data.includes('movie-card')) {
                html = res.data;
                break;
            }
        } catch (err) {
            // Thử mirror tiếp theo
        }
    }

    if (!html) {
        console.warn(`[Bilingual Service] Không thể tải danh sách phim song ngữ trang ${pageNum} từ tất cả các mirror.`);
        return {
            status: 'error',
            items: [],
            pagination: { currentPage: pageNum, totalPages: 25, totalItems: 600 }
        };
    }

    // 2. Parse phim từ HTML
    const movies = [];
    const seenSlugs = new Set();
    const cardRegex = /<a class="movie-card[^"]*" href="\/phim\/([a-zA-Z0-9_-]+)">([\s\S]*?)<\/a>/gi;
    let m;

    while ((m = cardRegex.exec(html)) !== null) {
        const slug = m[1];
        const body = m[2];
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);

        // Name
        const nameMatch = body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || body.match(/alt="([^"]+)"/i);
        const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : slug;

        // Origin Name (English title)
        const originMatch = body.match(/<p class="[^"]*text-text-muted[^"]*">([\s\S]*?)<\/p>/i);
        const originName = originMatch ? originMatch[1].replace(/<[^>]+>/g, '').trim() : name;

        // Poster
        let poster = '';
        const srcSetMatch = body.match(/srcset="([^"]+)"/i) || body.match(/src="([^"]+)"/i);
        if (srcSetMatch) {
            const raw = srcSetMatch[1];
            const urlM = raw.match(/url=([^&"'\s]+)/);
            if (urlM) {
                poster = decodeURIComponent(urlM[1]);
            } else {
                poster = raw.split(',')[0].trim().split(' ')[0];
            }
        }

        // Bottom episode badges (e.g. PĐ. 10, TM. 10, LT. 10, Full)
        const episodeBadges = [];
        const badgeTagRegex = /(PĐ|TM|LT|Tập)[^<]*(?:<!--[\s\S]*?-->)?[^<]*<\/span>\s*<span[^>]*>\s*(\d+)/gi;
        let bm;
        while ((bm = badgeTagRegex.exec(body)) !== null) {
            const label = bm[1].toUpperCase();
            const val = bm[2];
            const badgeStr = `${label}. ${val}`;
            if (!episodeBadges.includes(badgeStr)) {
                episodeBadges.push(badgeStr);
            }
        }

        if (episodeBadges.length === 0) {
            if (/Full/i.test(body)) episodeBadges.push('Full');
        }

        movies.push({
            name,
            origin_name: originName || name,
            slug,
            poster_url: poster,
            thumb_url: poster,
            episode_current: episodeBadges.join(' ') || 'Song Ngữ',
            is_song_ngu: true,
            lang: m.lang || 'Vietsub'
        });
    }

    // 3. Phân tích tổng số trang từ pagination HTML (e.g. Trang 1 / 25)
    let totalPages = 25;
    const pageTotalMatch = html.match(/Trang[\s\S]*?\/\s*(?:<!--[\s\S]*?-->)?\s*(\d+)<\/span>/i) ||
                           html.match(/text-white\/90">\s*\/\s*(?:<!--[\s\S]*?-->)?\s*(\d+)/i);
    if (pageTotalMatch) {
        totalPages = parseInt(pageTotalMatch[1]) || 25;
    }

    const result = {
        status: 'success',
        items: movies,
        pagination: {
            currentPage: pageNum,
            totalPages: totalPages,
            totalItems: totalPages * 24
        }
    };

    bilingualListCache.set(pageNum, { data: result, ts: Date.now() });
    return result;
}

/**
 * Lấy toàn bộ thông tin phim (metadata + tất cả server bao gồm Song Ngữ) từ ChoPhim
 * Dùng khi phim là phim độc quyền Song Ngữ mà OPhim hay PhimAPI chưa có
 */
async function getBilingualFullMovie(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();

    // 🚀 0. ƯU TIÊN SỐ 1: Lấy trực tiếp từ Tophim.vip (Clean stream oncdn.vip 1080p, không dính hardsub)
    try {
        const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
        let movieName = '', originName = '', year = null;
        let catPoster = '', catThumb = '';
        if (fs.existsSync(catalogPath)) {
            const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            const targetSlug = resolveBilingualSlug(cleanSlug, '', '', null);
            const cleanNoYear = cleanSlug.replace(/-(19|20)\d{2}$/, '');
            const catItem = catalog.find(m => m.slug === cleanSlug || m.slug === targetSlug || m.slug === cleanNoYear);
            if (catItem) {
                movieName = catItem.name || '';
                originName = catItem.origin_name || '';
                year = catItem.year || null;
                const toAbs = u => (u && (u.startsWith('/img/') || u.startsWith('img/')) ? ('https://oncdn.vip/' + u.replace(/^\//, '')) : (u || ''));
                catPoster = toAbs(catItem.poster_url);
                catThumb = toAbs(catItem.thumb_url);
            }
        }
        let tophimServer = await getBilingualServer(cleanSlug, movieName, originName, year);
        // 🛡️ Chỉ nhận nguồn Song Ngữ SẠCH (OnCDN/ViCDN). Nguồn Playembed/PhimAPI dính sub hardcode → bỏ, không gắn vào.
        if (tophimServer && !hasCleanBilingualStream(tophimServer)) {
            console.log(`[Bilingual Service] ⏭️ Bỏ nguồn Song Ngữ dính hardsub (không có OnCDN/ViCDN) cho ${cleanSlug}`);
            tophimServer = null;
        }
        if (tophimServer && Array.isArray(tophimServer.server_data) && tophimServer.server_data.length > 0) {
            // 🌟 Tự động nạp đầy đủ metadata & nội dung phim từ PhimAPI / OPhim
            let refEpisodes = [];
            let refMovie = null;
            try {
                const pRes = await axios.get(`https://phimapi.com/phim/${cleanSlug}`, { timeout: 1200, headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (pRes.data) {
                    if (pRes.data.episodes) refEpisodes = pRes.data.episodes;
                    if (pRes.data.movie) refMovie = pRes.data.movie;
                }
            } catch (_) {}
            if (refEpisodes.length === 0 || !refMovie) {
                try {
                    const oRes = await axios.get(`https://ophim1.com/phim/${cleanSlug}`, { timeout: 1200, headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (oRes.data) {
                        if (oRes.data.episodes && refEpisodes.length === 0) refEpisodes = oRes.data.episodes;
                        if (oRes.data.movie && !refMovie) refMovie = oRes.data.movie;
                    }
                } catch (_) {}
            }
            // 🛡️ Không gắn luồng PhimAPI (dính sub hardcode) vào máy chủ Song Ngữ.
            // Máy chủ Song Ngữ chỉ giữ nguồn OnCDN/ViCDN sạch; người dùng muốn Vietsub/Thuyết minh thì chọn server riêng bên dưới.
            const hasOnCdnStream = tophimServer.server_data.some(ep => ep.link_m3u8 && (ep.link_m3u8.includes('oncdn.vip') || ep.link_m3u8.includes('vicdn.cc')));
            if (!hasOnCdnStream) {
                console.log(`[Bilingual Service] ⚠️ ${cleanSlug}: nguồn Song Ngữ không có OnCDN/ViCDN, bỏ qua gắn luồng phụ.`);
            }

            const extraServers = refEpisodes.filter(s => !(s.server_name || '').toLowerCase().includes('song ngữ'));

            const rawContent = refMovie?.content || '';
            const cleanContent = rawContent
                ? rawContent.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
                : `Xem phim ${movieName || cleanSlug} bản Song Ngữ phụ đề kép chất lượng cao tại APhim Super.`;

            const actors = Array.isArray(refMovie?.actor) ? refMovie.actor.filter(Boolean) : (refMovie?.actor ? [refMovie.actor] : []);
            const directors = Array.isArray(refMovie?.director) ? refMovie.director.filter(Boolean) : (refMovie?.director ? [refMovie.director] : []);
            const categories = Array.isArray(refMovie?.category) ? refMovie.category.map(c => c.name || c).filter(Boolean) : ['Phim Bộ', 'Song Ngữ'];
            const countries = Array.isArray(refMovie?.country) ? refMovie.country.map(c => c.name || c).filter(Boolean) : ['Trung Quốc'];

            return {
                slug: cleanSlug,
                name: refMovie?.name || movieName || cleanSlug,
                origin_name: refMovie?.origin_name || originName || '',
                year: refMovie?.year || year || new Date().getFullYear(),
                quality: refMovie?.quality || 'FHD (1080p)',
                lang: 'Song Ngữ',
                type: refMovie?.type || (tophimServer.server_data.length > 1 ? 'series' : 'single'),
                status: refMovie?.status || 'ongoing',
                time: refMovie?.time || '',
                episode_current: refMovie?.episode_current || '',
                episode_total: refMovie?.episode_total || '',
                category: categories,
                country: countries,
                actor: actors,
                director: directors,
                tmdb: refMovie?.tmdb || null,
                trailer_url: refMovie?.trailer_url || '',
                thumb_url: refMovie?.thumb_url || catThumb || catPoster || '',
                poster_url: refMovie?.poster_url || catPoster || catThumb || '',
                content: cleanContent,
                episodes: [ tophimServer, ...extraServers ]
            };
        }
    } catch (topErr) {}

    // 1. Thử gọi API từ danh sách Mirrors của ChoPhim
    let rawMovieData = null;
    for (const mirror of CHOPHIM_MIRRORS) {
        try {
            const apiUrl = `${mirror}/api/movie/${cleanSlug}`;
            const res = await axios.get(apiUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (res.data && res.data.episodes && res.data.episodes.length > 0) {
                rawMovieData = { mirror, ...res.data };
                break;
            }
        } catch (err) {
            // Thử mirror tiếp theo
        }
    }

    if (!rawMovieData) return null;

    const mirrorBase = rawMovieData.mirror;
    const m = rawMovieData.movie || {};
    const cleanContent = (m.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const actors = Array.isArray(m.actor) ? m.actor.filter(Boolean) : (m.actor ? [m.actor] : []);
    const directors = Array.isArray(m.director) ? m.director.filter(Boolean) : (m.director ? [m.director] : []);
    const categories = Array.isArray(m.category) ? m.category.map(c => c.name || c) : [];
    const countries = Array.isArray(m.country) ? m.country.map(c => c.name || c) : [];

    // Xử lý tất cả server, ưu tiên server Song Ngữ lên đầu
    const allServers = rawMovieData.episodes || [];
    const processedServers = [];

    for (const s of allServers) {
        const sName = (s.server_name || '').toLowerCase();
        const isSongNgu = sName.includes('song ngữ') || (s.server_data || []).some(ep => ep.subtitles && ep.subtitles.length > 0);

        const eps = await Promise.all((s.server_data || []).map(async (ep) => {
            let m3u8Url = ep.link_m3u8 || '';
            if (m3u8Url && !m3u8Url.startsWith('http')) {
                m3u8Url = `${mirrorBase}${m3u8Url.startsWith('/') ? '' : '/'}${m3u8Url}`;
            }
            const proxyM3u8 = m3u8Url ? `/api/proxy/m3u8?url=${encodeURIComponent(m3u8Url)}` : '';

            let subs = [];
            if (isSongNgu && ep.subtitles && ep.subtitles.length > 0) {
                subs = await Promise.all(ep.subtitles.map(async (sub) => {
                    let rawSubUrl = sub.url || '';
                    if (rawSubUrl && !rawSubUrl.startsWith('http')) {
                        rawSubUrl = `${mirrorBase || CHOPHIM_MIRRORS[0]}${rawSubUrl.startsWith('/') ? '' : '/'}${rawSubUrl}`;
                    }
                    const r2Url = await uploadSubtitleToR2(cleanSlug, ep.slug || ep.name, sub.language || sub.label, rawSubUrl);
                    const finalSubUrl = (r2Url && r2Url.startsWith('http')) ? r2Url : rawSubUrl;
                    return {
                        ...sub,
                        url: `/api/proxy/vtt?url=${encodeURIComponent(finalSubUrl)}`,
                        direct_url: finalSubUrl
                    };
                }));
            }

            return {
                name: ep.name || 'Full',
                slug: ep.slug || 'full',
                filename: ep.filename || ep.name,
                link_m3u8: proxyM3u8 || m3u8Url,
                link_embed: ep.link_embed || '',
                subtitles: subs
            };
        }));

        let displayServerName = s.server_name || '';
        if (isSongNgu && !displayServerName.toLowerCase().includes('song ngữ')) {
            const langs = [];
            (s.server_data || []).forEach(ep => {
                (ep.subtitles || []).forEach(sub => {
                    const l = (sub.language || sub.label || '').toLowerCase();
                    if ((l === 'vi' || l.includes('việt')) && !langs.includes('Việt')) langs.push('Việt');
                    if ((l === 'zh' || l === 'cn' || l.includes('trung') || l.includes('hoa')) && !langs.includes('Trung')) langs.push('Trung');
                    if ((l === 'en' || l.includes('anh')) && !langs.includes('Anh')) langs.push('Anh');
                    if ((l === 'ko' || l.includes('hàn')) && !langs.includes('Hàn')) langs.push('Hàn');
                    if ((l === 'ja' || l.includes('nhật')) && !langs.includes('Nhật')) langs.push('Nhật');
                    if ((l === 'th' || l.includes('thái')) && !langs.includes('Thái')) langs.push('Thái');
                });
            });
            displayServerName = langs.length > 1 ? `Song Ngữ (${langs.join('-')})` : 'Song Ngữ';
        }

        const serverObj = {
            server_name: displayServerName,
            original_server_name: s.original_server_name || s.server_name,
            server_data: eps
        };

        if (isSongNgu) {
            processedServers.unshift(serverObj); // Đẩy Song Ngữ lên vị trí số 1
        } else {
            processedServers.push(serverObj);
        }
    }

    const thumbUrl = m.thumb_url || m.poster_url || '';
    const posterUrl = m.poster_url || m.thumb_url || '';

    const movieResult = {
        slug: cleanSlug,
        name: m.name || cleanSlug,
        origin_name: m.origin_name || '',
        year: m.year || new Date().getFullYear(),
        quality: m.quality || 'FHD',
        lang: m.lang || 'Song Ngữ',
        episode_current: m.episode_current || (processedServers[0]?.server_data?.length ? `Tập ${processedServers[0].server_data.length}` : 'Full'),
        episode_total: String(m.episode_total || processedServers[0]?.server_data?.length || '1'),
        status: m.status || 'ongoing',
        time: m.time || '',
        content: cleanContent,
        thumb_url: thumbUrl,
        poster_url: posterUrl,
        actor: actors,
        director: directors,
        category: categories,
        country: countries,
        type: m.type || (processedServers[0]?.server_data?.length > 1 ? 'series' : 'single'),
        trailer_url: m.trailer_url || '',
        tmdb: m.tmdb || null,
        episodes: processedServers,
        is_song_ngu: true
    };

    return movieResult;
}

/**
 * Quét toàn diện tất cả các trang trên ChoPhim (Trang chủ, /phim-song-ngu 1..26, Phim Hàn, Phim Trung, Phim Âu Mỹ, Phim Bộ, Phim Lẻ)
 * để đồng bộ toàn bộ catalog và không bỏ sót bất kỳ phim nào.
 */
async function syncBilingualCatalog() {
    const movieMap = new Map();

    // 🛡️ 0. Nạp dữ liệu hiện có để không bao giờ bị mất phim Tophim đã đồng bộ
    const currentCatPath = path.join(__dirname, '../data/bilingual_catalog.json');
    if (fs.existsSync(currentCatPath)) {
        try {
            const existing = JSON.parse(fs.readFileSync(currentCatPath, 'utf8'));
            if (Array.isArray(existing)) {
                for (const item of existing) {
                    if (item && item.slug) movieMap.set(item.slug.trim().toLowerCase(), item);
                }
            }
        } catch (e) {}
    }

    // 🚀 0.1 Quét nhanh 64 trang Tophim.vip (nguồn OnCDN chất lượng cao nhất)
    try {
        const { fetchPage } = require('../scripts/crawl-tophim-bilingual');
        for (let p = 1; p <= 64; p++) {
            try {
                const { movies } = await fetchPage(p);
                if (!movies || movies.length === 0) break;
                for (const rawM of movies) {
                    if (!rawM || !rawM.slug) continue;
                    const slug = String(rawM.slug).trim().toLowerCase();
                    const existing = movieMap.get(slug) || {};
                    movieMap.set(slug, {
                        ...existing,
                        slug,
                        name: rawM.title || existing.name || slug,
                        origin_name: rawM.original_title || existing.origin_name || '',
                        type: rawM.type === 'phimle' ? 'single' : (existing.type || 'series'),
                        thumb_url: rawM.thumb_url || rawM.poster_url || existing.thumb_url || '',
                        poster_url: rawM.poster_url || rawM.thumb_url || existing.poster_url || '',
                        episode_current: rawM.status || existing.episode_current || (rawM._count?.episodes ? `Tập ${rawM._count.episodes}` : 'Hoàn Tất'),
                        lang: 'Song Ngữ',
                        available_languages: ['PD', 'SN', 'TM'],
                        source: 'tophim',
                        is_songngu: true,
                        year: rawM.year || existing.year || null,
                        quality: rawM.quality || existing.quality || 'FHD',
                        updated_at: new Date().toISOString()
                    });
                }
                await new Promise(r => setTimeout(r, 60));
            } catch (errP) { break; }
        }
    } catch (topErr) {
        console.warn('[SyncBilingual] Tophim sync warning:', topErr.message);
    }

    function extractJsonMovies(html, source) {
        const movieRegex = /\\"name\\":\\"([^\\"]+)\\",\\"slug\\":\\"([^\\"]+)\\",\\"origin_name\\":\\"([^\\"]*)\\",\\"type\\":\\"([^\\"]*)\\",\\"thumb_url\\":\\"([^\\"]*)\\",\\"poster_url\\":\\"([^\\"]*)\\"/g;
        let m;
        let count = 0;
        while ((m = movieRegex.exec(html)) !== null) {
            const slug = m[2];
            const subStr = html.substring(m.index, m.index + 1200);
            const epM = subStr.match(/\\"episode_current\\":\\"([^\\"]*)\\"/);
            const langM = subStr.match(/\\"lang\\":\\"([^\\"]*)\\"/);
            const availM = subStr.match(/\\"available_languages\\":\\?\[([^\]]*)\\?\]/);

            let avail = [];
            if (availM) {
                avail = availM[1].replace(/\\"/g, '').split(',').map(s => s.trim()).filter(Boolean);
            }

            const isSN = source.includes('phim-song-ngu') || 
                         avail.some(l => l.includes('SN') || l.includes('Song Ngữ')) || 
                         (langM && langM[1].includes('Song Ngữ'));

            if (isSN && !movieMap.has(slug)) {
                const normImg = (u) => {
                    if (!u) return '';
                    let clean = u.replace(/\\u0026/g, '&').trim();
                    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
                    clean = clean.replace(/^\/+/, '');
                    if (clean.startsWith('img/')) return 'https://oncdn.vip/' + clean;
                    return 'https://tophim.vip/' + clean;
                };
                movieMap.set(slug, {
                    slug,
                    name: m[1],
                    origin_name: m[3],
                    type: m[4],
                    thumb_url: normImg(m[5]),
                    poster_url: normImg(m[6]),
                    episode_current: epM ? epM[1] : '',
                    lang: langM ? langM[1] : '',
                    available_languages: avail,
                    source
                });
                count++;
            }
        }
        return count;
    }

    function extractFromHtml(html, source) {
        const cardRegex = /<a [^>]*href="\/phim\/([a-zA-Z0-9_-]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let count = 0;
        while ((match = cardRegex.exec(html)) !== null) {
            const slug = match[1];
            const body = match[2];
            if (body.includes('Song Ngữ') || body.includes('lucide-languages') || body.includes('#8B5CF6') || source.includes('phim-song-ngu')) {
                if (!movieMap.has(slug)) {
                    const nameMatch = body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || body.match(/alt="([^"]+)"/i);
                    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : slug;
                    const originMatch = body.match(/<p class="[^"]*text-text-muted[^"]*">([\s\S]*?)<\/p>/i);
                    const originName = originMatch ? originMatch[1].replace(/<[^>]+>/g, '').trim() : name;
                    let poster = '';
                    const srcSetMatch = body.match(/srcset="([^"]+)"/i) || body.match(/src="([^"]+)"/i);
                    if (srcSetMatch) {
                        const raw = srcSetMatch[1];
                        const urlM = raw.match(/url=([^&"'\s]+)/);
                        if (urlM) poster = decodeURIComponent(urlM[1]);
                        else poster = raw.split(',')[0].trim().split(' ')[0];
                    }
                    if (poster && !poster.startsWith('http')) {
                        const cleanP = poster.replace(/^\/+/, '');
                        if (cleanP.startsWith('img/')) poster = 'https://oncdn.vip/' + cleanP;
                        else poster = 'https://tophim.vip/' + cleanP;
                    }
                    movieMap.set(slug, { slug, name, origin_name: originName, poster_url: poster, thumb_url: poster, source });
                    count++;
                }
            }
        }
        return count;
    }

    const client = axios.create({
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 8000
    });

    // 1. Homepage
    try {
        const r = await client.get('https://chophim.lat');
        extractJsonMovies(r.data, 'homepage');
        extractFromHtml(r.data, 'homepage');
    } catch (e) {}

    // 2. /phim-song-ngu (pages 1..26)
    for (let p = 1; p <= 26; p++) {
        try {
            const r = await client.get(`https://chophim.lat/phim-song-ngu?page=${p}`);
            extractJsonMovies(r.data, `/phim-song-ngu?page=${p}`);
            extractFromHtml(r.data, `/phim-song-ngu?page=${p}`);
        } catch (e) {}
    }

    // 3. Country pages
    const countryUrls = ['/quoc-gia/han-quoc', '/quoc-gia/trung-quoc', '/quoc-gia/au-my', '/quoc-gia/nhat-ban', '/quoc-gia/thai-lan', '/quoc-gia/dai-loan'];
    for (const cPath of countryUrls) {
        for (let p = 1; p <= 6; p++) {
            try {
                const r = await client.get(`https://chophim.lat${cPath}?page=${p}`);
                extractJsonMovies(r.data, `${cPath}?page=${p}`);
                extractFromHtml(r.data, `${cPath}?page=${p}`);
            } catch (e) { break; }
        }
    }

    // 4. Type pages
    const typeUrls = ['/danh-sach/phim-bo', '/danh-sach/phim-le', '/danh-sach/hoat-hinh'];
    for (const tPath of typeUrls) {
        for (let p = 1; p <= 6; p++) {
            try {
                const r = await client.get(`https://chophim.lat${tPath}?page=${p}`);
                extractJsonMovies(r.data, `${tPath}?page=${p}`);
                extractFromHtml(r.data, `${tPath}?page=${p}`);
            } catch (e) { break; }
        }
    }

    // 5. Build final catalog with PINNED 24 movies on Page 1
    const finalCatalog = [];
    const addedSlugs = new Set();

    for (const slug of PINNED_BILINGUAL_SLUGS) {
        let item = movieMap.get(slug);
        if (!item) {
            const oldCatPath = path.join(__dirname, '../data/bilingual_catalog.json');
            if (fs.existsSync(oldCatPath)) {
                try {
                    const oldCat = JSON.parse(fs.readFileSync(oldCatPath, 'utf8'));
                    item = oldCat.find(m => m.slug === slug);
                } catch(e) {}
            }
        }
        if (item) {
            finalCatalog.push(item);
            addedSlugs.add(slug);
        }
    }

    for (const [slug, item] of movieMap.entries()) {
        if (!addedSlugs.has(slug)) {
            finalCatalog.push(item);
            addedSlugs.add(slug);
        }
    }

    // Normalize metadata
    for (const item of finalCatalog) {
        const epInfo = getMovieEpInfo(item.slug, item.name, item);
        if (!item.episode_current || item.episode_current.toLowerCase().includes('song ngữ')) {
            item.episode_current = epInfo.ep;
        }
        if (!item.lang) {
            item.lang = epInfo.lang;
        }
        if (!item.available_languages || item.available_languages.length === 0) {
            item.available_languages = epInfo.available_languages || [];
        }
    }

    if (finalCatalog.length > 0) {
        const outPath = path.join(__dirname, '../data/bilingual_catalog.json');
        fs.writeFileSync(outPath, JSON.stringify(finalCatalog, null, 2), 'utf-8');
        bilingualListCache.clear();
        console.log(`[Bilingual Service] Đã đồng bộ ${finalCatalog.length} phim song ngữ vào catalog.`);
    }
    return finalCatalog.length;
}

let _cachedBilingualSlugs = null;
function getBilingualSlugs() {
    if (_cachedBilingualSlugs && _cachedBilingualSlugs.length > 0) {
        return _cachedBilingualSlugs;
    }
    const slugSet = new Set();
    const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
    if (fs.existsSync(catalogPath)) {
        try {
            const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            if (Array.isArray(catalog)) {
                catalog.forEach(item => {
                    if (item && item.slug) {
                        slugSet.add(String(item.slug).toLowerCase().trim());
                    }
                });
            }
        } catch (e) {
            console.warn('[Bilingual Service] getBilingualSlugs error:', e.message);
        }
    }
    if (typeof KNOWN_SLUG_ALIASES === 'object' && KNOWN_SLUG_ALIASES) {
        Object.entries(KNOWN_SLUG_ALIASES).forEach(([alias, target]) => {
            slugSet.add(String(alias).toLowerCase().trim());
            slugSet.add(String(target).toLowerCase().trim());
        });
    }
    _cachedBilingualSlugs = Array.from(slugSet);
    return _cachedBilingualSlugs;
}

// ============================================================
// 🌟 PHIM SONG NGỮ THEO QUỐC GIA (mục "Phim Hàn/Trung/Âu Mỹ mới" ở trang chủ)
// Quét trang /quoc-gia/<x> của ChoPhim rồi GIAO THOA với catalog Song Ngữ đang có,
// => chỉ trả về phim vừa thuộc quốc gia đó, vừa có bản Song Ngữ (đúng danh mục APhim).
// Cache RAM 15 phút cho mỗi quốc gia để không call upstream mỗi lần load trang chủ.
// ============================================================
const BILINGUAL_COUNTRY_CONFIG = {
    'han-quoc': { label: 'Hàn Quốc', pages: 8 },
    'trung-quoc': { label: 'Trung Quốc', pages: 8 },
    // Âu Mỹ có ít phim Song Ngữ trong catalog nên phải quét sâu hơn mới đủ hàng hiển thị
    'au-my': { label: 'Âu Mỹ', pages: 16 }
};
const countryBilingualCache = new Map();
const SN_MIN_HEALTHY = 8;          // Dưới số này coi như danh sách bị thiếu -> thử lại & cache ngắn
const SN_PARTIAL_TTL_MS = 60000;   // Cache kết quả thiếu chỉ 60 giây

// Lấy slug theo đúng thứ tự hiển thị trên trang ChoPhim (JSON nội nhúng + thẻ movie-card)
function extractSlugsFromChophimHtml(html) {
    const ordered = [];
    const seen = new Set();
    let m;

    const jsonRe = /slug\\":\\"([a-zA-Z0-9_-]+)/g;
    while ((m = jsonRe.exec(html)) !== null) {
        const s = String(m[1]).toLowerCase();
        if (!seen.has(s)) { seen.add(s); ordered.push(s); }
    }

    const cardRe = /<a class="movie-card[^"]*" href="\/phim\/([a-zA-Z0-9_-]+)">/gi;
    while ((m = cardRe.exec(html)) !== null) {
        const s = String(m[1]).toLowerCase();
        if (!seen.has(s)) { seen.add(s); ordered.push(s); }
    }

    return ordered;
}

// Thu nhỏ ảnh TMDB /original/ (rất nặng) về kích thước vừa đủ cho card ngang
function shrinkTmdbImage(url) {
    return String(url || '').replace('/original/', '/w500/');
}

async function fetchBilingualByCountry(countrySlug = '', limit = 18) {
    const key = String(countrySlug || '').toLowerCase().trim();
    const conf = BILINGUAL_COUNTRY_CONFIG[key];
    if (!conf) return { status: 'error', country: key, items: [], message: 'Quốc gia không được hỗ trợ' };

    const cached = countryBilingualCache.get(key);
    if (cached && (Date.now() - cached.ts < (cached.ttl || LIST_CACHE_TTL_MS))) return cached.data;

    // 1. Catalog Song Ngữ (nguồn chân lý về "phim nào có Song Ngữ")
    const catalogMap = new Map();
    try {
        const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
        if (fs.existsSync(catalogPath)) {
            const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
            if (Array.isArray(catalog)) {
                catalog.forEach(it => {
                    if (it && it.slug) catalogMap.set(String(it.slug).toLowerCase().trim(), it);
                });
            }
        }
    } catch (e) {
        console.warn('[Bilingual Service] Lỗi đọc catalog cho quốc gia:', e.message);
    }

    // 2. Tải song song các trang quốc gia của ChoPhim (mirror fallback)
    const client = axios.create({
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 8000
    });

    const fetchPage = async (pageNum) => {
        for (const mirror of CHOPHIM_MIRRORS) {
            try {
                const r = await client.get(`${mirror}/quoc-gia/${key}?page=${pageNum}`);
                if (typeof r.data === 'string' && r.data.length > 500) return r.data;
            } catch (e) { /* thử mirror kế tiếp */ }
        }
        return '';
    };

    const pageResults = await Promise.all(
        Array.from({ length: conf.pages }, (_, i) => fetchPage(i + 1))
    );

    // 3. Giao thoa: giữ đúng thứ tự trang 1 -> trang N, chỉ lấy slug có trong catalog
    const matchedSlugs = [];
    const seen = new Set();
    const absorb = (html) => {
        if (!html) return;
        for (const s of extractSlugsFromChophimHtml(html)) {
            if (seen.has(s)) continue;
            seen.add(s);
            if (catalogMap.has(s)) matchedSlugs.push(s);
        }
    };
    for (const html of pageResults) absorb(html);

    // 3.1 Nếu số phim Song Ngữ thu được quá ít (nhiều trang bị chặn/rỗng) -> thử lại 1 lần
    if (matchedSlugs.length < SN_MIN_HEALTHY) {
        await new Promise(r => setTimeout(r, 500));
        const retryResults = await Promise.all(
            Array.from({ length: conf.pages }, (_, i) => fetchPage(i + 1))
        );
        for (const html of retryResults) absorb(html);
    }

    // 4. Chuẩn hóa payload card (ảnh ngang thumb_url + nhãn tập/ngôn ngữ như catalog)
    const items = matchedSlugs.slice(0, Math.max(1, parseInt(limit) || 18)).map(s => {
        const c = catalogMap.get(s);
        const epInfo = getMovieEpInfo(s, c.name, c);
        return {
            name: c.name || s,
            origin_name: c.origin_name || c.name || s,
            slug: s,
            type: c.type || 'series',
            year: c.year || new Date().getFullYear(),
            thumb_url: shrinkTmdbImage(c.thumb_url || c.poster_url || ''),
            poster_url: c.poster_url || c.thumb_url || '',
            episode_current: c.episode_current || epInfo.ep,
            lang: c.lang || epInfo.lang,
            available_languages: c.available_languages || epInfo.available_languages || [],
            is_song_ngu: true,
            country: [{ name: conf.label, slug: key }]
        };
    });

    const data = { status: 'success', country: key, items };
    // Kết quả ít (nghi bị chặn) chỉ cache ngắn để lần sau còn thử lại
    const ttl = items.length >= SN_MIN_HEALTHY ? LIST_CACHE_TTL_MS : SN_PARTIAL_TTL_MS;
    countryBilingualCache.set(key, { data, ts: Date.now(), ttl });
    return data;
}

function extractEpNum(val) {
    if (!val) return null;
    const str = String(val).toLowerCase().trim();
    if (str === 'full' || str.includes('full')) return 'full';
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : str;
}

/**
 * Ghép stream video (link_m3u8, link_embed) đang chạy mượt từ server đối chiếu (KKphim / OPhim)
 * sang server Song Ngữ để tránh lỗi 404 / WASM DRM từ ChoPhim
 */
function attachWorkingStreamsToBilingual(bilingualServer, refEpisodes, force = false) {
    if (!bilingualServer || !Array.isArray(bilingualServer.server_data) || bilingualServer.server_data.length === 0) return;

    // 🌟 Ưu tiên trực tiếp: Dùng server Vietsub chuẩn của phim
    let refServer = (refEpisodes || []).find(s => {
        if (!s || !Array.isArray(s.server_data) || s.server_data.length === 0) return false;
        const name = (s.original_server_name || s.server_name || '').toLowerCase();
        if (name.includes('song ngữ')) return false;
        const hasM3u8 = s.server_data.some(ep => ep.link_m3u8 && ep.link_m3u8.startsWith('http'));
        return hasM3u8 && (name.includes('vietsub') || name.includes('phụ đề') || name.includes('sub'));
    });

    if (!refServer) {
        refServer = (refEpisodes || []).find(s => {
            if (!s || !Array.isArray(s.server_data) || s.server_data.length === 0) return false;
            const name = (s.original_server_name || s.server_name || '').toLowerCase();
            if (name.includes('song ngữ')) return false;
            return s.server_data.some(ep => ep.link_m3u8 && ep.link_m3u8.startsWith('http'));
        });
    }
    if (!refServer || !refServer.server_data || refServer.server_data.length === 0) return;

    const isSingleMovie = bilingualServer.server_data.length === 1 && refServer.server_data.length === 1;
    const refMap = new Map();
    refServer.server_data.forEach(ep => {
        const n1 = extractEpNum(ep.slug);
        const n2 = extractEpNum(ep.name);
        if (n1 !== null && !refMap.has(n1)) refMap.set(n1, ep);
        if (n2 !== null && !refMap.has(n2)) refMap.set(n2, ep);
    });

    bilingualServer.server_data.forEach((bEp, idx) => {
        // Bảo vệ tuyệt đối: nếu đã có luồng sạch OnCDN / Tophim và không yêu cầu force thì không ghi đè
        if (!force && bEp.link_m3u8 && (bEp.link_m3u8.includes('oncdn.vip') || bEp.link_m3u8.includes('vicdn.cc'))) {
            return;
        }

        const n1 = extractEpNum(bEp.slug);
        const n2 = extractEpNum(bEp.name);
        let refEp = (n1 !== null && refMap.get(n1)) || (n2 !== null && refMap.get(n2));

        // Chỉ fallback theo index nếu cùng vị trí hoặc là phim lẻ 1 tập, tuyệt đối không gán đè Tập 1 vào các tập sau
        if (!refEp) {
            if (isSingleMovie) {
                refEp = refServer.server_data[0];
            } else if (refServer.server_data[idx]) {
                const refIdxNum = extractEpNum(refServer.server_data[idx].slug) || extractEpNum(refServer.server_data[idx].name);
                if (refIdxNum === null || refIdxNum === (n1 || n2 || (idx + 1))) {
                    refEp = refServer.server_data[idx];
                }
            }
        }

        if (refEp) {
            // 🛡️ Tuyệt đối không gắn luồng PhimAPI (dính sub hardcode) vào máy chủ Song Ngữ
            if (isPhimApiStream(refEp.link_m3u8)) {
                return;
            }
            if (refEp.link_m3u8 && !bEp.link_m3u8) {
                bEp.link_m3u8 = refEp.link_m3u8;
            }
            if (!bEp.link_embed && refEp.link_embed) {
                bEp.link_embed = refEp.link_embed;
            }
        }
    });
}


function isBilingualCandidate(slug = '', movie = null) {
    if (!slug) return false;
    const cleanSlug = String(slug).trim().toLowerCase();
    const bSlugs = getBilingualSlugs();
    if (Array.isArray(bSlugs) && bSlugs.includes(cleanSlug)) return true;
    if (KNOWN_TOPHIM_ALIASES && KNOWN_TOPHIM_ALIASES[cleanSlug]) return true;

    if (movie) {
        const lang = String(movie.lang || '').toLowerCase();
        if (lang.includes('song ngữ') || lang.includes('bilingual')) return true;
        const name = String(movie.name || '').toLowerCase();
        if (name.includes('song ngữ')) return true;
        const cats = Array.isArray(movie.category) ? movie.category : [];
        if (cats.some(c => String(c.name || c).toLowerCase().includes('song ngữ'))) return true;
    }
    return false;
}

/**
 * ⚡ Lấy bilingual server từ RAM cache (0ms, không call network).
 * Trả về null nếu chưa có cache hoặc cache đã hết hạn.
 */
function getBilingualCached(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();
    const cached = bilingualCache.get(cleanSlug);
    if (cached && (Date.now() - cached.ts < (cached.ttl || CACHE_TTL_MS))) {
        return cached.data;
    }
    return null;
}

module.exports = {
    resolveBilingualSlug,
    isBilingualCandidate,
    getBilingualSlugs,
    getBilingualServer,
    getBilingualCached,
    attachWorkingStreamsToBilingual,
    getBilingualFullMovie,
    hasCleanBilingualStream,
    uploadSubtitleToR2,
    fetchBilingualMoviesPage,
    fetchBilingualByCountry,
    syncBilingualCatalog,
    getCanonicalSlug,
    KNOWN_SLUG_ALIASES,
    CHOPHIM_MIRRORS
};



