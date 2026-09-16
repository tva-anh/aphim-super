/**
 * middleware/auth.middleware.js
 * Xác thực JWT Supabase — bảo vệ các route cần đăng nhập
 */
const { supabaseAdmin } = require('../lib/supabase');

/**
 * Middleware: Yêu cầu user đăng nhập (Supabase JWT)
 */
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập — thiếu token xác thực.' });
        }

        // Xác thực token với Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        // Lấy profile từ bảng profiles
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile?.is_blocked) {
            return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa.' });
        }

        // Gắn user vào request để các route dùng tiếp
        req.user = { ...user, profile: profile || {} };
        next();

    } catch (err) {
        console.error('[Auth Middleware]', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi xác thực server.' });
    }
}

/**
 * Middleware: Optional auth — không bắt buộc đăng nhập
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (token) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                req.user = { ...user, profile: profile || {} };
            }
        }
        next();
    } catch (err) {
        next(); // Bỏ qua lỗi auth khi optional
    }
}

module.exports = { requireAuth, optionalAuth };
