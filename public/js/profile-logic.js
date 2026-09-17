// ═══ PROFILE PAGE LOGIC ═══
let currentTab = 'account';
let currentUser = null;

function purgeLegacyTestData() {
  try {
    const u = getUser();
    if (u && (u.email === 'testuser@aphim.vn' || u.id === 'test_user_vip' || u.id === 'demo_user_test')) {
      localStorage.removeItem('cinestream_user');
      localStorage.removeItem('cinestream_token');
      localStorage.removeItem('cinestream_xu');
      localStorage.removeItem('cinestream_playlists');
      localStorage.removeItem('cinestream_favorites');
      localStorage.removeItem('cinestream_watch_history');
      localStorage.removeItem('cinestream_watchlist');
      if (typeof authService !== 'undefined') authService.currentUser = null;
    }
  } catch (e) { }
}
purgeLegacyTestData();

function getUser() {
  try {
    if (typeof authService !== 'undefined') return authService.getCurrentUser();
    return JSON.parse(localStorage.getItem('cinestream_user') || 'null');
  } catch (e) { return null; }
}

var BANNERS_MAP = window.BANNERS_MAP || {
  'banner_default': { id: 'banner_default', name: 'Mặc định', bgStyle: 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;' },
  'banner_gold': { id: 'banner_gold', name: 'Hoàng Gia Gold', bgStyle: 'background: linear-gradient(135deg, #78350f 0%, #b45309 35%, #f59e0b 70%, #fef08a 100%) !important;' },
  'banner_forest': { id: 'banner_forest', name: 'Rừng Đêm Dạ Quang', bgStyle: 'background: linear-gradient(135deg, #064e3b 0%, #047857 35%, #10b981 70%, #6ee7b7 100%) !important;' },
  'banner_cyber': { id: 'banner_cyber', name: 'Cyberpunk Neon 2026', bgStyle: 'background: linear-gradient(135deg, #3b0764 0%, #6b21a8 35%, #a855f7 70%, #38bdf8 100%) !important;' },
  'banner_sakura': { id: 'banner_sakura', name: 'Hoa Anh Đào Sakura', bgStyle: 'background: linear-gradient(135deg, #831843 0%, #be185d 35%, #ec4899 70%, #fbcfe8 100%) !important;' },
  'banner_sunset': { id: 'banner_sunset', name: 'Sóng Biển Hoàng Hôn', bgStyle: 'background: linear-gradient(135deg, #1e1b4b 0%, #431407 30%, #ea580c 70%, #fcd34d 100%) !important;' },
  'banner_space': { id: 'banner_space', name: 'Vũ Trụ Starry Night', bgStyle: 'background: linear-gradient(135deg, #020617 0%, #1e1b4b 35%, #4338ca 70%, #818cf8 100%) !important;' },
  'banner_meteor': { id: 'banner_meteor', name: 'Thiên Thạch Rực Rỡ', bgStyle: 'background: linear-gradient(135deg, #450a0a 0%, #991b1b 35%, #ea580c 70%, #fde047 100%) !important;' },
  'banner_cinema': { id: 'banner_cinema', name: 'Bom Tấn Rạp Phim', bgStyle: 'background: linear-gradient(135deg, #450a0a 0%, #b91c1c 30%, #f59e0b 70%, #fef08a 100%) !important; background-size: 200% 200% !important; animation: shopRainbowShift 4s ease infinite !important;' }
};
window.BANNERS_MAP = BANNERS_MAP;

function applyEquippedBanner(coverEl, u) {
  const targets = coverEl ? [coverEl] : Array.from(document.querySelectorAll('#sidebarCoverEl, .sidebar-cover, #rightCoverEl, .avatar-panel-cover'));
  if (!targets || targets.length === 0) return;
  const bannerId = (u && u.equippedBanner) || localStorage.getItem('ap_equipped_banner') || 'banner_default';
  const banner = BANNERS_MAP[bannerId] || BANNERS_MAP['banner_default'];
  const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('light-mode');

  let activeBgStyle = (banner && banner.bgStyle) || '';
  if (bannerId === 'banner_default' || bannerId === 'none') {
    activeBgStyle = isLight
      ? 'background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%) !important; border-bottom: 1px solid rgba(0,0,0,0.06);'
      : 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;';
  }

  targets.forEach(el => {
    if (!el) return;
    Array.from(el.classList).forEach(c => {
      if (c.startsWith('ap-banner-')) el.classList.remove(c);
    });
    el.classList.add(`ap-banner-${bannerId}`);
    if (bannerId !== 'banner_default' && bannerId !== 'none') {
      el.classList.add('has-custom-banner');
    } else {
      el.classList.remove('has-custom-banner');
    }

    const isSidebar = el.id === 'sidebarCoverEl' || el.classList.contains('sidebar-cover');
    const isRight = el.classList.contains('avatar-panel-cover') || el.id === 'rightCoverEl';
    if (activeBgStyle) {
      if (isSidebar) {
        el.setAttribute('style', `${activeBgStyle} position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; min-height: 100%; border-radius: inherit; z-index: 1; overflow: hidden; transition: all 0.3s ease;`);
      } else {
        const h = isRight ? '105px' : '120px';
        el.setAttribute('style', `${activeBgStyle} height: ${h}; min-height: ${h}; position: relative; overflow: hidden; flex-shrink: 0; transition: all 0.3s ease;`);
      }
    }
  });

  // Tự động đồng bộ ánh xạ hào quang ở mép dưới header
  if (typeof window.applyProfileBannerAura === 'function') {
    window.applyProfileBannerAura(bannerId);
  }
  window.dispatchEvent(new CustomEvent('aphim:banner-equipped', { detail: { bannerId } }));
}
window.applyEquippedBanner = applyEquippedBanner;

function initSidebar() {
  currentUser = getUser();
  const u = currentUser;

  const nameEl = document.getElementById('sidebarNameEl');
  const emailEl = document.getElementById('sidebarEmailEl');
  const avatarEl = document.getElementById('sidebarAvatarEl');
  const histEl = document.getElementById('sidebarHistCount');
  const favEl = document.getElementById('sidebarFavCount');
  const levelTxt = document.getElementById('sidebarLevelTxt');
  const xpTxt = document.getElementById('sidebarXpTxt');
  const fillEl = document.getElementById('sidebarProgressFill');

  // Apply equipped banner to top-left sidebar cover
  applyEquippedBanner(document.getElementById('sidebarCoverEl'), u);

  if (u) {
    if (nameEl) {
      nameEl.textContent = u.displayName || u.name || 'Người dùng';
      if (typeof applyEquippedNameColor === 'function') applyEquippedNameColor(nameEl, u);
    }
    if (emailEl) emailEl.textContent = u.email || '';
    const letter = (u.displayName || u.name || u.email || 'U').charAt(0).toUpperCase();
    const frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(u) : { type: 'none', value: '' };
    const avatarWrap = document.getElementById('sidebarAvatarWrap') || (avatarEl ? (avatarEl.classList.contains('sidebar-avatar-wrap') ? avatarEl : avatarEl.parentElement) : null);
    if (avatarWrap) {
      const innerAvatarContent = u.avatar
        ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : `<span style="font-size:26px;font-weight:900;color:#1a1000;">${letter}</span>`;
      const renderedAvatarHtml = typeof renderAvatarWithFrame === 'function'
        ? renderAvatarWithFrame(innerAvatarContent, 64, frameInfo)
        : `<div class="sidebar-avatar">${innerAvatarContent}</div>`;
      avatarWrap.innerHTML = `<div id="sidebarAvatarEl" style="display:inline-flex; align-items:center; justify-content:center;">${renderedAvatarHtml}</div>`;
    }

    const sidebarBadgeWrap = document.querySelector('.sidebar-user-info .sidebar-badge, .sidebar-user-info .user-badge');
    if (sidebarBadgeWrap) {
      const bText = typeof getEquippedBadge === 'function' ? getEquippedBadge(u) : 'LV.15';
      const renderedBadge = typeof renderUserBadgeHtml === 'function' ? renderUserBadgeHtml(bText) : `<div class="sidebar-badge">${bText}</div>`;
      sidebarBadgeWrap.outerHTML = renderedBadge;
    }
  }

  try {
    const hist = JSON.parse(localStorage.getItem('cinestream_watch_history') || '[]');
    const favs = JSON.parse(localStorage.getItem('cinestream_favorites') || '[]');
    const playlists = typeof playlistService !== 'undefined' ? playlistService.getAll() : JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
    const items = JSON.parse(localStorage.getItem('ap_user_items') || '[]');

    if (histEl) histEl.textContent = hist.length;
    if (favEl) favEl.textContent = favs.length;

    // Calculate total XP from achievements
    let totalXP = 10; // Profile ready badge
    if (hist.length >= 5) totalXP += 50;
    if (favs.length >= 5) totalXP += 50;
    if (playlists.length >= 1) totalXP += 60;
    if (u && u.isVip) totalXP += 100;
    if (items.length >= 10) totalXP += 80;

    const level = Math.floor(totalXP / 100) + 1;
    const progressXp = totalXP % 100;

    if (levelTxt) levelTxt.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9v3a6 6 0 0012 0V9M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2m12 6h2a2 2 0 002-2V5a2 2 0 00-2-2h-2M12 18v3m-4 0h8"/></svg> VIP Level ${level}`;
    if (xpTxt) xpTxt.textContent = `${progressXp} / 100 XP`;
    if (fillEl) fillEl.style.width = `${progressXp}%`;
  } catch (e) { }
}

function switchTab(tab) {
  // Tự động đồng bộ tên mới nhất từ ô input tài khoản khi chuyển tab (ví dụ sang Shop)
  const accNameInput = document.getElementById('accDisplayName');
  if (accNameInput && accNameInput.value) {
    const freshName = accNameInput.value.trim() || 'Người dùng';
    if (!currentUser) currentUser = getUser() || {};
    currentUser.displayName = freshName;
    currentUser.name = freshName;
    currentUser.fullName = freshName;
    try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
    if (typeof authService !== 'undefined') {
      if (authService.currentUser) {
        authService.currentUser.displayName = freshName;
        authService.currentUser.name = freshName;
        authService.currentUser.fullName = freshName;
      }
      if (typeof authService.saveUser === 'function') authService.saveUser(currentUser);
    }
  }

  currentTab = tab;

  // Update sidebar nav active
  document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById('snav-' + tab);
  if (activeNav) activeNav.classList.add('active');

  // Update header text
  const configs = {
    account: { title: 'Tài khoản & Thiết bị', sub: 'Cập nhật thông tin cá nhân và quản lý đăng nhập', badge: 'Thành viên VIP' },
    shop: { title: 'Cửa hàng VIP APhim', sub: 'Đổi Xu lấy gói VIP Premium, vật phẩm & quà tặng', badge: 'Cửa hàng VIP' },
    favorites: { title: 'Bộ sưu tập Yêu thích', sub: 'Danh sách các bộ phim bạn đã lưu', badge: '' },
    history: { title: 'Lịch sử xem phim', sub: 'Các bộ phim bạn đã theo dõi gần đây', badge: '' },
    watchlist: { title: 'Danh sách phát sau', sub: 'Phim đã thêm để dành thời gian xem sau', badge: '' },
    cinema: { title: 'Lịch chiếu rạp Quốc Gia', sub: 'Phim đang và sắp chiếu tại các cụm rạp', badge: 'Cập nhật 2026' },
    achievements: { title: 'Thành tựu & Huy hiệu', sub: 'Danh hiệu và mốc thành tích xem phim của bạn', badge: 'Bảng Vàng' },
    settings: { title: 'Cài đặt tiện ích', sub: 'Tùy chỉnh trải nghiệm xem phim', badge: '' },
    notifications: { title: 'Trung tâm thông báo', sub: 'Thông báo cập nhật phim mới & ưu đãi VIP', badge: '' },
  };
  const cfg = configs[tab] || configs.account;
  document.getElementById('headerTitle').textContent = cfg.title;
  document.getElementById('headerSub').textContent = cfg.sub;
  const badgeEl = document.getElementById('headerBadge');
  const coinChip = document.getElementById('headerCoinChip');
  const dailyBtn = document.getElementById('headerDailyBonusBtn');
  const seedBtn = document.getElementById('headerSeedDemoBtn');
  const isMobile = window.innerWidth < 1024;

  if (isMobile) {
    if (tab === 'shop') {
      if (coinChip) {
        coinChip.style.display = 'inline-flex';
        const valEl = document.getElementById('headerCoinVal');
        const u = getUser();
        const cCoins = (u && u.xu != null) ? u.xu : (u && u.coins != null ? u.coins : (Number(localStorage.getItem('cinestream_xu')) || 150));
        if (valEl) valEl.textContent = Number(cCoins).toLocaleString();
      }
      if (seedBtn) seedBtn.style.display = 'none';
      if (dailyBtn) dailyBtn.style.display = 'none';
      if (badgeEl) badgeEl.style.display = 'none';
    } else {
      if (coinChip) coinChip.style.display = 'none';
      if (seedBtn) seedBtn.style.display = 'none';
      if (dailyBtn) dailyBtn.style.display = 'inline-flex';
      // Count badge
      try {
        if (tab === 'favorites') {
          const n = JSON.parse(localStorage.getItem('cinestream_favorites') || '[]').length;
          badgeEl.textContent = `${n} phim đã lưu`;
          badgeEl.style.display = '';
        } else if (tab === 'history') {
          const n = JSON.parse(localStorage.getItem('cinestream_watch_history') || '[]').length;
          badgeEl.textContent = `${n} bộ phim`;
          badgeEl.style.display = '';
        } else if (tab === 'watchlist') {
          const n = JSON.parse(localStorage.getItem('cinestream_watchlist') || '[]').length;
          badgeEl.textContent = `${n} phim`;
          badgeEl.style.display = '';
        } else if (cfg.badge) {
          badgeEl.textContent = cfg.badge;
          badgeEl.style.display = '';
        } else {
          badgeEl.style.display = 'none';
        }
      } catch (e) { }
    }
  } else {
    // Desktop: Always hide mobile coin chip, always show Seed demo button, Daily bonus, and badge
    if (coinChip) coinChip.style.display = 'none';
    if (seedBtn) seedBtn.style.display = 'inline-flex';
    if (dailyBtn) dailyBtn.style.display = 'inline-flex';
    try {
      if (tab === 'favorites') {
        const n = JSON.parse(localStorage.getItem('cinestream_favorites') || '[]').length;
        badgeEl.textContent = `${n} phim đã lưu`;
        badgeEl.style.display = '';
      } else if (tab === 'history') {
        const n = JSON.parse(localStorage.getItem('cinestream_watch_history') || '[]').length;
        badgeEl.textContent = `${n} bộ phim`;
        badgeEl.style.display = '';
      } else if (tab === 'watchlist') {
        const n = JSON.parse(localStorage.getItem('cinestream_watchlist') || '[]').length;
        badgeEl.textContent = `${n} phim`;
        badgeEl.style.display = '';
      } else if (cfg.badge) {
        badgeEl.textContent = cfg.badge;
        badgeEl.style.display = '';
      } else {
        badgeEl.style.display = 'none';
      }
    } catch (e) { }
  }

  // Render panel
  renderTab(tab);

  // Persistent storage & URL state
  try { sessionStorage.setItem('aphim_active_profile_tab', tab); } catch (e) { }
  window.history.replaceState({ tab }, '', '/profile?tab=' + tab);

  // Load cinema if needed (fetch 3 pages concurrently for ~72 movies)
  if (tab === 'cinema' && !window._cinemaCache) {
    window._cinemaCache = null;
    const BASE = 'https://phimapi.com/v1/api/danh-sach/phim-chieu-rap?page=';
    Promise.all([1, 2, 3].map(p => fetch(BASE + p).then(r => r.json()).catch(() => null)))
      .then(pages => {
        const all = [];
        pages.forEach(d => {
          const items = (d && d.data && d.data.items) ? d.data.items : (d && d.items ? d.items : []);
          items.forEach(it => { if (!all.find(x => x.slug === it.slug)) all.push(it); });
        });
        window._cinemaCache = all;
        window._cineGenre = null;
        if (currentTab === 'cinema') renderTab('cinema');
      }).catch(() => { window._cinemaCache = []; if (currentTab === 'cinema') renderTab('cinema'); });
  }
}

function renderTab(tab) {
  const panel = document.getElementById('tabPanel');
  if (!panel) return;
  if (!currentUser || !currentUser.displayName) currentUser = getUser() || currentUser;
  const u = currentUser;

  if (tab === 'account') {
    if (!u) { panel.innerHTML = renderEmpty('Vui lòng đăng nhập', 'Đăng nhập để quản lý tài khoản của bạn.', 'login'); return; }
    panel.innerHTML = renderAccount(u);
    initToggles();
    if (typeof applyEquippedBanner === 'function') applyEquippedBanner(document.getElementById('rightCoverEl'), u);
  } else if (tab === 'shop') {
    panel.innerHTML = renderShop(u);
  } else if (tab === 'favorites') {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('cinestream_favorites') || '[]'); } catch (e) { }
    if (!items.length) { panel.innerHTML = renderEmpty('Chưa có phim yêu thích', 'Nhấn vào biểu tượng tim khi xem phim để lưu vào đây.'); return; }
    const headerHtml = `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <h3 style="font-size:16px;font-weight:800;color:#ffffff;margin:0;">Bộ sưu tập Yêu thích</h3>
                    <span style="padding:4px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:20px;font-size:11.5px;color:#94a3b8;font-weight:600;">Trang 1/1 · Tổng ${items.length} phim đã lưu</span>
                </div>
            </div>
        `;
    panel.innerHTML = `<div class="panel-card">${headerHtml}<div class="movie-grid">${items.map(it => renderMovieCard(it, 'favorites')).join('')}</div></div>`;
  } else if (tab === 'history') {
    let items = [];
    try {
      if (typeof userService !== 'undefined') items = userService.getWatchHistory();
      else items = JSON.parse(localStorage.getItem('cinestream_watch_history') || '[]');
    } catch (e) { }
    if (!items.length) { panel.innerHTML = renderEmpty('Chưa có lịch sử', 'Bạn chưa xem bộ phim nào. Khám phá ngay!'); return; }
    const headerHtml = `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <h3 style="font-size:16px;font-weight:800;color:#ffffff;margin:0;">Lịch sử xem</h3>
                    <span style="padding:4px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:20px;font-size:11.5px;color:#94a3b8;font-weight:600;">Trang 1/1 · Tổng ${items.length} lịch sử xem</span>
                </div>
                <button onclick="clearHistory()" style="padding:6px 16px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.1);color:#ef4444;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">Xóa tất cả</button>
            </div>
        `;
    panel.innerHTML = `<div class="panel-card">${headerHtml}<div class="movie-grid">${items.map(it => renderMovieCard(it, 'history')).join('')}</div></div>`;
  } else if (tab === 'watchlist' || tab === 'playlists') {
    panel.innerHTML = renderPlaylistsTab(u);
  } else if (tab === 'cinema') {
    const movies = window._cinemaCache;
    if (!movies) {
      panel.innerHTML = `<div class="panel-card" style="min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;">
              <div style="position:relative;width:56px;height:56px;">
                <div style="position:absolute;inset:0;border-radius:50%;border:3px solid rgba(252,213,118,0.15);"></div>
                <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#fcd576;animation:spin 0.9s linear infinite;"></div>
                <div style="position:absolute;inset:10px;border-radius:50%;border:2px solid transparent;border-top-color:rgba(252,213,118,0.4);animation:spin 1.4s linear infinite reverse;"></div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:15px;font-weight:800;color:#e2e8f0;margin-bottom:6px;">&#272;ang t&#7843;i l&#7883;ch chi&#7871;u r&#7841;p...</div>
                <div style="font-size:12.5px;color:#64748b;">&#272;ang l&#7845;y d&#7919; li&#7879;u t&#7915; phimapi.com</div>
              </div>
            </div>`;
      return;
    }
    if (!movies.length) { panel.innerHTML = renderEmpty('Ch\u01b0a c\u00f3 l\u1ecbch chi\u1ebfu r\u1ea1p', 'D\u1eef li\u1ec7u \u0111ang \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt...'); return; }

    // Build genre list from data
    const allGenres = new Set();
    movies.forEach(m => (m.category || []).forEach(c => allGenres.add(c.name)));
    const genreList = ['T\u1ea5t c\u1ea3', ...Array.from(allGenres).slice(0, 8)];
    const activeGenre = window._cineGenre || 'T\u1ea5t c\u1ea3';
    const filtered = activeGenre === 'T\u1ea5t c\u1ea3' ? movies : movies.filter(m => (m.category || []).some(c => c.name === activeGenre));

    const ITEMS_PER_PAGE = 12;
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    let curPage = Math.min(Math.max(1, (window._movieTabPages && window._movieTabPages.cinema) || 1), totalPages);
    if (!window._movieTabPages) window._movieTabPages = {};
    window._movieTabPages.cinema = curPage;
    const pagedMovies = filtered.slice((curPage - 1) * ITEMS_PER_PAGE, curPage * ITEMS_PER_PAGE);
    const badgeText = totalPages > 1 ? `${curPage}/${totalPages} \u00b7 ${filtered.length} phim` : `${filtered.length} phim`;

    const genrePillsHtml = genreList.map(g => {
      const isActive = g === activeGenre;
      return `<button onclick="setCineGenre('${g}')" class="cine-genre-pill ${isActive ? 'active' : ''}">${g}</button>`;
    }).join('');

    const headerHtml = `<div class="panel-sub-header"><div class="panel-sub-header-left"><h3 class="panel-sub-title">🎬 Lịch chiếu rạp Quốc Gia</h3><span class="panel-sub-badge">${badgeText}</span></div><button onclick="refreshCinema()" class="cinema-refresh-btn" style="padding:5px 12px;border:1px solid rgba(252,213,118,0.25);background:rgba(252,213,118,0.08);color:#fcd576;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">↻ Làm mới</button></div><div class="cine-genre-scroll-bar">${genrePillsHtml}</div>`;
    panel.innerHTML = `<div class="panel-card" style="min-height:520px;display:flex;flex-direction:column;">${headerHtml}<div class="movie-grid" style="flex:1;">${pagedMovies.map(it => renderCinemaCard(it)).join('')}</div></div>`;
  } else if (tab === 'achievements') {
    panel.innerHTML = renderAchievements(u);
  } else if (tab === 'settings') {
    panel.innerHTML = renderSettings();
    initToggles();
  } else if (tab === 'notifications') {
    panel.innerHTML = renderNotifications();
  }
}

// ─── MOVIE CARD RENDERER ───
function renderMovieCard(item, type) {
  const slug = item.slug || item.id || '';
  const title = item.name || item.title || item.name_vi || 'Phim';
  const nameEn = item.origin_name || item.name_en || (item.year ? `Năm ${item.year}` : 'Phim Vietsub HD');

  let poster = item.poster || item.thumb || item.thumb_url || item.poster_url || '';
  if (poster && !poster.startsWith('http')) {
    poster = 'https://phimimg.com/' + poster.replace(/^\/+/, '');
  }
  if (!poster) {
    poster = 'https://phimimg.com/uploads/movies/20260827/nguoi-nhen-khoi-dau-moi-poster.webp';
  }

  let removeOnClick = '';
  if (type === 'favorites') removeOnClick = `removeFav('${slug}')`;
  if (type === 'history') removeOnClick = `removeHist('${slug}')`;
  if (type === 'watchlist') removeOnClick = `removeWl('${slug}')`;

  let removeBtnHtml = '';
  if (removeOnClick) {
    removeBtnHtml = `
            <button onclick="event.preventDefault(); event.stopPropagation(); ${removeOnClick};" 
                    title="Xóa khỏi danh sách"
                    style="position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:8px;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.2);color:#ffffff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;z-index:10;cursor:pointer;transition:all 0.2s;"
                    onmouseover="this.style.background='#ef4444';this.style.borderColor='#ef4444';"
                    onmouseout="this.style.background='rgba(0,0,0,0.65)';this.style.borderColor='rgba(255,255,255,0.2)';">
                ✕
            </button>
        `;
  }

  let progressLine = '';
  let metaText = '';

  if (type === 'history') {
    let prog = {};
    try { prog = JSON.parse(localStorage.getItem('cinestream_watch_progress') || '{}'); } catch (e) { }
    const key = item.episodeSlug ? `${slug}_${item.episodeSlug}` : slug;
    const p = prog[key] || prog[slug] || {};
    const curr = Number(p.currentTime || item.currentTime || 0);
    const dur = Number(p.duration || item.duration || 0);
    const pct = dur > 0 && curr > 0 ? Math.min(100, Math.round(curr / dur * 100)) : 0;

    const currMin = Math.floor(curr / 60);
    const durMin = Math.floor(dur / 60);
    const epPrefix = item.episode ? `Tập ${item.episode} · ` : (durMin > 0 ? '' : 'Full · ');

    if (durMin > 0) {
      metaText = `${epPrefix}${currMin}m / ${durMin}m`;
    } else if (pct > 0) {
      metaText = `Đã xem ${pct}%`;
    } else {
      metaText = `${epPrefix}0m / 120m`;
    }

    progressLine = `
            <div style="width:100%;height:3.5px;background:rgba(255,255,255,0.12);border-radius:2px;margin-top:7px;overflow:hidden;">
                <div style="height:100%;background:linear-gradient(90deg, #e50914, #ff4d4d);border-radius:2px;width:${Math.max(pct, 5)}%;"></div>
            </div>
        `;
  } else {
    metaText = item.year ? `Năm ${item.year}` : 'Phim Vietsub';
  }

  let movieLink = `/phim/${slug}`;
  if (type === 'history') {
    if (item.episodeSlug) {
      const ep = String(item.episodeSlug).startsWith('tap-') ? item.episodeSlug : `tap-${item.episodeSlug}`;
      movieLink = `/xem-phim/${slug}/${ep}`;
    } else if (item.episode) {
      const rawEp = String(item.episode).toLowerCase().replace(/\s+/g, '-').replace('tập-', '');
      movieLink = `/xem-phim/${slug}/tap-${rawEp}`;
    } else {
      movieLink = `/xem-phim/${slug}`;
    }
  }

  return `
        <div class="movie-card">
            <a href="${movieLink}" style="display:block;text-decoration:none;">
                <div class="movie-poster-wrap">
                    ${removeBtnHtml}
                    <img src="${poster}" class="movie-poster" alt="${title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://phimimg.com/uploads/movies/20260827/nguoi-nhen-khoi-dau-moi-poster.webp';">
                </div>
                ${progressLine}
                <div class="movie-info">
                    <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-top:${progressLine ? '5px' : '6px'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${metaText}</div>
                    <div class="movie-title" style="font-size:13.5px;font-weight:700;color:#f8fafc;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${title}">${title}</div>
                    <div style="font-size:11.5px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nameEn}</div>
                </div>
            </a>
        </div>
    `;
}

// ─── CINEMA GENRE FILTER HELPERS ───
function setCineGenre(g) {
  window._cineGenre = g;
  if (window._movieTabPages) window._movieTabPages.cinema = 1;
  renderTab('cinema');
}

function refreshCinema() {
  window._cinemaCache = null;
  window._cineGenre = null;
  switchTab('cinema');
}

function renderCinemaCard(item) {
  const slug = item.slug || '';
  const name = item.name || 'Phim chi\u1ebfu r\u1ea1p';
  const originName = item.origin_name || '';
  let img = item.poster_url || item.thumb_url || '';
  if (img && !img.startsWith('http')) img = 'https://phimimg.com/' + img.replace(/^\/+/, '');
  if (!img) img = 'https://phimimg.com/uploads/movies/20260829/doraemon-nobita-va-lau-dai-duoi-day-bien-phien-ban-moi-poster.webp';
  const quality = item.quality || 'HD';
  const lang = item.lang || '';
  const genre = (item.category && item.category[0]) ? item.category[0].name : '';
  const year = item.year || 2026;
  const langShort = lang.includes('L\u1ed3ng Ti\u1ebfng') ? 'LT' : lang.includes('Vietsub') ? 'VS' : lang.includes('Thuy\u1ebft Minh') ? 'TM' : lang ? lang.slice(0, 4) : 'VS';

  return `
        <div class="movie-card" style="position:relative;">
            <a href="/phim/${slug}" style="display:block;text-decoration:none;">
                <div class="movie-poster-wrap" style="position:relative;overflow:hidden;border-radius:10px 10px 0 0;">
                    <img src="${img}" class="movie-poster" alt="${name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://phimimg.com/uploads/movies/20260829/doraemon-nobita-va-lau-dai-duoi-day-bien-phien-ban-moi-poster.webp';">
                    <div style="position:absolute;top:6px;left:6px;z-index:2;">
                      <span style="background:linear-gradient(135deg,#fcd576,#f59e0b);color:#1a1000;font-size:9px;font-weight:900;padding:2.5px 7px;border-radius:4px;letter-spacing:0.3px;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:inline-block;">🎬 Chiếu Rạp</span>
                    </div>
                    ${langShort ? `<div style="position:absolute;top:6px;right:6px;background:rgba(139,92,246,0.85);color:#fff;font-size:8.5px;font-weight:800;padding:2px 6px;border-radius:4px;z-index:2;">${langShort}</div>` : ''}
                    <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(15,20,30,0.98) 0%, rgba(15,20,30,0.4) 40%, transparent 70%);pointer-events:none;"></div>
                    <div style="position:absolute;bottom:8px;left:8px;right:8px;">
                      <div style="font-size:11.5px;font-weight:800;color:#f1f5f9;line-height:1.3;text-shadow:0 1px 4px rgba(0,0,0,0.8);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${name}</div>
                    </div>
                </div>
                <div class="movie-info" style="padding:8px 10px 10px;">
                    ${originName ? `<div style="font-size:10px;color:#64748b;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">${originName}</div>` : ''}
                    <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
                      ${genre ? `<span style="font-size:9.5px;font-weight:700;color:#94a3b8;background:rgba(255,255,255,0.06);padding:2px 7px;border-radius:4px;">${genre}</span>` : ''}
                      <span style="font-size:9.5px;font-weight:700;color:#64748b;">${year}</span>
                    </div>
                </div>
            </a>
        </div>
    `;
}

