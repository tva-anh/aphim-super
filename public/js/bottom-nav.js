/**
 * A PHIM — Mobile Bottom Navigation Bar JS
 * 5 Tabs: Bộ lọc — Lịch sử — [Trang chủ Floating Center] — Yêu thích — Tài khoản
 * Slender, delicate outline side icons (stroke-width 1.35) & elegant font-weight (450)
 */
(function () {
    'use strict';

    function getCurrentUser() {
        try {
            if (typeof authService !== 'undefined' && authService && typeof authService.getCurrentUser === 'function') {
                const u = authService.getCurrentUser();
                if (u) return u;
            }
            const stored = localStorage.getItem('cinestream_user') || localStorage.getItem('user') || localStorage.getItem('A Phim_user') || localStorage.getItem('currentUser') || localStorage.getItem('aphim_admin_user');
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return null;
    }

    // Determine active tab based on window location
    function getActiveTab() {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        
        if (path.includes('reels') || path.includes('shorts')) return 'reels';
        if (path.startsWith('/phim-ngan')) return 'phim-ngan';
        if (path === '/' || path.includes('index') || path === '') return 'home';
        if (path.includes('lich-su') || search.includes('tab=history')) return 'history';
        if (path.includes('profile') || path.includes('tai-khoan') || path.includes('login') || path.includes('register')) return 'account';
        
        return 'home';
    }

    /* ────────────────────────────────────────────
       BUILD BOTTOM NAV DOCK
    ──────────────────────────────────────────── */
    function isPhimNganPage() {
        const path = window.location.pathname.toLowerCase();
        return path.startsWith('/phim-ngan') || (document.body && document.body.classList.contains('page-phim-ngan'));
    }

    function getPhimNganActiveTab() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/de-xuat')) return 'recommend';
        if (path.includes('/tim-kiem')) return 'search';
        if (path.includes('/thu-vien')) return 'library';
        return 'home';
    }

    function buildDock() {
        const existing = document.getElementById('bottom-nav-dock');
        if (existing) existing.remove();

        const dock = document.createElement('nav');
        dock.id = 'bottom-nav-dock';
        dock.setAttribute('aria-label', 'Bottom Navigation');

        // 🟢 ĐIỀU HƯỚNG RIÊNG KHI VÀO MỤC PHIM NGẮN TRÊN MOBILE (CHUẨN HEADER ĐỒNG BỘ)
        if (isPhimNganPage()) {
            dock.classList.add('bn-phim-ngan-mode');
            const pnActive = getPhimNganActiveTab();
            dock.innerHTML = `
                <!-- SVG Background with Notch & Signature Lime Green Glow -->
                <svg class="bn-bg-svg" viewBox="0 0 375 68" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <linearGradient id="bn-glass-fill-pn" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="rgba(24, 32, 20, 0.82)"></stop>
                            <stop offset="100%" stop-color="rgba(12, 18, 12, 0.92)"></stop>
                        </linearGradient>
                        <linearGradient id="bn-glass-stroke-pn" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="rgba(255, 255, 255, 0.28)"></stop>
                            <stop offset="50%" stop-color="rgba(163, 230, 53, 0.75)"></stop>
                            <stop offset="100%" stop-color="rgba(255, 255, 255, 0.28)"></stop>
                        </linearGradient>
                    </defs>
                    <path d="M 0,0 L 132,0 C 154,0 160,36 187.5,36 C 215,36 221,0 243,0 L 375,0 L 375,68 L 0,68 Z" fill="url(#bn-glass-fill-pn)" stroke="url(#bn-glass-stroke-pn)" stroke-width="1.2"></path>
                </svg>

                <div class="bn-tabs-container">
                    <!-- 1. Về Phim Chính (Góc trái thay thế nút Reels theo yêu cầu) -->
                    <a href="/" class="bn-tab" id="bn-tab-main-site" aria-label="Về Phim Chính" title="Quay lại trang chính APhim">
                        <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="bn-tab-label">Về Phim</span>
                    </a>

                    <!-- 2. Đề xuất -->
                    <a href="/phim-ngan/de-xuat" class="bn-tab ${pnActive === 'recommend' ? 'active' : ''}" id="bn-tab-pn-recommend" aria-label="Đề xuất" onclick="return handlePhimNganTabClick(event, 'recommend');">
                        <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="bn-tab-label">Đề xuất</span>
                    </a>

                    <!-- 3. Nút tròn Trang chủ Phim Ngắn (Nền màu XANH LIME đặc trưng) -->
                    <a href="/phim-ngan" class="bn-tab-center ${pnActive === 'home' ? 'active' : ''}" id="bn-tab-pn-home" aria-label="Trang chủ Phim Ngắn" onclick="return handlePhimNganTabClick(event, 'home');">
                        <div class="bn-center-circle bn-center-circle-lime">
                            <svg class="bn-center-icon" viewBox="0 0 24 24" fill="none">
                                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="#0a1f05" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </a>

                    <!-- 4. Tìm kiếm -->
                    <a href="/phim-ngan/tim-kiem" class="bn-tab ${pnActive === 'search' ? 'active' : ''}" id="bn-tab-pn-search" aria-label="Tìm kiếm" onclick="return handlePhimNganTabClick(event, 'search');">
                        <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.4"/>
                            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                        <span class="bn-tab-label">Tìm kiếm</span>
                    </a>

                    <!-- 5. Thư viện -->
                    <a href="/phim-ngan/thu-vien" class="bn-tab ${pnActive === 'library' ? 'active' : ''}" id="bn-tab-pn-library" aria-label="Thư viện" onclick="return handlePhimNganTabClick(event, 'library');">
                        <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" stroke-width="1.35"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" stroke-width="1.35"/>
                            <line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
                            <line x1="8" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
                        </svg>
                        <span class="bn-tab-label">Thư viện</span>
                    </a>
                </div>
            `;
            document.body.appendChild(dock);
            attachInstantDockInteractions(dock);
            return;
        }

        const active = getActiveTab();

        dock.innerHTML = `
            <!-- SVG Background with Deep Wide Curved Notch & Glassmorphism Fill -->
            <svg class="bn-bg-svg" viewBox="0 0 375 68" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id="bn-glass-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="rgba(30, 41, 65, 0.75)"></stop>
                        <stop offset="100%" stop-color="rgba(15, 22, 38, 0.85)"></stop>
                    </linearGradient>
                    <linearGradient id="bn-glass-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="rgba(255, 255, 255, 0.28)"></stop>
                        <stop offset="50%" stop-color="rgba(252, 213, 118, 0.60)"></stop>
                        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.28)"></stop>
                    </linearGradient>
                </defs>
                <path d="M 0,0 L 132,0 C 154,0 160,36 187.5,36 C 215,36 221,0 243,0 L 375,0 L 375,68 L 0,68 Z" fill="url(#bn-glass-fill)" stroke="url(#bn-glass-stroke)" stroke-width="1.2"></path>
            </svg>

            <div class="bn-tabs-container">
                <!-- 1. Reels (Ultra Modern Instagram/TikTok Clapperboard with Glowing Red Dot) -->
                <a href="/reels" class="bn-tab ${active === 'reels' ? 'active' : ''}" id="bn-tab-reels" aria-label="Reels">
                    <svg class="bn-tab-icon bn-reels-icon" viewBox="0 0 24 24" fill="none">
                        <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" stroke="currentColor" stroke-width="1.4"/>
                        <path d="M2.5 8.8h19M7.2 2.5l3.2 6.3M13.8 2.5l3.2 6.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                        <path d="M10 12.2l5 2.8-5 2.8v-5.6z" fill="currentColor"/>
                    </svg>
                    <span class="bn-tab-label bn-reels-label-wrap">
                        <span>Reels</span><span class="bn-reels-dot"></span>
                    </span>
                </a>

                <!-- 2. Phim ngắn (Biểu tượng Máy quay phim điện ảnh cân đối, đồng đều kích thước với Reels & Lịch sử) -->
                <a href="/phim-ngan" class="bn-tab ${active === 'phim-ngan' ? 'active' : ''}" id="bn-tab-phim-ngan" aria-label="Phim ngắn">
                    <svg class="bn-tab-icon bn-phim-ngan-icon" viewBox="0 0 24 24" fill="none">
                        <path class="bn-pn-tail" d="M15.8 10.2l4.8-3.4A1 1 0 0 1 22 7.6v8.8a1 1 0 0 1-1.4.8l-4.8-3.4v-3.8z" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>
                        <rect class="bn-pn-body" x="2.2" y="4" width="13.6" height="16" rx="3.5" stroke="currentColor" stroke-width="1.45"/>
                        <polygon class="bn-pn-play" points="7.2 9.2 11.8 12 7.2 14.8" fill="currentColor"/>
                    </svg>
                    <span class="bn-tab-label bn-pn-label-wrap">
                        <span>Phim ngắn</span><span class="bn-pn-dot"></span>
                    </span>
                </a>

                <!-- 3. Floating Center Home Button (Bold Gold Glowing Circle) -->
                <a href="/" class="bn-tab-center ${active === 'home' ? 'active' : ''}" id="bn-tab-home" aria-label="Trang chủ">
                    <div class="bn-center-circle">
                        <svg class="bn-center-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="#0d0f1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </a>

                <!-- 4. Lịch sử (Thay thế cho Yêu thích theo yêu cầu người dùng) -->
                <a href="/profile?tab=history" class="bn-tab ${active === 'history' ? 'active' : ''}" id="bn-tab-history" aria-label="Lịch sử" onclick="return handleHistoryTabClick(event)">
                    <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3 3v5h5M12 7v5l3 3" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="bn-tab-label">Lịch sử</span>
                </a>

                <!-- 5. Tài khoản (Slender User Outline 1.35) -->
                <a href="/profile?tab=account" class="bn-tab ${active === 'account' ? 'active' : ''}" id="bn-tab-account" aria-label="Tài khoản" onclick="return handleAccountTabClick(event)">
                    <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="bn-tab-label">Tài khoản</span>
                </a>
            </div>
        `;

        document.body.appendChild(dock);
        attachInstantDockInteractions(dock);
    }

    // ⚡ Bắt sự kiện chạm tức thì 0ms (Instant Visual & Haptic Feedback)
    function attachInstantDockInteractions(dock) {
        if (!dock) return;

        dock.addEventListener('touchstart', function (e) {
            const tab = e.target.closest('.bn-tab, .bn-tab-center');
            if (!tab) return;

            // 1. Phản hồi active ngay lập tức dưới ngón tay (0ms)
            dock.querySelectorAll('.bn-tab, .bn-tab-center').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 2. Kích hoạt hiệu ứng rung nhẹ vi mô
            if (typeof window.triggerHaptic === 'function') {
                window.triggerHaptic(6);
            }

            // 3. Kích hoạt thanh tiến trình vàng trên cùng
            if (typeof window.triggerNavProgress === 'function') {
                window.triggerNavProgress();
            }

            // 4. Pre-warm trước tài liệu HTML đích trong 150ms ngón tay chạm màn hình
            const href = tab.getAttribute('href');
            if (href && href.startsWith('/') && typeof window.preheatUrl === 'function') {
                window.preheatUrl(href);
            }
        }, { passive: true });
    }

    window.handleFavoritesTabClick = function (e) {
        if (typeof window.triggerNavProgress === 'function') window.triggerNavProgress();
        if (window.location.pathname.startsWith('/profile')) {
            if (e) e.preventDefault();
            if (typeof switchTab === 'function') {
                switchTab('favorites');
            }
            return false;
        }
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        window.location.href = '/profile?tab=favorites';
        return false;
    };

    window.handleHistoryTabClick = function (e) {
        if (typeof window.triggerNavProgress === 'function') window.triggerNavProgress();
        if (window.location.pathname.startsWith('/profile')) {
            if (e) e.preventDefault();
            if (typeof switchTab === 'function') {
                switchTab('history');
            }
            return false;
        }
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        window.location.href = '/profile?tab=history';
        return false;
    };

    window.handleAccountTabClick = function (e) {
        if (typeof window.triggerNavProgress === 'function') window.triggerNavProgress();
        const user = getCurrentUser();
        if (!user && window.showAuthModal) {
            if (e) e.preventDefault();
            window.showAuthModal('login');
            return false;
        }
        if (window.location.pathname.startsWith('/profile')) {
            if (e) e.preventDefault();
            if (typeof switchTab === 'function') {
                switchTab('account');
            }
            return false;
        }
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        window.location.href = '/profile?tab=account';
        return false;
    };

    /* ────────────────────────────────────────────
       PHIM NGẮN SPA TAB SWITCHING & SYNC
       Không reload trang, giữ mini player phát liên tục không bị khựng/lag
    ──────────────────────────────────────────── */
    window.handlePhimNganTabClick = function (e, tab) {
        if (typeof window.showPhimNganView === 'function') {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            const targetUrl = tab === 'recommend' ? '/phim-ngan/de-xuat' :
                              tab === 'search' ? '/phim-ngan/tim-kiem' :
                              tab === 'library' ? '/phim-ngan/thu-vien' : '/phim-ngan';
            try {
                if (window.location.pathname !== targetUrl) {
                    window.history.pushState({ view: tab, fromBottomNav: true }, '', targetUrl);
                }
            } catch (err) {}

            window.showPhimNganView(tab);

            if (typeof window.syncBottomNavActive === 'function') {
                window.syncBottomNavActive(tab);
            }

            return false;
        }
        return true;
    };

    window.syncBottomNavActive = function (tab) {
        const dock = document.getElementById('bottom-nav-dock');
        if (!dock) return;
        const tabs = [
            { id: 'bn-tab-pn-recommend', name: 'recommend' },
            { id: 'bn-tab-pn-home', name: 'home' },
            { id: 'bn-tab-pn-search', name: 'search' },
            { id: 'bn-tab-pn-library', name: 'library' }
        ];
        tabs.forEach(t => {
            const el = document.getElementById(t.id);
            if (!el) return;
            if (tab === t.name) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    };

    /* ────────────────────────────────────────────
       INIT & RESIZE OBSERVER
    ──────────────────────────────────────────── */
    function init() {
        if (window.innerWidth >= 1024 || window.location.pathname.startsWith('/reels')) {
            const existing = document.getElementById('bottom-nav-dock');
            if (existing) existing.remove();
            return;
        }
        buildDock();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(init, 150);
    });

    window.addEventListener('orientationchange', function () {
        setTimeout(init, 200);
    });

    window.rebuildBottomNav = function () {
        document.getElementById('bottom-nav-dock')?.remove();
        init();
    };
})();
