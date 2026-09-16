// Banner Management Script - MongoDB API Version

let loadedMovies = [];
let localCurrentPage = 1;
let localItemsPerPage = 10;
let localFilters = {
    search: '',
    status: ''
};
let allBanners = []; // Cache from API

function getValidImageUrl(url) {
    if (!url) return 'https://placehold.co/400x600?text=No+Image';
    if (url.startsWith('http')) {
        return url; // DO NOT REPLACE phimimg.com anymore
    }
    const imageBase = (window.API_CONFIG && window.API_CONFIG.IMAGE_BASE) ? window.API_CONFIG.IMAGE_BASE : 'https://phimimg.com/';
    const base = imageBase.endsWith('/') ? imageBase.slice(0, -1) : imageBase;
    return base + '/' + normalizeImagePath(url);
}

function normalizeImagePath(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (!url.startsWith('uploads/movies/')) {
        return 'uploads/movies/' + url.replace(new RegExp('^/'), '');
    }
    return url;
}

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    // Safely check auth early
    const backendToken = localStorage.getItem('cinestream_admin_token');
    if (!backendToken) {
        window.location.href = '/admin/login.html';
        return; // Prevent further execution
    }
    
    if (typeof adminAuthService !== 'undefined') {
        adminAuthService.checkAuth();
    }

    // Initial load from API
    fetchBannersFromAPI();
    setupLocalFilters();
    fetchThumbnailList();
});

function setupLocalFilters() {
    const searchInput = document.getElementById('localSearchInput');
    const statusFilter = document.getElementById('localStatusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            localFilters.search = e.target.value.trim().toLowerCase();
            localCurrentPage = 1;
            renderBanners();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            localFilters.status = e.target.value;
            localCurrentPage = 1;
            renderBanners();
        });
    }
}

// Fetch all banners from API
async function fetchBannersFromAPI() {
    const loading = document.getElementById('bannersLoading');
    const table = document.getElementById('bannersTable');
    
    if (loading) loading.classList.remove('hidden');
    if (table) table.classList.add('hidden');

    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();
        
        const response = await fetch(`${apiUrl}/api/banners`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401 || response.status === 403) {
            if (typeof adminAuthService !== 'undefined') {
                return adminAuthService.logout();
            }
            localStorage.removeItem('cinestream_admin_token');
            window.location.href = '/admin/login.html';
            return;
        }

        const data = await response.json();
        
        if (data.success) {
            allBanners = data.data || [];
            // Optional: save active banner to local storage for quick load on public site
            const activeBanner = allBanners.find(b => b.isActive);
            if (activeBanner) {
                localStorage.setItem('cinestream_active_banner', JSON.stringify(activeBanner));
            } else {
                localStorage.removeItem('cinestream_active_banner');
            }
            
            renderBanners();
            renderActiveBanner();
        } else {
            throw new Error(data.message || 'Không thể tải danh sách banner');
        }
    } catch (error) {
        console.error('Error fetching banners:', error);
        if (loading) {
            loading.innerHTML = '<div class="empty-state" style="padding:40px; text-align:center;"><i data-lucide="alert-circle" style="width:3rem; height:3rem; color:var(--danger); margin-bottom:12px;"></i><h3 style="color:var(--text-primary);">Không thể tải danh sách banner</h3></div>';
        }
    }
}

