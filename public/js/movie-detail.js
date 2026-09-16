// Movie Detail Page Script
// --- Anti-FOUC CSS injection (Mobile layout jump fix) ---
if (!document.getElementById('anti-fouc-style')) {
    const style = document.createElement('style');
    style.id = 'anti-fouc-style';
    style.innerHTML = `
        @media (max-width: 1023px) {
            .movie-content-zone {
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.4s ease-out, visibility 0.4s ease-out;
            }
            .movie-content-zone.loaded {
                opacity: 1;
                visibility: visible;
            }
        }
    `;
    document.head.appendChild(style);
}

if (typeof window.openLightbox === 'undefined') {
    window.openLightbox = function(images, index) {
      if (!images || images.length === 0) return;
      let current = index || 0;
      const isMobile = window.innerWidth <= 768;
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.97);z-index:99999;display:flex;align-items:center;justify-content:center';
      
      const img = document.createElement('img');
      img.style.cssText = isMobile ? 'max-width:92vw;max-height:70vh;object-fit:contain;border-radius:8px' : 'max-width:70vw;max-height:75vh;object-fit:contain;border-radius:8px';
      img.src = images[current];
      
      const counter = document.createElement('div');
      counter.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:white;font-size:14px';
      counter.textContent = (current+1)+' / '+images.length;
      
      const btnClose = document.createElement('button');
      btnClose.innerHTML = '✕';
      btnClose.style.cssText = 'position:absolute;top:16px;right:20px;background:none;border:none;color:white;font-size:28px;cursor:pointer;z-index:1';
      
      const btnPrev = document.createElement('button');
      btnPrev.innerHTML = '‹';
      btnPrev.style.cssText = isMobile ? 'position:absolute;left:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;left:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';
      
      const btnNext = document.createElement('button');
      btnNext.innerHTML = '›';
      btnNext.style.cssText = isMobile ? 'position:absolute;right:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';
      
      function update() { img.src = images[current]; counter.textContent = (current+1)+' / '+images.length; }
      btnPrev.onclick = () => { current = (current-1+images.length)%images.length; update(); };
      btnNext.onclick = () => { current = (current+1)%images.length; update(); };
      btnClose.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
      overlay.onclick = (e) => { if(e.target===overlay) { if (document.body.contains(overlay)) document.body.removeChild(overlay); } };
      document.addEventListener('keydown', function escHandler(e) {
        if(e.key==='Escape') { if(document.body.contains(overlay)) { document.body.removeChild(overlay); document.removeEventListener('keydown', escHandler); } }
        if(e.key==='ArrowLeft') { current=(current-1+images.length)%images.length; update(); }
        if(e.key==='ArrowRight') { current=(current+1)%images.length; update(); }
      });
      
      overlay.appendChild(img);
      overlay.appendChild(counter);
      overlay.appendChild(btnClose);
      overlay.appendChild(btnPrev);
      overlay.appendChild(btnNext);
      document.body.appendChild(overlay);
    }
}

let currentMovie = null;

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug');

    const pathname = window.location.pathname.toLowerCase();
    if (!slug && (pathname.startsWith('/phim/') || pathname.startsWith('/movie/'))) {
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && !parts[1].endsWith('.html')) {
            slug = parts[1];
        }
    }

    if (!slug && window.initialMovie && window.initialMovie.slug) {
        slug = window.initialMovie.slug;
    }

    if (!slug) {
        console.warn('[MovieDetail] No slug provided, staying on current page.');
        return;
    }

    try {
        sessionStorage.setItem('aphim_last_viewed_slug', slug);
    } catch(e) {}

    await loadMovieDetail(slug);

    // 🎬 Initialize Lottie for Watch Now button
    if (typeof lottie !== 'undefined' && document.getElementById('play-btn-lottie')) {
        const playBtnAnim = lottie.loadAnimation({
            container: document.getElementById('play-btn-lottie'),
            renderer: 'svg',
            loop: true,
            autoplay: false,
            path: '/icons/play-button.json?v=5'
        });

        const watchNowBtn = document.getElementById('watchNowBtn');
        if (watchNowBtn) {
            watchNowBtn.addEventListener('mouseenter', () => playBtnAnim.play());
            watchNowBtn.addEventListener('mouseleave', () => playBtnAnim.stop());
        }
    }
});

// Load movie detail from API
async function loadMovieDetail(slug) {
    let ophimOk = false;

    // Check if initialMovie from SSR is available
    if (window.initialMovie && (window.initialMovie.slug === slug || !slug)) {
        currentMovie = window.initialMovie;
        if (window.initialEpisodes && window.initialEpisodes.length > 0) {
            currentMovie.episodes = window.initialEpisodes;
        }
        renderMovieDetail(currentMovie);
        if (currentMovie.episodes) renderEpisodes(currentMovie.episodes);
        setupFavoriteButton();
        setupRatingSystem();
        loadRatingsAndComments(currentMovie.slug);
        if (typeof window._apInitComment === 'function') window._apInitComment();

        setTimeout(() => {
            document.querySelector('.movie-content-zone')?.classList.add('loaded');
        }, 50);

        ophimOk = true;

        // Fetch secondary servers in background to append to SSR data
        movieAPI.getMovieDetail(slug).then(fullData => {
            if (fullData && fullData.data && fullData.data.item && fullData.data.item.episodes) {
                // Check if we got more servers than we currently have
                if (fullData.data.item.episodes.length > currentMovie.episodes.length) {
                    currentMovie.episodes = fullData.data.item.episodes;
                    renderEpisodes(currentMovie.episodes);
                }
            } else if (fullData && fullData.episodes) {
                if (fullData.episodes.length > currentMovie.episodes.length) {
                    currentMovie.episodes = fullData.episodes;
                    renderEpisodes(currentMovie.episodes);
                }
            }
        }).catch(e => console.warn('Background secondary fetch failed:', e));

    } else {
        try {
            const response = await movieAPI.getMovieDetail(slug);
            const movieItem = response?.data?.item || response?.movie || response?.data?.movie;

            if (response && (response.status === 'success' || response.status === true || response.status) && movieItem) {
                currentMovie = movieItem;
                if (!currentMovie.episodes && response.episodes) {
                    currentMovie.episodes = response.episodes;
                }
                renderMovieDetail(currentMovie);
                renderEpisodes(currentMovie.episodes || []);
                setupFavoriteButton();
                setupRatingSystem();
                loadRatingsAndComments(slug);
                if (typeof window._apInitComment === 'function') window._apInitComment();

                // Fade in content smoothly on mobile after render
                setTimeout(() => {
                    document.querySelector('.movie-content-zone')?.classList.add('loaded');
                }, 50);

                ophimOk = true;
            } else {
                console.warn('⚠️ [Detail] API không trả về phim này, thử proxy fallback...');
            }
        } catch (error) {
            console.warn('⚠️ [Detail] API lỗi:', error.message, '→ thử proxy fallback...');
        }
    }

    // Nếu fetch chính qua API thất bại hoàn toàn, thử qua getSecondaryEpisodes làm fallback cuối
    if (!ophimOk) {
        await fetchAndMergeSecondaryServersDetail(slug, true);
    }
}

// 🔄 Helper fetch nguồn phụ thông minh: Thử proxy server-side trước, nếu fail thì gọi thẳng phimapi.com (có CORS)
async function getSecondaryEpisodes(slug) {
    let proxyUrl = `/api/vsmov/${encodeURIComponent(slug)}`;

    try {
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
            if (data.status && data.episodes && data.episodes.length > 0) {
                return data;
            }
        }
    } catch (e) {
        console.warn('⚠️ Proxy fetch failed, trying direct phimapi.com:', e.message);
    }

    try {
        const directUrl = `https://phimapi.com/phim/${encodeURIComponent(slug)}`;
        const res = await fetch(directUrl);
        if (res.ok) {
            const json = await res.json();
            if (json && json.episodes && json.episodes.length > 0) {
                return {
                    status: true,
                    source: 'phimapi.com',
                    episodes: json.episodes,
                    movie: json.movie || null
                };
            }
        }
    } catch (e) {}

    try {
        const nguonCUrl = `https://phim.nguonc.com/api/film/${encodeURIComponent(slug)}`;
        const res = await fetch(nguonCUrl).catch(() => null);
        if (res && res.ok) {
            const json = await res.json();
            if (json && json.status === 'success' && json.movie && json.movie.episodes) {
                const mappedEps = json.movie.episodes.map(s => ({
                    server_name: s.server_name || 'Vietsub',
                    server_data: (s.items || []).map(it => ({
                        name: it.name && !it.name.toLowerCase().includes('tập') ? `Tập ${it.name}` : (it.name || 'Tập 1'),
                        slug: it.slug || `tap-${it.name}`,
                        link_embed: it.embed || '',
                        link_m3u8: it.m3u8 || ''
                    }))
                }));
                return {
                    status: true,
                    source: 'nguonc.com',
                    episodes: mappedEps,
                    movie: {
                        name: json.movie.name,
                        origin_name: json.movie.original_name,
                        thumb_url: json.movie.thumb_url,
                        poster_url: json.movie.poster_url,
                        content: json.movie.description,
                        quality: json.movie.quality,
                        lang: json.movie.language
                    }
                };
            }
        }
    } catch (e) {
        console.warn('⚠️ Direct NguonC fetch failed:', e.message);
    }

    return null;
}

// 🔄 Fetch và merge các server phụ
async function fetchAndMergeSecondaryServersDetail(slug, isPrimary = false) {
    try {
        const data = await getSecondaryEpisodes(slug);

        if (!data || !data.status || !data.episodes || data.episodes.length === 0) {
            console.warn('⚠️ [Detail] Không có dữ liệu nguồn phụ');
            if (isPrimary) showError('Phim này chưa có nguồn phát — vui lòng thử lại sau');
            return;
        }

        // ── CASE 1: OPhim thất bại → dùng nguồn phụ làm nguồn chính ─────────────
        if (isPrimary) {
            const meta = data.movie || {};
            currentMovie = {
                name:            meta.name            || slug,
                origin_name:     meta.origin_name     || '',
                year:            meta.year            || '',
                thumb_url:       meta.thumb_url        || meta.poster_url || '',
                poster_url:      meta.poster_url       || meta.thumb_url  || '',
                content:         meta.content         || '',
                type:            meta.type            || 'series',
                status:          meta.status          || 'ongoing',
                time:            meta.time            || '',
                quality:         meta.quality         || 'HD',
                lang:            meta.lang            || 'Vietsub',
                episode_current: meta.episode_current || '',
                episode_total:   meta.episode_total   || '',
                category:        meta.category        || [],
                country:         meta.country         || [],
                director:        meta.director        || [],
                actor:           meta.actor           || [],
                slug:            meta.slug            || slug,
                tmdb:            meta.tmdb            || {},
                imdb:            meta.imdb            || {},
                episodes: data.episodes.map((s, idx) => ({
                    ...s,
                    original_server_name: s.original_server_name || s.server_name,
                    server_name: `Nguồn ${idx + 1}`
                }))
            };

            console.log('✅ [Detail] Dùng nguồn phụ làm nguồn chính:', currentMovie.name);
            renderMovieDetail(currentMovie);
            renderEpisodes(currentMovie.episodes);
            setupFavoriteButton();
            setupRatingSystem();
            loadRatingsAndComments(slug);
            setTimeout(() => {
                document.querySelector('.movie-content-zone')?.classList.add('loaded');
            }, 50);
            return;
        }

        // ── CASE 2: OPhim OK → Đã được gộp tự động bởi api.js ────────────
        if (!isPrimary) {
            console.log('✅ [Detail] OPhim OK, dữ liệu nguồn phụ đã được api.js gộp tự động.');
            return;
        }
    } catch (err) {
        console.warn('⚠️ [Detail] Nguồn phụ thất bại:', err.message);
        if (isPrimary) showError('Đã xảy ra lỗi khi tải thông tin phim');
    }
}


