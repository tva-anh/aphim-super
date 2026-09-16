// Login Page Script
document.addEventListener('DOMContentLoaded', function () {
    // Allow users to access login page even if logged in
    // They can logout manually if needed

    setupLoginForm();
    setupRegisterForm();
    setupForgotPassword();
    setupAuthLeftPanel();
});

// Setup dynamic background for left panel
function setupAuthLeftPanel() {
    const panel = document.getElementById('auth-left-panel');
    if (!panel) return;

    // Default fallback
    let bgUrl = 'https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8Ez05N5cKk.jpg';
    panel.style.background = `linear-gradient(to bottom, rgba(15,15,30,0.15) 0%, rgba(15,15,30,0.95) 100%), url('${bgUrl}') center / cover no-repeat`;

    // Fetch dynamic
    setTimeout(async () => {
        try {
            const res = await movieAPI.fetchWithFallback('/quoc-gia/viet-nam');
            const data = await res.json();
            if (data?.data?.items?.length > 0) {
                const latestMovie = data.data.items[0];
                const url = `https://phimimg.com/${latestMovie.thumb_url || latestMovie.poster_url.startsWith('uploads/') ? '' : 'uploads/movies/'}${latestMovie.thumb_url || latestMovie.poster_url}`;
                panel.style.background = `linear-gradient(to bottom, rgba(15,15,30,0.15) 0%, rgba(15,15,30,0.95) 100%), url('${url}') center / cover no-repeat`;
            }
        } catch (e) {
            console.warn('Could not load dynamic auth background');
        }
    }, 100);
}

