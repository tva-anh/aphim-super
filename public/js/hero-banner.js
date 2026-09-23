// ================================================================
// A PHIM � Hero Banner v10
// Interactive Slide System: Click Thumbnail + Swipe/Drag
// + Auto-return to Admin Banner sau 6 gi�y kh�ng tuong t�c
// ================================================================

// -- State ------------------------------------------------------
let currentAdminBanner = null;   // Banner admin m?c d?nh (index 0)
let heroSlides = [];     // [adminBanner, thumb1, thumb2, ...]
let currentSlideIndex = 0;
let isTransitioning = false;
let autoReturnTimer = null;   // Timer t? d?ng v? index 0
const AUTO_RETURN_DELAY = 3500;   // 3.5 gi�y sau khi kh�ng tuong t�c

// -- Entry Point -------------------------------------------------
async function loadHeroBanner() {

    // 1. INSTANT: d?c cache LocalStorage hi?n th? ngay
    try {
        const cachedBanner = localStorage.getItem('cinestream_active_banner');
        if (cachedBanner) {
            const cached = JSON.parse(cachedBanner);
            currentAdminBanner = convertBannerToMovie(cached);
            heroSlides = [currentAdminBanner];
            renderHeroBannerContent(currentAdminBanner, true);
        }
    } catch (e) { console.warn('Hero cache read error:', e); }

    // 2. BACKGROUND: fetch t? backend
    try {
        const apiUrl = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : '';
        if (!apiUrl) throw new Error('API URL undefined');

        const res = await fetch(`${apiUrl}/api/banners/active`, {
            method: 'GET', headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success && data.data) {
            localStorage.setItem('cinestream_active_banner', JSON.stringify(data.data));
            const newMovie = convertBannerToMovie(data.data);

            if (!currentAdminBanner || 
                currentAdminBanner.slug !== newMovie.slug || 
                currentAdminBanner.thumb_url !== newMovie.thumb_url ||
                currentAdminBanner.poster_url !== newMovie.poster_url) {
                
                currentAdminBanner = newMovie;
                heroSlides[0] = currentAdminBanner;
                if (currentSlideIndex === 0) {
                    renderHeroBannerContent(currentAdminBanner, false);
                    
                    // Force update the hero image if we are already on slide 0
                    const heroImage = document.getElementById('heroImage');
                    if (heroImage) {
                        const optUrl = buildImageUrl(getHeroImageUrl(currentAdminBanner), 1200);
                        if (optUrl) heroImage.src = optUrl;
                    }
                }
            }
        } else {
            localStorage.removeItem('cinestream_active_banner');
            if (!currentAdminBanner) await loadFallbackBanner();
        }
    } catch (err) {
        console.error('Banner API error:', err);
        if (!currentAdminBanner) await loadFallbackBanner();
    }

    // 3. Load thumbnail movies (ch?y ng?m)
    setTimeout(loadThumbnailMovies, 120);

    // 4. G?n swipe handler
    attachSwipeHandler();
}

// -- Fallback từ ophim API ----------------------------------------
async function loadFallbackBanner() {
    try {
        const data = await movieAPI.getMoviesByCountry('viet-nam', 1);
        const items = data?.data?.items || data?.items;
        const isOk = data && ((data && (data.status === 'success' || data.status === true || data.status)) || data.status === true || data.status);
        
        if (isOk && items && items.length > 0) {
            currentAdminBanner = items[0];
            heroSlides[0] = currentAdminBanner;
            renderHeroBannerContent(currentAdminBanner, false);
        } else {
            showHeroText();
        }
    } catch (e) {
        console.error('Fallback banner error:', e);
        showHeroText();
    }
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
        thumb_url: landscape, // Ảnh ngang
        poster_url: portrait,  // Ảnh dọc
        content: banner.content || '',
        year: banner.year || '2026',
        quality: banner.quality || 'HD',
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
    const isMobile = window.innerWidth < 768;

    // TÍNH NĂNG MỚI: Nếu Admin cài link ảnh Custom trực tiếp (bắt đầu bằng http và không phải từ ophimimg), ưu tiên tuyệt đối lấy làm ảnh nền Desktop
    if (!isMobile && movie.thumb_url && movie.thumb_url.startsWith('http') && !movie.thumb_url.includes('ophimimg.com') && !movie.thumb_url.includes('phimimg.com')) {
        return movie.thumb_url;
    }

    const cacheKey = `tmdb_hero_${movie.slug}`;
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const tmdbData = JSON.parse(cached);
            if (tmdbData) {
                if (!isMobile && tmdbData.backdrop) return tmdbData.backdrop;
                if (isMobile && tmdbData.poster) return tmdbData.poster;
                if (tmdbData.backdrop) return tmdbData.backdrop;
                if (tmdbData.poster) return tmdbData.poster;
            }
        }
    } catch(e) {}
    
    if (!isMobile) {
        // Desktop: Ưu tiên ảnh ngang (thumb_url là ảnh ngang)
        return movie.thumb_url || movie.poster_url || '';
    } else {
        // Mobile: Ưu tiên ảnh dọc (poster_url là ảnh dọc)
        return movie.poster_url || movie.thumb_url || '';
    }
}

