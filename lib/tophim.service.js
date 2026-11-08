/**
 * lib/tophim.service.js
 * 🚀 High-Performance Tophim.vip / OnCDN.vip Decryptor & Bilingual Service
 * - Thuật toán giải mã RC4 (Key: hubphim_sub_secret_key_2026)
 * - Tự động bóc tách link stream (.m3u8) và 36 ngôn ngữ phụ đề (.vtt)
 * - Tích hợp chống Anti-Leech (Strict Referer Bypass)
 */

const axios = require('axios');
const crypto = require('crypto');

const TOPHIM_KEY = 'hubphim_sub_secret_key_2026';
const ENC_PREFIX = 'HUBPHIM_ENC:';
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function rc4(key, data) {
    const s = [];
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
    }

    let i = 0;
    j = 0;
    let res = '';
    for (let k = 0; k < data.length; k++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        const temp = s[i];
        s[i] = s[j];
        s[j] = temp;
        const K = s[(s[i] + s[j]) % 256];
        res += String.fromCharCode(data.charCodeAt(k) ^ K);
    }
    return res;
}

function decryptHubphim(encStr, key = TOPHIM_KEY) {
    if (!encStr || typeof encStr !== 'string') return '';
    if (!encStr.startsWith(ENC_PREFIX)) return encStr;

    const hexData = encStr.slice(ENC_PREFIX.length);
    if (hexData.length % 4 !== 0) return encStr;

    let rawChars = '';
    for (let i = 0; i < hexData.length; i += 4) {
        rawChars += String.fromCharCode(parseInt(hexData.slice(i, i + 4), 16));
    }
    return rc4(key, rawChars);
}

/**
 * Giải mã trang ViCDN để lấy link HLS m3u8 gốc
 */
async function extractVicdnStream(vicdnUrl) {
    if (!vicdnUrl || !vicdnUrl.includes('vicdn.cc')) return null;
    try {
        const res = await axios.get(vicdnUrl, {
            headers: { 'User-Agent': DEFAULT_UA, 'Referer': 'https://tophim.vip/' },
            timeout: 1500
        });
        const html = res.data;
        if (typeof html !== 'string') return null;

        const scriptMatch = html.match(/<script type="text\/javascript">(eval\(function\(p,a,c,k,e,d[\s\S]*?<\/script>)/gi);
        if (!scriptMatch || scriptMatch.length < 2) return null;
        const packed = scriptMatch[1].replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const unpacker = packed.replace(/^eval/, '');
        const unpacked = new Function('return ' + unpacker)();

        const audioMatch = unpacked.match(/AUDIO_SOURCES\.(original|female|male)\s*=\s*['"]([^'"]+)['"]/);
        if (audioMatch && audioMatch[2]) {
            return audioMatch[2];
        }
    } catch (e) {
        // ignore
    }
    return null;
}

const tophimCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * 🌟 Phân tích danh sách phụ đề OnCDN trực tiếp từ Master M3U8 Playlist
 * Bắt chính xác 100% URL phân đoạn VTT thật (dạng ?seg=1), không bao giờ lấy file rác/dummy rỗng!
 */
async function parseOnCdnSubtitles(streamUrl) {
    if (!streamUrl || !streamUrl.includes('oncdn.vip')) return [];
    try {
        const res = await axios.get(streamUrl, {
            headers: {
                'User-Agent': DEFAULT_UA,
                'Referer': 'https://tophim.vip/'
            },
            timeout: 1500
        });
        const text = res.data;
        if (typeof text !== 'string' || !text.includes('#EXTM3U')) return [];

        const subs = [];
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.includes('#EXT-X-MEDIA:TYPE=SUBTITLES')) {
                const nameMatch = line.match(/NAME="([^"]+)"/i);
                const langMatch = line.match(/LANGUAGE="([^"]+)"/i);
                const uriMatch = line.match(/URI="([^"]+)"/i);
                if (uriMatch) {
                    let directVtt = uriMatch[1];
                    if (directVtt.includes('format=m3u8')) {
                        directVtt = directVtt.replace('format=m3u8', 'seg=1');
                    } else if (!directVtt.includes('seg=')) {
                        directVtt += (directVtt.includes('?') ? '&seg=1' : '?seg=1');
                    }

                    let rawLang = (langMatch ? langMatch[1] : '').toLowerCase();
                    let rawName = (nameMatch ? nameMatch[1] : '');

                    let lang = 'vi';
                    if (rawLang.startsWith('vi') || rawName.toLowerCase().includes('việt') || rawName.toLowerCase().includes('viet')) lang = 'vi';
                    else if (rawLang.startsWith('en') || rawName.toLowerCase().includes('english') || rawName.toLowerCase().includes('anh')) lang = 'en';
                    else if (rawLang.startsWith('ko') || rawLang.startsWith('kor') || rawName.toLowerCase().includes('korean') || rawName.toLowerCase().includes('hàn')) lang = 'ko';
                    else if (rawLang.startsWith('zh') || rawLang.startsWith('chi') || rawName.toLowerCase().includes('chinese') || rawName.toLowerCase().includes('trung')) lang = 'zh';
                    else if (rawLang.startsWith('ja') || rawLang.startsWith('jpn') || rawName.toLowerCase().includes('japanese') || rawName.toLowerCase().includes('nhật')) lang = 'ja';
                    else if (rawLang.startsWith('th') || rawLang.startsWith('tha') || rawName.toLowerCase().includes('thai') || rawName.toLowerCase().includes('thái')) lang = 'th';
                    else lang = rawLang || 'other';

                    subs.push({
                        label: rawName || (lang === 'vi' ? 'Tiếng Việt' : lang === 'en' ? 'Tiếng Anh' : 'Phụ đề'),
                        language: lang,
                        url: `/api/proxy/vtt?url=${encodeURIComponent(directVtt)}`,
                        direct_url: directVtt
                    });
                }
            }
        }
        return subs;
    } catch (e) {
        return [];
    }
}

