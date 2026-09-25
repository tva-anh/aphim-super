/**
 * 🎮 GAMIFICATION CORE ENGINE - APHIM / CINESTREAM
 * Hệ thống Điểm (XP), Kiếm Xu, Chuỗi Điểm Danh 7 Ngày, Nhiệm Vụ Ngày, 12 Thành Tựu & Đổi VIP
 * Chuẩn cân bằng giá trị chống lạm phát Xu.
 */

(function () {
  'use strict';

  // ─── 1. CẤU HÌNH BẢN QUY HOẠCH KINH TẾ ĐÃ DUYỆT ───
  const STREAK_REWARDS = [
    { day: 1, xp: 20, xu: 2, label: 'Ngày 1' },
    { day: 2, xp: 25, xu: 3, label: 'Ngày 2' },
    { day: 3, xp: 30, xu: 4, label: 'Ngày 3' },
    { day: 4, xp: 35, xu: 5, label: 'Ngày 4' },
    { day: 5, xp: 40, xu: 6, label: 'Ngày 5' },
    { day: 6, xp: 45, xu: 7, label: 'Ngày 6' },
    { day: 7, xp: 100, xu: 15, luckyTicket: 1, label: 'Ngày 7 (Trọn Tuần)' }
  ];

  const DAILY_MISSIONS_DEF = [
    { id: 'watch15', title: 'Khởi Động Phim', desc: 'Xem phim tối thiểu 15 phút', xp: 30, xu: 2, target: 15, unit: 'phút' },
    { id: 'watch45', title: 'Cày Phim Chăm Chỉ', desc: 'Xem phim tối thiểu 45 phút', xp: 50, xu: 3, target: 45, unit: 'phút' },
    { id: 'comment', title: 'Bình Luận Đóng Góp', desc: 'Đăng bình luận phim (>= 15 ký tự)', xp: 20, xu: 2, target: 2, unit: 'lần' },
    { id: 'favorite', title: 'Yêu Thích Phim', desc: 'Thêm 1 phim vào danh sách Yêu thích', xp: 10, xu: 1, target: 1, unit: 'lần' },
    { id: 'share', title: 'Lan Tỏa Phim', desc: 'Chia sẻ link phim lên mạng xã hội', xp: 20, xu: 1, target: 1, unit: 'lần' }
  ];

  const RANKS_DEF = [
    { minLvl: 1, maxLvl: 5, rank: 'Tân Thủ APhim', tier: 'bronze', icon: '🥉', color: '#cd7f32' },
    { minLvl: 6, maxLvl: 15, rank: 'Người Khám Phá', tier: 'silver', icon: '🥈', color: '#cbd5e1' },
    { minLvl: 16, maxLvl: 30, rank: 'Tín Đồ Điện Ảnh', tier: 'gold', icon: '🥇', color: '#f59e0b' },
    { minLvl: 31, maxLvl: 50, rank: 'Bậc Thầy Phim Ảnh', tier: 'platinum', icon: '💎', color: '#38bdf8' },
    { minLvl: 51, maxLvl: 999, rank: 'Huyền Thoại VIP', tier: 'diamond', icon: '👑', color: '#ec4899' }
  ];

  // ─── 2. CÁC HÀM GETTER / SETTER DỮ LIỆU CỐT LÕI ───
  function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('cinestream_user') || 'null');
    } catch (e) {
      return null;
    }
  }

  function isUserLoggedIn() {
    try {
      if (typeof authService !== 'undefined' && typeof authService.isLoggedIn === 'function') {
        return Boolean(authService.isLoggedIn());
      }
      const u = getUser();
      const token = localStorage.getItem('cinestream_token');
      return Boolean(u && (u._id || u.id || u.email || u.username) && token);
    } catch (e) {
      return false;
    }
  }

  function getXu() {
    if (!isUserLoggedIn()) {
      return 0;
    }
    const u = getUser();
    if (u && (u.xu != null || u.coins != null)) {
      const val = Number(u.xu != null ? u.xu : u.coins);
      localStorage.setItem('cinestream_xu', String(val));
      return val;
    }
    const rawLocal = localStorage.getItem('cinestream_xu');
    if (rawLocal !== null && rawLocal !== '' && !isNaN(Number(rawLocal))) {
      return Number(rawLocal);
    }
    return 0;
  }

  function setXu(newXu) {
    if (!isUserLoggedIn()) {
      return 0;
    }
    const val = Math.max(0, Math.round(newXu));
    localStorage.setItem('cinestream_xu', val);
    const u = getUser();
    if (u) {
      u.xu = val;
      u.coins = val;
      try { localStorage.setItem('cinestream_user', JSON.stringify(u)); } catch (e) { }
    }
    try {
      if (typeof authService !== 'undefined') {
        if (authService.currentUser) {
          authService.currentUser.xu = val;
          authService.currentUser.coins = val;
        }
        if (typeof authService.saveUser === 'function' && authService.currentUser) {
          authService.saveUser(authService.currentUser);
        }
        if (typeof authService.updateProfile === 'function') {
          authService.updateProfile({ xu: val });
        }
      }
    } catch (e) { }
    window.dispatchEvent(new CustomEvent('gamificationUpdated', { detail: { xu: val } }));
    updateHeaderChips();
    return val;
  }

  function getXP() {
    if (!isUserLoggedIn()) {
      return 0;
    }
    const u = getUser();
    let localXP = Number(localStorage.getItem('cinestream_xp') || 0);
    if (u && u.xp != null) {
      localXP = Math.max(localXP, Number(u.xp));
    }
    return localXP;
  }

  function setXP(newXP) {
    if (!isUserLoggedIn()) {
      return 0;
    }
    const val = Math.max(0, Math.round(newXP));
    localStorage.setItem('cinestream_xp', val);
    const u = getUser();
    if (u) {
      u.xp = val;
      try { localStorage.setItem('cinestream_user', JSON.stringify(u)); } catch (e) { }
    }
    try {
      if (typeof authService !== 'undefined') {
        if (authService.currentUser) authService.currentUser.xp = val;
        if (typeof authService.saveUser === 'function' && authService.currentUser) authService.saveUser(authService.currentUser);
        if (typeof authService.updateProfile === 'function') authService.updateProfile({ xp: val });
      }
    } catch (e) { }
    window.dispatchEvent(new CustomEvent('gamificationUpdated', { detail: { xp: val } }));
    updateHeaderChips();
    return val;
  }

  function updateHeaderChips() {
    const curXu = getXu();
    const curXP = getXP();
    const lvlInfo = calculateLevel(curXP);

    // Update all coin elements across entire app in real-time
    const coinEls = document.querySelectorAll('.header-coin-val, #headerCoinVal, #sidebarCoinVal, .shop-coin-amount, .avatar-wallet-val, .ap-header-coin-val');
    coinEls.forEach(el => {
      if (el.classList.contains('shop-coin-amount')) {
        el.innerHTML = `${curXu.toLocaleString()} <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">Xu</span>`;
      } else {
        el.textContent = curXu.toLocaleString();
      }
    });
    const walletBoxes = document.querySelectorAll('.avatar-wallet-balance:not(:has(.avatar-wallet-val))');
    walletBoxes.forEach(el => {
      el.innerHTML = `<span class="avatar-wallet-val">${curXu.toLocaleString()}</span> <span style="font-size:11px;color:#fcd576;font-weight:700;">XU</span>`;
    });

    // Update all Level elements across entire app in real-time
    const levelEls = document.querySelectorAll('#statLevel, #currentLevelLabel, #heroLevelPill, #epLevelPill, #navLevelText, .user-level-val, .level-tag, #sidebarLevelTxt');
    levelEls.forEach(el => {
      if (el.id === 'heroLevelPill' || el.id === 'epLevelPill') {
        el.textContent = `Cấp ${lvlInfo.level}`;
      } else if (el.id === 'sidebarLevelTxt') {
        el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9v3a6 6 0 0012 0V9M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2m12 6h2a2 2 0 002-2V5a2 2 0 00-2-2h-2M12 18v3m-4 0h8"/></svg> VIP Level ${lvlInfo.level}`;
      } else {
        el.textContent = lvlInfo.level;
      }
    });

    // Update all Streak elements across entire app in real-time
    const streakData = getDailyStreakData();
    const streakEls = document.querySelectorAll('#sidebarStreakTxt, .streak-badge-val, .user-streak-val');
    streakEls.forEach(el => {
      if (el.id === 'sidebarStreakTxt') {
        el.textContent = `${streakData.streak}/7 Ngày`;
      } else {
        el.textContent = `${streakData.streak} Ngày`;
      }
    });
  }

  function calculateLevel(xp) {
    const u = getUser();
    let lvl = (u && u.level != null && Number(u.level) > 0) ? Number(u.level) : (Math.floor((xp || 0) / 150) + 1);
    let currentLvlXP = (xp || 0) % 150;
    let nextLvlXP = 150;
    let progressPct = Math.min(100, Math.round((currentLvlXP / nextLvlXP) * 100));

    let rankInfo = RANKS_DEF[0];
    for (let r of RANKS_DEF) {
      if (lvl >= r.minLvl && lvl <= r.maxLvl) {
        rankInfo = r;
        break;
      }
    }

    return {
      level: lvl,
      currentLvlXP: currentLvlXP,
      nextLvlXP: nextLvlXP,
      progressPct: progressPct,
      totalXP: xp,
      rankTitle: rankInfo.rank,
      rankTier: rankInfo.tier,
      rankIcon: rankInfo.icon,
      rankColor: rankInfo.color
    };
  }

  function addReward(xpAmount, xuAmount, reason) {
    if (!isUserLoggedIn()) {
      return null;
    }
    const curXP = getXP();
    const curXu = getXu();
    const oldLevel = calculateLevel(curXP).level;

    const newXP = setXP(curXP + (xpAmount || 0));
    const newXu = setXu(curXu + (xuAmount || 0));
    const newLevelInfo = calculateLevel(newXP);

    let toastMsg = `🎁 <strong>Nhận thưởng:</strong>`;
    if (xpAmount > 0) toastMsg += ` <span style="color:#38bdf8;font-weight:800;">+${xpAmount} XP</span>`;
    if (xuAmount > 0) toastMsg += ` <span style="color:#fcd576;font-weight:800;">+${xuAmount} Xu</span>`;
    if (reason) toastMsg += `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${reason}</div>`;

    showGamificationToast(toastMsg, 'reward');

    // Kiểm tra Level up
    if (newLevelInfo.level > oldLevel) {
      showGamificationToast(`🎉 <strong>CHÚC MỪNG LÊN CẤP ${newLevelInfo.level}!</strong><div style="font-size:11.5px;color:#fcd576;margin-top:2px;">Danh hiệu: ${newLevelInfo.rankIcon} ${newLevelInfo.rankTitle}</div>`, 'levelup');
    }

    return { newXP, newXu, levelInfo: newLevelInfo };
  }

  // ─── 4. DAILY STREAK 7 NGÀY ───
  function getDailyStreakData() {
    let raw = {};
    try {
      raw = JSON.parse(localStorage.getItem('ap_daily_streak_v2') || '{}');
    } catch (e) { }

    const today = getTodayString();
    const u = getUser();
    let currentStreak = (u && u.streak_current != null) ? Number(u.streak_current) : (Number(raw.streak || raw.current) || 0);
    const lastDate = (u && u.streak_last_claimed) ? u.streak_last_claimed : (raw.lastDate || '');
    const claimedDates = raw.claimedDates || [];

    // Kiểm tra xem hôm nay đã điểm danh chưa
    const isClaimedToday = (lastDate === today);

    // Kiểm tra xem có bị đứt chuỗi không (nếu ngày cuối cách xa hơn 1 ngày hoặc lùi ngày)
    if (lastDate && !isClaimedToday) {
      const last = new Date(lastDate);
      const now = new Date(today);
      // Ép về đúng 00:00:00 để tránh sai lệch múi giờ khi so sánh
      const lastTime = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
      const nowTime = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const diffDays = Math.round((nowTime - lastTime) / (1000 * 60 * 60 * 24));

      // Nếu không phải đúng ngày hôm sau (diffDays = 1) thì đứt chuỗi
      if (diffDays !== 1) {
        currentStreak = 0; // Đứt chuỗi, bắt đầu lại
      }
    }

    // Ngày tiếp theo cần điểm danh (1-7)
    let nextDayIndex = isClaimedToday ? currentStreak : (currentStreak % 7) + 1;
    if (nextDayIndex > 7) nextDayIndex = 1;

    return {
      streak: currentStreak,
      lastDate: lastDate,
      isClaimedToday: isClaimedToday,
      todayDayIndex: nextDayIndex,
      claimedDates: claimedDates,
      streakRewards: STREAK_REWARDS
    };
  }

  function claimDailyCheckin() {
    if (!isUserLoggedIn()) {
      if (window.showAuthModal) {
        window.showAuthModal('login');
      } else {
        window.location.href = '/profile';
      }
      showGamificationToast('Vui lòng đăng nhập để điểm danh nhận quà!', 'error');
      return false;
    }
    const data = getDailyStreakData();
    if (data.isClaimedToday) {
      showGamificationToast('⚠️ Bạn đã điểm danh hôm nay rồi! Hãy quay lại vào ngày mai nhé.', 'info');
      return false;
    }

    const today = getTodayString();
    let newStreak = (data.streak % 7) + 1;
    const reward = STREAK_REWARDS[newStreak - 1] || STREAK_REWARDS[0];

    const updatedData = {
      streak: data.streak + 1,
      lastDate: today,
      claimedDates: [...data.claimedDates, today].slice(-30)
    };

    localStorage.setItem('ap_daily_streak_v2', JSON.stringify(updatedData));

    // Thưởng điểm danh 30 ngày nếu đạt mốc
    let extraReason = `Điểm danh Ngày ${newStreak}/7 chuỗi`;
    if (updatedData.streak % 30 === 0) {
      addReward(150, 50, '🎁 Thưởng mốc 30 Ngày Điểm Danh Liên Tục!');
    }

    addReward(reward.xp, reward.xu, extraReason);

    window.dispatchEvent(new CustomEvent('dailyStreakClaimed', { detail: updatedData }));
    return true;
  }

  // ─── 5. DAILY MISSIONS (NHIỆM VỤ HÀNG NGÀY) ───
  function getDailyMissionsData() {
    const today = getTodayString();
    let missions = {};
    try {
      const saved = JSON.parse(localStorage.getItem('ap_daily_missions_v2') || '{}');
      if (saved.date === today) {
        missions = saved.data || {};
      }
    } catch (e) { }

    return DAILY_MISSIONS_DEF.map(m => {
      const curVal = Number(missions[m.id] && missions[m.id].current) || 0;
      const isClaimed = Boolean(missions[m.id] && missions[m.id].claimed);
      const isCompleted = curVal >= m.target;
      return {
        ...m,
        current: Math.min(curVal, m.target),
        isCompleted: isCompleted,
        isClaimed: isClaimed
      };
    });
  }

  function progressDailyMission(missionId, amount = 1) {
    if (!isUserLoggedIn()) return;
    const today = getTodayString();
    let saved = { date: today, data: {} };
    try {
      const raw = JSON.parse(localStorage.getItem('ap_daily_missions_v2') || '{}');
      if (raw.date === today) saved = raw;
    } catch (e) { }

    if (!saved.data[missionId]) saved.data[missionId] = { current: 0, claimed: false };

    // Nếu nhiệm vụ đã được claim, có thể không cộng thêm hoặc vẫn cộng nhưng giới hạn
    if (!saved.data[missionId].claimed) {
      saved.data[missionId].current += amount;

      const def = DAILY_MISSIONS_DEF.find(d => d.id === missionId);
      if (def) {
        // Giới hạn max progress (ví dụ gấp đôi target) để không phình to data
        const maxLimit = def.target * 2;
        if (saved.data[missionId].current > maxLimit) {
          saved.data[missionId].current = maxLimit;
        }
      }
    }

    localStorage.setItem('ap_daily_missions_v2', JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent('missionsUpdated'));
  }

  function claimDailyMission(missionId) {
    if (!isUserLoggedIn()) {
      if (window.showAuthModal) {
        window.showAuthModal('login');
      } else {
        window.location.href = '/profile';
      }
      showGamificationToast('Vui lòng đăng nhập để nhận thưởng nhiệm vụ!', 'error');
      return false;
    }
    const today = getTodayString();
    let saved = { date: today, data: {} };
    try {
      const raw = JSON.parse(localStorage.getItem('ap_daily_missions_v2') || '{}');
      if (raw.date === today) {
        saved = raw;
      }
    } catch (e) { }

    const def = DAILY_MISSIONS_DEF.find(d => d.id === missionId);
    if (!def) return false;

    const mData = (saved.data && saved.data[missionId]) || { current: 0, claimed: false };
    if (mData.claimed) {
      showGamificationToast('Nhiệm vụ này đã nhận thưởng rồi!', 'info');
      return false;
    }
    if (mData.current < def.target) {
      showGamificationToast(`Chưa hoàn thành nhiệm vụ (${mData.current}/${def.target})`, 'info');
      return false;
    }

    mData.claimed = true;
    saved.data[missionId] = mData;
    localStorage.setItem('ap_daily_missions_v2', JSON.stringify(saved));

    addReward(def.xp, def.xu, `Nhiệm vụ: ${def.title}`);

    // Kiểm tra xem đã nhận hết 5 nhiệm vụ chưa để thưởng rương ngày
    const allClaimed = DAILY_MISSIONS_DEF.every(d => saved.data[d.id] && saved.data[d.id].claimed);
    if (allClaimed && !saved.allChestClaimed) {
      saved.allChestClaimed = true;
      localStorage.setItem('ap_daily_missions_v2', JSON.stringify(saved));
      addReward(80, 5, '🏆 Rương Hoàn Hảo Ngày (Hoàn thành đủ 5 nhiệm vụ)!');
    }

    window.dispatchEvent(new CustomEvent('missionsUpdated'));
    return true;
  }

  // ─── 6. HỆ THỐNG 12 THÀNH TỰU VĨNH VIỄN ───
  function getAchievementsList() {
    let histCount = 0, favCount = 0, playlistCount = 0, shopCount = 0, u = getUser();
    try {
      histCount = JSON.parse(localStorage.getItem('cinestream_watch_history') || '[]').length;
      favCount = JSON.parse(localStorage.getItem('cinestream_favorites') || '[]').length;
      playlistCount = (typeof playlistService !== 'undefined' ? playlistService.getAll() : JSON.parse(localStorage.getItem('cinestream_playlists') || '[]')).length;
      shopCount = JSON.parse(localStorage.getItem('ap_user_items') || '[]').length;
    } catch (e) { }

    const curXu = getXu();
    const commentsCount = Number(localStorage.getItem('ap_user_comment_count') || 0);
    const nightOwlWatch = localStorage.getItem('ap_night_owl_watch') === 'true';
    const marathonCount = Number(localStorage.getItem('ap_marathon_day_count') || 0);

    const badges = [
      {
        id: 'ach_profile',
        code: 'ACH-01',
        title: 'Tân Thủ Nhập Môn',
        desc: 'Đã hoàn tất thông tin cá nhân',
        xp: 30,
        xu: 5,
        badgeName: 'Tân Thủ',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a5 5 0 0 1 10 0v2"/></svg>`,
        unlocked: true,
        progress: { current: 1, max: 1 }
      },
      {
        id: 'ach_watch_5',
        code: 'ACH-02',
        title: 'Người Xem Phim',
        desc: `Đã xem ${Math.min(histCount, 5)}/5 phim bất kỳ`,
        xp: 50,
        xu: 10,
        badgeName: 'Mọt Phim Tập Sự',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
        unlocked: histCount >= 5,
        progress: { current: Math.min(histCount, 5), max: 5 }
      },
      {
        id: 'ach_watch_30',
        code: 'ACH-03',
        title: 'Tín Đồ Điện Ảnh',
        desc: `Đã xem ${Math.min(histCount, 30)}/30 phim`,
        xp: 150,
        xu: 25,
        badgeName: 'Tín Đồ Điện Ảnh',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
        unlocked: histCount >= 30,
        progress: { current: Math.min(histCount, 30), max: 30 }
      },
      {
        id: 'ach_watch_100',
        code: 'ACH-04',
        title: 'Đại Thần Cày Phim',
        desc: `Đã xem ${Math.min(histCount, 100)}/100 phim`,
        xp: 500,
        xu: 80,
        badgeName: 'Đại Bậc Thầy',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        unlocked: histCount >= 100,
        progress: { current: Math.min(histCount, 100), max: 100 }
      },
      {
        id: 'ach_fav_10',
        code: 'ACH-05',
        title: 'Nhà Sưu Tầm',
        desc: `Đã lưu ${Math.min(favCount, 10)}/10 phim yêu thích`,
        xp: 40,
        xu: 10,
        badgeName: 'Người Sưu Tầm',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
        unlocked: favCount >= 10,
        progress: { current: Math.min(favCount, 10), max: 10 }
      },
      {
        id: 'ach_fav_50',
        code: 'ACH-06',
        title: 'Thợ Săn Kho Tàng',
        desc: `Đã lưu ${Math.min(favCount, 50)}/50 phim yêu thích`,
        xp: 150,
        xu: 30,
        badgeName: 'Thủ Lĩnh Kho Phim',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M4.93 19.07l4.24-4.24"/></svg>`,
        unlocked: favCount >= 50,
        progress: { current: Math.min(favCount, 50), max: 50 }
      },
      {
        id: 'ach_comment_10',
        code: 'ACH-07',
        title: 'Nhà Phê Bình',
        desc: `Đã đăng ${Math.min(commentsCount, 10)}/10 bình luận đánh giá`,
        xp: 100,
        xu: 15,
        badgeName: 'Nhà Phê Bình',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        unlocked: commentsCount >= 10,
        progress: { current: Math.min(commentsCount, 10), max: 10 }
      },
      {
        id: 'ach_night_owl',
        code: 'ACH-08',
        title: 'Cú Đêm Điện Ảnh',
        desc: nightOwlWatch ? 'Đã xem phim trong khung 00:00 - 04:00' : 'Xem 1 phim lúc 00:00 - 04:00',
        xp: 50,
        xu: 10,
        badgeName: 'Cú Đêm',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
        unlocked: nightOwlWatch,
        progress: { current: nightOwlWatch ? 1 : 0, max: 1 }
      },
      {
        id: 'ach_marathon',
        code: 'ACH-09',
        title: 'Marathon Master',
        desc: `Xem liên tiếp ${Math.min(marathonCount, 4)}/4 tập trong ngày`,
        xp: 80,
        xu: 15,
        badgeName: 'Siêu Marathon',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        unlocked: marathonCount >= 4,
        progress: { current: Math.min(marathonCount, 4), max: 4 }
      },
      {
        id: 'ach_style_5',
        code: 'ACH-10',
        title: 'Bậc Thầy Phong Cách',
        desc: `Sở hữu ${Math.min(shopCount, 5)}/5 vật phẩm Shop`,
        xp: 200,
        xu: 35,
        badgeName: 'Fashionista',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
        unlocked: shopCount >= 5,
        progress: { current: Math.min(shopCount, 5), max: 5 }
      },
      {
        id: 'ach_vip',
        code: 'ACH-11',
        title: 'Hoàng Gia VIP',
        desc: (u && u.isVip) ? 'Đã kích hoạt đặc quyền VIP' : 'Kích hoạt gói VIP bất kỳ',
        xp: 300,
        xu: 50,
        badgeName: 'VIP Hoàng Gia',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        unlocked: Boolean(u && u.isVip),
        progress: { current: (u && u.isVip) ? 1 : 0, max: 1 }
      },
      {
        id: 'ach_millionaire',
        code: 'ACH-12',
        title: 'Triệu Phú Xu',
        desc: `Tích lũy đạt ${Math.min(curXu, 5000).toLocaleString()}/5,000 Xu`,
        xp: 500,
        xu: 150,
        badgeName: 'Triệu Phú Ánh Kim',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v12"/></svg>`,
        unlocked: curXu >= 5000,
        progress: { current: Math.min(curXu, 5000), max: 5000 }
      }
    ];

    return badges;
  }

  // ─── 7. WATCH-TO-EARN TRACKING (THEO DÕI XEM PHIM THỰC TẾ) ───
  let watchInterval = null;

  function updatePillUI() {
    const pill = document.getElementById('watchToEarnText');
    const pillContainer = document.getElementById('watchToEarnPill');
    const pillDot = pillContainer ? pillContainer.querySelector('.watch-to-earn-dot') : null;
    if (!pillContainer) return;

    if (!isUserLoggedIn()) {
      pillContainer.style.display = 'none';
      return;
    }

    pillContainer.style.display = 'inline-flex';
    const today = getTodayString();
    let dailyWatchSeconds = Number(localStorage.getItem(`ap_daily_watch_sec_${today}`) || 0);
    const totalMins = Math.floor(dailyWatchSeconds / 60);

    pillContainer.title = 'Xem phim tích luỹ Xu & XP mỗi ngày';
    if (pillDot) {
      pillDot.style.background = '#f59e0b';
      pillDot.style.boxShadow = '0 0 8px #f59e0b';
      pillDot.style.animation = 'pulse 2s infinite';
    }

    if (pill) {
      if (totalMins < 15) {
        pill.textContent = `💎 Cày Xu: ${totalMins}/15p`;
      } else if (totalMins < 45) {
        pill.textContent = `✨ Đạt Mốc 1: ${totalMins}/45p`;
      } else {
        pill.textContent = `🏆 Đạt tối đa cày phim (${totalMins}p)`;
      }
    }
  }

  function handlePillClick(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!isUserLoggedIn()) return;
    showGamificationToast('🎁 Bạn đang xem phim: Hệ thống tự động đếm thời gian xem thực tế để tăng Xu & XP khi đạt các mốc 15 phút & 45 phút!');
  }

  function initWatchToEarn() {
    updatePillUI();
    if (watchInterval) return;

    watchInterval = setInterval(() => {
      // Chỉ tính khi tab đang active và người dùng ĐÃ ĐĂNG NHẬP
      if (document.hidden) return;
      if (!isUserLoggedIn()) {
        updatePillUI();
        return;
      }

      const today = getTodayString();
      let dailyWatchSeconds = Number(localStorage.getItem(`ap_daily_watch_sec_${today}`) || 0);

      // Kiểm tra giờ cú đêm 00:00 - 04:00 (Thành tựu Tín Đồ Đêm Khuya)
      const currentHour = new Date().getHours();
      if (currentHour >= 0 && currentHour < 4) {
        if (localStorage.getItem('ap_night_owl_watch') !== 'true') {
          localStorage.setItem('ap_night_owl_watch', 'true');
          setTimeout(() => {
            addReward(50, 10, '🦉 Mở khóa Thành Tựu: Tín Đồ Đêm Khuya (Xem phim 00:00 - 04:00)!');
          }, 3000);
        }
      }

      dailyWatchSeconds += 10;
      localStorage.setItem(`ap_daily_watch_sec_${today}`, dailyWatchSeconds);
      updatePillUI();

      const totalMins = Math.floor(dailyWatchSeconds / 60);

      // Cập nhật tiến độ nhiệm vụ ngày (watch15 & watch45)
      progressDailyMission('watch15', 15);
      if (totalMins >= 45) {
        progressDailyMission('watch45', 45);
      }

      // Mỗi 30 phút xem liên tục (1800s): Thưởng +30 XP & +2 Xu (Tối đa 2 lần = 4 Xu/ngày)
      if (dailyWatchSeconds % 1800 === 0 && dailyWatchSeconds > 0) {
        const earnedToday = Number(localStorage.getItem(`ap_watch_xu_${today}`) || 0);
        if (earnedToday < 4) {
          localStorage.setItem(`ap_watch_xu_${today}`, earnedToday + 2);
          addReward(30, 2, `⏳ Thưởng cày phim ${totalMins} phút hôm nay!`);
        }
      }
    }, 10000);
  }

  function recordEpisodeCompleted() {
    if (!isUserLoggedIn()) return;
    const today = getTodayString();
    let marathon = Number(localStorage.getItem('ap_marathon_day_count') || 0) + 1;
    localStorage.setItem('ap_marathon_day_count', marathon);

    const completedToday = Number(localStorage.getItem(`ap_completed_ep_${today}`) || 0);
    if (completedToday < 2) {
      localStorage.setItem(`ap_completed_ep_${today}`, completedToday + 1);
      addReward(20, 2, '🎬 Thưởng xem xong trọn vẹn 1 tập phim (tối đa 2 tập/ngày)!');
    }
  }

  // ─── 8. ĐỔI NGÀY VIP BẰNG XU ───
  function redeemVipDays(days, xuCost) {
    const curXu = getXu();
    if (curXu < xuCost) {
      showGamificationToast(`Bạn cần thêm ${(xuCost - curXu).toLocaleString()} Xu để đổi gói VIP ${days} ngày!`, 'error');
      return false;
    }

    setXu(curXu - xuCost);

    let u = getUser() || { email: 'user@aphim.vn', displayName: 'Người dùng', isVip: true };
    u.isVip = true;

    // Gia hạn thêm ngày VIP
    let curExpires = u.vipExpires ? new Date(u.vipExpires) : new Date();
    if (curExpires < new Date()) curExpires = new Date();
    curExpires.setDate(curExpires.getDate() + days);
    u.vipExpires = curExpires.toISOString();

    try {
      localStorage.setItem('cinestream_user', JSON.stringify(u));
    } catch (e) { }

    showGamificationToast(`👑 <strong>ĐỔI VIP THÀNH CÔNG!</strong><div style="font-size:12px;color:#fcd576;margin-top:3px;">+${days} Ngày VIP kích hoạt. Hạn dùng: ${curExpires.toLocaleDateString('vi-VN')}</div>`, 'reward');

    window.dispatchEvent(new CustomEvent('gamificationUpdated'));
    return true;
  }

  // ─── 9. TOAST NOTIFICATION GAMIFIED UI ───
  function showGamificationToast(htmlContent, type = 'reward') {
    let container = document.getElementById('ap-gamify-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ap-gamify-toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:340px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const borderColor = type === 'levelup' ? '#f59e0b' : (type === 'error' ? '#ef4444' : '#22c55e');
    const bgGrad = type === 'levelup' ? 'linear-gradient(135deg, rgba(30,27,75,0.95), rgba(88,28,135,0.95))' : 'rgba(15, 23, 42, 0.96)';

    toast.style.cssText = `
      background: ${bgGrad};
      border: 1px solid ${borderColor};
      border-radius: 14px;
      padding: 12px 16px;
      color: #ffffff;
      font-size: 13px;
      line-height: 1.4;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(245,158,11,0.2);
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: auto;
      backdrop-filter: blur(12px);
    `;
    toast.innerHTML = htmlContent;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function updateHeaderChips() {
    const curXu = getXu();
    const curXP = getXP();
    const lvlInfo = calculateLevel(curXP);

    // Update all coin elements
    const coinEls = document.querySelectorAll('.header-coin-val, #headerCoinVal, .shop-coin-amount, .avatar-wallet-balance');
    coinEls.forEach(el => {
      el.textContent = curXu.toLocaleString();
    });

    // Update XP elements
    const xpEls = document.querySelectorAll('.hero-xp-counter, #userLevelBadge');
    xpEls.forEach(el => {
      if (el.id === 'userLevelBadge') el.textContent = `Lv.${lvlInfo.level}`;
    });
  }

  // ─── 9.5 BẢNG XẾP HẠNG CAO THỦ (LEADERBOARD) TỪ DATA THỰC TẾ ───
  let _leaderboardCache = {};
  let _isFetchingLb = {};

  async function fetchLeaderboard(timeframe = 'weekly') {
    const u = getUser() || {};
    const uid = u._id || u.id || '';
    if (_isFetchingLb[timeframe]) return _leaderboardCache[timeframe] || null;
    try {
      _isFetchingLb[timeframe] = true;
      const res = await fetch(`/api/gamification/leaderboard?timeframe=${encodeURIComponent(timeframe)}&userId=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          _leaderboardCache[timeframe] = json.data;
          try {
            localStorage.setItem(`ap_real_lb_${timeframe}`, JSON.stringify(json.data));
            if (timeframe === 'weekly') {
              localStorage.setItem('ap_real_leaderboard', JSON.stringify(json.data));
            }
          } catch (e) { }
          return _leaderboardCache[timeframe];
        }
      }
    } catch (err) {
      console.warn('[Gamification] fetchLeaderboard error:', err.message);
    } finally {
      _isFetchingLb[timeframe] = false;
    }
    return null;
  }

  function getLeaderboardData(timeframe = 'weekly') {
    // 1. Kiểm tra cache trong bộ nhớ theo timeframe
    if (_leaderboardCache[timeframe] && _leaderboardCache[timeframe].all && _leaderboardCache[timeframe].all.length) {
      return _leaderboardCache[timeframe];
    }

    // 2. Kiểm tra cache trong localStorage theo timeframe
    try {
      const stored = JSON.parse(localStorage.getItem(`ap_real_lb_${timeframe}`) || (timeframe === 'weekly' ? localStorage.getItem('ap_real_leaderboard') : 'null') || 'null');
      if (stored && stored.all && stored.all.length) {
        // Lọc bỏ mọi tên test ảo nếu còn sót từ bản cũ
        const hasFake = stored.all.some(x => (x.name || '').includes('Trần Gia Bảo') || (x.name || '').includes('Ngọc Mai Cinema') || (x.name || '').includes('Minh Hoàng Movie'));
        if (!hasFake) {
          _leaderboardCache[timeframe] = stored;
          if (!_isFetchingLb[timeframe]) fetchLeaderboard(timeframe);
          return _leaderboardCache[timeframe];
        }
      }
    } catch (e) { }

    // 3. Nếu chưa có cache, tự động kích hoạt fetch async ngầm
    if (!_isFetchingLb[timeframe]) {
      fetchLeaderboard(timeframe).then(data => {
        if (data && typeof renderAchievements === 'function' && window._achieveSubView === 'leaderboard' && (window._leaderboardTf || 'weekly') === timeframe) {
          const panel = document.getElementById('tabPanel');
          if (panel) {
            const curY = window.scrollY;
            panel.innerHTML = renderAchievements(getUser());
            if (curY > 0) {
              requestAnimationFrame(() => {
                window.scrollTo({ top: curY, behavior: 'instant' });
              });
            }
          }
        }
      });
    }

    // 4. Fallback tức thì chỉ hiển thị thông tin thực của người dùng hiện tại (TUYỆT ĐỐI KHÔNG DÙNG DATA ẢO)
    const curXP = getXP();
    const u = getUser() || { displayName: 'Thành viên', name: 'Thành viên' };
    const myName = u.displayName || u.name || 'Thành viên';
    const myAvatar = u.avatar || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(myName));
    const myLvl = calculateLevel(curXP);

    const myEntry = {
      id: u._id || u.id || 'me',
      isMe: true,
      name: myName,
      avatar: myAvatar,
      xp: curXP,
      hours: Math.max(0, Math.round(curXP / 35)),
      rank: myLvl.rankTitle,
      tier: myLvl.level >= 51 ? 'diamond' : (myLvl.level >= 31 ? 'platinum' : (myLvl.level >= 16 ? 'gold' : (myLvl.level >= 6 ? 'silver' : 'bronze'))),
      level: myLvl.level,
      streak: Number(localStorage.getItem('cinestream_streak') || 1),
      position: 1
    };

    return {
      timeframe,
      top3: [myEntry],
      rest: [],
      myRank: 1,
      myEntry: myEntry,
      all: [myEntry]
    };
  }

  // ─── 10. EXPORT RA WINDOW GLOBAL ───
  window.GamificationCore = {
    getXu,
    setXu,
    getXP,
    setXP,
    isUserLoggedIn,
    calculateLevel,
    addReward,
    getDailyStreakData,
    claimDailyCheckin,
    getDailyMissionsData,
    progressDailyMission,
    claimDailyMission,
    getAchievementsList,
    getLeaderboardData,
    fetchLeaderboard,
    initWatchToEarn,
    updatePillUI,
    handlePillClick,
    recordEpisodeCompleted,
    redeemVipDays,
    showGamificationToast,
    updateHeaderChips
  };

  // Tự động lắng nghe và nạp trước dữ liệu thực tế khi trang load
  document.addEventListener('DOMContentLoaded', () => {
    updateHeaderChips();
    updatePillUI();
    fetchLeaderboard('weekly');
  });

  window.addEventListener('ap:user-updated', () => { updateHeaderChips(); updatePillUI(); });
  window.addEventListener('auth:profileSynced', () => { updateHeaderChips(); updatePillUI(); });
  window.addEventListener('auth:login', () => { updateHeaderChips(); updatePillUI(); });
  window.addEventListener('auth:logout', () => { updateHeaderChips(); updatePillUI(); });
  window.addEventListener('auth:userUpdated', () => { updateHeaderChips(); updatePillUI(); });
  window.addEventListener('storage', (e) => {
    if (e.key === 'cinestream_user' || e.key === 'cinestream_xu' || e.key === 'cinestream_token') {
      updateHeaderChips();
      updatePillUI();
    }
  });

})();
