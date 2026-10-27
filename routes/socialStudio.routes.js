/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎬 APHIM SOCIAL STUDIO ROUTES — API ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
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
 * 2. GET /api/admin/social-studio/movies — Search & list movies
 * - Luồng 1 (type='phim-ngan'): Phim Ngắn / Drama Mini (Nội bộ + Narto Live Online Search) -> 100% độc lập, không dính phim chính
 * - Luồng 2 (type='main'): Phim Chính Website (Phim Mới / Rạp / Bộ / Lẻ từ phimapi.com + movies_control.json) -> 100% độc lập
 */
router.get('/movies', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const catalogType = req.query.type || 'main'; // 'main' or 'phim-ngan'
        let movies = [];

        const formatImg = (url) => {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            return `https://phimimg.com/${url.replace(/^\//, '')}`;
        };

        // ════════════════════════════════════════════════════════════════
        // LUỒNG 1: CHUYÊN BIỆT CHO PHIM NGẮN (SHORT DRAMA / MINI SERIES)
        // 100% ĐỘC LẬP - TUYỆT ĐỐI KHÔNG GỌI PHIM CHÍNH (PHIMAPI)
        // ════════════════════════════════════════════════════════════════
        if (catalogType === 'phim-ngan') {
            let localShorts = [];

            // 1. Tải kho Phim Ngắn nội bộ (seeds)
            try {
                const seedsPath = path.join(__dirname, '../data/phim_ngan_seeds.json');
                if (fs.existsSync(seedsPath)) {
                    const sData = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
                    const catalog = Array.isArray(sData) ? sData : (sData.catalog || sData.rank || []);
                    localShorts = catalog.map(c => ({
                        name: c.title || c.name,
                        origin_name: c.originalTitle || c.origin_name || (c.tags ? c.tags.join(', ') : 'Phim Ngắn'),
                        slug: c.slug || c.id,
                        year: '2026',
                        poster_url: c.cover || c.poster || c.thumb,
                        thumb_url: c.thumb || c.cover,
                        category: c.category || (c.tags ? c.tags.join(', ') : 'Phim Ngắn'),
                        rating: c.rating || '9.8',
                        content: c.description || c.intro || '',
                        sourceType: 'short',
                        episodesCount: (c.episodes && c.episodes.length) || c.totalEpisodes || c.episodesCount || 0
                    }));
                }
            } catch (e) {}

            if (!q) {
                // Không có từ khóa: Trả về danh sách phim ngắn hiện có trong kho
                movies = localShorts;
            } else {
                // Có từ khóa: Tìm kiếm riêng biệt trong kho phim ngắn
                const qLower = q.toLowerCase();
                const matchedLocal = localShorts.filter(m => {
                    const name = (m.name || '').toLowerCase();
                    const origin = (m.origin_name || '').toLowerCase();
                    const slug = (m.slug || '').toLowerCase();
                    const cat = (m.category || '').toLowerCase();
                    return name.includes(qLower) || origin.includes(qLower) || slug.includes(qLower) || cat.includes(qLower);
                });

                // Tìm kiếm trực tuyến từ kho Phim Ngắn Narto Drama (hàng ngàn phim ngắn có tập lồng tiếng/vietsub)
                let nartoResults = [];
                try {
                    const nartoRes = await axios.get(`https://narto-drama.com/search?q=${encodeURIComponent(q)}&limit=30&lang=vi-VN`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            'Accept': 'application/json, text/plain, */*'
                        },
                        timeout: 8000
                    });

                    if (nartoRes && nartoRes.data && nartoRes.data.ok && Array.isArray(nartoRes.data.items)) {
                        nartoRes.data.items.forEach(item => {
                            let itemSlug = '';
                            if (item.url) {
                                const slugMatch = item.url.match(/\/detail\/watch\/([^/?]+)/);
                                itemSlug = slugMatch ? slugMatch[1] : '';
                            }
                            if (!itemSlug && item.id) itemSlug = String(item.id);

                            nartoResults.push({
                                name: item.title,
                                origin_name: (item.tags && item.tags.length > 0) ? item.tags.join(', ') : 'Phim Ngắn Trực Tuyến',
                                slug: itemSlug,
                                year: '2026',
                                poster_url: item.poster_url,
                                thumb_url: item.poster_url,
                                category: (item.tags && item.tags.length > 0) ? item.tags.join(', ') : 'Drama Mini',
                                rating: '9.8',
                                content: item.description || '',
                                sourceType: 'short',
                                episodesCount: item.total_episodes || 0
                            });
                        });
                    }
                } catch (nartoErr) {
                    console.warn('[SocialStudio] Narto Drama search error:', nartoErr.message);
                }

                // Hợp nhất kết quả tìm kiếm nội bộ và trực tuyến Narto, ưu tiên nội bộ
                movies = [...matchedLocal, ...nartoResults];
            }
        }
        // ════════════════════════════════════════════════════════════════
        // LUỒNG 2: CHUYÊN BIỆT CHO PHIM CHÍNH WEBSITE (RẠP / BỘ / LẺ)
        // 100% ĐỘC LẬP - TUYỆT ĐỐI KHÔNG CHỨA PHIM NGẮN
        // ════════════════════════════════════════════════════════════════
        else {
            if (!q) {
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
            } else {
                // Online search phimapi.com
                try {
                    const searchRes = await socialStudioService.httpsRequest(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(q)}&limit=25`);
                    if (searchRes && searchRes.data && searchRes.data.data && Array.isArray(searchRes.data.data.items)) {
                        searchRes.data.data.items.forEach(item => {
                            movies.push({
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

                // Local movies_control.json search
                try {
                    const controlPath = path.join(__dirname, '../data/movies_control.json');
                    if (fs.existsSync(controlPath)) {
                        const cData = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
                        if (cData.movies) {
                            const qLower = q.toLowerCase();
                            const localMatches = Object.values(cData.movies).filter(m => {
                                const name = (m.name || '').toLowerCase();
                                const origin = (m.origin_name || '').toLowerCase();
                                return name.includes(qLower) || origin.includes(qLower);
                            }).map(m => ({
                                ...m,
                                poster_url: formatImg(m.poster_url || m.poster || m.thumb_url),
                                thumb_url: formatImg(m.thumb_url || m.thumb || m.banner),
                                sourceType: 'main'
                            }));
                            movies = localMatches.concat(movies);
                        }
                    }
                } catch (e) {}
            }
        }

        // Return deduplicated list
        const seenSlugs = new Set();
        const results = [];
        for (const m of movies) {
            const s = m.slug || m.id;
            if (!s || seenSlugs.has(s)) continue;
            seenSlugs.add(s);
            results.push({
                name: m.name || m.title,
                origin_name: m.origin_name || '',
                slug: s,
                year: m.year || m.publish_year || '2026',
                poster_url: formatImg(m.poster_url || m.poster || m.thumb_url || m.thumb),
                thumb_url: formatImg(m.thumb_url || m.thumb || m.banner || m.poster_url),
                category: Array.isArray(m.category) ? m.category.join(', ') : (m.genres || m.category || ''),
                rating: m.rating || m.vote_average || '9.5',
                content: m.content || m.description || m.intro || '',
                sourceType: m.sourceType || (catalogType === 'phim-ngan' ? 'short' : 'main'),
                episodesCount: m.episodesCount || 0
            });
            if (results.length >= 35) break;
        }

        res.json({
            success: true,
            catalogType,
            query: q,
            count: results.length,
            movies: results
        });
    } catch (err) {
        console.error('[SocialStudio] Error in /movies:', err);
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

/**
 * 9. GET /api/admin/social-studio/drama-episodes/:slug — Get episodes of short drama
 */
router.get('/drama-episodes/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await socialStudioService.getDramaEpisodes(slug);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 10. POST /api/admin/social-studio/publish-reels — Publish short drama episode to Facebook Reels
 */
router.post('/publish-reels', async (req, res) => {
    try {
        const { videoUrl, caption, firstComment, dramaTitle, episodeNo, slug } = req.body;
        if (!videoUrl) {
            return res.status(400).json({ success: false, error: 'Thiếu link video tập phim cần đăng Reels.' });
        }

        const result = await socialStudioService.publishReelsToFacebook({
            videoUrl,
            caption,
            firstComment,
            dramaTitle,
            episodeNo,
            slug
        });

        res.json(result);
    } catch (err) {
        console.error('[SocialStudio Routes] Reels Publish Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 11. POST /api/admin/social-studio/generate-reels-caption — Generate viral Reels caption
 */
router.post('/generate-reels-caption', async (req, res) => {
    try {
        const { dramaTitle, episodeNo, slug, summary, customPrompt } = req.body;
        const result = await socialStudioService.generateReelsCaptionAI({
            dramaTitle: dramaTitle || 'Phim Ngắn Cực Hay',
            episodeNo: episodeNo || 1,
            slug: slug || 'phim-ngan',
            summary: summary || '',
            customPrompt: customPrompt || ''
        });
        res.json(result);
    } catch (err) {
        console.error('[SocialStudio Routes] Reels Caption Gen Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
