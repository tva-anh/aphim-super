const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { translateTitle, getGenre, getIntro } = require('../lib/phimNgan.dictionary');

const IKUN_API = 'https://ikunzyapi.com/api.php/provide/vod/';
const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');

async function buildSeeds() {
    console.log('Fetching genuine short dramas from Ikun...');
    const allDramas = [];
    const seenIds = new Set();

    for (let p = 1; p <= 6; p++) {
        try {
            const res = await axios.get(`${IKUN_API}?ac=detail&t=45&pg=${p}`, { timeout: 10000 });
            const list = res.data?.list || [];
            for (const item of list) {
                const id = String(item.vod_id || '');
                if (!id || seenIds.has(id)) continue;
                
                const playUrl = item.vod_play_url || '';
                const parts = playUrl.split('#').filter(Boolean);
                // We prefer dramas with >= 10 episodes
                if (parts.length >= 10 && item.vod_pic && item.vod_pic.startsWith('http')) {
                    seenIds.add(id);
                    allDramas.push(item);
                }
            }
        } catch (e) {
            console.warn(`Error fetching page ${p}:`, e.message);
        }
    }

    console.log(`Harvested ${allDramas.length} multi-episode dramas.`);

    function mapDrama(item) {
        const id = String(item.vod_id);
        const title = translateTitle(id, item.vod_name);
        const cover = item.vod_pic;
        const genre = getGenre(id, item);
        const intro = getIntro(id, item);

        const rawParts = (item.vod_play_url || '').split('#').filter(Boolean);
        const episodes = rawParts.map((p, idx) => {
            const segs = p.split('$');
            const url = segs[1] || segs[0];
            return {
                no: idx + 1,
                id: `${id}_${idx + 1}`,
                duration: 120,
                durationText: '02:00',
                cover: cover,
                locked: false,
                url: url ? url.trim() : '',
                streamUrl: url ? url.trim() : ''
            };
        }).filter(ep => ep.url && ep.url.startsWith('http'));

        return {
            id,
            title,
            cover,
            intro,
            labels: [genre, 'M3U8 Full HD'],
            genre,
            totalEpisodes: episodes.length,
            finished: true,
            episodes,
            source: 'ikun'
        };
    }

    const normalized = allDramas.map(mapDrama).filter(d => d.episodes.length >= 10);
    console.log(`Normalized ${normalized.length} complete dramas with matching video streams.`);

    // Top 20 for rank/trending
    const rank = normalized.slice(0, 20);
    // Next 60 for catalog
    const catalog = normalized.slice(20, 80);

    // Save to seeds
    const seedData = {
        timestamp: Date.now(),
        rank,
        catalog,
        legacyMap: {
            '7692043430955863102': '64361', // Thành Hà Thể Thống (Ancient drama)
            '7693823855940357144': '68154', // Tứ Bảo Lai Tập
            '7691228619774905368': '65064', // Cô Ấy Dùng Tu Tiên
            '7689322645132692542': '68211'  // Thần Tiên Manh Bảo
        }
    };

    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seedData, null, 2), 'utf-8');
    console.log('Successfully saved to', SEEDS_PATH);
}

buildSeeds().catch(console.error);
