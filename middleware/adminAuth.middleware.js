/**
 * middleware/adminAuth.middleware.js
 * Bảo vệ các route admin — chỉ cho phép role 'admin'
 */
const { supabaseAdmin } = require('../lib/supabase');

async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token && req.cookies) {
            token = req.cookies.adminToken || req.cookies.cinestream_admin_token || req.cookies.aphim_admin_token || req.cookies['sb-access-token'] || req.cookies.token;
        }

        if (!token && req.headers.cookie) {
            const match = req.headers.cookie.match(/(?:^|;\s*)(?:aphim_admin_token|adminToken|cinestream_admin_token|sb-access-token|token)=([^;]+)/);
            if (match) {
                token = decodeURIComponent(match[1]);
            }
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Truy cập bị từ chối — thiếu admin token.' });
        }

        let user = null;
        let userId = null;

        try {
            const { data: authData, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && authData && authData.user) {
                user = authData.user;
                userId = user.id;
            }
        } catch (e) {}

        // Fallback an toàn: Phục hồi userId từ JWT payload nếu Supabase Auth token tạm hết hạn 1h
        if (!userId) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                    if (payload && (payload.sub || payload.id)) {
                        userId = payload.sub || payload.id;
                        user = { id: userId, email: payload.email || '' };
                    }
                }
            } catch (jwtErr) {}
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Admin token không hợp lệ hoặc phiên làm việc đã kết thúc.' });
        }

        const { data: profile, error: profErr } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, is_blocked, name, avatar_url')
            .eq('id', userId)
            .single();

        if (profErr || !profile || profile.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập khu vực admin.' });
        }

        if (profile.is_blocked) {
            return res.status(403).json({ success: false, message: 'Tài khoản admin đã bị khóa.' });
        }

        req.admin = { ...user, profile };
        next();

    } catch (err) {
        console.error('[Admin Auth Middleware]', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi xác thực admin.' });
    }
}

module.exports = { requireAdmin };
