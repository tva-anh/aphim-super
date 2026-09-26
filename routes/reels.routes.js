/**
 * routes/reels.routes.js
 * 🎬 APhim Reels & Review Hub Routes
 * Powers TikTok-style vertical streaming, movie reviews, and instant watch CTA.
 */

const express = require('express');
const router = express.Router();
const { getReelsFeed, searchYouTubeMovieReviews } = require('../lib/reels.service');

// ── GET /reels (SSR Main Page with Pre-buffered Initial Reels) ─────────────────
router.get('/', async (req, res) => {
    try {
        const tab = (req.query.tab || 'review').toLowerCase() === 'reel' ? 'reel' : 'review';
        const page = parseInt(req.query.page || '1', 10);
        const searchKeyword = (req.query.q || '').trim();

        let initialData = await getReelsFeed({ tab, page: 1, limit: 15 });

        // Nếu có tìm kiếm từ khóa phim cụ thể
        if (searchKeyword && searchKeyword.length > 1) {
            const ytResults = await searchYouTubeMovieReviews(searchKeyword, searchKeyword.toLowerCase().replace(/\s+/g, '-'));
            if (ytResults.length > 0) {
                initialData.items = [...ytResults, ...initialData.items];
            }
        }

        const pageTitle = tab === 'review' 
            ? 'Review Phim Hay | Tóm Tắt & Phân Tích Phim Mới | APhim Super'
            : 'Reels Phim Ngắn | Lướt Trích Đoạn Phim Hot | APhim Super';
            
        const metaDescription = 'Xem video Review phim, tóm tắt trọn bộ phim chiếu rạp, phim bộ, anime vietsub cực cuốn theo phong cách lướt TikTok mượt mà tại APhim Super.';

        res.render('reels', {
            title: pageTitle,
            metaDescription,
            canonicalUrl: `https://aphim.store/reels${tab === 'reel' ? '' : '?tab=review'}`,
            currentTab: tab,
            initialReels: initialData.items,
            searchKeyword
        });
    } catch (err) {
        console.error('❌ [Reels Route Error]:', err.message);
        res.status(500).render('reels', {
            title: 'Reels & Review Phim | APhim Super',
            metaDescription: 'Lướt xem video review phim ngắn phong cách TikTok',
            canonicalUrl: 'https://aphim.store/reels',
            currentTab: 'review',
            initialReels: [],
            searchKeyword: ''
        });
    }
});

// ── GET /api/reels/feed (Infinite Scroll Feed API) ───────────────────────────
router.get('/feed', async (req, res) => {
    try {
        const tab = (req.query.tab || 'review').toLowerCase() === 'reel' ? 'reel' : 'review';
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '12', 10);

        const data = await getReelsFeed({ tab, page, limit });
        res.json({
            success: true,
            ...data
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, items: [] });
    }
});

// ── GET /api/reels/search (Search Movie Reviews) ─────────────────────────────
router.get('/search', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) {
            const defaultFeed = await getReelsFeed({ tab: 'review', page: 1, limit: 10 });
            return res.json({ success: true, items: defaultFeed.items });
        }

        const ytResults = await searchYouTubeMovieReviews(q, q.toLowerCase().replace(/\s+/g, '-'));
        res.json({
            success: true,
            query: q,
            items: ytResults
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, items: [] });
    }
});

// ── POST /api/reels/like/:id (Like / Favorite interaction) ───────────────────
router.post('/like/:id', (req, res) => {
    const { id } = req.params;
    const action = req.query.action || 'like';
    // Ghi nhận tương tác thành công
    res.json({ success: true, id, action });
});

module.exports = router;
