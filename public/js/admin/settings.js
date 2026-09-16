/**
 * Admin Settings Management Script
 * Requires: config.js (ADMIN_STORAGE_KEYS, API_CONFIG) loaded before this file
 */

const API_BASE = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api';

// ── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth guard
    if (typeof adminAuthService !== 'undefined') {
        adminAuthService.checkAuth();
    }

    // 2. Populate admin header info
    populateAdminHeader();

    // 3. Load settings from backend
    loadSettings();

    // 4. Toggle label sync
    setupToggleListeners();

    // 5. Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (typeof adminAuthService !== 'undefined') adminAuthService.logout();
            else window.location.href = '/admin/login.html';
        });
    }
});

// ── Admin header info ────────────────────────────────────────────────────────
function populateAdminHeader() {
    try {
        const userStr = localStorage.getItem('cinestream_admin_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            const name = user.name || user.username || 'Admin';
            const el = document.getElementById('adminName');
            if (el) el.textContent = name;
            const av = document.getElementById('adminAvatar');
            if (av) av.textContent = name.charAt(0).toUpperCase();
        }
    } catch (e) { /* silently skip */ }
}

// ── Load Settings ────────────────────────────────────────────────────────────
async function loadSettings() {
    showLoadingState(true);
    try {
        const token = getAdminToken();

        // Phase 1: Load admin settings (requires auth)
        const adminPromise = token
            ? fetch(`${API_BASE}/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
            : Promise.reject(new Error('no token'));

        // Phase 2: Always load payment-public for preview (no auth needed)
        const paymentPromise = fetch(`${API_BASE}/settings/payment-public`);

        const [adminResult, paymentResult] = await Promise.allSettled([
            adminPromise,
            paymentPromise
        ]);

        let adminData = null;
        let paymentPublic = null;

        // --- Process admin settings ---
        if (adminResult.status === 'fulfilled') {
            const res = adminResult.value;
            if (res.status === 401) {
                if (typeof adminAuthService !== 'undefined') adminAuthService.logout();
                return;
            }
            const json = await res.json();
            if (json.success && json.data) adminData = json.data;
            else showToast(json.message || 'Lỗi tải cài đặt', 'error');
        } else {
            // Token missing or fetch failed
            document.getElementById('offlineBanner')?.classList.add('show');
            showToast('Không kết nối backend. Một số tính năng bị giới hạn.', 'error');
        }

        // --- Process payment-public ---
        if (paymentResult.status === 'fulfilled' && paymentResult.value.ok) {
            const json = await paymentResult.value.json();
            if (json.success && json.data) paymentPublic = json.data;
        }

        // --- Fill form (admin data) or show defaults ---
        if (adminData) {
            // If bankAccount is empty in DB, patch from payment-public fallback
            if (!adminData.payment) adminData.payment = {};
            if (!adminData.payment.bankAccount && paymentPublic?.bankAccount) {
                adminData.payment.bankAccount = paymentPublic.bankAccount;
            }
            if (!adminData.payment.bankOwner && paymentPublic?.bankOwner) {
                adminData.payment.bankOwner = paymentPublic.bankOwner;
            }
            if (!adminData.payment.bankName && paymentPublic?.bankName) {
                adminData.payment.bankName = paymentPublic.bankName;
            }
            if ((!adminData.payment.pricePremium || adminData.payment.pricePremium === 0) && paymentPublic?.pricePremium) {
                adminData.payment.pricePremium = paymentPublic.pricePremium;
            }
            if ((!adminData.payment.pricePremiumYear || adminData.payment.pricePremiumYear === 0) && paymentPublic?.pricePremiumYear) {
                adminData.payment.pricePremiumYear = paymentPublic.pricePremiumYear;
            }
            fillSettingsFields(adminData);
        } else if (paymentPublic) {
            // Admin settings unavailable → show payment-public in preview only
            updatePaymentPreview(paymentPublic);
            showToast('Đang hiển thị dữ liệu thanh toán từ trang pricing.html', 'info');
        }

    } catch (error) {
        console.error('loadSettings error:', error);
        document.getElementById('offlineBanner')?.classList.add('show');
        lucide?.createIcons?.();
        showToast('Lỗi tải cài đặt: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

function showLoadingState(on) {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.disabled = on;
}

// ── Fill form fields ─────────────────────────────────────────────────────────
function fillSettingsFields(s) {
    // General
    setVal('siteName',        s.general?.siteName);
    setVal('siteDesc',        s.general?.siteDesc);
    setVal('siteDomain',      s.general?.siteDomain);
    setVal('siteEmail',       s.general?.siteEmail);
    setVal('logoUrl',         s.general?.logoUrl);
    setVal('faviconUrl',      s.general?.faviconUrl);
    setCheck('maintenanceMode', s.general?.maintenanceMode);
    setCheck('allowRegister',   s.general?.allowRegister);
    setCheck('allowComments',   s.general?.allowComments);

    // Payment
    setVal('bankAccount',     s.payment?.bankAccount);
    setVal('bankOwner',       s.payment?.bankOwner);
    setSelectVal('bankName',   s.payment?.bankName);
    setVal('momoPhone',       s.payment?.momoPhone);
    setVal('vnPayKey',        s.payment?.vnPayKey);
    setVal('zaloPayKey',      s.payment?.zaloPayKey);
    setVal('pricePremium',    s.payment?.pricePremium);
    setVal('priceStandard',   s.payment?.priceStandard);
    setVal('priceBasic',      s.payment?.priceBasic);
    setVal('pricePremiumYear',s.payment?.pricePremiumYear);

    // Content
    setCheck('enablePhimX',          s.content?.enablePhimX);
    setCheck('enableWatermark',       s.content?.enableWatermark);
    setVal('watermarkUrl',            s.content?.watermarkUrl);
    setSelectVal('autoplayDelay',     s.content?.autoplayDelay);
    setSelectVal('defaultServer',     s.content?.defaultServer);
    setVal('proxyUrl',                s.content?.proxyUrl);
    setVal('apiBase',                 s.content?.apiBase);
    setVal('apiSecondary',            s.content?.apiSecondary);
    setCheck('enableMultipleSources', s.content?.enableMultipleSources);

    // Security
    setCheck('enable2FA',          s.security?.enable2FA);
    setCheck('ipWhitelistEnabled', s.security?.ipWhitelistEnabled);
    setVal('ipWhitelist', Array.isArray(s.security?.ipWhitelist)
        ? s.security.ipWhitelist.join(', ')
        : (s.security?.ipWhitelist || ''));

    // Notifications
    setCheck('notifyNewUser',  s.notifications?.notifyNewUser);
    setCheck('notifyPayment',  s.notifications?.notifyPayment);
    setCheck('weeklyReport',   s.notifications?.weeklyReport);
    setVal('smtpHost',         s.notifications?.smtpHost);
    setVal('smtpPort',         s.notifications?.smtpPort);
    setVal('smtpUser',         s.notifications?.smtpUser);
    setVal('smtpPass',         s.notifications?.smtpPass);
    setVal('telegramBotToken', s.notifications?.telegramBotToken);
    setVal('telegramChatId',   s.notifications?.telegramChatId);

    // Sync all toggle labels after fill
    document.querySelectorAll('.toggle-input').forEach(input => {
        const label = input.closest('.toggle-wrap')?.querySelector('.toggle-label');
        if (label) label.textContent = input.checked ? 'Bật' : 'Tắt';
    });

    // Update payment preview panel
    updatePaymentPreview(s.payment);

    lucide?.createIcons?.();
}

// ── Payment Preview Panel ────────────────────────────────────────────────────
function updatePaymentPreview(payment) {
    if (!payment) return;

    const fmtVND = (n) => n ? Number(n).toLocaleString('vi-VN') + ' đ' : '—';

    // Text fields
    const setPreview = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '—';
    };

    setPreview('pv-bankName',         payment.bankName);
    setPreview('pv-bankAccount',      payment.bankAccount);
    setPreview('pv-bankOwner',        payment.bankOwner);
    setPreview('pv-momoPhone',        payment.momoPhone || 'Chưa cài đặt');
    setPreview('pv-pricePremium',     fmtVND(payment.pricePremium));
    setPreview('pv-pricePremiumYear', fmtVND(payment.pricePremiumYear));

    // Generate QR code via VietQR if bank account exists
    const account = payment.bankAccount?.trim();
    const owner   = payment.bankOwner?.trim();
    const bank    = payment.bankName?.trim();

    const qrImg   = document.getElementById('previewQR');
    const qrFail  = document.getElementById('previewQRFail');

    if (account && bank) {
        // Map bank name to VietQR bank ID
        const BANK_IDS = {
            'Vietcombank': '970436', 'Techcombank': '970407', 'MB Bank': '970422',
            'VPBank': '970432', 'Agribank': '970405', 'BIDV': '970418',
            'ACB': '970416', 'TPBank': '970423', 'VietinBank': '970415',
            'Sacombank': '970403', 'HDBank': '970437', 'SHB': '970443',
            'OCB': '970448', 'MSB': '970426', 'SeABank': '970440'
        };

        const bankId = BANK_IDS[bank] || '970436';
        const qrUrl = `https://api.vietqr.io/image/${bankId}-${account}-compact2.jpg`
            + `?accountName=${encodeURIComponent(owner || account)}`
            + `&addInfo=APHIM+PREMIUM`;

        if (qrImg) {
            qrImg.style.display = 'block';
            qrImg.src = qrUrl;
            if (qrFail) qrFail.style.display = 'none';
        }
    } else {
        // No account → show placeholder
        if (qrImg)  qrImg.style.display = 'none';
        if (qrFail) qrFail.style.display = 'flex';
    }

    lucide?.createIcons?.();
}

// ── Save Settings ─────────────────────────────────────────────────────────────
async function saveSettings() {
    const btn = document.getElementById('saveBtn');
    const originalHTML = btn.innerHTML;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="refresh-cw" class="spin" style="width:1em;height:1em;"></i> Đang lưu...';
        lucide?.createIcons?.();

        const payload = {
            general: {
                siteName:        getVal('siteName'),
                siteDesc:        getVal('siteDesc'),
                siteDomain:      getVal('siteDomain'),
                siteEmail:       getVal('siteEmail'),
                logoUrl:         getVal('logoUrl'),
                faviconUrl:      getVal('faviconUrl'),
                maintenanceMode: getCheck('maintenanceMode'),
                allowRegister:   getCheck('allowRegister'),
                allowComments:   getCheck('allowComments')
            },
            payment: {
                bankAccount:     getVal('bankAccount'),
                bankOwner:       getVal('bankOwner'),
                bankName:        getVal('bankName'),
                momoPhone:       getVal('momoPhone'),
                vnPayKey:        getVal('vnPayKey'),
                zaloPayKey:      getVal('zaloPayKey'),
                pricePremium:    toInt('pricePremium'),
                priceStandard:   toInt('priceStandard'),
                priceBasic:      toInt('priceBasic'),
                pricePremiumYear:toInt('pricePremiumYear')
            },
            content: {
                enablePhimX:          getCheck('enablePhimX'),
                enableWatermark:      getCheck('enableWatermark'),
                watermarkUrl:         getVal('watermarkUrl'),
                autoplayDelay:        getVal('autoplayDelay'),
                defaultServer:        getVal('defaultServer'),
                proxyUrl:             getVal('proxyUrl'),
                apiBase:              getVal('apiBase'),
                apiSecondary:         getVal('apiSecondary'),
                enableMultipleSources:getCheck('enableMultipleSources')
            },
            security: {
                enable2FA:          getCheck('enable2FA'),
                ipWhitelistEnabled: getCheck('ipWhitelistEnabled'),
                ipWhitelist: getVal('ipWhitelist')
                    .split(',').map(ip => ip.trim()).filter(ip => ip)
            },
            notifications: {
                notifyNewUser:   getCheck('notifyNewUser'),
                notifyPayment:   getCheck('notifyPayment'),
                weeklyReport:    getCheck('weeklyReport'),
                smtpHost:        getVal('smtpHost'),
                smtpPort:        toInt('smtpPort') || 587,
                smtpUser:        getVal('smtpUser'),
                smtpPass:        getVal('smtpPass'),
                telegramBotToken:getVal('telegramBotToken'),
                telegramChatId:  getVal('telegramChatId')
            }
        };

        const token = getAdminToken();
        if (!token) {
            showToast('Bạn chưa đăng nhập backend. Vui lòng đăng nhập lại.', 'error');
            return;
        }

        const res = await fetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            showToast('✅ Đã lưu cài đặt thành công!', 'success');
        } else {
            showToast(data.message || 'Lỗi khi lưu cài đặt', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
        lucide?.createIcons?.();
    }
}

// ── Change Password ───────────────────────────────────────────────────────────
async function changePassword() {
    const currentPassword = getVal('currentPass');
    const newPassword     = getVal('newPass');
    const confirmPassword = getVal('confirmPass');

    if (!currentPassword || !newPassword || !confirmPassword) {
        return showToast('Vui lòng điền đầy đủ các trường mật khẩu', 'info');
    }
    if (newPassword !== confirmPassword) {
        return showToast('Mật khẩu mới không khớp!', 'error');
    }
    if (newPassword.length < 6) {
        return showToast('Mật khẩu mới phải dài ít nhất 6 ký tự', 'error');
    }

    const token = getAdminToken();
    if (!token) {
        showToast('Bạn chưa đăng nhập backend. Vui lòng đăng nhập lại để đổi mật khẩu.', 'error');
        return;
    }

    const btn = document.getElementById('changePassBtn');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="refresh-cw" class="spin" style="width:1em;height:1em;"></i> Đang xử lý...'; lucide?.createIcons?.(); }

    try {
        const res = await fetch(`${API_BASE}/auth/updatepassword`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();
        if (data.success) {
            showToast('✅ Đổi mật khẩu thành công!', 'success');
            setVal('currentPass', '');
            setVal('newPass', '');
            setVal('confirmPass', '');
            document.getElementById('passStrengthBar').style.width = '0';
        } else {
            showToast(data.message || 'Lỗi khi đổi mật khẩu', 'error');
        }
    } catch (error) {
        showToast('Lỗi server: ' + error.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; lucide?.createIcons?.(); }
    }
}

// ── Test Telegram ─────────────────────────────────────────────────────────────
async function testTelegram() {
    const token  = getVal('telegramBotToken');
    const chatId = getVal('telegramChatId');

    if (!token || !chatId) {
        return showToast('Vui lòng nhập Token và Chat ID trước!', 'info');
    }

    const btn = document.getElementById('telegramTestBtn');
    const orig = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="refresh-cw" class="spin" style="width:1em;height:1em;"></i> Đang gửi...'; lucide?.createIcons?.(); }

    try {
        const msg = `🎬 *A Phim – Test Notification*\nDịch vụ thông báo Telegram đã kết nối thành công!\n_Thời gian: ${new Date().toLocaleString('vi-VN')}_`;
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
        });
        const data = await res.json();

        if (data.ok) {
            showToast('✅ Đã gửi tin nhắn test thành công!', 'success');
        } else {
            showToast('Telegram Error: ' + data.description, 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối Telegram: ' + error.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = orig; lucide?.createIcons?.(); }
    }
}

// ── Password strength ─────────────────────────────────────────────────────────
function checkPassStrength(val) {
    const bar = document.getElementById('passStrengthBar');
    if (!bar) return;
    let score = 0;
    if (val.length >= 6)  score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const widths = ['0%', '20%', '40%', '65%', '85%', '100%'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
    bar.style.width = widths[score];
    bar.style.background = colors[score];
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchSettingsTab(id, btn) {
    document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById('tab-' + id);
    if (tab) tab.classList.add('active');
}

// ── Toggle label sync ─────────────────────────────────────────────────────────
function setupToggleListeners() {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('toggle-input')) {
            const label = e.target.closest('.toggle-wrap')?.querySelector('.toggle-label');
            if (label) label.textContent = e.target.checked ? 'Bật' : 'Tắt';
        }
    });
}

// ── Toast notification ────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    toast.innerHTML = `<i data-lucide="${iconName}" style="width:1em;height:1em;"></i><span>${msg}</span>`;
    container.appendChild(toast);
    lucide?.createIcons?.();

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAdminToken() {
    return localStorage.getItem('cinestream_admin_token') || null;
}
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
}
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}
function setCheck(id, bool) {
    const el = document.getElementById(id);
    if (el) el.checked = !!bool;
}
function getCheck(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}
function setSelectVal(id, val) {
    const el = document.getElementById(id);
    if (!el || val === undefined || val === null) return;
    for (const opt of el.options) {
        if (opt.value === String(val) || opt.text === String(val)) {
            opt.selected = true;
            break;
        }
    }
}
function toInt(id) {
    const v = parseInt(getVal(id), 10);
    return isNaN(v) ? 0 : v;
}
