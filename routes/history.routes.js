/**
 * routes/history.routes.js
 * Lịch sử xem phim + Yêu thích — MongoDB
 */
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const WatchHistory = require('../models/WatchHistory');

const MAX_HISTORY = 200;

// ── GET /api/history ─────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
    try {
        const doc = await WatchHistory.findOne({ user_id: req.user.id });
        return res.json({
            success: true,
            data: {
                history:   doc?.history   || [],
                favorites: doc?.favorites || []
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/history/update ─────────────────────────────────────────────────
router.post('/update', requireAuth, async (req, res) => {
    try {
        const { slug, name, thumb_url, episode, episode_name, server_name, progress_seconds, duration_seconds } = req.body;
        if (!slug) return res.status(400).json({ success: false, message: 'Thiếu slug phim.' });

        const userId = req.user.id;
        let doc = await WatchHistory.findOne({ user_id: userId });
        if (!doc) doc = await WatchHistory.create({ user_id: userId });

        // Xóa entry cũ nếu có (cùng slug + episode)
        doc.history = doc.history.filter(h => !(h.slug === slug && h.episode === episode));

        // Thêm vào đầu
        doc.history.unshift({
            slug, name: name || slug, thumb_url: thumb_url || '',
            episode: episode || '', episode_name: episode_name || '',
            server_name: server_name || '',
            watched_at: new Date(),
            progress_seconds: progress_seconds || 0,
            duration_seconds: duration_seconds || 0,
            progress_percent: duration_seconds > 0
                ? Math.round((progress_seconds / duration_seconds) * 100)
                : 0
        });

        // Giới hạn 200 mục
        if (doc.history.length > MAX_HISTORY) {
            doc.history = doc.history.slice(0, MAX_HISTORY);
        }

        await doc.save();
        return res.json({ success: true, message: 'Đã cập nhật lịch sử xem.' });

    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── DELETE /api/history/:slug ────────────────────────────────────────────────
router.delete('/:slug', requireAuth, async (req, res) => {
    try {
        const { slug } = req.params;
        const doc = await WatchHistory.findOne({ user_id: req.user.id });
        if (!doc) return res.json({ success: true });

        doc.history = doc.history.filter(h => h.slug !== slug);
        await doc.save();
        return res.json({ success: true, message: 'Đã xóa khỏi lịch sử.' });

    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── DELETE /api/history (xóa toàn bộ) ───────────────────────────────────────
router.delete('/', requireAuth, async (req, res) => {
    try {
        await WatchHistory.findOneAndUpdate({ user_id: req.user.id }, { history: [] });
        return res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử xem.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/favorites ───────────────────────────────────────────────────────
router.get('/favorites', requireAuth, async (req, res) => {
    try {
        const doc = await WatchHistory.findOne({ user_id: req.user.id });
        return res.json({ success: true, data: doc?.favorites || [] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/favorites/toggle ───────────────────────────────────────────────
router.post('/favorites/toggle', requireAuth, async (req, res) => {
    try {
        const { slug } = req.body;
        if (!slug) return res.status(400).json({ success: false, message: 'Thiếu slug phim.' });

        const userId = req.user.id;
        let doc = await WatchHistory.findOne({ user_id: userId });
        if (!doc) doc = await WatchHistory.create({ user_id: userId });

        const idx = doc.favorites.indexOf(slug);
        let added = false;
        if (idx === -1) {
            doc.favorites.push(slug);
            added = true;
        } else {
            doc.favorites.splice(idx, 1);
        }

        await doc.save();
        return res.json({
            success: true,
            added,
            message: added ? 'Đã thêm vào yêu thích.' : 'Đã xóa khỏi yêu thích.',
            favorites: doc.favorites
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

module.exports = router;
