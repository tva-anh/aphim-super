/**
 * routes/settings.routes.js — Cài đặt hệ thống (Supabase)
 * routes/banner.routes.js   — Banners & Ads (Supabase)
 */
const express = require('express');
const router  = express.Router();
const { requireAdmin } = require('../middleware/adminAuth.middleware');
const { supabaseAdmin } = require('../lib/supabase');
const AdminLog = require('../models/AdminLog');

// ── GET /api/settings/public — Không cần auth ────────────────────────────────
router.get('/public', async (req, res) => {
    try {
        const { data: rows } = await supabaseAdmin
            .from('system_settings')
            .select('key, value')
            .in('key', ['site_name','maintenance_mode','allow_register','allow_comments','api_primary','api_secondary','enable_phim_x']);

        const settings = {};
        (rows || []).forEach(r => { settings[r.key] = r.value; });

        return res.json({
            success: true,
            data: {
                general: {
                    siteName:        settings.site_name        || 'APhim Super',
                    maintenanceMode: settings.maintenance_mode === true || settings.maintenance_mode === 'true',
                    allowRegister:   settings.allow_register   !== false && settings.allow_register !== 'false',
                    allowComments:   settings.allow_comments   !== false && settings.allow_comments !== 'false'
                },
                content: {
                    apiBase:            settings.api_primary   || 'https://ophim1.com/v1/api',
                    apiSecondary:       settings.api_secondary || 'https://phim.nguonc.com/api',
                    enablePhimX:        settings.enable_phim_x === true
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/settings/payment-public — Thông tin thanh toán public ───────────
router.get('/payment-public', async (req, res) => {
    try {
        const { data: rows } = await supabaseAdmin
            .from('system_settings')
            .select('key, value')
            .in('key', ['bank_name','bank_account','bank_owner','price_premium','price_family']);

        const s = {};
        (rows || []).forEach(r => { s[r.key] = r.value; });

        return res.json({
            success: true,
            data: {
                bankName:        s.bank_name    || 'MB Bank',
                bankAccount:     s.bank_account || '048889019999',
                bankOwner:       s.bank_owner   || 'TRAN VAN ANH',
                pricePremium:    s.price_premium || 69000,
                pricePremiumYear:s.price_family  || 699000
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/settings — Admin, toàn bộ settings ──────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { data: rows } = await supabaseAdmin
            .from('system_settings')
            .select('*')
            .order('category');

        return res.json({ success: true, data: rows || [] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── PUT /api/settings — Admin, cập nhật setting ──────────────────────────────
router.put('/', requireAdmin, async (req, res) => {
    try {
        const { updates } = req.body; // [{ key, value, category }]
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Dữ liệu cập nhật không hợp lệ.' });
        }

        for (const u of updates) {
            await supabaseAdmin.from('system_settings').upsert({
                key: u.key, value: u.value,
                category: u.category || 'general',
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        }

        await AdminLog.create({
            admin_id: req.admin.id, admin_name: req.admin.profile?.name || 'Admin',
            action: 'update_settings', target_type: 'setting',
            after: updates, ip: req.ip
        });

        return res.json({ success: true, message: 'Đã cập nhật cài đặt hệ thống.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ══════════════════════════════════════════════════════════════
// BANNER ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET /api/banners — Public ─────────────────────────────────────────────────
router.get('/banners', async (req, res) => {
    try {
        const { type } = req.query;
        let query = supabaseAdmin.from('banners').select('*').eq('is_active', true).order('position');
        if (type) query = query.eq('type', type);

        const { data: banners } = await query;
        return res.json({ success: true, data: banners || [] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/banners/all — Admin ──────────────────────────────────────────────
router.get('/banners/all', requireAdmin, async (req, res) => {
    try {
        const { data: banners } = await supabaseAdmin
            .from('banners').select('*').order('type').order('position');
        return res.json({ success: true, data: banners || [] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── POST /api/banners — Admin, tạo banner ────────────────────────────────────
router.post('/banners', requireAdmin, async (req, res) => {
    try {
        const { type, title, image_url, link_url = '', is_active = true, position = 0, target = 'all' } = req.body;

        const { data: banner, error } = await supabaseAdmin
            .from('banners').insert({ type, title, image_url, link_url, is_active, position, target })
            .select().single();

        if (error) throw error;
        return res.status(201).json({ success: true, data: banner });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── PUT /api/banners/:id — Admin, cập nhật banner ────────────────────────────
router.put('/banners/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, image_url, link_url, is_active, position, target } = req.body;
        const updates = {};
        if (title !== undefined)     updates.title = title;
        if (image_url !== undefined) updates.image_url = image_url;
        if (link_url !== undefined)  updates.link_url = link_url;
        if (is_active !== undefined) updates.is_active = is_active;
        if (position !== undefined)  updates.position = position;
        if (target !== undefined)    updates.target = target;

        const { data: banner, error } = await supabaseAdmin
            .from('banners').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return res.json({ success: true, data: banner });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── DELETE /api/banners/:id — Admin ──────────────────────────────────────────
router.delete('/banners/:id', requireAdmin, async (req, res) => {
    try {
        await supabaseAdmin.from('banners').delete().eq('id', req.params.id);
        return res.json({ success: true, message: 'Đã xóa banner.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

module.exports = router;
