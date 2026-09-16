// Search Page Script
let currentPage = 1;
let currentKeyword = '';
let currentFilters = {
    type: '',
    category: '',
    country: '',
    year: '',
    sort: 'latest'
};

document.addEventListener('DOMContentLoaded', function () {
    // Get search keyword from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentKeyword = urlParams.get('q') || '';

    // Get type and category from URL
    const type = urlParams.get('type');
    const category = urlParams.get('category');

    if (type) {
        currentFilters.type = type;
    }

    if (category) {
        currentFilters.category = category;
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput && currentKeyword) {
        searchInput.value = currentKeyword;
    }

    // Load categories and countries in parallel
    Promise.all([
        loadCategories(),
        loadCountries()
    ]).then(() => {
        console.log('✓ Categories and countries loaded');
    }).catch(err => {
        console.error('Error loading filters:', err);
    });

    setupSearch();
    setupFilters();
    performSearch();
});

// Setup search input
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }

    let searchTimeout;

    const handleSearchInput = (e) => {
        if (e && e.isComposing) return;
        clearTimeout(searchTimeout);
        currentKeyword = searchInput.value.trim();

        if (currentKeyword.length < 2) {
            if (currentKeyword.length === 0) {
                loadAllMovies();
            }
            return;
        }

        searchTimeout = setTimeout(() => {
            currentPage = 1;
            performSearch();
        }, 500);
    };

    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('compositionend', () => handleSearchInput());

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            currentPage = 1;
            performSearch();
        }
    });
}

// Setup filters - đọc từ hidden input của custom dropdown
function setupFilters() {
    var ids = {
        categoryFilter: 'category',
        countryFilter:  'country',
        yearFilter:     'year',
        sortFilter:     'sort'
    };
    Object.keys(ids).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function(e) {
                currentFilters[ids[id]] = e.target.value;
            });
        }
    });
}

