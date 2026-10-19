/**
 * routes/seo.routes.js
 * Hệ thống SEO Tối Thượng — Kiến trúc Sitemap Đa Tầng & Robots.txt theo chuẩn Top 1 Google
 * Tham khảo cấu trúc SEO từ các nền tảng streaming hàng đầu (Motchill, Phimmoi, Bilutv)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://aphim.store';
const SITEMAP_CACHE_TTL = 45 * 60 * 1000; // 45 phút cache để tránh overload API

// Bộ nhớ đệm Sitemaps
let sitemapCache = {
    index: null,
    main: null,
    movies: null,
    categories: null,
    images: null,
    reels: null,
    phimNgan: null,
    lastFetched: 0,
    lastFetchedPhimNgan: 0
};

// Danh sách phim bị chặn (DMCA/Vi phạm) để loại trừ khỏi sitemap
const BLOCKED_SLUGS = ['trai-cam', 'moi-thu-la-loi-co-ay', 'michael', 'dac-vu-xuyen-quoc-gia', 'xac-song-thanh-pho-chet-phan-2'];

const CATEGORIES = [
    'am-nhac', 'bi-an', 'chien-tranh', 'chinh-kich', 'tv-shows', 'co-trang',
    'gay-can', 'gia-dinh', 'gia-tuong', 'hai-huoc', 'hanh-dong', 'hinh-su',
    'hoat-hinh', 'hoc-duong', 'khoa-hoc', 'vien-tuong', 'kinh-di', 'kinh-dien',
    'lang-man', 'lich-su', 'mien-tay', 'phieu-luu', 'phim-hai', 'phim-ngan',
    'phim-nhac', 'short-drama', 'tai-lieu', 'tam-ly', 'than-thoai', 'the-thao',
    'tinh-cam', 'tre-em', 'vo-thuat'
];

const COUNTRIES = [
    'viet-nam', 'trung-quoc', 'han-quoc', 'nhat-ban', 'thai-lan',
    'au-my', 'dai-loan', 'hong-kong', 'an-do', 'anh', 'phap', 'canada'
];

// Hàm escape ký tự đặc biệt cho XML chuẩn W3C
function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Cào danh sách phim mới nhất để xây dựng sitemap động
 */
async function fetchMoviesForSitemap() {
    const movies = [];
    const movieSlugsSeen = new Set();
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Cào 35 trang danh sách phim mới (~840 phim x 2 = ~1,680 URLs chất lượng cao nhất)
    const pageNumbers = Array.from({ length: 35 }, (_, i) => i + 1);

    await Promise.allSettled(
        pageNumbers.map(async (page) => {
            try {
                const res = await axios.get(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`, {
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) APhim-SEO-Crawler/3.0' }
                });
                const items = res.data?.items || [];
                items.forEach((m) => {
                    if (m && m.slug && !movieSlugsSeen.has(m.slug) && !BLOCKED_SLUGS.includes(m.slug.toLowerCase())) {
                        movieSlugsSeen.add(m.slug);
                        
                        let thumb = m.thumb_url || '';
                        if (thumb && !thumb.startsWith('http')) thumb = `https://img.phimapi.com/${thumb}`;
                        
                        let poster = m.poster_url || '';
                        if (poster && !poster.startsWith('http')) poster = `https://img.phimapi.com/${poster}`;

                        movies.push({
                            slug: m.slug,
                            name: m.name || m.origin_name || m.slug,
                            origin_name: m.origin_name || '',
                            year: m.year || new Date().getFullYear(),
                            thumb_url: thumb,
                            poster_url: poster,
                            modified: m.modified?.time ? new Date(m.modified.time).toISOString().split('T')[0] : todayStr
                        });
                    }
                });
            } catch (err) {
                // Tiếp tục xử lý các page khác
            }
        })
    );

    return movies;
}

/**
 * Tạo tất cả sitemaps và lưu vào cache
 */
