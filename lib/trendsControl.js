/**
 * lib/trendsControl.js
 * Quản lý danh sách từ khóa xu hướng Google Trends 24h chuẩn xác & cố định vĩnh viễn
 * 
 * Kiến trúc bảo vệ đa tầng (Multi-tier Enterprise Resilience):
 * 1. Cloud Database: Đồng bộ vĩnh viễn với MongoDB Atlas (không bao giờ mất khi git pull / deploy VPS / restart)
 * 2. Primary File: data/google_trends.json
 * 3. Shadow Backup: data/google_trends.backup.json
 * 4. RAM Cache: In-memory cache cho tốc độ phản hồi 0ms trên trang chủ và admin
 * 5. Auto-Preserve: Giữ nguyên 100% phim đã gán (movie_slug, poster, v.v.) khi cập nhật từ Google Trends
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'google_trends.json');
const DATA_BACKUP_FILE = path.join(DATA_DIR, 'google_trends.backup.json');

// Danh sách phim cấu hình chuẩn mặc định (đầy đủ metadata & slug thực tế)
const INITIAL_TRENDS = [
    {
        query: 'việc',
        title: 'việc',
        traffic: '+Đột Biến%',
        movie_slug: 'viec-ma-luong-quai',
        movie_name: 'Việc Ma, Lương Quái',
        poster_url: 'https://phimimg.com/uploads/movies/20261031/viec-ma-luong-quai-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20261031/viec-ma-luong-quai-thumb.webp',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'trại',
        title: 'trại',
        traffic: '+Đột Biến%',
        movie_slug: 'trai-buon-nguoi',
        movie_name: 'Trại Buôn Người',
        poster_url: 'https://cinema.momocdn.net/img/867383626301392-tbnpo.jpg',
        thumb_url: 'https://cinema.momocdn.net/img/74805855983673840-tbn1.jpg',
        year: '2026',
        quality: 'Bản Đẹp Rạp (Full HD)',
        lang: 'Thuyết Minh / Vietsub',
        is_custom: true,
        is_momo: true
    },
    {
        query: 'gả kim thoa',
        title: 'gả kim thoa',
        traffic: '+950%',
        movie_slug: 'ga-kim-thoa-ga-tram-vang',
        movie_name: 'Gả Kim Thoa / Gả trâm vàng',
        poster_url: 'https://phimimg.com/uploads/movies/20261016/ga-kim-thoa-ga-tram-vang-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20261016/ga-kim-thoa-ga-tram-vang-thumb.webp',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub + Thuyết Minh',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim 100 ngày lừa dối',
        title: 'ngày lừa dối',
        traffic: '+300%',
        movie_slug: '100-ngay-lua-doi',
        movie_name: '100 Ngày Lừa Dối',
        poster_url: 'https://phimimg.com/uploads/movies/20261011/100-ngay-lua-doi-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20261011/100-ngay-lua-doi-thumb.webp',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim tiên nghịch',
        title: 'tiên nghịch',
        traffic: '+150%',
        movie_slug: 'tien-nghich',
        movie_name: 'Tiên Nghịch',
        poster_url: 'https://phimimg.com/uploads/movies/20260720/tien-nghich-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20260720/tien-nghich-thumb.webp',
        year: '2023',
        quality: 'FHD',
        lang: 'Vietsub + Thuyết Minh',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'gái ngoan đổi đời xem phim',
        title: 'gái ngoan đổi đời',
        traffic: '+70%',
        movie_slug: 'project-y-gai-ngoan-doi-doi',
        movie_name: 'Project Y: Gái Ngoan Đổi Đời',
        poster_url: 'https://phimimg.com/upload/vod/20260318-1/8545339897a3469172ad61ba0a43ee75.jpg',
        thumb_url: 'https://phimimg.com/upload/vod/20260318-1/ed2843ccbd0785dc0d55d9b85c27c636.jpg',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub + Thuyết Minh + Lồng Tiếng',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'nhà gia tiên xem phim',
        title: 'nhà gia tiên',
        traffic: '+60%',
        movie_slug: 'nha-gia-tien',
        movie_name: 'Nhà Gia Tiên',
        poster_url: 'https://phimimg.com/upload/vod/20250710-1/5af1cd558e89eb88b67d72181906edac.jpg',
        thumb_url: 'https://phimimg.com/upload/vod/20250710-1/3024e503f4c8cecdb0578c20c77e4cdf.jpg',
        year: '2025',
        quality: 'FHD',
        lang: 'Vietsub',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim phá đám sinh nhật mẹ',
        title: 'phá đám sinh nhật mẹ',
        traffic: '+550%',
        movie_slug: 'pha-dam-sinh-nhat-me',
        movie_name: 'Phá Đám: Sinh Nhật Mẹ',
        poster_url: 'https://phimimg.com/upload/vod/20260517-1/cf6c033ac490be0f8414ce3abadf4246.jpg',
        thumb_url: 'https://phimimg.com/upload/vod/20260517-1/ad67ffa5d2d07e1566bb07f27bdeb123.jpg',
        year: '2025',
        quality: 'FHD',
        lang: 'Vietsub',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim khó dỗ dành',
        title: 'khó dỗ dành',
        traffic: '+20%',
        movie_slug: 'kho-do-danh',
        movie_name: 'Khó Dỗ Dành',
        poster_url: 'https://phimimg.com/upload/vod/20250218-1/7812aa97a4c6bfdd29e1bc33386b72e1.jpg',
        thumb_url: 'https://phimimg.com/upload/vod/20250218-1/397055acaa0da79ba975b51df4dbf50f.jpg',
        year: '2025',
        quality: 'FHD',
        lang: 'Vietsub + Thuyết Minh',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim lan hương như cố',
        title: 'lan hương như cố',
        traffic: '+100%',
        movie_slug: 'lan-huong-nhu-co',
        movie_name: 'Lan Hương Như Cố',
        poster_url: 'https://phimimg.com/uploads/movies/20260912/lan-huong-nhu-co-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20260912/lan-huong-nhu-co-thumb.webp',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim không thể thay thế',
        title: 'không thể thay thế',
        traffic: '+80%',
        movie_slug: 'khong-the-thay-the-2026',
        movie_name: 'Không Thể Thay Thế',
        poster_url: 'https://phimimg.com/uploads/movies/20260929/khong-the-thay-the-phan-1-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20260929/khong-the-thay-the-phan-1-thumb.webp',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub + Thuyết Minh',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim merry berry love',
        title: 'merry berry love',
        traffic: '+70%',
        movie_slug: 'dau-tay-ngot-ngao-phan-1',
        movie_name: 'Dâu Tây Ngọt Ngào (Phần 1)',
        poster_url: 'https://phimimg.com/uploads/movies/20261008/dau-tay-ngot-ngao-phan-1-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20261008/dau-tay-ngot-ngao-phan-1-thumb.webp',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub',
        is_custom: false,
        is_momo: false
    },
    {
        query: 'xem phim trúng số độc đắc vẫn phải đi làm',
        title: 'trúng số độc đắc vẫn phải đi làm',
        traffic: '+30%',
        movie_slug: 'trung-so-doc-dac-van-phai-di-lam',
        movie_name: 'Trúng Số Độc Đắc Vẫn Phải Đi Làm',
        poster_url: 'https://phimimg.com/uploads/movies/20260910/trung-so-doc-dac-van-phai-di-lam-poster.webp',
        thumb_url: 'https://phimimg.com/uploads/movies/20260910/trung-so-doc-dac-van-phai-di-lam-thumb.webp',
        year: '2026',
        quality: 'FHD',
        lang: 'Vietsub',
        is_custom: false,
        is_momo: false
    }
];

// In-memory cache để phản hồi siêu tốc < 1ms
let inMemoryTrends = null;
let inMemoryUpdatedAt = null;

function toSlug(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function cleanKeyword(str) {
    if (!str) return '';
    return String(str)
        .toLowerCase()
        .replace(/^(\d+[\.\s\t]+)?(xem phim|phim|vé xem phim)\s+/i, '')
        .replace(/^\d+[\.\s\t]+/i, '')
        .replace(/\s*\([a-z0-9\-_]+\)\s*/gi, ' ')
        .replace(/\s*=>\s*.*$/i, '')
        .replace(/\s+(xem phim|xem|phim|tập\s+\d+.*)$/i, '')
        .trim();
}