// Render banners from cached API data
function renderBanners() {
    const loading = document.getElementById('bannersLoading');
    const table = document.getElementById('bannersTable');
    const tbody = document.getElementById('bannersTableBody');

    if (!tbody) return;

    let filteredBanners = [...allBanners];

    // Apply filters
    if (localFilters.search) {
        filteredBanners = filteredBanners.filter(b => 
            (b.name && b.name.toLowerCase().includes(localFilters.search)) || 
            (b.originName && b.originName.toLowerCase().includes(localFilters.search))
        );
    }
    if (localFilters.status) {
        filteredBanners = filteredBanners.filter(b => 
            localFilters.status === 'active' ? b.isActive : !b.isActive
        );
    }

    if (loading) loading.classList.add('hidden');
    if (table) table.classList.remove('hidden');

    if (filteredBanners.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:40px; text-align:center;"><i data-lucide="image-off" style="width: 3rem; height: 3rem; color:var(--text-muted); margin-bottom:12px;"></i><h3 style="color:var(--text-primary);">Không tìm thấy banner nào</h3><p style="color:var(--text-muted);">Thử thay đổi bộ lọc hoặc thêm banner mới.</p></div></td></tr>`;
        updatePagInfo(0, 0, 0);
        renderLocalPagination(0, 1);
        if (window.lucide) lucide.createIcons();
        return;
    }

    // Pagination
    const totalItems = filteredBanners.length;
    const totalPages = Math.ceil(totalItems / localItemsPerPage);
    const start = (localCurrentPage - 1) * localItemsPerPage;
    const end = start + localItemsPerPage;
    const pageItems = filteredBanners.slice(start, end);

    tbody.innerHTML = pageItems.map(banner => `
        <tr class="hover:bg-white/5 transition-colors">
            <td>
                <img src="${getValidImageUrl(banner.thumbUrl)}"
                     alt="${banner.name}"
                     class="banner-thumb"
                     onerror="this.src='https://placehold.co/80x120?text=No+Image'">
            </td>
            <td>
                <div class="movie-title" style="font-size:13.5px;font-weight:600; color:var(--text-primary);">${banner.name}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${banner.originName || ''}</div>
            </td>
            <td style="color:var(--text-secondary);font-size:13px">${banner.year || 'N/A'}</td>
            <td>
                ${banner.isActive
                    ? '<span class="badge badge-success">Đang hiển thị</span>'
                    : '<span class="badge badge-gray">Ẩn</span>'
                }
            </td>
            <td style="color:var(--text-secondary);font-size:13px">
               <div class="flex items-center gap-2">
                   <i data-lucide="layers" style="width:14px; height:14px; color:var(--primary);"></i>
                   ${banner.priority || 0}
               </div>
            </td>
            <td style="text-align:right">
                <div class="flex items-center justify-end gap-2">
                    ${!banner.isActive
                        ? `<button onclick="activateBanner('${banner._id}')" class="btn btn-success btn-sm"><i data-lucide="play-circle"></i> Kích hoạt</button>`
                        : `<button onclick="deactivateBanner('${banner._id}')" class="btn btn-secondary btn-sm"><i data-lucide="pause-circle"></i> Tắt</button>`
                    }
                    <button onclick="editBannerLogo('${banner._id}', '${banner.logoUrl || ''}')" class="btn btn-primary btn-sm btn-icon" title="Sửa Logo">
                        <i data-lucide="image"></i>
                    </button>
                    <button onclick="deleteBanner('${banner._id}')" class="btn btn-secondary btn-sm btn-icon hover:bg-danger hover:text-white" title="Xóa">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    updatePagInfo(start + 1, Math.min(end, totalItems), totalItems);
    renderLocalPagination(totalPages, localCurrentPage);
    if (window.lucide) lucide.createIcons();
}

function updatePagInfo(start, end, total) {
    const info = document.getElementById('localPagInfo');
    if (info) {
        if (total === 0) {
            info.textContent = 'Đang hiển thị 0 banner';
        } else {
            info.textContent = `Đang hiển thị ${start}-${end} trong tổng số ${total} banner`;
        }
    }
}

function renderLocalPagination(totalPages, currentPage) {
    const container = document.getElementById('localPagination');
    if (!container) return;

    if (totalPages <= 1) { 
        container.innerHTML = ''; 
        return; 
    }

    let html = '';
    
    html += `<button onclick="goToLocalPage(${currentPage - 1})" class="page-btn" ${currentPage === 1 ? 'disabled style="opacity:0.5; cursor:default;"' : ''}>
        <i data-lucide="chevron-left" style="width:16px; height:16px;"></i>
    </button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button onclick="goToLocalPage(${i})" class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="color:var(--text-muted); padding:0 4px;">...</span>`;
        }
    }

    html += `<button onclick="goToLocalPage(${currentPage + 1})" class="page-btn" ${currentPage === totalPages ? 'disabled style="opacity:0.5; cursor:default;"' : ''}>
        <i data-lucide="chevron-right" style="width:16px; height:16px;"></i>
    </button>`;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function goToLocalPage(page) {
    const totalPages = Math.ceil(allBanners.length / localItemsPerPage);
    if (page < 1 || page > totalPages) return;
    localCurrentPage = page;
    renderBanners();
}

// Load active banner from cached API data
function renderActiveBanner() {
    const content = document.getElementById('activeBannerContent');
    if (!content) return;

    const activeBanner = allBanners.find(b => b.isActive);

    if (activeBanner) {
        const cleanContent = activeBanner.content ? activeBanner.content.replace(/<[^>]*>/g, '') : 'Không có mô tả';
        content.innerHTML = `
            <div style="display:flex;gap:24px;align-items:flex-start">
                <img src="${getValidImageUrl(activeBanner.posterUrl)}"
                     alt="${activeBanner.name}"
                     class="banner-active-poster"
                     onerror="this.src='https://placehold.co/200x300?text=No+Image'">
                <div style="flex:1; min-width: 0;">
                    <h3 style="font-size:20px;font-weight:800;color:var(--text-primary);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${activeBanner.name}</h3>
                    <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${activeBanner.originName || activeBanner.origin_name || ''}</p>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">
                        <span class="badge badge-gray"><i data-lucide="calendar" style="width:14px; height:14px;"></i> ${activeBanner.year || 'N/A'}</span>
                        <span class="badge badge-primary"><i data-lucide="monitor" style="width:14px; height:14px;"></i> ${activeBanner.quality || 'HD'}</span>
                        <span class="badge badge-info"><i data-lucide="captions" style="width:14px; height:14px;"></i> ${activeBanner.lang || 'Vietsub'}</span>
                    </div>
                    <p style="font-size:13px;color:var(--text-secondary);line-height:1.7;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${cleanContent}</p>
                    <div style="margin-top: 16px;">
                        <button onclick="editBannerDesktopImage('${activeBanner._id}', '${activeBanner.thumbUrl || ''}')" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                            <i data-lucide="image" style="width: 16px; height: 16px;"></i> Nhập Link Ảnh Thủ Công
                        </button>
                    </div>
                </div>
            </div>
            <div id="activeBannerGallery" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
                <!-- Gallery images will be loaded here -->
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        
        // Load gallery automatically
        loadActiveBannerGallery(activeBanner);
    } else {
        content.innerHTML = '<div style="color:var(--text-muted);font-size:13.5px;padding:8px 0"><i data-lucide="alert-triangle"    style="vertical-align:middle;margin-right:6px;color:var(--warning)" style="width: 1em; height: 1em;"></i>Chưa có banner nào được kích hoạt. Hãy thêm phim và kích hoạt.</div>';
        if (window.lucide) lucide.createIcons();
    }
}

// Thêm event listener cho ô tìm kiếm và bộ lọc
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchBannerInput');
    const filterCategory = document.getElementById('filterCategory');

    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                loadMoviesFromOphim(e.target.value.trim(), 1);
            }, 600);
        });
    }

    if (filterCategory) {
        filterCategory.addEventListener('change', (e) => {
            if (searchInput) searchInput.value = ''; // Xoá search khi dùng filter
            currentOphimSearchKeyword = '';
            loadMoviesFromOphim('', 1);
        });
    }
});

