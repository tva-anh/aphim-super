// ================================================================
// A PHIM – Hero Banner v11 (Real Data & Real TMDB Logos)
// Interactive Slide System: Click Thumbnail + Swipe/Drag
// + Real merged metadata from /api/movie-merged/:slug
// + Official TMDB transparent title logos
// ================================================================

// 7 Phim Chính Thức Nổi Bật (Curated 100% Real Data)
const DEFAULT_HERO_SLIDES = [
    {
        slug: 'nhat-au-xuan',
        name: 'Nhất Âu Xuân',
        origin_name: 'Spring Of The Blade',
        year: '2026',
        quality: 'FHD',
        age: 'T13',
        episode_current: 'Tập 30',
        content: '"Người đàn ông sát phạt quyết đoán, thâm sâu mưu mô" Thẩm Nhuận và cô gái "thông minh tỉnh táo như bông sen đen" Tạ Thanh Viên trở thành lưỡi dao của nhau, cùng nhau bước trên con đường báo thù đan xen trong lý trí và tình cảm. Giữa những cuộc đấu đá công khai và âm thầm...',
        thumb_url: 'https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg',
        poster_url: 'https://phimimg.com/uploads/movies/20260917/nhat-au-xuan-poster.webp',
        category: [{ name: 'Chính Kịch', slug: 'chinh-kich' }, { name: 'Gia Đình', slug: 'gia-dinh' }],
        tmdb: { id: 294990, type: 'tv', vote_average: 9.5 },
        imdb: { id: 'tt45956347', vote_average: 9.5 },
        logoUrl: 'https://image.tmdb.org/t/p/w500/uyABqIMLGBYCrLkeIrt6k7WEaK2.png'
    },
    {
        slug: 'minecraft',
        name: 'Một bộ phim Minecraft',
        origin_name: 'A Minecraft Movie',
        year: '2025',
        quality: 'FHD',
        age: 'T13',
        episode_current: 'Full',
        content: 'Chào mừng bạn đến với thế giới của Minecraft, nơi sự sáng tạo không chỉ giúp bạn chế tạo mà còn là yếu tố quan trọng để sống sót! Bốn kẻ lạc lõng bất ngờ bị kéo qua một cánh cổng bí ẩn vào Overworld...',
        thumb_url: 'https://image.tmdb.org/t/p/w1280/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
        poster_url: 'https://vsmov.com/storage/images/2Nti3gYAX513wvhp8IiLL6ZDyOm.jpg',
        category: [{ name: 'Giả Tưởng', slug: 'gia-tuong' }, { name: 'Phiêu Lưu', slug: 'phieu-luu' }],
        tmdb: { id: 950387, type: 'movie', vote_average: 6.2 },
        imdb: { id: 'tt3566834', vote_average: 6.2 },
        logoUrl: 'https://image.tmdb.org/t/p/w500/5gFN6sNEuzTwx2BY2BrN795JwZl.png'
    },
    {
        slug: 'quat-mo-trung-ma',
        name: 'Quật Mộ Trùng Ma',
        origin_name: 'Exhuma',
        year: '2024',
        quality: 'FHD',
        age: 'T18',
        episode_current: 'Full',
        content: 'Hai pháp sư, một thầy phong thuỷ và một chuyên gia khâm liệm cùng hợp lực khai quật ngôi mộ bị nguyền rủa của một gia đình giàu có, nhằm cứu lấy sinh mạng đứa con mới sinh, nhưng vô tình giải phóng ác linh cổ xưa...',
        thumb_url: 'https://phimimg.com/upload/vod/20250530-1/fdf11774cff47f0ffc9c2dbe2e02d0ca.jpg',
        poster_url: 'https://phimimg.com/upload/vod/20250530-1/759df554cc21bf9d6805966dc3fe2b67.jpg',
        category: [{ name: 'Bí Ẩn', slug: 'bi-an' }, { name: 'Kinh Dị', slug: 'kinh-di' }],
        tmdb: { id: 838209, type: 'movie', vote_average: 7.6 },
        imdb: { id: 'tt27802490', vote_average: 6.9 },
        logoUrl: 'https://image.tmdb.org/t/p/w500/zzeosUcmoNVZyTUteGFsD5kdSga.png'
    },
    {
        slug: 'deadpool-va-wolverine',
        name: 'Deadpool Và Wolverine',
        origin_name: 'Deadpool & Wolverine',
        year: '2024',
        quality: 'FHD',
        age: 'T18',
        episode_current: 'Full',
        content: 'Wade Wilson đang cố gắng sống cuộc đời bình thường sau những ngày làm lính đánh thuê. Nhưng khi quê hương và dòng thời gian của mình đối mặt với hiểm họa hủy diệt, anh phải tìm kiếm sự trợ giúp từ một Wolverine đầy tổn thương...',
        thumb_url: 'https://phimimg.com/upload/vod/20250821-1/1ec414f82adc729512410edd1b083996.jpg',
        poster_url: 'https://phimimg.com/upload/vod/20250821-1/45b6b9aad03ae0aa2aceb5d73419831a.jpg',
        category: [{ name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Hài Hước', slug: 'hai-huoc' }],
        tmdb: { id: 533535, type: 'movie', vote_average: 7.6 },
        imdb: { id: 'tt6263850', vote_average: 7.5 },
        logoUrl: 'https://image.tmdb.org/t/p/w500/2o48U3kMXGIqRAkKZQ3n5OTWSBy.png'
    },
    {
        slug: 'do-anh-cong-duoc-toi',
        name: 'Đố Anh Còng Được Tôi',
        origin_name: 'I, The Executioner',
        year: '2024',
        quality: 'FHD',
        age: 'T16',
        episode_current: 'Full',
        content: 'Thám tử kỳ cựu Seo Do-cheol và Đội Điều tra Tội phạm Bạo lực đối mặt với một kẻ giết người hàng loạt bí ẩn gieo rắc kinh hoàng khắp đất nước, kích động sự phẫn nộ của dư luận và thách thức công lý...',
        thumb_url: 'https://phimimg.com/upload/vod/20241118-1/3b9d2f3c9a5cf65d15a23db8d0c870ac.jpg',
        poster_url: 'https://phimimg.com/upload/vod/20241118-1/9f929fc12384573847849f8786f16ae2.jpg',
        category: [{ name: 'Hành Động', slug: 'hanh-dong' }, { name: 'Hình Sự', slug: 'hinh-su' }],
        tmdb: { id: 995926, type: 'movie', vote_average: 7.0 },
        imdb: { id: 'tt30287778', vote_average: 6.3 },
        logoUrl: 'https://image.tmdb.org/t/p/w500/qdDvXw018inT0E08ZfPGEFs68nL.png'
    },
    {
        slug: 'van-tu-hanh',
        name: 'Vân Tú Hành',
        origin_name: 'The Legend Of Rosy Clouds',
        year: '2026',
        quality: 'FHD',
        age: 'T13',
        episode_current: 'Tập 36',
        content: 'Bộ phim cổ trang chuyển thể theo chân thiếu nữ Hồng Tú Lệ thông minh, kiên cường, dấn thân vào chốn quan trường đầy sóng gió để giúp vị hoàng đế trẻ chấn hưng triều chính, viết nên giai thoại truyền kỳ chốn cung đình...',
        thumb_url: 'https://phimimg.com/upload/vod/20250901-1/377ca3402a12c55372f0145f49c0e4a5.jpg',
        poster_url: 'https://phimimg.com/upload/vod/20260620-1/6b7cf552ac9b66e18a5382c922d2bd0d.jpg',
        category: [{ name: 'Chính Kịch', slug: 'chinh-kich' }, { name: 'Cổ Trang', slug: 'co-trang' }],
        tmdb: { id: 239901, type: 'tv', vote_average: 8.0 },
        imdb: { id: 'tt29489359', vote_average: 5.2 },
        logoUrl: 'https://image.tmdb.org/t/p/w500/76jBz2bfJFkDQgw1rvQNONhn9Zs.png'
    },
    {
        slug: 'tham-tu-lung-danh-conan',
        name: 'Thám Tử Lừng Danh Conan',
        origin_name: 'Detective Conan',
        year: '1996',
        quality: 'FHD',
        age: 'T13',
        episode_current: 'Tập 1214',
        content: 'Thám tử học sinh Kudo Shinichi bị Tổ chức Áo Đen đầu độc khiến cơ thể bị teo nhỏ thành đứa trẻ tiểu học. Dưới danh phận Edogawa Conan, cậu âm thầm phá giải hàng loạt vụ án hóc búa để tìm kiếm thuốc giải...',
        thumb_url: 'https://phimimg.com/upload/vod/20241229-1/01a129f40195c588ebc3d00c225fa33c.jpg',
        poster_url: 'https://phimimg.com/upload/vod/20240310-1/025424cf62248b9a7b54279ef5416e26.jpg',
        category: [{ name: 'Bí Ẩn', slug: 'bi-an' }, { name: 'Hài Hước', slug: 'hai-huoc' }],
        tmdb: { id: 30983, type: 'tv', vote_average: 8.5 },
        imdb: { id: 'tt0131179', vote_average: 8.5 },
        logoUrl: 'https://image.tmdb.org/t/p/w500/vX0VEwZViadujTUGcL0EU5orV8p.png'
    }
];

// -- State ------------------------------------------------------
let currentAdminBanner = DEFAULT_HERO_SLIDES[0];
let heroSlides = DEFAULT_HERO_SLIDES.map(m => ({ ...m }));
let currentSlideIndex = 0;
let isTransitioning = false;
let autoReturnTimer = null;
const AUTO_RETURN_DELAY = 8000;

// -- Cache chi tiết phim lấy trực tiếp từ database / API ---------
const movieDetailCache = new Map();

async function fetchRealMovieDetail(movie) {
    if (!movie || !movie.slug) return movie;
    if (movieDetailCache.has(movie.slug)) {
        const cached = movieDetailCache.get(movie.slug);
        Object.assign(movie, cached);
        return movie;
    }
    try {
        const res = await fetch(`/api/movie-merged/${encodeURIComponent(movie.slug)}`);
        if (res.ok) {
            const data = await res.json();
            const item = data.data?.item || data.movie;
            if (item) {
                const rating = item.imdb?.vote_average 
                    ? Number(item.imdb.vote_average).toFixed(1) 
                    : (item.tmdb?.vote_average ? Number(item.tmdb.vote_average).toFixed(1) : (movie.tmdb?.vote_average || '9.5'));

                let epText = item.episode_current || movie.episode_current || 'Full';
                const lcEp = epText.toLowerCase().trim();
                if (item.type === 'single' || lcEp.includes('full')) {
                    epText = 'Full';
                } else if (lcEp.includes('hoàn tất') || lcEp.includes('hoan tat')) {
                    const match = epText.match(/\d+/);
                    epText = match ? `Tập ${match[0]}` : epText;
                }

                let cleanContent = item.content || item.description || movie.content || '';
                cleanContent = cleanContent.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();

                const realData = {
                    name: item.name || movie.name,
                    origin_name: item.origin_name || item.original_name || movie.origin_name,
                    year: item.year ? String(item.year) : (movie.year || '2025'),
                    quality: item.quality || movie.quality || 'FHD',
                    content: cleanContent,
                    category: Array.isArray(item.category) && item.category.length > 0 ? item.category : movie.category,
                    tmdb: item.tmdb && item.tmdb.id ? item.tmdb : movie.tmdb,
                    imdb: item.imdb && (item.imdb.id || item.imdb.vote_average) ? item.imdb : movie.imdb,
                    episode_current: epText,
                    rating: rating
                };
                movieDetailCache.set(movie.slug, realData);
                Object.assign(movie, realData);
            }
        }
    } catch (e) {
        console.warn('Real movie fetch error:', e);
    }
    return movie;
}

function prefetchAllMovieDetails() {
    DEFAULT_HERO_SLIDES.forEach(m => fetchRealMovieDetail(m));
}

// -- Entry Point -------------------------------------------------
async function loadHeroBanner() {
    // 0. KIỂM TRA SSR INJECTION: Nếu Server đã truyền sẵn dữ liệu chuẩn của Admin qua SSR
    if (window.__INITIAL_HERO_SLIDES__ && Array.isArray(window.__INITIAL_HERO_SLIDES__) && window.__INITIAL_HERO_SLIDES__.length > 0) {
        heroSlides = window.__INITIAL_HERO_SLIDES__;
        currentAdminBanner = heroSlides[0];

        const layerA = document.getElementById('heroImageLayerA');
        const firstBg = buildImageUrl(getHeroImageUrl(currentAdminBanner), 1400);
        if (layerA && firstBg && layerA.getAttribute('src') !== firstBg) {
            layerA.src = firstBg;
        }

        // Khởi tạo các tương tác thumbnail ngay lập tức (0ms)
        renderThumbnails(heroSlides);
        updateThumbnailActive(0);

        // Gắn action nút Yêu thích & Thông tin phim
        setupHeroActions(currentAdminBanner);
        updateHeroButtons(currentAdminBanner);
        loadHeroLogo(currentAdminBanner);

        // Kích hoạt tương tác vuốt/kéo chuột & preload ngầm
        attachSwipeHandler();
        preloadSlideImages(heroSlides);
        prefetchAllMovieDetails();
        initHeroAutoSlide();
        return;
    }

    // 1. Fallback nếu không có SSR: Sử dụng DEFAULT_HERO_SLIDES
    heroSlides = DEFAULT_HERO_SLIDES.map(m => ({ ...m }));
    currentAdminBanner = heroSlides[0];

    try {
        const cachedBanner = localStorage.getItem('cinestream_active_banner');
        if (cachedBanner) {
            const cached = JSON.parse(cachedBanner);
            const conv = convertBannerToMovie(cached);
            if (conv && conv.slug) {
                currentAdminBanner = conv;
                heroSlides[0] = currentAdminBanner;
            }
        }
    } catch (e) { console.warn('Hero cache read error:', e); }

    // Render slide 0
    renderHeroBannerContent(currentAdminBanner, true);

    // Background fetch
    try {
        const apiUrl = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : '';
        const res = await fetch(`${apiUrl}/api/banners/active`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
                localStorage.setItem('cinestream_active_banner', JSON.stringify(data.data));
                const newMovie = convertBannerToMovie(data.data);
                if (newMovie && newMovie.slug) {
                    currentAdminBanner = newMovie;
                    heroSlides[0] = currentAdminBanner;
                    if (currentSlideIndex === 0) {
                        renderHeroBannerContent(currentAdminBanner, false);
                    }
                }
            }
        }
    } catch (err) {
        console.warn('Banner API error:', err);
    }

    setTimeout(loadThumbnailMovies, 80);
    setTimeout(loadInterestsCards, 120);
    prefetchAllMovieDetails();
    attachSwipeHandler();
    initHeroAutoSlide();
}

// -- Load & Render Danh Mục "Bạn Đang Quan Tâm Gì?" ---------------
async function loadInterestsCards() {
    try {
        if (window.__INITIAL_DESKTOP_INTERESTS__ && Array.isArray(window.__INITIAL_DESKTOP_INTERESTS__) && window.__INITIAL_DESKTOP_INTERESTS__.length > 0) {
            // Đã render hoàn tất 0ms từ Server-Side Rendering (SSR) — không chớp giật
            return;
        }
        const apiUrl = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : '';
        const res = await fetch(`${apiUrl}/api/settings/desktop-interests`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                renderInterestsCards(data.data);
            }
        }
    } catch (e) {}
}

