// Sticky Navigation with scroll effects
// Desktop & Mobile: Transparent when scrollY <= 50, dark background when scrollY > 50
(function () {
    // Disable browser scroll restoration so page refresh always starts at scrollY = 0
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    function getHeaderElement() {
        return document.getElementById('sofa-header') || document.querySelector('header') || document.querySelector('nav');
    }

    let ticking = false;
    let lastWidth = window.innerWidth;

    function updateNavOnScroll() {
        const header = getHeaderElement();
        if (!header) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;

        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled', 'sofa-header-scrolled');
            // Remove any inline background set via JS
            header.style.backgroundColor = '';
            header.style.background = '';
        }
        header.classList.remove('nav-hidden');
        header.classList.add('nav-visible');
        ticking = false;
    }

    function forceHeaderTopState() {
        try { window.scrollTo(0, 0); } catch(e) {}
        const header = getHeaderElement();
        if (header) {
            header.classList.remove('scrolled', 'sofa-header-scrolled');
            header.style.backgroundColor = '';
            header.style.background = '';
        }
    }

    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(updateNavOnScroll);
            ticking = true;
        }
    }

    // Run immediately
    forceHeaderTopState();

    window.addEventListener('scroll', requestTick, { passive: true });

    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            updateNavOnScroll();
        }
    }, { passive: true });

    window.addEventListener('load', forceHeaderTopState);
    window.addEventListener('pageshow', forceHeaderTopState);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceHeaderTopState);
    } else {
        forceHeaderTopState();
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