function showLoadMoviesModal() {
    // Reset mode mặc định là thêm Banner lớn
    if (typeof thumbnailModalMode !== 'undefined' && !arguments.callee.caller?.name?.includes('Thumbnail')) {
        thumbnailModalMode = false; 
    }
    if (typeof categoryBgSelectionMode !== 'undefined' && !arguments.callee.caller?.name?.includes('CategoryBg')) {
        categoryBgSelectionMode = null;
    }
    
    const modal = document.getElementById('loadMoviesModal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    const searchInput = document.getElementById('searchBannerInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    if (document.getElementById('filterCategory')) {
        document.getElementById('filterCategory').value = 'danh-sach/phim-moi-cap-nhat';
    }
    loadMoviesFromOphim('', 1);
}

function closeLoadMoviesModal() {
    const modal = document.getElementById('loadMoviesModal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    const grid = document.getElementById('moviesGrid');
    const loading = document.getElementById('loadingMovies');
    if (grid)    grid.classList.add('hidden'), grid.style.display = 'none';
    if (loading) loading.classList.add('hidden'), loading.style.display = 'none';
    // Reset modal modes
    if (typeof thumbnailModalMode !== 'undefined') thumbnailModalMode = false;
    if (typeof categoryBgSelectionMode !== 'undefined') categoryBgSelectionMode = null;
}

let isModalFullScreen = false;

function toggleModalFullScreen() {
    const icon = document.querySelector('button[title="Phóng to/Thu nhỏ"] i');
    const modalWrapper = document.getElementById('loadMoviesModalContainer'); // Changed from loadMoviesModal
    isModalFullScreen = !isModalFullScreen;
    if (isModalFullScreen) {
        modalWrapper.style.height = '100vh';
        modalWrapper.style.width = '100vw';
        modalWrapper.style.maxWidth = '100vw';
        modalWrapper.style.borderRadius = '0';
        if (icon) icon.setAttribute('data-lucide', 'minimize');
    } else {
        modalWrapper.style.height = '85vh';
        modalWrapper.style.width = '';
        modalWrapper.style.maxWidth = '920px';
        modalWrapper.style.borderRadius = 'var(--radius-lg)';
        if (icon) icon.setAttribute('data-lucide', 'maximize');
    }
    if (window.lucide) lucide.createIcons();
}

let currentOphimSearchPage = 1;
let currentOphimSearchKeyword = '';
let currentOphimTotalPages = 1;

async function loadMoviesFromOphim(keyword = '', page = 1) {
    const loadingDiv = document.getElementById('loadingMovies');
    const loadingText = document.getElementById('loadingText');
    const grid = document.getElementById('moviesGrid');
    const gridTitle = document.getElementById('gridTitle');
    const resultCount = document.getElementById('resultCount');
    const filterCategory = document.getElementById('filterCategory');

    currentOphimSearchKeyword = keyword;
    currentOphimSearchPage = page;
    
    grid.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    loadingDiv.style.display = 'block';
    grid.style.display = 'none';
    
    const ophimBase = (window.API_CONFIG && window.API_CONFIG.OPHIM_URL) ? window.API_CONFIG.OPHIM_URL : 'https://phimapi.com/v1/api';
    const ophim17Base = (window.API_CONFIG && window.API_CONFIG.OPHIM17_URL) ? window.API_CONFIG.OPHIM17_URL : 'https://phimapi.com';
    let apiUrl = `${ophim17Base}/danh-sach/phim-moi-cap-nhat?page=${currentOphimSearchPage}`;
    
    if (currentOphimSearchKeyword !== '') {
        apiUrl = `${ophimBase}/tim-kiem?keyword=${encodeURIComponent(currentOphimSearchKeyword)}&limit=24&page=${currentOphimSearchPage}`;
        if (loadingText) loadingText.textContent = `Đang tìm "${currentOphimSearchKeyword}"...`;
        if (gridTitle) gridTitle.textContent = 'Kết quả tìm kiếm';
    } else {
        const filterVal = filterCategory ? filterCategory.value : 'danh-sach/phim-moi-cap-nhat';
        if (filterVal === 'danh-sach/phim-moi-cap-nhat') {
            apiUrl = `${ophim17Base}/${filterVal}?page=${currentOphimSearchPage}`;
        } else {
            apiUrl = `${ophimBase}/${filterVal}?page=${currentOphimSearchPage}`;
        }
        
        let filterName = filterCategory ? filterCategory.options[filterCategory.selectedIndex].text : 'Phim mới';
        if (loadingText) loadingText.textContent = `Đang tải ${filterName}...`;
        if (gridTitle) gridTitle.textContent = filterName;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        });

        const data = await response.json();

        if ((data && (data.status === 'success' || data.status === true || data.status)) && (data.data?.items || data.items)) {
            let newMovies = data.data?.items || data.items;
            
            // Add Domain to images
            const domainImage = data.pathImage || data.data?.APP_DOMAIN_CDN_IMAGE || (apiUrl.includes('phimapi') ? 'https://phimimg.com' : 'https://phimimg.com');
            newMovies = newMovies.map(item => {
                if (item.thumb_url && !item.thumb_url.startsWith('http')) item.thumb_url = `${domainImage}/${item.thumb_url.replace(/^\//, '')}`;
                if (item.poster_url && !item.poster_url.startsWith('http')) item.poster_url = `${domainImage}/${item.poster_url.replace(/^\//, '')}`;
                return item;
            });
            
            const pagination = data.data?.params?.pagination || data.data?.paginate || data.data?.pagination || data.pagination || {};
            const totalItems = pagination?.totalItems || pagination?.total_items || newMovies.length;
            const perPage = pagination?.totalItemsPerPage || 24;
            
            currentOphimTotalPages = pagination?.totalPages || pagination?.total_pages || Math.ceil(totalItems / perPage) || 1;
            
            loadedMovies = newMovies; 
            
            if (loadedMovies.length > 0) {
                displayMovies(loadedMovies);
                
                if (resultCount) {
                    resultCount.textContent = `Tổng ${totalItems.toLocaleString('vi-VN')} phim`;
                }
                
                renderModalPagination(currentOphimTotalPages, currentOphimSearchPage);

                loadingDiv.classList.add('hidden'); loadingDiv.style.display = 'none';
                grid.classList.remove('hidden'); grid.style.display = 'block';
            } else {
                throw new Error('Không tìm thấy phim nào phù hợp');
            }
        } else {
            throw new Error('Lỗi truy xuất API Ophim');
        }
    } catch (error) {
        console.error('Error fetching movies:', error);
        loadingDiv.classList.add('hidden'); loadingDiv.style.display = 'none';
        grid.classList.remove('hidden'); grid.style.display = 'block';
        document.getElementById('moviesGridContent').innerHTML = `
            <div class="empty-state" style="grid-column:1/-1; padding: 40px;">
                <i data-lucide="help-circle"    style="color:var(--text-muted)" style="width: 1em; height: 1em;"></i>
                <p>Không tìm thấy dữ liệu hoặc có lỗi xảy ra.</p>
            </div>
        `;
        if (resultCount) resultCount.textContent = "0";
        const pag = document.getElementById('modalPagination');
        if (pag) pag.innerHTML = '';
        if (window.lucide) lucide.createIcons();
    }
}

