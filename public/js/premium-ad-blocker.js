/**
 * APhim — Premium Ad Blocker
 * Tự động ẩn toàn bộ quảng cáo cho thành viên PREMIUM / FAMILY
 * Hoạt động ngay sau khi đăng nhập, không cần refresh trang
 * Version: 1.0 | 2026-06-13
 */

(function () {
    'use strict';

    // ── Danh sách ID / class quảng cáo cần ẩn ──────────────────────
    const AD_SELECTORS = [
        // Catfish sticky bar (dynamic)
        '#aphim-catfish',
        '.aphim-has-catfish',

        // Welcome popup overlay (dynamic)
        '#aphim-popup-overlay',
        '#aphim-popup',

        // Inline ad blocks (static HTML)
        '.aphim-inline-ad',
        '.aphim-inline-ad--premium',
        '#aphim-inline-slideshow',
        '.inline-ad-slideshow',

        // Firebase / partner banners
        '#firebase-banner-container',
        '.firebase-banner',

        // Generic ad selectors
        '.ads-banner',
        '.ad-container',
        '.ad-box',
        '.ad-sidebar',
        '[id^="google_ads"]',
        '[id^="div-gpt-ad"]',
        'ins.adsbygoogle',

        // Popunder
        '#popunder-container',
        '.popunder-ad'
    ];

    // ── CSS ẩn tức thì (inject sớm nhất có thể) ───────────────────
    const PREMIUM_CSS = `
        /* === APhim Premium: No Ads === */
        body.aphim-premium #aphim-catfish,
        body.aphim-premium #aphim-popup-overlay,
        body.aphim-premium #aphim-popup,
        body.aphim-premium #aphim-inline-slideshow,
        body.aphim-premium .inline-ad-slideshow,
        body.aphim-premium #firebase-banner-container,
        body.aphim-premium .firebase-banner,
        body.aphim-premium .ads-banner,
        body.aphim-premium .ad-container,
        body.aphim-premium .ad-box,
        body.aphim-premium .ad-sidebar,
        body.aphim-premium [id^="google_ads"],
        body.aphim-premium [id^="div-gpt-ad"],
        body.aphim-premium ins.adsbygoogle,
        body.aphim-premium #popunder-container,
        body.aphim-premium .popunder-ad {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
            height: 0 !important;
            overflow: hidden !important;
        }

        /* Bỏ padding-bottom do catfish tạo ra */
        body.aphim-premium.aphim-has-catfish {
            padding-bottom: 0 !important;
        }

        /* Badge nhỏ trên header (tùy chọn) */
        .aphim-premium-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 20px;
            letter-spacing: 0.5px;
        }
    `;

    // ── Inject CSS ngay lập tức ────────────────────────────────────
    function injectCSS() {
        if (document.getElementById('aphim-premium-css')) return;
        const style = document.createElement('style');
        style.id = 'aphim-premium-css';
        style.textContent = PREMIUM_CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    // ── Kiểm tra user có phải premium không ───────────────────────
    function isPremiumUser() {
        try {
            const userStr = localStorage.getItem('cinestream_user');
            if (!userStr) return false;
            const user = JSON.parse(userStr);
            const sub = user.subscription;
            if (!sub) return false;

            const plan = (sub.plan || '').toUpperCase().trim();

            // Loại bỏ user FREE ngay
            if (!plan || plan === 'FREE') return false;

            // ✅ Ưu tiên 1: Kiểm tra ngày hết hạn TRƯỚC! Nếu đã quá hạn -> Hết premium
            const endDate = sub.endDate || sub.expiresAt;
            if (endDate) {
                const expiry = new Date(endDate);
                // Cho thêm 1 ngày buffer để tránh lệch múi giờ
                expiry.setDate(expiry.getDate() + 1);
                if (new Date() > expiry) return false;
            }

            // ✅ Ưu tiên 2: Kểm tra status
            if (sub.status === 'blocked' || sub.status === 'inactive') return false;
            if (sub.status === 'active') return true;

            // ✅ Fallback
            return plan.includes('PREMIUM') || plan.includes('FAMILY') || plan.includes('VIP');
        } catch (e) {
            return false;
        }
    }

    // ── Xóa / ẩn toàn bộ ad elements hiện có trong DOM ───────────
    function removeExistingAds() {
        AD_SELECTORS.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.cssText = 'display:none!important;visibility:hidden!important;height:0!important';
                    el.setAttribute('data-premium-hidden', '1');
                });
            } catch (e) {}
        });

        // Xóa class catfish khỏi body để layout không bị lệch
        document.body.classList.remove('aphim-has-catfish');
    }

    // ── Chặn catfish-banner.js và inline-ad-slideshow.js khởi động
    // Ghi đè CONFIG.catfish.enabled = false trước khi script chạy
    function blockAdScripts() {
        // Overwrite window level config nếu script chưa chạy
        if (typeof window.__aphimAdConfig === 'undefined') {
            window.__aphimAdConfig = { blocked: true };
        }
    }

    // ── MutationObserver: bắt quảng cáo được inject sau khi load ──
    let observer = null;
    function watchForNewAds() {
        if (observer) return;
        observer = new MutationObserver((mutations) => {
            let found = false;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    const id = node.id || '';
                    const cls = (node.className || '').toString();
                    if (
                        id.includes('catfish') || id.includes('popup') ||
                        id.includes('aphim-inline') || id.includes('firebase-banner') ||
                        cls.includes('ad-') || cls.includes('ads-') || cls.includes('catfish')
                    ) {
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) removeExistingAds();
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // ── Kích hoạt chế độ Premium ──────────────────────────────────
    function activatePremiumMode() {
        injectCSS();
        document.body.classList.add('aphim-premium');
        blockAdScripts();
        removeExistingAds();
        watchForNewAds();
        console.log('👑 [APhim Premium] Quảng cáo đã được ẩn — Tận hưởng trải nghiệm VIP!');
    }

    // ── Deactivate nếu user logout ─────────────────────────────────
    function deactivatePremiumMode() {
        document.body.classList.remove('aphim-premium');
        if (observer) { observer.disconnect(); observer = null; }
    }

    // ── Kiểm tra user đã đăng nhập chưa (chỉ dựa vào localStorage, 0 request) ──
    function isLoggedIn() {
        try {
            const token = localStorage.getItem('cinestream_token');
            const user  = localStorage.getItem('cinestream_user');
            return !!(token && user);
        } catch (e) {
            return false;
        }
    }

    // ── Khởi động ─────────────────────────────────────────────────
    function init() {
        // ✅ QUAN TRỌNG: Khách vãng lai (chưa đăng nhập) → thoát ngay lập tức
        // Không đọc dữ liệu, không gọi API, không tốn token Railway
        if (!isLoggedIn()) {
            // Chỉ lắng nghe sự kiện login để kích hoạt khi họ đăng nhập
            window.addEventListener('auth:loginSuccess', () => {
                if (isPremiumUser()) activatePremiumMode();
            });
            window.addEventListener('auth:profileSynced', handleProfileSync);
            return; // ← Dừng tại đây cho khách vãng lai
        }

        // --- Từ đây chỉ chạy khi user đã đăng nhập ---

        if (isPremiumUser()) {
            // Inject CSS ngay lập tức để tránh flash quảng cáo
            injectCSS();
            document.documentElement.classList.add('aphim-premium-pre');

            if (document.body) {
                activatePremiumMode();
            } else {
                document.addEventListener('DOMContentLoaded', activatePremiumMode);
            }
        }

        // Lắng nghe sync profile (khi Railway trả về dữ liệu mới)
        window.addEventListener('auth:profileSynced', handleProfileSync);

        // Lắng nghe logout để tắt premium mode
        window.addEventListener('auth:logout', deactivatePremiumMode);
    }

    // ── Xử lý khi profile được sync từ server ─────────────────────
    function handleProfileSync(e) {
        const user = e.detail;
        const sub  = user?.subscription;
        const plan = (sub?.plan || '').toUpperCase();
        const endDate = sub?.endDate || sub?.expiresAt;
        const isActive = (plan === 'PREMIUM' || plan === 'FAMILY') &&
                         (!endDate || new Date() < new Date(endDate));
        if (isActive) {
            activatePremiumMode();
        } else {
            deactivatePremiumMode();
        }
    }

    // ── Chạy ngay khi script load ─────────────────────────────────
    init();

})();
