/**
 * A PHIM - Modern Mobile Menu JS (theo thiết kế Stitch)
 * Right-side cinematic drawer - dùng material-icons-round (đã có sẵn trên tất cả trang)
 */
(function () {
    'use strict';

    const CURRENT_PAGE = window.location.pathname.split('/').pop() || 'index.html';

    // ── Read feature flags from config/cache ───────────────────────────────────
    function isPhimXEnabled() {
        // Priority 1: runtime API_CONFIG (set by config.js)
        if (typeof API_CONFIG !== 'undefined' && typeof API_CONFIG.ENABLE_PHIM_X === 'boolean') {
            return API_CONFIG.ENABLE_PHIM_X;
        }
        // Priority 2: localStorage cache
        try {
            const cached = JSON.parse(localStorage.getItem('cinestream_public_settings') || '{}');
            if (typeof cached.enablePhimX === 'boolean') return cached.enablePhimX;
        } catch (e) { }
        return false; // default: hidden
    }

    function getCurrentUser() {
        try {
            if (typeof authService !== 'undefined') {
                return authService.getCurrentUser();
            }
        } catch (e) { }
        return null;
    }

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = String(str || '');
        return d.innerHTML;
    }

    function icon(name, style) {
        return `<span class="material-icons-round" style="${style || ''}">${name}</span>`;
    }

    /* ── SUPPRESS OLD MENU ── */
    function suppressOldMenu() {
        const selectors = [
            '#mobile-menu', '#mobileMenu', '.mobile-menu',
            '#nav-mobile', '.nav-mobile', '[data-mobile-menu]'
        ];
        selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el && el.id !== 'mm-drawer' && el.id !== 'mm-overlay') {
                el.style.cssText = 'display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;';
                el.classList.add('hidden');
                el.setAttribute('aria-hidden', 'true');
            }
        });
    }

    /* ── SETUP BURGER BUTTON ── */
    function setupBtn() {
        // Tìm nút hamburger hiện có hoặc tạo mới
        let burgerBtn = document.querySelector('.mm-burger-btn');
        if (!burgerBtn) {
            // Tìm nút hamburger phổ biến
            burgerBtn = document.querySelector(
                '#mobile-menu-btn, #hamburger-btn, .hamburger, [data-toggle="mobile-menu"], button[aria-label*="menu"], button[aria-label*="Menu"]'
            );
        }
        if (burgerBtn) {
            burgerBtn.classList.add('mm-burger-btn');
            burgerBtn.addEventListener('click', openMenu);
        }
    }

    /* ── BUILD DRAWER ── */
    function buildDrawer() {
        document.querySelectorAll('#mm-overlay, #mm-drawer').forEach(el => el.remove());

        const user = getCurrentUser();

        const overlay = document.createElement('div');
        overlay.id = 'mm-overlay';
        overlay.addEventListener('click', closeMenu);
        document.body.appendChild(overlay);

        const drawer = document.createElement('div');
        drawer.id = 'mm-drawer';

        const userId = user ? (user._id || user.id || user.email) : null;
        const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
        const savedAvatar = user ? (localStorage.getItem(avatarKey) || user.avatar || localStorage.getItem('user_avatar') || user.photoURL) : null;

        const displayName = user ? (user.displayName || user.name || user.fullName || user.email || 'Người dùng') : 'Khách';
        const avatarInitial = user ? displayName.charAt(0).toUpperCase() : 'U';

        const avatarHtml = user
            ? (savedAvatar
                ? `<img src="${escHtml(savedAvatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random'">`
                : escHtml(avatarInitial))
            : `<dotlottie-player src="/icons/panda.lottie" background="transparent" speed="1" style="width:100%;height:100%;transform:scale(1.85);" loop autoplay></dotlottie-player>`;

        const userName = escHtml(displayName);
        const userBadge = user ? 'Thành viên Vàng' : 'Chưa đăng nhập';
        const userHref = user ? '/profile' : '#';
        const userClick = user ? '' : `onclick="if(window.showAuthModal){event.preventDefault(); if(window.closeMobileMenu) window.closeMobileMenu(); window.showAuthModal('login'); return false;}"`;

        const frameClass = user ? (typeof getEquippedFrameClass === 'function' ? getEquippedFrameClass(user) : (user.equippedFrameClass || localStorage.getItem('ap_frame_class') || '')) : '';
        const nameColorClass = typeof getEquippedNameColorClass === 'function' ? getEquippedNameColorClass(user) : '';
        const nameColorStyle = typeof getEquippedNameColorStyle === 'function' ? getEquippedNameColorStyle(user) : '';

        drawer.innerHTML = `
        <!-- TOP USER -->
        <div class="mm-top">
            <a href="${userHref}" ${userClick} class="mm-user-wrap">
                <div class="mm-avatar-wrap shop-frame-wrap size-sm ${frameClass}">
                    <div class="mm-avatar-img">${avatarHtml}</div>
                    ${user ? '<div class="mm-avatar-dot"></div>' : ''}
                </div>
                <div>
                    <div class="mm-user-name-text ${nameColorClass}" title="${userName}" style="display:inline-block; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ${nameColorStyle}">${userName}</div>
                    <div class="mm-user-badge">${userBadge}</div>
                </div>
            </a>
            <button class="mm-close-btn" id="mmCloseBtn" aria-label="Đóng menu">
                ${icon('close', 'font-size:20px;')}
            </button>
        </div>

        <!-- SCROLL AREA -->
        <div id="mm-drawer-scroll">

            <!-- 1. Trang Chủ -->
            <a href="/" class="mm-nav-full mm-glass ${CURRENT_PAGE === 'index.html' ? 'mm-active' : ''}">
                ${icon('home', CURRENT_PAGE === 'index.html' ? 'color:#FFD700;font-size:24px;' : 'font-size:24px;color:#aaabad;')}
                <span class="mm-nav-full-text">Trang Chủ</span>
                <div style="margin-left:auto;">${icon('chevron_right', 'font-size:18px;color:rgba(255,215,0,0.4);')}</div>
            </a>

            <!-- 2. Phim dropdown -->
            <button class="mm-nav-full mm-glass mm-phim-btn" id="mmPhimBtn">
                ${icon('movie', 'font-size:24px;color:#aaabad;')}
                <span class="mm-nav-full-text">Phim</span>
                <div style="margin-left:auto;">${icon('expand_more', 'font-size:22px;color:rgba(255,255,255,0.3);transition:transform 0.25s;')}</div>
            </button>
            <div id="mmPhimDrop" style="display:none;padding:0 4px 4px;">
                <div class="mm-dropdown-panel-blue">
                    <div class="mm-dropdown-panel-blue-scroll">
                        <div class="mm-grid-2" id="mmPhimDropGrid">
                            <!-- Danh sách quốc gia loading -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2.5 Thể Loại dropdown -->
            <button class="mm-nav-full mm-glass mm-phim-btn" id="mmLoaiBtn">
                ${icon('theaters', 'font-size:24px;color:#aaabad;')}
                <span class="mm-nav-full-text">Thể Loại</span>
                <div style="margin-left:auto;">${icon('expand_more', 'font-size:22px;color:rgba(255,255,255,0.3);transition:transform 0.25s;')}</div>
            </button>
            <div id="mmLoaiDrop" style="display:none;padding:0 4px 4px;">
                <div class="mm-dropdown-panel-blue">
                    <div class="mm-dropdown-panel-blue-scroll">
                        <div class="mm-grid-2" id="mmLoaiDropGrid">
                            <!-- Danh sách thể loại loading -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3-6. Grid cột -->
            <div class="mm-grid-2">
                <a href="/danh-sach" class="mm-card-item mm-glass color-blue">
                    ${icon('view_list', 'font-size:22px;')}
                    <span class="mm-card-label">Danh Sách</span>
                </a>
                <a href="search.html" class="mm-card-item mm-glass color-green" style="position:relative;">
                    <div class="mm-badge-new">Mới</div>
                    ${icon('explore', 'font-size:22px;')}
                    <span class="mm-card-label">Khám Phá</span>
                </a>
                <a href="/pricing" class="mm-card-item mm-glass color-orange">
                    ${icon('payments', 'font-size:22px;')}
                    <span class="mm-card-label">Gói Cước</span>
                </a>
                <a href="/lich-chieu" class="mm-card-item mm-glass" style="background:rgba(139,92,246,0.15);border-color:rgba(139,92,246,0.3);">
                    ${icon('event', 'font-size:22px;color:#a78bfa;')}
                    <span class="mm-card-label" style="color:#a78bfa;">Lịch Chiếu</span>
                </a>
            </div>

            <!-- UPGRADE BANNER -->
            <div class="mm-upgrade-banner mm-glass">
                <div class="mm-upgrade-glow"></div>
                <div style="position:relative;z-index:1;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                        ${icon('stars', 'color:#FFD700;font-size:22px;')}
                        <span class="mm-upgrade-title">Nâng cấp trải nghiệm</span>
                    </div>
                    <p class="mm-upgrade-desc">Xem phim không quảng cáo, chất lượng HD và tốc độ tải nhanh hơn.</p>
                    <a href="/pricing" class="mm-upgrade-btn" style="display:block; text-align:center; text-decoration:none; box-sizing:border-box;">NÂNG CẤP NGAY</a>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="mm-footer">
                <div class="mm-footer-div"></div>
                <div class="mm-footer-row">
                    <span class="mm-footer-version">A Phim</span>
                    <div class="mm-footer-links">
                        <a href="/profile" class="mm-footer-link">
                            ${icon('settings', 'font-size:16px;')} Cài đặt
                        </a>
                        ${user
                ? `<button class="mm-footer-link danger" onclick="if(window.doLogout){window.doLogout();}else if(window.authService){window.authService.logout();}else{localStorage.clear();window.location.href='/';}">
                               ${icon('logout', 'font-size:16px;')} Đăng xuất
                           </button>`
                : `<a href="/login" onclick="if(window.showAuthModal){event.preventDefault(); if(window.closeMobileMenu) window.closeMobileMenu(); window.showAuthModal('login'); return false;}" class="mm-footer-link" style="color:#fcd576; font-weight:700; background: rgba(252,213,118,0.1); padding: 6px 12px; border-radius: 20px;">
                               ${icon('login', 'font-size:16px;')} Đăng nhập
                           </a>`
            }
                    </div>
                </div>
            </div>

        </div>
        `;

        document.body.appendChild(drawer);

        const mmCloseBtn = document.getElementById('mmCloseBtn');
        if (mmCloseBtn) {
            mmCloseBtn.addEventListener('click', closeMenu);
        }

        // 1. Phim dropdown toggle
        const phimBtn = document.getElementById('mmPhimBtn');
        const phimDrop = document.getElementById('mmPhimDrop');
        const expandIconPhim = phimBtn ? phimBtn.querySelector('.material-icons-round:last-of-type') : null;
        let phimOpen = false;
        if (phimBtn && phimDrop) {
            phimBtn.addEventListener('click', () => {
                phimOpen = !phimOpen;
                phimDrop.style.display = phimOpen ? 'block' : 'none';
                if (expandIconPhim) expandIconPhim.style.transform = phimOpen ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        }

        // 2. Thể Loại dropdown toggle
        const loaiBtn = document.getElementById('mmLoaiBtn');
        const loaiDrop = document.getElementById('mmLoaiDrop');
        const expandIconLoai = loaiBtn ? loaiBtn.querySelector('.material-icons-round:last-of-type') : null;
        let loaiOpen = false;
        if (loaiBtn && loaiDrop) {
            loaiBtn.addEventListener('click', () => {
                loaiOpen = !loaiOpen;
                loaiDrop.style.display = loaiOpen ? 'block' : 'none';
                if (expandIconLoai) expandIconLoai.style.transform = loaiOpen ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        }

        // --- Load động Quốc Gia vào menu mobile ---
        const mmPhimDropGrid = document.getElementById('mmPhimDropGrid');
        if (mmPhimDropGrid) {
            const countries = [
                { slug: 'viet-nam', name: 'Việt Nam' }, { slug: 'trung-quoc', name: 'Trung Quốc' },
                { slug: 'han-quoc', name: 'Hàn Quốc' }, { slug: 'nhat-ban', name: 'Nhật Bản' },
                { slug: 'thai-lan', name: 'Thái Lan' }, { slug: 'au-my', name: 'Âu Mỹ' },
                { slug: 'dai-loan', name: 'Đài Loan' }, { slug: 'hong-kong', name: 'Hồng Kông' },
                { slug: 'an-do', name: 'Ấn Độ' }, { slug: 'anh', name: 'Anh' },
                { slug: 'phap', name: 'Pháp' }, { slug: 'canada', name: 'Canada' },
                { slug: 'duc', name: 'Đức' }, { slug: 'tay-ban-nha', name: 'Tây Ban Nha' },
                { slug: 'tho-nhi-ky', name: 'Thổ Nhĩ Kỳ' }, { slug: 'ha-lan', name: 'Hà Lan' },
                { slug: 'indonesia', name: 'Indonesia' }, { slug: 'nga', name: 'Nga' },
                { slug: 'mexico', name: 'Mexico' }, { slug: 'ba-lan', name: 'Ba Lan' },
                { slug: 'uc', name: 'Úc' }, { slug: 'thuy-dien', name: 'Thụy Điển' },
                { slug: 'malaysia', name: 'Malaysia' }, { slug: 'brazil', name: 'Brazil' },
                { slug: 'philippines', name: 'Philippines' }, { slug: 'bo-dao-nha', name: 'Bồ Đào Nha' },
                { slug: 'y', name: 'Ý' }, { slug: 'dan-mach', name: 'Đan Mạch' },
                { slug: 'uae', name: 'UAE' }, { slug: 'na-uy', name: 'Na Uy' },
                { slug: 'thuy-si', name: 'Thụy Sĩ' }, { slug: 'chau-phi', name: 'Châu Phi' },
                { slug: 'nam-phi', name: 'Nam Phi' }, { slug: 'ukraina', name: 'Ukraina' },
                { slug: 'a-rap-xe-ut', name: 'Ả Rập Xê Út' }
            ];

            const flagCodes = {
                'viet-nam': 'vn', 'trung-quoc': 'cn', 'han-quoc': 'kr', 'nhat-ban': 'jp',
                'thai-lan': 'th', 'au-my': 'us', 'dai-loan': 'tw', 'hong-kong': 'hk',
                'an-do': 'in', 'anh': 'gb', 'phap': 'fr', 'canada': 'ca', 'duc': 'de',
                'tay-ban-nha': 'es', 'tho-nhi-ky': 'tr', 'ha-lan': 'nl', 'indonesia': 'id',
                'nga': 'ru', 'mexico': 'mx', 'ba-lan': 'pl', 'uc': 'au', 'thuy-dien': 'se',
                'malaysia': 'my', 'brazil': 'br', 'philippines': 'ph', 'bo-dao-nha': 'pt',
                'y': 'it', 'dan-mach': 'dk', 'uae': 'ae', 'na-uy': 'no', 'thuy-si': 'ch',
                'chau-phi': 'globe', 'nam-phi': 'za', 'ukraina': 'ua', 'a-rap-xe-ut': 'sa'
            };

            mmPhimDropGrid.innerHTML = countries.map(c => {
                const code = flagCodes[c.slug] || 'globe';
                const iconHtml = (code === 'globe')
                    ? `<span style="font-size: 20px; line-height: 1;">🌍</span>`
                    : `<img src="https://flagcdn.com/16x12/${code}.png" alt="${code}" style="width:16px;height:12px;object-fit:cover;border-radius:2px;">`;
                return `
                    <a href="/phim-theo-quoc-gia?country=${c.slug}" class="mm-card-item mm-glass">
                        ${iconHtml}
                        <span class="mm-card-label" style="margin-left: 4px;">${c.name}</span>
                    </a>
                `;
            }).join('');
        }

        // --- Load động Thể Loại vào menu mobile ---
        const mmLoaiDropGrid = document.getElementById('mmLoaiDropGrid');
        if (mmLoaiDropGrid) {
            const categories = [
                { slug: 'hanh-dong', name: 'Hành Động' }, { slug: 'tinh-cam', name: 'Tình Cảm' },
                { slug: 'hai-huoc', name: 'Hài Hước' }, { slug: 'co-trang', name: 'Cổ Trang' },
                { slug: 'tam-ly', name: 'Tâm Lý' }, { slug: 'hinh-su', name: 'Hình Sự' },
                { slug: 'chien-tranh', name: 'Chiến Tranh' }, { slug: 'the-thao', name: 'Thể Thao' },
                { slug: 'vo-thuat', name: 'Võ Thuật' }, { slug: 'vien-tuong', name: 'Viễn Tưởng' },
                { slug: 'phieu-luu', name: 'Phiêu Lưu' }, { slug: 'khoa-hoc', name: 'Khoa Học' },
                { slug: 'kinh-di', name: 'Kinh Dị' }, { slug: 'am-nhac', name: 'Âm Nhạc' },
                { slug: 'than-thoai', name: 'Thần Thoại' }, { slug: 'tai-lieu', name: 'Tài Liệu' },
                { slug: 'gia-dinh', name: 'Gia Đình' }, { slug: 'chinh-kich', name: 'Chính kịch' },
                { slug: 'bi-an', name: 'Bí ẩn' }, { slug: 'hoc-duong', name: 'Học Đường' },
                { slug: 'kinh-dien', name: 'Kinh Điển' }, { slug: 'phim-18', name: 'Phim 18+' },
                { slug: 'short-drama', name: 'Short Drama' }
            ];

            mmLoaiDropGrid.innerHTML = categories.map(c => `
                <a href="/categories?category=${c.slug}" class="mm-card-item mm-glass">
                    <span class="mm-card-label">${c.name}</span>
                </a>
            `).join('');
        }
    }

    /* ── OPEN / CLOSE ── */
    let _drawerBuilt = false;

    function ensureDrawerBuilt() {
        if (_drawerBuilt) return;
        buildDrawer();
        _drawerBuilt = true;
    }

    function openMenu() {
        ensureDrawerBuilt();
        document.getElementById('mm-overlay') && document.getElementById('mm-overlay').classList.add('open');
        document.getElementById('mm-drawer') && document.getElementById('mm-drawer').classList.add('open');
        document.body.classList.add('mm-open');
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'contain';
        const burger = document.querySelector('.mm-burger-btn');
        if (burger) burger.classList.add('open');
    }

    function closeMenu() {
        const overlay = document.getElementById('mm-overlay');
        const drawer = document.getElementById('mm-drawer');
        if (overlay) overlay.classList.remove('open');
        if (drawer) drawer.classList.remove('open');
        document.body.classList.remove('mm-open');
        document.body.classList.add('mm-closing');
        setTimeout(() => document.body.classList.remove('mm-closing'), 350);
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
        const burger = document.querySelector('.mm-burger-btn');
        if (burger) burger.classList.remove('open');
    }

    function rebuildMenu() {
        _drawerBuilt = false;
        const drawer = document.getElementById('mm-drawer');
        const overlay = document.getElementById('mm-overlay');
        const wasOpen = drawer && drawer.classList.contains('open');
        if (drawer) drawer.remove();
        if (overlay) overlay.remove();
        buildDrawer();
        _drawerBuilt = true;
        if (wasOpen) openMenu();
    }

    /* ── UPDATE USER IN MENU ── */
    window.updateMobileMenuUser = function () {
        if (!_drawerBuilt) return;
        rebuildMenu();
    };

    document.addEventListener('auth:profileSynced', window.updateMobileMenuUser);
    document.addEventListener('auth:profileUpdated', window.updateMobileMenuUser);
    document.addEventListener('ap:user-updated', window.updateMobileMenuUser);
    document.addEventListener('auth:logout', window.updateMobileMenuUser);

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    /* ── INIT ── */
    function init() {
        suppressOldMenu();
        setupBtn();
        if (window.innerWidth < 1200) {
            setTimeout(ensureDrawerBuilt, 300);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.openMobileMenu = openMenu;
    window.closeMobileMenu = closeMenu;
    window.rebuildMobileMenu = rebuildMenu;
})();