// Render movie detail
function renderMovieDetail(movie) {
    // 🚀 INJECT DYNAMIC SEO - Overrides meta, title & schema
    if (typeof SEO !== 'undefined') {
        SEO.updateMovieSEO(movie);
    } else {
        document.title = `Thông Tin Phim ${movie.name} Full HD | APhim Super`;
    }

    // Update poster
    const posterImg = document.querySelector('.aspect-\\[2\\/3\\] img');
    if (posterImg) {
        posterImg.style.opacity = '0';
        posterImg.onload = () => {
            posterImg.style.opacity = '';
            posterImg.animate([
                { opacity: 0, transform: 'scale(0.95)' },
                { opacity: 1, transform: 'scale(1)' }
            ], { duration: 600, easing: 'ease-out' });
        };
        posterImg.src = movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 600, 85, true);
        posterImg.alt = `Xem Phim ${movie.name} (${movie.year}) Full HD Vietsub tại APhim`;
    }

    // Update hero background image (Full bleed backdrop image)
    const bgImg = document.getElementById('movieHeroBackdrop') || document.querySelector('.absolute.top-0 img');
    if (bgImg) {
        bgImg.style.opacity = '1';
        // Always prioritize the large horizontal backdrop image (thumb_url)
        const backdropUrl = movie.thumb_url || movie.poster_url;
        const defaultBgUrl = movieAPI.getImageURL(backdropUrl, 1200, 90, true);
        const handleBgAspectRatio = (imgElement) => {
            const wrap = document.querySelector('.movie-hero-backdrop-wrap');
            if (imgElement.naturalHeight >= imgElement.naturalWidth) {
                // Vertical image (poster): stretch & heavy blur to act as frosted glass
                imgElement.classList.add('blur-xl', 'lg:blur-2xl', 'opacity-70', 'lg:opacity-40');
                imgElement.classList.remove('opacity-100', 'lg:opacity-100', 'blur-none', 'lg:blur-none');
                if (wrap) wrap.classList.add('is-vertical-bg');
            } else {
                // Horizontal image (backdrop): crisp & clear
                imgElement.classList.remove('blur-xl', 'blur-2xl', 'lg:blur-2xl', 'lg:blur-3xl', 'opacity-70', 'lg:opacity-40');
                imgElement.classList.add('opacity-100', 'lg:opacity-100');
                if (wrap) wrap.classList.remove('is-vertical-bg');
            }
        };

        bgImg.onload = () => handleBgAspectRatio(bgImg);
        bgImg.src = defaultBgUrl;

        // Always attempt TMDB backdrop fetch on desktop to enforce horizontal image, or if thumb_url is missing
        const isDesktop = window.innerWidth >= 1024;
        if ((isDesktop || !movie.thumb_url || movie.thumb_url.includes('placeholder')) && movie.tmdb && movie.tmdb.id && typeof imageOptimizer !== 'undefined') {
            imageOptimizer.getTMDBImageUrl({
                dataset: {
                    tmdbSlug: movie.slug,
                    tmdbId: movie.tmdb.id,
                    tmdbName: movie.name,
                    tmdbYear: movie.year,
                    tmdbType: 'backdrop',
                    tmdbMediaType: movie.tmdb.type || (movie.type === 'series' ? 'tv' : 'movie')
                }
            }).then(url => {
                if (url) {
                    bgImg.src = url;
                }
            }).catch(() => {});
        }
    }

    // Update title — Sharp, crisp, compact typography matching target design
    const titleElement = document.querySelector('h1');
    if (titleElement) {
        titleElement.className = 'text-center lg:text-left w-full mb-2 lg:mb-4';
        titleElement.innerHTML = `
            <span class="block text-2xl sm:text-4xl lg:text-5xl cinematic-gold-title mb-1" style="font-family: 'Space Grotesk', 'Be Vietnam Pro', system-ui, sans-serif; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;">${movie.name}</span>
            ${movie.origin_name ? `<span class="block text-sm sm:text-xl lg:text-2xl cinematic-sub-title">${movie.origin_name}</span>` : ''}
        `;
    }

    // ✅ Update breadcrumb — hiện tên phim thực thay vì hardcode và thêm danh mục
    const breadcrumb = document.getElementById('breadcrumb-movie-name');
    if (breadcrumb) {
        breadcrumb.textContent = movie.name;
        
        if (!document.getElementById('breadcrumb-category')) {
            let categoryName = '';
            let categoryLink = '';
            
            // Xử lý breadcrumb thông minh: nhớ trang trước đó (referrer)
            const referrer = document.referrer;
            let refMatched = false;
            
            try {
                if (referrer && referrer.includes(window.location.host)) {
                    const refUrl = new URL(referrer);
                    
                    if (referrer.includes('phim-theo-quoc-gia.html')) {
                        categoryName = (movie.country && movie.country.length > 0) ? movie.country[0].name : 'Quốc Gia';
                        categoryLink = referrer;
                        refMatched = true;
                    } else if (referrer.includes('phim-theo-the-loai.html')) {
                        categoryName = (movie.category && movie.category.length > 0) ? movie.category[0].name : 'Thể Loại';
                        categoryLink = referrer;
                        refMatched = true;
                    } else if (referrer.includes('search.html')) {
                        categoryName = 'Tìm Kiếm';
                        categoryLink = referrer;
                        refMatched = true;
                    } else if (referrer.includes('danh-sach.html')) {
                        const listParam = refUrl.searchParams.get('list');
                        const listMap = {
                            'phim-moi': 'Phim Mới',
                            'phim-bo': 'Phim Bộ',
                            'phim-le': 'Phim Lẻ',
                            'tv-shows': 'TV Shows',
                            'hoat-hinh': 'Hoạt Hình',
                            'phim-vietsub': 'Phim Vietsub',
                            'phim-thuyet-minh': 'Thuyết Minh',
                            'phim-long-tien': 'Lồng Tiếng',
                            'phim-bo-dang-chieu': 'Đang Chiếu',
                            'phim-bo-hoan-thanh': 'Đã Hoàn Thành',
                            'phim-sap-chieu': 'Sắp Chiếu'
                        };
                        if (listParam && listMap[listParam]) {
                            categoryName = listMap[listParam];
                            categoryLink = referrer;
                            refMatched = true;
                        }
                    }
                }
            } catch(e) {
                console.warn('Could not parse referrer URL for breadcrumb', e);
            }
            
            // Fallback nếu không có referrer (vào thẳng link)
            if (!refMatched) {
                if (movie.type === 'series') {
                    categoryName = 'Phim Bộ';
                    categoryLink = '/danh-sach?list=phim-bo';
                } else if (movie.type === 'single') {
                    categoryName = 'Phim Lẻ';
                    categoryLink = '/danh-sach?list=phim-le';
                } else if (movie.type === 'hoathinh') {
                    categoryName = 'Hoạt Hình';
                    categoryLink = '/danh-sach?list=hoat-hinh';
                } else if (movie.type === 'tvshows') {
                    categoryName = 'TV Shows';
                    categoryLink = '/danh-sach?list=tv-shows';
                }
            }
            
            if (categoryName) {
                // Lưu lại state cho trang watch.html dùng
                sessionStorage.setItem('breadcrumbName', categoryName);
                sessionStorage.setItem('breadcrumbLink', categoryLink);
                
                const separator = document.createElement('span');
                separator.className = 'material-icons-round text-base text-gray-300 flex-shrink-0';
                separator.textContent = 'chevron_right';
                
                const categoryElement = document.createElement('a');
                categoryElement.id = 'breadcrumb-category';
                categoryElement.className = 'hover:text-[#fcd576] transition-colors flex-shrink-0 text-white font-bold whitespace-nowrap';
                categoryElement.href = categoryLink;
                categoryElement.textContent = categoryName;
                
                breadcrumb.parentNode.insertBefore(categoryElement, breadcrumb);
                breadcrumb.parentNode.insertBefore(separator, breadcrumb);
            }
        }
    }

    // Update info
    const infoContainer = document.querySelector('.movie-info-container') || document.querySelector('.flex.flex-wrap.items-center.gap-4.mb-8');
    if (infoContainer) {
        // Wrap on mobile so badges don't get hidden
        infoContainer.className = 'movie-info-container flex flex-wrap justify-center lg:justify-start items-center gap-2 sm:gap-3 md:gap-4 mb-0 md:mb-0 text-[11px] sm:text-sm md:text-base w-full';

        const avgRating = ratingService.getAverageRating(movie.slug);
        const ratings = ratingService.getRatings(movie.slug);

        infoContainer.innerHTML = `
            ${movie.tmdb && movie.tmdb.vote_average ? `<span style="background-color: #3f1e00; color: #f97316; border: 1px solid rgba(249, 115, 22, 0.3); box-shadow: 0 2px 8px rgba(63, 30, 0, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide flex items-center gap-1">IMDb ${movie.tmdb.vote_average}</span>` : ''}

            ${movie.type === 'series' || movie.type === 'hoathinh' || movie.type === 'tvshows' ? 
                `<span style="background-color: #1e3a5f; color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.2); box-shadow: 0 2px 8px rgba(30, 58, 95, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.type === 'series' ? 'Series' : movie.type === 'hoathinh' ? 'Hoạt hình' : 'TV Shows'}</span>` 
                : `<span style="background-color: #1e3a5f; color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.2); box-shadow: 0 2px 8px rgba(30, 58, 95, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">Phim Lẻ</span>`}
            
            ${movie.year ? `<span style="background-color: #3b2854; color: #d8b4fe; border: 1px solid rgba(216, 180, 254, 0.2); box-shadow: 0 2px 8px rgba(59, 40, 84, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.year}</span>` : ''}
            
            ${movie.lang ? `<span style="background-color: #164e32; color: #86efac; border: 1px solid rgba(134, 239, 172, 0.2); box-shadow: 0 2px 8px rgba(22, 78, 50, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.lang}</span>` : ''}
            
            ${movie.quality ? `<span style="background-color: #5b3e15; color: #fde047; border: 1px solid rgba(253, 224, 71, 0.2); box-shadow: 0 2px 8px rgba(91, 62, 21, 0.4);" class="px-3 py-1.5 rounded-md text-[13px] font-bold leading-none tracking-wide">${movie.quality}</span>` : ''}
        `;
    }

    // Update description
    const descElement = document.getElementById('movie-content');
    if (descElement) {
        descElement.innerHTML = movie.content || 'Chưa có mô tả';
    } else {
        const oldDescElement = document.querySelector('.mb-10 p') || document.querySelector('.mb-10.max-w-4xl p');
        if (oldDescElement) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = movie.content;
            oldDescElement.textContent = tempDiv.textContent || 'Chưa có mô tả';
        }
    }

    // Update categories and actors
    addMovieMetadata(movie);
    
    // Populate tab system (Gallery, Cast, Recommendations, OST)
    if (typeof populateMovieTabContents === 'function') {
        populateMovieTabContents(movie);
    }
    
    // Load movie gallery
    loadMovieGallery(movie);

    // Update watch button
    const watchBtn = document.getElementById('watchNowBtn') || document.querySelector('a[href="/watch"]') || document.querySelector('a[href="watch.html"]');
    if (watchBtn) {
        // Check if admin has set a custom link
        const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');
        const customLink = movieLinks[movie.slug];

        if (customLink) {
            const isHtmlEnv = window.location.pathname.includes('.html');
            if (isHtmlEnv) {
                watchBtn.href = `/watch.html?slug=${movie.slug}`;
            } else {
                watchBtn.href = `/xem-phim/${movie.slug}`;
            }
            watchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            console.log('✅ Custom link found for movie:', movie.slug);
        } else if (movie.episodes && movie.episodes.length > 0) {
            // Có episodes từ API
            const serverIndex = typeof currentServerIndexDetail !== 'undefined' ? currentServerIndexDetail : 0;
            const firstEpisode = movie.episodes[serverIndex]?.server_data[0] || movie.episodes[0].server_data[0];
            const cleanSlug = firstEpisode.slug.replace(/^tap-/, '');
            const isHtmlEnv = window.location.pathname.includes('.html');
            if (isHtmlEnv) {
                watchBtn.href = `/watch.html?slug=${movie.slug}&episode=tap-${cleanSlug}&server=${serverIndex}`;
            } else {
                watchBtn.href = `/xem-phim/${movie.slug}/tap-${cleanSlug}?server=${serverIndex}`;
            }
        } else {
            // Không có link
            watchBtn.classList.add('opacity-50', 'cursor-not-allowed');
            watchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Phim chưa có link xem. Vui lòng quay lại sau!');
            });
        }
    }

    // Setup trailer button
    const trailerBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('Xem Trailer') || btn.textContent.includes('Trailer')
    );

    if (trailerBtn && movie.trailer_url) {
        trailerBtn.addEventListener('click', () => {
            showTrailerModal(movie.trailer_url, movie.name);
        });
    } else if (trailerBtn) {
        trailerBtn.classList.add('opacity-50', 'cursor-not-allowed');
        trailerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Phim chưa có trailer');
        });
    }

    // Tích hợp Các bản chiếu
    renderVersions(movie);
}

// Render "Các bản chiếu"
function renderVersions(movie) {
    const actionsContainer = document.querySelector('.movie-actions-container');
    if (!actionsContainer) return;

    let displayLang = 'Phụ đề / Vietsub'; // Mặc định
    if (movie.lang) {
        displayLang = movie.lang;
    }

    const imgUrl = typeof movieAPI !== 'undefined' ? movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 400, 80, true) : 'https://phimimg.com/' +  (movie.thumb_url || movie.poster_url);

    const currentDomain = window.location.hostname;
    const isSvap1 = currentDomain.includes('aphim.top') || currentDomain === 'localhost' || currentDomain === '127.0.0.1';
    const isSvap2 = currentDomain.includes('aphim1.io.vn');
    const isSvap3 = currentDomain.includes('aphim.io.vn') && !isSvap2;

    // Load Lottie web component script if not present
    if (!document.getElementById('dotlottie-script')) {
        const script = document.createElement('script');
        script.id = 'dotlottie-script';
        script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
        script.type = "module";
        document.body.appendChild(script);
    }

    const versionsHTML = `
        <div class="w-full mt-0 mb-4 pl-0 ml-0">
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2 pl-0 ml-0">
                <svg class="w-5 h-5 fill-white flex-shrink-0" style="fill: #ffffff !important;" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l7 4.5-7 4.5z"/></svg>
                Các bản chiếu
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch;" class="w-full pl-0 ml-0">
                <!-- SVAP1 -->
                <button onclick="changeVersion('aphim.top')" style="flex: 1; min-width: 260px; background-color: #5a5d6a; ${isSvap1 ? 'border: 1px solid #fcd576;' : 'border: 1px solid transparent;'}" class="relative overflow-hidden rounded-xl p-4 text-left shadow-lg hover:-translate-y-1 transition-all flex flex-col gap-3 group cursor-pointer">
                    <div id="svap-bg-1" style="position: absolute; top: 0; right: 0; bottom: 0; width: 65%; background-image: url('${imgUrl}'); background-size: cover; background-position: center; pointer-events: none; z-index: 0; opacity: 0.6; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 70%); mask-image: linear-gradient(to right, transparent 0%, black 70%); transition: transform 0.5s ease, background-image 0.5s ease;" class="group-hover:scale-110"></div>
                    
                    <!-- Crown SVAP1 VIP -->
                    <div style="position: absolute; top: -5px; right: -5px; z-index: 20; pointer-events: none; width: 60px; height: 60px; transform: rotate(10deg); filter: drop-shadow(0 0 10px rgba(252,213,118,0.75)); flex items-center justify-center">
                        <svg class="w-8 h-8 flex-shrink-0" style="fill: #fcd576 !important;" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z"/></svg>
                    </div>

                    <div class="relative z-10 flex items-center gap-2 ${isSvap1 ? 'text-[#fcd576]' : 'text-white/90'} font-bold">
                        <svg class="w-4 h-4 fill-white flex-shrink-0" style="fill: #ffffff !important;" viewBox="0 0 24 24"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>
                        <span class="text-[13px] font-bold">${displayLang} (SVAP1)</span>
                    </div>
                    <div class="relative z-10 ${isSvap1 ? 'text-[#fcd576]' : 'text-white/90'} font-medium text-[15px] line-clamp-1 leading-snug">${movie.name}</div>
                    <div style="align-self: flex-start; padding: 6px 14px; border-radius: 6px; z-index: 10; position: relative;" class="mt-1 ${isSvap1 ? 'bg-[#fcd576] text-black' : 'bg-white text-black'} text-[13px] font-bold shadow-sm group-hover:bg-gray-200 transition-colors">
                        ${isSvap1 ? '<span class="flex items-center gap-1.5"><svg class="w-4 h-4 fill-black flex-shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Đang xem bản này</span>' : 'Xem bản này'}
                    </div>
                </button>
                
                <!-- SVAP2 -->
                <button onclick="changeVersion('aphim1.io.vn')" style="flex: 1; min-width: 260px; background-color: #2b7a4b;" class="relative overflow-hidden rounded-xl ${isSvap2 ? 'border: 1px solid #fcd576;' : 'border: 1px solid transparent;'} p-4 text-left shadow-lg hover:-translate-y-1 transition-all flex flex-col gap-3 group cursor-pointer">
                    <div id="svap-bg-2" style="position: absolute; top: 0; right: 0; bottom: 0; width: 65%; background-image: url('${imgUrl}'); background-size: cover; background-position: center; pointer-events: none; z-index: 0; opacity: 0.6; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 70%); mask-image: linear-gradient(to right, transparent 0%, black 70%); transition: transform 0.5s ease, background-image 0.5s ease;" class="group-hover:scale-110"></div>

                    <div class="relative z-10 flex items-center gap-2 ${isSvap2 ? 'text-[#fcd576]' : 'text-white/90'} font-bold">
                        <svg class="w-4 h-4 fill-white flex-shrink-0" style="fill: #ffffff !important;" viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                        <span class="text-[13px] font-bold">${displayLang} (SVAP2)</span>
                    </div>
                    <div class="relative z-10 ${isSvap2 ? 'text-[#fcd576]' : 'text-white/90'} font-medium text-[15px] line-clamp-1 leading-snug">${movie.name}</div>
                    <div style="align-self: flex-start; padding: 6px 14px; border-radius: 6px; z-index: 10; position: relative;" class="mt-1 ${isSvap2 ? 'bg-[#fcd576] text-black' : 'bg-white text-black'} text-[13px] font-bold shadow-sm group-hover:bg-gray-200 transition-colors">
                        ${isSvap2 ? '<span class="flex items-center gap-1.5"><svg class="w-4 h-4 fill-black flex-shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Đang xem bản này</span>' : 'Xem bản này'}
                    </div>
                </button>

                <!-- SVAP3 -->
                <button onclick="changeVersion('aphim.io.vn')" style="flex: 1; min-width: 260px; background-color: #1e3a8a;" class="relative overflow-hidden rounded-xl ${isSvap3 ? 'border: 1px solid #fcd576;' : 'border: 1px solid transparent;'} p-4 text-left shadow-lg hover:-translate-y-1 transition-all flex flex-col gap-3 group cursor-pointer">
                    <div id="svap-bg-3" style="position: absolute; top: 0; right: 0; bottom: 0; width: 65%; background-image: url('${imgUrl}'); background-size: cover; background-position: center; pointer-events: none; z-index: 0; opacity: 0.6; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 70%); mask-image: linear-gradient(to right, transparent 0%, black 70%); transition: transform 0.5s ease, background-image 0.5s ease;" class="group-hover:scale-110"></div>

                    <div class="relative z-10 flex items-center gap-2 ${isSvap3 ? 'text-[#fcd576]' : 'text-white/90'} font-bold">
                        <svg class="w-4 h-4 fill-white flex-shrink-0" style="fill: #ffffff !important;" viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2h2V9H11v6zm7-1c0 .55-.45 1-1 1h-4V9h4c.55 0 1 .45 1 1v4zm-1.5-3h-1.5v2h1.5v-2z"/></svg>
                        <span class="text-[13px] font-bold">${displayLang} (SVAP3)</span>
                    </div>
                    <div class="relative z-10 ${isSvap3 ? 'text-[#fcd576]' : 'text-white/90'} font-medium text-[15px] line-clamp-1 leading-snug">${movie.name}</div>
                    <div style="align-self: flex-start; padding: 6px 14px; border-radius: 6px; z-index: 10; position: relative;" class="mt-1 ${isSvap3 ? 'bg-[#fcd576] text-black' : 'bg-white text-black'} text-[13px] font-bold shadow-sm group-hover:bg-gray-200 transition-colors">
                        ${isSvap3 ? '<span class="flex items-center gap-1.5"><svg class="w-4 h-4 fill-black flex-shrink-0" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg> Đang xem bản này</span>' : 'Xem bản này'}
                    </div>
                </button>
            </div>
        </div>
    `;

    const oldContainer = document.getElementById('versions-container');
    if (oldContainer) oldContainer.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'versions-container';
    wrapper.className = 'w-full block';
    wrapper.innerHTML = versionsHTML;

    
    const mobileEpisodesWrapper = document.getElementById('episodes-mobile')?.closest('.block.lg\\:hidden') || document.getElementById('episodes-mobile')?.parentElement;
    const heroAd = document.getElementById('movie-detail-hero-ad');
    
    if (window.innerWidth < 1024 && mobileEpisodesWrapper) {
        // Trên mobile, Các bản chiếu nằm dưới Máy Chủ
        const mobileServerWrapper = document.getElementById('server-list-mobile')?.parentElement;
        if (mobileServerWrapper) {
            mobileServerWrapper.after(wrapper);
        } else {
            mobileEpisodesWrapper.after(wrapper);
        }
    } else {
        // Trên desktop, Các bản chiếu nằm dưới Máy Chủ
        const desktopServerWrapper = document.getElementById('desktop-server-wrapper');
        const actionsContainer = document.querySelector('.movie-actions-container');
        const heroAd = document.getElementById('movie-detail-hero-ad');
        
        if (desktopServerWrapper) {
            // Đảm bảo luôn nằm dưới danh sách Máy Chủ
            desktopServerWrapper.after(wrapper);
        } else if (heroAd) {
            heroAd.after(wrapper);
        } else if (actionsContainer) {
            actionsContainer.after(wrapper);
        }
    }
}

// Logic chuyển hướng linh hoạt giữa Node và HTML
window.changeVersion = function(domain) {
    const currentDomain = window.location.hostname;
    
    // Nếu domain mục tiêu trùng với domain hiện tại (hoặc đang test ở localhost mà chọn bản mặc định)
    if (currentDomain.includes(domain) || (domain === 'aphim.top' && (currentDomain === 'localhost' || currentDomain === '127.0.0.1'))) {
        if (typeof showToast === 'function') {
            showToast('Bạn đang xem bản chiếu này rồi!', 'info');
        } else {
            alert('Bạn đang xem bản chiếu này rồi!');
        }
        return; // Ngừng thực hiện load lại trang
    }

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const params = new URLSearchParams(currentSearch);
    
    let slug = '';
    let episode = '';
    let isWatchPage = false;
    
    // Ưu tiên đọc từ biến toàn cục nếu đang ở trang xem phim (bảo đảm luôn lấy đúng tập hiện tại)
    if (typeof currentMovie !== 'undefined' && currentMovie && currentMovie.slug) {
        slug = currentMovie.slug;
        if (typeof currentEpisode !== 'undefined' && currentEpisode && currentEpisode.slug) {
            episode = currentEpisode.slug;
            isWatchPage = true;
        } else if (currentPath.includes('/xem-phim/') || currentPath.includes('watch.html')) {
            isWatchPage = true;
        }
    }
    
    // Fallback: Đọc từ URL nếu không có biến toàn cục
    if (!slug) {
        if (currentPath.includes('/phim/')) {
            slug = currentPath.split('/phim/')[1].replace('/', '');
        } else if (currentPath.includes('/xem-phim/')) {
            isWatchPage = true;
            const parts = currentPath.split('/xem-phim/')[1].split('/');
            slug = parts[0];
            if (parts.length > 1) {
                episode = parts[1];
            }
        } else if (currentPath.includes('movie-detail.html')) {
            slug = params.get('slug');
        } else if (currentPath.includes('watch.html')) {
            isWatchPage = true;
            slug = params.get('slug');
            episode = params.get('episode');
        }
    }
    
    // Chuẩn hóa biến tập phim (bỏ "tap-" đi để ghép lại cho chuẩn, tránh lỗi tap-tap-5)
    if (episode) {
        episode = episode.replace(/^tap-/, '');
    }

    if (!slug) {
        window.location.href = "https://" + domain + currentPath + currentSearch;
        return;
    }
    
    // Xây dựng URL đích
    const isNodeDomain = domain === 'aphim.top';
    let newUrl = 'https://' + domain;
    
    if (isNodeDomain) {
        if (isWatchPage) {
            newUrl += '/xem-phim/' + slug;
            if (episode) {
                 if (episode.toLowerCase() === 'full') {
                     newUrl += '/full';
                 } else {
                     newUrl += '/tap-' + episode;
                 }
            }
        } else {
            newUrl += '/phim/' + slug;
        }
    } else {
        if (isWatchPage) {
            newUrl += '/watch.html?slug=' + slug;
            if (episode) {
                 if (episode.toLowerCase() === 'full') {
                     newUrl += '&episode=full';
                 } else {
                     newUrl += '&episode=tap-' + episode;
                 }
            }
        } else {
            newUrl += '/movie-detail.html?slug=' + slug;
        }
    }
    
    window.location.href = newUrl;
};

// Load movie gallery from API
async function loadMovieGallery(movie) {
    const galleryContainer = document.getElementById('movie-gallery-container');
    const scrollContainer = document.getElementById('movie-gallery-scroll');
    const galleryCount = document.getElementById('movie-gallery-count');
    if (!galleryContainer || !scrollContainer) return;

    try {
        const json = await movieAPI.getMovieImages(movie.slug);
        if (!json) return;
        
        if (json.success && json.data && json.data.images && json.data.images.length > 0) {
            const backdrops = json.data.images.filter(img => img.type === 'backdrop' || img.aspect_ratio > 1);
            
            if (backdrops.length > 0) {
                window.movieGalleryImageUrls = backdrops.map(img => `https://image.tmdb.org/t/p/w1280${img.file_path}`);
                galleryContainer.classList.remove('hidden');
                galleryCount.textContent = `(${backdrops.length} ảnh)`;
                
                scrollContainer.innerHTML = backdrops.map((img, index) => `
                    <div style="flex-shrink: 0; width: 280px; aspect-ratio: 16/9; max-width: 80vw;" class="rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:border-white/30 transition-colors relative cursor-pointer" onclick="openLightbox(window.movieGalleryImageUrls, ${index})">
                        <img src="https://image.tmdb.org/t/p/w780${img.file_path}" alt="Cảnh phim ${movie.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" class="transform transition-transform duration-500 hover:scale-110">
                    </div>
                `).join('');
                
                setupGalleryScroll();
                
                                // Di chuyển phần hình ảnh xuống bên dưới mục "Các bản chiếu" (nếu có), hoặc dưới danh sách tập
                const versionsContainer = document.getElementById('versions-container');
                const mobileEpisodesWrapper = document.getElementById('episodes-mobile')?.parentElement;
                
                if (window.innerWidth < 1024) {
                    if (versionsContainer) {
                        versionsContainer.after(galleryContainer);
                        console.log('✅ Gallery container moved below versions-container (Mobile)');
                    } else if (mobileEpisodesWrapper) {
                        mobileEpisodesWrapper.after(galleryContainer);
                        console.log('✅ Gallery container moved below mobile episodes list (Mobile)');
                    }
                } else {
                    const descSection = document.querySelector('.mb-10.max-w-4xl') || document.querySelector('#movie-content-section') || document.querySelector('.mb-10.w-full.text-left');
                    if (descSection) {
                        descSection.before(galleryContainer);
                        console.log('✅ Gallery container positioned above movie description on Desktop');
                    }
                }

                // Update SVAP backgrounds with gallery images dynamically
                const svapBg1 = document.getElementById('svap-bg-1');
                const svapBg2 = document.getElementById('svap-bg-2');
                const svapBg3 = document.getElementById('svap-bg-3');

                if (svapBg1 && svapBg2 && svapBg3) {
                    const img1 = backdrops[0]?.file_path;
                    const img2 = backdrops[1]?.file_path || img1;
                    const img3 = backdrops[2]?.file_path || img2;
                    
                    if (img1) {
                        svapBg1.style.backgroundImage = `url('https://image.tmdb.org/t/p/w780${img1}')`;
                        const topBgImg = document.querySelector('.absolute.top-0 img');
                        if (topBgImg && (!currentMovie || !currentMovie.thumb_url)) {
                            topBgImg.src = `https://image.tmdb.org/t/p/w1280${img1}`;
                        }
                    }
                    if (img2) svapBg2.style.backgroundImage = `url('https://image.tmdb.org/t/p/w780${img2}')`;
                    if (img3) svapBg3.style.backgroundImage = `url('https://image.tmdb.org/t/p/w780${img3}')`;
                }
            }
        }
    } catch (err) {
        console.warn('Lỗi tải hình ảnh phim:', err);
    }
}

