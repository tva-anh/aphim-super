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
            const stored = localStorage.getItem('cinestream_user') || localStorage.getItem('currentUser');
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return null;
    }

    // Determine active tab based on window location
    function getActiveTab() {
        const path = window.location.pathname.toLowerCase();
        const search = window.location.search.toLowerCase();
        
        if (path === '/' || path.includes('index') || path === '') return 'home';
        if (
            path.includes('danh-sach') || 
            path.includes('tat-ca') || 
            path.includes('filter') || 
            path.includes('categories') ||
            path.includes('quoc-gia') ||
            path.includes('the-loai') ||
            path.includes('phim-bo') ||
            path.includes('phim-le') ||
            path.includes('hoat-hinh') ||
            path.includes('phim-chieu-rap') ||
            path.includes('tv-shows') ||
            path.includes('phim-moi')
        ) return 'filter';
        if (path.includes('lich-su') || search.includes('tab=history')) return 'history';
        if (path.includes('yeu-thich') || search.includes('tab=favorites')) return 'favorite';
        if (path.includes('profile') || path.includes('tai-khoan') || path.includes('login') || path.includes('register')) return 'account';
        
        return 'home';
    }

    /* ────────────────────────────────────────────
       BUILD BOTTOM NAV DOCK
    ──────────────────────────────────────────── */
    function buildDock() {
        const active = getActiveTab();
        const existing = document.getElementById('bottom-nav-dock');
        if (existing) existing.remove();

        const dock = document.createElement('nav');
        dock.id = 'bottom-nav-dock';
        dock.setAttribute('aria-label', 'Bottom Navigation');

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
                <!-- 1. Bộ lọc (Slender Sliders 1.35) -->
                <a href="/danh-sach" class="bn-tab ${active === 'filter' ? 'active' : ''}" id="bn-tab-filter" aria-label="Bộ lọc">
                    <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
                        <circle cx="14" cy="6" r="2" fill="rgba(30, 41, 69, 0.85)" stroke="currentColor" stroke-width="1.35"/>
                        <circle cx="8" cy="12" r="2" fill="rgba(30, 41, 69, 0.85)" stroke="currentColor" stroke-width="1.35"/>
                        <circle cx="16" cy="18" r="2" fill="rgba(30, 41, 69, 0.85)" stroke="currentColor" stroke-width="1.35"/>
                    </svg>
                    <span class="bn-tab-label">Bộ lọc</span>
                </a>

                <!-- 2. Lịch sử (Slender Clock History 1.35) -->
                <a href="/profile?tab=history" class="bn-tab ${active === 'history' ? 'active' : ''}" id="bn-tab-history" aria-label="Lịch sử" onclick="return handleHistoryTabClick(event)">
                    <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3 3v5h5M12 7v5l3 3" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="bn-tab-label">Lịch sử</span>
                </a>

                <!-- 3. Floating Center Home Button (Bold Gold Glowing Circle) -->
                <a href="/" class="bn-tab-center ${active === 'home' ? 'active' : ''}" id="bn-tab-home" aria-label="Trang chủ">
                    <div class="bn-center-circle">
                        <svg class="bn-center-icon" viewBox="0 0 24 24" fill="none">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="#0d0f1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </a>

                <!-- 4. Yêu thích (Slender Heart Outline 1.35) -->
                <a href="/profile?tab=favorites" class="bn-tab ${active === 'favorite' ? 'active' : ''}" id="bn-tab-favorite" aria-label="Yêu thích" onclick="return handleFavoritesTabClick(event)">
                    <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="bn-tab-label">Yêu thích</span>
                </a>

                <!-- 5. Tài khoản (Slender User Outline 1.35) -->
                <a href="/profile" class="bn-tab ${active === 'account' ? 'active' : ''}" id="bn-tab-account" aria-label="Tài khoản" onclick="return handleAccountTabClick(event)">
                    <svg class="bn-tab-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="bn-tab-label">Tài khoản</span>
                </a>
            </div>
        `;

        document.body.appendChild(dock);
    }

    window.handleFavoritesTabClick = function (e) {
        if (window.location.pathname.startsWith('/profile')) {
            if (e) e.preventDefault();
            if (typeof switchTab === 'function') {
                switchTab('favorites');
            }
            return false;
        }
        return true;
    };

    window.handleHistoryTabClick = function (e) {
        if (window.location.pathname.startsWith('/profile')) {
            if (e) e.preventDefault();
            if (typeof switchTab === 'function') {
                switchTab('history');
            }
            return false;
        }
        return true;
    };

    window.handleAccountTabClick = function (e) {
        const user = getCurrentUser();
        if (!user && window.showAuthModal) {
            if (e) e.preventDefault();
            window.showAuthModal('login');
            return false;
        }
        if (window.location.pathname.startsWith('/profile')) {
            if (e) e.preventDefault();
            if (window.innerWidth < 1024 && typeof window.showMobileProfileHub === 'function') {
                window.showMobileProfileHub();
            } else if (typeof switchTab === 'function') {
                switchTab('account');
            }
            return false;
        }
        window.location.href = '/profile';
        return true;
    };

    /* ────────────────────────────────────────────
       INIT & RESIZE OBSERVER
    ──────────────────────────────────────────── */
    function init() {
        if (window.innerWidth >= 1024) {
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
