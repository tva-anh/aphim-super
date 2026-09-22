/**
 * routes/auth.routes.js
 * Đăng ký, đăng nhập, profile — dùng Supabase Auth
 */
const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');
const logger = require('../lib/logger');
const SecurityLog = require('../models/SecurityLog');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5, // Chỉ cho phép sai 5 lần
    message: { success: false, message: 'Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 10, // 10 lần đăng ký mỗi IP/giờ
    message: { success: false, message: 'Quá nhiều yêu cầu đăng ký, vui lòng thử lại sau 1 giờ.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Kiểm tra xem tên hiển thị có chứa các danh xưng đặc quyền của Admin/BQT hay không
 */
function isReservedAdminName(name) {
    if (!name || typeof name !== 'string') return false;
    
    // Normalize: Bỏ dấu tiếng Việt, chuyển chữ thường, thay ký tự đặc biệt bằng khoảng trắng
    const normalized = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Các từ khóa đặc quyền
    const reservedTerms = [
        'admin',
        'administrator',
        'superadmin',
        'super admin',
        'quan tri',
        'quan tri vien',
        'ban quan tri',
        'bqt',
        'moderator',
        'mod aphim',
        'aphim mod',
        'he thong',
        'system',
        'support aphim',
        'aphim support',
        'aphim official',
        'developer',
        'dev aphim'
    ];

    for (const term of reservedTerms) {
        const regex = new RegExp(`(^|\\s)${term.replace(/\s+/g, '\\s+')}(\\s|$)`, 'i');
        if (regex.test(normalized) || regex.test(name.toLowerCase())) {
            return true;
        }
        if (['admin', 'administrator', 'superadmin', 'quan tri vien', 'ban quan tri'].includes(term)) {
            if (normalized.includes(term.replace(/\s+/g, ' '))) {
                return true;
            }
        }
    }
    return false;
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { email, password, name, phone = '' } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ: email, mật khẩu, tên.' });
        }

        if (isReservedAdminName(name)) {
            return res.status(400).json({
                success: false,
                message: 'Tên hiển thị chứa từ khóa đặc quyền của Admin (Admin, Quản trị viên, BQT...). Chỉ Ban Quản Trị mới có thể sử dụng tên này.'
            });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ success: false, message: 'Mật khẩu phải ít nhất 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số.' });
        }

        // Đăng ký qua Supabase Admin để tự động xác thực email ngay lập tức (không cần SMTP)
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: { name: name.trim(), phone }
        });

        if (error) {
            if (error.message.includes('already') || error.message.includes('exists')) {
                return res.status(400).json({ success: false, message: 'Email này đã được đăng ký.' });
            }
            return res.status(400).json({ success: false, message: error.message });
        }

        // Trigger trong Supabase sẽ tự động tạo profile
        // Lấy lại profile vừa tạo
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        logger.info(`New user registered: ${email}`, { ip: req.ip });
        await SecurityLog.create({
            user_id: data.user.id,
            email: email.trim().toLowerCase(),
            action: 'register',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            status: 'success'
        }).catch(err => console.error('[SecurityLog] Error:', err.message));

        try {
            const adminRoutes = require('./admin.routes');
            if (adminRoutes.invalidateAdminCache) {
                adminRoutes.invalidateAdminCache('dashboard');
                adminRoutes.invalidateAdminCache('users');
            }
        } catch (e) {}

        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            token: data.session?.access_token || null,
            user: buildUserResponse(data.user, profile)
        });

    } catch (err) {
        console.error('[Auth] Register error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký.' });
    }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
        });

        if (error) {
            logger.warn(`Login failed for ${email}: ${error.message}`, { ip: req.ip });
            await SecurityLog.create({
                email: email.trim().toLowerCase(),
                action: 'login_failed',
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                status: 'failed',
                note: error.message
            }).catch(err => console.error('[SecurityLog] Error:', err.message));

            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng.' });
        }

        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!profile) {
            const meta = data.user.user_metadata || {};
            const initialProfile = {
                id: data.user.id,
                name: meta.name || meta.displayName || (data.user.email ? data.user.email.split('@')[0] : 'User'),
                avatar_url: meta.avatar_url || meta.avatar || '',
                xu: meta.xu || 150,
                xp: meta.xp || 0,
                level: meta.level || 1
            };
            const { data: createdProfile } = await supabaseAdmin
                .from('profiles')
                .upsert(initialProfile, { onConflict: 'id' })
                .select()
                .single();
            profile = createdProfile || initialProfile;
        }

        if (profile?.is_blocked) {
            return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.' });
        }

        // Lấy gói VIP hiện tại
        const { data: subscription } = await supabaseAdmin
            .from('vip_subscriptions')
            .select('*')
            .eq('user_id', data.user.id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .single();

        logger.info(`Login successful for ${email}`, { ip: req.ip });
        await SecurityLog.create({
            user_id: data.user.id,
            email: email.trim().toLowerCase(),
            action: 'login_success',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            status: 'success'
        }).catch(err => console.error('[SecurityLog] Error:', err.message));

        return res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expiresIn: '30d',
            user: buildUserResponse(data.user, profile, subscription)
        });

    } catch (err) {
        console.error('[Auth] Login error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập.' });
    }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const email = req.user.email;

        await SecurityLog.create({
            user_id: userId,
            email: email,
            action: 'logout',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            status: 'success'
        }).catch(err => console.error('[SecurityLog] Error:', err.message));

        return res.json({ success: true, message: 'Đăng xuất thành công.' });
    } catch (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi đăng xuất.' });
    }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        let { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!profile) {
            const meta = req.user.user_metadata || {};
            const initialProfile = {
                id: userId,
                name: meta.name || meta.displayName || (req.user.email ? req.user.email.split('@')[0] : 'User'),
                avatar_url: meta.avatar_url || meta.avatar || '',
                xu: meta.xu || 150,
                xp: meta.xp || 0,
                level: meta.level || 1
            };
            const { data: createdProfile } = await supabaseAdmin
                .from('profiles')
                .upsert(initialProfile, { onConflict: 'id' })
                .select()
                .single();
            profile = createdProfile || initialProfile;
        }

        const { data: subscription } = await supabaseAdmin
            .from('vip_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .single();

        try {
            const Gamification = require('../models/Gamification');
            const gamif = await Gamification.findOne({ user_id: userId }).lean();
            if (gamif) {
                if (gamif.xu != null) profile.xu = gamif.xu;
                if (gamif.xp != null) profile.xp = gamif.xp;
                if (gamif.level != null) profile.level = gamif.level;
                profile.streak_current = gamif.streak_current || 0;
                profile.streak_last_claimed = gamif.streak_last_claimed || '';
            }
        } catch (gerr) {
            console.warn('[Auth] MongoDB Gamification fetch error:', gerr.message);
        }

        return res.json({
            success: true,
            data: buildUserResponse(req.user, profile, subscription)
        });

    } catch (err) {
        console.error('[Auth] Me error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy thông tin.' });
    }
});

