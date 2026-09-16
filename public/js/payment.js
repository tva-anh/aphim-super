// ── Cấu hình thanh toán (default — sẽ bị override bởi backend) ──────────────
const PAYMENT_CONFIG = {
    bankId:      '970422',          // MB Bank default
    accountNo:   '048889019999',
    accountName: 'TRAN VAN ANH',
    template:    'compact'
};

// Map tên ngân hàng → bank ID cho VietQR
const BANK_ID_MAP = {
    'Vietcombank': '970436', 'Techcombank': '970407', 'MB Bank':    '970422',
    'VPBank':      '970432', 'Agribank':    '970405', 'BIDV':       '970418',
    'ACB':         '970416', 'TPBank':      '970423', 'VietinBank': '970415',
    'Sacombank':   '970403', 'HDBank':      '970437', 'SHB':        '970443',
    'OCB':         '970448', 'MSB':         '970426', 'SeABank':    '970440'
};

// ── Thông tin các gói (default — sẽ bị override bởi backend) ─────────────────
const PLANS = {
    premium: { name: 'Gói Cao Cấp',  amount: 69000,  duration: '1 tháng', code: 'PREMIUM', coinsReward: 1000 },
    family:  { name: 'Gói Gia Đình', amount: 699000, duration: '1 năm',   code: 'FAMILY',  coinsReward: 10000 },
    xu_20k:  { name: 'Gói Khởi Đầu', amount: 20000, duration: 'Nạp Xu', code: 'XU20K', coinsReward: 1000 },
    xu_100k: { name: 'Gói Đam Mê', amount: 100000, duration: 'Nạp Xu', code: 'XU100K', coinsReward: 7000 },
    xu_500k: { name: 'Gói VIP Collector', amount: 500000, duration: 'Nạp Xu', code: 'XU500K', coinsReward: 40000 }
};

// ── Fetch cấu hình từ backend và override defaults ────────────────────────────
async function initPaymentConfig() {
    try {
        // Dùng chung origin với server Express (config.js đã set API_CONFIG.BACKEND_URL)
        const BACKEND_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL)
            ? API_CONFIG.BACKEND_URL
            : `${window.location.origin}/api`;

        const res = await fetch(`${BACKEND_URL}/settings/payment-public`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !json.data) return;

        const d = json.data;

        // Override bank config
        if (d.bankAccount) PAYMENT_CONFIG.accountNo   = d.bankAccount;
        if (d.bankOwner)   PAYMENT_CONFIG.accountName = d.bankOwner;
        if (d.bankName && BANK_ID_MAP[d.bankName]) {
            PAYMENT_CONFIG.bankId = BANK_ID_MAP[d.bankName];
        }

        // Override prices
        if (d.pricePremium)     PLANS.premium.amount = d.pricePremium;
        if (d.pricePremiumYear) PLANS.family.amount  = d.pricePremiumYear;

    } catch (e) {
        // silent fail — use defaults
    }
}


// Lấy thông tin gói từ URL
function getPlanFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    return PLANS[plan] || null;
}

// Lấy thông tin user hiện tại
function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('cinestream_user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        return null;
    }
}

// Tạo username ngắn gọn từ thông tin user
function generateUsername(user) {
    if (!user) return null;

    // Ưu tiên lấy name, nếu không có thì lấy từ email
    let username = user.name || user.email?.split('@')[0] || '';

    // Loại bỏ khoảng trắng và ký tự đặc biệt, chỉ giữ chữ và số
    username = username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Giới hạn độ dài tối đa 15 ký tự
    return username.substring(0, 15);
}

// Tạo nội dung chuyển khoản
function generateTransferContent(planCode, user = null) {
    const timestamp = Date.now().toString().slice(-4);
    
    if (user) {
        // Tên hiển thị (bỏ dấu, lấy 8 ký tự đầu)
        const rawName = user.name || user.email || '';
        const baseUsername = rawName.split('@')[0]
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
            .replace(/[^a-zA-Z0-9]/g, '')
            .substring(0, 8).toUpperCase();
            
        // ID rút gọn (5 ký tự cuối)
        const uid = user._id || user.id || '';
        const uidSuffix = uid ? uid.slice(-5).toUpperCase() : timestamp;
        
        // Cấu trúc: APHIM [GÓI] [TÊN] [ID]
        // Ví dụ: APHIM PREMIUM ANHTRAN E75F
        return `APHIM ${planCode} ${baseUsername} ${uidSuffix}`;
    }
    
    // Nếu chưa đăng nhập (khách)
    return `APHIM ${planCode} KHACH ${timestamp}`;
}

