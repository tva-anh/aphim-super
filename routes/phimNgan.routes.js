/**
 * routes/phimNgan.routes.js
 * 🎬 APhim Phim Ngắn (Short Drama) Routes
 * Dedicated route for vertical & short dramas (Hongguo / AllShorts).
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const phimNganService = require('../lib/phimNgan.service');
const { optionalAuth, requireAuth } = require('../middleware/auth.middleware');
const WatchHistory = require('../models/WatchHistory');

// 🚀 Keep-Alive connection pool for media streaming (tái sử dụng kết nối TLS, giảm 400ms-800ms độ trễ mỗi phân đoạn video)
const streamingHttpAgent = new http.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 25, timeout: 60000 });
const streamingHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 25, timeout: 60000 });
const streamingAxios = axios.create({
    httpAgent: streamingHttpAgent,
    httpsAgent: streamingHttpsAgent,
    timeout: 15000
});

// =======================================================
// 🚀 SEO STRATEGY SUITE: DYNAMIC METADATA & SCHEMA BUILDER
// =======================================================
const SITE_CANONICAL = 'https://aphim.store';
const DEFAULT_SEO_KEYWORDS = 'phim ngan, phim ngan hay, phim ngan 2026, xem phim ngan, phim ngan vietsub, phim ngan thuyet minh, phim ngan trung quoc, phim ngan douyin, phim ngan tiktok, phim ngan tong tai, phim ngan bao thu, phim ngan nghich tap, phim ngan xuyen khong, aphim phim ngan';
const DEFAULT_OG_IMAGE = `${SITE_CANONICAL}/logo-aphim2.png`;

function buildPhimNganSEO(type, params = {}) {
    if (type === 'home') {
        const title = 'Phim Ngắn Hay Mới Nhất 2026 - Tuyển Tập Phim Ngắn Kịch Tính Vietsub Trọn Bộ | APhim';
        const metaDescription = 'Xem kho phim ngắn hay mới nhất 2026 chất lượng cao Full HD Vietsub Thuyết minh. Tổng hợp tuyển tập phim ngắn tổng tài, nghịch tập, trọng sinh báo thù, tình cảm đô thị hấp dẫn, cập nhật tập mới nhanh nhất mỗi ngày tại APhim.';
        const canonicalUrl = `${SITE_CANONICAL}/phim-ngan`;
        const schemaData = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'BreadcrumbList',
                    'itemListElement': [
                        { '@type': 'ListItem', 'position': 1, 'name': 'Trang Chủ', 'item': `${SITE_CANONICAL}/` },
                        { '@type': 'ListItem', 'position': 2, 'name': 'Phim Ngắn', 'item': canonicalUrl }
                    ]
                },
                {
                    '@type': 'CollectionPage',
                    'name': 'Kho Phim Ngắn Hay Kịch Tính 2026 - APhim Super',
                    'description': metaDescription,
                    'url': canonicalUrl,
                    'inLanguage': 'vi'
                }
            ]
        };
        return {
            title,
            pageTitle: 'Kho Phim Ngắn - AllShorts APhim',
            metaDescription,
            metaKeywords: DEFAULT_SEO_KEYWORDS,
            canonicalUrl,
            ogImage: DEFAULT_OG_IMAGE,
            ogType: 'website',
            schemaData
        };
    }

    if (type === 'detail') {
        const drama = params.drama || {};
        const titleText = drama.title || 'Phim Ngắn Chọn Lọc';
        const totalEp = (drama.episodes && drama.episodes.length) ? drama.episodes.length : (drama.totalEpisodes || 'Nhiều');
        const introText = (drama.intro || `Xem trọn bộ phim ngắn ${titleText} kịch tính, lôi cuốn`).slice(0, 160).trim();
        const title = `${titleText} - Xem Trọn Bộ Full HD Vietsub | Phim Ngắn APhim`;
        const metaDescription = `Xem trọn bộ phim ngắn ${titleText} (${totalEp} tập) Full HD Vietsub Thuyết minh hay nhất. ${introText}. Xem ngay miễn phí tại APhim Phim Ngắn.`;
        const metaKeywords = `${titleText}, xem phim ${titleText}, ${titleText} vietsub, ${titleText} thuyet minh, ${titleText} tron bo, phim ngan ${titleText}, phim ngan vietsub, aphim phim ngan, xem phim online`;
        const canonicalUrl = `${SITE_CANONICAL}/phim-ngan/thong-tin/${drama.id || ''}`;
        const ogImage = drama.cover || drama.thumb_url || DEFAULT_OG_IMAGE;
        const schemaData = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'BreadcrumbList',
                    'itemListElement': [
                        { '@type': 'ListItem', 'position': 1, 'name': 'Trang Chủ', 'item': `${SITE_CANONICAL}/` },
                        { '@type': 'ListItem', 'position': 2, 'name': 'Phim Ngắn', 'item': `${SITE_CANONICAL}/phim-ngan` },
                        { '@type': 'ListItem', 'position': 3, 'name': titleText, 'item': canonicalUrl }
                    ]
                },
                {
                    '@type': 'Movie',
                    'name': titleText,
                    'description': drama.intro || metaDescription,
                    'image': ogImage,
                    'url': canonicalUrl,
                    'genre': (drama.tags && drama.tags.length) ? drama.tags : ['Phim Ngắn', 'Kịch Tính', 'Tình Cảm'],
                    'inLanguage': 'vi',
                    'aggregateRating': {
                        '@type': 'AggregateRating',
                        'ratingValue': drama.rating || '9.6',
                        'bestRating': '10',
                        'ratingCount': drama.play_count || 1280
                    }
                }
            ]
        };
        return {
            title,
            pageTitle: titleText,
            metaDescription,
            metaKeywords,
            canonicalUrl,
            ogImage,
            ogType: 'video.movie',
            schemaData
        };
    }

    if (type === 'watch') {
        const drama = params.drama || {};
        const epNo = params.epNo || 1;
        const titleText = drama.title || 'Phim Ngắn Chọn Lọc';
        const totalEp = (drama.episodes && drama.episodes.length) ? drama.episodes.length : (drama.totalEpisodes || 'Nhiều');
        const title = `Xem Phim ${titleText} Tập ${epNo} Full HD Vietsub | APhim Phim Ngắn`;
        const metaDescription = `Xem phim ngắn ${titleText} tập ${epNo}/${totalEp} Full HD Vietsub Thuyết minh nhanh không giật lag. ${drama.intro ? drama.intro.slice(0, 130) : ''}. Xem trọn bộ phim ngắn tại APhim.`;
        const metaKeywords = `${titleText} tap ${epNo}, xem phim ${titleText} tap ${epNo}, ${titleText} vietsub, phim ngan ${titleText}, xem phim ngan ${titleText}, aphim`;
        const canonicalUrl = `${SITE_CANONICAL}/phim-ngan/xem/${drama.id || ''}?ep=${epNo}`;
        const ogImage = drama.cover || drama.thumb_url || DEFAULT_OG_IMAGE;
        const schemaData = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'BreadcrumbList',
                    'itemListElement': [
                        { '@type': 'ListItem', 'position': 1, 'name': 'Trang Chủ', 'item': `${SITE_CANONICAL}/` },
                        { '@type': 'ListItem', 'position': 2, 'name': 'Phim Ngắn', 'item': `${SITE_CANONICAL}/phim-ngan` },
                        { '@type': 'ListItem', 'position': 3, 'name': titleText, 'item': `${SITE_CANONICAL}/phim-ngan/thong-tin/${drama.id || ''}` },
                        { '@type': 'ListItem', 'position': 4, 'name': `Tập ${epNo}`, 'item': canonicalUrl }
                    ]
                },
                {
                    '@type': 'TVEpisode',
                    'name': `${titleText} - Tập ${epNo}`,
                    'episodeNumber': epNo,
                    'description': metaDescription,
                    'image': ogImage,
                    'url': canonicalUrl,
                    'inLanguage': 'vi'
                }
            ]
        };
        return {
            title,
            pageTitle: `${titleText} - Tập ${epNo}`,
            metaDescription,
            metaKeywords,
            canonicalUrl,
            ogImage,
            ogType: 'video.episode',
            schemaData
        };
    }

    if (type === 'recommend') {
        const title = 'Bảng Xếp Hạng & Đề Xuất Phim Ngắn Hot Nhất 2026 | APhim';
        const metaDescription = 'Top phim ngắn được đề xuất nhiều nhất trên APhim: tổng tài, nghịch tập, trọng sinh báo thù, ngọt sủng hot Douyin TikTok triệu view. Tuyển chọn phim ngắn xem nhiều nhất cập nhật 2026.';
        const metaKeywords = 'de xuat phim ngan, top phim ngan, bang xep hang phim ngan, phim ngan hot douyin, phim ngan tiktok trieu view, phim ngan hay nhat 2026';
        const canonicalUrl = `${SITE_CANONICAL}/phim-ngan/de-xuat`;
        return {
            title,
            pageTitle: 'Đề Xuất Phim Ngắn - Bảng Xếp Hạng Thịnh Hành',
            metaDescription,
            metaKeywords,
            canonicalUrl,
            ogImage: DEFAULT_OG_IMAGE,
            ogType: 'website'
        };
    }

    if (type === 'search') {
        const title = 'Tìm Kiếm Phim Ngắn - Kho Phim Ngắn Vietsub Đầy Đủ Nhất | APhim';
        const metaDescription = 'Tìm kiếm mọi bộ phim ngắn yêu thích theo tên, diễn viên, thể loại tổng tài, báo thù, xuyên không, gia đình, hài hước tại APhim Phim Ngắn.';
        const metaKeywords = 'tim kiem phim ngan, tim phim ngan vietsub, phim ngan tong tai, phim ngan bao thu, xem phim ngan hay';
        const canonicalUrl = `${SITE_CANONICAL}/phim-ngan/tim-kiem`;
        return {
            title,
            pageTitle: 'Tìm Kiếm - Phim Ngắn APhim',
            metaDescription,
            metaKeywords,
            canonicalUrl,
            ogImage: DEFAULT_OG_IMAGE,
            ogType: 'website'
        };
    }

    if (type === 'library') {
        const sub = params.sub || '';
        let title = 'Thư Viện Phim Ngắn Của Bạn - Lịch Sử & Yêu Thích | APhim';
        let metaDescription = 'Thư viện phim ngắn cá nhân trên APhim: quản lý lịch sử xem gần đây, danh sách phim ngắn yêu thích và danh sách phát đã lưu tiện lợi.';
        if (sub === 'fav') {
            title = 'Phim Ngắn Yêu Thích Của Bạn | APhim';
            metaDescription = 'Danh sách các bộ phim ngắn bạn yêu thích nhất trên APhim. Xem lại dễ dàng mọi lúc mọi nơi.';
        } else if (sub === 'playlist') {
            title = 'Danh Sách Phát Phim Ngắn Của Bạn | APhim';
            metaDescription = 'Các danh sách phát phim ngắn bạn đã tạo và tuyển chọn trên APhim.';
        } else if (sub === 'recent') {
            title = 'Lịch Sử Xem Phim Ngắn Gần Đây | APhim';
            metaDescription = 'Lịch sử các tập phim ngắn bạn đã xem gần đây trên APhim, tiếp tục xem dễ dàng chỉ với một chạm.';
        }
        return {
            title,
            pageTitle: title,
            metaDescription,
            metaKeywords: 'thu vien phim ngan, phim ngan yeu thich, lich su xem phim ngan, danh sach phat phim ngan',
            canonicalUrl: `${SITE_CANONICAL}/phim-ngan/thu-vien${sub ? '/' + sub : ''}`,
            ogImage: DEFAULT_OG_IMAGE,
            ogType: 'website'
        };
    }

    return {};
}

// 1. Phim Ngắn Hub (Main View)
router.get('/', async (req, res) => {
    try {
        const homeData = await phimNganService.getHomeDramas();
        const seo = buildPhimNganSEO('home');
        res.render('phim-ngan', Object.assign({
            heroDramas: homeData.hero || [],
            trendingDramas: homeData.trending || [],
            top10Dramas: homeData.top10 || [],
            shelves: homeData.shelves || [],
            popularDramas: homeData.popular || [],
            latestDramas: homeData.latest || [],
            initialDrama: null,
            initialEpisode: 1,
            activePage: 'phim-ngan'
        }, seo));
    } catch (err) {
        console.error('[PhimNgan Route] Error rendering home:', err);
        const seo = buildPhimNganSEO('home');
        res.render('phim-ngan', Object.assign({
            heroDramas: [],
            trendingDramas: [],
            top10Dramas: [],
            shelves: [],
            popularDramas: [],
            latestDramas: [],
            initialDrama: null,
            initialEpisode: 1,
            activePage: 'phim-ngan'
        }, seo));
    }
});

// Helper: lấy data chung cho các trang Phim Ngắn
async function buildPhimNganHomeData() {
    const homeData = await phimNganService.getHomeDramas();
    return {
        heroDramas: homeData.hero || [],
        trendingDramas: homeData.trending || [],
        top10Dramas: homeData.top10 || [],
        shelves: homeData.shelves || [],
        popularDramas: homeData.popular || [],
        latestDramas: homeData.latest || [],
        initialDrama: null,
        initialEpisode: 1,
        activePage: 'phim-ngan'
    };
}

// 1b. Trang ĐỀ XUẤT (trang riêng — layout player 3 cột)
router.get('/de-xuat', async (req, res) => {
    try {
        const homeData = await buildPhimNganHomeData();
        const allPool = [...(homeData.heroDramas || []), ...(homeData.trendingDramas || []), ...(homeData.popularDramas || []), ...(homeData.latestDramas || [])];
        const targetRec = allPool.find(d => d && (String(d.id) === '68154' || String(d.id) === '68211')) || allPool[0] || null;
        if (targetRec) {
            homeData.primaryHero = targetRec;
            homeData.recDrama = targetRec;
            homeData.initialDrama = null;
        }
        const seo = buildPhimNganSEO('recommend');
        res.render('phim-ngan', Object.assign(homeData, seo, {
            pnView: 'recommend',
            primaryHero: targetRec,
            recDrama: targetRec
        }));
    } catch (err) {
        console.error('[PhimNgan Route] Error rendering de-xuat:', err);
        const seo = buildPhimNganSEO('recommend');
        res.status(500).render('phim-ngan', Object.assign(await buildPhimNganHomeData().catch(() => ({
            heroDramas: [], trendingDramas: [], top10Dramas: [], shelves: [], popularDramas: [], latestDramas: []
        })), seo, { pnView: 'recommend' }));
    }
});

// 1c. Trang TÌM KIẾM (trang riêng)
router.get('/tim-kiem', async (req, res) => {
    try {
        const seo = buildPhimNganSEO('search');
        res.render('phim-ngan', Object.assign(await buildPhimNganHomeData(), seo, {
            pnView: 'search'
        }));
    } catch (err) {
        console.error('[PhimNgan Route] Error rendering tim-kiem:', err);
        const seo = buildPhimNganSEO('search');
        res.status(500).render('phim-ngan', Object.assign(await buildPhimNganHomeData().catch(() => ({
            heroDramas: [], trendingDramas: [], top10Dramas: [], shelves: [], popularDramas: [], latestDramas: []
        })), seo, { pnView: 'search' }));
    }
});

// 1d. Trang THƯ VIỆN & các mục con riêng biệt (/da-xem, /yeu-thich, /danh-sach-phat)
router.get(['/thu-vien', '/thu-vien/da-xem', '/thu-vien/yeu-thich', '/thu-vien/danh-sach-phat'], optionalAuth, async (req, res) => {
    try {
        const homeData = await buildPhimNganHomeData();
        let initialTab = 'recent';
        if (req.path.endsWith('/yeu-thich')) initialTab = 'fav';
        else if (req.path.endsWith('/danh-sach-phat')) initialTab = 'playlist';
        else if (req.path.endsWith('/da-xem')) initialTab = 'recent';

        let dbLibrary = null;
        if (req.user) {
            try {
                const doc = await WatchHistory.findOne({ user_id: req.user.id }).lean();
                if (doc) {
                    dbLibrary = {
                        history: doc.short_drama_history || [],
                        favorites: doc.short_drama_favorites || [],
                        playlists: doc.short_drama_playlists || []
                    };
                }
            } catch (dbErr) {
                console.error('[PhimNgan Route] Error reading MongoDB for thu-vien:', dbErr);
            }
        }
        const seo = buildPhimNganSEO('library', { sub: initialTab });
        res.render('phim-ngan', Object.assign(homeData, seo, {
            pnView: 'library',
            initialLibraryTab: initialTab,
            user: req.user || null,
            initialDbLibrary: dbLibrary
        }));
    } catch (err) {
        console.error('[PhimNgan Route] Error rendering thu-vien:', err);
        const seo = buildPhimNganSEO('library');
        res.status(500).render('phim-ngan', Object.assign(await buildPhimNganHomeData().catch(() => ({
            heroDramas: [], trendingDramas: [], top10Dramas: [], shelves: [], popularDramas: [], latestDramas: []
        })), seo, { pnView: 'library', initialLibraryTab: 'recent', user: null, initialDbLibrary: null }));
    }
});

// Route fallback nếu user vào thẳng /phim-ngan/thong-tin (không kèm ID)
router.get('/thong-tin', async (req, res) => {
    try {
        const homeData = await phimNganService.getHomeDramas();
        const firstDrama = (homeData.hero && homeData.hero[0]) || (homeData.trending && homeData.trending[0]);
        if (firstDrama && firstDrama.id) {
            return res.redirect(`/phim-ngan/thong-tin/${firstDrama.id}`);
        }
        res.redirect('/phim-ngan');
    } catch (e) {
        res.redirect('/phim-ngan');
    }
});

// 2. Direct Watch Link & Detail View: /phim-ngan/xem/:dramaId & /phim-ngan/phim/:dramaId & /phim-ngan/thong-tin/:dramaId
router.get(['/xem/:dramaId', '/phim/:dramaId', '/thong-tin/:dramaId'], async (req, res) => {
    try {
        const dramaId = String(req.params.dramaId || '').trim();
        const episodeNo = parseInt(req.query.ep, 10) || 1;
        const isDetailView = req.path.includes('/thong-tin/');

        // If legacy ID, redirect cleanly to mapped real drama ID so URLs are always consistent
        const seeds = phimNganService.loadLocalSeeds();
        const allSeeds = [...(seeds.rank || []), ...(seeds.catalog || [])];
        const isKnownSeed = allSeeds.some(x => String(x.id) === dramaId || String(x.slug) === dramaId);

        if (!isKnownSeed) {
            const realId = (seeds.legacyMap && seeds.legacyMap[dramaId]) || (/^\d{15,22}$/.test(dramaId) ? '64361' : null);
            if (realId && realId !== dramaId) {
                const targetPath = isDetailView ? `/phim-ngan/thong-tin/${realId}` : `/phim-ngan/xem/${realId}?ep=${episodeNo}`;
                return res.redirect(302, targetPath);
            }
        }

        const [homeData, dramaDetail] = await Promise.all([
            phimNganService.getHomeDramas(),
            phimNganService.getDramaDetail(dramaId)
        ]);

        const seo = isDetailView
            ? buildPhimNganSEO('detail', { drama: dramaDetail })
            : buildPhimNganSEO('watch', { drama: dramaDetail, epNo: episodeNo });

        res.render('phim-ngan', Object.assign({
            heroDramas: homeData.hero || [],
            trendingDramas: homeData.trending || [],
            top10Dramas: homeData.top10 || [],
            shelves: homeData.shelves || [],
            popularDramas: homeData.popular || [],
            latestDramas: homeData.latest || [],
            initialDrama: dramaDetail,
            initialEpisode: episodeNo,
            viewMode: isDetailView ? 'detail' : 'player',
            /* pnView quyết định view nào được render sẵn (ẩn main hub ngay từ
               server) để KHÔNG nháy màn hình trang chủ khi vào /xem/ hoặc /thong-tin/ */
            pnView: isDetailView ? 'detail' : 'player',
            activePage: 'phim-ngan'
        }, seo));
    } catch (err) {
        console.error('[PhimNgan Route] Error watch/detail drama:', err);
        res.redirect('/phim-ngan');
    }
});

