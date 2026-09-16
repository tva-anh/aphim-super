// Desktop Navigation Component - Inject consistent navigation across all pages
(function () {
    'use strict';

    // ── Feature flag helpers ─────────────────────────────────────────────────
    function isPhimXEnabled() {
        if (typeof API_CONFIG !== 'undefined' && typeof API_CONFIG.ENABLE_PHIM_X === 'boolean') {
            return API_CONFIG.ENABLE_PHIM_X;
        }
        try {
            const cached = JSON.parse(localStorage.getItem('cinestream_public_settings') || '{}');
            if (typeof cached.enablePhimX === 'boolean') return cached.enablePhimX;
        } catch (e) {}
        return false;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectDesktopNavigation);
    } else {
        injectDesktopNavigation();
    }

    // Re-inject when settings sync (e.g. admin toggled Phim X)
    window.addEventListener('configSynced', () => {
        injectDesktopNavigation();
    });

    function injectDesktopNavigation() {
        // Find desktop menu container (hidden on mobile, visible on lg+)
        const desktopMenu = document.querySelector('nav .hidden.lg\\:flex');

        if (!desktopMenu) {
            console.warn('Desktop menu container not found');
            return;
        }

        // Get current page for active state
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Build navigation HTML
        const navHTML = `
            <a class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${currentPage === 'index.html' || currentPage === '' ? 'text-primary' : 'text-white hover:text-primary'}"
                href="index.html">Trang chủ</a>

            <!-- Phim Dropdown -->
            <div class="relative group">
                <button
                    class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 text-white hover:text-primary flex items-center gap-1">
                    Phim
                    <span
                        class="material-icons-round text-sm group-hover:rotate-180 transition-transform duration-300">expand_more</span>
                </button>
                <div
                    class="absolute top-full left-0 mt-2 w-56 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden z-50">
                    <a href="phim-theo-quoc-gia.html?country=viet-nam"
                        class="block px-5 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-all flex items-center gap-2">
                        <svg width="20" height="14" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
                            <rect width="30" height="20" fill="#DA251D"/>
                            <polygon points="15,4 16.5,9 21.5,9 17.5,12 19,17 15,14 11,17 12.5,12 8.5,9 13.5,9" fill="#FFFF00"/>
                        </svg>
                        Phim Việt Nam
                    </a>
                </div>
            </div>

            <!-- Danh Sách Dropdown -->
            <div class="relative group">
                <button
                    class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${currentPage.includes('danh-sach') ? 'text-primary' : 'text-white hover:text-primary'} flex items-center gap-1">
                    Danh Sách
                    <span
                        class="material-icons-round text-sm group-hover:rotate-180 transition-transform duration-300">expand_more</span>
                </button>
                <div
                    class="absolute top-full left-0 mt-2 w-[600px] bg-black/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 overflow-hidden z-50">
                    <div class="grid grid-cols-3 gap-0">
                        <a href="danh-sach.html?list=phim-moi"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-b border-white/5">Phim
                            Mới</a>
                        <a href="danh-sach.html?list=phim-bo"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-b border-white/5">Phim
                            Bộ</a>
                        <a href="danh-sach.html?list=phim-le"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-b border-white/5">Phim
                            Lẻ</a>
                        <a href="danh-sach.html?list=tv-shows"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-b border-white/5">Shows</a>
                        <a href="danh-sach.html?list=hoat-hinh"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-b border-white/5">Hoạt
                            Hình</a>
                        <a href="danh-sach.html?list=phim-vietsub"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-b border-white/5">Phim
                            Vietsub</a>
                        <a href="danh-sach.html?list=phim-thuyet-minh"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-b border-white/5">Phim
                            Thuyết Minh</a>
                        <a href="danh-sach.html?list=phim-long-tien"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-b border-white/5">Phim
                            Lồng Tiếng</a>
                        <a href="danh-sach.html?list=phim-bo-dang-chieu"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-b border-white/5">Phim
                            Bộ Đang Chiếu</a>
                        <a href="danh-sach.html?list=phim-bo-hoan-thanh"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-white/5">Phim
                            Bộ Đã Hoàn Thành</a>
                        <a href="danh-sach.html?list=phim-sap-chieu"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all border-r border-white/5">Phim
                            Sắp Chiếu</a>
                        <a href="danh-sach.html?list=subteam"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all">Subteam</a>
                        <a href="danh-sach.html?list=phim-chieu-rap"
                            class="block px-5 py-4 text-gray-300 hover:text-primary hover:bg-white/5 transition-all col-span-3 border-t border-white/5 text-center font-semibold">Phim
                            Chiếu Rạp</a>
                    </div>
                </div>
            </div>

            <a class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${currentPage === 'categories.html' ? 'text-primary' : 'text-white hover:text-primary'}"
                href="categories.html">Thể Loại</a>
            <a class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${currentPage === 'search.html' ? 'text-primary' : 'text-white hover:text-primary'}"
                href="search.html">Khám phá</a>
            <a class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${currentPage === 'pricing.html' ? 'text-primary' : 'text-white hover:text-primary'}"
                href="pricing.html">Gói cước</a>
            <a class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${currentPage === 'support.html' ? 'text-primary' : 'text-white hover:text-primary'}"
                href="support.html">Nuôi APhim</a>
            ${isPhimXEnabled() ? `<a class="nav-item px-6 py-2.5 rounded-full text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${currentPage === 'phim-x.html' ? 'text-[#ff7351]' : 'text-[#ff7351]/70 hover:text-[#ff7351]'} flex items-center gap-1"
                href="phim-x.html"><span style="font-size:12px;background:rgba(255,115,81,0.15);border:1px solid rgba(255,115,81,0.4);padding:1px 5px;border-radius:4px;font-size:10px;">18+</span> Phim X</a>` : ''}
        `;

        // Replace content
        desktopMenu.innerHTML = navHTML;
        console.log('✅ Desktop navigation injected');
    }
})();
