// Categories Page Script

let currentCategory = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 40; // 8 columns x 5 rows

document.addEventListener('DOMContentLoaded', async function () {
    // Check if we have a category parameter
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    if (category) {
        // Load movies for this category
        currentCategory = category;
        await loadCategoryMovies(category, 1);
    } else {
        // Show all categories
        await loadAllCategories();
    }
});

// Load all categories from API
async function loadAllCategories() {
    const container = document.getElementById('categoriesGrid');
    const loading = document.getElementById('loading');
    const moviesSection = document.getElementById('moviesSection');

    if (!container) {
        console.error('Categories grid not found');
        return;
    }

    // Show categories grid, hide movies section
    container.classList.remove('hidden');
    moviesSection.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        const categories = await movieAPI.getCategories();

        loading.classList.add('hidden');

        if (categories && categories.length > 0) {
            renderCategories(categories);
        } else {
            container.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <p class="text-gray-400">Không thể tải danh sách thể loại</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        loading.classList.add('hidden');
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <p class="text-red-400">Đã xảy ra lỗi khi tải thể loại</p>
            </div>
        `;
    }
}

// Load movies for a specific category
async function loadCategoryMovies(categorySlug, page = 1) {
    const moviesSection = document.getElementById('moviesSection');
    const categoriesGrid = document.getElementById('categoriesGrid');
    const loading = document.getElementById('loading');
    const moviesGrid = document.getElementById('moviesGrid');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    // Show movies section, hide categories grid
    moviesSection.classList.remove('hidden');
    categoriesGrid.classList.add('hidden');
    loading.classList.remove('hidden');

    currentCategory = categorySlug;
    currentPage = page;

    try {
        // Get category info
        const categories = await movieAPI.getCategories();
        const category = categories.find(c => c.slug === categorySlug);

        if (category) {
            pageTitle.textContent = category.name;
            pageSubtitle.textContent = `Khám phá ${category.name} hay nhất`;
        }

        // Fetch movies
        const response = await movieAPI.fetchWithFallback(`/the-loai/${categorySlug}?page=${page}`);
        const data = await response.json();

        loading.classList.add('hidden');

        if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data.items) {
            renderMovies(data.data.items);
            renderPagination(data.data.params.pagination);
        } else {
            moviesGrid.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <p class="text-gray-400">Không tìm thấy phim nào</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading category movies:', error);
        loading.classList.add('hidden');
        moviesGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <p class="text-red-400">Đã xảy ra lỗi khi tải phim</p>
            </div>
        `;
    }
}

