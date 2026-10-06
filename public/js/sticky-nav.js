// Sticky Navigation with smart scroll memory & bfcache restoration
// Desktop & Mobile: Transparent when scrollY <= 50, dark background when scrollY > 50
(function () {
    // Cho phép trình duyệt tự khôi phục vị trí cuộn khi Back/Forward (chuẩn bfcache)
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
    }

    const scrollStorageKey = 'aphim_scroll_' + (location.pathname || '/');

    function getHeaderElement() {
        return document.getElementById('sofa-header') || document.querySelector('header') || document.querySelector('nav');
    }

    let ticking = false;
    let lastWidth = window.innerWidth;

    function isDesktopHeroPresent() {
        return !!document.getElementById('desktopHeroShowcase') && window.innerWidth >= 1024;
    }

    function updateNavOnScroll() {
        const header = getHeaderElement();
        if (!header) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;

        if (scrollTop > 50) {
            header.classList.add('scrolled');
            if (isDesktopHeroPresent()) {
                header.style.removeProperty('background');
                header.style.removeProperty('background-color');
                header.style.removeProperty('border');
                header.style.removeProperty('border-bottom');
                header.style.removeProperty('box-shadow');
                header.style.removeProperty('backdrop-filter');
                header.style.removeProperty('-webkit-backdrop-filter');
            }
        } else {
            header.classList.remove('scrolled', 'sofa-header-scrolled');
            if (isDesktopHeroPresent()) {
                header.style.setProperty('background', 'transparent', 'important');
                header.style.setProperty('background-color', 'transparent', 'important');
                header.style.setProperty('border', 'none', 'important');
                header.style.setProperty('border-bottom', 'none', 'important');
                header.style.setProperty('box-shadow', 'none', 'important');
                header.style.setProperty('backdrop-filter', 'none', 'important');
                header.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
            } else {
                header.style.backgroundColor = '';
                header.style.background = '';
            }
        }
        header.classList.remove('nav-hidden');
        header.classList.add('nav-visible');
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateNavOnScroll);
            ticking = true;
        }
    }

    // Ghi nhớ vị trí cuộn trước khi rời trang sang trang khác
    window.addEventListener('pagehide', function() {
        try {
            sessionStorage.setItem(scrollStorageKey, String(window.scrollY || window.pageYOffset || 0));
        } catch(e) {}
    });

    // Khôi phục vị trí cuộn thông minh khi quay trở lại (Back / Forward)
    function restoreScrollIfReturning(isBfCache = false) {
        if (isBfCache) {
            updateNavOnScroll();
            return;
        }

        const navEntries = performance.getEntriesByType('navigation');
        const isBackForward = navEntries.length > 0 && navEntries[0].type === 'back_forward';
        const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';

        if (isReload) {
            // Khi người dùng bấm F5 cố ý làm mới trang: Cuộn về đỉnh đầu
            try { sessionStorage.removeItem(scrollStorageKey); } catch(e) {}
            window.scrollTo(0, 0);
            updateNavOnScroll();
            return;
        }

        try {
            const savedY = sessionStorage.getItem(scrollStorageKey);
            if (savedY !== null && (isBackForward || document.referrer)) {
                const targetY = parseInt(savedY, 10);
                if (!isNaN(targetY) && targetY > 0) {
                    window.scrollTo(0, targetY);
                    setTimeout(() => {
                        window.scrollTo(0, targetY);
                        updateNavOnScroll();
                    }, 100);
                    return;
                }
            }
        } catch(e) {}

        updateNavOnScroll();
    }

    window.addEventListener('scroll', requestTick, { passive: true });

    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            updateNavOnScroll();
        }
    }, { passive: true });

    window.addEventListener('pageshow', function(e) {
        restoreScrollIfReturning(e.persisted);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => restoreScrollIfReturning(false));
    } else {
        restoreScrollIfReturning(false);
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function (event) {
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');

        if (mobileMenu && mobileMenuBtn &&
            !mobileMenu.contains(event.target) &&
            !mobileMenuBtn.contains(event.target) &&
            !mobileMenu.classList.contains('hidden')) {
            mobileMenu.classList.add('hidden');
        }
    });
})();

// ── Desktop Dropdown Dim Overlay ──────────────────────────────────────────────
// Khi hover vào bất kỳ nav dropdown (Phim/Danh Sách/Thể Loại), trang mờ đi
// để menu nổi bật hơn — hiện đại như Netflix, Disney+
(function () {
    'use strict';

    function initDropdownDim() {
        // Chỉ chạy trên desktop (>= 1200px)
        if (window.innerWidth < 1200) return;

        // Tạo overlay element (1 lần)
        let overlay = document.getElementById('nav-dim-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'nav-dim-overlay';
            overlay.className = 'nav-dim-overlay';
            document.body.appendChild(overlay);
        }

        const dropdowns = document.querySelectorAll('.nav-flat-dropdown');
        if (!dropdowns.length) return;

        let _dimTimer = null;

        function showDim() {
            clearTimeout(_dimTimer);
            overlay.classList.add('active');
        }

        function hideDim() {
            clearTimeout(_dimTimer);
            _dimTimer = setTimeout(() => overlay.classList.remove('active'), 80);
        }

        dropdowns.forEach(dd => {
            dd.addEventListener('mouseenter', showDim);
            dd.addEventListener('mouseleave', hideDim);
        });

        // Click overlay → ẩn ngay
        overlay.addEventListener('click', hideDim);
    }

    // Khởi tạo khi DOM sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDropdownDim);
    } else {
        initDropdownDim();
    }

    // Re-init khi resize (desktop ↔ mobile)
    let _resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(initDropdownDim, 200);
    }, { passive: true });
})();