// -- State Logo Cache & ID ch?ng xung d?t (Race Condition Protection) --
let currentLogoLoadId = 0;
const logoCache = new Map(); // slug/name -> logoUrl ho?c 'TEXT_ONLY'

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

// -- TMDB & Custom Logo Fetcher Siu T?c --------------------------
async function loadHeroLogo(movie) {
    const heroTitle = document.getElementById('heroTitle');
    if (!heroTitle) return;

    // Tang ID phin t?i logo hi?n t?i d? lo?i b? ngay cc request cu dang ch?y ng?m
    const loadId = ++currentLogoLoadId;

    // Ngay l?p t?c xa s?ch m?i logo cu trn DOM d? khng bao gi? b? ch?ng cho
    document.querySelectorAll('#heroTitleImg').forEach(el => el.remove());

    if (!movie) {
        heroTitle.style.display = 'block';
        return;
    }

    // Hm ph? tr? hi?n th? logo mu?t m, an ton
    function applyLogoToDOM(url) {
        if (loadId !== currentLogoLoadId) return; // N?u user chuy?n slide khc -> h?y ngay
        document.querySelectorAll('#heroTitleImg').forEach(el => el.remove());

        // ? FIX: ?n heroTitle NGAY L?P T?C khi b?t d?u t?i logo
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

    // 1. Uu tin tuy?t d?i: N?u c Custom Logo t? Admin th dng lun (khng g?i TMDB n?a)
    if (movie.logoUrl && movie.logoUrl.trim() !== '') {
        applyLogoToDOM(movie.logoUrl.trim());
        return;
    }

    // 2. Ki?m tra b? nh? t?m (Cache): N?u d t?ng t?i logo phim ny r?i th dng ngay l?p t?c
    const cacheKey = movie.slug || movie.name;
    if (logoCache.has(cacheKey)) {
        const cachedUrl = logoCache.get(cacheKey);
        if (cachedUrl && cachedUrl !== 'TEXT_ONLY') {
            applyLogoToDOM(cachedUrl);
        } else {
            heroTitle.style.display = 'block';
        }
        return;
    }

    // Hiển thị text title tạm thời trong lúc truy vấn TMDB lần đầu
    heroTitle.style.display = 'block';

    // 3. Tiến hành tìm trên TMDB qua backend proxy
    async function secureFetch(target) {
        try {
            const r = await fetch(target, { signal: AbortSignal.timeout(3000) });
            if (r.ok) return r;
        } catch (e) {}
        return null;
    }

    try {
        let tmdbId = movie.tmdb?.id;
        let type = movie.tmdb?.type === 'tv' ? 'tv' : 'movie';

        // Search by origin_name or name if TMDB ID is missing
        if (!tmdbId) {
            const query = encodeURIComponent(movie.origin_name || movie.name);
            const searchUrl = `/api/tmdb/search/multi?query=${query}`;
            const searchRes = await secureFetch(searchUrl);
            if (loadId !== currentLogoLoadId) return;

            if (searchRes) {
                const searchData = await searchRes.json();
                if (searchData.results && searchData.results.length > 0) {
                    const bestResult = searchData.results.find(r => r.media_type === 'tv' || r.media_type === 'movie') || searchData.results[0];
                    if (bestResult && bestResult.id) {
                        tmdbId = bestResult.id;
                        type = bestResult.media_type || 'movie';
                    }
                }
            }
        }

        if (loadId !== currentLogoLoadId) return;
        if (!tmdbId) {
            logoCache.set(cacheKey, 'TEXT_ONLY');
            return;
        }

        const url = `/api/tmdb/${type}/${tmdbId}/images`;
        const res = await secureFetch(url);
        if (loadId !== currentLogoLoadId) return;
        if (!res) {
            logoCache.set(cacheKey, 'TEXT_ONLY');
            return;
        }

        const data = await res.json();
        if (loadId !== currentLogoLoadId) return;

        if (data.logos && data.logos.length > 0) {
            const viLogo = data.logos.find(l => l.iso_639_1 === 'vi');
            const enLogo = data.logos.find(l => l.iso_639_1 === 'en');
            const bestLogo = viLogo || enLogo || data.logos[0];

            if (bestLogo && bestLogo.file_path) {
                const imgUrl = `https://image.tmdb.org/t/p/w300${bestLogo.file_path}`;
                logoCache.set(cacheKey, imgUrl);
                _persistLogoCache();
                applyLogoToDOM(imgUrl);
                return;
            }
        }
        logoCache.set(cacheKey, 'TEXT_ONLY');
    } catch (e) {
        console.warn('TMDB logo load failed');
        if (loadId === currentLogoLoadId) {
            logoCache.set(cacheKey, 'TEXT_ONLY');
        }
    }
}

// ================================================================
// AUTO-RETURN TIMER  t? v? Admin Banner sau N giy b? tuong tc
// ================================================================
function startAutoReturnTimer() {
    clearAutoReturnTimer();
    // Ch? d?t timer n?u dang ? slide khc 0
    if (currentSlideIndex !== 0) {
        autoReturnTimer = setTimeout(() => {
            if (currentSlideIndex !== 0) {
                switchHeroSlide(0, false, true); // isAutoReturn = true (smooth)
            }
        }, AUTO_RETURN_DELAY);
    }
}

function clearAutoReturnTimer() {
    if (autoReturnTimer) {
        clearTimeout(autoReturnTimer);
        autoReturnTimer = null;
    }
}

// -- Reset timer khi user tuong tc ------------------------------
function resetAutoReturn() {
    clearAutoReturnTimer();
    startAutoReturnTimer();
}

// ================================================================
// SLIDE SWITCHING  Core Logic (nng c?p mu?t m)
// ================================================================
function switchHeroSlide(newIndex, skipThumbnailHighlight, isAutoReturn) {
    if (isTransitioning) return;
    if (newIndex === currentSlideIndex) return;
    if (newIndex < 0 || newIndex >= heroSlides.length) return;

    isTransitioning = true;

    if (!isAutoReturn) clearAutoReturnTimer();

    const movie = heroSlides[newIndex];

    // Preload ?nh m?i NGAY (song song v?i fade out)
    const rawUrl = getHeroImageUrl(movie);
    const optUrl = buildImageUrl(rawUrl, 1200);
    if (optUrl) {
        const preImg = new Image();
        preImg.src = optUrl; // b?t d?u t?i ngay, khng ch?
    }

    // -- PHASE 1: Fade OUT (nhanh hon) --
    const heroImage = document.getElementById('heroImage');
    const heroContent = document.getElementById('heroContent');
    if (heroImage) heroImage.classList.add('hero-img-out');
    if (heroContent) heroContent.classList.add('hero-content-out');

    // -- PHASE 2 (160ms  d? d? fade out, ng?n nh?t c th?) --
    setTimeout(() => {
        currentSlideIndex = newIndex;

        // Update text ngay (v?n dang invisible)
        updateHeroBannerText(movie);
        updateHeroButtons(movie);
        setupHeroActions(movie);
        fetchLatestEpisodeCount(movie);

        if (!skipThumbnailHighlight) updateThumbnailActive(newIndex);

        // Update placeholder background immediately
        const placeholder = document.getElementById('heroPlaceholder') || document.querySelector('.hero-placeholder-mask');
        if (placeholder && movie) {
            const rawPlaceholderUrl = getHeroImageUrl(movie);
            const optPlaceholderUrl = buildImageUrl(rawPlaceholderUrl, 600);
            if (optPlaceholderUrl) {
                placeholder.style.backgroundImage = `url('${optPlaceholderUrl}')`;
                placeholder.style.opacity = '0.35';
            }
        }

        // -- Swap ?nh: khng ch? load xong, swap v fade in lun --
        if (heroImage && optUrl) {
            heroImage.setAttribute('data-current-src', optUrl);

            // Ki?m tra ?nh d cache chua (n?u preload xong th swap ngay)
            const cached = new Image();
            cached.onload = () => {
                heroImage.src = optUrl;
                heroImage.classList.remove('opacity-0', 'hero-img-out');
                heroImage.classList.add('hero-img-in');
                setTimeout(() => heroImage.classList.remove('hero-img-in'), 500);
            };
            cached.onerror = () => {
                heroImage.classList.remove('opacity-0', 'hero-img-out');
            };
            // src d du?c preload song song ? thu?ng complete ngay
            cached.src = optUrl;
            if (cached.complete && cached.naturalWidth > 0) {
                // ?nh d c trong cache browser ? hi?n ngay
                heroImage.src = optUrl;
                heroImage.classList.remove('opacity-0', 'hero-img-out');
                heroImage.classList.add('hero-img-in');
                setTimeout(() => heroImage.classList.remove('hero-img-in'), 500);
            }
        } else if (heroImage) {
            heroImage.classList.remove('opacity-0', 'hero-img-out');
        }

        // -- Fade IN text ngay (khng delay) --
        if (heroContent) {
            heroContent.classList.remove('opacity-0', 'hero-content-out');
            heroContent.classList.add('hero-content-in');
            setTimeout(() => heroContent.classList.remove('hero-content-in'), 500);
        }

        setTimeout(() => {
            isTransitioning = false;
            if (!isAutoReturn && newIndex !== 0) startAutoReturnTimer();
        }, 350);

    }, 160);
}

// -- Build optimized image URL ------------------------------------
function buildImageUrl(rawUrl, width) {
    if (!rawUrl) return '';
    // BYPASS image optimizer for TMDB images as they are already on a fast CDN!
    if (rawUrl.includes('tmdb.org')) return rawUrl;
    
    if (typeof movieAPI !== 'undefined' && movieAPI.getImageURL) {
        return movieAPI.getImageURL(rawUrl, width, 90, true);
    }
    return rawUrl.startsWith('http')
        ? rawUrl
        : `https://phimimg.com/${rawUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${rawUrl}`;
}

// -- Update ch? ph?n text c?a hero banner -----------------------
function updateHeroBannerText(movie) {
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const heroBadges = document.getElementById('heroBadges');
    const heroGenres = document.getElementById('heroGenres');
    const heroDescription = document.getElementById('heroDescription');

    if (heroTitle) {
        heroTitle.textContent = movie.name || '';
        // ? FIX: Ch? hi?n text title n?u ch?c ch?n khng c logo
        const cacheKeyCheck = movie.slug || movie.name;
        const hasLogoReady = (movie.logoUrl && movie.logoUrl.trim() !== '') ||
                             (logoCache.has(cacheKeyCheck) && logoCache.get(cacheKeyCheck) !== 'TEXT_ONLY');
        heroTitle.style.display = hasLogoReady ? 'none' : 'block';
    }
    if (heroSubtitle) heroSubtitle.textContent = movie.origin_name || '';

    // Async load TMDB logo replacing title
    loadHeroLogo(movie);

    if (heroBadges) {
        const rating = movie.tmdb?.vote_average ? movie.tmdb.vote_average.toFixed(1) : 'N/A';
        
        let epText = movie.episode_current || '';
        if (epText) {
            const lcText = epText.toLowerCase().trim();
            if (lcText === 't?p' || lcText === 't?p ' || lcText.includes('hon t?t') || lcText.includes('full')) {
                epText = 'Full';
            }
        }

        heroBadges.innerHTML = `
            <span class="flex items-center gap-1.5 text-black px-3 py-1 rounded font-bold text-[13px] md:text-sm shadow-sm" style="background-color: #FFE28A;">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                IMDb ${rating}
            </span>
            <span class="flex items-center gap-1.5 text-black px-3 py-1 rounded font-bold text-[13px] md:text-sm shadow-sm" style="background-color: #A3E6D6;">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                ${movie.year || '2024'}
            </span>
            ${epText
                ? `<span data-ep-badge class="flex items-center gap-1.5 text-black px-3 py-1 rounded font-bold text-[13px] md:text-sm shadow-sm" style="background-color: #FFD1E3;">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
                    ${epText}
                   </span>`
                : `<span data-ep-badge class="hidden"></span>`}
            <span class="flex items-center gap-1.5 text-black px-3 py-1 rounded font-bold text-[13px] md:text-sm shadow-sm" style="background-color: #A8C7FA;">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                ${movie.quality || 'HD'}
            </span>
        `;
    }

    if (heroGenres && movie.category) {
        heroGenres.innerHTML = movie.category.slice(0, 5).map(cat => `
            <button style="
                background: rgba(30,32,50,0.75);
                border: 1px solid rgba(255,255,255,0.25);
                padding: 6px 14px;
                border-radius: 8px;
                color: rgba(255,255,255,0.9);
                font-size: 13px;
                font-weight: 600;
                backdrop-filter: blur(8px);
                cursor: pointer;
                transition: background 0.2s, border-color 0.2s;
                white-space: nowrap;
            "
            onmouseover="this.style.background='rgba(50,55,80,0.85)';this.style.borderColor='rgba(255,255,255,0.4)';"
            onmouseout="this.style.background='rgba(30,32,50,0.75)';this.style.borderColor='rgba(255,255,255,0.25)';">
                ${cat.name}
            </button>
        `).join('');
    }


    if (heroDescription) {
        heroDescription.textContent = movie.content
            ? movie.content.replace(/<[^>]*>/g, '').substring(0, 180) + '...'
            : 'ang t?i thng tin phim...';
    }
}

// -- Update href nt play + info ---------------------------------
function updateHeroButtons(movie) {
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    const heroInfoBtn = document.getElementById('heroInfoBtn');
    if (heroPlayBtn) heroPlayBtn.href = `/xem-phim/${movie.slug}`;
    if (heroInfoBtn) heroInfoBtn.href = `/phim/${movie.slug}`;
}

// -- Highlight thumbnail active -----------------------------------
function updateThumbnailActive(slideIndex) {
    const thumbItems = document.querySelectorAll('.hero-thumb-item');
    thumbItems.forEach((el, i) => {
        // slideIndex 0 = admin banner ? khng c thumbnail active no
        if (slideIndex > 0 && i === slideIndex - 1) {
            el.classList.add('hero-thumb-active');
        } else {
            el.classList.remove('hero-thumb-active');
        }
    });
}

// ================================================================
// SWIPE / DRAG HANDLER
// ================================================================
function attachSwipeHandler() {
    const heroEl = document.querySelector('main.relative.h-screen');
    if (!heroEl) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let swipeDir = null; // 'h' = horizontal, 'v' = vertical, null = unknown
    const SWIPE_THRESHOLD = 45;
    const AXIS_LOCK_PX = 8;  // px di chuy?n d? xc d?nh hu?ng

    // -- TOUCH (Mobile) -----------------------------------
    heroEl.addEventListener('touchstart', (e) => {
        // B? qua n?u ch?m vo thumbnail ho?c m?c quan tm/section khc
        if (e.target.closest('.hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, a, button, section, .overflow-x-auto, .scrollbar-hide, [class*="overflow-x"], [class*="snap-"], .movie-card, .portrait-card, .action-premium-card, img')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swipeDir = null;
        clearAutoReturnTimer();
    }, { passive: true });

    heroEl.addEventListener('touchmove', (e) => {
        if (e.target.closest('.hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, a, button, section, .overflow-x-auto, .scrollbar-hide, [class*="overflow-x"], [class*="snap-"], .movie-card, .portrait-card, .action-premium-card, img')) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        // Xc d?nh hu?ng sau khi di chuy?n AXIS_LOCK_PX
        if (!swipeDir && (Math.abs(dx) > AXIS_LOCK_PX || Math.abs(dy) > AXIS_LOCK_PX)) {
            swipeDir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        }

        // Ch? parallax n?u dang swipe ngang
        if (swipeDir === 'h') {
            const heroImage = document.getElementById('heroImage');
            if (heroImage && Math.abs(dx) < 110) {
                heroImage.style.transform = `scale(1.05) translateX(${dx * 0.025}px)`;
                heroImage.style.transition = 'none';
            }
        }
    }, { passive: true });

    heroEl.addEventListener('touchend', (e) => {
        if (e.target.closest('.hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, a, button, section, .overflow-x-auto, .scrollbar-hide, [class*="overflow-x"], [class*="snap-"], .movie-card, .portrait-card, .action-premium-card, img')) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;

        // Reset parallax image
        const heroImage = document.getElementById('heroImage');
        if (heroImage) {
            heroImage.style.transform = '';
            heroImage.style.transition = '';
        }

        // B? qua n?u dang cu?n d?c ho?c khng d? ngu?ng
        if (swipeDir !== 'h' || Math.abs(dx) < SWIPE_THRESHOLD) {
            startAutoReturnTimer();
            return;
        }

        if (dx < 0) {
            switchHeroSlide(currentSlideIndex + 1);
        } else {
            switchHeroSlide(currentSlideIndex - 1);
        }

        swipeDir = null;
    }, { passive: true });

    // -- MOUSE (Desktop) ---------------------------------
    heroEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('a, button, .hero-thumb-item, .interests-section, .interests-wrapper, .interest-card, .mobile-thumb-wrapper, section')) return;
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        clearAutoReturnTimer();
        heroEl.style.cursor = 'grabbing';
    });

    heroEl.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const heroImage = document.getElementById('heroImage');
        if (heroImage && Math.abs(dx) < 120) {
            heroImage.style.transform = `scale(1.05) translateX(${dx * 0.025}px)`;
            heroImage.style.transition = 'none';
        }
    });

    heroEl.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        heroEl.style.cursor = '';

        const heroImage = document.getElementById('heroImage');
        if (heroImage) {
            heroImage.style.transform = '';
            heroImage.style.transition = '';
        }

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx) * 0.85) {
            startAutoReturnTimer();
            return;
        }

        if (dx < 0) {
            switchHeroSlide(currentSlideIndex + 1);
        } else {
            switchHeroSlide(currentSlideIndex - 1);
        }
    });

    heroEl.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            heroEl.style.cursor = '';
            const heroImage = document.getElementById('heroImage');
            if (heroImage) {
                heroImage.style.transform = '';
                heroImage.style.transition = '';
            }
            startAutoReturnTimer();
        }
    });

    // -- Scroll xu?ng ? b?t d?u d?m ngu?c auto-return -----------
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        // Khi user b?t d?u scroll kh?i hero, d?t auto-return
        if (currentSlideIndex !== 0) {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                startAutoReturnTimer();
            }, 300);
        }
    }, { passive: true });
}