function setupGalleryScroll() {
    const scrollContainer = document.getElementById('movie-gallery-scroll');
    const btnLeft = document.getElementById('btn-scroll-left');
    const btnRight = document.getElementById('btn-scroll-right');
    
    if (!scrollContainer || !btnLeft || !btnRight) return;
    
    btnLeft.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: -400, behavior: 'smooth' });
    });
    
    btnRight.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: 400, behavior: 'smooth' });
    });
    
    const checkScroll = () => {
        btnLeft.style.opacity = scrollContainer.scrollLeft > 10 ? '1' : '0';
        btnRight.style.opacity = scrollContainer.scrollLeft < (scrollContainer.scrollWidth - scrollContainer.clientWidth - 10) ? '1' : '0';
    };
    
    scrollContainer.addEventListener('scroll', checkScroll);
    setTimeout(checkScroll, 500);
}

window.openLightbox = function(images, index) {
  let current = index;
  const isMobile = window.innerWidth <= 768;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.97);z-index:99999;display:flex;align-items:center;justify-content:center';
  
  const img = document.createElement('img');
  img.style.cssText = isMobile ? 'max-width:92vw;max-height:70vh;object-fit:contain;border-radius:8px' : 'max-width:70vw;max-height:75vh;object-fit:contain;border-radius:8px';
  img.src = images[current];
  
  const counter = document.createElement('div');
  counter.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:white;font-size:14px';
  counter.textContent = (current+1)+' / '+images.length;
  
  const btnClose = document.createElement('button');
  btnClose.innerHTML = '✕';
  btnClose.style.cssText = 'position:absolute;top:16px;right:20px;background:none;border:none;color:white;font-size:28px;cursor:pointer;z-index:1';
  
  const btnPrev = document.createElement('button');
  btnPrev.innerHTML = '‹';
  btnPrev.style.cssText = isMobile ? 'position:absolute;left:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;left:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';
  
  const btnNext = document.createElement('button');
  btnNext.innerHTML = '›';
  btnNext.style.cssText = isMobile ? 'position:absolute;right:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';
  
  function update() { img.src = images[current]; counter.textContent = (current+1)+' / '+images.length; }
  btnPrev.onclick = () => { current = (current-1+images.length)%images.length; update(); };
  btnNext.onclick = () => { current = (current+1)%images.length; update(); };
  btnClose.onclick = () => document.body.removeChild(overlay);
  overlay.onclick = (e) => { if(e.target===overlay) document.body.removeChild(overlay); };
  document.addEventListener('keydown', function escHandler(e) {
    if(e.key==='Escape') { if(document.body.contains(overlay)) { document.body.removeChild(overlay); document.removeEventListener('keydown', escHandler); } }
    if(e.key==='ArrowLeft') { current=(current-1+images.length)%images.length; update(); }
    if(e.key==='ArrowRight') { current=(current+1)%images.length; update(); }
  });
  
  overlay.appendChild(img);
  overlay.appendChild(counter);
  overlay.appendChild(btnClose);
  overlay.appendChild(btnPrev);
  overlay.appendChild(btnNext);
  document.body.appendChild(overlay);
}

