/**
 * scripts/crawl-phim-ngan.js
 * Script crawl nhiều phim ngắn từ Feifan API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FEIFAN_API = 'http://api.ffzyapi.com/api.php/provide/vod/';
const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');

// Crawl nhiều categories và nhiều trang
const CATEGORIES = [36, 37, 38, 39, 40]; // Các category phim ngắn
const MAX_PAGES = 10; // Crawl 10 trang mỗi category

async function crawlFeifanAPI() {
    console.log('Bat dau crawl phim ngan tu Feifan API...');
    
    const allDramas = new Map();
    let totalCrawled = 0;

    // Load existing seeds
    let currentSeeds = { rank: [], catalog: [], timestamp: Date.now() };
    if (fs.existsSync(SEEDS_PATH)) {
        try {
            currentSeeds = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf-8'));
        } catch (e) {}
    }

    // Map existing dramas
    [...(currentSeeds.rank || []), ...(currentSeeds.catalog || [])].forEach(d => {
        if (d && d.id) allDramas.set(String(d.id), d);
    });

    console.log(`Da co ${allDramas.size} phim trong database`);

    // Crawl từng category
    for (const cat of CATEGORIES) {
        console.log(`\nCrawling category t=${cat}...`);
        
        for (let page = 1; page <= MAX_PAGES; page++) {
            try {
                const url = `${FEIFAN_API}?ac=detail&t=${cat}&pg=${page}`;
                console.log(`  Page ${page}...`);
                
                const res = await axios.get(url, { timeout: 10000 });
                const list = res.data?.list || [];
                
                if (list.length === 0) {
                    console.log(`  Het phim o page ${page}`);
                    break;
                }

                let addedInPage = 0;

                for (const item of list) {
                    const id = String(item.vod_id || '');
                    if (!id || allDramas.has(id)) continue;

                    const parts = (item.vod_play_url || '').split('$$$');
                    const m3u8Server = parts.find(s => s.includes('.m3u8')) || parts[parts.length - 1] || '';
                    const rawParts = m3u8Server.split('#').filter(Boolean);
                    
                    if (rawParts.length < 1 || !item.vod_pic) continue;

                    const episodes = rawParts.map((p, idx) => {
                        const segs = p.split('$');
                        const url = (segs[1] || segs[0] || '').trim();
                        return {
                            no: idx + 1,
                            id: `${id}_${idx + 1}`,
                            title: `Tap ${idx + 1}`,
                            duration: 120,
                            durationText: '02:00',
                            cover: item.vod_pic,
                            locked: false,
                            url: url,
                            streamUrl: url
                        };
                    }).filter(ep => ep.url && ep.url.startsWith('http'));

                    if (episodes.length < 1) continue;

                    const dramaObj = {
                        id,
                        title: item.vod_name || 'Phim Ngan',
                        cover: item.vod_pic,
                        intro: (item.vod_content || '').replace(/<[^>]+>/g, '').trim() || 'Phim ngan kich tinh hap dan',
                        labels: ['Phim Ngan', 'M3U8 Full HD', 'Khong quang cao'],
                        genre: item.vod_class || 'Phim Ngan',
                        totalEpisodes: episodes.length,
                        finished: true,
                        episodes,
                        stats: {
                            views: 100 + Math.floor(Math.random() * 150),
                            likes: 10 + Math.floor(Math.random() * 25),
                            stars: 5
                        },
                        source: 'feifan'
                    };

                    allDramas.set(id, dramaObj);
                    addedInPage++;
                    totalCrawled++;
                }

                console.log(`  Them ${addedInPage} phim moi tu page ${page}`);
                
                // Delay giữa các page để tránh rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (err) {
                console.error(`  Loi page ${page}:`, err.message);
                break;
            }
        }
    }

    // Save to file
    currentSeeds.catalog = Array.from(allDramas.values());
    currentSeeds.timestamp = Date.now();
    currentSeeds.updatedAt = new Date().toISOString();
    
    fs.writeFileSync(SEEDS_PATH, JSON.stringify(currentSeeds, null, 2), 'utf-8');
    
    console.log(`\n\nHOAN TAT!`);
    console.log(`Tong so phim: ${allDramas.size}`);
    console.log(`Da them moi: ${totalCrawled} phim`);
    console.log(`Da luu vao: ${SEEDS_PATH}`);
}

// Run
crawlFeifanAPI().catch(console.error);