// ================================================================
// LOAD THUMBNAILS
// ================================================================
async function loadThumbnailMovies() {
    let hasCache = false;
    // 1. Instant t? cache
    try {
        const cached = localStorage.getItem('cinestream_thumbnail_movies');
        if (cached) {
            const movies = JSON.parse(cached);
            if (Array.isArray(movies) && movies.length > 0) {
                applyThumbnails(convertThumbnailsFromAPI(movies));
                hasCache = true;
            }
        }
    } catch (e) { }

    // 2. Fetch fresh t? backend
    try {
        const apiUrl = (typeof getBackendBaseURL === 'function') ? window.getBackendBaseURL() : '';
        if (!apiUrl) throw new Error('API URL undefined');

        const res = await fetch(`${apiUrl}/api/banners/thumbnails`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            localStorage.setItem('cinestream_thumbnail_movies', JSON.stringify(data.data));
            applyThumbnails(convertThumbnailsFromAPI(data.data));
            return;
        }
    } catch (err) {
        console.warn('Thumbnail API error, fallback VN:', err);
    }

    // 3. Fallback: phim Vi?t Nam (ch? khi khng c cache)
    if (!hasCache) {
        loadVietnameseThumbnailsFallback();
    }
}

function convertThumbnailsFromAPI(banners) {
    return banners.map(b => ({
        slug: b.movieSlug,
        name: b.name,
        origin_name: b.originName,
        thumb_url: b.thumbUrl,
        poster_url: b.posterUrl,
        year: b.year,
        content: b.content,
        quality: b.quality,
        lang: b.lang,
        episode_current: b.episodeCurrent,
        category: b.category || [],
        tmdb: b.tmdb || {},
        imdb: b.imdb || {}
    }));
}

