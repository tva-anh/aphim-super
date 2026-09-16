/**
 * Coming Soon Movies Section - Top 10 Styling (Sync with Top Movies Layout)
 * Load movies from "phim-chieu-rap"
 */

(function () {
    'use strict';

    // Load theater movies
    async function loadComingSoonMovies() {
        const loading = document.getElementById('comingSoonLoading');
        const container = document.getElementById('comingSoonContainer');

        if (!loading || !container) {
            return;
        }

        try {
            // Fetch from phim-chieu-rap API using getMoviesFromMultipleSources for better normalization
            let data = await movieAPI.getMoviesFromMultipleSources(1, 'phim-chieu-rap');

            // Fallback to phim-le if phim-chieu-rap is empty or fails
            if (!data || !data.status || !data.data || !data.data.items || data.data.items.length === 0) {
                console.warn('Phim chieu rap is empty or failed, falling back to phim-le');
                data = await movieAPI.getMoviesFromMultipleSources(1, 'phim-le');
            }

            if (data && data.status && data.data && data.data.items && data.data.items.length > 0) {
                // Limit to top 10 movies
                renderComingSoonMovies(data.data.items.slice(0, 10));
            } else {
                loading.innerHTML = '<p class="text-gray-400">Không thể tải phim chiếu rạp</p>';
            }
        } catch (error) {
            console.error('Error loading theater movies:', error);
            loading.innerHTML = '<p class="text-red-400">Lỗi khi tải phim chiếu rạp</p>';
        }
    }

    function renderComingSoonMovies(movies) {
        const loading = document.getElementById('comingSoonLoading');
        const container = document.getElementById('comingSoonContainer');
        
        if (!container) return;

        if (loading) loading.classList.add('hidden');
        container.classList.remove('hidden');

        container.innerHTML = movies.map((movie, index) => {
            const rank = index + 1;
            const optimizedUrl = movieAPI.getImageURL(movie.thumb_url || movie.poster_url, 400, 80);
            const detailUrl = `movie-detail.html?slug=${movie.slug}`;
            const episodes = movie.episode_current || '';
            
            return `
                <div class="ranking-item group" data-rank="${rank}">
                    <a href="${detailUrl}">
                        <div class="ranking-poster-w">
                            <img data-src="${optimizedUrl}" 
                                 alt="${movie.name}" 
                                 class="w-full h-full object-cover"
                                 data-tmdb-slug="${movie.slug}"
                                 data-tmdb-id="${movie.tmdb?.id || ''}"
                                 data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                                 data-tmdb-year="${movie.year || ''}"
                                 data-tmdb-type="poster"
                                 src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E"
                                 onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'"
                                  />
                            
                            <div class="ranking-badges-bottom">
                                <span class="badge-pd">PĐ. ${episodes.replace(/[^0-9]/g, '') || 'HD'}</span>
                                <span class="badge-lt">LT. ${episodes.replace(/[^0-9]/g, '') || 'Full'}</span>
                            </div>

                            <div class="ranking-icon-circle"><span class="material-icons-round">theaters</span></div>

                            <!-- Hover overlay -->
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform">
                                    <span class="material-icons-round text-black text-2xl">play_arrow</span>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Info with Big Rank -->
                        <div class="ranking-info-w">
                            <div class="rank-big-number">${rank}</div>
                            <div class="ranking-text-content">
                                <h3 class="ranking-title">${movie.name}</h3>
                                <p class="ranking-sub">${movie.origin_name || ''}</p>
                                ${episodes ? `<p class="ranking-extra">${episodes}</p>` : ''}
                            </div>
                        </div>
                    </a>
                </div>
            `;
        }).join('');

        // Setup scroll buttons
        setupScrollButtons();
    }

    function setupScrollButtons() {
        const container = document.getElementById('comingSoonContainer');
        const leftBtn = document.getElementById('comingSoonScrollLeft');
        const rightBtn = document.getElementById('comingSoonScrollRight');

        if (!container || !leftBtn || !rightBtn) return;

        leftBtn.onclick = () => container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
        rightBtn.onclick = () => container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
    }

    // Run
    loadComingSoonMovies();
    setupScrollButtons();

    // Expose to window
    window.loadComingSoonMovies = loadComingSoonMovies;
})();
