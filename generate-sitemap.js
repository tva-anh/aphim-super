/**
 * High-Capacity Multi-Source Sitemap Generator for APhim Super (https://aphim.store)
 * Scans all available endpoints across PhimAPI and NguonC to discover 12,000+ unique movies (25,000+ clean SEO URLs).
 * Outputs clean XML sitemaps to public/ and root directory without any legacy .html paths.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://aphim.store';
const TODAY = new Date().toISOString().split('T')[0];

// Danh sách phim bị chặn (DMCA/Vi phạm) — tuyệt đối không đưa vào sitemap
const BLOCKED_SLUGS = [
    'trai-cam',
    'moi-thu-la-loi-co-ay',
    'michael',
    'dac-vu-xuyen-quoc-gia',
    'xac-song-thanh-pho-chet-phan-2'
];

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function getCleanImageUrl(rawUrl) {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    const cleanPath = rawUrl.startsWith('uploads/') ? rawUrl : 'uploads/movies/' + rawUrl.replace(/^\/+/, '');
    return `https://phimimg.com/${cleanPath}`;
}

async function fetchJsonWithRetry(url, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await axios.get(url, {
                timeout: 8000,
                headers: { 'User-Agent': 'APhim-Super-Sitemap-Scanner/3.0' }
            });
            return res.data;
        } catch (err) {
            if (i === retries) return null;
            await new Promise(r => setTimeout(r, 120 * (i + 1)));
        }
    }
    return null;
}

async function processInBatches(items, batchSize, fn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.allSettled(batch.map(item => fn(item).catch(() => {})));
        await new Promise(r => setTimeout(r, 25));
    }
}

(async () => {
    console.log(`🚀 Bắt đầu quét kho phim toàn diện cho APhim Super (${BASE_URL}) - Ngày: ${TODAY}...`);
    const uniqueMoviesMap = new Map();
    const targets = [];

    // 1. PhimAPI Main Lists (Phim mới, Phim bộ, Phim lẻ, Hoạt hình, TV Shows)
    const lists = [
        { type: 'phim-moi-cap-nhat', pages: 200 },
        { type: 'phim-bo', pages: 150 },
        { type: 'phim-le', pages: 150 },
        { type: 'hoat-hinh', pages: 150 },
        { type: 'tv-shows', pages: 100 }
    ];

    lists.forEach(l => {
        for (let p = 1; p <= l.pages; p++) {
            targets.push({
                url: `https://phimapi.com/v1/api/danh-sach/${l.type}?page=${p}`,
                extractor: data => data?.data?.items || data?.items || []
            });
        }
    });

    // 2. PhimAPI Categories & Countries
    const categories = [
        'hanh-dong', 'tinh-cam', 'hai-huoc', 'kinh-di', 'phieu-luu',
        'khoa-hoc-vien-tuong', 'tam-ly', 'hinh-su', 'chien-tranh', 'than-thoai',
        'gia-dinh', 'hoat-hinh', 'tai-lieu', 'am-nhac', 'the-thao', 'vo-thuat',
        'co-trang', 'chinh-kich', 'bi-an', 'hoc-duong'
    ];
    categories.forEach(cat => {
        for (let p = 1; p <= 120; p++) {
            targets.push({
                url: `https://phimapi.com/v1/api/the-loai/${cat}?page=${p}`,
                extractor: data => data?.data?.items || []
            });
        }
    });

    const countries = [
        'viet-nam', 'han-quoc', 'trung-quoc', 'nhat-ban', 'thai-lan',
        'au-my', 'hong-kong', 'dai-loan', 'an-do', 'anh', 'phap', 'canada'
    ];
    countries.forEach(c => {
        for (let p = 1; p <= 100; p++) {
            targets.push({
                url: `https://phimapi.com/v1/api/quoc-gia/${c}?page=${p}`,
                extractor: data => data?.data?.items || []
            });
        }
    });

    // 3. NguonC Main List (Dự phòng thêm kho phim phong phú)
    for (let p = 1; p <= 200; p++) {
        targets.push({
            url: `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${p}`,
            extractor: data => data?.items || []
        });
    }

    console.log(`📋 Tổng số API endpoints đang chờ quét: ${targets.length}`);
    let completed = 0;
    const startTime = Date.now();

    await processInBatches(targets, 25, async (target) => {
        try {
            const data = await fetchJsonWithRetry(target.url);
            if (data) {
                const items = target.extractor(data);
                if (Array.isArray(items)) {
                    items.forEach(m => {
                        const slug = (m?.slug || '').trim().toLowerCase();
                        if (slug && !BLOCKED_SLUGS.includes(slug)) {
                            if (!uniqueMoviesMap.has(slug)) {
                                uniqueMoviesMap.set(slug, {
                                    slug: slug,
                                    name: m.name || m.title || '',
                                    poster_url: m.poster_url || m.thumb_url || '',
                                    thumb_url: m.thumb_url || m.poster_url || '',
                                    updated_at: m.modified?.time ? new Date(m.modified.time).toISOString().split('T')[0] : TODAY
                                });
                            } else {
                                const existing = uniqueMoviesMap.get(slug);
                                if (!existing.poster_url && m.poster_url) existing.poster_url = m.poster_url;
                                if (!existing.thumb_url && m.thumb_url) existing.thumb_url = m.thumb_url;
                            }
                        }
                    });
                }
            }
        } catch (e) {}
        completed++;
        if (completed % 400 === 0 || completed === targets.length) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`⏳ Đã quét: ${completed}/${targets.length} endpoints | Số phim độc nhất: ${uniqueMoviesMap.size} | Thời gian: ${elapsed}s`);
        }
    });

    const movies = Array.from(uniqueMoviesMap.values());
    console.log(`\n🎉 HOÀN TẤT THU THẬP! Tổng cộng: ${movies.length} bộ phim độc nhất.`);

    // --- STATIC PAGES CHUẨN CLEAN SEO ---
    const staticPages = [
        '/',
        '/danh-sach',
        '/categories',
        '/phim-theo-quoc-gia',
        '/hoi-dap',
        '/gioi-thieu',
        '/chinh-sach-bao-mat',
        '/dieu-khoan-su-dung'
    ];

    categories.forEach(cat => staticPages.push(`/categories?category=${cat}`));
    countries.forEach(c => staticPages.push(`/phim-theo-quoc-gia?country=${c}`));
    ['phim-moi', 'phim-bo', 'phim-le', 'tv-shows', 'hoat-hinh', 'phim-vietsub', 'phim-thuyet-minh', 'phim-chieu-rap'].forEach(l => {
        staticPages.push(`/danh-sach?list=${l}`);
    });

    // Thư mục xuất file
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    const outFiles = [
        {
            sitemapPath: path.join(__dirname, 'sitemap.xml'),
            imagesPath: path.join(__dirname, 'sitemap-images.xml')
        },
        {
            sitemapPath: path.join(publicDir, 'sitemap.xml'),
            imagesPath: path.join(publicDir, 'sitemap-images.xml')
        }
    ];

    outFiles.forEach(({ sitemapPath, imagesPath }) => {
        const sitemapStream = fs.createWriteStream(sitemapPath, { encoding: 'utf-8' });
        sitemapStream.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');

        // Ghi các trang tĩnh
        staticPages.forEach(p => {
            sitemapStream.write(`    <url>\n        <loc>${BASE_URL}${p}</loc>\n        <lastmod>${TODAY}</lastmod>\n        <changefreq>${p === '/' ? 'daily' : 'weekly'}</changefreq>\n        <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n    </url>\n`);
        });

        const imagesStream = fs.createWriteStream(imagesPath, { encoding: 'utf-8' });
        imagesStream.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n');

        let imageCount = 0;

        // Ghi từng bộ phim (gồm 2 link sạch: /phim/:slug và /xem-phim/:slug)
        movies.forEach(movie => {
            const slug = movie.slug;
            const name = escapeXml(movie.name);
            const detailUrl = `${BASE_URL}/phim/${slug}`;
            const watchUrl = `${BASE_URL}/xem-phim/${slug}`;

            sitemapStream.write(`    <url>\n        <loc>${detailUrl}</loc>\n        <lastmod>${movie.updated_at || TODAY}</lastmod>\n        <changefreq>daily</changefreq>\n        <priority>0.9</priority>\n    </url>\n    <url>\n        <loc>${watchUrl}</loc>\n        <lastmod>${movie.updated_at || TODAY}</lastmod>\n        <changefreq>daily</changefreq>\n        <priority>0.8</priority>\n    </url>\n`);

            const thumb = getCleanImageUrl(movie.thumb_url);
            const poster = getCleanImageUrl(movie.poster_url);

            let imgs = '';
            if (thumb) {
                imgs += `\n        <image:image><image:loc>${escapeXml(thumb)}</image:loc><image:title>${name}</image:title></image:image>`;
            }
            if (poster && poster !== thumb) {
                imgs += `\n        <image:image><image:loc>${escapeXml(poster)}</image:loc><image:title>${name} - Poster</image:title></image:image>`;
            }

            if (imgs) {
                imageCount++;
                imagesStream.write(`    <url>\n        <loc>${detailUrl}</loc>${imgs}\n    </url>\n`);
            }
        });

        sitemapStream.write('</urlset>');
        sitemapStream.end();

        imagesStream.write('</urlset>');
        imagesStream.end();

        console.log(`📄 Đã tạo file: ${sitemapPath} (Tổng ${movies.length * 2 + staticPages.length} URLs)`);
        console.log(`🖼️ Đã tạo file: ${imagesPath} (Tổng ${imageCount} ảnh)`);
    });

    console.log(`\n✨ TOÀN BỘ SITEMAP CHO APHIM SUPER ĐÃ HOÀN TẤT THÀNH CÔNG!`);
})().catch(err => {
    console.error('Lỗi nghiêm trọng khi tạo sitemap:', err);
    process.exit(1);
});
