// Admin Utility Functions

// Show loading state
function showLoadingState() {
    const tbody = document.getElementById('usersTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-12 text-center">
                    <div class="flex flex-col items-center gap-3">
                        <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-gray-400">Đang tải dữ liệu từ database...</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Show modal
function showModal(html) {
    const modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.innerHTML = html;
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Close modal
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.remove();
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-yellow-600',
        info: 'bg-blue-600'
    };

    toast.className = `fixed top-4 right-4 z-[200] px-6 py-4 rounded-lg shadow-lg ${colors[type] || colors.info} text-white font-medium flex items-center gap-3 animate-slide-in`;
    toast.innerHTML = `
        <i data-lucide="${icons[type] || icons.info}"   class="-outlined"  style="width: 1em; height: 1em;"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Format datetime
function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format relative time
function formatRelativeTime(dateStr) {
    if (!dateStr) return 'N/A';

    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 30) return `${days} ngày trước`;
    if (months < 12) return `${months} tháng trước`;
    return `${years} năm trước`;
}

// Format currency
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Format number
function formatNumber(num) {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Confirm dialog
function confirmDialog(message, onConfirm, onCancel) {
    showModal(`
        <div class="bg-white dark:bg-surface-darker border border-gray-200 dark:border-white/10 rounded-2xl p-8 max-w-md w-full mx-4">
            <div class="flex items-center gap-4 mb-6">
                <div class="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
                    <i data-lucide="alert-triangle"   class="-outlined text-yellow-600 dark:text-yellow-500 text-2xl"  style="width: 1em; height: 1em;"></i>
                </div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Xác nhận</h2>
            </div>
            <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
            <div class="flex gap-3">
                <button onclick="closeModal(); ${onCancel ? onCancel.toString() + '()' : ''}" class="flex-1 py-2.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                    Hủy
                </button>
                <button onclick="closeModal(); ${onConfirm.toString()}()" class="flex-1 py-2.5 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                    Xác nhận
                </button>
            </div>
        </div>
    `);
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Đã sao chép vào clipboard', 'success');
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Không thể sao chép', 'error');
    }
}

// Download as JSON
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống file', 'success');
}

// Export to CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showToast('Không có dữ liệu để xuất', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Đã xuất file CSV', 'success');
}

// Check if user is admin
function isAdmin() {
    const token = localStorage.getItem('cinestream_admin_token') || sessionStorage.getItem('cinestream_admin_token');
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role === 'admin';
    } catch (e) {
        return false;
    }
}

// Logout
function logout() {
    confirmDialog('Bạn có chắc muốn đăng xuất?', () => {
        try { localStorage.removeItem('cinestream_admin_token'); } catch (e) { }
        try { sessionStorage.removeItem('cinestream_admin_token'); } catch (e) { }
        window.location.href = '/admin/quan-ly-secret-aphim-8899.html';
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slide-out {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
    
    .animate-slide-out {
        animation: slide-out 0.3s ease-in;
    }
`;
document.head.appendChild(style);
