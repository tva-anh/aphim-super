/* ════════════════════════════════════════════════════════════
   PROFILE PROGRESS & JOURNEY MODULE
   ════════════════════════════════════════════════════════════ */

const JOURNEY_STEPS = [
    { name: 'Khán Giả', lv: '1-3', minLv: 1, icon: 'visibility' },
    { name: 'Mọt Phim', lv: '4-6', minLv: 4, icon: 'auto_stories' },
    { name: 'Reviewer', lv: '7-9', minLv: 7, icon: 'grade' },
    { name: 'Critic', lv: '10-12', minLv: 10, icon: 'edit_note' },
    { name: 'Cinephile', lv: '13-15', minLv: 13, icon: 'movie_filter' },
    { name: 'Biên Kịch', lv: '16-18', minLv: 16, icon: 'history_edu' },
    { name: 'Đạo Diễn', lv: '19-21', minLv: 19, icon: 'movie_creation' },
    { name: 'Producer', lv: '22-24', minLv: 22, icon: 'campaign' },
    { name: 'Huyền Thoại', lv: '25-27', minLv: 25, icon: 'workspace_premium' },
    { name: 'Oscar', lv: '28-30', minLv: 28, icon: 'emoji_events' }
];

const XP_PER_LEVEL = 30;

function initJourney() {
    console.log('[Journey] Initializing...');
    updateJourneyUI();
}

