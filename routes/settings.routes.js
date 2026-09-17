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

// ── GET /api/settings/mobile-3d-showcase — Public, phục vụ Mobile 3D Coverflow ────────
router.get('/mobile-3d-showcase', async (req, res) => {
    try {
        const { data: row } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'mobile_3d_showcase')
            .maybeSingle();

        if (row && Array.isArray(row.value) && row.value.length > 0) {
            return res.json({ success: true, data: row.value });
        }

        // Fallback default list nếu Admin chưa cấu hình tùy chỉnh - Phim thật 100%
        const defaultShowcase = [
            {
                slug: 'doraemon-nobita-va-lau-dai-duoi-day-bien-phien-ban-moi',
                name: 'Doraemon: Nobita và Lâu Đài Dưới Đáy Biển (Phiên Bản Mới)',
                origin_name: 'Doraemon the Movie: New Nobita and the Castle of the Undersea Devil',
                poster_url: 'https://phimimg.com/uploads/movies/20260829/doraemon-nobita-va-lau-dai-duoi-day-bien-phien-ban-moi-poster.webp',
                thumb_url: 'https://phimimg.com/uploads/movies/20260829/doraemon-nobita-va-lau-dai-duoi-day-bien-phien-ban-moi-thumb.webp',
                quality: 'FHD',
                year: '2026',
                lang: 'Vietsub + Lồng Tiếng',
                content: '"Doraemon: Nobita và Lâu đài dưới đáy biển" là một trong những tác phẩm kinh điển thuộc loạt truyện dài Doraemon. Chuyến thám hiểm đáy đại dương kỳ vĩ và hấp dẫn của nhóm bạn Nobita.'
            },
            {
                slug: 'quat-mo-trung-ma',
                name: 'Quật Mộ Trùng Ma',
                origin_name: 'Exhuma',
                poster_url: 'https://phimimg.com/upload/vod/20250530-1/759df554cc21bf9d6805966dc3fe2b67.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20250530-1/fdf11774cff47f0ffc9c2dbe2e02d0ca.jpg',
                quality: 'FHD',
                year: '2024',
                lang: 'Vietsub Full',
                content: 'Hai pháp sư, một thầy phong thuỷ và một chuyên gia khâm liệm cùng hợp lực khai quật ngôi mộ bí ẩn của một gia tộc giàu có, mở ra chuỗi sự kiện kinh dị tâm linh rùng rợn.'
            },
            {
                slug: 'tham-tu-lung-danh-conan-ngoi-sao-5-canh-1-trieu-do',
                name: 'Thám Tử Lừng Danh Conan: Ngôi Sao 5 Cánh 1 Triệu Đô',
                origin_name: 'Detective Conan Movie 27: The Million Dollar Pentagram',
                poster_url: 'https://phimimg.com/upload/vod/20241229-1/01a129f40195c588ebc3d00c225fa33c.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20241229-1/309e1f1623755fa993140a83167f577b.jpg',
                quality: 'FHD',
                year: '2024',
                lang: 'Vietsub + Lồng Tiếng',
                content: 'Cuộc đối đầu kịch tính giữa Siêu trộm Kaito Kid, Thám tử miền Tây Hattori Heiji và Conan tại Hakodate xoay quanh thanh kiếm Nhật cổ chứa đựng bí mật lịch sử chấn động.'
            },
            {
                slug: 'deadpool-va-wolverine',
                name: 'Deadpool Và Wolverine',
                origin_name: 'Deadpool & Wolverine',
                poster_url: 'https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg',
                quality: 'FHD',
                year: '2024',
                lang: 'Vietsub + Thuyết Minh',
                content: 'Bom tấn siêu anh hùng Marvel với màn hợp tác đầy bùng nổ, hài hước và mãn nhãn giữa hai nhân vật bất trị Deadpool và Wolverine để giải cứu đa vũ trụ.'
            },
            {
                slug: 'do-anh-cong-duoc-toi',
                name: 'Đố Anh Còng Được Tôi',
                origin_name: 'I, The Executioner',
                poster_url: 'https://phimimg.com/upload/vod/20241118-1/9f929fc12384573847849f8786f16ae2.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20241118-1/3b9d2f3c9a5cf65d15a23db8d0c870ac.jpg',
                quality: 'FHD',
                year: '2024',
                lang: 'Vietsub Full',
                content: 'Thám tử lão làng Seo Do-cheol cùng tân binh trẻ tài năng đối đầu với tên sát nhân hàng loạt nguy hiểm trong một cuộc rượt đuổi nghẹt thở đầy gay cấn.'
            }
        ];

        return res.json({ success: true, data: defaultShowcase });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// ── PUT /api/settings/mobile-3d-showcase — Admin cập nhật danh sách Showcase 3D ──
router.put('/mobile-3d-showcase', requireAdmin, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu items phải là mảng danh sách phim.' });
        }

        await supabaseAdmin.from('system_settings').upsert({
            key: 'mobile_3d_showcase',
            value: items,
            category: 'content',
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        try {
            if (AdminLog && req.admin) {
                AdminLog.create({
                    admin_id: req.admin.id,
                    admin_name: req.admin.profile?.name || req.admin.email || 'Admin',
                    action: 'update_mobile_3d_showcase',
                    target_type: 'showcase',
                    after: items,
                    ip: req.ip
                }).catch(e => console.warn('[AdminLog warning]', e.message));
            }
        } catch(logErr) {}

        return res.json({ success: true, message: 'Đã lưu cấu hình Showcase 3D Mobile thành công!', data: items });
    } catch (err) {
        console.error('[Mobile 3D Showcase Save Error]', err);
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
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
