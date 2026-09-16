// Horror Section - Load phim kinh dị từ API (giống search.html)
// Horror Section - Load phim kinh dị từ API

(function () {
    'use strict';

    async function loadHorrorMovies() {

        const container = document.getElementById('horrorBannerContainer');

        if (!container) { return; }

        try {
            const data = await movieAPI.getMoviesFromMultipleSources(1, 'kinh-di');

            if (data && (data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
                const movies = data.data.items.slice(0, 20);
                renderHorrorBanner(movies[0], movies);
            } else {
                console.error('[Horror] Invalid data structure:', data);
                showError();
            }
        } catch (error) {
            console.error('[Horror] Error:', error);
            showError();
        }
    }

    let currentActiveIndex = 0; // Track active thumbnail

    function renderHorrorBanner(mainMovie, allMovies, activeIndex = 0) {
        currentActiveIndex = activeIndex;

        const container = document.getElementById('horrorBannerContainer');
        if (!container) {
            console.error('[Horror] Container not found in render');
            return;
        }

        const posterUrl = mainMovie.poster_url
            ? (mainMovie.poster_url.startsWith('http') ? mainMovie.poster_url : 'https://phimimg.com/' +  mainMovie.poster_url)
            : (mainMovie.thumb_url
                ? (mainMovie.thumb_url.startsWith('http') ? mainMovie.thumb_url : 'https://phimimg.com/' +  mainMovie.thumb_url)
                : 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E');
        const title = mainMovie.name || 'Phim Kinh Dị';
        const originName = mainMovie.origin_name || '';
        const year = mainMovie.year || '2024';
        const quality = mainMovie.quality || 'HD';
        const lang = mainMovie.lang || 'Vietsub';
        const description = mainMovie.content || 'Một bộ phim kinh dị đầy ám ảnh...';

        const html = `
            <style>
                .horror-stage { aspect-ratio: 3/4; min-height: 550px; }
                .horror-text-pos { bottom: 144px; }
                @media (min-width: 640px) { .horror-stage { aspect-ratio: 4/5; } }
                @media (min-width: 768px) { .horror-stage { aspect-ratio: 16/9; min-height: 600px; } }
                @media (min-width: 1024px) { 
                    .horror-stage { aspect-ratio: 21/9; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; } 
                    .horror-text-pos { position: relative !important; bottom: auto !important; left: auto !important; width: 100% !important; padding-bottom: 0; }
                    .horror-desktop-content { display: flex; flex-direction: column; width: 100%; position: relative; z-index: 10; padding: 0 4rem 0 4rem; }
                    .horror-thumbnails-container-desktop { position: relative !important; bottom: auto !important; padding: 1.5rem 4rem 1.5rem 4rem; }
                }
            </style>
            <section class="relative w-full horror-stage rounded-3xl overflow-hidden shadow-2xl bg-[#282a3a]">
                <img 
                    alt="${title}" 
                    class="absolute inset-0 w-full h-full object-cover object-center scale-105" 
                    data-src="${movieAPI.getImageURL(mainMovie.poster_url || mainMovie.thumb_url, 1200, 90, true)}"
                    data-tmdb-slug="${mainMovie.slug}"
                    data-tmdb-id="${mainMovie.tmdb?.id || ''}"
                    data-tmdb-name="${(mainMovie.name || '').replace(/"/g, '&quot;')}"
                    data-tmdb-year="${mainMovie.year || ''}"
                    data-tmdb-type="backdrop"
                    src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E"
                    onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null"
                    loading="eager"
                />
                
                <div class="absolute inset-0 horror-banner-gradient"></div>
                <div class="absolute inset-0 horror-banner-overlay"></div>

                <!-- Mobile/Tablet layout: absolute positioning -->
                <div class="absolute horror-text-pos left-0 w-full px-6 md:px-16 z-10 lg:hidden">
                    <h2 class="font-cursive text-3xl md:text-5xl text-white mb-2 drop-shadow-lg leading-none pt-2">${title}</h2>
                    ${originName ? `<h3 class="text-primary text-sm md:text-lg font-semibold mb-3 uppercase tracking-wider">${originName}</h3>` : ''}
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span class="horror-glass-tag px-2 py-1 rounded text-xs font-bold text-primary">${quality}</span>
                        <span class="horror-glass-tag px-2 py-1 rounded text-xs font-medium border border-white/20">${year}</span>
                        <span class="horror-glass-tag px-2 py-1 rounded text-xs font-medium border border-white/20">${lang}</span>
                    </div>
                    <p class="text-slate-200 text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 mb-4 max-w-2xl hidden sm:block">
                        ${stripHtml(description).substring(0, 150)}...
                    </p>
                    <div class="flex items-center gap-3">
                        <a href="movie-detail.html?slug=${mainMovie.slug}" 
                           class="relative w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#facc15] to-[#f59e0b] rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg group">
                            <div class="absolute inset-[3px] md:inset-[4px] bg-black/15 rounded-full pointer-events-none transition-colors group-hover:bg-black/10"></div>
                            <span class="material-icons text-white text-2xl md:text-3xl ml-1 relative z-10 drop-shadow-md">play_arrow</span>
                        </a>
                        <a href="movie-detail.html?slug=${mainMovie.slug}"
                           class="w-10 h-10 md:w-11 md:h-11 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-md bg-black/20">
                            <span class="material-icons text-white text-lg">info_outline</span>
                        </a>
                    </div>
                </div>

                <!-- Desktop layout: flex column at bottom -->
                <div class="hidden lg:flex flex-col justify-end absolute inset-0 z-10 pb-6">
                    <div class="px-16 mb-4">
                        <h2 class="font-cursive text-5xl text-white mb-2 drop-shadow-lg leading-none pt-2">${title}</h2>
                        ${originName ? `<h3 class="text-primary text-lg font-semibold mb-3 uppercase tracking-wider">${originName}</h3>` : ''}
                        <div class="flex flex-wrap gap-2 mb-3">
                            <span class="horror-glass-tag px-2 py-1 rounded text-xs font-bold text-primary">${quality}</span>
                            <span class="horror-glass-tag px-2 py-1 rounded text-xs font-medium border border-white/20">${year}</span>
                            <span class="horror-glass-tag px-2 py-1 rounded text-xs font-medium border border-white/20">${lang}</span>
                        </div>
                        <p class="text-slate-200 text-sm leading-relaxed line-clamp-3 mb-4 max-w-2xl">
                            ${stripHtml(description).substring(0, 150)}...
                        </p>
                        <div class="flex items-center gap-3">
                            <a href="movie-detail.html?slug=${mainMovie.slug}" 
                               class="relative w-14 h-14 bg-gradient-to-br from-[#facc15] to-[#f59e0b] rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-lg group">
                                <div class="absolute inset-[4px] bg-black/15 rounded-full pointer-events-none transition-colors group-hover:bg-black/10"></div>
                                <span class="material-icons text-white text-3xl ml-1 relative z-10 drop-shadow-md">play_arrow</span>
                            </a>
                            <a href="movie-detail.html?slug=${mainMovie.slug}"
                               class="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-md bg-black/20">
                                <span class="material-icons text-white text-lg">info_outline</span>
                            </a>
                        </div>
                    </div>
                    <div class="px-16 horror-thumbnails-container" style="position:static">
                    <div class="flex items-center gap-3 horror-thumbnail-scroll pb-2">
                        ${allMovies.map((movie, index) => {
            let movieThumb = movie.poster_url || movie.thumb_url || '';
            // Thêm base URL nếu chưa có
            if (movieThumb && !movieThumb.startsWith('http')) {
                movieThumb = 'https://phimimg.com/' +  movieThumb;
            }
            if (!movieThumb) {
                movieThumb = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E';
            }
            const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };
            const isActive = index === activeIndex;
            return `
                                <div class="flex-shrink-0 ${isActive ? 'w-20 h-28 md:w-24 md:h-36 horror-thumbnail-active' : 'w-16 h-24 md:w-20 md:h-32 opacity-60'} rounded-xl overflow-hidden horror-thumbnail cursor-pointer transition-all duration-300 relative ${hiddenUI.containerClass}"
                                     data-movie-index="${index}">
                                    <img 
                                        alt="${movie.name || 'Phim'}" 
                                        class="w-full h-full object-cover ${hiddenUI.imgClass}" 
                                        data-src="${typeof imageOptimizer !== 'undefined' ? imageOptimizer.optimizeImageUrl(movie.poster_url || movie.thumb_url, 300, 70) : movieThumb}"
                                        data-tmdb-slug="${movie.slug}"
                                        data-tmdb-id="${movie.tmdb?.id || ''}"
                                        data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                                        data-tmdb-year="${movie.year || ''}"
                                        data-tmdb-type="poster"
                                        src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E"
                                        onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null"
                                        loading="lazy"
                                    />
                                    ${hiddenUI.badge}
                                    <!-- Play Overlay -->
                                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                        <div class="w-8 h-8 bg-primary/90 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                            <span class="material-icons-round text-black text-sm">play_arrow</span>
                                        </div>
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div><!-- end horror-thumbnails-container -->
            </div><!-- end lg:flex wrapper -->

                <!-- Mobile thumbnail strip - chỉ hiện trên mobile (dưới lg) -->
                <div class="absolute bottom-0 left-0 w-full z-10 lg:hidden px-3 pb-2">
                    <div class="flex items-center gap-2 horror-thumbnail-scroll">
                        ${allMovies.map((movie, index) => {
            let mobileThumb = movie.poster_url || movie.thumb_url || '';
            if (mobileThumb && !mobileThumb.startsWith('http')) {
                mobileThumb = 'https://phimimg.com/' +  mobileThumb;
            }
            if (!mobileThumb) { mobileThumb = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'; }
            const isActiveMobile = index === activeIndex;
            return `
                            <div class="flex-shrink-0 ${isActiveMobile ? 'w-12 h-16 horror-thumbnail-active' : 'w-10 h-14 opacity-50'} rounded-lg overflow-hidden horror-thumbnail cursor-pointer transition-all duration-300" data-movie-index="${index}">
                                <img alt="${movie.name || 'Phim'}" class="w-full h-full object-cover" 
                                    data-src="${typeof imageOptimizer !== 'undefined' ? imageOptimizer.optimizeImageUrl(movie.poster_url || movie.thumb_url, 150, 65) : mobileThumb}" 
                                    data-tmdb-slug="${movie.slug}"
                                    data-tmdb-id="${movie.tmdb?.id || ''}"
                                    data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                                    data-tmdb-year="${movie.year || ''}"
                                    data-tmdb-type="poster"
                                    src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E"
                                    onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null">
                            </div>`;
        }).join('')}
                    </div>
                </div>

            </section>
        `;

        container.innerHTML = html;

        setupThumbnailHandlers(allMovies);
    }

    function setupThumbnailHandlers(movies) {
        const thumbnails = document.querySelectorAll('.horror-thumbnail');

        thumbnails.forEach((thumb) => {
            thumb.addEventListener('click', () => {
                const idx = parseInt(thumb.getAttribute('data-movie-index'));
                if (!isNaN(idx) && movies[idx]) {
                    renderHorrorBanner(movies[idx], movies, idx);
                }
            });
        });
    }

    function stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    function showError() {
        const container = document.getElementById('horrorBannerContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-20 bg-slate-900/50 rounded-3xl">
                <span class="material-icons text-red-500 text-6xl mb-4">error_outline</span>
                <p class="text-red-500 mb-4 text-lg">Không thể tải phim kinh dị</p>
                <p class="text-gray-400 mb-6 text-sm">Vui lòng thử lại sau</p>
                <button onclick="location.reload()" class="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors font-semibold">
                    Thử lại
                </button>
            </div>
        `;
    }

    // Initialize - đợi movieAPI load xong
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Đợi một chút để movieAPI được khởi tạo
            setTimeout(loadHorrorMovies, 100);
        });
    } else {
        setTimeout(loadHorrorMovies, 100);
    }

})();