function renderInterestsCards(cards) {
    const container = document.querySelector('.interests-wrapper');
    if (!container || !Array.isArray(cards) || cards.length === 0) return;

    const defaultRgbs = ['139, 92, 246', '239, 68, 68', '249, 115, 22', '236, 72, 153', '234, 179, 8', '16, 185, 129'];
    const defaultIcons = [
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="3"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14c1.5 2 6.5 2 8 0"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>'
    ];

    const sanitizeIconSvg = (svgStr) => {
        if (!svgStr) return '';
        return svgStr.replace(/14s1\.5\s*2\s*4\s*2\s*4-2(\s*4-2)?/g, '14c1.5 2 6.5 2 8 0');
    };

    const getCardRgb = (c, idx) => {
        if (c.colorRgb) return c.colorRgb;
        const colorVal = c.themeColor || c.color || c.gradient || '';
        const m = colorVal.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
        if (m) {
            let hex = m[1];
            if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
            const num = parseInt(hex, 16);
            return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
        }
        return defaultRgbs[idx % defaultRgbs.length];
    };

    const isNoAura = (c) => c.noAura === true || c.themeColor === 'none' || c.color === 'none';

    container.innerHTML = cards.map((c, idx) => {
        const iconContent = sanitizeIconSvg(c.iconSvg) || defaultIcons[idx % defaultIcons.length];
        const noAuraClass = isNoAura(c) ? ' no-aura' : '';
        const textColor = c.textColor || '#ffffff';
        const rgbStyle = isNoAura(c) ? `--card-text-color: ${textColor} !important;` : `--card-rgb: ${getCardRgb(c, idx)} !important; --card-text-color: ${textColor} !important;`;
        return `
        <div class="interest-card${noAuraClass}" onclick="window.location.href='${c.link || '#'}'" style="${rgbStyle}">
            <div class="interest-bg-img" style="background-image: url('${c.imageUrl || ''}');"></div>
            <div class="interest-icon-circle" title="${c.title || ''}" style="color: ${c.iconColor || '#ffffff'} !important;">
                ${iconContent}
            </div>
            <div class="interest-content">
                <span class="interest-title" style="color: ${textColor} !important;">${c.title || ''}</span>
                <span class="interest-action" style="color: ${textColor} !important;">${c.actionText || 'XEM NGAY'} <svg style="width: 10px; height: 10px; display: inline;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg></span>
            </div>
        </div>
    `}).join('');
}

