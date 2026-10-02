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

// ── GET /api/settings/desktop-hero-showcase — Public, 7 Phim Hero Desktop ────────
router.get('/desktop-hero-showcase', async (req, res) => {
    try {
        const { data: row } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'desktop_hero_showcase')
            .maybeSingle();

        if (row && Array.isArray(row.value) && row.value.length > 0) {
            return res.json({ success: true, data: row.value });
        }

        const defaultHeroSlides = [
            {
                movieSlug: 'nhat-au-xuan',
                slug: 'nhat-au-xuan',
                name: 'Nhất Âu Xuân',
                originName: 'Spring Of The Blade',
                origin_name: 'Spring Of The Blade',
                imageUrl: 'https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg',
                thumbUrl: 'https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg',
                posterUrl: 'https://phimimg.com/uploads/movies/20260917/nhat-au-xuan-poster.webp',
                poster_url: 'https://phimimg.com/uploads/movies/20260917/nhat-au-xuan-poster.webp',
                year: '2026',
                quality: 'FHD',
                lang: 'Vietsub Full',
                episodeCurrent: 'Tập 30',
                episode_current: 'Tập 30',
                content: '"Người đàn ông sát phạt quyết đoán, thâm sâu mưu mô" Thẩm Nhuận và cô gái "thông minh tỉnh táo như bông sen đen" Tạ Thanh Viên trở thành lưỡi dao của nhau, cùng nhau bước trên con đường báo thù đan xen trong lý trí và tình cảm...',
                category: [{ name: 'Chính Kịch', slug: 'chinh-kich' }, { name: 'Gia Đình', slug: 'gia-dinh' }],
                tmdb: { id: 294990, type: 'tv', vote_average: 9.5 },
                imdb: { id: 'tt45956347', vote_average: 9.5 },
                logoUrl: 'https://image.tmdb.org/t/p/w500/uyABqIMLGBYCrLkeIrt6k7WEaK2.png'
            },
            {
                movieSlug: 'minecraft',
                slug: 'minecraft',
                name: 'Một bộ phim Minecraft',
                originName: 'A Minecraft Movie',
                origin_name: 'A Minecraft Movie',
                imageUrl: 'https://image.tmdb.org/t/p/w1280/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
                thumbUrl: 'https://image.tmdb.org/t/p/w1280/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
                thumb_url: 'https://image.tmdb.org/t/p/w1280/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
                posterUrl: 'https://vsmov.com/storage/images/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
                poster_url: 'https://vsmov.com/storage/images/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
                year: '2025',
                quality: 'FHD',
                lang: 'Vietsub + Thuyết Minh',
                episodeCurrent: 'Full',
                episode_current: 'Full',
                content: 'Chào mừng bạn đến với thế giới của Minecraft, nơi sự sáng tạo không chỉ giúp bạn chế tạo mà còn là yếu tố quan trọng để sống sót! Bốn kẻ lạc lõng bất ngờ bị kéo qua một cánh cổng bí ẩn vào Overworld...',
                category: [{ name: 'Giả Tưởng', slug: 'gia-tuong' }, { name: 'Phiêu Lưu', slug: 'phieu-luu' }, { name: 'Hài', slug: 'hai' }],
                tmdb: { id: 950387, type: 'movie', vote_average: 6.2 },
                imdb: { id: 'tt3566834', vote_average: 6.2 },
                logoUrl: 'https://image.tmdb.org/t/p/w500/5gFN6sNEuzTwx2BY2BrN795JwZl.png'
            },
            {
                movieSlug: 'quat-mo-trung-ma',
                slug: 'quat-mo-trung-ma',
                name: 'Quật Mộ Trùng Ma',
                originName: 'Exhuma',
                origin_name: 'Exhuma',
                imageUrl: 'https://phimimg.com/upload/vod/20250530-1/fdf11774cff47f0ffc9c2dbe2e02d0ca.jpg',
                thumbUrl: 'https://phimimg.com/upload/vod/20250530-1/fdf11774cff47f0ffc9c2dbe2e02d0ca.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20250530-1/fdf11774cff47f0ffc9c2dbe2e02d0ca.jpg',
                posterUrl: 'https://phimimg.com/upload/vod/20250530-1/759df554cc21bf9d6805966dc3fe2b67.jpg',
                poster_url: 'https://phimimg.com/upload/vod/20250530-1/759df554cc21bf9d6805966dc3fe2b67.jpg',
                year: '2024',
                quality: 'FHD',
                lang: 'Vietsub Full',
                episodeCurrent: 'Full',
                episode_current: 'Full',
                content: 'Hai pháp sư, một thầy phong thuỷ và một chuyên gia khâm liệm cùng hợp lực khai quật ngôi mộ bị nguyền rủa của một gia đình giàu có, nhằm cứu lấy sinh mạng đứa con mới sinh, nhưng vô tình giải phóng ác linh cổ xưa...',
                category: [{ name: 'Bí Ẩn', slug: 'bi-an' }, { name: 'Kinh Dị', slug: 'kinh-di' }, { name: 'Tâm Lý', slug: 'tam-ly' }],
                tmdb: { id: 838209, type: 'movie', vote_average: 7.6 },
                imdb: { id: 'tt27802490', vote_average: 6.9 },
                logoUrl: 'https://image.tmdb.org/t/p/w500/zzeosUcmoNVZyTUteGFsD5kdSga.png'
            },
            {
                movieSlug: 'deadpool-va-wolverine',
                slug: 'deadpool-va-wolverine',
                name: 'Deadpool Và Wolverine',
                originName: 'Deadpool & Wolverine',
                origin_name: 'Deadpool & Wolverine',
                imageUrl: 'https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg',
                thumbUrl: 'https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg',
                posterUrl: 'https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg',
                poster_url: 'https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg',
                year: '2024',
                quality: 'FHD',
                lang: 'Vietsub + Thuyết Minh',
                episodeCurrent: 'Full',
                episode_current: 'Full',
                content: 'Wade Wilson đang cố gắng sống cuộc đời bình thường sau những ngày làm lính đánh thuê. Nhưng khi quê hương và dòng thời gian của mình đối mặt với hiểm họa hủy diệt, anh phải tìm kiếm sự trợ giúp từ một Wolverine đầy tổn thương...',
                category: [{ name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Hài Hước', slug: 'hai-huoc' }, { name: 'Viễn Tưởng', slug: 'vien-tuong' }],
                tmdb: { id: 533535, type: 'movie', vote_average: 7.6 },
                imdb: { id: 'tt6263850', vote_average: 7.5 },
                logoUrl: 'https://image.tmdb.org/t/p/w500/2o48U3kMXGIqRAkKZQ3n5OTWSBy.png'
            },
            {
                movieSlug: 'do-anh-cong-duoc-toi',
                slug: 'do-anh-cong-duoc-toi',
                name: 'Đố Anh Còng Được Tôi',
                originName: 'I, The Executioner',
                origin_name: 'I, The Executioner',
                imageUrl: 'https://phimimg.com/upload/vod/20241118-1/3b9d2f3c9a5cf65d15a23db8d0c870ac.jpg',
                thumbUrl: 'https://phimimg.com/upload/vod/20241118-1/3b9d2f3c9a5cf65d15a23db8d0c870ac.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20241118-1/3b9d2f3c9a5cf65d15a23db8d0c870ac.jpg',
                posterUrl: 'https://phimimg.com/upload/vod/20241118-1/9f929fc12384573847849f8786f16ae2.jpg',
                poster_url: 'https://phimimg.com/upload/vod/20241118-1/9f929fc12384573847849f8786f16ae2.jpg',
                year: '2024',
                quality: 'FHD',
                lang: 'Vietsub Full',
                episodeCurrent: 'Full',
                episode_current: 'Full',
                content: 'Thám tử kỳ cựu Seo Do-cheol và Đội Điều tra Tội phạm Bạo lực đối mặt với một kẻ giết người hàng loạt bí ẩn gieo rắc kinh hoàng khắp đất nước, kích động sự phẫn nộ của dư luận và thách thức công lý...',
                category: [{ name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Hình Sự', slug: 'hinh-su' }],
                tmdb: { id: 995926, type: 'movie', vote_average: 7.0 },
                imdb: { id: 'tt30287778', vote_average: 6.3 },
                logoUrl: 'https://image.tmdb.org/t/p/w500/qdDvXw018inT0E08ZfPGEFs68nL.png'
            },
            {
                movieSlug: 'van-tu-hanh',
                slug: 'van-tu-hanh',
                name: 'Vân Tú Hành',
                originName: 'The Legend Of Rosy Clouds',
                origin_name: 'The Legend Of Rosy Clouds',
                imageUrl: 'https://phimimg.com/upload/vod/20250901-1/377ca3402a12c55372f0145f49c0e4a5.jpg',
                thumbUrl: 'https://phimimg.com/upload/vod/20250901-1/377ca3402a12c55372f0145f49c0e4a5.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20250901-1/377ca3402a12c55372f0145f49c0e4a5.jpg',
                posterUrl: 'https://phimimg.com/upload/vod/20260620-1/6b7cf552ac9b66e18a5382c922d2bd0d.jpg',
                poster_url: 'https://phimimg.com/upload/vod/20260620-1/6b7cf552ac9b66e18a5382c922d2bd0d.jpg',
                year: '2026',
                quality: 'FHD',
                lang: 'Vietsub Full',
                episodeCurrent: 'Tập 36',
                episode_current: 'Tập 36',
                content: 'Bộ phim cổ trang chuyển thể theo chân thiếu nữ Hồng Tú Lệ thông minh, kiên cường, dấn thân vào chốn quan trường đầy sóng gió để giúp vị hoàng đế trẻ chấn hưng triều chính, viết nên giai thoại truyền kỳ chốn cung đình...',
                category: [{ name: 'Chính Kịch', slug: 'chinh-kich' }, { name: 'Cổ Trang', slug: 'co-trang' }, { name: 'Hài Hước', slug: 'hai-huoc' }],
                tmdb: { id: 239901, type: 'tv', vote_average: 8.0 },
                imdb: { id: 'tt29489359', vote_average: 5.2 },
                logoUrl: 'https://image.tmdb.org/t/p/w500/76jBz2bfJFkDQgw1rvQNONhn9Zs.png'
            },
            {
                movieSlug: 'tham-tu-lung-danh-conan',
                slug: 'tham-tu-lung-danh-conan',
                name: 'Thám Tử Lừng Danh Conan',
                originName: 'Detective Conan',
                origin_name: 'Detective Conan',
                imageUrl: 'https://phimimg.com/upload/vod/20241229-1/01a129f40195c588ebc3d00c225fa33c.jpg',
                thumbUrl: 'https://phimimg.com/upload/vod/20241229-1/01a129f40195c588ebc3d00c225fa33c.jpg',
                thumb_url: 'https://phimimg.com/upload/vod/20241229-1/01a129f40195c588ebc3d00c225fa33c.jpg',
                posterUrl: 'https://phimimg.com/upload/vod/20240310-1/025424cf62248b9a7b54279ef5416e26.jpg',
                poster_url: 'https://phimimg.com/upload/vod/20240310-1/025424cf62248b9a7b54279ef5416e26.jpg',
                year: '1996',
                quality: 'FHD',
                lang: 'Vietsub + Thuyết Minh',
                episodeCurrent: 'Tập 1214',
                episode_current: 'Tập 1214',
                content: 'Thám tử học sinh Kudo Shinichi bị Tổ chức Áo Đen đầu độc khiến cơ thể bị teo nhỏ thành đứa trẻ tiểu học. Dưới danh phận Edogawa Conan, cậu âm thầm phá giải hàng loạt vụ án hóc búa để tìm kiếm thuốc giải...',
                category: [{ name: 'Bí Ẩn', slug: 'bi-an' }, { name: 'Hài Hước', slug: 'hai-huoc' }],
                tmdb: { id: 30983, type: 'tv', vote_average: 8.5 },
                imdb: { id: 'tt0131179', vote_average: 8.5 },
                logoUrl: 'https://image.tmdb.org/t/p/w500/vX0VEwZViadujTUGcL0EU5orV8p.png'
            }
        ];

        return res.json({ success: true, data: defaultHeroSlides });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// ── PUT /api/settings/desktop-hero-showcase — Admin cập nhật Hero Showcase Desktop ──
router.put('/desktop-hero-showcase', requireAdmin, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu items phải là mảng danh sách phim.' });
        }

        await supabaseAdmin.from('system_settings').upsert({
            key: 'desktop_hero_showcase',
            value: items,
            category: 'content',
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (typeof global.invalidateHeroCache === 'function') {
            global.invalidateHeroCache();
        }

        try {
            if (AdminLog && req.admin) {
                AdminLog.create({
                    admin_id: req.admin.id,
                    admin_name: req.admin.profile?.name || req.admin.email || 'Admin',
                    action: 'update_desktop_hero_showcase',
                    target_type: 'showcase',
                    after: items,
                    ip: req.ip
                }).catch(e => console.warn('[AdminLog warning]', e.message));
            }
        } catch(logErr) {}

        return res.json({ success: true, message: 'Đã lưu cấu hình Hero Showcase Desktop thành công!', data: items });
    } catch (err) {
        console.error('[Desktop Hero Showcase Save Error]', err);
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// ── GET /api/settings/desktop-hero-autoslide — Public/Admin ──────────────────────
router.get('/desktop-hero-autoslide', async (req, res) => {
    try {
        const { data: row } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'desktop_hero_autoslide')
            .maybeSingle();

        const defaultConfig = {
            enabled: true,
            interval: 6, // Giới hạn tối đa 10s theo cấu hình Admin
            pauseOnHover: true
        };

        if (row && row.value && typeof row.value === 'object') {
            const val = row.value;
            const parsedInterval = parseInt(val.interval, 10);
            return res.json({
                success: true,
                data: {
                    enabled: typeof val.enabled === 'boolean' ? val.enabled : true,
                    interval: Math.min(10, Math.max(3, !isNaN(parsedInterval) ? parsedInterval : 6)),
                    pauseOnHover: typeof val.pauseOnHover === 'boolean' ? val.pauseOnHover : true
                }
            });
        }

        return res.json({ success: true, data: defaultConfig });
    } catch (e) {
        return res.json({ success: true, data: { enabled: true, interval: 6, pauseOnHover: true } });
    }
});

// ── PUT /api/settings/desktop-hero-autoslide — Admin cập nhật Tự Động Chuyển Slide ──
router.put('/desktop-hero-autoslide', requireAdmin, async (req, res) => {
    try {
        const { enabled, interval, pauseOnHover } = req.body;
        const parsedInterval = parseInt(interval, 10);
        // Giới hạn cấu hình từ 3s đến 10s (KHÔNG vượt quá ngưỡng 10s)
        const cleanInterval = Math.min(10, Math.max(3, !isNaN(parsedInterval) ? parsedInterval : 6));
        const cleanConfig = {
            enabled: enabled === true || enabled === 'true' || enabled === 1,
            interval: cleanInterval,
            pauseOnHover: pauseOnHover !== false && pauseOnHover !== 'false' && pauseOnHover !== 0
        };

        await supabaseAdmin.from('system_settings').upsert({
            key: 'desktop_hero_autoslide',
            value: cleanConfig,
            category: 'content',
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (typeof global.invalidateHeroCache === 'function') {
            global.invalidateHeroCache();
        }

        return res.json({
            success: true,
            message: `Đã lưu cấu hình tự động chuyển Hero Banner (${cleanConfig.enabled ? `Bật, mỗi ${cleanConfig.interval}s` : 'Đã Tắt'}) thành công!`,
            data: cleanConfig
        });
    } catch (err) {
        console.error('[Desktop Hero AutoSlide Save Error]', err);
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// ── GET /api/settings/desktop-interests — Public, Cụm "Bạn đang quan tâm gì?" ──
router.get('/desktop-interests', async (req, res) => {
    try {
        const { data: row } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'desktop_interests')
            .maybeSingle();

        if (row && Array.isArray(row.value) && row.value.length > 0) {
            const sanitized = row.value.map(item => ({
                ...item,
                iconSvg: item.iconSvg ? item.iconSvg.replace(/14s1\.5\s*2\s*4\s*2\s*4-2(\s*4-2)?/g, '14c1.5 2 6.5 2 8 0') : item.iconSvg
            }));
            return res.json({ success: true, data: sanitized });
        }

        const defaultInterests = [
            {
                id: 'phim-bo',
                title: 'Phim Bộ',
                actionText: 'XEM NGAY',
                link: '/danh-sach?list=phim-bo',
                gradient: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 55%, #4338ca 100%)',
                imageUrl: 'https://phimimg.com/upload/vod/20240310-1/759bbb161873247310b3ad71ac96d95b.jpg',
                iconSvg: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'
            },
            {
                id: 'phim-moi',
                title: 'Phim Mới',
                actionText: 'XEM NGAY',
                link: '/danh-sach?list=phim-moi-cap-nhat',
                gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 55%, #991b1b 100%)',
                imageUrl: 'https://phimimg.com/upload/vod/20250530-1/fdf11774cff47f0ffc9c2dbe2e02d0ca.jpg',
                iconSvg: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/></svg>'
            },
            {
                id: 'hanh-dong',
                title: 'Hành Động',
                actionText: 'XEM NGAY',
                link: '/categories?category=hanh-dong',
                gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%)',
                imageUrl: 'https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg',
                iconSvg: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>'
            },
            {
                id: 'tinh-cam',
                title: 'Tình Cảm',
                actionText: 'XEM NGAY',
                link: '/categories?category=tinh-cam',
                gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 55%, #be185d 100%)',
                imageUrl: 'https://phimimg.com/upload/vod/20250901-1/377ca3402a12c55372f0145f49c0e4a5.jpg',
                iconSvg: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>'
            },
            {
                id: 'hai-huoc',
                title: 'Hài Hước',
                actionText: 'XEM NGAY',
                link: '/categories?category=hai-huoc',
                gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 55%, #854d0e 100%)',
                imageUrl: 'https://phimimg.com/upload/vod/20241118-1/3b9d2f3c9a5cf65d15a23db8d0c870ac.jpg',
                iconSvg: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M8 14c1.5 2 6.5 2 8 0M9 9h.01M15 9h.01"></path></svg>'
            },
            {
                id: 'hoat-hinh',
                title: 'Hoạt Hình',
                actionText: 'XEM NGAY',
                link: '/danh-sach?list=hoat-hinh',
                gradient: 'linear-gradient(135deg, #10b981 0%, #059669 55%, #065f46 100%)',
                imageUrl: 'https://phimimg.com/upload/vod/20241229-1/01a129f40195c588ebc3d00c225fa33c.jpg',
                iconSvg: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            }
        ];

        return res.json({ success: true, data: defaultInterests });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// ── PUT /api/settings/desktop-interests — Admin cập nhật "Bạn đang quan tâm gì?" ──
router.put('/desktop-interests', requireAdmin, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu items phải là mảng danh sách thẻ.' });
        }

        await supabaseAdmin.from('system_settings').upsert({
            key: 'desktop_interests',
            value: items,
            category: 'content',
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (typeof global.invalidateInterestsCache === 'function') {
            global.invalidateInterestsCache();
        }

        return res.json({ success: true, message: 'Đã lưu cấu hình "Bạn đang quan tâm gì?" thành công!', data: items });
    } catch (err) {
        console.error('[Desktop Interests Save Error]', err);
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + err.message });
    }
});

// ── GET /api/settings/movie-backdrops — Tìm kiếm & Tải tất cả Backdrop & Logo TMDB cho phim ──
router.get('/movie-backdrops', async (req, res) => {
    try {
        const { query = '', name = '', origin_name = '', tmdbId, mediaType = 'movie', slug = '' } = req.query;
        const TMDB_KEY = process.env.TMDB_API_KEY || '5fb3c8d9ad2ca4cd2029836befcc3ab5';

        let targetId = tmdbId ? parseInt(tmdbId, 10) : null;
        let targetType = mediaType || 'movie';

        // 1. Tìm TMDB ID nếu chưa có
        if (!targetId) {
            const searchTerms = [origin_name, name, query, slug.replace(/-/g, ' ')].filter(Boolean);
            for (const term of searchTerms) {
                if (targetId) break;
                try {
                    // Thử tìm movie
                    const mRes = await fetch(`https://api.tmdb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(term)}&language=vi-VN`);
                    const mData = await mRes.json();
                    if (mData.results && mData.results.length > 0) {
                        targetId = mData.results[0].id;
                        targetType = 'movie';
                        break;
                    }
                    // Thử tìm tv
                    const tvRes = await fetch(`https://api.tmdb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(term)}&language=vi-VN`);
                    const tvData = await tvRes.json();
                    if (tvData.results && tvData.results.length > 0) {
                        targetId = tvData.results[0].id;
                        targetType = 'tv';
                        break;
                    }
                } catch (e) {}
            }
        }

        const backdrops = [];
        const posters = [];
        const logos = [];

        // 2. Fetch images từ TMDB nếu có targetId
        if (targetId) {
            try {
                const imgRes = await fetch(`https://api.tmdb.org/3/${targetType}/${targetId}/images?api_key=${TMDB_KEY}&include_image_language=vi,en,zh,ja,ko,null`);
                const imgData = await imgRes.json();

                if (imgData.posters && Array.isArray(imgData.posters)) {
                    imgData.posters
                        .slice(0, 24)
                        .forEach(p => {
                            posters.push({
                                url: `https://image.tmdb.org/t/p/original${p.file_path}`,
                                previewUrl: `https://image.tmdb.org/t/p/w500${p.file_path}`,
                                width: p.width,
                                height: p.height,
                                aspectRatio: p.aspect_ratio,
                                voteAverage: p.vote_average
                            });
                        });
                }

                if (imgData.backdrops && Array.isArray(imgData.backdrops)) {
                    imgData.backdrops
                        .filter(b => (!b.aspect_ratio || b.aspect_ratio >= 1.2) && (!b.width || !b.height || b.width > b.height))
                        .slice(0, 20)
                        .forEach(b => {
                            backdrops.push({
                                url: `https://image.tmdb.org/t/p/original${b.file_path}`,
                                previewUrl: `https://image.tmdb.org/t/p/w780${b.file_path}`,
                                width: b.width,
                                height: b.height,
                                aspectRatio: b.aspect_ratio,
                                voteAverage: b.vote_average
                            });
                        });
                }

                if (imgData.logos && Array.isArray(imgData.logos)) {
                    imgData.logos.slice(0, 15).forEach(l => {
                        logos.push({
                            url: `https://image.tmdb.org/t/p/w500${l.file_path}`,
                            previewUrl: `https://image.tmdb.org/t/p/w300${l.file_path}`,
                            lang: l.iso_639_1 || 'en',
                            aspectRatio: l.aspect_ratio
                        });
                    });
                }
            } catch (e) {
                console.warn('[TMDB Image Fetch Warning]', e);
            }
        }

        // 3. Fallback lấy thêm ảnh từ PhimAPI / Ophim nếu có slug
        if (slug) {
            try {
                const pRes = await fetch(`https://phimapi.com/phim/${encodeURIComponent(slug)}`);
                const pData = await pRes.json();
                if (pData.status === true && pData.movie) {
                    const m = pData.movie;
                    if (m.poster_url) {
                        const fullPoster = m.poster_url.startsWith('http') ? m.poster_url : `https://phimimg.com/${m.poster_url.replace(/^\//, '')}`;
                        if (!posters.some(p => p.url === fullPoster)) {
                            posters.unshift({
                                url: fullPoster,
                                previewUrl: fullPoster,
                                width: 800,
                                height: 1200,
                                isPrimary: true
                            });
                        }
                    }
                    if (m.thumb_url) {
                        const fullThumb = m.thumb_url.startsWith('http') ? m.thumb_url : `https://phimimg.com/${m.thumb_url.replace(/^\//, '')}`;
                        if (!backdrops.some(b => b.url === fullThumb)) {
                            backdrops.unshift({
                                url: fullThumb,
                                previewUrl: fullThumb,
                                width: 1920,
                                height: 1080,
                                isPrimary: true
                            });
                        }
                    }
                }
            } catch (e) {}
        }

        return res.json({
            success: true,
            tmdbId: targetId,
            mediaType: targetType,
            posters,
            backdrops,
            logos
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message, posters: [], backdrops: [], logos: [] });
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
