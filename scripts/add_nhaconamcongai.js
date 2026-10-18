const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');
const Gd = "223QON86QMVdNyCOZumR4ZLNUmiltER1x4ioU6qCPUs=";

function fl(b64) { return Buffer.from(b64, 'base64'); }

async function decryptAllshorts(encryptedB64) {
    const raw = fl(encryptedB64.trim());
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(12, raw.length - 16);
    const key = fl(Gd);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

async function addNhaCoNamConGai() {
    console.log('Fetching Nha Co Nam Con Gai detail from AllShorts...');
    const res = await axios.get('https://allshorts.net/hongguo/detail/7688646466708966462?locale=vi_VN', {
        headers: { 'Accept': 'application/x-sealed, text/plain, */*' }
    });
    let body = res.data;
    if (typeof body === 'string' && !body.startsWith('{')) {
        body = JSON.parse(await decryptAllshorts(body));
    }

    const d = body.data;
    const directEp1 = 'https://v3-reading-videocdn302.qznovelvod.com/0852032b99f665c6de1aa394fb1b4b96/6ad1e68c/video/tos/cn/tos-cn-v-6fcc8e/oYHuhfV8DAyqFeVrP1En68QqsBCIAoZg455VtD/?a=8662&ch=0&cr=9&dr=0&er=1&lr=default&cd=0%7C0%7C0%7C9&cv=1&bt=1008&cs=4&ds=4&eid=72704&ft=fi4FJpeOPNf2NvjHQcphBh7us0gmRdnaglc9p&mime_type=video_mp4&qs=0&rc=ZDg0ZzMzPDM4ZjtkaGc7OUBpM2RkOnY5cm10ZDMzNGhoM0BiXi8tYC42NTMxNV8vXmM2YSNubWUtMmRzam1hLS1kXy9zcw%3D%3D&ult=1568&btag=c0000e00030000&cdn_type=2&dy_q=1792119049&feature_id=29199984c963bc821a52eb97de15747f&l=20261016105049651872955BB603F0FBF6&n80=1&n80_dm=bjk4LXYtcmVhZGluZ3ZpZGVvLnF6bm92ZWx2b2QuY29t&n80_tk=45f664247150df0b8bc32db1a9549835&pwid=1&req_cdn_type=r';

    // Map episodes: Ep 1 has direct 1080p ByteDance CDN URL, others have ID and placeholder/fallback
    const episodes = (d.episodes || []).slice(0, 100).map((ep, idx) => ({
        no: ep.no || (idx + 1),
        id: ep.id,
        duration: ep.duration || 120,
        durationText: ep.duration ? `${Math.floor(ep.duration / 60)}:${String(Math.floor(ep.duration % 60)).padStart(2, '0')}` : '02:00',
        cover: ep.cover || d.cover,
        locked: false,
        url: idx === 0 ? directEp1 : '',
        streamUrl: idx === 0 ? directEp1 : ''
    }));

    const dramaObj = {
        id: d.id, // '7688646466708966462'
        slug: 'nha-co-nam-con-gai-han-xuyen-khong-ve-dem-ngay-lap-nghiep',
        title: 'Nhà Có Năm Con Gái, Hắn Xuyên Không Về Đêm Ngày Lập Nghiệp',
        cover: d.cover || 'https://allshorts.net/cover/z2zfv1x2/vi_VN-mv78l3fd.jpg',
        intro: d.intro,
        labels: ['Xuyên không', 'Nghịch tập & Vươn lên', 'Gia đình & Tình thân', '1080p Full HD'],
        genre: 'Xuyên không · Nghịch tập · Gia đình & Tình thân',
        totalEpisodes: 1000,
        finished: true,
        source: 'hongguo',
        provider: 'hongguo',
        stats: { views: 212, likes: 45, stars: 5 },
        episodes
    };

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf-8'));
    // Insert at front of rank and catalog
    seeds.rank = [dramaObj, ...seeds.rank.filter(x => x.id !== d.id)];
    seeds.catalog = [dramaObj, ...seeds.catalog.filter(x => x.id !== d.id)];
    if (!seeds.legacyMap) seeds.legacyMap = {};
    seeds.legacyMap['nha-co-nam-con-gai-han-xuyen-khong-ve-dem-ngay-lap-nghiep'] = d.id;

    fs.writeFileSync(SEEDS_PATH, JSON.stringify(seeds, null, 2), 'utf-8');
    console.log('Successfully inserted Nha Co Nam Con Gai into seeds!');
}

addNhaCoNamConGai().catch(console.error);