function renderModalPagination(totalPages, currentPage) {
    const container = document.getElementById('modalPagination');
    if (!container) return;

    if (totalPages <= 1) { 
        container.innerHTML = ''; 
        return; 
    }

    let html = '';
    const visiblePages = 5;

    if (currentPage > 1) {
        html += `<button onclick="loadMoviesFromOphim(currentOphimSearchKeyword, ${currentPage - 1})" class="page-btn">
            <i data-lucide="chevron-left" style="width:16px; height:16px;"></i>
        </button>`;
    }

    const start = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    const end = Math.min(totalPages, start + visiblePages - 1);

    if (start > 1) {
        html += `<button onclick="loadMoviesFromOphim(currentOphimSearchKeyword, 1)" class="page-btn">1</button>`;
        if (start > 2) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
    }

    for (let i = start; i <= end; i++) {
        if (i === currentPage) {
            html += `<button class="page-btn active">${i}</button>`;
        } else {
            html += `<button onclick="loadMoviesFromOphim(currentOphimSearchKeyword, ${i})" class="page-btn">${i}</button>`;
        }
    }

    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
        html += `<button onclick="loadMoviesFromOphim(currentOphimSearchKeyword, ${totalPages})" class="page-btn">${totalPages}</button>`;
    }

    if (currentPage < totalPages) {
        html += `<button onclick="loadMoviesFromOphim(currentOphimSearchKeyword, ${currentPage + 1})" class="page-btn">
            <i data-lucide="chevron-right" style="width:16px; height:16px;"></i>
        </button>`;
    }
    
    html += `<span style="margin-left: 12px; font-size: 13.5px; color: var(--text-muted); white-space:nowrap; display:flex; align-items:center;">Trang ${currentPage}/${totalPages}</span>`;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function displayMovies(movies) {
    const gridContent = document.getElementById('moviesGridContent');

    gridContent.innerHTML = movies.map(movie => {
        let actionButtons = '';
        if (typeof categoryBgSelectionMode !== 'undefined' && categoryBgSelectionMode) {
            actionButtons = `<button onclick='selectCategoryBgMovie(${JSON.stringify(movie).replace(/'/g, "&apos;")})' class="btn btn-primary btn-sm" style="flex:1;justify-content:center"><i data-lucide="image-plus"></i> Chọn làm nền</button>`;
        } else if (thumbnailModalMode) {
            actionButtons = `<button onclick='addMovieToThumbnail(${JSON.stringify(movie).replace(/'/g, "&apos;")})' class="btn btn-primary btn-sm" style="flex:1;justify-content:center"><i data-lucide="layout-list"></i> Thêm Thumbnail</button>`;
        } else {
            actionButtons = `
                <button onclick='addMovieToBanner(${JSON.stringify(movie).replace(/'/g, "&apos;")})' class="btn btn-primary btn-sm" style="flex:1;justify-content:center"><i data-lucide="plus-circle"></i> Thêm Banner</button>
                <button onclick='addMovieToThumbnail(${JSON.stringify(movie).replace(/'/g, "&apos;")})' class="btn btn-secondary btn-sm" style="flex:1;justify-content:center" title="Thêm vào Thumbnail"><i data-lucide="layout-list"></i> Thumbnail</button>
            `;
        }
        
        return `
        <div class="movie-pick-card">
            <img src="${getValidImageUrl(movie.thumb_url)}"
                 alt="${movie.name}"
                 class="movie-pick-thumb"
                 onerror="this.src='https://placehold.co/200x300?text=No+Image'">
            <div class="movie-pick-body">
                <div class="movie-pick-title">${movie.name}</div>
                <div class="movie-pick-meta">
                    <span>${movie.year || 'N/A'}</span>
                    <span class="badge badge-primary" style="padding:1px 6px;font-size:10px">${movie.quality || 'HD'}</span>
                </div>
                <div class="movie-pick-actions" style="display:flex;gap:6px;margin-top:auto">
                 ${actionButtons}
                </div>
            </div>
        </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

// Add movie to banner via API
async function addMovieToBanner(movie) {
    try {
        if (allBanners.find(b => b.movieSlug === movie.slug)) {
            alert('Phim này đã có trong danh sách banner!');
            return;
        }

        const logoUrl = prompt('Nhập link ảnh Logo tuỳ chọn (ví dụ link từ onflixcdn).\\nNếu không có, hãy để trống để hệ thống tự tìm trên TMDB:', '');
        if (logoUrl === null) return; // User cancelled prompt

        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();

        const payload = {
            movieSlug: movie.slug,
            name: movie.name,
            originName: movie.origin_name,
            thumbUrl: normalizeImagePath(movie.thumb_url),
            posterUrl: normalizeImagePath(movie.poster_url),
            content: movie.content,
            year: movie.year,
            quality: movie.quality,
            lang: movie.lang,
            episodeCurrent: movie.episode_current,
            category: movie.category,
            tmdb: movie.tmdb,
            imdb: movie.imdb,
            sourcePage: typeof currentOphimSearchPage !== 'undefined' ? currentOphimSearchPage : 1,
            priority: 0,
            logoUrl: logoUrl.trim()
        };

        const response = await fetch(`${apiUrl}/api/banners`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            alert('Đã thêm phim vào danh sách banner!');
            closeLoadMoviesModal();
            fetchBannersFromAPI(); // Refresh data
        } else {
            throw new Error(data.message || 'Lỗi thêm banner');
        }
    } catch (error) {
        console.error('Error adding banner:', error);
        alert('Không thể thêm banner: ' + error.message);
    }
}

// Activate banner via API
async function activateBanner(id) {
    if (!confirm('Kích hoạt banner này? Banner hiện tại sẽ bị tắt.')) return;

    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();

        const response = await fetch(`${apiUrl}/api/banners/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: true })
        });

        const data = await response.json();

        if (data.success) {
            alert('Đã kích hoạt banner!');
            fetchBannersFromAPI(); // Refresh
        } else {
            throw new Error(data.message || 'Lỗi cập nhật banner');
        }
    } catch (error) {
        console.error('Error activating banner:', error);
        alert('Không thể kích hoạt banner: ' + error.message);
    }
}