function updateJourneyUI() {
    const user = authService.getCurrentUser();
    const xp = (user && user.xp) || 0;
    // Standardize Xu vs Coins across system - Use Max for safety during migration
    const xu = (user && Math.max(user.xu || 0, user.coins || 0)) || 0;
    
    // Level calculation (Starts at Lv 1)
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const currentXPInLevel = xp % XP_PER_LEVEL;
    const progressPercent = (currentXPInLevel / XP_PER_LEVEL) * 100;
    const neededXP = XP_PER_LEVEL - currentXPInLevel;

    // Determine Rank and Sub-rank
    let currentRank = JOURNEY_STEPS.find(step => level >= step.minLv && level < step.minLv + 3);
    if (!currentRank) {
        if (level >= JOURNEY_STEPS[JOURNEY_STEPS.length - 1].minLv) {
            currentRank = JOURNEY_STEPS[JOURNEY_STEPS.length - 1];
        } else {
            currentRank = JOURNEY_STEPS[0];
        }
    }
    
    // Sub-rank logic: 1=Tập sự, 2=Chuyên nghiệp, 3=Bậc thầy (based on modulo 3 of level)
    const subRankIndex = (level - 1) % 3;
    const subRanks = ['Tập sự', 'Chuyên nghiệp', 'Bậc thầy'];
    const currentSubRank = subRanks[subRankIndex];

    // 1. Update Hero Stats Pills
    const heroRank = document.getElementById('heroRankPill');
    const heroSubRank = document.getElementById('heroSubRankPill');
    const heroLevel = document.getElementById('heroLevelPill');
    const heroXu = document.getElementById('heroXuBalance');

    if (heroRank) {
        heroRank.innerHTML = `<i class="material-icons-round" style="font-size:12px;">${currentRank.icon}</i>${currentRank.name}`;
    }
    if (heroSubRank) heroSubRank.textContent = currentSubRank;
    if (heroLevel) heroLevel.textContent = `Cấp ${level}`;
    if (heroXu) heroXu.textContent = xu.toLocaleString();

    // 1.1 Update Plan Badges (Subscription)
    let plan = 'FREE';
    const sub = user && user.subscription;
    if (sub && sub.plan) {
        const endDate = sub.endDate || sub.expiresAt;
        let isExpired = false;
        if (endDate) {
            const expiry = new Date(endDate);
            expiry.setDate(expiry.getDate() + 1);
            if (new Date() > expiry) isExpired = true;
        }
        if (!isExpired && sub.status !== 'blocked' && sub.status !== 'inactive') {
            plan = sub.plan;
        }
    }
    const heroPlan = document.getElementById('heroPlanBadge');
    const epPlan = document.getElementById('epPlanBadge');

    if (heroPlan) {
        heroPlan.querySelector('span').textContent = plan === 'FREE' ? 'Khán Giả' : plan;
        if (plan !== 'FREE') {
            heroPlan.style.background = '#e8b94f';
            heroPlan.style.color = '#111';
            heroPlan.style.borderColor = 'rgba(232,185,79,0.5)';
        } else {
            heroPlan.style.background = 'rgba(167, 139, 250, 0.1)';
            heroPlan.style.color = '#a78bfa';
            heroPlan.style.borderColor = 'rgba(167, 139, 250, 0.3)';
        }
    }
    if (epPlan) {
        epPlan.querySelector('span').textContent = plan;
        if (plan !== 'FREE') {
            epPlan.style.background = '#e8b94f';
            epPlan.style.color = '#111';
        }
    }

    // 1.5 Update Edit Profile Modal Pills (if open)
    const epRank = document.getElementById('epRankPill');
    const epSubRank = document.getElementById('epSubRankPill');
    const epLevel = document.getElementById('epLevelPill');
    const epXu = document.getElementById('epXuBalance');

    if (epRank) {
        epRank.innerHTML = `<i class="material-icons-round" style="font-size:12px;">${currentRank.icon}</i><span>${currentRank.name}</span>`;
    }
    if (epSubRank) epSubRank.textContent = currentSubRank;
    if (epLevel) epLevel.textContent = `Cấp ${level}`;
    if (epXu) epXu.textContent = xu.toLocaleString();

    // 2. Update Tab Journey Stats
    const currentXPEl = document.getElementById('currentXP');
    const neededXPEl = document.getElementById('neededXP');
    const nextLevelEl = document.getElementById('nextLevel');
    const xpProgressBar = document.getElementById('xpProgressBar');
    const xpToNextLvEl = document.getElementById('xpToNextLv');

    if(currentXPEl) currentXPEl.textContent = xp;
    if(neededXPEl) neededXPEl.textContent = `${currentXPInLevel}/${XP_PER_LEVEL}`;
    if(nextLevelEl) nextLevelEl.textContent = level + 1;
    if(xpProgressBar) xpProgressBar.style.width = `${Math.min(100, progressPercent)}%`;
    if(xpToNextLvEl) xpToNextLvEl.textContent = Math.max(0, neededXP);

    if(document.getElementById('statXP')) document.getElementById('statXP').textContent = xp;
    if(document.getElementById('statLevel')) document.getElementById('statLevel').textContent = level;

    // Update remaining XP text if exists
    const remainingXPEl = document.getElementById('remainingXPToNext');
    if (remainingXPEl) remainingXPEl.textContent = Math.max(0, neededXP);

    // Update other UI components that show balance
    const sbXu = document.getElementById('sidebarXuBalance');
    const shopBal = document.getElementById('shopBalance');
    if (sbXu) sbXu.textContent = xu.toLocaleString();
    if (shopBal) shopBal.textContent = xu.toLocaleString();

    // Load watched and favorites count from services if available
    if(typeof userService !== 'undefined') {
        const watchedCount = userService.getWatchHistory().length;
        const favCount = userService.getFavorites().length;
        if(document.getElementById('statWatched')) document.getElementById('statWatched').textContent = watchedCount;
        if(document.getElementById('statFav')) document.getElementById('statFav').textContent = favCount;
    }

    // Check attendance button
    const lastAttendance = localStorage.getItem('ap_last_attendance');
    const today = new Date().toDateString();
    const btn = document.getElementById('attendanceBtn');
    if (btn) {
        if (lastAttendance === today) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = '<span class="material-icons-round">check_circle</span> Đã điểm danh';
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btn.innerHTML = '<span class="material-icons-round">event_available</span> Điểm danh nhận XP';
        }
    }

    renderTimeline(level);
}

