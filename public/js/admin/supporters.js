// Admin Supporters Management
let currentPage = 1;
let currentStatus = '';
let editingId = null;

// Helper function to get admin token (supports both naming conventions)
function getAdminToken() {
    return localStorage.getItem('cinestream_admin_token') || localStorage.getItem('adminToken');
}

// Helper function to remove admin token
function removeAdminToken() {
    localStorage.removeItem('cinestream_admin_token');
    localStorage.removeItem('adminToken');
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== SUPPORTERS PAGE LOADED ===');
    console.log('Checking token...');

    // Small delay to ensure localStorage is ready
    setTimeout(() => {
        // Check auth first - if no token, redirect immediately
        if (!checkAuth()) {
            console.log('Auth failed, stopping execution');
            return; // Stop execution
        }

        console.log('Auth passed, loading data...');
        loadStatistics();
        loadSupporters();

        // Setup event listeners
        document.getElementById('status-filter').addEventListener('change', function () {
            currentStatus = this.value;
            currentPage = 1;
            loadSupporters();
        });

        document.getElementById('supporter-form').addEventListener('submit', handleSubmit);

        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (checkAuth()) {
                loadStatistics();
                loadSupporters();
            }
        }, 30000);
    }, 100);
});

// Check authentication
function checkAuth() {
    const token = getAdminToken();
    console.log('Checking auth, token exists:', !!token);

    if (!token) {
        console.log('No admin token found, redirecting to login...');
        window.location.href = '/admin/login.html';
        return false;
    }

    console.log('Token found, length:', token.length);
    return true;
}

