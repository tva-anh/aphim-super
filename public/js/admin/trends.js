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
                  (document.cookie.match(/(?:^|;\s*)(?:aphim_admin_token|cinestream_admin_token|adminToken)=([^;]+)/) || [])[1] || '';
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
      .replace(/^(xem phim|phim|vé xem phim)\s+/i, '')
      .replace(/\s+(xem phim|xem|phim|tập\s+\d+.*)$/i, '')
      .trim();
  }

  async function resolveMovie(keyword) {
    const clean = cleanKeyword(keyword);
    if (!clean) return null;
    if (movieCache.has(clean)) return movieCache.get(clean);

    try {
      const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(clean)}&limit=4`);
      const data = await res.json();
      const items = data?.data?.items || [];
      if (!items.length) {
        movieCache.set(clean, null);
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

      movieCache.set(clean, found);
      return found;
    } catch {
      return null;
    }
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
      const res = await fetch('/api/admin/trends', {
        headers: { 'Authorization': 'Bearer ' + token },
        credentials: 'same-origin'
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.items)) {
        currentItems = data.items;
        await renderTable();
        updateKpis();
      } else {
        showToast(data.message || 'Không thể tải danh sách Trends', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ: ' + e.message, 'error');
    }
  }

  async function renderTable() {
    const tbody = document.getElementById('trendsTableBody');
    if (!tbody) return;

    if (!currentItems.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">
            Chưa có từ khóa nào. Hãy thêm từ khóa hoặc dán danh sách hàng loạt ở cột bên phải.
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
            <input type="text" class="form-control trend-query-input" value="${q.replace(/"/g, '&quot;')}" placeholder="Cụm từ tìm kiếm" style="width:100%;font-size:13px;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;" onchange="window.TrendsAdmin.onFieldChange(${idx}, 'query', this.value)" />
          </td>
          <td style="padding:12px 14px;">
            <input type="text" class="form-control trend-traffic-input" value="${t.replace(/"/g, '&quot;')}" placeholder="+100%" style="width:100%;font-size:13px;font-weight:700;padding:8px 10px;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:6px;color:#f97316;" onchange="window.TrendsAdmin.onFieldChange(${idx}, 'traffic', this.value)" />
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
      const movie = await resolveMovie(item.query || item.title);
      if (movie) {
        const poster = movie.poster_url || movie.thumb_url || '';
        const imgUrl = poster.startsWith('http') ? poster : `https://phimimg.com/${poster}`;
        cell.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${imgUrl}" alt="${movie.name}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;border:1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'" />
            <div style="overflow:hidden;">
              <div style="font-size:13px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${movie.name}
              </div>
              <div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                ${movie.origin_name || movie.slug}
              </div>
            </div>
            <span class="badge badge-emerald" style="margin-left:auto;font-size:10px;padding:2px 6px;flex-shrink:0;">
              ✓ Đã khớp
            </span>
          </div>
        `;
        if (idx === 0) updatePreviewCard(movie, item.traffic);
      } else {
        cell.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;color:#f59e0b;font-size:12px;">
            <i data-lucide="alert-circle" style="width:14px;height:14px;"></i>
            <span>Chưa tìm thấy phim khớp</span>
          </div>
        `;
      }
      if (window.lucide) lucide.createIcons();
    });
  }

  function updatePreviewCard(movie, traffic) {
    if (!movie) return;
    const poster = movie.poster_url || movie.thumb_url || '';
    const imgUrl = poster.startsWith('http') ? poster : `https://phimimg.com/${poster}`;
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

  function onFieldChange(index, field, val) {
    if (!currentItems[index]) return;
    currentItems[index][field] = val.trim();
    if (field === 'query') {
      currentItems[index].title = cleanKeyword(val);
      // Re-trigger movie resolve
      resolveMovie(val).then(movie => {
        const cell = document.getElementById(`movieMatchCell-${index}`);
        if (cell && movie) {
          const poster = movie.poster_url || movie.thumb_url || '';
          const imgUrl = poster.startsWith('http') ? poster : `https://phimimg.com/${poster}`;
          cell.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <img src="${imgUrl}" alt="${movie.name}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;" />
              <div>
                <div style="font-size:13px;font-weight:700;color:#fff;">${movie.name}</div>
                <div style="font-size:11px;color:#94a3b8;">${movie.origin_name}</div>
              </div>
            </div>
          `;
        }
      });
    }
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
  }

  function deleteRow(index) {
    if (typeof index !== 'number' || index < 0 || index >= currentItems.length) return;
    currentItems.splice(index, 1);
    renderTable();
    updateKpis();
    showToast('Đã xóa 1 từ khóa khỏi danh sách', 'info');
  }

  function parseTrendsInput(raw) {
    if (!raw || !raw.trim()) return [];
    
    // Loại bỏ ký tự ẩn / bidi / LRM (\u200E) do Google Trends tự chèn vào số %
    const cleanRaw = raw.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
    const rawLines = cleanRaw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results = [];

    // 1. Trường hợp copy bảng dạng TSV (tab-separated)
    const hasTabs = rawLines.some(l => l.includes('\t'));
    if (hasTabs) {
      for (const line of rawLines) {
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

    // 2. Trường hợp copy tuần tự từ bảng Google Trends (gồm STT, Từ khóa, north, +250%)
    let currentQuery = '';
    let currentTraffic = '';

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      
      // Bỏ qua số thứ tự: 1, 2, 10
      if (/^\d+$/.test(line)) continue;
      
      // Bỏ qua từ định hướng icon: north, south, arrow_upward, etc.
      if (/^(north|south|arrow_upward|arrow_downward|more_vert|arrow)$/i.test(line)) continue;

      // Nếu dòng đã có phân cách: từ khóa | +250%
      if (line.includes('|')) {
        const [q, t] = line.split('|').map(s => s.trim());
        if (q) {
          results.push({
            query: q,
            title: cleanKeyword(q),
            traffic: t || '+100%'
          });
        }
        continue;
      }

      // Kiểm tra dòng có phải là chỉ số tăng trưởng: +250%, 80%, Đột phá
      const isTraffic = /^(\+|-)?\d+[%+]?$/.test(line) || /^(đột phá|đột biến|breakout)$/i.test(line);
      if (isTraffic) {
        currentTraffic = line;
        if (currentQuery) {
          results.push({
            query: currentQuery,
            title: cleanKeyword(currentQuery),
            traffic: currentTraffic
          });
          currentQuery = '';
          currentTraffic = '';
        }
        continue;
      }

      // Ngược lại, đây là tên từ khóa
      if (currentQuery) {
        results.push({
          query: currentQuery,
          title: cleanKeyword(currentQuery),
          traffic: currentTraffic || '+100%'
        });
        currentTraffic = '';
      }
      currentQuery = line;
    }

    if (currentQuery) {
      results.push({
        query: currentQuery,
        title: cleanKeyword(currentQuery),
        traffic: currentTraffic || '+100%'
      });
    }

    return results;
  }

  function applyBulkPaste() {
    const textarea = document.getElementById('bulkPasteTextarea');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) {
      showToast('Vui lòng dán danh sách từ khóa trước!', 'warning');
      return;
    }

    const parsed = parseTrendsInput(raw);

    if (!parsed.length) {
      showToast('Không tìm thấy từ khóa hợp lệ nào!', 'error');
      return;
    }

    currentItems = parsed;
    renderTable();
    updateKpis();

    // Chuẩn hóa và hiển thị lại nội dung theo từng dòng: Từ khóa | % Tăng
    textarea.value = parsed.map(item => `${item.query} | ${item.traffic}`).join('\n');

    showToast(`Đã nhận diện thành công ${parsed.length} từ khóa! Hãy kiểm tra và nhấn "Lưu & Đồng Bộ"`, 'success');
  }

  function autoFormatTextarea() {
    const textarea = document.getElementById('bulkPasteTextarea');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) return;
    // Tự động nhận diện nếu dán dạng bảng Google Trends (chứa tab, north, south, hoặc nhiều dòng chưa có '|')
    if (/north|south|\t|\n\d+\s*\n/i.test(raw) || (raw.includes('\n') && !raw.includes('|'))) {
      const parsed = parseTrendsInput(raw);
      if (parsed.length > 0) {
        textarea.value = parsed.map(item => `${item.query} | ${item.traffic}`).join('\n');
      }
    }
  }

  function bindTextareaEvents() {
    const textarea = document.getElementById('bulkPasteTextarea');
    if (!textarea || textarea._hasAutoFormat) return;
    textarea._hasAutoFormat = true;
    textarea.addEventListener('paste', () => {
      setTimeout(autoFormatTextarea, 50);
    });
    textarea.addEventListener('input', () => {
      setTimeout(autoFormatTextarea, 250);
    });
  }

  async function saveAll() {
    const btn = document.getElementById('btnSaveTopTrends');
    const validItems = currentItems.filter(it => (it.query || it.title || '').trim().length > 0);
    if (!validItems.length) {
      showToast('Danh sách từ khóa không được để trống!', 'warning');
      return;
    }

    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Đang đồng bộ...';
      if (window.lucide) lucide.createIcons();
    }

    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        credentials: 'same-origin',
        body: JSON.stringify({ items: validItems })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(data.message || 'Đã lưu và đồng bộ Google Trends ra trang chủ thành công!', 'success');
        currentItems = data.items || validItems;
        await renderTable();
        updateKpis();
      } else {
        showToast(data.message || 'Lỗi khi lưu Google Trends', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ: ' + e.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  window.TrendsAdmin.loadData = function() {
    loadData();
    bindTextareaEvents();
  };
  window.TrendsAdmin.addNewRow = addNewRow;
  window.TrendsAdmin.deleteRow = deleteRow;
  window.TrendsAdmin.onFieldChange = onFieldChange;
  window.TrendsAdmin.applyBulkPaste = applyBulkPaste;
  window.TrendsAdmin.autoFormatTextarea = autoFormatTextarea;
  window.TrendsAdmin.saveAll = saveAll;

  // Tự động kích hoạt ngay khi tải trang
  setTimeout(bindTextareaEvents, 100);
  setTimeout(bindTextareaEvents, 500);

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindTextareaEvents();
  });
})();