async function generateAllSitemaps() {
    if (sitemapCache.index && (Date.now() - sitemapCache.lastFetched < SITEMAP_CACHE_TTL)) {
        return sitemapCache;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const movies = await fetchMoviesForSitemap();

    // 1. MASTER SITEMAP INDEX (/sitemap.xml)
    let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    indexXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    const sitemapsList = [
        `${BASE_URL}/sitemap-main.xml`,
        `${BASE_URL}/sitemap-categories.xml`,
        `${BASE_URL}/sitemap-movies.xml`,
        `${BASE_URL}/sitemap-images.xml`,
        `${BASE_URL}/sitemap-reels.xml`,
        `${BASE_URL}/sitemap-phim-ngan.xml`
    ];

    sitemapsList.forEach(sm => {
        indexXml += `  <sitemap>\n`;
        indexXml += `    <loc>${sm}</loc>\n`;
        indexXml += `    <lastmod>${todayStr}</lastmod>\n`;
        indexXml += `  </sitemap>\n`;
    });
    indexXml += `</sitemapindex>`;

    // 2. MAIN STATIC SITEMAP (/sitemap-main.xml)
    const staticRoutes = [
        { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'always' },
        { loc: `${BASE_URL}/phim-ngan`, priority: '0.95', changefreq: 'always' },
        { loc: `${BASE_URL}/phim-ngan/de-xuat`, priority: '0.90', changefreq: 'daily' },
        { loc: `${BASE_URL}/reels`, priority: '0.90', changefreq: 'always' },
        { loc: `${BASE_URL}/danh-sach`, priority: '0.9', changefreq: 'daily' },
        { loc: `${BASE_URL}/tat-ca`, priority: '0.9', changefreq: 'daily' },
        { loc: `${BASE_URL}/categories`, priority: '0.9', changefreq: 'daily' },
        { loc: `${BASE_URL}/phim-theo-quoc-gia`, priority: '0.9', changefreq: 'daily' },
        { loc: `${BASE_URL}/search`, priority: '0.7', changefreq: 'daily' },
        { loc: `${BASE_URL}/hoi-dap`, priority: '0.5', changefreq: 'weekly' },
        { loc: `${BASE_URL}/gioi-thieu`, priority: '0.4', changefreq: 'monthly' },
        { loc: `${BASE_URL}/lien-he`, priority: '0.4', changefreq: 'monthly' },
        { loc: `${BASE_URL}/chinh-sach-bao-mat`, priority: '0.3', changefreq: 'monthly' },
        { loc: `${BASE_URL}/dieu-khoan-su-dung`, priority: '0.3', changefreq: 'monthly' }
    ];

    let mainXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    mainXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    staticRoutes.forEach(r => {
        mainXml += `  <url>\n`;
        mainXml += `    <loc>${r.loc}</loc>\n`;
        mainXml += `    <lastmod>${todayStr}</lastmod>\n`;
        mainXml += `    <changefreq>${r.changefreq}</changefreq>\n`;
        mainXml += `    <priority>${r.priority}</priority>\n`;
        mainXml += `  </url>\n`;
    });
    mainXml += `</urlset>`;

    // 3. CATEGORIES & COUNTRIES SITEMAP (/sitemap-categories.xml)
    let catXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    catXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    CATEGORIES.forEach(c => {
        catXml += `  <url>\n`;
        catXml += `    <loc>${BASE_URL}/categories?category=${c}</loc>\n`;
        catXml += `    <lastmod>${todayStr}</lastmod>\n`;
        catXml += `    <changefreq>daily</changefreq>\n`;
        catXml += `    <priority>0.8</priority>\n`;
        catXml += `  </url>\n`;
    });

    COUNTRIES.forEach(c => {
        catXml += `  <url>\n`;
        catXml += `    <loc>${BASE_URL}/phim-theo-quoc-gia?country=${c}</loc>\n`;
        catXml += `    <lastmod>${todayStr}</lastmod>\n`;
        catXml += `    <changefreq>daily</changefreq>\n`;
        catXml += `    <priority>0.8</priority>\n`;
        catXml += `  </url>\n`;
    });
    catXml += `</urlset>`;

    // 4. MOVIES SITEMAP (/sitemap-movies.xml) — Tối ưu chi tiết phim & trang xem phim
    let movieXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    movieXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    
    movies.forEach(m => {
        // Link chi tiết phim: /phim/:slug
        movieXml += `  <url>\n`;
        movieXml += `    <loc>${BASE_URL}/phim/${m.slug}</loc>\n`;
        movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
        movieXml += `    <changefreq>daily</changefreq>\n`;
        movieXml += `    <priority>0.85</priority>\n`;
        
        if (m.poster_url || m.thumb_url) {
            const imgUrl = m.poster_url || m.thumb_url;
            movieXml += `    <image:image>\n`;
            movieXml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
            movieXml += `      <image:title>Xem phim ${escapeXml(m.name)} Full HD Vietsub - APhim Super</image:title>\n`;
            movieXml += `    </image:image>\n`;
        }
        movieXml += `  </url>\n`;

        // Link xem phim: /xem-phim/:slug
        movieXml += `  <url>\n`;
        movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}</loc>\n`;
        movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
        movieXml += `    <changefreq>daily</changefreq>\n`;
        movieXml += `    <priority>0.9</priority>\n`;
        movieXml += `  </url>\n`;

        // Biến thể SEO Đa Tầng theo Search Intent: Thuyết Minh
        movieXml += `  <url>\n`;
        movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/thuyet-minh</loc>\n`;
        movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
        movieXml += `    <changefreq>daily</changefreq>\n`;
        movieXml += `    <priority>0.85</priority>\n`;
        movieXml += `  </url>\n`;
    });
    movieXml += `</urlset>`;

    // 5. IMAGES SITEMAP (/sitemap-images.xml) — Dành riêng cho Google Image Index
    let imgXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    imgXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    
    movies.forEach(m => {
        const imgUrl = m.poster_url || m.thumb_url;
        if (imgUrl) {
            imgXml += `  <url>\n`;
            imgXml += `    <loc>${BASE_URL}/phim/${m.slug}</loc>\n`;
            imgXml += `    <image:image>\n`;
            imgXml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
            imgXml += `      <image:title>Poster phim ${escapeXml(m.name)} HD - APhim Super</image:title>\n`;
            imgXml += `    </image:image>\n`;
            if (m.thumb_url && m.thumb_url !== m.poster_url) {
                imgXml += `    <image:image>\n`;
                imgXml += `      <image:loc>${escapeXml(m.thumb_url)}</image:loc>\n`;
                imgXml += `      <image:title>Ảnh thumbnail phim ${escapeXml(m.name)} - APhim</image:title>\n`;
                imgXml += `    </image:image>\n`;
            }
            imgXml += `  </url>\n`;
        }
    });
    imgXml += `</urlset>`;

    // 6. REELS & REVIEW VIDEO SITEMAP (/sitemap-reels.xml) — Chuẩn Google Video XML
    let reelsXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    reelsXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

    // Entry chính: /reels
    reelsXml += `  <url>\n`;
    reelsXml += `    <loc>${BASE_URL}/reels</loc>\n`;
    reelsXml += `    <lastmod>${todayStr}</lastmod>\n`;
    reelsXml += `    <changefreq>always</changefreq>\n`;
    reelsXml += `    <priority>0.95</priority>\n`;
    reelsXml += `  </url>\n`;

    // Entries theo Thể loại & Quốc gia
    const REELS_GENRES = ['hanh-dong', 'tinh-cam', 'co-trang', 'kinh-di', 'hai-huoc', 'vien-tuong', 'tam-ly', 'vo-thuat', 'hoat-hinh'];
    REELS_GENRES.forEach(g => {
        reelsXml += `  <url>\n`;
        reelsXml += `    <loc>${BASE_URL}/reels/chu-de/${g}</loc>\n`;
        reelsXml += `    <lastmod>${todayStr}</lastmod>\n`;
        reelsXml += `    <changefreq>daily</changefreq>\n`;
        reelsXml += `    <priority>0.85</priority>\n`;
        reelsXml += `  </url>\n`;
    });

    const REELS_COUNTRIES = ['viet-nam', 'han-quoc', 'trung-quoc', 'au-my', 'thai-lan', 'nhat-ban'];
    REELS_COUNTRIES.forEach(c => {
        reelsXml += `  <url>\n`;
        reelsXml += `    <loc>${BASE_URL}/reels/quoc-gia/${c}</loc>\n`;
        reelsXml += `    <lastmod>${todayStr}</lastmod>\n`;
        reelsXml += `    <changefreq>daily</changefreq>\n`;
        reelsXml += `    <priority>0.85</priority>\n`;
        reelsXml += `  </url>\n`;
    });

    // Entries video review phim chi tiết (/reels/review/:slug)
    const { CURATED_REVIEWS, CURATED_REELS } = require('../lib/reels.seeds');
    const allReelSeeds = [...(CURATED_REVIEWS || []), ...(CURATED_REELS || [])];
    const seenReelSlugs = new Set();

    allReelSeeds.forEach(seed => {
        const slug = seed.slug || seed.yt;
        if (slug && !seenReelSlugs.has(slug)) {
            seenReelSlugs.add(slug);
            const title = escapeXml(seed.title || seed.movieTitle || 'Review Phim');
            const desc = escapeXml(seed.desc || `Xem video review phim ${title} tóm tắt trọn bộ Full HD Vietsub tại APhim Super.`);
            let thumb = seed.poster || seed.thumb || (seed.yt ? `https://i.ytimg.com/vi/${seed.yt}/hqdefault.jpg` : `${BASE_URL}/android-chrome-512x512.png`);
            if (thumb && !thumb.startsWith('http')) {
                thumb = `${BASE_URL}${thumb.startsWith('/') ? '' : '/'}${thumb}`;
            }
            thumb = escapeXml(thumb);
            const duration = seed.tab === 'reel' ? '60' : '900';
            const viewCount = parseInt(String(seed.views || '120000').replace(/[^0-9]/g, ''), 10) || 120000;

            reelsXml += `  <url>\n`;
            reelsXml += `    <loc>${BASE_URL}/reels/review/${escapeXml(slug)}</loc>\n`;
            reelsXml += `    <lastmod>${todayStr}</lastmod>\n`;
            reelsXml += `    <changefreq>weekly</changefreq>\n`;
            reelsXml += `    <priority>0.9</priority>\n`;
            if (seed.yt) {
                reelsXml += `    <video:video>\n`;
                reelsXml += `      <video:thumbnail_loc>${thumb}</video:thumbnail_loc>\n`;
                reelsXml += `      <video:title>Review Phim ${title} (${seed.year || '2026'}) - Tóm Tắt Trọn Bộ</video:title>\n`;
                reelsXml += `      <video:description>${desc}</video:description>\n`;
                reelsXml += `      <video:player_loc allow_embed="yes" autoplay="ap=1">https://www.youtube-nocookie.com/embed/${seed.yt}</video:player_loc>\n`;
                reelsXml += `      <video:duration>${duration}</video:duration>\n`;
                reelsXml += `      <video:publication_date>${todayStr}</video:publication_date>\n`;
                reelsXml += `      <video:view_count>${viewCount}</video:view_count>\n`;
                reelsXml += `      <video:family_friendly>yes</video:family_friendly>\n`;
                reelsXml += `      <video:live>no</video:live>\n`;
                reelsXml += `      <video:uploader info="${BASE_URL}/">APhim Super</video:uploader>\n`;
                reelsXml += `    </video:video>\n`;
            }
            reelsXml += `  </url>\n`;
        }
    });

    // Video review & reels sitemap chuẩn W3C & Google Video Schema (chỉ chứa các video có embed thực thụ)
    reelsXml += `</urlset>`;

    // Cập nhật Cache
    sitemapCache = {
        index: indexXml,
        main: mainXml,
        movies: movieXml,
        categories: catXml,
        images: imgXml,
        reels: reelsXml,
        lastFetched: Date.now()
    };

    console.log(`🚀 [SEO Sitemap] Đã xây dựng thành công bộ Sitemap (${movies.length} phim, ${movies.length * 2 + staticRoutes.length + CATEGORIES.length + COUNTRIES.length + seenReelSlugs.size} URLs)!`);
    return sitemapCache;
}

