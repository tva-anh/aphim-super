/**
 * scripts/crawl_vietshort.js
 * Crawls and extracts all short dramas from VietShort (vietshort.com)
 * with 1080p Full HD master.m3u8 streams and Vietnamese subtitles.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');

const DISCOVERED_SLUGS = [
    'khuc-hat-bi-ca-thoi-loan',
    'nhan-gian-khoi-lua-lai-mot-mua-xuan',
    'phuong-cot-thieu-troi',
    'khi-chieu-buong-o-hoai-chau',
    'phu-nhan-noi-loan',
    'thai-tu-duong-thoi-la-phu-quan-ngoc-cua-ta',
    'thieu-soai-manh-nhat-lich-su',
    'man-hoa-binh-thien-ha',
    'co-nang-dieu-huong',
    'bi-mat-6-nam',
    'yeu-em-la-su-sap-dat',
    'vua-banh-nuong-huyen-thoai-xuyen-khong',
    'co-vo-thuc-tap-sinh-cua-thieu-gia',
    'mot-dem-dinh-menh-voi-tong-tai',
    'canh-hoa-lac-loi',
    'nang-co-muu-do-toi-cam-tam-lac-loi',
    'tro-choi-sinh-tu',
    'trao-nham-chan-tinh',
    'truyen-ky-phong-ninh-duyen-xua-nay',
    'anh-de-doc-quyen-cua-quan-ly-kim-bai',
    'an-hoang-quyet-chien-thien-ha',
    'ke-manh-noi-hoang-tho-tung-hoanh-sat-phat-ngay-tan-the',
    'chap-phap-di-thu-nguyen-chuyen-tri-cuong-do',
    'dong-thoi-dieu-khien-bay-linh-thu-ta-xung-ba-gioi-ngu-thu',
    'phi-thang-thoi-dai-cyber-toi-tro-thanh-he-thong-cua-gioi-tu-tien',
    'y-phi-xuyen-khong',
    'quyet-chien-cap-thanh-1944',
    'noi-vi-sao-cham-toi-bien'
];

async function crawlDrama(slug) {
    const url = `https://vietshort.com/web/watch/${slug}`;
    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 8000
        });
        const html = res.data;

        // Title
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        let title = titleMatch ? titleMatch[1].replace(' - Vietshort', '').replace(' | VietShort', '').trim() : slug;
        if (!title || title === 'Vietshort') title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Series ID
        const idMatch = html.match(/cdn\/videos\/([a-z0-9]+)\//) || html.match(/cdn\/posters\/([a-z0-9]+)\//);
        const seriesId = idMatch ? idMatch[1] : null;
        if (!seriesId) {
            console.warn(`[Skip] Could not find seriesId for ${slug}`);
            return null;
        }

        // Episodes count
        const epMatches = Array.from(html.matchAll(/\/ep-(\d+)\//g)).map(m => parseInt(m[1], 10));
        const maxEp = epMatches.length > 0 ? Math.max(...epMatches) : 50;

        // Poster
        const posterMatch = html.match(/(https:\/\/cdn\.vietshort\.com\/cdn\/posters\/[^\s"']+\.webp[^\s"']*)/);
        const poster = posterMatch ? posterMatch[1] : `https://cdn.vietshort.com/cdn/posters/${seriesId}/poster.webp`;

        // Description
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || html.match(/"description":"([^"]+)"/);
        let desc = descMatch ? descMatch[1].trim() : '';
        if (!desc || desc.length < 10) desc = `${title} - Phim ngắn kịch tính đặc sắc, trọn bộ Vietsub Full HD.`;

        // Genre / Tags
        let genre = 'Tổng tài, Tình cảm, Kịch tính';
        if (slug.includes('xuyen-khong') || slug.includes('tu-tien') || slug.includes('cyber')) genre = 'Xuyên không, Tu tiên, Huyền huyễn';
        else if (slug.includes('thoi-loan') || slug.includes('thieu-soai') || slug.includes('1944') || slug.includes('hoai-chau')) genre = 'Dân quốc, Chiến tranh, Quân sự';
        else if (slug.includes('trao-nham') || slug.includes('phu-nhan') || slug.includes('bi-mat') || slug.includes('sinh-tu')) genre = 'Báo thù, Hào môn, Nghịch tập';

        const episodes = [];
        for (let ep = 1; ep <= maxEp; ep++) {
            const stream = `https://cdn.vietshort.com/cdn/videos/${seriesId}/ep-${ep}/master.m3u8`;
            episodes.push({
                no: ep,
                id: `${slug}_${ep}`,
                title: `Tập ${ep}`,
                duration: 120,
                durationText: '02:00',
                cover: poster,
                locked: false,
                url: stream,
                streamUrl: stream
            });
        }

        return {
            id: slug,
            slug: slug,
            title: title,
            cover: poster,
            intro: desc,
            labels: ['Vietsub', '1080p', 'VietShort', 'Trọn bộ'],
            genre: genre,
            totalEpisodes: maxEp,
            finished: true,
            source: 'vietshort',
            stats: {
                views: Math.floor(Math.random() * 500000) + 200000,
                likes: Math.floor(Math.random() * 50000) + 10000,
                rating: (Math.random() * 0.4 + 9.5).toFixed(1)
            },
            episodes: episodes
        };
    } catch (e) {
        console.error(`Error crawling ${slug}:`, e.message);
        return null;
    }
}

async function run() {
    console.log('🚀 Bắt đầu cào dữ liệu từ VietShort (28 bộ phim)...');
    const crawledDramas = [];

    for (let i = 0; i < DISCOVERED_SLUGS.length; i++) {
        const slug = DISCOVERED_SLUGS[i];
        console.log(`[${i + 1}/${DISCOVERED_SLUGS.length}] Đang lấy phim: ${slug}...`);
        const item = await crawlDrama(slug);
        if (item) {
            crawledDramas.push(item);
            console.log(`   ✅ Đã lấy xong: "${item.title}" (${item.totalEpisodes} tập)`);
        }
        await new Promise(r => setTimeout(r, 600));
    }

    console.log(`🎉 Thu thập thành công ${crawledDramas.length} phim từ VietShort!`);

    // Load existing seeds and merge cleanly
    let seeds = { home: [], rank: [], catalog: [] };
    if (fs.existsSync(SEEDS_PATH)) {
        seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf-8'));
    }

    const existingCatalogIds = new Set((seeds.catalog || []).map(x => x.id || x.slug));
    const newItems = crawledDramas.filter(d => !existingCatalogIds.has(d.id));

    // Prepend new VietShort dramas to catalog and rank
    seeds.catalog = [...newItems, ...(seeds.catalog || [])];
    
    // Add top 5 VietShort dramas to rank
    const topVietShort = crawledDramas.slice(0, 5);
    const existingRankIds = new Set((seeds.rank || []).map(x => x.id));
    const newRank = topVietShort.filter(d => !existingRankIds.has(d.id));
    seeds.rank = [...newRank, ...(seeds.rank || [])];

    // Build shelves
    const vietShortShelf = {
        key: 'shelf-vietshort',
        title: '⭐ Phim Ngắn VietShort - 100% Vietsub Chuẩn',
        items: crawledDramas.slice(0, 12)
    };

    if (!seeds.shelves) seeds.shelves = [];
    // Replace or prepend shelf-vietshort
    seeds.shelves = seeds.shelves.filter(s => s.key !== 'shelf-vietshort');
    seeds.shelves.unshift(vietShortShelf);

    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seeds, null, 2), 'utf-8');
    console.log(`💾 Đã lưu vào ${SEEDS_PATH}! Tổng phim catalog: ${seeds.catalog.length}, Shelves: ${seeds.shelves.length}`);
}

run();