// Setup login form
function setupLoginForm() {
    const form = document.querySelector('form');
    if (!form) return;

    // Pre-populate saved login credentials
    try {
        const savedEmail = localStorage.getItem('ap_saved_login_email') || localStorage.getItem('cinestream_last_email') || '';
        const savedPass  = localStorage.getItem('ap_saved_login_pass') || '';
        const emailInput = document.getElementById('email');
        const passInput  = document.getElementById('password');
        const remInput   = document.getElementById('rememberMe');
        if (savedEmail && emailInput && !emailInput.value) emailInput.value = savedEmail;
        if (savedPass && passInput && !passInput.value) passInput.value = savedPass;
        if (remInput) remInput.checked = true;
    } catch(e) {}

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        if (!email || !password) {
            showMessage('Vui l�ng nh?p d?y d? th�ng tin', 'error');
            return;
        }

        // Show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '�ang dang nh?p...';

        try {
            const result = await authService.login(email, password, rememberMe);

            if (result.success) {
                showMessage('�ang nh?p th�nh c�ng!', 'success');
                // Hi?n popup m?i v�o nh�m Telegram sau m?i l?n dang nh?p
                const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
                const finalUrl = redirectUrl ? decodeURIComponent(redirectUrl) : 'index.html';
                setTimeout(() => { showTelegramPopup(finalUrl); }, 800);
            } else {
                showMessage(result.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            showMessage('L?i dang nh?p: ' + error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Setup register form (if on register page)
function setupRegisterForm() {
    // Add register link handler
    const registerLink = document.querySelector('a[href="#"]');
    if (registerLink && registerLink.textContent.includes('�ang k�')) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterModal();
        });
    }
}

// Show register modal
function showRegisterModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-surface-dark border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 relative">
            <button onclick="this.closest('.fixed').remove()" 
                class="absolute top-4 right-4 text-gray-400 hover:text-white">
                <span class="material-icons-outlined">close</span>
            </button>
            
            <h2 class="text-2xl font-bold text-white mb-6">�ang k� t�i kho?n</h2>
            
            <form id="registerForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">H? v� t�n</label>
                    <input type="text" id="regName" required
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="Nguy?n Van A" />
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input type="email" id="regEmail" required
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="email@example.com" />
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">S? di?n tho?i (t�y ch?n)</label>
                    <input type="tel" id="regPhone"
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="0123456789" />
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">M?t kh?u</label>
                    <input type="password" id="regPassword" required minlength="6"
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="��������" />
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">X�c nh?n m?t kh?u</label>
                    <input type="password" id="regPasswordConfirm" required minlength="6"
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="��������" />
                </div>
                
                <button type="submit"
                    class="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors">
                    �ANG K�
                </button>
            </form>
            
            <div class="mt-6 text-center">
                <p class="text-sm text-gray-400">
                    �� c� t�i kho?n? 
                    <button onclick="this.closest('.fixed').remove()" class="text-primary hover:underline">�ang nh?p</button>
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Setup register form submit
    document.getElementById('registerForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value;
        const passwordConfirm = document.getElementById('regPasswordConfirm').value;

        if (password !== passwordConfirm) {
            showMessage('M?t kh?u x�c nh?n kh�ng kh?p', 'error');
            return;
        }

        // Show loading
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '�ang dang k�...';

        try {
            const result = await authService.register(email, password, name, phone);

            if (result.success) {
                showMessage('�ang k� th�nh c�ng!', 'success');
                modal.remove();
                setTimeout(() => {
                    // Quay v? trang phim n?u c� ?redirect=
                    const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
                    window.location.href = redirectUrl ? decodeURIComponent(redirectUrl) : 'index.html';
                }, 1000);
            } else {
                showMessage(result.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            showMessage('L?i dang k�: ' + error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Setup forgot password
function setupForgotPassword() {
    const forgotLink = document.querySelector('a[href="#"]');
    if (forgotLink && forgotLink.textContent.includes('Qu�n m?t kh?u')) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotPasswordModal();
        });
    }
}

// Show forgot password modal
function showForgotPasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-surface-dark border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 relative">
            <button onclick="this.closest('.fixed').remove()" 
                class="absolute top-4 right-4 text-gray-400 hover:text-white">
                <span class="material-icons-outlined">close</span>
            </button>
            
            <h2 class="text-2xl font-bold text-white mb-4">Qu�n m?t kh?u</h2>
            <p class="text-gray-400 mb-6">Nh?p email c?a b?n d? nh?n m� OTP</p>
            
            <form id="forgotForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input type="email" id="forgotEmail" required
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="email@example.com" />
                </div>
                
                <button type="submit"
                    class="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors">
                    G?I M� OTP
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('forgotForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const email = document.getElementById('forgotEmail').value.trim();
        const result = authService.requestPasswordReset(email);

        if (result.success) {
            showMessage('M� OTP d� du?c g?i d?n email c?a b?n', 'success');
            modal.remove();
            showResetPasswordModal(email, result.otp);
        } else {
            showMessage(result.message, 'error');
        }
    });
}

// Show reset password modal
function showResetPasswordModal(email, otp) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-surface-dark border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 relative">
            <button onclick="this.closest('.fixed').remove()" 
                class="absolute top-4 right-4 text-gray-400 hover:text-white">
                <span class="material-icons-outlined">close</span>
            </button>
            
            <h2 class="text-2xl font-bold text-white mb-4">�?t l?i m?t kh?u</h2>
            <p class="text-gray-400 mb-2">M� OTP d� du?c g?i d?n email c?a b?n</p>
            <p class="text-sm text-primary mb-6">Demo: ${otp}</p>
            
            <form id="resetForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">M� OTP</label>
                    <input type="text" id="otpCode" required
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="123456" />
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">M?t kh?u m?i</label>
                    <input type="password" id="newPassword" required minlength="6"
                        class="w-full px-4 py-3 bg-background-dark/50 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-gray-500"
                        placeholder="��������" />
                </div>
                
                <button type="submit"
                    class="w-full py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors">
                    �?T L?I M?T KH?U
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('resetForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const otpCode = document.getElementById('otpCode').value.trim();
        const newPassword = document.getElementById('newPassword').value;

        const result = authService.resetPassword(email, otpCode, newPassword);

        if (result.success) {
            showMessage('�?t l?i m?t kh?u th�nh c�ng!', 'success');
            modal.remove();
        } else {
            showMessage(result.message, 'error');
        }
    });
}