// Edit Custom Logo URL
async function editBannerLogo(id, currentLogo) {
    const newLogo = prompt('Nhập link ảnh Logo tuỳ chọn (để trống nếu muốn xoá và dùng tự động):', currentLogo || '');
    if (newLogo === null) return; // cancelled
    
    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();

        const response = await fetch(`${apiUrl}/api/banners/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ logoUrl: newLogo.trim() })
        });

        const data = await response.json();

        if (data.success) {
            alert('Đã cập nhật Logo thành công!');
            fetchBannersFromAPI(); // Refresh
        } else {
            throw new Error(data.message || 'Lỗi cập nhật Logo');
        }
    } catch (error) {
        console.error('Error updating banner logo:', error);
        alert('Không thể cập nhật Logo: ' + error.message);
    }
}

// Edit Desktop Image URL (Custom ThumbUrl)
async function editBannerDesktopImage(id, currentUrl) {
    const newUrl = prompt('Nhập link ảnh nền Desktop chất lượng cao (ưu tiên tỷ lệ 16:9, link từ Imgur, TMDB...):', currentUrl || '');
    if (newUrl === null) return; // cancelled
    
    await updateDesktopImage(id, newUrl.trim());
}

async function selectDesktopImage(id, url) {
    if (!confirm('Chọn ảnh này làm ảnh nền Desktop cho Banner?')) return;
    await updateDesktopImage(id, url);
}

async function updateDesktopImage(id, url) {
    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();

        const response = await fetch(`${apiUrl}/api/banners/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ thumbUrl: url })
        });

        const data = await response.json();

        if (data.success) {
            alert('Đã cập nhật ảnh nền Desktop thành công! Vui lòng tải lại trang Xem Phim để xem thay đổi.');
            fetchBannersFromAPI(); // Refresh
        } else {
            throw new Error(data.message || 'Lỗi cập nhật ảnh');
        }
    } catch (error) {
        console.error('Error updating desktop image:', error);
        alert('Không thể cập nhật ảnh: ' + error.message);
    }
}