function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Nếu file chính chưa tồn tại, thử khôi phục từ RAM hoặc backup
    if (!fs.existsSync(DATA_FILE)) {
        if (inMemoryTrends && Array.isArray(inMemoryTrends) && inMemoryTrends.length > 0) {
            try {
                const payload = {
                    updatedAt: inMemoryUpdatedAt || new Date().toISOString(),
                    items: inMemoryTrends
                };
                fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
                return;
            } catch (_) {}
        }

        if (fs.existsSync(DATA_BACKUP_FILE)) {
            try {
                fs.copyFileSync(DATA_BACKUP_FILE, DATA_FILE);
                console.log('[TrendsControl] 🛡️ Đã tự động khôi phục google_trends.json từ file backup.');
                return;
            } catch (_) {}
        }
        
        const payload = {
            updatedAt: new Date().toISOString(),
            items: INITIAL_TRENDS
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
        try {
            fs.writeFileSync(DATA_BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf8');
        } catch (_) {}
    }
}

/**
 * Lấy danh sách Trends hiện tại (ưu tiên RAM Cache -> Primary File -> Shadow Backup -> INITIAL)
 */
function getStoredTrends() {
    ensureFile();

    if (inMemoryTrends && Array.isArray(inMemoryTrends) && inMemoryTrends.length > 0) {
        return inMemoryTrends;
    }

    // 1. Đọc file chính
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data.items) && data.items.length > 0) {
                inMemoryTrends = data.items;
                inMemoryUpdatedAt = data.updatedAt || new Date().toISOString();
                return inMemoryTrends;
            }
        }
    } catch (e) {
        console.error('[TrendsControl] Đọc file chính lỗi:', e.message);
    }

    // 2. Thử đọc file backup
    try {
        if (fs.existsSync(DATA_BACKUP_FILE)) {
            const rawBackup = fs.readFileSync(DATA_BACKUP_FILE, 'utf8');
            const dataBackup = JSON.parse(rawBackup);
            if (Array.isArray(dataBackup.items) && dataBackup.items.length > 0) {
                console.log('[TrendsControl] 🛡️ Khôi phục dữ liệu từ backup file!');
                inMemoryTrends = dataBackup.items;
                inMemoryUpdatedAt = dataBackup.updatedAt || new Date().toISOString();
                // Tái tạo lại file chính
                fs.writeFileSync(DATA_FILE, JSON.stringify(dataBackup, null, 2), 'utf8');
                return inMemoryTrends;
            }
        }
    } catch (_) {}

    inMemoryTrends = INITIAL_TRENDS;
    return inMemoryTrends;
}

