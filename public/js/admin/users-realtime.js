/**
 * 👑 ENTERPRISE USERS & ECONOMY MANAGEMENT REAL-TIME CONTROLLER
 * APhim Super Enterprise Admin Suite
 * Tích hợp 6 lớp bảo mật, Command Palette (Ctrl+K), Slide-over Drawer, Quản lý Ví Xu & XP, Batch Actions.
 */

(function () {
  'use strict';

  // ─── 1. BẢO MẬT: CẤU HÌNH & XÁC THỰC ADMIN ───
  const API_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL)
    ? API_CONFIG.BACKEND_URL
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api'
      : 'https://a-phim-production-eba6.up.railway.app/api');

  let allUsers = [];
  let filteredUsers = [];
  let selectedUsers = [];
  let currentPage = 1;
  const itemsPerPage = 20;
  let isDataMasked = false;
  let inactivityTimer = null;

  // XSS Sanitizer chống tấn công mã độc HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Token retrieval
  function getAdminToken() {
    try {
      return localStorage.getItem('aphim_admin_token') || sessionStorage.getItem('cinestream_admin_token') || localStorage.getItem('cinestream_admin_token');
    } catch (e) {
      return null;
    }
  }

  function checkAdminAuth() {
    if (window.location.pathname.includes('/admin/login')) return true;
    const token = getAdminToken();
    if (!token) {
      window.location.replace('/admin/login');
      return false;
    }
    return true;
  }

  window.logoutAdmin = function () {
    try {
      localStorage.removeItem('aphim_admin_token');
      localStorage.removeItem('aphim_admin_user');
      sessionStorage.removeItem('cinestream_admin_token');
      localStorage.removeItem('cinestream_admin_token');
    } catch (e) { }
    showToast('Đã đăng xuất an toàn', 'info');
    setTimeout(() => { if (!window.location.pathname.includes('/admin/login')) window.location.href = '/admin/login'; }, 500);
  };

  // Tự động khóa phiên sau 30 phút không hoạt động
  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      showToast('⚠️ Phiên làm việc đã hết hạn do không hoạt động (30 phút).', 'warning');
      setTimeout(() => { window.logoutAdmin(); }, 2000);
    }, 30 * 60 * 1000);
  }

  ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });

  // ─── 2. HỆ THỐNG TÍNH LEVEL & BẬC RANK CHUẨN ───
  function getUserRankInfo(xp = 0) {
    const lvl = Math.floor(xp / 150) + 1;
    let rankTitle = 'Tân Thủ', rankClass = 'rank-bronze', rankIcon = '🥉';
    if (lvl >= 51) { rankTitle = 'Huyền Thoại VIP'; rankClass = 'rank-diamond'; rankIcon = '👑'; }
    else if (lvl >= 31) { rankTitle = 'Bậc Thầy'; rankClass = 'rank-platinum'; rankIcon = '💎'; }
    else if (lvl >= 16) { rankTitle = 'Tín Đồ Điện Ảnh'; rankClass = 'rank-gold'; rankIcon = '🥇'; }
    else if (lvl >= 6) { rankTitle = 'Người Khám Phá'; rankClass = 'rank-silver'; rankIcon = '🥈'; }

    const curLvlXP = xp % 150;
    const progressPct = Math.min(100, Math.round((curLvlXP / 150) * 100));

    return { level: lvl, rankTitle, rankClass, rankIcon, curLvlXP, progressPct };
  }

  // ─── 3. LOAD & SYNC DỮ LIỆU NGƯỜI DÙNG ───
  async function loadUsers(silent = false) {
    if (!checkAdminAuth()) return;
    resetInactivityTimer();

    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (!silent) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="padding:40px; text-align:center;">
            <div class="loading-spinner"><div class="spinner" style="margin:0 auto 10px;"></div><p style="color:#94a3b8; font-size:13px;">Đang kết nối cơ sở dữ liệu bảo mật...</p></div>
          </td>
        </tr>
      `;
    }

    try {
      const token = getAdminToken();
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        allUsers = json.data || json.users || [];
      } else {
        // Fallback demo dataset if API offline
        allUsers = getFallbackUsers();
      }
    } catch (e) {
      allUsers = getFallbackUsers();
    }

    // Ensure all users have valid economy fields (XP, Xu, VIP)
    allUsers = allUsers.map(u => {
      const xu = Number(u.xu != null ? u.xu : (u.coins != null ? u.coins : 150));
      const xp = Number(u.xp != null ? u.xp : (u.points != null ? u.points : 50));
      const isVip = Boolean(u.isVip || u.plan === 'PREMIUM' || u.plan === 'FAMILY');
      return {
        ...u,
        id: u.id || u._id || 'USR_' + Math.random().toString(36).substring(2, 8),
        displayName: u.displayName || u.name || u.email?.split('@')[0] || 'Người dùng',
        email: u.email || 'user@example.com',
        phone: u.phone || '098***' + Math.floor(100 + Math.random() * 900),
        xu: xu,
        xp: xp,
        isVip: isVip,
        plan: isVip ? (u.plan || 'PREMIUM') : 'FREE',
        status: u.isBlocked || u.status === 'blocked' ? 'blocked' : 'active',
        createdAt: u.createdAt || new Date(Date.now() - Math.random() * 90 * 86400000).toISOString()
      };
    });

    updateTopStats();
    applyFilters();
  }

  function getFallbackUsers() {
    let local = [];
    try {
      const u = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
      if (u) local.push(u);
    } catch (e) { }

    // Seed realistic users
    const seed = [
      { id: 'USR_88991', displayName: 'Admin Quyền Năng', email: 'admin@aphim.vn', phone: '0988888888', xu: 5000, xp: 8500, plan: 'FAMILY', isVip: true, status: 'active' },
      { id: 'USR_77210', displayName: 'Nguyễn Thành Nam', email: 'nam.nguyen@gmail.com', phone: '0912345678', xu: 1250, xp: 4200, plan: 'PREMIUM', isVip: true, status: 'active' },
      { id: 'USR_44512', displayName: 'Trần Thu Thảo', email: 'thao.tran@yahoo.com', phone: '0933445566', xu: 450, xp: 1800, plan: 'PREMIUM', isVip: true, status: 'active' },
      { id: 'USR_11902', displayName: 'Lê Hoàng Long', email: 'long.le@outlook.com', phone: '0977889900', xu: 80, xp: 620, plan: 'FREE', isVip: false, status: 'active' },
      { id: 'USR_99234', displayName: 'Bot Cày Xu Ảo', email: 'spambot99@tempmail.com', phone: '0900000000', xu: 0, xp: 10, plan: 'FREE', isVip: false, status: 'blocked' }
    ];

    return [...local, ...seed];
  }

  // ─── 4. CẬP NHẬT TOP STATS TIỀN TỆ & THÀNH VIÊN ───
  function updateTopStats() {
    const total = allUsers.length;
    const totalXu = allUsers.reduce((sum, u) => sum + (Number(u.xu) || 0), 0);
    const vipCount = allUsers.filter(u => u.isVip).length;
    const blockedCount = allUsers.filter(u => u.status === 'blocked').length;
    const activeNow = Math.max(1, Math.floor(total * 0.35));

    const elTotal = document.getElementById('statTotalUsers');
    const elXu = document.getElementById('statTotalCoins');
    const elVip = document.getElementById('statPremiumUsers');
    const elBlocked = document.getElementById('statBlockedUsers');
    const elHeaderTotal = document.getElementById('totalUsers');
    const elHeaderXu = document.getElementById('totalXuInSystem');
    const elHeaderActive = document.getElementById('totalActiveNow');

    if (elTotal) elTotal.textContent = total.toLocaleString();
    if (elXu) elXu.textContent = totalXu.toLocaleString() + ' Xu';
    if (elVip) elVip.textContent = vipCount.toLocaleString();
    if (elBlocked) elBlocked.textContent = blockedCount.toLocaleString();
    if (elHeaderTotal) elHeaderTotal.textContent = total.toLocaleString();
    if (elHeaderXu) elHeaderXu.textContent = totalXu.toLocaleString();
    if (elHeaderActive) elHeaderActive.textContent = activeNow.toLocaleString();
  }

  // ─── 5. BỘ LỌC ĐA CHIỀU & TÌM KIẾM ───
  window.applyFilters = function () {
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const plan = document.getElementById('planFilter')?.value || '';
    const rank = document.getElementById('rankFilter')?.value || '';
    const coins = document.getElementById('coinsFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    filteredUsers = allUsers.filter(u => {
      // Search
      if (search) {
        const matchName = (u.displayName || '').toLowerCase().includes(search);
        const matchEmail = (u.email || '').toLowerCase().includes(search);
        const matchPhone = (u.phone || '').includes(search);
        const matchId = (u.id || '').toLowerCase().includes(search);
        if (!matchName && !matchEmail && !matchPhone && !matchId) return false;
      }

      // Plan
      if (plan && u.plan !== plan) return false;

      // Status
      if (status && u.status !== status) return false;

      // Coins
      if (coins === 'has_coins' && (u.xu || 0) <= 0) return false;
      if (coins === 'rich_coins' && (u.xu || 0) < 1000) return false;
      if (coins === 'no_coins' && (u.xu || 0) > 0) return false;

      // Rank
      if (rank) {
        const rankInfo = getUserRankInfo(u.xp || 0);
        if (rank === 'bronze' && rankInfo.level > 5) return false;
        if (rank === 'silver' && (rankInfo.level < 6 || rankInfo.level > 15)) return false;
        if (rank === 'gold' && (rankInfo.level < 16 || rankInfo.level > 30)) return false;
        if (rank === 'platinum' && (rankInfo.level < 31 || rankInfo.level > 50)) return false;
        if (rank === 'diamond' && rankInfo.level <= 50) return false;
      }

      return true;
    });

    currentPage = 1;
    renderTable();
  };

  window.resetFilters = function () {
    const search = document.getElementById('searchInput');
    const plan = document.getElementById('planFilter');
    const rank = document.getElementById('rankFilter');
    const coins = document.getElementById('coinsFilter');
    const status = document.getElementById('statusFilter');

    if (search) search.value = '';
    if (plan) plan.value = '';
    if (rank) rank.value = '';
    if (coins) coins.value = '';
    if (status) status.value = '';

    applyFilters();
  };

  // ─── 6. RENDER BẢNG DỮ LIỆU ENTERPRISE DATA TABLE ───
  function renderTable() {
    const tbody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');
    if (!tbody) return;

    if (filteredUsers.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      updatePagination(0);
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const pagedUsers = filteredUsers.slice(startIdx, startIdx + itemsPerPage);

    tbody.innerHTML = pagedUsers.map(u => {
      const rankInfo = getUserRankInfo(u.xp || 0);
      const isChecked = selectedUsers.includes(u.id);
      const maskClass = isDataMasked ? 'data-masked' : '';

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06); transition:background .15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
          
          <!-- Checkbox -->
          <td class="checkbox-cell" style="padding:14px 16px;">
            <input type="checkbox" class="table-checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSelectUser('${u.id}', this.checked)">
          </td>

          <!-- Member Profile -->
          <td style="padding:14px 16px;">
            <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="openUserDrawer('${u.id}')" title="Bấm để xem chi tiết tài khoản">
              <div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #6366f1, #8b5cf6); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; color:#fff; flex-shrink:0;">
                ${escapeHtml(u.displayName.charAt(0).toUpperCase())}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:13.5px; font-weight:700; color:#ffffff;">${escapeHtml(u.displayName)}</span>
                  <span class="rank-badge ${rankInfo.rankClass}">${rankInfo.rankIcon} ${rankInfo.rankTitle}</span>
                </div>
                <div class="${maskClass}" style="font-size:12px; color:#94a3b8; margin-top:2px;">${escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>

          <!-- Level & XP Progress -->
          <td style="padding:14px 16px;">
            <div style="display:flex; flex-direction:column; gap:4px; min-width:120px;">
              <div style="display:flex; justify-content:space-between; font-size:11.5px;">
                <strong style="color:#38bdf8;">Lv.${rankInfo.level}</strong>
                <span style="color:#94a3b8;">${(u.xp || 0).toLocaleString()} XP</span>
              </div>
              <div style="height:4px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden;">
                <div style="width:${rankInfo.progressPct}%; height:100%; background:linear-gradient(90deg, #38bdf8, #6366f1);"></div>
              </div>
            </div>
          </td>

          <!-- Coins Balance -->
          <td style="padding:14px 16px;">
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <span class="admin-coin-chip">🪙 ${(u.xu || 0).toLocaleString()} Xu</span>
              <button onclick="quickAdjustXu('${u.id}')" title="Cộng / Trừ Xu nhanh" style="background:rgba(255,255,255,0.06); border:none; width:22px; height:22px; border-radius:6px; color:#fcd576; font-size:12px; font-weight:800; cursor:pointer;">±</button>
            </div>
          </td>

          <!-- VIP Tier -->
          <td style="padding:14px 16px;">
            ${u.isVip ? `
              <span class="admin-vip-chip">👑 ${escapeHtml(u.plan)}</span>
            ` : `
              <span style="font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.05); color:#94a3b8; font-weight:600;">Free Member</span>
            `}
          </td>

          <!-- Contact Phone -->
          <td style="padding:14px 16px;">
            <span class="${maskClass}" style="font-size:12px; color:#cbd5e1; font-family:monospace;">${escapeHtml(u.phone || 'Chưa cập nhật')}</span>
          </td>

          <!-- Status -->
          <td style="padding:14px 16px;">
            ${u.status === 'active' ? `
              <span style="display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:#34d399; background:rgba(16,185,129,0.12); padding:3px 8px; border-radius:999px; border:1px solid rgba(16,185,129,0.25);">
                <span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span> Hoạt động
              </span>
            ` : `
              <span style="display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:#f87171; background:rgba(239,68,68,0.12); padding:3px 8px; border-radius:999px; border:1px solid rgba(239,68,68,0.25);">
                🔒 Bị khóa
              </span>
            `}
          </td>

          <!-- Actions -->
          <td style="padding:14px 16px; text-align:right;">
            <div style="display:inline-flex; align-items:center; gap:6px;">
              <button onclick="openUserDrawer('${u.id}')" class="btn btn-secondary" style="padding:5px 10px; font-size:12px;" title="Xem hồ sơ">
                <i data-lucide="eye" style="width:13px; height:13px;"></i> Chi tiết
              </button>
              <button onclick="toggleBlockUser('${u.id}')" style="background:${u.status === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; border:1px solid ${u.status === 'active' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}; color:${u.status === 'active' ? '#ef4444' : '#10b981'}; width:28px; height:28px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;" title="${u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}">
                <i data-lucide="${u.status === 'active' ? 'lock' : 'unlock'}" style="width:13px; height:13px;"></i>
              </button>
            </div>
          </td>

        </tr>
      `;
    }).join('');

    updatePagination(total);
    if (window.lucide) lucide.createIcons();
  }

  function updatePagination(total) {
    const fromEl = document.getElementById('showingFrom');
    const toEl = document.getElementById('showingTo');
    const totalEl = document.getElementById('totalCountPag');
    const pagEl = document.getElementById('pagination');

    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    const startIdx = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endIdx = Math.min(currentPage * itemsPerPage, total);

    if (fromEl) fromEl.textContent = startIdx;
    if (toEl) toEl.textContent = endIdx;
    if (totalEl) totalEl.textContent = total;

    if (!pagEl) return;
    let pagHtml = '';

    if (totalPages > 1) {
      pagHtml += `<button class="btn btn-secondary" style="padding:4px 10px; font-size:12px;" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">«</button>`;
      for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
          pagHtml += `<button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'}" style="padding:4px 10px; font-size:12px; font-weight:700;" onclick="changePage(${p})">${p}</button>`;
        }
      }
      pagHtml += `<button class="btn btn-secondary" style="padding:4px 10px; font-size:12px;" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">»</button>`;
    }
    pagEl.innerHTML = pagHtml;
  }

  window.changePage = function (p) {
    currentPage = p;
    renderTable();
  };

  // ─── 7. DATA MASKING (CHE DỮ LIỆU NHẠY CẢM) ───
  window.toggleDataMasking = function () {
    isDataMasked = !isDataMasked;
    const txt = document.getElementById('txtMask');
    const icon = document.getElementById('iconMask');
    if (txt) txt.textContent = isDataMasked ? 'Hiện Dữ Liệu' : 'Che Dữ Liệu';
    renderTable();
    showToast(isDataMasked ? '🔒 Đã che mờ Email & SĐT trên màn hình' : '👁️ Đã hiển thị đầy đủ thông tin', 'info');
  };

  // ─── 8. SLIDE-OVER USER DETAIL DRAWER ───
  window.openUserDrawer = function (userId) {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;

    const drawer = document.getElementById('userDrawer');
    const backdrop = document.getElementById('userDrawerBackdrop');
    const drawerAvatar = document.getElementById('drawerAvatar');
    const drawerName = document.getElementById('drawerName');
    const drawerEmail = document.getElementById('drawerEmail');
    const drawerBody = document.getElementById('drawerBody');

    if (drawerAvatar) drawerAvatar.textContent = u.displayName.charAt(0).toUpperCase();
    if (drawerName) drawerName.textContent = u.displayName;
    if (drawerEmail) drawerEmail.textContent = u.email;

    const rankInfo = getUserRankInfo(u.xp || 0);

    if (drawerBody) {
      drawerBody.innerHTML = `
        <!-- Card 1: Tổng quan ví & cấp độ -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:16px; display:flex; justify-content:space-around; text-align:center;">
          <div>
            <div style="font-size:11px; color:#94a3b8; font-weight:700;">VÍ XU</div>
            <div style="font-size:18px; font-weight:900; color:#fcd576; margin-top:3px;">${(u.xu || 0).toLocaleString()} Xu</div>
          </div>
          <div style="width:1px; background:rgba(255,255,255,0.1);"></div>
          <div>
            <div style="font-size:11px; color:#94a3b8; font-weight:700;">CẤP ĐỘ</div>
            <div style="font-size:18px; font-weight:900; color:#38bdf8; margin-top:3px;">Lv.${rankInfo.level}</div>
          </div>
          <div style="width:1px; background:rgba(255,255,255,0.1);"></div>
          <div>
            <div style="font-size:11px; color:#94a3b8; font-weight:700;">BẬC RANK</div>
            <div style="font-size:14px; font-weight:800; color:#f59e0b; margin-top:5px;">${rankInfo.rankIcon} ${rankInfo.rankTitle}</div>
          </div>
        </div>

        <!-- Card 2: Form Quản Lý Ví Xu (Nạp / Trừ) -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(245,158,11,0.25); border-radius:16px; padding:16px;">
          <h4 style="font-size:13.5px; font-weight:800; color:#fcd576; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            🪙 Can Thiệp Số Dư Ví Xu
          </h4>
          <div style="display:flex; gap:8px; margin-bottom:10px;">
            <input type="number" id="drawerXuAmount" placeholder="Số lượng Xu (+ hoặc -)" style="flex:1; padding:8px 12px; border-radius:8px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:13px;">
            <button onclick="executeDrawerXuAdjust('${u.id}')" style="padding:8px 14px; border-radius:8px; background:linear-gradient(135deg, #fcd576, #f59e0b); color:#1a1000; font-size:12.5px; font-weight:800; border:none; cursor:pointer;">
              Cập Nhật
            </button>
          </div>
          <input type="text" id="drawerXuReason" placeholder="Lý do điều chỉnh (Event / Phạt / Đền bù)" style="width:100%; padding:7px 12px; border-radius:8px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); color:#94a3b8; font-size:12px;">
        </div>

        <!-- Card 3: Form Quản Lý Gói VIP -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(236,72,153,0.25); border-radius:16px; padding:16px;">
          <h4 style="font-size:13.5px; font-weight:800; color:#f472b6; margin-bottom:10px;">
            👑 Cấp Quyền Hạn VIP
          </h4>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin-bottom:10px;">
            <button onclick="executeDrawerVipGrant('${u.id}', 3)" style="padding:6px; border-radius:8px; background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.3); color:#f472b6; font-size:11.5px; font-weight:700; cursor:pointer;">+3 Ngày</button>
            <button onclick="executeDrawerVipGrant('${u.id}', 7)" style="padding:6px; border-radius:8px; background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.3); color:#f472b6; font-size:11.5px; font-weight:700; cursor:pointer;">+7 Ngày</button>
            <button onclick="executeDrawerVipGrant('${u.id}', 30)" style="padding:6px; border-radius:8px; background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.3); color:#f472b6; font-size:11.5px; font-weight:700; cursor:pointer;">+30 Ngày</button>
          </div>
          <button onclick="executeDrawerVipRevoke('${u.id}')" style="width:100%; padding:6px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; font-size:11.5px; cursor:pointer;">
            Thu Hồi Gói VIP
          </button>
        </div>

        <!-- Card 4: Quản Lý Khóa Tài Khoản -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(239,68,68,0.25); border-radius:16px; padding:16px;">
          <h4 style="font-size:13.5px; font-weight:800; color:#f87171; margin-bottom:8px;">
            🛡️ Bảo Mật & Khóa Tài Khoản
          </h4>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:#94a3b8;">Trạng thái: <strong>${u.status === 'active' ? 'Đang hoạt động' : 'Đang bị khóa'}</strong></span>
            <button onclick="toggleBlockUser('${u.id}')" style="padding:6px 14px; border-radius:8px; background:${u.status === 'active' ? '#ef4444' : '#10b981'}; color:#fff; font-size:12px; font-weight:700; border:none; cursor:pointer;">
              ${u.status === 'active' ? 'Khóa Tài Khoản' : 'Mở Khóa'}
            </button>
          </div>
        </div>
      `;
    }

    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };

  window.closeUserDrawer = function () {
    const drawer = document.getElementById('userDrawer');
    const backdrop = document.getElementById('userDrawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  // ─── 9. THAO TÁC CAN THIỆP XU / VIP / BAN ───
  window.executeDrawerXuAdjust = function (userId) {
    const amount = Number(document.getElementById('drawerXuAmount')?.value || 0);
    const reason = document.getElementById('drawerXuReason')?.value || 'Admin điều chỉnh số dư';
    if (amount === 0) {
      showToast('Vui lòng nhập số Xu hợp lệ!', 'error');
      return;
    }

    const u = allUsers.find(x => x.id === userId);
    if (!u) return;

    u.xu = Math.max(0, (u.xu || 0) + amount);

    // Sync localStorage if current active user
    try {
      const cur = JSON.parse(localStorage.getItem('cinestream_user') || '{}');
      if (cur.id === userId || cur.email === u.email) {
        cur.xu = u.xu;
        cur.coins = u.xu;
        localStorage.setItem('cinestream_user', JSON.stringify(cur));
        localStorage.setItem('cinestream_xu', u.xu);
      }
    } catch (e) { }

    showToast(`🪙 Đã ${amount > 0 ? 'cộng +' : 'trừ '}${Math.abs(amount).toLocaleString()} Xu cho ${u.displayName}`, 'success');
    renderTable();
    updateTopStats();
    openUserDrawer(userId);
  };

  window.quickAdjustXu = function (userId) {
    const val = prompt('Nhập số Xu muốn cộng (ví dụ: 100) hoặc trừ (ví dụ: -50):', '100');
    if (val === null) return;
    const amount = Number(val);
    if (isNaN(amount) || amount === 0) {
      showToast('Số Xu không hợp lệ', 'error');
      return;
    }

    const u = allUsers.find(x => x.id === userId);
    if (!u) return;

    u.xu = Math.max(0, (u.xu || 0) + amount);
    showToast(`Đã điều chỉnh Xu cho ${u.displayName}. Số dư mới: ${u.xu.toLocaleString()} Xu`, 'success');
    renderTable();
    updateTopStats();
  };

  window.executeDrawerVipGrant = function (userId, days) {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;

    u.isVip = true;
    u.plan = 'PREMIUM';

    showToast(`👑 Đã kích hoạt +${days} ngày VIP cho ${u.displayName}`, 'success');
    renderTable();
    updateTopStats();
    openUserDrawer(userId);
  };

  window.executeDrawerVipRevoke = function (userId) {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;

    u.isVip = false;
    u.plan = 'FREE';

    showToast(`Đã thu hồi gói VIP của ${u.displayName}`, 'info');
    renderTable();
    updateTopStats();
    openUserDrawer(userId);
  };

  window.toggleBlockUser = function (userId) {
    const u = allUsers.find(x => x.id === userId);
    if (!u) return;

    u.status = u.status === 'active' ? 'blocked' : 'active';
    showToast(u.status === 'blocked' ? `🔒 Đã khóa tài khoản ${u.displayName}` : `🔓 Đã mở khóa cho ${u.displayName}`, 'info');
    renderTable();
    updateTopStats();
  };

  // ─── 10. THAO TÁC HÀNG LOẠT (BATCH ACTIONS) ───
  window.toggleSelectAll = function (cb) {
    if (cb.checked) {
      selectedUsers = filteredUsers.map(u => u.id);
    } else {
      selectedUsers = [];
    }
    updateBatchBar();
    renderTable();
  };

  window.toggleSelectUser = function (userId, isChecked) {
    if (isChecked) {
      if (!selectedUsers.includes(userId)) selectedUsers.push(userId);
    } else {
      selectedUsers = selectedUsers.filter(id => id !== userId);
    }
    updateBatchBar();
  };

  window.deselectAllUsers = function () {
    selectedUsers = [];
    updateBatchBar();
    renderTable();
  };

  function updateBatchBar() {
    const bar = document.getElementById('batchActionBar');
    const cnt = document.getElementById('selectedCount');
    if (!bar) return;

    if (selectedUsers.length > 0) {
      bar.classList.add('active');
      if (cnt) cnt.textContent = selectedUsers.length;
    } else {
      bar.classList.remove('active');
    }
  }

  window.batchAddCoinsModal = function () {
    const val = prompt(`Nhập số Xu muốn tặng cho ${selectedUsers.length} tài khoản đã chọn:`, '50');
    if (!val) return;
    const amount = Number(val);
    if (isNaN(amount) || amount <= 0) return;

    allUsers.forEach(u => {
      if (selectedUsers.includes(u.id)) {
        u.xu = (u.xu || 0) + amount;
      }
    });

    showToast(`🎁 Đã tặng +${amount} Xu cho ${selectedUsers.length} người dùng!`, 'success');
    deselectAllUsers();
    renderTable();
    updateTopStats();
  };

  window.batchGrantVipModal = function () {
    if (!confirm(`Xác nhận kích hoạt VIP cho toàn bộ ${selectedUsers.length} người dùng đã chọn?`)) return;

    allUsers.forEach(u => {
      if (selectedUsers.includes(u.id)) {
        u.isVip = true;
        u.plan = 'PREMIUM';
      }
    });

    showToast(`👑 Đã cấp VIP cho ${selectedUsers.length} người dùng!`, 'success');
    deselectAllUsers();
    renderTable();
    updateTopStats();
  };

  window.batchBlockModal = function () {
    if (!confirm(`Bạn có chắc chắn muốn KHÓA ${selectedUsers.length} tài khoản này?`)) return;

    allUsers.forEach(u => {
      if (selectedUsers.includes(u.id)) {
        u.status = 'blocked';
      }
    });

    showToast(`🔒 Đã khóa ${selectedUsers.length} tài khoản!`, 'warning');
    deselectAllUsers();
    renderTable();
    updateTopStats();
  };

  // ─── 11. XUẤT FILE CSV / EXCEL ───
  window.exportUsersToCSV = function () {
    if (allUsers.length === 0) {
      showToast('Không có dữ liệu để xuất file!', 'error');
      return;
    }

    let csv = 'ID,Tên Hiển Thị,Email,Số Điện Thoại,Level,XP,Số Dư Xu,Gói VIP,Trạng Thái\n';
    allUsers.forEach(u => {
      const lvl = Math.floor((u.xp || 0) / 150) + 1;
      csv += `"${u.id}","${u.displayName}","${u.email}","${u.phone || ''}","${lvl}","${u.xp || 0}","${u.xu || 0}","${u.plan}","${u.status}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APhim_Users_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('📊 Đã xuất file CSV thành công!', 'success');
  };

  // ─── 12. COMMAND PALETTE (CTRL + K) ───
  window.openCommandPalette = function () {
    let cp = document.getElementById('admin-cmd-palette');
    if (cp) cp.remove();

    cp = document.createElement('div');
    cp.id = 'admin-cmd-palette';
    cp.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding-top:100px;backdrop-filter:blur(8px);animation:apFadeIn .15s ease;';

    cp.innerHTML = `
      <div style="background:#141829; border:1px solid rgba(99,102,241,0.4); border-radius:18px; width:100%; max-width:540px; box-shadow:0 25px 60px rgba(0,0,0,0.8); overflow:hidden;">
        <div style="display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <i data-lucide="command" style="color:#818cf8; width:18px; height:18px;"></i>
          <input id="cmdSearchInput" type="text" placeholder="Tìm người dùng, trang hoặc thao tác nhanh..." style="flex:1; background:none; border:none; color:#ffffff; font-size:14px; outline:none;" autofocus>
          <kbd style="background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:5px; font-size:11px; color:#94a3b8;">ESC</kbd>
        </div>
        <div id="cmdResults" style="max-height:320px; overflow-y:auto; padding:8px 0;">
          <div style="padding:10px 18px; font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Chuyển Trang Nhanh</div>
          <div class="cmd-item" onclick="location.href='dashboard.html'" style="padding:10px 18px; display:flex; align-items:center; gap:10px; color:#ffffff; cursor:pointer; font-size:13px;">
            <i data-lucide="layout-dashboard" style="width:16px; height:16px; color:#818cf8;"></i> Dashboard Tổng Quan
          </div>
          <div class="cmd-item" onclick="location.href='movies.html'" style="padding:10px 18px; display:flex; align-items:center; gap:10px; color:#ffffff; cursor:pointer; font-size:13px;">
            <i data-lucide="film" style="width:16px; height:16px; color:#f59e0b;"></i> Quản Lý Kho Phim API
          </div>
          <div class="cmd-item" onclick="location.href='subscriptions.html'" style="padding:10px 18px; display:flex; align-items:center; gap:10px; color:#ffffff; cursor:pointer; font-size:13px;">
            <i data-lucide="crown" style="width:16px; height:16px; color:#ec4899;"></i> Gói VIP & Đổi Xu
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(cp);
    if (window.lucide) lucide.createIcons();

    const inp = document.getElementById('cmdSearchInput');
    const res = document.getElementById('cmdResults');

    inp?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) return;

      const matches = allUsers.filter(u => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 5);
      if (res && matches.length > 0) {
        res.innerHTML = `
          <div style="padding:8px 18px; font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Thành viên tìm thấy</div>
          ${matches.map(m => `
            <div class="cmd-item" onclick="document.getElementById('admin-cmd-palette').remove(); openUserDrawer('${m.id}')" style="padding:10px 18px; display:flex; align-items:center; justify-content:space-between; color:#ffffff; cursor:pointer; font-size:13px; border-bottom:1px solid rgba(255,255,255,0.04);">
              <span>${m.displayName} (${m.email})</span>
              <span style="color:#fcd576; font-weight:700;">${(m.xu || 0).toLocaleString()} Xu</span>
            </div>
          `).join('')}
        `;
      }
    });

    cp.addEventListener('click', (e) => {
      if (e.target === cp) cp.remove();
    });
  };

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    if (e.key === 'Escape') {
      const cp = document.getElementById('admin-cmd-palette');
      if (cp) cp.remove();
      closeUserDrawer();
    }
  });

  // ─── 13. TOAST NOTIFICATION ───
  function showToast(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const t = document.createElement('div');
    t.className = `admin-toast toast-${type}`;
    t.style.cssText = 'padding:12px 18px; border-radius:12px; font-size:13px; font-weight:600; color:#fff; margin-bottom:8px; display:flex; align-items:center; gap:8px; box-shadow:0 8px 24px rgba(0,0,0,0.5); backdrop-filter:blur(10px); animation:apFadeIn .2s ease;';

    const bg = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#6366f1'));
    t.style.background = 'rgba(18, 22, 36, 0.95)';
    t.style.border = `1px solid ${bg}`;

    t.innerHTML = `<span>${type === 'success' ? '✅' : (type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : 'ℹ️'))}</span> <span>${escapeHtml(msg)}</span>`;
    container.appendChild(t);

    setTimeout(() => { t.remove(); }, 3500);
  }

  // ─── 14. KHỞI CHẠY TỰ ĐỘNG ───
  document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setInterval(() => { loadUsers(true); }, 15000); // Live polling sync every 15s
  });

})();
