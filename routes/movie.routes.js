/**
 * routes/movie.routes.js
 * Quản lý danh sách phim ẩn — MongoDB (thay thế BLOCKED_SLUGS trong RAM)
 */
const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('../middleware/adminAuth.middleware');
const MovieOverride = require('../models/MovieOverride');
const AdminLog      = require('../models/AdminLog');

// ── GET /api/movies/hidden/list — Public, dùng cho client filter ─────────────
router.get('/hidden/list', async (req, res) => {
    try {
        const hidden = await MovieOverride.find({ is_hidden: true }).select('slug -_id');
        return res.json({
            success: true,
            data: hidden.map(h => h.slug)
        });
    } catch (err) {
        return res.status(500).json({ success: false, data: [] });
    }
});

// ── POST /api/movies/hide — Admin ────────────────────────────────────────────
router.post('/hide', requireAdmin, async (req, res) => {
    try {
        const { slug, reason = '' } = req.body;
        if (!slug) return res.status(400).json({ success: false, message: 'Thiếu slug phim.' });

        await MovieOverride.findOneAndUpdate(
            { slug },
            { slug, is_hidden: true, hide_reason: reason, hidden_by: req.admin.id, hidden_at: new Date() },
            { upsert: true, new: true }
        );

        await AdminLog.create({
            admin_id: req.admin.id, admin_name: req.admin.profile?.name || 'Admin',
            action: 'hide_movie', target_type: 'movie', target_id: slug, target_name: slug,
            after: { is_hidden: true, reason }, note: reason,
            ip: req.ip
        });

        return res.json({ success: true, message: `Đã ẩn phim: ${slug}` });

    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/movies/show — Admin ────────────────────────────────────────────
router.post('/show', requireAdmin, async (req, res) => {
    try {
        const { slug } = req.body;
        if (!slug) return res.status(400).json({ success: false, message: 'Thiếu slug phim.' });

        await MovieOverride.findOneAndUpdate({ slug }, { is_hidden: false, hidden_at: null });

        await AdminLog.create({
            admin_id: req.admin.id, admin_name: req.admin.profile?.name || 'Admin',
            action: 'show_movie', target_type: 'movie', target_id: slug, target_name: slug,
            after: { is_hidden: false }, ip: req.ip
        });

        return res.json({ success: true, message: `Đã hiện phim: ${slug}` });

    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/movies/overrides — Admin, danh sách overrides ───────────────────
router.get('/overrides', requireAdmin, async (req, res) => {
    try {
        const overrides = await MovieOverride.find().sort({ hidden_at: -1 });
        return res.json({ success: true, data: overrides });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/movies/phimapi-proxy — Server-side proxy an toàn tránh CORS & timeout ───
const apiProxyCache = new Map();
const PROXY_CACHE_TTL = 3 * 60 * 1000; // 3 phút RAM cache

router.get('/phimapi-proxy', async (req, res) => {
    try {
        const rawPath = req.query.path || '';
        if (!rawPath) return res.status(400).json({ status: false, message: 'Thiếu tham số path' });
        const cleanPath = rawPath.startsWith('/') ? rawPath : '/' + rawPath;

        const cached = apiProxyCache.get(cleanPath);
        if (cached && (Date.now() - cached.time < PROXY_CACHE_TTL)) {
            res.setHeader('X-Proxy-Cache', 'HIT');
            return res.json(cached.data);
        }

        const targetUrl = 'https://phimapi.com' + cleanPath;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return res.status(response.status).json({ status: false, message: 'Nguồn phimapi trả về mã lỗi' });
        }

        const data = await response.json();
        apiProxyCache.set(cleanPath, { data, time: Date.now() });
        if (apiProxyCache.size > 200) {
            const oldestKey = apiProxyCache.keys().next().value;
            apiProxyCache.delete(oldestKey);
        }
        res.setHeader('Cache-Control', 'public, max-age=180');
        return res.json(data);
    } catch (err) {
        return res.status(502).json({ status: false, message: 'Proxy lỗi kết nối', error: err.message });
    }
});

// ── GET /api/movies/cinema-hot — Luồng tự động kéo phim rạp trực tiếp từ MoMo Cinema (Đang chiếu & Sắp chiếu) ───
const axios = require('axios');
const TMDB_BASE_URL = 'https://api.tmdb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '5fb3c8d9ad2ca4cd2029836befcc3ab5';

let cinemaHotCache = null;
let cinemaHotCacheTime = 0;
const CINEMA_HOT_TTL = 20 * 60 * 1000; // 20 phút RAM cache

function toSlug(str) {
    return (str || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim().replace(/\s+/g, '-');
}

function formatDuration(mins) {
    if (!mins || mins <= 0) return 'Chiếu Rạp';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h} giờ${m > 0 ? ' ' + m + ' phút' : ''}`;
    return `${m} phút`;
}

function formatDateVN(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '';
    }
}

const GENRE_MAP = {
    28: 'Hành Động', 12: 'Phiêu Lưu', 16: 'Hoạt Hình', 35: 'Hài', 80: 'Hình Sự',
    99: 'Tài Liệu', 18: 'Chính Kịch', 10751: 'Gia Đình', 14: 'Giả Tưởng', 36: 'Lịch Sử',
    27: 'Kinh Dị', 10402: 'Âm Nhạc', 9648: 'Bí Ẩn', 10749: 'Lãng Mạn', 878: 'Viễn Tưởng',
    10770: 'Phim Truyền Hình', 53: 'Gay Cấn', 10752: 'Chiến Tranh', 37: 'Miền Tây'
};

async function fetchFromMoMoCinema() {
    try {
        const res = await axios.get('https://momo.vn/cinema', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 6500
        });

        const html = res.data;
        const startTag = '<script id="__NEXT_DATA__" type="application/json">';
        const endTag = '</script>';
        const startIdx = html.indexOf(startTag);
        if (startIdx === -1) return null;
        const endIdx = html.indexOf(endTag, startIdx);
        if (endIdx === -1) return null;

        const jsonStr = html.substring(startIdx + startTag.length, endIdx);
        const data = JSON.parse(jsonStr);
        const props = data.props?.pageProps || {};

        const nowItems = props.dataMoviesNow?.Data?.Items || [];
        const soonItems = props.dataMoviesSoon?.Data?.Items || [];

        if (!nowItems.length && !soonItems.length) return null;

        const list = [];
        const seen = new Set();

        // 1. Phim đang chiếu tại rạp (Now Playing trên MoMo)
        for (const m of nowItems) {
            if (!m.Title) continue;
            const slug = toSlug(m.Title);
            if (seen.has(slug)) continue;
            seen.add(slug);

            const poster = (m.GraphicUrl || m.BannerUrl || '').replace('/convert-webp', '');
            const fallbackPoster = (m.BannerUrl || m.GraphicUrl || '').replace('/convert-webp', '');

            const rawAge = (m.ApiRatingFormat || (m.ApiRating === 'C18' ? '18+' : m.ApiRating === 'C16' ? '16+' : m.ApiRating === 'C13' ? '13+' : (m.ApiRating === 'P' ? 'P' : '16+'))).trim();
            const rating = m.ApiRatingPoint ? Number(m.ApiRatingPoint).toFixed(1) : null;
            const ratingCount = m.ApiRatingTotalFormat || (m.ApiRatingTotal ? String(m.ApiRatingTotal) : '');

            let statusNote = 'Đang chiếu tại rạp';
            if (m.ApiSneakShowDate) {
                const fd = formatDateVN(m.ApiSneakShowDate);
                if (fd) statusNote = `Suất chiếu đặc biệt ${fd}`;
            } else if (m.OpeningDate) {
                const fd = formatDateVN(m.OpeningDate);
                if (fd) statusNote = `Khởi chiếu ${fd}`;
            }

            list.push({
                name: m.Title,
                origin_name: m.TitleEn || m.Title,
                slug: slug,
                age: rawAge || '16+',
                rating: rating,
                rating_count: ratingCount,
                status_note: statusNote,
                genres: (m.ApiGenreName || 'Chiếu Rạp').split(',').slice(0, 2).map(g => g.trim()).join(', '),
                duration: formatDuration(m.Duration),
                release_date: m.OpeningDate ? m.OpeningDate.slice(0, 10) : '',
                poster: poster,
                fallback_poster: fallbackPoster,
                trailer: m.TrailerUrl || m.ApiAutoplayTrailer || '',
                synopsis: m.Synopsis || ''
            });
        }

        // 2. Phim sắp chiếu tại rạp (Coming Soon trên MoMo)
        for (const m of soonItems) {
            if (!m.Title) continue;
            const slug = toSlug(m.Title);
            if (seen.has(slug)) continue;
            seen.add(slug);

            const poster = (m.GraphicUrl || m.BannerUrl || '').replace('/convert-webp', '');
            const fallbackPoster = (m.BannerUrl || m.GraphicUrl || '').replace('/convert-webp', '');

            const rawAge = (m.ApiRatingFormat || (m.ApiRating === 'C18' ? '18+' : m.ApiRating === 'C16' ? '16+' : m.ApiRating === 'C13' ? '13+' : (m.ApiRating === 'P' ? 'P' : '16+'))).trim();

            let statusNote = 'Sắp chiếu tại rạp';
            if (m.OpeningDate) {
                const fd = formatDateVN(m.OpeningDate);
                if (fd) statusNote = `Dự kiến tại rạp ${fd}`;
            }

            list.push({
                name: m.Title,
                origin_name: m.TitleEn || m.Title,
                slug: slug,
                age: rawAge || '16+',
                rating: null,
                rating_count: '',
                status_note: statusNote,
                genres: (m.ApiGenreName || 'Chiếu Rạp').split(',').slice(0, 2).map(g => g.trim()).join(', '),
                duration: formatDuration(m.Duration),
                release_date: m.OpeningDate ? m.OpeningDate.slice(0, 10) : '',
                poster: poster,
                fallback_poster: fallbackPoster,
                trailer: m.TrailerUrl || m.ApiAutoplayTrailer || '',
                synopsis: m.Synopsis || ''
            });
        }

        return list;
    } catch (err) {
        console.warn('⚠️ Lỗi kết nối MoMo Cinema API:', err.message);
        return null;
    }
}

router.get('/cinema-hot', async (req, res) => {
    try {
        if (cinemaHotCache && (Date.now() - cinemaHotCacheTime < CINEMA_HOT_TTL)) {
            res.setHeader('X-Cinema-Cache', 'HIT');
            return res.json({ success: true, source: 'momo_live', items: cinemaHotCache });
        }

        // 🌟 1. ƯU TIÊN SỐ 1: Tự động kéo trực tiếp dữ liệu vé rạp từ MoMo Cinema
        const momoList = await fetchFromMoMoCinema();
        if (momoList && momoList.length > 0) {
            cinemaHotCache = momoList;
            cinemaHotCacheTime = Date.now();
            res.setHeader('Cache-Control', 'public, max-age=1200');
            return res.json({ success: true, source: 'momo_live', items: momoList });
        }

        // 🌟 2. NGUỒN DỰ PHÒNG: Tự động kéo song song phim rạp từ TMDB VN + OPhim nếu MoMo timeout
        const [nowRes, upRes, ophimRes] = await Promise.allSettled([
            axios.get(`${TMDB_BASE_URL}/movie/now_playing`, {
                params: { api_key: TMDB_API_KEY, region: 'VN', language: 'vi-VN' },
                timeout: 5000
            }),
            axios.get(`${TMDB_BASE_URL}/movie/upcoming`, {
                params: { api_key: TMDB_API_KEY, region: 'VN', language: 'vi-VN' },
                timeout: 5000
            }),
            axios.get('https://phimapi.com/v1/api/danh-sach/phim-chieu-rap?page=1&limit=24', {
                timeout: 5000
            })
        ]);

        const tmdbNow = (nowRes.status === 'fulfilled' && nowRes.value.data?.results) ? nowRes.value.data.results : [];
        const tmdbUp = (upRes.status === 'fulfilled' && upRes.value.data?.results) ? upRes.value.data.results : [];
        const ophimItems = (ophimRes.status === 'fulfilled' && ophimRes.value.data?.data?.items) ? ophimRes.value.data.data.items : [];

        const combined = [...tmdbNow, ...tmdbUp];
        const seen = new Set();
        const fallbackList = [];

        for (const m of combined) {
            if (!m.title || !m.poster_path) continue;
            const slug = toSlug(m.title);
            if (seen.has(slug)) continue;
            seen.add(slug);

            const genres = (m.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 2).join(', ') || 'Chiếu Rạp';
            const voteAvg = m.vote_average ? Number(m.vote_average).toFixed(1) : null;
            const voteCount = m.vote_count ? (m.vote_count >= 1000 ? (m.vote_count / 1000).toFixed(1) + 'K' : String(m.vote_count)) : null;

            let statusNote = 'Đang chiếu tại rạp';
            if (m.release_date) {
                const parts = m.release_date.split('-');
                if (parts.length === 3) {
                    statusNote = `Khởi chiếu ${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }

            const age = m.adult ? '18+' : ((m.genre_ids || []).includes(27) ? '18+' : ((m.genre_ids || []).includes(16) ? 'P' : '16+'));

            fallbackList.push({
                name: m.title,
                origin_name: m.original_title || '',
                slug: slug,
                age: age,
                rating: (voteAvg && Number(voteAvg) > 0) ? voteAvg : null,
                rating_count: voteCount,
                status_note: statusNote,
                genres: genres,
                duration: 'Chiếu Rạp',
                release_date: m.release_date || '',
                poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                fallback_poster: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : `https://image.tmdb.org/t/p/w500${m.poster_path}`
            });
        }

        for (const op of ophimItems) {
            if (!op.name || !op.slug) continue;
            if (seen.has(op.slug)) continue;
            seen.add(op.slug);

            const posterImg = op.poster_url ? (op.poster_url.startsWith('http') ? op.poster_url : `https://phimimg.com/${op.poster_url}`) : '';
            const thumbImg = op.thumb_url ? (op.thumb_url.startsWith('http') ? op.thumb_url : `https://phimimg.com/${op.thumb_url}`) : posterImg;

            fallbackList.push({
                name: op.name,
                origin_name: op.origin_name || '',
                slug: op.slug,
                age: '16+',
                rating: '8.8',
                rating_count: 'Rạp',
                status_note: op.year ? `Năm ${op.year}` : 'Chiếu Rạp',
                genres: (op.category && op.category[0] && op.category[0].name) || 'Chiếu Rạp',
                duration: op.time || op.episode_current || 'Full',
                release_date: String(op.year || ''),
                poster: posterImg || thumbImg,
                fallback_poster: thumbImg || posterImg
            });
        }

        if (fallbackList.length > 0) {
            cinemaHotCache = fallbackList;
            cinemaHotCacheTime = Date.now();
        }

        res.setHeader('Cache-Control', 'public, max-age=1200');
        return res.json({ success: true, source: 'fallback', items: fallbackList });
    } catch (err) {
        if (cinemaHotCache) {
            return res.json({ success: true, source: 'cached', items: cinemaHotCache });
        }
        return res.status(500).json({ success: false, items: [], message: err.message });
    }
});

// ── GET /api/movies/trending-24h — Lấy phim xu hướng 24h chuẩn Google Trends (Khám phá "xem phim" 24h qua) ───
let trending24hCache = null;
let trending24hCacheTime = 0;
const TRENDING_24H_TTL = 20 * 60 * 1000; // 20 phút RAM cache

function extractMovieTitle(rawQuery) {
    let q = (rawQuery || '').toLowerCase().trim();
    q = q.replace(/^(xem phim|vé xem phim|đặt vé xem phim|phim hay|phim mới|phim)\s+/g, '')
         .replace(/\s+(xem phim|xem|phim|full hd|thuyết minh.*|vietsub.*|2026|2025)$/g, '')
         .replace(/\s+tập\s+\d+.*$/g, '')
         .trim();

    const genericWords = [
        'việt nam', 'chiếu rạp', 'mới', 'hay', 'online', 'motchill', 'miễn phí', 
        'web', 'tổng tài', 'hoạt hình', 'hàn quốc', 'thái lan', 'trung quốc', 'rạp', 'moi'
    ];
    if (genericWords.includes(q) || q.length < 3) return null;
    return q;
}

// 1. Trực tiếp lấy cụm từ tìm kiếm tăng (Rising) & hàng đầu (Top) từ Google Trends Khám Phá "xem phim" (Việt Nam 24h qua)
async function fetchGoogleTrendsExploreVN() {
    try {
        const jar = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'vi,en;q=0.9',
                'Referer': 'https://trends.google.com.vn/trends/explore?date=now%201-d&geo=VN&q=xem%20phim'
            },
            timeout: 6000
        });

        const initRes = await jar.get('https://trends.google.com.vn/');
        const cookies = initRes.headers['set-cookie'] || [];
        const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

        const reqObj = {
            comparisonItem: [{ keyword: 'xem phim', geo: 'VN', time: 'now 1-d' }],
            category: 0,
            property: ''
        };
        const exploreRes = await jar.get('https://trends.google.com.vn/trends/api/explore', {
            params: { hl: 'vi', tz: -420, req: JSON.stringify(reqObj) },
            headers: { 'Cookie': cookieHeader }
        });

        const raw = typeof exploreRes.data === 'string' ? exploreRes.data.replace(/^\)]\}',?\n?/, '') : JSON.stringify(exploreRes.data);
        const data = JSON.parse(raw);
        const relWidget = data.widgets && data.widgets.find(w => w.id === 'RELATED_QUERIES');
        if (!relWidget) return [];

        const widgetRes = await jar.get('https://trends.google.com.vn/trends/api/widgetdata/relatedsearches', {
            params: {
                hl: 'vi',
                tz: -420,
                req: JSON.stringify(relWidget.request),
                token: relWidget.token
            },
            headers: { 'Cookie': cookieHeader }
        });

        const wRaw = typeof widgetRes.data === 'string' ? widgetRes.data.replace(/^\)]\}',?\n?/, '') : JSON.stringify(widgetRes.data);
        const wData = JSON.parse(wRaw);
        const top = wData.default?.rankedList?.[0]?.rankedKeyword || [];
        const rising = wData.default?.rankedList?.[1]?.rankedKeyword || [];

        // Ưu tiên danh sách cụm từ tìm kiếm tăng (Rising) lên đầu, tiếp đến là hàng đầu (Top)
        const combined = [...rising, ...top];
        return combined.map(item => ({
            query: item.query,
            traffic: item.formattedValue || 'Thịnh hành'
        }));
    } catch (err) {
        console.warn('⚠️ Lỗi Google Trends Explore:', err.message);
        return [];
    }
}

