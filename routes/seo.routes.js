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
const { getBilingualSitemapEntries } = require('../lib/bilingual-sitemap');

const BASE_URL = process.env.BASE_URL || 'https://aphim.store';
const SITEMAP_CACHE_FILE = path.join(__dirname, '../data/sitemaps_cache.json');
const SITEMAP_REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 tiếng làm mới cache ngầm (Stale-While-Revalidate)

// Bộ nhớ đệm Sitemaps Đa Tầng (RAM + Disk Cache)
let sitemapCache = {
    index: null,
    main: null,
    movies: null,
    moviesSingle: null,
    moviesSeries: null,
    episodesSeries: null,
    categories: null,
    images: null,
    reels: null,
    phimNgan: null,
    lastFetched: 0,
    lastFetchedPhimNgan: 0
};

let isRefreshingSitemaps = false;

// Đọc cache từ đĩa ngay khi khởi động để phản hồi Googlebot trong < 20ms
try {
    if (fs.existsSync(SITEMAP_CACHE_FILE)) {
        const diskData = JSON.parse(fs.readFileSync(SITEMAP_CACHE_FILE, 'utf8'));
        if (diskData && diskData.movies) {
            sitemapCache = Object.assign({}, sitemapCache, diskData);
            console.log('✅ [SEO Cache] Đã nạp thành công Sitemap Cache từ đĩa (SWR Ready)');
        }
    }
} catch (e) {
    console.warn('[SEO Cache] Chưa có cache đĩa hoặc file cache bị hỏng:', e.message);
}

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
 * Trích xuất con số tập THỰC TẾ ĐÃ PHÁT SÓNG của một bộ phim dài tập
 * TUYỆT ĐỐI CHỐNG BẪY SINH KHỐNG TẬP CHƯA CHIẾU:
 * - Nếu đang chiếu 'Tập 1' hay '12/40' -> Chỉ sinh đúng 1 hoặc 12 tập, không lấy tổng 16 hay 40 tập!
 * - Chỉ sinh đủ tổng số tập khi phim có trạng thái 'Hoàn tất', 'Full', 'Trọn bộ'
 */
function parseAiredEpisodes(epCurrent, epTotal) {
    const curStr = String(epCurrent || '').toLowerCase().trim();
    const totStr = String(epTotal || '').toLowerCase().trim();

    const isCompleted = curStr.includes('full') || curStr.includes('hoàn tất') || curStr.includes('trọn bộ') || curStr.includes('đủ tập');

    // 1. Phân số: 12/40, (12/40), Hoàn tất (40/40), Full 36/36
    const fracMatch = curStr.match(/(\d+)\s*\/\s*(\d+)/);
    if (fracMatch) {
        const curNum = parseInt(fracMatch[1], 10);
        const totNum = parseInt(fracMatch[2], 10);
        if (isCompleted) {
            const best = Math.max(curNum, totNum);
            return (best > 0 && best <= 250) ? best : 1;
        }
        // Chưa hoàn tất: Chỉ lấy số tập thực tế đã chiếu (số đứng trước)
        return (curNum > 0 && curNum <= 250) ? curNum : 1;
    }

    // 2. Có từ khóa Tập: 'Tập 24', 'Tập 1', 'Tập 08'
    const tapMatch = curStr.match(/tập\s*(\d+)/i) || curStr.match(/tap\s*(\d+)/i);
    if (tapMatch) {
        const n = parseInt(tapMatch[1], 10);
        if (!isNaN(n) && n > 0 && n <= 250) {
            // Nếu có chữ Hoàn tất/Full và có epTotal lớn hơn -> lấy epTotal
            if (isCompleted) {
                const totalMatch = totStr.match(/(\d+)/);
                if (totalMatch) {
                    const totN = parseInt(totalMatch[1], 10);
                    if (!isNaN(totN) && totN > n && totN <= 250) return totN;
                }
            }
            return n;
        }
    }

    // 3. Nếu là phim đã Hoàn tất / Trọn bộ nhưng curStr không chứa số tập cụ thể (vd: 'Full', 'Hoàn tất')
    if (isCompleted) {
        const totalMatch = totStr.match(/(\d+)/);
        if (totalMatch) {
            const totN = parseInt(totalMatch[1], 10);
            if (!isNaN(totN) && totN > 1 && totN <= 250) return totN;
        }
    }

    return 1;
}

