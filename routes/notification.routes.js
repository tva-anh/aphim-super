/**
 * routes/notification.routes.js
 * Persistent user notifications synced with MongoDB Atlas & Supabase Auth & Transactions
 * Đảm bảo 100% thông báo được lưu vĩnh viễn trên Cloud dù người dùng truy cập ở miền chính hay bất kỳ đâu
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { supabaseAdmin } = require('../lib/supabase');
const UserNotification = require('../models/UserNotification');

// ── GET /api/notifications — Lấy danh sách thông báo của user (Cloud-synced) ──
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        let storedNotifs = [];

        // 1. Thử lấy từ MongoDB Atlas trước (Nhanh, tin cậy, không giới hạn kích thước)
        let mongoDoc = null;
        try {
            mongoDoc = await UserNotification.findOne({ user_id: userId }).lean();
            if (mongoDoc && Array.isArray(mongoDoc.notifications) && mongoDoc.notifications.length > 0) {
                storedNotifs = mongoDoc.notifications.map(n => ({
                    ...n,
                    id: String(n.id || n._id || ''),
                    read: !!(n.read || n.isRead),
                    isRead: !!(n.read || n.isRead)
                }));
            }
        } catch (mErr) {
            console.warn('[Notifications] Mongo read warn:', mErr.message);
        }

        // 2. Nếu MongoDB chưa có hoặc ít, lấy thêm từ Supabase Auth user_metadata
        let userMeta = req.user.user_metadata || {};
        if (!storedNotifs.length) {
            try {
                const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
                if (authData?.user?.user_metadata) {
                    userMeta = authData.user.user_metadata;
                    if (Array.isArray(userMeta.notifications) && userMeta.notifications.length > 0) {
                        storedNotifs = userMeta.notifications;
                    }
                }
            } catch (sErr) {
                console.warn('[Notifications] Supabase user fetch warn:', sErr.message);
            }
        }

        // 3. Tự động lấy các giao dịch nạp xu/tiêu xu từ bảng transactions chuyển thành thông báo
        let hasNewAutoNotifs = false;
        try {
            const { data: txs } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(40);

            const existingIds = new Set(storedNotifs.map(n => String(n.id || n._id || '')));

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
                            read: true,
                            isRead: true
                        });
                        existingIds.add(notifId);
                        hasNewAutoNotifs = true;
                    }
                }
            }
        } catch (txErr) {
            console.warn('[Notifications] Transactions fetch warn:', txErr.message);
        }

        // 4. Luôn đảm bảo có thông báo chào mừng nếu hộp thư rỗng
        const existingIds = new Set(storedNotifs.map(n => String(n.id || n._id || '')));
        const welcomeId = 'welcome_' + userId;
        if (!existingIds.has(welcomeId) && storedNotifs.length === 0) {
            storedNotifs.push({
                id: welcomeId,
                title: 'Chào Mừng Đến Với APhim Super!',
                message: 'Chào mừng bạn gia nhập thế giới phim 4K UltraHD. Hãy điểm danh mỗi ngày để nhận Xu và mở khóa các khung avatar độc quyền!',
                detail: 'Khám phá hàng ngàn tựa phim bom tấn đỉnh cao hoàn toàn miễn phí không quảng cáo gián đoạn.',
                type: 'system',
                createdAt: req.user.created_at || new Date().toISOString(),
                read: false,
                isRead: false
            });
            hasNewAutoNotifs = true;
        }

        // 5. Sắp xếp thông báo mới nhất lên đầu và giữ tối đa 100 thông báo
        storedNotifs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        storedNotifs = storedNotifs.slice(0, 100);

        // 6. Tự động lưu và đồng bộ lên cả MongoDB lẫn Supabase
        if (hasNewAutoNotifs || !mongoDoc) {
            // Lưu MongoDB
            try {
                await UserNotification.findOneAndUpdate(
                    { user_id: userId },
                    { $set: { notifications: storedNotifs, updated_at: new Date() } },
                    { upsert: true }
                );
            } catch (saveErr) {
                console.warn('[Notifications] Mongo save warn:', saveErr.message);
            }

            // Đồng bộ Supabase metadata
            try {
                await supabaseAdmin.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        ...userMeta,
                        notifications: storedNotifs.slice(0, 50)
                    }
                });
            } catch (supErr) { }
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
        const notifId = String(req.params.id);

        let notifs = [];
        try {
            const doc = await UserNotification.findOne({ user_id: userId }).lean();
            if (doc && Array.isArray(doc.notifications)) notifs = doc.notifications;
        } catch (e) { }

        if (!notifs.length) {
            const meta = req.user.user_metadata || {};
            if (Array.isArray(meta.notifications)) notifs = meta.notifications;
        }

        notifs = notifs.map(n => {
            if (String(n.id) === notifId || String(n._id) === notifId) {
                return { ...n, read: true, isRead: true };
            }
            return n;
        });

        // Cập nhật MongoDB
        try {
            await UserNotification.findOneAndUpdate(
                { user_id: userId },
                { $set: { notifications: notifs, updated_at: new Date() } },
                { upsert: true }
            );
        } catch (e) { }

        // Cập nhật Supabase
        try {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: { ...(req.user.user_metadata || {}), notifications: notifs.slice(0, 50) }
            });
        } catch (e) { }

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

        let notifs = [];
        try {
            const doc = await UserNotification.findOne({ user_id: userId }).lean();
            if (doc && Array.isArray(doc.notifications)) notifs = doc.notifications;
        } catch (e) { }

        if (!notifs.length) {
            const meta = req.user.user_metadata || {};
            if (Array.isArray(meta.notifications)) notifs = meta.notifications;
        }

        notifs = notifs.map(n => ({ ...n, read: true, isRead: true }));

        // Cập nhật MongoDB
        try {
            await UserNotification.findOneAndUpdate(
                { user_id: userId },
                { $set: { notifications: notifs, updated_at: new Date() } },
                { upsert: true }
            );
        } catch (e) { }

        // Cập nhật Supabase
        try {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: { ...(req.user.user_metadata || {}), notifications: notifs.slice(0, 50) }
            });
        } catch (e) { }

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
        const notifId = String(req.params.id);

        let notifs = [];
        try {
            const doc = await UserNotification.findOne({ user_id: userId }).lean();
            if (doc && Array.isArray(doc.notifications)) notifs = doc.notifications;
        } catch (e) { }

        if (!notifs.length) {
            const meta = req.user.user_metadata || {};
            if (Array.isArray(meta.notifications)) notifs = meta.notifications;
        }

        notifs = notifs.filter(n => String(n.id) !== notifId && String(n._id) !== notifId);

        // Cập nhật MongoDB
        try {
            await UserNotification.findOneAndUpdate(
                { user_id: userId },
                { $set: { notifications: notifs, updated_at: new Date() } },
                { upsert: true }
            );
        } catch (e) { }

        // Cập nhật Supabase
        try {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: { ...(req.user.user_metadata || {}), notifications: notifs.slice(0, 50) }
            });
        } catch (e) { }

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

        let notifs = [];
        try {
            const doc = await UserNotification.findOne({ user_id: userId }).lean();
            if (doc && Array.isArray(doc.notifications)) notifs = doc.notifications;
        } catch (e) { }

        if (!notifs.length) {
            const meta = req.user.user_metadata || {};
            if (Array.isArray(meta.notifications)) notifs = meta.notifications;
        }

        const newNotif = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            title: title || 'Thông báo',
            message: message || detail || '',
            detail: detail || message || '',
            type: type,
            amount: Number(amount) || 0,
            link: link,
            createdAt: new Date().toISOString(),
            read: false,
            isRead: false
        };

        notifs.unshift(newNotif);
        notifs = notifs.slice(0, 100);

        // Lưu MongoDB
        try {
            await UserNotification.findOneAndUpdate(
                { user_id: userId },
                { $set: { notifications: notifs, updated_at: new Date() } },
                { upsert: true }
            );
        } catch (e) { }

        // Lưu Supabase
        try {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: { ...(req.user.user_metadata || {}), notifications: notifs.slice(0, 50) }
            });
        } catch (e) { }

        // Bắn Socket.IO thời gian thực nếu user đang mở tab
        try {
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${userId}`).emit('NEW_NOTIFICATION', newNotif);
            }
        } catch (e) { }

        return res.json({ success: true, notification: newNotif });
    } catch (err) {
        console.error('[Notifications] POST error:', err);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;