// 2. Dự phòng & Bổ sung từ khóa gợi ý Google Search thời gian thực (đặc vụ kim tái khởi động, dấu xuân tươi sáng, thiên đường máu...)
async function fetchGoogleSuggestionsVN() {
    try {
        const queries = ['xem phim ', 'phim '];
        const list = [];
        for (const q of queries) {
            const res = await axios.get('https://suggestqueries.google.com/complete/search', {
                params: { client: 'chrome', q, hl: 'vi', gl: 'vn', ie: 'utf-8', oe: 'utf-8' },
                timeout: 3000
            });
            if (res.data && Array.isArray(res.data[1])) {
                res.data[1].forEach(text => {
                    list.push({ query: text, traffic: 'Tìm kiếm nhiều' });
                });
            }
        }
        return list;
    } catch {
        return [];
    }
}

router.get('/trending-24h', async (req, res) => {
    try {
        if (trending24hCache && (Date.now() - trending24hCacheTime < TRENDING_24H_TTL)) {
            res.setHeader('X-Trends-Cache', 'HIT');
            return res.json({ success: true, source: 'cached', items: trending24hCache });
        }

        // Lấy từ khóa xu hướng từ Google Trends Explore + Google Suggestions
        let trendItems = await fetchGoogleTrendsExploreVN();
        const suggests = await fetchGoogleSuggestionsVN();
        trendItems = [...trendItems, ...suggests];

        const matchedMovies = [];
        const seenSlugs = new Set();

        for (const item of trendItems) {
            const title = extractMovieTitle(item.query);
            if (!title) continue;

            try {
                const searchRes = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(title)}&limit=5`, {
                    timeout: 2800
                });
                const items = searchRes.data?.data?.items || [];
                const titleSlug = toSlug(title);
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
                        trend_keyword: item.query,
                        trend_traffic: item.traffic
                    });
                }
            } catch (_) {}

            if (matchedMovies.length >= 18) break;
        }

        // Bổ sung phim mới cập nhật để slider luôn đủ 24 phim đẹp mắt
        try {
            const hotRes = await axios.get('https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1', { timeout: 4000 });
            const hotItems = hotRes.data?.data?.items || hotRes.data?.items || [];
            for (const m of hotItems) {
                if (m && m.slug && !seenSlugs.has(m.slug) && matchedMovies.length < 24) {
                    seenSlugs.add(m.slug);
                    matchedMovies.push({
                        ...m,
                        is_google_trend: false
                    });
                }
            }
        } catch (_) {}

        if (matchedMovies.length > 0) {
            trending24hCache = matchedMovies;
            trending24hCacheTime = Date.now();
        }

        res.setHeader('Cache-Control', 'public, max-age=1200');
        return res.json({ success: true, source: 'live', items: matchedMovies });
    } catch (err) {
        if (trending24hCache) {
            return res.json({ success: true, source: 'cached_fallback', items: trending24hCache });
        }
        return res.status(500).json({ success: false, items: [], message: err.message });
    }
});

module.exports = router;