// Giữ alias tương thích
const parseMaxEpisodes = parseAiredEpisodes;

/**
 * Thuật toán phân loại Phim Lẻ vs Phim Bộ siêu chuẩn
 * Chặn triệt để bẫy nhận diện sai Phim Bộ mới ra "Tập 1" thành Phim Lẻ
 */
function evaluateMovieType(m, forcedType = null) {
    const rawType = String(forcedType || m.type || '').trim().toLowerCase();
    const epTotal = String(m.episode_total || '').trim().toLowerCase();
    const epCurrent = String(m.episode_current || '').trim().toLowerCase();
    const catList = Array.isArray(m.category)
        ? m.category.map(c => (typeof c === 'string' ? c : (c.name || c.slug || '')).toLowerCase())
        : [];

    const parsedTotal = parseInt(epTotal.replace(/[^0-9]/g, ''), 10);
    const isMultiTotal = !isNaN(parsedTotal) && parsedTotal > 1;
    const hasSeriesCategory = catList.some(c => c.includes('phim bộ') || c.includes('phim-bo') || c.includes('tv series') || c.includes('tv-series'));
    const isExplicitSeriesType = rawType === 'series' || rawType === 'tvshows';
    const isOngoingSeriesEpisode = /tập\s*\d+/i.test(epCurrent) && !epCurrent.includes('full') && !epCurrent.includes('trọn bộ') && !epCurrent.includes('hoàn tất');

    // Chặn triệt để bẫy phim bộ mới ra Tập 1
    const isDefinitelySeries = isExplicitSeriesType || isMultiTotal || isOngoingSeriesEpisode || hasSeriesCategory;

    const isSingle = !isDefinitelySeries && Boolean(
        rawType === 'single' ||
        rawType === 'movie' ||
        m.chieu_rap === true ||
        m.is_cinema === true ||
        epTotal === '1' ||
        epTotal === '01' ||
        epCurrent.includes('full') ||
        epCurrent.includes('chiếu rạp') ||
        catList.some(c => c.includes('chiếu rạp') || c.includes('phim lẻ'))
    );

    return {
        isSingle,
        type: isSingle ? 'single' : 'series'
    };
}

/**
 * Cào danh sách phim mới nhất và đầy đủ từ nhiều nguồn danh mục để xây dựng sitemap động quy mô lớn
 */