// Render movies grid (8 columns)
function renderMovies(movies) {
    const moviesGrid = document.getElementById('moviesGrid');

    const html = movies.map(movie => {
        const rawImg = movie.poster_url || movie.thumb_url || '';
        const posterUrl = (typeof imageOptimizer !== 'undefined' && rawImg)
            ? imageOptimizer.optimizeImageUrl(rawImg, 400, 80)
            : (rawImg.startsWith('http') ? rawImg : `https://phimimg.com/${rawImg}`);
        const quality = movie.quality || 'HD';
        const year = movie.year || '';
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

        return `
            <a href="movie-detail.html?slug=${movie.slug}" 
               class="group relative block rounded-lg overflow-hidden bg-surface-dark hover:scale-105 transition-transform duration-300 ${hiddenUI.containerClass}">
                <div class="relative aspect-[2/3]">
                    <img src="${posterUrl}" 
                         alt="${movie.name}"
                         class="w-full h-full object-cover ${hiddenUI.imgClass}"
                         data-tmdb-slug="${movie.slug}"
                         data-tmdb-id="${movie.tmdb?.id || ''}"
                         data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                         data-tmdb-year="${movie.year || ''}"
                         data-tmdb-type="poster"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    
                    ${hiddenUI.badge}
                    <!-- Quality Badge -->
                    ${!hiddenUI.badge ? `
                    <div class="absolute top-2 left-2 bg-primary text-black text-xs font-bold px-2 py-1 rounded">
                        ${quality}
                    </div>` : ''}
                    
                    <!-- Year Badge -->
                    ${year ? `<div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">${year}</div>` : ''}
                    
                    <!-- Play Overlay -->
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span class="material-icons-round text-primary text-5xl">play_circle</span>
                    </div>
                </div>
                
                <div class="p-3">
                    <h3 class="text-white font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        ${movie.name}
                    </h3>
                    <p class="text-gray-400 text-xs mt-1">${movie.origin_name || ''}</p>
                </div>
            </a>
        `;
    }).join('');

    moviesGrid.innerHTML = html;
}

// Render pagination
function renderPagination(pagination) {
    const paginationContainer = document.getElementById('pagination');

    if (!pagination || pagination.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    let html = '<div class="flex items-center justify-center gap-2 flex-wrap">';

    // Previous button
    html += `
        <button onclick="goToPage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}
                class="px-4 py-2 rounded-lg bg-surface-dark text-white hover:bg-primary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-icons-round text-sm">chevron_left</span>
        </button>
    `;

    // Page numbers
    const maxVisible = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // First page
    if (startPage > 1) {
        html += `<button onclick="goToPage(1)" class="px-4 py-2 rounded-lg bg-surface-dark text-white hover:bg-primary hover:text-black transition-colors">1</button>`;
        if (startPage > 2) {
            html += `<span class="text-gray-400">...</span>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isActive = Number(i) === Number(currentPage);
        html += `
            <button onclick="goToPage(${i})" 
                    class="px-4 py-2 rounded-lg ${isActive ? 'bg-primary text-black font-bold' : 'bg-surface-dark text-white hover:bg-primary hover:text-black'} transition-colors">
                ${i}
            </button>
        `;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="text-gray-400">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})" class="px-4 py-2 rounded-lg bg-surface-dark text-white hover:bg-primary hover:text-black transition-colors">${totalPages}</button>`;
    }

    // Next button
    html += `
        <button onclick="goToPage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}
                class="px-4 py-2 rounded-lg bg-surface-dark text-white hover:bg-primary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-icons-round text-sm">chevron_right</span>
        </button>
    `;

    html += '</div>';

    paginationContainer.innerHTML = html;
}

// Go to specific page
function goToPage(page) {
    if (!currentCategory || page < 1) return;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load movies for this page
    loadCategoryMovies(currentCategory, page);

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    window.history.pushState({}, '', url);
}

// Show all categories (back button)
function showAllCategories() {
    // Update URL
    window.history.pushState({}, '', 'categories.html');

    // Reset state
    currentCategory = null;
    currentPage = 1;

    // Update title
    document.getElementById('pageTitle').textContent = 'Thể Loại Phim';
    document.getElementById('pageSubtitle').textContent = 'Khám phá phim theo thể loại yêu thích của bạn';

    // Load categories
    loadAllCategories();
}

// Render categories grid
function renderCategories(categories) {
    const container = document.getElementById('categoriesGrid');

    // Category icons mapping
    const categoryIcons = {
        'hanh-dong': '💥',
        'tinh-cam': '❤️',
        'hai-huoc': '😂',
        'kinh-di': '👻',
        'phieu-luu': '🗺️',
        'khoa-hoc-vien-tuong': '🚀',
        'tam-ly': '🧠',
        'hinh-su': '🔍',
        'chien-tranh': '⚔️',
        'than-thoai': '🐉',
        'gia-dinh': '👨‍👩‍👧‍👦',
        'hoat-hinh': '🎨',
        'tai-lieu': '📚',
        'am-nhac': '🎵',
        'the-thao': '⚽',
        'vo-thuat': '🥋',
        'co-trang': '👑',
        'chinh-kich': '🎭',
        'bi-an': '🔮',
        'phim-18': '🔞'
    };

    const html = categories.map(category => {
        const icon = categoryIcons[category.slug] || '🎬';

        return `
            <a href="categories.html?category=${category.slug}"
                class="group relative block rounded-xl overflow-hidden bg-gradient-to-br from-surface-dark to-background-dark border border-white/10 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20">
                <div class="p-8 text-center">
                    <div class="text-6xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                        ${icon}
                    </div>
                    <h3 class="text-xl font-bold text-white group-hover:text-primary transition-colors">
                        ${category.name}
                    </h3>
                    <p class="text-sm text-gray-400 mt-2">Khám phá ngay</p>
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
        `;
    }).join('');

    container.innerHTML = html;
}

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering categories...');
    if (currentCategory) {
        loadCategoryMovies(currentCategory, currentPage);
    }
});
