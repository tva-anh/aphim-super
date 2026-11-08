/**
 * APhim Super Core API Engine (Multi-Source API Merging & Ultra-Fast Image Loading Engine)
 * Combines phimapi.com + ophim1.com / ophim17.cc + nguonc.com
 */

(function() {
    window.APhimCore = window.APhimCore || {};
    window.APhimCore.imageCache = window.APhimCore.imageCache || new Set();

    const SVG_NO_POSTER = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%231a1d26'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='20' font-weight='bold'%3EAPhim Cinema%3C/text%3E%3C/svg%3E";

    // 🎯 1. SAFE IMAGE URL CLEANER & CDN REWRITE WITH MIRROR SUPPORT
    window.APhimCore.getImgUrl = function(rawUrl, width = 440, quality = 85) {
        if (!rawUrl) return '';
        let url = String(rawUrl).trim();
        if (url.startsWith('data:image')) return url;
        if (url.includes('wsrv.nl')) return url;

        // Xóa triệt để tiền tố kép uploads/movies/upload/vod
        url = url.replace(/(?:https?:\/\/[^\/]+)?\/?(?:uploads\/movies\/)+(upload\/vod\/)/, '$1');
        url = url.replace(/^(?:uploads\/movies\/)+(upload\/vod\/)/, '$1');

        let full = '';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            if (url.includes('phimimg.com/uploads/movies/img/')) {
                return url.replace('phimimg.com/uploads/movies/img/', 'oncdn.vip/img/');
            }
            full = url.replace('img.ophimimg.com', 'phimimg.com')
                      .replace('img.phimapi.com', 'phimimg.com')
                      .replace('ophim1.com/uploads', 'phimimg.com/uploads')
                      .replace('phimapi.com/uploads', 'phimimg.com/uploads');
        } else {
            const clean = url.replace(/^\//, '');
            if (clean.startsWith('img/')) {
                full = 'https://oncdn.vip/' + clean;
            } else if (clean.startsWith('upload/') || clean.startsWith('uploads/')) {
                full = 'https://phimimg.com/' + clean;
            } else if (clean.match(/^\d{8}-\d+\//)) {
                full = 'https://phimimg.com/upload/vod/' + clean;
            } else if (clean.includes('.com/') || clean.includes('.vn/') || clean.includes('.net/') || clean.includes('.org/')) {
                full = 'https://' + clean;
            } else {
                full = 'https://phimimg.com/uploads/movies/' + clean;
            }
        }

        // Trả về trực tiếp ảnh gốc (phimimg.com đã được Cloudflare CDN phục vụ siêu tốc)
        return full;
    };

    // 🧹 Tự động xóa sạch các poster TMDB gán sai bị lưu trong sessionStorage
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('tmdb_card_poster_')) {
                sessionStorage.removeItem(k);
            }
        }
    } catch (_) {}

    // 🎯 2. AUTO-HEALING FAST CDN MIRROR IMAGE FALLBACK
    window.APhimCore.handleImgError = function(imgEl) {
        if (!imgEl) return;
        const fallbackUrl = imgEl.dataset.fallback || '';
        const currentSrc = imgEl.src || '';
        const originalSrc = imgEl.dataset.originalSrc || currentSrc;

        // BƯỚC 1: Thử fallbackUrl (ví dụ thumb_url thay vì poster_url hoặc ngược lại)
        if (!imgEl.dataset.triedFallback && fallbackUrl && fallbackUrl !== currentSrc && !fallbackUrl.includes('no-poster') && fallbackUrl.startsWith('http')) {
            imgEl.dataset.triedFallback = '1';
            imgEl.src = fallbackUrl;
            return;
        }

        // BƯỚC 2: Thử direct source từ origin nếu CDN proxy gặp sự cố
        if (!imgEl.dataset.triedDirect && originalSrc && originalSrc.includes('wsrv.nl')) {
            imgEl.dataset.triedDirect = '1';
            const m = originalSrc.match(/url=([^&]+)/);
            if (m && m[1]) {
                try {
                    let decoded = decodeURIComponent(m[1]);
                    if (decoded.includes('url=')) {
                        const m2 = decoded.match(/url=([^&]+)/);
                        if (m2 && m2[1]) decoded = decodeURIComponent(m2[1]);
                    }
                    if (decoded && decoded.startsWith('http') && decoded !== currentSrc) {
                        imgEl.src = decoded;
                        return;
                    }
                } catch (_) {}
            }
        }

        // BƯỚC 3: Thử TMDB Fast CDN WebP Poster (30ms) nếu server nguồn bị đơ/chậm
        const slug = imgEl.dataset.slug || '';
        const title = imgEl.dataset.title || '';
        const originTitle = imgEl.dataset.origin || '';
        if (!imgEl.dataset.triedTmdb && slug) {
            imgEl.dataset.triedTmdb = '1';
            try {
                const cached = sessionStorage.getItem('tmdb_card_poster_' + slug);
                if (cached && cached !== currentSrc) {
                    imgEl.src = cached;
                    return;
                }
                const q = originTitle || title || slug.replace(/-/g, ' ');
                if (q) {
                    fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(q)}`)
                        .then(r => r.ok ? r.json() : null)
                        .then(data => {
                            const match = data?.results?.[0];
                            const p = match?.poster_path || match?.backdrop_path;
                            if (p && imgEl.isConnected) {
                                const tmdbImg = `https://image.tmdb.org/t/p/w300${p}`;
                                try { sessionStorage.setItem('tmdb_card_poster_' + slug, tmdbImg); } catch (_) {}
                                imgEl.src = tmdbImg;
                            } else {
                                imgEl.onerror = null;
                                imgEl.src = SVG_NO_POSTER;
                            }
                        })
                        .catch(() => {
                            imgEl.onerror = null;
                            imgEl.src = SVG_NO_POSTER;
                        });
                    return;
                }
            } catch (_) {}
        }

        // Final fallback: inline SVG Data URI (chuẩn tỉ lệ 2:3, không bao giờ 404)
        imgEl.onerror = null;
        imgEl.src = SVG_NO_POSTER;
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

    // 🎯 4. PRELOAD IMAGES (No-op để tránh Cloudflare rate-limit và nghẽn tab)
    window.APhimCore.preloadImages = function(items, limit = 24) {
        return;
    };

    // 🎯 4.1 BILINGUAL BACKGROUND SYNC
    if (typeof window !== 'undefined' && (!window.__BILINGUAL_SLUGS__ || window.__BILINGUAL_SLUGS__.size === 0)) {
        try {
            fetch('/api/bilingual-slugs')
                .then(r => r.json())
                .then(list => {
                    if (Array.isArray(list)) window.__BILINGUAL_SLUGS__ = new Set(list);
                })
                .catch(() => {});
        } catch (_) {}
    }

    window.APhimCore.isBilingualSlug = function(slug) {
        if (!slug) return false;
        const clean = String(slug).trim().toLowerCase();
        return !!(window.__BILINGUAL_SLUGS__ && window.__BILINGUAL_SLUGS__.has(clean));
    };

    // 🎯 5. LUXURY BADGE HEADER RENDERER (CHẤT NHƯ SONG NGỮ, KHÔNG CHE POSTER)
    window.APhimCore.renderCardBadgesHeader = function(movie, options = {}) {
        const slug = (movie.slug || '').toLowerCase().trim();
        const isSongNgu = movie.is_song_ngu || 
                          movie.has_bilingual ||
                          (movie.lang && (movie.lang.toLowerCase().includes('song ngữ') || movie.lang.toLowerCase().includes('song ngu'))) ||
                          (window.__BILINGUAL_SLUGS__ && window.__BILINGUAL_SLUGS__.has(slug)) ||
                          (typeof window !== 'undefined' && (
                              window.location.pathname.includes('/phim-song-ngu') || 
                              new URLSearchParams(window.location.search).get('list') === 'phim-song-ngu'
                          ));

        // 🌟 1. Nhãn Song Ngữ tím độc lập góc trên bên phải
        const songNguHTML = isSongNgu ? `
            <div class="badge-song-ngu-pill" title="Phim có phụ đề song ngữ chất lượng cao">
                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                    <path d="m12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z"/>
                </svg>
                <span>Song Ngữ</span>
            </div>
        ` : '';

        const lang = (movie.lang || 'Vietsub').toLowerCase();
        const epRaw = (movie.episode_current || movie.episode || '').trim();
        const type = movie.type || '';

        const isPlaceholder = epRaw.toLowerCase().includes('song ngữ') || 
                             epRaw.toLowerCase().includes('song ngu') || 
                             epRaw.toLowerCase() === 'fhd' || 
                             epRaw.toLowerCase() === 'hd';
        const cleanEpRaw = isPlaceholder ? '' : epRaw;

        const hasSub = lang.includes('sub') || lang.includes('phụ đề') || lang.includes('phu de') || lang.includes('vietsub') || (!lang.includes('thuyết minh') && !lang.includes('lồng tiếng'));
        const hasTm = lang.includes('thuyết minh') || lang.includes('thuyet minh') || lang.includes('t.minh');
        const hasLt = lang.includes('lồng tiếng') || lang.includes('long tieng') || lang.includes('l.tiếng');

        let num = '';
        if (cleanEpRaw) {
            const numMatch = cleanEpRaw.match(/(\d+)\s*\/\s*(\d+)/);
            if (numMatch) {
                num = numMatch[1];
            } else {
                const singleNumMatch = cleanEpRaw.match(/(?:tập|tap)?\s*(\d+)/i);
                if (singleNumMatch) {
                    num = singleNumMatch[1];
                }
            }
        }

        const isFull = !num && (
            cleanEpRaw.toLowerCase().includes('full') || 
            cleanEpRaw.toLowerCase().includes('hoàn tất') || 
            cleanEpRaw.toLowerCase().includes('hoan tat') || 
            type === 'single' || 
            type === 'phim-le'
        );

        const epSuffix = num ? `. ${num}` : '';

        // 🌟 2. CỤM NHÃN VIẾT TẮT ĐẶT DƯỚI CHÂN POSTER (PĐ. 8, TM. 8, LT. 8, Full...)
        let bottomBadges = [];

        // Nếu phim có sẵn mảng available_languages chuẩn từ catalog/nguồn
        if (Array.isArray(movie.available_languages) && movie.available_languages.length > 0) {
            movie.available_languages.forEach(item => {
                const parts = String(item).split(':');
                const tag = parts[0].toUpperCase().trim();
                const val = (parts[1] || '').trim();
                const isSingleEp = val === '1' || val.toLowerCase() === 'full' || cleanEpRaw.includes('1/1') || type === 'single' || type === 'phim-le';
                const epVal = (!isSingleEp && val && val.toLowerCase() !== 'full') ? `. ${val}` : (!isSingleEp && num ? `. ${num}` : '');
                if (tag === 'PD') {
                    bottomBadges.push(`<span class="badge-seg-sub">${isSingleEp ? 'Full' : 'PĐ' + epVal}</span>`);
                } else if (tag === 'TM') {
                    bottomBadges.push(`<span class="badge-seg-tm">TM${epVal}</span>`);
                } else if (tag === 'LT') {
                    bottomBadges.push(`<span class="badge-seg-lt">LT${epVal}</span>`);
                }
            });
        }

        // Fallback theo lang và epSuffix
        if (bottomBadges.length === 0) {
            if (hasSub) {
                bottomBadges.push(`<span class="badge-seg-sub">PĐ${epSuffix}</span>`);
            }
            if (hasTm) {
                bottomBadges.push(`<span class="badge-seg-tm">TM${epSuffix}</span>`);
            }
            if (hasLt && bottomBadges.length < 3) {
                bottomBadges.push(`<span class="badge-seg-lt">LT${epSuffix}</span>`);
            }
        }

        // Nếu không có sub/tm mà là phim hoàn tất/tập
        if (bottomBadges.length === 0) {
            const fallbackLabel = isFull ? 'Full' : (num ? `Tập ${num}` : 'PĐ');
            bottomBadges.push(`<span class="badge-seg-sub">${fallbackLabel}</span>`);
        }

        const bottomPillsHTML = `
            <div class="card-bottom-pills-center">
                ${bottomBadges.join('')}
            </div>
        `;

        // 🌟 3. Góc trên bên trái: Chỉ hiện nếu có #Rank và ⭐ Điểm (Top 10), hoàn toàn thoáng cho poster
        let topPills = [];
        if (options.rank) {
            topPills.push(`<span class="ap-badge-rank">#${options.rank}</span>`);
        }
        if (options.starRating) {
            topPills.push(`
                <span class="ap-badge-score">
                    <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    <span>${options.starRating}</span>
                </span>
            `);
        }

        const topPillsHTML = topPills.length > 0 ? `
            <div class="card-top-badges ${isSongNgu ? 'has-song-ngu' : ''}">
                <div class="card-pills-left">
                    ${topPills.join('')}
                </div>
            </div>
        ` : '';

        return `
            ${topPillsHTML}
            ${songNguHTML}
            ${bottomPillsHTML}
        `;
    };

    // 🎯 6. UNIVERSAL MOVIE CARD RENDERER MATCHING HOMEPAGE INDEX.EJS
    window.APhimCore.createGridCardHTML = function(movie, index = 0) {
        const primaryImg = window.APhimCore.getImgUrl(movie.poster_url || movie.thumb_url);
        const fallbackImg = window.APhimCore.getImgUrl(movie.thumb_url || movie.poster_url);
        const badgesHeaderHTML = window.APhimCore.renderCardBadgesHeader(movie);

        const isPriority = index < 2;
        const loadingAttr = isPriority ? 'loading="eager"' : 'loading="lazy"';
        const priorityAttr = index < 2 ? 'fetchpriority="high"' : 'fetchpriority="low"';

        return `
            <a href="/phim/${movie.slug}${typeof window !== 'undefined' && (window.location.pathname.includes('/phim-song-ngu') || new URLSearchParams(window.location.search).get('list') === 'phim-song-ngu') ? '?version=song-ngu' : ''}" title="${movie.name}" class="grid-movie-card">
                <div class="grid-poster-wrap">
                    ${badgesHeaderHTML}
                    <img src="${primaryImg}" data-original-src="${primaryImg}" data-fallback="${fallbackImg}" data-slug="${movie.slug || ''}" data-title="${(movie.name || '').replace(/"/g, '&quot;')}" data-origin="${(movie.origin_name || '').replace(/"/g, '&quot;')}" alt="${movie.name}" ${loadingAttr} ${priorityAttr} decoding="async" referrerpolicy="no-referrer" onerror="window.APhimCore.handleImgError(this)" />
                    <div class="phimmoi-play-overlay">
                        <div class="phimmoi-play-btn">
                            <svg viewBox="0 0 24 24"><polygon points="7,4 19,12 7,20"/></svg>
                        </div>
                    </div>
                </div>
                <div class="grid-title-wrap">
                    <div class="grid-title-vi">${movie.name}</div>
                    <div class="grid-title-en">${movie.origin_name || '&nbsp;'}</div>
                </div>
            </a>
        `;
    };

    // 🎯 7. MULTI-SOURCE FAST API FETCH WITH IN-MEMORY & SESSION CACHING (0ms INSTANT RENDER)
    const _apiMemoryCache = new Map();
    const API_CACHE_TTL = 8 * 60 * 1000; // 8 phút cache tại trình duyệt

    window.APhimCore.fetchMovieGridData = async function(type, paramValue, page = 1) {
        let endpointPath = '';

        if (typeof type === 'string' && (type.startsWith('http://') || type.startsWith('https://') || type.startsWith('/v1/api/') || type.startsWith('/api/'))) {
            let fullUrlStr = type;
            if (fullUrlStr.startsWith('/v1/api/') || fullUrlStr.startsWith('/api/')) {
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
            } else if (paramValue === 'phim-song-ngu') {
                endpointPath = '/api/phim-song-ngu?page=' + page;
            } else {
                endpointPath = '/v1/api/danh-sach/' + paramValue + '?page=' + page;
            }
        } else if (type === 'phim-song-ngu' || type === 'song-ngu') {
            endpointPath = '/api/phim-song-ngu?page=' + page;
        } else if (type === 'category' || type === 'the-loai') {

            if (paramValue && paramValue.startsWith('phim-18')) {
                endpointPath = paramValue.includes('?') 
                    ? `/api/the-loai/${paramValue}` 
                    : `/api/the-loai/phim-18?page=${page}`;
            } else {
                endpointPath = '/v1/api/the-loai/' + paramValue + '?page=' + page;
            }
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

        const urlsToTry = [];
        if (endpointPath.startsWith('/api/')) {
            urlsToTry.push(endpointPath);
        } else {
            urlsToTry.push('https://phimapi.com' + endpointPath);
            urlsToTry.push('/api/movies/phimapi-proxy?path=' + encodeURIComponent(endpointPath));
        }

        let lastError = null;

        for (const url of urlsToTry) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 7500);

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

                    const result = { items: items || [], totalPages: totalPages || 1, titlePage };
                    // Save to In-Memory & Session Storage Cache
                    const cacheObj = { data: result, timestamp: Date.now() };
                    _apiMemoryCache.set(cacheKey, cacheObj);
                    try {
                        sessionStorage.setItem(cacheKey, JSON.stringify(cacheObj));
                    } catch (e) {}

                    setTimeout(() => window.APhimCore.initLazyObserver(), 50);
                    return result;
                }
            } catch (err) {
                lastError = err;
            }
        }

        console.warn('[APhimCore] Không thể tải dữ liệu:', endpointPath, lastError?.message || lastError);
        return { items: [], totalPages: 1, titlePage: '' };
    };

    // 🎯 8. HOVER INTENT TURBO PRELOAD ENGINE (DI CHUỘT VÀO MENU / LINK THÌ DỒN LỰC TẢI TRƯỚC)
    const _hoverPreloadedUrls = new Set();
    window.APhimCore.initHoverPreload = function() {
        let hoverTimer = null;

        function handleHover(e) {
            const link = e.target.closest('a[href]');
            if (!link) return;
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            clearTimeout(hoverTimer);
            hoverTimer = setTimeout(() => {
                if (_hoverPreloadedUrls.has(href)) return;
                _hoverPreloadedUrls.add(href);

                try {
                    const u = new URL(href, window.location.origin);
                    const pathname = u.pathname;
                    const searchParams = u.searchParams;

                    let type = '', paramVal = '', page = searchParams.get('page') || 1;
                    if (pathname === '/phim-theo-quoc-gia') {
                        type = 'country';
                        paramVal = searchParams.get('country') || 'viet-nam';
                    } else if (pathname === '/categories') {
                        type = 'category';
                        paramVal = searchParams.get('category') || 'hanh-dong';
                    } else if (pathname === '/danh-sach') {
                        type = 'list';
                        paramVal = searchParams.get('list') || 'phim-bo';
                    }

                    if (type && paramVal) {
                        window.APhimCore.fetchMovieGridData(type, paramVal, page);
                    }
                } catch (_) {}
            }, 60);
        }

        document.addEventListener('mouseover', handleHover, { passive: true });
        document.addEventListener('touchstart', handleHover, { passive: true });
        document.addEventListener('mouseout', function(e) {
            if (e.target.closest('a[href]')) clearTimeout(hoverTimer);
        }, { passive: true });
    };

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => window.APhimCore.initHoverPreload());
        } else {
            window.APhimCore.initHoverPreload();
        }
    }
})();

