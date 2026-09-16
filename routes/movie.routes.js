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

module.exports = router;