function renderTimeline(currentLevel) {
    const container = document.getElementById('journeyTimeline');
    if (!container) return;
    
    container.style.paddingBottom = '45px'; // Make room for the inline buttons
    
    let nextUnlockIndex = JOURNEY_STEPS.findIndex(step => currentLevel < step.minLv);
    if (nextUnlockIndex === -1) nextUnlockIndex = JOURNEY_STEPS.length;

    container.innerHTML = JOURNEY_STEPS.map((step, index) => {
        const isUnlocked = currentLevel >= step.minLv;
        const isActive = isUnlocked && (index === JOURNEY_STEPS.length - 1 || currentLevel < JOURNEY_STEPS[index + 1].minLv);
        const isLocked = !isUnlocked;
        const isNext = index === nextUnlockIndex;
        
        let iconHtml = `<span class="material-icons-round" style="${isActive ? 'color: #fff;' : ''}">${step.icon}</span>`;
        if (isLocked) {
            iconHtml = `<span class="material-icons-round" style="opacity: 0.3;">lock</span>`;
        }
        
        let upgradeBtnHtml = '';
        if (isNext) {
            upgradeBtnHtml = `
                <div style="position:absolute; bottom:-45px; left:50%; transform:translateX(-50%); width:max-content; z-index:10;">
                    <button onclick="buyXPForStep(${step.minLv}, '${step.name}')" style="display:flex; align-items:center; gap:4px; padding:6px 12px; background:rgba(232,185,79,0.1); border:1px solid rgba(232,185,79,0.3); border-radius:12px; color:#e8b94f; font-size:10px; font-weight:800; text-transform:uppercase; cursor:pointer; box-shadow: 0 0 15px rgba(232,185,79,0.15); transition:all 0.2s;" onmouseover="this.style.background='#e8b94f'; this.style.color='#000'; this.style.boxShadow='0 0 20px rgba(232,185,79,0.4)';" onmouseout="this.style.background='rgba(232,185,79,0.1)'; this.style.color='#e8b94f'; this.style.boxShadow='0 0 15px rgba(232,185,79,0.15)';">
                        <span class="material-icons-round" style="font-size:14px;">lock_open</span> Mở khóa
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="journey-step ${isUnlocked ? 'unlocked' : ''} ${isActive ? 'active' : ''}" style="position:relative;">
                <div class="step-icon-wrap" style="${isActive ? 'border: 2px solid #a78bfa; box-shadow: 0 0 15px rgba(167,139,250,0.4);' : ''} ${isLocked ? 'opacity:0.3; border-color: rgba(255,255,255,0.1);' : ''}">
                    ${iconHtml}
                </div>
                <div class="step-info" style="${isLocked ? 'opacity:0.3;' : ''}">
                    <div class="step-name" style="${isActive ? 'color: #fff; font-weight: 800;' : ''}">${step.name}</div>
                    <div class="step-lv">Cấp ${step.lv}</div>
                </div>
                ${upgradeBtnHtml}
                ${index < JOURNEY_STEPS.length - 1 ? `<div class="step-line" style="${isLocked ? 'opacity:0.2;' : ''}"></div>` : ''}
            </div>
        `;
    }).join('');
}

async function handleAttendance() {
    console.log('[Journey] Attendance clicked...');
    let user = authService.getCurrentUser();
    if (!user) {
        console.error('[Journey] No user found');
        return;
    }

    const today = new Date().toDateString();
    const lastAttendance = localStorage.getItem('ap_last_attendance');
    
    if (lastAttendance === today) {
        if (typeof showMessage === 'function') showMessage('Bạn đã điểm danh hôm nay rồi!', 'info');
        return;
    }

    // Give 10 XP
    const gainXP = 10;
    const currentXP = parseInt(user.xp || 0);
    const newXP = currentXP + gainXP;
    
    console.log(`[Journey] XP Update: ${currentXP} -> ${newXP}`);

    try {
        // Save to LocalStorage immediately for snappy UI
        user.xp = newXP;
        localStorage.setItem('cinestream_user', JSON.stringify(user));

        // Save to Server
        if (authService.updateProfile) {
            const result = await authService.updateProfile({ xp: newXP });
            if (result && result.success) {
                user = result.user; // Use confirmed user from server
                console.log('[Journey] Server sync successful');
            }
        }

        // Save state
        localStorage.setItem('ap_last_attendance', today);

        if (typeof showMessage === 'function') {
            showMessage(`+${gainXP} XP! Bạn đã hoàn thành điểm danh hôm nay.`, 'success');
            if (typeof window.addNotification === 'function') {
                window.addNotification(
                    'Điểm danh thành công', 
                    `Bạn vừa hoàn thành nhiệm vụ điểm danh hàng ngày.\n\nChi tiết phần thưởng:\n• Kinh nghiệm: +${gainXP} XP\n• Tổng XP hiện tại: ${newXP} XP\n\nHãy duy trì chuỗi điểm danh để nhanh chóng thăng cấp nhé!`, 
                    'coin'
                );
            }
        }

        // Force UI update
        updateJourneyUI();
    } catch (error) {
        console.error('[Journey] Attendance error:', error);
        if (typeof showMessage === 'function') showMessage('Lỗi khi điểm danh. Vui lòng thử lại.', 'error');
    }
}

// Ensure journey is loaded when UI updates
if (typeof window !== 'undefined') {
    window.addEventListener('auth:profileSynced', updateJourneyUI);
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initJourney, 500); // initial load
    });
}

