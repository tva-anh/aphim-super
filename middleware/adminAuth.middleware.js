/**
 * middleware/adminAuth.middleware.js
 * Bảo vệ các route admin — chỉ cho phép role 'admin'
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../lib/supabase');

const ADMIN_SESSION_SECRET = crypto
    .createHash('sha256')
    .update(String(process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_KEY || 'aphim-admin-fallback-secret') + ':aphim-admin-session-v2')
    .digest('hex');

function signAdminSessionToken(payload) {
    return jwt.sign(
        {
            sub: payload.id || payload.sub,
            email: payload.email || '',
            role: 'admin',
            typ: 'aphim_admin_session'
        },
        ADMIN_SESSION_SECRET,
        { algorithm: 'HS256', expiresIn: '7d' }
    );
}

function verifyAdminSessionToken(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const decoded = jwt.verify(token, ADMIN_SESSION_SECRET, { algorithms: ['HS256'] });
        if (decoded && decoded.typ === 'aphim_admin_session' && decoded.sub) {
            return decoded;
        }
    } catch (_) {}
    return null;
}

function extractCookieValue(cookieHeader, name) {
    if (!cookieHeader || typeof cookieHeader !== 'string') return null;
    const regex = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`);
    const match = cookieHeader.match(regex);
    return match ? decodeURIComponent(match[1]) : null;
}

async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
        if (token === 'null' || token === 'undefined' || !token) {
            token = null;
        }

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
        const cookieHeader = req.headers.cookie || '';
        const sessionCookie = (req.cookies && req.cookies.aphim_admin_session) || extractCookieValue(cookieHeader, 'aphim_admin_session');

        try {
            const { data: authData, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && authData && authData.user) {
                user = authData.user;
                userId = user.id;
            }
        } catch (e) {}

        // 🛡️ Xác thực phiên làm việc 7 ngày bằng chữ ký HMAC-SHA256 của Server (Tuyệt đối không chấp nhận JWT không chữ ký)
        if (!userId) {
            const verifiedSession = verifyAdminSessionToken(sessionCookie) || verifyAdminSessionToken(token);
            if (verifiedSession && verifiedSession.sub) {
                userId = verifiedSession.sub;
                user = { id: userId, email: verifiedSession.email || '' };
            }
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Admin token không hợp lệ hoặc phiên làm việc đã kết thúc.' });
        }

        let { data: profile, error: profErr } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, is_blocked, name, avatar_url')
            .eq('id', userId)
            .single();

        if ((profErr || !profile) && user?.email) {
            const { data: profByEmail } = await supabaseAdmin
                .from('profiles')
                .select('id, email, role, is_blocked, name, avatar_url')
                .eq('email', user.email)
                .single();
            if (profByEmail) {
                profile = profByEmail;
                profErr = null;
            }
        }

        if (profErr || !profile || profile.role !== 'admin') {
            try {
                const SecurityLog = require('../models/SecurityLog');
                if (SecurityLog && typeof SecurityLog.create === 'function') {
                    SecurityLog.create({
                        user_id: userId || '',
                        email: user?.email || 'unauthorized',
                        action: 'admin_unauthorized_access',
                        ip_address: req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '',
                        user_agent: req.headers['user-agent'] || '',
                        status: 'blocked',
                        note: `Cố tình truy cập trái phép API quản trị [${req.method} ${req.originalUrl}] không có vai trò admin`
                    }).catch(() => {});
                }
            } catch (e) {}
            return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập khu vực admin.' });
        }

        if (profile.is_blocked) {
            return res.status(403).json({ success: false, message: 'Tài khoản admin đã bị khóa.' });
        }

        // Tự động cấp cookie phiên ký số chuẩn nếu admin đang có Supabase token sống nhưng chưa có session cookie
        if (!sessionCookie && userId) {
            try {
                const signedSession = signAdminSessionToken({ id: userId, email: profile.email || user?.email || '' });
                res.cookie('aphim_admin_session', signedSession, {
                    path: '/',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    httpOnly: true,
                    sameSite: 'Lax',
                    secure: process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https'
                });
            } catch (_) {}
        }

        req.admin = { ...user, profile };
        next();

    } catch (err) {
        console.error('[Admin Auth Middleware]', err.message);
        return res.status(500).json({ success: false, message: 'Lỗi xác thực admin.' });
    }
}

module.exports = { requireAdmin, signAdminSessionToken, verifyAdminSessionToken };
