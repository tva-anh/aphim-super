// Admin Movies Management
let currentPage = 1;
let moviesData = [];

document.addEventListener('DOMContentLoaded', function () {
    const backendToken = localStorage.getItem('cinestream_admin_token');
    const localToken = sessionStorage.getItem('cinestream_admin_token');
    if (!backendToken && !localToken) {
        window.location.href = '/admin/login.html';
        return;
    }

    loadMovies();
    setupSearch();
    setupFilters();
});

// Load movies from API
async function loadMovies(page = 1) {
    const container = document.getElementById('moviesTable');
    const pagination = document.getElementById('pagination');

    showLoading(container);

    try {
        // Load from ophim API
        const response = await fetch(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
        const data = await response.json();

        if (data && (data && (data.status === 'success' || data.status === true || data.status)) && data.data) {
            moviesData = data.data.items || [];
            currentPage = page;

            renderMoviesTable(moviesData);
            renderPagination(data.data.params);

            // Cache movies
            localStorage.setItem('cinestream_cached_movies', JSON.stringify(moviesData));
        } else {
            showError(container, 'Không thể tải danh sách phim');
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        showError(container, 'Đã xảy ra lỗi khi tải phim');
    }
}

// Render movies table
function renderMoviesTable(movies) {
    const container = document.getElementById('moviesTable');

    if (movies.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    Không có phim nào
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = movies.map((movie, index) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${(currentPage - 1) * 20 + index + 1}</span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <img src="https://phimimg.com/${movie.thumb_url}" 
                         alt="${movie.name}"
                         class="w-12 h-16 object-cover rounded"
                         onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null">
                    <div>
                        <p class="text-sm font-medium text-gray-900">${movie.name}</p>
                        <p class="text-xs text-gray-500">${movie.origin_name || ''}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${movie.year || 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${movie.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }">
                    ${movie.status === 'completed' ? 'Hoàn thành' : 'Đang cập nhật'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">${movie.episode_current || 'N/A'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-1">
                    <i data-lucide="star"   class="text-yellow-500 text-sm"  style="width: 1em; height: 1em;"></i>
                    <span class="text-sm text-gray-900">${movie.tmdb?.vote_average?.toFixed(1) || 'N/A'}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="viewMovie('${movie.slug}')" 
                        class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Xem chi tiết">
                        <i data-lucide="eye"   class="text-lg"  style="width: 1em; height: 1em;"></i>
                    </button>
                    <button onclick="editMovie('${movie.slug}')" 
                        class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Chỉnh sửa">
                        <i data-lucide="help-circle"   class="text-lg"  style="width: 1em; height: 1em;"></i>
                    </button>
                    <button onclick="deleteMovie('${movie.slug}')" 
                        class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa">
                        <i data-lucide="trash-2"   class="text-lg"  style="width: 1em; height: 1em;"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render pagination
function renderPagination(params) {
    const container = document.getElementById('pagination');
    if (!params || !params.pagination) return;

    const { currentPage, totalPages } = params.pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    if (currentPage > 1) {
        html += `
            <button onclick="loadMovies(${currentPage - 1})" 
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <i data-lucide="help-circle"   class="text-sm"  style="width: 1em; height: 1em;"></i>
            </button>
        `;
    }

    // Page numbers
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="loadMovies(${i})" 
                class="px-4 py-2 border ${i === currentPage ? 'bg-primary text-white border-primary' : 'border-gray-300 hover:bg-gray-50'} rounded-lg transition-colors">
                ${i}
            </button>
        `;
    }

    // Next button
    if (currentPage < totalPages) {
        html += `
            <button onclick="loadMovies(${currentPage + 1})" 
                class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <i data-lucide="help-circle"   class="text-sm"  style="width: 1em; height: 1em;"></i>
            </button>
        `;
    }

    container.innerHTML = html;
}

// Setup search
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const keyword = e.target.value.trim().toLowerCase();

        searchTimeout = setTimeout(() => {
            if (keyword) {
                const filtered = moviesData.filter(movie =>
                    movie.name.toLowerCase().includes(keyword) ||
                    movie.origin_name?.toLowerCase().includes(keyword)
                );
                renderMoviesTable(filtered);
            } else {
                renderMoviesTable(moviesData);
            }
        }, 300);
    });
}

// Setup filters
function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const yearFilter = document.getElementById('yearFilter');

    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    if (yearFilter) {
        yearFilter.addEventListener('change', applyFilters);
    }
}

// Apply filters
function applyFilters() {
    const status = document.getElementById('statusFilter')?.value;
    const year = document.getElementById('yearFilter')?.value;

    let filtered = [...moviesData];

    if (status) {
        filtered = filtered.filter(m => m.status === status);
    }

    if (year) {
        filtered = filtered.filter(m => m.year == year);
    }

    renderMoviesTable(filtered);
}

// View movie
window.viewMovie = function (slug) {
    window.open(`../movie-detail.html?slug=${slug}`, '_blank');
};

// Edit movie
window.editMovie = function (slug) {
    showEditModal(slug);
};

// Delete movie
window.deleteMovie = function (slug) {
    if (confirm('Bạn có chắc muốn xóa phim này?')) {
        // In real app, call API to delete
        showToast('Xóa phim thành công', 'success');
        loadMovies(currentPage);
    }
};

// Show add movie modal
window.showAddMovieModal = function () {
    const modal = document.getElementById('movieModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('modalTitle').textContent = 'Thêm phim mới';
        document.getElementById('movieForm').reset();
    }
};

// Show edit modal
function showEditModal(slug) {
    const movie = moviesData.find(m => m.slug === slug);
    if (!movie) return;

    const modal = document.getElementById('movieModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('modalTitle').textContent = 'Chỉnh sửa phim';

        // Fill form with movie data
        document.getElementById('movieName').value = movie.name;
        document.getElementById('movieOriginName').value = movie.origin_name || '';
        document.getElementById('movieYear').value = movie.year || '';
        document.getElementById('movieQuality').value = movie.quality || '';
        // ... fill other fields
    }
}

// Close modal
window.closeModal = function () {
    const modal = document.getElementById('movieModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

// Show loading
function showLoading(container) {
    container.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-12 text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p class="text-gray-500 mt-2">Đang tải...</p>
            </td>
        </tr>
    `;
}

// Show error
function showError(container, message) {
    container.innerHTML = `
        <tr>
            <td colspan="7" class="px-6 py-12 text-center">
                <i data-lucide="help-circle"   class="text-red-500 text-4xl"  style="width: 1em; height: 1em;"></i>
                <p class="text-red-500 mt-2">${message}</p>
            </td>
        </tr>
    `;
}

// Show toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-600' :
            type === 'error' ? 'bg-red-600' :
                'bg-blue-600'
        } text-white font-medium`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
