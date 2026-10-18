/**
 * scripts/crawl_narto_hits.js
 * Crawls authentic, playable short dramas with Vietnamese Dubbing / Subtitles from Narto Drama
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');

const TARGET_NARTO_DRAMAS = [
    {
        title: 'Bé Cưng Của Nhà Họ Vân (Lồng Tiếng)',
        slug: 'long-tieng-be-cung-cua-nha-ho-van',
        url: 'https://narto-drama.com/detail/watch/long-tieng-be-cung-cua-nha-ho-van/1?lang=vi-VN'
    },
    {
        title: 'Cuộc Chiến Giành Vợ Của Tổng Tài Tuyệt Đỉnh',
        slug: 'cuoc-chien-gianh-vo-cua-tong-tai-tuyet-dinh',
        url: 'https://narto-drama.com/detail/watch/cuoc-chien-gianh-vo-cua-tong-tai-tuyet-dinh/1?lang=vi-VN'
    },
    {
        title: 'Tiểu Thư Chính Hiệu Trở Lại (Lồng Tiếng)',
        slug: 'tieu-thu-chinh-hieu-tro-lai-phien-ban-long-tieng',
        url: 'https://narto-drama.com/detail/watch/tieu-thu-chinh-hieu-tro-lai-phien-ban-long-tieng/1?lang=vi-VN'
    },
    {
        title: 'Phán Quyết Olympus (Lồng Tiếng)',
        slug: 'long-tieng-phan-quyet-olympus',
        url: 'https://narto-drama.com/detail/watch/long-tieng-phan-quyet-olympus/1?lang=vi-VN'
    },
    {
        title: 'Bánh Bao Đổi Vợ (Lồng Tiếng)',
        slug: 'long-tieng-banh-bao-doi-vo',
        url: 'https://narto-drama.com/detail/watch/long-tieng-banh-bao-doi-vo/1?lang=vi-VN'
    },
    {
        title: 'Kẹo Ngọt Quá Hạn (Lồng Tiếng)',
        slug: 'long-tieng-keo-ngot-qua-han',
        url: 'https://narto-drama.com/detail/watch/long-tieng-keo-ngot-qua-han/1?lang=vi-VN'
    },
    {
        title: 'Mang Thai Bỏ Trốn, Tổng Tài Phát Điên',
        slug: 'mang-thai-bo-tron-tong-tai-phat-dien',
        url: 'https://narto-drama.com/detail/watch/mang-thai-bo-tron-tong-tai-phat-dien/1?lang=vi-VN'
    },
    {
        title: 'Tổng Tài Lệch Mục Tiêu Rồi',
        slug: 'tong-tai-lech-muc-tieu-roi',
        url: 'https://narto-drama.com/detail/watch/tong-tai-lech-muc-tieu-roi/1?lang=vi-VN'
    }
];

async function crawlNartoDrama(item) {
    const ck = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try {
        console.log(`[Narto Crawler] 🚀 Đang cào phim "${item.title}"...`);
        const res = await axios.get(item.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Cookie': `nd_ck=${ck}; path=/; max-age=7200; samesite=Lax`,
                'Referer': 'https://narto-drama.com/'
            },
            timeout: 15000
        });

        const html = res.data;
        const match = html.match(/episodeItemsRaw\s*=\s*(\[[\s\S]*?\]);/);
        if (!match) {
            console.warn(`[Narto Crawler] ⚠️ Không tìm thấy episodeItemsRaw cho ${item.title}`);
            return null;
        }

        const rawEpisodes = JSON.parse(match[1]);
        if (!Array.isArray(rawEpisodes) || rawEpisodes.length === 0) {
            console.warn(`[Narto Crawler] ⚠️ Danh sách tập rỗng cho ${item.title}`);
            return null;
        }

        // Poster
        const posterMatch = html.match(/class=["'][^"']*poster[^"']*["'][^>]*src=["']([^"']+)["']/i) 
            || html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        const cover = posterMatch ? posterMatch[1] : (rawEpisodes[0].thumb_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop');

        // Intro / Description
        const descMatch = html.match(/class=["'][^"']*(?:description|synopsis|summary)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i)
            || html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        const intro = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : `${item.title} - Phim ngắn kịch tính lồng tiếng / Vietsub đặc sắc.`;

        const episodes = rawEpisodes.map((ep, idx) => {
            const epNo = ep.number || (idx + 1);
            let streamUrl = ep.play_url || ep.direct_play_url || '';
            return {
                id: `${item.slug}_${epNo}`,
                no: epNo,
                title: `Tập ${epNo}`,
                url: streamUrl,
                streamUrl: streamUrl,
                thumb: ep.thumb_url || cover,
                duration: ep.duration || 120
            };
        }).filter(ep => ep.streamUrl && ep.streamUrl.startsWith('http'));

        console.log(`[Narto Crawler] ✅ Thành công: ${item.title} - ${episodes.length} tập`);

        return {
            id: item.slug,
            slug: item.slug,
            title: item.title,
            cover,
            poster: cover,
            intro,
            genre: item.title.includes('Lồng Tiếng') ? 'Lồng Tiếng' : 'Tổng Tài',
            tags: ['Phim Ngắn', 'Hot', item.title.includes('Lồng Tiếng') ? 'Lồng Tiếng' : 'Thuyết Minh'],
            totalEpisodes: episodes.length,
            episodes,
            source: 'narto',
            isDubbed: item.title.includes('Lồng Tiếng'),
            isEmbedded: true
        };
    } catch (e) {
        console.error(`[Narto Crawler] ❌ Lỗi cào ${item.title}:`, e.message);
        return null;
    }
}

async function run() {
    console.log('[Narto Crawler] Bắt đầu thu thập các bộ phim chất lượng cao...');
    const crawled = [];
    for (const item of TARGET_NARTO_DRAMAS) {
        const drama = await crawlNartoDrama(item);
        if (drama && drama.episodes.length > 0) {
            crawled.push(drama);
        }
    }

    if (crawled.length === 0) {
        console.error('[Narto Crawler] Không thu thập được phim nào.');
        return;
    }

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf-8'));
    if (!Array.isArray(seeds.rank)) seeds.rank = [];
    if (!Array.isArray(seeds.catalog)) seeds.catalog = [];

    // Prepend crawled dramas to catalog and rank
    crawled.forEach(d => {
        // Remove existing if any
        seeds.rank = seeds.rank.filter(x => x.id !== d.id && x.slug !== d.slug);
        seeds.catalog = seeds.catalog.filter(x => x.id !== d.id && x.slug !== d.slug);
    });

    // Add top 4 to rank and all to catalog
    seeds.rank.unshift(...crawled.slice(0, 4));
    seeds.catalog.unshift(...crawled);

    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seeds, null, 2), 'utf-8');
    console.log(`[Narto Crawler] 🎉 Đã tích hợp thành công ${crawled.length} bộ phim mới vào ${SEEDS_PATH}!`);
}

run();