// ── GET /sitemap.xml (Master Sitemap Index) ──────────────────────────────────
router.get(['/sitemap.xml', '/sitemap_index.xml'], async (req, res) => {
    try {
        const publicSitemap = path.join(__dirname, '../public/sitemap.xml');
        if (fs.existsSync(publicSitemap)) {
            res.header('Content-Type', 'application/xml; charset=utf-8');
            res.header('Cache-Control', 'public, max-age=1800');
            return res.sendFile(publicSitemap);
        }
        const data = await generateAllSitemaps();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(data.index);
    } catch (err) {
        console.error('[SEO Sitemap Error]:', err.message);
        res.status(500).send('Error generating master sitemap');
    }
});

// ── GET /sitemap-main.xml ────────────────────────────────────────────────────
router.get('/sitemap-main.xml', async (req, res) => {
    try {
        const data = await generateAllSitemaps();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(data.main);
    } catch (err) {
        res.status(500).send('Error generating main sitemap');
    }
});

// ── GET /sitemap-movies.xml ──────────────────────────────────────────────────
router.get('/sitemap-movies.xml', async (req, res) => {
    try {
        const data = await generateAllSitemaps();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(data.movies);
    } catch (err) {
        res.status(500).send('Error generating movies sitemap');
    }
});

// ── GET /sitemap-categories.xml ──────────────────────────────────────────────
router.get('/sitemap-categories.xml', async (req, res) => {
    try {
        const data = await generateAllSitemaps();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(data.categories);
    } catch (err) {
        res.status(500).send('Error generating categories sitemap');
    }
});