// -- Convert banner API format -> movie format --------------------
function convertBannerToMovie(banner) {
    if (!banner) return null;
    const landscape = banner.imageUrl || banner.bannerUrl || banner.image || banner.thumb_url || banner.thumbUrl || '';
    const portrait = banner.posterUrl || banner.poster_url || banner.thumbUrl || banner.thumb_url || landscape;
    return {
        slug: banner.movieSlug || banner.slug || '',
        name: banner.name || '',
        origin_name: banner.originName || banner.origin_name || '',
        thumb_url: landscape,
        poster_url: portrait,
        content: banner.content || '',
        year: banner.year || '2026',
        quality: banner.quality || 'FHD',
        lang: banner.lang || 'Vietsub',
        episode_current: banner.episodeCurrent || banner.episode_current || '',
        category: banner.category || [],
        tmdb: banner.tmdb || {},
        imdb: banner.imdb || {},
        logoUrl: banner.logoUrl || ''
    };
}

// -- Smart Image Selector cho Desktop & Mobile -------------------
function getHeroImageUrl(movie) {
    if (!movie) return '';
    
    // 1. Ưu tiên tuyệt đối: Ảnh Backdrop / Thumbnail do Admin hoặc hệ thống cấu hình
    const directUrl = movie.imageUrl || movie.thumbUrl || movie.thumb_url || movie.bannerUrl || movie.backdropUrl || '';
    if (directUrl && typeof directUrl === 'string' && directUrl.trim() !== '') {
        return directUrl.trim();
    }

    // 2. Fallback Poster nếu không có backdrop
    const poster = movie.posterUrl || movie.poster_url || '';
    if (poster && typeof poster === 'string' && poster.trim() !== '') {
        return poster.trim();
    }

    return '';
}

// -- State Logo Cache & ID chống xung đột (Race Condition Protection) --
let currentLogoLoadId = 0;
const logoCache = new Map();

try {
    const _s = localStorage.getItem('aphim_logo_cache_v2');
    if (_s) Object.entries(JSON.parse(_s)).forEach(([k, v]) => logoCache.set(k, v));
} catch (e) {}

function _persistLogoCache() {
    try {
        const obj = {};
        logoCache.forEach((v, k) => { if (v && v !== 'TEXT_ONLY') obj[k] = v; });
        localStorage.setItem('aphim_logo_cache_v2', JSON.stringify(obj));
    } catch (e) {}
}

// -- TMDB & Custom Logo Fetcher Siêu Tốc (Chuẩn xác 100% từng phim, không lấy logo của phim khác) --
function isStrictTitleMatch(candidateTitle, movieName, originName) {
    if (!candidateTitle) return false;
    const norm = (s) => (s || '').toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');
    const c = norm(candidateTitle);
    const n = norm(movieName);
    const o = norm(originName);
    if (!c) return false;
    if (n && (c === n || (c.length > 3 && n.includes(c)) || (n.length > 3 && c.includes(n)))) return true;
    if (o && (c === o || (c.length > 3 && o.includes(c)) || (o.length > 3 && c.includes(o)))) return true;
    return false;
}

async function loadHeroLogo(movie) {
    const heroTitle = document.getElementById('heroTitle');
    if (!heroTitle) return;

    const loadId = ++currentLogoLoadId;
    document.querySelectorAll('#heroTitleImg').forEach(el => el.remove());

    if (!movie) {
        heroTitle.style.display = 'block';
        return;
    }

    // Đảm bảo tên phim hiển thị chính xác
    heroTitle.textContent = movie.name || '';

    function applyLogoToDOM(url) {
        if (loadId !== currentLogoLoadId) return;
        document.querySelectorAll('#heroTitleImg').forEach(el => el.remove());

        heroTitle.style.display = 'none';

        const img = new Image();
        img.id = 'heroTitleImg';
        img.src = url;
        img.alt = movie.name || '';
        img.className = 'w-auto h-auto max-h-[75px] md:max-h-[110px] lg:max-h-[130px] object-contain drop-shadow-2xl transition-opacity duration-300 opacity-0';
        img.style.filter = 'drop-shadow(0px 4px 10px rgba(0,0,0,0.8))';
        img.fetchPriority = 'high';
        img.loading = 'eager';

        img.onload = () => {
            if (loadId !== currentLogoLoadId) return;
            document.querySelectorAll('#heroTitleImg').forEach(el => el.remove());
            if (heroTitle.parentNode) {
                heroTitle.parentNode.insertBefore(img, heroTitle);
                heroTitle.style.display = 'none';
                setTimeout(() => {
                    if (loadId === currentLogoLoadId) img.classList.remove('opacity-0');
                }, 20);
            }
        };
        img.onerror = () => {
            if (loadId === currentLogoLoadId) {
                document.querySelectorAll('#heroTitleImg').forEach(el => el.remove());
                heroTitle.textContent = movie.name || '';
                heroTitle.style.display = 'block';
            }
        };

        if (img.complete && img.naturalWidth > 0) {
            document.querySelectorAll('#heroTitleImg').forEach(el => el.remove());
            if (heroTitle.parentNode) {
                heroTitle.parentNode.insertBefore(img, heroTitle);
                heroTitle.style.display = 'none';
                img.classList.remove('opacity-0');
            }
        }
    }

    // 1. Ưu tiên tuyệt đối: Logo chính thức đã có sẵn trên movie object (từ TMDB hoặc Admin)
    if (movie.logoUrl && movie.logoUrl.trim() !== '') {
        applyLogoToDOM(movie.logoUrl.trim());
        return;
    }

    // 2. Cache
    const cacheKey = movie.slug || movie.name;
    if (logoCache.has(cacheKey)) {
        const cachedUrl = logoCache.get(cacheKey);
        if (cachedUrl && cachedUrl !== 'TEXT_ONLY') {
            applyLogoToDOM(cachedUrl);
        } else {
            heroTitle.textContent = movie.name || '';
            heroTitle.style.display = 'block';
        }
        return;
    }

    // 3. Truy vấn TMDB chính xác theo ID hoặc tìm kiếm khớp tên tuyệt đối
    try {
        let rawTmdbId = movie.tmdb?.id;
        let tmdbId = rawTmdbId ? parseInt(String(rawTmdbId).split('-')[0]) : null;
        let type = movie.type === 'series' || movie.type === 'hoathinh' || movie.tmdb?.type === 'tv' ? 'tv' : 'movie';

        if (!tmdbId) {
            const query = encodeURIComponent(movie.origin_name || movie.name);
            const searchUrl = `/api/tmdb/search/multi?query=${query}`;
            const searchRes = await fetch(searchUrl);
            if (loadId !== currentLogoLoadId) return;
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.results && searchData.results.length > 0) {
                    // Kiểm tra khớp tên chặt chẽ, TUYỆT ĐỐI không lấy phim ngẫu nhiên khác
                    const matched = searchData.results.find(r => {
                        if (r.media_type !== 'tv' && r.media_type !== 'movie') return false;
                        return isStrictTitleMatch(r.title || r.name, movie.name, movie.origin_name) ||
                               isStrictTitleMatch(r.original_title || r.original_name, movie.name, movie.origin_name);
                    });
                    if (matched && matched.id) {
                        tmdbId = matched.id;
                        type = matched.media_type || 'movie';
                    }
                }
            }
        }

        if (loadId !== currentLogoLoadId) return;
        if (!tmdbId) {
            // Không có TMDB ID hoặc không khớp -> Render chữ theo tên phim
            logoCache.set(cacheKey, 'TEXT_ONLY');
            heroTitle.textContent = movie.name || '';
            heroTitle.style.display = 'block';
            return;
        }

        const url = `/api/tmdb/${type}/${tmdbId}/images`;
        const res = await fetch(url);
        if (loadId !== currentLogoLoadId) return;
        if (!res.ok) {
            logoCache.set(cacheKey, 'TEXT_ONLY');
            heroTitle.textContent = movie.name || '';
            heroTitle.style.display = 'block';
            return;
        }

        const data = await res.json();
        if (loadId !== currentLogoLoadId) return;

        if (data.logos && data.logos.length > 0) {
            const viLogo = data.logos.find(l => l.iso_639_1 === 'vi');
            const enLogo = data.logos.find(l => l.iso_639_1 === 'en');
            const bestLogo = viLogo || enLogo || data.logos[0];

            if (bestLogo && bestLogo.file_path) {
                const imgUrl = `https://image.tmdb.org/t/p/w500${bestLogo.file_path}`;
                logoCache.set(cacheKey, imgUrl);
                _persistLogoCache();
                applyLogoToDOM(imgUrl);
                return;
            }
        }
        
        // Không tìm thấy logo hợp lệ của phim này -> Hiển thị text theo đúng tên phim
        logoCache.set(cacheKey, 'TEXT_ONLY');
        heroTitle.textContent = movie.name || '';
        heroTitle.style.display = 'block';
    } catch (e) {
        if (loadId === currentLogoLoadId) {
            heroTitle.textContent = movie.name || '';
            heroTitle.style.display = 'block';
        }
    }
}