// Load statistics
async function loadStatistics() {
    try {
        const token = getAdminToken();
        const response = await fetch(`${API_BASE_URL}/api/supporters/statistics`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            console.log('Unauthorized, redirecting to login...');
            removeAdminToken();
            window.location.href = '/admin/login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            const stats = data.statistics;
            document.getElementById('stat-total').textContent = stats.total || 0;
            document.getElementById('stat-verified').textContent = stats.verified || 0;
            document.getElementById('stat-pending').textContent = stats.pending || 0;
            document.getElementById('stat-amount').textContent = formatCurrency(stats.verifiedAmount || 0);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Don't show error on initial load
    }
}

// Load supporters
async function loadSupporters() {
    try {
        const token = getAdminToken();
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20
        });

        if (currentStatus) {
            params.append('status', currentStatus);
        }

        const response = await fetch(`${API_BASE_URL}/api/supporters?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            console.log('Unauthorized, redirecting to login...');
            removeAdminToken();
            window.location.href = '/admin/login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            displaySupporters(data.supporters);
            updatePagination(data.pagination);
        } else {
            console.error('API returned error:', data.message);
            displaySupporters([]);
        }
    } catch (error) {
        console.error('Error loading supporters:', error);
        // Show empty state instead of throwing error
        displaySupporters([]);
    }
}

// Display supporters
function displaySupporters(supporters) {
    const tbody = document.getElementById('supporters-table');

    if (!tbody) {
        console.error('Table body element not found!');
        return;
    }

    if (!supporters || supporters.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    Chưa có dữ liệu. Click "Thêm người ủng hộ" để bắt đầu.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = supporters.map(supporter => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${escapeHtml(supporter.name)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900">${formatCurrency(supporter.amount)}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-600 max-w-xs truncate">${escapeHtml(supporter.message || '-')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${getStatusBadge(supporter.status)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">${formatDate(supporter.createdAt)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex items-center gap-2">
                    <button onclick="editSupporter('${supporter._id}')" class="text-blue-600 hover:text-blue-800" title="Sửa">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="deleteSupporter('${supporter._id}')" class="text-red-600 hover:text-red-800" title="Xóa">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        pending: '<span class="status-badge status-pending">Chờ xác nhận</span>',
        verified: '<span class="status-badge status-verified">Đã xác nhận</span>',
        rejected: '<span class="status-badge status-rejected">Từ chối</span>'
    };
    return badges[status] || badges.pending;
}

// Update pagination
function updatePagination(pagination) {
    const from = (pagination.page - 1) * pagination.limit + 1;
    const to = Math.min(pagination.page * pagination.limit, pagination.total);

    document.getElementById('showing-from').textContent = from;
    document.getElementById('showing-to').textContent = to;
    document.getElementById('total-records').textContent = pagination.total;

    const buttonsContainer = document.getElementById('pagination-buttons');
    buttonsContainer.innerHTML = '';

    // Previous button
    if (pagination.page > 1) {
        const prevBtn = createPaginationButton('Trước', pagination.page - 1);
        buttonsContainer.appendChild(prevBtn);
    }

    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === 1 || i === pagination.pages || (i >= pagination.page - 1 && i <= pagination.page + 1)) {
            const pageBtn = createPaginationButton(i, i, i === pagination.page);
            buttonsContainer.appendChild(pageBtn);
        } else if (i === pagination.page - 2 || i === pagination.page + 2) {
            const dots = document.createElement('span');
            dots.className = 'px-3 py-2 text-gray-500';
            dots.textContent = '...';
            buttonsContainer.appendChild(dots);
        }
    }

    // Next button
    if (pagination.page < pagination.pages) {
        const nextBtn = createPaginationButton('Sau', pagination.page + 1);
        buttonsContainer.appendChild(nextBtn);
    }
}

// Create pagination button
function createPaginationButton(text, page, active = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.className = active
        ? 'px-4 py-2 bg-blue-600 text-white rounded-lg'
        : 'px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50';
    btn.onclick = () => {
        currentPage = page;
        loadSupporters();
    };
    return btn;
}

// Open add modal
function openAddModal() {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Thêm người ủng hộ';
    document.getElementById('supporter-form').reset();
    document.getElementById('supporter-id').value = '';
    document.getElementById('supporter-status').value = 'verified';
    document.getElementById('supporter-modal').classList.remove('hidden');
}

// Edit supporter
async function editSupporter(id) {
    try {
        const token = getAdminToken();
        const response = await fetch(`${API_BASE_URL}/api/supporters?page=1&limit=100`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        const supporter = data.supporters.find(s => s._id === id);

        if (supporter) {
            editingId = id;
            document.getElementById('modal-title').textContent = 'Sửa thông tin ủng hộ';
            document.getElementById('supporter-id').value = id;
            document.getElementById('supporter-name').value = supporter.name;
            document.getElementById('supporter-amount').value = supporter.amount;
            document.getElementById('supporter-message').value = supporter.message || '';
            document.getElementById('supporter-status').value = supporter.status;
            document.getElementById('supporter-notes').value = supporter.notes || '';
            document.getElementById('supporter-modal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading supporter:', error);
        showError('Không thể tải thông tin');
    }
}

// Delete supporter
async function deleteSupporter(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa người ủng hộ này?')) {
        return;
    }

    try {
        const token = getAdminToken();
        const response = await fetch(`${API_BASE_URL}/api/supporters/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Đã xóa người ủng hộ');
            loadStatistics();
            loadSupporters();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error deleting supporter:', error);
        showError('Không thể xóa người ủng hộ');
    }
}

// Handle form submit
async function handleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('supporter-id').value;
    const formData = {
        name: document.getElementById('supporter-name').value.trim(),
        amount: parseInt(document.getElementById('supporter-amount').value),
        message: document.getElementById('supporter-message').value.trim(),
        status: document.getElementById('supporter-status').value,
        notes: document.getElementById('supporter-notes').value.trim()
    };

    try {
        const token = getAdminToken();
        const url = id
            ? `${API_BASE_URL}/api/supporters/${id}`
            : `${API_BASE_URL}/api/supporters`;

        const response = await fetch(url, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(id ? 'Đã cập nhật thông tin' : 'Đã thêm người ủng hộ');
            closeModal();
            loadStatistics();
            loadSupporters();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error saving supporter:', error);
        showError('Không thể lưu thông tin');
    }
}

// Close modal
function closeModal() {
    document.getElementById('supporter-modal').classList.add('hidden');
    document.getElementById('supporter-form').reset();
    editingId = null;
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('Lỗi: ' + message);
}