async function loadActiveBannerGallery(activeBanner) {
    const slug = activeBanner?.movieSlug;
    const id = activeBanner?._id;
    const galleryContainer = document.getElementById('activeBannerGallery');
    if (!galleryContainer) return;
    
    galleryContainer.innerHTML = '<div class="p-2 flex items-center gap-2 text-muted text-sm"><div class="spinner animate-spin" style="width:14px;height:14px"></div> Đang tìm bộ sưu tập ảnh từ TMDB...</div>';

    try {
        let imagesList = [];
        let tmdbId = activeBanner?.tmdb?.id || null;
        let mediaType = activeBanner?.tmdb?.type || 'movie';

        // 1. Dùng tên phim (bỏ dấu) để search trên TMDB nếu không có id
        if (!tmdbId) {
            let bannerName = activeBanner?.movieName || slug.replace(/-/g, ' ');
            const searchRes = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(bannerName)}&language=vi-VN`);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const firstResult = searchData.results?.[0];
                if (firstResult) {
                    tmdbId = firstResult.id;
                    mediaType = firstResult.media_type || 'movie';
                }
            }
        }

        // 2. Nếu tìm thấy ID, get Images
        if (tmdbId) {
            const imgRes = await fetch(`/api/tmdb/${mediaType}/${tmdbId}/images`);
            if (imgRes.ok) {
                const imgData = await imgRes.json();
                // Gộp backdrops vào imagesList giả lập định dạng cũ
                if (imgData.backdrops && imgData.backdrops.length > 0) {
                    imagesList = imgData.backdrops.map(b => ({ ...b, type: 'backdrop' }));
                }
            }
        }
        
        const backdrops = imagesList.filter(img => img.type === 'backdrop' || img.aspect_ratio > 1);
        
        if (backdrops.length > 0) {
            galleryContainer.innerHTML = `
                <div style="margin-top: 8px;">
                    <h4 style="font-size: 13.5px; font-weight: 600; margin-bottom: 12px; color: var(--text-primary); display:flex; align-items:center; gap: 6px;">
                        <i data-lucide="image" style="width:16px; height:16px; color: var(--primary);"></i>
                        Hoặc click chọn nhanh ảnh nền (Backdrop) từ TMDB:
                    </h4>
                    <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: thin;" class="custom-scrollbar">
                        ${backdrops.map(img => `
                            <div style="flex-shrink: 0; width: 220px; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s;" 
                                 class="hover:border-primary hover:opacity-80"
                                 onclick="selectDesktopImage('${id}', 'https://image.tmdb.org/t/p/w1280${img.file_path}')">
                                <img src="https://image.tmdb.org/t/p/w500${img.file_path}" style="width: 100%; height: 100%; object-fit: cover;" title="Click để chọn ảnh này làm nền Desktop">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        } else {
            galleryContainer.innerHTML = `<p class="text-sm text-muted mt-2"><i data-lucide="info" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> Không tìm thấy bộ sưu tập ảnh nền ngang nào trên TMDB cho phim này.</p>`;
            if (window.lucide) lucide.createIcons();
        }
    } catch (err) {
        galleryContainer.innerHTML = `<p class="text-sm text-danger mt-2">Lỗi kết nối TMDB. Vui lòng nhập link thủ công.</p>`;
    }
}

// Deactivate banner via API
async function deactivateBanner(id) {
    if (!confirm('Tắt banner này?')) return;

    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();

        const response = await fetch(`${apiUrl}/api/banners/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: false })
        });

        const data = await response.json();

        if (data.success) {
            alert('Đã tắt banner!');
            fetchBannersFromAPI(); // Refresh
        } else {
            throw new Error(data.message || 'Lỗi cập nhật banner');
        }
    } catch (error) {
        console.error('Error deactivating banner:', error);
        alert('Không thể tắt banner: ' + error.message);
    }
}

// Delete banner via API
async function deleteBanner(id) {
    if (!confirm('Xóa banner này khỏi danh sách?')) return;

    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();

        const response = await fetch(`${apiUrl}/api/banners/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            alert('Đã xóa banner!');
            fetchBannersFromAPI(); // Refresh
        } else {
            throw new Error(data.message || 'Lỗi xóa banner');
        }
    } catch (error) {
        console.error('Error deleting banner:', error);
        alert('Không thể xóa banner: ' + error.message);
    }
}


// ═══════════════════════════════════════════════════════════════
// THUMBNAIL STRIP MANAGEMENT
// ═══════════════════════════════════════════════════════════════

let thumbnailList = []; // { movieSlug, name, originName, thumbUrl, year }
let thumbnailDirty = false; // true khi có thay đổi chưa lưu
let thumbnailModalMode = false; // true = modal đang ở mode "thêm thumbnail"

// ── Fetch & render thumbnail list ──────────────────────────────
async function fetchThumbnailList() {
    const grid = document.getElementById('thumbnailStripGrid');
    const loading = document.getElementById('thumbnailStripLoading');
    const empty = document.getElementById('thumbnailStripEmpty');

    if (loading) { loading.style.display = 'block'; }
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'none';

    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();
        const res = await fetch(`${apiUrl}/api/banners/thumbnails`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            thumbnailList = data.data.map(b => ({
                movieSlug: b.movieSlug,
                name: b.name,
                originName: b.originName,
                thumbUrl: b.thumbUrl,
                year: b.year
            }));
        } else {
            thumbnailList = [];
        }
    } catch (e) {
        console.warn('fetchThumbnailList error:', e);
        thumbnailList = [];
    }

    if (loading) loading.style.display = 'none';
    renderThumbnailGrid();
    thumbnailDirty = false;
    updateSaveBtn();
}

// ── Render grid ────────────────────────────────────────────────
function renderThumbnailGrid() {
    const grid = document.getElementById('thumbnailStripGrid');
    const empty = document.getElementById('thumbnailStripEmpty');
    const countEl = document.getElementById('thumbCount');

    if (!grid) return;

    const count = thumbnailList.length;
    if (countEl) countEl.textContent = `${count}/10 phim`;

    if (count === 0) {
        grid.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';
    grid.style.display = 'flex';

    grid.innerHTML = thumbnailList.map((item, idx) => `
        <div class="thumb-card" draggable="true"
             data-slug="${item.movieSlug}" data-idx="${idx}"
             ondragstart="onThumbDragStart(event)"
             ondragover="onThumbDragOver(event)"
             ondrop="onThumbDrop(event)"
             ondragend="onThumbDragEnd(event)">
            <span class="thumb-card-order">${idx + 1}</span>
            <button class="thumb-card-remove" onclick="removeFromThumbnail('${item.movieSlug}')" title="Xóa">✕</button>
            <img src="${getValidImageUrl(item.thumbUrl)}"
                 alt="${item.name}"
                 onerror="this.src='https://placehold.co/100x140?text=No+Img'">
            <div class="thumb-card-body">
                <div class="thumb-card-name" title="${item.name}">${item.name}</div>
                <div style="font-size:10px;color:var(--text-muted)">${item.year || ''}</div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

function updateSaveBtn() {
    const btn = document.getElementById('btnSaveThumb');
    if (btn) btn.style.display = thumbnailDirty ? 'inline-flex' : 'none';
}

// ── Remove from thumbnail ──────────────────────────────────────
function removeFromThumbnail(slug) {
    thumbnailList = thumbnailList.filter(t => t.movieSlug !== slug);
    thumbnailDirty = true;
    renderThumbnailGrid();
    updateSaveBtn();
    
    // Tự động lưu để đồng bộ
    saveThumbnailOrder();
}

// ── Save order to API ──────────────────────────────────────────
async function saveThumbnailOrder() {
    const btn = document.getElementById('btnSaveThumb');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Đang lưu...'; if (window.lucide) lucide.createIcons(); }

    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();
        
        const res = await fetch(`${apiUrl}/api/banners/thumbnails`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ movies: thumbnailList })
        });
        const data = await res.json();

        if (data.success) {
            thumbnailDirty = false;
            updateSaveBtn();
            // Toast
            showThumbToast('Đã lưu thứ tự thumbnail!', 'success');
        } else {
            showThumbToast(data.message || 'Lỗi lưu thumbnail', 'error');
        }
    } catch (e) {
        console.error('saveThumbnailOrder error:', e);
        showThumbToast('Không thể lưu thumbnail: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Lưu thứ tự'; if (window.lucide) lucide.createIcons(); }
    }
}



