/**
 * routes/subscription.routes.js — Gói VIP (Supabase)
 * routes/transaction.routes.js  — Giao dịch thanh toán (Supabase)
 */
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/adminAuth.middleware');
const { supabaseAdmin } = require('../lib/supabase');
const Gamification = require('../models/Gamification');
const AdminLog     = require('../models/AdminLog');

// ══════════════════════════════════════════════════════════════
// SUBSCRIPTION ROUTES
// ══════════════════════════════════════════════════════════════

// ── GET /api/subscriptions/me ────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { data: sub } = await supabaseAdmin
            .from('vip_subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .single();

        return res.json({
            success: true,
            data: sub || { plan: 'FREE', status: 'none' }
        });
    } catch (err) {
        return res.json({ success: true, data: { plan: 'FREE', status: 'none' } });
    }
});

// ── GET /api/subscriptions/all — Admin ───────────────────────────────────────
router.get('/all', requireAdmin, async (req, res) => {
    try {
        const { data: subs } = await supabaseAdmin
            .from('vip_subscriptions')
            .select('*, profiles(name, email)')
            .order('created_at', { ascending: false })
            .limit(100);

        return res.json({ success: true, data: subs || [] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ══════════════════════════════════════════════════════════════
// TRANSACTION ROUTES
// ══════════════════════════════════════════════════════════════

// ── POST /api/transactions ── Tạo giao dịch pending ─────────────────────────
router.post('/', requireAuth, async (req, res) => {
    try {
        const { type, amount_vnd = 0, xu_amount = 0, plan_code = '', transfer_content = '' } = req.body;

        if (!type) return res.status(400).json({ success: false, message: 'Thiếu loại giao dịch.' });

        const { data: tx, error } = await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: req.user.id,
                type, amount_vnd, xu_amount, plan_code,
                transfer_content, status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: 'Đã ghi nhận giao dịch. Vui lòng chờ xác nhận từ Admin.',
            data: tx
        });

    } catch (err) {
        console.error('[Transaction] create error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/transactions/me ─────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
    try {
        const { data: txs } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        return res.json({ success: true, data: txs || [] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── GET /api/transactions/all — Admin ────────────────────────────────────────
router.get('/all', requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let query = supabaseAdmin
            .from('transactions')
            .select('*, profiles(name, email)')
            .order('created_at', { ascending: false })
            .limit(200);

        if (status) query = query.eq('status', status);

        const { data: txs } = await query;
        return res.json({ success: true, data: txs || [] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── PUT /api/transactions/:id/confirm — Admin xác nhận thanh toán ─────────────
router.put('/:id/confirm', requireAdmin, async (req, res) => {
    try {
        const { id }  = req.params;
        const { note = '' } = req.body;

        // Lấy transaction
        const { data: tx } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('id', id)
            .single();

        if (!tx) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch.' });
        if (tx.status === 'confirmed') return res.status(400).json({ success: false, message: 'Giao dịch đã được xác nhận trước đó.' });

        // Xác nhận
        await supabaseAdmin.from('transactions').update({
            status: 'confirmed', note,
            confirmed_by: req.admin.id,
            confirmed_at: new Date().toISOString()
        }).eq('id', id);

        // Nếu là mua VIP → tạo subscription
        if (tx.type === 'vip_purchase') {
            const planDays = tx.plan_code === 'PREMIUM' ? 30 : tx.plan_code === 'FAMILY' ? 365 : 30;
            const expires  = new Date();
            expires.setDate(expires.getDate() + planDays);

            await supabaseAdmin.from('vip_subscriptions').insert({
                user_id: tx.user_id, plan: tx.plan_code || 'PREMIUM',
                status: 'active',
                started_at: new Date().toISOString(),
                expires_at: expires.toISOString(),
                payment_ref: tx.transfer_content
            });
        }

        // Nếu là nạp Xu → cộng xu
        if (tx.type === 'xu_topup' && tx.xu_amount > 0) {
            // Cộng xu vào profiles
            const { data: prof } = await supabaseAdmin.from('profiles').select('xu').eq('id', tx.user_id).single();
            const newXu = (prof?.xu || 0) + tx.xu_amount;
            await supabaseAdmin.from('profiles').update({ xu: newXu }).eq('id', tx.user_id);

            // Cộng xu vào MongoDB gamification
            await Gamification.findOneAndUpdate(
                { user_id: tx.user_id },
                { $inc: { xu: tx.xu_amount, xu_lifetime: tx.xu_amount } },
                { upsert: true }
            );
        }

        // Ghi log
        await AdminLog.create({
            admin_id: req.admin.id, admin_name: req.admin.profile?.name || 'Admin',
            action: 'confirm_payment', target_type: 'transaction', target_id: id,
            before: { status: 'pending' }, after: { status: 'confirmed', note },
            note: `Xác nhận ${tx.type} - ${tx.plan_code} - ${tx.transfer_content}`,
            ip: req.ip
        });

        try {
            const adminRoutes = require('./admin.routes');
            if (adminRoutes.invalidateAdminCache) adminRoutes.invalidateAdminCache('dashboard');
        } catch (e) {}

        return res.json({ success: true, message: 'Đã xác nhận giao dịch thành công!' });

    } catch (err) {
        console.error('[Transaction] confirm error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── PUT /api/transactions/:id/reject — Admin từ chối ─────────────────────────
router.put('/:id/reject', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { note = '' } = req.body;

        await supabaseAdmin.from('transactions').update({
            status: 'rejected', note,
            confirmed_by: req.admin.id,
            confirmed_at: new Date().toISOString()
        }).eq('id', id);

        try {
            const adminRoutes = require('./admin.routes');
            if (adminRoutes.invalidateAdminCache) adminRoutes.invalidateAdminCache('dashboard');
        } catch (e) {}

        await AdminLog.create({
            admin_id: req.admin.id, admin_name: req.admin.profile?.name || 'Admin',
            action: 'reject_payment', target_type: 'transaction', target_id: id,
            after: { status: 'rejected', note }, note, ip: req.ip
        });

        return res.json({ success: true, message: 'Đã từ chối giao dịch.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

module.exports = router;