async function fetchMoviesForSitemap() {
    const movies = [];
    const movieSlugsSeen = new Set();
    const todayStr = new Date().toISOString().split('T')[0];

    // Helper trích xuất và chuẩn hóa movie item
    const extractMovie = (m, forcedType = null) => {
        if (!m || !m.slug || movieSlugsSeen.has(m.slug) || BLOCKED_SLUGS.includes(m.slug.toLowerCase())) {
            return;
        }
        movieSlugsSeen.add(m.slug);

        let thumb = m.thumb_url || '';
        if (thumb && !thumb.startsWith('http')) thumb = `https://img.phimapi.com/${thumb}`;

        let poster = m.poster_url || '';
        if (poster && !poster.startsWith('http')) poster = `https://img.phimapi.com/${poster}`;

        const classification = evaluateMovieType(m, forcedType);

        movies.push({
            slug: m.slug,
            name: m.name || m.origin_name || m.slug,
            origin_name: m.origin_name || '',
            year: m.year || new Date().getFullYear(),
            thumb_url: thumb,
            poster_url: poster,
            episode_current: m.episode_current || '',
            episode_total: m.episode_total || '',
            isSingle: classification.isSingle,
            type: classification.type,
            modified: m.modified?.time ? new Date(m.modified.time).toISOString().split('T')[0] : todayStr
        });
    };

    // 1. Cào 60 trang danh sách phim mới cập nhật (~1.440 phim)
    const newPageNumbers = Array.from({ length: 60 }, (_, i) => i + 1);
    await Promise.allSettled(
        newPageNumbers.map(async (page) => {
            try {
                const res = await axios.get(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`, {
                    timeout: 6000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) APhim-SEO-Crawler/3.0' }
                });
                (res.data?.items || []).forEach(m => extractMovie(m));
            } catch (err) { }
        })
    );

    // 2. Cào bổ sung danh mục Phim Lẻ chuyên biệt (20 trang x 24 = ~480 phim lẻ)
    const singlePages = Array.from({ length: 20 }, (_, i) => i + 1);
    await Promise.allSettled(
        singlePages.map(async (page) => {
            try {
                const res = await axios.get(`https://phimapi.com/v1/api/danh-sach/phim-le?page=${page}&limit=24`, {
                    timeout: 6000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) APhim-SEO-Crawler/3.0' }
                });
                (res.data?.data?.items || []).forEach(m => extractMovie(m, 'single'));
            } catch (err) { }
        })
    );

    // 3. Cào bổ sung danh mục Phim Bộ chuyên biệt (20 trang x 24 = ~480 phim bộ)
    const seriesPages = Array.from({ length: 20 }, (_, i) => i + 1);
    await Promise.allSettled(
        seriesPages.map(async (page) => {
            try {
                const res = await axios.get(`https://phimapi.com/v1/api/danh-sach/phim-bo?page=${page}&limit=24`, {
                    timeout: 6000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) APhim-SEO-Crawler/3.0' }
                });
                (res.data?.data?.items || []).forEach(m => extractMovie(m, 'series'));
            } catch (err) { }
        })
    );

    // 4. Cào bổ sung Hoạt Hình Anime (15 trang x 24 = ~360 phim)
    const animePages = Array.from({ length: 15 }, (_, i) => i + 1);
    await Promise.allSettled(
        animePages.map(async (page) => {
            try {
                const res = await axios.get(`https://phimapi.com/v1/api/danh-sach/hoat-hinh?page=${page}&limit=24`, {
                    timeout: 6000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) APhim-SEO-Crawler/3.0' }
                });
                (res.data?.data?.items || []).forEach(m => extractMovie(m));
            } catch (err) { }
        })
    );

    // 5. Cào bổ sung TV Shows (10 trang x 24 = ~240 phim)
    const tvPages = Array.from({ length: 10 }, (_, i) => i + 1);
    await Promise.allSettled(
        tvPages.map(async (page) => {
            try {
                const res = await axios.get(`https://phimapi.com/v1/api/danh-sach/tv-shows?page=${page}&limit=24`, {
                    timeout: 6000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) APhim-SEO-Crawler/3.0' }
                });
                (res.data?.data?.items || []).forEach(m => extractMovie(m, 'series'));
            } catch (err) { }
        })
    );

    // 6. Hợp nhất kho phim Song Ngữ (catalog cục bộ) — không phụ thuộc PhimAPI/NguonC
    const movieBySlug = new Map(movies.map(m => [m.slug, m]));
    for (const item of getBilingualSitemapEntries()) {
        const existingMovie = movieBySlug.get(item.slug);
        if (existingMovie) {
            existingMovie.isBilingual = true;
            existingMovie.isSingle = item.isSingle;
            existingMovie.episodeCount = Math.max(existingMovie.episodeCount || 0, item.episodeCount || 0);
            if (!existingMovie.episode_current && item.episode_current) existingMovie.episode_current = item.episode_current;
            if (!existingMovie.episode_total && item.episode_total) existingMovie.episode_total = item.episode_total;
            continue;
        }
        if (BLOCKED_SLUGS.includes(item.slug)) continue;

        const movie = {
            slug: item.slug,
            name: item.name,
            origin_name: item.origin_name || '',
            year: new Date().getFullYear(),
            thumb_url: item.thumb_url || '',
            poster_url: item.poster_url || '',
            episode_current: item.episode_current || '',
            episode_total: item.episode_total || '',
            isSingle: item.isSingle,
            type: item.isSingle ? 'single' : 'series',
            isBilingual: true,
            episodeCount: item.episodeCount || 0,
            modified: item.updated_at || todayStr
        };
        movies.push(movie);
        movieBySlug.set(movie.slug, movie);
        movieSlugsSeen.add(movie.slug);
    }

    return movies;
}

/**
 * Xây dựng nội dung toàn bộ XML Sitemaps
 */
