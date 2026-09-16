// Filter Page Script
const API_BASE = 'https://phimapi.com/v1/api';

// State
let currentPage = 1;
let currentFilters = {
    list: '',
    category: '',
    country: '',
    year: ''
};

// DOM Elements
const filterList = document.getElementById('filterList');
const filterCategory = document.getElementById('filterCategory');
const filterCountry = document.getElementById('filterCountry');
const filterYear = document.getElementById('filterYear');
const applyFilterBtn = document.getElementById('applyFilter');
const resetFilterBtn = document.getElementById('resetFilter');
const moviesGrid = document.getElementById('moviesGrid');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const resultsInfo = document.getElementById('resultsInfo');
const totalResults = document.getElementById('totalResults');
const currentFilter = document.getElementById('currentFilter');
const pagination = document.getElementById('pagination');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadFilterOptions();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    applyFilterBtn.addEventListener('click', applyFilters);
    resetFilterBtn.addEventListener('click', resetFilters);
}

// Load Filter Options
async function loadFilterOptions() {
    try {
        // Load categories
        const categoriesData = await fetchAPI('/the-loai');
        console.log('Categories data:', categoriesData);

        if (categoriesData.status === 'success' && categoriesData.data) {
            const categories = Array.isArray(categoriesData.data)
                ? categoriesData.data
                : Object.values(categoriesData.data);

            console.log('Categories array:', categories);
            filterCategory.innerHTML = '<option value="">-- Chọn thể loại --</option>' +
                categories.map(cat => `<option value="${cat.slug}">${cat.name}</option>`).join('');
        }

        // Load countries
        const countriesData = await fetchAPI('/quoc-gia');
        console.log('Countries data:', countriesData);

        if (countriesData.status === 'success' && countriesData.data) {
            // API quốc gia trả về array trực tiếp trong data
            const countries = Array.isArray(countriesData.data)
                ? countriesData.data
                : (countriesData.data.items || Object.values(countriesData.data));

            console.log('Countries array:', countries);

            if (countries && countries.length > 0) {
                filterCountry.innerHTML = '<option value="">-- Chọn quốc gia --</option>' +
                    countries.map(country => `<option value="${country.slug}">${country.name}</option>`).join('');
            } else {
                console.error('No countries found in data');
            }
        }

        // Load years (from current year to 1990)
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 1990; year--) {
            years.push(year);
        }
        filterYear.innerHTML = '<option value="">-- Chọn năm --</option>' +
            years.map(year => `<option value="${year}">${year}</option>`).join('');

    } catch (err) {
        console.error('Error loading filter options:', err);
    }
}

// Fetch API
async function fetchAPI(endpoint, page = 1) {
    const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}`;
    console.log('Fetching:', url);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// Apply Filters
async function applyFilters() {
    // Get selected values
    currentFilters.list = filterList.value;
    currentFilters.category = filterCategory.value;
    currentFilters.country = filterCountry.value;
    currentFilters.year = filterYear.value;

    // Check if at least one filter is selected
    if (!currentFilters.list && !currentFilters.category && !currentFilters.country && !currentFilters.year) {
        showError('Vui lòng chọn ít nhất một bộ lọc');
        return;
    }

    currentPage = 1;
    await loadMovies();
}

// Reset Filters
function resetFilters() {
    filterList.value = '';
    filterCategory.value = '';
    filterCountry.value = '';
    filterYear.value = '';

    currentFilters = {
        list: '',
        category: '',
        country: '',
        year: ''
    };

    currentPage = 1;
    moviesGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    resultsInfo.classList.add('hidden');
    pagination.classList.add('hidden');
    error.classList.add('hidden');
}

// Load Movies
async function loadMovies() {
    try {
        showLoading();

        let endpoint = '';
        let filterText = '';

        // Priority: list > category > country > year
        if (currentFilters.list) {
            endpoint = `/danh-sach/${currentFilters.list}`;
            filterText = `từ danh sách "${filterList.options[filterList.selectedIndex].text}"`;
        } else if (currentFilters.category) {
            endpoint = `/the-loai/${currentFilters.category}`;
            filterText = `thể loại "${filterCategory.options[filterCategory.selectedIndex].text}"`;
        } else if (currentFilters.country) {
            endpoint = `/quoc-gia/${currentFilters.country}`;
            filterText = `quốc gia "${filterCountry.options[filterCountry.selectedIndex].text}"`;
        } else if (currentFilters.year) {
            endpoint = `/nam-phat-hanh/${currentFilters.year}`;
            filterText = `năm ${currentFilters.year}`;
        }

        const data = await fetchAPI(endpoint, currentPage);
        console.log('Movies data:', data);

        if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
            const movies = data.data.items;
            const paginationData = data.data.params?.pagination || {};

            if (movies.length === 0) {
                showError('Không tìm thấy phim nào');
                return;
            }

            renderMovies(movies);
            updateResultsInfo(paginationData.totalItems || movies.length, filterText);
            renderPagination(paginationData);
            hideLoading();
        } else {
            throw new Error('Invalid data format');
        }
    } catch (err) {
        console.error('Error loading movies:', err);
        showError('Không thể tải danh sách phim. Vui lòng thử lại.');
    }
}

// Render Movies
function renderMovies(movies) {
    moviesGrid.innerHTML = movies.map(movie => {
        const rawImg = movie.thumb_url || movie.poster_url || '';
        const posterUrl = (typeof imageOptimizer !== 'undefined' && rawImg)
            ? imageOptimizer.optimizeImageUrl(rawImg, 400, 80)
            : (rawImg.startsWith('http') ? rawImg : (rawImg ? `https://phimimg.com/${rawImg}` : 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'));
        const year = movie.year || 'N/A';
        const quality = movie.quality || movie.lang || '';
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

        return `
            <a href="movie-detail.html?slug=${movie.slug}" 
               class="group relative block rounded-xl overflow-hidden bg-surface-dark hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-primary/20 ${hiddenUI.containerClass}">
                <div class="aspect-[2/3] relative overflow-hidden">
                    <img src="${posterUrl}" 
                         alt="${movie.name}"
                         class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${hiddenUI.imgClass}"
                         data-tmdb-slug="${movie.slug}"
                         data-tmdb-id="${movie.tmdb?.id || ''}"
                         data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                         data-tmdb-year="${movie.year || ''}"
                         data-tmdb-type="poster"
                         onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    
                    ${hiddenUI.badge}
                    <!-- Quality Badge -->
                    ${quality ? `
                        <div class="absolute top-2 left-2 bg-primary text-black text-xs font-bold px-2 py-1 rounded">
                            ${quality}
                        </div>
                    ` : ''}
                    
                    <!-- Year Badge -->
                    <div class="absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                        ${year}
                    </div>
                    
                    <!-- Play Overlay -->
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span class="material-icons-round text-primary text-6xl">play_circle</span>
                    </div>
                </div>
                
                <div class="p-4">
                    <h3 class="font-bold text-white group-hover:text-primary transition-colors line-clamp-2 mb-1">
                        ${movie.name}
                    </h3>
                    <p class="text-sm text-gray-400 line-clamp-1">
                        ${movie.origin_name || ''}
                    </p>
                </div>
            </a>
        `;
    }).join('');
}