async function loadVietnameseThumbnailsFallback() {
    try {
        const data = await movieAPI.getMoviesByCountry('viet-nam', 1);
        const items = data?.data?.items || data?.items;
        const isOk = data && ((data && (data.status === 'success' || data.status === true || data.status)) || data.status === true || data.status);
        if (isOk && items && items.length > 0) {
            applyThumbnails(items.slice(0, 10));
        }
    } catch (e) { console.error('VN fallback error:', e); }
}

// -- p d?ng danh sch thumbnail vo slide system + DOM ----------
function applyThumbnails(movies) {
    if (!Array.isArray(movies) || movies.length === 0) return;

    const adminBannerSlide = heroSlides[0] || currentAdminBanner;
    heroSlides = [adminBannerSlide, ...movies];

    renderThumbnails(movies);
    updateThumbnailActive(currentSlideIndex);

    // Preload t?t c? ?nh thumbnail ngay sau khi render
    // ? khi user click, ?nh d s?n sng trong browser cache
    preloadSlideImages(movies);
}

// -- Preload ?nh ng?m cho t?t c? slides --------------------------
function preloadSlideImages(movies) {
    // Delay nh? d? khng tranh bang thng v?i initial hero image
    setTimeout(() => {
        const handleTMDBSync = (movie, slideIdx) => {
            if (typeof getHeroImagesFromTMDB === 'function') {
                getHeroImagesFromTMDB(movie).then(res => {
                    if (res && currentSlideIndex === slideIdx) {
                        const heroImage = document.getElementById('heroImage');
                        if (heroImage) {
                            const optUrl = getHeroImageUrl(movie);
                            if (optUrl && heroImage.getAttribute('data-current-src') !== optUrl) {
                                const preImg = new Image();
                                preImg.onload = () => { 
                                    heroImage.src = optUrl; 
                                    heroImage.setAttribute('data-current-src', optUrl); 
                                };
                                preImg.src = optUrl;
                            }
                        }
                    }
                });
            }
        };

        // Sync admin banner
        const adminBannerSlide = heroSlides[0] || currentAdminBanner;
        if (adminBannerSlide) handleTMDBSync(adminBannerSlide, 0);

        movies.forEach((movie, i) => {
            handleTMDBSync(movie, i + 1);
            const rawUrl = getHeroImageUrl(movie);
            if (!rawUrl) return;
            const url = buildImageUrl(rawUrl, 1200);
            if (url) {
                const img = new Image();
                img.src = url;
            }
        });
    }, 300); // Giảm từ 800ms → 300ms để bắt đầu preload TMDB sớm hơn
}