/**
 * Lưu danh sách Trends — Tự động bảo vệ và bảo lưu phim đã gán (Auto-Preserve Movie Mappings)
 * Ghi đồng thời ra:
 * 1. RAM Cache (0ms)
 * 2. data/google_trends.json
 * 3. data/google_trends.backup.json
 * 4. MongoDB Atlas (Cloud Database — chống mất dữ liệu vĩnh viễn khi restart/deploy)
 */
function saveStoredTrends(items) {
    ensureFile();
    try {
        // Lấy danh sách hiện tại để bảo lưu các phim Admin đã kỳ công gán
        const currentList = getStoredTrends();
        const existingBySlug = new Map();
        const existingByQuery = new Map();
        const existingByClean = new Map();

        for (const cur of currentList) {
            if (cur.movie_slug) {
                existingBySlug.set(cur.movie_slug.toLowerCase().trim(), cur);
            }
            const qSlug = toSlug(cur.query || '');
            if (qSlug) existingByQuery.set(qSlug, cur);
            const cSlug = toSlug(cleanKeyword(cur.query || cur.title || ''));
            if (cSlug) existingByClean.set(cSlug, cur);
        }

        const cleanItems = (Array.isArray(items) ? items : []).map(item => {
            const rawQuery = String(item.query || item.title || '').trim();
            const cleanTitle = String(item.title || item.query || '').replace(/^(xem phim|phim)\s+/i, '').trim();
            const traffic = String(item.traffic || 'Thịnh hành').trim();

            const clean = {
                query: rawQuery || cleanTitle,
                title: cleanTitle || rawQuery,
                traffic: traffic || 'Thịnh hành'
            };

            // Nếu item đã có sẵn movie_slug -> giữ nguyên
            if (item.movie_slug) clean.movie_slug = String(item.movie_slug).trim();
            if (item.movie_name) clean.movie_name = String(item.movie_name).trim();
            if (item.poster_url) clean.poster_url = String(item.poster_url).trim();
            if (item.thumb_url) clean.thumb_url = String(item.thumb_url).trim();
            if (item.year) clean.year = String(item.year).trim();
            if (item.quality) clean.quality = String(item.quality).trim();
            if (item.lang) clean.lang = String(item.lang).trim();
            if (item.is_custom !== undefined) clean.is_custom = !!item.is_custom;
            if (item.is_momo !== undefined) clean.is_momo = !!item.is_momo;

            // 🛡️ AUTO-PRESERVE: Nếu item chưa có movie_slug (do bulk import từ Google Trends), 
            // kiểm tra xem trước đó Admin đã từng gán phim cho từ khóa này chưa để khôi phục lại!
            if (!clean.movie_slug) {
                const qKey = toSlug(clean.query);
                const cKey = toSlug(cleanKeyword(clean.query));
                const matchOld = existingByQuery.get(qKey) || existingByClean.get(cKey);
                if (matchOld && matchOld.movie_slug) {
                    clean.movie_slug = matchOld.movie_slug;
                    clean.movie_name = matchOld.movie_name || clean.movie_name;
                    clean.poster_url = matchOld.poster_url || clean.poster_url;
                    clean.thumb_url = matchOld.thumb_url || clean.thumb_url;
                    clean.year = matchOld.year || clean.year;
                    clean.quality = matchOld.quality || clean.quality;
                    clean.lang = matchOld.lang || clean.lang;
                    clean.is_custom = !!matchOld.is_custom;
                    clean.is_momo = !!matchOld.is_momo;
                }
            }

            return clean;
        }).filter(it => (it.query && it.query.length > 0) || (it.title && it.title.length > 0) || (it.movie_slug && it.movie_slug.length > 0));

        const nowIso = new Date().toISOString();
        const payload = {
            updatedAt: nowIso,
            items: cleanItems
        };

        // 1. Cập nhật RAM Cache
        inMemoryTrends = cleanItems;
        inMemoryUpdatedAt = nowIso;

        // 2. Ghi ra file chính
        fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');

        // 3. Ghi ra file backup dự phòng
        try {
            fs.writeFileSync(DATA_BACKUP_FILE, JSON.stringify(payload, null, 2), 'utf8');
        } catch (_) {}

        // 4. Đồng bộ vĩnh viễn lên MongoDB Atlas
        syncToDatabaseAsync(payload);

        return { success: true, count: cleanItems.length, items: cleanItems };
    } catch (e) {
        console.error('[TrendsControl] Lưu file lỗi:', e.message);
        return { success: false, message: e.message };
    }
}

