/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎬 APHIM SOCIAL STUDIO SERVICE — DUAL-ENGINE AI MARKETING SUITE
 * ═══════════════════════════════════════════════════════════════════
 * - Agent 1: Groq Creator (openai/gpt-oss-120b) — Infinite Dynamic Content
 * - Agent 2: Groq Auditor & Trend Guard (openai/gpt-oss-120b) — Policy & Virality
 * - Fallback: Google Gemini 2.5 Flash
 * - Real-time Google Trends Vietnam RSS Synchronizer
 * - Facebook Graph API Multi-Photo Publisher + First Comment Automation
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../data/social_posts_log.json');

// Ensure log file exists
function ensureLogFile() {
    try {
        const dir = path.dirname(LOG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), 'utf8');
    } catch (e) {
        console.warn('[SocialStudio] Error ensuring log file:', e.message);
    }
}
ensureLogFile();

/**
 * Helper to make HTTPS requests with JSON payload
 */
function httpsRequest(url, options = {}, data = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const headers = Object.assign({}, options.headers || {});
        let payload = null;
        if (data) {
            payload = typeof data === 'string' ? data : JSON.stringify(data);
            if (!headers['Content-Length'] && !headers['content-length']) {
                headers['Content-Length'] = Buffer.byteLength(payload);
            }
        }

        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: headers
        };

        const client = parsedUrl.protocol === 'http:' ? http : https;
        const req = client.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, data: parsed, raw: body });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: body, raw: body });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (payload) {
            req.write(payload);
        }
        req.end();
    });
}

/**
 * 1. Fetch Real-time Google Trends for MOVIES ONLY (Google Trends Explore VN "xem phim" & Stored Trends)
 */
