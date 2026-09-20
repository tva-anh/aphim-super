/**
 * APhim Super Core API Engine (Multi-Source API Merging & Ultra-Fast Image Loading Engine)
 * Combines phimapi.com + ophim1.com / ophim17.cc + nguonc.com
 */

(function() {
    window.APhimCore = window.APhimCore || {};
    window.APhimCore.imageCache = window.APhimCore.imageCache || new Set();

    const SVG_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' style='background:%23151821'%3E%3C/svg%3E";

    // 🎯 1. SAFE IMAGE URL CLEANER & CDN REWRITE WITH MIRROR SUPPORT
    window.APhimCore.getImgUrl = function(rawUrl) {
        if (!rawUrl) return '/images/no-poster.jpg';
        let url = String(rawUrl).trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url.replace('img.ophimimg.com', 'phimimg.com')
                      .replace('ophim1.com/uploads', 'phimimg.com/uploads');
        }
        const clean = url.replace(/^\//, '');
        if (clean.startsWith('upload/') || clean.startsWith('uploads/')) {
            return 'https://phimimg.com/' + clean;
        }
        return 'https://phimimg.com/uploads/movies/' + clean;
    };

    // 🎯 2. AUTO-HEALING FAST CDN MIRROR IMAGE FALLBACK & TMDB AUTO-HEAL
    window.APhimCore.handleImgError = async function(imgEl) {
        if (!imgEl) return;
        const currentSrc = imgEl.src || '';
        const stage = parseInt(imgEl.dataset.fallbackStage || '0');

        if (stage === 0) {
            imgEl.dataset.fallbackStage = '1';
            // Stage 1: Try img.ophimimg.com mirror
            if (currentSrc.includes('phimimg.com')) {
                imgEl.src = currentSrc.replace('phimimg.com', 'img.ophimimg.com');
                return;
            }
        } else if (stage === 1) {
            imgEl.dataset.fallbackStage = '2';
            // Stage 2: Try img.ophim.live mirror
            if (currentSrc.includes('img.ophimimg.com') || currentSrc.includes('phimimg.com')) {
                imgEl.src = currentSrc.replace('img.ophimimg.com', 'img.ophim.live').replace('phimimg.com', 'img.ophim.live');
                return;
            }
        }

        // Stage 3: Try TMDB Poster API
        const slug = imgEl.dataset.tmdbSlug;
        if (slug && stage < 3) {
            imgEl.dataset.fallbackStage = '3';
            try {
                const res = await fetch(`/api/tmdb/search/movie?query=${encodeURIComponent(slug.replace(/-/g, ' '))}&language=vi-VN`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.results && data.results[0] && data.results[0].poster_path) {
                        imgEl.src = 'https://image.tmdb.org/t/p/w500' + data.results[0].poster_path;
                        return;
                    }
                }
            } catch (e) {}
        }

        // Final fallback: local SVG/No-poster placeholder
        imgEl.onerror = null;
        imgEl.src = '/images/no-poster.jpg';
    };

    // 🎯 3. INTERSECTION OBSERVER LAZY LOADING ENGINE (0ms INITIAL DOM RENDER)
    window.APhimCore.initLazyObserver = function() {
        if ('IntersectionObserver' in window) {
            if (!window.APhimCore._imgObserver) {
                window.APhimCore._imgObserver = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            const targetUrl = img.dataset.src;
                            if (targetUrl) {
                                img.src = targetUrl;
                                img.removeAttribute('data-src');
                            }
                            obs.unobserve(img);
                        }
                    });
                }, { rootMargin: '300px 0px', threshold: 0.01 });
            }

            setTimeout(() => {
                document.querySelectorAll('img[data-src]').forEach(img => {
                    window.APhimCore._imgObserver.observe(img);
                });
            }, 10);
        } else {
            document.querySelectorAll('img[data-src]').forEach(img => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
            });
        }
    };

    // 🎯 4. INSTANT PARALLEL IMAGE PRELOADER ENGINE
    window.APhimCore.preloadImages = function(items, limit = 16) {
        if (!items || !Array.isArray(items)) return;
        const slice = items.slice(0, limit);
        slice.forEach(movie => {
            const url = window.APhimCore.getImgUrl(movie.poster_url || movie.thumb_url);
            if (url && !window.APhimCore.imageCache.has(url) && url.startsWith('http')) {
                window.APhimCore.imageCache.add(url);
                const img = new Image();
                img.src = url;
            }
        });
    };

    // 🎯 5. EXACT BADGE & EPISODE PARSER MATCHING HOMEPAGE INDEX.EJS
    window.APhimCore.renderBadges = function(movie) {
        const lang = (movie.lang || 'Vietsub').toLowerCase();
        let ep = (movie.episode_current || movie.episode || '').trim();
        const type = movie.type || '';

        if (!ep) {
            ep = (type === 'single' || type === 'phim-le') ? 'Full' : 'Tập 1';
        }

        const isFull = ep.toLowerCase().includes('full') || 
                       ep.toLowerCase().includes('hoàn tất') || 
                       ep.toLowerCase().includes('hoan tat') || 
                       type === 'single';

        // 1. Language Top Badges (P.Đề / Vietsub / T.Minh / L.Tiếng / Song Ngữ)
        let topBadgesHTML = '';
        const hasSn = lang.includes('song ngữ') || lang.includes('song ngu');
        const hasSub = lang.includes('sub') || lang.includes('phụ đề') || lang.includes('phu de') || lang.includes('vietsub') || lang.includes('p.đề');
        const hasTm = lang.includes('thuyết minh') || lang.includes('thuyet minh') || lang.includes('t.minh');
        const hasLt = lang.includes('lồng tiếng') || lang.includes('long tieng') || lang.includes('l.tiếng');

        if (hasSn) {
            topBadgesHTML += `<span class="badge-tag badge-tag-sn">Song ngữ</span>`;
        }
        if (hasSub) {
            topBadgesHTML += `<span class="badge-tag badge-tag-pd">${(hasTm || hasLt) ? 'P.Đề' : 'Vietsub'}</span>`;
        }
        if (hasTm) {
            topBadgesHTML += `<span class="badge-tag badge-tag-tm">T.Minh</span>`;
        }
        if (hasLt) {
            topBadgesHTML += `<span class="badge-tag badge-tag-lt">L.Tiếng</span>`;
        }
        if (!hasSn && !hasSub && !hasTm && !hasLt) {
            topBadgesHTML += `<span class="badge-tag badge-tag-pd">Vietsub</span>`;
        }

        // Quality Badge
        const quality = (movie.quality || 'FHD').toUpperCase();
        if (quality && quality !== 'SD') {
            topBadgesHTML += `<span class="badge-fhd">${quality}</span>`;
        }

        // 2. Episode Bottom Badge (Yellow badge for Full / Orange for Episodes like "Tập 11")
        const epBadgeClass = isFull ? 'badge-ep-yellow' : 'badge-ep-orange';
        let bottomBadgesHTML = `<span class="${epBadgeClass}">${ep}</span>`;

        return { topBadgesHTML, bottomBadgesHTML };
    };

    // 🎯 6. UNIVERSAL MOVIE CARD RENDERER MATCHING HOMEPAGE INDEX.EJS (INSTANT DIRECT SRC LOADING)
    window.APhimCore.createGridCardHTML = function(movie) {
        const imgUrl = window.APhimCore.getImgUrl(movie.thumb_url || movie.poster_url);
        const { topBadgesHTML, bottomBadgesHTML } = window.APhimCore.renderBadges(movie);

        return `
            <a href="/phim/${movie.slug}" title="${movie.name}" class="grid-movie-card">
                <div class="grid-poster-wrap">
                    ${topBadgesHTML ? `<div class="grid-top-badges">${topBadgesHTML}</div>` : ''}
                    <img src="${imgUrl}" alt="${movie.name}" loading="lazy" decoding="async" fetchpriority="high" onerror="window.APhimCore.handleImgError(this)" />
                    <div class="phimmoi-play-overlay">
                        <div class="phimmoi-play-btn">
                            <svg viewBox="0 0 24 24"><polygon points="7,4 19,12 7,20"/></svg>
                        </div>
                    </div>
                    ${bottomBadgesHTML ? `<div class="grid-bottom-badges">${bottomBadgesHTML}</div>` : ''}
                </div>
                <div class="grid-title-wrap">
                    <div class="grid-title-vi">${movie.name}</div>
                    <div class="grid-title-en">${movie.origin_name || ''}</div>
                </div>
            </a>
        `;
    };

    // 🎯 7. MULTI-SOURCE FAST API FETCH WITH IN-MEMORY & SESSION CACHING (0ms INSTANT RENDER)
    const _apiMemoryCache = new Map();
    const API_CACHE_TTL = 8 * 60 * 1000; // 8 phút cache tại trình duyệt

    window.APhimCore.fetchMovieGridData = async function(type, paramValue, page = 1) {
        let endpointPath = '';

        if (typeof type === 'string' && (type.startsWith('http://') || type.startsWith('https://') || type.startsWith('/v1/api/'))) {
            let fullUrlStr = type;
            if (fullUrlStr.startsWith('/v1/api/')) {
                endpointPath = fullUrlStr;
            } else {
                try {
                    const u = new URL(fullUrlStr);
                    endpointPath = u.pathname + u.search;
                } catch (e) {
                    endpointPath = fullUrlStr;
                }
            }
        } else if (type === 'list') {
            if (paramValue === 'phim-moi-cap-nhat') {
                endpointPath = '/v1/api/danh-sach/phim-moi-cap-nhat?page=' + page;
            } else {
                endpointPath = '/v1/api/danh-sach/' + paramValue + '?page=' + page;
            }
        } else if (type === 'category' || type === 'the-loai') {
            endpointPath = '/v1/api/the-loai/' + paramValue + '?page=' + page;
        } else if (type === 'country' || type === 'quoc-gia') {
            endpointPath = '/v1/api/quoc-gia/' + paramValue + '?page=' + page;
        } else if (type === 'search' || type === 'tim-kiem') {
            endpointPath = '/v1/api/tim-kiem?keyword=' + encodeURIComponent(paramValue) + '&page=' + page;
        }

        if (!endpointPath) {
            endpointPath = '/v1/api/danh-sach/phim-moi-cap-nhat?page=' + page;
        }

        // 🚀 1. Check In-Memory Cache first (0ms)
        const cacheKey = 'aphim_api_cache_' + endpointPath;
        const memoryCached = _apiMemoryCache.get(cacheKey);
        if (memoryCached && (Date.now() - memoryCached.timestamp < API_CACHE_TTL)) {
            window.APhimCore.preloadImages(memoryCached.data.items, 16);
            setTimeout(() => window.APhimCore.initLazyObserver(), 30);
            return memoryCached.data;
        }

        // 🚀 2. Check Session Storage Cache next
        try {
            const sessionRaw = sessionStorage.getItem(cacheKey);
            if (sessionRaw) {
                const parsed = JSON.parse(sessionRaw);
                if (parsed && (Date.now() - parsed.timestamp < API_CACHE_TTL)) {
                    _apiMemoryCache.set(cacheKey, parsed);
                    window.APhimCore.preloadImages(parsed.data.items, 16);
                    setTimeout(() => window.APhimCore.initLazyObserver(), 30);
                    return parsed.data;
                }
            }
        } catch (e) {}

        const urlsToTry = [
            'https://phimapi.com' + endpointPath
        ];

        // Safe fallback only if endpoint is valid /v1/api/ path
        if (endpointPath && endpointPath.startsWith('/v1/api/')) {
            urlsToTry.push('https://ophim1.com' + endpointPath);
        }

        let lastError = null;

        for (const url of urlsToTry) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    let items = [];
                    let totalPages = 1;
                    let titlePage = '';

                    if (data.data && data.data.items) {
                        items = data.data.items;
                        totalPages = data.data.params?.pagination?.totalPages || 50;
                        titlePage = data.data.titlePage || '';
                    } else if (data.items) {
                        items = data.items;
                        totalPages = data.pagination?.totalPages || 50;
                    }

                    if (items && items.length > 0) {
                        const result = { items, totalPages, titlePage };
                        // Save to In-Memory & Session Storage Cache
                        const cacheObj = { data: result, timestamp: Date.now() };
                        _apiMemoryCache.set(cacheKey, cacheObj);
                        try {
                            sessionStorage.setItem(cacheKey, JSON.stringify(cacheObj));
                        } catch (e) {}

                        // 🚀 PRELOAD POSTER IMAGES & INITIALIZE LAZY OBSERVER IMMEDIATELY
                        window.APhimCore.preloadImages(items, 16);
                        setTimeout(() => window.APhimCore.initLazyObserver(), 50);
                        return result;
                    }
                }
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError || new Error('Tất cả nguồn API phim đều không phản hồi.');
    };
})();

