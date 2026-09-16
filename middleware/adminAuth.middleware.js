/**
 * middleware/adminAuth.middleware.js
 * Bảo vệ các route admin — chỉ cho phép role 'admin'
 */
const { supabaseAdmin } = require('../lib/supabase');

async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Truy cập bị từ chối — thiếu admin token.' });
        }

        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Admin token không hợp lệ.' });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, is_blocked')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
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
