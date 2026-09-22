/**
 * routes/seo.routes.js
 * Hệ thống SEO Tối Thượng — Kiến trúc Sitemap Đa Tầng & Robots.txt theo chuẩn Top 1 Google
 * Tham khảo cấu trúc SEO từ các nền tảng streaming hàng đầu (Motchill, Phimmoi, Bilutv)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://aphim.store';
const SITEMAP_CACHE_TTL = 45 * 60 * 1000; // 45 phút cache để tránh overload API

// Bộ nhớ đệm Sitemaps
let sitemapCache = {
    index: null,
    main: null,
    movies: null,
    categories: null,
    images: null,
    lastFetched: 0
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
        `${BASE_URL}/sitemap-images.xml`
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

        // Biến thể SEO Đa Tầng theo Search Intent: Thuyết Minh (Search intent lớn nhất tại VN)
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

    // Cập nhật Cache
    sitemapCache = {
        index: indexXml,
        main: mainXml,
        movies: movieXml,
        categories: catXml,
        images: imgXml,
        lastFetched: Date.now()
    };

    console.log(`🚀 [SEO Sitemap] Đã xây dựng thành công bộ Sitemap (${movies.length} phim, ${movies.length * 2 + staticRoutes.length + CATEGORIES.length + COUNTRIES.length} URLs)!`);
    return sitemapCache;
}

// ── GET /sitemap.xml (Master Sitemap Index) ──────────────────────────────────
router.get(['/sitemap.xml', '/sitemap_index.xml'], async (req, res) => {
    try {
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
        const data = await generateAllSitemaps();
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(data.images);
    } catch (err) {
        res.status(500).send('Error generating images sitemap');
    }
});

// ── GET /robots.txt (Crawl Budget & Search Engine Guidance) ──────────────────
router.get('/robots.txt', (req, res) => {
    res.type('text/plain; charset=utf-8');
    res.send(`User-agent: *
Allow: /
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
Sitemap: ${BASE_URL}/sitemap-movies.xml
Sitemap: ${BASE_URL}/sitemap-categories.xml
Sitemap: ${BASE_URL}/sitemap-images.xml
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

// ── POST /api/seo/clear-cache (Admin only) ───────────────────────────────────
router.post('/api/seo/clear-cache', (req, res) => {
    sitemapCache = { index: null, main: null, movies: null, categories: null, images: null, lastFetched: 0 };
    res.json({ success: true, message: 'Đã làm mới bộ nhớ cache SEO & Sitemaps!' });
});

module.exports = router;
