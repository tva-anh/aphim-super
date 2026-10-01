const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function buildSeed() {
    console.log('[Seed] Đang thu thập danh sách phim 18+ từ NguonC & PhimAPI...');
    const httpHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    };
    const urls = [];
    for (let p = 1; p <= 61; p++) {
        urls.push('https://phim.nguonc.com/api/films/the-loai/phim-18?page=' + p);
    }
    for (let p = 1; p <= 4; p++) {
        urls.push('https://phimapi.com/v1/api/the-loai/phim-18?page=' + p);
    }

    const results = [];
    // Tải tuần tự nhẹ nhàng hơn theo nhóm 5 requests với 200ms delay để NguonC không bị 502
    const chunkSize = 5;
    for (let i = 0; i < urls.length; i += chunkSize) {
        const chunk = urls.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (u) => {
            for (let retry = 0; retry < 3; retry++) {
                try {
                    return await axios.get(u, { timeout: 8000, headers: httpHeaders });
                } catch (e) {
                    if (retry === 2) console.warn(`[Seed] Bỏ qua ${u} sau 3 lần thử: ${e.message}`);
                    await new Promise(r => setTimeout(r, 500));
                }
            }
            return null;
        });
        const chunkRes = await Promise.all(chunkPromises);
        results.push(...chunkRes);
        await new Promise(r => setTimeout(r, 100));
    }

    const seenSlugs = new Set();
    const movies = [];

    const jpRegex = /\b(nhật|nhat|japan|japanese|jav|tokyo|yua|mikami|hibiki|fukada|tsubasa|hatano|aoi|sora|ozawa|maria|kaede|karen|shirakawa|nagai|yamada|tanaka|sato|watanabe|takahashi|kobayashi|suzuki|matsumoto|inoue|hayashi|yamazaki|mori|abe|ikeda|hashimoto|yamashita|ishikawa|nakajima|maeda|fujita|ogawa|goto|okada|hasegawa|murakami|kondo|saito|ssis|sone|star|mide|ipx|ebod|snis|abw|stars|jul|pred|meyd|miaa|dldss|dass|fc2|carib|1pon|heyzo)\b/i;
    const krRegex = /\b(hàn|han|korea|korean|seoul|gangnam|kim|park|lee|choi|jung|kang|yoon|jang|lim|seo|shin|kwon|hwang|ahn|song|ryu|hong|moon|yang|bae|baek|heo|yoo|noh|kwak|sung|cha|woo|min|jin|eom|won)\b/i;
    const cnRegex = /\b(trung|hoa|china|chinese|hong kong|đài loan|taiwan|bắc kinh|thượng hải|quảng đông|triều|lương|triệu|vương|trần|chu|ngô|tôn|quách|lâm)\b/i;
    const usRegex = /\b(mỹ|my|us|uk|anh|pháp|đức|ý|tây ban nha|brazil|nga|canada|úc|australia|hollywood|american|europe|western)\b/i;

    results.forEach(r => {
        if (r && r.data) {
            const list = r.data.items || r.data.data?.items || [];
            list.forEach(it => {
                const slug = it.slug || it._id;
                if (!slug || seenSlugs.has(slug)) return;
                seenSlugs.add(slug);

                const name = it.name || '';
                const orig = it.origin_name || it.original_name || '';
                const desc = it.description || '';
                const casts = it.casts || '';
                const countries = (Array.isArray(it.country) ? it.country.map(c => c.name || c).join(' ') : (it.country || ''));
                const fullText = (name + ' ' + orig + ' ' + desc + ' ' + casts + ' ' + countries).toLowerCase();

                let matchedCountry = 'viet-nam';
                if (jpRegex.test(fullText)) matchedCountry = 'nhat-ban';
                else if (krRegex.test(fullText)) matchedCountry = 'han-quoc';
                else if (cnRegex.test(fullText)) matchedCountry = 'trung-quoc';
                else if (usRegex.test(fullText)) matchedCountry = 'my';

                const resolveCdnImg = (imgStr) => {
                    if (!imgStr) return '';
                    let s = String(imgStr).trim();
                    if (s.startsWith('http://') || s.startsWith('https://')) {
                        return s.replace('img.phimapi.com', 'phimimg.com')
                                .replace('img.ophimimg.com', 'phimimg.com');
                    }
                    const clean = s.replace(/^\//, '');
                    return clean.startsWith('upload/') || clean.startsWith('uploads/') 
                        ? ('https://phimimg.com/' + clean)
                        : ('https://phimimg.com/uploads/movies/' + clean);
                };

                const thumb = resolveCdnImg(it.thumb_url);
                const poster = resolveCdnImg(it.poster_url || it.thumb_url);

                movies.push({
                    _id: it._id || slug,
                    name: name,
                    slug: slug,
                    origin_name: orig,
                    thumb_url: thumb,
                    poster_url: poster,
                    year: it.year || 2026,
                    quality: it.quality || 'Full HD',
                    lang: it.lang || it.language || 'Vietsub',
                    time: it.time || '',
                    episode_current: it.episode_current || it.current_episode || 'FULL',
                    type: 'single',
                    category: [{ id: 'phim-18', name: 'Phim 18+', slug: 'phim-18' }],
                    country_slug: matchedCountry
                });
            });
        }
    });

    movies.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const seedPath = path.join(dataDir, 'adult-pool-seed.json');
    fs.writeFileSync(seedPath, JSON.stringify(movies, null, 2), 'utf-8');
    console.log(`[Seed] Thành công! Tổng cộng ${movies.length} phim 18+ đã lưu tại ${seedPath}`);
}

buildSeed();
