// Authentication Service with Backend Integration
const STORAGE_KEYS = {
    USER: 'cinestream_user',
    TOKEN: 'cinestream_token',
    TOKEN_EXPIRY: 'cinestream_token_expiry',
    REMEMBER_ME: 'cinestream_remember_me',
    THEME: 'cinestream_theme',
    FAVORITES: 'cinestream_favorites',
    WATCH_HISTORY: 'cinestream_watch_history',
    WATCH_PROGRESS: 'cinestream_watch_progress',
    SUBSCRIPTION: 'cinestream_subscription',
    PLAYLISTS: 'cinestream_playlists'
};


class AuthService {
    constructor() {
        this.backendURL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api';
        // Always use backend for authentication
        this.useBackend = typeof API_CONFIG !== 'undefined' ? API_CONFIG.USE_BACKEND_FOR_AUTH : true;

        // 🚀 FIX SAFARI SESSION LOSS: Restore data from secure persistent cookies if localStorage got cleared
        this.restoreFromCookies();

        this.currentUser = this.loadUser();
        this.refreshInterval = null;

        // Background auto-sync to pull latest avatar/favorites/history from Cloud
        // Only sync if user is logged in
        if (this.isLoggedIn()) {
            setTimeout(() => this.syncProfile(true), 50);
        }

        // Start auto token refresh ONLY if user is logged in
        if (this.isLoggedIn()) {
            this.startTokenRefresh();
        }

        // 📡 Real-time Multi-Tab / Multi-Window Sync Bus
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                this.syncChannel = new BroadcastChannel('aphim_cloud_sync_bus');
                this.syncChannel.onmessage = (event) => {
                    if (event.data && (event.data.type === 'cloud_data_synced' || event.data.type === 'profile_updated')) {
                        console.log('📡 [Realtime Sync Bus] Received cloud update broadcast, refreshing state...');
                        this.syncProfile(true);
                    }
                };
            }
        } catch (e) { }

        // Listen for storage changes across tabs
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEYS.WATCH_HISTORY || e.key === STORAGE_KEYS.FAVORITES || e.key === STORAGE_KEYS.WATCH_PROGRESS || e.key === STORAGE_KEYS.USER) {
                this.currentUser = this.loadUser();
                window.dispatchEvent(new CustomEvent('ap:user-updated', { detail: this.currentUser }));
                if (typeof window.updateUserUI === 'function') try { window.updateUserUI(); } catch (err) { }
            }
        });

        // Instant sync when user focuses or returns to the tab/window
        window.addEventListener('focus', () => {
            if (this.isLoggedIn()) this.syncProfile(true);
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isLoggedIn()) {
                this.syncProfile(true);
            }
        });

        // 🔄 Active multi-device real-time sync heartbeat (every 4s)
        setInterval(() => {
            if (this.isLoggedIn() && !document.hidden) {
                this.syncProfile(false);
            }
        }, 4000);
    }

    // 🍪 SECURE COOKIE DOUBLE-LOCK MECHANISM
    // This fixes Safari losing session upon browser closing
    setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        // Use domain-wide path, secure and lax attributes
        document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax" + (window.location.protocol === 'https:' ? '; Secure' : '');
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    eraseCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    restoreFromCookies() {
        try {
            const cookieToken = this.getCookie(STORAGE_KEYS.TOKEN);
            const localToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

            if (cookieToken && !localToken) {
                console.log('🔄 [Safari Protection] Restoring authentication token from persistent Cookie...');
                localStorage.setItem(STORAGE_KEYS.TOKEN, cookieToken);
            }

            // Cleanup legacy bloated user cookie that causes HTTP 431 Request Header Fields Too Large
            if (this.getCookie(STORAGE_KEYS.USER)) {
                this.eraseCookie(STORAGE_KEYS.USER);
            }
        } catch (e) {
            console.warn('[AuthService] Restore from cookies failed', e);
        }
    }

    // Load user from localStorage
    loadUser() {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Fetch latest user data from backend
    async syncProfile(force = false) {
        if (!this.useBackend || !this.isLoggedIn()) return;

        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token || token.startsWith('demo_token_')) return;

        // Throttling: avoid duplicate calls within 5 seconds unless forced
        const now = Date.now();
        const lastSync = Number(sessionStorage.getItem('ap_last_profile_sync_ts') || 0);
        if (!force && (now - lastSync < 5000)) {
            return;
        }
        sessionStorage.setItem('ap_last_profile_sync_ts', String(now));

        try {
            const response = await fetch(`${this.backendURL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });

            if (!response.ok) {
                // If token is expired or unauthorized, reset session cleanly without spamming
                if (response.status === 401) {
                    console.warn('[AuthService] Phiên đăng nhập đã hết hạn hoặc không hợp lệ (401). Đã tự động dọn dẹp token cũ.');
                    this.logoutSilently();
                    return;
                }
                // If header was too large, clear bloated cookies immediately
                if (response.status === 431) {
                    this.eraseCookie(STORAGE_KEYS.USER);
                }
                return;
            }

            const data = await response.json();
            if (data.success && data.data) {
                const serverUser = data.data;
                const localUser = this.loadUser() || {};
                const userId = serverUser.id || serverUser._id || localUser.id;

                // Check if local device has unsynced decorations that server is missing
                const localAvatar = (userId ? localStorage.getItem(`avatar_${userId}`) : null) || localStorage.getItem('user_avatar') || localUser.avatar;
                const localFrame = localStorage.getItem('ap_frame_id') || localStorage.getItem('ap_equipped_frame') || localUser.equippedFrame;
                const localFrameClass = localStorage.getItem('ap_frame_class') || localUser.equippedFrameClass;
                const localFrameUrl = localStorage.getItem('ap_frame_url') || localUser.equippedFrameUrl;
                const localBanner = localStorage.getItem('ap_equipped_banner') || localUser.equippedBanner;
                const localColor = localStorage.getItem('ap_equipped_color') || localStorage.getItem('ap_name_color') || localUser.equippedColor;
                const localBadge = localStorage.getItem('ap_equipped_badge') || localUser.equippedBadge;
                const localCover = localStorage.getItem('ap_profile_cover') || localUser.profileCover;

                let needPush = false;
                const pushPayload = {};

                // 1. If server has avatar, apply to local device; if server has none but local does, push to cloud
                if (serverUser.avatar || serverUser.avatar_url) {
                    const srvAvatar = serverUser.avatar || serverUser.avatar_url;
                    if (userId) {
                        localStorage.setItem(`avatar_${userId}`, srvAvatar);
                        localStorage.setItem(`ap_avatar_${userId}`, srvAvatar);
                    }
                    localStorage.setItem('user_avatar', srvAvatar);
                    localStorage.setItem('ap_chosen_avatar', srvAvatar);
                } else if (localAvatar && localAvatar.length > 5 && !localAvatar.includes('android-chrome')) {
                    pushPayload.avatar = localAvatar;
                    pushPayload.avatar_url = localAvatar;
                    serverUser.avatar = localAvatar;
                    serverUser.avatar_url = localAvatar;
                    needPush = true;
                }
                // 2. If server has default frame but local has custom frame, push to cloud
                if ((!serverUser.equippedFrame || serverUser.equippedFrame === 'frame_none') && localFrame && localFrame !== 'frame_none' && localFrame !== 'none') {
                    pushPayload.equippedFrame = localFrame;
                    if (localFrameClass) pushPayload.equippedFrameClass = localFrameClass;
                    if (localFrameUrl) pushPayload.equippedFrameUrl = localFrameUrl;
                    needPush = true;
                }
                // 3. If server has default banner but local has custom banner, push to cloud
                if ((!serverUser.equippedBanner || serverUser.equippedBanner === 'banner_default') && localBanner && localBanner !== 'banner_default') {
                    pushPayload.equippedBanner = localBanner;
                    needPush = true;
                }
                // 4. If server has default color but local has custom color, push to cloud
                if ((!serverUser.equippedColor || serverUser.equippedColor === 'color_default') && localColor && localColor !== 'color_default') {
                    pushPayload.equippedColor = localColor;
                    needPush = true;
                }
                // 5. If server has no cover but local has cover, push to cloud
                if (!serverUser.profileCover && localCover) {
                    pushPayload.profileCover = localCover;
                    needPush = true;
                }
                // 6. Sync Badge / Title
                if (serverUser.equippedBadge || serverUser.badge) {
                    const srvBadge = serverUser.equippedBadge || serverUser.badge;
                    localStorage.setItem('ap_equipped_badge', srvBadge);
                    localStorage.setItem('ap_equipped_title', srvBadge);
                } else if (localBadge && localBadge !== 'LV.15' && localBadge !== 'badge_default') {
                    pushPayload.equippedBadge = localBadge;
                    pushPayload.badge = localBadge;
                    serverUser.equippedBadge = localBadge;
                    serverUser.badge = localBadge;
                    needPush = true;
                }
                // Helper Merge Functions
                const mergeHistory = (loc, srv) => {
                    const map = new Map();
                    (srv || []).forEach(it => { if (it && it.slug) map.set(it.slug, it); });
                    (loc || []).forEach(it => {
                        if (it && it.slug) {
                            const ex = map.get(it.slug);
                            if (!ex || new Date(it.watchedAt || 0) > new Date(ex.watchedAt || 0)) {
                                map.set(it.slug, it);
                            }
                        }
                    });
                    return Array.from(map.values()).sort((a, b) => new Date(b.watchedAt || 0) - new Date(a.watchedAt || 0)).slice(0, 60);
                };

                const mergeFavs = (loc, srv) => {
                    const map = new Map();
                    (srv || []).forEach(it => { const k = it?.slug || it?.id; if (k) map.set(k, it); });
                    (loc || []).forEach(it => { const k = it?.slug || it?.id; if (k) map.set(k, it); });
                    return Array.from(map.values()).slice(0, 100);
                };

                const mergeProgress = (loc, srv) => {
                    const res = { ...(srv || {}) };
                    Object.keys(loc || {}).forEach(k => {
                        const lItem = loc[k];
                        const sItem = res[k];
                        if (!sItem || new Date(lItem?.updatedAt || 0) > new Date(sItem?.updatedAt || 0)) {
                            res[k] = lItem;
                        }
                    });
                    return res;
                };

                const mergeArrays = (a, b) => Array.from(new Set([...(a || []), ...(b || [])]));

                // 6. Merged Watch History
                const localHistStr = localStorage.getItem('cinestream_watch_history');
                const localHist = localHistStr ? JSON.parse(localHistStr) : [];
                const mergedHist = mergeHistory(localHist, serverUser.watchHistory);
                if (JSON.stringify(mergedHist) !== JSON.stringify(serverUser.watchHistory || [])) {
                    pushPayload.watchHistory = mergedHist;
                    needPush = true;
                }
                serverUser.watchHistory = mergedHist;

                // 7. Merged Favorites
                const localFavsStr = localStorage.getItem('cinestream_favorites');
                const localFavs = localFavsStr ? JSON.parse(localFavsStr) : [];
                const mergedFavs = mergeFavs(localFavs, serverUser.favorites);
                if (JSON.stringify(mergedFavs) !== JSON.stringify(serverUser.favorites || [])) {
                    pushPayload.favorites = mergedFavs;
                    needPush = true;
                }
                serverUser.favorites = mergedFavs;

                // 8. Merged Watch Progress
                const localProgStr = localStorage.getItem('cinestream_watch_progress');
                const localProg = localProgStr ? JSON.parse(localProgStr) : {};
                const mergedProg = mergeProgress(localProg, serverUser.watchProgress);
                if (JSON.stringify(mergedProg) !== JSON.stringify(serverUser.watchProgress || {})) {
                    pushPayload.watchProgress = mergedProg;
                    needPush = true;
                }
                serverUser.watchProgress = mergedProg;

                // 9. Merged Playlists
                const localPlaylistsStr = localStorage.getItem('cinestream_playlists');
                const localPlaylists = localPlaylistsStr ? JSON.parse(localPlaylistsStr) : [];
                if ((!serverUser.playlists || serverUser.playlists.length === 0) && localPlaylists.length > 0) {
                    pushPayload.playlists = localPlaylists;
                    needPush = true;
                }

                // 10. Merged Inventory & Owned Items
                const localItemsStr = localStorage.getItem('ap_user_items');
                const localItems = localItemsStr ? JSON.parse(localItemsStr) : [];
                const serverItems = serverUser.ownedItems || (serverUser.inventory ? [...(serverUser.inventory.frames || []), ...(serverUser.inventory.banners || [])] : []);
                const mergedItems = mergeArrays(localItems, serverItems);
                if (mergedItems.length !== (serverItems || []).length) {
                    pushPayload.ownedItems = mergedItems;
                    needPush = true;
                }
                serverUser.ownedItems = mergedItems;

                // 11. Daily Streak & Missions sync
                const localStreakStr = localStorage.getItem('ap_daily_streak');
                const localStreak = localStreakStr ? JSON.parse(localStreakStr) : null;
                if (localStreak && !serverUser.streakData) {
                    pushPayload.streakData = localStreak;
                    needPush = true;
                }

                // Luôn cập nhật localStorage với dữ liệu đã được hợp nhất
                this.saveUser(serverUser);

                if (needPush) {
                    console.log('📤 Pushing unified multi-device data to cloud database...', pushPayload);
                    this.updateProfile(pushPayload).catch(e => console.warn('[AuthService] Push error:', e));
                }

                if (serverUser.playlists && typeof playlistService !== 'undefined') {
                    playlistService.syncFromProfile(serverUser.playlists);
                }

                // Broadcast realtime sync to other open tabs / windows only when data updated
                if (needPush) {
                    try {
                        if (typeof BroadcastChannel !== 'undefined') {
                            const bc = new BroadcastChannel('aphim_cloud_sync_bus');
                            bc.postMessage({ type: 'cloud_data_synced', userId, timestamp: Date.now() });
                            bc.close();
                        }
                    } catch (e) { }
                }

                // Dispatch event and update UI across current page
                window.dispatchEvent(new CustomEvent('auth:profileSynced', { detail: serverUser }));
                window.dispatchEvent(new CustomEvent('ap:user-updated', { detail: serverUser }));
                if (typeof window.GamificationCore !== 'undefined' && typeof window.GamificationCore.updateHeaderChips === 'function') {
                    try { window.GamificationCore.updateHeaderChips(); } catch (e) { }
                }
                if (typeof window.updateUserUI === 'function') {
                    try { window.updateUserUI(); } catch (e) { }
                }
                if (typeof window.updateMobileMenuUser === 'function') {
                    try { window.updateMobileMenuUser(); } catch (e) { }
                }
                if (typeof window.updateJourneyUI === 'function') {
                    try { window.updateJourneyUI(); } catch (e) { }
                }
            }
        } catch (e) {
            console.warn('[AuthService] Auto-sync profile failed', e);
        }
    }

    // Save user to localStorage
    saveUser(user) {
        if (!user) return;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.currentUser = user;

        // Clean up legacy large cookie if still present
        this.eraseCookie(STORAGE_KEYS.USER);

        // Sync arrays back to local storage
        if (user.favorites && Array.isArray(user.favorites)) {
            localStorage.setItem('cinestream_favorites', JSON.stringify(user.favorites));
            try { window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: user.favorites })); } catch (e) { }
        }
        if ((user.watchHistory || user.watch_history) && Array.isArray(user.watchHistory || user.watch_history)) {
            const hist = user.watchHistory || user.watch_history;
            localStorage.setItem('cinestream_watch_history', JSON.stringify(hist));
            try { window.dispatchEvent(new CustomEvent('watchHistoryUpdated', { detail: hist })); } catch (e) { }
        }
        // Cập nhật: Đồng bộ TIẾN TRÌNH XEM PHIM (giây hiện tại, % hoàn thành) từ Server
        if (user.watchProgress || user.watch_progress) {
            const prog = user.watchProgress || user.watch_progress;
            localStorage.setItem('cinestream_watch_progress', JSON.stringify(prog));
            try { window.dispatchEvent(new CustomEvent('watchProgressUpdated', { detail: prog })); } catch (e) { }
        }
        // Đảm bảo đồng bộ Playlists nếu có trong dữ liệu server
        if (user.playlists && Array.isArray(user.playlists)) {
            localStorage.setItem('cinestream_playlists', JSON.stringify(user.playlists));
        }
        // Đồng bộ kho đồ đã sở hữu (Owned Items & Inventory)
        if (user.ownedItems || user.owned_items || user.inventory) {
            const items = user.ownedItems || user.owned_items || (user.inventory ? [...(user.inventory.frames || []), ...(user.inventory.banners || [])] : []);
            if (Array.isArray(items) && items.length > 0) {
                localStorage.setItem('ap_user_items', JSON.stringify(items));
            }
        }
        if (user.ownedFrames || user.owned_frames) {
            const f = user.ownedFrames || user.owned_frames;
            if (Array.isArray(f) && f.length > 0) localStorage.setItem('ap_owned_frames', JSON.stringify(f));
        }
        if (user.ownedBanners || user.owned_banners) {
            const b = user.ownedBanners || user.owned_banners;
            if (Array.isArray(b) && b.length > 0) localStorage.setItem('ap_owned_banners', JSON.stringify(b));
        }
        // Đồng bộ XP & Level & Streak vào localStorage
        if (user.xp != null) {
            localStorage.setItem('cinestream_xp', String(user.xp));
        }
        if (user.level != null) {
            localStorage.setItem('cinestream_level', String(user.level));
        }
        if (user.streak_current != null || user.streakData || user.streak_data) {
            const stCount = Number(user.streak_current ?? user.streakData?.streak ?? user.streakData?.current ?? 0);
            const stLast = user.streak_last_claimed || user.streakData?.lastDate || user.streakData?.lastClaimed || '';
            const streakObj = { streak: stCount, current: stCount, lastDate: stLast };
            localStorage.setItem('ap_daily_streak_v2', JSON.stringify(streakObj));
            localStorage.setItem('ap_daily_streak', JSON.stringify(streakObj));
        }
        if (user.missionsData || user.missions_data) {
            localStorage.setItem('ap_daily_missions', JSON.stringify(user.missionsData || user.missions_data));
        }

        // ĐỒNG BỘ TOÀN DIỆN AVATAR & TRANG TRÍ (Frames, Banners, Name Color, Profile Cover)
        const userId = user.id || user._id || user.email;
        const avatar = user.avatar || user.avatar_url;
        if (avatar) {
            if (userId) localStorage.setItem(`avatar_${userId}`, avatar);
            localStorage.setItem('user_avatar', avatar);
        }
        const frameClass = user.equippedFrameClass || user.equipped_frame_class;
        if (frameClass) localStorage.setItem('ap_frame_class', frameClass);

        const frameId = user.equippedFrame || user.equipped_frame;
        if (frameId) {
            localStorage.setItem('ap_frame_id', frameId);
            localStorage.setItem('ap_equipped_frame', frameId);
        }
        const frameUrl = user.equippedFrameUrl || user.equipped_frame_url;
        if (frameUrl) localStorage.setItem('ap_frame_url', frameUrl);

        const banner = user.equippedBanner || user.equipped_banner;
        if (banner) localStorage.setItem('ap_equipped_banner', banner);

        const color = user.equippedColor || user.equipped_color;
        if (color) {
            localStorage.setItem('ap_name_color', color);
            localStorage.setItem('ap_equipped_color', color);
        }

        const badge = user.equippedBadge || user.equipped_badge || user.badge;
        if (badge) {
            localStorage.setItem('ap_equipped_badge', badge);
            localStorage.setItem('ap_equipped_title', badge);
        }

        const cover = user.profileCover || user.profile_cover;
        if (cover) localStorage.setItem('ap_profile_cover', cover);

        // ĐỒNG BỘ SỐ DƯ XU VÀ TIỀN TỆ (20 Xu mặc định cho tài khoản mới)
        if (user.xu != null || user.coins != null) {
            const userXu = Number(user.xu != null ? user.xu : user.coins);
            localStorage.setItem('cinestream_xu', String(userXu));
        } else if (!localStorage.getItem('cinestream_xu')) {
            localStorage.setItem('cinestream_xu', '20');
        }
    }

    // Register new user
    async register(email, password, name, phone = '', rememberMe = false) {
        if (this.useBackend) {
            try {
                console.log('📝 Registering via backend:', email);
                const response = await fetch(`${this.backendURL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name, phone, rememberMe })
                });

                const data = await response.json();
                console.log('📊 Backend response:', data);

                if (data.success) {
                    this.saveUser(data.user);
                    this.saveToken(data.token, data.expiresIn);
                    this.saveRememberMe(rememberMe);
                    this.startTokenRefresh();
                    console.log('✅ Registration successful');
                    return { success: true, user: data.user };
                }
                console.log('❌ Registration failed:', data.message);
                return { success: false, message: data.message };
            } catch (error) {
                console.warn('⚠️ Backend not reachable, using local fallback mode for offline/demo register');
                const fallbackUser = {
                    id: 'user_' + Date.now(),
                    name: name || (email ? email.split('@')[0] : 'mayman1'),
                    email: email || 'demo@aphim.com',
                    role: 'user',
                    xu: 20,
                    coins: 20,
                    avatar: '',
                    equippedFrame: 'frame_none',
                    equippedColor: 'color_default',
                    equippedBanner: 'banner_default'
                };
                this.saveUser(fallbackUser);
                this.saveToken('demo_token_' + Date.now(), '30d');
                this.saveRememberMe(rememberMe);
                return { success: true, user: fallbackUser };
            }
        }

        const fallbackUser = {
            id: 'user_' + Date.now(),
            name: name || (email ? email.split('@')[0] : 'mayman1'),
            email: email || 'demo@aphim.com',
            role: 'user',
            xu: 20,
            coins: 20,
            avatar: '',
            equippedFrame: 'frame_none',
            equippedColor: 'color_default',
            equippedBanner: 'banner_default'
        };
        this.saveUser(fallbackUser);
        this.saveToken('demo_token_' + Date.now(), '30d');
        return { success: true, user: fallbackUser };
    }

    // Login user
    async login(email, password, rememberMe = false) {
        if (this.useBackend) {
            try {
                console.log('🔐 Logging in via backend:', email, 'Remember Me:', rememberMe);
                const response = await fetch(`${this.backendURL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, rememberMe })
                });

                const data = await response.json();
                console.log('📊 Backend response:', data);

                if (data.success) {
                    this.saveUser(data.user);
                    this.saveToken(data.token, data.expiresIn);
                    this.saveRememberMe(rememberMe);
                    this.startTokenRefresh();
                    console.log('✅ Login successful, token saved with expiry:', data.expiresIn);

                    // Force background sync profile from server to guarantee fresh cloud metadata (frames, banners, xu, xp)
                    this.syncProfile(true);
                    if (typeof window.updateUserUI === 'function') {
                        try { window.updateUserUI(); } catch (e) { }
                    }
                    if (typeof window.updateMobileMenuUser === 'function') {
                        try { window.updateMobileMenuUser(); } catch (e) { }
                    }
                    return { success: true, user: data.user };
                }
                console.log('❌ Login failed:', data.message);
                return { success: false, message: data.message };
            } catch (error) {
                console.warn('⚠️ Backend not reachable, using local fallback mode for offline/demo login');
                const fallbackUser = {
                    id: 'user_' + Date.now(),
                    name: (email ? email.split('@')[0] : 'mayman1'),
                    email: email || 'demo@aphim.com',
                    role: 'user',
                    avatar: '',
                    equippedFrame: 'frame_none',
                    equippedColor: 'color_default',
                    equippedBanner: 'banner_default'
                };
                this.saveUser(fallbackUser);
                this.saveToken('demo_token_' + Date.now(), '30d');
                this.saveRememberMe(rememberMe);
                return { success: true, user: fallbackUser };
            }
        }

        const fallbackUser = {
            id: 'user_' + Date.now(),
            name: (email ? email.split('@')[0] : 'mayman1'),
            email: email || 'demo@aphim.com',
            role: 'user',
            avatar: '',
            equippedFrame: 'frame_none',
            equippedColor: 'color_default',
            equippedBanner: 'banner_default'
        };
        this.saveUser(fallbackUser);
        this.saveToken('demo_token_' + Date.now(), '30d');
        return { success: true, user: fallbackUser };
    }

    // Logout
    logout() {
        this.stopTokenRefresh();

        // 1. Thoroughly wipe all authentication and user state from localStorage
        const keysToRemove = [
            STORAGE_KEYS.USER,
            STORAGE_KEYS.TOKEN,
            STORAGE_KEYS.TOKEN_EXPIRY,
            STORAGE_KEYS.REMEMBER_ME,
            STORAGE_KEYS.SUBSCRIPTION,
            STORAGE_KEYS.FAVORITES,
            STORAGE_KEYS.WATCH_HISTORY,
            STORAGE_KEYS.WATCH_PROGRESS,
            STORAGE_KEYS.PLAYLISTS,
            'cinestream_user',
            'cinestream_token',
            'cinestream_token_expiry',
            'cinestream_remember_me',
            'cinestream_subscription',
            'cinestream_payment_history',
            'cinestream_notifications',
            'A Phim_user',
            'user',
            'aphim_user_cache',
            'ap_last_user_sync',
            'ap_chosen_avatar',
            'ap_frame_id',
            'ap_frame_url',
            'ap_frame_class',
            'ap_profile_cover',
            'user_avatar',
            'ap_user_items',
            'cinestream_xu',
            'cinestream_watch_history',
            'cinestream_watch_progress',
            'cinestream_playlists',
            'ap_daily_streak'
        ];

        keysToRemove.forEach(k => {
            try { localStorage.removeItem(k); } catch (e) { }
        });

        // Clear dynamic keys with prefixes
        try {
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(k => {
                if (k.startsWith('ap_notifs_') || k.startsWith('avatar_') || k.startsWith('ep_') || k.startsWith('cinestream_last_tab_')) {
                    localStorage.removeItem(k);
                }
            });
        } catch (e) { }

        // 2. Wipe corresponding cookies
        this.eraseCookie(STORAGE_KEYS.TOKEN);
        this.eraseCookie(STORAGE_KEYS.USER);
        this.eraseCookie('cinestream_token');
        this.eraseCookie('cinestream_user');
        this.eraseCookie('token');
        this.eraseCookie('user');

        this.currentUser = null;

        // 3. Thông báo cho các module khác (premium-ad-blocker, mobile-menu, realtime-sync, etc.)
        try {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        } catch (e) { }

        // 4. Update UI to unauthenticated Guest mode immediately
        if (typeof window.updateUserUI === 'function') {
            try { window.updateUserUI(); } catch (e) { }
        }
        if (typeof window.updateMobileMenuUser === 'function') {
            try { window.updateMobileMenuUser(); } catch (e) { }
        }

        // 5. If on member-only pages (/profile, /tai-khoan, /admin), redirect to Home ('/')
        // Otherwise reload current page to reflect clean unauthenticated guest UI
        const currentPath = (window.location.pathname || '').toLowerCase();
        if (currentPath.startsWith('/profile') || currentPath.startsWith('/tai-khoan') || currentPath.startsWith('/admin')) {
            window.location.href = '/';
        } else {
            window.location.reload();
        }
    }

    // Silent logout when token is expired without page reload
    logoutSilently() {
        this.stopTokenRefresh();

        const keysToRemove = [
            STORAGE_KEYS.USER,
            STORAGE_KEYS.TOKEN,
            STORAGE_KEYS.TOKEN_EXPIRY,
            STORAGE_KEYS.REMEMBER_ME,
            STORAGE_KEYS.SUBSCRIPTION,
            STORAGE_KEYS.FAVORITES,
            STORAGE_KEYS.WATCH_HISTORY,
            STORAGE_KEYS.WATCH_PROGRESS,
            STORAGE_KEYS.PLAYLISTS,
            'cinestream_user',
            'cinestream_token',
            'cinestream_token_expiry',
            'cinestream_remember_me',
            'cinestream_subscription',
            'cinestream_payment_history',
            'cinestream_notifications',
            'A Phim_user',
            'user',
            'aphim_user_cache',
            'ap_last_user_sync',
            'ap_chosen_avatar',
            'ap_frame_id',
            'ap_frame_url',
            'ap_frame_class',
            'ap_profile_cover',
            'user_avatar',
            'ap_user_items',
            'cinestream_xu',
            'cinestream_watch_history',
            'cinestream_watch_progress',
            'cinestream_playlists',
            'ap_daily_streak'
        ];

        keysToRemove.forEach(k => {
            try { localStorage.removeItem(k); } catch (e) { }
        });

        try {
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(k => {
                if (k.startsWith('ap_notifs_') || k.startsWith('avatar_') || k.startsWith('ep_') || k.startsWith('cinestream_last_tab_')) {
                    localStorage.removeItem(k);
                }
            });
        } catch (e) { }

        this.eraseCookie(STORAGE_KEYS.TOKEN);
        this.eraseCookie(STORAGE_KEYS.USER);
        this.eraseCookie('cinestream_token');
        this.eraseCookie('cinestream_user');
        this.eraseCookie('token');
        this.eraseCookie('user');

        this.currentUser = null;

        try {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        } catch (e) { }

        if (typeof window.updateUserUI === 'function') {
            try { window.updateUserUI(); } catch (e) { }
        }
        if (typeof window.updateMobileMenuUser === 'function') {
            try { window.updateMobileMenuUser(); } catch (e) { }
        }
    }

    // Check if logged in
    isLoggedIn() {
        const u = this.getCurrentUser();
        const t = localStorage.getItem(STORAGE_KEYS.TOKEN);
        return !!(u && t);
    }

    // Get current user
    getCurrentUser() {
        this.currentUser = this.loadUser();
        return this.currentUser;
    }

    // Update profile
    async updateProfile(updates) {
        if (!this.currentUser) return { success: false, message: 'Chưa đăng nhập' };

        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token || token.startsWith('demo_token_') || (this.currentUser && this.currentUser.email === 'testuser@aphim.vn')) {
            const updated = { ...this.currentUser, ...updates };
            this.currentUser = updated;
            this.saveUser(updated);
            if (typeof window.updateUserUI === 'function') {
                try { window.updateUserUI(); } catch (e) { }
            }
            return { success: true, user: updated };
        }

        if (this.useBackend) {
            try {
                const response = await fetch(`${this.backendURL}/auth/updatedetails`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updates)
                });

                const data = await response.json();
                if (data.success) {
                    const updatedUser = data.data || data.user;
                    this.saveUser(updatedUser);
                    if (typeof window.updateUserUI === 'function') {
                        try { window.updateUserUI(); } catch (e) { }
                    }
                    try {
                        if (typeof BroadcastChannel !== 'undefined') {
                            const bc = new BroadcastChannel('aphim_cloud_sync_bus');
                            bc.postMessage({ type: 'cloud_data_synced', userId: updatedUser.id, timestamp: Date.now() });
                            bc.close();
                        }
                    } catch (e) { }
                    try {
                        window.dispatchEvent(new CustomEvent('auth:profileUpdated', { detail: updatedUser }));
                    } catch (e) { }
                    return { success: true, user: updatedUser };
                }
                return { success: false, message: data.message };
            } catch (error) {
                return { success: false, message: 'Lỗi kết nối server' };
            }
        }

        // Fallback
        const users = this.getAllUsers();
        const index = users.findIndex(u => u.id === this.currentUser.id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            localStorage.setItem('cinestream_all_users', JSON.stringify(users));
            this.saveUser(users[index]);
            if (typeof window.updateUserUI === 'function') {
                try { window.updateUserUI(); } catch (e) { }
            }
            return { success: true, user: users[index] };
        }
        return { success: false, message: 'Không tìm thấy người dùng' };
    }

    // Change password
    async changePassword(oldPassword, newPassword) {
        if (!this.currentUser) return { success: false, message: 'Chưa đăng nhập' };

        if (this.useBackend) {
            try {
                const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
                const response = await fetch(`${this.backendURL}/auth/updatepassword`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentPassword: oldPassword, newPassword })
                });

                const data = await response.json();
                if (data.success) {
                    this.saveToken(data.token);
                    return { success: true };
                }
                return { success: false, message: data.message };
            } catch (error) {
                return { success: false, message: 'Lỗi kết nối server' };
            }
        }

        // Fallback
        if (this.currentUser.password !== btoa(oldPassword)) {
            return { success: false, message: 'Mật khẩu cũ không đúng' };
        }
        return this.updateProfile({ password: btoa(newPassword) });
    }

    // Helper methods
    getAllUsers() {
        const usersStr = localStorage.getItem('cinestream_all_users');
        return usersStr ? JSON.parse(usersStr) : [];
    }

    generateToken(user) {
        return btoa(JSON.stringify({ id: user.id, email: user.email, timestamp: Date.now() }));
    }

    saveToken(token, expiresIn = '30d') {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);

        // Calculate expiry timestamp
        const expiryMs = this.parseExpiry(expiresIn);
        const expiryTimestamp = Date.now() + expiryMs;
        localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTimestamp.toString());

        // Save backup token to persistent cookie
        const days = Math.ceil(expiryMs / (24 * 60 * 60 * 1000));
        this.setCookie(STORAGE_KEYS.TOKEN, token, days);
    }

    saveRememberMe(rememberMe) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe ? 'true' : 'false');
    }

    getRememberMe() {
        return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
    }

    parseExpiry(expiresIn) {
        // Parse expiry string like "30d", "90d", "7d" to milliseconds
        const match = expiresIn.match(/^(\d+)([dhms])$/);
        if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            case 's': return value * 1000;
            default: return 30 * 24 * 60 * 60 * 1000;
        }
    }

    getTokenExpiry() {
        const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
        return expiry ? parseInt(expiry) : null;
    }

    isTokenExpiringSoon() {
        const expiry = this.getTokenExpiry();
        if (!expiry) return true;

        // Refresh if token expires in less than 7 days
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        return (expiry - Date.now()) < sevenDays;
    }

    async refreshToken() {
        // Don't refresh if not logged in or no token
        if (!this.isLoggedIn()) {
            console.log('⏭️ Skip token refresh - not logged in');
            return false;
        }

        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token || token.startsWith('demo_token_') || (this.currentUser && this.currentUser.email === 'testuser@aphim.vn')) {
            console.log('⏭️ Skip token refresh - demo token or test account');
            return true;
        }

        try {
            const rememberMe = this.getRememberMe();

            console.log('🔄 Refreshing token... Remember Me:', rememberMe);

            const response = await fetch(`${this.backendURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rememberMe })
            });

            // Handle 401 - token expired, logout user
            if (response.status === 401) {
                console.warn('⚠️ Token expired, logging out...');
                this.stopTokenRefresh();
                localStorage.removeItem(STORAGE_KEYS.USER);
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
                localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
                localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

                // Erase Cookies on force expired 401
                this.eraseCookie(STORAGE_KEYS.TOKEN);
                this.eraseCookie(STORAGE_KEYS.USER);

                this.currentUser = null;
                return false;
            }

            const data = await response.json();

            if (data.success) {
                this.saveToken(data.token, data.expiresIn);
                console.log('✅ Token refreshed successfully, new expiry:', data.expiresIn);
                return true;
            } else {
                console.warn('⚠️ Token refresh failed:', data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            return false;
        }
    }

    startTokenRefresh() {
        // Clear any existing interval
        this.stopTokenRefresh();

        // Don't start refresh if not logged in
        if (!this.isLoggedIn()) {
            console.log('⏭️ Skip token refresh setup - not logged in');
            return;
        }

        // Check token expiry every 6 hours
        this.refreshInterval = setInterval(async () => {
            if (this.isLoggedIn() && this.isTokenExpiringSoon()) {
                console.log('⏰ Token expiring soon, refreshing...');
                await this.refreshToken();
            }
        }, 6 * 60 * 60 * 1000); // 6 hours

        // Also check immediately on startup (after 5 seconds)
        setTimeout(async () => {
            if (this.isLoggedIn() && this.isTokenExpiringSoon()) {
                console.log('⏰ Token expiring soon on startup, refreshing...');
                await this.refreshToken();
            }
        }, 5000); // 5 seconds after startup
    }

    stopTokenRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Social login
    socialLogin(provider, profile) {
        if (!profile || !profile.email) {
            return { success: false, message: 'Thông tin không hợp lệ' };
        }

        // Check if user exists
        const users = this.getAllUsers();
        let user = users.find(u => u.email === profile.email);

        if (!user) {
            // Create new user from social profile
            user = {
                id: Date.now().toString(),
                email: profile.email,
                name: profile.name || profile.email.split('@')[0],
                phone: '',
                password: '', // No password for social login
                avatar: profile.picture || '',
                subscription: { plan: 'FREE' },
                socialProvider: provider,
                createdAt: new Date().toISOString()
            };

            users.push(user);
            localStorage.setItem('cinestream_all_users', JSON.stringify(users));
        }

        this.saveUser(user);
        this.saveToken(this.generateToken(user));

        return { success: true, user };
    }

    // Password reset & recovery methods
    async requestPasswordReset(email) {
        return this.sendPasswordResetEmail(email);
    }

    async forgotPassword(email) {
        return this.sendPasswordResetEmail(email);
    }

    async sendPasswordResetEmail(email) {
        try {
            const endpoint = `${this.backendURL}/auth/forgot-password`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: (email || '').trim().toLowerCase() })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[Auth] Send reset email error:', error);
            return { success: false, message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.' };
        }
    }

    async resetPasswordWithToken(accessToken, newPassword) {
        try {
            const endpoint = `${this.backendURL}/auth/reset-password`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessToken: accessToken,
                    newPassword: newPassword
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[Auth] Reset password with token error:', error);
            return { success: false, message: 'Lỗi kết nối máy chủ khi đặt lại mật khẩu.' };
        }
    }
}

// Initialize Auth Service
const authService = new AuthService();
window.authService = authService;
window.doLogout = function () {
    if (window.authService) {
        window.authService.logout();
    } else {
        localStorage.clear();
        window.location.href = '/';
    }
};
