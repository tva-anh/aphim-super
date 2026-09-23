// Profile Page Script
let loadedTabs = new Set(); // Track which tabs have been loaded

document.addEventListener('DOMContentLoaded', function () {
    // Check if logged in
    if (!authService.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    // Load basic user info for sidebar only
    loadBasicUserInfo();
    if (typeof updateJourneyUI === 'function') updateJourneyUI();
    setupProfileForm();
    setupPasswordForm();

    // Define Global Path-to-Tab routing mapping
    const pathToTab = {
        '/profile.html': 'journey',
        '/profile': 'journey',
        '/profile/': 'journey',
        '/profile/cua-hang.html': 'shop',
        '/profile/goi-thanh-vien.html': 'subscription',
        '/profile/phim-yeu-thich.html': 'favorites',
        '/profile/lich-su-xem.html': 'history',
        '/profile/giao-dich.html': 'transactions',
        '/profile/danh-sach.html': 'playlists'
    };
    window.__pathToTab = pathToTab; // Expose for popstate

    // Check current path or falling back to query params
    const currentPath = window.location.pathname;
    let tabFromUrl = pathToTab[currentPath] || pathToTab[currentPath.replace(/\/$/, '')];

    if (!tabFromUrl) {
        const urlParams = new URLSearchParams(window.location.search);
        tabFromUrl = urlParams.get('tab') || window.location.hash.substring(1);
    }
    
    // Default to 'journey' if no tab parsed
    const activeTabName = tabFromUrl || 'journey';
    
    // Slight delay to ensure DOM is ready
    setTimeout(() => {
        // MOBILE: By default show the Menu view ONLY IF the user lands on the root Profile page
        if (window.innerWidth <= 1024) {
            if (activeTabName === 'journey') {
                if (typeof goBackToMenu === 'function') {
                    goBackToMenu();
                }
                return;
            }
            // Else: If deep-linked directly to a tab, fall-through to show it!
        }

        // Proceed with direct tab rendering
        if (document.getElementById(activeTabName + 'Tab')) {
            showTab(activeTabName, true); // true = initial load, skip pushState
        }
    }, 50);

    // Listen for browser back/forward button popstate navigation
    window.addEventListener('popstate', function(event) {
        const popPath = window.location.pathname;
        const popTab = window.__pathToTab[popPath] || window.__pathToTab[popPath.replace(/\/$/, '')] || 'journey';
        
        if (window.innerWidth <= 1024 && popTab === 'journey') {
            if (typeof goBackToMenu === 'function') goBackToMenu(true); // skip state
        } else {
            showTab(popTab, true); // skip state to prevent loop
        }
    });

    // Listen for background profile sync
    window.addEventListener('auth:profileSynced', function(e) {
        console.log('[Profile] Auto-sync received, refreshing data...');
        // Refresh tabs if they were loaded
        if (loadedTabs.has('favorites')) loadFavorites();
        if (loadedTabs.has('history')) loadHistory();
        if (loadedTabs.has('profile')) loadBasicUserInfo();
        if (loadedTabs.has('subscription')) loadSubscriptionInfo();
    });
});

// Load basic user info for sidebar
function loadBasicUserInfo() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const userId = user._id || user.id || user.email;
    const heroAvatar = document.getElementById('userAvatar');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    
    // Lấy URL avatar mới nhất từ Cache Local (Giống user-ui.js) để đồng bộ tức thời
    const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
    const currentAvatar = localStorage.getItem(avatarKey) || user.avatar || '';
    
    // Get frame info (Use correct DB field: equippedFrameClass)
    const frameClass = user.equippedFrameClass || localStorage.getItem('ap_frame_class') || '';

    // Helper: render avatar to a specific container
    function renderTo(container, url, sizeClass = 'size-md') {
        if (!container) return;
        
        // Get name initial
        const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

        // Wrap with frame if exists
        let html = '';
        if (frameClass) {
            // Apply frame class directly to the container to avoid double wrapping
            container.className = `shop-frame-wrap ${frameClass} ${sizeClass}`;
            container.style.border = 'none';
            container.style.background = 'transparent';
            
            const content = url 
                ? `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;position:relative;z-index:1;" onerror="this.parentElement.innerHTML='${initial}'" />`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#e8b94f;color:#000;font-weight:800;position:relative;z-index:1;">${initial}</div>`;
            
            html = content;
        } else {
            container.className = ''; 
            html = url 
                ? `<img src="${url}" class="w-full h-full object-cover rounded-full" onerror="this.parentElement.innerHTML='${initial}'" />`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#e8b94f;color:#000;font-weight:800;">${initial}</div>`;
        }
        container.innerHTML = html;
        
        // Final sanity check for container
        container.style.overflow = 'visible';
        container.style.position = 'relative';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
    }

    // 1. Initial render (Dùng avatar mới nhất từ cache local)
    renderTo(heroAvatar, currentAvatar, 'size-lg');
    renderTo(sidebarAvatar, currentAvatar, 'size-sm');

    // 2. Load sync avatar (Phải tôn trọng Local Cache trong hàm callback bất đồng bộ này)
    if (typeof avatarService !== 'undefined') {
        avatarService.loadAvatar(userId, function(avatarUrl) {
            // LUÔN KIỂM TRA LẠI Cache Local trước khi gán, tránh bị luồng Async ghi đè ảnh cũ lên ảnh vừa tải!
            const finalAvatar = localStorage.getItem(avatarKey) || avatarUrl;
            
            renderTo(heroAvatar, finalAvatar, 'size-lg');
            renderTo(sidebarAvatar, finalAvatar, 'size-sm');
            
            if (avatarUrl && user.avatar !== avatarUrl) {
                user.avatar = avatarUrl;
                try { localStorage.setItem('cinestream_user', JSON.stringify(user)); } catch(e) {}
            }
        });
    }

    // Update names and texts
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userEmail').textContent = user.email;
    
    const sbName = document.getElementById('sidebarName');
    const sbEmail = document.getElementById('sidebarEmail');
    const sbXu = document.getElementById('sidebarXuBalance');
    const sbMiniCover = document.getElementById('sidebarMiniCover');
    
    if (sbName) sbName.textContent = user.name;
    if (sbEmail) sbEmail.textContent = user.email;
    if (sbXu) sbXu.textContent = Math.max(user.xu || 0, user.coins || 0).toLocaleString();

    // Update Cover Images
    const savedCover = (user && user.profileCover) ? user.profileCover : localStorage.getItem('ap_profile_cover');
    if (savedCover) {
        const heroCover = document.getElementById('profileCoverImg');
        if (heroCover) {
            heroCover.src = savedCover;
            heroCover.style.display = 'block';
        }
        if (sbMiniCover) {
            sbMiniCover.style.backgroundImage = `url('${savedCover}')`;
            sbMiniCover.style.backgroundSize = 'cover';
            sbMiniCover.style.backgroundPosition = 'center';
            sbMiniCover.style.opacity = '0.25';
        }
    }

    // Sync Playlists from Profile
    if (user.playlists && typeof playlistService !== 'undefined') {
        playlistService.syncFromProfile(user.playlists);
    }
}