// Add movie metadata (categories, actors, etc.)
// Add movie metadata (categories, actors, etc.) matching old movie-detail project 1:1
function addMovieMetadata(movie) {
    const metaContainer = document.getElementById('movie-metadata-container');
    if (!metaContainer || !movie) return;

    const tmdbId = (movie.tmdb && movie.tmdb.id) ? movie.tmdb.id : 'N/A';
    const tmdbVote = (movie.tmdb && movie.tmdb.vote_average) ? movie.tmdb.vote_average : '8.8';
    const tmdbCount = (movie.tmdb && movie.tmdb.vote_count) ? movie.tmdb.vote_count : 115;
    const tmdbType = (movie.tmdb && movie.tmdb.type) ? movie.tmdb.type.toUpperCase() : 'TV';

    const imdbId = (movie.imdb && movie.imdb.id) ? movie.imdb.id : 'tt28036189';
    const imdbVote = (movie.imdb && movie.imdb.vote_average) ? movie.imdb.vote_average : 'N/A';

    const directors = (movie.director && Array.isArray(movie.director) && movie.director.length > 0 && movie.director[0] !== '') 
        ? movie.director 
        : ['Đang cập nhật'];

    const currentEp = movie.episode_current || 'FULL';
    let epDisplay = currentEp;
    if (currentEp.toLowerCase().includes('full')) {
        epDisplay = movie.total_episodes ? `Hoàn Tất (${movie.total_episodes}/${movie.total_episodes})` : 'Hoàn Tất';
    }

    const categories = (movie.category && Array.isArray(movie.category) && movie.category.length > 0)
        ? movie.category
        : [];

    const countries = (movie.country && Array.isArray(movie.country) && movie.country.length > 0)
        ? movie.country
        : [];

    const cardStyle = `background-color: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.15); padding: 12px 12px !important; border-radius: 14px !important; min-height: 125px !important; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box !important;`;
    const cardHeaderStyle = `margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1);`;
    const tagsWrapperStyle = `display: flex; flex-wrap: wrap; align-items: center; align-content: center; row-gap: 5px !important; column-gap: 5px !important; flex-grow: 1; padding: 2px 0 !important;`;
    const textInfoWrapperStyle = `display: flex; flex-direction: column; justify-content: center; row-gap: 8px !important; flex-grow: 1; padding: 2px 0 !important; font-size: 10.5px !important;`;

    // Build 6 metadata cards matching old movie-detail page 1:1 on a SINGLE horizontal row (Scrollbar Hidden)
    const metadataHTML = `
        <div class="scrollbar-hide" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; scrollbar-width: none; -ms-overflow-style: none;">
            <div style="display: grid !important; grid-template-columns: repeat(6, minmax(0, 1fr)) !important; gap: 10px !important; width: 100% !important; min-width: 760px !important; text-align: left; box-sizing: border-box !important;">
                <!-- 1. Thể Loại -->
            <div style="${cardStyle}" class="shadow-xl hover:bg-white/15 transition-all duration-300 h-full">
                <div style="${cardHeaderStyle}" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span style="width:8px;height:8px;border-radius:50%;background:#4A9EFF;display:inline-block;margin-right:6px;box-shadow:0 0 6px rgba(74,158,255,0.6)"></span>
                        <h4 style="color: #60a5fa; text-shadow: 0 1px 2px rgba(0,0,0,0.5); font-size: 12px !important;" class="font-bold tracking-wide">Thể loại</h4>
                    </div>
                    <span style="background-color: rgba(59,130,246,0.25); color: #eff6ff; font-size: 9px !important; padding: 1px 6px !important;" class="font-bold rounded-full shadow-sm">${categories.length || 1}</span>
                </div>
                <div style="${tagsWrapperStyle}">
                    ${categories.length > 0 ? categories.map(cat => `
                        <a href="/search?category=${cat.slug}" style="border: 1px solid rgba(59,130,246,0.4); color: #93c5fd; text-shadow: 0 1px 2px rgba(0,0,0,0.5); display: inline-flex; align-items: center; padding: 3px 8px !important; border-radius: 6px; font-size: 10.5px !important; font-weight: 600;" class="hover:bg-blue-500/30 transition-colors leading-normal shadow-sm">
                            ${cat.name}
                        </a>
                    `).join('') : `
                        <span style="border: 1px solid rgba(59,130,246,0.4); color: #93c5fd; text-shadow: 0 1px 2px rgba(0,0,0,0.5); display: inline-flex; align-items: center; padding: 3px 8px !important; border-radius: 6px; font-size: 10.5px !important; font-weight: 600;">
                            Đang cập nhật
                        </span>
                    `}
                </div>
            </div>
            
            <!-- 2. Quốc Gia -->
            <div style="${cardStyle}" class="shadow-xl hover:bg-white/15 transition-all duration-300 h-full">
                <div style="${cardHeaderStyle}" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span style="width:8px;height:8px;border-radius:50%;background:#A855F7;display:inline-block;margin-right:6px;box-shadow:0 0 6px rgba(168,85,247,0.6)"></span>
                        <h4 style="color: #c084fc; text-shadow: 0 1px 2px rgba(0,0,0,0.5); font-size: 12px !important;" class="font-bold tracking-wide">Quốc gia</h4>
                    </div>
                    <span style="background-color: rgba(168,85,247,0.25); color: #faf5ff; font-size: 9px !important; padding: 1px 6px !important;" class="font-bold rounded-full shadow-sm">${countries.length || 1}</span>
                </div>
                <div style="${tagsWrapperStyle}">
                    ${countries.length > 0 ? countries.map(c => `
                        <a href="/search?country=${c.slug}" style="border: 1px solid rgba(168,85,247,0.4); color: #d8b4fe; text-shadow: 0 1px 2px rgba(0,0,0,0.5); display: inline-flex; align-items: center; padding: 3px 8px !important; border-radius: 6px; font-size: 10.5px !important; font-weight: 600;" class="hover:bg-purple-500/30 transition-colors leading-normal shadow-sm">
                            ${c.name}
                        </a>
                    `).join('') : `
                        <span style="border: 1px solid rgba(168,85,247,0.4); color: #d8b4fe; text-shadow: 0 1px 2px rgba(0,0,0,0.5); display: inline-flex; align-items: center; padding: 3px 8px !important; border-radius: 6px; font-size: 10.5px !important; font-weight: 600;">
                            Đang cập nhật
                        </span>
                    `}
                </div>
            </div>

            <!-- 3. Thông Tin -->
            <div style="${cardStyle}" class="shadow-xl hover:bg-white/15 transition-all duration-300 h-full">
                <div style="${cardHeaderStyle}" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span style="width:8px;height:8px;border-radius:50%;background:#22C55E;display:inline-block;margin-right:6px;box-shadow:0 0 6px rgba(34,197,94,0.6)"></span>
                        <h4 style="color: #4ade80; text-shadow: 0 1px 2px rgba(0,0,0,0.5); font-size: 12px !important;" class="font-bold tracking-wide">Thông tin</h4>
                    </div>
                    <span style="background-color: rgba(34,197,94,0.25); color: #f0fdf4; font-size: 9px !important; padding: 1px 6px !important;" class="font-bold rounded-full shadow-sm uppercase">${movie.status === 'completed' ? 'FULL' : 'ONGOING'}</span>
                </div>
                <div style="${textInfoWrapperStyle}">
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Thời lượng:</span>
                        <span class="text-white font-semibold">${movie.time || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Tập hiện tại:</span>
                        <span style="color: #4ade80;" class="font-bold">${epDisplay}</span>
                    </div>
                </div>
            </div>

            <!-- 4. TMDB -->
            <div style="${cardStyle}" class="shadow-xl hover:bg-white/15 transition-all duration-300 h-full">
                <div style="${cardHeaderStyle}" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span style="background:#01B4E4;color:white;font-size:9px;font-weight:900;padding:1px 4px;border-radius:3px;margin-right:5px;letter-spacing:0.5px">TMDB</span>
                    </div>
                    <span style="background-color: rgba(14,165,233,0.25); color: #f0f9ff; font-size: 9px !important; padding: 1px 6px !important;" class="font-bold rounded-full shadow-sm uppercase">${tmdbType}</span>
                </div>
                <div style="${textInfoWrapperStyle}">
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>ID:</span>
                        <span class="text-white font-semibold">${tmdbId}</span>
                    </div>
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Điểm số:</span>
                        <span class="text-white font-semibold"><span style="color: #38bdf8;" class="font-bold">${tmdbVote}</span> /10 <span class="text-gray-400 font-normal">(${tmdbCount})</span></span>
                    </div>
                </div>
            </div>

            <!-- 5. IMDb -->
            <div style="${cardStyle}" class="shadow-xl hover:bg-white/15 transition-all duration-300 h-full">
                <div style="${cardHeaderStyle}" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span style="background:#F5C518;color:#000000;font-size:9px;font-weight:900;padding:1px 4px;border-radius:3px;margin-right:5px;letter-spacing:0.5px">IMDb</span>
                    </div>
                    <span style="background-color: rgba(234,179,8,0.25); color: #fefce8; font-size: 9px !important; padding: 1px 6px !important;" class="font-bold rounded-full shadow-sm uppercase">RATING</span>
                </div>
                <div style="${textInfoWrapperStyle}">
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>ID:</span>
                        <span class="text-white font-semibold truncate max-w-[85px]">${imdbId}</span>
                    </div>
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Điểm số:</span>
                        <span class="text-white font-semibold"><span style="color: #fde047;" class="font-bold">${imdbVote}</span> /10</span>
                    </div>
                </div>
            </div>

            <!-- 6. Đạo diễn -->
            <div style="${cardStyle}" class="shadow-xl hover:bg-white/15 transition-all duration-300 h-full">
                <div style="${cardHeaderStyle}" class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span style="width:8px;height:8px;border-radius:50%;background:#F97316;display:inline-block;margin-right:6px;box-shadow:0 0 6px rgba(249,115,22,0.6)"></span>
                        <h4 style="color: #fb923c; text-shadow: 0 1px 2px rgba(0,0,0,0.5); font-size: 12px !important;" class="font-bold tracking-wide">Đạo diễn</h4>
                    </div>
                    <span style="background-color: rgba(249,115,22,0.25); color: #fff7ed; font-size: 9px !important; padding: 1px 6px !important;" class="font-bold rounded-full shadow-sm">${directors.length}</span>
                </div>
                <div style="${tagsWrapperStyle}">
                    ${directors.map(d => `
                        <span style="border: 1px solid rgba(249,115,22,0.4); background-color: rgba(249,115,22,0.1); color: #fed7aa; text-shadow: 0 1px 2px rgba(0,0,0,0.5); display: inline-flex; align-items: center; padding: 3px 8px !important; border-radius: 6px; font-size: 10.5px !important; font-weight: 600;" class="leading-normal shadow-sm">
                            ${d}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    `;

    metaContainer.innerHTML = metadataHTML;
    metaContainer.classList.remove('hidden');
}

let currentServerIndexDetail = 0;

// Biến toàn cục cho search/sort ở trang detail
window.episodeSearchTermDetail = window.episodeSearchTermDetail || '';
window.episodeSortOrderDetail = window.episodeSortOrderDetail || 'asc';

function getLangTagDetail(server, movie) {
    const raw = (server.original_server_name || server.server_name || '').toLowerCase();
    if (raw.includes('thuyết minh') || raw.includes('thuyet minh')) return 'Thuyết Minh';
    if (raw.includes('lồng tiếng') || raw.includes('long tieng')) return 'Lồng Tiếng';
    if (raw.includes('vietsub')) return 'Vietsub';
    if (movie && movie.lang) {
        const mLang = movie.lang.toLowerCase();
        if (mLang.includes('thuyết minh') || mLang.includes('thuyet minh')) return 'Thuyết Minh';
        if (mLang.includes('lồng tiếng') || mLang.includes('long tieng')) return 'Lồng Tiếng';
    }
    return 'Vietsub';
}

// Render episodes
function renderEpisodes(episodes) {
    if (!episodes || episodes.length === 0) return;

    const desktopContainer = document.getElementById('episodes-desktop');
    const mobileContainer = document.getElementById('episodes-mobile');
    
    // Render Server List
    if (episodes.length > 0) {
        const desktopServerContainer = document.getElementById('server-list-desktop');
        const mobileServerContainer = document.getElementById('server-list-mobile');
        
        episodes.forEach((s, idx) => {
            if (!s.original_server_name) s.original_server_name = s.server_name;
            s.server_name = `Nguồn ${idx + 1}`;
        });

        const labelHTML = `
            <div class="flex items-center mr-2 flex-shrink-0 pl-0 ml-0">
                <span class="text-white font-bold uppercase text-[12px] tracking-wider" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">MÁY CHỦ :</span>
            </div>
        `;

        const buttonsHTML = episodes.map((server, index) => {
            const isActive = index === currentServerIndexDetail;
            const totalEps = server.server_data ? server.server_data.length : 0;
            const epText = totalEps === 1 ? 'Full' : `${totalEps} tập`;
            const langTag = getLangTagDetail(server, currentMovie);
            const serverName = `${langTag} N${index + 1}`;

            let borderColor = 'border-blue-500';
            let activeBg = 'bg-blue-500/20';
            let sepColor = 'text-blue-400';
            let glowShadow = 'shadow-[0_0_12px_rgba(59,130,246,0.5)]';
            let inactiveBg = 'bg-blue-500/10';

            if (index === 0) { // Ngu?n 1: V�ng
                borderColor = 'border-yellow-500';
                activeBg = 'bg-yellow-500/20';
                sepColor = 'text-yellow-400';
                glowShadow = 'shadow-[0_0_12px_rgba(234,179,8,0.5)]';
                inactiveBg = 'bg-yellow-500/10';
            } else if (index === 1) { // Ngu?n 2: Xanh l�
                borderColor = 'border-green-500';
                activeBg = 'bg-green-500/20';
                sepColor = 'text-green-400';
                glowShadow = 'shadow-[0_0_12px_rgba(34,197,94,0.5)]';
                inactiveBg = 'bg-green-500/10';
            }

            if (isActive) {
                return `
                    <button onclick="changeServerDetail(${index})"
                        class="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 border-2 ${borderColor} ${activeBg} text-white ${glowShadow} cursor-pointer hover:brightness-110">
                        <span class="text-white font-bold">${serverName}</span>
                        <span class="${sepColor} font-bold">|</span>
                        <span class="text-gray-200 font-medium">${epText}</span>
                    </button>
                `;
            } else {
                return `
                    <button onclick="changeServerDetail(${index})"
                        class="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border border-white/10 bg-[#323447] hover:bg-white/20 text-gray-300 hover:text-white cursor-pointer">
                        <span>${serverName}</span>
                        <span class="text-gray-500">|</span>
                        <span class="text-gray-400">${epText}</span>
                    </button>
                `;
            }
        }).join('');
        
        const serverHtml = labelHTML + buttonsHTML;
        
        if (desktopServerContainer) {
            desktopServerContainer.innerHTML = serverHtml;
            desktopServerContainer.className = "flex flex-wrap items-center gap-2 mb-4 w-full";
        }
        if (mobileServerContainer) {
            mobileServerContainer.innerHTML = serverHtml;
            mobileServerContainer.className = "flex flex-wrap items-center gap-2 mb-4 w-full";
            mobileServerContainer.style.scrollbarWidth = ''; // Đã bỏ ẩn thanh cuộn
        }
    }

    if (!desktopContainer && !mobileContainer) {
        console.warn('⚠️ Episode containers not found');
        return;
    }

    const serverData = episodes[currentServerIndexDetail]?.server_data || episodes[0].server_data;

    // Hiển thị/ẩn thanh tìm kiếm
    ['desktop', 'mobile'].forEach(type => {
        const searchContainer = document.getElementById(`episode-search-${type}`);
        if (searchContainer) {
            searchContainer.style.display = serverData.length > 0 ? 'flex' : 'none';
        }
    });

    // Lọc và Sắp xếp
    let displayEpisodes = [...serverData];
    if (window.episodeSearchTermDetail) {
        const term = window.episodeSearchTermDetail.toLowerCase();
        displayEpisodes = displayEpisodes.filter(ep => ep.name.toLowerCase().includes(term));
    }
    if (window.episodeSortOrderDetail === 'desc') {
        displayEpisodes.reverse();
    }

    const html = displayEpisodes.map((ep) => {
        const _urlP = new URLSearchParams(window.location.search);
        const _epParam = _urlP.get('episode');
        const _epNum = _epParam ? _epParam.replace(/^tap-/, '') : null;
        const cleanSlug = ep.slug.replace(/^tap-/, '');
        const isActive = _epNum ? (cleanSlug === _epNum) : false;
        
        let epName = ep.name ? ep.name.trim() : '';
        if (/^\d+$/.test(epName)) {
            epName = `Tập ${parseInt(epName, 10)}`;
        } else if (/^tập\s*0*(\d+)/i.test(epName)) {
            epName = epName.replace(/^tập\s*0*(\d+)/i, 'Tập $1');
        }

        const isHtmlEnv = window.location.pathname.includes('.html');
        const watchHref = isHtmlEnv 
            ? `/watch.html?slug=${currentMovie.slug}&episode=tap-${cleanSlug}&server=${currentServerIndexDetail}`
            : `/xem-phim/${currentMovie.slug}/tap-${cleanSlug}?server=${currentServerIndexDetail}`;

        return `
            <a href="${watchHref}"
                class="group ${isActive ? 'bg-[#282c3f] border-[#fcd576] text-[#fcd576] font-bold shadow-[0_0_12px_rgba(252,213,118,0.25)]' : 'bg-[#212534] border-white/10 text-white hover:bg-[#2c3144] hover:border-white/20 font-medium'} border rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 transition-all duration-200 w-full text-sm">
                <svg style="width: 14px !important; height: 14px !important; min-width: 14px !important; flex-shrink: 0 !important; display: inline-block !important; fill: currentColor !important;" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <span class="truncate">${epName}</span>
            </a>
        `;
    }).join('');

    if (desktopContainer) desktopContainer.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;
}

window.changeServerDetail = function(index) {
    if (!currentMovie || !currentMovie.episodes || index < 0 || index >= currentMovie.episodes.length) return;
    if (index === currentServerIndexDetail) return;
    
    currentServerIndexDetail = index;
    renderEpisodes(currentMovie.episodes);

    // Cập nhật lại nút Xem Ngay chính khi người dùng đổi máy chủ trên movie-detail
    const watchBtn = document.getElementById('watchNowBtn') || document.querySelector('a[href*="/watch"]') || document.querySelector('a[href*="/xem-phim"]');
    if (watchBtn && currentMovie.episodes[index]?.server_data && currentMovie.episodes[index].server_data.length > 0) {
        const firstEp = currentMovie.episodes[index].server_data[0];
        const cleanSlug = firstEp.slug.replace(/^tap-/, '');
        const isHtmlEnv = window.location.pathname.includes('.html');
        if (isHtmlEnv) {
            watchBtn.href = `/watch.html?slug=${currentMovie.slug}&episode=tap-${cleanSlug}&server=${index}`;
        } else {
            watchBtn.href = `/xem-phim/${currentMovie.slug}/tap-${cleanSlug}?server=${index}`;
        }
    }
};

// Helper toast for favorite actions
function showMovieDetailToast(msg, isSuccess = true) {
    if (typeof showToast === 'function') {
        showToast(msg, isSuccess ? 'success' : 'info');
        return;
    }
    const old = document.getElementById('md-floating-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'md-floating-toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(15,23,42,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:10px 22px;border-radius:999px;font-size:13.5px;font-weight:700;box-shadow:0 12px 32px rgba(0,0,0,0.5);display:flex;align-items:center;gap:8px;pointer-events:none;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);';
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(12px)';
        setTimeout(() => t.remove(), 320);
    }, 2200);
}

// Setup favorite button
function setupFavoriteButton() {
    const buttonsContainer = document.querySelector('.movie-actions-container');
    if (!buttonsContainer || !currentMovie) return;

    const movieSlug = currentMovie.slug || currentMovie.id;
    const isFav = userService.isFavorite(movieSlug);

    const existingFavBtn = document.getElementById('favoriteMovieBtn');
    const existingPlBtn = document.getElementById('saveMovieBtn');

    if (existingFavBtn && existingPlBtn) {
        // Just bind events and update state to existing buttons
        const favSvgPath = existingFavBtn.querySelector('svg path');
        const favIcon = existingFavBtn.querySelector('.material-icons-round');
        const favText = existingFavBtn.querySelector('span:not(.material-icons-round)');
        
        const setFavState = (fav) => {
            if (favSvgPath) {
                favSvgPath.setAttribute('d', fav 
                    ? 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' 
                    : 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z');
            }
            if (favIcon) favIcon.textContent = fav ? 'favorite' : 'favorite_border';
            if (favText) favText.textContent = fav ? 'Đã lưu' : 'Lưu phim';
            if (fav) {
                existingFavBtn.classList.add('is-favorite-active');
            } else {
                existingFavBtn.classList.remove('is-favorite-active');
            }
        };

        setFavState(isFav);

        // Single click binding to prevent duplicate listeners
        existingFavBtn.onclick = (e) => {
            e.preventDefault();
            const targetSlug = currentMovie.slug || currentMovie.id;
            if (userService.isFavorite(targetSlug)) {
                userService.removeFromFavorites(targetSlug);
                setFavState(false);
                showMovieDetailToast('Đã xóa khỏi danh sách yêu thích', false);
            } else {
                if (userService.addToFavorites(currentMovie)) {
                    setFavState(true);
                    showMovieDetailToast('❤️ Đã lưu vào danh sách yêu thích!', true);
                }
            }
        };

        existingPlBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof openPlaylistModal === 'function') {
                openPlaylistModal({
                    slug: currentMovie.slug || currentMovie.id,
                    name: currentMovie.name || currentMovie.title,
                    thumb_url: currentMovie.thumb_url || currentMovie.poster_url,
                    year: currentMovie.year
                });
            }
        };
        return;
    }

    const favBtn = document.createElement('button');
    favBtn.className = 'px-5 h-10 sm:px-6 sm:h-12 lg:w-auto lg:h-auto lg:px-8 lg:py-4 bg-[#323447] lg:bg-white/10 lg:hover:bg-white/20 text-gray-300 lg:text-white font-semibold rounded-full lg:backdrop-blur-md border border-white/5 lg:border-white/30 lg:hover:border-white/50 transition-all duration-300 flex items-center justify-center gap-0 lg:gap-3 shadow-lg flex-shrink-0';
    favBtn.innerHTML = `
        <span class="material-icons-round text-[18px] sm:text-xl lg:text-xl">${isFav ? 'favorite' : 'favorite_border'}</span>
        <span class="hidden lg:inline text-base whitespace-nowrap">${isFav ? 'Đã lưu' : 'Lưu phim'}</span>
    `;

    favBtn.onclick = (e) => {
        e.preventDefault();
        const targetSlug = currentMovie.slug || currentMovie.id;
        if (userService.isFavorite(targetSlug)) {
            userService.removeFromFavorites(targetSlug);
            favBtn.innerHTML = '<span class="material-icons-round text-2xl lg:text-xl">favorite_border</span><span class="hidden lg:inline text-base whitespace-nowrap">Lưu phim</span>';
            showMovieDetailToast('Đã xóa khỏi danh sách yêu thích', false);
        } else {
            if (userService.addToFavorites(currentMovie)) {
                favBtn.innerHTML = '<span class="material-icons-round text-2xl lg:text-xl">favorite</span><span class="hidden lg:inline text-base whitespace-nowrap">Đã lưu</span>';
                showMovieDetailToast('❤️ Đã lưu vào danh sách yêu thích!', true);
            }
        }
    };

    buttonsContainer.appendChild(favBtn);

    // ── Playlist button ──────────────────────────────────
    const plBtn = document.createElement('button');
    plBtn.className = 'px-5 h-10 sm:px-6 sm:h-12 lg:w-auto lg:h-auto lg:px-8 lg:py-4 bg-[#323447] lg:bg-white/10 lg:hover:bg-white/20 text-gray-300 lg:text-white font-semibold rounded-full lg:backdrop-blur-md border border-white/5 lg:border-white/30 lg:hover:border-white/50 transition-all duration-300 flex items-center justify-center gap-0 lg:gap-3 shadow-lg flex-shrink-0';
    plBtn.innerHTML = `
        <span class="material-icons-round text-[18px] sm:text-xl lg:text-xl">playlist_add</span>
        <span class="hidden lg:inline text-base whitespace-nowrap">Thêm vào</span>
    `;
    plBtn.addEventListener('click', () => {
        // ✅ Auth gate: hiện modal nếu chưa đăng nhập
        if (!authService.isLoggedIn()) {
            if (typeof window.showAuthModal === 'function') window.showAuthModal('login');
            return;
        }
        if (typeof openPlaylistModal === 'function') {
            openPlaylistModal({
                slug: currentMovie.slug,
                name: currentMovie.name,
                thumb_url: currentMovie.thumb_url || currentMovie.poster_url,
                year: currentMovie.year
            });
        }
    });
    buttonsContainer.appendChild(plBtn);
}

// Setup rating system
function setupRatingSystem() {
    // Comment section is now static in HTML
    const commentsSection = document.getElementById('comments-section') || document.querySelector('#comments-section');
    
    if (!commentsSection) {
        console.error("DOM Element #comments-section not found!");
        return;
    }
    
    if (!currentMovie) {
        console.warn("currentMovie is null, cannot setup rating.");
        return;
    }

    if (authService.isLoggedIn()) {
        setupRatingStars();
        setupRatingSubmit();
    } else {
        // ✅ Chưa đăng nhập: gắn click submitRating để hiện auth modal
        const submitBtn = document.getElementById('submitRating');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (typeof window.showAuthModal === 'function') window.showAuthModal('login');
            });
        }
    }
}

// Setup rating stars
function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-star');
    const ratingValue = document.getElementById('ratingValue');
    const ratingStarsEl = document.getElementById('ratingStars');

    // Guard: nếu không có element rating stars thì bỏ qua
    if (!ratingStarsEl || stars.length === 0) return;

    let selectedRating = 0;

    // Load user's existing rating
    const userRating = ratingService.getUserRating(currentMovie.slug);
    if (userRating) {
        selectedRating = userRating.rating;
        updateStars(selectedRating);
        document.getElementById('commentInput').value = userRating.comment || '';
    }

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            updateStars(selectedRating);
        });

        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            updateStars(rating, true);
        });
    });

    document.getElementById('ratingStars').addEventListener('mouseleave', () => {
        updateStars(selectedRating);
    });

    function updateStars(rating, isHover = false) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('text-gray-600');
                star.classList.add('text-yellow-400');
            } else {
                star.classList.remove('text-yellow-400');
                star.classList.add('text-gray-600');
            }
        });
        ratingValue.textContent = `${rating}/10`;
        if (!isHover) selectedRating = rating;
    }
}

// Setup rating submit
function setupRatingSubmit() {
    const submitBtn = document.getElementById('submitRating');
    const commentInput = document.getElementById('commentInput');
    const ratingValue = document.getElementById('ratingValue');

    // Guard: firebase-comments.js đã xử lý submit rồi, bỏ qua nếu thiếu element
    if (!submitBtn || !ratingValue) return;

    submitBtn.addEventListener('click', () => {
        const rating = parseInt(ratingValue.textContent.split('/')[0]);
        const comment = commentInput.value.trim();

        if (rating === 0) {
            alert('Vui lòng chọn số sao đánh giá');
            return;
        }

        const result = ratingService.addRating(currentMovie.slug, rating, comment);
        if (result.success) {
            alert('Đánh giá của bạn đã được gửi!');
            loadRatingsAndComments(currentMovie.slug);
        }
    });
}

// Setup comment system
function setupCommentSystem() {
    // Comments will be loaded in loadRatingsAndComments
}

// Load ratings and comments
function loadRatingsAndComments(slug) {
    const ratings = ratingService.getRatings(slug);
    const avg = ratingService.getAverageRating(slug);
    const headerScoreEl = document.getElementById('headerRatingScore');
    if (headerScoreEl) {
        headerScoreEl.textContent = (ratings && ratings.length > 0) ? avg : '0';
    }

    const container = document.getElementById('ratingsContainer');

    if (!container) return;

    if (ratings.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">Chưa có đánh giá nào</p>';
        return;
    }

    container.innerHTML = ratings.map(rating => `
        <div class="border-t border-white/5 pt-6 mt-6">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black font-bold flex-shrink-0">
                    ${rating.userName.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <h4 class="font-bold text-white">${rating.userName}</h4>
                            <div class="flex items-center gap-2 text-sm text-gray-400">
                                <span class="flex items-center gap-1 text-yellow-400 font-bold">
                                    <span class="material-icons-round text-sm">star</span>
                                    ${rating.rating}/10
                                </span>
                                <span>•</span>
                                <span>${new Date(rating.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>
                    </div>
                    ${rating.comment ? `<p class="text-gray-300 leading-relaxed">${rating.comment}</p>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Show error
function showError(message) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="container mx-auto px-6 py-20 text-center flex flex-col items-center justify-center">
                <span class="material-icons-round text-6xl text-amber-400 mb-3">error_outline</span>
                <h2 class="text-2xl font-bold text-red-400 mb-4 mt-2">${message || 'Rất tiếc, không tìm thấy phim này!'}</h2>
                <a href="/" class="inline-block px-6 py-3 bg-[#fcd576] text-black font-bold rounded-xl hover:bg-yellow-500 transition-all shadow-[0_4px_12px_rgba(252,213,118,0.3)] hover:-translate-y-1">
                    Về trang chủ
                </a>
            </div>
        `;
    }
}

// Show trailer modal
function showTrailerModal(trailerUrl, movieName) {
    // Extract YouTube video ID from URL
    let videoId = '';

    if (trailerUrl.includes('youtube.com/watch?v=')) {
        videoId = trailerUrl.split('v=')[1].split('&')[0];
    } else if (trailerUrl.includes('youtu.be/')) {
        videoId = trailerUrl.split('youtu.be/')[1].split('?')[0];
    } else if (trailerUrl.includes('youtube.com/embed/')) {
        videoId = trailerUrl.split('embed/')[1].split('?')[0];
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="relative w-full max-w-5xl mx-4">
            <button onclick="this.closest('.fixed').remove()" 
                class="absolute -top-12 right-0 text-white hover:text-primary transition-colors">
                <span class="material-icons-round text-4xl">close</span>
            </button>
            <div class="bg-surface-dark rounded-xl overflow-hidden border border-white/10">
                <div class="p-4 border-b border-white/10">
                    <h3 class="text-xl font-bold text-white">Trailer - ${movieName}</h3>
                </div>
                <div class="relative aspect-video">
                    ${videoId ? `
                        <iframe 
                            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                            class="w-full h-full"
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    ` : `
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                            <p>Không thể phát trailer</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });

    document.body.appendChild(modal);
}



// --- EVENT LISTENERS CHO TÌM KIẾM/SẮP XẾP TẬP PHIM (DETAIL PAGE) ---
document.addEventListener('DOMContentLoaded', () => {
    ['desktop', 'mobile'].forEach(type => {
        const searchInput = document.getElementById(`search-episode-input-${type}`);
        const sortBtn = document.getElementById(`sort-episodes-btn-${type}`);
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                window.episodeSearchTermDetail = e.target.value;
                // Đồng bộ 2 input
                ['desktop', 'mobile'].forEach(t => {
                    if (t !== type) {
                        const otherInput = document.getElementById(`search-episode-input-${t}`);
                        if (otherInput) otherInput.value = e.target.value;
                    }
                });
                if (currentMovie && currentMovie.episodes) {
                    renderEpisodes(currentMovie.episodes);
                }
            });
        }
        
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                window.episodeSortOrderDetail = window.episodeSortOrderDetail === 'asc' ? 'desc' : 'asc';
                if (currentMovie && currentMovie.episodes) {
                    renderEpisodes(currentMovie.episodes);
                }
            });
        }
    });
});

// Helper to fetch complete cast data with photos & fallbacks
async function fetchCastDataForMovie(movie) {
    let tmdbCast = [];
    let actorList = (movie.actor || []).filter(a => a && a.trim() !== '' && a !== 'Đang cập nhật');

    // 1. Try existing tmdb.id
    try {
        if (movie.tmdb && movie.tmdb.id) {
            const tmdbType = movie.tmdb.type === 'tv' ? 'tv' : 'movie';
            const res = await fetch(`/api/tmdb/${tmdbType}/${movie.tmdb.id}/credits`);
            if (res.ok) {
                const cData = await res.json();
                tmdbCast = cData.cast || [];
            }
        }
    } catch (e) {}

    // 2. Fallback TMDB multi search if tmdbCast is empty
    if (tmdbCast.length === 0 && (movie.origin_name || movie.name)) {
        try {
            const queryName = movie.origin_name || movie.name;
            const searchRes = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(queryName)}`);
            if (searchRes.ok) {
                const sData = await searchRes.json();
                if (sData.results && sData.results.length > 0) {
                    const match = sData.results[0];
                    const tmdbType = match.media_type === 'tv' ? 'tv' : 'movie';
                    const credRes = await fetch(`/api/tmdb/${tmdbType}/${match.id}/credits`);
                    if (credRes.ok) {
                        const cData = await credRes.json();
                        tmdbCast = cData.cast || [];
                    }
                }
            }
        } catch (e) {}
    }

    // 3. Populate actorList if empty
    if (actorList.length === 0 && tmdbCast.length > 0) {
        actorList = tmdbCast.slice(0, 12).map(c => c.name);
        const sidebarActorsEl = document.getElementById('sidebar-actors-text');
        if (sidebarActorsEl) {
            sidebarActorsEl.textContent = actorList.join(', ');
        }
    }

    // 4. Map final cast with high quality photos & fallback avatars
    const targetActors = actorList.slice(0, 15);
    const result = await Promise.all(targetActors.map(async (actorName, idx) => {
        const matched = tmdbCast.find(c => c.name && (c.name.toLowerCase().includes(actorName.toLowerCase()) || actorName.toLowerCase().includes(c.name.toLowerCase()))) || (tmdbCast.length > idx ? tmdbCast[idx] : null);
        let profileUrl = matched && matched.profile_path ? `https://image.tmdb.org/t/p/w300${matched.profile_path}` : '';
        const charName = matched && matched.character ? matched.character : 'Diễn viên';
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(actorName)}&background=1e2130&color=fcd576&size=200&bold=true`;

        // If no TMDB movie cast photo, fetch from actor avatar resolver (TMDB Person + Wikipedia)
        if (!profileUrl) {
            try {
                const avatarRes = await fetch(`/api/actor-avatar?name=${encodeURIComponent(actorName)}`);
                if (avatarRes.ok) {
                    const aData = await avatarRes.json();
                    if (aData && aData.success && aData.url) {
                        profileUrl = aData.url;
                    }
                }
            } catch (e) {}
        }

        return {
            name: actorName,
            character: charName,
            photoUrl: profileUrl || fallbackUrl,
            fallbackUrl: fallbackUrl
        };
    }));

    return result;
}

// POPULATE MOVIE TABS CONTENT (Gallery, Diễn viên, Đề xuất, OST - Match Hình 1-5)
async function populateMovieTabContents(movie) {
    if (!movie) return;

    // Fetch complete cast data once
    const castData = await fetchCastDataForMovie(movie);

    // 1. Gallery Tab (Images with Lightbox View)
    const galleryGrid = document.getElementById('tab-gallery-images');
    if (galleryGrid) {
        let backdrops = [];
        try {
            if (movie.tmdb && movie.tmdb.id) {
                const tmdbType = movie.tmdb.type === 'tv' ? 'tv' : 'movie';
                const res = await fetch(`/api/tmdb/${tmdbType}/${movie.tmdb.id}/images`);
                if (res.ok) {
                    const imgData = await res.json();
                    backdrops = imgData.backdrops || [];
                }
            }
        } catch (e) {}

        // Fallback TMDB multi-search for backdrops if tmdb.id was missing
        if (backdrops.length === 0 && (movie.origin_name || movie.name)) {
            try {
                const queryName = movie.origin_name || movie.name;
                const searchRes = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(queryName)}`);
                if (searchRes.ok) {
                    const sData = await searchRes.json();
                    if (sData.results && sData.results.length > 0) {
                        const match = sData.results[0];
                        const tmdbType = match.media_type === 'tv' ? 'tv' : 'movie';
                        const imgRes = await fetch(`/api/tmdb/${tmdbType}/${match.id}/images`);
                        if (imgRes.ok) {
                            const imgData = await imgRes.json();
                            backdrops = imgData.backdrops || [];
                        }
                    }
                }
            } catch (e) {}
        }

        if (backdrops.length > 0) {
            window.tabGalleryImageUrls = backdrops.slice(0, 12).map((img) => `https://image.tmdb.org/t/p/w1280${img.file_path}`);
            galleryGrid.innerHTML = backdrops.slice(0, 12).map((img, idx) => `
                <div onclick="if(window.openLightbox) window.openLightbox(window.tabGalleryImageUrls, ${idx})" class="aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/10 hover:border-white/40 transition-all cursor-pointer shadow-lg group">
                    <img src="https://image.tmdb.org/t/p/w780${img.file_path}" alt="Gallery Image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
            `).join('');
        } else {
            const fallbackImgs = [movie.poster_url, movie.thumb_url].filter(Boolean);
            if (fallbackImgs.length > 0) {
                window.tabGalleryImageUrls = fallbackImgs.map(url => url.startsWith('http') ? url : 'https://phimimg.com/' + url.replace(/^\//, ''));
                galleryGrid.innerHTML = fallbackImgs.map((url, idx) => {
                    const fullUrl = url.startsWith('http') ? url : 'https://phimimg.com/' + url.replace(/^\//, '');
                    return `
                        <div onclick="if(window.openLightbox) window.openLightbox(window.tabGalleryImageUrls, ${idx})" class="aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/10 hover:border-white/40 transition-all cursor-pointer shadow-lg group">
                            <img src="${fullUrl}" alt="Gallery" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                    `;
                }).join('');
            } else {
                galleryGrid.innerHTML = `<p class="text-gray-400 text-sm col-span-full">Đang cập nhật...</p>`;
            }
        }
    }

    // 2. Diễn viên Tab (Không có khung viền bao quanh chữ bên dưới)
    const castGrid = document.getElementById('tab-cast-grid');
    if (castGrid && castData.length > 0) {
        castGrid.innerHTML = castData.map(actor => `
            <div class="flex flex-col group cursor-pointer transition-all duration-300 hover:-translate-y-1">
                <div class="w-full aspect-[3/4] bg-[#0d0f1a] rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:border-[#fcd576]/60 transition-all relative flex items-center justify-center">
                    <img src="${actor.photoUrl}" alt="${actor.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.src='${actor.fallbackUrl}';" />
                </div>
                <div class="pt-2 text-center flex flex-col justify-center">
                    <h5 class="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-[#fcd576] transition-colors" title="${actor.name}">${actor.name}</h5>
                    ${actor.character ? `<p class="text-gray-400 text-[11px] font-normal line-clamp-1 mt-0.5" title="${actor.character}">${actor.character}</p>` : ''}
                </div>
            </div>
        `).join('');
    }

    // 3. Đề xuất Tab (Match Hình 5)
    const recGrid = document.getElementById('tab-recommend-grid');
    if (recGrid) {
        try {
            let recItems = [];
            if (typeof movieAPI !== 'undefined' && movieAPI.fetchWithFallback) {
                const res = await movieAPI.fetchWithFallback('/danh-sach/phim-moi-cap-nhat?page=1&limit=12');
                const rawData = await res.json();
                const data = movieAPI.normalizeResponse ? movieAPI.normalizeResponse(rawData) : rawData;
                recItems = (data?.data?.items || data?.items || []).filter(m => m && m.slug !== movie.slug).slice(0, 12);
            }
            if (!recItems || recItems.length === 0) {
                const res = await fetch('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
                const data = await res.json();
                recItems = (data?.items || []).filter(m => m && m.slug !== movie.slug).slice(0, 12);
            }

            if (recItems && recItems.length > 0) {
                const isNodeSSR = (typeof window !== 'undefined' && window.__IS_NODE_SERVER__ === true);
                recGrid.innerHTML = recItems.map(item => {
                    const title = (item.name || item.title || '').replace(/"/g, '&quot;');
                    const origin = (item.origin_name || '').replace(/"/g, '&quot;');
                    const rawImg = item.poster_url || item.thumb_url || '';
                    let imgUrl = rawImg;
                    if (imgUrl && !imgUrl.startsWith('http')) {
                        imgUrl = 'https://phimimg.com/' + imgUrl.replace(/^\//, '');
                    }
                    const detailUrl = isNodeSSR ? `/phim/${item.slug}` : `movie-detail.html?slug=${item.slug}`;
                    const epText = item.episode_current || 'Full';

                    // Parse badges màu sắc (Match Hình 2)
                    const langStr = (item.lang || '').toLowerCase();
                    const isSub = langStr.includes('vietsub') || langStr.includes('phụ đề') || true;
                    const isDub = langStr.includes('thuyết minh') || langStr.includes('lồng tiếng');
                    const quality = (item.quality || 'FHD').toUpperCase();

                    return `
                        <a href="${detailUrl}" class="group flex flex-col rounded-2xl overflow-hidden bg-[#181b26] border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-xl text-left">
                            <div class="relative w-full aspect-[2/3] overflow-hidden bg-black/40 rounded-xl">
                                <!-- Top-left Colored Badges (Match Hình 2) -->
                                <div class="absolute top-2 left-2 flex items-center gap-1 z-10 flex-wrap max-w-[85%]">
                                    ${isSub ? `<span class="bg-[#86efac] text-black font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow-md leading-none">P.Đề</span>` : ''}
                                    ${isDub ? `<span class="bg-[#86efac] text-black font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow-md leading-none">T.Minh</span>` : ''}
                                    <span class="bg-[#fcd576] text-black font-extrabold text-[10px] px-1.5 py-0.5 rounded-md shadow-md leading-none">${quality}</span>
                                </div>

                                <img src="${imgUrl}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />

                                <!-- Bottom-right Episode Badge -->
                                <span class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-gray-300 font-bold text-[10px] px-1.5 py-0.5 rounded border border-white/10 shadow-md leading-none">${epText}</span>
                            </div>
                            <div class="p-3 flex flex-col gap-1 text-left">
                                <h4 class="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-[#fcd576] transition-colors text-left leading-snug" title="${title}">${title}</h4>
                                ${origin ? `<p class="text-gray-400 text-[11px] line-clamp-1 font-normal text-left" title="${origin}">${origin}</p>` : ''}
                            </div>
                        </a>
                    `;
                }).join('');
            }
        } catch (e) {
            console.warn('[MovieTab] Error populating recommendations:', e);
        }
    }

    // 4. Side Cast Grid (Match Hình 4 - Cột phải bên cạnh Nội dung phim)
    const sideCastGrid = document.getElementById('movie-cast-side-grid');
    const sideCastSection = document.getElementById('movie-cast-side-section');
    if (sideCastGrid && castData.length > 0) {
        if (sideCastSection) sideCastSection.classList.remove('hidden');
        sideCastGrid.innerHTML = castData.map(actor => `
            <div class="flex flex-col items-center group cursor-pointer text-center w-20 sm:w-24 flex-shrink-0">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-[#181b26] border-2 border-white/10 group-hover:border-[#fcd576] transition-all duration-300 shadow-lg mb-2 flex items-center justify-center flex-shrink-0">
                    <img src="${actor.photoUrl}" alt="${actor.name}" class="w-full h-full object-cover" loading="lazy" onerror="this.src='${actor.fallbackUrl}';" />
                </div>
                <h5 class="text-white font-semibold text-xs sm:text-sm line-clamp-1 group-hover:text-[#fcd576] transition-colors max-w-full" title="${actor.name}">${actor.name}</h5>
            </div>
        `).join('');

        if (window.alignTopWeeklyWithCast) {
            window.alignTopWeeklyWithCast();
            setTimeout(window.alignTopWeeklyWithCast, 300);
        }
    }
}
window.populateMovieTabContents = populateMovieTabContents;

// 🎭 Interactive Emoji Reaction Voting (Match Hình 1)
window.castReaction = function(reactionType) {
    const reactionNames = {
        te: '😭 Bạn đã đánh giá Tệ',
        tam: '🙁 Bạn đã đánh giá Tạm',
        hay: '😊 Cảm ơn bạn đã đánh giá Hay!',
        thich: '😘 Cảm ơn bạn đã đánh giá Thích!',
        tuyet: '😍 Cảm ơn bạn đã đánh giá Tuyệt vời!'
    };
    const msg = reactionNames[reactionType] || 'Cảm ơn bạn đã đánh giá!';
    alert(msg);
};




