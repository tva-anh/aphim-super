/**
 * ⚡ APhim Super Enterprise Admin - Dedicated Google Trends 24h Controller
 */
(function () {
  'use strict';

  window.TrendsAdmin = window.TrendsAdmin || {};

  let currentItems = [];
  const movieCache = new Map();

  function getAdminToken() {
    try {
      let token = localStorage.getItem('aphim_admin_token') ||
                  sessionStorage.getItem('aphim_admin_token') ||
                  localStorage.getItem('cinestream_admin_token') ||
                  sessionStorage.getItem('cinestream_admin_token') ||
                  localStorage.getItem('adminToken') ||
                  localStorage.getItem('sb-access-token') ||
                  localStorage.getItem('token') ||
                  (document.cookie.match(/(?:^|;\s*)(?:aphim_admin_token|cinestream_admin_token|adminToken|sb-access-token|token)=([^;]+)/) || [])[1] || '';
      if (!token) {
        // Kiểm tra Supabase Auth token lưu theo key sb-...-auth-token trong localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase')) && key.endsWith('-auth-token')) {
            try {
              const val = JSON.parse(localStorage.getItem(key));
              if (val && val.access_token) {
                token = val.access_token;
                break;
              }
            } catch {}
          }
        }
      }
      if (token && typeof token === 'string') {
        token = decodeURIComponent(token).trim();
        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
          token = token.slice(1, -1).trim();
        }
        if (token.startsWith('Bearer ')) token = token.slice(7).trim();
      }
      return token;
    } catch {
      return '';
    }
  }

  function showToast(message, type = 'info') {
    if (typeof window.AdminCore?.showToast === 'function') {
      window.AdminCore.showToast(message, type);
      return;
    }
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div style="font-size:13px;font-weight:500;">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function toSlug(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function cleanKeyword(raw) {
    return (raw || '')
      .toLowerCase()
      .replace(/^(\d+[\.\s\t]+)?(xem phim|phim|vé xem phim)\s+/i, '')
      .replace(/^\d+[\.\s\t]+/i, '')
      .replace(/\s*\([a-z0-9\-_]+\)\s*/gi, ' ')
      .replace(/\s*=>\s*.*$/i, '')
      .replace(/\s+(xem phim|xem|phim|tập\s+\d+.*)$/i, '')
      .trim();
  }

  async function resolveMovie(item) {
    if (!item) return null;
    const query = typeof item === 'string' ? item : (item.movie_name || item.target_keyword || item.query || item.title || '');
    const slug = typeof item === 'object' ? item.movie_slug : null;

    if (slug) {
      if (movieCache.has('slug:' + slug)) return movieCache.get('slug:' + slug);

      // Nếu item đã có sẵn tên phim và poster từ trước -> Trả về ngay lập tức không cần đợi mạng
      if (typeof item === 'object' && item.movie_name && (item.poster_url || item.thumb_url)) {
        const cachedObj = {
          name: item.movie_name,
          origin_name: item.origin_name || item.movie_name,
          slug: slug,
          poster_url: item.poster_url || item.thumb_url,
          thumb_url: item.thumb_url || item.poster_url,
          year: item.year || '',
          quality: item.quality || 'FHD',
          lang: item.lang || 'Vietsub',
          is_custom: !!item.is_custom,
          is_cinema: !!item.is_momo
        };
        movieCache.set('slug:' + slug, cachedObj);
        return cachedObj;
      }

      // 1. Thử lấy từ movie-merged (hỗ trợ cả custom streams R2 và phim mặc định)
      try {
        const resLocal = await fetch(`/api/movie-merged/${encodeURIComponent(slug)}`);
        const dataLocal = await resLocal.json();
        if (dataLocal && dataLocal.status && dataLocal.movie) {
          movieCache.set('slug:' + slug, dataLocal.movie);
          return dataLocal.movie;
        }
      } catch {}

      // 2. Thử PhimAPI fallback
      try {
        const res = await fetch(`https://phimapi.com/phim/${encodeURIComponent(slug)}`);
        const data = await res.json();
        const movie = data?.movie;
        if (movie) {
          movieCache.set('slug:' + slug, movie);
          return movie;
        }
      } catch {}
    }

    const clean = cleanKeyword(query);
    if (!clean) return null;
    if (movieCache.has('kw:' + clean)) return movieCache.get('kw:' + clean);

    // ⚡ Tìm kiếm tổng hợp qua /api/movies/search-admin (Custom Streams + MoMo Chiếu Rạp + PhimAPI + OPhim)
    try {
      let items = [];
      try {
        const resAdmin = await fetch(`/api/movies/search-admin?keyword=${encodeURIComponent(clean)}`);
        const dataAdmin = await resAdmin.json();
        if (dataAdmin.success && Array.isArray(dataAdmin.items) && dataAdmin.items.length > 0) {
          items = dataAdmin.items;
        }
      } catch (errAdmin) {}

      // Fallback phimapi nếu search-admin không có kết quả
      if (!items.length) {
        const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(clean)}&limit=6`);
        const data = await res.json();
        items = data?.data?.items || [];
      }

      if (!items.length) {
        movieCache.set('kw:' + clean, null);
        return null;
      }

      const cleanSlug = toSlug(clean);
      const found = items.find(m => {
        const mSlug = toSlug(m.name || '');
        const oSlug = toSlug(m.origin_name || '');
        const s = m.slug || '';
        return mSlug.includes(cleanSlug) || cleanSlug.includes(mSlug) ||
               oSlug.includes(cleanSlug) || cleanSlug.includes(oSlug) ||
               s.includes(cleanSlug);
      }) || items[0];

      if (found) {
        movieCache.set('kw:' + clean, found);
        return found;
      }
      movieCache.set('kw:' + clean, null);
      return null;
    } catch {
      return null;
    }
  }

  const JUNK_KEYWORDS = [
    /^lịch\s+(xem|chiếu)/i,
    /^(xem\s+phim\s+)?(hoạt\s+hình(\s+3d)?|phim\s+hoạt\s+hình)$/i,
    /^(xem\s+phim\s+)?(chiếu\s+rạp(\s+miễn\s+phí)?|phim\s+chiếu\s+rạp)$/i,
    /^(xem\s+phim\s+)?(phí\s+phòng|phí\s+phông|phòng\s+xem\s+phim)$/i,
    /^(xem\s+phim\s+)?(phim\s+hot|phim\s+hay|phim\s+mới|phim\s+mới\s+nhất|top\s+phim)$/i,
    /^(web|trang\s+web|app|ứng\s+dụng)\s+xem\s+phim/i,
    /^(giá\s+vé|mua\s+vé|đặt\s+vé)\s+xem\s+phim/i,
    /^(xem\s+phim\s+)?(hd|full\s+hd|thuyết\s+minh|vietsub)$/i,
    /^(xem\s+)?phim\s+gì\s+hay/i
  ];

  function isJunkKeyword(str) {
    if (!str) return true;
    const clean = str.trim().toLowerCase();
    if (clean.length < 2) return true;
    return JUNK_KEYWORDS.some(regex => regex.test(clean));
  }

  async function filterAndDeduplicateTrends(rawItems) {
    const cleanList = [];
    const seenSlugs = new Set();
    const removedJunk = [];
    const removedDuplicates = [];

    for (const item of rawItems) {
      const q = item.query || item.title || '';

      // 1. Kiểm tra từ khóa rác / từ khóa tìm kiếm chung chung
      if (isJunkKeyword(q) && !item.movie_slug) {
        removedJunk.push(q);
        console.log(`[TrendsFilter] 🗑️ Loại bỏ từ khóa chung chung: "${q}"`);
        continue;
      }

      // 2. Tìm kiếm phim tương ứng trong kho
      const movie = await resolveMovie(item);
      if (!movie) {
        removedJunk.push(q);
        console.log(`[TrendsFilter] 🗑️ Không tìm thấy phim hợp lệ cho: "${q}" -> Bỏ qua`);
        continue;
      }

      // 3. Kiểm tra trùng phim (Deduplication)
      if (seenSlugs.has(movie.slug)) {
        removedDuplicates.push({ query: q, movie: movie.name });
        console.log(`[TrendsFilter] ⚠️ Phát hiện trùng phim "${movie.name}" (${movie.slug}) từ khóa "${q}" -> Bỏ qua`);
        continue;
      }

      seenSlugs.add(movie.slug);
      cleanList.push({
        ...item,
        movie_slug: movie.slug,
        movie_name: movie.name,
        poster_url: movie.poster_url || movie.thumb_url || '',
        thumb_url: movie.thumb_url || movie.poster_url || '',
        year: movie.year || '',
        quality: movie.quality || '',
        lang: movie.lang || '',
        is_custom: !!movie.is_custom,
        is_momo: !!movie.is_cinema
      });
    }

    return { cleanList, removedJunk, removedDuplicates };
  }

  // ── Modal State & Controller ──────────────────────────────────────────────
  const modalState = {
    isOpen: false,
    itemIndex: null,
    activeFilter: 'all',
    rawResults: [],
    searchTimer: null
  };

  function openAssignModal(index) {
    if (typeof index !== 'number' || !currentItems[index]) return;
    modalState.itemIndex = index;
    modalState.isOpen = true;
    modalState.activeFilter = 'all';

    const item = currentItems[index];
    const modal = document.getElementById('assignMovieTrendsModal');
    const badge = document.getElementById('modalTargetKeywordBadge');
    const input = document.getElementById('modalSearchMovieInput');
    const removeBtn = document.getElementById('btnRemoveAssignedMovie');

    if (badge) {
      badge.textContent = `Từ khóa: "${item.query || item.title || 'Chưa đặt tên'}" (Dòng #${index + 1})`;
    }

    if (removeBtn) {
      removeBtn.style.display = (item.movie_slug || item.movie_name) ? 'inline-flex' : 'none';
    }

    // Reset filter tags
    document.querySelectorAll('.btn-filter-tag').forEach(tag => {
      const isAll = tag.getAttribute('data-filter') === 'all';
      tag.classList.toggle('active', isAll);
      tag.style.background = isAll ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)';
      tag.style.color = isAll ? '#f97316' : '#94a3b8';
    });

    const initialKeyword = item.movie_name || item.title || cleanKeyword(item.query) || '';
    if (input) {
      input.value = initialKeyword;
      const clearBtn = document.getElementById('modalSearchMovieClear');
      if (clearBtn) clearBtn.style.display = initialKeyword ? 'block' : 'none';
    }

    if (modal) {
      modal.style.display = 'flex';
      if (window.lucide) lucide.createIcons();
    }

    setTimeout(() => {
      if (input) {
        input.focus();
        input.select();
      }
      if (initialKeyword) {
        searchMoviesForModal(initialKeyword);
      } else {
        renderModalResults([]);
      }
    }, 60);
  }

  function closeAssignModal() {
    modalState.isOpen = false;
    modalState.itemIndex = null;
    const modal = document.getElementById('assignMovieTrendsModal');
    if (modal) modal.style.display = 'none';
  }

  function clearModalSearch() {
    const input = document.getElementById('modalSearchMovieInput');
    const clearBtn = document.getElementById('modalSearchMovieClear');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (clearBtn) clearBtn.style.display = 'none';
    searchMoviesForModal('');
  }

  function filterModalResults(filter, btn) {
    modalState.activeFilter = filter;
    document.querySelectorAll('.btn-filter-tag').forEach(tag => {
      const isActive = tag === btn;
      tag.classList.toggle('active', isActive);
      tag.style.background = isActive ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)';
      tag.style.color = isActive ? '#f97316' : '#94a3b8';
    });
    renderModalResults(modalState.rawResults);
  }

  async function searchMoviesForModal(keyword) {
    const container = document.getElementById('modalMovieSearchResults');
    if (!container) return;

    const trimmed = (keyword || '').trim();
    if (!trimmed) {
      container.innerHTML = `
        <div style="text-align: center; padding: 35px 20px; color: #94a3b8; font-size: 13px;">
          <i data-lucide="search" style="width: 24px; height: 24px; margin-bottom: 8px; opacity: 0.6;"></i>
          <div>Nhập tên phim hoặc slug để tìm kiếm ngay lập tức...</div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div style="text-align: center; padding: 35px 20px; color: #94a3b8; font-size: 13px;">
        <i data-lucide="loader-2" class="spin" style="width: 22px; height: 22px; margin-bottom: 8px; color: #f97316;"></i>
        <div>Đang tìm phim "${trimmed}" trong toàn bộ kho phim...</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const res = await fetch(`/api/movies/search-admin?keyword=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      let items = (data && data.success && Array.isArray(data.items)) ? data.items : [];

      modalState.rawResults = items;
      renderModalResults(items);
    } catch (err) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #ef4444; font-size: 13px;">
          Lỗi tìm kiếm: ${err.message}
        </div>
      `;
    }
  }

  function renderModalResults(items) {
    const container = document.getElementById('modalMovieSearchResults');
    if (!container) return;

    let filtered = items;
    if (modalState.activeFilter === 'custom') {
      filtered = items.filter(m => m.is_custom);
    } else if (modalState.activeFilter === 'cinema') {
      filtered = items.filter(m => m.is_cinema);
    } else if (modalState.activeFilter === 'online') {
      filtered = items.filter(m => !m.is_custom && !m.is_cinema);
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div style="text-align: center; padding: 35px 20px; color: #94a3b8; font-size: 13px;">
          <i data-lucide="film" style="width: 24px; height: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
          <div>Không tìm thấy bộ phim nào phù hợp với bộ lọc hiện tại.</div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const currentItem = modalState.itemIndex !== null ? currentItems[modalState.itemIndex] : null;
    const currentSlug = currentItem ? currentItem.movie_slug : null;

    container.innerHTML = filtered.map((movie, idx) => {
      const isSelected = currentSlug && currentSlug === movie.slug;
      const poster = movie.poster_url || movie.thumb_url || '';
      const imgUrl = poster.startsWith('http') ? poster : (poster ? `https://phimimg.com/${poster}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300');
      
      let badgeHtml = '';
      if (movie.is_custom) {
        badgeHtml += `<span style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.3px;">⚡ BẢN R2 VIP</span>`;
      }
      if (movie.is_cinema) {
        badgeHtml += `<span style="background: #e11d48; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🎬 PHIM RẠP</span>`;
      }
      if (movie.quality) {
        badgeHtml += `<span style="background: rgba(255,255,255,0.1); color: #cbd5e1; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">${movie.quality}</span>`;
      }
      if (movie.year) {
        badgeHtml += `<span style="background: rgba(255,255,255,0.06); color: #94a3b8; font-size: 10px; padding: 2px 5px; border-radius: 4px;">${movie.year}</span>`;
      }

      return `
        <div class="modal-movie-card" onclick="window.TrendsAdmin.selectMovieForTrend(${idx})" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; background: ${isSelected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255, 255, 255, 0.03)'}; border: 1px solid ${isSelected ? 'rgba(249, 115, 22, 0.5)' : 'rgba(255, 255, 255, 0.06)'}; border-radius: 12px; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
            <img src="${imgUrl}" alt="${movie.name}" style="width: 38px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300'" />
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px;">
                <span style="font-size: 14px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${movie.name}
                </span>
                ${badgeHtml}
              </div>
              <div style="font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${movie.origin_name || movie.slug}
              </div>
            </div>
          </div>

          <div style="flex-shrink: 0;">
            <button type="button" class="btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-xs" style="font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 6px; pointer-events: none; background: ${isSelected ? '#f97316' : 'rgba(255,255,255,0.06)'}; border-color: ${isSelected ? '#ea580c' : 'rgba(255,255,255,0.15)'};">
              ${isSelected ? '✓ Đang chọn' : '+ Chọn Phim Này'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  async function selectMovieForTrend(resultIndex) {
    if (modalState.itemIndex === null || !currentItems[modalState.itemIndex]) return;
    
    let filtered = modalState.rawResults;
    if (modalState.activeFilter === 'custom') {
      filtered = filtered.filter(m => m.is_custom);
    } else if (modalState.activeFilter === 'cinema') {
      filtered = filtered.filter(m => m.is_cinema);
    } else if (modalState.activeFilter === 'online') {
      filtered = filtered.filter(m => !m.is_custom && !m.is_cinema);
    }

    const movie = filtered[resultIndex];
    if (!movie) return;

    const idx = modalState.itemIndex;
    const currentItem = currentItems[idx];

    currentItem.movie_slug = movie.slug;
    currentItem.movie_name = movie.name;
    currentItem.poster_url = movie.poster_url || movie.thumb_url || '';
    currentItem.thumb_url = movie.thumb_url || movie.poster_url || '';
    currentItem.year = movie.year ? String(movie.year) : '';
    currentItem.quality = movie.quality ? String(movie.quality) : '';
    currentItem.lang = movie.lang ? String(movie.lang) : '';
    currentItem.is_custom = !!movie.is_custom;
    currentItem.is_momo = !!movie.is_cinema;

    // Cache locally
    movieCache.set('slug:' + movie.slug, movie);

    // Update cell directly
    const cell = document.getElementById(`movieMatchCell-${idx}`);
    if (cell) {
      renderSingleMatchCell(cell, movie, idx, currentItem);
    }

    if (idx === 0) {
      updatePreviewCard(movie, currentItem.traffic);
    }

    closeAssignModal();
    syncTextareaFromCurrentItems();
    updateKpis();

    showToast(`✅ Đã gán phim "${movie.name}" thành công! Đang đồng bộ...`, 'success');
    await saveAll(true);
    showToast(`🔥 Đã lưu và đồng bộ "${movie.name}" sang slider trang chủ!`, 'success');
  }

  async function removeAssignedMovie() {
    if (modalState.itemIndex === null || !currentItems[modalState.itemIndex]) return;
    const idx = modalState.itemIndex;
    const currentItem = currentItems[idx];

    delete currentItem.movie_slug;
    delete currentItem.movie_name;
    delete currentItem.poster_url;
    delete currentItem.thumb_url;
    delete currentItem.year;
    delete currentItem.quality;
    delete currentItem.lang;
    delete currentItem.is_custom;
    delete currentItem.is_momo;

    const cell = document.getElementById(`movieMatchCell-${idx}`);
    if (cell) {
      const movie = await resolveMovie(currentItem);
      renderSingleMatchCell(cell, movie, idx, currentItem);
    }

    closeAssignModal();
    syncTextareaFromCurrentItems();
    updateKpis();

    showToast('Đã gỡ gán phim và khôi phục tự động tìm kiếm.', 'info');
    await saveAll(true);
  }

  function assignMovie(index) {
    openAssignModal(index);
  }

  async function loadData() {
    const tbody = document.getElementById('trendsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">
            <i data-lucide="loader-2" class="spin" style="width:20px;height:20px;margin-bottom:8px;"></i>
            <div>Đang tải dữ liệu từ máy chủ...</div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const token = getAdminToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch('/api/admin/trends', {
        headers,
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.items)) {
        currentItems = data.items;
        await renderTable();
        updateKpis();
        syncTextareaFromCurrentItems();
      } else {
        showToast(data.message || 'Không thể tải danh sách Trends', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ: ' + e.message, 'error');
    }
  }

  function renderSingleMatchCell(cell, movie, idx, item) {
    if (!cell) return;
    if (movie) {
      const poster = movie.poster_url || movie.thumb_url || item.poster_url || '';
      const imgUrl = poster.startsWith('http') ? poster : (poster ? `https://phimimg.com/${poster}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300');
      
      let customBadge = '';
      if (item.is_custom || movie.is_custom) {
        customBadge = `<span style="background:linear-gradient(135deg, #f59e0b, #ef4444);color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;margin-left:4px;">R2 VIP</span>`;
      } else if (item.is_momo || movie.is_cinema) {
        customBadge = `<span style="background:#e11d48;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:3px;margin-left:4px;">RẠP</span>`;
      }

      cell.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${imgUrl}" alt="${movie.name}" style="width:34px;height:48px;object-fit:cover;border-radius:4px;border:1px solid rgba(255,255,255,0.1);flex-shrink:0;" onerror="this.src='https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300'" />
          <div style="overflow:hidden;flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;">
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${movie.name}</span>
              ${customBadge}
            </div>
            <div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${movie.origin_name || movie.slug}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <span class="badge badge-emerald" style="font-size:10px;padding:3px 6px;">
              ✓ Đã khớp
            </span>
            <button type="button" class="btn btn-ghost btn-xs" onclick="window.TrendsAdmin.assignMovie(${idx})" style="padding:4px 8px;color:#cbd5e1;font-size:11px;border:1px solid rgba(255,255,255,0.15);border-radius:5px;background:rgba(255,255,255,0.06);cursor:pointer;display:inline-flex;align-items:center;gap:3px;" title="Gán sang phim khác theo ý muốn">
              <i data-lucide="edit-3" style="width:11px;height:11px;"></i> Đổi
            </button>
          </div>
        </div>
      `;
      if (idx === 0) updatePreviewCard(movie, item.traffic);
    } else {
      cell.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;color:#f59e0b;font-size:12px;">
            <i data-lucide="alert-circle" style="width:14px;height:14px;"></i>
            <span>Chưa tìm thấy phim khớp</span>
          </div>
          <button type="button" class="btn btn-outline btn-xs" onclick="window.TrendsAdmin.assignMovie(${idx})" style="padding:4px 10px;font-size:11px;font-weight:600;border:1px solid rgba(249,115,22,0.6);color:#f97316;background:rgba(249,115,22,0.12);border-radius:6px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">
            <i data-lucide="link" style="width:12px;height:12px;"></i> Gán Phim
          </button>
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
  }

  async function renderTable() {
    const tbody = document.getElementById('trendsTableBody');
    if (!tbody) return;

    if (!currentItems.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">
            Chưa có từ khóa nào. Bấm <strong>"+ Thêm Dòng"</strong> ở trên hoặc dán danh sách hàng loạt ở cột bên phải.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = currentItems.map((item, idx) => {
      const q = item.query || item.title || '';
      const t = item.traffic || 'Thịnh hành';
      return `
        <tr data-index="${idx}" style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="text-align:center;font-weight:700;color:#94a3b8;padding:12px 14px;">#${idx + 1}</td>
          <td style="padding:12px 14px;">
            <input type="text" class="form-control trend-query-input" value="${q.replace(/"/g, '&quot;')}" placeholder="Nhập cụm từ tìm kiếm (ví dụ: xem phim trại buôn người)" style="width:100%;font-size:13px;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;" oninput="window.TrendsAdmin.onFieldInput(${idx}, 'query', this.value)" onchange="window.TrendsAdmin.onFieldChange(${idx}, 'query', this.value)" />
          </td>
          <td style="padding:12px 14px;">
            <input type="text" class="form-control trend-traffic-input" value="${t.replace(/"/g, '&quot;')}" placeholder="+100%" style="width:100%;font-size:13px;font-weight:700;padding:8px 10px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:6px;color:#f97316;" oninput="window.TrendsAdmin.onFieldInput(${idx}, 'traffic', this.value)" onchange="window.TrendsAdmin.onFieldChange(${idx}, 'traffic', this.value)" />
          </td>
          <td style="padding:12px 14px;" id="movieMatchCell-${idx}">
            <div style="font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:6px;">
              <i data-lucide="loader-2" class="spin" style="width:14px;height:14px;"></i> Đang kiểm tra kho phim...
            </div>
          </td>
          <td style="text-align:right;padding:12px 14px;">
            <button type="button" class="btn btn-ghost btn-xs" onclick="window.TrendsAdmin.deleteRow(${idx})" style="color:#ef4444;cursor:pointer;padding:6px 8px;" title="Xóa từ khóa">
              <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    // Async resolve movie matching for each row
    currentItems.forEach(async (item, idx) => {
      const cell = document.getElementById(`movieMatchCell-${idx}`);
      if (!cell) return;
      const movie = await resolveMovie(item);
      renderSingleMatchCell(cell, movie, idx, item);
    });
  }

  function updatePreviewCard(movie, traffic) {
    if (!movie) return;
    const poster = movie.poster_url || movie.thumb_url || '';
    const imgUrl = poster.startsWith('http') ? poster : (poster ? `https://phimimg.com/${poster}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300');
    const imgEl = document.getElementById('previewCardPoster');
    const titleVi = document.getElementById('previewCardTitleVi');
    const titleEn = document.getElementById('previewCardTitleEn');

    if (imgEl) imgEl.src = imgUrl;
    if (titleVi) titleVi.textContent = movie.name || '';
    if (titleEn) {
      titleEn.innerHTML = `<span style="color:#ff6a00;font-weight:700;">🔥 ${traffic || '+550%'}</span> ${movie.origin_name || ''}`;
    }
  }

  function updateKpis() {
    const kpiTotal = document.getElementById('kpiTotalKeywords');
    const kpiMax = document.getElementById('kpiMaxGrowth');
    const kpiMovie = document.getElementById('kpiMaxMovie');
    const kpiMatched = document.getElementById('kpiMatchedCount');

    if (kpiTotal) kpiTotal.textContent = String(currentItems.length);
    if (currentItems.length > 0) {
      const first = currentItems[0];
      if (kpiMax) kpiMax.textContent = first.traffic || '+550%';
      if (kpiMovie) kpiMovie.textContent = first.title || first.query || '';
      if (kpiMatched) kpiMatched.textContent = `${currentItems.length} / ${currentItems.length}`;
    }
  }

  function syncTextareaFromCurrentItems() {
    const textarea = document.getElementById('bulkPasteTextarea');
    if (!textarea || document.activeElement === textarea) return;
    textarea.value = currentItems.map(it => `${it.query || it.title || ''} | ${it.traffic || '+100%'}`).join('\n');
  }

  let fieldInputDebounce = null;
  function onFieldInput(index, field, val) {
    if (!currentItems[index]) return;
    currentItems[index][field] = val;
    if (field === 'query') {
      currentItems[index].title = cleanKeyword(val);
    }
    syncTextareaFromCurrentItems();
    updateKpis();

    if (field === 'query') {
      clearTimeout(fieldInputDebounce);
      fieldInputDebounce = setTimeout(async () => {
        const item = currentItems[index];
        if (!item) return;
        const cell = document.getElementById(`movieMatchCell-${index}`);
        if (!cell) return;
        const movie = await resolveMovie(item);
        renderSingleMatchCell(cell, movie, index, item);
      }, 400);
    }
  }

  function onFieldChange(index, field, val) {
    if (!currentItems[index]) return;
    currentItems[index][field] = val.trim();
    if (field === 'query') {
      currentItems[index].title = cleanKeyword(val);
      resolveMovie(currentItems[index]).then(movie => {
        const cell = document.getElementById(`movieMatchCell-${index}`);
        if (cell) {
          renderSingleMatchCell(cell, movie, index, currentItems[index]);
        }
      });
    }
    syncTextareaFromCurrentItems();
    updateKpis();
  }

  function addNewRow() {
    currentItems.push({
      query: '',
      title: '',
      traffic: '+100%'
    });
    renderTable();
    updateKpis();
    syncTextareaFromCurrentItems();

    setTimeout(() => {
      const inputs = document.querySelectorAll('.trend-query-input');
      if (inputs.length) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  }

  async function deleteRow(index) {
    if (typeof index !== 'number' || index < 0 || index >= currentItems.length) return;
    currentItems.splice(index, 1);
    renderTable();
    updateKpis();
    syncTextareaFromCurrentItems();
    showToast('Đã xóa 1 từ khóa và tự động đồng bộ ra trang chủ!', 'info');
    await saveAll(true);
  }

  function parseTrendsInput(raw) {
    if (!raw || !raw.trim()) return [];
    
    // Loại bỏ ký tự ẩn / bidi / LRM (\u200E) do Google Trends tự chèn vào số %
    const cleanRaw = raw.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
    const rawLines = cleanRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results = [];

    // Lọc bỏ các dòng thừa: Số thứ tự (1, 2...), từ icon điều hướng (north, south...)
    const lines = [];
    for (const l of rawLines) {
      if (/^\d+$/.test(l)) continue;
      if (/^(north|south|arrow_upward|arrow_downward|more_vert|arrow)$/i.test(l)) continue;
      lines.push(l);
    }

    // 1. Trường hợp copy bảng dạng TSV (tab-separated)
    const hasTabs = lines.some(l => l.includes('\t'));
    if (hasTabs) {
      for (const line of lines) {
        if (line.includes('\t')) {
          const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
          let query = '';
          let traffic = '';
          for (const part of parts) {
            if (/^(\+|-)?\d+[%+]?$/.test(part) || /đột phá|đột biến|breakout/i.test(part)) {
              traffic = part;
            } else if (!/^\d+$/.test(part) && !/^(north|south|arrow.*|more_vert)$/i.test(part)) {
              query = part;
            }
          }
          if (query) {
            results.push({
              query,
              title: cleanKeyword(query),
              traffic: traffic ? (traffic.startsWith('+') || traffic.includes('%') ? traffic : '+' + traffic) : '+100%'
            });
          }
        }
      }
      if (results.length > 0) return results;
    }

    // 2. Parser thông minh xử lý mọi định dạng (dòng xen kẽ, dòng lỗi +250% | +100%, có '=>', hoặc tuần tự)
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      let query = line;
      let traffic = '';

      // Dạng chứa '=>' (ví dụ: '5. Cô Đi Mà Lấy Chồng Tôi (Bản Nhật) (slug) => +80% | +100%')
      if (line.includes('=>')) {
        const parts = line.split('=>');
        query = parts[0].trim();
        const right = parts[1].trim();
        const trafMatch = right.match(/(\+|-)?\d+[%+]?/);
        if (trafMatch) traffic = trafMatch[0];
      } else if (line.includes('|')) {
        const parts = line.split('|').map(s => s.trim());
        // Nếu vế trái là chỉ số tăng trưởng lẻ: '+250% | +100%'
        if (/^(\+|-)?\d+[%+]?$/.test(parts[0]) || /^(đột phá|đột biến|breakout)$/i.test(parts[0])) {
          if (results.length > 0) {
            results[results.length - 1].traffic = parts[0].includes('%') ? parts[0] : (parts[0].startsWith('+') ? parts[0] + '%' : '+' + parts[0] + '%');
          }
          continue;
        }
        query = parts[0];
        traffic = parts[1];
      } else if (/^(\+|-)?\d+[%+]?$/.test(line) || /^(đột phá|đột biến|breakout)$/i.test(line)) {
        if (results.length > 0) {
          results[results.length - 1].traffic = line.includes('%') ? line : (line.startsWith('+') ? line + '%' : '+' + line + '%');
        }
        continue;
      }

      // Làm sạch số thứ tự ở đầu (ví dụ: '5. ' hoặc '10\t') và slug trong ngoặc đơn
      let cleanQ = query.replace(/^\d+[\.\s\t]+/, '').trim();
      cleanQ = cleanQ.replace(/\s*\([a-z0-9\-_]+\)\s*/gi, ' ').trim();

      if (cleanQ) {
        results.push({
          query: cleanQ,
          title: cleanKeyword(cleanQ),
          traffic: traffic ? (traffic.includes('%') ? traffic : '+' + traffic + '%') : '+100%'
        });
      }
    }

    return results;
  }

  async function applyBulkPaste() {
    console.log('[TrendsAdmin] applyBulkPaste initiated');
    const btn = document.getElementById('btnBulkCheck');
    const textarea = document.getElementById('bulkPasteTextarea');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) {
      showToast('Vui lòng dán danh sách từ khóa trước!', 'warning');
      return;
    }

    const originalText = btn ? btn.innerHTML : '';
    try {
      const parsed = parseTrendsInput(raw);
      console.log('[TrendsAdmin] Parsed items count:', parsed.length, parsed);
      if (!parsed.length) {
        showToast('Không tìm thấy từ khóa hợp lệ nào!', 'error');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Đang lọc phim & khử trùng...';
        if (window.lucide) lucide.createIcons();
      }

      // Tự động bóc tách: Lọc bỏ từ khóa rác & loại bỏ phim bị trùng lặp
      const { cleanList, removedJunk, removedDuplicates } = await filterAndDeduplicateTrends(parsed);

      if (!cleanList.length) {
        showToast('Không tìm thấy bộ phim hợp lệ nào trong danh sách!', 'warning');
        return;
      }

      currentItems = cleanList;
      await renderTable();
      updateKpis();

      // Cập nhật lại textarea đúng danh sách các phim chuẩn đã được chọn lọc
      textarea.value = cleanList.map(item => `${item.query} | ${item.traffic}`).join('\n');

      let toastMsg = `✨ Đã lọc thành công ${cleanList.length} phim chuẩn!`;
      if (removedJunk.length > 0) {
        toastMsg += ` (Loại ${removedJunk.length} từ khóa chung)`;
      }
      if (removedDuplicates.length > 0) {
        toastMsg += ` (Bỏ ${removedDuplicates.length} phim trùng)`;
      }
      showToast(toastMsg, 'success');
    } catch (err) {
      console.error('[TrendsAdmin] Lỗi applyBulkPaste:', err);
      showToast('Lỗi phân tích: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async function applyAndSaveBulk() {
    console.log('[TrendsAdmin] applyAndSaveBulk initiated');
    const btn = document.getElementById('btnBulkSyncNow');
    const textarea = document.getElementById('bulkPasteTextarea');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) {
      showToast('Vui lòng dán danh sách từ khóa trước!', 'warning');
      return;
    }

    const originalText = btn ? btn.innerHTML : '';
    try {
      const parsed = parseTrendsInput(raw);
      console.log('[TrendsAdmin] Parsed items count:', parsed.length, parsed);
      if (!parsed.length) {
        showToast('Không tìm thấy từ khóa hợp lệ nào!', 'error');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Đang lọc phim & kiểm tra...';
        if (window.lucide) lucide.createIcons();
      }

      // Tự động bóc tách: Lọc bỏ từ khóa rác & loại bỏ phim bị trùng lặp
      const { cleanList, removedJunk, removedDuplicates } = await filterAndDeduplicateTrends(parsed);

      if (!cleanList.length) {
        showToast('Không tìm thấy bộ phim hợp lệ nào trong danh sách!', 'warning');
        return;
      }

      currentItems = cleanList;
      await renderTable();
      updateKpis();

      // Cập nhật lại textarea đúng danh sách các phim chuẩn đã được chọn lọc
      textarea.value = cleanList.map(item => `${item.query} | ${item.traffic}`).join('\n');

      if (btn) {
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Đang lưu & đồng bộ ra trang chủ...';
        if (window.lucide) lucide.createIcons();
      }

      await saveAll();

      let toastMsg = `🔥 Đã lọc & đồng bộ ${cleanList.length} phim chuẩn ra trang chủ!`;
      if (removedJunk.length > 0 || removedDuplicates.length > 0) {
        toastMsg += ` (Loại ${removedJunk.length} từ chung, bỏ ${removedDuplicates.length} phim trùng)`;
      }
      showToast(toastMsg, 'success');
    } catch (e) {
      console.error('[TrendsAdmin] Lỗi applyAndSaveBulk:', e);
      showToast('Lỗi đồng bộ: ' + e.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  let autoSyncDebounceTimer = null;

  function autoProcessTextarea(force = false) {
    const textarea = document.getElementById('bulkPasteTextarea');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) return;

    try {
      const parsed = parseTrendsInput(raw);
      if (parsed.length > 0) {
        // Cập nhật ngay vào bảng danh sách
        currentItems = parsed;
        renderTable();
        updateKpis();

        console.log(`[TrendsAdmin] ⚡ Tự động nhận diện ${parsed.length} từ khóa vào bảng.`);
        
        // Chuẩn hóa nhẹ nhàng nội dung nếu dán dạng bảng hoặc dòng % lẻ
        if (/north|south|\t|\n\d+\s*\n|\n\s*(\+|-)?\d+[%+]?\s*\|/i.test(raw)) {
          textarea.value = parsed.map(item => `${item.query} | ${item.traffic}`).join('\n');
        }
      }
    } catch (err) {
      console.warn('[TrendsAdmin] Auto-process warning:', err);
    }
  }

  function bindTextareaEvents() {
    const textarea = document.getElementById('bulkPasteTextarea');
    if (textarea && !textarea._hasAutoFormat) {
      textarea._hasAutoFormat = true;

      // Khi người dùng DÁN nội dung -> Tự động nhận diện và nạp ngay vào bảng sau 100ms
      textarea.addEventListener('paste', () => {
        setTimeout(() => {
          autoProcessTextarea(true);
          showToast('⚡ Đã tự động nhận diện và đồng bộ ra trang chủ!', 'success');
        }, 100);
      });

      // Khi người dùng chỉnh sửa / gõ / đổi thứ tự -> Debounce 350ms tự nạp vào bảng
      textarea.addEventListener('input', () => {
        clearTimeout(autoSyncDebounceTimer);
        autoSyncDebounceTimer = setTimeout(() => {
          autoProcessTextarea(false);
        }, 350);
      });
    }

    const btnCheck = document.getElementById('btnBulkCheck');
    if (btnCheck && !btnCheck._bound) {
      btnCheck._bound = true;
      btnCheck.addEventListener('click', (e) => {
        e.preventDefault();
        applyBulkPaste();
      });
    }

    const btnSync = document.getElementById('btnBulkSyncNow');
    if (btnSync && !btnSync._bound) {
      btnSync._bound = true;
      btnSync.addEventListener('click', (e) => {
        e.preventDefault();
        applyAndSaveBulk();
      });
    }
  }

  let modalSearchDebounceTimer = null;
  function bindModalEvents() {
    const input = document.getElementById('modalSearchMovieInput');
    const clearBtn = document.getElementById('modalSearchMovieClear');
    if (input && !input._bound) {
      input._bound = true;
      input.addEventListener('input', () => {
        const val = input.value;
        if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
        clearTimeout(modalSearchDebounceTimer);
        modalSearchDebounceTimer = setTimeout(() => {
          searchMoviesForModal(val);
        }, 180);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeAssignModal();
        } else if (e.key === 'Enter') {
          clearTimeout(modalSearchDebounceTimer);
          searchMoviesForModal(input.value);
        }
      });
    }

    const modal = document.getElementById('assignMovieTrendsModal');
    if (modal && !modal._bound) {
      modal._bound = true;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeAssignModal();
        }
      });
    }

    if (!window._trendsEscBound) {
      window._trendsEscBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalState.isOpen) {
          closeAssignModal();
        }
      });
    }
  }

  let isSavingInProgress = false;

  async function saveAll(silent = false) {
    if (isSavingInProgress) return;
    const btn = document.getElementById('btnSaveTopTrends');
    const validItems = currentItems.filter(it => (it.query || it.title || it.movie_slug || '').trim().length > 0);
    if (!validItems.length) {
      if (!silent) showToast('Danh sách từ khóa không được để trống!', 'warning');
      return;
    }

    isSavingInProgress = true;
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn && !silent) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Đang đồng bộ...';
      if (window.lucide) lucide.createIcons();
    }

    try {
      const token = getAdminToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch('/api/admin/trends', {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ items: validItems })
      });
      const data = await res.json();
      if (data && data.success) {
        if (!silent) {
          showToast(data.message || 'Đã lưu và đồng bộ Google Trends ra trang chủ thành công!', 'success');
        }
        currentItems = data.items || validItems;
        await renderTable();
        updateKpis();
        syncTextareaFromCurrentItems();
      } else {
        showToast(data?.message || 'Lỗi khi lưu Google Trends (Mã ' + res.status + ')', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ: ' + e.message, 'error');
    } finally {
      isSavingInProgress = false;
      if (btn && !silent) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  window.TrendsAdmin.loadData = function() {
    loadData();
    bindTextareaEvents();
    bindModalEvents();
  };
  window.TrendsAdmin.addNewRow = addNewRow;
  window.TrendsAdmin.deleteRow = deleteRow;
  window.TrendsAdmin.onFieldChange = onFieldChange;
  window.TrendsAdmin.onFieldInput = onFieldInput;
  window.TrendsAdmin.applyBulkPaste = applyBulkPaste;
  window.TrendsAdmin.applyAndSaveBulk = applyAndSaveBulk;
  window.TrendsAdmin.autoProcessTextarea = autoProcessTextarea;
  window.TrendsAdmin.autoFormatTextarea = autoProcessTextarea;
  window.TrendsAdmin.assignMovie = assignMovie;
  window.TrendsAdmin.openAssignModal = openAssignModal;
  window.TrendsAdmin.closeAssignModal = closeAssignModal;
  window.TrendsAdmin.clearModalSearch = clearModalSearch;
  window.TrendsAdmin.filterModalResults = filterModalResults;
  window.TrendsAdmin.selectMovieForTrend = selectMovieForTrend;
  window.TrendsAdmin.removeAssignedMovie = removeAssignedMovie;
  window.TrendsAdmin.saveAll = saveAll;

  // Tự động kích hoạt ngay khi tải trang
  setTimeout(() => {
    bindTextareaEvents();
    bindModalEvents();
  }, 100);
  setTimeout(() => {
    bindTextareaEvents();
    bindModalEvents();
  }, 500);

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindTextareaEvents();
    bindModalEvents();
  });
})();
