/**
 * A PHIM - Auth Modal (Login / Register / Forgot Password)
 * Ultra-Fast Apple Glassmorphic Modal with GPU-Accelerated 120fps Sliding Segmented Tabs
 * - 0ms Instant response on pointerdown/click
 * - Single GPU compositing layer (Zero double-blur jank)
 * - Pure Declarative CSS Mode Switching
 */
(function () {
    'use strict';

    const _currentPage = window.location.pathname.replace(/.*\//, '');
    const _isAuthPage  = _currentPage === 'login.html' || _currentPage === 'register.html';

    let _cachedEmail = '';
    let _cachedPass  = '';
    let currentAuthMode = 'login';

    function loadSavedCredentials() {
        try {
            _cachedEmail = localStorage.getItem('ap_saved_login_email') || localStorage.getItem('cinestream_last_email') || '';
            _cachedPass  = localStorage.getItem('ap_saved_login_pass') || '';
        } catch (e) {
            _cachedEmail = '';
            _cachedPass  = '';
        }
    }

    // Inject High-Performance Styles
    function injectStyles() {
        if (document.getElementById('ap-auth-modal-css')) return;
        const s = document.createElement('style');
        s.id = 'ap-auth-modal-css';
        s.textContent = `
        /* ── Backdrop (High Performance Solid Dim, Zero nested blur jank) ── */
        #ap-auth-backdrop {
            position: fixed; inset: 0; z-index: 999999;
            background: rgba(0, 0, 0, 0.65);
            display: flex; align-items: center; justify-content: center;
            padding: 16px;
            animation: ap-modal-fadein 0.15s ease-out;
            box-sizing: border-box;
            contain: strict;
        }
        @keyframes ap-modal-fadein {
            from { opacity: 0; } to { opacity: 1; }
        }

        /* ── Modal Card (Ultra Sleek Dark Glass, 120fps GPU composited) ── */
        #ap-auth-modal {
            width: 100%; max-width: 860px;
            background: rgba(18, 22, 34, 0.92) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border-radius: 24px;
            overflow: hidden;
            display: flex;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.7), 0 0 30px rgba(252, 213, 118, 0.1) !important;
            animation: ap-modal-slidein 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            box-sizing: border-box;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            contain: layout style;
        }
        #ap-auth-modal::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
            pointer-events: none;
            z-index: 25;
        }
        @keyframes ap-modal-slidein {
            from { transform: translate3d(0, 10px, 0) scale(0.97); opacity: 0; }
            to   { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
        }

        /* Fixed Dimensions for Stable Geometry */
        @media (min-width: 641px) {
            #ap-auth-modal {
                width: 880px !important;
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
                padding: 40px 36px 28px 36px !important;
                justify-content: flex-start !important;
            }
        }

        /* ── Desktop Left Panel (Poster Column) ── */
        .ap-auth-left {
            width: 380px; flex-shrink: 0;
            background: linear-gradient(to bottom, rgba(15, 18, 30, 0.05) 0%, rgba(15, 18, 30, 0.25) 45%, rgba(15, 18, 30, 0.72) 100%),
                        url('/images/auth-poster-doraemon.jpg') center / cover no-repeat;
            display: flex; flex-direction: column;
            justify-content: flex-end; align-items: center;
            padding: 36px 28px 44px 28px;
            box-sizing: border-box;
            position: relative;
            contain: paint;
        }
        @media (max-width: 640px) {
            .ap-auth-left { display: none !important; }
            #ap-auth-modal {
                width: min(420px, 94vw) !important;
                min-height: 480px !important;
                max-height: 92vh !important;
            }
            .ap-auth-right {
                height: 100% !important;
                padding: 54px 20px 24px 20px !important;
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
            min-height: 120px;
        }
        .ap-auth-poster-title {
            font-family: inherit;
            font-size: 24px; font-weight: 700; color: #ffffff !important;
            line-height: 1.35; margin: 0 0 12px 0;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            text-align: center;
            font-style: normal;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
        }
        .ap-auth-poster-sub {
            font-family: inherit;
            font-size: 14px; color: rgba(255, 255, 255, 0.92) !important;
            margin: 0; font-weight: 400; line-height: 1.45;
            text-align: center;
            max-width: 290px;
            font-style: normal;
            text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
        }

        /* ── Right Panel (Form Area) ── */
        .ap-auth-right {
            flex: 1; padding: 44px 30px 28px 30px;
            display: flex; flex-direction: column;
            justify-content: flex-start !important;
            position: relative;
            overflow-y: auto;
            box-sizing: border-box;
            isolation: isolate;
            transform: translateZ(0);
            contain: paint;
        }

        /* Close Button X */
        .ap-auth-close {
            position: absolute; top: 14px; right: 14px;
            width: 32px; height: 32px; border-radius: 50%;
            background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.18);
            color: rgba(255, 255, 255, 0.85); cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
            transition: background 0.12s, color 0.12s, transform 0.12s;
            z-index: 10; outline: none;
            touch-action: manipulation;
        }
        .ap-auth-close:hover {
            background: rgba(255, 255, 255, 0.25); color: #ffffff;
            transform: rotate(90deg);
        }

        /* ── Segmented Sliding Pill Tabs (Apple-Grade 120fps Smooth Transition) ── */
        .ap-auth-tabs-wrap {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: rgba(0, 0, 0, 0.35);
            border-radius: 9999px;
            padding: 3px;
            margin-bottom: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0 !important;
            width: 100%;
            box-sizing: border-box;
            isolation: isolate;
        }

        /* Pure Hardware Accelerated Sliding Pill */
        .ap-tab-slider-pill {
            position: absolute;
            top: 3px;
            bottom: 3px;
            left: 3px;
            width: calc(50% - 3px);
            background: rgba(255, 255, 255, 0.24);
            border-radius: 9999px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3);
            transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
            pointer-events: none;
            z-index: 1;
            transform: translate3d(0, 0, 0);
            will-change: transform;
        }

        #ap-auth-modal[data-mode="register"] .ap-tab-slider-pill {
            transform: translate3d(100%, 0, 0);
        }
        #ap-auth-modal[data-mode="forgot"] .ap-tab-slider-pill {
            opacity: 0;
        }

        .ap-auth-tab-btn {
            position: relative;
            z-index: 2;
            background: transparent !important;
            border: none !important;
            color: rgba(255, 255, 255, 0.65);
            font-size: 14px;
            font-weight: 500;
            padding: 9px 0;
            cursor: pointer;
            text-align: center;
            border-radius: 9999px;
            transition: color 0.12s ease, font-weight 0.12s ease;
            user-select: none;
            outline: none;
            font-family: inherit;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }
        .ap-auth-tab-btn:hover {
            color: #ffffff;
        }

        #ap-auth-modal[data-mode="login"] .ap-auth-tab-btn.tab-login {
            color: #ffffff !important;
            font-weight: 700 !important;
        }
        #ap-auth-modal[data-mode="register"] .ap-auth-tab-btn.tab-register {
            color: #ffffff !important;
            font-weight: 700 !important;
        }

        .ap-auth-subtitle {
            font-size: 13.5px; color: #d1d5db;
            margin: 0 0 14px; text-align: left;
            line-height: 1.4;
            min-height: 20px;
        }
        .ap-gold-link {
            color: #fcd576 !important; font-weight: 700;
            cursor: pointer; text-decoration: none;
            transition: color 0.12s ease;
            background: none; border: none; padding: 0; font-family: inherit; font-size: inherit;
            display: inline;
            touch-action: manipulation;
        }
        .ap-gold-link:hover {
            color: #ffe18d !important;
            text-decoration: underline;
        }

        /* ── Form Inputs (Ultra-Fast GPU Typing, 0ms Lag) ── */
        .ap-auth-field {
            margin-bottom: 12px; position: relative;
            contain: layout style;
        }
        .ap-auth-input {
            width: 100%; box-sizing: border-box;
            background: rgba(0, 0, 0, 0.32);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px; padding: 12px 16px;
            color: #ffffff; font-size: 15px; font-family: inherit;
            outline: none;
            caret-color: #fcd576;
            transform: translateZ(0);
            -webkit-appearance: none;
            appearance: none;
            transition: border-color 0.1s ease, box-shadow 0.1s ease;
        }
        @media (max-width: 640px) {
            .ap-auth-input { font-size: 16px !important; }
        }
        .ap-auth-input:focus {
            border-color: #fcd576;
            background: rgba(0, 0, 0, 0.45);
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
            transition: color 0.12s ease; outline: none;
            touch-action: manipulation;
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
            touch-action: manipulation;
        }
        #ap-field-remember {
            appearance: auto !important;
            -webkit-appearance: checkbox !important;
            width: 16px !important;
            height: 16px !important;
            accent-color: #fcd576 !important;
            cursor: pointer !important;
            margin: 0 !important;
        }
        .ap-forgot-link {
            font-size: 13px; color: #9ca3af;
            cursor: pointer; text-decoration: none;
            transition: color 0.12s ease; font-weight: 500;
            background: none; border: none; padding: 0; font-family: inherit;
            touch-action: manipulation;
        }
        .ap-forgot-link:hover { color: #fcd576; }

        /* ── Submit Button ── */
        .ap-auth-submit-btn {
            width: 100%; padding: 13px;
            background: linear-gradient(135deg, #fff3b0 0%, #fcd576 45%, #f59e0b 100%);
            color: #0d0f1a; font-size: 15px; font-weight: 800;
            border: 1.5px solid rgba(255, 248, 210, 0.85);
            border-radius: 14px; cursor: pointer;
            transition: transform 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
            margin-top: 4px; letter-spacing: 0.02em;
            box-shadow: 0 8px 22px rgba(252, 213, 118, 0.35), 0 2px 6px rgba(0, 0, 0, 0.4);
            text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
            outline: none;
            touch-action: manipulation;
        }
        .ap-auth-submit-btn:hover {
            background: linear-gradient(135deg, #ffffff 0%, #ffe18d 45%, #e69d05 100%);
            transform: translateY(-1px);
            box-shadow: 0 12px 28px rgba(252, 213, 118, 0.5), 0 4px 10px rgba(0, 0, 0, 0.5);
        }
        .ap-auth-submit-btn:active {
            transform: translateY(1px);
        }
        .ap-auth-submit-btn:disabled {
            opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
        }

        /* Message */
        .ap-auth-msg {
            font-size: 13.5px; padding: 10px 14px;
            border-radius: 12px; margin-bottom: 12px;
            display: none; font-weight: 500;
        }
        .ap-auth-msg.error   { background: rgba(239,68,68,0.22);  color: #fca5a5; display: block; border-left: 4px solid #ef4444; }
        .ap-auth-msg.success { background: rgba(16,185,129,0.22); color: #6ee7b7; display: block; border-left: 4px solid #10b981; }

        body.ap-modal-open {
            overflow: hidden !important;
        }

        /* ── DECLARATIVE 0ms MODE SWITCHING RULES ── */
        .ap-mode-login,
        .ap-mode-register,
        .ap-mode-forgot {
            display: none !important;
        }

        /* LOGIN MODE */
        #ap-auth-modal[data-mode="login"] .ap-mode-login { display: block !important; }
        #ap-auth-modal[data-mode="login"] .ap-forgot-wrap { display: flex !important; }
        #ap-auth-modal[data-mode="login"] .ap-not-forgot { display: block !important; }

        /* REGISTER MODE */
        #ap-auth-modal[data-mode="register"] .ap-mode-register { display: block !important; }
        #ap-auth-modal[data-mode="register"] .ap-forgot-wrap { display: none !important; }
        #ap-auth-modal[data-mode="register"] .ap-not-forgot { display: block !important; }

        /* FORGOT MODE */
        #ap-auth-modal[data-mode="forgot"] .ap-mode-forgot { display: block !important; }
        #ap-auth-modal[data-mode="forgot"] .ap-mode-login,
        #ap-auth-modal[data-mode="forgot"] .ap-mode-register,
        #ap-auth-modal[data-mode="forgot"] .ap-not-forgot,
        #ap-auth-modal[data-mode="forgot"] .ap-forgot-wrap { display: none !important; }
        
        #ap-auth-modal[data-mode="forgot"] .ap-auth-submit-btn {
            background: linear-gradient(135deg, #b5c6ff 0%, #9cb0ff 100%) !important;
            color: #0c0f1d !important;
            border: 1.5px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 8px 22px rgba(156, 176, 255, 0.35), 0 2px 6px rgba(0, 0, 0, 0.4) !important;
            text-shadow: none !important;
        }
        #ap-auth-modal[data-mode="forgot"] .ap-auth-submit-btn:hover {
            background: linear-gradient(135deg, #c7d5ff 0%, #adbfff 100%) !important;
            box-shadow: 0 12px 28px rgba(156, 176, 255, 0.5), 0 4px 10px rgba(0, 0, 0, 0.5) !important;
        }

        /* ── Light Mode Overrides ── */
        html.light-mode #ap-auth-backdrop {
            background: rgba(30, 24, 15, 0.6) !important;
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
        html.light-mode .ap-pwd-toggle-btn { color: #57534e !important; }
        html.light-mode .ap-pwd-toggle-btn:hover { color: #d97706 !important; }
        html.light-mode .ap-auth-tabs-wrap {
            background: #eae3d5 !important;
            border: 1px solid #d6cebf !important;
        }
        html.light-mode .ap-tab-slider-pill {
            background: #ffffff !important;
            box-shadow: 0 2px 8px rgba(78, 64, 45, 0.15) !important;
        }
        html.light-mode .ap-auth-tab-btn { color: #57534e !important; }
        html.light-mode #ap-auth-modal[data-mode="login"] .ap-auth-tab-btn.tab-login,
        html.light-mode #ap-auth-modal[data-mode="register"] .ap-auth-tab-btn.tab-register {
            color: #1c1917 !important;
            font-weight: 800 !important;
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
        html.light-mode #ap-auth-modal .ap-auth-poster-title {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8) !important;
        }
        html.light-mode .ap-auth-poster-sub,
        html.light-mode #ap-auth-modal .ap-auth-poster-sub {
            color: rgba(255, 255, 255, 0.95) !important;
            -webkit-text-fill-color: rgba(255, 255, 255, 0.95) !important;
            text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8) !important;
        }
        `;
        document.head.appendChild(s);
    }

    // Cinema Poster Image
    const defaultPosterURL = '/images/auth-poster-doraemon.jpg';

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

    /**
     * Instant 0ms Tab Switcher
     */
    function switchAuthTab(mode) {
        if (currentAuthMode === mode) return;
        currentAuthMode = mode;
        const modal = document.getElementById('ap-auth-modal');
        if (!modal) return;

        // 1. Instant CSS data-mode attribute switch
        modal.setAttribute('data-mode', mode);

        // 2. Clear error/success
        const msgEl = document.getElementById('ap-auth-msg');
        if (msgEl) {
            msgEl.className = 'ap-auth-msg';
            msgEl.textContent = '';
        }

        // 3. Fast Input prefill & state
        const emailInput    = document.getElementById('ap-field-email');
        const passwordInput = document.getElementById('ap-field-password');

        if (mode === 'forgot') {
            if (passwordInput) passwordInput.removeAttribute('required');
            if (emailInput) emailInput.placeholder = 'hungcao993@gmail.com';
        } else if (mode === 'register') {
            if (passwordInput) passwordInput.setAttribute('required', 'required');
            if (emailInput) emailInput.placeholder = 'Email';
        } else {
            // mode === 'login'
            if (passwordInput) passwordInput.setAttribute('required', 'required');
            if (emailInput) {
                emailInput.placeholder = 'Nhập email của bạn';
                if (!emailInput.value && _cachedEmail) emailInput.value = _cachedEmail;
            }
            if (passwordInput && !passwordInput.value && _cachedPass) {
                passwordInput.value = _cachedPass;
            }
        }
    }
    window.switchAuthTab = switchAuthTab;

    // Pre-populate saved login credentials
    function populateSavedLoginInfo(backdrop) {
        if (!backdrop) backdrop = document.getElementById('ap-auth-backdrop');
        if (!backdrop) return;
        loadSavedCredentials();
        const emailInput = backdrop.querySelector('#ap-field-email');
        const passInput  = backdrop.querySelector('#ap-field-password');
        const remInput   = backdrop.querySelector('#ap-field-remember');

        if (_cachedEmail && emailInput && !emailInput.value) {
            emailInput.value = _cachedEmail;
        }
        if (_cachedPass && passInput && !passInput.value) {
            passInput.value = _cachedPass;
        }
        if (remInput) {
            remInput.checked = true;
        }
    }

    // Build & Open Modal Box
    function createModal(mode) {
        let backdrop = document.getElementById('ap-auth-backdrop');
        if (backdrop) {
            switchAuthTab(mode || 'login');
            return;
        }

        injectStyles();
        loadSavedCredentials();
        currentAuthMode = mode || 'login';

        const posterURL = window.AUTH_MODAL_POSTER || defaultPosterURL;

        backdrop = document.createElement('div');
        backdrop.id = 'ap-auth-backdrop';

        backdrop.innerHTML = `
        <div id="ap-auth-modal" data-mode="${currentAuthMode}">
            <!-- Left Poster Column (Desktop) -->
            <div class="ap-auth-left" style="background: linear-gradient(to bottom, rgba(15, 18, 30, 0.1) 0%, rgba(15, 18, 30, 0.4) 45%, rgba(15, 18, 30, 0.85) 100%), url('${posterURL}') center / cover no-repeat;">
                <div class="ap-auth-brand-logo">
                    <picture>
                        <source srcset="/logo-aphim1.webp" type="image/webp" />
                        <img src="/logo-aphim1.png" alt="A Phim Logo" width="240" height="100" decoding="async" />
                    </picture>
                </div>

                <div class="ap-auth-poster-text">
                    <!-- Login Poster Text -->
                    <div class="ap-mode-login">
                        <h3 class="ap-auth-poster-title">CHÀO MỪNG BẠN ĐẾN VỚI A PHIM</h3>
                        <p class="ap-auth-poster-sub">Thỏa sức thưởng thức hàng ngàn bộ phim Vietsub HD chất lượng cao mỗi ngày.</p>
                    </div>
                    <!-- Register Poster Text -->
                    <div class="ap-mode-register">
                        <h3 class="ap-auth-poster-title">GIA NHẬP CỘNG ĐỒNG A PHIM</h3>
                        <p class="ap-auth-poster-sub">Tạo tài khoản miễn phí để lưu phim hay và thảo luận cùng bạn bè.</p>
                    </div>
                    <!-- Forgot Poster Text -->
                    <div class="ap-mode-forgot">
                        <h3 class="ap-auth-poster-title">KHÔI PHỤC MẬT KHẨU</h3>
                        <p class="ap-auth-poster-sub">Điền email của bạn để nhận liên kết tạo lại mật khẩu mới.</p>
                    </div>
                </div>
            </div>

            <!-- Right Form Column (Both Mobile & Desktop) -->
            <div class="ap-auth-right">
                <button class="ap-auth-close" id="ap-auth-close-btn" aria-label="Đóng">&times;</button>

                <!-- Segmented Sliding Pill Tabs Switcher -->
                <div class="ap-auth-tabs-wrap">
                    <div class="ap-tab-slider-pill"></div>
                    <button type="button" class="ap-auth-tab-btn tab-login" data-tab-action="login">Đăng nhập</button>
                    <button type="button" class="ap-auth-tab-btn tab-register" data-tab-action="register">Đăng ký</button>
                </div>

                <!-- Subtitle Links (Declarative 0ms Switch) -->
                <div class="ap-auth-subtitle" id="ap-auth-subtitle-wrap">
                    <div class="ap-mode-login">
                        Nếu bạn chưa có tài khoản, <button type="button" class="ap-gold-link" data-tab-action="register">đăng ký ngay</button>
                    </div>
                    <div class="ap-mode-register">
                        Nếu bạn đã có tài khoản, <button type="button" class="ap-gold-link" data-tab-action="login">đăng nhập ngay</button>
                    </div>
                    <div class="ap-mode-forgot">
                        Nhập email đã đăng ký để nhận liên kết khôi phục, hoặc <button type="button" class="ap-gold-link" data-tab-action="login">quay lại đăng nhập</button>
                    </div>
                </div>

                <div class="ap-auth-msg" id="ap-auth-msg"></div>

                <form id="ap-auth-form" autocomplete="on">
                    <!-- Tên hiển thị (Chỉ hiện khi Đăng ký) -->
                    <div class="ap-auth-field ap-mode-register" id="ap-field-name-wrap">
                        <input class="ap-auth-input" type="text" id="ap-field-name" name="name" autocomplete="name" placeholder="Tên hiển thị" spellcheck="false" autocorrect="off" autocapitalize="none" data-gramm="false">
                    </div>

                    <!-- Email (Luôn hiện) -->
                    <div class="ap-auth-field" id="ap-field-email-wrap">
                        <input class="ap-auth-input" type="email" id="ap-field-email" name="email" autocomplete="username email" placeholder="${currentAuthMode === 'forgot' ? 'hungcao993@gmail.com' : (currentAuthMode === 'login' ? 'Nhập email của bạn' : 'Email')}" spellcheck="false" autocorrect="off" autocapitalize="none" data-gramm="false" required>
                    </div>

                    <!-- Mật khẩu (Hiện khi Login & Register) -->
                    <div class="ap-auth-field ap-not-forgot" id="ap-field-password-wrap">
                        <input class="ap-auth-input" type="password" id="ap-field-password" name="password" autocomplete="current-password" placeholder="Mật khẩu" spellcheck="false" autocorrect="off" autocapitalize="none" data-gramm="false" required>
                        <button type="button" class="ap-pwd-toggle-btn" onclick="window.apTogglePassword('ap-field-password', this)" aria-label="Ẩn hiện mật khẩu">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    <!-- Nhập lại mật khẩu (Chỉ hiện khi Đăng ký) -->
                    <div class="ap-auth-field ap-mode-register" id="ap-field-confirm-wrap">
                        <input class="ap-auth-input" type="password" id="ap-field-confirm" name="confirm_password" autocomplete="new-password" placeholder="Nhập lại mật khẩu" spellcheck="false" autocorrect="off" autocapitalize="none" data-gramm="false">
                        <button type="button" class="ap-pwd-toggle-btn" onclick="window.apTogglePassword('ap-field-confirm', this)" aria-label="Ẩn hiện mật khẩu">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>

                    <!-- Ghi nhớ & Quên mật khẩu (Chỉ hiện khi Đăng nhập) -->
                    <div class="ap-forgot-wrap ap-mode-login" id="ap-forgot-wrap">
                        <label id="ap-field-remember-label" for="ap-field-remember">
                            <input type="checkbox" id="ap-field-remember" name="remember" checked>
                            <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <button type="button" class="ap-forgot-link" id="ap-forgot-link" data-tab-action="forgot">Quên mật khẩu?</button>
                    </div>

                    <!-- Submit Button -->
                    <button class="ap-auth-submit-btn" type="submit" id="ap-auth-submit-btn">
                        <span class="ap-mode-login">Đăng nhập</span>
                        <span class="ap-mode-register">Đăng ký</span>
                        <span class="ap-mode-forgot">Gửi yêu cầu</span>
                    </button>
                </form>
            </div>
        </div>`;

        document.body.appendChild(backdrop);
        document.body.classList.add("ap-modal-open");

        if (currentAuthMode === 'login') {
            populateSavedLoginInfo(backdrop);
        }

        // Instant Touch / Pointer / Click Handling for 0ms tab transitions
        const handleTabTrigger = (e) => {
            const actionBtn = e.target.closest('[data-tab-action]');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                const targetTab = actionBtn.getAttribute('data-tab-action');
                switchAuthTab(targetTab);
            }
        };

        backdrop.addEventListener('pointerdown', handleTabTrigger, { passive: false });
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                removeModal(backdrop);
                return;
            }
            const closeBtn = e.target.closest('#ap-auth-close-btn');
            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                removeModal(backdrop);
            }
        });

        // Keyboard ESC close
        document._apModalEsc = (e) => {
            if (e.key === 'Escape') removeModal(backdrop);
        };
        document.addEventListener('keydown', document._apModalEsc);

        // Form Submit & Key Event Isolation (Stops background search/hotkey interference while typing)
        const form = backdrop.querySelector('#ap-auth-form');
        if (form) {
            form.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape' && e.key !== 'Tab' && e.key !== 'Enter') {
                    e.stopPropagation();
                }
            }, { passive: true });

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

        if (currentAuthMode === 'forgot') {
            if (!email) {
                showMsg(msgEl, 'Vui lòng nhập email của bạn', 'error');
                return;
            }
            btn.disabled = true;
            const originalText = btn.innerHTML;
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
                        btn.innerHTML = originalText;
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
        const originalText = btn.innerHTML;
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
                const rememberMe = backdrop.querySelector('#ap-field-remember')?.checked ?? true;
                try {
                    localStorage.setItem('ap_saved_login_email', email);
                    if (rememberMe && password) {
                        localStorage.setItem('ap_saved_login_pass', password);
                    } else {
                        localStorage.removeItem('ap_saved_login_pass');
                    }
                    _cachedEmail = email;
                    _cachedPass  = rememberMe ? password : '';
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
                }, 600);
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

    function resetBtn(btn, originalHTML) {
        btn.disabled  = false;
        btn.innerHTML = originalHTML;
    }

    function removeModal(specificBackdrop) {
        const el = specificBackdrop || document.getElementById('ap-auth-backdrop');
        if (!el) return;

        el.id = 'ap-auth-backdrop-removing';
        el.style.opacity = '0';
        const modal = el.querySelector('#ap-auth-modal');
        if (modal) {
            modal.style.transform = 'translate3d(0, 10px, 0) scale(0.97)';
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
        }, 160);
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

    // Global Click Interceptor
    if (!_isAuthPage) {
        document.addEventListener('click', function (e) {
            if (e.target.closest('#ap-auth-modal')) return;

            const el = e.target.closest('a, button, [role="button"], .sofa-login-rect-btn, .nav-auth-btn, .mm-user-wrap, .bn-tab-item');
            if (!el) return;

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