// ── GET /sitemap-images.xml ──────────────────────────────────────────────────
router.get('/sitemap-images.xml', async (req, res) => {
    try {
        const publicImagesSitemap = path.join(__dirname, '../public/sitemap-images.xml');
        if (fs.existsSync(publicImagesSitemap)) {
            res.header('Content-Type', 'application/xml; charset=utf-8');
            res.header('Cache-Control', 'public, max-age=1800');
            return res.sendFile(publicImagesSitemap);
        }
        const data = await generateAllSitemaps();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(data.images);
    } catch (err) {
        res.status(500).send('Error generating images sitemap');
    }
});

// ── GET /sitemap-reels.xml (Google Video XML Sitemap) ────────────────────────
router.get('/sitemap-reels.xml', async (req, res) => {
    try {
        const data = await generateAllSitemaps();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(data.reels);
    } catch (err) {
        console.error('[SEO Sitemap Reels Error]:', err.message);
        res.status(500).send('Error generating reels video sitemap');
    }
});

// ── GET /sitemap-phim-ngan.xml (Kho Phim Ngắn / Short Drama Chuẩn W3C XML) ─────
function generatePhimNganSitemap() {
    if (sitemapCache.phimNgan && (Date.now() - sitemapCache.lastFetchedPhimNgan < 86400000)) {
        return sitemapCache.phimNgan;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let catalog = [];
    try {
        const phimNganService = require('../lib/phimNgan.service');
        const seeds = phimNganService.loadLocalSeeds();
        catalog = (seeds && seeds.catalog) || [];
    } catch (e) {
        try {
            const seedsPath = path.join(__dirname, '../data/phim_ngan_seeds.json');
            if (fs.existsSync(seedsPath)) {
                const seedsData = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
                catalog = seedsData.catalog || [];
            }
        } catch (_) {}
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Hub trang chủ phim ngắn
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/phim-ngan</loc>\n`;
    xml += `    <lastmod>${todayStr}</lastmod>\n`;
    xml += `    <changefreq>always</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // 2. Trang đề xuất & thịnh hành
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/phim-ngan/de-xuat</loc>\n`;
    xml += `    <lastmod>${todayStr}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;

    // 3. Toàn bộ các bộ phim ngắn chi tiết
    const seenDramaIds = new Set();
    catalog.forEach(item => {
        const dramaId = String(item.id || item.slug || '').trim();
        if (!dramaId || seenDramaIds.has(dramaId)) return;
        seenDramaIds.add(dramaId);

        const title = escapeXml(item.title || item.originalTitle || 'Phim Ngắn');
        let poster = item.cover || item.coverVertical || '';
        if (poster && !poster.startsWith('http')) {
            poster = `${BASE_URL}${poster.startsWith('/') ? '' : '/'}${poster}`;
        }
        poster = escapeXml(poster);

        // URL trang Thông tin phim (/phim-ngan/thong-tin/:id)
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/phim-ngan/thong-tin/${escapeXml(dramaId)}</loc>\n`;
        xml += `    <lastmod>${todayStr}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.85</priority>\n`;
        if (poster) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${poster}</image:loc>\n`;
            xml += `      <image:title>Xem trọn bộ phim ngắn ${title} Full HD Vietsub - APhim Super</image:title>\n`;
            xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;

        // URL trang Xem phim trực tiếp (/phim-ngan/xem/:id)
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/phim-ngan/xem/${escapeXml(dramaId)}</loc>\n`;
        xml += `    <lastmod>${todayStr}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.85</priority>\n`;
        if (poster) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${poster}</image:loc>\n`;
            xml += `      <image:title>Xem phim ngắn ${title} tập 1 Vietsub Thuyết minh - APhim Super</image:title>\n`;
            xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
    });

    xml += `</urlset>`;

    sitemapCache.phimNgan = xml;
    sitemapCache.lastFetchedPhimNgan = Date.now();
    return xml;
}

router.get('/sitemap-phim-ngan.xml', async (req, res) => {
    try {
        const publicFile = path.join(__dirname, '../public/sitemap-phim-ngan.xml');
        if (fs.existsSync(publicFile)) {
            res.header('Content-Type', 'application/xml; charset=utf-8');
            res.header('Cache-Control', 'public, max-age=86400');
            return res.sendFile(publicFile);
        }
        const xml = generatePhimNganSitemap();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=86400');
        res.send(xml);
    } catch (err) {
        console.error('[SEO Sitemap Phim Ngan Error]:', err.message);
        res.status(500).send('Error generating phim ngan sitemap');
    }
});

// ── GET /robots.txt (Crawl Budget & Search Engine Guidance) ──────────────────
router.get('/robots.txt', (req, res) => {
    res.type('text/plain; charset=utf-8');
    res.send(`User-agent: *
Allow: /
Allow: /phim-ngan
Allow: /phim-ngan/
Allow: /reels
Allow: /reels/
Allow: /phim/
Allow: /xem-phim/
Allow: /danh-sach
Allow: /tat-ca
Allow: /categories
Allow: /phim-theo-quoc-gia
Allow: /search

# Disallow private user & backend endpoints
Disallow: /api/
Disallow: /admin/
Disallow: /profile
Disallow: /tai-khoan
Disallow: /reset-password
Disallow: /*?*keyword=

# Search Engines Master Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml
Sitemap: ${BASE_URL}/sitemap-phim-ngan.xml
Sitemap: ${BASE_URL}/sitemap-movies.xml
Sitemap: ${BASE_URL}/sitemap-images.xml
Sitemap: ${BASE_URL}/sitemap-categories.xml
Sitemap: ${BASE_URL}/sitemap-reels.xml
Sitemap: ${BASE_URL}/sitemap-main.xml
`);
});

// ── GET /rss.xml & /feed.xml (Google News & Movie RSS Aggregator) ─────────────
router.get(['/rss.xml', '/rss', '/feed.xml', '/feed'], async (req, res) => {
    try {
        const movies = await fetchMoviesForSitemap();
        const pubDate = new Date().toUTCString();

        let rss = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        rss += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n`;
        rss += `  <channel>\n`;
        rss += `    <title>APhim Super - Kho Phim Mới Cập Nhật Full HD Vietsub</title>\n`;
        rss += `    <link>${BASE_URL}/</link>\n`;
        rss += `    <description>Kênh RSS cập nhật liên tục phim lẻ mới, phim bộ hot, phim vietsub thuyết minh mới nhất trên APhim Super</description>\n`;
        rss += `    <language>vi</language>\n`;
        rss += `    <lastBuildDate>${pubDate}</lastBuildDate>\n`;
        rss += `    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />\n`;

        movies.slice(0, 100).forEach(m => {
            rss += `    <item>\n`;
            rss += `      <title><![CDATA[Phim ${m.name} (${m.origin_name || m.year}) Full HD Vietsub]]></title>\n`;
            rss += `      <link>${BASE_URL}/phim/${m.slug}</link>\n`;
            rss += `      <guid isPermaLink="true">${BASE_URL}/phim/${m.slug}</guid>\n`;
            rss += `      <description><![CDATA[Xem phim ${m.name} (${m.origin_name}) Full HD Vietsub Thuyết minh mới nhất trên APhim Super.]]></description>\n`;
            rss += `      <pubDate>${new Date(m.modified || Date.now()).toUTCString()}</pubDate>\n`;
            rss += `    </item>\n`;
        });

        rss += `  </channel>\n`;
        rss += `</rss>`;

        res.header('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(rss);
    } catch (err) {
        res.status(500).send('Error generating RSS feed');
    }
});

// ── GET IndexNow Verification Key Route ──────────────────────────────────────
const { INDEXNOW_KEY, submitUrlsToIndexNow, autoSubmitRecentMovies } = require('../lib/indexnow.service');

router.get([`/${INDEXNOW_KEY}.txt`, '/indexnow-key.txt'], (req, res) => {
    res.type('text/plain; charset=utf-8');
    res.send(INDEXNOW_KEY);
});

// ── POST /api/seo/indexnow/submit (Admin manual trigger or webhook) ──────────
router.post('/api/seo/indexnow/submit', async (req, res) => {
    try {
        const { urls } = req.body;
        if (Array.isArray(urls) && urls.length > 0) {
            const result = await submitUrlsToIndexNow(urls);
            return res.json(result);
        }
        const autoResult = await autoSubmitRecentMovies();
        res.json(autoResult || { success: true, message: 'Đã hoàn tất kích hoạt IndexNow' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/seo/clear-cache (Admin only) ───────────────────────────────────
router.post('/api/seo/clear-cache', (req, res) => {
    sitemapCache = { index: null, main: null, movies: null, categories: null, images: null, reels: null, phimNgan: null, lastFetched: 0, lastFetchedPhimNgan: 0 };
    res.json({ success: true, message: 'Đã làm mới bộ nhớ cache SEO & Sitemaps!' });
});

module.exports = router;