// ─── ACCOUNT TAB RENDERER ───
function renderAccount(u) {
  const letter = (u.displayName || u.name || u.email || 'U').charAt(0).toUpperCase();
  const frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(u) : { type: 'none', value: '' };
  const savedAvatar = (u && u.avatar) || (u && u._id ? localStorage.getItem(`avatar_${u._id}`) : null) || localStorage.getItem('user_avatar') || '/android-chrome-512x512.png';
  const innerContent = savedAvatar
    ? `<img src="${savedAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.outerHTML='<span style=\\'font-size:28px;font-weight:900;color:#1a1000;\\'>${letter}</span>'">`
    : letter;
  const coins = (u && (u.xu != null || u.coins != null))
    ? Number(u.xu != null ? u.xu : u.coins)
    : ((window.GamificationCore && typeof window.GamificationCore.getXu === 'function')
      ? window.GamificationCore.getXu()
      : Number(localStorage.getItem('cinestream_xu') || 150));

  return `
        <div class="panel-card">
            <div class="account-grid">
                <div class="form-section">
                    <div id="accountInfoView" style="display:flex; flex-direction:column; justify-content:space-between; height:100%; box-sizing:border-box;">
                        <div class="account-form-grid">
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label" style="font-size:11px; margin-bottom:5px;">Email tài khoản</label>
                                <input type="email" class="form-input" value="${u.email || ''}" readonly style="opacity:0.65;cursor:not-allowed;padding:9px 13px;width:100%;box-sizing:border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label" style="font-size:11px; margin-bottom:5px;">Tên hiển thị</label>
                                <input type="text" id="accDisplayName" class="form-input" value="${u.displayName || u.name || ''}" placeholder="Nhập tên của bạn" oninput="previewDisplayName(this.value)" style="padding:9px 13px;width:100%;box-sizing:border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label" style="font-size:11px; margin-bottom:5px;">Số điện thoại</label>
                                <input type="tel" id="accPhone" class="form-input" value="${u.phone || ''}" placeholder="0912 345 678" style="padding:9px 13px;width:100%;box-sizing:border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label" style="font-size:11px; margin-bottom:5px;">Ngày sinh</label>
                                <input type="date" id="accBirthday" class="form-input" value="${u.birthday || '2000-01-01'}" style="padding:9px 13px;width:100%;box-sizing:border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label" style="font-size:11px; margin-bottom:5px;">Giới tính</label>
                                <div class="gender-group" style="display:flex; gap:6px;">
                                    <label class="gender-option" style="flex:1; padding:8px 4px;">
                                        <input type="radio" name="accGender" value="male" ${(u.gender === 'male' || !u.gender) ? 'checked' : ''}>
                                        <span class="gender-badge">Nam</span>
                                    </label>
                                    <label class="gender-option" style="flex:1; padding:8px 4px;">
                                        <input type="radio" name="accGender" value="female" ${u.gender === 'female' ? 'checked' : ''}>
                                        <span class="gender-badge">Nữ</span>
                                    </label>
                                    <label class="gender-option" style="flex:1; padding:8px 4px;">
                                        <input type="radio" name="accGender" value="other" ${u.gender === 'other' ? 'checked' : ''}>
                                        <span class="gender-badge">Khác</span>
                                    </label>
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label" style="font-size:11px; margin-bottom:5px;">Công khai hồ sơ</label>
                                <div class="privacy-toggle-box" style="display:flex; align-items:center; justify-content:space-between; height:38px; padding:0 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; box-sizing:border-box;">
                                    <span style="font-size:12px; color:#cbd5e1; font-weight:600;">Xem phim & Yêu thích</span>
                                    <label style="cursor:pointer; position:relative; display:inline-block; margin:0;">
                                        <input type="checkbox" id="privacyToggle" class="sr-only" ${u.isPublic !== false ? 'checked' : ''} onchange="toggleSettingSwitch(this,'ap_privacy')">
                                        <div class="setting-toggle-track" style="width:36px;height:20px;border-radius:10px;background:${u.isPublic !== false ? '#22c55e' : '#374151'};position:relative;display:inline-block;transition:background .2s;">
                                            <span class="setting-toggle-knob" style="width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:3px;left:3px;transform:${u.isPublic !== false ? 'translateX(16px)' : 'translateX(0)'};box-shadow:0 1px 3px rgba(0,0,0,0.3);display:block;transition:transform .2s;"></span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div class="form-group form-group-full" style="margin-bottom:0;">
                                <label class="form-label" style="font-size:11px; margin-bottom:5px;">Giới thiệu bản thân</label>
                                <textarea id="accBio" class="form-input form-textarea" style="resize:none; padding:10px 13px; width:100%; box-sizing:border-box;" placeholder="Giới thiệu ngắn về thể loại phim yêu thích...">${u.bio || ''}</textarea>
                            </div>
                        </div>
                        <div class="form-actions" style="display:flex; align-items:center; gap:12px; margin-top:16px; margin-bottom:0; flex-wrap:wrap;">
                            <button class="btn-primary" onclick="saveAccount()" style="padding: 10px 24px; font-weight: 800; font-size: 13.5px; border-radius: 11px; cursor: pointer;">Lưu thay đổi</button>
                            <button type="button" class="btn-secondary" onclick="toggleAccountView('password')" style="padding: 10px 20px; font-weight: 700; font-size: 13.5px; border-radius: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <span>Đổi mật khẩu</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="avatar-panel">
                    <div class="avatar-panel-cover" id="rightCoverEl"></div>
                    <div class="avatar-panel-body">
                        <div class="avatar-large">${avatarHtml}</div>
                        <div class="avatar-label ${typeof getEquippedNameColorClass === 'function' ? getEquippedNameColorClass(u) : ''}" style="${typeof getEquippedNameColorStyle === 'function' ? getEquippedNameColorStyle(u) : ''}">${u.displayName || u.name || 'Người dùng'}</div>
                        <div class="avatar-sublabel">${u.email || ''}</div>
                        <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" onchange="handleAvatarFileSelected(this)">
                        <div style="display:flex;flex-direction:row;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:4px;">
                            <button class="btn-avatar-compact" onclick="document.getElementById('avatarFileInput').click()" title="Tải ảnh từ máy tính hoặc điện thoại">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                <span>Tải ảnh lên</span>
                            </button>
                            <button class="btn-avatar-vip" onclick="openPresetAvatarModal()" title="Chọn ảnh đại diện có sẵn từ kho APhim">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                <span>Ảnh có sẵn</span>
                            </button>
                        </div>
                        <div class="avatar-wallet-box" style="margin-top:8px;padding:8px 12px;background:linear-gradient(135deg, rgba(252,213,118,0.08) 0%, rgba(252,213,118,0.02) 100%);border:1px solid rgba(252,213,118,0.18);border-radius:14px;width:100%;box-sizing:border-box;">
                            <div class="avatar-wallet-title" style="font-size:10.5px;font-weight:800;color:#fcd576;margin-bottom:2px;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5H10.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H9"/></svg>
                                Ví Xu của bạn
                            </div>
                            <div class="avatar-wallet-balance" style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;"><span class="avatar-wallet-val">${coins.toLocaleString()}</span> <span class="avatar-wallet-unit" style="font-size:11px;color:#fcd576;font-weight:700;">XU</span></div>
                            <button class="btn-vip" style="width:100%;margin-top:6px;padding:6px;" onclick="openGamificationModal()">+ Điểm danh & Kiếm Xu</button>
                        </div>
                        <div style="margin-top:6px;padding:7px 10px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:12px;width:100%;box-sizing:border-box;text-align:left;display:flex;align-items:center;gap:8px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                            <div>
                                <div style="font-size:11px;color:#4ade80;font-weight:700;">Xác minh tài khoản chính thức</div>
                                <div style="font-size:9.5px;color:#64748b;margin-top:1px;">Bảo vệ 2 lớp SSL 256-bit</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- STREAMING DEVICES MANAGEMENT (Dữ liệu thực nhận diện từ thiết bị) -->
            ${(function() {
                const ua = navigator.userAgent;
                let browser = 'Trình duyệt Web';
                let os = 'Thiết bị';
                let type = 'desktop';
                let typeLabel = 'Máy tính này';

                if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
                else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
                else if (/Windows NT 6.2/i.test(ua)) os = 'Windows 8';
                else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
                else if (/Windows/i.test(ua)) os = 'Windows';
                else if (/iPhone/i.test(ua)) { os = 'iOS (iPhone)'; type = 'mobile'; typeLabel = 'Điện thoại này'; }
                else if (/iPad/i.test(ua)) { os = 'iPadOS'; type = 'tablet'; typeLabel = 'Máy tính bảng này'; }
                else if (/Android/i.test(ua)) {
                    os = 'Android';
                    type = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
                    typeLabel = type === 'mobile' ? 'Điện thoại này' : 'Máy tính bảng này';
                }
                else if (/Macintosh|Mac OS X/i.test(ua)) { os = 'macOS'; type = 'desktop'; typeLabel = 'Máy tính Mac này'; }
                else if (/Linux/i.test(ua)) { os = 'Linux'; type = 'desktop'; typeLabel = 'Máy tính Linux này'; }
                else if (/SmartTV|Tizen|Web0S|LG NetCast/i.test(ua)) { os = 'Smart TV'; type = 'tv'; typeLabel = 'Tivi này'; }

                if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
                else if (/CocCoc/i.test(ua)) browser = 'Cốc Cốc';
                else if (/OPR\/|Opera\//i.test(ua)) browser = 'Opera';
                else if (/SamsungBrowser\//i.test(ua)) browser = 'Samsung Internet';
                else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
                else if (/Safari\//i.test(ua)) browser = 'Apple Safari';
                else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';

                const screenRes = (window.screen && window.screen.width) ? (window.screen.width + ' × ' + window.screen.height) : '';
                const iconSvg = type === 'mobile' 
                    ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2.5" stroke-linecap="round"/></svg>'
                    : (type === 'tablet'
                        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2.5" stroke-linecap="round"/></svg>'
                        : (type === 'tv'
                            ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M7 20h10M12 17v3"/></svg>'
                            : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
                        )
                    );

                return `
                <div class="devices-container">
                    <div class="devices-header">
                        <div class="devices-title-box">
                            <div class="devices-title-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div>
                                <div class="devices-title">Thiết bị đang xem & Đăng nhập (1 thiết bị)</div>
                                <div class="devices-sub">Quản lý phiên đăng nhập thực tế và bảo mật tài khoản</div>
                            </div>
                        </div>
                        <button class="btn-logout-all" onclick="logoutOtherDevices()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Đăng xuất thiết bị khác
                        </button>
                    </div>

                    <div class="device-list">
                        <!-- Real Device -->
                        <div class="device-item active-device">
                            <div class="device-info">
                                <div class="device-icon-box ${type}">
                                    ${iconSvg}
                                </div>
                                <div>
                                    <div class="device-name">${browser} trên ${os} (${typeLabel})</div>
                                    <div class="device-meta">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        Phiên đăng nhập hiện tại${screenRes ? ' • Màn hình: ' + screenRes : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="device-badge-active">
                                <span class="pulse-dot"></span>
                                Đang xem (Hiện tại)
                            </div>
                        </div>
                    </div>
                </div>
                `;
            })()}
        </div>
    `;
}

// ─── SHOP STATE ───
window._shopActiveCategory = window._shopActiveCategory || 'frame';
window._shopActiveRarity = window._shopActiveRarity || 'all';
window._shopSearchQuery = window._shopSearchQuery || '';
window._shopPage = window._shopPage || 1;

// ───── TURBO SHOP NAVIGATION ─────
// Partial DOM diff — only swap the grid and pagination bar.
// Layout, filter tabs, search box remain in DOM (no flicker).
function _shopFastRefresh(direction) {
  const panel = document.getElementById('tabPanel');
  if (!panel) { renderTab('shop'); return; }
  const gridEl = panel.querySelector('.shop-items-grid');
  const pageBar = panel.querySelector('.shop-pagination-bar');
  const infoEl = panel.querySelector('.shop-page-info-bar');
  const countEl = panel.querySelector('.shop-count-label');
  const pillsEl = panel.querySelector('.shop-rarity-pills');
  const tabsEl = panel.querySelector('.shop-tabs-bar');
  const coinEl = panel.querySelector('.shop-coin-amount');
  if (!gridEl) { renderTab('shop'); return; }

  if (!currentUser || !currentUser.displayName) currentUser = getUser() || currentUser;
  const newHtml = renderShop(typeof currentUser !== 'undefined' ? currentUser : null);
  const tmpDiv = document.createElement('div');
  tmpDiv.innerHTML = newHtml;

  const newGrid = tmpDiv.querySelector('.shop-items-grid');
  const newBar = tmpDiv.querySelector('.shop-pagination-bar');
  const newInfo = tmpDiv.querySelector('.shop-page-info-bar');
  const newCount = tmpDiv.querySelector('.shop-count-label');
  const newPills = tmpDiv.querySelector('.shop-rarity-pills');
  const newTabs = tmpDiv.querySelector('.shop-tabs-bar');
  const newCoin = tmpDiv.querySelector('.shop-coin-amount');
  if (!newGrid) { renderTab('shop'); return; }

  if (newCoin && coinEl) coinEl.innerHTML = newCoin.innerHTML;
  if (newTabs && tabsEl) tabsEl.replaceWith(newTabs);
  if (newPills && pillsEl) pillsEl.replaceWith(newPills);

  const slideOut = direction === 'next' ? 'translateX(-28px)' :
    direction === 'prev' ? 'translateX(28px)' : 'translateX(0)';
  const slideIn = direction === 'next' ? 'translateX(28px)' :
    direction === 'prev' ? 'translateX(-28px)' : 'translateX(0)';

  gridEl.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
  gridEl.style.opacity = '0';
  gridEl.style.transform = slideOut;

  requestAnimationFrame(function () {
    setTimeout(function () {
      newGrid.style.opacity = '0';
      newGrid.style.transform = slideIn;
      gridEl.replaceWith(newGrid);
      if (newInfo && infoEl) infoEl.replaceWith(newInfo);
      if (newCount && countEl) countEl.replaceWith(newCount);
      if (newBar && pageBar) pageBar.replaceWith(newBar);
      else if (newBar && !pageBar) {
        const shopBody = panel.querySelector('.shop-body-scroll') || panel;
        if (shopBody) shopBody.appendChild(newBar);
      } else if (!newBar && pageBar) {
        pageBar.remove();
      }
      requestAnimationFrame(function () {
        newGrid.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
        newGrid.style.opacity = '1';
        newGrid.style.transform = 'translateX(0)';
      });
    }, 80);
  });
}

function setShopCategory(cat) {
  window._shopActiveCategory = cat;
  window._shopPage = 1;
  if (!currentUser || !currentUser.displayName) currentUser = getUser() || currentUser;
  _shopFastRefresh(null);
}

function setShopRarity(rarity) {
  window._shopActiveRarity = rarity;
  window._shopPage = 1;
  _shopFastRefresh(null);
}

function onShopSearch(inputElem) {
  const rawVal = typeof inputElem === 'string' ? inputElem : (inputElem ? inputElem.value : '');
  window._shopRawSearchQuery = rawVal;
  window._shopSearchQuery = rawVal.toLowerCase().trim();
  window._shopPage = 1;
  const cursorPos = (inputElem && inputElem.selectionStart != null) ? inputElem.selectionStart : rawVal.length;
  _shopFastRefresh(null);
  const newInput = document.getElementById('shop-search-input');
  if (newInput) {
    newInput.focus();
    try { newInput.setSelectionRange(cursorPos, cursorPos); } catch (e) { }
  }
}

function setShopPage(p) {
  const prevPage = window._shopPage || 1;
  window._shopPage = Math.max(1, p);
  const dir = p > prevPage ? 'next' : 'prev';
  _shopFastRefresh(dir);

  // Auto scroll to top on mobile so user views items from the beginning
  if (window.innerWidth < 1024) {
    const anchor = document.querySelector('.shop-tabs-bar') || document.querySelector('.shop-main-panel') || document.getElementById('tabPanel');
    if (anchor) {
      const y = anchor.getBoundingClientRect().top + window.pageYOffset - 68;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function renderShop(u) {
  if (!u) u = currentUser || (typeof getUser === 'function' ? getUser() : null) || {};
  const coins = Math.max(u ? (u.xu || u.coins || 0) : 0, Number(localStorage.getItem('cinestream_xu') || 110));

  // User inventory & equipped items
  let userItems = [];
  try { userItems = JSON.parse(localStorage.getItem('ap_user_items') || '["frame_none","color_default","banner_default","frame_single"]'); } catch (e) { userItems = ["frame_none", "color_default", "banner_default"]; }

  const equippedFrame = localStorage.getItem('ap_equipped_frame') || 'frame_none';
  const equippedColor = localStorage.getItem('ap_equipped_color') || 'color_default';
  const equippedBanner = localStorage.getItem('ap_equipped_banner') || 'banner_default';

  const allShopData = {
    frame: [
      {
        "id": "frame_none",
        "name": "Mặc định (Không dùng khung)",
        "rarity": "common",
        "price": 0,
        "frameImg": "",
        "class": "none"
      },
      {
        "id": "disc_frame_1352687418418921532",
        "name": "Hugh the Rainbow",
        "rarity": "common",
        "price": 0,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_0c0eeb351ae2cf48c6e1eee2cae49d40.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687448228106302",
        "name": "Phoenix",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_0e839cd79500e7b68e2bbbed54790c28.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687476317093888",
        "name": "Firecrackers",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_0f4f1b40921ce680b60007e94427d1f2.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352687565219692648",
        "name": "Flaming Sword",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_0f5d6c4dd8ae74662ee9c40722a56cbd.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687609780113562",
        "name": "RamenBowl",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_001e956faa73bd0410c455234c62818f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687646475817051",
        "name": "Steampunk Cat Ears",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_1acbe609daec21fa5b866df9e5a42cb7.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687706303500391",
        "name": "Lucky Envelopes",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_1b1df0ae8c2d34afd85da5c22a0d761a.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687727283273788",
        "name": "Magical Potion",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_1dbc603c181999b9815cb426dfec71a6.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687750910054440",
        "name": "Akuma",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_1e8cb6070b13f775a41384c84c5a53e1.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687779103903754",
        "name": "Next Turn Button",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_2b95e7a4951a1a092e7870bf1d456262.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687799467249694",
        "name": "Snowglobe",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_2ca5fb1ecf0dac410b38d76cb4aae7f9.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687817125531759",
        "name": "Feelin'Nervous",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_2d792aad5003faf6809e26879a7eae6b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687886021034025",
        "name": "Lotus Flower",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_2e55d644e11acb6253dfa422eff16dfd.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687923060936756",
        "name": "Angry",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_3c97a2d37f433a7913a1c7b7a735d000.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687950558920748",
        "name": "Owlbear Cub",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_3c5743cedcb72131c58278278a97c143.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352687975795920928",
        "name": "Straw Hat",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_3d1e6078b2e4c8865e0ad0f429d651b1.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688006338842714",
        "name": "Heartbloom",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_3e1fc3c7ee2e34e8176f4737427e8f4f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688027096584397",
        "name": "Candlelight",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_3f29e6edfe1cff43736f644cf1d01278.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688047501611089",
        "name": "Treasure and Key",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_4c9f2ec29c05755456dbce45d8190ed4.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688136488222821",
        "name": "in Tears",
        "rarity": "common",
        "price": 150,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_4cc97277177b166fd7d4af3bdb370815.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688164925341844",
        "name": "Butterflies",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_4cd9ae5a8d103c219eacd3674d7730cd.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688185896992921",
        "name": "Zombie Food",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_4f2b75e5adff09709702613ea0e2cb70.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688217828233266",
        "name": "Bubble Tea",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_5b1319abfc9f928479b68a73635f591d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688243153571911",
        "name": "Witch Hat (Plum)",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_5e8abacc7a7454d6b08b5cc84cac1d80.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688272836657297",
        "name": "Shy",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_6b793a5f7e4e15eea6b10a4fde448511.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688305011167307",
        "name": "Black Hole",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_6d16b27d9415cafe3b289053644337c4.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688338082988064",
        "name": "Mirage",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_6d99f670de3fcee669660fe262e896ea.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688400959799449",
        "name": "UFO",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_6fdbddb6229453eac3bbb212edf5cd1c.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688431376891965",
        "name": "aespa Fanlight",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_007d64a922ff5773fb9464945de93c8e.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688457037910088",
        "name": "Sakura Warrior",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_7cf09c7e78d6eb35ae354acc1d5cc676.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688484300882133",
        "name": "Fox Hat",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_7d305bca6cf371df98c059f9d2ef05e4.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688511169466368",
        "name": "Lovestruck",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_7f44d538ec830f479605f7bf8720afda.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688535949541542",
        "name": "Crossbones",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_7f863078aee4932cd50ee4e3b55d3035.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688607072223346",
        "name": "Group Hug",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_8ad98d25ee4e4512704f759476eeb294.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688633144147999",
        "name": "Pipedream",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_8c17e799bfeffa797042569a1ebcafc0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688660683952178",
        "name": "Hex Tiles",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_8dddba8c2a9704a943bb7020a3d0a418.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688718753824790",
        "name": "Crystal Ball (Blue)",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_8ee8ae54bddfcb17d7d5c5f9bce41c0d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688769211568149",
        "name": "In Love",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_8ffa2ba9bff18e96b76c2e66fd0d7fa3.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688796176613546",
        "name": "Hex Lights",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_09bb4197c743ea31b7eb052eddd3e892.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688824165072956",
        "name": "FRAG OUT",
        "rarity": "rare",
        "price": 350,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_09de63526a45be1ddac70e84718ee04a.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688892385562714",
        "name": "Solar Orbit",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9a6bf0ab30a6719d6eb09fa4996984ca.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688917081624607",
        "name": "The Monster You Created",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9bc421cef4bdcfffeb2344b44ad91b44.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352688939907027080",
        "name": "Good Ol'Pepper",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9cc1c1426ea5478aac7be6cdefdbc568.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352689042474664017",
        "name": "Fan Flourish",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9d2ff9685be0c668ef6990b0035fac17.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352689087655579730",
        "name": "Skull Medallion",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9d67a1cbf81fe7197c871e94f619b04b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352689118374793286",
        "name": "Tarrain Tiles",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9d95e36bc282523fddc63d31a8d01091.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352689152877002843",
        "name": "Feelin'Scrumptious",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9d35467f282b8c72a26f5aa40aa2a637.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352689219063255172",
        "name": "Red Lantern",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9e16d86b2887eb2a3bed36a5b8876935.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352689708521623694",
        "name": "Mooncaps (Blue)",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_25f7407a6a0c5de43736a1f24c3b7979.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352689726620045322",
        "name": "Honeyblossom",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_27bbf0b53b1054cf61e9a4c0e8d4027f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352689749915209910",
        "name": "String Lights (Dusk)",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_28e531da18a80b8287837332154c5f58.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352689842177179739",
        "name": "Defensive Shield",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_29a0533cb3de61aa8179810188f3830d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690651065614386",
        "name": "Heartstrings (Blue)",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_42cc3fe7133523096466102e7a222003.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352690708863123569",
        "name": "Magical Girl",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_45f7f9975255971b197d34d77fb50ede.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690738680565934",
        "name": "Unicorn",
        "rarity": "epic",
        "price": 800,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_47c0f4b4a837894998d5a316acf74f87.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690760096419902",
        "name": "Chromawave",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_49c479e15533fb4c02eb320c9c137433.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690799728529560",
        "name": "Rocket Puncher",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_49ed38f73003e2e182f77190af0a0a56.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690823388725409",
        "name": "Slither'n Snack",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_49ffdb1883d8c644a8eb68711ee58be9.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690853906350131",
        "name": "Koi Pond",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_50b440810b1bbd89f6284f36d40ad0af.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690918247108608",
        "name": "Faces of the Moon",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_50cfb73a4c52235363491855d3c3c3bc.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352690993832656939",
        "name": "Dismay",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_51d3bb502109eec26c76386ec980bc8b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691036043870249",
        "name": "Sweat Drops",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_55c9d0354290afa8b7fe47ea9bd7dbcf.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691059309940816",
        "name": "Lofi Girl Outfit",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_60cb281fac6d8f558efaf6dd9fe4dbe4.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691081883684954",
        "name": "Viper Poison Cloud",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_62cd9d7c0031a7c1eb5ad5cc96992189.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691113173061683",
        "name": "Heartstrings (Red)",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_63a69109db554a66764cbe61c6e556ef.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691135067459586",
        "name": "Lunar Lanterns",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_63b29ec5b1ea6bb01c2251049838d822.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691229426712658",
        "name": "String Lights (Ember)",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_63d17f42ee46a843d99a58655910bc6a.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352691255334670466",
        "name": "M. Bison",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_66f69effef43b4f7c4f5d0739079a947.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352691293532323920",
        "name": "Ryu",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_68cb6c21d6222cd9285c08068f39873d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691337694019626",
        "name": "Magic Portal (Purple)",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_72d1fd7c47cc7a98c8f64d175773344b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691394426306601",
        "name": "Cozy Cat",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_77b7b6a740a9451e1ef39c0252154ef8.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691419080560700",
        "name": "Scallywag",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_78f326d95c0193c317470e3e81db81e7.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691512143777956",
        "name": "Balance",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_82e4df4028396ad5ccaaafb397fa6248.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691761096425493",
        "name": "FISHBONES!",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_84a67b33ef5b75e17f858a95648c973f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691788103548969",
        "name": "String Lights",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_88f42fb7360d8224a670a50c3496f315.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691811377741834",
        "name": "VALORANT Champions 2024",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_90e0dce3cc48c4a9607b6d41209c737e.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691833905614918",
        "name": "Cannon Fire",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_91a33236cf2728310a3a29bbdc8e0d29.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691863324459141",
        "name": "Playful Lofi Cat",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_96f65d0aacc4a94b50ef7fb656d5826d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691886514770042",
        "name": "Crystal Elk",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_98c7600d304b86ca3b18272e1da05559.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691919498645605",
        "name": "Magic Portal (Blue)",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_98cf94e029ac79c5b377413d1a2bd82f.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352691945964568749",
        "name": "Implant",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_172fa9da0af8698e37f5e5de76637439.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352691999261851779",
        "name": "Cottage Home",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_210b82b98876083ce393ecd92eb07260.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692107332157602",
        "name": "Bloomling",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_306a56249fe3c3d2bc7a30041cb63e0e.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692128836223108",
        "name": "Lightning",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_365eed4178528fe8293c4212e8e2d5cb.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692175095206049",
        "name": "Mech flora",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_459cf2afde41f01559a4a4204ab81767.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692217273389066",
        "name": "Lava Lamp Bundle",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_462b0bddc07dd495765fe12abe8b077f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692240333410386",
        "name": "Mallow Jump",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_492f6b54b761c0a14d9dbc9c98aaa0f5.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692264907968694",
        "name": "Dancing fairies",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_535aa3354b1a7395c271bb2f53be4275.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692287074861078",
        "name": "Air",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_554b7c34f7b6c709f19535aacb128e7b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692307270570004",
        "name": "Rose Bearer",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_555ad9b90a13534180b9274d013e3651.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692335942701156",
        "name": "Power by shimmer",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_609fb5c17a4d5ff2e2bec1a1931a9caa.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692355722907833",
        "name": "Head in the clouds",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_670b722e56740d11d1e6fe55b8094013.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692381627060275",
        "name": "fall leaves",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_720a2045510ec16f9878237d2ff9873f.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352692425881157674",
        "name": "Pirate captain",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_798a5bcbb11067e4d9ab339e51d2a16c.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692487805730907",
        "name": "Blade storm",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_904b1989077c91fca1168d39bfcaa0a4.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352692508408156221",
        "name": "Guile",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_993ac691660d3d67b500d995e121b220.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693177865338994",
        "name": "sproutling",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_3012fad396abbf24e325431800b51510.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693202444091394",
        "name": "Midnight Sorceress",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_4430a4ee89b7fba456e765db21f38485.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693244877602906",
        "name": "fall Leaves",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_5087f7f988bd1b2819cac3e33d0150f5.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693265073307761",
        "name": "Doodling",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_5873ecaa76fb549654b40095293f902e.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693289643409479",
        "name": "Sleepy chilledcow",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_6649e251a23f24935471ee02c212675b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693320580730973",
        "name": "Armamenter",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_6912c651e979fbfdc479ed082a571513.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693353027731476",
        "name": "Flame Chompers",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_8396e9830e3e288cd3aaa6daf18b605a.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693385877520388",
        "name": "Constellations",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_8552f9857793aed0cf816f370e2df3be.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693406949970104",
        "name": "cat onesie",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9661cf3296ac236d8815e3f5b809a467.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693430224158802",
        "name": "Strawberry Vine",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_9867b1ba56601e745cfe741e6b00b835.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693460288929843",
        "name": "sakura lnk",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_13913a00bd9990ab4102a3bf069f0f3f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693571765141534",
        "name": "spooky cat Ears",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_33656b7ed12cde00c1826b654cf65590.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693599590154470",
        "name": "Dark Hood",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_41445f736db3525135b6b9e1122f2254.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693617424072735",
        "name": "sushi roll",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_44045ae47175eaca4ed1b4d889b62b27.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693640862105601",
        "name": "string Lights",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_47136c333dc989a0f0f9852e878d3844.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352693685904605215",
        "name": "Gelatinous Cube",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_66604bb5c9351541f30c20a4e78c239c.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693708272828508",
        "name": "Feelin' awe",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_89155faed81b205d59fbbefa4316952d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693734965510174",
        "name": "Dice",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_94191be95bb9c471ff17644f3639eb6d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693762416971926",
        "name": "A hint of clove",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_98555e40cc6802bd3a4fed906af1d992.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693800526680106",
        "name": "Neon Nibbles",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_126219d37fa9422dab6a075064453750.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693820197834762",
        "name": "Water",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_250640ab00a8837a1d56f35879138177.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693842612060294",
        "name": "Dragon's smile",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_445566ed965b2c1632a5b45c92f32d11.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693884920008816",
        "name": "Joystick",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_795573a62c6d9b583f3029100f90d56b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693911243591731",
        "name": "Spirit Embers",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_1005898c6acf56a9ac5010baf444f6fd.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352693968386920540",
        "name": "Got xenoglossy",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_35713167cc82e0f408c26dfc032a7f0f.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352694027215962113",
        "name": "Kabuto",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_084353360ae4f9b5b3b5f186e5525de0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694050289094759",
        "name": "Aurora",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_386445551be850bb16b73a225d0d0602.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694063567999048",
        "name": "Dandelion Duo",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_629689577fa1da2ef0061a5a8c930de1.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694081611890831",
        "name": "Rage",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a0db4314b8cc271c8f472357aa895005.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694121873281086",
        "name": "Fresh pine",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a0fafb7c7ee7f1e5b1442f44f3aa14b7.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694149530390549",
        "name": "Ruby hearts",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a1c0581971d4a296908829289fea2c47.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694177770639443",
        "name": "city walls",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a4e8e02dbbba6889428c744df7aa5a81.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694220980355195",
        "name": "Polar Bear hat",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a7e6467b5332ab7a2b725aa225e6c752.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694253116985364",
        "name": "Dusk and Dawn",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a44e9335ea869639fdf812f3642a56a6.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694278773543012",
        "name": "Reyna's leer",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a87e3efa4de2956331831681231ce63b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694314739695658",
        "name": "Baby Displacer Beast",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a842a9cf76fdaf91a6354937b31ecdef.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694339842871419",
        "name": "oni mask",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a21393f8a2cb8eafbdfb5364fb1cbbae.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694362345308230",
        "name": "Fire",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a065206df7b011a5510e4e5bca7d49be.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694406507139236",
        "name": "Bowler hat",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_a67833d0f3138d7dcdee98c39eae33d7.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694485968224357",
        "name": "The petal pack",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_ab95c78401ce4ec85c25a6d308db9d85.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694765300219986",
        "name": "The Anomaly",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_af5ee420e5f860ff2cdbb5fa4633f2cf.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694791770476544",
        "name": "cypher Neural Theft",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_b1efe77f379c6c9c6e47e6b6299d5a7d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694867980980306",
        "name": "Devil",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_b4dcf63b6af2e20cba91af61c0e3a8a7.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694908854468739",
        "name": "shocked",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_b98e8b204d59882fb7f9f7c86922c0bf.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694928404385876",
        "name": "Mooncaps",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_b13180be7866281f6fa588a49dd7feb0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352694972104572958",
        "name": "Helmsman",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_b98093bb7723235a4cd2792762795640.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352695043420459172",
        "name": "cozy Headphones",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_bb71042ccd2ca277a69f086a4f3354d0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352696581907943577",
        "name": "Fall Leaves",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_bc63175fe462d8748b68ea5179249418.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352696607715360902",
        "name": "Kitsune",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_be111e4303d634c55500202a61656e0b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352696804558373021",
        "name": "Brass beats",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_bfaeda83edb41e78250eedc71bed31fc.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352696831217369209",
        "name": "soul Leaving Body",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_c3c09bd122898be35093d0d59850f627.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352696854491693117",
        "name": "cat Ears",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_c3cffc19e9784f7d0b005eecdf1b566e.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352696975203762186",
        "name": "ARadiating Energy",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_c7e1751e8122f1b475cb3006966fb28c.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697057424707665",
        "name": "Wizard Hat",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_c25b962e5cabb9a656f02c50095d6496.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697077485797480",
        "name": "shuriken's mark",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_c32ce5680d4be96e059790ad493aa0fe.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697154413662371",
        "name": "omen's cowl",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_c45abe8c7585fdb41b8d8d4d666f1588.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697251914317835",
        "name": "Autumn crown",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_c509c4760e5e1a50fa341d68f3c1901b.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697387529015310",
        "name": "Digital Sunrise",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_cc83efd93ecd6e41857449c3c0ef9b22.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697419321839847",
        "name": "Golden Hex",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_ccee9031d66bc0f2d7ed0c6178d01784.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697445313806449",
        "name": "E.D Hacker",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_cdca4a092a03b16b94e50289fe3f7bd1.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352697497419780278",
        "name": "Malefic Crown",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_d1ea7b8650bf3d64a03304c2ceb7d089.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697518995144714",
        "name": "Magical Wand",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_d3a9c3a1c89ccb0e1ab8724a5c965f48.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697535453724744",
        "name": "DISXCORE Headset",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_d3da36040163ee0f9176dfe7ced45cdc.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697562724827166",
        "name": "Flux Alchemy",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_d8d93c7a53c0dd07a4074b745210434d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697583205613610",
        "name": "Glowing Runes",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_d650e22f6c4bab4fc0969e9d35edbcb0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697616067985539",
        "name": "Snake's Hug",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_d859cee893cffd5dd0fa17a6caea44e0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697629829628077",
        "name": "Starry Eyed",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_d72066b8cecbadd9fc951913ebcc384f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697650029400134",
        "name": "Yoru Bundle",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_da532f804b47f1681006c2996eb07b2a.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697675367317564",
        "name": "Wizard's Staff",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_db9baf0ba7cf449d2b027c06309dbe8d.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697694774366228",
        "name": "The Hexcore",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_dbb1abd90367c1a31a94f7e162f3a3c3.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697712050442331",
        "name": "Juri",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_dcfe10bac4a782ffb5eefef7a8003115.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697728097845382",
        "name": "Rumbling",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_df5442048d7d5b8b8906f3a9cd93f0ab.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697747807145994",
        "name": "Mix string Light bundle",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_dff769a0f922bb56ab0d4ba2bcbacfae.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352697764852535377",
        "name": "Sakura scholar",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_e0a2df84cf7eb8e098a13e37ec9027c1.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697789502587005",
        "name": "Rainy Mood",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_e8c11f139e55dac538cdaafb3caa2317.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697809866063984",
        "name": "Aim For Love",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_e60cc4d7f4d8a6e79dd8cc67d2b13d6c.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697831517065247",
        "name": "Clyde invaders",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_e72e44eeea89e92dc02c9bec8b02d158.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697856972292126",
        "name": "Glitch",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_e90ebc0114e7bdc30353c8b11953ea41.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697872679829636",
        "name": "UwU XP",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_e257ca83b5b164968fd036f69dbb2ad9.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697894125441114",
        "name": "Cozy POST-IT",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_e671277ab6d18c0de00871347eed94a7.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697946075959401",
        "name": "Eldritch Ring",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_ef6fe8b27123eacccebe51c92a61587c.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697965634130036",
        "name": "Aracanist Bundle",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_ef8d97374ffdbf140df1164be6c69e46.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352697985758265397",
        "name": "Starlight Whales",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_efe3081ee3359a77b515575b5f7bc8c0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352698006889168916",
        "name": "Timekeeper's Clock",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f1c60c026aa89971e360ba88643d92c0.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352698022596710462",
        "name": "Ki Energy",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f3af281c65cf0cf590e9e1f59e9c6cf6.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352698039193567346",
        "name": "Port of Soul",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f4fcdab859b2eab1874fbe7182d5aa26.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352698064510386300",
        "name": "Azure Dice Roll Bundle",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f8ffeba6f389d1475c8794ca88b59785.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352698086086021162",
        "name": "Feelin' Panic",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f11c214394044d001d81c983dcab354f.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699002910408835",
        "name": "A sphere of gusting wind swirls around the avatar.",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f081c6b2c85c5ebe5df42f1c24d45bb5.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699027686297663",
        "name": "Bunny Zzzs",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f438bb9b2f25ac55058fc169ecc8096e.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699041737080902",
        "name": "Ken",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f524554b7f42a214d15c226c344a5357.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699058581540967",
        "name": "Oasis",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_f740031cc97d1b7eb73c0d0ac1dd09f3.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699090789601291",
        "name": "Cat Ear Headset",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_fa39ba4d9eff38d2eeb47ebcb623e4ca.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699125149208626",
        "name": "Earht",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_fa014594d4b2b4249e1098c0adc85b47.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699175698960556",
        "name": "Gold Laurel Wreath",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_fcb0de14da228879b455f1f1d3919749.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699197501214732",
        "name": "Fairy & Pixie Bundle",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_fe3c76cac2adf426832a7e495e8329d3.png?size=160&passthrough=true"
      },
      {
        "id": "disc_frame_1352699217994321951",
        "name": "Death's Edge",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_fe63036018fefb8abe3172383497e3bf.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699238735413403",
        "name": "Autumn's Arbor",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_fead934c894e95e070d8a0301f9f0b27.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_1352699261078474864",
        "name": "Futuristic UI",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_fed43ab12698df65902ba06727e20c0e.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_Libya",
        "name": "Frame 196",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/VJ7q2FV/ezgif-7-a2ecd1b7f9.png"
      },
      {
        "id": "disc_frame_Algeria",
        "name": "Frame 197",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/C7Zdqnp/ezgif-1-148d3d8ea9.png"
      },
      {
        "id": "disc_frame_Bahrain",
        "name": "Frame 198",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/Dr5gMvn/ezgif-1-bf03b81f9d.png"
      },
      {
        "id": "disc_frame_Comoros",
        "name": "Frame 199",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/9nqKx3b/ezgif-1-f0b73c7a9f.png"
      },
      {
        "id": "disc_frame_Tunisia",
        "name": "Frame 200",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/Ksqq6d7/ezgif-7-727033509f.png"
      },
      {
        "id": "disc_frame_UAE",
        "name": "Frame 201",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/mSRswm8/ezgif-7-637d28d3db.png"
      },
      {
        "id": "disc_frame_Somalia",
        "name": "Frame 202",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/Sn84j7t/ezgif-7-0f127c7b46.png"
      },
      {
        "id": "disc_frame_Sudan",
        "name": "Frame 203",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/TLTD2Jk/ezgif-7-b07f2e63fe.png"
      },
      {
        "id": "disc_frame_Syria",
        "name": "Frame 204",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/dQvcZQp/ezgif-7-369d86d58c.png"
      },
      {
        "id": "disc_frame_Yemen",
        "name": "Frame 205",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/kDF5G5v/ezgif-7-ea2030a439.png"
      },
      {
        "id": "disc_frame_Overlay",
        "name": "Frame 206",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/hZD0mmM/ezgif-7-699c07f6f4.png"
      },
      {
        "id": "disc_frame_Palestine",
        "name": "Frame 207",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/w6b12fc/ezgif-7-5217c6ff98.png"
      },
      {
        "id": "disc_frame_Qatar",
        "name": "Frame 208",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/xs2Lktj/ezgif-7-44263314da.png"
      },
      {
        "id": "disc_frame_Saudi",
        "name": "Frame 209",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/rGYFpWw/ezgif-7-8da0a9f5eb.png"
      },
      {
        "id": "disc_frame_Jordan",
        "name": "Frame 210",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/hyBBCB7/ezgif-7-df80ea6e6e.png"
      },
      {
        "id": "disc_frame_Kuwait",
        "name": "Frame 211",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/y58DkH5/ezgif-7-af7e8c28ab.png"
      },
      {
        "id": "disc_frame_Lebanon",
        "name": "Frame 212",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/LPYNzGG/ezgif-7-d9dc5b4cc6.png"
      },
      {
        "id": "disc_frame_Mauritania",
        "name": "Frame 213",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/8mZKC19/ezgif-7-f78d395b85.png"
      },
      {
        "id": "disc_frame_Morocco",
        "name": "Frame 214",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/kSdbdCn/ezgif-7-f3b2fab832.png"
      },
      {
        "id": "disc_frame_Djibouti",
        "name": "Frame 215",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/cQFNw8G/ezgif-1-92158fd061.png"
      },
      {
        "id": "disc_frame_Egypt",
        "name": "Frame 216",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/hs9GjBp/ezgif-7-f21e193074.png"
      },
      {
        "id": "disc_frame_iraq",
        "name": "Frame 217",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://i.ibb.co/Q6CLZyM/ezgif-7-126237475a.png"
      },
      {
        "id": "disc_frame_218",
        "name": "Frame 218",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_5a83f9d1a5d3dd28d8e5459e35800cba.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_219",
        "name": "Frame 219",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_5c1c8c67a6578f56736a5e8afacdde43.png?size=240&passthrough=true"
      },
      {
        "id": "disc_frame_220",
        "name": "Frame 220",
        "rarity": "legendary",
        "price": 1500,
        "frameImg": "https://cdn.discordapp.com/avatar-decoration-presets/a_5d3c5c51ef1e53fc1db9aad9c1a3b6e3.png?size=240&passthrough=true"
      }
    ],

    name_color: [
      // Phổ thông (5)
      { id: 'color_default', name: 'Mặc định', rarity: 'common', price: 0, textStyle: '' },
      { id: 'color_gold', name: 'Vàng Hoàng Kim', rarity: 'common', price: 100, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 18%, #f59e0b 45%, #b45309 60%, #fef08a 75%, #ffffff 88%, #d97706 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #b45309) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(245,158,11,0.6)); font-weight: 900; animation: nameShimmerGlint 2.4s linear infinite;' },
      { id: 'color_cyan', name: 'Xanh Cyberpunk', rarity: 'common', price: 150, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #cffafe 18%, #38bdf8 45%, #0284c7 65%, #a5f3fc 78%, #ffffff 88%, #0369a1 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #0284c7) drop-shadow(0 2px 0 #0369a1) drop-shadow(0 3px 0 #075985) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(56,189,248,0.6)); font-weight: 900; animation: nameGradientWave 2s linear infinite;' },
      { id: 'color_pink', name: 'Hồng Neon', rarity: 'common', price: 180, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fce7f3 18%, #f472b6 45%, #db2777 65%, #fbcfe8 78%, #ffffff 88%, #9d174d 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #db2777) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #831843) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(236,72,153,0.6)); font-weight: 900; animation: nameGradientWave 1.9s linear infinite, nameNeonPulse 2.2s ease-in-out infinite;' },
      { id: 'color_silver', name: 'Bạc Platinum', rarity: 'common', price: 200, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f8fafc 20%, #cbd5e1 45%, #64748b 65%, #ffffff 78%, #cbd5e1 88%, #475569 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #94a3b8) drop-shadow(0 2px 0 #64748b) drop-shadow(0 3px 0 #475569) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 6px rgba(203,213,225,0.6)); font-weight: 900; animation: nameShimmerGlint 2.6s linear infinite;' },

      // Hiếm (7)
      { id: 'color_purple', name: 'Tím Cyber', rarity: 'rare', price: 250, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f3e8ff 18%, #c084fc 45%, #7e22ce 65%, #e9d5ff 78%, #ffffff 88%, #581c87 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #9333ea) drop-shadow(0 2px 0 #7e22ce) drop-shadow(0 3px 0 #581c87) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(192,132,252,0.6)); font-weight: 900; animation: nameGradientWave 2.2s linear infinite;' },
      { id: 'color_amber', name: 'Cam Hổ Phách', rarity: 'rare', price: 350, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef3c7 18%, #fbbf24 45%, #d97706 65%, #fef08a 78%, #ffffff 88%, #92400e 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #b45309) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(245,158,11,0.6)); font-weight: 900; animation: nameShimmerGlint 2.3s linear infinite;' },
      { id: 'color_fire', name: 'Đỏ Huyết Lửa', rarity: 'rare', price: 400, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 15%, #f97316 35%, #ef4444 55%, #b91c1c 75%, #ffffff 85%, #7f1d1d 100%); background-size: 280% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #dc2626) drop-shadow(0 2px 0 #b91c1c) drop-shadow(0 3px 0 #7f1d1d) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(239,68,68,0.7)); font-weight: 900; animation: nameFlameFlicker 1.8s ease-in-out infinite;' },
      { id: 'color_ocean', name: 'Xanh Đại Dương', rarity: 'rare', price: 450, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #dbeafe 18%, #60a5fa 45%, #2563eb 65%, #93c5fd 78%, #ffffff 88%, #1e3a8a 100%); background-size: 280% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #2563eb) drop-shadow(0 2px 0 #1d4ed8) drop-shadow(0 3px 0 #1e3a8a) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(59,130,246,0.6)); font-weight: 900; animation: nameGradientWave 2.3s linear infinite;' },
      { id: 'color_sakura', name: 'Hồng Anh Đào', rarity: 'rare', price: 500, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fce7f3 18%, #f472b6 45%, #ec4899 65%, #fbcfe8 78%, #ffffff 88%, #be185d 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #db2777) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #831843) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(244,114,182,0.6)); font-weight: 900; animation: nameGradientWave 2s linear infinite;' },
      { id: 'color_frost', name: 'Băng Tuyết Cryo', rarity: 'rare', price: 500, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f0f9ff 20%, #7dd3fc 45%, #0284c7 65%, #bae6fd 78%, #ffffff 88%, #0369a1 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #0284c7) drop-shadow(0 2px 0 #0369a1) drop-shadow(0 3px 0 #0c4a6e) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(56,189,248,0.7)); font-weight: 900; animation: nameGradientWave 2s linear infinite, nameFrostSparkle 2.8s ease-in-out infinite;' },
      { id: 'color_lime', name: 'Xanh Chanh Lime', rarity: 'rare', price: 550, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f7fee7 18%, #a3e635 45%, #65a30d 65%, #d9f99d 78%, #ffffff 88%, #365314 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #65a30d) drop-shadow(0 2px 0 #4d7c0f) drop-shadow(0 3px 0 #365314) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(163,230,53,0.6)); font-weight: 900; animation: nameGradientWave 1.9s linear infinite;' },

      // Sử Thi (7)
      { id: 'color_emerald', name: 'Xanh Ngọc Lục', rarity: 'epic', price: 600, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #ecfdf5 18%, #34d399 45%, #059669 65%, #a7f3d0 78%, #ffffff 88%, #064e3b 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #059669) drop-shadow(0 2px 0 #047857) drop-shadow(0 3px 0 #064e3b) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(52,211,153,0.6)); font-weight: 900; animation: nameGradientWave 1.8s linear infinite;' },
      { id: 'color_aurora', name: 'Laser Aurora', rarity: 'epic', price: 750, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 15%, #f97316 35%, #ef4444 55%, #ec4899 75%, #ffffff 85%, #be185d 100%); background-size: 280% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #ea580c) drop-shadow(0 2px 0 #c2410c) drop-shadow(0 3px 0 #7c2d12) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(249,115,22,0.7)); font-weight: 900; animation: nameGradientWave 1.5s linear infinite;' },
      { id: 'color_thunder', name: 'Sấm Sét Lôi Điện', rarity: 'epic', price: 800, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef08a 18%, #60a5fa 40%, #2563eb 60%, #fde047 75%, #ffffff 88%, #1e3a8a 100%); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #2563eb) drop-shadow(0 2px 0 #1d4ed8) drop-shadow(0 3px 0 #1e3a8a) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(96,165,250,0.75)); font-weight: 900; animation: nameLightningFlash 2.2s infinite;' },
      { id: 'color_dark_magic', name: 'Ma Pháp Hắc Ám', rarity: 'epic', price: 850, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f3e8ff 18%, #a855f7 45%, #6b21a8 65%, #c084fc 78%, #ffffff 88%, #3b0764 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #7c3aed) drop-shadow(0 2px 0 #581c87) drop-shadow(0 3px 0 #3b0764) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(168,85,247,0.75)); font-weight: 900; animation: nameVoidPulse 2.5s ease-in-out infinite;' },
      { id: 'color_mythic_plat', name: 'Bạch Kim Glitch', rarity: 'epic', price: 900, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f8fafc 18%, #cbd5e1 45%, #64748b 65%, #ffffff 78%, #cbd5e1 88%, #334155 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #64748b) drop-shadow(0 2px 0 #475569) drop-shadow(0 3px 0 #1e293b) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 8px rgba(226,232,240,0.6)); font-weight: 900; animation: nameGradientWave 1.8s linear infinite, nameGlitchCut 3s infinite;' },
      { id: 'color_ruby', name: 'Hồng Ngọc Ruby', rarity: 'epic', price: 950, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #ffe4e6 18%, #fb7185 45%, #e11d48 65%, #fecdd3 78%, #ffffff 88%, #881337 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #e11d48) drop-shadow(0 2px 0 #be123c) drop-shadow(0 3px 0 #881337) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(251,113,133,0.7)); font-weight: 900; animation: nameShimmerGlint 2.2s linear infinite;' },
      { id: 'color_gradient_sunset', name: 'Hoàng Hôn Sunset', rarity: 'epic', price: 1000, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fed7aa 15%, #f97316 35%, #ec4899 55%, #8b5cf6 75%, #ffffff 85%, #4c1d95 100%); background-size: 350% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #ea580c) drop-shadow(0 2px 0 #be185d) drop-shadow(0 3px 0 #581c87) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(249,115,22,0.7)); font-weight: 900; animation: nameGradientWave 1.8s linear infinite;' },

      // Huyền Thoại (5)
      { id: 'color_rainbow', name: 'Cầu Vồng 7 Màu', rarity: 'legendary', price: 1200, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #ef4444 14%, #f59e0b 28%, #10b981 42%, #06b6d4 56%, #3b82f6 70%, #8b5cf6 84%, #ec4899 100%); background-size: 350% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #059669) drop-shadow(0 3px 0 #2563eb) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(239,68,68,0.65)); font-weight: 900; animation: nameGradientWave 1.6s linear infinite, nameHueShift 5s linear infinite;' },
      { id: 'color_galaxy_shift', name: 'Ngân Hà Galaxy', rarity: 'legendary', price: 1500, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #f3e8ff 15%, #c084fc 35%, #38bdf8 55%, #f472b6 75%, #ffffff 85%, #4f46e5 100%); background-size: 350% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #7c3aed) drop-shadow(0 2px 0 #0284c7) drop-shadow(0 3px 0 #312e81) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(168,85,247,0.75)); font-weight: 900; animation: nameGradientWave 1.4s linear infinite;' },
      { id: 'color_matrix', name: 'Matrix Cyber', rarity: 'legendary', price: 1600, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #dcfce7 18%, #4ade80 45%, #16a34a 65%, #86efac 78%, #ffffff 88%, #14532d 100%); background-size: 250% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #16a34a) drop-shadow(0 2px 0 #15803d) drop-shadow(0 3px 0 #14532d) drop-shadow(0 4px 2px rgba(0,0,0,0.7)) drop-shadow(0 0 12px rgba(74,222,128,0.8)); font-weight: 900; animation: nameGradientWave 1.3s linear infinite, nameMatrixPulse 2s ease-in-out infinite;' },
      { id: 'color_emperor', name: 'Đế Vương Hoàng Kim', rarity: 'legendary', price: 1800, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fffbeb 14%, #fef08a 28%, #f59e0b 48%, #d97706 68%, #ffffff 82%, #78350f 100%); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #d97706) drop-shadow(0 2px 0 #b45309) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 2px rgba(0,0,0,0.75)) drop-shadow(0 0 14px rgba(253,211,77,0.85)); font-weight: 900; animation: nameShimmerGlint 1.8s linear infinite, nameDivineGlow 2.5s ease-in-out infinite;' },
      { id: 'color_divine_light', name: 'Ánh Sáng Thần Thánh', rarity: 'legendary', price: 2000, textStyle: 'background-image: linear-gradient(135deg, #ffffff 0%, #fef9c3 14%, #ffffff 28%, #fcd34d 48%, #f59e0b 68%, #ffffff 82%, #b45309 100%); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 1px 0 #f59e0b) drop-shadow(0 2px 0 #d97706) drop-shadow(0 3px 0 #78350f) drop-shadow(0 4px 3px rgba(0,0,0,0.8)) drop-shadow(0 0 16px rgba(253,211,77,0.95)); font-weight: 900; animation: nameShimmerGlint 1.5s linear infinite, nameDivineGlow 2s ease-in-out infinite;' }
    ],
    banner: [
      // Common (3)
      { id: 'banner_default', name: 'Mặc định', rarity: 'common', price: 0, bgStyle: '' },
      { id: 'banner_gold', name: 'Hoàng Gia Gold', rarity: 'common', price: 200, bgStyle: 'background: linear-gradient(135deg, #fef9c3 0%, #fde047 35%, #d97706 70%, #78350f 100%);' },
      { id: 'banner_forest', name: 'Rừng Đêm Dạ Quang', rarity: 'common', price: 300, bgStyle: 'background: linear-gradient(135deg, #d1fae5 0%, #6ee7b7 35%, #059669 70%, #064e3b 100%);' },

      // Rare (3)
      { id: 'banner_cyber', name: 'Cyberpunk Neon 2026', rarity: 'rare', price: 400, bgStyle: 'background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 35%, #9333ea 70%, #4c1d95 100%);' },
      { id: 'banner_sakura', name: 'Hoa Anh Đào Sakura', rarity: 'rare', price: 600, bgStyle: 'background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 35%, #f472b6 70%, #831843 100%);' },
      { id: 'banner_sunset', name: 'Sóng Biển Hoàng Hôn', rarity: 'rare', price: 700, bgStyle: 'background: linear-gradient(135deg, #ffedd5 0%, #fdba74 35%, #ea580c 70%, #1e3a8a 100%);' },

      // Epic (2)
      { id: 'banner_space', name: 'Vũ Trụ Starry Night', rarity: 'epic', price: 900, bgStyle: 'background: linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 35%, #6366f1 70%, #0f172a 100%);' },
      { id: 'banner_meteor', name: 'Thiên Thạch Rực Rỡ', rarity: 'epic', price: 1200, bgStyle: 'background: linear-gradient(135deg, #fef3c7 0%, #fde047 30%, #dc2626 70%, #450a0a 100%);' },

      // Legendary (1)
      { id: 'banner_cinema', name: 'Bom Tấn Rạp Phim', rarity: 'legendary', price: 1500, bgStyle: 'background: linear-gradient(135deg, #fef08a 0%, #f59e0b 30%, #ef4444 65%, #7f1d1d 100%); background-size: 200% 200%; animation: shopRainbowShift 4s ease infinite;' }
    ],
    badge: [
      { id: 'badge_default', name: 'LV.15 Mặc định', rarity: 'common', price: 0, badgeText: 'LV.15', badgeClass: '' },
      { id: 'badge_motphim', name: 'Mọt Phim', rarity: 'rare', price: 200, badgeText: 'Mọt Phim', badgeClass: 'pink-cute' },
      { id: 'badge_cinephile', name: 'Cinephile', rarity: 'rare', price: 250, badgeText: 'Cinephile', badgeClass: 'cyber-cyan' },
      { id: 'badge_vip', name: 'VIP PRO Hoàng Kim', rarity: 'epic', price: 500, badgeText: 'VIP PRO', badgeClass: 'vip-gold' },
      { id: 'badge_vvip', name: 'VVIP Lam Ngọc', rarity: 'legendary', price: 800, badgeText: 'VVIP', badgeClass: 'blue-vvip' },
      { id: 'badge_admin', name: 'ADMIN TOP 1', rarity: 'legendary', price: 1200, badgeText: 'ADMIN TOP 1', badgeClass: 'admin-rainbow' }
    ]
  };

  window.DISCORD_FRAMES_MAP = window.DISCORD_FRAMES_MAP || {};
  window._shopFramesMap = window._shopFramesMap || {};
  window._allShopFramesList = allShopData.frame;
  if (allShopData.frame) {
    allShopData.frame.forEach(f => {
      window._shopFramesMap[f.id] = f;
      if (f.frameImg) window.DISCORD_FRAMES_MAP[f.id] = f.frameImg;
    });
  }

  const curCat = window._shopActiveCategory || 'frame';
  const curRarity = window._shopActiveRarity || 'all';
  const rawSearchQuery = window._shopRawSearchQuery != null ? window._shopRawSearchQuery : (window._shopSearchQuery || '');
  const searchQuery = window._shopSearchQuery || '';

  let catItems = allShopData[curCat] || allShopData.frame;

  // 1. Filter by Rarity / Owned status
  if (curRarity === 'owned') {
    catItems = catItems.filter(it => userItems.includes(it.id) || it.price === 0 || equippedFrame === it.id || equippedColor === it.id || equippedBanner === it.id);
  } else if (curRarity !== 'all') {
    catItems = catItems.filter(it => it.rarity === curRarity);
  }

  // 2. Filter by Search Query
  if (searchQuery) {
    catItems = catItems.filter(it => it.name.toLowerCase().includes(searchQuery));
  }

  // 3. Sort items: Currently Equipped FIRST -> Owned items (newest to oldest) -> Unowned items
  catItems.sort((a, b) => {
    const isEquippedA = (curCat === 'frame' && equippedFrame === a.id) || (curCat === 'name_color' && equippedColor === a.id) || (curCat === 'banner' && equippedBanner === a.id);
    const isEquippedB = (curCat === 'frame' && equippedFrame === b.id) || (curCat === 'name_color' && equippedColor === b.id) || (curCat === 'banner' && equippedBanner === b.id);
    if (isEquippedA && !isEquippedB) return -1;
    if (!isEquippedA && isEquippedB) return 1;

    const isOwnedA = userItems.includes(a.id) || a.price === 0;
    const isOwnedB = userItems.includes(b.id) || b.price === 0;

    if (isOwnedA && !isOwnedB) return -1;
    if (!isOwnedA && isOwnedB) return 1;

    if (isOwnedA && isOwnedB) {
      const idxA = userItems.indexOf(a.id);
      const idxB = userItems.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxB - idxA;
    }

    return 0;
  });

  // 3. Ultra Fast Pagination (24 items for name_color, 20 for frames/banners = 4 rows × 5 cols exactly, no empty cells)
  const ITEMS_PER_PAGE = curCat === 'name_color' ? 24 : 20;
  const totalPages = Math.max(1, Math.ceil(catItems.length / ITEMS_PER_PAGE));
  let curPage = Math.min(Math.max(1, window._shopPage || 1), totalPages);
  window._shopPage = curPage;

  const pagedItems = catItems.slice((curPage - 1) * ITEMS_PER_PAGE, curPage * ITEMS_PER_PAGE);

  const rarityLabels = {
    common: 'PHỔ THÔNG',
    rare: 'HIẾM',
    epic: 'SỬ THI',
    legendary: 'HUYỀN THOẠI'
  };

  // Render Page Number Pills
  let pagePills = '';
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= curPage - 2 && p <= curPage + 2)) {
      const isCur = p === curPage;
      pagePills += `
                <button onclick="setShopPage(${p})" class="shop-pill-btn ${isCur ? 'active' : ''}" style="
                    min-width: 34px; height: 34px; padding: 0 10px; border-radius: 10px; font-size: 13px; font-weight: ${isCur ? '900' : '700'}; cursor: pointer; transition: all 0.2s ease;
                    background: ${isCur ? 'linear-gradient(135deg, #fcd576 0%, #f59e0b 50%, #d97706 100%)' : 'rgba(255,255,255,0.04)'};
                    border: ${isCur ? 'none' : '1px solid rgba(255,255,255,0.08)'};
                    color: ${isCur ? '#1a1000' : '#94a3b8'};
                    box-shadow: ${isCur ? '0 4px 14px rgba(245, 158, 11, 0.4)' : 'none'};
                    display: inline-flex; align-items: center; justify-content: center;
                ">
                    ${p}
                </button>
            `;
    } else if (p === curPage - 3 || p === curPage + 3) {
      pagePills += `<span style="color: #64748b; font-weight: 800; padding: 0 4px;">...</span>`;
    }
  }

  const shopRenderOutput = `
        <style>
            @keyframes nameGradientWave {
                0%   { background-position: 0% 50%; }
                50%  { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes nameShimmerGlint {
                0%   { background-position: -250% 0; }
                100% { background-position: 250% 0; }
            }
            @keyframes nameHueShift {
                0%   { filter: hue-rotate(0deg) saturate(1.8); }
                100% { filter: hue-rotate(360deg) saturate(1.8); }
            }
            @keyframes nameGlitchCut {
                0%, 85%, 100% { transform: translate(0,0) skewX(0deg); filter: saturate(1.4) brightness(1); }
                87% { transform: translate(-2px, 0.5px) skewX(-5deg); filter: saturate(2) brightness(1.5) contrast(1.3); }
                91% { transform: translate(2px, -0.5px) skewX(5deg);  filter: saturate(2) brightness(1.6) contrast(1.3); }
                95% { transform: translate(0,0) skewX(0deg); filter: saturate(1.4) brightness(1); }
            }
            @keyframes nameFlameFlicker {
                0%,100% { background-position: 0% 50%;   filter: saturate(1.6) brightness(1.05); }
                25%  { background-position: 35% 50%;  filter: saturate(2)   brightness(1.3) contrast(1.2); }
                50%  { background-position: 70% 50%;  filter: saturate(1.7) brightness(1.1); }
                75%  { background-position: 100% 50%; filter: saturate(2.1) brightness(1.4) contrast(1.25); }
            }
            @keyframes nameLightningFlash {
                0%, 80%, 100% { background-position: 0% 50%;   filter: saturate(1.7) brightness(1.05); }
                83%  { background-position: 50% 50%;  filter: saturate(2.5) brightness(1.8) contrast(1.4); }
                86%  { background-position: 20% 50%;  filter: saturate(1.7) brightness(1.1); }
                90%  { background-position: 100% 50%; filter: saturate(2.5) brightness(2.0) contrast(1.5); }
                95%  { background-position: 100% 50%; filter: saturate(1.7) brightness(1.1); }
            }
            @keyframes nameDivineGlow {
                0%,100% { filter: saturate(2)   brightness(1.05) drop-shadow(0 0 8px rgba(253,211,77,0.8)); }
                50%  { filter: saturate(2.2) brightness(1.4)  drop-shadow(0 0 18px rgba(253,211,77,1)); }
            }
            @keyframes nameFrostSparkle {
                0%,100% { filter: saturate(1.5) brightness(1.05); }
                50%  { filter: saturate(1.9) brightness(1.35) contrast(1.2); }
            }
            @keyframes nameNeonPulse {
                0%,100% { filter: saturate(1.5) brightness(1.05) drop-shadow(0 0 6px rgba(236,72,153,0.7)); }
                50%  { filter: saturate(2)   brightness(1.4)  drop-shadow(0 0 14px rgba(236,72,153,1)); }
            }
            @keyframes nameVoidPulse {
                0%,100% { filter: saturate(1.7) brightness(1.05) drop-shadow(0 0 8px rgba(139,92,246,0.8)); }
                50%  { filter: saturate(2.2) brightness(1.45) drop-shadow(0 0 18px rgba(139,92,246,1)); }
            }
            @keyframes nameMatrixPulse {
                0%,100% { filter: saturate(1.9) brightness(1.05) drop-shadow(0 0 8px rgba(74,222,128,0.85)); }
                50%  { filter: saturate(2.4) brightness(1.5)  drop-shadow(0 0 20px rgba(74,222,128,1)); }
            }
        </style>
        <div class="panel-card shop-main-panel" style="padding: 14px 18px; display: flex; flex-direction: column; gap: 10px;">
            <!-- Header Row (Title, Subtitle & Balance Card) - Hidden on mobile to prioritize category tabs and header coin chip -->
            <div class="shop-top-header-row" style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h2 class="shop-header-title" style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 2px 0; letter-spacing: -0.02em;">Cửa hàng vật phẩm</h2>
                    <div class="shop-header-sub" style="font-size: 12px; color: #94a3b8; font-weight: 500;">Mua khung avatar, màu tên và banner bằng xu tích lũy.</div>
                </div>
                <div class="shop-balance-card" style="display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(252, 213, 118, 0.3); border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, rgba(252,213,118,0.25), rgba(245,158,11,0.1)); border: 1px solid rgba(252,213,118,0.4); display: flex; align-items: center; justify-content: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="15.5" cy="14.5" r="6.5" fill="#78350f"/>
                            <circle cx="15.5" cy="14.5" r="5" fill="#1a1000"/>
                            <circle cx="9.5" cy="9.5" r="7.5" fill="#fef08a"/>
                            <circle cx="9.5" cy="9.5" r="6" fill="#1a1000"/>
                            <circle cx="9.5" cy="9.5" r="4.5" fill="#fef08a"/>
                            <circle cx="9.5" cy="9.5" r="3" fill="#1a1000"/>
                        </svg>
                    </div>
                    <div>
                        <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">SỐ DƯ</div>
                        <div class="shop-coin-amount" style="font-size: 16px; font-weight: 900; color: #fcd576; letter-spacing: -0.02em;">${coins.toLocaleString()} <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">Xu</span></div>
                    </div>
                    <button onclick="addDemoCoins()" title="Nạp Xu Test" style="margin-left: 6px; padding: 5px 12px; background: linear-gradient(135deg, #fcd576, #f59e0b); border: none; border-radius: 8px; color: #1a1000; font-size: 11.5px; font-weight: 800; cursor: pointer;">+ Nạp Xu</button>
                </div>
            </div>

            <!-- Level 1 Segmented Tabs (Khung avatar / Màu tên / Banner / Danh hiệu) -->
            <div class="shop-tabs-bar">
                <button type="button" onclick="setShopCategory('frame')" class="shop-cat-tab ${curCat === 'frame' ? 'active' : ''}">
                    <span class="shop-tab-icon">🖼️</span>
                    <span class="shop-tab-title">Khung avatar</span>
                    <span class="shop-tab-badge">${allShopData.frame.length}</span>
                </button>
                <button type="button" onclick="setShopCategory('name_color')" class="shop-cat-tab ${curCat === 'name_color' ? 'active' : ''}">
                    <span class="shop-tab-icon">🎨</span>
                    <span class="shop-tab-title">Màu tên</span>
                    <span class="shop-tab-badge">${allShopData.name_color.length}</span>
                </button>
                <button type="button" onclick="setShopCategory('banner')" class="shop-cat-tab ${curCat === 'banner' ? 'active' : ''}">
                    <span class="shop-tab-icon">🚩</span>
                    <span class="shop-tab-title">Banner</span>
                    <span class="shop-tab-badge">${allShopData.banner.length}</span>
                </button>
                <button type="button" onclick="setShopCategory('badge')" class="shop-cat-tab ${curCat === 'badge' ? 'active' : ''}">
                    <span class="shop-tab-icon">🏅</span>
                    <span class="shop-tab-title">Danh hiệu</span>
                    <span class="shop-tab-badge">${(allShopData.badge || []).length}</span>
                </button>
            </div>

            <!-- Level 2 Sub-filter Pills & Search Bar -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div class="shop-rarity-pills" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${['all', 'owned', 'common', 'rare', 'epic', 'legendary'].map(rar => {
    const isActive = curRarity === rar;
    const isOwnedBtn = rar === 'owned';
    const labels = { all: 'Tất cả', owned: 'Đã sở hữu', common: 'Phổ thông', rare: 'Hiếm', epic: 'Sử thi', legendary: 'Huyền thoại' };
    return `
                            <button onclick="setShopRarity('${rar}')" class="shop-pill-btn ${isActive ? 'active' : ''} ${isOwnedBtn ? 'pill-owned' : ''}">
                                ${labels[rar]}
                            </button>
                        `;
  }).join('')}
                </div>

                <!-- Instant Search Box -->
                <div style="position: relative; width: 220px;">
                    <svg style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input id="shop-search-input" type="text" value="${rawSearchQuery}" oninput="onShopSearch(this)" placeholder="Tìm vật phẩm..." style="width: 100%; padding: 4px 10px 4px 30px; border-radius: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); color: #ffffff; font-size: 11.5px; outline: none; box-sizing: border-box;">
                </div>
            </div>

            <!-- Page Counter Info -->
            <div class="shop-page-info-bar" style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #94a3b8; font-weight: 600;">
                <div class="shop-count-label">Hiển thị <span style="color: #fcd576; font-weight: 800;">${pagedItems.length}</span> / ${catItems.length} vật phẩm</div>
                <div>Trang <span style="color: #ffffff; font-weight: 800;">${curPage}</span> / ${totalPages}</div>
            </div>

            <!-- Product Grid (5 Columns exact match to user screenshot) -->
            <div class="shop-items-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; will-change: transform, opacity;">
                ${pagedItems.length === 0 ? `
                    <div style="grid-column: 1 / -1; padding: 40px 0; text-align: center; color: #94a3b8; font-size: 14px; font-weight: 600;">
                        🔍 Không tìm thấy vật phẩm phù hợp với bộ lọc.
                    </div>
                ` : pagedItems.map(item => {
    // Get current user's display name and avatar for live preview
    const freshUser = currentUser || (typeof getUser === 'function' ? getUser() : null) || u;
    const previewName = (freshUser && (freshUser.displayName || freshUser.name || freshUser.fullName)) || (u && (u.displayName || u.name)) || 'Người dùng';
    const userInitial = previewName.charAt(0).toUpperCase();
    const shopUid = (freshUser && (freshUser.id || freshUser._id || freshUser.email)) || '';
    const shopAvatar = (freshUser && (freshUser.avatar || freshUser.avatar_url))
      || (shopUid ? localStorage.getItem(`avatar_${shopUid}`) : null)
      || localStorage.getItem('user_avatar')
      || '/android-chrome-512x512.png';

    const innerShopAvatar = shopAvatar
      ? `<img src="${shopAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.outerHTML='<span style=\\'font-size:22px;font-weight:900;color:#ffffff;\\'>${userInitial}</span>'">`
      : `<span style="font-size:22px;font-weight:900;color:#ffffff;">${userInitial}</span>`;

    const isOwned = userItems.includes(item.id) || item.price === 0;

    let isEquipped = false;
    if (curCat === 'frame') isEquipped = equippedFrame === item.id;
    if (curCat === 'name_color') isEquipped = equippedColor === item.id;
    if (curCat === 'banner') isEquipped = equippedBanner === item.id;
    if (curCat === 'badge') {
      const currentBadge = typeof getEquippedBadge === 'function' ? getEquippedBadge(freshUser) : (localStorage.getItem('ap_equipped_badge') || 'LV.15');
      isEquipped = (currentBadge === item.badgeText) || (currentBadge.includes(item.badgeText));
    }

    // Render Preview content based on Category
    let previewContent = '';
    if (curCat === 'frame') {
      if (item.id === 'frame_none' || !item.frameImg) {
        previewContent = `
                <div class="shop-frame-preview-stage" style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #1e1b4b, #312e81); display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 2px solid rgba(255,255,255,0.2);">
                        ${innerShopAvatar}
                    </div>
                </div>
              `;
      } else {
        previewContent = `
                <div class="shop-frame-preview-stage" style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #1e1b4b, #312e81); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; z-index: 2; box-shadow: 0 4px 12px rgba(0,0,0,0.35);">
                        ${innerShopAvatar}
                    </div>
                    <img src="${item.frameImg}" loading="eager" decoding="async" fetchpriority="high" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 120%; height: 120%; max-width: none; max-height: none; pointer-events: none; object-fit: contain; z-index: 5; will-change: transform;" onerror="this.style.display='none'">
                </div>
              `;
      }
    } else if (curCat === 'name_color') {
      const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('light-mode');
      let nameStyle = item.textStyle || '';
      if (item.id === 'color_default') {
        nameStyle = isLight ? 'color: #1c1917 !important; -webkit-text-fill-color: #1c1917 !important;' : 'color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;';
      }
      previewContent = `
                            <div class="shop-name-preview-chip" style="display:inline-flex; align-items:center; justify-content:center; padding:10px 14px; min-height:48px; max-width:98%; overflow:visible;">
                                <span class="shop-name-text-render ap-nc-${item.id} ${item.id === 'color_default' ? '' : 'has-custom-name-color'}" style="font-family:'Montserrat', 'Oswald', 'Be Vietnam Pro', system-ui, sans-serif !important; font-size:18px; font-weight:900 !important; letter-spacing:0.04em !important; text-transform:none !important; text-align:center; display:inline-block; white-space:nowrap; text-overflow:ellipsis; max-width:150px; ${nameStyle}">${previewName}</span>
                            </div>
                        `;
    } else if (curCat === 'banner') {
      const isLight = typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('light-mode');
      let bannerBg = item.bgStyle || '';
      if (item.id === 'banner_default') {
        bannerBg = isLight
          ? 'background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%); border: 1px solid rgba(0,0,0,0.08);'
          : 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.08);';
      }
      previewContent = `
                            <div style="width: 100%; height: 60px; border-radius: 8px; ${bannerBg}"></div>
                        `;
    } else if (curCat === 'badge') {
      previewContent = typeof renderUserBadgeHtml === 'function'
        ? renderUserBadgeHtml(item.badgeText, item.badgeClass)
        : `<span class="user-badge ${item.badgeClass}">${item.badgeText}</span>`;
    }

    // Button Renderer
    let btnHtml = '';
    if (isEquipped) {
      btnHtml = `
                            <button class="shop-btn-equipped" style="width: 100%; padding: 7px 8px; border-radius: 9px; background: rgba(34, 197, 94, 0.14); border: 1px solid rgba(34, 197, 94, 0.38); color: #4ade80; font-size: 12px; font-weight: 800; cursor: default; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Đang dùng</span>
                            </button>
                        `;
    } else if (isOwned) {
      btnHtml = `
                            <button onclick="equipShopItem('${curCat}', '${item.id}')" class="shop-btn-equip" style="width: 100%; padding: 6px 8px; border-radius: 9px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14); color: #ffffff; font-size: 12px; font-weight: 750; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0; color:#f59e0b; filter:drop-shadow(0 1px 3px rgba(245, 158, 11, 0.4));">
                                    <path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clip-rule="evenodd" />
                                </svg>
                                <span>Trang bị</span>
                            </button>
                        `;
    } else {
      btnHtml = `
                            <button onclick="buyAndEquipItem('${curCat}', '${item.id}', ${item.price}, '${item.name}')" class="shop-btn-buy" style="width: 100%; padding: 5px 8px; border-radius: 8px; background: linear-gradient(135deg, #fcd576 0%, #f59e0b 50%, #d97706 100%); border: none; color: #1a1000; font-size: 11.5px; font-weight: 900; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                                    <circle cx="15.5" cy="14.5" r="6.5" fill="#78350f"/>
                                    <circle cx="15.5" cy="14.5" r="5" fill="#1a1000"/>
                                    <circle cx="9.5" cy="9.5" r="7.5" fill="#fef08a"/>
                                    <circle cx="9.5" cy="9.5" r="6" fill="#1a1000"/>
                                    <circle cx="9.5" cy="9.5" r="4.5" fill="#fef08a"/>
                                    <circle cx="9.5" cy="9.5" r="3" fill="#1a1000"/>
                                </svg>
                                ${item.price.toLocaleString()} Xu
                            </button>
                        `;
    }

    return `
                        <div class="shop-item-card ${isEquipped ? 'equipped' : ''}" style="
                            background: rgba(255, 255, 255, 0.025);
                            border: 1px solid ${isEquipped ? '#6366f1' : 'rgba(255, 255, 255, 0.07)'};
                            border-radius: 14px; padding: 8px; display: flex; flex-direction: column; gap: 6px;
                            position: relative; transition: all 0.2s; overflow: hidden; box-sizing: border-box;
                        ">
                            <!-- Top Right Checkmark Badge if owned -->
                            ${isOwned ? `
                                <div class="shop-corner-badge" style="
                                    position: absolute; top: 7px; right: 7px; width: 18px; height: 18px; border-radius: 50%;
                                    background: ${isEquipped ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(255,255,255,0.14)'};
                                    border: 1.5px solid ${isEquipped ? '#ffffff' : 'rgba(255,255,255,0.22)'};
                                    box-shadow: ${isEquipped ? '0 2px 8px rgba(34, 197, 94, 0.45)' : 'none'};
                                    display: flex; align-items: center; justify-content: center; color: #ffffff; z-index: 2;
                                ">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            ` : ''}

                            <!-- Preview Box -->
                            <div class="shop-preview-box" style="
                                height: 80px; width: 100%; border-radius: 10px;
                                background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.05); backdrop-filter: blur(6px);
                                display: flex; align-items: center; justify-content: center; padding: 4px; box-sizing: border-box;
                            ">
                                ${previewContent}
                            </div>

                            <!-- Info Section -->
                            <div style="text-align: center; width: 100%; overflow: hidden; box-sizing: border-box;">
                                <div class="shop-rarity-tag" style="font-size: 9px; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 1px;">
                                    ${rarityLabels[item.rarity] || 'PHỔ THÔNG'}
                                </div>
                                <div class="shop-item-name" title="${item.name}" style="font-size: 11.5px; font-weight: 800; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; box-sizing: border-box; padding: 0 2px;">
                                    ${item.name}
                                </div>
                            </div>

                            <!-- Button Area -->
                            <div style="margin-top: auto;">
                                ${btnHtml}
                            </div>
                        </div>
                    `;
  }).join('')}
            </div>

            <!-- Pagination Navigation Footer Bar -->
            ${totalPages > 1 ? `
                <div class="shop-pagination-bar" style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                    <button onclick="setShopPage(${curPage - 1})" class="shop-page-nav-btn shop-page-prev-btn" ${curPage <= 1 ? 'disabled' : ''} style="
                        display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 8px;
                        font-size: 11.5px; font-weight: 700; transition: all 0.2s ease;
                    ">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M15 18l-6-6 6-6"/></svg>
                        Trang trước
                    </button>
                    
                    <div style="display: flex; align-items: center; gap: 6px;">
                        ${pagePills}
                    </div>

                    <button onclick="setShopPage(${curPage + 1})" class="shop-page-nav-btn shop-page-next-btn" ${curPage >= totalPages ? 'disabled' : ''} style="
                        display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px;
                        font-size: 13px; font-weight: 700; transition: all 0.2s ease;
                    ">
                        Trang sau
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                </div>
            ` : ''}
        </div>
    `;

  // Preload adjacent page frame animations in background for 0ms instant transition
  setTimeout(function () {
    try {
      if (curCat === 'frame' && catItems && catItems.length) {
        [curPage + 1, curPage - 1].forEach(function (p) {
          if (p >= 1 && p <= totalPages) {
            var preSlice = catItems.slice((p - 1) * ITEMS_PER_PAGE, p * ITEMS_PER_PAGE);
            preSlice.forEach(function (it) {
              if (it.frameImg) {
                var im = new Image();
                im.src = it.frameImg;
              }
            });
          }
        });
      }
    } catch (e) { }
  }, 150);

  return shopRenderOutput;
}

function equipShopItem(cat, id) {
  if (cat === 'frame') {
    localStorage.setItem('ap_equipped_frame', id);
    localStorage.setItem('ap_frame_id', id);
    if (id === 'frame_none' || id === 'none') {
      localStorage.removeItem('ap_frame_url');
      localStorage.removeItem('ap_equipped_frame_url');
      localStorage.removeItem('ap_frame_class');
      if (currentUser) {
        currentUser.equippedFrame = 'frame_none';
        currentUser.equippedFrameUrl = '';
        currentUser.equippedFrameClass = '';
        try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
      }
      if (typeof authService !== 'undefined') {
        if (authService.currentUser) {
          authService.currentUser.equippedFrame = 'frame_none';
          authService.currentUser.equippedFrameUrl = '';
          authService.currentUser.equippedFrameClass = '';
        }
        if (typeof authService.saveUser === 'function' && currentUser) authService.saveUser(currentUser);
        if (typeof authService.updateProfile === 'function') {
          authService.updateProfile({ equippedFrame: 'frame_none', equippedFrameUrl: '', equippedFrameClass: '' });
        }
      }
    } else {
      const item = (window._shopFramesMap && window._shopFramesMap[id]) || (window.DISCORD_FRAMES_MAP && window.DISCORD_FRAMES_MAP[id]);
      if (item) {
        const frameUrl = typeof item === 'string' ? item : (item.frameImg || '');
        const frameClass = typeof item === 'object' ? (item.class || '') : '';
        localStorage.setItem('ap_frame_url', frameUrl);
        localStorage.setItem('ap_equipped_frame_url', frameUrl);
        localStorage.setItem('ap_frame_class', frameClass);
        if (currentUser) {
          currentUser.equippedFrame = id;
          currentUser.equippedFrameUrl = frameUrl;
          currentUser.equippedFrameClass = frameClass;
          try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
        }
        if (typeof authService !== 'undefined') {
          if (authService.currentUser) {
            authService.currentUser.equippedFrame = id;
            authService.currentUser.equippedFrameUrl = frameUrl;
            authService.currentUser.equippedFrameClass = frameClass;
          }
          if (typeof authService.saveUser === 'function' && currentUser) authService.saveUser(currentUser);
          if (typeof authService.updateProfile === 'function') {
            authService.updateProfile({ equippedFrame: id, equippedFrameUrl: frameUrl, equippedFrameClass: frameClass });
          }
        }
      }
    }
  }
  if (cat === 'name_color') {
    localStorage.setItem('ap_equipped_color', id);
    if (currentUser) {
      currentUser.equippedColor = id;
      try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
    }
    if (typeof authService !== 'undefined') {
      if (authService.currentUser) authService.currentUser.equippedColor = id;
      if (typeof authService.saveUser === 'function' && currentUser) authService.saveUser(currentUser);
      if (typeof authService.updateProfile === 'function') authService.updateProfile({ equippedColor: id });
    }
  }
  if (cat === 'banner') {
    localStorage.setItem('ap_equipped_banner', id);
    if (currentUser) {
      currentUser.equippedBanner = id;
      try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
    }
    if (typeof authService !== 'undefined') {
      if (authService.currentUser) authService.currentUser.equippedBanner = id;
      if (typeof authService.saveUser === 'function' && currentUser) authService.saveUser(currentUser);
      if (typeof authService.updateProfile === 'function') authService.updateProfile({ equippedBanner: id });
    }
    applyEquippedBanner(null, currentUser);
  }
  if (cat === 'badge') {
    const item = ((allShopData && allShopData.badge) || []).find(b => b.id === id);
    const badgeText = item ? item.badgeText : id;
    localStorage.setItem('ap_equipped_badge', badgeText);
    localStorage.setItem('ap_equipped_title', badgeText);
    if (currentUser) {
      currentUser.equippedBadge = badgeText;
      currentUser.badge = badgeText;
      try { 
        localStorage.setItem('A Phim_user', JSON.stringify(currentUser));
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); 
      } catch (e) { }
    }
    if (typeof authService !== 'undefined') {
      if (authService.currentUser) {
        authService.currentUser.equippedBadge = badgeText;
        authService.currentUser.badge = badgeText;
      }
      if (typeof authService.saveUser === 'function' && currentUser) authService.saveUser(currentUser);
      if (typeof authService.updateProfile === 'function') authService.updateProfile({ equippedBadge: badgeText, badge: badgeText });
    }
  }

  if (typeof showToast === 'function') showToast('Đã trang bị vật phẩm thành công!', 'success');
  else alert('🎉 Đã trang bị vật phẩm!');

  // Đồng bộ Header, Mobile Drawer, Bottom Nav & Sidebar ngay tức thì (0ms)
  if (typeof updateUserUI === 'function') updateUserUI();
  if (typeof updateMobileMenuUser === 'function') updateMobileMenuUser();
  if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
  if (typeof rebuildBottomNav === 'function') rebuildBottomNav();
  if (typeof initSidebar === 'function') initSidebar();

  const rightNameEl = document.querySelector('.avatar-panel .avatar-label');
  if (rightNameEl && typeof applyEquippedNameColor === 'function') {
    applyEquippedNameColor(rightNameEl, currentUser);
  }
  const rightAvatarEl = document.querySelector('.avatar-panel .avatar-large');
  if (rightAvatarEl && currentUser) {
    const letter = (currentUser.displayName || currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
    const frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(currentUser) : { type: 'none', value: '' };
    const uid = currentUser && (currentUser.id || currentUser._id || currentUser.email);
    const savedAvatar = (currentUser && (currentUser.avatar || currentUser.avatar_url)) || (uid ? localStorage.getItem(`avatar_${uid}`) : null) || localStorage.getItem('user_avatar') || '/android-chrome-512x512.png';
    const innerContent = savedAvatar
      ? `<img src="${savedAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.outerHTML='<span style=\\'font-size:28px;font-weight:900;color:#1a1000;\\'>${letter}</span>'">`
      : `<span style="font-size:28px;font-weight:900;color:#1a1000;">${letter}</span>`;
    rightAvatarEl.innerHTML = typeof renderAvatarWithFrame === 'function' ? renderAvatarWithFrame(innerContent, 68, frameInfo) : innerContent;
  }

  // Đồng bộ ô input Tên hiển thị nếu đang ở tab account
  const accNameInput = document.getElementById('accDisplayName');
  if (accNameInput && currentUser) {
    accNameInput.value = currentUser.displayName || currentUser.name || '';
  }

  // Đồng bộ header dropdown name
  const headerNameText = document.querySelector('.ap-user-name-text');
  if (headerNameText && typeof applyEquippedNameColor === 'function') {
    applyEquippedNameColor(headerNameText, currentUser);
  }
  const dropdownNameText = document.querySelector('.ap-dropdown-user-name');
  if (dropdownNameText && typeof applyEquippedNameColor === 'function') {
    applyEquippedNameColor(dropdownNameText, currentUser);
  }

  // Phát sự kiện realtime toàn hệ thống và các tab
  try {
    window.dispatchEvent(new CustomEvent('ap:user-updated', { detail: currentUser }));
    window.dispatchEvent(new CustomEvent('auth:profileUpdated', { detail: currentUser }));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('ap_user_sync');
      bc.postMessage({ type: 'item_equipped', category: cat, id: id, user: currentUser });
      bc.close();
      const bc2 = new BroadcastChannel('aphim_cloud_sync_bus');
      bc2.postMessage({ type: 'cloud_data_synced', userId: currentUser.id || currentUser._id, timestamp: Date.now() });
      bc2.close();
    }
  } catch (e) { }

  _shopFastRefresh(null);
}

function buyAndEquipItem(cat, id, price, name) {
  let currentXu = typeof getProfileCoins === 'function' ? getProfileCoins(currentUser) : Number(localStorage.getItem('cinestream_xu') || 150);
  const vnName = (typeof getShopItemName === 'function' ? getShopItemName(name || id) : name) || name;

  if (currentXu < price) {
    const diff = (price - currentXu).toLocaleString();
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(`Bạn cần thêm <b>${diff} Xu</b> để mua <b>"${vnName}"</b>. Vui lòng kiếm thêm hoặc nạp thêm Xu!`, 'warning');
    } else if (typeof showToast === 'function') {
      showToast(`Bạn cần thêm ${diff} Xu để mua "${vnName}". Vui lòng nạp thêm Xu!`, 'warning');
    } else {
      alert(`Bạn cần thêm ${diff} Xu để mua "${vnName}". Vui lòng nạp thêm Xu!`);
    }
    return;
  }

  currentXu -= price;
  localStorage.setItem('cinestream_xu', currentXu);
  if (currentUser) {
    currentUser.xu = currentXu;
    currentUser.coins = currentXu;
    try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
  }

  let userItems = [];
  try { userItems = JSON.parse(localStorage.getItem('ap_user_items') || '[]'); } catch (e) { }
  if (!userItems.includes(id)) userItems.push(id);
  localStorage.setItem('ap_user_items', JSON.stringify(userItems));

  if (currentUser) {
    currentUser.ownedItems = userItems;
  }

  if (window.GamificationCore && typeof window.GamificationCore.setXu === 'function') {
    window.GamificationCore.setXu(currentXu);
  }

  const allShopCoinEls = document.querySelectorAll('.shop-coin-amount, .header-coin-val, #headerCoinVal, #sidebarCoinVal, .avatar-wallet-val, .ap-header-coin-val');
  allShopCoinEls.forEach(el => {
    if (el.classList.contains('shop-coin-amount')) {
      el.innerHTML = `${currentXu.toLocaleString()} <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">Xu</span>`;
    } else {
      el.textContent = currentXu.toLocaleString();
    }
  });

  if (typeof authService !== 'undefined') {
    if (authService.currentUser) {
      authService.currentUser.xu = currentXu;
      authService.currentUser.coins = currentXu;
      authService.currentUser.ownedItems = userItems;
    }
    if (typeof authService.saveUser === 'function' && currentUser) {
      authService.saveUser(currentUser);
    }
    if (typeof authService.updateProfile === 'function') {
      authService.updateProfile({ xu: currentXu, ownedItems: userItems });
    }
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('aphim_cloud_sync_bus');
      bc.postMessage({ type: 'xu_updated', xu: currentXu, timestamp: Date.now() });
      bc.close();
    }
  } catch (e) { }

  if (typeof showToast === 'function') {
    showToast(`🎉 Mua và trang bị "${vnName}" thành công!`, 'success');
  }

  // Auto equip after buy
  equipShopItem(cat, id);
}

function buyShopItem(title, price) {
  let currentXu = typeof getProfileCoins === 'function' ? getProfileCoins(currentUser) : Number(localStorage.getItem('cinestream_xu') || 150);
  const vnTitle = (typeof getShopItemName === 'function' ? getShopItemName(title) : title) || title;
  if (currentXu < price) {
    const diff = (price - currentXu).toLocaleString();
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(`Bạn cần thêm <b>${diff} Xu</b> để đổi <b>"${vnTitle}"</b>. Vui lòng kiếm thêm hoặc nạp thêm Xu!`, 'warning');
    } else if (typeof showToast === 'function') {
      showToast(`Bạn cần thêm ${diff} Xu để đổi "${vnTitle}". Vui lòng nạp thêm Xu!`, 'warning');
    } else {
      alert(`Bạn cần thêm ${diff} Xu để đổi "${vnTitle}". Vui lòng nạp thêm Xu!`);
    }
    return;
  }
  currentXu -= price;
  localStorage.setItem('cinestream_xu', currentXu);
  if (currentUser) {
    currentUser.xu = currentXu;
    currentUser.coins = currentXu;
    try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
  }
  if (window.GamificationCore && typeof window.GamificationCore.setXu === 'function') {
    window.GamificationCore.setXu(currentXu);
  }

  const allShopCoinEls = document.querySelectorAll('.shop-coin-amount, .header-coin-val, #headerCoinVal, #sidebarCoinVal, .avatar-wallet-val, .ap-header-coin-val');
  allShopCoinEls.forEach(el => {
    if (el.classList.contains('shop-coin-amount')) {
      el.innerHTML = `${currentXu.toLocaleString()} <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">Xu</span>`;
    } else {
      el.textContent = currentXu.toLocaleString();
    }
  });

  if (typeof authService !== 'undefined') {
    if (authService.currentUser) {
      authService.currentUser.xu = currentXu;
      authService.currentUser.coins = currentXu;
    }
    if (typeof authService.saveUser === 'function' && currentUser) {
      authService.saveUser(currentUser);
    }
    if (typeof authService.updateProfile === 'function') {
      authService.updateProfile({ xu: currentXu });
    }
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('aphim_cloud_sync_bus');
      bc.postMessage({ type: 'xu_updated', xu: currentXu, timestamp: Date.now() });
      bc.close();
    }
  } catch (e) { }

  if (typeof showCustomAlert === 'function') {
    showCustomAlert(`🎉 Chúc mừng! Bạn đã đổi thành công <b>"${vnTitle}"</b>.<br><span style="color:#fcd576;font-weight:700;">Số dư Xu còn lại: ${currentXu.toLocaleString()} Xu</span>`, 'success');
  } else if (typeof showToast === 'function') {
    showToast(`🎉 Bạn đã đổi thành công "${vnTitle}". Số dư còn lại: ${currentXu.toLocaleString()} Xu`, 'success');
  } else {
    alert(`🎉 Chúc mừng! Bạn đã đổi thành công "${vnTitle}". Số dư Xu còn lại: ${currentXu.toLocaleString()} Xu.`);
  }
  _shopFastRefresh(null);
  initSidebar();
}

function addDemoCoins() {
  let currentXu = Number(localStorage.getItem('cinestream_xu') || 50000);
  currentXu += 50000;
  localStorage.setItem('cinestream_xu', currentXu);
  if (currentUser) {
    currentUser.xu = currentXu;
    currentUser.coins = currentXu;
    try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
  }
  alert(`💰 Đã nạp thành công 50,000 Xu vào tài khoản! Số dư mới: ${currentXu.toLocaleString()} Xu.`);
  if (currentTab === 'shop') switchTab('shop');
  initSidebar();
}

function claimDailyBonus() {
  openGamificationModal('streak');
}

// ─── CLOSE HELPER: unlock scroll & remove modal ───
window.closeGamifyModal = function () {
  const m = document.getElementById('ap-gamify-modal');
  if (m) m.remove();
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.documentElement.style.overflow = '';
};

function openGamificationModal(activeSubTab) {
  activeSubTab = activeSubTab || 'streak';
  // Remove existing modal if any
  const existingModal = document.getElementById('ap-gamify-modal');
  if (existingModal) existingModal.remove();
  // Lock background scroll (save scrollbar width to prevent layout shift)
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  if (scrollbarWidth > 0) document.body.style.paddingRight = scrollbarWidth + 'px';

  const streakData = (window.GamificationCore && typeof window.GamificationCore.getDailyStreakData === 'function')
    ? window.GamificationCore.getDailyStreakData()
    : { streak: 1, isClaimedToday: false, todayDayIndex: 1, streakRewards: [] };

  const missionsData = (window.GamificationCore && typeof window.GamificationCore.getDailyMissionsData === 'function')
    ? window.GamificationCore.getDailyMissionsData()
    : [];

  const curXu = (window.GamificationCore ? window.GamificationCore.getXu() : Number(localStorage.getItem('cinestream_xu') || 150));
  const curXP = (window.GamificationCore ? window.GamificationCore.getXP() : 0);

  const missionSvgIcons = {
    'm_watch_15': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>',
    'm_watch_45': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fcd576" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'm_comment_1': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    'm_fav_1': '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f43f5e" stroke="#f43f5e" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    'm_share_1': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>'
  };

  const coinSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 5px rgba(245,158,11,0.45));"><defs><linearGradient id="gCL" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#fef08a"/><stop offset="0.5" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#gCL)" stroke="#fcd576" stroke-width="1.2"/><polygon points="12 6.5 13.5 10 17 10.5 14.5 13 15.2 16.5 12 14.7 8.8 16.5 9.5 13 7 10.5 10.5 10" fill="#ffffff" opacity="0.95"/></svg>`;
  const chestSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 0 8px rgba(245,158,11,0.6));"><defs><linearGradient id="gCB" x1="3" y1="10" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="#f59e0b"/><stop offset="0.7" stop-color="#b45309"/><stop offset="1" stop-color="#78350f"/></linearGradient></defs><rect x="3" y="10" width="18" height="11" rx="2.5" fill="url(#gCB)" stroke="#fcd576" stroke-width="1.2"/><path d="M2 9.5C2 7 5 5 12 5C19 5 22 7 22 9.5V10.5H2V9.5Z" fill="#f59e0b" stroke="#fcd576" stroke-width="1.2"/><rect x="10.5" y="9" width="3" height="4.5" rx="1" fill="#fef08a" stroke="#78350f" stroke-width="0.8"/><circle cx="12" cy="11" r="0.8" fill="#78350f"/></svg>`;
  const checkSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 6px rgba(16,185,129,0.4));"><defs><linearGradient id="gCK" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#34d399"/><stop offset="1" stop-color="#059669"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#gCK)" stroke="#4ade80" stroke-width="1.2"/><polyline points="7.5 12 10.5 15 16.5 9" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  // ─── BUILD VIP STATUS TEXT ───
  const localVipExp = localStorage.getItem('ap_vip_expires');
  let vipStatusHtml = '🛡️ Chưa kích hoạt VIP · Đổi Xu để thưởng thức phim không quảng cáo & Full HD 1080p!';
  if (localVipExp) {
    const expDate = new Date(localVipExp);
    if (expDate > new Date()) {
      const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));
      vipStatusHtml = `<span style="color:#4ade80; font-weight:700;">👑 Đang kích hoạt VIP PRO</span> · Hết hạn: ${expDate.toLocaleDateString('vi-VN')} (Còn ${daysLeft} ngày)`;
    }
  }

  // ─── BUILD STREAK CARDS ───
  const streakCardsHtml = (streakData.streakRewards || []).map((r, idx) => {
    const dayNum = idx + 1;
    const isClaimed = streakData.isClaimedToday ? (dayNum <= streakData.todayDayIndex) : (dayNum < streakData.todayDayIndex);
    const isCurrent = !streakData.isClaimedToday && (dayNum === streakData.todayDayIndex);
    const isDay7 = dayNum === 7;
    let cardBg = 'rgba(255,255,255,0.03)', cardBorder = '1px solid rgba(255,255,255,0.08)', cardShadow = 'none';
    let iconEl = isDay7 ? chestSvg : coinSvg;
    if (isClaimed) { cardBg = 'linear-gradient(180deg, rgba(16,185,129,0.16) 0%, rgba(5,150,105,0.06) 100%)'; cardBorder = '1px solid rgba(16,185,129,0.4)'; iconEl = checkSvg; }
    else if (isCurrent) { cardBg = 'linear-gradient(180deg, rgba(245,158,11,0.3) 0%, rgba(217,119,6,0.15) 100%)'; cardBorder = '1.5px solid #f59e0b'; cardShadow = '0 0 16px rgba(245,158,11,0.4), inset 0 0 10px rgba(245,158,11,0.2)'; }
    else if (isDay7) { cardBg = 'linear-gradient(180deg, rgba(245,158,11,0.14) 0%, rgba(180,83,9,0.06) 100%)'; cardBorder = '1px dashed rgba(245,158,11,0.45)'; }
    return `<div class="ap-streak-card ${isDay7 ? 'ap-streak-card-day7' : ''}" style="background:${cardBg}; border:${cardBorder}; box-shadow:${cardShadow}; display:flex; flex-direction:column; align-items:center; padding:9px 4px; border-radius:13px; position:relative; transition:all .2s;">
            <span style="font-size:10px; font-weight:800; color:${isClaimed ? '#4ade80' : (isCurrent ? '#fcd576' : '#94a3b8')}; text-transform:uppercase;">${isDay7 ? '👑 N.7' : 'N.' + dayNum}</span>
            <div style="width:28px; height:28px; border-radius:50%; margin:4px 0; display:flex; align-items:center; justify-content:center;">${iconEl}</div>
            <div style="text-align:center;">
              <div style="font-size:11px; font-weight:800; color:${isClaimed ? '#4ade80' : '#fcd576'}; line-height:1.2;">+${r.xu} Xu</div>
              <div style="font-size:9.5px; color:#38bdf8; font-weight:700; line-height:1.2; margin-top:2px;">+${r.xp} XP</div>
            </div>
          </div>`;
  }).join('');

  // ─── BUILD MISSION CARDS ───
  const missionCardsHtml = missionsData.map(m => {
    const iconSvg = missionSvgIcons[m.id] || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
    const progressPct = Math.min(100, Math.round((m.current / m.target) * 100));
    const statusBtn = m.isClaimed
      ? `<div style="font-size:11px; font-weight:800; color:#4ade80; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); padding:5px 10px; border-radius:8px; display:flex; align-items:center; gap:4px; white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg><span>Đã Nhận</span></div>`
      : m.isCompleted
        ? `<button onclick="handleClaimMission('${m.id}')" style="padding:6px 12px; font-size:11.5px; font-weight:800; border-radius:8px; border:none; cursor:pointer; background:linear-gradient(135deg, #22c55e, #16a34a); color:#fff; box-shadow:0 4px 14px rgba(34,197,94,0.4); display:flex; align-items:center; gap:4px; white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span>Nhận Quà</span></button>`
        : `<div style="padding:5px 10px; font-size:11px; font-weight:700; border-radius:8px; background:rgba(255,255,255,0.06); color:#64748b; border:1px solid rgba(255,255,255,0.08); white-space:nowrap;">Đang Làm</div>`;
    return `<div class="ap-mission-card" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px; gap:12px; transition:all .2s ease;">
            <div class="ap-mission-icon-wrap" style="width:36px; height:36px; border-radius:11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; flex-shrink:0;">${iconSvg}</div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap;">
                <span style="font-size:13.5px; font-weight:700; color:#ffffff;">${m.title}</span>
                <div style="display:flex; gap:5px;">
                  <span style="font-size:10px; font-weight:800; color:#38bdf8; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.25); padding:1px 5px; border-radius:5px;">+${m.xp} XP</span>
                  <span style="font-size:10px; font-weight:800; color:#fcd576; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25); padding:1px 5px; border-radius:5px;">+${m.xu} Xu</span>
                </div>
              </div>
              <div style="font-size:11.5px; color:#cbd5e1; margin:2px 0 7px;">${m.desc}</div>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="flex:1; height:5px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;"><div style="width:${progressPct}%; height:100%; background:${m.isCompleted ? 'linear-gradient(90deg, #22c55e, #10b981)' : 'linear-gradient(90deg, #38bdf8, #6366f1)'}; border-radius:999px;"></div></div>
                <span style="font-size:11px; font-weight:700; color:#cbd5e1; flex-shrink:0;">${m.current}/${m.target} ${m.unit}</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0; margin-left:2px;">${statusBtn}</div>
          </div>`;
  }).join('');

  // ─── VIP PACKAGE BUTTON HELPER ───
  const vipBtn = (days, cost, label, gradient, shadow) => {
    const canAfford = curXu >= cost;
    return `<button onclick="handleModalRedeemVip(${days}, ${cost}, '${label}')" style="width:100%; padding:10px; border-radius:10px; border:none; cursor:${canAfford ? 'pointer' : 'not-allowed'}; font-size:12.5px; font-weight:800; background:${canAfford ? gradient : 'rgba(255,255,255,0.06)'}; color:${canAfford ? '#fff' : '#64748b'}; box-shadow:${canAfford ? shadow : 'none'}; transition:all .2s ease;">💎 Đổi ${cost.toLocaleString()} Xu</button>`;
  };

  modal = document.createElement('div');
  modal.id = 'ap-gamify-modal';
  modal.innerHTML = `
          <style>
            #ap-gamify-modal { position:fixed; inset:0; background:rgba(4,7,15,0.88); z-index:999999; display:flex; align-items:center; justify-content:center; padding:12px; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); animation:apGamifyFadeIn .22s ease-out; box-sizing:border-box; }
            #ap-gamify-modal * { box-sizing:border-box; }
            @keyframes apGamifyFadeIn { from { opacity:0; transform:scale(0.96) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
            #ap-gamify-modal ::-webkit-scrollbar { width:4px; }
            #ap-gamify-modal ::-webkit-scrollbar-track { background:rgba(0,0,0,0.25); border-radius:8px; }
            #ap-gamify-modal ::-webkit-scrollbar-thumb { background:rgba(245,158,11,0.35); border-radius:8px; }
            .ap-gamify-box { background:#0d111d; background-image:radial-gradient(circle at 50% -10%, rgba(245,158,11,0.18) 0%, transparent 60%), radial-gradient(circle at 100% 100%, rgba(99,102,241,0.08) 0%, transparent 50%); border:1px solid rgba(245,158,11,0.35); border-radius:22px; width:100%; max-width:590px; max-height:90vh; overflow-y:auto; box-shadow:0 25px 65px rgba(0,0,0,0.9), 0 0 40px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.1); display:flex; flex-direction:column; position:relative; }
            .ap-gamify-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 14px; border-bottom:1px solid rgba(255,255,255,0.08); gap:10px; }
            .ap-gamify-icon { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, #fcd576 0%, #f59e0b 60%, #b45309 100%); display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(245,158,11,0.35); flex-shrink:0; border:1px solid rgba(255,255,255,0.4); }
            .ap-gamify-close { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); width:32px; height:32px; border-radius:9px; color:#cbd5e1; font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s ease; flex-shrink:0; }
            .ap-gamify-close:hover { background:rgba(239,68,68,0.2); color:#ef4444; border-color:rgba(239,68,68,0.4); }
            .ap-gamify-statusbar { display:flex; align-items:center; justify-content:space-between; padding:10px 22px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05); gap:8px; }
            .ap-gamify-chip { display:flex; align-items:center; gap:6px; padding:5px 12px; border-radius:999px; font-size:12.5px; flex:1; min-width:0; white-space:nowrap; }
            .ap-gamify-chip-xu { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.22); }
            .ap-gamify-chip-xp { background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.22); }
            .ap-gamify-tabs-wrap { padding:14px 22px 6px; }
            .ap-gamify-tabs { display:flex; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:13px; padding:3.5px; gap:4px; }
            .ap-gamify-tab-btn { flex:1; padding:9px 8px; border-radius:10px; font-size:11.5px; font-weight:700; cursor:pointer; border:1px solid transparent; background:transparent; color:#94a3b8; transition:all .2s ease; display:flex; align-items:center; justify-content:center; gap:5px; white-space:nowrap; }
            .ap-gamify-tab-btn.active { border-color:#f59e0b; background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.12)); color:#fcd576; }
            .ap-gamify-tab-pill { font-size:10px; font-weight:800; padding:1px 5px; border-radius:999px; background:rgba(255,255,255,0.06); color:#94a3b8; }
            .ap-gamify-tab-btn.active .ap-gamify-tab-pill { background:rgba(245,158,11,0.3); color:#fff; }
            .ap-gamify-content { padding:16px 22px 22px; }
            .ap-gamify-streak-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; margin-bottom:18px; }
            .ap-gamify-cta { width:100%; padding:14px; border-radius:13px; font-size:14px; font-weight:900; border:none; display:flex; align-items:center; justify-content:center; gap:7px; transition:all .2s ease; cursor:pointer; }
            .ap-vip-pkg-card:hover { transform:translateY(-2px); }
            @media (max-width: 520px) {
              #ap-gamify-modal { padding:8px; }
              .ap-gamify-box { border-radius:18px; max-height:92vh; }
              .ap-gamify-header { padding:12px 14px 10px; }
              .ap-gamify-statusbar { padding:8px 12px; }
              .ap-gamify-chip { padding:5px 8px; font-size:11px; gap:4px; }
              .ap-gamify-tabs-wrap { padding:10px 12px 4px; }
              .ap-gamify-tab-btn { padding:7px 5px; font-size:10.5px; gap:3px; }
              .ap-gamify-content { padding:12px 12px 18px !important; }
              .ap-gamify-streak-grid { grid-template-columns:repeat(4, 1fr) !important; gap:6px !important; margin-bottom:14px !important; }
              .ap-streak-card-day7 { grid-column:span 2 !important; flex-direction:row !important; }
              .ap-mission-card { padding:10px 12px !important; gap:10px !important; }
              .ap-mission-icon-wrap { width:32px !important; height:32px !important; }
            }
          </style>

          <div class="ap-gamify-box">
            <!-- Header -->
            <div class="ap-gamify-header">
              <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                <div class="ap-gamify-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1000" stroke-width="2.3"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                </div>
                <div>
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <h3 style="font-size:17px; font-weight:900; color:#ffffff; margin:0; line-height:1.25;">Điểm Danh & Nhiệm Vụ</h3>
                    <span style="font-size:9.5px; font-weight:800; padding:2px 7px; border-radius:6px; background:rgba(245,158,11,0.2); color:#fcd576; border:1px solid rgba(245,158,11,0.4); text-transform:uppercase; letter-spacing:0.5px;">Super VIP</span>
                  </div>
                  <div style="font-size:12px; color:#cbd5e1; margin-top:3px;">Tích lũy XP thăng hạng & nhận Xu đổi VIP</div>
                </div>
              </div>
              <button onclick="closeGamifyModal()" class="ap-gamify-close">✕</button>
            </div>

            <!-- Balance Bar -->
            <div class="ap-gamify-statusbar">
              <div class="ap-gamify-chip ap-gamify-chip-xu">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fcd576" stroke-width="2.3"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9.5a3 3 0 0 0-6 0c0 3 6 2 6 5a3 3 0 0 1-6 0"/></svg>
                <span style="color:#cbd5e1; font-weight:600;">Ví:</span>
                <span style="font-weight:800; color:#fcd576;">${curXu.toLocaleString()} Xu</span>
              </div>
              <div class="ap-gamify-chip ap-gamify-chip-xp">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.3"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span style="color:#cbd5e1; font-weight:600;">XP:</span>
                <span style="font-weight:800; color:#38bdf8;">${curXP.toLocaleString()} XP</span>
              </div>
            </div>

            <!-- Tabs -->
            <div class="ap-gamify-tabs-wrap">
              <div class="ap-gamify-tabs">
                <button onclick="switchGamifySubTab('streak')" id="gamifyTabStreak" class="ap-gamify-tab-btn ${activeSubTab === 'streak' ? 'active' : ''}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                  <span>Chuỗi</span>
                  <span class="ap-gamify-tab-pill">${streakData.streak}N</span>
                </button>
                <button onclick="switchGamifySubTab('missions')" id="gamifyTabMissions" class="ap-gamify-tab-btn ${activeSubTab === 'missions' ? 'active' : ''}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  <span>Nhiệm Vụ</span>
                  <span class="ap-gamify-tab-pill">${missionsData.filter(m => m.isCompleted).length}/${missionsData.length}</span>
                </button>
                <button onclick="switchGamifySubTab('vip')" id="gamifyTabVip" class="ap-gamify-tab-btn ${activeSubTab === 'vip' ? 'active' : ''}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>Đổi VIP</span>
                  <span class="ap-gamify-tab-pill" style="background:rgba(245,158,11,0.25); color:#fcd576;">HOT</span>
                </button>
              </div>
            </div>

            <!-- Tab: Streak -->
            <div id="gamifyContentStreak" class="ap-gamify-content" style="display:${activeSubTab === 'streak' ? 'block' : 'none'};">
              <div class="ap-gamify-streak-grid">${streakCardsHtml}</div>
              <button onclick="handleModalClaimStreak()" class="ap-gamify-cta" style="background:${streakData.isClaimedToday ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #fcd576 0%, #f59e0b 50%, #d97706 100%)'}; color:${streakData.isClaimedToday ? '#64748b' : '#111827'}; border:${streakData.isClaimedToday ? '1px solid rgba(255,255,255,0.08)' : 'none'}; box-shadow:${streakData.isClaimedToday ? 'none' : '0 8px 24px rgba(245,158,11,0.35)'}; cursor:${streakData.isClaimedToday ? 'not-allowed' : 'pointer'};" ${streakData.isClaimedToday ? 'disabled' : ''}>
                ${streakData.isClaimedToday
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Hôm nay bạn đã điểm danh rồi</span>`
      : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2.3"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg><span>Điểm Danh Ngay (+Xu, +XP)</span>`}
              </button>
            </div>

            <!-- Tab: Missions -->
            <div id="gamifyContentMissions" class="ap-gamify-content" style="display:${activeSubTab === 'missions' ? 'flex' : 'none'}; flex-direction:column; gap:10px;">
              ${missionCardsHtml}
              <div style="margin-top:4px; padding:10px 14px; border-radius:12px; background:linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(99,102,241,0.08) 100%); border:1px dashed rgba(245,158,11,0.35); display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:32px; height:32px; border-radius:8px; background:rgba(245,158,11,0.15); display:flex; align-items:center; justify-content:center; flex-shrink:0;">${chestSvg}</div>
                  <div>
                    <div style="font-size:12px; font-weight:800; color:#fcd576;">Rương Hoàn Hảo Ngày</div>
                    <div style="font-size:10.5px; color:#cbd5e1;">Hoàn thành 5/5 nhiệm vụ ngày để nhận thêm quà!</div>
                  </div>
                </div>
                <div style="font-size:11px; font-weight:800; color:#38bdf8; background:rgba(56,189,248,0.12); padding:3px 8px; border-radius:7px; border:1px solid rgba(56,189,248,0.25); white-space:nowrap;">+50 XP | +15 Xu</div>
              </div>
            </div>

            <!-- Tab: VIP Exchange -->
            <div id="gamifyContentVip" class="ap-gamify-content" style="display:${activeSubTab === 'vip' ? 'flex' : 'none'}; flex-direction:column; gap:14px;">
              <!-- VIP Status -->
              <div style="background:linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(168,85,247,0.08) 100%); border:1px solid rgba(245,158,11,0.3); border-radius:16px; padding:14px 16px; display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg, #fcd576, #f59e0b); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 14px rgba(245,158,11,0.4);">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1000" stroke-width="2.3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <div>
                  <div style="font-size:14px; font-weight:800; color:#ffffff;">Đặc Quyền Thành Viên VIP</div>
                  <div style="font-size:12px; color:#cbd5e1; margin-top:2px;">${vipStatusHtml}</div>
                </div>
              </div>
              <!-- 4 VIP Package Cards (2x2 grid) -->
              <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
                <!-- 1 Day -->
                <div class="ap-vip-pkg-card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(56,189,248,0.3); border-radius:16px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; transition:all .2s ease;">
                  <div style="position:absolute; top:8px; right:8px; font-size:9.5px; font-weight:800; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; padding:2px 6px; border-radius:6px; text-transform:uppercase;">Trải Nghiệm</div>
                  <div>
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid rgba(56,189,248,0.25);">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    </div>
                    <div style="font-size:15px; font-weight:900; color:#ffffff;">VIP 1 Ngày</div>
                    <div style="font-size:11.5px; color:#94a3b8; margin:3px 0 10px; line-height:1.4;">Không quảng cáo 24h & mở khóa Full HD 1080p.</div>
                  </div>
                  ${vipBtn(1, 100, 'Gói VIP 1 Ngày', 'linear-gradient(135deg, #38bdf8, #0284c7)', '0 4px 14px rgba(56,189,248,0.35)')}
                </div>
                <!-- 3 Days -->
                <div class="ap-vip-pkg-card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(168,85,247,0.35); border-radius:16px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; transition:all .2s ease;">
                  <div style="position:absolute; top:8px; right:8px; font-size:9.5px; font-weight:800; background:rgba(168,85,247,0.18); border:1px solid rgba(168,85,247,0.35); color:#c084fc; padding:2px 6px; border-radius:6px; text-transform:uppercase;">-50 Xu</div>
                  <div>
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(168,85,247,0.12); display:flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid rgba(168,85,247,0.3);">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </div>
                    <div style="font-size:15px; font-weight:900; color:#ffffff;">VIP 3 Ngày</div>
                    <div style="font-size:11.5px; color:#94a3b8; margin:3px 0 10px; line-height:1.4;">Cuối tuần cày phim trọn vẹn, máy chủ Fast CDN.</div>
                  </div>
                  ${vipBtn(3, 250, 'Gói VIP 3 Ngày', 'linear-gradient(135deg, #a855f7, #7e22ce)', '0 4px 14px rgba(168,85,247,0.35)')}
                </div>
                <!-- 7 Days -->
                <div class="ap-vip-pkg-card" style="background:rgba(255,255,255,0.03); border:1.5px solid rgba(245,158,11,0.45); border-radius:16px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; transition:all .2s ease; box-shadow:0 0 16px rgba(245,158,11,0.12);">
                  <div style="position:absolute; top:8px; right:8px; font-size:9.5px; font-weight:800; background:rgba(245,158,11,0.22); border:1px solid rgba(245,158,11,0.45); color:#fcd576; padding:2px 6px; border-radius:6px; text-transform:uppercase;">🔥 Bán Chạy</div>
                  <div>
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(245,158,11,0.15); display:flex; align-items:center; justify-content:center; margin-bottom:10px; border:1px solid rgba(245,158,11,0.35);">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fcd576" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div style="font-size:15px; font-weight:900; color:#fcd576;">VIP 7 Ngày</div>
                    <div style="font-size:11.5px; color:#cbd5e1; margin:3px 0 10px; line-height:1.4;">Trọn tuần giải trí cao cấp, xem trước phim mới.</div>
                  </div>
                  ${vipBtn(7, 500, 'Gói VIP 7 Ngày', 'linear-gradient(135deg, #fcd576, #f59e0b)', '0 4px 14px rgba(245,158,11,0.4)')}
                </div>
                <!-- 30 Days -->
                <div class="ap-vip-pkg-card" style="background:linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(245,158,11,0.08) 100%); border:1.5px solid rgba(236,72,153,0.5); border-radius:16px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden; transition:all .2s ease; box-shadow:0 0 20px rgba(236,72,153,0.18);">
                  <div style="position:absolute; top:8px; right:8px; font-size:9.5px; font-weight:800; background:linear-gradient(135deg, rgba(236,72,153,0.3), rgba(245,158,11,0.3)); border:1px solid rgba(236,72,153,0.5); color:#f472b6; padding:2px 6px; border-radius:6px; text-transform:uppercase;">👑 Hoàng Gia</div>
                  <div>
                    <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, #ec4899, #f59e0b); display:flex; align-items:center; justify-content:center; margin-bottom:10px; box-shadow:0 4px 12px rgba(236,72,153,0.4);">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3"><path d="M6 9v3a6 6 0 0012 0V9M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2m12 6h2a2 2 0 002-2V5a2 2 0 00-2-2h-2M12 18v3m-4 0h8"/></svg>
                    </div>
                    <div style="font-size:15px; font-weight:900; color:#ffffff;">VIP 30 Ngày</div>
                    <div style="font-size:11.5px; color:#cbd5e1; margin:3px 0 10px; line-height:1.4;">Trọn tháng thả ga + Tặng Huy hiệu VIP Vàng.</div>
                  </div>
                  ${vipBtn(30, 1800, 'Gói VIP 30 Ngày', 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)', '0 4px 16px rgba(236,72,153,0.45)')}
                </div>
              </div>
            </div>
          </div>
        `;

  document.body.appendChild(modal);
  // Close when clicking the dark backdrop (not the box itself)
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeGamifyModal();
  });
  // Close on Escape key
  modal._escHandler = function (e) { if (e.key === 'Escape') closeGamifyModal(); };
  document.addEventListener('keydown', modal._escHandler);
  modal.addEventListener('remove', function () {
    document.removeEventListener('keydown', modal._escHandler);
  });

  // ─── TAB SWITCHER ───
  window.switchGamifySubTab = function (tab) {
    ['Streak', 'Missions', 'Vip'].forEach(t => {
      const btn = document.getElementById('gamifyTab' + t);
      const cont = document.getElementById('gamifyContent' + t);
      if (btn) btn.classList.remove('active');
      if (cont) cont.style.display = 'none';
    });
    const activeBtn = document.getElementById('gamifyTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    const activeCont = document.getElementById('gamifyContent' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
    if (activeCont) activeCont.style.display = tab === 'streak' ? 'block' : 'flex';
  };

  // ─── STREAK CLAIM ───
  window.handleModalClaimStreak = function () {
    if (window.GamificationCore && typeof window.GamificationCore.claimDailyCheckin === 'function') {
      const ok = window.GamificationCore.claimDailyCheckin();
      if (ok) {
        openGamificationModal('streak');
        if (typeof renderTab === 'function' && typeof currentTab !== 'undefined') renderTab(currentTab);
        if (typeof initSidebar === 'function') initSidebar();
      }
    }
  };

  // ─── MISSION CLAIM ───
  window.handleClaimMission = function (mId) {
    if (window.GamificationCore && typeof window.GamificationCore.claimDailyMission === 'function') {
      const ok = window.GamificationCore.claimDailyMission(mId);
      if (ok) {
        openGamificationModal('missions');
        if (typeof renderTab === 'function' && typeof currentTab !== 'undefined') renderTab(currentTab);
        if (typeof initSidebar === 'function') initSidebar();
      }
    }
  };

  // ─── VIP REDEEM ───
  window.handleModalRedeemVip = function (days, cost, title) {
    const xu = (window.GamificationCore ? window.GamificationCore.getXu() : Number(localStorage.getItem('cinestream_xu') || 0));
    if (xu < cost) {
      showCustomAlert(`Không đủ Xu! Cần <b>${cost.toLocaleString()} Xu</b> nhưng hiện chỉ có <b>${xu.toLocaleString()} Xu</b>.<br><span style="color:#94a3b8;font-size:12px;">Hãy điểm danh & hoàn thành nhiệm vụ để kiếm Xu!</span>`, 'error');
      return;
    }
    showCustomConfirm({
      icon: '💸',
      title: 'Xác nhận đổi VIP',
      message: `Bạn sắp đổi <span style="color:#fcd576;font-weight:800;">${cost.toLocaleString()} Xu</span> để kích hoạt <span style="color:#a78bfa;font-weight:800;">${title}</span>.<br><span style="color:#94a3b8;font-size:12px;">Xu sẽ bị trừ ngay lập tức và không hoàn lại.</span>`,
      confirmText: `💸 Đổi ${cost.toLocaleString()} Xu`,
      cancelText: 'Hủy',
      onConfirm: function () {
        if (window.GamificationCore && typeof window.GamificationCore.redeemVipDays === 'function') {
          const ok = window.GamificationCore.redeemVipDays(days, cost);
          if (ok) {
            openGamificationModal('vip');
            if (typeof renderTab === 'function' && typeof currentTab !== 'undefined') renderTab(currentTab);
            if (typeof initSidebar === 'function') initSidebar();
          }
        } else {
          let curXuLocal = Number(localStorage.getItem('cinestream_xu') || 0);
          if (curXuLocal < cost) { showCustomAlert('Không đủ Xu!', 'error'); return; }
          curXuLocal -= cost;
          localStorage.setItem('cinestream_xu', curXuLocal);
          const now = new Date();
          const exp = localStorage.getItem('ap_vip_expires');
          const base = (exp && new Date(exp) > now) ? new Date(exp) : now;
          base.setDate(base.getDate() + days);
          localStorage.setItem('ap_vip_expires', base.toISOString());
          openGamificationModal('vip');
          if (typeof initSidebar === 'function') initSidebar();
        }
      }
    });
  };
}

// ════════════════════════════════════════════════════════════
// CUSTOM CONFIRM / ALERT — thay thế browser confirm() & alert()
// ════════════════════════════════════════════════════════════
window.showCustomConfirm = function (opts) {
  var ex = document.getElementById('ap-custom-confirm');
  if (ex) ex.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ap-custom-confirm';
  overlay.setAttribute('style',
    'position:fixed;inset:0;z-index:9999999;display:flex;align-items:center;justify-content:center;' +
    'padding:16px;background:rgba(4,7,15,0.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
    'animation:apCfIn .18s ease-out;box-sizing:border-box;'
  );

  overlay.innerHTML = [
    '<style>',
    '@keyframes apCfIn{from{opacity:0;transform:scale(.93) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}',
    '@keyframes apCfOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.93) translateY(8px)}}',
    '#ap-custom-confirm *{box-sizing:border-box}',
    '#ap-cf-box{',
    '  background:#0d111d;',
    '  background-image:radial-gradient(circle at 50% 0%,rgba(245,158,11,.18) 0%,transparent 55%),radial-gradient(circle at 100% 100%,rgba(99,102,241,.07) 0%,transparent 50%);',
    '  border:1px solid rgba(245,158,11,.32);border-radius:20px;padding:28px 28px 24px;',
    '  width:100%;max-width:400px;',
    '  box-shadow:0 24px 60px rgba(0,0,0,.9),0 0 32px rgba(245,158,11,.12),inset 0 1px 0 rgba(255,255,255,.08);',
    '  display:flex;flex-direction:column;align-items:center;',
    '}',
    '#ap-cf-icon{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(245,158,11,.25),rgba(217,119,6,.12));',
    '  border:1px solid rgba(245,158,11,.35);display:flex;align-items:center;justify-content:center;',
    '  font-size:26px;margin-bottom:16px;box-shadow:0 6px 20px rgba(245,158,11,.25);}',
    '#ap-cf-title{font-size:17px;font-weight:900;color:#fff;margin:0 0 10px;text-align:center;line-height:1.3;}',
    '#ap-cf-msg{font-size:13.5px;color:#cbd5e1;text-align:center;line-height:1.65;margin-bottom:24px;}',
    '#ap-cf-btns{display:flex;gap:10px;width:100%;}',
    '.ap-cf-btn{flex:1;padding:12px 14px;border-radius:12px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .18s ease;display:flex;align-items:center;justify-content:center;gap:6px;}',
    '#ap-cf-cancel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)!important;color:#94a3b8;}',
    '#ap-cf-cancel:hover{background:rgba(239,68,68,.12);color:#f87171;border-color:rgba(239,68,68,.3)!important;}',
    '#ap-cf-ok{background:linear-gradient(135deg,#fcd576 0%,#f59e0b 55%,#d97706 100%);color:#111827;box-shadow:0 6px 20px rgba(245,158,11,.4);}',
    '#ap-cf-ok:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(245,158,11,.55);}',
    '#ap-cf-ok:active{transform:translateY(0);}',
    '</style>',
    '<div id="ap-cf-box" onclick="event.stopPropagation()">',
    '  <div id="ap-cf-icon">' + (opts.icon || '❓') + '</div>',
    '  <div id="ap-cf-title">' + (opts.title || 'Xác nhận') + '</div>',
    '  <div id="ap-cf-msg">' + (opts.message || '') + '</div>',
    '  <div id="ap-cf-btns">',
    opts.cancelText !== null
      ? '    <button class="ap-cf-btn" id="ap-cf-cancel">' + (opts.cancelText || 'Hủy') + '</button>'
      : '',
    '    <button class="ap-cf-btn" id="ap-cf-ok">' + (opts.confirmText || 'Xác nhận') + '</button>',
    '  </div>',
    '</div>'
  ].join('');

  var close = function (confirmed) {
    overlay.style.animation = 'apCfOut .14s ease-in forwards';
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 140);
    if (confirmed && typeof opts.onConfirm === 'function') opts.onConfirm();
    else if (!confirmed && typeof opts.onCancel === 'function') opts.onCancel();
  };

  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
  document.body.appendChild(overlay);

  var okBtn = document.getElementById('ap-cf-ok');
  var cancelBtn = document.getElementById('ap-cf-cancel');
  if (okBtn) okBtn.addEventListener('click', function () { close(true); });
  if (cancelBtn) cancelBtn.addEventListener('click', function () { close(false); });

  var escFn = function (e) { if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', escFn); } };
  document.addEventListener('keydown', escFn);
};

window.showCustomAlert = function (message, type) {
  var colorMap = {
    error: { btn: 'linear-gradient(135deg,#ef4444,#b91c1c)', shadow: 'rgba(239,68,68,.45)', icon: '❌', title: 'Lỗi' },
    success: { btn: 'linear-gradient(135deg,#22c55e,#16a34a)', shadow: 'rgba(34,197,94,.4)', icon: '✅', title: 'Thành công!' },
    warning: { btn: 'linear-gradient(135deg,#fcd576,#f59e0b)', shadow: 'rgba(245,158,11,.4)', icon: '⚠️', title: 'Cảnh báo' },
    info: { btn: 'linear-gradient(135deg,#38bdf8,#0284c7)', shadow: 'rgba(56,189,248,.4)', icon: 'ℹ️', title: 'Thông báo' }
  };
  var c = colorMap[type] || colorMap.info;
  showCustomConfirm({
    icon: c.icon,
    title: c.title,
    message: message,
    confirmText: 'Đã hiểu',
    cancelText: null,
    onConfirm: function () { }
  });
  // Override OK style
  setTimeout(function () {
    var okBtn = document.getElementById('ap-cf-ok');
    if (okBtn) {
      okBtn.style.background = c.btn;
      okBtn.style.boxShadow = '0 6px 20px ' + c.shadow;
      okBtn.style.color = type === 'warning' ? '#111827' : '#fff';
    }
  }, 10);
};

function logoutOtherDevices() {
  if (typeof showCustomAlert === 'function') {
    showCustomAlert('🔒 Tài khoản của bạn hiện chỉ có 1 phiên đăng nhập duy nhất trên thiết bị này!', 'info');
  } else if (window.GamificationCore && typeof window.GamificationCore.showGamificationToast === 'function') {
    window.GamificationCore.showGamificationToast('🔒 Tài khoản hiện chỉ đang đăng nhập trên thiết bị này!', 'info');
  }
}

// ─── PLAYLISTS TAB RENDERER (EXACT MATCH TO USER SCREENSHOT 1) ───
function renderPlaylistsTab(u) {
  let playlists = [];
  try {
    if (typeof playlistService !== 'undefined') playlists = playlistService.getAll();
    else playlists = JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
  } catch (e) { }

  // Check if we are viewing a specific playlist detail
  if (window._activePlaylistId) {
    const pl = playlists.find(p => p.id === window._activePlaylistId);
    if (pl) {
      const count = pl.movies ? pl.movies.length : 0;
      return `
                <div style="display:flex; flex-direction:column; gap:20px; width:100%;">
                    <!-- Back Button -->
                    <div style="display:flex; align-items:center;">
                        <button class="playlist-back-btn" onclick="window.closePlaylistDetail()" style="background:none; border:none; color:#94a3b8; font-size:13.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; padding:0; transition:color 0.2s;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            Quay lại tất cả playlist
                        </button>
                    </div>
                    
                    <!-- Playlist Info Card -->
                    <div class="playlist-info-card" style="background:#191c28; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                                <span class="playlist-tag-badge" style="background:rgba(252,213,118,0.15); border:1px solid rgba(252,213,118,0.3); color:#fcd576; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px;">Playlist cá nhân</span>
                                <span class="playlist-count-text" style="color:#94a3b8; font-size:13px; font-weight:600;">${count} phim</span>
                            </div>
                            <h2 class="playlist-detail-title" style="font-size:24px; font-weight:800; color:#fff; margin:0 0 6px 0;">${pl.name}</h2>
                            <div class="playlist-detail-desc" style="font-size:13px; color:#64748b;">${pl.desc || pl.description || 'Danh sách phát cá nhân'}</div>
                        </div>
                        <div style="display:flex; gap:12px;">
                            <button class="playlist-edit-btn" onclick="window.editPlaylist('${pl.id}')" style="display:flex; align-items:center; gap:8px; padding:10px 18px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                Chỉnh sửa
                            </button>
                            <button class="playlist-delete-btn" onclick="deletePlaylist('${pl.id}')" style="display:flex; align-items:center; gap:8px; padding:10px 18px; border-radius:12px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#f87171; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Xóa playlist
                            </button>
                        </div>
                    </div>
                    
                    <!-- Movies List Area -->
                    <div class="playlist-movies-area" style="background:#191c28; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:32px; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; min-height:300px;">
                        ${count === 0 ? `
                            <div style="width:54px; height:54px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; color:#64748b; margin-bottom:16px;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                            </div>
                            <div class="playlist-empty-text" style="font-size:14px; color:#94a3b8; font-weight:500; margin-bottom:20px;">Danh sách phát này chưa có phim nào.</div>
                            <a href="/" style="padding:10px 24px; background:linear-gradient(135deg,#fcd576,#f59e0b); border-radius:12px; color:#1a1000; font-size:13px; font-weight:800; text-decoration:none; box-shadow:0 6px 20px rgba(252,213,118,0.35); transition:all 0.2s ease;">
                                Khám phá phim ngay
                            </a>
                        ` : `
                            <div style="width:100%; display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 145px)); gap:18px; align-items:start; justify-content:start;">
                                ${pl.movies.map(m => `
                                    <a href="/xem-phim/${m.slug}" class="playlist-movie-item" style="display:block; text-decoration:none; position:relative; transition:all 0.2s;" title="${m.name}">
                                        <div class="playlist-movie-poster-wrap" style="aspect-ratio:2/3; background:#12141d; width:100%; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.08);">
                                            <img src="${(m.thumb_url || '').startsWith('http') ? m.thumb_url : 'https://phimimg.com/' + (m.thumb_url || '').replace(/^\/+/, '')}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s ease;" onerror="this.src='/images/placeholder.jpg'" />
                                        </div>
                                        <div style="padding:8px 2px 0 2px;">
                                            <div class="playlist-movie-name" style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">${m.name}</div>
                                            <div class="playlist-movie-year" style="font-size:11px; color:#64748b; font-weight:500;">${m.year || '2026'}</div>
                                        </div>
                                    </a>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
    } else {
      window._activePlaylistId = null; // invalid ID, reset
    }
  }

  const headerHtml = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:22px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.06);flex-wrap:wrap;gap:12px;flex-shrink:0;">
            <div>
                <h2 style="font-size:22px;font-weight:800;color:#ffffff;margin:0 0 4px 0;letter-spacing:-0.02em;">Danh sách phát</h2>
                <div style="font-size:13px;color:#94a3b8;font-weight:500;">Tạo và quản lý các danh sách phim yêu thích theo chủ đề của riêng bạn</div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;">
                <button onclick="seedDemoData(true)" style="
                    display:inline-flex;align-items:center;gap:6px;padding:10px 16px;
                    background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:14px;
                    color:#fcd576;font-size:13px;font-weight:700;
                    cursor:pointer;transition:all 0.2s ease;
                ">
                    ⚡ NẠP DEMO PLAYLIST
                </button>
                <button onclick="window.openCreatePlaylistModalStandalone()" style="
                    display:inline-flex;align-items:center;gap:6px;padding:10px 20px;
                    background:linear-gradient(135deg,#fcd576,#f59e0b);border:none;border-radius:14px;
                    color:#1a1000;font-size:13px;font-weight:800;letter-spacing:0.04em;
                    cursor:pointer;box-shadow:0 6px 18px rgba(252,213,118,0.35);transition:all 0.2s ease;
                ">
                    <span style="font-size:16px;line-height:1;">+</span> TẠO PLAYLIST MỚI
                </button>
            </div>
        </div>
    `;

  if (!playlists.length) {
    return `
            <div class="panel-card" style="min-height: 520px; display: flex; flex-direction: column;">
                ${headerHtml}
                <div class="profile-empty-card" style="flex:1; border:none; background:transparent; box-shadow:none; padding:40px 16px;">
                    <div class="profile-empty-glow cyan"></div>
                    <div class="profile-empty-content">
                        <div class="profile-empty-icon-wrap cyan">
                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                            </svg>
                        </div>
                        <div class="profile-empty-pill cyan">Danh sách phát</div>
                        <h3 class="profile-empty-title">Bạn chưa tạo danh sách phát nào</h3>
                        <p class="profile-empty-sub">Tạo các danh sách phát riêng để lưu trữ và quản lý những bộ phim yêu thích theo phong cách của bạn.</p>
                        <div class="profile-empty-actions">
                            <button onclick="window.openCreatePlaylistModalStandalone()" class="profile-empty-btn-primary" style="background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);color:#fff!important;box-shadow:0 4px 16px rgba(6,182,212,0.35);">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Tạo playlist đầu tiên
                            </button>
                            <a href="/" class="profile-empty-btn-secondary">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              Khám phá phim
                            </a>
                        </div>
                    </div>
                </div>
            </div>
          `;
  }

  return `
        <div class="panel-card" style="min-height: 520px; display: flex; flex-direction: column;">
            ${headerHtml}
            <div class="playlists-grid" style="padding: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 260px)); gap: 20px; align-items: start; align-content: start; justify-content: start; width: 100%;">
                ${playlists.map(pl => {
    const count = pl.movies ? pl.movies.length : 0;
    const firstMovie = (pl.movies && pl.movies.length > 0) ? pl.movies[0] : null;
    let poster = firstMovie ? (firstMovie.poster || firstMovie.thumb_url || firstMovie.poster_url || '') : '';
    if (poster && !poster.startsWith('http')) poster = 'https://phimimg.com/' + poster.replace(/^\/+/, '');

    return `
                        <div class="playlist-grid-card group" style="background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 12px; display: flex; flex-direction: column; gap: 10px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); width: 100%; max-width: 260px; height: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" onclick="window.openPlaylistDetail('${pl.id}')">
                            <!-- Thumbnail Area -->
                            <div class="playlist-card-thumb-area" style="aspect-ratio: 16/9; width: 100%; border-radius: 12px; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.06);">
                                ${poster ? `
                                    <img src="${poster}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" class="group-hover:scale-105" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; flex-direction:column; gap:6px;">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                    </div>
                                    <div style="position:absolute; inset:0; background:linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%); pointer-events:none;"></div>
                                ` : `
                                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:#94a3b8;">
                                        <div style="width:36px; height:36px; border-radius:10px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); display:flex; align-items:center; justify-content:center; color:#818cf8;">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                        </div>
                                        <span style="font-size:10px; font-weight:800; letter-spacing:0.05em; color:#94a3b8; text-transform:uppercase;">Chưa có phim</span>
                                    </div>
                                `}
                                <!-- Count badge -->
                                <div style="position:absolute; top:8px; right:8px; background:rgba(15,23,42,0.75); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:2px 8px; font-size:11px; font-weight:700; color:#e2e8f0; display:flex; align-items:center; gap:4px;">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                    ${count}
                                </div>
                            </div>
                            
                            <!-- Info Area -->
                            <div style="display:flex; flex-direction:column; gap:2px; padding:2px 4px 0;">
                                <h4 style="font-size:14px; font-weight:800; color:#ffffff; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${pl.name}">${pl.name}</h4>
                                <p style="font-size:11.5px; color:#94a3b8; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pl.desc || pl.description || 'Danh sách phát cá nhân'}</p>
                            </div>
                            
                            <!-- Footer Area -->
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 4px 2px; border-top:1px solid rgba(255,255,255,0.06); margin-top:2px;">
                                <span style="font-size:11px; font-weight:600; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:6px;">${count} phim</span>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <button onclick="event.stopPropagation(); window.editPlaylist('${pl.id}')" style="width:28px; height:28px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center; color:#94a3b8; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(99,102,241,0.2)'; this.style.color='#818cf8';" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.color='#94a3b8';" title="Đổi tên">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    </button>
                                    <button onclick="event.stopPropagation(); deletePlaylist('${pl.id}')" style="width:28px; height:28px; border-radius:8px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); display:flex; align-items:center; justify-content:center; color:#ef4444; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.25)';" onmouseout="this.style.background='rgba(239,68,68,0.1)';" title="Xóa playlist">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
  }).join('')}
            </div>
        </div>
    `;
}

function deletePlaylist(id) {
  if (typeof window.openDeletePlaylistModal === 'function') {
    window.openDeletePlaylistModal(id);
    return;
  }
  try {
    if (typeof playlistService !== 'undefined') {
      playlistService.delete(id);
    } else {
      let playlists = JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
      playlists = playlists.filter(p => p.id !== id);
      localStorage.setItem('cinestream_playlists', JSON.stringify(playlists));
    }
    if (typeof showToast === 'function') showToast('Đã xóa danh sách phát', 'info');
    if (window._activePlaylistId === id) window._activePlaylistId = null;
    renderTab(currentTab || 'playlists');
  } catch (e) { }
}

window.deletePlaylist = deletePlaylist;

window.editPlaylist = function (id) {
  if (typeof window.openEditPlaylistModal === 'function') {
    window.openEditPlaylistModal(id);
    return;
  }
  const pl = typeof playlistService !== 'undefined' ? playlistService.getById(id) : null;
  if (!pl) return;
  const newName = prompt('Nhập tên mới cho danh sách phát:', pl.name);
  if (newName && newName.trim()) {
    const newDesc = prompt('Nhập mô tả mới (không bắt buộc):', pl.description || pl.desc || '');
    if (typeof playlistService !== 'undefined') {
      playlistService.update(id, newName.trim(), newDesc !== null ? newDesc.trim() : '');
    }
    if (typeof showToast === 'function') showToast('Đã cập nhật danh sách phát', 'success');
    renderTab(currentTab || 'playlists');
  }
};

window.openPlaylistDetail = function (id) {
  window._activePlaylistId = id;
  renderTab('watchlist');
};
window.closePlaylistDetail = function () {
  window._activePlaylistId = null;
  renderTab('watchlist');
};
function renderAchievements(u) {
  const subView = window._achieveSubView || 'badges';
  const lbTf = window._leaderboardTf || 'weekly';

  window.setAchieveSubView = function (view) {
    window._achieveSubView = view;
    const panel = document.getElementById('tabPanel');
    if (panel) panel.innerHTML = renderAchievements(currentUser);
    if (view === 'leaderboard' && window.GamificationCore && typeof window.GamificationCore.fetchLeaderboard === 'function') {
      window.GamificationCore.fetchLeaderboard(window._leaderboardTf || 'weekly').then(() => {
        if (window._achieveSubView === 'leaderboard') {
          const p = document.getElementById('tabPanel');
          if (p) p.innerHTML = renderAchievements(currentUser);
        }
      });
    }
  };

  window.setLeaderboardTf = function (tf) {
    window._leaderboardTf = tf;
    const panel = document.getElementById('tabPanel');
    if (panel) panel.innerHTML = renderAchievements(currentUser);
    if (window.GamificationCore && typeof window.GamificationCore.fetchLeaderboard === 'function') {
      window.GamificationCore.fetchLeaderboard(tf).then(() => {
        if (window._achieveSubView === 'leaderboard') {
          const p = document.getElementById('tabPanel');
          if (p) p.innerHTML = renderAchievements(currentUser);
        }
      });
    }
  };

  let badges = [];
  if (window.GamificationCore && typeof window.GamificationCore.getAchievementsList === 'function') {
    badges = window.GamificationCore.getAchievementsList();
  } else {
    let histCount = 0, favCount = 0;
    try {
      histCount = JSON.parse(localStorage.getItem('cinestream_watch_history') || '[]').length;
      favCount = JSON.parse(localStorage.getItem('cinestream_favorites') || '[]').length;
    } catch (e) { }
    badges = [
      { id: 'ach_profile', code: 'ACH-01', title: 'Tân Thủ Nhập Môn', desc: 'Đã hoàn tất thông tin cá nhân', xp: 30, xu: 5, unlocked: true, icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a5 5 0 0 1 10 0v2"/></svg>` },
      { id: 'ach_watch_5', code: 'ACH-02', title: 'Người Xem Phim', desc: `Đã xem ${Math.min(histCount, 5)}/5 phim`, xp: 50, xu: 10, unlocked: histCount >= 5, progress: { current: Math.min(histCount, 5), max: 5 }, icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/></svg>` }
    ];
  }

  const unlockedBadges = badges.filter(b => b.unlocked);
  const unlockedCount = unlockedBadges.length;
  const totalCount = badges.length;

  let totalXP = (window.GamificationCore && typeof window.GamificationCore.getXP === 'function')
    ? window.GamificationCore.getXP()
    : unlockedBadges.reduce((sum, b) => sum + (b.xp || 0), 0);

  let lvlInfo = { level: 1, currentLvlXP: totalXP, nextLvlXP: 150, progressPct: 0, rankTitle: 'Tân Thủ APhim' };
  if (window.GamificationCore && typeof window.GamificationCore.calculateLevel === 'function') {
    lvlInfo = window.GamificationCore.calculateLevel(totalXP);
  } else {
    const level = Math.floor(totalXP / 150) + 1;
    const currentLevelXP = totalXP % 150;
    lvlInfo = {
      level: level,
      currentLvlXP: currentLevelXP,
      nextLvlXP: 150,
      progressPct: Math.min(100, Math.round((currentLevelXP / 150) * 100)),
      rankTitle: level <= 5 ? 'Tân Thủ APhim' : (level <= 15 ? 'Người Khám Phá' : (level <= 30 ? 'Tín Đồ Điện Ảnh' : 'Bậc Thầy Phim Ảnh'))
    };
  }

  // ─── NAV SWITCHER (BADGES vs LEADERBOARD) ───
  const navSwitchHtml = `
          <div class="lb-nav-switcher">
            <button onclick="setAchieveSubView('badges')" class="lb-switch-btn ${subView === 'badges' ? 'active-badges' : 'inactive'}">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8.5" r="5.5"/>
                <path d="M12 5.8l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.8-1.6.8.3-1.8-1.3-1.3 1.8-.3.8-1.6z" fill="currentColor"/>
                <path d="M8.2 13.8L7 21.5l5-2.5 5 2.5-1.2-7.7"/>
              </svg>
              <span style="white-space:nowrap;">12 Danh Hiệu Thành Tựu</span>
            </button>
            <button onclick="setAchieveSubView('leaderboard')" class="lb-switch-btn ${subView === 'leaderboard' ? 'active-lb' : 'inactive'}">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 20h20M5 20v-7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7M10 20V8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12M15 20v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5"/>
                <polygon points="12 2 13.5 5 17 5.5 14.5 8 15 11.5 12 10 9 11.5 9.5 8 7 5.5 10.5 5 12 2" fill="currentColor"/>
              </svg>
              <span style="white-space:nowrap;">Bảng Xếp Hạng Cao Thủ</span>
            </button>
          </div>
        `;

  // ════════════════════════════════════════════════════════════
  // VIEW 1: BẢNG XẾP HẠNG (LEADERBOARD)
  // ════════════════════════════════════════════════════════════
  if (subView === 'leaderboard') {
    let lbData = { top3: [], rest: [], myRank: 1, myEntry: {} };
    if (window.GamificationCore && typeof window.GamificationCore.getLeaderboardData === 'function') {
      lbData = window.GamificationCore.getLeaderboardData(lbTf);
    }

    const top1 = lbData.top3[0] || {};
    const top2 = lbData.top3[1] || {};
    const top3 = lbData.top3[2] || {};

    return `
          <div class="panel-card achievements-panel-card" style="min-height: 520px; display: flex; flex-direction: column;">
            <div class="achievements-container lb-wrapper">
              
              <!-- Header Sub-Header -->
              <div class="lb-sub-header">
                <div class="achievements-sub-header-left" style="display:flex; align-items:center; gap:8px;">
                  <h3 class="lb-sub-title" style="margin:0; font-size:16px; font-weight:900; letter-spacing:-0.3px; display:flex; align-items:center; gap:6px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="lbTrophyIconGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#fff176"/>
                          <stop offset="50%" stop-color="#f59e0b"/>
                          <stop offset="100%" stop-color="#d97706"/>
                        </linearGradient>
                      </defs>
                      <path d="M6 9V4h12v5c0 3.3-2.7 6-6 6s-6-2.7-6-6z" fill="url(#lbTrophyIconGrad3)"/>
                      <path d="M6 5H3.5C2.7 5 2 5.7 2 6.5V7c0 2.2 1.8 4 4 4h.5M18 5h2.5c.8 0 1.5.7 1.5 1.5V7c0 2.2-1.8 4-4 4h-.5" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M12 15v4m-4 3h8" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                    <span>Bảng Vinh Danh APhim</span>
                  </h3>
                  <div style="display:inline-flex; align-items:center; gap:5px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); padding:2px 8px; border-radius:8px;">
                    <span class="lb-live-dot"></span>
                    <span style="font-size:10.5px; font-weight:800; color:#10b981;">Thời gian thực</span>
                  </div>
                </div>
                <button onclick="openGamificationModal()" class="achieve-bonus-btn" style="padding:6px 12px; border-radius:10px; font-size:12px; font-weight:800; display:inline-flex; align-items:center; gap:6px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.35); color:#818cf8; cursor:pointer; transition:all 0.2s;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                  <span>Điểm Danh & Nhiệm Vụ</span>
                </button>
              </div>

              ${navSwitchHtml}

              <!-- Timeframe Filters & Top 1 Reward -->
              <div class="lb-filter-bar">
                <div class="lb-tf-group">
                  <button onclick="setLeaderboardTf('weekly')" class="lb-tf-btn ${lbTf === 'weekly' ? 'active' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="lbTfFireGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stop-color="#ef4444"/>
                          <stop offset="55%" stop-color="#f97316"/>
                          <stop offset="100%" stop-color="#fde047"/>
                        </linearGradient>
                      </defs>
                      <path d="M12 2c-.5 2.5-2.5 4.5-4 6-2 2-3 4.5-3 7.5a7 7 0 0014 0c0-3-1-5.5-3-7.5-1.5-1.5-3.5-3.5-4-6z" fill="url(#lbTfFireGrad3)"/>
                      <path d="M12 11c-.5 1-1.5 2-2 3-.5 1-.5 2 0 3a2.5 2.5 0 004 0c.5-1 .5-2 0-3-.5-1-1.5-2-2-3z" fill="#ffffff" opacity="0.9"/>
                    </svg>
                    <span>Tuần Này</span>
                  </button>
                  <button onclick="setLeaderboardTf('monthly')" class="lb-tf-btn ${lbTf === 'monthly' ? 'active' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="lbTfCalGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#38bdf8"/>
                          <stop offset="100%" stop-color="#818cf8"/>
                        </linearGradient>
                      </defs>
                      <rect x="3" y="4" width="18" height="17" rx="3.5" stroke="url(#lbTfCalGrad3)" stroke-width="2" fill="rgba(56,189,248,0.15)"/>
                      <path d="M3 9.5h18" stroke="url(#lbTfCalGrad3)" stroke-width="1.8"/>
                      <path d="M8 2.2v3.6M16 2.2v3.6" stroke="url(#lbTfCalGrad3)" stroke-width="2" stroke-linecap="round"/>
                      <circle cx="8" cy="13.5" r="1.3" fill="#38bdf8"/>
                      <circle cx="12" cy="13.5" r="1.3" fill="#38bdf8"/>
                      <circle cx="16" cy="13.5" r="1.3" fill="#38bdf8"/>
                      <circle cx="8" cy="17" r="1.3" fill="#818cf8"/>
                      <circle cx="12" cy="17" r="1.3" fill="#818cf8"/>
                    </svg>
                    <span>Tháng Này</span>
                  </button>
                  <button onclick="setLeaderboardTf('all')" class="lb-tf-btn ${lbTf === 'all' ? 'active' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="lbTfStarGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#fffbeb"/>
                          <stop offset="40%" stop-color="#facc15"/>
                          <stop offset="100%" stop-color="#d97706"/>
                        </linearGradient>
                      </defs>
                      <path d="M12 2l2.6 6.8 6.9 1.5-5.2 4.6 1.6 7-5.9-3.5-5.9 3.5 1.6-7-5.2-4.6 6.9-1.5L12 2z" fill="url(#lbTfStarGrad3)" stroke="#b45309" stroke-width="0.8"/>
                      <circle cx="12" cy="12" r="2.2" fill="#ffffff" opacity="0.9"/>
                    </svg>
                    <span>Mọi Thời Đại</span>
                  </button>
                </div>
                <div class="lb-reward-tag">
                  <span style="font-weight:800; font-size:11.5px; color:#fcd576; display:flex; align-items:center; gap:4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9V4h12v5c0 3.3-2.7 6-6 6s-6-2.7-6-6z" fill="#f59e0b"/>
                      <path d="M6 5H3.5C2.7 5 2 5.7 2 6.5V7c0 2.2 1.8 4 4 4h.5M18 5h2.5c.8 0 1.5.7 1.5 1.5V7c0 2.2-1.8 4-4 4h-.5" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M12 15v4m-4 3h8" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                    Thưởng Quán Quân:
                  </span>
                  <span class="lb-reward-chip">
                    ${lbTf === 'weekly' ? `
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                        <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
                        <text x="12" y="16" font-size="11" font-weight="900" text-anchor="middle" fill="#78350f">C</text>
                      </svg>
                      <span>+100 Xu</span>
                      <span style="opacity:0.35;">•</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#a855f7" style="flex-shrink:0;">
                        <path d="M3 18h18v2.5H3zM4 16l2.5-9 4.5 4.5 2-6 2 6 4.5-4.5 2.5 9H4z"/>
                      </svg>
                      <span>VIP 3 Ngày</span>
                    ` : (lbTf === 'monthly' ? `
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
                        <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#d97706" stroke-width="1"/>
                        <text x="12" y="16" font-size="11" font-weight="900" text-anchor="middle" fill="#78350f">C</text>
                      </svg>
                      <span>+300 Xu</span>
                      <span style="opacity:0.35;">•</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#a855f7" style="flex-shrink:0;">
                        <path d="M3 18h18v2.5H3zM4 16l2.5-9 4.5 4.5 2-6 2 6 4.5-4.5 2.5 9H4z"/>
                      </svg>
                      <span>VIP 7 Ngày</span>
                    ` : `
                      <span>Vinh Danh Hoàng Gia</span>
                    `)}
                  </span>
                </div>
              </div>

              <!-- 🏆 THE GRAND 3D PODIUM BLOCK -->
              <div class="lb-podium-grid">
                
                <!-- TOP 2 (SILVER MASTER - Á QUÂN) -->
                <div class="lb-card-top2">
                  <div class="lb-podium-medal top2-medal" style="position:absolute; top:-16px; width:30px; height:30px; filter:drop-shadow(0 3px 10px rgba(148,163,184,0.7));">
                    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                      <defs>
                        <linearGradient id="silverMedalGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#ffffff"/>
                          <stop offset="35%" stop-color="#e2e8f0"/>
                          <stop offset="70%" stop-color="#94a3b8"/>
                          <stop offset="100%" stop-color="#475569"/>
                        </linearGradient>
                      </defs>
                      <circle cx="16" cy="16" r="14" fill="url(#silverMedalGrad3)" stroke="#334155" stroke-width="1.5"/>
                      <circle cx="16" cy="16" r="11" fill="none" stroke="#cbd5e1" stroke-dasharray="2.5 1.5"/>
                      <text x="16" y="21" font-size="14" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" fill="#0f172a">2</text>
                    </svg>
                  </div>
                  <!-- Khung Á Quân -->
                  <div style="position:relative; width:76px; height:76px; margin:2px auto 6px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <div style="width:48px; height:48px; border-radius:50%; overflow:hidden; box-shadow:0 0 16px rgba(203,213,225,0.45); z-index:1;">
                      <img src="${top2.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Top2'}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">
                    </div>
                    <img src="https://res.cloudinary.com/ththhwm2/image/upload/v1789539068/aphim-frames/a_a44e9335ea869639fdf812f3642a56a6.png" alt="Khung Á Quân" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; pointer-events:none; z-index:2; filter:drop-shadow(0 3px 10px rgba(203,213,225,0.5));">
                  </div>
                  <div class="lb-player-name">${top2.name || 'Thành viên'}</div>
                  <div style="font-size:10.5px; font-weight:700; color:#cbd5e1; background:rgba(203,213,225,0.15); border:1px solid rgba(203,213,225,0.35); padding:2px 8px; border-radius:6px; margin:4px 0 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:inline-flex; align-items:center; gap:4px;">
                    <span>🥈 Á Quân</span>
                  </div>
                  <div class="lb-xp-txt">${(top2.xp || 0).toLocaleString()} XP</div>
                  <div class="lb-sub-meta" style="display:flex; align-items:center; justify-content:center; gap:4px;">
                    <span>⏱️ ${top2.hours || 0}h xem</span>
                    <span>•</span>
                    <span style="display:inline-flex; align-items:center; gap:2px; color:#f97316;">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2c-.5 2.5-2.5 4.5-4 6-2 2-3 4.5-3 7.5a7 7 0 0014 0c0-3-1-5.5-3-7.5-1.5-1.5-3.5-3.5-4-6z"/></svg>
                      ${top2.streak || 1}d
                    </span>
                  </div>
                  <div class="lb-pedestal-base top2-pedestal">#2 Á QUÂN</div>
                </div>

                <!-- TOP 1 (GOLD CHAMPION - QUÁN QUÂN) -->
                <div class="lb-card-top1">
                  <div class="lb-podium-crown top1-crown" style="position:absolute; top:-18px; width:38px; height:30px; filter:drop-shadow(0 4px 14px rgba(245,158,11,0.9));">
                    <svg width="38" height="30" viewBox="0 0 38 30" fill="none">
                      <defs>
                        <linearGradient id="goldCrownGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#fff59d"/>
                          <stop offset="35%" stop-color="#fbc02d"/>
                          <stop offset="70%" stop-color="#f57f17"/>
                          <stop offset="100%" stop-color="#b45309"/>
                        </linearGradient>
                      </defs>
                      <path d="M3 24h32v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z" fill="url(#goldCrownGrad3)"/>
                      <path d="M4 24l3.5-15 7 8L19 4l4.5 13 7-8L34 24H4z" fill="url(#goldCrownGrad3)" stroke="#78350f" stroke-width="1.2" stroke-linejoin="round"/>
                      <circle cx="19" cy="4" r="3" fill="#ef4444" stroke="#fff" stroke-width="1.2"/>
                      <circle cx="7.5" cy="9" r="2.2" fill="#3b82f6" stroke="#fff" stroke-width="0.9"/>
                      <circle cx="30.5" cy="9" r="2.2" fill="#3b82f6" stroke="#fff" stroke-width="0.9"/>
                      <circle cx="19" cy="20" r="1.5" fill="#fff" opacity="0.9"/>
                    </svg>
                  </div>
                  <!-- Khung Quán Quân -->
                  <div style="position:relative; width:88px; height:88px; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <div style="width:56px; height:56px; border-radius:50%; overflow:hidden; box-shadow:0 0 20px rgba(245,158,11,0.6); z-index:1;">
                      <img src="${top1.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Top1'}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">
                    </div>
                    <img src="https://res.cloudinary.com/ththhwm2/image/upload/v1789539061/aphim-frames/a_386445551be850bb16b73a225d0d0602.png" alt="Khung Quán Quân" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; pointer-events:none; z-index:2; filter:drop-shadow(0 4px 14px rgba(245,158,11,0.6));">
                  </div>
                  <div class="lb-player-name top1-name">${top1.name || 'Quán Quân'}</div>
                  <div style="font-size:11px; font-weight:800; color:#fcd576; background:linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.2) 100%); border:1px solid rgba(245,158,11,0.55); padding:2px 10px; border-radius:8px; margin:4px 0 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(245,158,11,0.2);">
                    <svg width="12" height="11" viewBox="0 0 36 28" fill="#f59e0b"><path d="M4 23l3.5-14 6.5 7.5L18 4l4 12.5 6.5-7.5L32 23H4z"/></svg>
                    <span>Quán Quân</span>
                  </div>
                  <div class="lb-xp-txt top1-xp">${(top1.xp || 0).toLocaleString()} XP</div>
                  <div class="lb-sub-meta" style="display:flex; align-items:center; justify-content:center; gap:4px;">
                    <span style="display:inline-flex; align-items:center; gap:2px; color:#f97316; font-weight:700;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2c-.5 2.5-2.5 4.5-4 6-2 2-3 4.5-3 7.5a7 7 0 0014 0c0-3-1-5.5-3-7.5-1.5-1.5-3.5-3.5-4-6z"/></svg>
                      ${top1.streak || 1} ngày streak
                    </span>
                    <span>•</span>
                    <span>⏱️ ${top1.hours || 0}h xem</span>
                  </div>
                  <div class="lb-pedestal-base top1-pedestal">#1 QUÁN QUÂN</div>
                </div>

                <!-- TOP 3 (BRONZE MASTER - QUÝ QUÂN) -->
                <div class="lb-card-top3">
                  <div class="lb-podium-medal top3-medal" style="position:absolute; top:-16px; width:30px; height:30px; filter:drop-shadow(0 3px 10px rgba(217,119,6,0.6));">
                    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                      <defs>
                        <linearGradient id="bronzeMedalGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stop-color="#ffedd5"/>
                          <stop offset="35%" stop-color="#fb923c"/>
                          <stop offset="70%" stop-color="#c2410c"/>
                          <stop offset="100%" stop-color="#7c2d12"/>
                        </linearGradient>
                      </defs>
                      <circle cx="16" cy="16" r="14" fill="url(#bronzeMedalGrad3)" stroke="#431407" stroke-width="1.5"/>
                      <circle cx="16" cy="16" r="11" fill="none" stroke="#fed7aa" stroke-dasharray="2.5 1.5"/>
                      <text x="16" y="21" font-size="14" font-weight="900" font-family="system-ui, -apple-system, sans-serif" text-anchor="middle" fill="#290b02">3</text>
                    </svg>
                  </div>
                  <!-- Khung Quý Quân -->
                  <div style="position:relative; width:76px; height:76px; margin:2px auto 6px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <div style="width:48px; height:48px; border-radius:50%; overflow:hidden; box-shadow:0 0 16px rgba(205,127,50,0.45); z-index:1;">
                      <img src="${top3.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Top3'}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">
                    </div>
                    <img src="https://res.cloudinary.com/ththhwm2/image/upload/v1789538978/aphim-frames/a_45f7f9975255971b197d34d77fb50ede.png" alt="Khung Quý Quân" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; pointer-events:none; z-index:2; filter:drop-shadow(0 3px 10px rgba(205,127,50,0.5));">
                  </div>
                  <div class="lb-player-name">${top3.name || 'Thành viên'}</div>
                  <div style="font-size:10.5px; font-weight:700; color:#fed7aa; background:rgba(205,127,50,0.18); border:1px solid rgba(205,127,50,0.35); padding:2px 8px; border-radius:6px; margin:4px 0 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; display:inline-flex; align-items:center; gap:4px;">
                    <span>🥉 Quý Quân</span>
                  </div>
                  <div class="lb-xp-txt" style="color:#fb923c;">${(top3.xp || 0).toLocaleString()} XP</div>
                  <div class="lb-sub-meta" style="display:flex; align-items:center; justify-content:center; gap:4px;">
                    <span>⏱️ ${top3.hours || 0}h xem</span>
                    <span>•</span>
                    <span style="display:inline-flex; align-items:center; gap:2px; color:#f97316;">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2c-.5 2.5-2.5 4.5-4 6-2 2-3 4.5-3 7.5a7 7 0 0014 0c0-3-1-5.5-3-7.5-1.5-1.5-3.5-3.5-4-6z"/></svg>
                      ${top3.streak || 1}d
                    </span>
                  </div>
                  <div class="lb-pedestal-base top3-pedestal">#3 QUÝ QUÂN</div>
                </div>

              </div>

              <!-- 📋 CONTENDERS ROWS (#4 - #10) -->
              <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:22px;">
                ${lbData.rest.map(item => `
                  <div class="lb-row-item ${item.isMe ? 'is-me' : ''}">
                    <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
                      <div class="lb-row-pos ${item.position <= 5 ? 'top5' : ''}">
                        #${item.position}
                      </div>
                      <div style="position:relative; width:38px; height:38px; flex-shrink:0;">
                        <img src="${item.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:1.5px solid rgba(255,255,255,0.18); display:block;">
                      </div>
                      <div style="min-width:0; flex:1;">
                        <div class="lb-row-name ${item.isMe ? 'is-me' : ''}">
                          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</span>
                          ${item.isMe ? '<span style="font-size:9.5px; background:linear-gradient(135deg,#fcd576,#f59e0b); color:#111827; padding:1px 6px; border-radius:5px; font-weight:900; letter-spacing:0.3px; flex-shrink:0;">BẠN</span>' : ''}
                        </div>
                        <div style="font-size:11.5px; color:#94a3b8; display:flex; align-items:center; gap:6px; margin-top:3px;">
                          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#cbd5e1;">${item.rank}</span>
                          <span style="opacity:0.4;">•</span>
                          <span style="flex-shrink:0; display:inline-flex; align-items:center; gap:3px; color:#f97316; font-weight:700;">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2c-.5 2.5-2.5 4.5-4 6-2 2-3 4.5-3 7.5a7 7 0 0014 0c0-3-1-5.5-3-7.5-1.5-1.5-3.5-3.5-4-6z"/></svg>
                            ${item.streak || 1}d
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style="text-align:right; flex-shrink:0; margin-left:12px;">
                      <div class="lb-xp-txt" style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>${(item.xp || 0).toLocaleString()} XP</span>
                      </div>
                      <div class="lb-sub-meta" style="margin-top:3px;">⏱️ ${item.hours || 0} giờ xem</div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- 🎯 STICKY USER POSITION HUD BAR -->
              <div class="lb-my-rank-bar">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:42px; height:42px; border-radius:14px; background:linear-gradient(135deg,#fcd576 0%,#f59e0b 100%); display:flex; align-items:center; justify-content:center; color:#111827; font-size:15px; font-weight:900; box-shadow:0 4px 16px rgba(245,158,11,0.45); flex-shrink:0; border:1px solid rgba(255,255,255,0.4);">
                    #${lbData.myRank}
                  </div>
                  <div>
                    <div class="lb-my-rank-title">Vị trí của bạn: <strong>Hạng #${lbData.myRank}</strong></div>
                    <div class="lb-my-rank-sub">Đang có <strong>${totalXP.toLocaleString()} XP</strong> · Cày thêm phim để bứt phá Top 3!</div>
                  </div>
                </div>
                <button onclick="openGamificationModal('missions')" style="padding:9px 18px; border-radius:12px; background:linear-gradient(135deg,#fcd576 0%,#f59e0b 100%); color:#111827; border:none; font-size:12.5px; font-weight:900; letter-spacing:-0.2px; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 16px rgba(245,158,11,0.4); flex-shrink:0; transition:transform 0.2s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>Kiếm Thêm XP</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

            </div>
          </div>
          `;
  }

  // ════════════════════════════════════════════════════════════
  // VIEW 2: 12 DANH HIỆU THÀNH TỰU (DEFAULT)
  // ════════════════════════════════════════════════════════════
  const filter = window._achievementFilter || 'all';
  let visibleBadges = badges.filter(b => {
    if (filter === 'unlocked') return b.unlocked;
    if (filter === 'locked') return !b.unlocked;
    return true;
  });

  // Sắp xếp Đã mở lên đầu như hình mẫu
  if (filter === 'all') {
    visibleBadges = [...visibleBadges].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
  }

  window.setAchievementFilter = function (f) {
    window._achievementFilter = f;
    const panel = document.getElementById('tabPanel');
    if (panel) panel.innerHTML = renderAchievements(currentUser);
  };

  return `
        <div class="panel-card achievements-panel-card" style="min-height: 520px; display: flex; flex-direction: column;">
            <div class="achievements-container">
                <!-- Header Sub-Header (Clean 1-line title & badge on Desktop, stack cleanly on Mobile) -->
                <div class="achievements-sub-header">
                    <div class="achievements-sub-header-left">
                        <h3 class="achievements-sub-title">Thành tựu tài khoản</h3>
                        <span class="achievements-sub-badge">${unlockedCount}/${totalCount} đã mở khóa</span>
                    </div>
                    <button onclick="openGamificationModal()" class="achieve-bonus-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                        <span>Điểm Danh & Nhiệm Vụ</span>
                    </button>
                </div>

                ${navSwitchHtml}

                <!-- 🏆 Hero Trophy & Level Progress Banner -->
                <div class="achievements-hero-card">
                    <div class="hero-card-left">
                        <div class="hero-level-emblem">
                            <svg class="hero-crown-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            <span class="hero-level-txt">Lv.${lvlInfo.level}</span>
                        </div>
                        <div class="hero-user-rank">
                            <div class="hero-rank-name">${lvlInfo.rankTitle}</div>
                            <div class="hero-xp-counter">${totalXP} XP tích lũy</div>
                        </div>
                    </div>
                    <div class="hero-card-right">
                        <div class="hero-progress-meta">
                            <span>Tiến độ lên Cấp ${lvlInfo.level + 1}</span>
                            <span class="hero-progress-nums"><strong>${lvlInfo.currentLvlXP}</strong> / ${lvlInfo.nextLvlXP} XP</span>
                        </div>
                        <div class="hero-progress-track">
                            <div class="hero-progress-fill" style="width: ${lvlInfo.progressPct}%;"></div>
                        </div>
                    </div>
                </div>

                <!-- 📊 3 Summary Stat Cards in Horizontal Row -->
                <div class="achievements-stats-row">
                    <!-- Stat Card 1: THÀNH TỰU -->
                    <div class="achievement-stat-card">
                        <div class="stat-card-icon purple">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                        </div>
                        <div class="stat-card-content">
                            <div class="stat-card-label">THÀNH TỰU</div>
                            <div class="stat-card-val"><span class="achievement-val-text">${unlockedCount}</span><span class="achievement-total-text">/${totalCount}</span></div>
                        </div>
                    </div>

                    <!-- Stat Card 2: CẤP ĐỘ -->
                    <div class="achievement-stat-card">
                        <div class="stat-card-icon gold">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </div>
                        <div class="stat-card-content">
                            <div class="stat-card-label">BẬC RANK</div>
                            <div class="stat-card-val" style="color:#fcd576; font-size:14px; font-weight:800;">Lv.${lvlInfo.level}</div>
                        </div>
                    </div>

                    <!-- Stat Card 3: TÍCH LŨY -->
                    <div class="achievement-stat-card">
                        <div class="stat-card-icon green">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5H10.5a2.5 2.5 0 0 1 0-5H14M9.5 14.5H14a2.5 2.5 0 0 1 0 5H10"/></svg>
                        </div>
                        <div class="stat-card-content">
                            <div class="stat-card-label">TỔNG XP</div>
                            <div class="stat-card-val" style="color:#22c55e;">${totalXP} XP</div>
                        </div>
                    </div>
                </div>

                <!-- 🎛️ Filter Pills Row -->
                <div class="achievements-filter-row">
                    <button onclick="setAchievementFilter('all')" class="achieve-filter-pill ${filter === 'all' ? 'active' : ''}">
                        Tất cả <span class="achieve-pill-count">${totalCount}</span>
                    </button>
                    <button onclick="setAchievementFilter('unlocked')" class="achieve-filter-pill ${filter === 'unlocked' ? 'active' : ''}">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        Đã mở <span class="achieve-pill-count">${unlockedCount}</span>
                    </button>
                    <button onclick="setAchievementFilter('locked')" class="achieve-filter-pill ${filter === 'locked' ? 'active' : ''}">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Chưa mở <span class="achieve-pill-count">${totalCount - unlockedCount}</span>
                    </button>
                </div>

                <!-- 🏅 Responsive Achievement Cards Grid (Layout chuẩn theo hình mẫu) -->
                <div class="achievement-grid">
                    ${visibleBadges.map(b => `
                        <div class="achievement-card ${b.unlocked ? 'unlocked' : 'locked'}">
                            <div class="achievement-icon-box ${b.unlocked ? 'unlocked' : 'locked'}">
                                ${b.icon}
                            </div>
                            <div class="achievement-content-col">
                                <div class="achievement-top-row">
                                    <h4 class="achievement-title" title="${b.title}">${b.title}</h4>
                                    <span class="badge-status-tag ${b.unlocked ? 'unlocked' : 'locked'}">
                                        ${b.unlocked ? 'Đã mở' : 'Chưa mở'}
                                    </span>
                                </div>
                                <div class="achievement-desc">${b.desc}</div>
                                ${!b.unlocked && b.progress && b.progress.max > 1 ? `
                                  <div class="achievement-progress-box">
                                    <div class="achievement-progress-track">
                                      <div class="achievement-progress-fill" style="width: ${Math.round((b.progress.current / b.progress.max) * 100)}%;"></div>
                                    </div>
                                    <div class="achievement-progress-meta">
                                      <span>Tiến độ</span>
                                      <span style="font-weight: 700; color: #f59e0b;">${b.progress.current}/${b.progress.max}</span>
                                    </div>
                                  </div>
                                ` : ''}
                                <div class="achievement-reward-row">
                                    <span class="reward-label">Phần thưởng:</span>
                                    <span class="reward-xp">+${b.xp} XP</span>
                                    ${b.xu ? `<span class="reward-xu">+${b.xu} Xu</span>` : ''}
                                    ${b.badgeName ? `<span class="reward-badge-name">• ${b.badgeName}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ─── SETTINGS TAB RENDERER ───
function renderSettings() {
  const isAutoplay = localStorage.getItem('ap_setting_autoplay') !== 'false';
  const isAutonext = localStorage.getItem('ap_setting_autonext') !== 'false';
  const isTheater = localStorage.getItem('ap_setting_theater') === 'true';
  const isNotif = localStorage.getItem('ap_setting_notif') !== 'false';
  const qual = localStorage.getItem('ap_setting_quality') || 'auto';

  const qualities = [
    { key: 'auto', label: 'Tự động' },
    { key: '360p', label: '360P' },
    { key: '480p', label: '480P' },
    { key: '720p', label: '720P' },
    { key: '1080p', label: '1080P' }
  ];

  return `
        <div style="display: flex; flex-direction: column; gap: 20px; width: 100%;">
            <!-- Card 1: Main Toggles Group -->
            <div class="settings-card" style="background: rgba(22, 25, 37, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 12px 28px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);">
                <!-- Row 1: Tự động phát -->
                <div class="settings-row" style="display: flex; align-items: center; justify-content: space-between; padding: 22px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                    <div>
                        <div class="setting-item-title" style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Tự động phát</div>
                        <div class="setting-item-desc" style="font-size: 13px; color: #94a3b8; font-weight: 500;">Tự động phát phim khi mở trang xem.</div>
                    </div>
                    <label style="cursor: pointer; position: relative; display: inline-block; flex-shrink: 0; margin-left: 20px;">
                        <input type="checkbox" class="sr-only" ${isAutoplay ? 'checked' : ''} onchange="toggleSettingSwitch(this, 'ap_setting_autoplay')">
                        <div class="setting-toggle-track" style="width: 48px; height: 26px; border-radius: 13px; background: ${isAutoplay ? '#22c55e' : '#4b5563'}; position: relative; display: inline-block; transition: background .25s ease;">
                            <span class="setting-toggle-knob" style="width: 20px; height: 20px; border-radius: 50%; background: #ffffff; position: absolute; top: 3px; left: 3px; transform: ${isAutoplay ? 'translateX(22px)' : 'translateX(0)'}; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: block; transition: transform .25s ease;"></span>
                        </div>
                    </label>
                </div>

                <!-- Row 2: Tự động chuyển tập -->
                <div class="settings-row" style="display: flex; align-items: center; justify-content: space-between; padding: 22px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                    <div>
                        <div class="setting-item-title" style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Tự động chuyển tập</div>
                        <div class="setting-item-desc" style="font-size: 13px; color: #94a3b8; font-weight: 500;">Chuyển sang tập tiếp theo khi kết thúc.</div>
                    </div>
                    <label style="cursor: pointer; position: relative; display: inline-block; flex-shrink: 0; margin-left: 20px;">
                        <input type="checkbox" class="sr-only" ${isAutonext ? 'checked' : ''} onchange="toggleSettingSwitch(this, 'ap_setting_autonext')">
                        <div class="setting-toggle-track" style="width: 48px; height: 26px; border-radius: 13px; background: ${isAutonext ? '#22c55e' : '#4b5563'}; position: relative; display: inline-block; transition: background .25s ease;">
                            <span class="setting-toggle-knob" style="width: 20px; height: 20px; border-radius: 50%; background: #ffffff; position: absolute; top: 3px; left: 3px; transform: ${isAutonext ? 'translateX(22px)' : 'translateX(0)'}; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: block; transition: transform .25s ease;"></span>
                        </div>
                    </label>
                </div>

                <!-- Row 3: Chế độ rạp phim -->
                <div class="settings-row" style="display: flex; align-items: center; justify-content: space-between; padding: 22px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                    <div>
                        <div class="setting-item-title" style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Chế độ rạp phim</div>
                        <div class="setting-item-desc" style="font-size: 13px; color: #94a3b8; font-weight: 500;">Mặc định bật chế độ rạp khi xem phim.</div>
                    </div>
                    <label style="cursor: pointer; position: relative; display: inline-block; flex-shrink: 0; margin-left: 20px;">
                        <input type="checkbox" class="sr-only" ${isTheater ? 'checked' : ''} onchange="toggleSettingSwitch(this, 'ap_setting_theater')">
                        <div class="setting-toggle-track" style="width: 48px; height: 26px; border-radius: 13px; background: ${isTheater ? '#22c55e' : '#4b5563'}; position: relative; display: inline-block; transition: background .25s ease;">
                            <span class="setting-toggle-knob" style="width: 20px; height: 20px; border-radius: 50%; background: #ffffff; position: absolute; top: 3px; left: 3px; transform: ${isTheater ? 'translateX(22px)' : 'translateX(0)'}; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: block; transition: transform .25s ease;"></span>
                        </div>
                    </label>
                </div>

                <!-- Row 4: Thông báo phim mới -->
                <div class="settings-row" style="display: flex; align-items: center; justify-content: space-between; padding: 22px 0;">
                    <div>
                        <div class="setting-item-title" style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Thông báo phim mới</div>
                        <div class="setting-item-desc" style="font-size: 13px; color: #94a3b8; font-weight: 500;">Nhận thông báo khi phim yêu thích có tập mới.</div>
                    </div>
                    <label style="cursor: pointer; position: relative; display: inline-block; flex-shrink: 0; margin-left: 20px;">
                        <input type="checkbox" class="sr-only" ${isNotif ? 'checked' : ''} onchange="toggleSettingSwitch(this, 'ap_setting_notif')">
                        <div class="setting-toggle-track" style="width: 48px; height: 26px; border-radius: 13px; background: ${isNotif ? '#22c55e' : '#4b5563'}; position: relative; display: inline-block; transition: background .25s ease;">
                            <span class="setting-toggle-knob" style="width: 20px; height: 20px; border-radius: 50%; background: #ffffff; position: absolute; top: 3px; left: 3px; transform: ${isNotif ? 'translateX(22px)' : 'translateX(0)'}; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: block; transition: transform .25s ease;"></span>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Card 2: Quality Preference Group -->
            <div class="settings-card" style="background: rgba(22, 25, 37, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 26px 28px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);">
                <div class="setting-item-title" style="font-size: 17px; font-weight: 800; color: #ffffff; margin-bottom: 4px; letter-spacing: -0.01em;">Chất lượng mặc định</div>
                <div class="setting-item-desc" style="font-size: 13px; color: #94a3b8; font-weight: 500; margin-bottom: 22px;">Chọn chất lượng video ưu tiên.</div>
                <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                    ${qualities.map(q => {
    const isActive = qual === q.key;
    return `
                            <button onclick="setQuality('${q.key}')" 
                                    class="quality-option-btn ${isActive ? 'active' : ''}"
                                    style="padding: 10px 24px; border-radius: 12px; font-size: 14px; cursor: pointer; transition: all 0.2s ease;">
                                ${q.label}
                            </button>
                        `;
  }).join('')}
                </div>
            </div>
        </div>
    `;
}

// ─── NOTIFICATIONS TAB RENDERER ───
function renderNotifications() {
  let notifs = [];
  try { notifs = JSON.parse(localStorage.getItem('cinestream_notifications') || '[]'); } catch (e) { }
  if (!notifs.length) {
    notifs = [
      { id: 1, title: '🎉 Chào mừng bạn đến với APhim Super VIP Portal!', content: 'Hệ thống đã tặng bạn 50,000 Xu trải nghiệm đổi quà miễn phí.', date: 'Vừa xong', read: false },
      { id: 2, title: '🎬 Phim bom tấn Marvel mới cập nhật bản 4K', content: 'Bộ phim bom tấn mới nhất đã có mặt với thuyết minh chuẩn.', date: '2 giờ trước', read: false },
      { id: 3, title: '👑 Ưu đãi Nạp Xu tặng 100% giá trị', content: 'Đặc quyền dành riêng cho thành viên VIP trong tuần này.', date: '1 ngày trước', read: true }
    ];
  }

  return `
        <div class="panel-card">
            <div style="padding:14px 20px 0;text-align:right;flex-shrink:0;">
                <button onclick="markAllRead()" style="padding:6px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#cbd5e1;border-radius:9px;font-size:11.5px;font-weight:700;cursor:pointer;">Đánh dấu tất cả đã đọc</button>
            </div>
            <div class="notif-list" style="padding:16px 20px;">
                ${notifs.map(n => `
                    <div class="notif-item ${n.read ? '' : 'unread'}" style="padding:12px 16px;">
                        ${!n.read ? '<div class="notif-dot"></div>' : '<div style="width:8px;flex-shrink:0;"></div>'}
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13.5px;font-weight:700;color:${n.read ? '#94a3b8' : '#e2e8f0'};margin-bottom:2px;">${n.title || 'Thông báo hệ thống'}</div>
                            <div style="font-size:12px;color:#64748b;">${n.content || ''}</div>
                            <div style="font-size:10.5px;color:#475569;margin-top:4px;font-weight:600;">${n.date || 'Vừa xong'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ─── ENTERPRISE EMPTY STATE RENDERER ───
function renderEmpty(title, sub, type) {
  // Auto-detect type if not provided
  let emptyType = type;
  if (!emptyType) {
    const tLower = (title || '').toLowerCase();
    if (tLower.includes('lịch sử') || (typeof currentTab !== 'undefined' && currentTab === 'history')) emptyType = 'history';
    else if (tLower.includes('yêu thích') || (typeof currentTab !== 'undefined' && currentTab === 'favorites')) emptyType = 'favorites';
    else if (tLower.includes('playlist') || tLower.includes('phát') || (typeof currentTab !== 'undefined' && (currentTab === 'watchlist' || currentTab === 'playlists'))) emptyType = 'playlists';
    else if (tLower.includes('rạp') || tLower.includes('chiếu') || (typeof currentTab !== 'undefined' && currentTab === 'cinema')) emptyType = 'cinema';
    else if (tLower.includes('đăng nhập') || (typeof currentTab !== 'undefined' && currentTab === 'account')) emptyType = 'login';
    else emptyType = 'default';
  }

  let pillText = 'Thông báo';
  let themeColor = 'gold'; // gold, rose, blue, indigo, cyan
  let iconSvg = '';
  let primaryBtn = '';
  let secondaryBtn = '';

  if (emptyType === 'history') {
    pillText = 'Lịch sử xem phim';
    themeColor = 'gold';
    iconSvg = `
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          `;
    primaryBtn = `
            <a href="/" class="profile-empty-btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Khám phá phim ngay
            </a>
          `;
    secondaryBtn = `
            <button onclick="switchTab('favorites')" class="profile-empty-btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              Phim yêu thích
            </button>
          `;
  } else if (emptyType === 'favorites') {
    pillText = 'Bộ sưu tập cá nhân';
    themeColor = 'rose';
    iconSvg = `
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          `;
    primaryBtn = `
            <a href="/" class="profile-empty-btn-primary" style="background:linear-gradient(135deg,#fb7185 0%,#e11d48 100%);color:#fff!important;box-shadow:0 4px 16px rgba(244,63,94,0.35);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Khám phá phim hay
            </a>
          `;
    secondaryBtn = `
            <button onclick="switchTab('history')" class="profile-empty-btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Xem lịch sử
            </button>
          `;
  } else if (emptyType === 'playlists' || emptyType === 'watchlist') {
    pillText = 'Danh sách phát';
    themeColor = 'cyan';
    iconSvg = `
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          `;
    primaryBtn = `
            <button onclick="window.openCreatePlaylistModalStandalone()" class="profile-empty-btn-primary" style="background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);color:#fff!important;box-shadow:0 4px 16px rgba(6,182,212,0.35);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tạo playlist đầu tiên
            </button>
          `;
    secondaryBtn = `
            <a href="/" class="profile-empty-btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Khám phá phim
            </a>
          `;
  } else if (emptyType === 'cinema') {
    pillText = 'Lịch chiếu rạp';
    themeColor = 'blue';
    iconSvg = `
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <line x1="7" y1="2" x2="7" y2="22"/>
              <line x1="17" y1="2" x2="17" y2="22"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <line x1="2" y1="7" x2="7" y2="7"/>
              <line x1="2" y1="17" x2="7" y2="17"/>
              <line x1="17" y1="17" x2="22" y2="17"/>
              <line x1="17" y1="7" x2="22" y2="7"/>
            </svg>
          `;
    primaryBtn = `
            <a href="/" class="profile-empty-btn-primary" style="background:linear-gradient(135deg,#38bdf8 0%,#0284c7 100%);color:#fff!important;box-shadow:0 4px 16px rgba(56,189,248,0.35);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Xem phim Online ngay
            </a>
          `;
    secondaryBtn = `
            <button onclick="switchTab('shop')" class="profile-empty-btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Cửa Hàng VIP
            </button>
          `;
  } else if (emptyType === 'login') {
    pillText = 'Xác thực tài khoản';
    themeColor = 'indigo';
    iconSvg = `
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          `;
    primaryBtn = `
            <button onclick="if(window.showAuthModal)showAuthModal('login')" class="profile-empty-btn-primary" style="background:linear-gradient(135deg,#818cf8 0%,#4f46e5 100%);color:#fff!important;box-shadow:0 4px 16px rgba(99,102,241,0.35);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Đăng nhập ngay
            </button>
          `;
    secondaryBtn = `
            <a href="/" class="profile-empty-btn-secondary">
              Khám phá phim
            </a>
          `;
  } else {
    pillText = 'Thông báo';
    themeColor = 'gold';
    iconSvg = `
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          `;
    primaryBtn = `
            <a href="/" class="profile-empty-btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Khám phá phim ngay
            </a>
          `;
    secondaryBtn = `
            <button onclick="switchTab('shop')" class="profile-empty-btn-secondary">
              Cửa Hàng VIP
            </button>
          `;
  }

  return `
          <div class="panel-card profile-empty-card">
            <div class="profile-empty-glow ${themeColor}"></div>
            <div class="profile-empty-content">
              <div class="profile-empty-icon-wrap ${themeColor}">
                ${iconSvg}
              </div>
              <div class="profile-empty-pill ${themeColor}">
                ${pillText}
              </div>
              <h3 class="profile-empty-title">${title}</h3>
              <p class="profile-empty-sub">${sub}</p>
              <div class="profile-empty-actions">
                ${primaryBtn}
                ${secondaryBtn}
              </div>
            </div>
          </div>
        `;
}

// ─── ACTION HANDLERS ───
function removeFav(slug) {
  let favs = [];
  try { favs = JSON.parse(localStorage.getItem('cinestream_favorites') || '[]'); } catch (e) { }
  favs = favs.filter(f => (f.slug || f.id) !== slug);
  localStorage.setItem('cinestream_favorites', JSON.stringify(favs));
  if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
    authService.updateProfile({ favorites: favs }).catch(() => { });
  }
  try { window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: favs })); } catch (e) { }
  switchTab('favorites');
}

function removeHist(slug) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem('cinestream_watch_history') || '[]'); } catch (e) { }
  hist = hist.filter(h => (h.slug || h.id) !== slug);
  localStorage.setItem('cinestream_watch_history', JSON.stringify(hist));
  if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
    authService.updateProfile({ watchHistory: hist }).catch(() => { });
  }
  try { window.dispatchEvent(new CustomEvent('watchHistoryUpdated', { detail: hist })); } catch (e) { }
  switchTab('history');
}

function clearHistory() {
  if (confirm('Xóa toàn bộ lịch sử xem phim?')) {
    localStorage.setItem('cinestream_watch_history', '[]');
    if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
      authService.updateProfile({ watchHistory: [] }).catch(() => { });
    }
    try { window.dispatchEvent(new CustomEvent('watchHistoryUpdated', { detail: [] })); } catch (e) { }
    switchTab('history');
  }
}

function removeWl(slug) {
  let wl = [];
  try { wl = JSON.parse(localStorage.getItem('cinestream_watchlist') || '[]'); } catch (e) { }
  wl = wl.filter(w => (w.slug || w.id) !== slug);
  localStorage.setItem('cinestream_watchlist', JSON.stringify(wl));
  if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
    authService.updateProfile({ watchlist: wl }).catch(() => { });
  }
  switchTab('watchlist');
}

function markAllRead() {
  let notifs = [];
  try { notifs = JSON.parse(localStorage.getItem('cinestream_notifications') || '[]'); } catch (e) { }
  notifs.forEach(n => n.read = true);
  localStorage.setItem('cinestream_notifications', JSON.stringify(notifs));
  if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
    authService.updateProfile({ notifications: notifs }).catch(() => { });
  }
  switchTab('notifications');
}

function previewDisplayName(val) {
  const cleanVal = (val || '').trim();
  const nameToDisplay = cleanVal || 'Người dùng';

  // Đồng bộ currentUser ngay lập tức để các tab khác (shop, etc.) nhận diện đúng tên
  if (!currentUser) currentUser = getUser() || {};
  currentUser.displayName = nameToDisplay;
  currentUser.name = nameToDisplay;
  currentUser.fullName = nameToDisplay;
  try { localStorage.setItem('cinestream_user', JSON.stringify(currentUser)); } catch (e) { }
  if (typeof authService !== 'undefined') {
    if (authService.currentUser) {
      authService.currentUser.displayName = nameToDisplay;
      authService.currentUser.name = nameToDisplay;
      authService.currentUser.fullName = nameToDisplay;
    }
    if (typeof authService.saveUser === 'function') authService.saveUser(currentUser);
  }

  // 1. Panel bên phải
  const rightNameEl = document.querySelector('.avatar-panel .avatar-label');
  if (rightNameEl) {
    rightNameEl.textContent = nameToDisplay;
    if (typeof applyEquippedNameColor === 'function') applyEquippedNameColor(rightNameEl, currentUser);
  }
  const rightAvatarEl = document.querySelector('.avatar-panel .avatar-large');
  if (rightAvatarEl && (!currentUser || !currentUser.avatar)) {
    const letter = nameToDisplay.charAt(0).toUpperCase();
    const frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(currentUser) : { type: 'none', value: '' };
    rightAvatarEl.innerHTML = typeof renderAvatarWithFrame === 'function' ? renderAvatarWithFrame(letter, 68, frameInfo) : letter;
  }

  // 2. Sidebar bên trái
  const leftNameEl = document.getElementById('sidebarNameEl');
  if (leftNameEl) {
    leftNameEl.textContent = nameToDisplay;
    if (typeof applyEquippedNameColor === 'function') applyEquippedNameColor(leftNameEl, currentUser);
  }

  // 3. Header bên trên (live sync)
  const headerNameText = document.querySelector('.ap-user-name-text');
  if (headerNameText) {
    headerNameText.textContent = nameToDisplay;
    headerNameText.title = nameToDisplay;
    if (typeof applyEquippedNameColor === 'function') applyEquippedNameColor(headerNameText, currentUser);
  }
  const dropdownNameText = document.querySelector('.ap-dropdown-user-name') || document.querySelector('.ap-user-dropdown-menu span[title]');
  if (dropdownNameText) {
    dropdownNameText.textContent = nameToDisplay;
    dropdownNameText.title = nameToDisplay;
    if (typeof applyEquippedNameColor === 'function') applyEquippedNameColor(dropdownNameText, currentUser);
  }
  const headerTrigger = document.querySelector('.ap-user-bar-trigger');
  if (headerTrigger) {
    headerTrigger.title = nameToDisplay;
  }
  const headerInitialSpan = document.querySelector('.ap-user-avatar-badge span, .user-avatar-frame-wrap span, .shop-frame-wrap span');
  if (headerInitialSpan && (!currentUser || !currentUser.avatar)) {
    headerInitialSpan.textContent = nameToDisplay.charAt(0).toUpperCase();
  }
}

const PRESET_AVATAR_CATEGORIES = [
  {
    id: 'official',
    name: '🌟 APhim VIP',
    avatars: [
      { name: 'APhim Official', url: '/android-chrome-512x512.png' },
      { name: 'VIP Gold Trophy', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=APhimVIPGold&backgroundColor=ffd700' },
      { name: 'Cyber Neon Shield', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=APhimCyber&backgroundColor=06b6d4' },
      { name: 'Crown Master', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CrownMaster&backgroundColor=f59e0b' },
      { name: 'Star Prime', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=StarPrime&backgroundColor=d97706' },
      { name: 'Galaxy Core', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=GalaxyCore&backgroundColor=8b5cf6' }
    ]
  },
  {
    id: 'anime',
    name: '🎬 Anime & Manga',
    avatars: [
      { name: 'Luffy Vua Hải Tặc', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luffy&backgroundColor=b6e3f4' },
      { name: 'Zoro Kiếm Sĩ', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoro&backgroundColor=c0aede' },
      { name: 'Naruto Hokage', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Naruto&backgroundColor=ffd5dc' },
      { name: 'Goku Siêu Xayda', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Goku&backgroundColor=ffdfbf' },
      { name: 'Anya Điệp Viên', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AnyaForger&backgroundColor=ffd5dc' },
      { name: 'Gojo Satoru', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=GojoSatoru&backgroundColor=b6e3f4' },
      { name: 'Tanjiro Sát Quỷ', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Tanjiro&backgroundColor=d1d4f9' },
      { name: 'Nezuko Dễ Thương', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nezuko&backgroundColor=ffd5dc' }
    ]
  },
  {
    id: 'movies',
    name: '🍿 Điện Ảnh & Heroes',
    avatars: [
      { name: 'Iron Man', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=IronManTony&backgroundColor=ef4444' },
      { name: 'Batman Bóng Đêm', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BatmanKnight&backgroundColor=1f2937' },
      { name: 'Spider-Man Nhện', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SpiderManPeter&backgroundColor=dc2626' },
      { name: 'Deadpool Hài Hước', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DeadpoolWade&backgroundColor=b91c1c' },
      { name: 'John Wick Sát Thủ', url: 'https://api.dicebear.com/7.x/micah/svg?seed=JohnWick&backgroundColor=1e293b' },
      { name: 'Wednesday Bí Ẩn', url: 'https://api.dicebear.com/7.x/micah/svg?seed=WednesdayAddams&backgroundColor=0f172a' },
      { name: 'Doctor Strange', url: 'https://api.dicebear.com/7.x/micah/svg?seed=DoctorStrange&backgroundColor=4338ca' },
      { name: 'Joker Gã Hề', url: 'https://api.dicebear.com/7.x/micah/svg?seed=JokerChaos&backgroundColor=7e22ce' }
    ]
  },
  {
    id: 'gaming',
    name: '🎮 Gaming & Cyber',
    avatars: [
      { name: 'Cyber Samurai', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSamurai99&backgroundColor=06b6d4' },
      { name: 'Neon Hacker', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NeonHacker404&backgroundColor=10b981' },
      { name: 'Mecha Knight', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=MechaTitan&backgroundColor=8b5cf6' },
      { name: 'Pixel Pro', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=PixelGamer&backgroundColor=ec4899' },
      { name: 'Ghost Rider X', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GhostRiderX&backgroundColor=f97316' },
      { name: 'Vortex Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=VortexBot7&backgroundColor=3b82f6' }
    ]
  },
  {
    id: 'modern',
    name: '👤 3D & Chibi',
    avatars: [
      { name: 'Chàng Trai Năng Động', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FelixCool&backgroundColor=b6e3f4' },
      { name: 'Cô Nàng Ngọt Ngào', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnekaSweet&backgroundColor=ffd5dc' },
      { name: 'Leo Thông Thái', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeoSmart&backgroundColor=d1d4f9' },
      { name: 'Mia Cá Tính', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MiaArtist&backgroundColor=c0aede' },
      { name: 'Max Gamer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MaxPlayer&backgroundColor=ffdfbf' },
      { name: 'Luna Xinh Đẹp', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LunaStar&backgroundColor=ffd5dc' }
    ]
  }
];

let activePresetCategory = 'official';

function compressAndResizeAvatar(file, maxDimension = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = function (e) {
      const img = new Image();
      img.onerror = reject;
      img.onload = function () {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let resultDataUrl = '';
        try {
          resultDataUrl = canvas.toDataURL('image/webp', quality);
          if (!resultDataUrl || !resultDataUrl.startsWith('data:image/webp')) {
            resultDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch (err) {
          resultDataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(resultDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function updateAllAvatarUIs(avatarUrl) {
  if (!currentUser) currentUser = getUser() || {};
  currentUser.avatar = avatarUrl;
  currentUser.avatar_url = avatarUrl;
  const uid = currentUser.id || currentUser._id || currentUser.email;
  if (uid) {
    localStorage.setItem(`avatar_${uid}`, avatarUrl);
    localStorage.setItem(`ap_avatar_${uid}`, avatarUrl);
  }
  localStorage.setItem('user_avatar', avatarUrl);
  localStorage.setItem('ap_chosen_avatar', avatarUrl);
  try {
    localStorage.setItem('cinestream_user', JSON.stringify(currentUser));
  } catch (e) { }
  if (typeof authService !== 'undefined') {
    if (authService.currentUser) {
      authService.currentUser.avatar = avatarUrl;
      authService.currentUser.avatar_url = avatarUrl;
    }
    if (typeof authService.saveUser === 'function') {
      authService.saveUser(currentUser);
    }
  }

  // 1. Cập nhật tức thì tất cả các thẻ hình avatar trên toàn bộ Header, Top Nav, Mobile Drawer & Dock
  document.querySelectorAll('.ap-user-bar-trigger img, .nav-profile-dropdown img, #authContainer img, #sofa-header img.user-avatar, .bottom-nav-dock img, .mm-avatar-wrap img, .current-user-avatar img, #sidebarAvatarWrap img').forEach(img => {
    img.src = avatarUrl;
    img.style.display = 'block';
  });

  // 2. Cập nhật Sidebar bên trái nếu có
  if (typeof initSidebar === 'function') initSidebar();

  // 3. Cập nhật Panel bên phải
  const rightAvatarEl = document.querySelector('.avatar-panel .avatar-large');
  if (rightAvatarEl) {
    const letter = (currentUser.displayName || currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
    const frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(currentUser) : { type: 'none', value: '' };
    const innerContent = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.outerHTML='<span style=\\'font-size:28px;font-weight:900;color:#1a1000;\\'>${letter}</span>'">`;
    rightAvatarEl.innerHTML = typeof renderAvatarWithFrame === 'function' ? renderAvatarWithFrame(innerContent, 68, frameInfo) : innerContent;
  }

  // 4. Header, Mobile drawer & Bottom Dock UI
  if (typeof updateUserUI === 'function') updateUserUI();
  if (typeof updateMobileMenuUser === 'function') updateMobileMenuUser();
  if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
  if (typeof rebuildBottomNav === 'function') rebuildBottomNav();

  // 5. Phát tín hiệu realtime toàn hệ thống và các tab
  try {
    window.dispatchEvent(new CustomEvent('ap:user-updated', { detail: currentUser }));
    window.dispatchEvent(new CustomEvent('auth:profileUpdated', { detail: currentUser }));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('ap_user_sync');
      bc.postMessage({ type: 'avatar_updated', userId: uid, avatar: avatarUrl });
      bc.close();
      const bc2 = new BroadcastChannel('aphim_cloud_sync_bus');
      bc2.postMessage({ type: 'cloud_data_synced', userId: uid, timestamp: Date.now() });
      bc2.close();
    }
  } catch (e) { }

  // 6. Đồng bộ vĩnh viễn vào Database Backend & Cloud Supabase
  try {
    if (typeof authService !== 'undefined' && typeof authService.updateProfile === 'function') {
      authService.updateProfile({ avatar: avatarUrl, avatar_url: avatarUrl }).then(res => {
        console.log('[AvatarSync] ✅ Avatar synced to cloud profile:', res);
      }).catch(e => console.warn('[AuthService] update error:', e));
    }
    if (typeof avatarService !== 'undefined' && uid) {
      avatarService.saveAvatar(uid, avatarUrl).catch(e => console.warn('[AvatarService] save error:', e));
    }
  } catch (e) { }
}

async function handleAvatarFileSelected(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    if (typeof showToast === 'function') showToast('⚠️ Vui lòng chọn file hình ảnh hợp lệ (jpg, png, webp...)', 'warning');
    else alert('Vui lòng chọn file hình ảnh hợp lệ!');
    return;
  }

  if (typeof showToast === 'function') {
    showToast('⏳ Đang tối ưu & xử lý hình ảnh...', 'info');
  }

  try {
    // Nén ảnh siêu nhẹ (< 30KB) trước khi lưu vào Data & Cloud
    const compressedDataUrl = await compressAndResizeAvatar(file, 320, 0.85);
    updateAllAvatarUIs(compressedDataUrl);
    if (typeof showToast === 'function') {
      showToast('✅ Đã tải ảnh lên & đồng bộ Realtime thành công!', 'success');
    } else {
      alert('Đã tải ảnh lên & đồng bộ Realtime thành công!');
    }
  } catch (err) {
    console.error('[AvatarUpload] Error:', err);
    // Fallback nếu nén bị lỗi
    const reader = new FileReader();
    reader.onload = function (e) {
      updateAllAvatarUIs(e.target.result);
      if (typeof showToast === 'function') showToast('✅ Đã cập nhật ảnh đại diện!', 'success');
    };
    reader.readAsDataURL(file);
  }
}

function openPresetAvatarModal() {
  let modal = document.getElementById('presetAvatarModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'presetAvatarModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    modal.onclick = function (e) {
      if (e.target === modal) closePresetAvatarModal();
    };
    document.body.appendChild(modal);
  }

  const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (typeof getUser === 'function' ? getUser() : {});
  const currentAvatar = u.avatar || localStorage.getItem('user_avatar') || '';

  let tabsHtml = PRESET_AVATAR_CATEGORIES.map(cat => `
          <button class="preset-tab-btn ${cat.id === activePresetCategory ? 'active' : ''}" onclick="switchPresetCategory('${cat.id}')" style="padding:7px 13px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid ${cat.id === activePresetCategory ? '#f59e0b' : 'rgba(255,255,255,0.1)'};background:${cat.id === activePresetCategory ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.08))' : 'rgba(255,255,255,0.04)'};color:${cat.id === activePresetCategory ? '#fcd576' : '#94a3b8'};cursor:pointer;white-space:nowrap;transition:all 0.2s ease;flex-shrink:0;">
            ${cat.name}
          </button>
        `).join('');

  const currentCat = PRESET_AVATAR_CATEGORIES.find(c => c.id === activePresetCategory) || PRESET_AVATAR_CATEGORIES[0];
  let itemsHtml = currentCat.avatars.map(av => {
    const isEquipped = (currentAvatar === av.url);
    return `
            <div class="preset-avatar-card" onclick="selectPresetAvatar('${av.url}', '${av.name.replace(/'/g, "\\'")}')" style="position:relative;display:flex;flex-direction:column;align-items:center;padding:10px 6px;border-radius:14px;background:rgba(255,255,255,0.03);border:1.5px solid ${isEquipped ? '#22c55e' : 'rgba(255,255,255,0.08)'};cursor:pointer;transition:all 0.2s ease;text-align:center;">
              <div style="position:relative;width:56px;height:56px;border-radius:50%;overflow:hidden;background:#1e293b;box-shadow:0 4px 12px rgba(0,0,0,0.3);margin-bottom:6px;border:2px solid ${isEquipped ? '#22c55e' : 'rgba(255,255,255,0.15)'};">
                <img src="${av.url}" alt="${av.name}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">
              </div>
              <div class="preset-avatar-name" style="font-size:11px;font-weight:700;color:${isEquipped ? '#4ade80' : '#e2e8f0'};max-width:85px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${av.name}">${av.name}</div>
              ${isEquipped ? '<div style="position:absolute;top:4px;right:4px;background:#22c55e;color:#0b1d11;font-size:8.5px;font-weight:900;padding:2px 4px;border-radius:5px;">✓ Đang dùng</div>' : ''}
            </div>
          `;
  }).join('');

  modal.innerHTML = `
          <div class="preset-modal-content" style="background:#0f172a;border:1px solid rgba(255,255,255,0.12);border-radius:20px;width:100%;max-width:540px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.7);overflow:hidden;position:relative;">
            <div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.02);">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg, #f59e0b, #d97706);display:flex;align-items:center;justify-content:center;color:#111;flex-shrink:0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                </div>
                <div>
                  <div class="preset-modal-title" style="font-size:15px;font-weight:900;color:#f8fafc;letter-spacing:-0.02em;">Kho Ảnh Đại Diện APhim</div>
                  <div class="preset-modal-sub" style="font-size:11.5px;color:#94a3b8;">Chọn ảnh đại diện có sẵn độc quyền trên hệ thống</div>
                </div>
              </div>
              <button class="preset-modal-close-btn" onclick="closePresetAvatarModal()" style="background:rgba(255,255,255,0.06);border:none;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Categories Tab bar -->
            <div style="padding:10px 14px;display:flex;gap:6px;overflow-x:auto;border-bottom:1px solid rgba(255,255,255,0.06);scrollbar-width:none;-webkit-overflow-scrolling:touch;">
              ${tabsHtml}
            </div>

            <!-- Avatars Grid -->
            <div style="padding:14px 16px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(95px, 1fr));gap:10px;max-height:48vh;-webkit-overflow-scrolling:touch;">
              ${itemsHtml}
            </div>

            <!-- Footer -->
            <div class="preset-modal-footer" style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:nowrap;">
              <div class="preset-footer-sync" style="font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style="font-weight:600;">Đồng bộ Realtime</span>
              </div>
              <button class="preset-btn-upload-custom" onclick="document.getElementById('avatarFileInput').click();closePresetAvatarModal();" style="background:linear-gradient(135deg, #2563eb, #1d4ed8);border:none;color:#ffffff;padding:7px 13px;border-radius:9px;font-size:11.5px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;box-shadow:0 2px 8px rgba(37,99,235,0.35);">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Tải ảnh từ máy</span>
              </button>
            </div>
          </div>
        `;
  modal.style.display = 'flex';
}

function closePresetAvatarModal() {
  const modal = document.getElementById('presetAvatarModal');
  if (modal) modal.style.display = 'none';
}

function switchPresetCategory(catId) {
  activePresetCategory = catId;
  openPresetAvatarModal();
}

async function selectPresetAvatar(url, name) {
  closePresetAvatarModal();
  updateAllAvatarUIs(url);
  if (typeof showToast === 'function') {
    showToast(`✨ Đã chọn ảnh đại diện: ${name}!`, 'success');
  } else {
    alert(`Đã chọn ảnh đại diện: ${name}!`);
  }
}

function useTestLogoAvatar() {
  openPresetAvatarModal();
}

function isReservedAdminName(name) {
  if (!name || typeof name !== 'string') return false;
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const reservedTerms = [
    'admin', 'administrator', 'superadmin', 'super admin', 'quan tri',
    'quan tri vien', 'ban quan tri', 'bqt', 'moderator', 'mod aphim',
    'aphim mod', 'he thong', 'system', 'support aphim', 'aphim support',
    'aphim official', 'developer', 'dev aphim'
  ];

  for (const term of reservedTerms) {
    const regex = new RegExp(`(^|\\s)${term.replace(/\\s+/g, '\\s+')}(\\s|$)`, 'i');
    if (regex.test(normalized) || regex.test(name.toLowerCase())) {
      return true;
    }
    if (['admin', 'administrator', 'superadmin', 'quan tri vien', 'ban quan tri'].includes(term)) {
      if (normalized.includes(term.replace(/\s+/g, ' '))) {
        return true;
      }
    }
  }
  return false;
}

function saveAccount() {
  const nameInput = document.getElementById('accDisplayName');
  const bioInput = document.getElementById('accBio');
  const phoneInput = document.getElementById('accPhone');
  const bdayInput = document.getElementById('accBirthday');
  const newName = (nameInput ? nameInput.value.trim() : '') || 'Người dùng';

  if (!currentUser) currentUser = getUser() || {};

  // Chặn người dùng thường đặt tên có chứa danh xưng đặc quyền của Admin/BQT
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'admin@aphim.io.vn';
  if (!isAdmin && isReservedAdminName(newName)) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Tên hiển thị chứa danh xưng đặc quyền của Admin (Admin, Quản trị viên, BQT...). Vui lòng chọn tên khác!', 'error');
    } else {
      alert('Tên hiển thị chứa danh xưng đặc quyền của Admin (Admin, Quản trị viên, BQT...). Vui lòng chọn tên khác!');
    }
    if (nameInput) {
      nameInput.value = currentUser.displayName || currentUser.name || '';
      nameInput.focus();
    }
    return;
  }

  currentUser.displayName = newName;
  currentUser.name = newName;
  currentUser.fullName = newName;
  if (bioInput) currentUser.bio = bioInput.value;
  if (phoneInput) currentUser.phone = phoneInput.value.trim();
  if (bdayInput) currentUser.birthday = bdayInput.value;

  const genderInput = document.querySelector('input[name="gender"]:checked') || document.querySelector('input[name="accGender"]:checked');
  if (genderInput) currentUser.gender = genderInput.value;

  try {
    localStorage.setItem('cinestream_user', JSON.stringify(currentUser));
  } catch (e) { }

  // Đồng bộ AuthService và persistent cookies
  if (typeof authService !== 'undefined') {
    if (authService.currentUser) {
      authService.currentUser.displayName = newName;
      authService.currentUser.name = newName;
      authService.currentUser.fullName = newName;
      if (currentUser.bio) authService.currentUser.bio = currentUser.bio;
      if (currentUser.gender) authService.currentUser.gender = currentUser.gender;
      if (currentUser.phone) authService.currentUser.phone = currentUser.phone;
      if (currentUser.birthday) authService.currentUser.birthday = currentUser.birthday;
    }
    if (typeof authService.saveUser === 'function') {
      authService.saveUser(currentUser);
    } else {
      authService.currentUser = currentUser;
    }
    if (typeof authService.updateProfile === 'function') {
      authService.updateProfile({
        displayName: newName,
        name: newName,
        fullName: newName,
        bio: currentUser.bio,
        gender: currentUser.gender,
        phone: currentUser.phone,
        birthday: currentUser.birthday
      });
    }
  }

  // 1. Cập nhật Sidebar bên trái
  initSidebar();

  // 2. Cập nhật Panel bên phải
  const rightNameEl = document.querySelector('.avatar-panel .avatar-label');
  if (rightNameEl) {
    rightNameEl.textContent = newName;
    if (typeof applyEquippedNameColor === 'function') applyEquippedNameColor(rightNameEl, currentUser);
  }
  const rightAvatarEl = document.querySelector('.avatar-panel .avatar-large');
  if (rightAvatarEl && !currentUser.avatar) {
    const letter = newName.charAt(0).toUpperCase();
    const frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(currentUser) : { type: 'none', value: '' };
    rightAvatarEl.innerHTML = typeof renderAvatarWithFrame === 'function' ? renderAvatarWithFrame(letter, 68, frameInfo) : letter;
  }

  // 3. Cập nhật Header trên cùng (vẽ lại toàn bộ đầy đủ)
  if (typeof updateUserUI === 'function') {
    updateUserUI();
  }

  // 4. Cập nhật Mobile menu drawer
  if (typeof rebuildMobileMenu === 'function') {
    rebuildMobileMenu();
  }

  if (typeof showToast === 'function') {
    showToast('🎉 Thông tin cá nhân đã được lưu thành công!', 'success');
  } else {
    alert('🎉 Thông tin cá nhân đã được lưu thành công!');
  }
}

function setQuality(key) {
  localStorage.setItem('ap_setting_quality', key);
  switchTab('settings');
}

function toggleSettingSwitch(checkbox, storageKey) {
  const isChecked = checkbox.checked;
  localStorage.setItem(storageKey, isChecked ? 'true' : 'false');
  const track = checkbox.nextElementSibling;
  if (track) {
    const knob = track.querySelector('.setting-toggle-knob');
    if (isChecked) {
      track.style.backgroundColor = '#22c55e';
      if (knob) knob.style.transform = 'translateX(18px)';
    } else {
      track.style.backgroundColor = '#374151';
      if (knob) knob.style.transform = 'translateX(0px)';
    }
  }
}

function initToggles() { }

function doLogout() {
  if (typeof authService !== 'undefined') authService.logout();
  else { localStorage.removeItem('cinestream_user'); localStorage.removeItem('cinestream_token'); }
  window.location.href = '/';
}

// ─── INITIALIZATION ───
document.addEventListener('DOMContentLoaded', function () {
  const tryInit = () => {
    initSidebar();
    currentUser = getUser();
    if (currentUser && typeof updateUserUI === 'function') {
      updateUserUI();
    }
  };
  tryInit();
  setTimeout(tryInit, 500);
  setTimeout(tryInit, 1500);

  const urlParams = new URLSearchParams(window.location.search);
  let savedTab = null;
  try { savedTab = sessionStorage.getItem('aphim_active_profile_tab'); } catch (e) { }
  let tab = urlParams.get('tab');
  const path = window.location.pathname.toLowerCase();
  if (!tab) {
    if (path.includes('lich-su')) tab = 'history';
    else if (path.includes('yeu-thich')) tab = 'favorites';
    else if (path.includes('watchlist') || path.includes('xem-sau')) tab = 'watchlist';
    else if (path.includes('cinema') || path.includes('rap-phim')) tab = 'cinema';
    else if (path.includes('thanh-tuu')) tab = 'achievements';
    else if (path.includes('cua-hang') || path.includes('shop')) tab = 'shop';
    else if (path.includes('cai-dat')) tab = 'settings';
    else if (savedTab) tab = savedTab;
    else tab = 'account';
  }
  switchTab(tab);

  // ─── REALTIME CLOUD SYNC LISTENERS ───
  const refreshProfileState = () => {
    currentUser = getUser();
    initSidebar();
    if (typeof renderTab === 'function') renderTab(currentTab);
  };
  window.addEventListener('auth:profileSynced', refreshProfileState);
  window.addEventListener('auth:profileUpdated', refreshProfileState);
  window.addEventListener('ap:user-updated', refreshProfileState);
});

// ─── LEGACY COMPATIBILITY ───
window.switchProfileTab = (tab) => switchTab(tab);
window.selectQualitySetting = setQuality;
window.toggleSettingSwitch = toggleSettingSwitch;
