
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
    'dac-vu-kim-tai-khoi-dong'
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
    'dac-vu-kim-tai-khoi-dong': { ep: 'Hoàn tất (10/10)', lang: 'Vietsub + Thuyết Minh', avail: ['PD:10', 'SN:10', 'TM:10'] }
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
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
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
if (ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
    try {
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
        console.warn('[Bilingual Service] Failed to initialize R2 S3 Client:', err.message);
    }
}

// ChoPhim Upstream Mirrors (Tự động fallback nếu 1 domain bị chặn)
const CHOPHIM_MIRRORS = [
    'https://chophim.cam',
    'https://chophim.lat',
    'https://chophim.app',
    'https://chophim.fun'
];

// In-memory cache for bilingual servers (TTL: 1 hour)
const bilingualCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Tải file subtitle (.vtt) từ nguồn và lưu vĩnh viễn lên Cloudflare R2
 */
async function uploadSubtitleToR2(slug, epSlug, lang, sourceUrl) {
    if (!s3Client || !sourceUrl) return sourceUrl;

    const cleanEpSlug = (epSlug || 'tap-1').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanLang = (lang || 'sub').replace(/[^a-zA-Z0-9_-]/g, '');
    const r2Key = `subtitles/${slug}/${cleanEpSlug}_${cleanLang}.vtt`;
    const r2PublicUrl = `${PUBLIC_DOMAIN.replace(/\/$/, '')}/${r2Key}`;

    try {
        // 1. Kiểm tra xem file đã tồn tại trên R2 chưa
        try {
            await s3Client.send(new HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Key
            }));
            return r2PublicUrl;
        } catch (headErr) {
            // File chưa tồn tại, tiếp tục tải và upload
        }

        // 2. Tải nội dung phụ đề từ nguồn (hỗ trợ cả link tuyệt đối và tương đối)
        let downloadUrl = sourceUrl;
        if (!downloadUrl.startsWith('http')) {
            downloadUrl = `${CHOPHIM_MIRRORS[0]}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
        }

        const subRes = await axios.get(downloadUrl, {
            timeout: 8000,
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!subRes.data || typeof subRes.data !== 'string' || subRes.data.length < 10) {
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

/**
 * Danh sách ánh xạ định danh URL chuẩn giữa ChoPhim và Trang Chủ để SEO Canonical & 301 Redirect
 */
const KNOWN_SLUG_ALIASES = {
    'bac-si-x-mafia-ao-trang': 'bac-si-x',
    '100-ngay-doi-tra': '100-ngay-lua-doi'
};

function getCanonicalSlug(slug) {
    if (!slug) return slug;
    const clean = String(slug).trim().toLowerCase();
    return KNOWN_SLUG_ALIASES[clean] || clean;
}

/**
 * Tự động tìm slug tương ứng trên ChoPhim dựa trên slug, tên phim hoặc tên gốc tiếng Anh
 * Có rào chắn kiểm tra Season, Năm sản xuất và độ dài ký tự tránh ghép nhầm
 */
function resolveBilingualSlug(slug, name = '', originName = '', year = null) {
    if (!slug) return slug;
    const cleanSlug = String(slug).trim().toLowerCase();
    const cleanName = (name || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    const cleanOrigin = (originName || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    const targetSeason = extractSeasonNumber(cleanSlug + ' ' + (name || ''));
    const targetYear = year ? parseInt(year, 10) : extractYearNumber(cleanSlug + ' ' + (name || '') + ' ' + (originName || ''));

    const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
    if (!fs.existsSync(catalogPath)) return cleanSlug;

    try {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        if (!Array.isArray(catalog)) return cleanSlug;

        // 1. Khớp chính xác 100% slug
        const exact = catalog.find(m => m.slug === cleanSlug);
        if (exact) return exact.slug;

        // Rào chắn an toàn: Phải khớp Season và chênh lệch năm tối đa <= 1
        const isSafeCandidate = (m) => {
            const catSeason = extractSeasonNumber(m.slug + ' ' + (m.name || ''));
            if (targetSeason !== catSeason) return false; // Khác Season -> LOẠI NGAY TRÁNH GHÉP NHẦM PHẦN

            const catYear = m.year ? parseInt(m.year, 10) : extractYearNumber(m.slug + ' ' + (m.name || '') + ' ' + (m.origin_name || ''));
            if (targetYear && catYear && !isNaN(targetYear) && !isNaN(catYear) && Math.abs(targetYear - catYear) > 1) {
                return false; // Lệch quá 1 năm -> LOẠI
            }
            return true;
        };

        // 2. Khớp prefix / suffix an toàn (e.g. bac-si-x vs bac-si-x-mafia-ao-trang)
        let match = catalog.find(m => {
            const isPrefix = m.slug.startsWith(cleanSlug + '-') || cleanSlug.startsWith(m.slug + '-');
            return isPrefix && isSafeCandidate(m);
        });
        if (match) return match.slug;

        // 3. Khớp theo Origin Name (Tên tiếng Anh TMDB / Quốc tế) - Yêu cầu >= 5 ký tự để tránh từ khóa ngắn (Hero, Alive, ...)
        if (cleanOrigin && cleanOrigin.length >= 5) {
            match = catalog.find(m => {
                const catOrigin = (m.origin_name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
                const isMatch = catOrigin && (catOrigin === cleanOrigin || catOrigin.includes(cleanOrigin) || cleanOrigin.includes(catOrigin));
                return isMatch && isSafeCandidate(m);
            });
            if (match) return match.slug;
        }

        // 4. Khớp theo Tên tiếng Việt - Yêu cầu >= 5 ký tự
        if (cleanName && cleanName.length >= 5) {
            match = catalog.find(m => {
                const catName = (m.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const isMatch = catName && (catName === cleanName || catName.includes(cleanName) || cleanName.includes(catName));
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
async function getBilingualServer(slug, movieName = '', originName = '', year = null) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();

    // 1. Kiểm tra Cache RAM cho slug này
    const cached = bilingualCache.get(cleanSlug);
    if (cached && (Date.now() - cached.ts < CACHE_TTL_MS)) {
        return cached.data;
    }

    // 2. Tìm slug tương ứng trên ChoPhim nếu có lệch định danh (có rào chắn Season + Năm)
    const targetSlug = resolveBilingualSlug(cleanSlug, movieName, originName, year);
    if (targetSlug !== cleanSlug) {
        const cachedTarget = bilingualCache.get(targetSlug);
        if (cachedTarget && (Date.now() - cachedTarget.ts < CACHE_TTL_MS)) {
            bilingualCache.set(cleanSlug, cachedTarget);
            return cachedTarget.data;
        }
    }

    // 3. Thử gọi API từ danh sách Mirrors của ChoPhim với targetSlug (và fallback cleanSlug)
    let rawMovieData = null;
    const slugsToTry = targetSlug !== cleanSlug ? [targetSlug, cleanSlug] : [cleanSlug];

    for (const s of slugsToTry) {
        for (const mirror of CHOPHIM_MIRRORS) {
            try {
                const apiUrl = `${mirror}/api/movie/${s}`;
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
        if (rawMovieData) break;
    }

    // 4. Nếu không có dữ liệu online, kiểm tra file dự phòng cục bộ (nếu có)
    if (!rawMovieData) {
        try {
            const localFile = path.join(__dirname, `../data/bilingual_${cleanSlug}.json`);
            if (fs.existsSync(localFile)) {
                const localData = JSON.parse(fs.readFileSync(localFile, 'utf-8'));
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
        } catch (e) {
            // ignore
        }
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
        bilingualCache.set(cleanSlug, { data: null, ts: Date.now() });
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

        // Phụ đề (Upload lên R2 ngầm hoặc dùng public domain)
        const subs = await Promise.all((ep.subtitles || []).map(async (sub) => {
            const rawSubUrl = sub.url || '';
            const r2Url = await uploadSubtitleToR2(cleanSlug, ep.slug || ep.name, sub.language || sub.label, rawSubUrl);
            return {
                ...sub,
                url: `/api/proxy/vtt?url=${encodeURIComponent(r2Url)}`,
                direct_url: r2Url
            };
        }));

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
                const pageSize = 24;
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
                    const rawSubUrl = sub.url || '';
                    const r2Url = await uploadSubtitleToR2(cleanSlug, ep.slug || ep.name, sub.language || sub.label, rawSubUrl);
                    return {
                        ...sub,
                        url: `/api/proxy/vtt?url=${encodeURIComponent(r2Url)}`,
                        direct_url: r2Url
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
                movieMap.set(slug, {
                    slug,
                    name: m[1],
                    origin_name: m[3],
                    type: m[4],
                    thumb_url: m[5].replace(/\\u0026/g, '&'),
                    poster_url: m[6].replace(/\\u0026/g, '&'),
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
function attachWorkingStreamsToBilingual(bilingualServer, refEpisodes) {
    if (!bilingualServer || !Array.isArray(bilingualServer.server_data) || bilingualServer.server_data.length === 0) return;

    // 🌟 Ưu tiên 1: Tìm server có video sạch (Clean Video / Không Vietsub in cứng): Thuyết minh, Lồng tiếng, Raw, Bản gốc
    let refServer = (refEpisodes || []).find(s => {
        if (!s || !Array.isArray(s.server_data) || s.server_data.length === 0) return false;
        const name = (s.original_server_name || s.server_name || '').toLowerCase();
        if (name.includes('song ngữ')) return false;
        return name.includes('thuyết minh') || name.includes('lồng tiếng') || name.includes('raw') || name.includes('bản gốc');
    });

    // 🌟 Ưu tiên 2: Fallback về server thông thường nếu không có bản sạch
    if (!refServer) {
        refServer = (refEpisodes || []).find(s => s && Array.isArray(s.server_data) && s.server_data.length > 0 && !(s.server_name || '').toLowerCase().includes('song ngữ'));
    }
    if (!refServer || !refServer.server_data || refServer.server_data.length === 0) return;

    const refMap = new Map();
    refServer.server_data.forEach(ep => {
        const n1 = extractEpNum(ep.slug);
        const n2 = extractEpNum(ep.name);
        if (n1 !== null && !refMap.has(n1)) refMap.set(n1, ep);
        if (n2 !== null && !refMap.has(n2)) refMap.set(n2, ep);
    });

    bilingualServer.server_data.forEach((bEp, idx) => {
        const n1 = extractEpNum(bEp.slug);
        const n2 = extractEpNum(bEp.name);
        const refEp = (n1 !== null && refMap.get(n1)) || (n2 !== null && refMap.get(n2)) || refServer.server_data[idx] || refServer.server_data[0];
        if (refEp) {
            if (refEp.link_m3u8) {
                bEp.link_m3u8 = refEp.link_m3u8;
            }
            if (refEp.link_embed) {
                bEp.link_embed = refEp.link_embed;
            }
        }
    });
}

module.exports = {
    getBilingualSlugs,
    getBilingualServer,
    attachWorkingStreamsToBilingual,
    getBilingualFullMovie,
    uploadSubtitleToR2,
    fetchBilingualMoviesPage,
    fetchBilingualByCountry,
    syncBilingualCatalog,
    getCanonicalSlug,
    KNOWN_SLUG_ALIASES,
    CHOPHIM_MIRRORS
};