// Global UI Refresh without F5
window.refreshAllUI = function() {
    console.log('[Profile] Refreshing all UI components...');
    loadBasicUserInfo();
    loadUserProfile();
    loadSubscriptionInfo();
    loadFavorites();
    loadHistory();
    loadPlaylists();
    
    // Sync with other modules
    if (typeof updateUserUI === 'function') updateUserUI();
    if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
    if (typeof updateJourneyUI === 'function') updateJourneyUI();
    if (typeof updateBalanceDisplay === 'function') updateBalanceDisplay();
};

// Load detailed user profile for form
function loadUserProfile() {
    const user = authService.getCurrentUser();
    if (!user) return;

    // Update form
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profilePhone').value = user.phone || '';
}

// Setup profile form
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('profileName').value.trim();
        const phone = document.getElementById('profilePhone').value.trim();

        // Gom nhóm tất cả dữ liệu bao gồm cả avatar đang chờ xử lý (nếu có)
        let updatePayload = { name, displayName: name, phone };
        if (typeof epPendingAvatarUrl !== 'undefined' && epPendingAvatarUrl) {
            updatePayload.avatar = epPendingAvatarUrl;
        }

        const result = await authService.updateProfile(updatePayload);

        if (result.success) {
            // Ghi đè ngay cache local cho đồng bộ hoàn hảo
            const user = authService.getCurrentUser();
            if (user && updatePayload.avatar) {
                const userId = user._id || user.id || user.email;
                const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
                localStorage.setItem(avatarKey, updatePayload.avatar);
            }
            
            showMessage('Cập nhật thông tin thành công!', 'success');
            
            // Buộc vẽ lại toàn bộ Avatar trên web
            if (typeof updateUserUI === 'function') updateUserUI();
            if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
            if (typeof loadBasicUserInfo === 'function') loadBasicUserInfo();
            
            if (typeof refreshAllUI === 'function') refreshAllUI();
            else loadUserProfile();
        } else {
            showMessage(result.message || 'Lỗi cập nhật', 'error');
        }
    });
}

// Setup password form
function setupPasswordForm() {
    const form = document.getElementById('passwordForm');
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;

        if (newPassword.length < 6) {
            showMessage('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
            return;
        }

        const result = authService.changePassword(oldPassword, newPassword);

        if (result.success) {
            showMessage('Đổi mật khẩu thành công!', 'success');
            form.reset();
        } else {
            showMessage(result.message, 'error');
        }
    });
}

// Load subscription info
window.loadSubscriptionInfo = function() {
    const container = document.getElementById('subscriptionInfo');
    if (!container) return;

    // Use current user immediately if possible to avoid flicker
    const user = (typeof authService !== 'undefined') ? authService.getCurrentUser() : null;
    
    // Show loading state if user is being fetched (optional)
    if (!user) {
        container.innerHTML = `
            <div class="bg-black/30 border border-white/5 rounded-lg p-6">
                <div class="animate-pulse">
                    <div class="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div class="space-y-2">
                        <div class="h-4 bg-gray-700 rounded w-1/2"></div>
                        <div class="h-4 bg-gray-700 rounded w-1/3"></div>
                    </div>
                </div>
            </div>
        `;
    }

    const render = (u) => {
        let planKey = 'FREE';
        let expiresDate = '';
        
        if (u && u.subscription && u.subscription.plan) {
            const endDate = u.subscription.endDate || u.subscription.expiresAt;
            let isExpired = false;
            if (endDate) {
                const expiry = new Date(endDate);
                expiry.setDate(expiry.getDate() + 1);
                if (new Date() > expiry) isExpired = true;
            }
            
            if (isExpired || u.subscription.status === 'blocked' || u.subscription.status === 'inactive') {
                planKey = 'FREE';
                expiresDate = '';
            } else {
                planKey = u.subscription.plan;
                if (endDate) expiresDate = new Date(endDate).toLocaleDateString('vi-VN');
            }
        }

        let planDetails = { name: 'Cơ bản', price: 0, quality: 'SD', devices: 1 };
        
        if (planKey === 'PREMIUM') {
            planDetails = { name: 'Premium (4K)', price: 69000, quality: '4K HDR', devices: 2 };
        } else if (planKey === 'FAMILY') {
            planDetails = { name: 'Family', price: 699000, quality: '4K HDR', devices: 4 };
        } else if (planKey !== 'FREE' && typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SUBSCRIPTION_PLANS && APP_CONFIG.SUBSCRIPTION_PLANS[planKey]) {
            const sp = APP_CONFIG.SUBSCRIPTION_PLANS[planKey];
            planDetails = { 
                name: sp.name || planKey, 
                price: sp.price || 0, 
                quality: sp.features && sp.features[0] ? sp.features[0] : '4K HDR',
                devices: sp.features && sp.features[1] ? sp.features[1] : 'Không giới hạn' 
            };
        }

        const isPremium = planKey !== 'FREE';

        container.innerHTML = `
            <div class="p-status-card ${isPremium ? 'p-shine-effect' : ''}">
                <div class="p-status-header">
                    <div>
                        <div class="p-status-label">Gói hiện tại</div>
                        <h3 class="p-title" style="margin:0; ${isPremium ? 'color:var(--p-gold)' : ''}">
                            ${planDetails.name}
                        </h3>
                    </div>
                    ${isPremium ? '<div class="p-status-badge">Active</div>' : '<div class="p-status-badge" style="background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.4);">Standard</div>'}
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="p-status-item">
                        <span class="material-icons-round" style="color:var(--p-blue); font-size:18px;">high_quality</span>
                        <div>
                            <div class="p-status-label">Chất lượng</div>
                            <div class="p-status-value">${planDetails.quality}</div>
                        </div>
                    </div>
                    <div class="p-status-item">
                        <span class="material-icons-round" style="color:var(--p-purple); font-size:18px;">devices</span>
                        <div>
                            <div class="p-status-label">Thiết bị</div>
                            <div class="p-status-value">${planDetails.devices}</div>
                        </div>
                    </div>
                </div>

                ${expiresDate && isPremium ? `
                <div class="p-status-item" style="border-color:rgba(232,185,79,0.3); background:rgba(232,185,79,0.05);">
                    <span class="material-icons-round" style="color:var(--p-gold); font-size:18px;">event</span>
                    <div style="flex:1">
                        <div class="p-status-label" style="color:rgba(232,185,79,0.6)">Ngày hết hạn</div>
                        <div class="p-status-value" style="color:var(--p-gold)">${expiresDate}</div>
                    </div>
                </div>` : ''}

                ${!isPremium ? `
                <div style="margin-top:8px;">
                    <p style="font-size:12px; color:rgba(255,255,255,0.4); margin-bottom:12px;">Nâng cấp lên Premium để trải nghiệm phim 4K không quảng cáo.</p>
                </div>` : ''}
            </div>
        `;

        // Update hero plan badge if exists
        const heroPlan = document.getElementById('heroPlanBadge');
        if (heroPlan) {
            heroPlan.textContent = planKey === 'FREE' ? 'Khán Giả' : planKey;
            if (planKey !== 'FREE') {
                heroPlan.style.background = '#e8b94f';
                heroPlan.style.color = '#111';
            }
        }
    };

    if (user) {
        render(user);
    } else {
        setTimeout(() => {
            const u = authService.getCurrentUser();
            if (u) render(u);
        }, 500);
    }
}

