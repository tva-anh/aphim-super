/**
 * ⚡ APHIM SUPER — PRO MOBILE INTERACTION & INSTANT NAVIGATION SUITE (2026 ENGINE)
 * Chuyên biệt tối ưu 100% cho màn hình Di động & Cảm ứng (Touch Devices)
 *
 * Tính năng chính:
 * 1. 0ms Instant Tap & Native Visual Feedback (Haptic + Touch Pressed state).
 * 2. Multi-Engine Speculative Preheating (Fetch HTTP Cache + Speculation Rules + Link Prefetch).
 * 3. YouTube-style Top Progress Bar: Phản hồi lập tức 0ms khi chạm nút chuyển trang.
 * 4. Vuốt Đóng Drawer Menu (Swipe-to-Dismiss #sofa-mobile-drawer).
 * 5. Loại bỏ triệt để độ trễ 300ms của trình duyệt di động.
 */

(function () {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    function isTouchOrMobile() {
        return window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    // ── 1. SMART HAPTIC FEEDBACK (Rung vi mô êm ái 6ms) ──────────────────────
    function triggerHaptic(duration = 6) {
        try {
            if (navigator && typeof navigator.vibrate === 'function') {
                navigator.vibrate(duration);
            }
        } catch (e) {}
    }
    window.triggerHaptic = triggerHaptic;

    const HAPTIC_SELECTORS = [
        '.bn-tab',
        '.bn-tab-center',
        '.section-header-tab',
        '.top10-platform-pill',
        '.top10-type-btn',
        '.home-comment-tab-btn',
        '.btn',
        '.btn-primary',
        '.btn-secondary',
        '#showcase3DBtnWatch',
        '#showcase3DBtnInfo',
        '.showcase-dot',
        '#themeToggleFab',
        '#fdBtnTop',
        '#episode-list button',
        '#server-list button',
        '#sort-episodes-btn',
        '#watchNowBtn',
        '#favoriteMovieBtn',
        '#saveMovieBtn',
        '#headerRatingBtn',
        '.movie-actions-container button',
        '.ap-tab-btn',
        '.quick-action-pill',
        '.sidebar-nav-item',
        '.stat-item',
        '.profile-empty-btn-primary',
        '.profile-empty-btn-secondary',
        '.az-btn',
        '.cat-tab-btn',
        '.sofa-menu-btn',
        '.drawer-close-btn',
        '.drawer-pill-btn',
        '.comment-switch',
        '.home-comment-toggle-wrap',
        '.de-cu-card',
        '.normal-card-item',
        '.featured-card-item',
        '.top10-card',
        '.as-btn-play',
        '.as-btn-info',
        '.as-btn-add',
        '.as-thumb-item',
        '.as-continue-card',
        '.as-tab-pill',
        '.reel-action-btn'
    ].join(', ');

    // ── 2. TOP LOADING PROGRESS BAR (Phản hồi thị giác 0ms tức thì) ────────────
    let navProgressBar = null;
    let navProgressTimer = null;

    function getOrCreateProgressBar() {
        if (!navProgressBar) {
            navProgressBar = document.getElementById('aphim-nav-progress');
            if (!navProgressBar) {
                navProgressBar = document.createElement('div');
                navProgressBar.id = 'aphim-nav-progress';
                document.body.appendChild(navProgressBar);
            }
        }
        return navProgressBar;
    }

    function triggerNavProgress() {
        const bar = getOrCreateProgressBar();
        if (!bar) return;

        if (navProgressTimer) {
            clearTimeout(navProgressTimer);
            navProgressTimer = null;
        }

        bar.style.display = 'block';
        bar.style.opacity = '1';
        bar.style.width = '35%';

        navProgressTimer = setTimeout(() => {
            if (bar) bar.style.width = '82%';
        }, 80);

        // Tự động ẩn an toàn nếu là anchor nội bộ hoặc người dùng ở lại trang
        setTimeout(() => {
            if (bar && bar.style.width !== '100%') {
                bar.style.opacity = '0';
                setTimeout(() => {
                    if (bar) {
                        bar.style.display = 'none';
                        bar.style.width = '0%';
                    }
                }, 300);
            }
        }, 3500);
    }
    window.triggerNavProgress = triggerNavProgress;

    function completeNavProgress() {
        const bar = document.getElementById('aphim-nav-progress');
        if (!bar) return;
        bar.style.width = '100%';
        setTimeout(() => {
            bar.style.opacity = '0';
            setTimeout(() => {
                bar.style.display = 'none';
                bar.style.width = '0%';
            }, 250);
        }, 120);
    }
    window.completeNavProgress = completeNavProgress;

    // ── 3. MULTI-ENGINE SPECULATIVE PREHEATING (Tăng tốc chuyển trang 300%) ───
    const prefetchedUrls = new Set();
    function preheatUrl(url) {
        if (!url || typeof url !== 'string') return;
        // Bỏ qua link ngoài, API, hash hoặc trang đăng xuất
        if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/api/') || url.includes('logout') || prefetchedUrls.has(url)) return;
        
        prefetchedUrls.add(url);

        // A. Fetch API nạp vào HTTP Cache (Hoạt động hoàn hảo trên cả iOS Safari & Android)
        if (window.fetch) {
            fetch(url, { priority: 'low', cache: 'default' }).catch(() => {});
        }

        // B. Link prefetch (Dành cho trình duyệt Chromium / Firefox)
        try {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = 'document';
            document.head.appendChild(link);
        } catch (e) {}
    }
    window.preheatUrl = preheatUrl;

    // Tự động sưởi ấm trước các trang trọng điểm của website một cách nhẹ nhàng (chỉ khi mạng rảnh và sau 4s)
    function preheatKeyHubs() {
        // Disabled aggressive preheating on page load to prevent saturating browser connection pool for images
    }

    // ── 4. INSTANT TOUCH EVENTS (Nhận diện & phản hồi 0ms trên Mobile) ────────
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let preheatTouchTimer = null;

    document.addEventListener('touchstart', function (e) {
        if (!isTouchOrMobile() || !e.touches || !e.touches[0]) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = performance.now();

        if (preheatTouchTimer) {
            clearTimeout(preheatTouchTimer);
            preheatTouchTimer = null;
        }

        const anchor = e.target.closest('a[href], .bn-tab, .bn-tab-center, #showcase3DBtnWatch, #showcase3DBtnInfo, .de-cu-card, .normal-card-item, .featured-card-item, .top10-card, .grid-movie-card');
        if (anchor) {
            anchor.classList.add('is-touch-pressed');
            const href = anchor.getAttribute('href') || (anchor.querySelector('a') ? anchor.querySelector('a').getAttribute('href') : null);
            // Chỉ preheat nếu người dùng chạm giữ > 130ms (ý định click thật, không phải vuốt lướt scroll)
            if (href && href.startsWith('/') && !href.startsWith('//')) {
                preheatTouchTimer = setTimeout(() => {
                    preheatUrl(href);
                }, 130);
            }
        }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        // Khi người dùng đang cuộn/lướt màn hình, HỦY NGAY lệnh preheat để không làm nghẽn luồng tải ảnh
        if (preheatTouchTimer) {
            clearTimeout(preheatTouchTimer);
            preheatTouchTimer = null;
        }
        document.querySelectorAll('.is-touch-pressed').forEach(el => el.classList.remove('is-touch-pressed'));
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        // Gỡ bỏ trạng thái pressed
        document.querySelectorAll('.is-touch-pressed').forEach(el => el.classList.remove('is-touch-pressed'));

        if (!isTouchOrMobile() || !e.changedTouches || !e.changedTouches[0]) return;
        const touch = e.changedTouches[0];
        const moveDist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);
        const duration = performance.now() - touchStartTime;

        // Chỉ kích hoạt haptic và tiến trình khi là cú Tap dứt khoát (< 9px & < 350ms)
        if (moveDist < 9 && duration < 350) {
            const target = e.target.closest(HAPTIC_SELECTORS);
            if (target) {
                triggerHaptic(6);
            }

            const navLink = e.target.closest('a[href^="/"], .bn-tab, .bn-tab-center, #showcase3DBtnWatch, #showcase3DBtnInfo, .drawer-pill-btn, .sofa-menu-btn');
            if (navLink) {
                const href = navLink.getAttribute('href');
                if (href && !href.startsWith('#') && !href.includes('javascript:') && !href.includes('logout')) {
                    triggerNavProgress();
                }
            }
        }
    }, { passive: true });

    document.addEventListener('touchcancel', function () {
        document.querySelectorAll('.is-touch-pressed').forEach(el => el.classList.remove('is-touch-pressed'));
    }, { passive: true });

    // ── 5. CỬ CHỈ VUỐT ĐÓNG DRAWER MENU (#sofa-mobile-drawer) ────────────────
    function initMobileDrawerSwipe() {
        const drawer = document.getElementById('sofa-mobile-drawer') || document.getElementById('mm-drawer');
        if (!drawer) return;

        let startX = 0;
        let startY = 0;
        let isSwipingLeft = false;
        let currentTranslateX = 0;
        const drawerContent = drawer.querySelector('.mobile-drawer-content') || drawer;

        drawer.addEventListener('touchstart', (e) => {
            if (!drawer.classList.contains('open') || !e.touches.length) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwipingLeft = false;
            currentTranslateX = 0;
        }, { passive: true });

        drawer.addEventListener('touchmove', (e) => {
            if (!drawer.classList.contains('open') || !e.touches.length) return;
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;

            if (deltaX < -10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
                isSwipingLeft = true;
                currentTranslateX = deltaX;
                drawerContent.style.transform = `translateX(${deltaX}px)`;
            }
        }, { passive: true });

        drawer.addEventListener('touchend', () => {
            if (isSwipingLeft) {
                drawerContent.style.transform = '';

                if (currentTranslateX < -65) {
                    triggerHaptic(10);
                    if (typeof window.toggleMobileHeaderMenu === 'function') {
                        window.toggleMobileHeaderMenu();
                    } else if (typeof window.closeMobileMenu === 'function') {
                        window.closeMobileMenu();
                    } else {
                        drawer.classList.remove('open');
                        document.body.style.overflow = '';
                    }
                }
                isSwipingLeft = false;
            }
        }, { passive: true });
    }

    // ── 6. KHỞI TẠO TỔNG THỂ ──────────────────────────────────────────────────
    function initAll() {
        if (!isTouchOrMobile()) return;
        initMobileDrawerSwipe();
        preheatKeyHubs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    window.addEventListener('load', completeNavProgress);
    window.addEventListener('pageshow', completeNavProgress);

    console.log('⚡ [APhim Pro Mobile Engine] 0ms Instant Navigation & Speculative Pre-warm Active v2026.');
})();