function showThumbToast(msg, type) {
    const existing = document.getElementById('thumbToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'thumbToast';
    toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99999;
        padding:12px 20px;border-radius:8px;font-size:13px;font-weight:600;
        color:#fff;background:${type==='success'?'var(--success)':'var(--danger)'};
        box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.3s;`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2500);
}

// ── Add to thumbnail from modal ────────────────────────────────
function showAddThumbnailModal() {
    thumbnailModalMode = true;
    showLoadMoviesModal();
}

function addMovieToThumbnail(movie) {
    if (thumbnailList.length >= 10) {
        showThumbToast('Đã đủ 10 phim thumbnail!', 'error');
        return;
    }
    if (thumbnailList.find(t => t.movieSlug === movie.slug)) {
        showThumbToast('Phim này đã có trong danh sách!', 'error');
        return;
    }
    thumbnailList.push({
        movieSlug: movie.slug,
        name: movie.name,
        originName: movie.origin_name,
        thumbUrl: normalizeImagePath(movie.thumb_url),
        posterUrl: normalizeImagePath(movie.poster_url),
        year: movie.year,
        tmdb: movie.tmdb || {}
    });
    thumbnailDirty = true;
    renderThumbnailGrid();
    updateSaveBtn();
    
    // Tự động lưu luôn để đồng bộ với cách hoạt động của Banner lớn
    saveThumbnailOrder();
    
    closeLoadMoviesModal();
    thumbnailModalMode = false;
    showThumbToast(`Đã thêm "${movie.name}" vào thumbnail!`, 'success');
}

// ── Drag-and-drop logic ────────────────────────────────────────
let dragSrcIdx = null;

function onThumbDragStart(e) {
    dragSrcIdx = parseInt(e.currentTarget.dataset.idx);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function onThumbDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.thumb-card').forEach(c => c.classList.remove('drag-over'));
    e.currentTarget.classList.add('drag-over');
}

function onThumbDrop(e) {
    e.preventDefault();
    const targetIdx = parseInt(e.currentTarget.dataset.idx);
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;

    const moved = thumbnailList.splice(dragSrcIdx, 1)[0];
    thumbnailList.splice(targetIdx, 0, moved);

    thumbnailDirty = true;
    renderThumbnailGrid();
    updateSaveBtn();
}

function onThumbDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.thumb-card').forEach(c => c.classList.remove('drag-over'));
    dragSrcIdx = null;
}

// ── Category Backgrounds ──────────────────────────────────────
let categoryBgSelectionMode = null;

function showCategoryBgModal(apiPath) {
    categoryBgSelectionMode = apiPath;
    showLoadMoviesModal();
    // Auto set the filter to the selected category and reload
    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
        // Try to find the exact option
        let optionExists = Array.from(filterSelect.options).some(opt => opt.value === apiPath);
        if (optionExists) {
            filterSelect.value = apiPath;
            loadMoviesFromOphim('', 1);
        } else {
            filterSelect.value = 'danh-sach/phim-moi-cap-nhat';
            // Even if we fallback, let's load what they actually requested
            loadMoviesFromOphim('', 1);
        }
    }
}

function selectCategoryBgMovie(movie) {
    if (!categoryBgSelectionMode) return;
    
    // Map apiPath to DOM element ID
    const pathMap = {
        "danh-sach/phim-bo": "bg_phim_bo",
        "danh-sach/phim-moi-cap-nhat": "bg_phim_moi",
        "the-loai/hanh-dong": "bg_hanh_dong",
        "the-loai/tinh-cam": "bg_tinh_cam",
        "the-loai/hai-huoc": "bg_hai_huoc",
        "danh-sach/hoat-hinh": "bg_hoat_hinh"
    };

    const inputId = pathMap[categoryBgSelectionMode];
    if (inputId) {
        const inputEl = document.getElementById(inputId);
        const imageUrl = movie.thumb_url.startsWith('http') ? movie.thumb_url : `https://phimimg.com/${movie.thumb_url.startsWith('uploads/') ? '' : 'uploads/movies/'}${movie.thumb_url}`;
        
        if (inputEl) {
            inputEl.value = imageUrl;
            previewCatBg(inputEl, `preview_${inputId}`, categoryBgSelectionMode);
            // Bỏ tự động lưu theo yêu cầu của giao diện, đợi admin click Lưu
        }
    }
    
    closeLoadMoviesModal();
    showThumbToast(`Đã chọn hình nền phim "${movie.name}"`, 'success');
}

