/**
 * A PHIM - Auth Modal (Login / Register)
 * Hiển thị popup đăng nhập / đăng ký ngay tại trang với giao diện Kính mờ màu trắng trong suốt (White-Tinted Glassmorphic)
 * - Chuyển tab Đăng nhập ↔ Đăng ký TỨC THÌ (Instant 0ms, không reload modal, không load lại ảnh, cực kỳ mượt mà)
 * - Tone màu nền: Kính trắng mờ viền sáng chuẩn phong cách Apple Glassmorphism
 */
(function () {
    'use strict';

    const _currentPage = window.location.pathname.replace(/.*\//, '');
    const _isAuthPage  = _currentPage === 'login.html' || _currentPage === 'register.html';

    // Inject Styles
    function injectStyles() {
        if (document.getElementById('ap-auth-modal-css')) return;
        const s = document.createElement('style');
        s.id = 'ap-auth-modal-css';
        s.textContent = `
        /* ── Backdrop ── */
        #ap-auth-backdrop {
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(0, 0, 0, 0.48);
            backdrop-filter: blur(12px) saturate(140%);
            -webkit-backdrop-filter: blur(12px) saturate(140%);
            display: flex; align-items: center; justify-content: center;
            padding: 16px;
            animation: ap-modal-fadein 0.25s ease;
            box-sizing: border-box;
        }
        @keyframes ap-modal-fadein {
            from { opacity: 0; } to { opacity: 1; }
        }

        /* ── Modal Card (Ultra Translucent Bright Glass) ── */
        #ap-auth-modal {
            width: 100%; max-width: 820px;
            max-height: calc(100vh - 32px);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.12) 100%), rgba(18, 22, 34, 0.52) !important;
            backdrop-filter: blur(36px) saturate(220%) !important;
            -webkit-backdrop-filter: blur(36px) saturate(220%) !important;
            border-radius: 26px;
            overflow: hidden;
            display: flex;
            box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55), 0 0 35px rgba(252, 213, 118, 0.12) !important;
            animation: ap-modal-slidein 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-sizing: border-box;
        }
        #ap-auth-modal::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 26px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
            pointer-events: none;
            z-index: 25;
        }
        @keyframes ap-modal-slidein {
            from { transform: scale(0.94) translateY(20px); opacity: 0; }
            to   { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* Fixed Stable Dimensions for Desktop & Mobile (Immovable Frame & Tabs) */
        @media (min-width: 641px) {
            #ap-auth-modal {
                width: 900px !important;
                height: 520px !important;
                max-width: 94vw !important;
                max-height: 92vh !important;
            }
            .ap-auth-left {
                width: 380px !important;
                height: 100% !important;
            }
            .ap-auth-right {
                height: 100% !important;
                padding: 44px 36px 28px 36px !important;
                justify-content: flex-start !important;
            }
        }

        /* ── Desktop Left Panel (Poster Column) ── */
        .ap-auth-left {
            width: 380px; flex-shrink: 0;
            background: linear-gradient(to bottom, rgba(15, 18, 30, 0.05) 0%, rgba(15, 18, 30, 0.25) 45%, rgba(15, 18, 30, 0.72) 100%),
                        url('https://vsmov.com/storage/images/pxd9rc03EMMln3tVFdfd427Fpsi.jpg') center / cover no-repeat;
            display: flex; flex-direction: column;
            justify-content: flex-end; align-items: center;
            padding: 36px 28px 48px 28px;
            box-sizing: border-box;
            position: relative;
        }
        @media (max-width: 640px) {
            .ap-auth-left { display: none !important; }
            #ap-auth-modal {
                width: min(410px, 92vw) !important;
                height: 545px !important;
                max-height: 90vh !important;
            }
            .ap-auth-right {
                height: 100% !important;
                padding: 60px 20px 32px 20px !important;
                justify-content: flex-start !important;
            }
        }

        .ap-auth-brand-logo {
            position: absolute; top: 16px; left: 18px;
            display: flex; align-items: center; z-index: 2;
        }
        .ap-auth-brand-logo img {
            height: 40px; width: auto; max-width: 200px; object-fit: contain;
            filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.75));
        }

        .ap-auth-poster-text {
            width: 100%;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            text-align: center;
            z-index: 2;
            padding: 0 8px;
            box-sizing: border-box;
        }
        .ap-auth-poster-title {
            font-family: inherit;
            font-size: 26px; font-weight: 500; color: #ffffff !important;
            line-height: 1.35; margin: 0 0 16px 0;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            text-align: center;
            font-style: normal;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
        }
        .ap-auth-poster-sub {
            font-family: inherit;
            font-size: 15px; color: rgba(255, 255, 255, 0.92) !important;
            margin: 0; font-weight: 400; line-height: 1.45;
            text-align: center;
            max-width: 290px;
            font-style: normal;
            text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
        }

        /* ── Right Panel (Form Area) ── */
        .ap-auth-right {
            flex: 1; padding: 58px 30px 28px 30px;
            display: flex; flex-direction: column;
            justify-content: flex-start !important;
            position: relative;
            overflow-y: auto;
            box-sizing: border-box;
        }
        @media (min-width: 641px) {
            .ap-auth-right {
                height: 100% !important;
                padding: 58px 36px 28px 36px !important;
                justify-content: flex-start !important;
            }
        }
        @media (max-width: 640px) {
            .ap-auth-right { padding: 60px 20px 32px 20px !important; }
        }

        /* Close Button X */
        .ap-auth-close {
            position: absolute; top: 14px; right: 14px;
            width: 32px; height: 32px; border-radius: 50%;
            background: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.85); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; transition: all 0.2s ease;
            z-index: 10; outline: none;
        }
        .ap-auth-close:hover {
            background: rgba(255, 255, 255, 0.25); color: #ffffff;
            transform: rotate(90deg);
        }

        /* ── Segmented Pill Tabs Switcher (100% Fixed Top Anchor) ── */
        .ap-auth-tabs-wrap {
            background: rgba(0, 0, 0, 0.28);
            border-radius: 9999px;
            padding: 4px;
            display: flex;
            margin-bottom: 14px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            flex-shrink: 0 !important;
            width: 100%;
            box-sizing: border-box;
        }
        .ap-auth-tab-btn {
            flex: 1; border: none; background: transparent;
            color: rgba(255, 255, 255, 0.65);
            font-size: 14px; font-weight: 500;
            padding: 9px 16px; border-radius: 9999px;
            cursor: pointer; transition: all 0.2s ease;
            text-align: center; outline: none;
            font-family: inherit;
        }
        .ap-auth-tab-btn.active {
            background: rgba(255, 255, 255, 0.28);
            color: #ffffff; font-weight: 700;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.3);
        }

        .ap-auth-subtitle {
            font-size: 13.5px; color: #d1d5db;
            margin: 0 0 20px; text-align: left;
        }
        .ap-gold-link {
            color: #fcd576 !important; font-weight: 700;
            cursor: pointer; text-decoration: none;
            transition: color 0.18s ease;
        }
        .ap-gold-link:hover {
            color: #ffe18d !important;
            text-decoration: underline;
        }

        /* ── Form Inputs ── */
        .ap-auth-field {
            margin-bottom: 14px; position: relative;
            transition: all 0.2s ease;
        }
        .ap-auth-input {
            width: 100%; box-sizing: border-box;
            background: rgba(0, 0, 0, 0.28);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 14px; padding: 13px 16px;
            color: #ffffff; font-size: 14.5px; font-family: inherit;
            outline: none; transition: all 0.2s ease;
        }
        .ap-auth-input:focus {
            border-color: #fcd576;
            background: rgba(0, 0, 0, 0.4);
            box-shadow: 0 0 0 3px rgba(252, 213, 118, 0.18);
        }
        .ap-auth-input::placeholder {
            color: rgba(255, 255, 255, 0.45);
            font-size: 14px;
        }

        /* Password Eye Icon Button */
        .ap-pwd-toggle-btn {
            position: absolute; right: 14px; top: 50%;
            transform: translateY(-50%);
            background: none; border: none;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer; padding: 4px;
            display: flex; align-items: center; justify-content: center;
            transition: color 0.2s ease; outline: none;
        }
        .ap-pwd-toggle-btn:hover { color: #fcd576; }

        /* "Quên mật khẩu?" & Remember me */
        .ap-forgot-wrap {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 2px;
            margin-bottom: 14px;
        }
        #ap-field-remember-label {
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 13px !important;
            color: rgba(255, 255, 255, 0.8) !important;
            cursor: pointer !important;
            user-select: none !important;
            margin: 0 !important;
            padding: 2px 0 !important;
        }
        #ap-field-remember {
            appearance: auto !important;
            -webkit-appearance: checkbox !important;
            -moz-appearance: checkbox !important;
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            accent-color: #fcd576 !important;
            cursor: pointer !important;
            margin: 0 !important;
            display: inline-block !important;
            border-radius: 4px !important;
            pointer-events: auto !important;
        }
        .ap-forgot-link {
            font-size: 13px; color: #9ca3af;
            cursor: pointer; text-decoration: none;
            transition: color 0.2s ease; font-weight: 500;
        }
        .ap-forgot-link:hover { color: #fcd576; }

        /* ── Submit Button ── */
        .ap-auth-submit-btn {
            width: 100%; padding: 14px;
            background: linear-gradient(135deg, #fff3b0 0%, #fcd576 45%, #f59e0b 100%);
            color: #0d0f1a; font-size: 15px; font-weight: 800;
            border: 1.5px solid rgba(255, 248, 210, 0.85);
            border-radius: 14px; cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            margin-top: 4px; letter-spacing: 0.02em;
            box-shadow: 0 8px 22px rgba(252, 213, 118, 0.35), 0 2px 6px rgba(0, 0, 0, 0.4);
            text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
            outline: none;
        }
        .ap-auth-submit-btn:hover {
            background: linear-gradient(135deg, #ffffff 0%, #ffe18d 45%, #e69d05 100%);
            transform: translateY(-1.5px) scale(1.01);
            box-shadow: 0 12px 28px rgba(252, 213, 118, 0.5), 0 4px 10px rgba(0, 0, 0, 0.5);
        }
        .ap-auth-submit-btn.is-forgot {
            background: linear-gradient(135deg, #b5c6ff 0%, #9cb0ff 100%) !important;
            color: #0c0f1d !important;
            border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 8px 22px rgba(156, 176, 255, 0.35), 0 2px 6px rgba(0, 0, 0, 0.4) !important;
            text-shadow: none !important;
        }
        .ap-auth-submit-btn.is-forgot:hover {
            background: linear-gradient(135deg, #c7d5ff 0%, #adbfff 100%) !important;
            box-shadow: 0 12px 28px rgba(156, 176, 255, 0.5), 0 4px 10px rgba(0, 0, 0, 0.5) !important;
        }
        .ap-auth-submit-btn:active {
            transform: translateY(0) scale(0.99);
        }
        .ap-auth-submit-btn:disabled {
            opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
        }

        /* Message */
        .ap-auth-msg {
            font-size: 13.5px; padding: 11px 14px;
            border-radius: 12px; margin-bottom: 14px;
            display: none; font-weight: 500;
        }
        .ap-auth-msg.error   { background: rgba(239,68,68,0.22);  color: #fca5a5; display: block; border-left: 4px solid #ef4444; }
        .ap-auth-msg.success { background: rgba(16,185,129,0.22); color: #6ee7b7; display: block; border-left: 4px solid #10b981; }

        body.ap-modal-open {
            overflow: hidden !important;
        }

        /* ── Light Mode Overrides ── */
        html.light-mode #ap-auth-backdrop {
            background: rgba(40, 32, 20, 0.55) !important;
            backdrop-filter: blur(12px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
        }
        html.light-mode #ap-auth-modal {
            background: #faf7f2 !important;
            background-color: #faf7f2 !important;
            border: 1px solid #e7e0d3 !important;
            box-shadow: 0 24px 70px rgba(78, 64, 45, 0.25) !important;
        }
        html.light-mode #ap-auth-modal::before {
            border: 1px solid #e7e0d3 !important;
            box-shadow: none !important;
        }
        html.light-mode .ap-auth-input,
        html.light-mode input.ap-auth-input,
        html.light-mode #ap-auth-modal input,
        html.light-mode #ap-auth-form input {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border: 1.5px solid #d6cebf !important;
            color: #1c1917 !important;
            -webkit-text-fill-color: #1c1917 !important;
            font-weight: 700 !important;
            font-size: 14.5px !important;
            opacity: 1 !important;
        }
        html.light-mode .ap-auth-input::placeholder,
        html.light-mode input.ap-auth-input::placeholder,
        html.light-mode #ap-auth-modal input::placeholder,
        html.light-mode #ap-auth-form input::placeholder {
            color: #57534e !important;
            -webkit-text-fill-color: #57534e !important;
            opacity: 1 !important;
            font-size: 14px !important;
            font-weight: 500 !important;
        }
        html.light-mode .ap-auth-input::-webkit-input-placeholder,
        html.light-mode input.ap-auth-input::-webkit-input-placeholder,
        html.light-mode #ap-auth-modal input::-webkit-input-placeholder,
        html.light-mode #ap-auth-form input::-webkit-input-placeholder {
            color: #57534e !important;
            -webkit-text-fill-color: #57534e !important;
            opacity: 1 !important;
            font-size: 14px !important;
            font-weight: 500 !important;
        }
        html.light-mode .ap-auth-input:focus,
        html.light-mode input.ap-auth-input:focus,
        html.light-mode #ap-auth-modal input:focus {
            background: #ffffff !important;
            background-color: #ffffff !important;
            border-color: #d97706 !important;
            color: #1c1917 !important;
            -webkit-text-fill-color: #1c1917 !important;
            box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.2) !important;
        }
        html.light-mode input.ap-auth-input:-webkit-autofill {
            -webkit-text-fill-color: #1c1917 !important;
            -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
        }
        html.light-mode .ap-pwd-toggle-btn { color: #57534e !important; }
        html.light-mode .ap-pwd-toggle-btn:hover { color: #d97706 !important; }
        html.light-mode .ap-auth-tabs-wrap {
            background: #eae3d5 !important;
            border: 1px solid #d6cebf !important;
        }
        html.light-mode .ap-auth-tab-btn { color: #57534e !important; }
        html.light-mode .ap-auth-tab-btn.active {
            background: #ffffff !important;
            color: #1c1917 !important;
            font-weight: 800 !important;
            box-shadow: 0 2px 8px rgba(78, 64, 45, 0.12) !important;
        }
        html.light-mode .ap-auth-subtitle { color: #57534e !important; }
        html.light-mode .ap-gold-link { color: #b45309 !important; font-weight: 700 !important; }
        html.light-mode .ap-gold-link:hover { color: #d97706 !important; }
        html.light-mode .ap-forgot-link { color: #57534e !important; font-weight: 600 !important; }
        html.light-mode .ap-forgot-link:hover { color: #d97706 !important; }
        html.light-mode .ap-auth-close {
            background: #eae3d5 !important;
            border: 1px solid #d6cebf !important;
            color: #1c1917 !important;
        }
        html.light-mode .ap-auth-close:hover {
            background: #dfd7c6 !important;
            color: #d97706 !important;
        }
        html.light-mode .ap-auth-submit-btn {
            background: linear-gradient(135deg, #fcd576 0%, #f59e0b 100%) !important;
            color: #0d0f1a !important;
            -webkit-text-fill-color: #0d0f1a !important;
            font-weight: 800 !important;
            border: none !important;
            box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35) !important;
            text-shadow: none !important;
        }
        html.light-mode .ap-auth-submit-btn:hover {
            background: linear-gradient(135deg, #ffe08c 0%, #d97706 100%) !important;
            box-shadow: 0 6px 18px rgba(217, 119, 6, 0.5) !important;
        }
        html.light-mode .ap-auth-poster-title,
        html.light-mode #ap-auth-modal .ap-auth-poster-title,
        html.light-mode #ap-auth-poster-title {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8) !important;
        }
        html.light-mode .ap-auth-poster-sub,
        html.light-mode #ap-auth-modal .ap-auth-poster-sub,
        html.light-mode #ap-auth-poster-sub {
            color: rgba(255, 255, 255, 0.95) !important;
            -webkit-text-fill-color: rgba(255, 255, 255, 0.95) !important;
            text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8) !important;
        }
        `;
        document.head.appendChild(s);
    }

    // Dynamic Poster Image preloader (Defaults to Doraemon Nobita movie poster)
    let dynamicPosterURL = 'https://vsmov.com/storage/images/pxd9rc03EMMln3tVFdfd427Fpsi.jpg';
    if (typeof window !== 'undefined') {
        setTimeout(async () => {
            try {
                const metaImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
                if (metaImg && metaImg.startsWith('http') && !metaImg.includes('logo') && !metaImg.includes('mascot')) {
                    dynamicPosterURL = metaImg;
                    const leftPanels = document.querySelectorAll('.ap-auth-left');
                    leftPanels.forEach(p => {
                        p.style.backgroundImage = `linear-gradient(to bottom, rgba(15, 18, 30, 0.05) 0%, rgba(15, 18, 30, 0.25) 45%, rgba(15, 18, 30, 0.72) 100%), url('${dynamicPosterURL}')`;
                    });
                }
            } catch(e) {}
        }, 100);
    }

    // Toggle Password Visibility
    window.apTogglePassword = function (inputId, btnEl) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        
        btnEl.innerHTML = isPassword ? `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>` : `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>`;
    };

    let currentAuthMode = 'login';

    function switchAuthTab(mode) {
        currentAuthMode = mode;
        const isLogin    = mode === 'login';
        const isRegister = mode === 'register';
        const isForgot   = mode === 'forgot';

        // Update tab buttons (neither active if forgot)
        const tabLogin    = document.getElementById('ap-tab-login');
        const tabRegister = document.getElementById('ap-tab-register');
        if (tabLogin)    tabLogin.className    = `ap-auth-tab-btn ${isLogin ? 'active' : ''}`;
        if (tabRegister) tabRegister.className = `ap-auth-tab-btn ${isRegister ? 'active' : ''}`;

        // Update subtitle text
        const subtitleEl = document.getElementById('ap-auth-subtitle-wrap');
        if (subtitleEl) {
            if (isForgot) {
                subtitleEl.innerHTML = 'Nhập email đã đăng ký để nhận liên kết khôi phục, hoặc <a id="ap-switch-to-login" class="ap-gold-link" onclick="window.switchAuthTab(\'login\')">quay lại đăng nhập</a>';
            } else if (isLogin) {
                subtitleEl.innerHTML = 'Nếu bạn chưa có tài khoản, <a id="ap-switch-to-register" class="ap-gold-link" onclick="window.switchAuthTab(\'register\')">đăng ký ngay</a>';
            } else {
                subtitleEl.innerHTML = 'Nếu bạn đã có tài khoản, <a id="ap-switch-to-login" class="ap-gold-link" onclick="window.switchAuthTab(\'login\')">đăng nhập ngay</a>';
            }
        }

        // Update poster left column text dynamically
        const posterTitle = document.getElementById('ap-auth-poster-title');
        const posterSub   = document.getElementById('ap-auth-poster-sub');
        if (posterTitle) {
            posterTitle.textContent = isForgot
                ? 'KHÔI PHỤC MẬT KHẨU'
                : (isLogin ? 'CHÀO MỪNG BẠN ĐẾN VỚI A PHIM' : 'GIA NHẬP CỘNG ĐỒNG A PHIM');
        }
        if (posterSub) {
            posterSub.textContent = isForgot
                ? 'Điền email của bạn để nhận liên kết tạo lại mật khẩu mới.'
                : (isLogin ? 'Thỏa sức thưởng thức hàng ngàn bộ phim Vietsub HD chất lượng cao mỗi ngày.' : 'Tạo tài khoản miễn phí để lưu phim hay và thảo luận cùng bạn bè.');
        }

        // Toggle form fields
        const nameField     = document.getElementById('ap-field-name-wrap');
        const passwordField = document.getElementById('ap-field-password-wrap');
        const confirmField  = document.getElementById('ap-field-confirm-wrap');
        const forgotWrap    = document.getElementById('ap-forgot-wrap');
        const submitBtn     = document.getElementById('ap-auth-submit-btn');
        const emailInput    = document.getElementById('ap-field-email');
        const passwordInput = document.getElementById('ap-field-password');

        if (nameField)     nameField.style.display     = isRegister ? 'block' : 'none';
        if (passwordField) passwordField.style.display = isForgot ? 'none' : 'block';
        if (confirmField)  confirmField.style.display  = isRegister ? 'block' : 'none';
        if (forgotWrap)    forgotWrap.style.display    = isLogin ? 'flex' : 'none';

        if (submitBtn) {
            if (isForgot) {
                submitBtn.textContent = 'Gửi yêu cầu';
                submitBtn.classList.add('is-forgot');
            } else {
                submitBtn.textContent = isLogin ? 'Đăng nhập' : 'Đăng ký';
                submitBtn.classList.remove('is-forgot');
            }
        }

        if (emailInput) {
            emailInput.placeholder = isForgot ? 'hungcao993@gmail.com' : (isLogin ? 'Nhập email của bạn' : 'Email');
        }
        if (passwordInput) {
            if (isForgot) passwordInput.removeAttribute('required');
            else passwordInput.setAttribute('required', 'required');
        }

        if (isLogin) {
            populateSavedLoginInfo();
        }

        // Clear error/success msg
        const msgEl = document.getElementById('ap-auth-msg');
        if (msgEl) {
            msgEl.className = 'ap-auth-msg';
            msgEl.textContent = '';
        }
    }
    window.switchAuthTab = switchAuthTab;

    // Pre-populate saved login credentials
    function populateSavedLoginInfo(backdrop) {
        if (!backdrop) backdrop = document.getElementById('ap-auth-backdrop');
        if (!backdrop) return;
        try {
            const savedEmail = localStorage.getItem('ap_saved_login_email') || localStorage.getItem('cinestream_last_email') || '';
            const savedPass  = localStorage.getItem('ap_saved_login_pass') || '';
            const emailInput = backdrop.querySelector('#ap-field-email');
            const passInput  = backdrop.querySelector('#ap-field-password');
            const remInput   = backdrop.querySelector('#ap-field-remember');

            if (savedEmail && emailInput && !emailInput.value) {
                emailInput.value = savedEmail;
            }
            if (savedPass && passInput && !passInput.value) {
                passInput.value = savedPass;
            }
            if (remInput) {
                remInput.checked = true;
            }
        } catch (e) {}
    }

    // Build & Open Modal Box
    function createModal(mode) {
        let backdrop = document.getElementById('ap-auth-backdrop');
        if (backdrop) {
            switchAuthTab(mode || 'login');
            return;
        }

        injectStyles();
        currentAuthMode = mode || 'login';
        const isLogin    = currentAuthMode === 'login';
        const isRegister = currentAuthMode === 'register';
        const isForgot   = currentAuthMode === 'forgot';

        const dynamicPosterURL = window.AUTH_MODAL_POSTER || 'https://vsmov.com/storage/images/pxd9rc03EMMln3tVFdfd427Fpsi.jpg';

        backdrop = document.createElement('div');
        backdrop.id = 'ap-auth-backdrop';

        backdrop.innerHTML = `
        <div id="ap-auth-modal">
            <!-- Left Poster Column (Desktop) -->
            <div class="ap-auth-left" style="background: linear-gradient(to bottom, rgba(15, 18, 30, 0.1) 0%, rgba(15, 18, 30, 0.4) 45%, rgba(15, 18, 30, 0.85) 100%), url('${dynamicPosterURL}') center / cover no-repeat;">
                <div class="ap-auth-brand-logo">
                    <picture>
                        <source srcset="/logo-aphim1.webp" type="image/webp" />
                        <img src="/logo-aphim1.png" alt="A Phim Logo" width="240" height="100" decoding="async" />
                    </picture>
                </div>

                <div class="ap-auth-poster-text">
                    <h3 class="ap-auth-poster-title" id="ap-auth-poster-title">${isForgot ? 'KHÔI PHỤC MẬT KHẨU' : (isLogin ? 'CHÀO MỪNG BẠN ĐẾN VỚI A PHIM' : 'GIA NHẬP CỘNG ĐỒNG A PHIM')}</h3>
                    <p class="ap-auth-poster-sub" id="ap-auth-poster-sub">${isForgot ? 'Điền email của bạn để nhận liên kết tạo lại mật khẩu mới.' : (isLogin ? 'Thỏa sức thưởng thức hàng ngàn bộ phim Vietsub HD chất lượng cao mỗi ngày.' : 'Tạo tài khoản miễn phí để lưu phim hay và thảo luận cùng bạn bè.')}</p>
                </div>
            </div>

            <!-- Right Form Column (Both Mobile & Desktop) -->
            <div class="ap-auth-right">
                <button class="ap-auth-close" id="ap-auth-close-btn" aria-label="Đóng">&times;</button>

                <!-- Segmented Pill Tabs Switcher -->
                <div class="ap-auth-tabs-wrap">
                    <button type="button" class="ap-auth-tab-btn ${isLogin ? 'active' : ''}" id="ap-tab-login" onclick="window.switchAuthTab('login')">Đăng nhập</button>
                    <button type="button" class="ap-auth-tab-btn ${isRegister ? 'active' : ''}" id="ap-tab-register" onclick="window.switchAuthTab('register')">Đăng ký</button>
                </div>

                <!-- Subtitle Link -->
                <p class="ap-auth-subtitle" id="ap-auth-subtitle-wrap">
                    ${isForgot
                        ? 'Nhập email đã đăng ký để nhận liên kết khôi phục, hoặc <a id="ap-switch-to-login" class="ap-gold-link" onclick="window.switchAuthTab(\'login\')">quay lại đăng nhập</a>'
                        : (isLogin
                            ? 'Nếu bạn chưa có tài khoản, <a id="ap-switch-to-register" class="ap-gold-link" onclick="window.switchAuthTab(\'register\')">đăng ký ngay</a>'
                            : 'Nếu bạn đã có tài khoản, <a id="ap-switch-to-login" class="ap-gold-link" onclick="window.switchAuthTab(\'login\')">đăng nhập ngay</a>'
                          )
                    }
                </p>

                <div class="ap-auth-msg" id="ap-auth-msg"></div>

                <form id="ap-auth-form" autocomplete="on">
                    <!-- Tên hiển thị (Chỉ hiện khi Đăng ký) -->
                    <div class="ap-auth-field" id="ap-field-name-wrap" style="display: ${isRegister ? 'block' : 'none'};">
                        <input class="ap-auth-input" type="text" id="ap-field-name" name="name" autocomplete="name" placeholder="Tên hiển thị">
                    </div>

                    <!-- Email -->
                    <div class="ap-auth-field">
                        <input class="ap-auth-input" type="email" id="ap-field-email" name="email" autocomplete="username email" placeholder="${isForgot ? 'hungcao993@gmail.com' : (isLogin ? 'Nhập email của bạn' : 'Email')}" required>
                    </div>

                    <!-- Mật khẩu -->
                    <div class="ap-auth-field" id="ap-field-password-wrap" style="display: ${isForgot ? 'none' : 'block'};">
                        <input class="ap-auth-input" type="password" id="ap-field-password" name="password" autocomplete="current-password" placeholder="Mật khẩu" ${isForgot ? '' : 'required'}>
                        <button type="button" class="ap-pwd-toggle-btn" onclick="window.apTogglePassword('ap-field-password', this)" aria-label="Ẩn hiện mật khẩu">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    <!-- Nhập lại mật khẩu (Chỉ hiện khi Đăng ký) -->
                    <div class="ap-auth-field" id="ap-field-confirm-wrap" style="display: ${isRegister ? 'block' : 'none'};">
                        <input class="ap-auth-input" type="password" id="ap-field-confirm" name="confirm_password" autocomplete="new-password" placeholder="Nhập lại mật khẩu">
                        <button type="button" class="ap-pwd-toggle-btn" onclick="window.apTogglePassword('ap-field-confirm', this)" aria-label="Ẩn hiện mật khẩu">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    <!-- Ghi nhớ & Quên mật khẩu (Chỉ hiện khi Đăng nhập) -->
                    <div class="ap-forgot-wrap" id="ap-forgot-wrap" style="display: ${isLogin ? 'flex' : 'none'}; justify-content: space-between; align-items: center; margin-top: 4px; margin-bottom: 14px;">
                        <label id="ap-field-remember-label" for="ap-field-remember" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; user-select: none;">
                            <input type="checkbox" id="ap-field-remember" name="remember" checked style="cursor: pointer; width: 16px; height: 16px; margin: 0;">
                            <span style="cursor: pointer;">Ghi nhớ đăng nhập</span>
                        </label>
                        <a class="ap-forgot-link" id="ap-forgot-link" onclick="window.switchAuthTab('forgot')">Quên mật khẩu?</a>
                    </div>

                    <button class="ap-auth-submit-btn ${isForgot ? 'is-forgot' : ''}" type="submit" id="ap-auth-submit-btn">
                        ${isForgot ? 'Gửi yêu cầu' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
                    </button>
                </form>
            </div>
        </div>`;

        document.body.appendChild(backdrop);
        document.body.classList.add("ap-modal-open");

        // Pre-fill credentials if available
        if (isLogin) {
            populateSavedLoginInfo(backdrop);
        }

        // Event: Backdrop click close
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) removeModal(backdrop);
        });

        // Close button click
        const closeBtn = backdrop.querySelector('#ap-auth-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeModal(backdrop);
            });
        }

        // Keyboard ESC close
        document._apModalEsc = (e) => {
            if (e.key === 'Escape') removeModal(backdrop);
        };
        document.addEventListener('keydown', document._apModalEsc);

        // Focus first input
        setTimeout(() => {
            const emailInput = backdrop.querySelector('#ap-field-email');
            const passwordInput = backdrop.querySelector('#ap-field-password');
            if (emailInput && emailInput.value && passwordInput && !passwordInput.value) {
                passwordInput.focus();
            } else if (emailInput && !emailInput.value) {
                emailInput.focus();
            }
        }, 100);

        // Form Submit listener
        const form = backdrop.querySelector('#ap-auth-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await handleSubmit(backdrop);
            });
        }
    }

    // Handle Form Submit
    async function handleSubmit(backdrop) {
        const btn   = backdrop.querySelector('#ap-auth-submit-btn');
        const msgEl = backdrop.querySelector('#ap-auth-msg');
        const email = (backdrop.querySelector('#ap-field-email')?.value || '').trim();

        // Handle Forgot Password mode
        if (currentAuthMode === 'forgot') {
            if (!email) {
                showMsg(msgEl, 'Vui lòng nhập email của bạn', 'error');
                return;
            }
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = 'Đang gửi yêu cầu...';
            msgEl.className = 'ap-auth-msg';

            try {
                let result;
                if (typeof authService !== 'undefined' && authService.sendPasswordResetEmail) {
                    result = await authService.sendPasswordResetEmail(email);
                } else if (typeof authService !== 'undefined' && authService.forgotPassword) {
                    result = await authService.forgotPassword(email);
                } else {
                    result = { success: true, message: 'Yêu cầu khôi phục mật khẩu đã được gửi đến email!' };
                }

                if (result.success) {
                    showMsg(msgEl, '✓ ' + (result.message || 'Đã gửi yêu cầu khôi phục! Vui lòng kiểm tra hộp thư email của bạn.'), 'success');
                    setTimeout(() => {
                        window.switchAuthTab('login');
                        btn.disabled = false;
                    }, 2500);
                } else {
                    showMsg(msgEl, result.message || 'Không thể gửi yêu cầu, vui lòng thử lại', 'error');
                    resetBtn(btn, originalText);
                }
            } catch (err) {
                showMsg(msgEl, 'Lỗi kết nối server', 'error');
                resetBtn(btn, originalText);
            }
            return;
        }

        const isLogin  = currentAuthMode === 'login';
        const password = backdrop.querySelector('#ap-field-password')?.value || '';

        if (!email || !password) {
            showMsg(msgEl, 'Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = isLogin ? 'Đang xử lý đăng nhập...' : 'Đang xử lý đăng ký...';
        msgEl.className = 'ap-auth-msg';

        try {
            let result;
            if (isLogin) {
                if (typeof authService !== 'undefined' && authService.login) {
                    result = await authService.login(email, password);
                } else {
                    result = { success: true, message: 'Đăng nhập thành công!' };
                }
            } else {
                const name    = (backdrop.querySelector('#ap-field-name')?.value || '').trim();
                const confirm = backdrop.querySelector('#ap-field-confirm')?.value || '';

                if (!name) {
                    showMsg(msgEl, 'Vui lòng nhập tên hiển thị', 'error');
                    resetBtn(btn, originalText);
                    return;
                }

                // Check từ khóa đặc quyền Admin/BQT
                const normName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
                const reservedRegex = /\b(admin|administrator|superadmin|super\s*admin|bqt|quan\s*tri|quan\s*tri\s*vien|ban\s*quan\s*tri|moderator|mod\s*aphim|he\s*thong|system)\b/i;
                if (reservedRegex.test(normName) || normName.includes('admin') || normName.includes('bqt') || normName.includes('quan tri vien')) {
                    showMsg(msgEl, 'Tên chứa từ khóa đặc quyền (Admin, Quản trị viên, BQT...). Vui lòng chọn tên khác!', 'error');
                    resetBtn(btn, originalText);
                    return;
                }

                if (password !== confirm) {
                    showMsg(msgEl, 'Mật khẩu xác nhận không khớp', 'error');
                    resetBtn(btn, originalText);
                    return;
                }
                if (password.length < 6) {
                    showMsg(msgEl, 'Mật khẩu tối thiểu 6 ký tự', 'error');
                    resetBtn(btn, originalText);
                    return;
                }

                if (typeof authService !== 'undefined' && authService.register) {
                    result = await authService.register(email, password, name, '');
                } else {
                    result = { success: true, message: 'Đăng ký thành công!' };
                }
            }

            if (result.success) {
                // Save credentials if Remember Me is active
                const rememberMe = backdrop.querySelector('#ap-field-remember')?.checked ?? true;
                try {
                    localStorage.setItem('ap_saved_login_email', email);
                    if (rememberMe && password) {
                        localStorage.setItem('ap_saved_login_pass', password);
                    } else {
                        localStorage.removeItem('ap_saved_login_pass');
                    }
                } catch (e) {}

                showMsg(msgEl, isLogin ? '✓ Đăng nhập thành công!' : '✓ Đăng ký thành công!', 'success');
                setTimeout(() => {
                    removeModal(backdrop);
                    if (typeof updateUserUI === 'function') updateUserUI();
                    else if (window.userUI) window.userUI.update?.();
                    if (typeof window.rebuildMobileMenu === 'function') {
                        window.rebuildMobileMenu();
                    }
                    if (typeof window.rebuildBottomNav === 'function') {
                        window.rebuildBottomNav();
                    }
                }, 700);
            } else {
                showMsg(msgEl, result.message || 'Thất bại, vui lòng thử lại', 'error');
                resetBtn(btn, originalText);
            }
        } catch (err) {
            showMsg(msgEl, 'Lỗi kết nối server', 'error');
            resetBtn(btn, originalText);
        }
    }

    function showMsg(msgEl, text, type) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.className   = 'ap-auth-msg ' + type;
    }

    function resetBtn(btn, text) {
        btn.disabled    = false;
        btn.textContent = text;
    }

    function removeModal(specificBackdrop) {
        const el = specificBackdrop || document.getElementById('ap-auth-backdrop');
        if (!el) return;

        el.id = 'ap-auth-backdrop-removing';
        el.style.opacity = '0';
        const modal = el.querySelector('#ap-auth-modal');
        if (modal) {
            modal.style.transform = 'scale(0.94) translateY(20px)';
        }

        setTimeout(() => {
            el.remove();
            if (!document.getElementById('ap-auth-backdrop')) {
                document.body.classList.remove('ap-modal-open');
            }
            if (document._apModalEsc) {
                document.removeEventListener('keydown', document._apModalEsc);
                delete document._apModalEsc;
            }
        }, 250);
    }

    // Public API
    window.showAuthModal = function (mode) {
        if (_isAuthPage) {
            const page = (mode === 'register') ? 'register.html' : 'login.html';
            if (!window.location.pathname.endsWith(page)) {
                window.location.href = page;
            }
            return;
        }
        createModal(mode || 'login');
    };

    // Global Click Interceptor (Intercepts any login/register/profile action when logged out)
    if (!_isAuthPage) {
        document.addEventListener('click', function (e) {
            if (e.target.closest('#ap-auth-modal')) return;

            const el = e.target.closest('a, button, [role="button"], .sofa-login-rect-btn, .nav-auth-btn, .mm-user-wrap, .bn-tab-item');
            if (!el) return;

            // If user is ALREADY logged in, allow normal navigation (e.g. to /profile)
            const token = localStorage.getItem('cinestream_token');
            const user  = (typeof authService !== 'undefined' && authService.getCurrentUser) ? authService.getCurrentUser() : null;
            if (token || user) return;

            const text = (el.textContent || '').toLowerCase().trim();
            const href = (el.getAttribute('href') || el.getAttribute('data-href') || '').toLowerCase().trim();
            const cls  = (el.className || '').toString().toLowerCase();

            const isLoginLink    = href === 'login' || href === '/login' || href.includes('login.html') || href.includes('profile');
            const isRegisterLink = href === 'register' || href === '/register' || href.includes('register.html');
            const isAuthClass    = cls.includes('sofa-login-rect-btn') || cls.includes('nav-auth-btn') || cls.includes('mm-user-wrap');
            const isAuthText     = text.includes('đăng nhập') || text.includes('đăng ký');

            if (isLoginLink || isRegisterLink || isAuthClass || isAuthText) {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (typeof window.closeMobileMenu === 'function') window.closeMobileMenu();
                const mode = (isRegisterLink || text.includes('đăng ký')) ? 'register' : 'login';
                window.showAuthModal(mode);
            }
        }, { capture: true, passive: false });
    }

})();
