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
        const cleanItems = (Array.isArray(items) ? items : []).map(item => ({
            query: String(item.query || item.title || '').trim(),
            title: String(item.title || item.query || '').replace(/^(xem phim|phim)\s+/i, '').trim(),
            traffic: String(item.traffic || 'Thịnh hành').trim(),
            movie_slug: item.movie_slug ? String(item.movie_slug).trim() : undefined,
            movie_name: item.movie_name ? String(item.movie_name).trim() : undefined
        })).filter(it => it.title.length > 0);

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

    for (const item of list) {
        // 1. Nếu Admin đã gán phim cụ thể (bằng slug)
        if (item.movie_slug) {
            try {
                const detailRes = await axios.get(`https://phimapi.com/phim/${item.movie_slug}`, { timeout: 3000 });
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
        }

        // 2. Tìm kiếm tự động theo từ khóa / tên phim được chỉ định
        const searchKeyword = item.movie_name || item.target_keyword || item.title || item.query;
        if (!searchKeyword) continue;
        try {
            const searchRes = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&limit=4`, {
                timeout: 3000
            });
            const items = searchRes.data?.data?.items || [];
            if (!items.length) continue;

            const titleSlug = toSlug(searchKeyword);
            // Ưu tiên khớp chính xác hoặc slug bao hàm
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
