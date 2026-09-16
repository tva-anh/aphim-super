/**
 * REAL-TIME USER DATA SYNC MODULE
 * Automatically listens to backend updates via Socket.IO and instantly refreshes UI
 */

class RealtimeSync {
    constructor() {
        this.socket = null;
        this.backendUrl = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL)
            ? API_CONFIG.BACKEND_URL.replace(/\/api$/, '')
            : (typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:3005');

        console.log('🚀 [Realtime] Module starting...');

        // Robust Event Driven Initialization + Fallback Polling
        this._setupListeners();

        if (document.readyState === 'complete') {
            this.delayedInit();
        } else {
            window.addEventListener('load', () => this.delayedInit());
        }
    }

    _setupListeners() {
        // Listen for standard login / data ready events to spark instant connection
        window.addEventListener('userLogin', () => {
            console.log('🔑 [Realtime] Login detected via event, initializing...');
            this.init();
        });

        // Periodic sanity check (every 8 seconds) to catch deferred initialization states
        setInterval(() => {
            if (!this.socket && typeof authService !== 'undefined' && authService.isLoggedIn()) {
                console.log('🔄 [Realtime] Self-healing poll detected logged-in state, activating connection...');
                this.init();
            }
        }, 8000);
    }

    async delayedInit() {
        // Increased patience for auth service loading
        let attempts = 0;
        while (typeof authService === 'undefined' && attempts < 30) {
            await new Promise(r => setTimeout(r, 150));
            attempts++;
        }

        if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
            this.init();
        } else {
            console.log('ℹ️ [Realtime] User not logged in yet, awaiting login hook or self-healing cycle.');
        }
    }

    async init() {
        if (this.socket && this.socket.connected) return; // Prevent duplicate concurrent tunnels

        // 1. Dynamically load Socket.io Client if not present
        if (typeof io === 'undefined') {
            try {
                await this.loadScript('https://cdn.socket.io/4.7.2/socket.io.min.js');
            } catch (e) {
                console.error('❌ [Realtime] Socket.io script load failed:', e);
                return;
            }
        }

        const user = authService.getCurrentUser();
        // Robust ID check - MongoDB uses _id, some legacy code might use id
        const userId = user._id || user.id;

        if (!userId) {
            console.warn('⚠️ [Realtime] userId missing from auth record. Cannot listen for updates.');
            return;
        }

        console.log(`📡 [Realtime] Connecting to ${this.backendUrl} (User: ${userId})...`);

        // 2. Connect Socket
        this.socket = io(this.backendUrl, {
            path: '/socket.io/',
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            timeout: 10000
        });

        this.socket.on('connect', () => {
            console.log('✅ [Realtime] Connection established! ID:', this.socket.id);
        });

        this.socket.on('connect_error', (err) => {
            console.error('❌ [Realtime] Connection error:', err.message);
        });

        // 3. LISTEN FOR ACCOUNT UPDATES (Xu, XP, Inventory, Chat Role, Chat Ban)
        this.socket.on(`USER_UPDATE_${userId}`, async (data) => {
            console.warn('⚡ [Realtime] ACCOUNT UPDATE RECEIVED:', data);

            const oldUser = authService.getCurrentUser();
            const oldCoins = oldUser ? (oldUser.coins || oldUser.xu || 0) : 0;

            // Trigger data re-fetch from /api/auth/me to sync localStorage
            await authService.syncProfile();

            const newUser = authService.getCurrentUser();
            const newCoins = newUser ? (newUser.coins || newUser.xu || 0) : (data.coins !== undefined ? data.coins : oldCoins);

            // Handle Chat Role Update
            if (data.chatRole !== undefined) {
                console.log(`🔐 [Realtime] Chat role updated to: ${data.chatRole}`);
                if (newUser) {
                    newUser.chatRole = data.chatRole;
                    localStorage.setItem('cinestream_user', JSON.stringify(newUser));
                }
                // Refresh chat UI if chat widget exists
                if (window.apChat && typeof window.apChat._restoreUser === 'function') {
                    window.apChat._restoreUser();
                    window.apChat._syncUserUI();
                }
            }

            // Handle Chat Ban Update
            if (data.isChatBanned !== undefined) {
                console.log(`🚫 [Realtime] Chat ban status updated: ${data.isChatBanned}`);
                if (newUser) {
                    newUser.isChatBanned = data.isChatBanned;
                    localStorage.setItem('cinestream_user', JSON.stringify(newUser));
                }
                // Update chat input state
                if (window.apChat) {
                    window.apChat.isBanned = data.isChatBanned;
                    const input = document.getElementById('chatMessageInput');
                    const sendBtn = document.getElementById('chatSendBtn');
                    if (input) {
                        input.placeholder = data.isChatBanned ? 'Tài khoản đã bị cấm chat.' : 'Viết tin nhắn...';
                        input.disabled = data.isChatBanned;
                    }
                    if (sendBtn) sendBtn.disabled = data.isChatBanned;
                }
            }

            // Trigger global UI updates (Selectors like navbar, sidebar, etc.)
            this.updateGlobalSelectors(data);

            // Trigger specific page functions if they exist (AFTER sync is done)
            if (typeof updateJourneyUI === 'function') {
                console.log('[Realtime] Refreshing Journey UI...');
                updateJourneyUI();
            }
            if (typeof refreshAllUI === 'function') {
                console.log('[Realtime] Refreshing Profile UI...');
                refreshAllUI();
            }
            if (typeof updateBalanceDisplay === 'function') {
                console.log('[Realtime] Refreshing Balance Displays...');
                updateBalanceDisplay();
            }

            // Show notifications
            const displayMsg = data.message || 'Hệ thống đã cập nhật tài khoản của bạn';

            // Sync persistent notifications from backend
            if (typeof window.syncNotifications === 'function') {
                window.syncNotifications();
            }

            // Show popup toast WITH EXPLICIT BACKEND DIFF FOR TOTAL RELIABILITY
            if (data.coinDiff !== undefined && data.coinDiff !== 0 && typeof showCoinChange === 'function') {
                showCoinChange(data.coinDiff, displayMsg);
            } else if (typeof showMessage === 'function') {
                showMessage(displayMsg, 'success');
            }

            // Prevent this incoming realtime socket notification from firing AGAIN as persistent on next reload
            // (Backend Notification will match by ID shortly, we save local keys to suppress redundant deliveries)
            // We dynamically derive IDs after sync completes
        });

        // 4. LISTEN FOR SYSTEM BROADCASTS
        this.socket.on('SYSTEM_NOTIFICATION', (data) => {
            console.log('📢 [Realtime] System broadcast:', data);
            if (typeof window.syncNotifications === 'function') {
                window.syncNotifications();
            }
            if (typeof showMessage === 'function') {
                showMessage(data.message, 'info', 6000);
            }
        });
    }

    updateGlobalSelectors(data) {
        // --- 1. COINS (Xu) ---
        if (data.coins !== undefined) {
            const coinValue = Number(data.coins);
            const coinIds = [
                'sidebarXuBalance',
                'shopBalance',
                'xuModalBalance',
                'userCoinsText',
                'heroXuBalance',
                'navXuText',
                'heroCoinPill'
            ];

            coinIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    el.style.transform = 'scale(1.4)';
                    el.style.color = '#4ade80';

                    // Simple text update
                    el.textContent = coinValue.toLocaleString('vi-VN');

                    setTimeout(() => {
                        el.style.transform = 'scale(1)';
                        el.style.color = '';
                    }, 1500);
                }
            });

            if (typeof window.GamificationCore !== 'undefined' && typeof window.GamificationCore.updateHeaderChips === 'function') {
                try { window.GamificationCore.updateHeaderChips(); } catch (e) { }
            }
        }

        // --- 2. XP & LEVEL ---
        if (data.xp !== undefined || data.level !== undefined) {
            const currentXP = data.xp !== undefined ? Number(data.xp) : (typeof authService !== 'undefined' && authService.getCurrentUser()?.xp || 0);
            const level = data.level !== undefined ? Number(data.level) : (Math.floor(currentXP / 150) + 1);
            const currentXPInLevel = currentXP % 150;
            const nextLevel = level + 1;

            const xpIds = ['currentXP', 'statXP', 'heroXPText'];
            const lvlIds = ['statLevel', 'currentLevelLabel', 'heroLevelPill', 'epLevelPill', 'navLevelText', 'nextLevel', 'sidebarLevelTxt'];
            const neededXPIds = ['neededXP', 'xpToNextLv'];

            xpIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = currentXP;
                    el.style.transform = 'scale(1.2)';
                    setTimeout(() => { el.style.transform = 'scale(1)'; }, 500);
                }
            });

            lvlIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id === 'heroLevelPill' || id === 'epLevelPill') el.textContent = `Cấp ${level}`;
                    else if (id === 'nextLevel') el.textContent = nextLevel;
                    else if (id === 'sidebarLevelTxt') el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9v3a6 6 0 0012 0V9M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2m12 6h2a2 2 0 002-2V5a2 2 0 00-2-2h-2M12 18v3m-4 0h8"/></svg> VIP Level ${level}`;
                    else el.textContent = level;
                }
            });

            neededXPIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id === 'neededXP') el.textContent = `${currentXPInLevel}/150`;
                    else el.textContent = 150 - currentXPInLevel;
                }
            });

            // Update Progress Bar
            const xpBar = document.getElementById('xpProgressBar');
            if (xpBar) {
                const pct = (currentXPInLevel / 150) * 100;
                xpBar.style.width = `${pct}%`;
            }
        }

        // --- 2.5 STREAK ---
        if (data.streak_current !== undefined) {
            const streakVal = Number(data.streak_current);
            const streakEls = document.querySelectorAll('#sidebarStreakTxt, .streak-badge-val, .user-streak-val');
            streakEls.forEach(el => {
                if (el.id === 'sidebarStreakTxt') el.textContent = `${streakVal}/7 Ngày`;
                else el.textContent = `${streakVal} Ngày`;
            });
        }

        // --- 3. SUBSCRIPTION (New) ---
        if (data.subscription) {
            const sub = data.subscription;
            let plan = 'FREE';
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
            const subIds = ['heroPlanBadge', 'sidebarPlanLabel', 'epPlanBadge'];

            subIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = plan === 'FREE' ? 'Khán Giả' : plan;
                    el.style.animation = 'pulse-gold 1.5s infinite';
                }
            });

            // Auto-refresh subscription tab if visible
            if (typeof loadSubscriptionInfo === 'function') {
                loadSubscriptionInfo();
            }
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    window.rtSync = new RealtimeSync();
});
