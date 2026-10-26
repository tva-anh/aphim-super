/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎬 APHIM SOCIAL STUDIO ROUTES — API ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const socialStudioService = require('../lib/socialStudio.service');

// Optional Admin Auth middleware
let requireAdmin = (req, res, next) => next();
try {
    const authMw = require('../middleware/adminAuth.middleware');
    if (authMw && authMw.requireAdmin) {
        requireAdmin = authMw.requireAdmin;
    }
} catch (e) {}

/**
 * 1. GET /api/admin/social-studio/trends — Real-time Google Trends VN
 */
router.get('/trends', async (req, res) => {
    try {
        const trends = await socialStudioService.fetchGoogleTrendsVietnam();
        res.json({ success: true, trends });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 2. GET /api/admin/social-studio/movies — Search & list movies (Main Website Movies as PRIMARY)
 */
router.get('/movies', async (req, res) => {
    try {
        const q = (req.query.q || '').trim().toLowerCase();
        const catalogType = req.query.type || 'main'; // 'main', 'phim-ngan', 'all'
        let movies = [];

        const formatImg = (url) => {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            return `https://phimimg.com/${url.replace(/^\//, '')}`;
        };

        if (catalogType === 'phim-ngan') {
            // Load short film seeds
            try {
                const seedsPath = path.join(__dirname, '../data/phim_ngan_seeds.json');
                if (fs.existsSync(seedsPath)) {
                    const sData = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
                    const catalog = Array.isArray(sData) ? sData : (sData.rank || sData.catalog || []);
                    movies = catalog.map(c => ({
                        name: c.title || c.name,
                        origin_name: c.originalTitle || c.origin_name || '',
                        slug: c.slug || c.id,
                        year: '2026',
                        poster_url: c.cover || c.poster || c.thumb,
                        thumb_url: c.thumb || c.cover,
                        category: c.category || 'Phim Ngắn',
                        rating: c.rating || '9.8',
                        content: c.description || c.intro || '',
                        sourceType: 'short'
                    }));
                }
            } catch (e) {}
        } else {
            // PRIMARY: Fetch main website movies (Phim Mới / Rạp / Bộ / Lẻ)
            try {
                const mainRes = await socialStudioService.httpsRequest('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
                if (mainRes && mainRes.data && Array.isArray(mainRes.data.items)) {
                    movies = mainRes.data.items.map(item => ({
                        name: item.name,
                        origin_name: item.origin_name || '',
                        slug: item.slug,
                        year: item.year || '2026',
                        poster_url: formatImg(item.poster_url || item.thumb_url),
                        thumb_url: formatImg(item.thumb_url || item.poster_url),
                        category: 'Phim Mới Cập Nhật',
                        rating: (item.tmdb && item.tmdb.vote_average) ? item.tmdb.vote_average : '9.2',
                        content: '',
                        sourceType: 'main'
                    }));
                }
            } catch (e) {}

            // Append local custom control movies if any
            try {
                const controlPath = path.join(__dirname, '../data/movies_control.json');
                if (fs.existsSync(controlPath)) {
                    const cData = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
                    if (cData.movies) {
                        const localList = Object.values(cData.movies).map(m => ({
                            ...m,
                            poster_url: formatImg(m.poster_url || m.poster || m.thumb_url),
                            thumb_url: formatImg(m.thumb_url || m.thumb || m.banner),
                            sourceType: 'main'
                        }));
                        movies = localList.concat(movies);
                    }
                }
            } catch (e) {}
        }

        // Search online & local if query q is specified
        if (q) {
            let searchResults = [];

            // 1. Online search across whole main movie catalog
            try {
                const searchRes = await socialStudioService.httpsRequest(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}&limit=20`);
                if (searchRes && searchRes.data && searchRes.data.data && Array.isArray(searchRes.data.data.items)) {
                    searchRes.data.data.items.forEach(item => {
                        searchResults.push({
                            name: item.name,
                            origin_name: item.origin_name || '',
                            slug: item.slug,
                            year: item.year || '2026',
                            poster_url: formatImg(item.poster_url || item.thumb_url),
                            thumb_url: formatImg(item.thumb_url || item.poster_url),
                            category: Array.isArray(item.category) ? item.category.map(c => c.name).join(', ') : 'Phim Hay',
                            rating: (item.tmdb && item.tmdb.vote_average) ? item.tmdb.vote_average : '9.0',
                            content: item.content || '',
                            sourceType: 'main'
                        });
                    });
                }
            } catch (onlineErr) {}

            // 2. Also search local short film seeds
            try {
                const seedsPath = path.join(__dirname, '../data/phim_ngan_seeds.json');
                if (fs.existsSync(seedsPath)) {
                    const sData = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
                    const catalog = Array.isArray(sData) ? sData : (sData.rank || sData.catalog || []);
                    const matchedShorts = catalog.filter(m => {
                        const name = (m.title || m.name || '').toLowerCase();
                        const originName = (m.originalTitle || '').toLowerCase();
                        return name.includes(q) || originName.includes(q);
                    }).slice(0, 5).map(c => ({
                        name: c.title || c.name,
                        origin_name: c.originalTitle || '',
                        slug: c.slug || c.id,
                        year: '2026',
                        poster_url: c.cover || c.poster || c.thumb,
                        thumb_url: c.thumb || c.cover,
                        category: 'Phim Ngắn',
                        rating: c.rating || '9.8',
                        content: c.description || c.intro || '',
                        sourceType: 'short'
                    }));
                    searchResults = searchResults.concat(matchedShorts);
                }
            } catch (e) {}

            movies = searchResults;
        }

        // Return top 30 matches with deduplication
        const seenSlugs = new Set();
        const results = [];
        for (const m of movies) {
            if (!seenSlugs.has(m.slug)) {
                seenSlugs.add(m.slug);
                results.push({
                    name: m.name || m.title,
                    origin_name: m.origin_name || '',
                    slug: m.slug || m.id,
                    year: m.year || m.publish_year || '2026',
                    poster_url: formatImg(m.poster_url || m.poster || m.thumb_url || m.thumb),
                    thumb_url: formatImg(m.thumb_url || m.thumb || m.banner || m.poster_url),
                    category: Array.isArray(m.category) ? m.category.join(', ') : (m.genres || m.category || ''),
                    rating: m.rating || m.vote_average || '9.0',
                    content: m.content || m.description || m.intro || '',
                    sourceType: m.sourceType || 'main'
                });
            }
            if (results.length >= 30) break;
        }

        res.json({ success: true, movies: results });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 3. GET /api/admin/social-studio/movie-media/:slug — Extract all images
 */
router.get('/movie-media/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await socialStudioService.getMovieMedia(slug);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 4. POST /api/admin/social-studio/generate — Agent 1: Infinite AI Content
 */
router.post('/generate', async (req, res) => {
    try {
        const { movie, customPrompt, tone, length, goal, seoKeywords, target } = req.body;
        if (!movie) {
            return res.status(400).json({ success: false, error: 'Thiếu thông tin bộ phim.' });
        }

        const result = await socialStudioService.generateInfinitePost({ movie, customPrompt, tone, length, goal, seoKeywords, target });
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 5. POST /api/admin/social-studio/audit — Agent 2: Security & Trend Audit
 */
router.post('/audit', async (req, res) => {
    try {
        const { postContent, firstComment, movieTitle } = req.body;
        if (!postContent) {
            return res.status(400).json({ success: false, error: 'Thiếu nội dung bài viết cần duyệt.' });
        }

        const result = await socialStudioService.auditAndOptimizePost({ postContent, firstComment, movieTitle });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 6. POST /api/admin/social-studio/publish — Publish to Facebook Page
 */
router.post('/publish', async (req, res) => {
    try {
        const { message, firstComment, imageUrls, movieName } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: 'Nội dung bài viết không được để trống.' });
        }

        const result = await socialStudioService.publishToFacebook({
            message,
            firstComment,
            imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
            movieName
        });

        res.json(result);
    } catch (err) {
        console.error('[SocialStudio] Publish Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 7. GET /api/admin/social-studio/history — Post History Log
 */
router.get('/history', (req, res) => {
    try {
        const history = socialStudioService.getPostHistory();
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 8. POST /api/admin/social-studio/upload-image — In-Memory Echo (Zero Disk Storage)
 */
router.post('/upload-image', (req, res) => {
    try {
        const { base64Data, filename } = req.body;
        if (!base64Data) {
            return res.status(400).json({ success: false, error: 'Thiếu dữ liệu ảnh.' });
        }
        // Giữ 100% trong bộ nhớ client / base64, không ghi vào ổ đĩa dự án
        res.json({
            success: true,
            url: base64Data,
            label: filename || 'Ảnh tải lên từ máy tính'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