// ================================================================
// DYNAMIC AUTO-SLIDE CONTROLLER (CẤU HÌNH TỰ ĐỘNG CHUYỂN HERO BANNER)
// Giới hạn cấu hình từ 3s - 10s theo cài đặt của Admin (Không vượt 10s)
// Tối ưu: Di chuột vào VẪN CHUYỂN BÌNH THƯỜNG; CHỈ TẠM DỪNG KHI ẤN GIỮ / KÉO LƯỚT
// ================================================================
let autoSlideConfig = {
    enabled: true,
    interval: 6 // 3s đến 10s (mặc định 6s)
};
let autoSlideTimer = null;
let isUserHoldingOrDragging = false;
let lastAutoSlideConfigHash = '';

function initHeroAutoSlide() {
    // 1. Đọc dữ liệu SSR trước nếu có
    if (window.__INITIAL_HERO_AUTOSLIDE__ && typeof window.__INITIAL_HERO_AUTOSLIDE__ === 'object') {
        applyAutoSlideConfig(window.__INITIAL_HERO_AUTOSLIDE__, true);
    }

    // 2. Fetch cấu hình mới nhất từ backend API (không gián đoạn đếm giờ nếu cấu hình giống nhau)
    fetch('/api/settings/desktop-hero-autoslide')
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                applyAutoSlideConfig(res.data, false);
            }
        })
        .catch(() => {});

    // 3. Gắn sự kiện nhấn giữ / chuẩn bị lướt (Hold / Drag to pause)
    // Di chuột vào (hover) thì VẪN CHUYỂN BÌNH THƯỜNG. Chỉ dừng khi người dùng chủ động ấn giữ (mousedown / touchstart / pointerdown)
    const heroEl = document.getElementById('desktopHeroShowcase') || document.querySelector('.desktop-hero-showcase');
    if (heroEl && !heroEl._hasAutoSlideEvents) {
        heroEl._hasAutoSlideEvents = true;

        const onUserHoldStart = (e) => {
            // Khi người dùng ấn giữ chuột hoặc chạm màn hình chuẩn bị lướt
            isUserHoldingOrDragging = true;
            clearAutoSlideTimer();
        };

        const onUserHoldEnd = (e) => {
            // Khi người dùng nhả chuột / thả tay -> Tiếp tục đếm giờ chuyển slide
            if (isUserHoldingOrDragging) {
                isUserHoldingOrDragging = false;
                if (autoSlideConfig.enabled) {
                    startAutoSlideTimer();
                }
            }
        };

        heroEl.addEventListener('pointerdown', onUserHoldStart, { passive: true });
        heroEl.addEventListener('touchstart', onUserHoldStart, { passive: true });
        heroEl.addEventListener('mousedown', onUserHoldStart, { passive: true });

        window.addEventListener('pointerup', onUserHoldEnd, { passive: true });
        window.addEventListener('pointercancel', onUserHoldEnd, { passive: true });
        window.addEventListener('touchend', onUserHoldEnd, { passive: true });
        window.addEventListener('mouseup', onUserHoldEnd, { passive: true });
    }

    // 4. Kích hoạt đếm giờ chuẩn xác
    startAutoSlideTimer();
}

function applyAutoSlideConfig(cfg, forceRestart = false) {
    if (!cfg || typeof cfg !== 'object') return;
    const isEnabled = typeof cfg.enabled === 'boolean' ? cfg.enabled : true;
    const intervalSec = parseInt(cfg.interval, 10);
    // Giới hạn chặt chẽ: tối thiểu 3s, tối đa 10s (không được vượt quá 10s)
    const cleanInterval = Math.min(10, Math.max(3, !isNaN(intervalSec) ? intervalSec : 6));

    const newHash = `${isEnabled}_${cleanInterval}`;
    if (!forceRestart && newHash === lastAutoSlideConfigHash && autoSlideTimer !== null) {
        return; // Đang chạy đúng cấu hình, không làm gián đoạn chu kỳ chuyển
    }
    lastAutoSlideConfigHash = newHash;

    autoSlideConfig.enabled = isEnabled;
    autoSlideConfig.interval = cleanInterval;

    if (autoSlideConfig.enabled) {
        startAutoSlideTimer();
    } else {
        clearAutoSlideTimer();
    }
}

function startAutoSlideTimer() {
    clearAutoSlideTimer();
    if (!autoSlideConfig.enabled || !heroSlides || heroSlides.length <= 1) return;
    if (isUserHoldingOrDragging) return; // Đang ấn giữ chuẩn bị kéo lướt -> tạm dừng

    // Giới hạn độ trễ chuẩn xác theo đúng số giây Admin cài (3s - 10s)
    const delayMs = Math.min(10, Math.max(3, Number(autoSlideConfig.interval) || 6)) * 1000;

    autoSlideTimer = setTimeout(() => {
        if (!isUserHoldingOrDragging && autoSlideConfig.enabled && heroSlides.length > 1 && !isTransitioning) {
            const nextIdx = (currentSlideIndex + 1) % heroSlides.length;
            switchHeroSlide(nextIdx, 1, false);
            return; // switchHeroSlide sẽ kích hoạt lại startAutoSlideTimer khi hoàn tất
        }
        startAutoSlideTimer();
    }, delayMs);
}