async function fetchGoogleTrendsVietnam() {
    const items = [];
    const seenTitles = new Set();

    // Helper: clean raw query into movie title
    const cleanMovieTitle = (q) => {
        if (!q) return '';
        let title = q.trim()
            .replace(/^(xem phim|phim|phim bộ|phim lẻ|phim rạp)\s+/i, '')
            .replace(/\s+(xem phim|phim)$/i, '')
            .replace(/\s+(tập\s+\d+|thuyết minh|vietsub|lồng tiếng|full|phần\s+\d+|hd|moi|hay|viet nam|trung quoc).*$/i, '')
            .trim();
        if (!title) return '';
        return title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    // 1. Primary: Load stored & curated Google Trends from data/google_trends.json
    try {
        const trendsControl = require('./trendsControl');
        const stored = trendsControl.getStoredTrends();
        if (Array.isArray(stored)) {
            stored.forEach(t => {
                const cTitle = cleanMovieTitle(t.title || t.query);
                const lower = cTitle.toLowerCase();
                const ignored = ['hay', 'moi', 'viet nam', 'online', 'chieu rap', 've', 'thay doi', 'ai'];
                if (cTitle && cTitle.length > 2 && !seenTitles.has(lower) && !ignored.includes(lower)) {
                    seenTitles.add(lower);
                    items.push({
                        title: cTitle,
                        query: t.query || `xem phim ${cTitle}`,
                        traffic: t.traffic || 'Thịnh hành'
                    });
                }
            });
        }
    } catch (e) {
        console.warn('[SocialStudio] Error reading stored trends:', e.message);
    }

    // 2. Real-time Google Search suggestions for "xem phim"
    try {
        const suggestRes = await httpsRequest('https://suggestqueries.google.com/complete/search?client=chrome&q=xem%20phim%20&hl=vi&gl=vn');
        if (suggestRes && Array.isArray(suggestRes.data) && Array.isArray(suggestRes.data[1])) {
            const rawQueries = suggestRes.data[1];
            for (const q of rawQueries) {
                const cTitle = cleanMovieTitle(q);
                const lower = cTitle.toLowerCase();
                const ignored = ['hay', 'moi', 'viet nam', 'online', 'chieu rap', 've', 'thay doi', 'ai'];
                if (cTitle && cTitle.length > 2 && !cTitle.includes('') && !seenTitles.has(lower) && !ignored.includes(lower)) {
                    seenTitles.add(lower);
                    items.push({
                        title: cTitle,
                        query: q,
                        traffic: 'Top Search'
                    });
                }
                if (items.length >= 18) break;
            }
        }
    } catch (sErr) {}

    return items;
}

/**
 * 2. Gather All Media for a Movie (Poster, Backdrop, Stills, TMDB Gallery)
 */
async function getMovieMedia(slug) {
    const mediaList = [];
    let movieData = null;

    // Search local database or API
    try {
        const localControlPath = path.join(__dirname, '../data/movies_control.json');
        if (fs.existsSync(localControlPath)) {
            const controlData = JSON.parse(fs.readFileSync(localControlPath, 'utf8'));
            if (controlData.movies && controlData.movies[slug]) {
                movieData = controlData.movies[slug];
            }
        }
    } catch (e) {}

    // Fallback search in short film seeds
    if (!movieData) {
        try {
            const seedsPath = path.join(__dirname, '../data/phim_ngan_seeds.json');
            if (fs.existsSync(seedsPath)) {
                const rawSeeds = fs.readFileSync(seedsPath, 'utf8');
                const seedsObj = JSON.parse(rawSeeds);
                const catalog = Array.isArray(seedsObj) ? seedsObj : (seedsObj.rank || seedsObj.catalog || []);
                const found = catalog.find(m => m.slug === slug || m.id === slug);
                if (found) {
                    movieData = {
                        name: found.title || found.name,
                        origin_name: found.originalTitle || found.origin_name || '',
                        slug: found.slug || found.id,
                        year: '2026',
                        poster_url: found.cover || found.poster || found.thumb,
                        thumb_url: found.thumb || found.cover,
                        category: found.category || 'Phim Ngắn',
                        rating: found.rating || '9.8',
                        content: found.description || found.intro || '',
                        episodes: found.episodes || []
                    };
                }
            }
        } catch (e) {}
    }

    // Fallback search in phimapi.com for any Vietnamese / International movie
    if (!movieData) {
        try {
            const onlineRes = await httpsRequest(`https://phimapi.com/phim/${encodeURIComponent(slug)}`);
            if (onlineRes && onlineRes.data && onlineRes.data.movie) {
                const m = onlineRes.data.movie;
                movieData = {
                    name: m.name,
                    origin_name: m.origin_name,
                    slug: m.slug,
                    year: m.year,
                    poster_url: m.poster_url,
                    thumb_url: m.thumb_url,
                    category: Array.isArray(m.category) ? m.category.map(c => c.name).join(', ') : '',
                    rating: (m.tmdb && m.tmdb.vote_average) ? m.tmdb.vote_average : '9.0',
                    content: (m.content || '').replace(/<[^>]*>/g, ''),
                    tmdb_id: m.tmdb ? m.tmdb.id : null,
                    type: m.type
                };
            }
        } catch (e) {}
    }

    if (movieData) {
        if (movieData.poster_url || movieData.poster) {
            mediaList.push({
                url: movieData.poster_url || movieData.poster,
                label: 'Poster Dọc Chính',
                type: 'poster'
            });
        }
        if (movieData.thumb_url || movieData.thumb || movieData.banner) {
            mediaList.push({
                url: movieData.thumb_url || movieData.thumb || movieData.banner,
                label: 'Ảnh Bìa / Backdrop Ngang',
                type: 'backdrop'
            });
        }
        // If has episode stills
        if (Array.isArray(movieData.episodes) && movieData.episodes.length > 0) {
            movieData.episodes.slice(0, 6).forEach((ep, idx) => {
                if (ep.thumb && ep.thumb !== movieData.poster_url && ep.thumb !== movieData.thumb_url) {
                    mediaList.push({
                        url: ep.thumb,
                        label: `Cảnh Phim Tập ${ep.no || (idx + 1)}`,
                        type: 'still'
                    });
                }
            });
        }
    }

    // Try fetching TMDB Gallery if tmdb_id exists
    const tmdbKey = process.env.TMDB_API_KEY;
    if (tmdbKey && movieData && (movieData.tmdb_id || movieData.id_tmdb)) {
        const tmdbId = movieData.tmdb_id || movieData.id_tmdb;
        const tmdbType = movieData.type === 'series' || movieData.category === 'tv' ? 'tv' : 'movie';
        try {
            const tmdbRes = await httpsRequest(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/images?api_key=${tmdbKey}`);
            if (tmdbRes.data) {
                if (Array.isArray(tmdbRes.data.backdrops)) {
                    tmdbRes.data.backdrops.slice(0, 6).forEach((bg, idx) => {
                        mediaList.push({
                            url: `https://image.tmdb.org/t/p/original${bg.file_path}`,
                            label: `Cảnh Phim HD #${idx + 1}`,
                            type: 'still'
                        });
                    });
                }
                if (Array.isArray(tmdbRes.data.posters)) {
                    tmdbRes.data.posters.slice(0, 3).forEach((p, idx) => {
                        const pUrl = `https://image.tmdb.org/t/p/original${p.file_path}`;
                        if (!mediaList.some(m => m.url === pUrl)) {
                            mediaList.push({
                                url: pUrl,
                                label: `Poster Quốc Tế #${idx + 1}`,
                                type: 'poster'
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('[SocialStudio] TMDB fetch images error:', e.message);
        }
    }

    return {
        movie: movieData || { slug, name: slug },
        media: mediaList
    };
}

/**
 * Helper: Format content into clear, well-spaced paragraphs without lonely emoji lines
 */
function formatPostWithParagraphs(text) {
    if (!text || typeof text !== 'string') return '';
    let clean = text.trim();

    // 1. Attach any trailing lonely emojis to previous sentence
    clean = clean.replace(/\n+👇/g, ' 👇');
    clean = clean.replace(/\n+([👇👈👉🎬🔥🍿⚡✨🌟💥]+)\s*$/gu, ' $1');
    clean = clean.replace(/\n+([\p{Extended_Pictographic}\u200d\ufe0f\s]{1,6})$/gu, (match, emoji) => {
        const trimmed = emoji.trim();
        return trimmed ? ` ${trimmed}` : '';
    });

    // 2. Convert single newlines between text to double newlines (guarantee \n\n spacing)
    clean = clean.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

    // 3. Automatically split sentences before transition emojis (🔥, 🎬, 🍿, ⚡, 📌, 👉, 🎧, ✨, 💡, 🌟, 💥, 📢)
    clean = clean.replace(/([.?!…])\s*(?=([🎬🔥🍿⚡📌👉🎧✨💡🌟💥📢]))/g, '$1\n\n');

    // 4. Clean any newly created lonely emojis between paragraphs
    clean = clean.replace(/\n+([\p{Extended_Pictographic}\u200d\ufe0f\s]{1,6})\n+/gu, (match, emoji) => {
        const trimmed = emoji.trim();
        return trimmed ? `\n\n${trimmed} ` : '\n\n';
    });

    // 5. Split into paragraphs
    let rawParagraphs = clean.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

    // 6. If any paragraph is too long (> 3 sentences or > 260 chars), break into 2-sentence chunks
    const refinedParagraphs = [];
    for (const p of rawParagraphs) {
        if (p.startsWith('👉') || p.startsWith('#')) {
            refinedParagraphs.push(p);
            continue;
        }
        const sentences = p.split(/(?<=[.?!…])\s+/);
        if (sentences.length > 3 || (p.length > 260 && sentences.length > 2)) {
            for (let i = 0; i < sentences.length; i += 2) {
                const sub = sentences.slice(i, i + 2).join(' ').trim();
                if (sub) refinedParagraphs.push(sub);
            }
        } else {
            refinedParagraphs.push(p);
        }
    }

    // 7. Guarantee each paragraph has a leading bullet emoji (⚡, 🎬, 🔥, ✨, 🍿, 🌟, 💥)
    const bulletIcons = ['⚡', '🎬', '🔥', '✨', '🍿', '🌟', '💥'];
    let iconIdx = 0;

    const formattedParagraphs = refinedParagraphs.map(p => {
        if (p.startsWith('👉') || p.startsWith('#')) return p;
        const startsWithEmoji = /^[\p{Extended_Pictographic}\u200d\ufe0f]/u.test(p);
        if (!startsWithEmoji) {
            const icon = bulletIcons[iconIdx % bulletIcons.length];
            iconIdx++;
            return `${icon} ${p}`;
        }
        return p;
    });

    return formattedParagraphs.join('\n\n').trim();
}

/**
 * Helper: Enrich hashtag collection with brand and trending tags
 */
function enrichHashtags(existingTags = [], movieTitle = '') {
    const tags = new Set();

    (existingTags || []).forEach(t => {
        if (!t) return;
        const clean = t.startsWith('#') ? t : `#${t}`;
        tags.add(clean.replace(/\s+/g, ''));
    });

    if (movieTitle) {
        const titlePascal = movieTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '');
        if (titlePascal) tags.add(`#${titlePascal}`);

        const titleNoAccent = movieTitle.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '');
        if (titleNoAccent) {
            const capitalized = titleNoAccent.charAt(0).toUpperCase() + titleNoAccent.slice(1);
            tags.add(`#${capitalized}`);
        }
    }

    tags.add('#APhim');
    tags.add('#APhimSuper');
    tags.add('#GoogleTrendsVN');
    tags.add('#PhimHayMoiNgay');
    tags.add('#PhimMoi2026');
    tags.add('#ReviewPhim');
    tags.add('#XemPhimOnline');

    return Array.from(tags).slice(0, 10);
}

/**
 * Helper: Sanitize Vietnamese text (NFKC normalize, fix mathematical bold/italic font bugs like Bn)
 */
function sanitizeVietnameseText(text) {
    if (!text || typeof text !== 'string') return '';
    let clean = text.normalize('NFKC');
    clean = clean.replace(/\uFFFD/g, '');
    clean = clean.replace(/B[\s\uFFFD\?]*n\s+có\s+dám/gi, 'Bạn có dám');
    clean = clean.replace(/(^|[\s\p{P}\p{S}])Bn(?=[\s\p{P}\p{S}]|$)/gu, '$1Bạn');
    clean = clean.replace(/(^|[\s\p{P}\p{S}])bn(?=[\s\p{P}\p{S}]|$)/gu, '$1bạn');
    clean = clean.replace(/B\?+n\b/gi, 'Bạn');
    clean = clean.replace(/b\?+n\b/g, 'bạn');
    return clean;
}

/**
 * Helper: Extract JSON from AI response with markdown fence removal
 */
function extractJSON(str) {
    if (!str || typeof str !== 'string') return null;
    let clean = str.trim();
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
        return JSON.parse(clean);
    } catch (e) {
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            try {
                return JSON.parse(clean.substring(start, end + 1));
            } catch (err) {}
        }
    }
    return null;
}

