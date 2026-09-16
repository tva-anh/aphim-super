// Country Pagination Logic - Standalone
// No dependencies on config.js or api.js

let currentCountry = '';
let currentCountryName = '';
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let isLoading = false;

const skeletonGrid = document.getElementById('skeletonGrid');
const moviesGrid = document.getElementById('moviesGrid');
const moviesList = document.getElementById('moviesList');
const movieCount = document.getElementById('movieCount');
const countryTitle = document.getElementById('countryTitle');
const error = document.getElementById('error');

async function loadCountryMovies(countrySlug, countryName, page = 1) {
    if (isLoading) return;

    try {
        isLoading = true;
        currentCountry = countrySlug;
        currentCountryName = countryName;
        currentPage = page;

        // Show skeleton
        skeletonGrid.classList.remove('hidden');
        moviesGrid.classList.add('hidden');
        error.classList.add('hidden');

        console.log(`Loading ${countryName} movies - Page ${page}...`);

        const response = await movieAPI.fetchWithFallback(`/quoc-gia/${countrySlug}?page=${page}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawData = await response.json();
        const data = movieAPI.normalizeResponse(rawData);
        const items = data?.data?.items || [];
        console.log(`${countryName} movies data:`, data);

        if (items && items.length > 0) {
            const movies = items;
            const params = data.data?.params || {};
            const pagination = params.pagination || {};

            // Calculate pagination from API data
            const totalItemsFromAPI = pagination.totalItems || 0;
            const itemsPerPage = pagination.totalItemsPerPage || 24;

            // Calculate total pages
            if (totalItemsFromAPI > 0) {
                totalPages = Math.ceil(totalItemsFromAPI / itemsPerPage);
                totalItems = totalItemsFromAPI;
            } else {
                totalPages = 18; // Default estimate
                totalItems = movies.length * totalPages;
            }

            renderMovies(movies, countryName);
            showPagination();

            skeletonGrid.classList.add('hidden');
            moviesGrid.classList.remove('hidden');
        } else {
            throw new Error('Invalid data format');
        }
    } catch (err) {
        console.error('Error loading movies:', err);
        skeletonGrid.classList.add('hidden');
        error.classList.remove('hidden');
    } finally {
        isLoading = false;
    }
}

function renderMovies(movies, countryName) {
    countryTitle.textContent = `Phim ${countryName}`;
    movieCount.textContent = `${movies.length} phim (Trang ${currentPage}/${totalPages} - Tổng: ${totalItems.toLocaleString()} phim)`;

    const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');

    moviesList.innerHTML = movies.map(movie => {
        const hasCustomLink = !!movieLinks[movie.slug];
        const linkUrl = hasCustomLink ? `watch-simple.html?slug=${movie.slug}` : `movie-detail.html?slug=${movie.slug}`;
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };
        const rawImg = movie.poster_url || movie.thumb_url || '';
        const posterUrl = (typeof imageOptimizer !== 'undefined' && rawImg)
            ? imageOptimizer.optimizeImageUrl(rawImg, 400, 80)
            : (rawImg.startsWith('http') ? rawImg : `https://phimimg.com/${rawImg}`);

        return `
            <a href="${linkUrl}"
                class="group relative block rounded-xl overflow-hidden bg-surface-dark border border-white/5 hover:border-primary/50 transition-all duration-300 ${hiddenUI.containerClass}">
                <div class="aspect-[2/3] w-full overflow-hidden relative">
                    <img alt="${movie.name}"
                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${hiddenUI.imgClass}"
                        data-src="${posterUrl}"
                        data-tmdb-slug="${movie.slug}"
                        data-tmdb-id="${movie.tmdb?.id || ''}"
                        data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                        data-tmdb-year="${movie.year || ''}"
                        data-tmdb-type="poster"
                        loading="lazy"
                        src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E"
                        onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                    ${hiddenUI.badge}
                    ${!hiddenUI.badge ? `
                    <div class="absolute top-2 left-2 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded">
                        ${movie.quality || 'HD'}
                    </div>` : ''}
                    ${movie.episode_current ? `
                    <div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        ${movie.episode_current}
                    </div>` : ''}
                    ${hasCustomLink ? `
                    <div class="absolute bottom-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <span class="material-icons-round text-[10px]">check_circle</span> Có link
                    </div>` : ''}
                </div>
                <div class="p-4">
                    <h3 class="text-white font-semibold truncate group-hover:text-primary transition-colors">
                        ${movie.name}
                    </h3>
                    <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>${movie.year || 'N/A'}</span>
                        <span class="flex items-center gap-1 text-yellow-500 font-bold">
                            <span class="material-icons-round text-[10px]">star</span> 
                            ${movie.tmdb?.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

function showPagination() {
    let paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        paginationContainer.className = 'mt-12';
        moviesGrid.appendChild(paginationContainer);
    }

    let paginationHTML = `
        <div class="flex flex-col items-center gap-4">
            <div class="flex items-center justify-center gap-2 overflow-x-auto px-2 py-1">
    `;

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <button onclick="loadCountryMovies('${currentCountry}', '${currentCountryName}', ${currentPage - 1})" 
                class="px-4 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                <span class="material-icons-round text-sm">chevron_left</span>
            </button>
        `;
    }

    // First page
    if (currentPage > 3) {
        paginationHTML += `
            <button onclick="loadCountryMovies('${currentCountry}', '${currentCountryName}', 1)" 
                class="px-4 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                1
            </button>
        `;
        if (currentPage > 4) {
            paginationHTML += `<span class="text-gray-400 flex-shrink-0">...</span>`;
        }
    }

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <button class="px-4 py-2 bg-primary text-black font-bold rounded-lg flex-shrink-0 transition-all duration-300">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button onclick="loadCountryMovies('${currentCountry}', '${currentCountryName}', ${i})" 
                    class="px-4 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                    ${i}
                </button>
            `;
        }
    }

    // Last page
    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            paginationHTML += `<span class="text-gray-400 flex-shrink-0">...</span>`;
        }
        paginationHTML += `
            <button onclick="loadCountryMovies('${currentCountry}', '${currentCountryName}', ${totalPages})" 
                class="px-4 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                ${totalPages}
            </button>
        `;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <button onclick="loadCountryMovies('${currentCountry}', '${currentCountryName}', ${currentPage + 1})" 
                class="px-4 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                <span class="material-icons-round text-sm">chevron_right</span>
            </button>
        `;
    }

    paginationHTML += `
            </div>
            <div class="text-gray-400 text-sm text-center whitespace-nowrap">
                Trang ${currentPage}/${totalPages} | Tổng ${totalItems.toLocaleString()} phim
            </div>
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;

    // Update URL
    const newUrl = `${window.location.pathname}?country=${currentCountry}&page=${currentPage}`;
    window.history.pushState({}, '', newUrl);

    // Scroll to top
    if (currentPage > 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Auto load on page load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const countryParam = urlParams.get('country');
    const pageParam = parseInt(urlParams.get('page')) || 1;

    const countryNames = {
        'viet-nam': 'Việt Nam',
        'han-quoc': 'Hàn Quốc',
        'trung-quoc': 'Trung Quốc',
        'nhat-ban': 'Nhật Bản',
        'thai-lan': 'Thái Lan',
        'au-my': 'Âu Mỹ',
        'hong-kong': 'Hồng Kông',
        'dai-loan': 'Đài Loan',
        'an-do': 'Ấn Độ',
        'anh': 'Anh',
        'phap': 'Pháp',
        'canada': 'Canada'
    };

    if (countryParam && countryNames[countryParam]) {
        loadCountryMovies(countryParam, countryNames[countryParam], pageParam);
    } else {
        moviesGrid.classList.remove('hidden');
        countryTitle.textContent = 'Chọn quốc gia để xem phim';
        movieCount.textContent = 'Vui lòng chọn quốc gia từ menu "Phim" ở trên';
    }
});

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering countries...');
    if (currentCountry && currentCountryName) {
        loadCountryMovies(currentCountry, currentCountryName, currentPage);
    }
});