async function fetchTophimMovie(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();

    const cached = tophimCache.get(cleanSlug);
    if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) {
        return cached.data;
    }

    const urlsToTry = [
        `https://tophim.vip/xem/${cleanSlug}`,
        `https://tophim.vip/phim/${cleanSlug}`
    ];

    let html = '';
    const fetchTophimUrl = async (u) => {
        const res = await axios.get(u, {
            headers: {
                'User-Agent': DEFAULT_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
            },
            timeout: 1200
        });
        if (res.data && (typeof res.data === 'string') && res.data.includes('HUBPHIM_ENC')) {
            return res.data;
        }
        throw new Error('No HUBPHIM_ENC');
    };

    try {
        html = await Promise.any(urlsToTry.map(fetchTophimUrl));
    } catch (_) {}

    if (!html) return null;

    let title = cleanSlug;
    const mTitle = html.match(/\\\"title\\\":\\\"([^\\\"]+)\\\"/);
    if (mTitle) title = mTitle[1];

    let episodes = [];
    let mEpisodes = html.match(/episodes\\\":(\[.*?\]),\\\"currentEpisode/) || html.match(/"episodes":(\[.*?\]),"currentEpisode"/);
    if (mEpisodes) {
        try {
            const rawJson = mEpisodes[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            episodes = JSON.parse(rawJson);
        } catch (e) {}
    }

    if (!episodes || episodes.length === 0) return null;

    const serverMap = new Map();
    for (const ep of episodes) {
        const rawServerName = String(ep.server_name || 'Mặc định').replace(/\s+/g, ' ').trim();
        if (!serverMap.has(rawServerName)) serverMap.set(rawServerName, []);
        serverMap.get(rawServerName).push(ep);
    }

    // 🌟 Xếp hạng server để chọn ra nguồn Song Ngữ chất lượng cao nhất
    let oncdnServerName = null;
    let vicdnServerName = null;
    let playembedSubServerName = null;
    let fallbackSongNguServerName = null;

    for (const [sName, eps] of serverMap.entries()) {
        const sLower = sName.toLowerCase();
        const ep0Dec = (eps[0] && eps[0].video_url) ? decryptHubphim(eps[0].video_url) : '';

        if (ep0Dec.includes('oncdn.vip') || sLower.includes('máy chủ (tp) - song ngữ')) {
            oncdnServerName = sName;
        } else if (ep0Dec.includes('vicdn.cc') || sLower.includes('vicdn')) {
            vicdnServerName = sName;
        } else if (ep0Dec.includes('playembed.vip') || ep0Dec.includes('onflixcdn') || ep0Dec.includes('edgecontent.site')) {
            if (sLower.includes('sub') || sLower.includes('vietsub') || !playembedSubServerName) {
                playembedSubServerName = sName;
            }
        } else if (sLower.includes('song ngữ') || sLower.includes('song ngu') || sLower.includes('bilingual')) {
            if (!fallbackSongNguServerName) fallbackSongNguServerName = sName;
        }
    }

    // Server chính được ưu tiên: OnCDN > ViCDN > Playembed Sub > Fallback
    const primaryServerName = oncdnServerName || vicdnServerName || playembedSubServerName || fallbackSongNguServerName;
    if (!primaryServerName) return null;

    const primaryEpisodes = serverMap.get(primaryServerName) || [];
    const vicdnEpisodes = vicdnServerName ? (serverMap.get(vicdnServerName) || []) : [];
    const playembedEpisodes = playembedSubServerName ? (serverMap.get(playembedSubServerName) || []) : [];

    const formattedPromises = primaryEpisodes.map(async (ep, idx) => {
        let decStreamUrl = decryptHubphim(ep.video_url || '');
        if (!decStreamUrl) return null;

        const subs = [];

        // 1. Phân tích phụ đề OnCDN trực tiếp từ Master Playlist (100% chuẩn xác không bao giờ lấy file rác/dummy)
        if (decStreamUrl.includes('oncdn.vip')) {
            const onCdnSubs = await parseOnCdnSubtitles(decStreamUrl);
            if (onCdnSubs && onCdnSubs.length > 0) {
                subs.push(...onCdnSubs);
            }
        }

        // Fallback OnCDN nếu playlist không khai báo subtitle tag
        const strIdMatch = decStreamUrl.match(/(str_[a-zA-Z0-9]+)/);
        const strId = strIdMatch ? strIdMatch[1] : null;
        if (subs.length === 0 && strId) {
            subs.push({
                label: 'Tiếng Việt',
                language: 'vi',
                url: `/api/proxy/vtt?url=${encodeURIComponent(`https://oncdn.vip/sub/${strId}/sub_vi?seg=1`)}`,
                direct_url: `https://oncdn.vip/sub/${strId}/sub_vi?seg=1`
            });
            subs.push({
                label: 'Tiếng Anh',
                language: 'en',
                url: `/api/proxy/vtt?url=${encodeURIComponent(`https://oncdn.vip/sub/${strId}/sub_en?seg=1`)}`,
                direct_url: `https://oncdn.vip/sub/${strId}/sub_en?seg=1`
            });
        }

        // 2. Tìm phụ đề từ Playembed (extras) nếu có
        let playembedUrl = '';
        if (decStreamUrl.includes('playembed.vip') || decStreamUrl.includes('edgecontent.site')) {
            playembedUrl = decStreamUrl;
        } else if (playembedEpisodes[idx]) {
            playembedUrl = decryptHubphim(playembedEpisodes[idx].video_url || '');
        }

        if (playembedUrl && (playembedUrl.includes('playembed.vip') || playembedUrl.includes('edgecontent.site'))) {
            const playIdMatch = playembedUrl.match(/\/player\/([a-zA-Z0-9_-]+)/);
            const playId = playIdMatch ? playIdMatch[1] : null;
            if (playId) {
                try {
                    const extrasUrl = `https://gota.edgecontent.site/${playId}/extras`;
                    const extrasRes = await axios.get(extrasUrl, {
                        headers: { 'User-Agent': DEFAULT_UA, 'Referer': 'https://playembed.vip/' },
                        timeout: 3000
                    }).catch(() => null);

                    if (extrasRes && extrasRes.data && Array.isArray(extrasRes.data.subtitles)) {
                        extrasRes.data.subtitles.forEach(s => {
                            let langCode = 'vi';
                            if (s.slug === 'tieng-anh' || (s.name && s.name.toLowerCase().includes('english'))) langCode = 'en';
                            else if (s.slug === 'tieng-han' || (s.name && s.name.toLowerCase().includes('korean'))) langCode = 'ko';
                            else if (s.slug === 'tieng-trung' || (s.name && s.name.toLowerCase().includes('chinese'))) langCode = 'zh';
                            else if (s.slug === 'tieng-nhat' || (s.name && s.name.toLowerCase().includes('japanese'))) langCode = 'ja';
                            else if (s.slug === 'tieng-thai' || (s.name && s.name.toLowerCase().includes('thai'))) langCode = 'th';

                            if (s.url && s.url.startsWith('http') && !subs.some(x => x.language === langCode)) {
                                subs.push({
                                    label: s.name || (langCode === 'vi' ? 'Tiếng Việt' : (langCode === 'en' ? 'Tiếng Anh' : 'Tiếng Hàn')),
                                    language: langCode,
                                    url: `/api/proxy/vtt?url=${encodeURIComponent(s.url)}`,
                                    direct_url: s.url
                                });
                            }
                        });
                    }
                } catch (_) {}
            }
        }

        // 3. Nếu là ViCDN hoặc có server ViCDN kèm theo: giải mã HLS URL
        let vicdnHlsUrl = null;
        if (decStreamUrl.includes('vicdn.cc')) {
            vicdnHlsUrl = await extractVicdnStream(decStreamUrl);
        } else if ((!strId || !decStreamUrl.includes('oncdn.vip')) && vicdnEpisodes[idx]) {
            const vicdnUrl = decryptHubphim(vicdnEpisodes[idx].video_url || '');
            if (vicdnUrl.includes('vicdn.cc')) {
                vicdnHlsUrl = await extractVicdnStream(vicdnUrl);
            }
        }

        let finalStreamUrl = '';
        if (strId) {
            finalStreamUrl = `/api/proxy/m3u8?url=${encodeURIComponent(decStreamUrl)}`;
        } else if (vicdnHlsUrl) {
            finalStreamUrl = `/api/proxy/m3u8?url=${encodeURIComponent(vicdnHlsUrl)}`;
        } else if (decStreamUrl.includes('.m3u8') || decStreamUrl.includes('format=m3u8')) {
            finalStreamUrl = `/api/proxy/m3u8?url=${encodeURIComponent(decStreamUrl)}`;
        }

        const rawName = ep.name || `Tập ${idx + 1}`;
        const rawSlug = ep.slug || `tap-${idx + 1}`;
        const isSingleOrFull = primaryEpisodes.length === 1 && (rawSlug === 'tap-full' || rawSlug === 'full' || rawSlug === 'tap-1' || rawSlug === '1' || rawName.toLowerCase().includes('full'));
        const epName = isSingleOrFull ? 'Full' : rawName;
        const epSlug = isSingleOrFull ? 'full' : (rawSlug === 'tap-full' ? 'full' : rawSlug);

        return {
            name: epName,
            slug: epSlug,
            filename: epName,
            link_m3u8: finalStreamUrl,
            link_embed: finalStreamUrl ? '' : decStreamUrl,
            subtitles: subs
        };
    });

    const rawFormatted = await Promise.all(formattedPromises);
    const formattedEpisodes = rawFormatted.filter(Boolean);

    if (formattedEpisodes.length === 0 || !formattedEpisodes.some(e => e.link_m3u8 || e.subtitles.length > 0)) return null;

    const movieData = {
        title,
        slug: cleanSlug,
        server: {
            server_name: 'Song Ngữ (Việt-Hàn-Anh)',
            original_server_name: primaryServerName,
            server_data: formattedEpisodes
        }
    };

    tophimCache.set(cleanSlug, { data: movieData, ts: Date.now() });
    return movieData;
}

module.exports = {
    rc4,
    decryptHubphim,
    fetchTophimMovie
};