function scrollJourney(amount) {
    const wrap = document.getElementById('journeyScrollWrap');
    if (wrap) {
        wrap.scrollBy({ left: amount, behavior: 'smooth' });
    }
}

// Purchase XP logic for sequential unlocking
window.buyXPForStep = async function(targetMinLv, stepName) {
    let user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    if (!user) {
        if(typeof showMessage === 'function') showMessage('Vui lòng đăng nhập để thực hiện.', 'error');
        return;
    }
    
    const xp = parseInt(user.xp || 0);
    const currentXu = parseInt(Math.max(user.xu || 0, user.coins || 0));
    
    const targetXP = (targetMinLv - 1) * XP_PER_LEVEL;
    const neededXP = targetXP - xp;
    
    if (neededXP <= 0) return;
    
    const costPerXP = 100; // 1 XP = 100 Xu
    const totalCost = neededXP * costPerXP;
    
    const confirm = await window.showConfirm(
        'Mở khóa Danh Hiệu', 
        `Bạn cần thêm <b>${neededXP} XP</b> để mở khóa danh hiệu <b>${stepName}</b>.<br><br>Sử dụng <b style="color:#e8b94f;">${totalCost.toLocaleString()} Xu</b> để nâng cấp ngay lập tức?`
    );
    
    if (confirm) {
        if (currentXu < totalCost) {
            if(typeof showMessage === 'function') showMessage(`Số dư không đủ! Cần ${totalCost.toLocaleString()} Xu.`, 'error');
            return;
        }
        
        const newXu = currentXu - totalCost;
        const newXP = xp + neededXP;
        
        try {
            // Optimistic UI Update
            user.xu = newXu;
            user.coins = newXu; 
            user.xp = newXP;
            
            // Sync with backend
            if (authService.updateProfile) {
                const result = await authService.updateProfile({ xu: newXu, coins: newXu, xp: newXP });
                if (result && result.success) {
                    user = result.user;
                    // BẢO VỆ DỮ LIỆU CỤC BỘ: Nếu backend chưa kịp khởi động lại để nhận diện 'xp', ta ép buộc ghi đè cục bộ.
                    if (user.xp === undefined || user.xp < newXP) {
                        user.xp = newXP;
                        if(typeof authService !== 'undefined') authService.currentUser = user;
                    }
                }
            }
            
            // Đảm bảo localStorage luôn lưu kết quả cuối cùng chính xác nhất
            localStorage.setItem('cinestream_user', JSON.stringify(user));
            
            if(typeof showMessage === 'function') {
                showMessage(`Mở khóa ${stepName} thành công! -${totalCost.toLocaleString()} Xu`, 'success');
                if (typeof window.addNotification === 'function') {
                    window.addNotification(
                        'Mở khóa Danh hiệu', 
                        `Chúc mừng bạn đã mở khóa danh hiệu ${stepName}.\n\nChi tiết giao dịch:\n• Trừ đi: ${totalCost.toLocaleString()} Xu\n• Số dư cuối: ${newXu.toLocaleString()} Xu\n• Tổng XP hiện tại: ${newXP} XP`, 
                        'coin'
                    );
                }
            }
            
            updateJourneyUI();
            
            // Trigger shop balance refresh if needed
            if(typeof updateBalanceDisplay === 'function') {
                updateBalanceDisplay();
            }
            
        } catch (e) {
            console.error('[Journey] Upgrade error:', e);
            if(typeof showMessage === 'function') showMessage('Có lỗi xảy ra khi nâng cấp, vui lòng thử lại.', 'error');
        }
    }
};

// Global exposure
window.handleAttendance = handleAttendance;
window.scrollJourney = scrollJourney;
window.loadJourney = initJourney;