// Tạo URL QR Code
function generateQRCodeURL(amount, content) {
    const params = new URLSearchParams({
        accountName: PAYMENT_CONFIG.accountName,
        amount: amount,
        addInfo: content
    });

    return `https://api.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNo}-${PAYMENT_CONFIG.template}.jpg?${params.toString()}`;
}

// Format số tiền
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Khởi tạo trang thanh toán
function initPaymentPage() {
    const plan = getPlanFromURL();

    if (!plan) {
        if (typeof showMessage === 'function') showMessage('Không tìm thấy thông tin gói dịch vụ!', 'error');
        else alert('Không tìm thấy thông tin gói dịch vụ!');
        window.location.href = '/pricing';
        return;
    }

    // Lấy thông tin user
    const user = getCurrentUser();

    // Tạo nội dung chuyển khoản (có hoặc không có user)
    const transferContent = generateTransferContent(plan.code, user);

    // Cập nhật thông tin gói
    document.getElementById('planName').textContent = `Thanh toán ${plan.name}`;
    document.getElementById('planNameDetail').textContent = plan.name;
    document.getElementById('planDuration').textContent = plan.duration;
    
    // Hiển thị Xu tặng kèm (nếu có)
    const existingCoinsRow = document.getElementById('coinsRewardRow');
    if (existingCoinsRow) existingCoinsRow.remove();

    if (plan.coinsReward > 0) {
        const planDetailsEl = document.getElementById('planDuration').parentElement;
        if (planDetailsEl) {
            const div = document.createElement('div');
            div.id = 'coinsRewardRow';
            div.className = 'flex justify-between text-yellow-500 font-bold mt-1';
            div.innerHTML = `<span>Tặng kèm:</span><span>+ ${plan.coinsReward.toLocaleString('vi-VN')} Xu</span>`;
            planDetailsEl.after(div);
        }
    }

    document.getElementById('totalAmount').textContent = formatCurrency(plan.amount);
    document.getElementById('amountText').textContent = formatCurrency(plan.amount);
    document.getElementById('contentText').textContent = transferContent;

    // Hiển thị thông tin user nếu đã đăng nhập
    if (user) {
        const userInfoDiv = document.getElementById('userInfo');
        if (userInfoDiv) {
            userInfoDiv.innerHTML = `
                <div class="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
                    <p class="text-green-400 font-bold mb-1">✓ Đã đăng nhập</p>
                    <p class="text-gray-300">Tài khoản: <span class="text-white font-medium">${user.name || user.email}</span></p>
                    <p class="text-gray-400 text-xs mt-1">Nội dung chuyển khoản đã bao gồm tên tài khoản của bạn</p>
                </div>
            `;
        }
    } else {
        const userInfoDiv = document.getElementById('userInfo');
        if (userInfoDiv) {
            userInfoDiv.innerHTML = `
                <div class="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                    <p class="text-yellow-400 font-bold mb-1">⚠ Chưa đăng nhập</p>
                    <p class="text-gray-300">Bạn có thể <a href="login.html" class="text-primary hover:underline">đăng nhập</a> để nội dung chuyển khoản bao gồm tên tài khoản</p>
                </div>
            `;
        }
    }

    // Tạo và hiển thị QR Code
    const qrCodeURL = generateQRCodeURL(plan.amount, transferContent);
    document.getElementById('qrCode').src = qrCodeURL;

    // Xử lý nút xác nhận thanh toán
    setupPaymentConfirmation(plan, transferContent);
}