/**
 * Lưu dữ liệu Trends lên MongoDB Atlas ngầm không chặn luồng chính
 */
async function syncToDatabaseAsync(payload) {
    try {
        const SiteSetting = require('../models/SiteSetting');
        if (SiteSetting) {
            await SiteSetting.findOneAndUpdate(
                { key: 'google_trends_24h' },
                { key: 'google_trends_24h', value: payload },
                { upsert: true, returnDocument: 'after' }
            );
        }
    } catch (e) {
        console.warn('[TrendsControl] Cảnh báo sao lưu MongoDB:', e.message);
    }
}

/**
 * Tự động đồng bộ và khôi phục Trends từ MongoDB Atlas khi server khởi động
 * Đảm bảo 100% không bao giờ bị mất phim admin đã cấu hình sau khi cập nhật VPS hay deploy
 */
async function syncWithDatabase() {
    try {
        const SiteSetting = require('../models/SiteSetting');
        if (!SiteSetting) return;

        const doc = await SiteSetting.findOne({ key: 'google_trends_24h' }).lean();
        if (doc && doc.value && Array.isArray(doc.value.items) && doc.value.items.length > 0) {
            const dbPayload = doc.value;
            const dbItems = dbPayload.items;
            const dbUpdatedAt = new Date(dbPayload.updatedAt || doc.updated_at || 0).getTime();

            // Kiểm tra file local hiện tại
            let localUpdatedAt = 0;
            let localItems = [];
            try {
                if (fs.existsSync(DATA_FILE)) {
                    const raw = fs.readFileSync(DATA_FILE, 'utf8');
                    const parsed = JSON.parse(raw);
                    localItems = parsed.items || [];
                    localUpdatedAt = new Date(parsed.updatedAt || 0).getTime();
                }
            } catch (_) {}

            const dbHasSlugs = dbItems.some(it => it.movie_slug);
            const localHasSlugs = localItems.some(it => it.movie_slug);

            // Tự khôi phục từ MongoDB nếu local bị mất slug hoặc MongoDB mới hơn
            if ((!localHasSlugs && dbHasSlugs) || (dbUpdatedAt >= localUpdatedAt && dbItems.length >= localItems.length)) {
                fs.writeFileSync(DATA_FILE, JSON.stringify(dbPayload, null, 2), 'utf8');
                try {
                    fs.writeFileSync(DATA_BACKUP_FILE, JSON.stringify(dbPayload, null, 2), 'utf8');
                } catch (_) {}
                inMemoryTrends = dbItems;
                inMemoryUpdatedAt = dbPayload.updatedAt || new Date().toISOString();
                console.log(`[TrendsControl] 🛡️ Đã đồng bộ an toàn ${dbItems.length} phim Trends từ MongoDB Atlas vào hệ thống.`);
            } else if (localItems.length > 0) {
                // Local mới hơn -> sao lưu lên MongoDB
                await SiteSetting.findOneAndUpdate(
                    { key: 'google_trends_24h' },
                    { key: 'google_trends_24h', value: { updatedAt: new Date().toISOString(), items: localItems } },
                    { upsert: true, returnDocument: 'after' }
                );
                console.log(`[TrendsControl] ☁️ Đã sao lưu ${localItems.length} phim Trends từ local lên MongoDB Atlas.`);
            }
        } else {
            // MongoDB chưa có bản ghi, nạp từ file local lên
            const current = getStoredTrends();
            if (current && current.length > 0) {
                await SiteSetting.findOneAndUpdate(
                    { key: 'google_trends_24h' },
                    { key: 'google_trends_24h', value: { updatedAt: new Date().toISOString(), items: current } },
                    { upsert: true, returnDocument: 'after' }
                );
                console.log(`[TrendsControl] 🚀 Đã khởi tạo ${current.length} phim Trends lên MongoDB Atlas.`);
            }
        }
    } catch (e) {
        console.warn('[TrendsControl] Lỗi syncWithDatabase:', e.message);
    }
}

