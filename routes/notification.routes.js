/**
 * routes/notification.routes.js
 * Persistent user notifications synced with Supabase Auth & Transactions
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { supabaseAdmin } = require('../lib/supabase');

// ── GET /api/notifications — Lấy danh sách thông báo của user (Cloud-synced) ──
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Lấy thông tin user & metadata hiện tại từ Supabase Auth
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authErr || !authData?.user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        const user = authData.user;
        const meta = user.user_metadata || {};
        let storedNotifs = Array.isArray(meta.notifications) ? [...meta.notifications] : [];

        // 2. Lấy các giao dịch thực tế của user từ bảng transactions để chuyển thành thông báo
        const { data: txs } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);

        let hasNewAutoNotifs = false;
        const existingIds = new Set(storedNotifs.map(n => String(n.id || n._id || '')));

        // 3. Tự động đồng bộ các giao dịch Xu/Vật phẩm thành thông báo nếu chưa có
        if (txs && txs.length > 0) {
            for (const tx of txs) {
                const notifId = 'tx_' + tx.id;
                if (!existingIds.has(notifId)) {
                    let title = 'Giao dịch hệ thống';
                    let type = 'system';
                    const content = tx.transfer_content || tx.note || 'Biến động tài khoản';

                    if (tx.xu_amount < 0 || content.toLowerCase().includes('mua')) {
                        title = 'Mua Sắm Thành Công';
                        type = 'shop';
                    } else if (tx.xu_amount > 0 || tx.amount_vnd > 0) {
                        title = 'Cộng Xu Thành Công';
                        type = 'coin';
                    } else if (tx.type === 'vip_purchase' || tx.type === 'xu_redeem_vip') {
                        title = 'Nâng Cấp VIP';
                        type = 'vip';
                    }

                    const changeTxt = tx.xu_amount ? ` (${tx.xu_amount > 0 ? '+' : ''}${tx.xu_amount} Xu)` : '';
                    storedNotifs.push({
                        id: notifId,
                        title: title,
                        message: `${content}${changeTxt}`,
                        detail: `${content}${changeTxt}`,
                        type: type,
                        amount: tx.xu_amount || 0,
                        createdAt: tx.created_at || new Date().toISOString(),
                        read: true, // Giao dịch cũ đánh dấu đã đọc
                        isRead: true
                    });
                    existingIds.add(notifId);
                    hasNewAutoNotifs = true;
                }
            }
        }

        // 4. Nếu user chưa có thông báo chào mừng thì tạo thông báo chào mừng
        const welcomeId = 'welcome_' + userId;
        if (!existingIds.has(welcomeId) && storedNotifs.length === 0) {
            storedNotifs.push({
                id: welcomeId,
                title: 'Chào Mừng Đến Với APhim Super!',
                message: 'Chào mừng bạn gia nhập thế giới phim 4K UltraHD. Hãy điểm danh mỗi ngày để nhận Xu và mở khóa các khung avatar độc quyền!',
                detail: 'Khám phá hàng ngàn tựa phim bom tấn đỉnh cao hoàn toàn miễn phí không quảng cáo gián đoạn.',
                type: 'system',
                createdAt: user.created_at || new Date().toISOString(),
                read: false,
                isRead: false
            });
            hasNewAutoNotifs = true;
        }

        // 5. Sắp xếp thông báo mới nhất lên đầu và giới hạn 60 thông báo
        storedNotifs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        storedNotifs = storedNotifs.slice(0, 60);

        // 6. Lưu cập nhật lại vào Supabase Auth user_metadata nếu có thông báo mới được tạo
        if (hasNewAutoNotifs) {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: {
                    ...meta,
                    notifications: storedNotifs
                }
            }).catch(e => console.warn('[Notifs] Auto-sync metadata warn:', e.message));
        }

        return res.json({
            success: true,
            data: storedNotifs
        });

    } catch (err) {
        console.error('[Notifications] GET error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thông báo' });
    }
});

// ── PUT /api/notifications/:id/read — Đánh dấu 1 thông báo là đã đọc ────────
router.put('/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const notifId = req.params.id;

        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!authData?.user) return res.status(404).json({ success: false });

        const meta = authData.user.user_metadata || {};
        let notifs = Array.isArray(meta.notifications) ? [...meta.notifications] : [];

        let found = false;
        notifs = notifs.map(n => {
            if (String(n.id) === String(notifId) || String(n._id) === String(notifId)) {
                found = true;
                return { ...n, read: true, isRead: true };
            }
            return n;
        });

        if (found) {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: { ...meta, notifications: notifs }
            });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] PUT read error:', err);
        return res.status(500).json({ success: false });
    }
});

// ── PUT /api/notifications/read-all — Đánh dấu tất cả là đã đọc ──────────────
router.put('/read-all', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!authData?.user) return res.status(404).json({ success: false });

        const meta = authData.user.user_metadata || {};
        let notifs = Array.isArray(meta.notifications) ? [...meta.notifications] : [];

        notifs = notifs.map(n => ({ ...n, read: true, isRead: true }));

        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...meta, notifications: notifs }
        });

        return res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] PUT read-all error:', err);
        return res.status(500).json({ success: false });
    }
});

// ── DELETE /api/notifications/:id — Xóa 1 thông báo ──────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const notifId = req.params.id;

        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!authData?.user) return res.status(404).json({ success: false });

        const meta = authData.user.user_metadata || {};
        let notifs = Array.isArray(meta.notifications) ? [...meta.notifications] : [];

        notifs = notifs.filter(n => String(n.id) !== String(notifId) && String(n._id) !== String(notifId));

        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...meta, notifications: notifs }
        });

        return res.json({ success: true });
    } catch (err) {
        console.error('[Notifications] DELETE error:', err);
        return res.status(500).json({ success: false });
    }
});

// ── POST /api/notifications — Tạo thông báo mới cho user ────────────────────
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, message, detail, type = 'system', amount = 0, link = '/profile?tab=notifications' } = req.body;

        if (!title && !message) {
            return res.status(400).json({ success: false, message: 'Thiếu tiêu đề hoặc nội dung thông báo' });
        }

        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!authData?.user) return res.status(404).json({ success: false });

        const meta = authData.user.user_metadata || {};
        let notifs = Array.isArray(meta.notifications) ? [...meta.notifications] : [];

        const newNotif = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: title || 'Thông báo',
            message: message || detail || '',
            detail: detail || message || '',
            type: type,
            amount: amount,
            link: link,
            createdAt: new Date().toISOString(),
            read: false,
            isRead: false
        };

        notifs.unshift(newNotif);
        notifs = notifs.slice(0, 60);

        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { ...meta, notifications: notifs }
        });

        return res.json({ success: true, notification: newNotif });
    } catch (err) {
        console.error('[Notifications] POST error:', err);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;