// Load categories from API
async function loadCategories() {
    try {
        const categories = await movieAPI.getCategories();
        if (!categories || categories.length === 0) return;

        const csel = document.getElementById('csel-category');
        const categoryFilter = document.getElementById('categoryFilter');
        if (!csel) return;

        const list = csel.querySelector('.sp-csel-list');
        const val  = csel.querySelector('.sp-csel-val');

        // Build option divs
        let html = '<div class="sp-csel-opt selected" data-value="">Tất cả</div>';
        categories
            .filter(cat => cat && cat.slug && cat.name)
            .forEach(cat => {
                html += `<div class="sp-csel-opt" data-value="${cat.slug}">${cat.name}</div>`;
            });
        list.innerHTML = html;

        // Re-bind click events
        list.querySelectorAll('.sp-csel-opt').forEach(function(opt) {
            opt.addEventListener('click', function(e) {
                e.stopPropagation();
                categoryFilter.value = opt.dataset.value;
                val.textContent = opt.textContent;
                list.querySelectorAll('.sp-csel-opt').forEach(function(o){ o.classList.remove('selected'); });
                opt.classList.add('selected');
                csel.classList.remove('open');
                categoryFilter.dispatchEvent(new Event('change'));
            });
        });

        // Set selected from currentFilters
        if (currentFilters.category) {
            categoryFilter.value = currentFilters.category;
            list.querySelectorAll('.sp-csel-opt').forEach(function(opt) {
                if (opt.dataset.value === currentFilters.category) {
                    opt.classList.add('selected');
                    val.textContent = opt.textContent;
                }
            });
        }
        console.log(`Loaded ${categories.length} categories into custom dropdown`);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load countries from API
async function loadCountries() {
    try {
        const countries = await movieAPI.getCountries();
        if (!countries || countries.length === 0) return;

        const csel = document.getElementById('csel-country');
        const countryFilter = document.getElementById('countryFilter');
        if (!csel) return;

        const list = csel.querySelector('.sp-csel-list');
        const val  = csel.querySelector('.sp-csel-val');

        let html = '<div class="sp-csel-opt selected" data-value="">Tất cả</div>';
        countries
            .filter(c => c && c.slug && c.name)
            .forEach(c => {
                html += `<div class="sp-csel-opt" data-value="${c.slug}">${c.name}</div>`;
            });
        list.innerHTML = html;

        // Re-bind click events
        list.querySelectorAll('.sp-csel-opt').forEach(function(opt) {
            opt.addEventListener('click', function(e) {
                e.stopPropagation();
                countryFilter.value = opt.dataset.value;
                val.textContent = opt.textContent;
                list.querySelectorAll('.sp-csel-opt').forEach(function(o){ o.classList.remove('selected'); });
                opt.classList.add('selected');
                csel.classList.remove('open');
                countryFilter.dispatchEvent(new Event('change'));
            });
        });

        // Set selected from currentFilters
        if (currentFilters.country) {
            countryFilter.value = currentFilters.country;
            list.querySelectorAll('.sp-csel-opt').forEach(function(opt) {
                if (opt.dataset.value === currentFilters.country) {
                    opt.classList.add('selected');
                    val.textContent = opt.textContent;
                }
            });
        }
        console.log(`Loaded ${countries.length} countries into custom dropdown`);
    } catch (error) {
        console.error('Error loading countries:', error);
    }
}

// Apply filters
window.applyFilters = function () {
    currentPage = 1;
    performSearch();
};

// Reset filters
window.resetFilters = function () {
    currentFilters = { category: '', country: '', year: '', sort: 'latest', type: '' };

    // Reset hidden inputs
    ['categoryFilter','countryFilter','yearFilter'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
    });
    var sf = document.getElementById('sortFilter'); if (sf) sf.value = 'latest';

    // Reset custom dropdown display
    var resetMap = {
        'csel-category': 'Tất cả',
        'csel-country':  'Tất cả',
        'csel-year':     'Tất cả',
        'csel-sort':     'Mới nhất'
    };
    Object.keys(resetMap).forEach(function(id) {
        var csel = document.getElementById(id); if (!csel) return;
        var valEl = csel.querySelector('.sp-csel-val');
        if (valEl) valEl.textContent = resetMap[id];
        csel.querySelectorAll('.sp-csel-opt').forEach(function(opt) {
            opt.classList.toggle('selected', opt.dataset.value === '' || opt.dataset.value === 'latest');
        });
    });

    currentPage = 1;
    performSearch();
};

// ─── Fetch combined filters from ophim API ────────────────────────────────────
async function fetchWithCombinedFilters(page) {
    const { category, country, year, sort, type } = currentFilters;

    // Sort field mapping
    let sortField = 'modified.time';
    let sortType  = 'desc';
    if (sort === 'year')   { sortField = 'year';  sortType = 'desc'; }
    if (sort === 'views')  { sortField = 'view';  sortType = 'desc'; }
    // 'rating' and 'latest' handled client-side / default

    // Determine list type (phim-moi = default, phim-bo, phim-le)
    let listType = 'phim-moi';
    if (type === 'series') listType = 'phim-bo';
    else if (type === 'single') listType = 'phim-le';

    // Build URL with all combined params
    const params = new URLSearchParams({
        page:       page,
        limit:      24,
        sort_field: sortField,
        sort_type:  sortType
    });
    if (category) params.append('category', category);
    if (country)  params.append('country',  country);
    if (year)     params.append('year',     year);

    const endpoint = `/danh-sach/${listType}?${params.toString()}`;
    console.log('Combined filter endpoint:', endpoint);

    const response = await movieAPI.fetchWithFallback(endpoint, { headers: { 'accept': 'application/json' } });
    return response.json();
}

// ─── Build results title from active filters ──────────────────────────────────
function buildResultsTitle() {
    const { category, country, year, type } = currentFilters;
    if (!category && !country && !year && !type) return 'Khám phá - Tất cả phim';

    const parts = [];
    if (type === 'series') parts.push('Phim Bộ');
    else if (type === 'single') parts.push('Phim Lẻ');

    // Get display names from dropdowns
    function getLabel(cselId) {
        var csel = document.getElementById(cselId);
        if (!csel) return '';
        var sel = csel.querySelector('.sp-csel-opt.selected');
        return sel ? sel.textContent.trim() : '';
    }

    if (category) parts.push(getLabel('csel-category') || category);
    if (country)  parts.push(getLabel('csel-country')  || country);
    if (year)     parts.push(year);

    return parts.length ? parts.join(' · ') : 'Kết quả lọc';
}

// Perform search
async function performSearch() {
    const resultsGrid  = document.getElementById('resultsGrid');
    const resultsTitle = document.getElementById('resultsTitle');
    const resultsCount = document.getElementById('resultsCount');

    // Show loading
    resultsGrid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p class="text-gray-400 mt-4">Đang tìm kiếm...</p>
        </div>
    `;

    try {
        let data;

        if (currentKeyword) {
            // ── Tìm theo từ khoá ──────────────────────────────
            console.log('Searching with keyword:', currentKeyword);
            data = await movieAPI.searchMovies(currentKeyword, currentPage);
            resultsTitle.textContent = `Kết quả tìm kiếm: "${currentKeyword}"`;
        } else {
            // ── Kết hợp toàn bộ filter: category + country + year + sort ──
            data = await fetchWithCombinedFilters(currentPage);
            resultsTitle.textContent = buildResultsTitle();
        }

        console.log('Search data received:', data);

        if (data && (data && (data.status === 'success' || data.status === true || data.status)) && data.data) {
            let movies = data.data.items || [];
            console.log('Movies array:', movies.length, 'items');

            // Client-side sort by rating if needed (API doesn't support it)
            if (currentFilters.sort === 'rating') {
                movies.sort((a, b) => (b.tmdb?.vote_average || 0) - (a.tmdb?.vote_average || 0));
            }

            if (movies.length > 0) {
                renderResults(movies);
                resultsCount.textContent = `Trang ${currentPage}: ${movies.length} phim`;
                renderPagination(data.data);
            } else {
                console.warn('No movies after filtering');
                showNoResults();
            }
        } else {
            console.error('Invalid data structure:', data);
            showNoResults();
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <span class="material-icons-round text-6xl text-red-400 mb-4">error_outline</span>
                <p class="text-red-400">Đã xảy ra lỗi khi tìm kiếm</p>
            </div>
        `;
    }
}