function clearAutoSlideTimer() {
    if (autoSlideTimer) {
        clearTimeout(autoSlideTimer);
        autoSlideTimer = null;
    }
}

function resetAutoReturn() {
    clearAutoSlideTimer();
    startAutoSlideTimer();
}

// ================================================================
// SLIDE SWITCHING – Dual-Layer 60fps Cinema Slide & Crossfade
// (Mượt mà uyển chuyển, ảnh lướt từ phải vào, chữ lướt từ trái vào)
// ================================================================
let currentLayerName = 'A';

function switchHeroSlide(newIndex, explicitDirection, isAutoReturn) {
    if (isTransitioning) return;
    if (newIndex < 0) newIndex = heroSlides.length - 1;
    if (newIndex >= heroSlides.length) newIndex = 0;
    if (newIndex === currentSlideIndex) return;

    isTransitioning = true;
    clearAutoSlideTimer();

    const movie = heroSlides[newIndex];
    if (!movie) {
        isTransitioning = false;
        return;
    }

    // Xác định chiều chuyển động: 1: Lướt sang phải (Next), -1: Lướt sang trái (Prev)
    let direction = explicitDirection !== undefined ? explicitDirection : 1;
    if (explicitDirection === undefined) {
        if (newIndex < currentSlideIndex) direction = -1;
        if (currentSlideIndex === heroSlides.length - 1 && newIndex === 0) direction = 1;
        if (currentSlideIndex === 0 && newIndex === heroSlides.length - 1) direction = -1;
    }

    // 1. Cập nhật ngay trạng thái active của Thumbnail (ĐỨNG YÊN HOÀN TOÀN, chỉ đổi viền sáng lập tức 0ms)
    updateThumbnailActive(newIndex);

    // 2. Lấy link ảnh chất lượng cao
    const rawUrl = getHeroImageUrl(movie);
    const optUrl = buildImageUrl(rawUrl, 1400);

    const layerA = document.getElementById('heroImageLayerA');
    const layerB = document.getElementById('heroImageLayerB');
    const heroInfoCol = document.querySelector('.hero-info-col');

    const currentLayer = currentLayerName === 'A' ? layerA : layerB;
    const nextLayer = currentLayerName === 'A' ? layerB : layerA;

    // 3. PHASE 1: Cập nhật dữ liệu phim & Chuẩn bị vị trí xuất phát cho cả 2 bên
    updateHeroBannerText(movie);
    updateHeroButtons(movie);
    setupHeroActions(movie);

    // Chuẩn bị lớp ảnh nền tiếp theo (Lướt từ bên phải vào)
    if (nextLayer && currentLayer) {
        nextLayer.src = optUrl || rawUrl;
        nextLayer.style.transition = 'none';
        nextLayer.style.transform = `translateZ(0) translateX(${direction * 48}px) scale(1.03)`;
        nextLayer.style.opacity = '0';
        nextLayer.style.zIndex = '2';
        currentLayer.style.zIndex = '1';
        nextLayer.offsetHeight; // Trigger reflow
    }

    // Chuẩn bị khung nội dung bên trái (Lướt nhẹ nhàng đồng bộ từ bên trái vào)
    if (heroInfoCol) {
        heroInfoCol.style.transition = 'none';
        heroInfoCol.style.opacity = '0';
        heroInfoCol.style.transform = `translateZ(0) translateX(${-direction * 45}px)`;
        heroInfoCol.offsetHeight; // Trigger reflow
    }

    // 4. PHASE 2: Kích hoạt đồng thời hiệu ứng lướt êm ái cho CẢ 2 BÊN (Cùng 0.75s, cùng gia tốc chuẩn điện ảnh)
    requestAnimationFrame(() => {
        // Ảnh lớn lướt từ phải vào giữa
        if (nextLayer && currentLayer) {
            nextLayer.style.transition = 'opacity 0.68s cubic-bezier(0.25, 1, 0.5, 1), transform 0.78s cubic-bezier(0.16, 1, 0.3, 1)';
            nextLayer.style.opacity = '1';
            nextLayer.style.transform = 'translateZ(0) translateX(0) scale(1)';

            currentLayer.style.transition = 'opacity 0.68s cubic-bezier(0.25, 1, 0.5, 1), transform 0.78s cubic-bezier(0.16, 1, 0.3, 1)';
            currentLayer.style.opacity = '0';
            currentLayer.style.transform = `translateZ(0) translateX(${-direction * 45}px) scale(1.02)`;
        }

        // Khung chữ / nội dung lướt nhẹ nhàng từ trái vào giữa (Đồng bộ 100% với ảnh nền)
        if (heroInfoCol) {
            heroInfoCol.style.transition = 'opacity 0.68s cubic-bezier(0.25, 1, 0.5, 1), transform 0.78s cubic-bezier(0.16, 1, 0.3, 1)';
            heroInfoCol.style.opacity = '1';
            heroInfoCol.style.transform = 'translateZ(0) translateX(0)';
        }
    });

    // 5. PHASE 3: Hoàn tất chu kỳ chuyển cảnh & mở khóa thao tác nhanh
    setTimeout(() => {
        currentSlideIndex = newIndex;
        currentLayerName = currentLayerName === 'A' ? 'B' : 'A';
        isTransitioning = false;
        startAutoSlideTimer();
    }, 450);
}

// -- Build optimized image URL ------------------------------------
function buildImageUrl(rawUrl, width) {
    if (!rawUrl) return '';
    if (rawUrl.includes('tmdb.org')) return rawUrl;
    
    if (typeof movieAPI !== 'undefined' && movieAPI.getImageURL) {
        return movieAPI.getImageURL(rawUrl, width, 90, true);
    }
    return rawUrl.startsWith('http')
        ? rawUrl
        : `https://phimimg.com/${rawUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${rawUrl}`;
}

// -- Update text của hero banner (100% dữ liệu thực từ phim) ------
function updateHeroBannerText(movie) {
    if (!movie) return;
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const heroBadges = document.getElementById('heroBadges');
    const heroGenres = document.getElementById('heroGenres');
    const heroDescription = document.getElementById('heroDescription');

    // Title
    if (heroTitle) {
        heroTitle.textContent = movie.name || '';
        const cacheKeyCheck = movie.slug || movie.name;
        const hasLogoReady = (movie.logoUrl && movie.logoUrl.trim() !== '') ||
                             (logoCache.has(cacheKeyCheck) && logoCache.get(cacheKeyCheck) !== 'TEXT_ONLY');
        heroTitle.style.display = hasLogoReady ? 'none' : 'block';
    }

    // Origin Subtitle
    if (heroSubtitle) {
        const oName = (movie.origin_name || '').trim();
        const mName = (movie.name || '').trim();
        if (oName && oName.toLowerCase() !== mName.toLowerCase()) {
            heroSubtitle.textContent = oName;
            heroSubtitle.style.display = 'block';
        } else {
            heroSubtitle.textContent = '';
            heroSubtitle.style.display = 'none';
        }
    }
    window.selectHeroThumbnail = switchHeroSlide;

    // Tải Logo TMDB chính thức
    loadHeroLogo(movie);

    // Badges Row (IMDb Gold + FHD Pastel Cream + T13/T18 White + Year + Episode)
    if (heroBadges) {
        const rating = movie.rating || (movie.imdb?.vote_average ? Number(movie.imdb.vote_average).toFixed(1) : (movie.tmdb?.vote_average ? Number(movie.tmdb.vote_average).toFixed(1) : '9.5'));
        
        let epText = movie.episode_current || 'Full';
        const lcText = epText.toLowerCase().trim();
        if (lcText === 'tập' || lcText === 'tập ' || lcText.includes('full')) {
            epText = 'Full';
        } else if (lcText.includes('hoàn tất') || lcText.includes('hoan tat')) {
            const m = epText.match(/\d+/);
            epText = m ? `Tập ${m[0]}` : 'Full';
        }

        const quality = movie.quality || 'FHD';
        const year = movie.year || '2025';
        
        let age = movie.age || 'T13';
        if (!movie.age) {
            const cats = Array.isArray(movie.category) ? movie.category.map(c => c.name || '') : [];
            const isAdult = cats.some(c => /kinh dị|tâm lý|bạo lực|18\+/i.test(c));
            const isAction = cats.some(c => /hành động|hình sự|chiến tranh/i.test(c));
            if (isAdult) age = 'T18';
            else if (isAction) age = 'T16';
            else age = 'T13';
        }

        heroBadges.innerHTML = `
            <span class="hero-badge-imdb">
                <span class="hero-badge-imdb-label">IMDb</span> <span class="hero-badge-imdb-val">${rating}</span>
            </span>
            <span class="hero-badge-quality">${quality}</span>
            <span class="hero-badge-age">${age}</span>
            <span class="hero-badge-year">${year}</span>
            <span class="hero-badge-ep" data-ep-badge>${epText}</span>
        `;
    }

    // Genre Tag Pills (Định dạng viết hoa chữ đầu chuẩn Ảnh 2: "Chính kịch", "Gia đình")
    function formatGenreText(str) {
        if (!str) return '';
        const s = String(str).trim();
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }

    if (heroGenres) {
        let cats = Array.isArray(movie.category) ? movie.category : [];
        if (cats.length === 0) {
            cats = [{ name: 'Phim hot', slug: 'phim-hot' }];
        }
        heroGenres.innerHTML = cats.slice(0, 2).map(cat => `
            <a href="/the-loai/${cat.slug || 'phim-hot'}" class="hero-genre-pill">
                ${formatGenreText(cat.name || cat)}
            </a>
        `).join('');
    }

    // Description Synopsis (Lấy chuẩn từ nội dung phim thực tế)
    if (heroDescription) {
        if (movie.content) {
            let cleanDesc = movie.content.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
            if (cleanDesc.length > 220) cleanDesc = cleanDesc.substring(0, 215) + '...';
            heroDescription.textContent = cleanDesc;
        } else {
            heroDescription.textContent = 'Đang tải thông tin phim...';
        }
    }
}

