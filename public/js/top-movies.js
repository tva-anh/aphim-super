// Top Movies Hot Section — New Premium Ranking Layout (Sắp xếp theo Số Sao & Đánh Giá Cao Nhất)
async function loadTopMovies() {
    const loading = document.getElementById('topMoviesLoading');
    const container = document.getElementById('topMoviesContainer');

    try {
        let finalMovies = [];
        
        // 1. Fetch TMDB Trending
        if (typeof getTrendingFromTMDB !== 'undefined') {
            const tmdbMovies = await getTrendingFromTMDB();
            
            if (tmdbMovies && tmdbMovies.length > 0) {
                // Lấy top 15 phim hot nhất từ TMDB để tra cứu
                const topTmdb = tmdbMovies.slice(0, 15);
                
                // 2. Tìm kiếm các phim này trên Ophim đồng thời
                const searchPromises = topTmdb.map(async (tmdbMovie) => {
                    const query = tmdbMovie.title || tmdbMovie.name || tmdbMovie.original_title;
                    if (!query) return null;
                    
                    try {
                        const searchRes = await movieAPI.searchMovies(query, 1, 'ophim1');
                        if (searchRes && searchRes.data && searchRes.data.items && searchRes.data.items.length > 0) {
                            // Lấy kết quả đầu tiên khớp
                            const ophimMatch = searchRes.data.items[0];
                            // Ghi đè thông tin TMDB để hiển thị sao thật
                            ophimMatch.tmdb = {
                                vote_average: tmdbMovie.vote_average,
                                id: tmdbMovie.id
                            };
                            // Ghi đè poster nét từ TMDB nếu có
                            if (tmdbMovie.poster_path) {
                                ophimMatch.custom_poster = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`;
                            }
                            return ophimMatch;
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                });
                
                const results = await Promise.all(searchPromises);
                finalMovies = results.filter(m => m !== null);
            }
        }
        
        // 3. Fallback nếu TMDB lỗi hoặc tìm không ra phim nào
        if (finalMovies.length < 10) {
            const homeData = await movieAPI.getHome();
            if (homeData && homeData.status === 'success' && homeData.data && homeData.data.items) {
                const fallbackMovies = homeData.data.items.slice(0, 15);
                finalMovies = [...finalMovies, ...fallbackMovies];
            }
        }
        
        // Lọc trùng lặp
        const uniqueMovies = [];
        const seenSlugs = new Set();
        for (const m of finalMovies) {
            if (m.slug && !seenSlugs.has(m.slug)) {
                seenSlugs.add(m.slug);
                uniqueMovies.push(m);
            }
        }
        
        // Sắp xếp lại theo điểm sao
        uniqueMovies.sort((a, b) => {
            const scoreA = parseFloat(a.tmdb?.vote_average || a.rating || (9.8 - (uniqueMovies.indexOf(a) * 0.1)));
            const scoreB = parseFloat(b.tmdb?.vote_average || b.rating || (9.8 - (uniqueMovies.indexOf(b) * 0.1)));
            return scoreB - scoreA;
        });

        const top10Movies = uniqueMovies.slice(0, 10);

        if (top10Movies.length > 0) {
            renderTopMovies(top10Movies);
        } else {
            if(loading) loading.innerHTML = '<p class="text-gray-400">Không thể tải top phim</p>';
        }
    } catch (error) {
        console.error('Error loading top movies:', error);
        if(loading) loading.innerHTML = '<p class="text-red-400">Lỗi khi tải top phim</p>';
    }
}

function renderTopMovies(movies) {
    const loading = document.getElementById('topMoviesLoading');
    const container = document.getElementById('topMoviesContainer');

    if (loading) loading.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    if (!container) return;

    container.innerHTML = movies.map((movie, index) => {
        const rank = index + 1;
        const optimizedUrl = movie.custom_poster ? movie.custom_poster : movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 400, 80);
        const detailUrl = `movie-detail.html?slug=${movie.slug}`;
        
        // Rating & Stars
        const ratingVal = (movie.tmdb?.vote_average || movie.rating || movie.imdb?.vote_average || (9.9 - index * 0.2)).toFixed(1);

        // Episode & Info Badges
        const episodes = movie.episode_current || '';
        
        let episodeLabel = '';
        if (episodes) {
            if (/trailer/i.test(episodes) || /^tập/i.test(episodes)) {
                episodeLabel = episodes;
            } else {
                episodeLabel = `Tập ${episodes}`;
            }
        }

        return `
            <div class="ranking-item group" data-rank="${rank}">
                <a href="${detailUrl}">
                    <div class="ranking-poster-w">
                        <img src="${optimizedUrl}" 
                             data-ophim-src="${optimizedUrl}"
                             data-tmdb-slug="${movie.slug}"
                             data-tmdb-id="${movie.tmdb?.id || ''}"
                             data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                             data-tmdb-year="${movie.year || ''}"
                             data-tmdb-type="poster"
                             alt="${movie.name}" 
                             class="w-full h-full object-cover"
                             loading="lazy"
                             onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null"
                              />
                        
                        <div class="ranking-badges-bottom">
                            <span class="badge-pd flex items-center gap-1 font-bold text-amber-300 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded">
                                ⭐ ${ratingVal}
                            </span>
                            <span class="badge-lt">${episodes || 'Full'}</span>
                        </div>

                        <div class="ranking-icon-circle"><span class="material-icons-round">star</span></div>

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
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs text-amber-400 font-bold flex items-center gap-1">⭐ ${ratingVal}</span>
                                ${episodeLabel ? `<span class="text-[11px] text-gray-400">${episodeLabel}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        `;

    }).join('');

    // Sau khi render xong, upgrade ảnh lên TMDB trong nền (không block UI)
    setTimeout(() => {
        if (typeof imageOptimizer !== 'undefined' && imageOptimizer.getTMDBImageUrl) {
            container.querySelectorAll('img[data-tmdb-name]').forEach(async (img) => {
                try {
                    const tmdbUrl = await imageOptimizer.getTMDBImageUrl(img);
                    if (tmdbUrl && img.src !== tmdbUrl) {
                        const tempImg = new Image();
                        tempImg.onload = () => { img.src = tmdbUrl; };
                        tempImg.src = tmdbUrl;
                    }
                } catch (e) {
                    // Giữ nguyên ảnh OPhim nếu TMDB thất bại
                }
            });
        }
    }, 500);
}

// Scroll logic
function setupTopMoviesScroll() {
    const container = document.getElementById('topMoviesContainer');
    const leftBtn = document.getElementById('topMoviesScrollLeft');
    const rightBtn = document.getElementById('topMoviesScrollRight');

    if (!container || !leftBtn || !rightBtn) return;

    leftBtn.onclick = () => container.scrollBy({ left: -container.clientWidth * 0.8, behavior: 'smooth' });
    rightBtn.onclick = () => container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
}

// Run
document.addEventListener('DOMContentLoaded', () => {
    loadTopMovies();
    setupTopMoviesScroll();
});

// Bind for external access if needed
window.scrollTopMovies = (dir) => {
    const container = document.getElementById('topMoviesContainer');
    if (container) container.scrollBy({ left: dir === 'right' ? 800 : -800, behavior: 'smooth' });
};