// Load all movies
async function loadAllMovies() {
    currentKeyword = '';
    currentPage = 1;
    performSearch();
}

// Render results
function renderResults(movies) {
    const resultsGrid = document.getElementById('resultsGrid');

    resultsGrid.innerHTML = movies.map(movie => {
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

        const rawImg = movie.thumb_url || movie.poster_url || '';
        const posterUrl = (typeof imageOptimizer !== 'undefined' && rawImg)
            ? imageOptimizer.optimizeImageUrl(rawImg, 400, 80)
            : (rawImg.startsWith('http') ? rawImg : (rawImg ? `https://phimimg.com/${rawImg}` : 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'));

        return `
            <a href="movie-detail.html?slug=${movie.slug}"
                class="group relative block rounded-xl overflow-hidden bg-surface-dark border border-white/5 hover:border-primary/50 transition-all duration-300 ${hiddenUI.containerClass}">
                <div class="aspect-[2/3] w-full overflow-hidden relative">
                    <img alt="${movie.name}"
                        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${hiddenUI.imgClass}"
                        src="${posterUrl}"
                        data-tmdb-slug="${movie.slug}"
                        data-tmdb-id="${movie.tmdb?.id || ''}"
                        data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                        data-tmdb-year="${movie.year || ''}"
                        data-tmdb-type="poster"
                        loading="lazy"
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

// Show no results
function showNoResults() {
    const resultsGrid = document.getElementById('resultsGrid');
    const resultsCount = document.getElementById('resultsCount');

    resultsGrid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <span class="material-icons-round text-6xl text-gray-600 mb-4">search_off</span>
            <p class="text-gray-400 text-lg">Không tìm thấy kết quả phù hợp</p>
            <p class="text-gray-500 text-sm mt-2">Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc</p>
        </div>
    `;

    resultsCount.textContent = 'Không có kết quả';
}

// Render pagination
function renderPagination(params) {
    const pagination = document.getElementById('pagination');

    // Get pagination info from API response
    const totalItems = params.pagination?.totalItems || params.params?.pagination?.totalItems || 0;
    const totalItemsPerPage = params.pagination?.totalItemsPerPage || params.params?.pagination?.totalItemsPerPage || 24;
    const currentPageNum = params.pagination?.currentPage || params.params?.pagination?.currentPage || currentPage;
    const totalPages = params.pagination?.totalPages || params.params?.pagination?.totalPages || Math.ceil(totalItems / totalItemsPerPage);

    console.log('Pagination info:', { totalItems, totalItemsPerPage, currentPageNum, totalPages });

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = `
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-2 overflow-x-auto px-2 py-1">
    `;

    // Previous button
    if (currentPageNum > 1) {
        paginationHTML += `
            <button onclick="goToPage(${currentPageNum - 1})" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                <span class="material-icons-round text-sm">chevron_left</span>
            </button>
        `;
    }

    // Page numbers with smart display
    const maxPages = 5;
    let startPage = Math.max(1, currentPageNum - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }

    // Show first page if not in range
    if (startPage > 1) {
        paginationHTML += `
            <button onclick="goToPage(1)" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                1
            </button>
        `;
        if (startPage > 2) {
            paginationHTML += `<span class="text-gray-400 flex-shrink-0">...</span>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        if (Number(i) === Number(currentPageNum)) {
            paginationHTML += `
                <button class="px-3 py-2 bg-primary text-black font-bold rounded-lg flex-shrink-0 transition-all duration-300">
                    ${i}
                </button>
            `;
        } else {
            paginationHTML += `
                <button onclick="goToPage(${i})" 
                    class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                    ${i}
                </button>
            `;
        }
    }

    // Show last page if not in range
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="text-gray-400 flex-shrink-0">...</span>`;
        }
        paginationHTML += `
            <button onclick="goToPage(${totalPages})" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                ${totalPages}
            </button>
        `;
    }

    // Next button
    if (currentPageNum < totalPages) {
        paginationHTML += `
            <button onclick="goToPage(${currentPageNum + 1})" 
                class="px-3 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0">
                <span class="material-icons-round text-sm">chevron_right</span>
            </button>
        `;
    }

    paginationHTML += `
            </div>
            <div class="text-gray-400 text-sm whitespace-nowrap">
                Trang ${currentPageNum}/${totalPages} | Tổng ${totalItems.toLocaleString()} kết quả
            </div>
        </div>
    `;

    pagination.innerHTML = paginationHTML;
}

// Go to page
window.goToPage = function (page) {
    // Update UI immediately for smooth transition
    const pagination = document.getElementById('pagination');
    const allButtons = pagination.querySelectorAll('button');
    allButtons.forEach(btn => {
        const btnText = btn.textContent.trim();
        if (btnText === page.toString()) {
            // Highlight new page button
            btn.className = 'px-4 py-2 bg-primary text-black font-bold rounded-lg flex-shrink-0 transition-all duration-300';
        } else if (!btn.querySelector('.material-icons-round')) {
            // Reset other page buttons
            btn.className = 'px-4 py-2 bg-surface-dark text-white rounded-lg hover:bg-primary hover:text-black transition-all duration-300 flex-shrink-0';
        }
    });

    currentPage = page;
    performSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering search...');
    if (currentKeyword) {
        performSearch();
    }
});