// ── PUT /api/auth/profile & /api/auth/updatedetails ─────────────────────────
const handleUpdateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const body = req.body || {};

        const name = body.name || body.displayName || body.fullName;

        // Chặn người dùng thường đặt tên có chứa danh xưng đặc quyền của Admin/BQT
        if (name !== undefined && name.trim() !== '') {
            const userRole = req.user?.profile?.role || req.user?.user_metadata?.role;
            const isAdmin = userRole === 'admin' || req.user?.email === 'admin@aphim.io.vn';
            if (!isAdmin && isReservedAdminName(name)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên hiển thị chứa danh xưng đặc quyền của Admin (Admin, Quản trị viên, BQT...). Chỉ Ban Quản Trị mới có thể sử dụng tên này.'
                });
            }
        }
        const phone = body.phone || body.phoneNumber;
        const avatar = body.avatar || body.avatar_url || body.avatarUrl;
        const equipped_frame = body.equipped_frame || body.equippedFrame;
        const equipped_frame_url = body.equipped_frame_url || body.equippedFrameUrl;
        const equipped_frame_class = body.equipped_frame_class || body.equippedFrameClass;
        const equipped_banner = body.equipped_banner || body.equippedBanner;
        const equipped_color = body.equipped_color || body.equippedColor;
        const equipped_badge = body.equipped_badge || body.equippedBadge;
        const profile_cover = body.profile_cover || body.profileCover;
        const xu = body.xu ?? body.coins;
        const xp = body.xp;
        const level = body.level;
        const favorites = body.favorites;
        const watchHistory = body.watchHistory || body.watch_history;
        const watchProgress = body.watchProgress || body.watch_progress;
        const playlists = body.playlists;
        const inventory = body.inventory;
        const ownedFrames = body.ownedFrames || body.owned_frames;
        const ownedBanners = body.ownedBanners || body.owned_banners;
        const ownedItems = body.ownedItems || body.owned_items;
        const streakData = body.streakData || body.streak_data;
        const missionsData = body.missionsData || body.missions_data;
        const settings = body.settings;
        const notifications = body.notifications;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (avatar !== undefined) updates.avatar_url = avatar;
        if (equipped_frame !== undefined) updates.equipped_frame = equipped_frame;
        if (equipped_frame_url !== undefined) updates.equipped_frame_url = equipped_frame_url;
        if (equipped_frame_class !== undefined) updates.equipped_frame_class = equipped_frame_class;
        if (equipped_banner !== undefined) updates.equipped_banner = equipped_banner;
        if (equipped_color !== undefined) updates.equipped_color = equipped_color;
        if (equipped_badge !== undefined) updates.equipped_badge = equipped_badge;
        if (profile_cover !== undefined) updates.profile_cover = profile_cover;
        if (xu !== undefined) updates.xu = xu;
        if (xp !== undefined) updates.xp = xp;
        if (level !== undefined) updates.level = level;
        updates.updated_at = new Date().toISOString();

        // 1. Cập nhật bảng profiles trên Supabase (sử dụng upsert để đảm bảo profile luôn tồn tại)
        let { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: userId, ...updates }, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.warn('[Auth] Detailed profile upsert failed, falling back to core columns:', error.message);
            const coreUpdates = {};
            if (name !== undefined) coreUpdates.name = name;
            if (phone !== undefined) coreUpdates.phone = phone;
            if (avatar !== undefined) coreUpdates.avatar_url = avatar;
            if (equipped_frame !== undefined) coreUpdates.equipped_frame = equipped_frame;
            if (equipped_banner !== undefined) coreUpdates.equipped_banner = equipped_banner;
            if (profile_cover !== undefined) coreUpdates.profile_cover = profile_cover;
            if (xu !== undefined) coreUpdates.xu = xu;
            if (xp !== undefined) coreUpdates.xp = xp;
            if (level !== undefined) coreUpdates.level = level;
            coreUpdates.updated_at = new Date().toISOString();

            const fallbackRes = await supabaseAdmin
                .from('profiles')
                .upsert({ id: userId, ...coreUpdates }, { onConflict: 'id' })
                .select()
                .single();
            profile = fallbackRes.data || profile;
        }

        // 2. Đồng bộ user_metadata trên Supabase Auth để đảm bảo luôn lưu 100% dữ liệu tùy chỉnh lên cloud
        let authUser = req.user;
        try {
            const metaPayload = {
                ...(req.user.user_metadata || {}),
                ...updates,
                ...(name ? { displayName: name, fullName: name } : {}),
                ...(avatar ? { avatar: avatar, avatar_url: avatar } : {}),
                ...(equipped_frame ? { equippedFrame: equipped_frame, equipped_frame } : {}),
                ...(equipped_frame_url !== undefined ? { equippedFrameUrl: equipped_frame_url, equipped_frame_url } : {}),
                ...(equipped_frame_class !== undefined ? { equippedFrameClass: equipped_frame_class, equipped_frame_class } : {}),
                ...(equipped_banner ? { equippedBanner: equipped_banner, equipped_banner } : {}),
                ...(equipped_color ? { equippedColor: equipped_color, equipped_color } : {}),
                ...(equipped_badge ? { equippedBadge: equipped_badge, equipped_badge } : {}),
                ...(profile_cover ? { profileCover: profile_cover, profile_cover } : {}),
                ...(favorites !== undefined ? { favorites } : {}),
                ...(watchHistory !== undefined ? { watchHistory, watch_history: watchHistory } : {}),
                ...(watchProgress !== undefined ? { watchProgress, watch_progress: watchProgress } : {}),
                ...(playlists !== undefined ? { playlists } : {}),
                ...(inventory !== undefined ? { inventory } : {}),
                ...(ownedFrames !== undefined ? { ownedFrames, owned_frames: ownedFrames } : {}),
                ...(ownedBanners !== undefined ? { ownedBanners, owned_banners: ownedBanners } : {}),
                ...(ownedItems !== undefined ? { ownedItems, owned_items: ownedItems } : {}),
                ...(streakData !== undefined ? { streakData, streak_data: streakData } : {}),
                ...(missionsData !== undefined ? { missionsData, missions_data: missionsData } : {}),
                ...(settings !== undefined ? { settings } : {}),
                ...(notifications !== undefined ? { notifications } : {})
            };

            const updateMetaRes = await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: metaPayload
            });
            if (updateMetaRes.data?.user) {
                authUser = updateMetaRes.data.user;
            }
        } catch (metaErr) {
            console.warn('[Auth] user_metadata sync warning:', metaErr.message);
        }

        // 3. Đồng bộ Xu, XP sang MongoDB (Gamification) để đảm bảo đồng bộ hoàn toàn
        if (xu !== undefined || xp !== undefined || level !== undefined) {
            try {
                const Gamification = require('../models/Gamification');
                let gamif = await Gamification.findOne({ user_id: userId });
                if (!gamif) gamif = new Gamification({ user_id: userId });

                if (xu !== undefined) gamif.xu = xu;
                if (xp !== undefined) gamif.xp = xp;
                if (level !== undefined) gamif.level = level;

                await gamif.save();
            } catch (gerr) {
                console.error('[Auth] MongoDB Gamification sync error:', gerr.message);
            }
        }

        // Lấy gói VIP hiện tại
        const { data: subscription } = await supabaseAdmin
            .from('vip_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .single();

        const userResponse = buildUserResponse(authUser, profile, subscription);
        return res.json({ success: true, data: userResponse, user: userResponse });

    } catch (err) {
        console.error('[Auth] Update profile error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin.' });
    }
};