async function buildSitemapsXml() {
    const todayStr = new Date().toISOString().split('T')[0];
    const movies = await fetchMoviesForSitemap();

    const singleMovies = movies.filter(m => m.isSingle);
    const seriesMovies = movies.filter(m => !m.isSingle);

    // 1. MASTER SITEMAP INDEX (/sitemap-index.xml)
    // LOẠI BỎ TRÙNG LẶP: Không đưa sitemap-movies.xml vào đây vì nó đã chứa các URLs của 3 sitemap con
    let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    indexXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const sitemapsList = [
        `${BASE_URL}/sitemap-main.xml`,
        `${BASE_URL}/sitemap-categories.xml`,
        `${BASE_URL}/sitemap-movies-single.xml`,
        `${BASE_URL}/sitemap-movies-series.xml`,
        `${BASE_URL}/sitemap-episodes-series.xml`,
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
        { loc: `${BASE_URL}/danh-sach?list=phim-le`, priority: '0.95', changefreq: 'daily' },
        { loc: `${BASE_URL}/danh-sach?list=phim-bo`, priority: '0.95', changefreq: 'daily' },
        { loc: `${BASE_URL}/danh-sach?list=hoat-hinh`, priority: '0.90', changefreq: 'daily' },
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

    // 4. SITEMAP CHUYÊN BIỆT PHIM LẺ (/sitemap-movies-single.xml)
    let singleXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    singleXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    singleMovies.forEach(m => {
        singleXml += `  <url>\n`;
        singleXml += `    <loc>${BASE_URL}/phim/${m.slug}</loc>\n`;
        singleXml += `    <lastmod>${m.modified}</lastmod>\n`;
        singleXml += `    <changefreq>daily</changefreq>\n`;
        singleXml += `    <priority>0.85</priority>\n`;
        if (m.poster_url || m.thumb_url) {
            singleXml += `    <image:image>\n`;
            singleXml += `      <image:loc>${escapeXml(m.poster_url || m.thumb_url)}</image:loc>\n`;
            singleXml += `      <image:title>Phim Lẻ ${escapeXml(m.name)} Full HD Vietsub - APhim Super</image:title>\n`;
            singleXml += `    </image:image>\n`;
        }
        singleXml += `  </url>\n`;

        // URL xem phim lẻ chuẩn Top 1 Google: /xem-phim/:slug/full
        singleXml += `  <url>\n`;
        singleXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/full</loc>\n`;
        singleXml += `    <lastmod>${m.modified}</lastmod>\n`;
        singleXml += `    <changefreq>daily</changefreq>\n`;
        singleXml += `    <priority>0.95</priority>\n`;
        singleXml += `  </url>\n`;

        // Biến thể Thuyết Minh cho Phim Lẻ
        singleXml += `  <url>\n`;
        singleXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/full-thuyet-minh</loc>\n`;
        singleXml += `    <lastmod>${m.modified}</lastmod>\n`;
        singleXml += `    <changefreq>daily</changefreq>\n`;
        singleXml += `    <priority>0.85</priority>\n`;
        singleXml += `  </url>\n`;

        // Biến thể Song Ngữ cho Phim Lẻ
        if (m.isBilingual) {
            singleXml += `  <url>\n`;
            singleXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/full-song-ngu</loc>\n`;
            singleXml += `    <lastmod>${m.modified}</lastmod>\n`;
            singleXml += `    <changefreq>daily</changefreq>\n`;
            singleXml += `    <priority>0.85</priority>\n`;
            singleXml += `  </url>\n`;
        }
    });
    singleXml += `</urlset>`;

    // 5. SITEMAP CHUYÊN BIỆT PHIM BỘ (/sitemap-movies-series.xml)
    let seriesXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    seriesXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
    seriesMovies.forEach(m => {
        seriesXml += `  <url>\n`;
        seriesXml += `    <loc>${BASE_URL}/phim/${m.slug}</loc>\n`;
        seriesXml += `    <lastmod>${m.modified}</lastmod>\n`;
        seriesXml += `    <changefreq>daily</changefreq>\n`;
        seriesXml += `    <priority>0.90</priority>\n`;
        if (m.poster_url || m.thumb_url) {
            seriesXml += `    <image:image>\n`;
            seriesXml += `      <image:loc>${escapeXml(m.poster_url || m.thumb_url)}</image:loc>\n`;
            seriesXml += `      <image:title>Phim Bộ ${escapeXml(m.name)} Trọn Bộ Full HD - APhim Super</image:title>\n`;
            seriesXml += `    </image:image>\n`;
        }
        seriesXml += `  </url>\n`;

        // Tập 1 mặc định của phim bộ
        seriesXml += `  <url>\n`;
        seriesXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-1</loc>\n`;
        seriesXml += `    <lastmod>${m.modified}</lastmod>\n`;
        seriesXml += `    <changefreq>daily</changefreq>\n`;
        seriesXml += `    <priority>0.90</priority>\n`;
        seriesXml += `  </url>\n`;

        // Tập 1 Song Ngữ của phim bộ
        if (m.isBilingual) {
            seriesXml += `  <url>\n`;
            seriesXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-1-song-ngu</loc>\n`;
            seriesXml += `    <lastmod>${m.modified}</lastmod>\n`;
            seriesXml += `    <changefreq>daily</changefreq>\n`;
            seriesXml += `    <priority>0.88</priority>\n`;
            seriesXml += `  </url>\n`;
        }
    });
    seriesXml += `</urlset>`;

    // 6. SITEMAP CÁC TẬP PHIM BỘ (/sitemap-episodes-series.xml)
    // GIẢI QUYẾT TRIỆT ĐỂ: Sinh đủ từ Tập 1 đến Tập N theo đúng con số bóc tách từ episode_current / episode_total
    let epSeriesXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    epSeriesXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    seriesMovies.forEach(m => {
        const maxEp = parseMaxEpisodes(m.episode_current, m.episode_total);
        for (let ep = 1; ep <= maxEp; ep++) {
            epSeriesXml += `  <url>\n`;
            epSeriesXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-${ep}</loc>\n`;
            epSeriesXml += `    <lastmod>${m.modified}</lastmod>\n`;
            epSeriesXml += `    <changefreq>daily</changefreq>\n`;
            epSeriesXml += `    <priority>${ep === 1 ? '0.90' : '0.80'}</priority>\n`;
            epSeriesXml += `  </url>\n`;

            // Bổ sung tập thuyết minh cho 3 tập đầu hoặc tập mới nhất
            if (ep <= 3 || ep === maxEp) {
                epSeriesXml += `  <url>\n`;
                epSeriesXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-${ep}-thuyet-minh</loc>\n`;
                epSeriesXml += `    <lastmod>${m.modified}</lastmod>\n`;
                epSeriesXml += `    <changefreq>daily</changefreq>\n`;
                epSeriesXml += `    <priority>0.75</priority>\n`;
                epSeriesXml += `  </url>\n`;
            }

            // Bổ sung tập Song Ngữ cho phim có trong kho Song Ngữ
            if (m.isBilingual) {
                epSeriesXml += `  <url>\n`;
                epSeriesXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-${ep}-song-ngu</loc>\n`;
                epSeriesXml += `    <lastmod>${m.modified}</lastmod>\n`;
                epSeriesXml += `    <changefreq>daily</changefreq>\n`;
                epSeriesXml += `    <priority>${ep === 1 ? '0.85' : '0.75'}</priority>\n`;
                epSeriesXml += `  </url>\n`;
            }
        }
    });
    epSeriesXml += `</urlset>`;

    // 7. SITEMAP MOVIES TỔNG HỢP (/sitemap-movies.xml) — Phục vụ Google Search Console với URL chuẩn hóa 100%
    let movieXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    movieXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    movies.forEach(m => {
        // Trang chi tiết phim: /phim/:slug
        movieXml += `  <url>\n`;
        movieXml += `    <loc>${BASE_URL}/phim/${m.slug}</loc>\n`;
        movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
        movieXml += `    <changefreq>daily</changefreq>\n`;
        movieXml += `    <priority>0.85</priority>\n`;
        if (m.poster_url || m.thumb_url) {
            movieXml += `    <image:image>\n`;
            movieXml += `      <image:loc>${escapeXml(m.poster_url || m.thumb_url)}</image:loc>\n`;
            movieXml += `      <image:title>Xem phim ${escapeXml(m.name)} Full HD Vietsub - APhim Super</image:title>\n`;
            movieXml += `    </image:image>\n`;
        }
        movieXml += `  </url>\n`;

        if (m.isSingle) {
            // Phim Lẻ: Chuẩn hóa tuyệt đối về /full, TUYỆT ĐỐI KHÔNG để /tap-1
            movieXml += `  <url>\n`;
            movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/full</loc>\n`;
            movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
            movieXml += `    <changefreq>daily</changefreq>\n`;
            movieXml += `    <priority>0.95</priority>\n`;
            movieXml += `  </url>\n`;

            movieXml += `  <url>\n`;
            movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/full-thuyet-minh</loc>\n`;
            movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
            movieXml += `    <changefreq>daily</changefreq>\n`;
            movieXml += `    <priority>0.85</priority>\n`;
            movieXml += `  </url>\n`;

            if (m.isBilingual) {
                movieXml += `  <url>\n`;
                movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/full-song-ngu</loc>\n`;
                movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
                movieXml += `    <changefreq>daily</changefreq>\n`;
                movieXml += `    <priority>0.85</priority>\n`;
                movieXml += `  </url>\n`;
            }
        } else {
            // Phim Bộ: Chuẩn hóa về /tap-1 và /tap-1-thuyet-minh
            movieXml += `  <url>\n`;
            movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-1</loc>\n`;
            movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
            movieXml += `    <changefreq>daily</changefreq>\n`;
            movieXml += `    <priority>0.90</priority>\n`;
            movieXml += `  </url>\n`;

            movieXml += `  <url>\n`;
            movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-1-thuyet-minh</loc>\n`;
            movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
            movieXml += `    <changefreq>daily</changefreq>\n`;
            movieXml += `  </url>\n`;

            if (m.isBilingual) {
                movieXml += `  <url>\n`;
                movieXml += `    <loc>${BASE_URL}/xem-phim/${m.slug}/tap-1-song-ngu</loc>\n`;
                movieXml += `    <lastmod>${m.modified}</lastmod>\n`;
                movieXml += `    <changefreq>daily</changefreq>\n`;
                movieXml += `    <priority>0.85</priority>\n`;
                movieXml += `  </url>\n`;
            }
        }
    });
    movieXml += `</urlset>`;

    // 8. IMAGES SITEMAP (/sitemap-images.xml) — Dành riêng cho Google Image Index
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

    // 9. REELS & REVIEW VIDEO SITEMAP (/sitemap-reels.xml) — Chuẩn Google Video XML
    let reelsXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    reelsXml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

    reelsXml += `  <url>\n`;
    reelsXml += `    <loc>${BASE_URL}/reels</loc>\n`;
    reelsXml += `    <lastmod>${todayStr}</lastmod>\n`;
    reelsXml += `    <changefreq>always</changefreq>\n`;
    reelsXml += `    <priority>0.95</priority>\n`;
    reelsXml += `  </url>\n`;

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

    reelsXml += `</urlset>`;

    // Cập nhật Cache
    const newCacheData = {
        index: indexXml,
        main: mainXml,
        movies: movieXml,
        moviesSingle: singleXml,
        moviesSeries: seriesXml,
        episodesSeries: epSeriesXml,
        categories: catXml,
        images: imgXml,
        reels: reelsXml,
        lastFetched: Date.now()
    };

    console.log(`🚀 [SEO Sitemap] Đã xây dựng thành công bộ Sitemap (${movies.length} phim: ${singleMovies.length} phim lẻ, ${seriesMovies.length} phim bộ)!`);
    return newCacheData;
}

/**
 * Kích hoạt tiến trình cập nhật sitemap chạy ngầm (Stale-While-Revalidate)
 * Không bao giờ làm block hoặc gây timeout cho Googlebot
 */
function triggerBackgroundSitemapRefresh() {
    if (isRefreshingSitemaps) return;
    isRefreshingSitemaps = true;

    setImmediate(async () => {
        try {
            console.log('🔄 [SEO SWR] Bắt đầu tiến trình ngầm cập nhật bộ Sitemaps (125 trang API)...');
            const newCache = await buildSitemapsXml();
            sitemapCache = Object.assign({}, sitemapCache, newCache);

            try {
                fs.writeFileSync(SITEMAP_CACHE_FILE, JSON.stringify(sitemapCache), 'utf8');
                console.log('💾 [SEO SWR] Đã ghi đĩa thành công bộ cache Sitemaps mới!');
            } catch (errDisk) {
                console.warn('[SEO SWR] Không thể ghi disk cache:', errDisk.message);
            }
        } catch (err) {
            console.error('[SEO SWR Refresh Failed]:', err.message);
        } finally {
            isRefreshingSitemaps = false;
        }
    });
}

/**
 * Trả về dữ liệu Sitemap ngay lập tức (<20ms) từ RAM hoặc File Cache
 */
async function getCachedSitemap(key) {
    if (sitemapCache && sitemapCache[key]) {
        // Kiểm tra xem cache có quá hạn 2 tiếng không -> nếu có thì refresh ngầm
        if (Date.now() - (sitemapCache.lastFetched || 0) > SITEMAP_REFRESH_INTERVAL && !isRefreshingSitemaps) {
            triggerBackgroundSitemapRefresh();
        }
        return sitemapCache[key];
    }

    // Nếu chưa có cache, build ngay lần đầu
    if (!isRefreshingSitemaps) {
        try {
            isRefreshingSitemaps = true;
            const newCache = await buildSitemapsXml();
            sitemapCache = Object.assign({}, sitemapCache, newCache);
            try {
                fs.writeFileSync(SITEMAP_CACHE_FILE, JSON.stringify(sitemapCache), 'utf8');
            } catch (_) {}
            return sitemapCache[key] || '';
        } finally {
            isRefreshingSitemaps = false;
        }
    }

    return sitemapCache[key] || '';
}

// ── GET /sitemap.xml (Bảo tồn 100% Sức Mạnh SEO Cũ từ 21.444 Trang Đã Index trên GSC) ──
router.get('/sitemap.xml', async (req, res) => {
    try {
        const publicSitemap = path.join(__dirname, '../public/sitemap.xml');
        if (fs.existsSync(publicSitemap)) {
            res.header('Content-Type', 'application/xml; charset=utf-8');
            res.header('Cache-Control', 'public, max-age=1800');
            return res.sendFile(publicSitemap);
        }
        const xml = await getCachedSitemap('movies');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        console.error('[SEO Sitemap Error]:', err.message);
        res.status(500).send('Error generating sitemap');
    }
});

// ── GET /sitemap_index.xml & /sitemap-index.xml (Master Sitemap Index Đa Tầng Mới) ──
router.get(['/sitemap_index.xml', '/sitemap-index.xml'], async (req, res) => {
    try {
        const xml = await getCachedSitemap('index');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        console.error('[SEO Master Sitemap Index Error]:', err.message);
        res.status(500).send('Error generating master sitemap index');
    }
});

// ── GET /sitemap-main.xml ────────────────────────────────────────────────────
router.get('/sitemap-main.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('main');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        res.status(500).send('Error generating main sitemap');
    }
});

// ── GET /sitemap-movies.xml (Sitemap Phim Tổng Hợp Tối Ưu cho GSC) ─────────────
router.get('/sitemap-movies.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('movies');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        res.status(500).send('Error generating movies sitemap');
    }
});

// ── GET /sitemap-movies-single.xml (Chuyên Biệt Toàn Bộ Phim Lẻ) ──────────────
router.get('/sitemap-movies-single.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('moviesSingle');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        res.status(500).send('Error generating single movies sitemap');
    }
});

// ── GET /sitemap-movies-series.xml (Chuyên Biệt Toàn Bộ Phim Bộ) ──────────────
router.get('/sitemap-movies-series.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('moviesSeries');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        res.status(500).send('Error generating series movies sitemap');
    }
});

// ── GET /sitemap-episodes-series.xml (Chuyên Biệt Toàn Bộ Tập Phim Bộ) ────────
router.get('/sitemap-episodes-series.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('episodesSeries');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        res.status(500).send('Error generating episodes sitemap');
    }
});

// ── GET /sitemap-categories.xml ──────────────────────────────────────────────
router.get('/sitemap-categories.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('categories');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        res.status(500).send('Error generating categories sitemap');
    }
});

// ── GET /sitemap-images.xml ──────────────────────────────────────────────────
router.get('/sitemap-images.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('images');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
    } catch (err) {
        res.status(500).send('Error generating images sitemap');
    }
});

// ── GET /sitemap-reels.xml (Google Video XML Sitemap) ────────────────────────
router.get('/sitemap-reels.xml', async (req, res) => {
    try {
        const xml = await getCachedSitemap('reels');
        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=1800');
        res.send(xml);
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

# Search Engines Master Sitemaps (Tối ưu tránh crawl trùng lặp 100% URLs)
Sitemap: ${BASE_URL}/sitemap.xml
Sitemap: ${BASE_URL}/sitemap-index.xml
Sitemap: ${BASE_URL}/sitemap-movies.xml
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
module.exports.buildSitemapsXml = buildSitemapsXml;
module.exports.fetchMoviesForSitemap = fetchMoviesForSitemap;