// Update Results Info
function updateResultsInfo(total, filterText) {
    totalResults.textContent = total;
    currentFilter.textContent = filterText;
    resultsInfo.classList.remove('hidden');
}

// Render Pagination
function renderPagination(paginationData) {
    const totalPages = paginationData.totalPages || 1;
    const currentPageNum = paginationData.currentPage || currentPage;

    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }

    let paginationHTML = '';

    // Previous button
    if (currentPageNum > 1) {
        paginationHTML += `
            <button onclick="goToPage(${currentPageNum - 1})" 
                    class="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-primary hover:text-black transition-colors">
                <span class="material-icons-round align-middle">chevron_left</span>
            </button>
        `;
    }

    // Page numbers
    const maxButtons = 5;
    let startPage = Math.max(1, currentPageNum - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        paginationHTML += `
            <button onclick="goToPage(1)" 
                    class="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-primary hover:text-black transition-colors">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="px-2 text-gray-400">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = Number(i) === Number(currentPageNum);
        paginationHTML += `
            <button onclick="goToPage(${i})" 
                    class="px-4 py-2 ${isActive ? 'bg-primary text-black' : 'bg-white/10 text-white hover:bg-primary hover:text-black'} rounded-lg transition-colors font-bold">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="px-2 text-gray-400">...</span>`;
        }
        paginationHTML += `
            <button onclick="goToPage(${totalPages})" 
                    class="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-primary hover:text-black transition-colors">
                ${totalPages}
            </button>
        `;
    }

    // Next button
    if (currentPageNum < totalPages) {
        paginationHTML += `
            <button onclick="goToPage(${currentPageNum + 1})" 
                    class="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-primary hover:text-black transition-colors">
                <span class="material-icons-round align-middle">chevron_right</span>
            </button>
        `;
    }

    pagination.innerHTML = paginationHTML;
    pagination.classList.remove('hidden');
}

// Go to Page
function goToPage(page) {
    currentPage = page;
    loadMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show Loading
function showLoading() {
    loading.classList.remove('hidden');
    moviesGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    error.classList.add('hidden');
    resultsInfo.classList.add('hidden');
    pagination.classList.add('hidden');
}

// Hide Loading
function hideLoading() {
    loading.classList.add('hidden');
}

// Show Error
function showError(message) {
    if (!document.getElementById('dotlottie-script')) {
        const script = document.createElement('script');
        script.id = 'dotlottie-script';
        script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
        script.type = "module";
        document.body.appendChild(script);
    }
    if (error) {
        error.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10">
                <dotlottie-wc src="/icons/404-cat.lottie" style="width: 240px; height: 240px; max-width: 100%; margin-bottom: -10px;" autoplay loop></dotlottie-wc>
                <p class="text-red-400 text-lg mt-2 font-medium">${message || 'Không tìm thấy kết quả nào'}</p>
            </div>
        `;
        error.classList.remove('hidden');
    }
    loading.classList.add('hidden');
    moviesGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    resultsInfo.classList.add('hidden');
    pagination.classList.add('hidden');
}

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering filter...');
    loadMovies();
});