// Load favorites
function loadFavorites() {
    const container = document.getElementById('favoritesList');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div style="grid-column: 1 / -1; display:flex; justify-content:center; align-items:center; padding:32px 0; width:100%;">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span style="margin-left:12px; color:rgba(255,255,255,0.4);">Đang tải phim yêu thích...</span>
        </div>
    `;

    // Simulate loading delay
    setTimeout(() => {
        const favorites = userService.getFavorites();

        if (favorites.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 0; width:100%; gap:12px;">
                    <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; margin-bottom:4px;">
                        <span class="material-icons-round" style="font-size:32px; color:rgba(255,255,255,0.15);">favorite_border</span>
                    </div>
                    <p style="font-size:14px; color:rgba(255,255,255,0.35); margin:0; font-weight:500;">Chưa có phim yêu thích nào</p>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(movie => `
            <div class="relative flex gap-4 p-4 bg-black/30 border border-white/5 rounded-lg hover:border-primary/50 transition-all group">
                <div class="relative w-24 aspect-[2/3] flex-shrink-0 rounded-md overflow-hidden bg-black/40">
                    <a href="/phim/${movie.slug}" class="block w-full h-full">
                        <img src="${movieAPI.getImageURL(movie.thumb_url)}" 
                             alt="${movie.name}"
                             class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             data-tmdb-slug="${movie.slug}"
                             data-tmdb-id="${movie.tmdb?.id || ''}"
                             data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                             data-tmdb-year="${movie.year || ''}"
                             data-tmdb-type="poster"
                             
                             onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null" />
                    </a>
                    <button onclick="event.preventDefault(); event.stopPropagation(); removeFavorite('${movie.slug}')" 
                            class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md border border-white/10 transition-all active:scale-90 z-10"
                            style="cursor:pointer;"
                            title="Xóa khỏi yêu thích">
                        <span class="material-icons-round" style="font-size:14px;">close</span>
                    </button>
                </div>
                <a href="/phim/${movie.slug}" class="flex-1 min-w-0 flex flex-col justify-center" style="text-decoration:none;">
                    <h4 class="font-bold text-white group-hover:text-primary transition-colors truncate text-[15px]">
                        ${movie.name}
                    </h4>
                    <p class="text-sm text-gray-400 mt-1">
                        ${movie.year ? `${movie.year}` : 'Phim Lẻ/Bộ'} • ${movie.quality || 'Full HD'}
                    </p>
                    <p class="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                        <span class="material-icons-round text-[#e8b94f]" style="font-size:12px;">favorite</span>
                        Đã thêm vào danh sách yêu thích
                    </p>
                </a>
            </div>
        `).join('');
        
        // Update Stats count immediately
        if(typeof updateJourneyUI === 'function') updateJourneyUI();
    }, 300);
}

// Remove favorite
window.removeFavorite = function (slug) {
    if (confirm('Bạn có chắc muốn xóa phim này khỏi danh sách yêu thích?')) {
        userService.removeFromFavorites(slug);
        loadFavorites();
        showMessage('Đã xóa khỏi danh sách yêu thích', 'success');
    }
};

// Load history
function loadHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span class="ml-3 text-gray-400">Đang tải lịch sử xem...</span>
        </div>
    `;

    // Simulate loading delay
    setTimeout(() => {
        const history = userService.getWatchHistory();

        if (history.length === 0) {
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:48px 0; width:100%; gap:12px;">
                    <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; margin-bottom:4px;">
                        <span class="material-icons-round" style="font-size:32px; color:rgba(255,255,255,0.15);">history_toggle_off</span>
                    </div>
                    <p style="font-size:14px; color:rgba(255,255,255,0.35); margin:0; font-weight:500;">Bạn chưa xem phim nào</p>
                </div>
            `;
            return;
        }

        container.innerHTML = history.map(movie => {
            const watchedDate = new Date(movie.watchedAt).toLocaleDateString('vi-VN');
            const progress = userService.getWatchProgress(movie.slug, movie.episode);
            const progressPercent = progress.percentage || 0;

            return `
                <a href="/xem-phim/${movie.slug}${movie.episode ? `/${String(movie.episode).startsWith('tap-') ? movie.episode : 'tap-' + movie.episode}` : ''}" 
                   class="flex gap-4 p-4 bg-black/30 border border-white/5 rounded-lg hover:border-primary/50 transition-all group">
                    <div class="w-24 aspect-[2/3] flex-shrink-0 rounded-md overflow-hidden">
                        <img src="${movieAPI.getImageURL(movie.thumb_url)}" 
                             alt="${movie.name}"
                             class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             data-tmdb-slug="${movie.slug}"
                             data-tmdb-id="${movie.tmdb?.id || ''}"
                             data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                             data-tmdb-year="${movie.year || ''}"
                             data-tmdb-type="poster"
                             
                             onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-white group-hover:text-primary transition-colors truncate">
                            ${movie.name}
                        </h4>
                        <p class="text-sm text-gray-400 mt-1">
                            ${movie.episode ? `Tập ${movie.episode} • ` : ''}${movie.year}
                        </p>
                        <p class="text-xs text-gray-500 mt-2">Xem lúc: ${watchedDate}</p>
                        ${progressPercent > 0 ? `
                        <div class="mt-3">
                            <div class="w-full bg-gray-700 rounded-full h-1.5">
                                <div class="bg-primary h-1.5 rounded-full" style="width: ${progressPercent}%"></div>
                            </div>
                            <p class="text-xs text-gray-400 mt-1">${Math.round(progressPercent)}% hoàn thành</p>
                        </div>
                        ` : ''}
                    </div>
                </a>
            `;
        }).join('');
    }, 400);
}

// Load Transaction History
function loadTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;

    // Show loading
    container.innerHTML = `
        <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8b94f]"></div>
            <span class="ml-3 text-gray-400">Đang tải lịch sử giao dịch...</span>
        </div>
    `;

    setTimeout(() => {
        const user = authService.getCurrentUser();
        const transactions = (user && user.transactions) ? [...user.transactions].reverse() : [];

        if (transactions.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:48px 24px;background:rgba(255,255,255,0.02);border-radius:16px;border:1px dashed rgba(255,255,255,0.1);">
                    <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                        <span class="material-icons-round" style="font-size:24px;color:rgba(255,255,255,0.2);">receipt</span>
                    </div>
                    <p style="color:rgba(255,255,255,0.3);font-size:14px;margin:0;font-weight:500;">Bạn chưa có giao dịch nào</p>
                    <p style="color:rgba(255,255,255,0.15);font-size:12px;margin-top:4px;">Lịch sử nạp xu và mua gói sẽ hiện ở đây</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(t => {
            const date = new Date(t.date || Date.now());
            const dateStr = date.toLocaleDateString('vi-VN');
            const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            let icon = 'payments';
            let color = '#e8b94f';
            let bgColor = 'rgba(232,185,79,0.1)';
            
            if (t.type === 'spend') {
                icon = 'shopping_bag';
                color = '#f87171';
                bgColor = 'rgba(248,113,113,0.1)';
            } else if (t.title && (t.title.includes('Admin') || t.type === 'admin')) {
                icon = 'verified_user';
                color = '#34d399';
                bgColor = 'rgba(52,211,153,0.1)';
            }

            return `
                <div class="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-xl hover:border-white/10 transition-all">
                    <div style="width:44px;height:44px;border-radius:12px;background:${bgColor};display:flex;align-items:center;justify-content:center;color:${color};flex-shrink:0;">
                        <span class="material-icons-round" style="font-size:20px;">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="font-bold text-white text-sm truncate pr-2">${t.title || 'Giao dịch hệ thống'}</h4>
                            <span class="text-xs font-black" style="color:${t.amount >= 0 ? '#34d399' : '#f87171'}; white-space:nowrap;">
                                ${t.amount >= 0 ? '+' : ''}${t.amount.toLocaleString()} XU
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">${dateStr}</span>
                            <span class="w-1 h-1 rounded-full bg-gray-700"></span>
                            <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">${timeStr}</span>
                            ${t.type ? `<span class="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-black uppercase tracking-tighter border border-white/5">${t.type}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }, 400);
}

// Load Playlists
function loadPlaylists() {
    const container = document.getElementById('playlistsList');
    if (!container) return;

    // Sync from profile first to ensure fresh data
    const user = authService.getCurrentUser();
    if (user && user.playlists && typeof playlistService !== 'undefined') {
        playlistService.syncFromProfile(user.playlists);
    }

    // Show loading
    container.innerHTML = `
        <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e8b94f]"></div>
            <span class="ml-3 text-gray-400">Đang tải danh sách...</span>
        </div>
    `;

    setTimeout(() => {
        if (typeof playlistService === 'undefined') {
            container.innerHTML = '<p class="text-center text-gray-400 py-8">Dịch vụ danh sách chưa sẵn sàng</p>';
            return;
        }

        const playlists = playlistService.getAll();

        if (playlists.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:48px 24px;background:rgba(255,255,255,0.02);border-radius:16px;border:1px dashed rgba(255,255,255,0.1);">
                    <div style="font-size:48px;margin-bottom:16px;opacity:0.3;">📋</div>
                    <h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px;">Chưa có danh sách nào</h3>
                    <p style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:20px;">Hãy tạo danh sách đầu tiên để lưu trữ những bộ phim yêu thích của bạn.</p>
                    <button onclick="window.openCreatePlaylistDialog()" style="padding:8px 20px;background:#e8b94f;border:none;border-radius:20px;color:#000;font-size:13px;font-weight:700;cursor:pointer;">Tạo ngay</button>
                </div>
            `;
            return;
        }

        container.innerHTML = playlists.map(pl => `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s;cursor:pointer;" 
                 onmouseover="this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(232,185,79,0.2)'" 
                 onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.06)'"
                 onclick="window.viewPlaylist('${pl.id}')">
                <div style="display:flex;align-items:center;gap:16px;min-width:0;">
                    <div style="width:50px;height:50px;background:linear-gradient(135deg,#e8b94f,#d4a017);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#000;flex-shrink:0;">
                        <span class="material-icons-round" style="font-size:24px;">playlist_play</span>
                    </div>
                    <div style="min-width:0;">
                        <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.name}</div>
                        <div style="font-size:12px;color:rgba(255,255,255,0.4);display:flex;align-items:center;gap:10px;">
                            <span>${pl.movies.length} bộ phim</span>
                            <span>•</span>
                            <span>${new Date(pl.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <button onclick="event.stopPropagation(); window.deletePlaylist('${pl.id}', '${pl.name}')" style="width:36px;height:36px;border-radius:50%;background:rgba(248,113,113,0.1);border:none;color:#f87171;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.background='#f87171';this.style.color='#fff'" onmouseout="this.style.background='rgba(248,113,113,0.1)';this.style.color='#f87171'">
                        <span class="material-icons-round" style="font-size:18px;">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    }, 400);
}

// Actions for Playlists
window.viewPlaylist = function(id) {
    const container = document.getElementById('playlistsList');
    const header = document.getElementById('playlistsHeader');
    if (!container || !header) return;
    
    const pl = playlistService.getById(id);
    if (!pl) return;

    // Save original header HTML if not already saved
    if (!window._originalPlaylistHeader) {
        window._originalPlaylistHeader = header.innerHTML;
    }
    
    // Smooth transition
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        // Update header with Back button
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;" class="playlist-animate-in">
                <button onclick="window.backToPlaylists()" style="background:rgba(255,255,255,0.08); border:none; width:32px; height:32px; border-radius:50%; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'">
                    <span class="material-icons-round" style="font-size:18px;">arrow_back</span>
                </button>
                <div style="min-width:0;">
                    <h2 style="font-size:1.25rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.name}</h2>
                    <p style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${pl.movies.length} phim trong danh sách</p>
                </div>
            </div>
        `;

        if (pl.movies.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 24px;" class="playlist-animate-in">
                    <div style="font-size:64px;margin-bottom:20px;opacity:0.1;filter:grayscale(1);">🎬</div>
                    <h3 style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px;">Danh sách trống</h3>
                    <p style="color:rgba(255,255,255,0.4);max-width:240px;margin:0 auto;font-size:13px;">Hãy quay lại trang chủ và thêm những bộ phim bạn yêu thích vào đây nhé!</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:12px;" class="playlist-animate-in">
                    ${pl.movies.map((movie, index) => `
                        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;transition:all 0.3s;animation-delay:${index * 0.05}s;" 
                             class="playlist-item-card"
                             onmouseover="this.style.background='rgba(255,255,255,0.06)';this.style.transform='translateX(5px)';this.style.borderColor='rgba(232,185,79,0.15)'" 
                             onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.transform='translateX(0)';this.style.borderColor='rgba(255,255,255,0.05)'">
                            <a href="/phim/${movie.slug}" style="display:flex;align-items:center;gap:14px;text-decoration:none;min-width:0;flex:1;">
                                <div style="position:relative;flex-shrink:0;">
                                    <img src="${movieAPI.getImageURL(movie.thumb_url)}" 
                                         data-tmdb-slug="${movie.slug}"
                                         data-tmdb-id="${movie.tmdb?.id || ''}"
                                         data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                                         data-tmdb-year="${movie.year || ''}"
                                         data-tmdb-type="poster"
                                         
                                         style="width:50px;height:75px;border-radius:10px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.3);" onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null" />
                                    <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.4), transparent);border-radius:10px;"></div>
                                </div>
                                <div style="min-width:0;">
                                    <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${movie.name}</div>
                                    <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(255,255,255,0.3);">
                                        <span style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;color:rgba(255,255,255,0.6);">${movie.year || 'N/A'}</span>
                                        <span>•</span>
                                        <span>Thêm ngày ${new Date(movie.addedAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            </a>
                            <button onclick="window.removeFromPlaylist('${pl.id}', '${movie.slug}', '${pl.name}')" 
                                    style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.04);border:none;color:rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;flex-shrink:0;" 
                                    onmouseover="this.style.background='rgba(248,113,113,0.15)';this.style.color='#f87171'" 
                                    onmouseout="this.style.background='rgba(255,255,255,0.04)';this.style.color='rgba(255,255,255,0.3)'"
                                    title="Xóa khỏi danh sách">
                                <span class="material-icons-round" style="font-size:18px;">delete_outline</span>
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        container.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    }, 200);
};

window.backToPlaylists = function() {
    const header = document.getElementById('playlistsHeader');
    if (header && window._originalPlaylistHeader) {
        header.innerHTML = window._originalPlaylistHeader;
    }
    loadPlaylists();
};

window.removeFromPlaylist = function(plId, slug, plName) {
    if (confirm(`Xóa phim này khỏi danh sách "${plName}"?`)) {
        playlistService.removeMovie(plId, slug);
        window.viewPlaylist(plId); // Refresh view
        showMessage('Đã xóa phim khỏi danh sách', 'info');
    }
};

window.openCreatePlaylistDialog = function() {
    if (typeof openCreatePlaylistModalStandalone === 'function') {
        openCreatePlaylistModalStandalone();
    } else {
        showMessage('Tính năng này đang được bảo trì', 'error');
    }
};



window.deletePlaylist = function(id, name) {
    if (confirm(`Bạn có chắc muốn xóa danh sách "${name}"?`)) {
        if (typeof playlistService !== 'undefined') {
            playlistService.delete(id);
            loadPlaylists();
            showMessage('Đã xóa danh sách', 'success');
        }
    }
};

// Clear history
window.clearHistory = function () {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử xem?')) {
        userService.clearHistory();
        loadHistory();
        showMessage('Đã xóa lịch sử xem', 'success');
    }
};

// Show tab
window.showTab = function (tabName, isInitialOrPop = false) {
    // 🚀 Hybrid SPA Routing: Update URL state gracefully without full page reloads
    if (!isInitialOrPop) {
        const tabToPath = {
            'journey': '/profile.html',
            'shop': '/profile/cua-hang.html',
            'subscription': '/profile/goi-thanh-vien.html',
            'favorites': '/profile/phim-yeu-thich.html',
            'history': '/profile/lich-su-xem.html',
            'transactions': '/profile/giao-dich.html',
            'playlists': '/profile/danh-sach.html'
        };
        const newPath = tabToPath[tabName];
        if (newPath && window.location.pathname !== newPath) {
            window.history.pushState({ tab: tabName }, '', newPath);
        }
    }

    // Hide all tab-content elements
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active-tab');
        tab.classList.add('hidden');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
        selectedTab.classList.add('active-tab');
    }

    // Add active class to the button matching this tab
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        
        // Update Mobile View Title
        const btnClone = activeBtn.cloneNode(true);
        const iconSpan = btnClone.querySelector('.material-icons-round, span');
        if (iconSpan) iconSpan.remove();
        const titleText = btnClone.innerText.trim();
        const mobileTitle = document.getElementById('mobileViewTitle');
        if (mobileTitle) mobileTitle.textContent = titleText;
    }

    // Handle Mobile View Switching
    if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector('.profile-sidebar');
        const contentHeader = document.getElementById('mobileContentHeader');
        const mainNav = document.getElementById('mainNav');
        
        if (sidebar) sidebar.style.display = 'none';
        if (contentHeader) contentHeader.style.display = 'flex';
        
        // 🚀 NATIVE APP UX: Hide the global main navbar when inside a detailed Sub-Tab
        // This permanently stops all header collisions and allows the Back Header to sit flush with the Safe Area Notch.
        // mainNav.style.display = "none"; // Removed to keep header sticky
        
        // Ensure hero card (banner) is hidden or smaller on mobile detail view to save space
        const heroCard = document.querySelector('.profile-hero-card');
        if (heroCard) heroCard.style.display = 'none';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Load data based on selected tab (only if not loaded before)
    if (!loadedTabs.has(tabName)) {
        switch (tabName) {
            case 'profile':
                loadUserProfile();
                break;
            case 'subscription':
                loadSubscriptionInfo();
                break;
            case 'favorites':
                loadFavorites();
                break;
            case 'history':
                loadHistory();
                break;
            case 'journey':
                if (typeof initJourney === 'function') initJourney();
                else if (typeof loadJourney === 'function') loadJourney();
                break;
            case 'shop':
                if (typeof renderShopItems === 'function') renderShopItems();
                break;
            case 'playlists':
                loadPlaylists();
                break;
            case 'transactions':
                loadTransactions();
                break;
        }
        loadedTabs.add(tabName);
    }
};

// Back to Menu Logic for Mobile
window.goBackToMenu = function(isInitialOrPop = false) {
    // 🚀 Restore root URL when navigating back to menu
    if (!isInitialOrPop) {
        if (window.location.pathname !== '/profile.html') {
            window.history.pushState({ tab: 'journey' }, '', '/profile.html');
        }
    }

    if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector('.profile-sidebar');
        const contentHeader = document.getElementById('mobileContentHeader');
        const heroCard = document.querySelector('.profile-hero-card');
        const mainNav = document.getElementById('mainNav');
        
        // Show Sidebar, Hero & Restore Main Navbar
        if (sidebar) sidebar.style.display = 'flex';
        if (heroCard) heroCard.style.display = 'block';
        // mainNav.style.display = ""; // Removed to keep header sticky
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active-tab');
            tab.classList.add('hidden');
            tab.style.display = 'none';
        });
        
        // Hide Back Header
        if (contentHeader) contentHeader.style.display = 'none';

        // Remove active button class
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};


// ─── Premium Toast Notification ──────────────────────────────────────────
// Moved to user-ui.js for global access

// Avatar selection for profile
const PROFILE_AVATAR_LIST = [
    "https://i.ex-cdn.com/giadinhmoi.vn/files/content/2024/12/13/470107535_1156674079362932_3220600486106282952_n-0953.jpg",
    "https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/07/anh-son-tung-2.jpg",
    "https://cdn2.fptshop.com.vn/unsafe/800x0/anh_lisa_6_d83ab4e404.jpg",
    "https://img.tripi.vn/cdn-cgi/image/width=700,height=700/https://gcs.tripi.vn/public-tripi/tripi-feed/img/482756agE/anh-mo-ta.png",
    "https://tophinhanh.net/wp-content/uploads/2023/12/anh-kim-jisoo-cute-1.jpg",
    "https://i.pinimg.com/736x/3c/d7/24/3cd724dd754d0b42bd6599efe18ceff0.jpg"
];

function toggleAvatarSelect(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const dropdown = document.getElementById('avatarSelectDropdown');
    if (!dropdown) return;

    if (dropdown.classList.contains('hidden')) {
        // Initialize avatars UI if empty
        const grid = document.getElementById('avatarGrid');
        if (grid && grid.children.length === 0) {
            let html = '';
            PROFILE_AVATAR_LIST.forEach(url => {
                html += `<img src="${url}" class="relative w-12 h-12 rounded-full object-cover cursor-pointer hover:scale-[1.35] hover:z-50 transition-all duration-300 hover:border-primary border-2 border-transparent shadow-[0_0_10px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(242,242,13,0.5)]" onclick="selectAvatar(event, '${url}')">`;
            });
            grid.innerHTML = html;
        }
        dropdown.classList.remove('hidden');
        
        // Hide when clicking outside
        const outsideClickListener = (event) => {
            if (!event.target.closest('#profileAvatarSection')) {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', outsideClickListener);
            }
        };
        setTimeout(() => document.addEventListener('click', outsideClickListener), 10);
    } else {
        dropdown.classList.add('hidden');
    }
}

async function selectAvatar(e, url) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    document.getElementById('avatarSelectDropdown').classList.add('hidden');

    if (!authService.isLoggedIn()) {
        showMessage('Vui lòng đăng nhập để thay đổi hình đại diện', 'error');
        return;
    }

    const user    = authService.getCurrentUser();
    const userId  = user._id || user.id || user.email;
    const userAvatar = document.getElementById('userAvatar');

    // Optimistic UI: show chosen avatar immediately
    if (userAvatar) {
        userAvatar.innerHTML = `<img src="${url}" class="w-full h-full object-cover" />`;
    }
    // Show saving indicator
    showMessage('Đang lưu hình đại diện...', 'info');

    try {
        // Use dual-storage avatarService (local + Firestore + backend)
        let result;
        if (typeof avatarService !== 'undefined') {
            result = await avatarService.saveAvatar(userId, url);
        } else {
            // Fallback: only backend + legacy localStorage
            result = await authService.updateProfile({ avatar: url });
            if (result.success) {
                localStorage.setItem('ap_chosen_avatar', url);
            }
        }

        if (result && result.success) {
            showMessage('Cập nhật hình đại diện thành công!', 'success');

            // Refresh UI with final state
            loadBasicUserInfo();
            if (typeof updateUserUI === 'function') setTimeout(updateUserUI, 100);
        } else {
            showMessage('⚠️ ' + (result && result.message ? result.message : 'Cập nhật thất bại'), 'error');
            loadBasicUserInfo(); // revert
        }
    } catch (error) {
        console.error('[profile] selectAvatar error:', error);
        showMessage('Lỗi kết nối', 'error');
        loadBasicUserInfo(); // revert
    }
}

// --- EDIT PROFILE MODAL LOGIC ---
let epCurrentTab = 'ep-hoso';
let epPendingAvatarUrl = '';

window.openEditProfileModal = function() {
    const user = authService.getCurrentUser();
    if (!user) return;

    // Populate Data
    const nameInput = document.getElementById('epNameInput');
    const emailInput = document.getElementById('epEmailInput');
    const phoneInput = document.getElementById('epPhoneInput');
    
    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';

    epPendingAvatarUrl = user.avatar || '';
    updateEpAvatarPreview();

    // Clear passwords
    const oldPw = document.getElementById('epOldPassword');
    const newPw = document.getElementById('epNewPassword');
    const confirmPw = document.getElementById('epConfirmPassword');
    if (oldPw) oldPw.value = '';
    if (newPw) newPw.value = '';
    if (confirmPw) confirmPw.value = '';

    // Default to 'hoso' tab
    switchEpTab('ep-hoso');

    // Show modal
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'flex';
};

window.closeEditProfileModal = function() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
};

window.switchEpTab = function(tabId) {
    epCurrentTab = tabId;

    // Update tab buttons
    document.querySelectorAll('.ep-modal-tab').forEach(btn => {
        if (btn.dataset.target === tabId) {
            btn.classList.add('active');
            btn.style.color = '#a78bfa';
            btn.style.borderBottomColor = '#a78bfa';
        } else {
            btn.classList.remove('active');
            btn.style.color = 'rgba(255,255,255,0.4)';
            btn.style.borderBottomColor = 'transparent';
        }
    });

    // Update content
    document.querySelectorAll('.ep-tab-content').forEach(content => {
        content.style.display = content.id === tabId ? 'block' : 'none';
    });

    // Update Save button text
    const saveBtn = document.getElementById('epSaveBtn');
    if (!saveBtn) return;

    if (tabId === 'ep-matkhau') {
        saveBtn.textContent = 'Đổi mật khẩu';
        saveBtn.style.background = '#a855f7';
        saveBtn.style.display = 'block';
    } else if (tabId === 'ep-tuychinh') {
        saveBtn.style.display = 'block';
        saveBtn.textContent = 'Lưu thay đổi';
        saveBtn.style.background = '#a855f7';

        // Refresh Gamification Pills in preview
        if (typeof updateJourneyUI === 'function') updateJourneyUI();
        
        // Render dynamic content from SHOP_DATA (via profile-shop.js)
        if (typeof renderOwnedAvatarsForEdit === 'function') renderOwnedAvatarsForEdit();
        if (typeof renderOwnedFramesForEdit === 'function') renderOwnedFramesForEdit();
        if (typeof renderOwnedBannersForEdit === 'function') renderOwnedBannersForEdit();
        
        // Highlight current frame
        const currentId = localStorage.getItem('ap_frame_id') || 'none';
        document.querySelectorAll('.ep-frame-option').forEach(opt => {
            if (opt.dataset.frameId === currentId) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
        
        // Populate preview with current data
        const user = authService.getCurrentUser();
        if (user) {
            const previewAvatar = document.getElementById('epFramePreviewAvatar');
            const previewInitials = document.getElementById('epFramePreviewInitials');
            const previewWrap = document.getElementById('epFramePreviewWrap');
            
            if (user.avatar) {
                if (previewAvatar) { previewAvatar.src = user.avatar; previewAvatar.style.display = 'block'; }
                if (previewInitials) previewInitials.style.display = 'none';
            }
            
            const frameClass = localStorage.getItem('ap_frame_class');
            if (previewWrap) {
                Array.from(previewWrap.classList).forEach(c => {
                    if (c.startsWith('av-frame-')) previewWrap.classList.remove(c);
                });
                if (frameClass) previewWrap.classList.add(frameClass);
            }
        }
    } else {
        saveBtn.style.display = 'block';
        saveBtn.textContent = 'Lưu thay đổi';
        saveBtn.style.background = '#a855f7';
    }
};

window.updateEpAvatarPreview = function() {
    const preview = document.getElementById('epAvatarPreview');
    const initials = document.getElementById('epAvatarInitials');
    const removeBtn = document.getElementById('epRemoveAvatarBtn');
    
    // Preview in customization tab
    const framePreview = document.getElementById('epFramePreviewAvatar');
    const frameInitials = document.getElementById('epFramePreviewInitials');

    const user = authService.getCurrentUser();
    const currentUrl = epPendingAvatarUrl || (user ? user.avatar : '');

    if (currentUrl) {
        if (preview) { preview.src = currentUrl; preview.style.display = 'block'; }
        if (framePreview) { framePreview.src = currentUrl; framePreview.style.display = 'block'; }
        
        if (initials) initials.style.display = 'none';
        if (frameInitials) frameInitials.style.display = 'none';
        if (removeBtn && epPendingAvatarUrl) removeBtn.style.display = 'flex';
    } else {
        if (preview) preview.style.display = 'none';
        if (framePreview) framePreview.style.display = 'none';
        
        if (initials) {
            initials.style.display = 'flex';
            initials.textContent = document.getElementById('epNameInput').value.charAt(0).toUpperCase() || (user ? user.name.charAt(0).toUpperCase() : 'U');
        }
        if (frameInitials) frameInitials.style.display = 'flex';
        if (removeBtn) removeBtn.style.display = 'none';
    }
};

window.renderOwnedAvatarsForEdit = function() {
    const grid = document.getElementById('epAvatarGrid');
    if (!grid) return;
    
    const user = authService.getCurrentUser();
    const currentUrl = epPendingAvatarUrl || (user ? user.avatar : '');
    
    let html = '';
    PROFILE_AVATAR_LIST.forEach(url => {
        const isSelected = currentUrl === url;
        html += `
            <div class="ep-avatar-option ${isSelected ? 'selected' : ''}" 
                 onclick="epSelectAvatarImage('${url}')"
                 style="width:100%; aspect-ratio:1; border-radius:50%; cursor:pointer; border:3px solid ${isSelected ? '#a78bfa' : 'rgba(255,255,255,0.1)'}; overflow:hidden; transition:all 0.2s;">
                <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
            </div>
        `;
    });
    grid.innerHTML = html;
};

window.epSelectAvatarImage = function(url) {
    epPendingAvatarUrl = url;
    window.renderOwnedAvatarsForEdit();
    window.updateEpAvatarPreview();
};

window.removeEpAvatar = function() {
    epPendingAvatarUrl = '';
    updateEpAvatarPreview();
};

window.promptEpAvatarUrl = function() {
    const url = prompt("Nhập URL hình ảnh:");
    if (url) {
        epPendingAvatarUrl = url;
        updateEpAvatarPreview();
    }
};

window.handleEpAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Hiển thị trạng thái loading nhẹ
    showMessage("Đang nén ảnh...", "info");

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function() {
            // Tạo canvas để nén và crop vuông
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 256;
            canvas.width = MAX_SIZE;
            canvas.height = MAX_SIZE;
            const ctx = canvas.getContext('2d');

            // Tính toán cắt vuông ở giữa (Center Crop)
            let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
            if (img.width > img.height) {
                sourceWidth = img.height;
                sourceX = (img.width - img.height) / 2;
            } else {
                sourceHeight = img.width;
                sourceY = (img.height - img.width) / 2;
            }

            // Vẽ nén
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, MAX_SIZE, MAX_SIZE);

            // Xuất thành Base64 chất lượng nén 0.8 để siêu nhẹ (khoảng 15-30KB)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            epPendingAvatarUrl = compressedBase64;
            
            // ═════════════════════════════════════════════════════════════════════
            // PHÉP MÀU TỨC THỜI: LƯU LOCAL CACHE & RENDER LẠI TOÀN WEBSITE NGAY LẬP TỨC!
            // ═════════════════════════════════════════════════════════════════════
            const user = authService.getCurrentUser();
            if (user) {
                const userId = user._id || user.id || user.email;
                const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
                localStorage.setItem(avatarKey, compressedBase64);
            }
            // Buộc render lại toàn bộ giao diện để người dùng thấy thay đổi CẤP KỲ!
            if (typeof updateUserUI === 'function') updateUserUI();
            if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
            if (typeof loadBasicUserInfo === 'function') loadBasicUserInfo();
            // ═════════════════════════════════════════════════════════════════════

            showMessage("Đã tải ảnh & Cập nhật giao diện tức thì!", "success");

            // Mở modal và đồng bộ preview
            const modal = document.getElementById('editProfileModal');
            if (modal && modal.style.display !== 'flex') {
                window.openEditProfileModal();
            }
            window.switchEpTab('ep-hoso');
            window.updateEpAvatarPreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.saveEditProfile = async function() {
    const user = authService.getCurrentUser();
    if (!user) return;
    const userId = user._id || user.id || user.email;

    if (epCurrentTab === 'ep-hoso') {
        const name = document.getElementById('epNameInput').value.trim();
        const phone = document.getElementById('epPhoneInput').value.trim();

        if (name.length < 2) {
            showMessage("Tên quá ngắn!", "error");
            return;
        }

        const result = await authService.updateProfile({ name, phone, avatar: epPendingAvatarUrl });
        if (result.success) {
            // Đồng bộ cache local ngay lập tức để UI hiển thị luôn
            if (epPendingAvatarUrl) {
                const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
                localStorage.setItem(avatarKey, epPendingAvatarUrl);
            }
            showMessage("Cập nhật hồ sơ thành công", "success");
            if (typeof updateUserUI === 'function') updateUserUI();
            if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
            if (typeof loadBasicUserInfo === 'function') loadBasicUserInfo();
            closeEditProfileModal();
        } else {
            showMessage(result.message || "Lỗi cập nhật", "error");
        }
    } else if (epCurrentTab === 'ep-matkhau') {
        const oldPw = document.getElementById('epOldPassword').value;
        const newPw = document.getElementById('epNewPassword').value;
        const confirmPw = document.getElementById('epConfirmPassword').value;

        if (!oldPw || !newPw) {
            showMessage("Vui lòng nhập mật khẩu", "warning");
            return;
        }

        if (newPw !== confirmPw) {
            showMessage("Xác nhận mật khẩu không khớp", "error");
            return;
        }

        const res = await authService.changePassword(oldPw, newPw);
        if (res.success) {
            showMessage("Đổi mật khẩu thành công!", "success");
            closeEditProfileModal();
        } else {
            showMessage(res.message || "Lỗi đổi mật khẩu", "error");
        }
    } else if (epCurrentTab === 'ep-tuychinh') {
        const id = window._tempSelectedFrame || localStorage.getItem('ep_selected_frame_id');
        const frameClass = window._tempSelectedFrameClass || localStorage.getItem('ep_selected_frame_class');
        const coverUrl = window._tempSelectedCover;
        
        let updateData = {};
        if (epPendingAvatarUrl && epPendingAvatarUrl !== user.avatar) {
            updateData.avatar = epPendingAvatarUrl;
        }

        if (id) {
            localStorage.setItem('ap_frame_id', id);
            localStorage.setItem('ap_frame_class', frameClass || '');
            updateData.equippedFrame = id;
            updateData.equippedFrameClass = frameClass || '';
        }

        if (coverUrl) {
            localStorage.setItem('ap_profile_cover', coverUrl);
            updateData.profileCover = coverUrl;
        }
        
        if (Object.keys(updateData).length > 0) {
            if (authService.updateProfile) {
                await authService.updateProfile(updateData);
            }
            
            // Đồng bộ cache local cho Avatar nếu có thay đổi trong tab tùy chỉnh
            if (updateData.avatar) {
                const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';
                localStorage.setItem(avatarKey, updateData.avatar);
            }
            
            if (typeof updateUserUI === 'function') updateUserUI();
            if (typeof rebuildMobileMenu === 'function') rebuildMobileMenu();
            if (typeof loadBasicUserInfo === 'function') loadBasicUserInfo();
            showMessage("Đã cập nhật tùy chỉnh thành công!", "success");
            closeEditProfileModal();
        } else {
            closeEditProfileModal();
        }
    }
};

// Selection logic is now handled by profile-shop.js to avoid duplication
// and ensure consistency with the shop logic.