/**
 * Khớp nối danh sách từ khóa Trends với thông tin phim để hiển thị lên Slider Trang Chủ
 * Siêu tối ưu: Tận dụng trực tiếp metadata Admin đã gán để phản hồi < 5ms không bị nghẽn mạng!
 */
async function matchTrendsWithMovies(trendItems = []) {
    const list = Array.isArray(trendItems) && trendItems.length > 0 ? trendItems : getStoredTrends();
    const matchedMovies = [];
    const seenSlugs = new Set();

    let customStreams = null;
    try {
        customStreams = require('./customStreams');
    } catch (_) {}

    for (const item of list) {
        // 1. NẾU ADMIN ĐÃ GÁN PHIM CỤ THỂ (Có movie_slug)
        if (item.movie_slug) {
            const slug = String(item.movie_slug).trim();
            if (seenSlugs.has(slug)) continue;

            // 1.1 Kiểm tra Custom Streams (R2 VIP / Phim Tùy Biến)
            if (customStreams && typeof customStreams.getBySlug === 'function') {
                const custom = customStreams.getBySlug(slug);
                if (custom) {
                    seenSlugs.add(slug);
                    matchedMovies.push({
                        name: custom.title || custom.name || item.movie_name,
                        origin_name: custom.original_title || custom.origin_name || custom.title || custom.name,
                        slug: custom.slug,
                        poster_url: custom.poster_url || custom.thumb_url || item.poster_url,
                        thumb_url: custom.thumb_url || custom.poster_url || item.thumb_url,
                        year: custom.year || item.year || new Date().getFullYear(),
                        quality: custom.quality || item.quality || 'FHD R2 VIP',
                        lang: custom.lang || item.lang || 'Vietsub / Thuyết Minh',
                        is_custom: true,
                        is_google_trend: true,
                        trend_keyword: item.query || item.title,
                        trend_traffic: item.traffic || 'Thịnh hành'
                    });
                    continue;
                }
            }

            // 1.2 Nếu đã có sẵn metadata (Tên phim & Poster do Admin gán hoặc từ cache/MoMo)
            // -> Trả về ngay lập tức < 1ms, không cần chờ mạng bên thứ ba!
            if (item.movie_name && (item.poster_url || item.thumb_url)) {
                seenSlugs.add(slug);
                matchedMovies.push({
                    name: item.movie_name,
                    origin_name: item.origin_name || item.movie_name || item.title || item.query,
                    slug: slug,
                    poster_url: item.poster_url || item.thumb_url || '',
                    thumb_url: item.thumb_url || item.poster_url || '',
                    year: item.year || new Date().getFullYear(),
                    quality: item.quality || (item.is_custom ? 'FHD R2 VIP' : 'FHD'),
                    lang: item.lang || 'Vietsub',
                    is_custom: !!item.is_custom,
                    is_cinema: !!item.is_momo,
                    is_google_trend: true,
                    trend_keyword: item.query || item.title,
                    trend_traffic: item.traffic || 'Thịnh hành'
                });
                continue;
            }

            // 1.3 Nếu chưa có poster -> Thử lấy qua PhimAPI chi tiết với timeout ngắn 1.5s
            try {
                const detailRes = await axios.get(`https://phimapi.com/phim/${encodeURIComponent(slug)}`, { timeout: 1500 });
                const m = detailRes.data?.movie;
                if (m && m.slug && !seenSlugs.has(m.slug)) {
                    seenSlugs.add(m.slug);
                    matchedMovies.push({
                        ...m,
                        is_google_trend: true,
                        trend_keyword: item.query || item.title,
                        trend_traffic: item.traffic || 'Thịnh hành'
                    });
                    continue;
                }
            } catch (_) {}

            // 1.4 Fallback với tên từ từ khóa nếu PhimAPI lỗi
            seenSlugs.add(slug);
            matchedMovies.push({
                name: item.movie_name || item.title || item.query,
                origin_name: item.origin_name || item.movie_name || item.title || item.query,
                slug: slug,
                poster_url: item.poster_url || item.thumb_url || '',
                thumb_url: item.thumb_url || item.poster_url || '',
                year: item.year || new Date().getFullYear(),
                quality: item.quality || 'FHD',
                lang: item.lang || 'Vietsub',
                is_custom: !!item.is_custom,
                is_google_trend: true,
                trend_keyword: item.query || item.title,
                trend_traffic: item.traffic || 'Thịnh hành'
            });
            continue;
        }

        // 2. TÌM KIẾM TỰ ĐỘNG THEO TỪ KHÓA (Cho các mục chưa gán slug)
        const searchKeyword = item.movie_name || item.target_keyword || item.title || item.query;
        if (!searchKeyword) continue;

        // 2.1 Thử tìm trong Custom Streams trước
        if (customStreams && typeof customStreams.getAll === 'function') {
            const allCustom = customStreams.getAll(true) || [];
            const kSlug = toSlug(searchKeyword);
            const foundCustom = allCustom.find(c => {
                const cSlug = toSlug(c.name || c.title || '');
                const oSlug = toSlug(c.origin_name || c.original_title || '');
                const s = c.slug || '';
                return cSlug.includes(kSlug) || kSlug.includes(cSlug) ||
                       oSlug.includes(kSlug) || kSlug.includes(oSlug) ||
                       s.includes(kSlug);
            });
            if (foundCustom && !seenSlugs.has(foundCustom.slug)) {
                seenSlugs.add(foundCustom.slug);
                matchedMovies.push({
                    name: foundCustom.title || foundCustom.name,
                    origin_name: foundCustom.original_title || foundCustom.origin_name || foundCustom.title,
                    slug: foundCustom.slug,
                    poster_url: foundCustom.poster_url || foundCustom.thumb_url,
                    thumb_url: foundCustom.thumb_url || foundCustom.poster_url,
                    year: foundCustom.year || new Date().getFullYear(),
                    quality: foundCustom.quality || 'FHD R2 VIP',
                    lang: foundCustom.lang || 'Vietsub / Thuyết Minh',
                    is_custom: true,
                    is_google_trend: true,
                    trend_keyword: item.query || item.title,
                    trend_traffic: item.traffic || 'Thịnh hành'
                });
                continue;
            }
        }

        // 2.2 Tìm kiếm PhimAPI trực tuyến (timeout 1.5s)
        try {
            const searchRes = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&limit=4`, {
                timeout: 1500
            });
            const items = searchRes.data?.data?.items || [];
            if (!items.length) continue;

            const titleSlug = toSlug(searchKeyword);
            const found = items.find(m => {
                const mSlug = toSlug(m.name || '');
                const oSlug = toSlug(m.origin_name || '');
                const slug = m.slug || '';
                return mSlug.includes(titleSlug) || titleSlug.includes(mSlug) ||
                       oSlug.includes(titleSlug) || titleSlug.includes(oSlug) ||
                       slug.includes(titleSlug);
            });

            if (found && !seenSlugs.has(found.slug)) {
                seenSlugs.add(found.slug);
                matchedMovies.push({
                    ...found,
                    is_google_trend: true,
                    trend_keyword: item.query || item.title,
                    trend_traffic: item.traffic || 'Thịnh hành'
                });
            }
        } catch (_) {}
    }

    return matchedMovies;
}

module.exports = {
    getStoredTrends,
    saveStoredTrends,
    matchTrendsWithMovies,
    syncWithDatabase,
    INITIAL_TRENDS
};
