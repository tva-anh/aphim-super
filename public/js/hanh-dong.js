// Phim Hành Động Page Script
let currentPage = 1;
const CATEGORY_SLUG = 'hanh-dong';

document.addEventListener('DOMContentLoaded', function () {
    loadActionMovies();
});

// Load action movies from API
async function loadActionMovies() {
    const moviesGrid = document.getElementById('moviesGrid');

    // Show loading
    moviesGrid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p class="text-gray-400 mt-4">Đang tải phim hành động...</p>
        </div>
    `;

    try {
        console.log('Loading action movies, page:', currentPage);

        // Load movies from category "hanh-dong"
        const data = await movieAPI.getMoviesFromMultipleSources(currentPage, CATEGORY_SLUG);
        console.log('Action movies data:', data);

        if (data && (data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
            const movies = data.data.items;
            console.log('Movies found:', movies.length);

            if (movies.length > 0) {
                renderMoviesGrid(movies);
                renderPagination(data.data);
            } else {
                showNoMovies();
            }
        } else {
            console.error('Invalid data structure:', data);
            showNoMovies();
        }
    } catch (error) {
        console.error('Error loading action movies:', error);
        moviesGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <span class="material-icons-round text-6xl text-red-400 mb-4">error_outline</span>
                <p class="text-red-400">Đã xảy ra lỗi khi tải phim</p>
            </div>
        `;
    }
}

// Render movies grid with special layout (landscape + portrait overlay)
function renderMoviesGrid(movies) {
    const moviesGrid = document.getElementById('moviesGrid');

    moviesGrid.innerHTML = movies.map(movie => {
        // Get backdrop image (landscape) - use thumb_url or poster_url
        const backdropUrl = movieAPI.getImageURL(movie.thumb_url || movie.poster_url);
        const posterUrl = movieAPI.getImageURL(movie.poster_url || movie.thumb_url);
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

        return `
            <div class="group relative flex flex-col ${hiddenUI.containerClass}">
                <!-- Landscape backdrop image -->
                <div class="relative w-full aspect-video rounded-lg overflow-hidden mb-12 shadow-lg">
                    <a href="movie-detail.html?slug=${movie.slug}">
                        <img alt="${movie.name}" 
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${hiddenUI.imgClass}"
                            src="${backdropUrl}"
                            data-tmdb-slug="${movie.slug}"
                            data-tmdb-id="${movie.tmdb?.id || ''}"
                            data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                            data-tmdb-year="${movie.year || ''}"
                            data-tmdb-type="backdrop"
                            loading="lazy"
                            onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null" />
                    </a>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80"></div>
                    
                    ${hiddenUI.badge}
                    
                    <!-- Tags -->
                    <div class="absolute bottom-3 right-3 flex gap-2">
                        ${movie.quality && !hiddenUI.badge ? `
                        <span class="bg-gray-600/90 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                            ${movie.quality}
                        </span>` : ''}
                        ${movie.lang ? `
                        <span class="bg-primary text-black text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                            ${movie.lang}
                        </span>` : ''}
                    </div>
                </div>

                <!-- Portrait poster overlay -->
                <a href="movie-detail.html?slug=${movie.slug}"
                    class="absolute top-[40%] left-4 w-24 md:w-28 aspect-[2/3] rounded-md overflow-hidden shadow-2xl border border-gray-700/50 z-10 transition-transform duration-300 group-hover:-translate-y-2">
                    <img alt="Poster ${movie.name}" 
                        class="w-full h-full object-cover ${hiddenUI.imgClass}"
                        src="${posterUrl}"
                        data-tmdb-slug="${movie.slug}"
                        data-tmdb-id="${movie.tmdb?.id || ''}"
                        data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                        data-tmdb-year="${movie.year || ''}"
                        data-tmdb-type="poster"
                        loading="lazy"
                        onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null" />
                </a>

                <!-- Movie info -->
                <div class="pl-4 mt-2">
                    <a href="movie-detail.html?slug=${movie.slug}">
                        <h3 class="text-base font-bold text-white leading-tight truncate mt-1 group-hover:text-primary transition-colors">
                            ${movie.name}
                        </h3>
                    </a>
                    <p class="text-xs text-gray-400 mt-1 truncate">
                        ${movie.origin_name || movie.name}
                    </p>
                    <div class="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>${movie.year || 'N/A'}</span>
                        ${movie.episode_current ? `
                        <span class="w-1 h-1 bg-gray-500 rounded-full"></span>
                        <span>${movie.episode_current}</span>
                        ` : ''}
                        ${movie.tmdb?.vote_average ? `
                        <span class="w-1 h-1 bg-gray-500 rounded-full"></span>
                        <span class="flex items-center gap-1 text-yellow-500 font-bold">
                            <span class="material-icons-round text-[10px]">star</span>
                            ${movie.tmdb.vote_average.toFixed(1)}
                        </span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Show no movies message
function showNoMovies() {
    const moviesGrid = document.getElementById('moviesGrid');
    moviesGrid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <span class="material-icons-round text-6xl text-gray-600 mb-4">movie_filter</span>
            <p class="text-gray-400 text-lg">Không tìm thấy phim hành động</p>
        </div>
    `;
}

// Render pagination
function renderPagination(params) {
    const pagination = document.getElementById('pagination');

    const totalItems = params.pagination?.totalItems || params.params?.pagination?.totalItems || 0;
    const totalItemsPerPage = params.pagination?.totalItemsPerPage || params.params?.pagination?.totalItemsPerPage || 24;
    const currentPageNum = params.pagination?.currentPage || params.params?.pagination?.currentPage || currentPage;
    const totalPages = params.pagination?.totalPages || params.params?.pagination?.totalPages || Math.ceil(totalItems / totalItemsPerPage);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="flex items-center gap-2">';

    // Previous button
    if (currentPageNum > 1) {
        paginationHTML += `
            <button onclick="goToPage(${currentPageNum - 1})" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all">
                <span class="material-icons-round text-sm">chevron_left</span>
            </button>
        `;
    }

    // Page numbers
    const maxPages = 5;
    let startPage = Math.max(1, currentPageNum - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <button onclick="goToPage(1)" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (Number(i) === Number(currentPageNum)) {
            paginationHTML += `
                <button class="px-3 py-2 bg-primary text-black font-bold rounded-lg">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button onclick="goToPage(${i})" 
                    class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all">
                    ${i}
                </button>
            `;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="text-gray-400">...</span>`;
        }
        paginationHTML += `
            <button onclick="goToPage(${totalPages})" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all">
                ${totalPages}
            </button>
        `;
    }

    // Next button
    if (currentPageNum < totalPages) {
        paginationHTML += `
            <button onclick="goToPage(${currentPageNum + 1})" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all">
                <span class="material-icons-round text-sm">chevron_right</span>
            </button>
        `;
    }

    paginationHTML += '</div>';
    pagination.innerHTML = paginationHTML;
}

// Go to page
window.goToPage = function (page) {
    currentPage = page;
    loadActionMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
