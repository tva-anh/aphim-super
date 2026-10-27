/**
 * lib/trendsControl.js
 * Quản lý danh sách từ khóa xu hướng Google Trends 24h chuẩn xác
 * Lưu trữ tại data/google_trends.json & hỗ trợ cập nhật từ Admin
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'google_trends.json');

const INITIAL_TRENDS = [
    { query: 'xem phim phá đám sinh nhật mẹ', title: 'phá đám sinh nhật mẹ', traffic: '+550%' },
    { query: 'xem phim thần thám bao thanh thiên', title: 'bao thanh thiên', traffic: '+130%' },
    { query: 'xem phim lan hương như cố tập 1', title: 'lan hương như cố', traffic: '+110%' },
    { query: 'xem phim không thể thay thế tập 1', title: 'không thể thay thế', traffic: '+80%' },
    { query: 'xem phim merry berry love tập 1', title: 'merry berry love', traffic: '+60%' },
    { query: 'xem phim phí phòng', title: 'phí phòng', traffic: '+40%' },
    { query: 'xem phim trúng số độc đắc vẫn phải đi làm', title: 'trúng số độc đắc vẫn phải đi làm', traffic: '+30%' },
    { query: 'xem phim spider man brand new day', title: 'spider man brand new day', traffic: '+20%' },
    { query: 'xem phim ma xó', title: 'ma xó', traffic: '+9%' }
];

function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({
            updatedAt: new Date().toISOString(),
            items: INITIAL_TRENDS
        }, null, 2), 'utf8');
    }
}

function getStoredTrends() {
    ensureFile();
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.items) && data.items.length > 0) {
            return data.items;
        }
    } catch (e) {
        console.error('[TrendsControl] Đọc file lỗi:', e.message);
    }
    return INITIAL_TRENDS;
}

function saveStoredTrends(items) {
    ensureFile();
    try {
        const cleanItems = (Array.isArray(items) ? items : []).map(item => {
            const query = String(item.query || item.title || '').trim();
            const title = String(item.title || item.query || '').replace(/^(xem phim|phim)\s+/i, '').trim();
            const traffic = String(item.traffic || 'Thịnh hành').trim();
            const clean = {
                query: query || title,
                title: title || query,
                traffic: traffic || 'Thịnh hành'
            };
            if (item.movie_slug) clean.movie_slug = String(item.movie_slug).trim();
            if (item.movie_name) clean.movie_name = String(item.movie_name).trim();
            if (item.poster_url) clean.poster_url = String(item.poster_url).trim();
            if (item.thumb_url) clean.thumb_url = String(item.thumb_url).trim();
            if (item.year) clean.year = String(item.year).trim();
            if (item.quality) clean.quality = String(item.quality).trim();
            if (item.lang) clean.lang = String(item.lang).trim();
            if (item.is_custom !== undefined) clean.is_custom = !!item.is_custom;
            if (item.is_momo !== undefined) clean.is_momo = !!item.is_momo;
            return clean;
        }).filter(it => (it.query && it.query.length > 0) || (it.title && it.title.length > 0) || (it.movie_slug && it.movie_slug.length > 0));

        const payload = {
            updatedAt: new Date().toISOString(),
            items: cleanItems
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
        return { success: true, count: cleanItems.length, items: cleanItems };
    } catch (e) {
        console.error('[TrendsControl] Lưu file lỗi:', e.message);
        return { success: false, message: e.message };
    }
}

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

async function matchTrendsWithMovies(trendItems = []) {
    const list = Array.isArray(trendItems) && trendItems.length > 0 ? trendItems : getStoredTrends();
    const matchedMovies = [];
    const seenSlugs = new Set();

    let customStreams = null;
    try {
        customStreams = require('./customStreams');
    } catch (_) {}

    for (const item of list) {
        // 1. Nếu Admin đã gán phim cụ thể (bằng slug)
        if (item.movie_slug) {
            const slug = item.movie_slug.trim();
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

            // 1.2 Kiểm tra qua PhimAPI chi tiết
            try {
                const detailRes = await axios.get(`https://phimapi.com/phim/${encodeURIComponent(slug)}`, { timeout: 3000 });
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

            // 1.3 Nếu PhimAPI 404 / Lỗi mạng nhưng đã có sẵn metadata (từ Search Admin hoặc MoMo hoặc cache)
            if (item.movie_name || item.poster_url) {
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
        }

        // 2. Tìm kiếm tự động theo từ khóa / tên phim được chỉ định
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

        // 2.2 Tìm kiếm PhimAPI trực tuyến
        try {
            const searchRes = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&limit=4`, {
                timeout: 3000
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
    matchTrendsWithMovies
};