// -- Update href nút play + info ---------------------------------
function updateHeroButtons(movie) {
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    const heroInfoBtn = document.getElementById('heroInfoBtn');
    if (heroPlayBtn) heroPlayBtn.href = `/xem-phim/${movie.slug}/tap-1`;
    if (heroInfoBtn) heroInfoBtn.href = `/phim/${movie.slug}`;
}

// ================================================================
// SWIPE / DRAG HANDLER (Desktop Mouse Drag & Touch Swipe)
// ================================================================
function attachSwipeHandler() {
    const heroEl = document.getElementById('desktopHeroShowcase') || document.querySelector('.desktop-hero-showcase') || document.querySelector('main.relative.h-screen');
    if (!heroEl) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let swipeDir = null;
    const SWIPE_THRESHOLD = 40;
    const AXIS_LOCK_PX = 8;

    const isInteractive = (target) => {
        return !!target.closest('a, button, input, select, .hero-thumb-item, .hero-play-circle-btn, .hero-actions-pill, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper');
    };

    // Helper lấy active image layer hiện tại
    const getActiveLayer = () => {
        const layerA = document.getElementById('heroImageLayerA');
        const layerB = document.getElementById('heroImageLayerB');
        return currentLayerName === 'A' ? (layerA || document.getElementById('heroImage')) : (layerB || document.getElementById('heroImage'));
    };

    // Touch Handlers (Mobile / Tablet)
    heroEl.addEventListener('touchstart', (e) => {
        if (isInteractive(e.target)) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swipeDir = null;
        clearAutoReturnTimer();
    }, { passive: true });

    heroEl.addEventListener('touchmove', (e) => {
        if (isInteractive(e.target)) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        if (!swipeDir && (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX)) {
            swipeDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        }

        if (swipeDir === 'h') {
            const currentImg = getActiveLayer();
            const heroContent = document.getElementById('heroContent');
            if (currentImg && Math.abs(dx) < 200) {
                currentImg.style.transform = `translateZ(0) scale(1.02) translateX(${dx * 0.12}px)`;
                currentImg.style.transition = 'none';
            }
            if (heroContent && Math.abs(dx) < 200) {
                heroContent.style.transform = `translateZ(0) translateX(${dx * 0.16}px)`;
                heroContent.style.transition = 'none';
            }
        }
    }, { passive: true });

    heroEl.addEventListener('touchend', (e) => {
        if (isInteractive(e.target)) return;
        const dx = e.changedTouches[0].clientX - startX;

        const currentImg = getActiveLayer();
        const heroContent = document.getElementById('heroContent');
        if (currentImg) {
            currentImg.style.transform = 'translateZ(0) scale(1)';
            currentImg.style.transition = 'transform 0.3s ease-out';
        }
        if (heroContent) {
            heroContent.style.transform = 'translateZ(0) translateX(0)';
            heroContent.style.transition = 'transform 0.3s ease-out';
        }

        if (swipeDir !== 'h' || Math.abs(dx) < 25) {
            startAutoReturnTimer();
            return;
        }

        if (dx < 0) {
            // Lướt sang trái -> Chuyển phim kế tiếp (hướng từ phải vào)
            switchHeroSlide((currentSlideIndex + 1) % heroSlides.length, false, false, 1);
        } else {
            // Lướt sang phải -> Chuyển phim trước đó (hướng từ trái vào)
            switchHeroSlide((currentSlideIndex - 1 + heroSlides.length) % heroSlides.length, false, false, -1);
        }

        swipeDir = null;
    }, { passive: true });

    // Mouse & Pointer Drag Handlers (Desktop: Kéo chuột lướt phim siêu nhạy, nhận diện 100%)
    heroEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return; // Chỉ nhận chuột trái hoặc touch/pen
        if (isInteractive(e.target)) return;
        
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        clearAutoReturnTimer();
        heroEl.classList.add('is-dragging');
        try { heroEl.setPointerCapture(e.pointerId); } catch(err) {}
    });

    heroEl.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const currentImg = getActiveLayer();
        const heroContent = document.getElementById('heroContent');
        if (currentImg && Math.abs(dx) < 220) {
            currentImg.style.transform = `translateZ(0) scale(1.02) translateX(${dx * 0.12}px)`;
            currentImg.style.transition = 'none';
        }
        if (heroContent && Math.abs(dx) < 220) {
            heroContent.style.transform = `translateZ(0) translateX(${dx * 0.16}px)`;
            heroContent.style.transition = 'none';
        }
    });

    const handleDragRelease = (e) => {
        if (!isDragging) return;
        isDragging = false;
        heroEl.classList.remove('is-dragging');
        try { if (e.pointerId) heroEl.releasePointerCapture(e.pointerId); } catch(err) {}

        const currentImg = getActiveLayer();
        const heroContent = document.getElementById('heroContent');
        if (currentImg) {
            currentImg.style.transform = 'translateZ(0) scale(1)';
            currentImg.style.transition = 'transform 0.35s ease-out';
        }
        if (heroContent) {
            heroContent.style.transform = 'translateZ(0) translateX(0)';
            heroContent.style.transition = 'transform 0.35s ease-out';
        }

        const dx = e.clientX - startX;

        // Chỉ cần kéo ngang quá 20px là chuyển phim lập tức
        if (Math.abs(dx) >= 20) {
            isTransitioning = false; // Mở khóa chuyển slide ngay lập tức khi user chủ động kéo
            if (dx < 0) {
                // Kéo sang trái -> Xem tiếp phim sau (hướng trượt từ phải vào)
                switchHeroSlide((currentSlideIndex + 1) % heroSlides.length, false, false, 1);
            } else {
                // Kéo sang phải -> Xem lại phim trước (hướng trượt từ trái vào)
                switchHeroSlide((currentSlideIndex - 1 + heroSlides.length) % heroSlides.length, false, false, -1);
            }
        } else {
            startAutoReturnTimer();
        }
    };

    heroEl.addEventListener('pointerup', handleDragRelease);
    heroEl.addEventListener('pointercancel', handleDragRelease);
    window.addEventListener('mouseup', handleDragRelease);

    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (currentSlideIndex !== 0) {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                startAutoReturnTimer();
            }, 300);
        }
    }, { passive: true });
}

