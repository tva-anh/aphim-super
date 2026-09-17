/**
 * A Phim - Admin Comments Management (MongoDB Backend)
 */

const API_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) 
    ? API_CONFIG.BACKEND_URL 
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://a-phim-production-eba6.up.railway.app/api');

let currentPage = 1;
let itemsPerPage = 20;
let allComments = [];
let selectedComments = [];

// Filters
let filters = {
    search: '',
    status: ''
};

document.addEventListener('DOMContentLoaded', function () {
    checkAdminAuth();
    setupEventListeners();
    loadComments();
});

function getAdminToken() {
    try {
        const token = sessionStorage.getItem('cinestream_admin_token') || localStorage.getItem('cinestream_admin_token');
        return token;
    } catch (e) {
        console.warn('Cannot access storage:', e);
        return null;
    }
}

function checkAdminAuth() {
    const token = getAdminToken();
    if (!token) {
        window.location.href = '/admin/login.html';
    }
}

function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i data-lucide="help-circle" style="width: 1em; height: 1em;"></i><span>${msg}</span>`;
    c.appendChild(t);
    if(window.lucide) lucide.createIcons();
    setTimeout(() => t.remove(), 3500);
}

function setupEventListeners() {
    document.getElementById('cmtSearch').addEventListener('input', e => {
        filters.search = e.target.value;
        currentPage = 1;
        // Debounce search
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(loadComments, 500);
    });

    document.getElementById('cmtStatus').addEventListener('change', e => {
        filters.status = e.target.value;
        currentPage = 1;
        loadComments();
    });

    // Select All
    const selectAllCmt = document.getElementById('selectAllCmt');
    if (selectAllCmt) {
        selectAllCmt.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.cmt-check');
            selectedComments = [];
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) selectedComments.push(cb.dataset.id);
            });
        });
    }
}

async function loadComments() {
    const tbody = document.getElementById('commentsBody');
    tbody.innerHTML = `<tr><td colspan="7"><div class="loading-spinner"><div class="spinner"></div><p>Đang tải bình luận...</p></div></td></tr>`;
    
    try {
        const token = getAdminToken();
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: itemsPerPage
        });
        
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.status) queryParams.append('status', filters.status);

        const response = await fetch(`${API_URL}/comments/admin?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login.html';
                return;
            }
            throw new Error('Failed to load comments');
        }

        const resData = await response.json();
        
        if (resData.success) {
            allComments = resData.data;
            updateStats(resData.stats);
            renderComments(allComments);
            renderPagination(resData.pagination);
            
            // Reset selection
            selectedComments = [];
            const selectAllCmt = document.getElementById('selectAllCmt');
            if (selectAllCmt) selectAllCmt.checked = false;
        }
    } catch (error) {
        console.error('Lỗi tải comment:', error);
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><h3>Lỗi tải dữ liệu</h3><p>${error.message}</p></div></td></tr>`;
    }
}

function updateStats(stats) {
    if (!stats) return;
    document.getElementById('totalComments').textContent = stats.total || 0;
    document.getElementById('approvedComments').textContent = stats.approved || 0;
    document.getElementById('pendingComments').textContent = stats.pending || 0;
    document.getElementById('spamComments').textContent = stats.hidden || 0;
}

function formatAdminComment(rawText) {
    if (!rawText) return '';
    let formatted = String(rawText);
    formatted = formatted.replace(/\[gif:(https?:\/\/[^\]\s]+)\]/gi, (match, url) => {
        return `<div style="margin-top: 6px; max-width: 180px; max-height: 120px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.25);"><img src="${url}" loading="lazy" style="max-width: 100%; max-height: 120px; object-fit: cover; display: block; cursor: pointer; border-radius: 7px;" alt="GIF" onclick="window.open('${url}', '_blank')"></div>`;
    });
    return formatted;
}

function renderComments(comments) {
    const tbody = document.getElementById('commentsBody');
    if (!comments || !comments.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i data-lucide="message-circle" style="width: 1em; height: 1em;"></i><h3>Không có bình luận</h3></div></td></tr>`;
        return;
    }

    tbody.innerHTML = comments.map(c => {
        const userName = c.user ? c.user.name : 'Unknown User';
        const userEmail = c.user ? c.user.email : '';
        const movieTitle = c.movie ? (c.movie.title || c.movie.name) : 
                           (c.movieName ? c.movieName : 
                           (c.movieSlug ? c.movieSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Movie'));
        
        const statusHtml = c.isApproved 
            ? '<span class="badge badge-success">Đã duyệt</span>' 
            : '<span class="badge badge-danger">Đã ẩn</span>';
            
        const timeStr = new Date(c.createdAt).toLocaleString('vi-VN');

        return `
        <tr>
            <td><input type="checkbox" class="cmt-check" data-id="${c._id}" onchange="toggleSelect('${c._id}')" style="accent-color: var(--primary);"></td>
            <td>
                <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary);">${userName}</div>
                ${userEmail ? `<div style="font-size: 11.5px; color: var(--text-muted);">${userEmail}</div>` : ''}
            </td>
            <td><div class="comment-content">${formatAdminComment(c.content)}</div></td>
            <td><a href="../watch.html?slug=${c.movieSlug}" target="_blank" class="movie-ref">${movieTitle}</a></td>
            <td><span style="font-size: 12px; color: var(--text-muted);">${timeStr}</span></td>
            <td>${statusHtml}</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center;">
                <button onclick="approveComment('${c._id}')" class="btn btn-success btn-icon btn-sm" title="Duyệt">
                    <i data-lucide="check" style="width: 1em; height: 1em;"></i>
                </button>
                <button onclick="hideComment('${c._id}')" class="btn btn-secondary btn-icon btn-sm" title="Ẩn">
                    <i data-lucide="eye-off" style="width: 1em; height: 1em;"></i>
                </button>
                <button onclick="deleteComment('${c._id}')" class="btn btn-danger btn-icon btn-sm" title="Xóa">
                    <i data-lucide="trash-2" style="width: 1em; height: 1em;"></i>
                </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    if(window.lucide) lucide.createIcons();
}

function toggleSelect(id) {
    const idx = selectedComments.indexOf(id);
    if (idx > -1) {
        selectedComments.splice(idx, 1);
    } else {
        selectedComments.push(id);
    }
}

function renderPagination(pagination) {
    const container = document.getElementById('cmtPagination');
    if (!container) return;
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    
    html += `<button class="btn btn-icon ${pagination.page === 1 ? 'disabled' : ''}" 
            onclick="changePage(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" style="width: 1em; height: 1em;"></i>
         </button>`;

    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.page - 1 && i <= pagination.page + 1)) {
            html += `<button class="btn ${i === pagination.page ? 'btn-primary' : 'btn-secondary'}" 
                    style="min-width: 36px;" onclick="changePage(${i})">${i}</button>`;
        } else if (i === pagination.page - 2 || i === pagination.page + 2) {
            html += `<span style="color: var(--text-muted);">...</span>`;
        }
    }

    html += `<button class="btn btn-icon ${pagination.page === pagination.totalPages ? 'disabled' : ''}" 
            onclick="changePage(${pagination.page + 1})" ${pagination.page === pagination.totalPages ? 'disabled' : ''}>
            <i data-lucide="chevron-right" style="width: 1em; height: 1em;"></i>
         </button>`;

    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
}

function changePage(page) {
    currentPage = page;
    loadComments();
}

// Actions
async function updateCommentStatus(id, isApproved) {
    try {
        const response = await fetch(`${API_URL}/comments/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isApproved })
        });
        
        if (response.ok) {
            showToast(isApproved ? 'Đã duyệt bình luận' : 'Đã ẩn bình luận', 'success');
            loadComments();
        } else {
            const err = await response.json();
            showToast(err.message || 'Có lỗi xảy ra', 'error');
        }
    } catch(err) {
        showToast('Lỗi mạng', 'error');
    }
}

window.approveComment = function(id) { updateCommentStatus(id, true); };
window.hideComment = function(id) { updateCommentStatus(id, false); };

window.deleteComment = async function(id) {
    if (!confirm('Xóa vĩnh viễn bình luận này?')) return;
    
    try {
        const response = await fetch(`${API_URL}/comments/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            }
        });
        
        if (response.ok) {
            showToast('Đã xóa bình luận', 'success');
            loadComments();
        } else {
            const err = await response.json();
            showToast(err.message || 'Có lỗi xảy ra', 'error');
        }
    } catch(err) {
        showToast('Lỗi mạng', 'error');
    }
};

window.bulkApprove = async function() {
    if (!selectedComments.length) return showToast('Vui lòng chọn bình luận', 'info');
    for (const id of selectedComments) {
        await updateCommentStatus(id, true);
    }
    selectedComments = [];
};

window.bulkHide = async function() {
    if (!selectedComments.length) return showToast('Vui lòng chọn bình luận', 'info');
    for (const id of selectedComments) {
        await updateCommentStatus(id, false);
    }
    selectedComments = [];
};

// Also expose loadComments for the refresh button
window.loadComments = loadComments;