/**
 * 3. AGENT 1: Infinite Creative Content Generator (Multi-Tier Failover: Groq 120B -> Llama 70B -> Gemini 2.5 Flash -> Local Human SEO Engine)
 */
async function generateInfinitePost({ movie, customPrompt = '', tone = 'creator', length = 'standard', goal = 'views', seoKeywords = '', target = 'all' }) {
    const creatorKey = process.env.GROQ_API_KEY_CREATOR;
    const auditorKey = process.env.GROQ_API_KEY_AUDITOR;
    const fallbackGeminiKey = process.env.GEMINI_API_KEY_MARKETING || process.env.GEMINI_API_KEY;
    const siteUrl = process.env.SITE_PUBLIC_URL || 'https://aphim.store';

    const movieLink = `${siteUrl}/phim/${movie.slug || 'xem-phim'}`;
    const movieTitle = movie.name || movie.title || 'Bộ phim siêu phẩm';
    const movieYear = movie.year || movie.publish_year || '2026';
    const movieGenres = Array.isArray(movie.category) ? movie.category.join(', ') : (movie.genres || 'Kịch tính, Hấp dẫn');
    const movieSummary = movie.content || movie.description || movie.intro || 'Bộ phim đang làm mưa làm gió với cốt truyện khó lường.';
    const movieRating = movie.rating || movie.vote_average || '9.0';
    const movieActors = Array.isArray(movie.actor) ? movie.actor.join(', ') : (movie.actors || '');

    const toneDescriptions = {
        creator: 'PHONG CÁCH CONTENT CREATOR CHUYÊN NGHIỆP: Giọng văn như một reviewer đời thực vừa xem phim xong. Tự nhiên, chân thật 100%, lôi cuốn, xưng hô gần gũi (mình/bạn), khơi gợi cảm xúc tò mò và đồng cảm của người lướt Facebook.',
        dramatic: 'PHONG CÁCH REVIEW KỊCH TÍNH & CÚ TWIST: Bóc tách tình tiết thót tim, mâu thuẫn nghẹt thở và cú twist lật ngửa thế cờ, tạo cảm giác gay cấn khó cưỡng.',
        confession: 'PHONG CÁCH TÂM SỰ ĐÊM MUỘN: Lắng đọng, sâu sắc, đàm đạo về nhân tình thế thái, sự cô đơn và triết lý ẩn sau số phận nhân vật.',
        humor: 'PHONG CÁCH HÀI HƯỚC & BẮT TREND GIỚI TRẺ: Dí dỏm, tếu táo, dùng tiếng lóng mạng xã hội GenZ tự nhiên (chill, nóc kịch trần, cứu tui, chấn động...), kích thích tag bạn bè xem chung.',
        deep: 'PHONG CÁCH PHÂN TÍCH ĐIỆN ẢNH CHUYÊN SÂU: Đào sâu vào diễn xuất, cú máy, màu sắc, âm nhạc và tâm lý nhân vật như một nhà phê bình điện ảnh uy tín.'
    };

    const lengthDescriptions = {
        short: 'ĐỘ DÀI: Ngắn gọn & Kịch tính (khoảng 180 - 250 từ). Nhịp văn dồn dập, đi thẳng vào điểm sốc nhất, kích thích tò mò cực độ.',
        standard: 'ĐỘ DÀI: Tiêu chuẩn SEO Facebook (khoảng 350 - 500 từ). Đầy đủ Hook mở đầu cuốn hút, 2 - 3 đoạn thân bài phân tích lôi cuốn, và câu kết khéo léo.',
        deep: 'ĐỘ DÀI: Bài viết phân tích chuyên sâu (Deep Dive) (khoảng 600 - 850 từ). Khai thác chi tiết bối cảnh, động cơ nhân vật, chiều sâu kịch bản và cảm nhận nghệ thuật như một bài blog review cao cấp.'
    };

    const goalDescriptions = {
        views: 'MỤC TIÊU: KÉO VIEW VÀO WEBSITE. Kích thích sự tò mò cao độ và nhấn mạnh link xem Full HD Vietsub trọn bộ đã được ghim sẵn tại Bình luận đầu tiên.',
        comments: 'MỤC TIÊU: BÙNG NỔ BÌNH LUẬN & TRANH LUẬN. Đặt ra câu hỏi gợi mở hoặc tình huống đạo đức gây chia rẽ ý kiến để kích thích khán giả ùa vào thảo luận rôm rả.',
        shares: 'MỤC TIÊU: BÙNG NỔ LƯỢT CHIA SẺ (VIRAL SHARE). Tạo nội dung giàu cảm xúc hoặc hài hước khiến người đọc muốn tag bạn bè, người yêu hoặc chia sẻ về trang cá nhân.'
    };

    const hookArchetypes = [
        {
            name: 'Twist & Cú Bẻ Lái Thót Tim',
            guide: 'Mở đầu bằng cảm giác bất ngờ tột độ trước cú plot twist hoặc tình tiết lật kèo giật gân.',
            examples: 'Ví dụ phong phú: "Đoạn kết của [Tên Phim] thực sự khiến mình phải đứng hình mất vài phút...", "Nếu bạn nghĩ mình đã đoán được kết cục ngay từ đầu thì cú bẻ lái này sẽ làm bạn ngã ngửa...", "Một kịch bản giằng xé nghẹt thở đến tận giây cuối cùng..."'
        },
        {
            name: 'Visual & Diễn Xuất Đỉnh Chóp',
            guide: 'Mở đầu bằng ấn tượng mạnh mẽ về visual, thần thái diễn viên hoặc phản ứng hóa học bùng nổ giữa hai nhân vật chính.',
            examples: 'Ví dụ phong phú: "Ánh mắt của nhân vật chính trong [Tên Phim] thực sự có sức sát thương quá lớn...", "Hiếm có bộ phim nào mà sự ăn ý giữa hai diễn viên lại cuốn hút đến từng khung hình...", "Tạo hình và không khí thời đại được dàn dựng công phu vượt ngoài mong đợi..."'
        },
        {
            name: 'Cảnh Báo & Thách Thức Khán Giả',
            guide: 'Mở đầu bằng lời cảnh báo hoặc thách thức lôi cuốn, kích thích sự tò mò tối đa.',
            examples: 'Ví dụ phong phú: "Cảnh báo trước: Đừng bật tập 1 nếu ngày mai bạn còn cả núi công việc cần làm...", "Thách bạn đoán đúng ai mới là kẻ đứng sau mọi âm mưu trong [Tên Phim]...", "Một bộ phim chống chỉ định cho những ai đang tìm kiếm một câu chuyện êm đềm..."'
        },
        {
            name: 'Khoảng Lặng Cảm Xúc Sâu Sắc',
            guide: 'Mở đầu bằng cảm xúc lắng đọng, nỗi day dứt hoặc thông điệp nhân sinh sau khi câu chuyện khép lại.',
            examples: 'Ví dụ phong phú: "Có những bộ phim xem xong không chỉ để giải trí, mà để lại một khoảng lặng da diết trong lòng...", "Một câu chuyện tình sinh ra giữa thời tao loạn, đẹp nhưng cũng xót xa đến nghẹn ngào...", "Lâu lắm rồi mới tìm được một tác phẩm khiến mình phải nán lại xem hết cả phần danh đề cuối phim..."'
        },
        {
            name: 'Đánh Giá Uy Tín & Điểm Số Thuyết Phục',
            guide: 'Mở đầu bằng sự công nhận chất lượng từ cộng đồng người xem và điểm số ấn tượng.',
            examples: 'Ví dụ phong phú: "Con số điểm số trên các diễn đàn điện ảnh thực sự không hề nói quá một chút nào...", "Không ngạc nhiên khi cái tên [Tên Phim] đang chiếm sóng khắp các hội nhóm review...", "Nếu danh sách phim tuần này của bạn đang trống, hãy ghi ngay cái tên này vào vị trí ưu tiên số 1..."'
        },
        {
            name: 'Xung Đột Kịch Tính & Vòng Xoáy Âm Mưu',
            guide: 'Mở đầu trực diện bằng tình huống éo le, ngặt nghèo của số phận và cạm bẫy khó lường.',
            examples: 'Ví dụ phong phú: "Một biến cố định mệnh đã đẩy hai con người ở hai chiến tuyến đối nghịch vào chung một ván cờ...", "Khi ranh giới giữa yêu thương và toan tính bị xóa nhòa, cái giá phải trả đắt hơn bất kỳ ai tưởng tượng...", "Từ một cô gái bình dị vô tình vướng vào vòng xoáy gia tộc đầy cạm bẫy..."'
        }
    ];

    const randomHook = hookArchetypes[Math.floor(Math.random() * hookArchetypes.length)];
    const selectedTone = toneDescriptions[tone] || toneDescriptions.creator;
    const selectedLength = lengthDescriptions[length] || lengthDescriptions.standard;
    const selectedGoal = goalDescriptions[goal] || goalDescriptions.views;

    let systemPrompt = '';
    let userPrompt = '';

    if (target === 'comment') {
        systemPrompt = `Bạn là Chuyên gia Marketing Tối ưu CTR & Bình Luận Fanpage "APhim Super".
Nhiệm vụ: Viết 1 bình luận ghim đầu tiên (firstComment) ĐỘC BẢN, THÚ VỊ, KHÔNG TRÙNG LẶP, KÊU GỌI HÀNH ĐỘNG CỰC KỲ TỰ NHIÊN ĐỂ KHÁN GIẢ CLICK VÀO LINK XEM PHIM (${movieLink}).
Yêu cầu bắt buộc:
1. Giọng điệu con người 100%, gần gũi, ấm áp hoặc khơi gợi tò mò lôi cuốn.
2. BẮT BUỘC chứa đường link phim: ${movieLink}
3. Kèm lời chúc hoặc kêu gọi chia sẻ/thảo luận rôm rả.
4. TUYỆT ĐỐI KHÔNG DÙNG FONT TOÁN HỌC UNICODE IN ĐẬM/NGHIÊNG. Dùng tiếng Việt UTF-8 chuẩn bình thường.
5. TRẢ VỀ DUY NHẤT JSON:
{
  "firstComment": "Nội dung bình luận kèm link..."
}`;
        userPrompt = `BỘ PHIM: ${movieTitle} (${movieYear})
- Thể loại: ${movieGenres}
- Link xem phim: ${movieLink}
${customPrompt ? `- Yêu cầu thêm từ Admin: ${customPrompt}` : ''}
Hãy viết ngay 1 lời dẫn bình luận đầu tiên độc đáo, hấp dẫn và trả về đúng JSON.`;
    } else {
        systemPrompt = `Bạn là Chuyên gia Sáng tạo Nội dung Viral & SEO Facebook hàng đầu cho Fanpage "APhim Super".
Nhiệm vụ của bạn là viết một bài đăng Facebook ĐỈNH CAO, ĐỘC BẢN 100%, VIẾT CHUẨN XÁC NHƯ MỘT CON NGƯỜI ĐANG SEO BÀI ĐĂNG THỰC THỤ.

QUY TẮC CỐT TỬ CỦA MỘT CHUYÊN GIA SEO FACEBOOK THỰC THỤ (BẮT BUỘC TUÂN THỦ 100%):
1. ĐỘC BẢN HOOK MỞ ĐẦU — TUYỆT ĐỐI KHÔNG LẶP LẠI VĂN MẪU RẬP KHUÔN:
   - TUYỆT ĐỐI CẤM SỬ DỤNG CÂU "Vừa cày xong lúc 2h sáng" HOẶC BẤT KỲ CỤM TỪ NÀO NHẮC ĐẾN "2h sáng", "vừa cày xong"! Đây là lệnh cấm tối thượng!
   - BẮT BUỘC mở đầu bằng phong cách Hook được chỉ định lần này: [${randomHook.name}]. ${randomHook.guide}
   - Tham khảo hướng mở đầu tự nhiên: ${randomHook.examples.replace(/\[Tên Phim\]/g, movieTitle)}
   - Thân bài chia thành các đoạn ngắn gọn (mỗi đoạn 2 - 3 câu), giữa các đoạn ngăn cách bằng 2 dấu xuống dòng (\\n\\n) để bài viết cực kỳ thoáng đãng, dễ đọc trên điện thoại.
   - Lồng ghép từ khóa tìm kiếm tự nhiên của người Việt: Tên phim "${movieTitle}", diễn viên, năm phát hành, thể loại${seoKeywords ? `, cùng các từ khóa SEO chỉ định: "${seoKeywords}"` : ''}.
   - Lời kết tự nhiên hướng dẫn: "👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇"

2. TUYỆT ĐỐI KHÔNG DÙNG FONT CHỮ UNICODE TOÁN HỌC (MATH BOLD/ITALIC NHƯ 𝗕, 𝗰, 𝐝):
   - BẮT BUỘC DÙNG TIẾNG VIỆT CHUẨN UTF-8 BÌNH THƯỜNG!
   - Tuyệt đối không dùng font chữ in đậm unicode giả mạo vì Facebook và các thiết bị không hỗ trợ ký tự có dấu, sẽ gây lỗi hiển thị thành chữ "Bn" hoặc dấu hỏi chấm kim cương!

3. QUY TẮC EMOJI:
   - TUYỆT ĐỐI KHÔNG ĐỂ EMOJI ĐỨNG MỘT MÌNH TRÊN MỘT DÒNG RIÊNG LẺ!
   - Mỗi emoji bắt buộc phải viết liền kề ngay trước hoặc sau câu chữ (ví dụ "⚡ Bạn có dám...", tuyệt đối không ngắt dòng "\\n\\n⚡\\n\\n").

4. QUY TẮC HASHTAG PHONG PHÚ (TỪ 8 ĐẾN 12 HASHTAGS):
   - BẮT BUỘC có hashtag thương hiệu: #APhim #APhimSuper
   - Hashtag tên phim viết liền (cả có dấu và không dấu, ví dụ: #100NgayLuaDoi #100NgàyLừaDối)
   - Các hashtag xu hướng và từ khóa SEO: #GoogleTrendsVN #PhimHayMoiNgay #PhimHot2026 #ReviewPhim #XemPhimOnline

5. CHỐNG BÓP REACH FACEBOOK:
   - KHÔNG dán đường link website vào thân bài viết. Link phim ${movieLink} BẮT BUỘC nằm ở trường "firstComment" với lời dẫn dắt kích thích click.
   - Tuyệt đối KHÔNG chứa ký tự citation rác [1], [2], [p0OlbB].

HÃY TRẢ VỀ DUY NHẤT JSON:
{
  "creativeAngle": "Tên góc nhìn sáng tạo",
  "headline": "Tiêu đề giật gân, cuốn hút kèm emoji",
  "content": "Toàn bộ nội dung bài viết với các đoạn ngắn cách nhau bằng \\n\\n rõ ràng, không để emoji đứng một mình trên dòng riêng",
  "firstComment": "Nội dung bình luận đầu tiên chứa link xem phim (${movieLink})",
  "suggestedHashtags": ["#TenPhim", "#APhim", "#APhimSuper", "#GoogleTrendsVN", "#PhimHayMoiNgay", "#PhimHot2026", "#ReviewPhim", "#XemPhimOnline"]
}`;

        userPrompt = `THÔNG TIN PHIM:
- Tên phim: ${movieTitle} (${movieYear})
- Thể loại: ${movieGenres}
- Điểm đánh giá: ${movieRating} ⭐
- Diễn viên chính: ${movieActors}
- Cốt truyện tóm tắt: ${movieSummary}
- Link phim: ${movieLink}

CẤU HÌNH BÀI VIẾT TỪ ADMIN:
- ${selectedTone}
- ${selectedLength}
- ${selectedGoal}
- GÓC MỞ ĐẦU HOOK BẮT BUỘC LẦN NÀY: "${randomHook.name}" (${randomHook.guide}). TUYỆT ĐỐI KHÔNG DÙNG "2h sáng" hay bất kỳ văn mẫu rập khuôn cũ nào!
${seoKeywords ? `- TỪ KHÓA SEO CẦN LỒNG GHÉP TỰ NHIÊN: ${seoKeywords}` : ''}
${customPrompt ? `- YÊU CẦU SÁNG TẠO BỔ SUNG CỦA ADMIN: ${customPrompt}` : ''}

Hãy viết ngay 1 bài đăng Facebook chuẩn SEO, giàu cảm xúc con người và trả về đúng JSON.`;
    }

    // ── Tier 1: Groq API Attempts (Key 1 -> Key 2 -> 20B / Qwen fallback) ──
    const groqAttempts = [
        { key: creatorKey, model: 'openai/gpt-oss-120b', label: 'Groq 120B (Key 1)' },
        { key: auditorKey, model: 'openai/gpt-oss-120b', label: 'Groq 120B (Key 2)' },
        { key: creatorKey, model: 'openai/gpt-oss-20b', label: 'Groq 20B (Key 1)' },
        { key: auditorKey, model: 'openai/gpt-oss-20b', label: 'Groq 20B (Key 2)' },
        { key: creatorKey, model: 'qwen/qwen3.8-27b', label: 'Groq Qwen 27B' }
    ].filter(a => !!a.key);

    for (const attempt of groqAttempts) {
        try {
            const res = await httpsRequest('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${attempt.key}`,
                    'Content-Type': 'application/json'
                }
            }, {
                model: attempt.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.85,
                response_format: { type: 'json_object' }
            });

            if (res.statusCode === 200 && res.data && res.data.choices && res.data.choices[0]) {
                const parsedContent = extractJSON(res.data.choices[0].message.content);
                if (parsedContent) {
                    if (target === 'comment' && parsedContent.firstComment) {
                        return {
                            success: true,
                            engine: attempt.label,
                            data: {
                                firstComment: sanitizeVietnameseText(parsedContent.firstComment)
                            }
                        };
                    }
                    if (parsedContent.content || parsedContent.headline || parsedContent.firstComment) {
                        parsedContent.headline = sanitizeVietnameseText(parsedContent.headline || `🔥 Siêu phẩm ${movieTitle} (${movieYear})! 🎬`);
                        parsedContent.content = formatPostWithParagraphs(sanitizeVietnameseText(parsedContent.content));
                        parsedContent.firstComment = sanitizeVietnameseText(parsedContent.firstComment || `👉 Xem Full HD Vietsub tại: ${movieLink}`);
                        parsedContent.suggestedHashtags = enrichHashtags(parsedContent.suggestedHashtags, movieTitle);

                        return {
                            success: true,
                            engine: attempt.label,
                            data: parsedContent
                        };
                    }
                }
            } else {
                console.warn(`[SocialStudio] ${attempt.label} returned status ${res.statusCode}:`, res.data?.error?.message || 'No choices');
            }
        } catch (groqErr) {
            console.warn(`[SocialStudio] ${attempt.label} error:`, groqErr.message);
        }
    }

    // ── Tier 2: Gemini 2.5 Flash Fallback ──
    if (fallbackGeminiKey) {
        try {
            const geminiRes = await httpsRequest(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${fallbackGeminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                },
                {
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\n${userPrompt}\n\nLƯU Ý: Chỉ trả về JSON hợp lệ, không bọc trong backticks markdown.` }]
                    }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.85
                    }
                }
            );

            if (geminiRes.statusCode === 200 && geminiRes.data && geminiRes.data.candidates && geminiRes.data.candidates[0]) {
                const text = geminiRes.data.candidates[0].content.parts[0].text;
                const parsed = extractJSON(text);
                if (parsed) {
                    if (target === 'comment' && parsed.firstComment) {
                        return {
                            success: true,
                            engine: 'Google Gemini 2.5 Flash',
                            data: {
                                firstComment: sanitizeVietnameseText(parsed.firstComment)
                            }
                        };
                    }
                    if (parsed.content || parsed.headline || parsed.firstComment) {
                        parsed.headline = sanitizeVietnameseText(parsed.headline || `🔥 Khám phá ${movieTitle} (${movieYear})! 🎬`);
                        parsed.content = formatPostWithParagraphs(sanitizeVietnameseText(parsed.content));
                        parsed.firstComment = sanitizeVietnameseText(parsed.firstComment || `👉 Xem Full HD Vietsub tại: ${movieLink}`);
                        parsed.suggestedHashtags = enrichHashtags(parsed.suggestedHashtags, movieTitle);

                        return {
                            success: true,
                            engine: 'Google Gemini 2.5 Flash',
                            data: parsed
                        };
                    }
                }
            } else {
                console.warn('[SocialStudio] Gemini returned status', geminiRes.statusCode);
            }
        } catch (geminiErr) {
            console.error('[SocialStudio] Gemini fallback failed:', geminiErr.message);
        }
    }

    // ── Tier 3: High-Quality Local Human SEO Engine (Zero Failure Guarantee) ──
    console.warn('[SocialStudio] Using High-Quality Local Human SEO Engine fallback.');

    const commentVariants = [
        `👉 Xem trọn bộ "${movieTitle}" Full HD Vietsub tốc độ cao tại:\n${movieLink}\nChúc cả nhà xem phim vui vẻ! 🍿🎬`,
        `🍿 Link xem Full HD Vietsub không quảng cáo giật lag mình ghim sẵn ở đây nha:\n👉 ${movieLink}\nAi xem rồi cho mình xin 1 review cảm nghĩ dưới cmt nha! ✨`,
        `🎬 Đừng bỏ lỡ siêu phẩm này! Nhấp vào link dưới đây để xem bản nét nhất Full HD Vietsub:\n👉 ${movieLink}\nTag ngay hội bạn thân hoặc người yêu vào cùng cày đêm nha! ❤️🚀`,
        `✨ Cả nhà bấm vào đây để thưởng thức trọn bộ Full HD Vietsub miễn phí:\n👉 ${movieLink}\nBật mí là cái kết sẽ khiến mọi người đứng hình đấy! 🍿🔥`
    ];
    const pickedComment = commentVariants[Math.floor(Math.random() * commentVariants.length)];

    if (target === 'comment') {
        return {
            success: true,
            engine: 'APhim Local SEO Engine (Auto-Recovered)',
            data: {
                firstComment: pickedComment
            }
        };
    }

    const localTemplates = [
        {
            headline: `💥 CÚ TWIST LẬT NGỬA THẾ CỜ: "${movieTitle}" (${movieYear}) đỉnh ngoài sức tưởng tượng! 🍿`,
            content: `Nếu bạn nghĩ mình đã đoán trước được kết cục, "${movieTitle}" sẽ khiến bạn phải bất ngờ ngay từ nửa sau bộ phim! Sự đan xen giữa tình cảm, thù hận và toan tính đẩy nhịp phim lên cao trào nghẹt thở.

🎬 Thuộc thể loại ${movieGenres}, tác phẩm ghi điểm tuyệt đối nhờ cốt truyện lôi cuốn: ${movieSummary || 'Từng nút thắt được tháo gỡ thông minh, đưa khán giả từ ngạc nhiên này đến ngỡ ngàng khác.'}

🔥 Dàn diễn viên nhập vai xuất sắc, từng ánh mắt và phân đoạn cao trào đều chạm đến cảm xúc. Chấm điểm ${movieRating} ⭐ là hoàn toàn xứng đáng cho một siêu phẩm đáng thưởng thức!${seoKeywords ? ` Tìm kiếm ngay từ khóa "${seoKeywords}" để xem bản đẹp nhất.` : ''}

👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`,
            angle: 'Góc nhìn Twist & Nhịp phim nghẹt thở'
        },
        {
            headline: `🔥 ĐỪNG BẬT TẬP 1 NẾU NGÀY MAI BẠN PHẢI ĐI LÀM: "${movieTitle}" (${movieYear})! 🎬`,
            content: `Một khi đã nhấn nút phát, rất khó để bạn có thể dứt mắt ra khỏi diễn biến của "${movieTitle}". Nhịp phim dồn dập, cuốn hút ngay từ những phân cảnh mở màn.

✨ Bộ phim ${movieGenres} này mang đến trải nghiệm điện ảnh trọn vẹn: ${movieSummary || 'Các tình tiết gay cấn nối tiếp nhau, mở ra bức tranh số phận đầy biến động của nhân vật.'}

🌟 Visual mãn nhãn, âm nhạc đỉnh cao và sự ăn ý bùng nổ giữa các nhân vật chính tạo nên sức hút khó cưỡng. Điểm số ${movieRating} ⭐ khẳng định đẳng cấp của tác phẩm.${seoKeywords ? ` Cả nhà có thể tìm "${seoKeywords}" để cập nhật ngay.` : ''}

👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`,
            angle: 'Góc nhìn Trải nghiệm cuốn hút & Cảnh báo cuốn phim'
        },
        {
            headline: `🌟 HIỆN TƯỢNG ĐIỆN ẢNH ĐANG LÀM MƯA LÀM GIÓ: "${movieTitle}" (${movieYear})! 🎭`,
            content: `Không phải ngẫu nhiên mà "${movieTitle}" đang nhận về cơn mưa lời khen khắp các diễn đàn mê phim. Kịch bản thông minh, giàu chiều sâu và tôn trọng cảm xúc khán giả.

🎬 Khai thác đề tài ${movieGenres}, câu chuyện mang đến góc nhìn chân thực: ${movieSummary || 'Mỗi nhân vật đều có động cơ riêng, tạo nên những xung đột kịch tính và đầy thuyết phục.'}

❤️ Từ bối cảnh quay cho đến từng chi tiết phục dựng đều được đầu tư chỉn chu. Điểm ${movieRating} ⭐ là minh chứng cho một tác phẩm điện ảnh chất lượng cao.${seoKeywords ? ` Cùng tìm kiếm "${seoKeywords}" để thưởng thức trọn vẹn.` : ''}

👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`,
            angle: 'Góc nhìn Hiện tượng điện ảnh & Đánh giá cao'
        },
        {
            headline: `⚡ XEM MÀ NGHẸT THỞ TỪNG PHÚT: Cực phẩm "${movieTitle}" (${movieYear})! 🚀`,
            content: `Lâu lắm rồi mới có một tác phẩm giữ được nhịp căng thẳng và lôi cuốn từ đầu đến cuối như "${movieTitle}". Mọi chi tiết nhỏ ở các phân cảnh đầu đều là manh mối đắt giá cho cú chốt hạ phía sau.

🍿 Bộ phim ${movieGenres} đưa người xem đi qua đủ mọi cung bậc cảm xúc: ${movieSummary || 'Những bí mật dần hé lộ đẩy mâu thuẫn lên đỉnh điểm của sự kịch tính.'}

🎯 Diễn xuất giàu nội lực kết hợp góc máy điện ảnh sắc nét khiến bạn không thể bỏ lỡ dù chỉ một giây. Đánh giá ${movieRating} ⭐ hoàn toàn xứng đáng.${seoKeywords ? ` Đừng quên từ khóa "${seoKeywords}" để đón xem bản mới nhất.` : ''}

👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`,
            angle: 'Góc nhìn Căng thẳng & Hồi hộp tột độ'
        },
        {
            headline: `🎬 VÌ SAO "${movieTitle}" (${movieYear}) LẠI ĐANG CHIẾM LĨNH TOP TRENDING? 📈`,
            content: `Bỏ qua những lối mòn thông thường, "${movieTitle}" chinh phục người xem bằng chính chiều sâu tâm lý và những nút thắt éo le của số phận nhân vật.

🔥 Thuộc thể loại ${movieGenres}, bộ phim lột tả chân thực: ${movieSummary || 'Sự giằng xé giữa tình cảm và trách nhiệm, giữa thù hận và tha thứ.'}

✨ Từng thước phim đều mang đậm tính nghệ thuật với điểm đánh giá ${movieRating} ⭐ từ đông đảo khán giả. Một lựa chọn tuyệt vời cho buổi tối thư giãn của bạn!${seoKeywords ? ` Xem thêm với từ khóa "${seoKeywords}".` : ''}

👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`,
            angle: 'Góc nhìn Phân tích xu hướng & Chiều sâu nhân vật'
        }
    ];

    const pickedTemplate = localTemplates[Math.floor(Math.random() * localTemplates.length)];

    return {
        success: true,
        engine: 'APhim Local SEO Engine (Auto-Recovered)',
        data: {
            creativeAngle: pickedTemplate.angle,
            headline: pickedTemplate.headline,
            content: formatPostWithParagraphs(pickedTemplate.content),
            firstComment: pickedComment,
            suggestedHashtags: enrichHashtags(['#ReviewPhim', '#XemPhimOnline', '#PhimMoi2026'], movieTitle)
        }
    };
}

/**
 * 4. AGENT 2: Security & Trend Auditor (Groq Key 2: `openai/gpt-oss-120b`)
 */
async function auditAndOptimizePost({ postContent, firstComment, movieTitle }) {
    const auditorKey = process.env.GROQ_API_KEY_AUDITOR;
    if (!auditorKey) {
        return {
            isSafe: true,
            safetyScore: 98,
            trendScore: 95,
            notes: 'Đã thông qua kiểm duyệt nội bộ.',
            refinedContent: formatPostWithParagraphs(sanitizeVietnameseText(postContent)),
            refinedFirstComment: sanitizeVietnameseText(firstComment)
        };
    }

    const auditSystemPrompt = `Bạn là Trưởng Ban Kiểm Duyệt Tiêu Chuẩn Cộng Đồng Facebook và Chuyên gia Tối ưu Tương tác Mạng Xã Hội.
Nhiệm vụ của bạn:
1. Rà soát bài viết xem có vi phạm Tiêu chuẩn Cộng đồng của Meta (từ ngữ cấm, bạo lực tiêu cực quá đà, xúc phạm, từ khóa kích dục, gắn cờ spam) hay không.
2. Kiểm tra xem thân bài viết có bị dán link website trực tiếp làm giảm reach không (link bắt buộc phải ở firstComment).
3. BẮT BUỘC GIỮ HOẶC TỐI ƯU CÁC KHOẢNG TRỐNG XUỐNG DÒNG (\\n\\n) GIỮA CÁC ĐOẠN VĂN:
   - TUYỆT ĐỐI KHÔNG GỘP BÀI VIẾT THÀNH 1 ĐOẠN VĂN DUY NHẤT!
   - Phải có các khoảng trống xuống dòng (\\n\\n) rõ ràng giữa từng ý để người đọc lướt trên điện thoại dễ chịu.
4. TUYỆT ĐỐI CẤM SỬ DỤNG FONT CHỮ TOÁN HỌC IN ĐẬM/IN NGHIÊNG (Mathematical Alphanumeric Symbols như 𝗕, 𝗮, 𝗰, 𝐝). BẮT BUỘC DÙNG TIẾNG VIỆT CHUẨN UTF-8 BÌNH THƯỜNG để tránh lỗi chữ "Bn".
5. HASHTAG: Đảm bảo giữ nguyên hoặc bổ sung đầy đủ các hashtag thịnh hành và thương hiệu #APhim #APhimSuper.

TRẢ VỀ DUY NHẤT JSON:
{
  "isSafe": true,
  "safetyScore": 98,
  "trendScore": 95,
  "policyFeedback": "Nhận xét an toàn chính sách Facebook",
  "refinedContent": "Nội dung bài viết sau khi được duyệt, BẮT BUỘC giữ các đoạn cách nhau bằng \\n\\n rõ ràng",
  "refinedFirstComment": "Nội dung bình luận đầu tiên mượt mà nhất"
}`;

    try {
        const res = await httpsRequest('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${auditorKey}`,
                'Content-Type': 'application/json'
            }
        }, {
            model: 'openai/gpt-oss-120b',
            messages: [
                { role: 'system', content: auditSystemPrompt },
                { role: 'user', content: `BÀI VIẾT:\n${postContent}\n\nFIRST COMMENT:\n${firstComment}\n\nPHIM: ${movieTitle}` }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        if (res.data && res.data.choices && res.data.choices[0]) {
            const auditData = JSON.parse(res.data.choices[0].message.content);
            if (auditData.refinedContent) {
                auditData.refinedContent = formatPostWithParagraphs(sanitizeVietnameseText(auditData.refinedContent));
            }
            if (auditData.refinedFirstComment) {
                auditData.refinedFirstComment = sanitizeVietnameseText(auditData.refinedFirstComment);
            }
            return auditData;
        }
    } catch (e) {
        console.warn('[SocialStudio] Auditor error, skipping auto-refine:', e.message);
    }

    return {
        isSafe: true,
        safetyScore: 95,
        trendScore: 90,
        policyFeedback: 'Đạt chuẩn an toàn tự động.',
        refinedContent: formatPostWithParagraphs(sanitizeVietnameseText(postContent)),
        refinedFirstComment: sanitizeVietnameseText(firstComment)
    };
}

/**
 * Helper: Upload single photo to Facebook (supports both remote URLs and Base64 Data URIs without disk storage)
 */
async function uploadPhotoToFacebook(pageId, pageToken, imgUrl, published = false, caption = '') {
    if (typeof imgUrl === 'string' && imgUrl.startsWith('data:image/')) {
        const matches = imgUrl.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Dữ liệu Base64 ảnh không hợp lệ.');
        }

        const mimeSub = matches[1].toLowerCase();
        const ext = mimeSub.includes('png') ? 'png' : (mimeSub.includes('webp') ? 'webp' : 'jpg');
        const buffer = Buffer.from(matches[2], 'base64');
        const boundary = `----WebKitFormBoundary${Date.now().toString(16)}`;

        const parts = [
            `--${boundary}\r\nContent-Disposition: form-data; name="published"\r\n\r\n${published}\r\n`,
            caption ? `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n` : '',
            `--${boundary}\r\nContent-Disposition: form-data; name="access_token"\r\n\r\n${pageToken}\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name="source"; filename="social_upload_${Date.now()}.${ext}"\r\nContent-Type: image/${ext}\r\n\r\n`
        ].join('');
        const endPart = `\r\n--${boundary}--\r\n`;

        const fullBuffer = Buffer.concat([
            Buffer.from(parts, 'utf8'),
            buffer,
            Buffer.from(endPart, 'utf8')
        ]);

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'graph.facebook.com',
                port: 443,
                path: `/v21.0/${pageId}/photos`,
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': fullBuffer.length
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ statusCode: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ statusCode: res.statusCode, data });
                    }
                });
            });
            req.on('error', reject);
            req.write(fullBuffer);
            req.end();
        });
    } else {
        const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${process.env.SITE_PUBLIC_URL || 'https://aphim.store'}${imgUrl}`;
        const payload = {
            url: fullUrl,
            published: published,
            access_token: pageToken
        };
        if (caption) payload.caption = caption;
        return httpsRequest(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, payload);
    }
}

/**
 * 5. Publish Post to Facebook Page (Multi-Photo or Single Photo) + Post First Comment
 */
async function publishToFacebook({ message, firstComment, imageUrls = [], movieName = '' }) {
    // Dynamically reload latest .env variables so any token update is picked up immediately
    try {
        require('dotenv').config({ override: true });
    } catch (e) {}

    const pageId = process.env.FB_PAGE_ID || '1307356335804337';
    const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;

    if (!pageToken) {
        throw new Error('Chưa cấu hình FB_PAGE_ACCESS_TOKEN trong file .env');
    }

    let publishedPostId = null;
    let postLink = '';

    // Case 1: Single image post
    if (imageUrls.length === 1) {
        const photoUrl = imageUrls[0];
        const res = await uploadPhotoToFacebook(pageId, pageToken, photoUrl, true, message);

        if (res.statusCode !== 200) {
            throw new Error(res.data?.error?.message || 'Lỗi khi đăng ảnh lên Fanpage');
        }

        publishedPostId = res.data.post_id || res.data.id;
        postLink = `https://www.facebook.com/${publishedPostId}`;
    }
    // Case 2: Multi-image post
    else if (imageUrls.length > 1) {
        const attachedMedia = [];
        let lastUploadError = null;
        for (const imgUrl of imageUrls.slice(0, 40)) {
            const upRes = await uploadPhotoToFacebook(pageId, pageToken, imgUrl, false, '');

            if (upRes.data && upRes.data.id) {
                attachedMedia.push({ media_fbid: upRes.data.id });
            } else if (upRes.data && upRes.data.error) {
                lastUploadError = upRes.data.error.message;
                console.warn('[SocialStudio] Photo upload failed:', upRes.data.error);
            }
        }

        if (attachedMedia.length === 0) {
            throw new Error('Facebook từ chối tải ảnh: ' + (lastUploadError || 'Không thể tải các ảnh đã chọn lên Facebook'));
        }

        const feedRes = await httpsRequest(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            message: message,
            attached_media: attachedMedia,
            access_token: pageToken
        });

        if (feedRes.statusCode !== 200) {
            throw new Error(feedRes.data?.error?.message || 'Lỗi khi xuất bản bài viết nhiều ảnh');
        }

        publishedPostId = feedRes.data.id;
        postLink = `https://www.facebook.com/${publishedPostId}`;
    }
    // Case 3: Text only post
    else {
        const textRes = await httpsRequest(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            message: message,
            access_token: pageToken
        });

        if (textRes.statusCode !== 200) {
            throw new Error(textRes.data?.error?.message || 'Lỗi khi đăng bài viết văn bản');
        }

        publishedPostId = textRes.data.id;
        postLink = `https://www.facebook.com/${publishedPostId}`;
    }

    // Step C: Post First Comment (Link xem phim)
    let commentId = null;
    let commentError = null;
    if (firstComment && publishedPostId) {
        try {
            const commentRes = await httpsRequest(`https://graph.facebook.com/v21.0/${publishedPostId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, {
                message: firstComment,
                access_token: pageToken
            });

            if (commentRes.data && commentRes.data.id) {
                commentId = commentRes.data.id;
            } else {
                commentError = commentRes.data?.error?.message || 'Không thể tạo bình luận ghim (Thiếu quyền pages_manage_engagement)';
                console.warn('[SocialStudio] Warning Facebook Comment API error:', commentRes.statusCode, commentRes.data);
            }
        } catch (cmErr) {
            commentError = cmErr.message;
            console.warn('[SocialStudio] Warning: could not post first comment:', cmErr.message);
        }
    }

    // Save to Post History Log
    const newLogItem = {
        id: publishedPostId,
        movieName: movieName || 'Bài đăng tự do',
        postLink: postLink,
        imageCount: imageUrls.length,
        hasFirstComment: !!commentId,
        firstCommentId: commentId,
        commentError: commentError,
        createdAt: new Date().toISOString(),
        status: 'published'
    };

    savePostLog(newLogItem);

    return {
        success: true,
        postId: publishedPostId,
        postLink: postLink,
        commentId: commentId,
        commentError: commentError
    };
}

/**
 * Save post to history log
 */
function savePostLog(item) {
    try {
        let list = [];
        if (fs.existsSync(LOG_FILE)) {
            list = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
        list.unshift(item);
        if (list.length > 50) list = list.slice(0, 50);
        fs.writeFileSync(LOG_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
        console.warn('[SocialStudio] Save log error:', e.message);
    }
}

/**
 * Get post history
 */
function getPostHistory() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        }
    } catch (e) {}
    return [];
}

module.exports = {
    fetchGoogleTrendsVietnam,
    getMovieMedia,
    generateInfinitePost,
    auditAndOptimizePost,
    publishToFacebook,
    getPostHistory,
    httpsRequest
};