// ================================================================
// LOAD THUMBNAILS (7 Phim Chính Thức Chuẩn Xác)
// ================================================================
async function loadThumbnailMovies() {
    try {
        const apiUrl = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : '';
        const res = await fetch(`${apiUrl}/api/banners/thumbnails`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                const converted = convertThumbnailsFromAPI(data.data);
                heroSlides = converted;
                currentAdminBanner = heroSlides[0];
                renderThumbnails(heroSlides);
                updateThumbnailActive(currentSlideIndex);
                preloadSlideImages(heroSlides);
                return;
            }
        }
    } catch (err) {
        console.warn('Thumbnail API notice:', err);
    }

    // Fallback: Sử dụng DEFAULT_HERO_SLIDES (7 phim chính thức, KHÔNG gọi phim ngẫu nhiên)
    heroSlides = DEFAULT_HERO_SLIDES.map(m => ({ ...m }));
    currentAdminBanner = heroSlides[0];
    renderThumbnails(heroSlides);
    updateThumbnailActive(currentSlideIndex);
    preloadSlideImages(heroSlides);
}

function convertThumbnailsFromAPI(banners) {
    return banners.map(b => ({
        slug: b.movieSlug || b.slug,
        name: b.name,
        origin_name: b.originName || b.origin_name,
        thumb_url: b.thumbUrl || b.imageUrl || b.thumb_url,
        poster_url: b.posterUrl || b.poster_url,
        year: b.year,
        content: b.content,
        quality: b.quality,
        lang: b.lang,
        episode_current: b.episodeCurrent || b.episode_current,
        category: b.category || [],
        tmdb: b.tmdb || {},
        imdb: b.imdb || {},
        logoUrl: b.logoUrl || ''
    }));
}

// -- Preload ảnh ngầm cho tất cả slides --------------------------
function preloadSlideImages(movies) {
    setTimeout(() => {
        movies.forEach((movie) => {
            const rawUrl = getHeroImageUrl(movie);
            if (!rawUrl) return;
            const url = buildImageUrl(rawUrl, 1200);
            if (url) {
                const img = new Image();
                img.src = url;
            }
        });
    }, 300);
}

// -- Render thumbnail DOM (Hỗ trợ không giới hạn số lượng phim do Admin chọn) -------------
let isThumbDragging = false;
let thumbStartX = 0;
let thumbScrollStart = 0;
let thumbHasMoved = false;

function renderThumbnails(movies) {
    const container = document.getElementById('heroThumbnails');
    if (!container || !Array.isArray(movies) || movies.length === 0) return;

    // Hiển thị toàn bộ phim do Admin cấu hình (Không giới hạn cứng 7 phim)
    const displayMovies = movies;
    container.innerHTML = displayMovies.map((movie, i) => {
        let raw = movie.thumb_url || movie.poster_url || '';
        let imgSrc = '';
        if (raw) {
            imgSrc = raw.startsWith('http') ? raw : `https://phimimg.com/upload/vod/${raw}`;
        }
        if (!imgSrc) {
            imgSrc = 'https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg';
        }

        const slideIndex = i;
        const isActive = (currentSlideIndex === slideIndex) ? 'hero-thumb-active active' : '';

        return `
        <div class="hero-thumb-item ${isActive}"
             data-slide-index="${slideIndex}"
             data-movie-index="${i}"
             role="button"
             tabindex="0"
             title="${(movie.name || '').replace(/"/g, '&quot;')}"
             onclick="if(!thumbHasMoved) switchHeroSlide(${slideIndex})">
            <img
                src="${imgSrc}"
                alt="${(movie.name || '').replace(/"/g, '&quot;')}"
                loading="eager"
                decoding="async"
                onerror="this.src='https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg'" />
        </div>`;
    }).join('');

    // Keyboard navigation
    container.querySelectorAll('.hero-thumb-item').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchHeroSlide(parseInt(el.getAttribute('data-slide-index')));
            }
        });
    });

    // ── Kéo chuột ngang để lướt xem tiếp thumbnail (Mouse Drag-to-Scroll) ──
    container.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isThumbDragging = true;
        thumbHasMoved = false;
        thumbStartX = e.pageX - container.offsetLeft;
        thumbScrollStart = container.scrollLeft;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isThumbDragging) return;
        const x = e.pageX - container.offsetLeft;
        const walk = (x - thumbStartX) * 1.25;
        if (Math.abs(walk) > 4) thumbHasMoved = true;
        container.scrollLeft = thumbScrollStart - walk;
    });

    window.addEventListener('mouseup', () => {
        if (!isThumbDragging) return;
        isThumbDragging = false;
        container.style.cursor = 'grab';
        setTimeout(() => { thumbHasMoved = false; }, 50);
    });

    // ── Vuốt chạm trên Mobile / Tablet ──
    let thumbTouchStartX = 0;
    let thumbTouchScrollStart = 0;
    container.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
            thumbTouchStartX = e.touches[0].pageX;
            thumbTouchScrollStart = container.scrollLeft;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) {
            const diff = thumbTouchStartX - e.touches[0].pageX;
            container.scrollLeft = thumbTouchScrollStart + diff;
        }
    }, { passive: true });

    // ── Lăn chuột để cuộn ngang thumbnail (Mouse Wheel Horizontal Scroll) ──
    container.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            container.scrollLeft += e.deltaY * 0.85;
        }
    }, { passive: false });

    let thumbScrollTimer = null;
    container.addEventListener('scroll', () => {
        if (currentSlideIndex !== 0) {
            clearTimeout(thumbScrollTimer);
            thumbScrollTimer = setTimeout(() => { resetAutoReturn(); }, 100);
        }
    }, { passive: true });
}

// Cập nhật trạng thái active của Thumbnail (Tự động cuộn mượt thumbnail được chọn trong khung riêng, không cuộn window)
function updateThumbnailActive(index) {
    const container = document.getElementById('heroThumbnails');
    if (!container) return;
    const items = container.querySelectorAll('.hero-thumb-item');
    items.forEach((item, i) => {
        const slideIdx = parseInt(item.getAttribute('data-slide-index') ?? i);
        if (slideIdx === index) {
            item.classList.add('hero-thumb-active', 'active');
            // Cuộn ngang NỘI BỘ trong container thumbnails mà TUYỆT ĐỐI KHÔNG làm nhảy cuộn trang window
            try {
                const itemLeft = item.offsetLeft;
                const itemWidth = item.offsetWidth;
                const containerWidth = container.clientWidth;
                const targetScroll = itemLeft - (containerWidth / 2) + (itemWidth / 2);
                container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
            } catch (e) {
                container.scrollLeft = item.offsetLeft - 40;
            }
        } else {
            item.classList.remove('hero-thumb-active', 'active');
        }
    });
}
window.updateThumbnailActive = updateThumbnailActive;
window.selectHeroThumbnail = switchHeroSlide;