// -- Render thumbnail DOM với click handler -----------------------
function renderThumbnails(movies) {
    const container = document.getElementById('heroThumbnails');
    if (!container || !Array.isArray(movies) || movies.length === 0) return;

    container.innerHTML = movies.map((movie, i) => {
        const imgSrc = (typeof imageOptimizer !== 'undefined')
            ? imageOptimizer.optimizeImageUrl(movie.thumb_url || movie.poster_url, 300, 75)
            : buildImageUrl(movie.thumb_url || movie.poster_url, 300);

        const slideIndex = i + 1;

        return `
        <div class="hero-thumb-item flex-shrink-0 snap-start"
             data-slide-index="${slideIndex}"
             data-movie-index="${i}"
             role="button"
             tabindex="0"
             title="${movie.name || ''}"
             onclick="switchHeroSlide(${slideIndex})">
            <div class="hero-thumb-poster responsive-thumb-width aspect-video rounded-md overflow-hidden bg-gray-900">
                <img
                    alt="${movie.name || ''}"
                    class="w-full h-full object-cover object-center"
                    data-src="${imgSrc}"
                    data-tmdb-slug="${movie.slug}"
                    data-tmdb-id="${movie.tmdb?.id || ''}"
                    data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                    data-tmdb-year="${movie.year || ''}"
                    data-tmdb-type="backdrop"
                    src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E"
                    onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null"
                     />
            </div>
            <div class="hero-thumb-glow"></div>
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

    setTimeout(() => { container.scrollLeft = 0; }, 0);

    let thumbScrollTimer = null;
    container.addEventListener('scroll', () => {
        if (currentSlideIndex !== 0) {
            clearTimeout(thumbScrollTimer);
            thumbScrollTimer = setTimeout(() => { resetAutoReturn(); }, 100);
        }
    }, { passive: true });
}

// ================================================================
// THUMBNAIL HOVER PREVIEW
// ================================================================
function previewHeroPoster(movie) {
    const heroImage = document.getElementById('heroImage');
    if (!heroImage || !movie) return;
    const posterUrl = getHeroImageUrl(movie);
    if (!posterUrl) return;
    const optUrl = buildImageUrl(posterUrl, 1200);
    if (!optUrl) return;
    heroImage.style.opacity = '0.3';
    const img = new Image();
    img.onload = () => { heroImage.src = optUrl; heroImage.style.opacity = '1'; };
    img.src = optUrl;
    updateHeroBannerText(movie);
    updateHeroButtons(movie);
}

function returnToCurrentSlide(slideIndex) {
    if (slideIndex < 0 || slideIndex >= heroSlides.length) return;
    const movie = heroSlides[slideIndex];
    if (!movie) return;
    const heroImage = document.getElementById('heroImage');
    if (!heroImage) return;
    const posterUrl = getHeroImageUrl(movie);
    if (!posterUrl) return;
    const optUrl = buildImageUrl(posterUrl, 1200);
    if (!optUrl) return;
    heroImage.style.opacity = '0.3';
    const img = new Image();
    img.onload = () => { heroImage.src = optUrl; heroImage.style.opacity = '1'; };
    img.src = optUrl;
    updateHeroBannerText(movie);
    updateHeroButtons(movie);
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

    // 🚀 TURBO: Inject <link rel="preload"> cho ảnh hero ngay lập tức
    // Trình duyệt sẽ bắt đầu tải ảnh ở mức ưu tiên cao nhất TRƯỚC khi JS chạy xong
    if (optUrl && !document.querySelector('link[data-hero-preload]')) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = optUrl;
        preloadLink.setAttribute('data-hero-preload', '1');
        preloadLink.fetchPriority = 'high';
        document.head.appendChild(preloadLink);
    }

    // 🚀 TURBO: Set fetchpriority=high để trình duyệt ưu tiên tải ảnh này
    heroImage.fetchPriority = 'high';
    heroImage.loading = 'eager';
    heroImage.decoding = 'async';

    heroImage.onerror = () => {
        const fallbackUrl = rawUrl.startsWith('http') ? rawUrl : `https://phimimg.com/${rawUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${rawUrl}`;
        if (heroImage.src !== fallbackUrl) heroImage.src = fallbackUrl;
        showHeroImage();
    };

    if (optUrl) {
        heroImage.setAttribute('data-current-src', optUrl);
        heroImage.src = optUrl;
    } else if (rawUrl) {
        const fallbackUrl = rawUrl.startsWith('http') ? rawUrl : `https://phimimg.com/${rawUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${rawUrl}`;
        heroImage.src = fallbackUrl;
    }
    showHeroImage();
}

// ================================================================
// HERO SHOW HELPERS
// ================================================================
function showHeroText() {
    const el = document.getElementById('heroContent');
    if (el) el.style.opacity = '1';
}

function showHeroImage() {
    const heroImage = document.getElementById('heroImage');
    const placeholder = document.getElementById('heroPlaceholder') || document.querySelector('.hero-placeholder-mask');
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
        const data = await movieAPI.getMovieDetail(movie.slug);
        if (!data) return;

        const item = data.movie || data.data?.item;
        if (!item) return;

        // Sync and update real description from database/API
        if (item.content) {
            const cleanContent = item.content.replace(/<[^>]*>/g, '').trim();
            const heroDescription = document.getElementById('heroDescription');
            if (heroDescription) {
                heroDescription.textContent = cleanContent.length > 180 
                    ? cleanContent.substring(0, 180) + '...'
                    : cleanContent;
            }
            movie.content = item.content; // Save so we don't refetch
        }

        let latestEpLabel = item.episode_current || '';
        const eps = data.episodes || item.episodes;
        if (Array.isArray(eps) && eps.length > 0) {
            const serverData = eps[0]?.server_data;
            if (Array.isArray(serverData) && serverData.length > 0) {
                const count = serverData.length;
                
                const lcLabel = latestEpLabel.toLowerCase().trim();
                // Preserve 'Full' if it's a single movie or already labeled as Full
                if (item.type === 'single' || lcLabel.includes('full') || lcLabel.includes('ho�n t?t')) {
                    latestEpLabel = 'Full';
                } else {
                    const match = latestEpLabel.match(/\d+/);
                    const storedNum = match ? parseInt(match[0]) : 0;
                    if (count > storedNum) {
                        latestEpLabel = `T?p ${count}`;
                    } else if (lcLabel === 't?p' || lcLabel === 't?p ') {
                        latestEpLabel = count > 0 ? `T?p ${count}` : 'Full';
                    }
                }
            }
        }
        if (!latestEpLabel) return;

        const badge = document.querySelector('#heroBadges [data-ep-badge]');
        if (badge && badge.textContent !== latestEpLabel) {
            badge.textContent = latestEpLabel;
            badge.classList.remove('hidden');
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
    // B?n HTML tinh: d�ng movie-detail.html?slug=... thay v� route /phim/:slug c?a Node
    if (infoBtn) infoBtn.href = `/phim/${movie.slug}`;

    if (favBtn && typeof userService !== 'undefined') {
        const icon = favBtn.querySelector('span');

        const updateFavUI = () => {
            const isFav = userService.isFavorite(movie.slug);
            if (icon) {
                icon.textContent = isFav ? 'favorite' : 'favorite_border';
                icon.classList.toggle('text-red-500', isFav);
                icon.classList.toggle('text-white/90', !isFav);
            }
        };

        updateFavUI();

        favBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
                if (typeof showAuthModal === 'function') showAuthModal('login');
                else alert('Vui l�ng dang nh?p d? luu phim');
                return;
            }
            if (userService.isFavorite(movie.slug)) {
                userService.removeFromFavorites(movie.slug);
                if (typeof showNotification === 'function') showNotification('�� x�a kh?i danh s�ch y�u th�ch', 'info');
            } else {
                userService.addToFavorites({ slug: movie.slug, name: movie.name, thumb_url: movie.thumb_url, year: movie.year || '' });
                if (typeof showNotification === 'function') showNotification('�� th�m v�o danh s�ch y�u th�ch', 'success');
            }
            updateFavUI();
        };
    }
}

// -- Expose globally ----------------------------------------------
window.switchHeroSlide = switchHeroSlide;

// -- Boot ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadHeroBanner();
});



// -- Smart Object-Fit for Vertical Posters on Desktop --
document.addEventListener('DOMContentLoaded', () => {
    const heroImage = document.getElementById('heroImage');
    if (heroImage) {
        const updateObjectFit = () => {
            if (heroImage.naturalHeight > heroImage.naturalWidth && window.innerWidth >= 768) {
                heroImage.style.setProperty('object-fit', 'contain', 'important');
                heroImage.style.backgroundColor = 'rgba(0,0,0,0.7)';
            } else {
                heroImage.style.setProperty('object-fit', 'cover', 'important');
                heroImage.style.backgroundColor = 'transparent';
            }
        };
        heroImage.addEventListener('load', updateObjectFit);
        window.addEventListener('resize', () => {
            if (heroImage.complete && heroImage.naturalWidth > 0) {
                updateObjectFit();
            }
        });
    }
});
