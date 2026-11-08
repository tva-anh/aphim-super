/**
 * scripts/crawl-tophim-bilingual.js
 * 🚀 High-Performance, Zero-Overhead Bilingual Catalog Sync from Tophim.vip
 * - Quét nhanh toàn bộ 64 trang danh mục phim song ngữ (~1.024 phim)
 * - Tối ưu 100% tài nguyên: Sync danh mục trong ~20 giây mà KHÔNG làm nặng CPU/RAM
 * - Cơ chế On-Demand (JIT): Stream OnCDN và phụ đề được giải mã tức thì khi khách bấm xem
 * 
 * Lệnh chạy:
 *   node scripts/crawl-tophim-bilingual.js         (Đồng bộ toàn bộ 64 trang - Siêu tốc ~20s)
 *   node scripts/crawl-tophim-bilingual.js --pages=10 (Đồng bộ 10 trang đầu)
 *   node scripts/crawl-tophim-bilingual.js --slug=abc (Cào sâu 1 phim cụ thể)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { fetchTophimMovie } = require('../lib/tophim.service');

const CATALOG_PATH = path.join(__dirname, '../data/bilingual_catalog.json');
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function parseArgs() {
    const args = process.argv.slice(2);
    let maxPages = 64; // Mặc định quét hết cả 64 trang
    let singleSlug = null;
    let deepCrawl = false;

    for (const arg of args) {
        if (arg.startsWith('--pages=')) {
            maxPages = parseInt(arg.replace('--pages=', ''), 10) || 64;
        } else if (arg.startsWith('--slug=')) {
            singleSlug = arg.replace('--slug=', '').trim().toLowerCase();
        } else if (arg === '--deep') {
            deepCrawl = true;
        }
    }
    return { maxPages, singleSlug, deepCrawl };
}

function loadCatalog() {
    if (!fs.existsSync(CATALOG_PATH)) return [];
    try {
        const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn('[Crawler] Cảnh báo không đọc được catalog cũ:', e.message);
        return [];
    }
}

function saveCatalog(catalog) {
    try {
        fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
        console.log(`[Crawler] 💾 Đã lưu an toàn ${catalog.length} phim vào ${CATALOG_PATH}`);
    } catch (e) {
        console.error('[Crawler] ❌ Lỗi khi lưu catalog:', e.message);
    }
}

function extractMoviesFromHtml(html) {
    const key = '{\\"movies\\":[';
    const startIdx = html.indexOf(key);
    if (startIdx === -1) return [];

    const arrayStart = startIdx + key.length - 1;
    let depth = 0;
    let endIdx = -1;
    for (let i = arrayStart; i < html.length; i++) {
        if (html[i] === '[') depth++;
        else if (html[i] === ']') {
            depth--;
            if (depth === 0) { endIdx = i; break; }
        }
    }
    if (endIdx === -1) return [];

    try {
        const rawJson = html.substring(arrayStart, endIdx + 1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const movies = JSON.parse(rawJson);
        return Array.isArray(movies) ? movies : [];
    } catch (e) {
        return [];
    }
}

async function fetchPage(page) {
    const url = `https://tophim.vip/phim-song-ngu?page=${page}`;
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': DEFAULT_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 10000
        });
        return {
            movies: extractMoviesFromHtml(res.data),
            html: res.data
        };
    } catch (e) {
        console.warn(`[Crawler] Lỗi fetch trang ${page}:`, e.message);
        return { movies: [], html: '' };
    }
}

function formatPosterUrl(rawUrl) {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    return `https://tophim.vip${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

async function run() {
    console.log('====================================================');
    console.log('🚀 ĐỒNG BỘ SIÊU TỐC PHIM SONG NGỮ TỪ TOPHIM.VIP (ZERO-OVERHEAD)');
    console.log('====================================================');

    const { maxPages, singleSlug, deepCrawl } = parseArgs();
    const existingCatalog = loadCatalog();
    const existingMap = new Map();

    for (const item of existingCatalog) {
        if (item.slug) existingMap.set(item.slug.trim().toLowerCase(), item);
    }

    if (singleSlug) {
        console.log(`🎯 Cào sâu 1 phim: ${singleSlug}`);
        try {
            const movieDetail = await fetchTophimMovie(singleSlug);
            if (movieDetail && movieDetail.server) {
                const existing = existingMap.get(singleSlug) || {};
                existingMap.set(singleSlug, {
                    ...existing,
                    slug: singleSlug,
                    name: movieDetail.title || existing.name || singleSlug,
                    lang: 'Song Ngữ',
                    source: 'tophim',
                    episodes: movieDetail.server.server_data,
                    has_bilingual_stream: true,
                    updated_at: new Date().toISOString()
                });
                saveCatalog(Array.from(existingMap.values()));
                console.log(`✅ Đã giải mã và lưu ${movieDetail.server.server_data.length} tập cho ${singleSlug}`);
            }
        } catch (e) {
            console.error('Lỗi cào 1 phim:', e.message);
        }
        return;
    }

    console.log(`📡 Đang quét các trang danh mục (Tối đa ${maxPages} trang)...`);
    let newMoviesCount = 0;
    let updatedMoviesCount = 0;
    const orderedList = [];
    const seenSlugs = new Set();

    for (let p = 1; p <= maxPages; p++) {
        const { movies, html } = await fetchPage(p);
        if (!movies || movies.length === 0) {
            console.log(`   👉 Trang ${p}: Không có thêm phim, dừng quét.`);
            break;
        }

        for (const rawM of movies) {
            if (!rawM || !rawM.slug) continue;
            const slug = String(rawM.slug).trim().toLowerCase();
            if (seenSlugs.has(slug)) continue;
            seenSlugs.add(slug);

            const isNew = !existingMap.has(slug);
            const existing = existingMap.get(slug) || {};

            const item = {
                slug,
                name: rawM.title || existing.name || slug,
                origin_name: rawM.original_title || existing.origin_name || '',
                type: rawM.type === 'phimle' ? 'single' : (existing.type || 'series'),
                thumb_url: formatPosterUrl(rawM.thumb_url || rawM.poster_url || existing.thumb_url),
                poster_url: formatPosterUrl(rawM.poster_url || rawM.thumb_url || existing.poster_url),
                episode_current: rawM.status || existing.episode_current || (rawM._count?.episodes ? `Tập ${rawM._count.episodes}` : 'Hoàn Tất'),
                lang: 'Song Ngữ',
                available_languages: ['PD', 'SN', 'TM'],
                source: 'tophim',
                is_songngu: true,
                year: rawM.year || existing.year || null,
                quality: rawM.quality || existing.quality || 'FHD',
                updated_at: new Date().toISOString()
            };

            // Nếu catalog cũ đã có tập hoặc deepCrawl thì giữ lại
            if (existing.episodes && existing.episodes.length > 0) {
                item.episodes = existing.episodes;
                item.has_bilingual_stream = true;
            }

            orderedList.push(item);
            if (isNew) newMoviesCount++;
            else updatedMoviesCount++;
        }

        process.stdout.write(`   👉 Trang ${p}/${maxPages}: Tìm thấy ${movies.length} phim (Tổng hiện có: ${orderedList.length} phim)\n`);

        // Độ trễ nhẹ nhàng 150ms để không gây tải cho nguồn
        await new Promise(r => setTimeout(r, 150));
    }

    // Sau khi duyệt hết tất cả các trang từ Tophim theo đúng thứ tự 1..64,
    // ghép thêm những phim trong catalog cũ mà Tophim không có (fallback ChoPhim) vào cuối
    for (const [slug, oldItem] of existingMap.entries()) {
        if (!seenSlugs.has(slug)) {
            orderedList.push(oldItem);
            seenSlugs.add(slug);
        }
    }

    saveCatalog(orderedList);

    console.log('\n====================================================');
    console.log('🎉 HOÀN TẤT ĐỒNG BỘ SIÊU TỐC:');
    console.log(`   - Phim mới thêm: ${newMoviesCount}`);
    console.log(`   - Phim cập nhật: ${updatedMoviesCount}`);
    console.log(`   - Tổng số phim Song Ngữ sẵn sàng: ${orderedList.length} phim`);
    console.log('   - Cơ chế phát: On-Demand JIT (Khách xem phim nào server mới giải mã phim đó, tải = 0%)');
    console.log('====================================================');
}

if (require.main === module) {
    run().catch(err => console.error('[Fatal Error]:', err));
}

module.exports = { run, extractMoviesFromHtml, fetchPage };