function clearCategoryBg(key) {
    const inputEl = document.getElementById(`bg_${key}`);
    const apiPathMap = {
        'phim_bo': 'danh-sach/phim-bo',
        'phim_moi': 'danh-sach/phim-moi-cap-nhat',
        'hanh_dong': 'the-loai/hanh-dong',
        'tinh_cam': 'the-loai/tinh-cam',
        'hai_huoc': 'the-loai/hai-huoc',
        'hoat_hinh': 'danh-sach/hoat-hinh'
    };
    if (inputEl) {
        inputEl.value = '';
        previewCatBg(inputEl, `preview_bg_${key}`, apiPathMap[key]);
    }
}

async function previewCatBg(input, previewId, apiPath = null) {
    const img = document.getElementById(previewId);
    if (!img) return;

    const val = input ? input.value.trim() : '';
    if (val) {
        img.src = val;
    } else {
        // Fetch from OPhim to show what is currently active
        img.src = 'https://placehold.co/80x45?text=Loading';
        if (apiPath) {
            try {
                const response = await movieAPI.fetchWithFallback(`/${apiPath}?page=1&limit=1`, {
                    method: 'GET',
                    headers: { 'accept': 'application/json' }
                });
                const data = await response.json();
                if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items && data.data.items.length > 0) {
                    const thumbUrl = data.data.items[0].thumb_url;
                    img.src = thumbUrl.startsWith('http') ? thumbUrl : `https://phimimg.com/${thumbUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${thumbUrl}`;
                } else {
                    img.src = 'https://placehold.co/80x45?text=Auto';
                }
            } catch (e) {
                console.error('Failed to preview auto bg:', e);
                img.src = 'https://placehold.co/80x45?text=Auto';
            }
        } else {
            img.src = 'https://placehold.co/80x45?text=Auto';
        }
    }
}

async function loadCategoryBackgrounds() {
    try {
        const apiUrl = window.getBackendBaseURL();
        const res = await fetch(`${apiUrl}/api/settings/public`);
        const data = await res.json();
        if (data.success && data.data && data.data.content && data.data.content.categoryBackgrounds) {
            const bg = data.data.content.categoryBackgrounds;
            document.getElementById('bg_phim_bo').value = bg["danh-sach/phim-bo"] || '';
            document.getElementById('bg_phim_moi').value = bg["danh-sach/phim-moi-cap-nhat"] || '';
            document.getElementById('bg_hanh_dong').value = bg["the-loai/hanh-dong"] || '';
            document.getElementById('bg_tinh_cam').value = bg["the-loai/tinh-cam"] || '';
            document.getElementById('bg_hai_huoc').value = bg["the-loai/hai-huoc"] || '';
            document.getElementById('bg_hoat_hinh').value = bg["danh-sach/hoat-hinh"] || '';

            // trigger preview
            const categories = [
                { id: 'phim_bo', apiPath: 'danh-sach/phim-bo' },
                { id: 'phim_moi', apiPath: 'danh-sach/phim-moi-cap-nhat' },
                { id: 'hanh_dong', apiPath: 'the-loai/hanh-dong' },
                { id: 'tinh_cam', apiPath: 'the-loai/tinh-cam' },
                { id: 'hai_huoc', apiPath: 'the-loai/hai-huoc' },
                { id: 'hoat_hinh', apiPath: 'danh-sach/hoat-hinh' }
            ];
            categories.forEach(cat => {
                previewCatBg(document.getElementById(`bg_${cat.id}`), `preview_bg_${cat.id}`, cat.apiPath);
            });
        }
    } catch (e) {
        console.error('loadCategoryBackgrounds error:', e);
    }
}

async function saveCategoryBackgrounds() {
    const btn = document.getElementById('btnSaveCategoryBg');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Đang lưu...'; if (window.lucide) lucide.createIcons(); }

    const bg = {
        "danh-sach/phim-bo": document.getElementById('bg_phim_bo').value.trim(),
        "danh-sach/phim-moi-cap-nhat": document.getElementById('bg_phim_moi').value.trim(),
        "the-loai/hanh-dong": document.getElementById('bg_hanh_dong').value.trim(),
        "the-loai/tinh-cam": document.getElementById('bg_tinh_cam').value.trim(),
        "the-loai/hai-huoc": document.getElementById('bg_hai_huoc').value.trim(),
        "danh-sach/hoat-hinh": document.getElementById('bg_hoat_hinh').value.trim()
    };

    try {
        const token = localStorage.getItem('cinestream_admin_token');
        const apiUrl = window.getBackendBaseURL();
        
        const res = await fetch(`${apiUrl}/api/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: { categoryBackgrounds: bg } })
        });
        const data = await res.json();

        if (data.success) {
            showThumbToast('Đã lưu hình nền chuyên mục!', 'success');
        } else {
            showThumbToast(data.message || 'Lỗi lưu cài đặt', 'error');
        }
    } catch (e) {
        console.error('saveCategoryBackgrounds error:', e);
        showThumbToast('Không thể lưu cài đặt: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Lưu cài đặt'; if (window.lucide) lucide.createIcons(); }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCategoryBackgrounds();
});

