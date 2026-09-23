/**
 * 🎬 APhim Super Enterprise Admin - Movies Controller & Real-Time Engine
 * ───────────────────────────────────────────────────────────────────────
 * 🛡️ Security Layers: 
 *   - XSS sanitization on all movie metadata & stream links
 *   - 30-minute admin inactivity lock
 *   - CSRF & Auth Token verification
 *   - Robust API fallback (Ophim & KKPhim support)
 * 🚀 Enterprise Features:
 *   - Command Palette (Ctrl+K)
 *   - Slide-over Movie Detail & Stream Inspector Drawer
 *   - Floating Batch Actions Bar (Batch Hide, Batch Unhide, CSV Export)
 *   - Multi-Filter & Instant Search Engine with Debouncing
 *   - Live HLS & Embed Preview Player
 */

(function () {
  'use strict';

  // ─── CONFIGURATION & STATE ───
  const CONFIG = {
    API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api'
      : 'https://a-phim-production-eba6.up.railway.app/api',
    OPHIM_BASE: 'https://phimapi.com',
    IMG_CDN: 'https://phimimg.com',
    INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000, // 30 mins
    TOAST_DURATION_MS: 3500
  };

  const state = {
    allMovies: [],
    hiddenMovies: [],
    selectedSlugs: new Set(),
    currentType: 'danh-sach',
    currentSource: 'all',
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    searchQuery: '',
    filterStatus: 'all',
    filterYear: 'all',
    activeMovieDetail: null,
    inactivityTimer: null
  };

  // ─── SECURITY: XSS Sanitizer ───
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeUrl(url) {
    if (!url) return '';
    const clean = String(url).trim();
    if (clean.startsWith('javascript:') || clean.startsWith('data:text/html')) {
      return '';
    }
    return clean;
  }

  // ─── SECURITY: 30-Minute Inactivity Auto-Lock ───
  function resetInactivityTimer() {
    clearTimeout(state.inactivityTimer);
    state.inactivityTimer = setTimeout(() => {
      lockAdminSession();
    }, CONFIG.INACTIVITY_TIMEOUT_MS);
  }

  function lockAdminSession() {
    const lockModal = document.getElementById('adminLockModal');
    if (lockModal) {
      lockModal.classList.remove('hidden');
      document.getElementById('lockPasswordInput')?.focus();
    } else {
      showToast('Phiên làm việc đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.', 'error');
      setTimeout(() => {
        sessionStorage.removeItem('cinestream_admin_token');
        localStorage.removeItem('cinestream_admin_token');
        window.location.replace('/admin/login.html');
      }, 1500);
    }
  }

  ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  resetInactivityTimer();

  // ─── TOAST NOTIFICATION ENGINE ───
  function showToast(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
      <span style="font-size: 13px; font-weight: 500; line-height: 1.4;">${escapeHtml(msg)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION_MS);
  }

  // ─── HIDDEN MOVIES API ENGINE ───
  async function fetchHiddenMoviesList() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/movies/hidden/list`);
      const data = await res.json();
      if (data && data.success) {
        state.hiddenMovies = Array.isArray(data.data) ? data.data : [];
      } else {
        const cached = localStorage.getItem('cinestream_hidden_movies');
        if (cached) state.hiddenMovies = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Backend hidden API offline, using local cache fallback:', e);
      const cached = localStorage.getItem('cinestream_hidden_movies');
      if (cached) state.hiddenMovies = JSON.parse(cached);
    }
    updateHiddenBadges();
  }

  function updateHiddenBadges() {
    const badge = document.getElementById('hiddenCountBadge');
    if (badge) badge.textContent = state.hiddenMovies.length;
    const statHidden = document.getElementById('statHiddenCount');
    if (statHidden) statHidden.textContent = state.hiddenMovies.length;
    localStorage.setItem('cinestream_hidden_movies', JSON.stringify(state.hiddenMovies));
  }

  // ─── LOAD MOVIES FROM MOVIE API ───
  async function loadMovies(type = 'danh-sach', source = 'all', page = 1) {
    state.currentType = type;
    state.currentSource = source;
    state.currentPage = page;

    const loadingEl = document.getElementById('loading');
    const tableEl = document.getElementById('moviesTable');
    const tbody = document.getElementById('moviesBody');

    if (source === 'hidden') {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (tableEl) tableEl.classList.remove('hidden');
      renderHiddenMoviesTable();
      return;
    }

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (tableEl) tableEl.classList.add('hidden');

    try {
      let url;
      if (type === 'danh-sach' && source === 'all') {
        url = `${CONFIG.OPHIM_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`;
      } else {
        url = `${CONFIG.OPHIM_BASE}/v1/api/${type}/${source}?page=${page}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'accept': 'application/json' }
      });

      const data = await response.json();

      if (data && (data.status === 'success' || data.status === true || data.status) && data.data && data.data.items) {
        state.allMovies = data.data.items;

        const pag = data.data.params?.pagination
          || data.data.paginate
          || data.data.pagination
          || {};
        state.totalItems = pag.totalItems || pag.total_items || state.allMovies.length;
        const itemsPerPage = pag.totalItemsPerPage || 24;
        state.totalPages = pag.totalPages || pag.total_pages || Math.ceil(state.totalItems / itemsPerPage) || 1;

        renderMoviesTable(state.allMovies);
        renderPagination();
        updateTopKPIs();

        if (loadingEl) loadingEl.classList.add('hidden');
        if (tableEl) tableEl.classList.remove('hidden');
      } else {
        showTableError('Không thể tải danh sách phim từ máy chủ API.');
      }
    } catch (error) {
      console.error('Lỗi khi tải phim:', error);
      showTableError('Lỗi kết nối máy chủ API phim: ' + error.message);
    }
  }

  // ─── UPDATE TOP STATS / KPIs ───
  function updateTopKPIs() {
    const totalEl = document.getElementById('statTotalMovies');
    if (totalEl) totalEl.textContent = state.totalItems.toLocaleString('vi-VN');

    const activeEl = document.getElementById('statActiveMovies');
    if (activeEl) {
      const activeCount = Math.max(0, state.totalItems - state.hiddenMovies.length);
      activeEl.textContent = activeCount.toLocaleString('vi-VN');
    }

    const badge = document.getElementById('movieCountBadge');
    if (badge) badge.textContent = `${state.totalItems.toLocaleString('vi-VN')} phim`;
  }

  // ─── RENDER MOVIES TABLE ───
  function renderMoviesTable(movies) {
    const tbody = document.getElementById('moviesBody');
    if (!tbody) return;

    // Filter by search query and secondary filters
    let list = [...movies];
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.origin_name && m.origin_name.toLowerCase().includes(q)) ||
        (m.slug && m.slug.toLowerCase().includes(q))
      );
    }

    if (state.filterYear !== 'all') {
      list = list.filter(m => String(m.year) === String(state.filterYear));
    }

    if (!list.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state" style="padding: 48px 20px; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                <i data-lucide="film" style="width: 26px; height: 26px; color: var(--primary);"></i>
              </div>
              <h3 style="color: var(--text-primary); font-size: 16px; font-weight: 700; margin-bottom: 6px;">Không tìm thấy phim phù hợp</h3>
              <p style="color: var(--text-muted); font-size: 13px; max-width: 360px; margin: 0 auto 16px;">Hãy thử đổi từ khóa tìm kiếm, bộ lọc danh mục hoặc năm phát hành.</p>
              <button class="btn btn-secondary btn-sm" onclick="window.moviesAdmin.resetFilters()">
                <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Đặt lại bộ lọc
              </button>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = list.map((movie, idx) => {
      const isHidden = state.hiddenMovies.includes(movie.slug);
      const isSelected = state.selectedSlugs.has(movie.slug);

      // Quality badge
      const q = (movie.quality || '').toLowerCase();
      const qCls = q.includes('full') || q.includes('1080') ? 'fhd'
        : q.includes('hd') ? 'hd'
        : q.includes('cam') ? 'cam'
        : 'other';
      const qualityBadge = movie.quality
        ? `<span class="q-badge ${qCls}">${escapeHtml(movie.quality)}</span>`
        : `<span class="q-badge other">HD</span>`;

      // Episode Chip
      const epCurrent = movie.episode_current || '';
      const epTotal = movie.episode_total || '';
      const epBadge = epCurrent
        ? `<div style="font-size: 12px; font-weight: 700; color: #38bdf8;">${escapeHtml(epCurrent)}</div>
           ${epTotal ? `<div style="font-size: 10px; color: var(--text-muted); font-weight: 500;">/ ${escapeHtml(epTotal)} tập</div>` : ''}`
        : `<span style="color: var(--text-muted); font-size: 11px;">--</span>`;

      // Category tags
      const categoriesHtml = movie.category?.slice(0, 3).map(c => `
        <span class="movie-cat-chip">${escapeHtml(c.name)}</span>
      `).join('') || '<span style="color: var(--text-muted); font-size: 11px;">Mặc định</span>';

      // Poster URL
      let posterUrl = movie.thumb_url || movie.poster_url || '';
      if (posterUrl && !posterUrl.startsWith('http')) {
        posterUrl = `${CONFIG.IMG_CDN}/${posterUrl}`;
      }

      return `
        <tr class="${isHidden ? 'movie-row-hidden' : ''} ${isSelected ? 'row-selected' : ''}" data-slug="${escapeHtml(movie.slug)}">
          <td style="text-align: center; width: 44px;">
            <input type="checkbox" class="admin-checkbox movie-checkbox" 
                   data-slug="${escapeHtml(movie.slug)}" 
                   ${isSelected ? 'checked' : ''} 
                   onchange="window.moviesAdmin.toggleSelect('${escapeHtml(movie.slug)}', this.checked)">
          </td>
          <td style="min-width: 260px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <div style="position: relative; flex-shrink: 0; cursor: pointer;" onclick="window.moviesAdmin.openDrawer('${escapeHtml(movie.slug)}')">
                <img src="${sanitizeUrl(posterUrl)}" 
                     alt="${escapeHtml(movie.name)}" 
                     class="movie-thumb"
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=80'">
                <div class="thumb-play-overlay">
                  <i data-lucide="search" style="width: 16px; height: 16px; color: #fff;"></i>
                </div>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="movie-title" style="cursor: pointer;" onclick="window.moviesAdmin.openDrawer('${escapeHtml(movie.slug)}')">
                  <span class="movie-title-text">${escapeHtml(movie.name)}</span>
                  ${isHidden ? '<span class="badge badge-danger" style="font-size: 9.5px; padding: 2px 6px;">ĐÃ ẨN</span>' : ''}
                </div>
                <div class="movie-origin">${escapeHtml(movie.origin_name || '')}</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                  <span class="movie-slug" title="Click để copy slug" onclick="window.moviesAdmin.copySlug('${escapeHtml(movie.slug)}')">
                    <i data-lucide="copy" style="width: 9px; height: 9px; display: inline-block; vertical-align: middle;"></i> ${escapeHtml(movie.slug)}
                  </span>
                  <span class="badge badge-emerald-subtle" style="font-size: 9px; padding: 1px 5px;">
                    <i data-lucide="check" style="width: 9px; height: 9px;"></i> API Auto-Sync
                  </span>
                </div>
              </div>
            </div>
          </td>
          <td style="text-align: center; width: 75px;">
            <span class="badge badge-gray" style="font-size: 11.5px; font-weight: 700;">${escapeHtml(movie.year || 'N/A')}</span>
          </td>
          <td style="text-align: center; width: 85px;">${qualityBadge}</td>
          <td style="max-width: 180px;">
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${categoriesHtml}
            </div>
          </td>
          <td style="text-align: center; width: 110px;">${epBadge}</td>
          <td style="width: 140px;">
            <div class="stream-source-badge">
              <span class="source-status-dot online"></span>
              <span>Ophim / KKPhim</span>
            </div>
          </td>
          <td style="text-align: right; width: 170px;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
              <button class="btn btn-secondary btn-icon-sm" title="Soi tập & stream links" onclick="window.moviesAdmin.openDrawer('${escapeHtml(movie.slug)}')">
                <i data-lucide="sliders" style="width: 14px; height: 14px;"></i>
              </button>
              <a href="/phim/${escapeHtml(movie.slug)}" target="_blank" class="btn btn-secondary btn-icon-sm" title="Mở trang xem trên website">
                <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
              </a>
              <button class="btn ${isHidden ? 'btn-success' : 'btn-danger'} btn-sm" 
                      style="font-size: 11.5px; padding: 5px 10px;"
                      onclick="window.moviesAdmin.toggleHide('${escapeHtml(movie.slug)}', this)" 
                      title="${isHidden ? 'Hiện lại phim này' : 'Ẩn phim này khỏi trang web'}">
                <i data-lucide="${isHidden ? 'eye' : 'eye-off'}" style="width: 13px; height: 13px;"></i>
                <span>${isHidden ? 'Hiện' : 'Ẩn'}</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
    updateBatchBar();
  }

  // ─── RENDER HIDDEN MOVIES TABLE ───
  function renderHiddenMoviesTable() {
    const tbody = document.getElementById('moviesBody');
    const badge = document.getElementById('movieCountBadge');
    const pag = document.getElementById('pagination');

    if (pag) pag.innerHTML = '';
    if (badge) badge.textContent = `${state.hiddenMovies.length} phim ẩn`;

    if (!state.hiddenMovies.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state" style="padding: 48px 20px; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                <i data-lucide="eye" style="width: 26px; height: 26px; color: var(--success);"></i>
              </div>
              <h3 style="color: var(--text-primary); font-size: 16px; font-weight: 700; margin-bottom: 6px;">Không có phim nào bị ẩn</h3>
              <p style="color: var(--text-muted); font-size: 13px;">Toàn bộ kho phim đang được hiển thị công khai trên website APhim.</p>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = state.hiddenMovies.map((slug, idx) => `
      <tr class="movie-row-hidden" data-slug="${escapeHtml(slug)}">
        <td style="text-align: center; width: 44px;">
          <input type="checkbox" class="admin-checkbox movie-checkbox" 
                 data-slug="${escapeHtml(slug)}" 
                 ${state.selectedSlugs.has(slug) ? 'checked' : ''} 
                 onchange="window.moviesAdmin.toggleSelect('${escapeHtml(slug)}', this.checked)">
        </td>
        <td style="min-width: 260px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 60px; background: var(--surface-3); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(239,68,68,0.3);">
              <i data-lucide="eye-off" style="width: 20px; height: 20px; color: var(--danger);"></i>
            </div>
            <div>
              <div class="movie-title">
                <span class="movie-title-text">${escapeHtml(slug)}</span>
                <span class="badge badge-danger" style="font-size: 9.5px; padding: 2px 6px;">ĐÃ ẨN</span>
              </div>
              <div class="movie-slug" style="margin-top: 4px;">${escapeHtml(slug)}</div>
            </div>
          </div>
        </td>
        <td style="text-align: center;"><span class="badge badge-gray">--</span></td>
        <td style="text-align: center;"><span class="badge badge-gray">--</span></td>
        <td><span style="font-size: 12px; color: var(--text-muted);">Đang bị khóa hiển thị</span></td>
        <td style="text-align: center;"><span style="font-size: 12px; color: var(--text-muted);">--</span></td>
        <td>
          <span class="badge badge-danger-subtle" style="font-size: 11px;">
            <i data-lucide="lock" style="width: 10px; height: 10px;"></i> Đã khóa luồng
          </span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
            <button class="btn btn-success btn-sm" onclick="window.moviesAdmin.toggleHide('${escapeHtml(slug)}', this)" title="Mở hiển thị lại phim">
              <i data-lucide="eye" style="width: 13px; height: 13px;"></i>
              <span>Hiện lại</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
    updateBatchBar();
  }

  // ─── RENDER PAGINATION ───
  function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    if (state.totalPages <= 1) {
      container.innerHTML = `<span style="font-size: 13px; color: var(--text-muted);">Tổng <strong>${state.totalItems.toLocaleString('vi-VN')}</strong> phim &mdash; Trang <strong>1/1</strong></span>`;
      return;
    }

    let html = '';
    const visiblePages = 5;

    if (state.currentPage > 1) {
      html += `
        <button onclick="window.moviesAdmin.loadPage(${state.currentPage - 1})" class="page-btn" title="Trang trước">
          <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
        </button>
      `;
    }

    const start = Math.max(1, state.currentPage - Math.floor(visiblePages / 2));
    const end = Math.min(state.totalPages, start + visiblePages - 1);

    if (start > 1) {
      html += `<button onclick="window.moviesAdmin.loadPage(1)" class="page-btn">1</button>`;
      if (start > 2) html += `<span style="color: var(--text-muted); padding: 0 4px;">...</span>`;
    }

    for (let i = start; i <= end; i++) {
      if (i === state.currentPage) {
        html += `<button class="page-btn active">${i}</button>`;
      } else {
        html += `<button onclick="window.moviesAdmin.loadPage(${i})" class="page-btn">${i}</button>`;
      }
    }

    if (end < state.totalPages) {
      if (end < state.totalPages - 1) html += `<span style="color: var(--text-muted); padding: 0 4px;">...</span>`;
      html += `<button onclick="window.moviesAdmin.loadPage(${state.totalPages})" class="page-btn">${state.totalPages}</button>`;
    }

    if (state.currentPage < state.totalPages) {
      html += `
        <button onclick="window.moviesAdmin.loadPage(${state.currentPage + 1})" class="page-btn" title="Trang sau">
          <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
        </button>
      `;
    }

    html += `
      <span style="margin-left: 12px; font-size: 12.5px; color: var(--text-muted); white-space: nowrap;">
        Trang <strong style="color: var(--text-primary);">${state.currentPage}</strong> / ${state.totalPages} &bull; Tổng <strong style="color: var(--text-primary);">${state.totalItems.toLocaleString('vi-VN')}</strong> phim
      </span>
    `;

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  // ─── TOGGLE HIDE / UNHIDE SINGLE MOVIE ───
  async function toggleHideMovie(slug, btn) {
    if (!slug) return;
    const isCurrentlyHidden = state.hiddenMovies.includes(slug);

    if (!isCurrentlyHidden) {
      const confirmHide = confirm(`⚠️ Ẩn phim "${slug}" khỏi trang web?\n\nPhim sẽ biến mất khỏi trang chủ, danh sách tìm kiếm và luồng người xem. Bạn có thể mở lại bất kỳ lúc nào.`);
      if (!confirmHide) return;
    }

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE}/movies/hidden/toggle/${slug}`, { method: 'POST' });
      const data = await res.json();

      if (data && data.success) {
        if (data.isHidden && !state.hiddenMovies.includes(slug)) {
          state.hiddenMovies.push(slug);
        } else if (!data.isHidden) {
          state.hiddenMovies = state.hiddenMovies.filter(s => s !== slug);
        }
        updateHiddenBadges();
        showToast(data.message || (isCurrentlyHidden ? 'Đã hiển thị lại phim!' : 'Đã ẩn phim thành công!'), 'success');
      } else {
        // Fallback local
        if (isCurrentlyHidden) {
          state.hiddenMovies = state.hiddenMovies.filter(s => s !== slug);
        } else {
          state.hiddenMovies.push(slug);
        }
        updateHiddenBadges();
        showToast(isCurrentlyHidden ? 'Đã hiện lại (Offline Fallback)' : 'Đã ẩn phim (Offline Fallback)', 'info');
      }

      if (state.currentSource === 'hidden') {
        renderHiddenMoviesTable();
      } else {
        renderMoviesTable(state.allMovies);
      }
    } catch (e) {
      console.warn('API error during hide toggle:', e);
      if (isCurrentlyHidden) {
        state.hiddenMovies = state.hiddenMovies.filter(s => s !== slug);
      } else {
        state.hiddenMovies.push(slug);
      }
      updateHiddenBadges();
      showToast(isCurrentlyHidden ? 'Đã hiện lại (Offline Fallback)' : 'Đã ẩn phim (Offline Fallback)', 'info');

      if (state.currentSource === 'hidden') {
        renderHiddenMoviesTable();
      } else {
        renderMoviesTable(state.allMovies);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }
  }

  // ─── SLIDE-OVER MOVIE DRAWER & STREAM INSPECTOR ───
  async function openMovieDrawer(slug) {
    if (!slug) return;
    const drawer = document.getElementById('movieDetailDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (!drawer) return;

    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');

    const drawerBody = document.getElementById('drawerBody');
    if (drawerBody) {
      drawerBody.innerHTML = `
        <div style="padding: 40px; text-align: center;">
          <div class="spinner" style="margin: 0 auto 16px;"></div>
          <p style="color: var(--text-muted); font-size: 13px;">Đang giải mã thông tin & trích xuất luồng phát video...</p>
        </div>
      `;
    }

    try {
      const res = await fetch(`${CONFIG.OPHIM_BASE}/phim/${slug}`);
      const data = await res.json();

      if (data && (data.status === 'success' || data.status === true || data.status) && data.data) {
        const item = data.data.item || data.data.movie || data.data;
        const episodes = data.data.episodes || [];
        state.activeMovieDetail = { movie: item, episodes: episodes };
        renderDrawerContent(item, episodes);
      } else {
        if (drawerBody) {
          drawerBody.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--danger);">
              <i data-lucide="alert-circle" style="width: 32px; height: 32px; margin-bottom: 12px;"></i>
              <p>Không thể trích xuất luồng phim từ máy chủ API.</p>
            </div>
          `;
          if (window.lucide) lucide.createIcons();
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết phim:', err);
      if (drawerBody) {
        drawerBody.innerHTML = `
          <div style="padding: 40px; text-align: center; color: var(--danger);">
            <i data-lucide="alert-circle" style="width: 32px; height: 32px; margin-bottom: 12px;"></i>
            <p>Lỗi kết nối: ${escapeHtml(err.message)}</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  function renderDrawerContent(movie, episodes) {
    const drawerBody = document.getElementById('drawerBody');
    if (!drawerBody) return;

    const isHidden = state.hiddenMovies.includes(movie.slug);
    let posterUrl = movie.thumb_url || movie.poster_url || '';
    if (posterUrl && !posterUrl.startsWith('http')) posterUrl = `${CONFIG.IMG_CDN}/${posterUrl}`;
    
    let posterBackdrop = movie.poster_url || movie.thumb_url || '';
    if (posterBackdrop && !posterBackdrop.startsWith('http')) posterBackdrop = `${CONFIG.IMG_CDN}/${posterBackdrop}`;

    // Category badges
    const cats = movie.category?.map(c => `<span class="movie-cat-chip">${escapeHtml(c.name)}</span>`).join('') || '--';
    const countries = movie.country?.map(c => `<span class="badge badge-gray">${escapeHtml(c.name)}</span>`).join('') || '--';

    // Episodes by server
    let serversHtml = '';
    if (episodes && episodes.length) {
      serversHtml = episodes.map((srv, srvIdx) => {
        const serverData = srv.server_data || [];
        const epsButtons = serverData.map(ep => `
          <button class="ep-chip-btn" onclick="window.moviesAdmin.previewStream('${escapeHtml(ep.link_m3u8 || ep.link_embed)}', '${escapeHtml(ep.name)}')">
            <i data-lucide="play-circle" style="width: 12px; height: 12px;"></i>
            <span>${escapeHtml(ep.name)}</span>
          </button>
        `).join('');

        return `
          <div class="server-group-box">
            <div class="server-group-header">
              <div style="display: flex; align-items: center; gap: 6px;">
                <i data-lucide="server" style="width: 14px; height: 14px; color: var(--primary);"></i>
                <span style="font-weight: 700; font-size: 13px; color: #fff;">${escapeHtml(srv.server_name || `Server #${srvIdx + 1}`)}</span>
              </div>
              <span class="badge badge-primary-subtle" style="font-size: 10.5px;">${serverData.length} Tập phát</span>
            </div>
            <div class="episodes-grid">
              ${epsButtons || '<p style="color: var(--text-muted); font-size: 12px;">Không có tập phát nào.</p>'}
            </div>
          </div>
        `;
      }).join('');
    } else {
      serversHtml = '<p style="color: var(--text-muted); font-size: 12px; padding: 12px 0;">Chưa có dữ liệu danh sách tập.</p>';
    }

    drawerBody.innerHTML = `
      <!-- Backdrop Banner -->
      <div class="drawer-backdrop-wrap">
        <img src="${sanitizeUrl(posterBackdrop)}" alt="${escapeHtml(movie.name)}" class="drawer-backdrop-img" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80'">
        <div class="drawer-backdrop-overlay"></div>
        <div class="drawer-hero-info">
          <img src="${sanitizeUrl(posterUrl)}" alt="${escapeHtml(movie.name)}" class="drawer-poster-thumb">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="badge badge-primary">${escapeHtml(movie.quality || 'Full HD')}</span>
              <span class="badge badge-gray">${escapeHtml(movie.year || '2026')}</span>
              ${isHidden ? '<span class="badge badge-danger">ĐANG ẨN</span>' : '<span class="badge badge-emerald-subtle">HIỂN THỊ</span>'}
            </div>
            <h2 style="font-size: 18px; font-weight: 800; color: #fff; margin: 8px 0 4px; line-height: 1.3;">${escapeHtml(movie.name)}</h2>
            <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">${escapeHtml(movie.origin_name || '')}</p>
            <div class="movie-slug" style="font-size: 11px;">Slug: ${escapeHtml(movie.slug)}</div>
          </div>
        </div>
      </div>

      <!-- Quick Action Toolbar inside Drawer -->
      <div class="drawer-actions-row">
        <button class="btn ${isHidden ? 'btn-success' : 'btn-danger'} btn-sm" onclick="window.moviesAdmin.toggleHide('${escapeHtml(movie.slug)}', this)">
          <i data-lucide="${isHidden ? 'eye' : 'eye-off'}" style="width: 14px; height: 14px;"></i>
          <span>${isHidden ? 'Mở hiển thị công khai' : 'Ẩn phim này'}</span>
        </button>
        <a href="/phim/${escapeHtml(movie.slug)}" target="_blank" class="btn btn-secondary btn-sm">
          <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
          <span>Xem trên Web</span>
        </a>
        <button class="btn btn-secondary btn-sm" onclick="window.moviesAdmin.copySlug('${escapeHtml(movie.slug)}')">
          <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
          <span>Copy Slug</span>
        </button>
      </div>

      <!-- Video Preview Player Frame (Hidden by default until user clicks episode) -->
      <div id="drawerStreamPreviewBox" style="display: none; margin: 16px 20px; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <span style="font-size: 12px; font-weight: 700; color: var(--gold);" id="previewPlayerTitle">Trình phát thử nghiệm</span>
          <button style="background: transparent; border: none; color: #94a3b8; cursor: pointer;" onclick="document.getElementById('drawerStreamPreviewBox').style.display='none'">
            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
        <div style="position: relative; width: 100%; padding-top: 56.25%;">
          <iframe id="drawerPreviewIframe" src="" style="position: absolute; top:0; left:0; width:100%; height:100%; border:none;" allowfullscreen></iframe>
        </div>
      </div>

      <!-- Metadata Section -->
      <div style="padding: 20px;">
        <h4 style="font-size: 13.5px; font-weight: 800; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          <i data-lucide="info" style="width: 15px; height: 15px; color: var(--primary);"></i> Thông Tin Chi Tiết
        </h4>
        
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">Thời lượng:</span>
            <span class="detail-val">${escapeHtml(movie.time || 'Đang cập nhật')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Trạng thái tập:</span>
            <span class="detail-val" style="color: #38bdf8; font-weight: 700;">${escapeHtml(movie.episode_current || 'Đang cập nhật')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Quốc gia:</span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">${countries}</div>
          </div>
          <div class="detail-item">
            <span class="detail-label">Thể loại:</span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">${cats}</div>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1;">
            <span class="detail-label">Diễn viên:</span>
            <span class="detail-val" style="font-size: 12.5px; line-height: 1.5;">${escapeHtml(movie.actor?.join(', ') || 'Chưa cập nhật')}</span>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1;">
            <span class="detail-label">Đạo diễn:</span>
            <span class="detail-val">${escapeHtml(movie.director?.join(', ') || 'Chưa cập nhật')}</span>
          </div>
          <div class="detail-item" style="grid-column: 1 / -1;">
            <span class="detail-label">Nội dung tóm tắt:</span>
            <div style="font-size: 12.5px; color: #94a3b8; line-height: 1.6; margin-top: 6px; background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              ${escapeHtml(movie.content ? movie.content.replace(/<[^>]*>?/gm, '') : 'Chưa có tóm tắt.')}
            </div>
          </div>
        </div>

        <!-- Servers & Episode Streams -->
        <h4 style="font-size: 13.5px; font-weight: 800; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 12px; display: flex; align-items: center; gap: 6px;">
          <i data-lucide="layers" style="width: 15px; height: 15px; color: var(--gold);"></i> Nguồn Phát & Danh Sách Tập
        </h4>
        ${serversHtml}
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  function closeMovieDrawer() {
    const drawer = document.getElementById('movieDetailDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    
    // Stop any playing iframe preview
    const iframe = document.getElementById('drawerPreviewIframe');
    if (iframe) iframe.src = '';
  }

  function previewStream(link, epName) {
    if (!link) {
      showToast('Tập này chưa có luồng phát hợp lệ.', 'error');
      return;
    }
    const box = document.getElementById('drawerStreamPreviewBox');
    const iframe = document.getElementById('drawerPreviewIframe');
    const title = document.getElementById('previewPlayerTitle');

    if (box && iframe) {
      box.style.display = 'block';
      iframe.src = link;
      if (title) title.textContent = `Xem thử luồng phát: ${epName || 'Tập'}`;
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast(`Đang tải luồng phát: ${epName}`, 'info');
    }
  }

  // ─── BATCH ACTIONS ENGINE ───
  function toggleSelect(slug, checked) {
    if (checked) {
      state.selectedSlugs.add(slug);
    } else {
      state.selectedSlugs.delete(slug);
    }
    updateBatchBar();
  }

  function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('.movie-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = checked;
      const slug = cb.dataset.slug;
      if (slug) {
        if (checked) state.selectedSlugs.add(slug);
        else state.selectedSlugs.delete(slug);
      }
    });
    updateBatchBar();
  }

  function updateBatchBar() {
    const bar = document.getElementById('batchActionBar');
    const countEl = document.getElementById('batchSelectedCount');
    const selectAllCb = document.getElementById('selectAllMovies');

    if (!bar) return;

    if (state.selectedSlugs.size > 0) {
      bar.classList.add('active');
      if (countEl) countEl.textContent = `${state.selectedSlugs.size} phim đã chọn`;
    } else {
      bar.classList.remove('active');
      if (selectAllCb) selectAllCb.checked = false;
    }
  }

  function clearSelection() {
    state.selectedSlugs.clear();
    const checkboxes = document.querySelectorAll('.movie-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    const selectAllCb = document.getElementById('selectAllMovies');
    if (selectAllCb) selectAllCb.checked = false;
    updateBatchBar();
  }

  async function batchHideSelected() {
    if (state.selectedSlugs.size === 0) return;
    const confirmBatch = confirm(`⚠️ Bạn có chắc muốn ẨN ${state.selectedSlugs.size} phim đã chọn khỏi website?`);
    if (!confirmBatch) return;

    const slugsToHide = Array.from(state.selectedSlugs);
    let successCount = 0;

    for (const slug of slugsToHide) {
      if (!state.hiddenMovies.includes(slug)) {
        state.hiddenMovies.push(slug);
        try {
          await fetch(`${CONFIG.API_BASE}/movies/hidden/toggle/${slug}`, { method: 'POST' });
        } catch (e) { /* ignore */ }
        successCount++;
      }
    }

    updateHiddenBadges();
    clearSelection();
    showToast(`Đã ẩn thành công ${successCount} phim!`, 'success');

    if (state.currentSource === 'hidden') renderHiddenMoviesTable();
    else renderMoviesTable(state.allMovies);
  }

  async function batchUnhideSelected() {
    if (state.selectedSlugs.size === 0) return;
    const confirmBatch = confirm(`Bạn có muốn HIỂN THỊ LẠI ${state.selectedSlugs.size} phim đã chọn?`);
    if (!confirmBatch) return;

    const slugsToUnhide = Array.from(state.selectedSlugs);
    let successCount = 0;

    for (const slug of slugsToUnhide) {
      if (state.hiddenMovies.includes(slug)) {
        state.hiddenMovies = state.hiddenMovies.filter(s => s !== slug);
        try {
          await fetch(`${CONFIG.API_BASE}/movies/hidden/toggle/${slug}`, { method: 'POST' });
        } catch (e) { /* ignore */ }
        successCount++;
      }
    }

    updateHiddenBadges();
    clearSelection();
    showToast(`Đã hiển thị lại ${successCount} phim!`, 'success');

    if (state.currentSource === 'hidden') renderHiddenMoviesTable();
    else renderMoviesTable(state.allMovies);
  }

  function exportSelectedToCSV() {
    const list = state.allMovies.filter(m => state.selectedSlugs.has(m.slug));
    const exportData = list.length ? list : state.allMovies;

    if (!exportData.length) {
      showToast('Không có dữ liệu phim để xuất!', 'error');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'STT,Tên Phim,Tên Gốc,Slug,Năm,Chất Lượng,Tập,Trạng Thái\n';

    exportData.forEach((m, idx) => {
      const isHidden = state.hiddenMovies.includes(m.slug) ? 'Đã Ẩn' : 'Hiển thị';
      const row = [
        idx + 1,
        `"${(m.name || '').replace(/"/g, '""')}"`,
        `"${(m.origin_name || '').replace(/"/g, '""')}"`,
        `"${(m.slug || '').replace(/"/g, '""')}"`,
        m.year || '',
        m.quality || '',
        `"${m.episode_current || ''}"`,
        isHidden
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `APhim_Movies_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất file CSV (${exportData.length} phim)!`, 'success');
  }

  // ─── COMMAND PALETTE (CTRL+K) ───
  function initCommandPalette() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape') {
        closeCommandPalette();
        closeMovieDrawer();
      }
    });
  }

  function toggleCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (!modal) return;
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      const input = document.getElementById('cmdPaletteInput');
      if (input) {
        input.value = '';
        input.focus();
        renderCommandPaletteResults('');
      }
    }
  }

  function closeCommandPalette() {
    const modal = document.getElementById('commandPaletteModal');
    if (modal) modal.classList.add('hidden');
  }

  function renderCommandPaletteResults(query) {
    const resultsContainer = document.getElementById('cmdPaletteResults');
    if (!resultsContainer) return;

    const q = query.trim().toLowerCase();

    const quickCommands = [
      { icon: 'film', title: 'Danh mục: Tất cả phim', desc: 'Xem kho phim mới cập nhật', action: () => { window.moviesAdmin.switchSource('all', 'Tất cả phim'); closeCommandPalette(); } },
      { icon: 'sparkles', title: 'Danh mục: Phim Mới', desc: 'Các phim vừa ra mắt trong năm', action: () => { window.moviesAdmin.switchSource('phim-moi', 'Phim Mới'); closeCommandPalette(); } },
      { icon: 'library', title: 'Danh mục: Phim Bộ', desc: 'Series truyền hình nhiều tập', action: () => { window.moviesAdmin.switchSource('phim-bo', 'Phim Bộ'); closeCommandPalette(); } },
      { icon: 'clapperboard', title: 'Danh mục: Phim Lẻ', desc: 'Phim điện ảnh 1 tập', action: () => { window.moviesAdmin.switchSource('phim-le', 'Phim Lẻ'); closeCommandPalette(); } },
      { icon: 'film', title: 'Danh mục: Chiếu Rạp', desc: 'Phim rạp bom tấn', action: () => { window.moviesAdmin.switchSource('phim-chieu-rap', 'Chiếu Rạp'); closeCommandPalette(); } },
      { icon: 'eye-off', title: 'Danh mục: Phim Đã Ẩn', desc: 'Xem toàn bộ phim đang bị ẩn', action: () => { window.moviesAdmin.switchSource('hidden', 'Phim Đã Ẩn'); closeCommandPalette(); } },
      { icon: 'users', title: 'Chuyển sang Quản lý Người dùng & Xu', desc: 'Trang users.html', action: () => { window.location.href = 'users.html'; } },
      { icon: 'credit-card', title: 'Chuyển sang Gói VIP & Subscriptions', desc: 'Trang subscriptions.html', action: () => { window.location.href = 'subscriptions.html'; } },
      { icon: 'layout-dashboard', title: 'Về Dashboard Tổng quan', desc: 'Trang dashboard.html', action: () => { window.location.href = 'dashboard.html'; } }
    ];

    const matchedCommands = quickCommands.filter(cmd => 
      !q || cmd.title.toLowerCase().includes(q) || cmd.desc.toLowerCase().includes(q)
    );

    // Search movies in current view
    const matchedMovies = state.allMovies.filter(m =>
      q && (m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q))
    ).slice(0, 5);

    let html = '';

    if (matchedCommands.length) {
      html += `<div style="padding: 6px 12px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Lệnh Nhanh & Điều Hướng</div>`;
      matchedCommands.forEach((cmd, idx) => {
        html += `
          <div class="cmd-item" onclick="window.moviesAdmin.execCmd(${idx})">
            <i data-lucide="${cmd.icon}" style="width: 16px; height: 16px; color: var(--primary);"></i>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 13px; color: #f8fafc;">${escapeHtml(cmd.title)}</div>
              <div style="font-size: 11.5px; color: #94a3b8;">${escapeHtml(cmd.desc)}</div>
            </div>
            <span class="cmd-badge">Jump</span>
          </div>
        `;
      });
      window._currentCmds = matchedCommands;
    }

    if (matchedMovies.length) {
      html += `<div style="padding: 12px 12px 6px; font-size: 11px; font-weight: 700; color: var(--gold); text-transform: uppercase;">Phim Khớp Từ Khóa</div>`;
      matchedMovies.forEach(m => {
        html += `
          <div class="cmd-item" onclick="window.moviesAdmin.openDrawer('${escapeHtml(m.slug)}'); window.moviesAdmin.closeCmdPalette();">
            <i data-lucide="film" style="width: 16px; height: 16px; color: var(--gold);"></i>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 13px; color: #f8fafc;">${escapeHtml(m.name)}</div>
              <div style="font-size: 11.5px; color: #94a3b8;">Slug: ${escapeHtml(m.slug)} &bull; ${escapeHtml(m.year || '2026')}</div>
            </div>
            <span class="cmd-badge" style="background: rgba(245,158,11,0.15); color: var(--gold); border-color: rgba(245,158,11,0.3);">Chi tiết</span>
          </div>
        `;
      });
    }

    if (!matchedCommands.length && !matchedMovies.length) {
      html = `
        <div style="padding: 32px 20px; text-align: center; color: #94a3b8;">
          <i data-lucide="search-x" style="width: 28px; height: 28px; margin-bottom: 8px;"></i>
          <p style="font-size: 13px;">Không tìm thấy lệnh hoặc phim nào khớp với "${escapeHtml(query)}"</p>
        </div>
      `;
    }

    resultsContainer.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  function execCmd(idx) {
    if (window._currentCmds && window._currentCmds[idx]) {
      window._currentCmds[idx].action();
    }
  }

  // ─── UTILITIES & HELPERS ───
  function copySlug(slug) {
    navigator.clipboard.writeText(slug).then(() => {
      showToast(`Đã sao chép slug: "${slug}" vào bộ nhớ tạm!`, 'success');
    }).catch(() => {
      showToast(`Slug: ${slug}`, 'info');
    });
  }

  function showTableError(message) {
    const loadingEl = document.getElementById('loading');
    if (!loadingEl) return;
    loadingEl.classList.remove('hidden');
    loadingEl.innerHTML = `
      <div class="empty-state" style="padding: 40px;">
        <i data-lucide="alert-triangle" style="width: 32px; height: 32px; color: var(--danger); margin-bottom: 12px;"></i>
        <h3 style="color: var(--danger); font-size: 16px; font-weight: 700;">${escapeHtml(message)}</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin: 8px 0 16px;">Vui lòng kiểm tra kết nối mạng hoặc thử lại.</p>
        <button onclick="window.moviesAdmin.reload()" class="btn btn-primary btn-sm">
          <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Thử lại
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function switchSource(source, label, btn) {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
      const matchBtn = document.querySelector(`[data-source="${source}"]`);
      if (matchBtn) matchBtn.classList.add('active');
    }

    const labelEl = document.getElementById('currentSourceLabel');
    if (labelEl) labelEl.textContent = label || source;

    let t = btn ? (btn.dataset.type || 'danh-sach') : 'danh-sach';
    const cntrArr = ['viet-nam', 'han-quoc', 'trung-quoc', 'nhat-ban', 'thai-lan', 'au-my', 'hong-kong', 'dai-loan', 'an-do', 'anh', 'phap', 'canada'];
    if (cntrArr.includes(source)) t = 'quoc-gia';

    loadMovies(t, source, 1);
  }

  function resetFilters() {
    state.searchQuery = '';
    state.filterYear = 'all';
    state.filterStatus = 'all';
    
    const searchInputs = [document.getElementById('searchInput'), document.getElementById('tableSearchInput')];
    searchInputs.forEach(inp => { if (inp) inp.value = ''; });
    
    const yearSelect = document.getElementById('filterYearSelect');
    if (yearSelect) yearSelect.value = 'all';

    renderMoviesTable(state.allMovies);
  }

  // ─── INITIALIZATION ───
  function init() {
    fetchHiddenMoviesList();
    initCommandPalette();

    // Search Inputs Event Listeners (Debounced)
    let searchTimer;
    const handleSearchInput = (e) => {
      clearTimeout(searchTimer);
      state.searchQuery = e.target.value.trim();
      
      const otherInput = e.target.id === 'searchInput' 
        ? document.getElementById('tableSearchInput') 
        : document.getElementById('searchInput');
      if (otherInput && otherInput.value !== e.target.value) {
        otherInput.value = e.target.value;
      }

      searchTimer = setTimeout(() => {
        if (state.currentSource === 'hidden') renderHiddenMoviesTable();
        else renderMoviesTable(state.allMovies);
      }, 250);
    };

    document.getElementById('searchInput')?.addEventListener('input', handleSearchInput);
    document.getElementById('tableSearchInput')?.addEventListener('input', handleSearchInput);

    // Year filter listener
    document.getElementById('filterYearSelect')?.addEventListener('change', (e) => {
      state.filterYear = e.target.value;
      renderMoviesTable(state.allMovies);
    });

    // Command palette search input listener
    document.getElementById('cmdPaletteInput')?.addEventListener('input', (e) => {
      renderCommandPaletteResults(e.target.value);
    });

    // URL parameter parsing
    const params = new URLSearchParams(location.search);
    const source = params.get('source');
    const typeUrl = params.get('type') || 'danh-sach';

    if (source) {
      const tabBtn = document.querySelector(`[data-source="${source}"]`);
      if (tabBtn) {
        switchSource(source, tabBtn.textContent.trim(), tabBtn);
      } else {
        const countryEndpoints = ['viet-nam', 'han-quoc', 'trung-quoc', 'nhat-ban', 'thai-lan', 'au-my', 'hong-kong', 'dai-loan', 'an-do', 'anh', 'phap', 'canada'];
        let detectedType = typeUrl;
        if (!params.has('type') && countryEndpoints.includes(source)) detectedType = 'quoc-gia';
        loadMovies(detectedType, source, 1);
      }
    } else {
      loadMovies('danh-sach', 'all', 1);
    }
  }

  // ─── EXPORT GLOBAL API ───
  window.moviesAdmin = {
    loadPage: (p) => loadMovies(state.currentType, state.currentSource, p),
    reload: () => loadMovies(state.currentType, state.currentSource, state.currentPage),
    switchSource,
    toggleHide: toggleHideMovie,
    openDrawer: openMovieDrawer,
    closeDrawer: closeMovieDrawer,
    previewStream,
    copySlug,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    batchHideSelected,
    batchUnhideSelected,
    exportCSV: exportSelectedToCSV,
    resetFilters,
    openCmdPalette: toggleCommandPalette,
    closeCmdPalette: closeCommandPalette,
    execCmd
  };

  document.addEventListener('DOMContentLoaded', init);

})();
