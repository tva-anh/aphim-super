/**
 * nav-active-indicator.js
 * Tự động xác định trang hiện tại và:
 * 1. Fix active class cho hệ thống nav-flat-link (v2, dùng ở phim-theo-quoc-gia, danh-sach, v.v.)
 * 2. Hiển thị indicator vàng (sliding pill) cho hệ thống nav-item cũ
 */
(function () {
    'use strict';

    // ─── Bảng mapping tên file → thứ tự item (0-indexed) ───────────────────────
    // nav-flat-link order: [0]=Trang Chủ, [1]=Phim(btn), [2]=Danh Sách(btn),
    //                      [3]=Thể Loại(btn), [4]=Khám Phá, [5]=Gói Cước, [6]=Phim X
    // nav-item order (cũ): giống trên
    const PAGE_MAP = {
        'index.html': 0,
        '': 0,
        'phim-theo-quoc-gia.html': 1,
        'hanh-dong.html': 1,
        'filter.html': 1,
        'danh-sach.html': 2,
        'categories.html': 3,
        'search.html': 4,
        'pricing.html': 5,
        'support.html': 5,
        'phim-x.html': 6,
        // Trang không cần highlight
        'watch.html': -1,
        'movie-detail.html': -1,
        'login.html': -1,
        'register.html': -1,
        'profile.html': -1,
        'payment.html': -1,
        'partner.html': -1,
    };

    /** Xác định index active dựa trên URL hiện tại */
    function getActiveIndex() {
        const pathname = window.location.pathname;
        const currentPage = pathname.split('/').pop() || '';

        let idx = PAGE_MAP[currentPage];
        if (idx !== undefined) return idx;

        // Fallback pattern match
        if (pathname.includes('danh-sach')) return 2;
        if (pathname.includes('categories')) return 3;
        if (pathname.includes('search')) return 4;
        if (pathname.includes('pricing')) return 5;
        if (pathname.includes('phim-theo-quoc-gia') || pathname.includes('hanh-dong') || pathname.includes('filter')) return 1;
        if (pathname.includes('phim-x')) return 6;
        if (pathname === '/' || pathname === '/index.html') return 0;
        return -1;
    }

    // ─── Fix 1: Hệ thống nav-flat-link (v2) ─────────────────────────────────────
    function fixNavFlatLink() {
        // Tìm nav-links container (custom element hoặc div chứa nav-flat-link)
        const navLinksEl = document.querySelector('nav-links');
        if (!navLinksEl) return;

        const activeIndex = getActiveIndex();

        // Xóa tất cả active hiện tại
        navLinksEl.querySelectorAll('.nav-flat-link.active').forEach(el => {
            el.classList.remove('active');
        });

        if (activeIndex === -1) return;

        // Lấy các nav-flat-link trực tiếp (bao gồm cả a và button là con trực tiếp,
        // hoặc button bên trong .nav-flat-dropdown)
        // Thứ tự: Trang Chủ(a), div.nav-flat-dropdown>button[Phim],
        //         div.nav-flat-dropdown>button[Danh Sách], div.nav-flat-dropdown>button[Thể Loại],
        //         a[Khám Phá], a[Gói Cước], a[Phim X]
        const allNavItems = [];

        for (const child of navLinksEl.children) {
            if (child.classList.contains('nav-flat-link')) {
                // Direct <a> link
                allNavItems.push(child);
            } else if (child.classList.contains('nav-flat-dropdown')) {
                // Dropdown: lấy button bên trong
                const btn = child.querySelector(':scope > button.nav-flat-link');
                if (btn) allNavItems.push(btn);
            }
        }

        const target = allNavItems[Math.min(activeIndex, allNavItems.length - 1)];
        if (target) {
            target.classList.add('active');
        }
    }

    // ─── Fix 2: Hệ thống nav-item cũ + sliding pill indicator ────────────────────
    function initNavItemIndicator() {
        let navContainer = null;

        // Tìm container chứa nav-item
        const selectors = [
            'nav .hidden.lg\\:flex > div',
            'nav [class*="hidden"][class*="lg"] > div',
        ];
        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (el && el.querySelectorAll('.nav-item').length > 0) {
                    navContainer = el;
                    break;
                }
            } catch (e) { /* ignore */ }
        }

        if (!navContainer) {
            const allDivs = document.querySelectorAll('nav div');
            for (const div of allDivs) {
                if (div.querySelectorAll('.nav-item').length >= 3 &&
                    window.getComputedStyle(div).display !== 'none') {
                    navContainer = div;
                    break;
                }
            }
        }
        if (!navContainer) return;

        const navLinks = navContainer.querySelectorAll('.nav-item');
        if (!navLinks || navLinks.length === 0) return;

        const activeIndex = getActiveIndex();
        if (activeIndex === -1) return;

        const activeLink = navLinks[Math.min(activeIndex, navLinks.length - 1)];
        if (!activeLink) return;

        // Tạo pill indicator
        let indicator = navContainer.querySelector('.nav-slide-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'nav-slide-indicator absolute rounded-full pointer-events-none';
            indicator.style.cssText = [
                'background: rgba(242, 242, 13, 0.22)',
                'border: 1px solid rgba(242, 242, 13, 0.35)',
                'box-shadow: 0 0 14px rgba(242,242,13,0.18), inset 0 0 10px rgba(242,242,13,0.1)',
                'backdrop-filter: blur(8px)',
                'z-index: 0',
                'opacity: 0',
                'transition: left 0.3s cubic-bezier(0.4,0,0.2,1), top 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1), height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
            ].join(';');
            navContainer.style.position = 'relative';
            navContainer.insertBefore(indicator, navContainer.firstChild);
        }

        navLinks.forEach(link => {
            link.style.position = 'relative';
            link.style.zIndex = '1';
        });

        function placeIndicator(target, animate) {
            const rect = target.getBoundingClientRect();
            const containerRect = navContainer.getBoundingClientRect();
            const offsetWidth = navContainer.offsetWidth;
            const offsetHeight = navContainer.offsetHeight;
            const scaleX = offsetWidth > 0 ? (containerRect.width / offsetWidth) : 1;
            const scaleY = offsetHeight > 0 ? (containerRect.height / offsetHeight) : 1;
            const left = (rect.left - containerRect.left) / scaleX;
            const top = (rect.top - containerRect.top) / scaleY;
            const width = rect.width / scaleX;
            const height = rect.height / scaleY;
            const computedStyle = window.getComputedStyle(navContainer);
            const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
            const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;

            if (!animate) indicator.style.transition = 'none';
            else indicator.style.transition = '';

            indicator.style.width = width + 'px';
            indicator.style.height = height + 'px';
            indicator.style.left = (left - borderLeft) + 'px';
            indicator.style.top = (top - borderTop) + 'px';
            indicator.style.opacity = '1';

            if (!animate) {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { indicator.style.transition = ''; });
                });
            }
        }

        navLinks.forEach(link => {
            link.addEventListener('mouseenter', () => placeIndicator(link, true));
        });
        navContainer.addEventListener('mouseleave', () => placeIndicator(activeLink, true));

        requestAnimationFrame(() => placeIndicator(activeLink, false));
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => placeIndicator(activeLink, false));
        }
        window.addEventListener('load', () => requestAnimationFrame(() => placeIndicator(activeLink, false)));
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => placeIndicator(activeLink, false), 100);
        });
    }

    // ─── Bootstrap ───────────────────────────────────────────────────────────────
    function init() {
        fixNavFlatLink();       // Fix active class cho nav-flat-link (v2)
        initNavItemIndicator(); // Sliding pill cho nav-item (v1 cũ)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
