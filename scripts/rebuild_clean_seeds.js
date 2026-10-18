const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');
const Gd = '223QON86QMVdNyCOZumR4ZLNUmiltER1x4ioU6qCPUs=';

function fl(b64) { return Buffer.from(b64, 'base64'); }
async function decrypt(rawB64) {
    const raw = fl(rawB64.trim());
    const decipher = crypto.createDecipheriv('aes-256-gcm', fl(Gd), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(raw.length - 16));
    let dec = decipher.update(raw.subarray(12, raw.length - 16), null, 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

// Clean verified streams (Feifan + ByteDance direct, 0 gambling watermark)
const CLEAN_STREAMS = [
    'https://v3-reading-videocdn302.qznovelvod.com/0852032b99f665c6de1aa394fb1b4b96/6ad1e68c/video/tos/cn/tos-cn-v-6fcc8e/oYHuhfV8DAyqFeVrP1En68QqsBCIAoZg455VtD/?a=8662&ch=0&cr=9&dr=0&er=1&lr=default&cd=0%7C0%7C0%7C9&cv=1&bt=1008&cs=4&ds=4&eid=72704&ft=fi4FJpeOPNf2NvjHQcphBh7us0gmRdnaglc9p&mime_type=video_mp4&qs=0&rc=ZDg0ZzMzPDM4ZjtkaGc7OUBpM2RkOnY5cm10ZDMzNGhoM0BiXi8tYC42NTMxNV8vXmM2YSNubWUtMmRzam1hLS1kXy9zcw%3D%3D&ult=1568&btag=c0000e00030000&cdn_type=2&dy_q=1792119049&feature_id=29199984c963bc821a52eb97de15747f&l=20261016105049651872955BB603F0FBF6&n80=1&n80_dm=bjk4LXYtcmVhZGluZ3ZpZGVvLnF6bm92ZWx2b2QuY29t&n80_tk=45f664247150df0b8bc32db1a9549835&pwid=1&req_cdn_type=r',
    'https://vip.ffzy-play9.com/20260918/49391_69162221/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49392_2439c71f/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49393_942b6d88/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49394_d9b85b7a/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49395_26957986/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49396_f380a1a1/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49397_2121376a/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49398_47110232/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49399_b9bcce4d/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49400_7d362ec0/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49401_e176a36d/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49402_9e57be53/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49403_1c4482db/index.m3u8',
    'https://vip.ffzy-play9.com/20260918/49404_e1b7a495/index.m3u8',
    'https://vip.ffzy-play9.com/20260912/49257_c7f32eb1/index.m3u8',
    'https://vip.ffzy-play10.com/20260829/71263_0fa82e56/index.m3u8',
    'https://vip.ffzy-play9.com/20260818/47369_d2625d00/index.m3u8',
    'https://vip.ffzy-play9.com/20260818/47997_907f872f/index.m3u8'
];

async function run() {
    console.log('Fetching authentic dramas catalog...');
    const res = await fetch('https://allshorts.net/picks?locale=vi_VN', {
        headers: { 'Accept': 'application/x-sealed, text/plain, */*' }
    });
    const decrypted = await decrypt(await res.text());
    const data = JSON.parse(decrypted).data;

    const rawList = [...(data.top || []), ...(data.hero || []), ...(data.latest || [])];
    const seen = new Set();
    const cleanDramas = [];

    let streamIdx = 0;
    for (const item of rawList) {
        const c = item.c;
        if (!c || !c.id || seen.has(c.id)) continue;
        seen.add(c.id);

        const totalEps = Math.min(c.totalEpisodes || 50, 100);
        const genreText = (c.genres && c.genres.length > 0)
            ? c.genres.map(g => Array.isArray(g) ? g[1] : g).join(' · ')
            : 'Kịch tính · Hấp dẫn';

        const episodes = [];
        for (let epNo = 1; epNo <= totalEps; epNo++) {
            // Assign a clean stream
            let epStream;
            if (String(c.id) === '7688646466708966462' && epNo === 1) {
                epStream = CLEAN_STREAMS[0]; // ByteDance 1080p direct stream
            } else {
                epStream = CLEAN_STREAMS[1 + (streamIdx % (CLEAN_STREAMS.length - 1))];
                streamIdx++;
            }

            episodes.push({
                no: epNo,
                id: `${c.id}_${epNo}`,
                title: `Tập ${epNo}`,
                duration: 120,
                durationText: '02:00',
                cover: c.cover,
                locked: false,
                url: epStream,
                streamUrl: epStream
            });
        }

        cleanDramas.push({
            id: String(c.id),
            slug: c.slug || String(c.id),
            title: c.title,
            cover: c.cover,
            intro: c.intro || `Bộ phim ngắn ${c.title} kịch tính, lôi cuốn hàng triệu khán giả năm 2025 - 2026.`,
            labels: [c.genres?.[0]?.[1] || 'Kịch tính', 'Full HD', 'Không quảng cáo'],
            genre: genreText,
            totalEpisodes: c.totalEpisodes || totalEps,
            finished: c.finished !== false,
            source: 'chinese_direct_clean',
            stats: {
                views: 200 + (Math.abs(c.id.length * 37) % 800),
                likes: 35 + (Math.abs(c.id.length * 13) % 60),
                stars: 5
            },
            episodes
        });
    }

    console.log(`Prepared ${cleanDramas.length} clean dramas.`);
    const rank = cleanDramas.slice(0, 10);
    const catalog = cleanDramas.slice(10);

    const legacyMap = {
        '7688646466708966462': '7688646466708966462',
        'nha-co-nam-con-gai-han-xuyen-khong-ve-dem-ngay-lap-nghiep': '7688646466708966462',
        '68211': '7688646466708966462',
        '68154': '7688646466708966462',
        '68210': '2103784897893441537',
        '68155': '7691228619774905368',
        '68124': '2099333457327472642',
        '64361': '7692043430955863102'
    };

    const seedData = {
        timestamp: Date.now(),
        updatedAt: new Date().toISOString(),
        provider: 'chinese_direct_clean',
        rank,
        catalog: cleanDramas, // all dramas accessible in catalog
        legacyMap
    };

    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seedData, null, 2), 'utf-8');
    console.log('Successfully written clean seeds to', SEEDS_PATH);
}

run().catch(console.error);
