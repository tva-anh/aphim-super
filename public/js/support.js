// Support page functionality
let selectedAmount = 0;
const BANK_ID = '970422';
const ACCOUNT_NO = '048889019999';
const ACCOUNT_NAME = 'TRAN VAN ANH';

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    setupAmountButtons();
    setupFormHandlers();
    loadRecentSupporters();

    // Auto-refresh supporters every 60 seconds (avoid rate limit)
    setInterval(loadRecentSupporters, 60000);
});

// Setup amount buttons
function setupAmountButtons() {
    const amountButtons = document.querySelectorAll('.amount-btn');
    const customInput = document.getElementById('custom-amount-input');
    const customAmountField = document.getElementById('custom-amount');

    amountButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // Remove active class from all buttons
            amountButtons.forEach(b => {
                b.classList.remove('border-[#facc15]', 'bg-[#facc15]/20', 'text-white');
                b.classList.add('border-[#302839]', 'bg-[#25202b]', 'text-slate-400');
            });

            // Add active class to clicked button
            this.classList.remove('border-[#302839]', 'bg-[#25202b]', 'text-slate-400');
            this.classList.add('border-[#facc15]', 'bg-[#facc15]/20', 'text-white');

            const amount = this.dataset.amount;

            if (amount === 'custom') {
                customInput.classList.remove('hidden');
                customAmountField.focus();
                selectedAmount = 0;
            } else {
                customInput.classList.add('hidden');
                selectedAmount = parseInt(amount);
                updateSummary();
            }

            // Hide error
            document.getElementById('amount-error').classList.add('hidden');
        });
    });

    // Custom amount input handler
    customAmountField.addEventListener('input', function () {
        selectedAmount = parseInt(this.value) || 0;
        updateSummary();
    });
}

// Setup form handlers
function setupFormHandlers() {
    const form = document.getElementById('support-form');
    const messageField = document.getElementById('message');
    const charCount = document.getElementById('char-count');

    // Character counter
    messageField.addEventListener('input', function () {
        charCount.textContent = this.value.length;
        updateSummary();
    });

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (selectedAmount < 2000) {
            const errorDiv = document.getElementById('amount-error');
            errorDiv.textContent = 'Số tiền tối thiểu là 2.000đ';
            errorDiv.classList.remove('hidden');
            return;
        }

        updateQRCode();
    });
}

// Update summary display
function updateSummary() {
    const name = document.getElementById('name').value.trim();
    const message = document.getElementById('message').value.trim();

    // Update amount
    document.getElementById('summary-amount').textContent =
        selectedAmount > 0 ? formatCurrency(selectedAmount) : '0đ';

    // Update content
    let content = 'APHIM UNG HO';
    if (message) {
        content = message;
    } else if (name) {
        content = `${name} ung ho`;
    }

    document.getElementById('summary-content').textContent = content.toUpperCase();
}

// Update QR Code
function updateQRCode() {
    const name = document.getElementById('name').value.trim();
    const message = document.getElementById('message').value.trim();

    let content = 'APHIM UNG HO';
    if (message) {
        content = message;
    } else if (name) {
        content = `${name} ung ho`;
    }

    const qrUrl = `https://api.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-a1Gm36d.jpg?accountName=${encodeURIComponent(ACCOUNT_NAME)}&amount=${selectedAmount}&addInfo=${encodeURIComponent(content)}`;

    document.getElementById('dynamic-qr-code').src = qrUrl;

    // Show confirm donation button after QR is updated
    document.getElementById('confirm-donation-btn').classList.remove('hidden');

    // Show success message
    showNotification('Mã QR đã được cập nhật!', 'success');
}

// Confirm donation - user claims they donated
function confirmDonation() {
    if (!confirm('Bạn xác nhận đã chuyển khoản ủng hộ?\n\nSau khi xác nhận, thông báo sẽ không hiện lại trong 3-5 ngày.')) {
        return;
    }

    // Save donation confirmation with timestamp
    const donationData = {
        timestamp: Date.now(),
        amount: selectedAmount,
        confirmed: true
    };

    localStorage.setItem('aphim_donation_confirmed', JSON.stringify(donationData));

    // Hide the button
    document.getElementById('confirm-donation-btn').classList.add('hidden');

    // Show thank you message
    showNotification('Cảm ơn bạn đã ủng hộ! Thông báo sẽ tạm ẩn trong vài ngày.', 'success');

    // Optionally redirect to home after 2 seconds
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Copy account number
function copyAccountNumber() {
    const accountNo = ACCOUNT_NO.replace(/\s/g, ''); // Remove spaces
    navigator.clipboard.writeText(accountNo).then(() => {
        showNotification('Đã sao chép số tài khoản!', 'success');
    });
}

// Download QR code
function downloadQR() {
    const qrImage = document.getElementById('dynamic-qr-code');
    const link = document.createElement('a');
    link.href = qrImage.src;
    link.download = 'aphim-qr-code.jpg';
    link.click();
    showNotification('Đang tải mã QR...', 'info');
}

// Load recent supporters
async function loadRecentSupporters() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/supporters/recent`);

        // Handle rate limit
        if (response.status === 429) {
            console.log('Rate limited, will retry later');
            document.getElementById('recent-supporters').innerHTML = `
                <div class="text-center text-slate-500 py-4">
                    Đang tải danh sách ủng hộ...
                </div>
            `;
            return;
        }

        const data = await response.json();

        if (data.success && data.supporters.length > 0) {
            displaySupporters(data.supporters);
        } else {
            document.getElementById('recent-supporters').innerHTML = `
                <div class="text-center text-slate-500 py-4">
                    Chưa có người ủng hộ nào
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading supporters:', error);
        document.getElementById('recent-supporters').innerHTML = `
            <div class="text-center text-slate-500 py-4">
                Chưa có dữ liệu
            </div>
        `;
    }
}

// Display supporters
function displaySupporters(supporters) {
    const colors = [
        'from-blue-500 to-cyan-400',
        'from-pink-500 to-rose-400',
        'from-emerald-500 to-teal-400',
        'from-purple-500 to-indigo-400',
        'from-orange-500 to-amber-400'
    ];

    const html = supporters.map((supporter, index) => {
        const initials = supporter.name.substring(0, 2).toUpperCase();
        const colorClass = colors[index % colors.length];
        const timeAgo = getTimeAgo(supporter.createdAt);

        return `
            <div class="flex items-center justify-between p-3 rounded-lg bg-[#25202b]">
                <div class="flex items-center gap-3">
                    <div class="size-8 rounded-full bg-gradient-to-tr ${colorClass} flex items-center justify-center text-xs font-bold text-white">
                        ${initials}
                    </div>
                    <div>
                        <p class="text-white text-sm font-medium">${supporter.name}</p>
                        <p class="text-slate-500 text-xs">${supporter.message || 'Ủng hộ'} • ${timeAgo}</p>
                    </div>
                </div>
                <span class="primary-color font-bold text-sm">+${formatCurrency(supporter.amount)}</span>
            </div>
        `;
    }).join('');

    document.getElementById('recent-supporters').innerHTML = html;
}

// Get time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
}

// Show notification
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}