// Xử lý xác nhận thanh toán
function setupPaymentConfirmation(plan, transferContent) {
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const confirmedBtn = document.getElementById('confirmedBtn');

    confirmBtn.addEventListener('click', async function () {
        // Hiển thị xác nhận
        const confirmed = await showConfirm(
            'Xác nhận thanh toán',
            `Bạn đã chuyển khoản ${formatCurrency(plan.amount)} với nội dung "${transferContent}"?\n\nVui lòng chỉ xác nhận khi đã hoàn tất thanh toán.`
        );

        if (confirmed) {
            // Ẩn nút xanh, hiện nút đỏ
            confirmBtn.classList.add('hidden');
            confirmedBtn.classList.remove('hidden');
            confirmedBtn.classList.add('flex');

            // Gửi giao dịch lên server để Admin xác nhận + Lưu localStorage (backup)
            await submitTransaction(plan, transferContent);
            savePaymentInfo(plan, transferContent);

            // Hiển thị thông báo
            showSuccessMessage(plan);
        }
    });
}

// Gửi giao dịch lên backend — Admin sẽ thấy trong /admin/subscriptions để confirm
async function submitTransaction(plan, transferContent) {
    try {
        const BACKEND_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL)
            ? API_CONFIG.BACKEND_URL
            : `${window.location.origin}/api`;

        const token = localStorage.getItem('cinestream_token');
        const user  = getCurrentUser();

        // Chưa đăng nhập → không gửi được lên server, chỉ lưu local
        if (!token || !user) {
            console.warn('[Payment] Chưa đăng nhập — giao dịch chỉ lưu local, Admin sẽ không thấy để xác nhận.');
            return false;
        }

        const isXuPlan = plan.code.startsWith('XU');
        const res = await fetch(`${BACKEND_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                type: isXuPlan ? 'xu_topup' : 'vip_purchase',
                amount_vnd: plan.amount,
                xu_amount: isXuPlan ? (plan.coinsReward || 0) : 0,
                plan_code: plan.code,
                transfer_content: transferContent
            })
        });

        const json = await res.json();
        if (json.success) {
            console.log('[Payment] Đã gửi giao dịch lên server, chờ Admin xác nhận:', json.data);
            return true;
        }
        console.warn('[Payment] Server từ chối giao dịch:', json.message);
        return false;
    } catch (e) {
        console.warn('[Payment] Không gửi được giao dịch lên server:', e);
        return false;
    }
}

// Lưu thông tin thanh toán
function savePaymentInfo(plan, transferContent) {
    const paymentInfo = {
        plan: plan.name,
        amount: plan.amount,
        duration: plan.duration,
        transferContent: transferContent,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    // Lưu vào localStorage
    const payments = JSON.parse(localStorage.getItem('payments') || '[]');
    payments.push(paymentInfo);
    localStorage.setItem('payments', JSON.stringify(payments));

    // Lưu gói hiện tại
    localStorage.setItem('currentPlan', JSON.stringify({
        name: plan.name,
        code: plan.code,
        expiryDate: calculateExpiryDate(plan.duration)
    }));
}

// Tính ngày hết hạn
function calculateExpiryDate(duration) {
    const now = new Date();
    if (duration.includes('tháng')) {
        now.setMonth(now.getMonth() + 1);
    } else if (duration.includes('năm')) {
        now.setFullYear(now.getFullYear() + 1);
    }
    return now.toISOString();
}

// Hiển thị thông báo thành công
function showSuccessMessage(plan) {
    const message = `✅ Đã xác nhận thanh toán ${plan.name}! Gói dịch vụ của bạn sẽ được kích hoạt trong vòng 5-10 phút. Bạn sẽ được chuyển về trang chủ sau vài giây...`;

    if (typeof showMessage === 'function') showMessage(message, 'success', 8000);
    else alert(message);

    // Chuyển về trang chủ sau 5 giây
    setTimeout(() => {
        window.location.href = '/';
    }, 5000);
}

// Khởi tạo khi trang load — fetch backend config trước, rồi mới render
document.addEventListener('DOMContentLoaded', async () => {
    await initPaymentConfig();   // override PAYMENT_CONFIG + PLANS từ backend
    initPaymentPage();           // render với config mới nhất
});