// 3. API: Get Drama Detail + Episodes
router.get(['/detail/:id', '/api/detail/:id'], async (req, res) => {
    try {
        const drama = await phimNganService.getDramaDetail(req.params.id);
        if (!drama) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phim ngắn' });
        }
        res.json({ success: true, data: drama });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. API: Get Category List (Paginated)
router.get(['/list', '/api/list'], async (req, res) => {
    try {
        const category = req.query.category || 'rank-hot-drama';
        const page = parseInt(req.query.page, 10) || 1;
        const result = await phimNganService.getCategoryDramas(category, page);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. API: Search Dramas
router.get(['/search', '/api/search'], async (req, res) => {
    try {
        const query = req.query.q || '';
        const items = await phimNganService.searchDramas(query);
        res.json({ success: true, items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5b. API: Get Stream URL (Proxy to avoid CORS)
router.get('/api/get-stream', async (req, res) => {
    try {
        const { dramaId, ep } = req.query;
        if (!dramaId) return res.status(400).json({ success: false, message: 'Missing dramaId' });

        const epNo = parseInt(ep, 10) || 1;
        // getEpisodeStream nhận (dramaId, videoId), construct videoId dạng dramaId_epNo
        const episodeId = `${dramaId}_${epNo}`;
        const streamUrl = await phimNganService.getEpisodeStream(dramaId, episodeId);

        if (streamUrl) {
            return res.json({ success: true, streamUrl });
        }

        res.status(404).json({ success: false, message: 'Stream not found' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. Direct Video Stream Proxy (with Range Support & Zero CORS Issues)
function streamLocalVideoFile(filePath, req, res) {
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Video source not available');
    }
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
}

router.get('/stream', async (req, res) => {
    const { sid, vid, fallback } = req.query;
    const fallbackPath = path.join(__dirname, '..', 'public', 'videos', 'fallback.mp4');

    if (fallback === '1' && fs.existsSync(fallbackPath)) {
        return streamLocalVideoFile(fallbackPath, req, res);
    }

    if (!sid) {
        if (fs.existsSync(fallbackPath)) return streamLocalVideoFile(fallbackPath, req, res);
        return res.status(404).send('Missing sid');
    }

    try {
        const rescue = req.query.rescue === '1';
        if (!rescue) {
            const streamUrl = await phimNganService.getEpisodeStream(sid, vid);
            if (streamUrl && !streamUrl.includes('allshorts.net/hgdec') && !streamUrl.includes('cdn.vietshort.com')) {
                return res.redirect(302, streamUrl);
            }
        }

        // Tự động giải cứu hoặc thay thế link hỏng bằng luồng HLS đa tập chuẩn sạch
        const epNum = parseInt(String(vid).replace(/[^0-9]/g, ''), 10) || 1;
        const poolStream = await phimNganService.getStreamForDramaAndEpisode(sid, epNum - 1);
        if (poolStream) {
            return res.redirect(302, poolStream);
        }
    } catch (e) {
        console.warn(`[PhimNgan Stream] Lookup error:`, e.message);
    }

    // Try upstream if available
    const targetUrl = phimNganService.buildStreamUrl(sid, vid);
    try {
        const rangeHeader = req.headers.range;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://allshorts.net/'
        };
        if (rangeHeader) {
            headers['Range'] = rangeHeader;
        }

        const streamRes = await streamingAxios.get(targetUrl, {
            headers,
            responseType: 'stream',
            timeout: 10000,
            validateStatus: status => status >= 200 && status < 400
        });

        res.status(streamRes.status);
        if (streamRes.headers['content-type']) res.setHeader('Content-Type', streamRes.headers['content-type']);
        if (streamRes.headers['content-length']) res.setHeader('Content-Length', streamRes.headers['content-length']);
        if (streamRes.headers['content-range']) res.setHeader('Content-Range', streamRes.headers['content-range']);
        if (streamRes.headers['accept-ranges']) res.setHeader('Accept-Ranges', streamRes.headers['accept-ranges']);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        streamRes.data.pipe(res);
    } catch (err) {
        console.warn(`[PhimNgan Stream] Upstream unavailable for sid=${sid}, vid=${vid}. Serving smooth local fallback stream.`);
        return streamLocalVideoFile(fallbackPath, req, res);
    }
});

// Hàm trích xuất link stream trực tiếp từ JWT token narto (tránh hết hạn token và 403/502)
function extractDirectMediaUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('narto-drama.com/e/')) {
        try {
            const tokenMatch = url.match(/\/e\/[ms]\/([A-Za-z0-9_-]+)/);
            if (tokenMatch && tokenMatch[1]) {
                const b64 = tokenMatch[1].replace(/-/g, '+').replace(/_/g, '/');
                const rawPayload = Buffer.from(b64, 'base64').toString('utf8');
                const data = JSON.parse(rawPayload);
                if (data && data.src && data.src.startsWith('http')) {
                    return data.src;
                }
            }
        } catch (e) { }
    }
    return url;
}

// 6b. Ultra-fast HLS Reverse Proxy (Fixes CORS on cdn.vietshort.com and other CDNs)
router.get('/proxy-hls', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
        return res.status(400).send('Invalid or missing target URL');
    }

    try {
        let targetUrl = rawUrl;
        try {
            targetUrl = decodeURIComponent(rawUrl);
        } catch (e) {
            targetUrl = rawUrl;
        }

        // ⚡ Narto Direct CDN Extractor: Nếu link qua narto-drama.com/e/, tự động bóc tách link gốc từ JWT
        // để tránh lỗi token hết hạn (403/502) và bỏ qua trạm trung gian, tăng tốc độ phát lên tối đa!
        targetUrl = extractDirectMediaUrl(targetUrl);

        const parsedTarget = new URL(targetUrl);
        const isM3u8 = targetUrl.includes('.m3u8') || targetUrl.endsWith('.m3u8') || targetUrl.includes('/e/m/');

        const requestHeaders = {
            'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': `${parsedTarget.protocol}//${parsedTarget.host}/`,
            'Origin': `${parsedTarget.protocol}//${parsedTarget.host}`
        };

        if (req.headers.range) {
            requestHeaders['Range'] = req.headers.range;
        }

        if (isM3u8) {
            // Fetch playlist as text and rewrite relative links so all sub-playlists and segments go through proxy
            const upstream = await streamingAxios.get(targetUrl, {
                headers: requestHeaders,
                responseType: 'text',
                timeout: 10000,
                validateStatus: status => status >= 200 && status < 400
            });

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Cache-Control', 'public, max-age=3600');

            const content = upstream.data;
            const lines = content.split(/\r?\n/);
            const rewritten = lines.map(line => {
                const trimmed = line.trim();
                if (!trimmed) return line;

                // Handle ANY tag containing URI="..." (EXT-X-KEY, EXT-X-MEDIA, EXT-X-MAP, etc.)
                if (trimmed.startsWith('#') && trimmed.includes('URI=')) {
                    return trimmed.replace(/URI=["']([^"']+)["']/gi, (match, tagUri) => {
                        try {
                            const resolvedUri = new URL(tagUri, targetUrl).href;
                            return `URI="/phim-ngan/proxy-hls?url=${encodeURIComponent(resolvedUri)}"`;
                        } catch (e) {
                            return match;
                        }
                    });
                }

                // Any comment or tag line
                if (trimmed.startsWith('#')) return line;

                // Media segment or sub-playlist URL
                try {
                    const resolved = new URL(trimmed, targetUrl).href;
                    return `/phim-ngan/proxy-hls?url=${encodeURIComponent(resolved)}`;
                } catch (e) {
                    return line;
                }
            }).join('\n');

            return res.send(rewritten);
        } else {
            // Binary media segment (.ts, .mp4, .m4s, etc.)
            const upstream = await streamingAxios.get(targetUrl, {
                headers: requestHeaders,
                responseType: 'stream',
                timeout: 15000,
                validateStatus: status => status >= 200 && status < 400
            });

            res.status(upstream.status);
            if (upstream.headers['content-type']) res.setHeader('Content-Type', upstream.headers['content-type']);
            if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
            if (upstream.headers['content-range']) res.setHeader('Content-Range', upstream.headers['content-range']);
            if (upstream.headers['accept-ranges']) res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

            upstream.data.pipe(res);
        }
    } catch (err) {
        console.warn(`[Proxy-HLS] Error streaming ${rawUrl}:`, err.message);
        // Fallback cứu hộ: nếu targetUrl chưa trích xuất hoặc bị lỗi 403, thử bóc tách direct link
        try {
            const fallbackDirect = extractDirectMediaUrl(rawUrl);
            if (fallbackDirect && fallbackDirect !== rawUrl) {
                return res.redirect(302, `/phim-ngan/proxy-hls?url=${encodeURIComponent(fallbackDirect)}`);
            }
        } catch (e) {}

        if (!res.headersSent) {
            res.status(502).send('Error streaming media: ' + err.message);
        }
    }
});

// 6c. Smart Poster Proxy (Khử sạch lỗi 404 poster khi gặp relative path /assets/poster/ hoặc thiếu ảnh)
router.get(['/assets/poster/:file', '/poster/:file'], async (req, res) => {
    const file = req.params.file;
    if (!file) return res.sendFile(path.join(__dirname, '..', 'public', 'images', 'avatar-default.png'));
    const cdnUrl = `https://img.nartodrama-api.online/poster/${file}`;
    try {
        const upstream = await axios.get(cdnUrl, {
            responseType: 'stream',
            timeout: 5000,
            validateStatus: s => s >= 200 && s < 300
        });
        res.setHeader('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800');
        upstream.data.pipe(res);
    } catch (e) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(path.join(__dirname, '..', 'public', 'images', 'avatar-default.png'));
    }
});

// 7. Subtitle Endpoint (Returns WEBVTT)
router.get(['/subtitle', '/subtitles'], async (req, res) => {
    const { dramaId, ep, lang } = req.query;
    if (!dramaId) return res.status(400).send('Missing dramaId');
    try {
        const vtt = await phimNganService.getEpisodeSubtitle(dramaId, ep || 1, lang || 'vi_VN');
        if (!vtt) return res.status(404).send('No subtitles available');
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(vtt);
    } catch (err) {
        res.status(500).send('Error fetching subtitle');
    }
});

// 8. Subtitle JSON API (Returns VTT content or detailed reason)
router.get(['/api/subtitle', '/api/subtitles'], async (req, res) => {
    const { dramaId, ep, lang } = req.query;
    if (!dramaId) return res.status(400).json({ success: false, message: 'Missing dramaId' });
    try {
        const result = await phimNganService.getEpisodeSubtitleResult(dramaId, ep || 1, lang || 'vi_VN');
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 9. Batch Translate Trigger API (Background Pre-cache)
router.get(['/api/batch-translate', '/batch-translate'], async (req, res) => {
    const { dramaId, start, end, delay } = req.query;
    if (!dramaId) return res.status(400).json({ success: false, message: 'Missing dramaId' });
    const startEp = parseInt(start, 10) || 38;
    const endEp = parseInt(end, 10) || 222;
    const delayMs = parseInt(delay, 10) || 4000;
    const result = await phimNganService.batchTranslateDrama(dramaId, startEp, endEp, delayMs);
    res.json(result);
});

// 10. Focus Drama Pipeline (Concentrate resources on user's active drama)
router.all(['/api/focus', '/focus'], async (req, res) => {
    const dramaId = req.body?.dramaId || req.query.dramaId;
    const ep = req.body?.ep || req.query.ep;
    if (!dramaId) return res.status(400).json({ success: false, message: 'Missing dramaId' });
    phimNganService.focusDrama(dramaId, parseInt(ep, 10) || 1);
    res.json({ success: true, message: `Đã dồn lực tải đón đầu cho phim ${dramaId}` });
});

// 11. Get Ready Subtitles List for Drama
router.get(['/api/ready-subs', '/ready-subs'], async (req, res) => {
    const { dramaId } = req.query;
    if (!dramaId) return res.status(400).json({ success: false, message: 'Missing dramaId' });
    const ready = await phimNganService.getReadySubtitles(dramaId);
    res.json({ success: true, readyEpisodes: ready, totalReady: ready.length });
});

// 12. Auto Crawler Endpoints & Scheduler
const phimNganAutoCrawler = require('../lib/phimNganAutoCrawler');
phimNganAutoCrawler.setService(phimNganService);
phimNganAutoCrawler.startSchedule(1.5);

router.get(['/api/crawler/status', '/crawler/status'], (req, res) => {
    res.json(phimNganAutoCrawler.getStatus());
});

router.all(['/api/crawler/start', '/crawler/start'], async (req, res) => {
    const max = parseInt(req.body?.max || req.query?.max, 10) || 100;
    const result = await phimNganAutoCrawler.startAutoCrawl({ maxDramas: max });
    res.json(result);
});

// 13. Phim Ngắn Library & History API (MongoDB for logged-in users, fallback localStorage for guests)
const MAX_SHORT_DRAMA_HISTORY = 200;

// GET /phim-ngan/api/library - lấy dữ liệu 3 mục (Đã xem gần đây, Yêu thích, Danh sách phát) từ MongoDB nếu đã đăng nhập
router.get('/api/library', optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.json({
                success: true,
                loggedIn: false,
                history: [],
                favorites: [],
                playlists: []
            });
        }

        const doc = await WatchHistory.findOne({ user_id: req.user.id });
        return res.json({
            success: true,
            loggedIn: true,
            user_id: req.user.id,
            history: doc?.short_drama_history || [],
            favorites: doc?.short_drama_favorites || [],
            playlists: doc?.short_drama_playlists || []
        });
    } catch (err) {
        console.error('[PhimNgan Route] Error fetching library from MongoDB:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi tải thư viện từ MongoDB.' });
    }
});

// POST /phim-ngan/api/history - lưu lịch sử xem phim ngắn vào MongoDB nếu đã đăng nhập
router.post('/api/history', optionalAuth, async (req, res) => {
    try {
        const { id, title, cover, epNo, totalEpisodes, currentTime, duration } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Thiếu drama ID' });

        if (!req.user) {
            return res.json({
                success: true,
                loggedIn: false,
                message: 'Chưa đăng nhập — lưu lịch sử trên thiết bị (localStorage).'
            });
        }

        const userId = req.user.id;
        let doc = await WatchHistory.findOne({ user_id: userId });
        if (!doc) doc = await WatchHistory.create({ user_id: userId });

        if (!Array.isArray(doc.short_drama_history)) {
            doc.short_drama_history = [];
        }

        // Lọc bỏ entry cũ nếu đã có phim này
        doc.short_drama_history = doc.short_drama_history.filter(h => h && String(h.id) !== String(id));

        // Thêm vào đầu danh sách với mốc thời gian đang xem
        doc.short_drama_history.unshift({
            id: String(id),
            title: title || '',
            cover: cover || '',
            epNo: parseInt(epNo, 10) || 1,
            totalEpisodes: parseInt(totalEpisodes, 10) || 1,
            currentTime: Math.floor(currentTime || 0),
            duration: Math.floor(duration || 0),
            watched_at: new Date(),
            timestamp: Date.now()
        });

        // Giới hạn max 200 phim
        if (doc.short_drama_history.length > MAX_SHORT_DRAMA_HISTORY) {
            doc.short_drama_history = doc.short_drama_history.slice(0, MAX_SHORT_DRAMA_HISTORY);
        }

        await doc.save();
        return res.json({
            success: true,
            loggedIn: true,
            message: 'Đã lưu lịch sử xem phim ngắn vào MongoDB thành công.'
        });
    } catch (err) {
        console.error('[PhimNgan Route] Error saving watch history to MongoDB:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lưu lịch sử vào MongoDB.' });
    }
});

// POST /phim-ngan/api/sync-library - Đồng bộ dữ liệu từ localStorage sang MongoDB khi đăng nhập
router.post('/api/sync-library', optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        }

        const { history = [], favorites = [], playlists = [] } = req.body;
        const userId = req.user.id;
        let doc = await WatchHistory.findOne({ user_id: userId });
        if (!doc) doc = await WatchHistory.create({ user_id: userId });

        if (!Array.isArray(doc.short_drama_history)) doc.short_drama_history = [];
        if (!Array.isArray(doc.short_drama_favorites)) doc.short_drama_favorites = [];
        if (!Array.isArray(doc.short_drama_playlists)) doc.short_drama_playlists = [];

        // Đồng bộ lịch sử
        if (Array.isArray(history) && history.length > 0) {
            history.forEach(item => {
                if (!item || !item.id) return;
                const existingIdx = doc.short_drama_history.findIndex(h => h && String(h.id) === String(item.id));
                const entry = {
                    id: String(item.id),
                    title: item.title || '',
                    cover: item.cover || '',
                    epNo: parseInt(item.epNo, 10) || 1,
                    totalEpisodes: parseInt(item.totalEpisodes, 10) || 1,
                    currentTime: Math.floor(item.currentTime || 0),
                    duration: Math.floor(item.duration || 0),
                    watched_at: item.watched_at ? new Date(item.watched_at) : new Date(),
                    timestamp: item.timestamp || Date.now()
                };
                if (existingIdx !== -1) {
                    if ((entry.timestamp || 0) >= (doc.short_drama_history[existingIdx].timestamp || 0)) {
                        doc.short_drama_history[existingIdx] = entry;
                    }
                } else {
                    doc.short_drama_history.push(entry);
                }
            });
            doc.short_drama_history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            if (doc.short_drama_history.length > MAX_SHORT_DRAMA_HISTORY) {
                doc.short_drama_history = doc.short_drama_history.slice(0, MAX_SHORT_DRAMA_HISTORY);
            }
        }

        // Đồng bộ yêu thích
        if (Array.isArray(favorites) && favorites.length > 0) {
            favorites.forEach(item => {
                if (!item || !item.id) return;
                if (!doc.short_drama_favorites.some(f => f && String(f.id) === String(item.id))) {
                    doc.short_drama_favorites.push({
                        id: String(item.id),
                        title: item.title || '',
                        cover: item.cover || '',
                        epNo: parseInt(item.epNo, 10) || 1,
                        totalEpisodes: parseInt(item.totalEpisodes, 10) || 1,
                        watched_at: new Date()
                    });
                }
            });
        }

        // Đồng bộ danh sách phát
        if (Array.isArray(playlists) && playlists.length > 0) {
            playlists.forEach(pl => {
                if (!pl || !pl.id) return;
                if (!doc.short_drama_playlists.some(p => p && String(p.id) === String(pl.id))) {
                    doc.short_drama_playlists.push(pl);
                }
            });
        }

        await doc.save();
        return res.json({
            success: true,
            loggedIn: true,
            history: doc.short_drama_history,
            favorites: doc.short_drama_favorites,
            playlists: doc.short_drama_playlists
        });
    } catch (err) {
        console.error('[PhimNgan Route] Error syncing library to MongoDB:', err);
        return res.status(500).json({ success: false, message: 'Lỗi đồng bộ vào MongoDB.' });
    }
});

// POST /phim-ngan/api/favorite-toggle - Thích / bỏ thích phim ngắn (lưu vào MongoDB nếu đã login)
router.post('/api/favorite-toggle', optionalAuth, async (req, res) => {
    try {
        const { id, title, cover, epNo, totalEpisodes } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Thiếu drama ID' });

        if (!req.user) {
            return res.json({ success: true, loggedIn: false, message: 'Khách — lưu ở localStorage' });
        }

        const userId = req.user.id;
        let doc = await WatchHistory.findOne({ user_id: userId });
        if (!doc) doc = await WatchHistory.create({ user_id: userId });

        if (!Array.isArray(doc.short_drama_favorites)) doc.short_drama_favorites = [];

        const idx = doc.short_drama_favorites.findIndex(f => f && String(f.id) === String(id));
        let added = false;
        if (idx === -1) {
            doc.short_drama_favorites.unshift({
                id: String(id),
                title: title || '',
                cover: cover || '',
                epNo: parseInt(epNo, 10) || 1,
                totalEpisodes: parseInt(totalEpisodes, 10) || 1,
                watched_at: new Date()
            });
            added = true;
        } else {
            doc.short_drama_favorites.splice(idx, 1);
        }

        await doc.save();
        return res.json({
            success: true,
            loggedIn: true,
            added,
            favorites: doc.short_drama_favorites
        });
    } catch (err) {
        console.error('[PhimNgan Route] Error toggling favorite:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// POST /phim-ngan/api/playlist-toggle - Thêm / xóa phim vào danh sách phát (lưu vào MongoDB nếu đã login)
router.post('/api/playlist-toggle', optionalAuth, async (req, res) => {
    try {
        const { id, title, cover, epNo, totalEpisodes } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Thiếu drama ID' });

        if (!req.user) {
            return res.json({ success: true, loggedIn: false, message: 'Khách — lưu ở localStorage' });
        }

        const userId = req.user.id;
        let doc = await WatchHistory.findOne({ user_id: userId });
        if (!doc) doc = await WatchHistory.create({ user_id: userId });

        if (!Array.isArray(doc.short_drama_playlists)) doc.short_drama_playlists = [];

        const idx = doc.short_drama_playlists.findIndex(f => f && String(f.id) === String(id));
        let added = false;
        if (idx === -1) {
            doc.short_drama_playlists.unshift({
                id: String(id),
                title: title || '',
                cover: cover || '',
                epNo: parseInt(epNo, 10) || 1,
                totalEpisodes: parseInt(totalEpisodes, 10) || 1,
                watched_at: new Date()
            });
            added = true;
        } else {
            doc.short_drama_playlists.splice(idx, 1);
        }

        await doc.save();
        return res.json({
            success: true,
            loggedIn: true,
            added,
            playlists: doc.short_drama_playlists
        });
    } catch (err) {
        console.error('[PhimNgan Route] Error toggling playlist:', err);
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// DELETE /phim-ngan/api/history/:dramaId - Xóa 1 phim khỏi lịch sử
router.delete('/api/history/:dramaId', optionalAuth, async (req, res) => {
    try {
        const { dramaId } = req.params;
        if (!req.user) return res.json({ success: true, loggedIn: false });

        const doc = await WatchHistory.findOne({ user_id: req.user.id });
        if (doc && Array.isArray(doc.short_drama_history)) {
            doc.short_drama_history = doc.short_drama_history.filter(h => h && String(h.id) !== String(dramaId));
            await doc.save();
        }
        return res.json({ success: true, loggedIn: true, message: 'Đã xóa phim khỏi lịch sử.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// DELETE /phim-ngan/api/history - Xóa sạch lịch sử xem phim ngắn
router.delete('/api/history', optionalAuth, async (req, res) => {
    try {
        if (!req.user) return res.json({ success: true, loggedIn: false });
        await WatchHistory.findOneAndUpdate({ user_id: req.user.id }, { short_drama_history: [] });
        return res.json({ success: true, loggedIn: true, message: 'Đã xóa toàn bộ lịch sử xem phim ngắn.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

module.exports = router;