// Show message
function showMessage(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-[200] px-6 py-4 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-600' :
        type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
        } text-white font-medium animate-fade-in`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Social login handlers
function loginWithGoogle() {
    showMessage('Hi?n t?i chua h? tr? dang nh?p b?ng Google. Vui l�ng dang k� t�i kho?n th? c�ng.', 'error');
    // Redirect to register page after 1.5 seconds
    setTimeout(() => {
        window.location.href = 'register.html?highlight=true';
    }, 1500);
}

function loginWithFacebook() {
    showMessage('Hi?n t?i chua h? tr? dang nh?p b?ng Facebook. Vui l�ng dang k� t�i kho?n th? c�ng.', 'error');
    // Redirect to register page after 1.5 seconds
    setTimeout(() => {
        window.location.href = 'register.html?highlight=true';
    }, 1500);
}

// ====== Telegram Community Popup ======
function showTelegramPopup(redirectUrl) {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes tg-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tg-card-in { from { opacity: 0; transform: translateY(40px) scale(0.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes tg-pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(41, 168, 224, 0.5); }
            70% { box-shadow: 0 0 0 14px rgba(41, 168, 224, 0); }
            100% { box-shadow: 0 0 0 0 rgba(41, 168, 224, 0); }
        }
        @keyframes tg-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
        }
        @keyframes tg-shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
        }
        @keyframes tg-badge-pop {
            0% { transform: scale(0); }
            70% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        #tg-popup-overlay {
            animation: tg-backdrop-in 0.3s ease forwards;
        }
        #tg-popup-card {
            animation: tg-card-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        #tg-popup-icon-wrap {
            animation: tg-float 3s ease-in-out infinite;
        }
        .tg-join-btn {
            background: linear-gradient(135deg, #29A8E0 0%, #1a7fc4 100%);
            box-shadow: 0 4px 20px rgba(41,168,224,0.4);
            transition: all 0.25s ease;
            animation: tg-pulse-ring 2s ease-out infinite;
        }
        .tg-join-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 28px rgba(41,168,224,0.55);
        }
        .tg-skip-btn {
            transition: all 0.2s ease;
            color: rgba(255,255,255,0.45);
        }
        .tg-skip-btn:hover { color: rgba(255,255,255,0.75); }
        .tg-badge {
            animation: tg-badge-pop 0.5s 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .tg-shimmer-text {
            background: linear-gradient(90deg, #29A8E0, #fff, #29A8E0);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: tg-shimmer 2.5s linear infinite;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'tg-popup-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);padding:16px;';

    overlay.innerHTML = `
        <div id="tg-popup-card" style="
            width:100%;max-width:360px;border-radius:24px;overflow:hidden;
            background:linear-gradient(160deg,#1a2540 0%,#0f1829 100%);
            border:1px solid rgba(41,168,224,0.25);
            box-shadow:0 30px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.07);
            font-family:'Space Grotesk',sans-serif;
        ">
            <!-- Top gradient band -->
            <div style="height:4px;background:linear-gradient(90deg,#29A8E0,#1a7fc4,#29A8E0);background-size:200%;animation:tg-shimmer 2s linear infinite;"></div>

            <div style="padding:32px 28px 28px;text-align:center;">

                <!-- Icon -->
                <div id="tg-popup-icon-wrap" style="display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;position:relative;">
                    <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#29A8E0,#1a7fc4);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(41,168,224,0.35);">
                        <svg width="42" height="42" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.18.18 0 0 0-.07-.19c-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.18 3.44-.49.34-.93.5-1.33.49-.44-.01-1.29-.25-1.92-.45-.73-.24-1.31-.36-1.26-.77.03-.21.32-.42.87-.64 3.41-1.48 5.68-2.46 6.83-2.94 3.25-1.36 3.93-1.59 4.37-1.59.1 0 .31.02.43.09.1.06.18.14.2.25.01.12.01.28.01.37z"/>
                        </svg>
                    </div>
                    <div class="tg-badge" style="position:absolute;top:-4px;right:-4px;background:#f2f20d;color:#1a1200;border-radius:50px;padding:3px 8px;font-size:10px;font-weight:800;letter-spacing:0.5px;white-space:nowrap;">M?I ?</div>
                </div>

                <!-- Title -->
                <div style="margin-bottom:6px;">
                    <span class="tg-shimmer-text" style="font-size:20px;font-weight:800;letter-spacing:-0.3px;">C?ng �?ng A Phim</span>
                </div>

                <!-- Subtitle -->
                <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 20px;font-weight:500;">Telegram Group � Bot t�m phim t? d?ng</p>

                <!-- Feature pills - grid 2 c?t d?ng d?u -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px;">
                    <span style="background:rgba(41,168,224,0.12);border:1px solid rgba(41,168,224,0.25);color:#29A8E0;border-radius:50px;padding:7px 10px;font-size:11px;font-weight:600;text-align:center;">?? Xem phim c�ng nhau</span>
                    <span style="background:rgba(41,168,224,0.12);border:1px solid rgba(41,168,224,0.25);color:#29A8E0;border-radius:50px;padding:7px 10px;font-size:11px;font-weight:600;text-align:center;">?? Bot t�m phim si�u nhanh</span>
                    <span style="background:rgba(41,168,224,0.12);border:1px solid rgba(41,168,224,0.25);color:#29A8E0;border-radius:50px;padding:7px 10px;font-size:11px;font-weight:600;text-align:center;">?? Phim m?i c?p nh?t li�n t?c</span>
                    <span style="background:rgba(41,168,224,0.12);border:1px solid rgba(41,168,224,0.25);color:#29A8E0;border-radius:50px;padding:7px 10px;font-size:11px;font-weight:600;text-align:center;">?? Chia s? & review phim hay</span>
                </div>

                <!-- Description -->
                <p style="color:rgba(255,255,255,0.65);font-size:13px;line-height:1.6;margin-bottom:24px;text-align:justify;text-align-last:center;">
                    Tham gia ngay d? <strong style="color:#f2f20d;">t�m ki?m phim si�u t?c</strong> v?i bot th�ng minh, c?p nh?t phim m?i m?i ng�y v� chia s? c�ng c?ng d?ng phim ?nh s�i d?ng!
                </p>

                <!-- Join button -->
                <a id="tg-join-btn" href="https://t.me/+VsCfrulXuXw1NTE9" target="_blank" rel="noopener"
                    class="tg-join-btn"
                    style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border-radius:14px;color:white;font-weight:800;font-size:15px;text-decoration:none;letter-spacing:0.3px;margin-bottom:12px;box-sizing:border-box;"
                    onclick="setTimeout(function(){ document.getElementById('tg-popup-overlay').remove(); window.location.href='${redirectUrl}'; }, 1200);"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.18.18 0 0 0-.07-.19c-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.18 3.44-.49.34-.93.5-1.33.49-.44-.01-1.29-.25-1.92-.45-.73-.24-1.31-.36-1.26-.77.03-.21.32-.42.87-.64 3.41-1.48 5.68-2.46 6.83-2.94 3.25-1.36 3.93-1.59 4.37-1.59.1 0 .31.02.43.09.1.06.18.14.2.25.01.12.01.28.01.37z"/></svg>
                    V�O NH�M TELEGRAM NGAY
                </a>

                <!-- Skip -->
                <button class="tg-skip-btn" onclick="document.getElementById('tg-popup-overlay').remove();window.location.href='${redirectUrl}';"
                    style="background:none;border:none;cursor:pointer;font-size:12px;font-family:inherit;padding:4px 8px;display:block;margin:0 auto;">
                    B? qua, xem phim th�i ?
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            overlay.remove();
            window.location.href = redirectUrl;
        }
    });
}