// ── Xử lý Kéo Chuột / Vuốt Ngang Toàn Bộ Hero Banner (Nhận Diện Mọi Điểm Chạm - Siêu Nhạy) ──
function attachSwipeHandler() {
    const hero = document.getElementById('desktopHeroShowcase');
    if (!hero) return;
    if (hero._swipeAttached) return;
    hero._swipeAttached = true;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isDragging = false;
    let hasTriggered = false;
    let suppressClickUntil = 0;

    // Chặn click nhầm vào các link/nút khi vừa thực hiện thao tác kéo lướt
    document.addEventListener('click', (e) => {
        if (performance.now() < suppressClickUntil) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // Bắt sự kiện Pointer ở BẤT KỲ ĐIỂM NÀO trên Hero Banner
    hero.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return; // Chỉ nhận chuột trái

        isDragging = true;
        hasTriggered = false;
        startX = e.clientX;
        startY = e.clientY;
        startTime = performance.now();
        hero.classList.add('is-dragging');
    });

    window.addEventListener('pointermove', (e) => {
        if (!isDragging || hasTriggered) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Nhận diện tức thì chỉ sau 12px di chuyển ngang
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= 12) {
            if (Array.isArray(heroSlides) && heroSlides.length > 1) {
                hasTriggered = true;
                suppressClickUntil = performance.now() + 300; // Khóa click nhầm

                if (deltaX < 0) {
                    // Lướt sang trái -> Chuyển sang slide tiếp theo
                    const nextIndex = (currentSlideIndex + 1) % heroSlides.length;
                    switchHeroSlide(nextIndex, 1);
                } else {
                    // Lướt sang phải -> Chuyển về slide trước đó
                    const prevIndex = (currentSlideIndex - 1 + heroSlides.length) % heroSlides.length;
                    switchHeroSlide(prevIndex, -1);
                }
            }
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        hero.classList.remove('is-dragging');

        if (!hasTriggered) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const elapsed = Math.max(1, performance.now() - startTime);
            const velocityX = Math.abs(deltaX) / elapsed;

            // Nhận diện thao tác vẩy chuột nhẹ dứt khoát
            if ((Math.abs(deltaX) >= 8 || velocityX > 0.18) && Math.abs(deltaX) > Math.abs(deltaY) && Array.isArray(heroSlides) && heroSlides.length > 1) {
                hasTriggered = true;
                suppressClickUntil = performance.now() + 300;

                if (deltaX < 0) {
                    const nextIndex = (currentSlideIndex + 1) % heroSlides.length;
                    switchHeroSlide(nextIndex, 1);
                } else {
                    const prevIndex = (currentSlideIndex - 1 + heroSlides.length) % heroSlides.length;
                    switchHeroSlide(prevIndex, -1);
                }
            }
        }
    });

    hero.addEventListener('pointercancel', () => {
        isDragging = false;
        hasTriggered = false;
        hero.classList.remove('is-dragging');
    });

    // ── Hỗ trợ thêm cuộn ngang Trackpad/Mouse Wheel trên Hero Banner ──
    let wheelCooldown = 0;
    hero.addEventListener('wheel', (e) => {
        if (e.target.closest('.interests-wrapper')) return;
        if (Math.abs(e.deltaX) > 22 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            const now = performance.now();
            if (now - wheelCooldown < 350) return;
            wheelCooldown = now;

            if (Array.isArray(heroSlides) && heroSlides.length > 1) {
                if (e.deltaX > 0) {
                    const nextIndex = (currentSlideIndex + 1) % heroSlides.length;
                    switchHeroSlide(nextIndex, 1);
                } else {
                    const prevIndex = (currentSlideIndex - 1 + heroSlides.length) % heroSlides.length;
                    switchHeroSlide(prevIndex, -1);
                }
            }
        }
    }, { passive: true });
}

// ================================================================
// INITIAL RENDER (first load)
// ================================================================
function renderHeroBannerContent(movie, isInstant) {
    updateHeroBannerText(movie);
    updateHeroButtons(movie);
    setupHeroActions(movie);
    showHeroText();
    fetchLatestEpisodeCount(movie);

    const heroImage = document.getElementById('heroImage');
    const placeholder = document.getElementById('heroPlaceholder') || document.querySelector('.hero-placeholder-mask');
    if (!heroImage) return;

    if (placeholder && movie) {
        const rawPlaceholderUrl = movie.poster_url || movie.thumb_url;
        const optPlaceholderUrl = buildImageUrl(rawPlaceholderUrl, 600);
        if (optPlaceholderUrl) {
            placeholder.style.backgroundImage = `url('${optPlaceholderUrl}')`;
            placeholder.style.opacity = '0.35';
        }
    }

    const rawUrl = getHeroImageUrl(movie);
    const optUrl = buildImageUrl(rawUrl, 1200);

    if (optUrl && !document.querySelector('link[data-hero-preload]')) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = optUrl;
        preloadLink.setAttribute('data-hero-preload', '1');
        preloadLink.fetchPriority = 'high';
        document.head.appendChild(preloadLink);
    }

    heroImage.fetchPriority = 'high';
    heroImage.loading = 'eager';
    heroImage.decoding = 'async';

    heroImage.onerror = () => {
        const fallbackUrl = rawUrl.startsWith('http') ? rawUrl : `https://phimimg.com/${rawUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${rawUrl}`;
        if (heroImage.src !== fallbackUrl) heroImage.src = fallbackUrl;
        showHeroImage();
    };

    const finalUrl = optUrl || rawUrl;
    const layerA = document.getElementById('heroImageLayerA');
    const layerB = document.getElementById('heroImageLayerB');
    if (layerA) {
        if (finalUrl) layerA.src = finalUrl;
        layerA.style.opacity = '1';
        layerA.style.transform = 'translateZ(0) scale(1)';
    }
    if (layerB) {
        layerB.style.opacity = '0';
    }

    if (optUrl) {
        heroImage.setAttribute('data-current-src', optUrl);
        heroImage.src = optUrl;
    } else if (rawUrl) {
        const fallbackUrl = rawUrl.startsWith('http') ? rawUrl : `https://phimimg.com/${rawUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${rawUrl}`;
        heroImage.src = fallbackUrl;
    }
    showHeroImage();
}

function showHeroText() {
    const el = document.getElementById('heroContent');
    if (el) el.style.opacity = '1';
}

function showHeroImage() {
    const layerA = document.getElementById('heroImageLayerA');
    const heroImage = document.getElementById('heroImage');
    const placeholder = document.getElementById('heroPlaceholder') || document.querySelector('.hero-placeholder-mask');
    if (layerA) {
        layerA.style.opacity = '1';
    }
    if (heroImage) {
        heroImage.style.opacity = '1';
    }
    if (placeholder) {
        placeholder.style.opacity = '0';
        placeholder.style.transition = 'opacity 0.25s ease-out';
    }
}

async function fetchLatestEpisodeCount(movie) {
    if (!movie?.slug) return;
    try {
        await fetchRealMovieDetail(movie);
        const badge = document.querySelector('#heroBadges [data-ep-badge]');
        if (badge && movie.episode_current) {
            badge.textContent = movie.episode_current;
        }
    } catch (e) { /* silent */ }
}

// ================================================================
// HERO ACTION BUTTONS (Favorite + Info)
// ================================================================
function setupHeroActions(movie) {
    const favBtn = document.getElementById('heroFavBtn');
    const infoBtn = document.getElementById('heroInfoBtn');

    if (!movie) return;
    if (infoBtn) infoBtn.href = `/phim/${movie.slug}`;

    const updateFavUI = () => {
        if (!favBtn) return;
        const isFav = (typeof userService !== 'undefined') ? userService.isFavorite(movie.slug) : false;
        const svg = favBtn.querySelector ? favBtn.querySelector('svg') : null;
        if (svg) {
            svg.style.color = isFav ? '#ef4444' : '#ffffff';
            svg.style.fill = isFav ? '#ef4444' : 'currentColor';
        }
        const icon = favBtn.querySelector ? favBtn.querySelector('span') : null;
        if (icon) {
            icon.textContent = isFav ? 'favorite' : 'favorite_border';
            icon.classList.toggle('text-red-500', isFav);
            icon.classList.toggle('text-white/90', !isFav);
        }
    };

    updateFavUI();

    window.toggleHeroFavorite = function(btn) {
        if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
            if (typeof showAuthModal === 'function') showAuthModal('login');
            else alert('Vui lòng đăng nhập để lưu phim');
            return;
        }
        if (typeof userService !== 'undefined') {
            if (userService.isFavorite(movie.slug)) {
                userService.removeFromFavorites(movie.slug);
                if (typeof showNotification === 'function') showNotification('Đã xóa khỏi danh sách yêu thích', 'info');
            } else {
                userService.addToFavorites({ slug: movie.slug, name: movie.name, thumb_url: movie.thumb_url, year: movie.year || '' });
                if (typeof showNotification === 'function') showNotification('Đã thêm vào danh sách yêu thích', 'success');
            }
            updateFavUI();
        }
    };

    if (favBtn) {
        favBtn.onclick = (e) => {
            e.preventDefault();
            window.toggleHeroFavorite(favBtn);
        };
    }
}

// -- Expose globally ----------------------------------------------
window.switchHeroSlide = switchHeroSlide;

// -- Boot ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadHeroBanner();
});