router.put('/profile', requireAuth, handleUpdateProfile);
router.put('/updatedetails', requireAuth, handleUpdateProfile);

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Bạn đã yêu cầu đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/forgot-password', forgotLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Vui lòng nhập email.' });

        const origin = req.get('origin') || req.get('referer') || process.env.SITE_URL || 'https://aphim.io.vn';
        const cleanOrigin = origin.replace(/\/+$/, '');
        const redirectTo = `${cleanOrigin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: redirectTo
        });

        if (error) {
            console.warn('[Auth] Supabase resetPassword error:', error.message);
        }

        // Luôn trả về thành công để tránh email enumeration bảo mật
        return res.json({ 
            success: true, 
            message: 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn.' 
        });

    } catch (err) {
        console.error('[Auth] Forgot password error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi xử lý yêu cầu.' });
    }
});

// ── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { accessToken, token, newPassword } = req.body;
        const validToken = accessToken || token;

        if (!validToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'Thiếu mã xác thực đặt lại mật khẩu hoặc liên kết đã hết hạn.' 
            });
        }

        if (!newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng nhập mật khẩu mới.' 
            });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số.' 
            });
        }

        // Lấy thông tin user từ Access Token Supabase
        const { data: { user }, error: userErr } = await supabase.auth.getUser(validToken);
        if (userErr || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Liên kết xác thực đã hết hạn hoặc không hợp lệ. Vui lòng gửi lại yêu cầu mới.' 
            });
        }

        // Cập nhật mật khẩu mới qua Supabase Admin API
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: newPassword
        });

        if (updateErr) {
            console.error('[Auth] Update password error:', updateErr);
            return res.status(400).json({ 
                success: false, 
                message: updateErr.message || 'Không thể đổi mật khẩu, vui lòng thử lại.' 
            });
        }

        // Ghi log bảo mật
        if (SecurityLog) {
            SecurityLog.create({
                user_id: user.id,
                email: user.email,
                action: 'reset_password',
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                status: 'success'
            }).catch(err => console.error('[SecurityLog] Error:', err.message));
        }

        return res.json({
            success: true,
            message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.'
        });

    } catch (err) {
        console.error('[Auth] Reset password error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu.' });
    }
});

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ success: false, message: 'Thiếu refresh_token.' });
        }

        const { data, error } = await supabase.auth.refreshSession({ refresh_token });
        if (error || !data.session) {
            return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ hoặc đã hết hạn.' });
        }

        return res.json({
            success: true,
            token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expiresIn: '30d'
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi refresh token.' });
    }
});

// ── Helper: Build user response object ──────────────────────────────────────
function buildUserResponse(authUser, profile, subscription = null) {
    const meta = authUser?.user_metadata || {};
    const avatar = profile?.avatar_url || meta.avatar || meta.avatar_url || '';
    const frame = profile?.equipped_frame || meta.equipped_frame || meta.equippedFrame || 'frame_none';
    const frameUrl = profile?.equipped_frame_url || meta.equipped_frame_url || meta.equippedFrameUrl || '';
    const frameClass = profile?.equipped_frame_class || meta.equipped_frame_class || meta.equippedFrameClass || '';
    const banner = profile?.equipped_banner || meta.equipped_banner || meta.equippedBanner || 'banner_default';
    const color = profile?.equipped_color || meta.equipped_color || meta.equippedColor || 'color_default';
    const badge = profile?.equipped_badge || meta.equipped_badge || meta.equippedBadge || '';
    const cover = profile?.profile_cover || meta.profile_cover || meta.profileCover || '';

    const favorites = meta.favorites || [];
    const watchHistory = meta.watchHistory || meta.watch_history || [];
    const watchProgress = meta.watchProgress || meta.watch_progress || {};
    const playlists = meta.playlists || [];
    const inventory = meta.inventory || { frames: [], banners: [] };
    const ownedFrames = meta.ownedFrames || meta.owned_frames || [];
    const ownedBanners = meta.ownedBanners || meta.owned_banners || [];
    const ownedItems = meta.ownedItems || meta.owned_items || [];
    const streakData = meta.streakData || meta.streak_data || null;
    const missionsData = meta.missionsData || meta.missions_data || null;

    return {
        id: authUser.id,
        _id: authUser.id,
        email: authUser.email,
        name: profile?.name || meta.name || (authUser.email ? authUser.email.split('@')[0] : 'User'),
        phone: profile?.phone || meta.phone || '',
        avatar: avatar,
        avatar_url: avatar,
        role: profile?.role || meta.role || 'user',
        is_blocked: profile?.is_blocked || false,
        xu: profile?.xu ?? meta.xu ?? 150,
        coins: profile?.xu ?? meta.xu ?? 150,
        xp: profile?.xp ?? meta.xp ?? 0,
        level: profile?.level ?? meta.level ?? 1,
        streak_current: profile?.streak_current ?? meta.streak_current ?? 0,
        streak_last_claimed: profile?.streak_last_claimed || '',
        equippedFrame: frame,
        equipped_frame: frame,
        equippedFrameUrl: frameUrl,
        equipped_frame_url: frameUrl,
        equippedFrameClass: frameClass,
        equipped_frame_class: frameClass,
        equippedBanner: banner,
        equipped_banner: banner,
        equippedColor: color,
        equipped_color: color,
        equippedBadge: badge,
        equipped_badge: badge,
        profileCover: cover,
        profile_cover: cover,
        favorites: favorites,
        watchHistory: watchHistory,
        watch_history: watchHistory,
        watchProgress: watchProgress,
        watch_progress: watchProgress,
        playlists: playlists,
        inventory: inventory,
        ownedFrames: ownedFrames,
        owned_frames: ownedFrames,
        ownedBanners: ownedBanners,
        owned_banners: ownedBanners,
        ownedItems: ownedItems,
        owned_items: ownedItems,
        streakData: { 
            streak: profile?.streak_current ?? meta.streakData?.streak ?? 0, 
            current: profile?.streak_current ?? meta.streakData?.current ?? 0, 
            lastDate: profile?.streak_last_claimed || meta.streakData?.lastDate || '' 
        },
        missionsData: missionsData,
        settings: meta.settings || {},
        subscription: subscription ? {
            plan: subscription.plan,
            status: subscription.status,
            expires_at: subscription.expires_at,
            endDate: subscription.expires_at
        } : { plan: 'FREE', status: 'active' },
        created_at: authUser.created_at
    };
}

module.exports = router;
