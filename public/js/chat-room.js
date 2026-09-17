/**
 * A PHIM - Chat Widget Controller  v3.5  (Firebase Realtime + MongoDB Sync)
 * Flow: Welcome → Chat Room (Firestore realtime)
 */

class APFilmChat {
    constructor() {
        this.currentScreen = 'welcome'; // welcome | room | support
        this.currentTab = 'general';
        this.user = null;
        this.isMinimized = false;
        this.isOpen = false;
        this.unreadCount = 0;
        this._stopPresence = null;
        this._stopPinned = null;
        this._isMaximized = false;
        this.replyingTo = null;
        this._defaultW = 390;
        this._defaultH = 600;

        this.emojis = [
            '😀', '😄', '😆', '😅', '😂', '🤣', '😊', '😇',
            '🥰', '😍', '🤩', '😘', '😋', '😎', '🤓', '🥳',
            '😏', '😒', '😞', '😔', '😢', '😭', '😤', '😡',
            '👍', '👎', '👏', '🙌', '🤝', '💪', '❤️', '🔥',
            '⭐', '🎬', '🍿', '🎭', '🎥', '📽️', '🎞️', '🎉',
            '🤔', '💯', '✅', '❌', '🔴', '🟡', '🟢', '✨',
        ];

        this.reactionsCache = {}; // Local cache for MongoDB reactions (Persistence Fallback)
        this.lastMessages = [];

        this._init();
        this._setupExternalListeners();
    }

    _setupExternalListeners() {
        // Listen for realtime reaction updates from Socket.io (via RealtimeSync)
        window.addEventListener('chat:reaction', (e) => {
            const { firebaseId, reactions } = e.detail;
            if (firebaseId && reactions) {
                this.reactionsCache[firebaseId] = reactions;
                // If we have messages, re-render to show new reaction
                if (this.lastMessages) this._renderAllMessages(this.lastMessages);
            }
        });
    }

    _init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setup());
        } else {
            this._setup();
        }
    }

    _setup() {
        try {
            console.log('[APFilmChat] Starting initialization...');

            this._injectHtmlIfNeeded();
            this._cacheDOM();

            if (!this.el.fab) {
                console.error('[APFilmChat] Critical elements missing.');
                return;
            }

            // 5. Build UI & Restore User
            this._buildEmojiGrid();
            this._restoreUser();
            this._attachEvents();
            this._initDragResize();

            // Ensure resize handles exist (desktop only)
            if (window.innerWidth > 768) {
                this._ensureResizeHandles();
            }

            this._initMobileKeyboardFix();
            this._initMobileResize();

            // 6. Screen management
            const checkUserAndShow = () => {
                if (this.user) {
                    console.log('[APFilmChat] User identified:', this.user.name);
                    this._showScreen('room');
                    this._enterRoomFirebase();
                } else {
                    console.log('[APFilmChat] No user identified yet, showing welcome screen.');
                    this._showScreen('welcome');
                    this._updateWelcomeStats();
                }
            };

            checkUserAndShow();

            // 7. Check if user is banned
            if (this.user && window.firebaseChat) {
                window.firebaseChat.onReady(async () => {
                    this.isBanned = await window.firebaseChat.isBanned(this.user.id);
                    if (this.isBanned) {
                        if (this.el.messageInput) {
                            this.el.messageInput.placeholder = 'Tài khoản đã bị cấm chat.';
                            this.el.messageInput.disabled = true;
                        }
                        if (this.el.sendBtn) this.el.sendBtn.disabled = true;
                    }
                });
            }

            // Listen for login success event
            this._setupLoginListener();

            console.log('[APFilmChat] Community Chat initialized successfully ✓');
        } catch (err) {
            console.error('[APFilmChat] Initialization failed:', err);
        }
    }

    _injectHtmlIfNeeded() {
        // 1. Auto-inject Base Core Styles (chat-room.css) if missing
        const hasBaseCss = Array.from(document.querySelectorAll('link')).some(l => l.href && l.href.includes('chat-room.css'));
        if (!hasBaseCss) {
            const link = document.createElement('link');
            link.id = 'aphim-chat-css';
            link.rel = 'stylesheet';
            link.href = 'css/chat-room.css?v=45';
            document.head.appendChild(link);
        }

        // 2. Auto-inject Mobile Specific Overrides (chat-mobile-fixed.css) if missing
        const hasMobileCss = Array.from(document.querySelectorAll('link')).some(l => l.href && l.href.includes('chat-mobile-fixed.css'));
        if (!hasMobileCss) {
            const linkMobile = document.createElement('link');
            linkMobile.id = 'aphim-chat-mobile-css';
            linkMobile.rel = 'stylesheet';
            linkMobile.href = 'css/chat-mobile-fixed.css?v=45';
            document.head.appendChild(linkMobile);
        }

        // 3. Inject Context Menu if not already present in the DOM
        if (!document.getElementById('chatContextMenu')) {

            // Inject Context Menu to BODY to avoid any container overflow/z-index issues
            const menu = document.createElement('div');
            menu.id = 'chatContextMenu';
            menu.className = 'tg-context-menu';
            menu.style.display = 'none';
            menu.style.position = 'fixed';
            menu.style.zIndex = '999999';
            menu.innerHTML = `
                <div class="reaction-bubble">
                    <span class="react-emoji" data-emoji="❤️">❤️</span>
                    <span class="react-emoji" data-emoji="😍">😍</span>
                    <span class="react-emoji" data-emoji="👍">👍</span>
                    <span class="react-emoji" data-emoji="🔥">🔥</span>
                    <span class="react-emoji" data-emoji="👏">👏</span>
                    <span class="react-emoji" data-emoji="😂">😂</span>
                    <span class="react-emoji" data-emoji="😮">😮</span>
                    <span class="react-emoji" data-emoji="😢">😢</span>
                    <span class="react-emoji" data-emoji="💯">💯</span>
                    <span class="react-emoji" data-emoji="🎉">🎉</span>
                </div>
                <div class="menu-items-container">
                    <div class="menu-item" id="ctxReply"><span class="material-icons">reply</span> <span>Trả lời</span></div>
                    <div class="menu-item" id="ctxForward"><span class="material-icons">forward</span> <span>Chuyển tiếp</span></div>
                    <div class="menu-item" id="ctxCopy"><span class="material-icons">content_copy</span> <span>Sao chép</span></div>
                    <div class="menu-item" id="ctxSelect"><span class="material-icons">check_circle</span> <span>Chọn nhiều</span></div>
                    <div class="menu-item" id="ctxPin" style="display: none;"><span class="material-icons">push_pin</span> <span>Ghim tin nhắn</span></div>
                    <div class="menu-separator" id="ctxDangerSep" style="display: none;"></div>
                    <div class="menu-item danger" id="ctxBan" style="display: none;"><span class="material-icons">block</span> <span>Chặn người dùng</span></div>
                    <div class="menu-item danger" id="ctxDelete" style="display: none;"><span class="material-icons">delete</span> <span>Xóa tin nhắn</span></div>
                </div>
            `;
            document.body.appendChild(menu);
        }

        // Check if prefix is missing even if FAB exists (for upgrades)
        if (document.getElementById('chatWindow') && !document.getElementById('inputPrefix')) {
            const inputArea = document.getElementById('chatInputArea');
            if (inputArea) {
                const prefixHtml = `
                    <div class="chat-input-prefix" id="inputPrefix" style="display: none;">
                        <div class="prefix-icon"><span class="material-icons" id="prefixIcon">reply</span></div>
                        <div class="prefix-line"></div>
                        <div class="prefix-content">
                            <div class="prefix-title" id="prefixTitle">Reply to Name</div>
                            <div class="prefix-text" id="prefixText">Message content...</div>
                        </div>
                        <button class="prefix-close" id="prefixClose"><span class="material-icons">close</span></button>
                    </div>`;
                inputArea.insertAdjacentHTML('afterbegin', prefixHtml);
                // Re-cache DOM to find new element
                this._cacheDOM();
            }
        }

        // 🔄 AUTOMATIC MODERNIZATION UPGRADE CHECK:
        // If we detect a legacy hardcoded chat UI implementation (which lacks critical modern features like the
        // Avatar Main component or Pinned Message slots), we programmatically purge the obsolete nodes
        // so the script can dynamically inject the 100% correct master Telegram widget instead.
        const needsUpgrade = document.getElementById('chatFab') && !document.querySelector('.chat-header-avatar-main');
        
        if (needsUpgrade) {
            console.log('[APFilmChat] Legacy static chat detected on this page. Upgrading to modern dynamic engine...');
            const legacyFab = document.getElementById('chatFab');
            const legacyWin = document.getElementById('chatWindow');
            const legacyContainer = document.getElementById('aphimChatInjectedContainer');
            
            if (legacyFab) legacyFab.remove();
            if (legacyWin) legacyWin.remove();
            if (legacyContainer) legacyContainer.remove();
        }

        // Only skip injection if the fully-featured modern chat widget is already present.
        if (document.getElementById('chatFab') && document.querySelector('.chat-header-avatar-main')) {
            return;
        }

        const html = `
            <button id="chatFab" class="chat-fab" aria-label="Mở chat cộng đồng" title="Chat Cộng Đồng">
                <span class="fab-icon material-icons">forum</span>
                <span class="chat-fab-badge" id="chatFabBadge">0</span>
            </button>
            
            <div id="chatWindow" class="chat-window tg-theme" role="dialog">
                <div class="chat-header" id="chatHeader">
                    <div class="chat-header-info">
                        <div class="chat-header-avatar chat-header-avatar-main">
                            <img src="/apple-touch-icon.png" alt="A" id="headerGroupAvatar">
                        </div>
                        <div class="chat-header-text">
                            <div class="chat-header-title">Cộng Đồng A Phim</div>
                            <div class="chat-header-status">
                                <span class="online-dot"></span>
                                <span class="chat-header-online-text" id="headerOnlineCount">... người trực tuyến</span>
                            </div>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        <div class="pinned-header-wrapper" id="pinnedBanner" style="display: none;">
                            <div class="pinned-line-accent"></div>
                            <div class="pinned-content" id="pinnedBannerContent">
                                <div class="pinned-user" id="pinnedBannerUser">Pinned Message</div>
                                <div class="pinned-text" id="pinnedBannerText">...</div>
                            </div>
                            <button class="pinned-close-btn" id="unpinBtn" title="Bỏ ghim"><span class="material-icons">close</span></button>
                        </div>
                        <button class="chat-header-btn" id="chatSearchBtn" title="Tìm kiếm"><span class="material-icons">search</span></button>
                        <button class="chat-header-btn" id="chatMinimizeBtn" title="Thu nhỏ"><span class="material-icons">remove</span></button>
                        <button class="chat-header-btn" id="chatCloseBtn" title="Đóng"><span class="material-icons">close</span></button>
                    </div>
                </div>

                <!-- 8-way Resize Handles -->
                <div class="cr-resize-handle cr-resize-n"></div>
                <div class="cr-resize-handle cr-resize-s"></div>
                <div class="cr-resize-handle cr-resize-e"></div>
                <div class="cr-resize-handle cr-resize-w"></div>
                <div class="cr-resize-handle cr-resize-nw"></div>
                <div class="cr-resize-handle cr-resize-ne"></div>
                <div class="cr-resize-handle cr-resize-se"></div>
                <div class="cr-resize-handle cr-resize-sw"></div>
                <div class="pinned-banner-area" id="pinnedBannerArea"></div>

                <div class="chat-body" id="chatBody">
                    <!-- SCREEN: WELCOME -->
                    <div class="chat-screen chat-screen-welcome" id="screenWelcome">
                        <div class="welcome-glow">
                            <img src="/apple-touch-icon.png" alt="A Phim" style="width:42px;height:42px;object-fit:contain;">
                        </div>
                        <div>
                            <h2 class="welcome-title">Chào mừng đến <span>Kênh A Phim</span></h2>
                            <p class="welcome-desc" style="margin-top:8px;">Kết nối, thảo luận và tận hưởng điện ảnh cùng hàng ngàn tín đồ phim ảnh.</p>
                        </div>
                        <div class="welcome-stats">
                            <div class="welcome-stat"><div class="welcome-stat-num" id="welcomeOnline">1,284</div><div class="welcome-stat-label">Trực tuyến</div></div>
                            <div class="welcome-stat"><div class="welcome-stat-num">50K+</div><div class="welcome-stat-label">Thành viên</div></div>
                            <div class="welcome-stat"><div class="welcome-stat-num">24/7</div><div class="welcome-stat-label">Hoạt động</div></div>
                        </div>
                        <div class="welcome-features">
                            <div class="welcome-feature"><span class="material-icons">movie</span><div class="welcome-feature-text"><strong>Thảo luận phim</strong><span>Review, rating và khám phá phim mới</span></div></div>
                            <div class="welcome-feature"><span class="material-icons">groups</span><div class="welcome-feature-text"><strong>Cộng đồng sôi nổi</strong><span>Kết nối với người xem cùng sở thích</span></div></div>
                            <div class="welcome-feature"><span class="material-icons">bolt</span><div class="welcome-feature-text"><strong>Chat thời gian thực</strong><span>Nhắn tin ngay lập tức, không độ trễ</span></div></div>
                        </div>
                        <button class="welcome-start-btn" id="welcomeStartBtn">Bắt đầu chat ngay <span class="material-icons">arrow_forward</span></button>
                    </div>

                    <!-- SCREEN: CHAT ROOM -->
                    <div class="chat-screen chat-screen-room" id="screenRoom">
                        <div class="messages-area tg-scroll" id="messagesArea"></div>
                    </div>

                    <!-- SCREEN: SUPPORT -->
                    <div class="chat-screen chat-screen-support" id="screenSupport">
                        <div class="support-inner">
                            <div class="support-icon-wrap"><span class="material-icons">support_agent</span></div>
                            <h3 class="support-title">Hỗ trợ trực tuyến</h3>
                            <p class="support-desc">Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.</p>
                            <button class="support-start-btn" id="supportStartTawk">Bắt đầu chat hỗ trợ</button>
                        </div>
                    </div>
                </div>

                <div class="chat-input-area" id="chatInputArea" style="display: none;">
                    <div class="chat-tabs-bar">
                        <button class="chat-tab active" data-tab="general">Chung</button>
                        <button class="chat-tab tab-disabled" data-tab="movies" disabled title="Tính năng đang được nâng cấp">
                            <span class="material-icons" style="font-size: 14px;">construction</span>
                            Phim
                        </button>
                        <button class="chat-tab" data-tab="support">Hỗ trợ</button>
                    </div>
                    <div class="chat-input-prefix" id="inputPrefix" style="display: none;">
                        <div class="prefix-icon"><span class="material-icons" id="prefixIcon">reply</span></div>
                        <div class="prefix-line"></div>
                        <div class="prefix-content">
                            <div class="prefix-title" id="prefixTitle">Reply to Name</div>
                            <div class="prefix-text" id="prefixText">Message content...</div>
                        </div>
                        <button class="prefix-close" id="prefixClose"><span class="material-icons">close</span></button>
                    </div>
                    <div class="bulk-action-bar" id="bulkActionBar">
                        <div class="bulk-info">
                            <button class="bulk-cancel" id="bulkCancelBtn"><span class="material-icons">close</span></button>
                            <span class="selected-count" id="selectedCount">1 message</span>
                        </div>
                        <div class="bulk-actions">
                            <button class="bulk-btn forward" id="bulkForwardBtn"><span class="material-icons">shortcut</span> Forward</button>
                            <button class="bulk-btn delete" id="bulkDeleteBtn" style="display: none;"><span class="material-icons">delete</span> Delete</button>
                        </div>
                    </div>
                    <div class="input-row">
                        <button class="input-icon-btn" id="emojiToggleBtn"><span class="material-icons">mood</span></button>
                        <div class="message-input-wrapper">
                            <textarea id="chatMessageInput" placeholder="Viết tin nhắn..." rows="1" maxlength="1000"></textarea>
                        </div>
                        <button class="send-btn" id="chatSendBtn" disabled><span class="material-icons">send</span></button>
                    </div>
                    <div class="input-footer" id="inputFooter" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 2px 0;">
                        <div class="current-user-tag" id="currentUserTag" style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--c-text-dim);">
                            <div class="current-user-avatar" id="currentUserAvatar" style="width: 24px; height: 24px; flex-shrink: 0;"></div>
                            <span class="current-user-name" id="currentUserName">Khách</span>
                        </div>
                        <a class="change-name-link" id="changeNameLink" style="font-size: 11px; color: var(--c-text-faint); cursor: pointer; text-decoration: underline;">Đổi tên</a>
                    </div>
                </div>

                <div class="emoji-picker-panel" id="emojiPickerPanel">
                    <div class="emoji-grid" id="emojiGrid"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    _cacheDOM() {
        const $ = id => document.getElementById(id);
        this.el = {
            fab: $('chatFab'),
            fabBadge: $('chatFabBadge'),
            window: $('chatWindow'),
            body: $('chatBody'),
            inputArea: $('chatInputArea'),
            header: $('chatHeader'),
            minimizeBtn: $('chatMinimizeBtn'),
            closeBtn: $('chatCloseBtn'),
            headerOnline: $('headerOnlineCount'),
            screenWelcome: $('screenWelcome'),
            screenRoom: $('screenRoom'),
            screenSupport: $('screenSupport'),
            welcomeStartBtn: $('welcomeStartBtn'),
            welcomeOnline: $('welcomeOnline'),
            supportStartTawk: $('supportStartTawk'),
            messagesArea: $('messagesArea'),
            tabs: document.querySelectorAll('.chat-tab'),
            messageInput: $('chatMessageInput'),
            sendBtn: $('chatSendBtn'),
            emojiToggle: $('emojiToggleBtn'),
            emojiPanel: $('emojiPickerPanel'),
            emojiGrid: $('emojiGrid'),
            pinnedBanner: $('pinnedBanner'),
            pinnedUser: $('pinnedBannerUser'),
            pinnedText: $('pinnedBannerText'),
            unpinBtn: $('unpinBtn'),
            inputPrefix: $('inputPrefix'),
            prefixIcon: $('prefixIcon'),
            prefixTitle: $('prefixTitle'),
            prefixText: $('prefixText'),
            prefixClose: $('prefixClose'),
            contextMenu: $('chatContextMenu'),
            currentUserName: $('currentUserName'),
            currentUserAvatar: $('currentUserAvatar'),
            changeNameLink: $('changeNameLink'),
            bulkActionBar: $('bulkActionBar'),
            selectedCount: $('selectedCount'),
            bulkDeleteBtn: $('bulkDeleteBtn'),
            bulkCancelBtn: $('bulkCancelBtn'),
            bulkForwardBtn: $('bulkForwardBtn'),
            pinnedArea: $('pinnedBannerArea')
        };
    }

    _buildEmojiGrid() {
        if (!this.el.emojiGrid) return;
        this.el.emojiGrid.innerHTML = this.emojis
            .map(e => `<div class="emoji-cell" data-emoji="${e}">${e}</div>`)
            .join('');
    }

    _restoreUser() {
        // Try multiple sources to restore user
        let currentUser = null;

        // 1. Try authService first
        if (typeof authService !== 'undefined') {
            currentUser = authService.getCurrentUser();
        }

        // 2. Fallback: Check localStorage directly
        if (!currentUser) {
            const stored = localStorage.getItem('cinestream_user');
            if (stored) {
                try {
                    currentUser = JSON.parse(stored);
                    console.log('[APFilmChat] Restored user from localStorage:', currentUser.name);
                } catch (e) {
                    console.error('[APFilmChat] Failed to parse stored user:', e);
                }
            }
        }

        // 3. Check if token exists (user is logged in)
        if (!currentUser) {
            const token = localStorage.getItem('cinestream_token');
            if (token) {
                // User has token but no user data - fetch from API
                console.log('[APFilmChat] Token found but no user data, fetching from API...');
                this._fetchUserFromAPI(token);
                return; // Will be called again after fetch
            }
        }

        if (currentUser) {
            const userId = currentUser._id || currentUser.id;
            const avatarKey = userId ? `avatar_${userId}` : 'user_avatar';

            this.user = {
                id: userId,
                name: currentUser.name || currentUser.user || 'User',
                avatar: localStorage.getItem(avatarKey) || currentUser.avatar || localStorage.getItem('user_avatar') || '/apple-touch-icon.png',
                frame: currentUser.equippedFrameClass || localStorage.getItem('ap_frame_class') || '',
                chatRole: currentUser.chatRole || 'user',
                role: currentUser.role
            };

            console.log('[APFilmChat] User restored successfully:', this.user.name);
            this._syncUserUI();
        } else {
            console.log('[APFilmChat] No user found - guest mode');
        }
    }

    async _fetchUserFromAPI(token) {
        if (!token || token.startsWith('demo_token_')) return;
        try {
            const apiBase = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : '/api';
            const response = await fetch(`${apiBase}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // Save to localStorage
                    localStorage.setItem('cinestream_user', JSON.stringify(result.data));
                    console.log('[APFilmChat] User fetched from API:', result.data.name);

                    // Restore user again
                    this._restoreUser();

                    // If chat is open, refresh the screen
                    if (this.isOpen && this.currentScreen === 'welcome') {
                        this._showScreen('room');
                        this._enterRoomFirebase();
                    }
                }
            } else if (response.status === 401) {
                // Token invalid or expired - clean up quietly
                localStorage.removeItem('cinestream_token');
                localStorage.removeItem('cinestream_user');
            }
        } catch (error) {
            console.warn('[APFilmChat] Error fetching user from API:', error.message || error);
        }
    }

    _syncUserUI() {
        if (!this.user) return;

        // Hiển thị tên + badge admin nếu có
        if (this.el.currentUserName) {
            const isAdmin = this.user.chatRole === 'admin' || this.user.role === 'admin';
            if (isAdmin) {
                this.el.currentUserName.innerHTML = `${this.user.name} <span style="color: #fbbf24; font-size: 10px; font-weight: 700;">(admin)</span>`;
            } else {
                this.el.currentUserName.textContent = this.user.name;
            }
        }

        if (this.el.currentUserAvatar) {
            const frame = this.user.frame || '';
            this.el.currentUserAvatar.innerHTML = `
                <div class="shop-frame-wrap ${frame} size-xs" style="width:24px; height:24px;">
                    <img src="${this.user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
            `;
        }
        if (this.el.cancelReplyBtn) {
            this.el.cancelReplyBtn.onclick = () => this._cancelReply();
        }

        if (this.el.bulkDeleteBtn) {
            this.el.bulkDeleteBtn.onclick = () => {
                if (confirm(`Xóa ${this.selectedMsgs.length} tin nhắn đã chọn?`)) {
                    this.selectedMsgs.forEach(id => {
                        if (window.firebaseChat?.ready) window.firebaseChat.deleteMessage(this.currentTab, id);
                    });
                    this._toggleSelectMode(false);
                }
            };
        }

        if (this.el.bulkCopyBtn) {
            this.el.bulkCopyBtn.onclick = () => {
                const texts = [];
                this.selectedMsgs.forEach(id => {
                    const el = document.querySelector(`.tg-msg-wrapper[data-msg-id="${id}"] .tg-msg-text`);
                    if (el) texts.push(el.textContent);
                });
                navigator.clipboard.writeText(texts.join('\n---\n'));
                if (window.showMessage) window.showMessage('Đã sao chép các tin nhắn được chọn', 'success');
                this._toggleSelectMode(false);
            };
        }

        if (this.el.bulkCancelBtn) {
            this.el.bulkCancelBtn.onclick = () => this._toggleSelectMode(false);
        }

        if (this.el.changeNameLink) {
            this.el.changeNameLink.style.display = 'none';
        }
    }

    _attachEvents() {
        const el = this.el;

        el.fab?.addEventListener('click', () => this.open());
        el.closeBtn?.addEventListener('click', () => this.close());
        el.minimizeBtn?.addEventListener('click', () => this.toggleMinimize());

        el.welcomeStartBtn?.addEventListener('click', () => {
            if (this.user) {
                this._showScreen('room');
                this._enterRoomFirebase();
            } else {
                // Always use auth modal - never redirect to login page
                if (window.authModal && typeof window.authModal.open === 'function') {
                    window.authModal.open('login');
                } else {
                    console.error('[APFilmChat] Auth modal not available');
                    this._showNotification('Vui lòng đăng nhập để sử dụng chat', 'warning');
                }
            }
        });

        document.addEventListener('click', () => {
            if (el.contextMenu) el.contextMenu.style.display = 'none';
            if (el.emojiPanel) el.emojiPanel.classList.remove('show');
        });

        // Close context menu when clicking backdrop on mobile
        if (el.contextMenu) {
            el.contextMenu.addEventListener('click', (e) => {
                // Close if clicking on the backdrop (::before pseudo-element area)
                if (e.target === el.contextMenu) {
                    el.contextMenu.style.display = 'none';
                }
            });
        }

        el.tabs?.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();

                // Check if tab is disabled
                if (tab.disabled || tab.classList.contains('tab-disabled')) {
                    if (window.showMessage) {
                        window.showMessage('⚠️ Tính năng đang được nâng cấp', 'info');
                    } else {
                        alert('Tính năng đang được nâng cấp');
                    }
                    return;
                }

                this._switchTab(tab.dataset.tab);
            });
        });

        // ⚡ ULTRA-FAST TEXTAREA AUTO-GROW ENGINE (No layout thrashing)
        let inputRAF = null;
        let lastInputValue = '';
        let lastScrollHeight = 0;

        const updateChatInput = (e) => {
            if (!el.messageInput) return;
            const currentValue = el.messageInput.value;

            // Step 1: Toggle send button state instantly
            if (el.sendBtn) el.sendBtn.disabled = currentValue.trim() === '';

            if (e && e.isComposing) return;

            // Step 2: Debounce height checks using requestAnimationFrame
            if (inputRAF) cancelAnimationFrame(inputRAF);

            inputRAF = requestAnimationFrame(() => {
                if (currentValue !== lastInputValue) {
                    // HYPER-OPTIMIZATION: Only reset height to 'auto' (causes reflow) when DELETING text
                    // because shrinking needs a reset. Growing just reads scrollHeight, which is 20x cheaper!
                    const isDeleting = currentValue.length < lastInputValue.length;
                    
                    if (isDeleting || currentValue === '') {
                        el.messageInput.style.height = 'auto';
                    }

                    const newH = el.messageInput.scrollHeight;
                    
                    // Only update DOM node if the absolute height metric actually changed!
                    if (newH !== lastScrollHeight || currentValue === '') {
                        el.messageInput.style.height = newH + 'px';
                        lastScrollHeight = newH;
                    }

                    lastInputValue = currentValue;
                }
            });
        };

        el.messageInput?.addEventListener('input', updateChatInput);
        el.messageInput?.addEventListener('compositionend', () => updateChatInput());

        el.messageInput?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._sendMessage();
            }
        });
        el.sendBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._sendMessage();
        });

        el.prefixClose?.addEventListener('click', () => this._cancelReply());
        el.bulkForwardBtn?.addEventListener('click', () => {
            if (this.selectedMsgs.length > 0) {
                if (window.showMessage) window.showMessage('Đã chuyển tiếp tin nhắn', 'info');
                this._toggleSelectMode(false);
            }
        });
        el.bulkCancelBtn?.addEventListener('click', () => this._toggleSelectMode(false));
        el.unpinBtn?.addEventListener('click', () => this._unpinCurrent());

        el.emojiToggle?.addEventListener('click', e => {
            e.stopPropagation();
            el.emojiPanel?.classList.toggle('show');
        });
        el.emojiGrid?.addEventListener('click', e => {
            const cell = e.target.closest('.emoji-cell');
            if (cell && el.messageInput) {
                el.messageInput.value += cell.dataset.emoji;
                el.messageInput.focus();
                el.sendBtn.disabled = false;
            }
        });

        el.supportStartTawk?.addEventListener('click', () => {
            if (typeof Tawk_API !== 'undefined' && Tawk_API.maximize) {
                Tawk_API.showWidget();
                Tawk_API.maximize();
            } else {
                window.open('https://tawk.to/chat/69c7d8abf493031c356334cf/1jkqaco0t', '_blank');
            }
        });
    }

    _showScreen(name) {
        const el = this.el;
        if (!el.screenWelcome) return;

        el.screenWelcome.classList.toggle('active', name === 'welcome');
        el.screenRoom.classList.toggle('active', name === 'room');
        el.screenSupport.classList.toggle('active', name === 'support');

        this.currentScreen = name;
        if (el.inputArea) {
            el.inputArea.style.display = (name === 'room' || name === 'support') ? 'block' : 'none';
        }

        if (name === 'room') {
            setTimeout(() => this._scrollToBottom(), 50);
        }
    }

    _switchTab(tabName) {
        // Block movies tab
        if (tabName === 'movies') {
            if (window.showMessage) {
                window.showMessage('⚠️ Tính năng đang được nâng cấp', 'info');
            } else {
                alert('Tính năng đang được nâng cấp');
            }
            return; // Don't switch to movies tab
        }

        if (tabName === 'support') {
            this._showScreen('support');
        } else {
            this._showScreen('room');
            this._listenTab(tabName);
        }

        this.currentTab = tabName;
        this.el.tabs?.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        if (this._stopPinned) this._stopPinned();
        if (window.firebaseChat?.ready) {
            this._stopPinned = window.firebaseChat.listenPinned(tabName, msg => this._renderPinned(msg));
        }
    }

    _renderPinned(msg) {
        if (!this.el.pinnedArea) return;

        // Clear area
        this.el.pinnedArea.innerHTML = '';
        this.el.pinnedArea.classList.remove('active');

        if (!msg) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'pinned-header-wrapper';
        wrapper.onclick = () => this._jumpToMessage(msg.id || msg.firebaseId);

        const isAdmin = this.user && (this.user.chatRole === 'admin' || this.user.role === 'admin');

        wrapper.innerHTML = `
            <div class="pinned-thumb">
                <span class="material-icons" style="font-size:16px;">push_pin</span>
            </div>
            <div class="pinned-content">
                <div class="pinned-user">Pinned Message</div>
                <div class="pinned-text">${this._esc(msg.text)}</div>
            </div>
            ${isAdmin ? `
                <button class="pinned-close-btn" onclick="event.stopPropagation(); window.apFilmChat._unpinCurrent()">
                    <span class="material-icons" style="font-size:14px;">close</span>
                </button>
            ` : ''}
        `;

        this.el.pinnedArea.appendChild(wrapper);
        this.el.pinnedArea.classList.add('active');
    }

    _enterRoomFirebase() {
        const init = () => {
            if (!this.user) return;

            if (this._stopPresence) this._stopPresence();
            this._stopPresence = window.firebaseChat.trackPresence(
                this.user.id,
                count => {
                    const fmt = count.toLocaleString('vi-VN');
                    if (this.el.headerOnline) this.el.headerOnline.textContent = `${fmt} người trực tuyến`;
                    if (this.el.welcomeOnline) this.el.welcomeOnline.textContent = fmt;
                }
            );

            this._listenTab(this.currentTab);

            if (this._stopPinned) this._stopPinned();
            this._stopPinned = window.firebaseChat.listenPinned(this.currentTab, msg => this._renderPinned(msg));

            // Socket Pin Listener (Fallback/Realtime bypass)
            if (!this._socketPinBound) {
                window.addEventListener('chat:pin', (e) => {
                    const { tab, message } = e.detail;
                    if (tab === this.currentTab) {
                        this._renderPinned(message);
                    }
                });
                this._socketPinBound = true;
            }
        };

        const setupPinned = () => {
            // Initial Fetch of Pinned Message from Backend (Persistence)
            this._fetchPinnedFromBackend();
        };

        if (window.firebaseChat?.ready) {
            init();
            setupPinned();
        } else {
            window.firebaseChat?.onReady(init);
            setupPinned(); // Fetch pinned even if firebase is slow
        }
    }

    async _fetchPinnedFromBackend() {
        try {
            const tab = this.currentTab || 'general';
            const res = await fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/pinned/${tab}`);
            const data = await res.json();
            if (data.success && data.data) {
                this._renderPinned(data.data);
            } else if (data.success && !data.data) {
                this._renderPinned(null);
            }
        } catch (err) {
            console.warn('[APFilmChat] Failed to fetch pinned from backend:', err);
        }
    }

    _unpinCurrent() {
        if (!confirm('Bỏ ghim tin nhắn này?')) return;
        if (window.firebaseChat?.ready) {
            window.firebaseChat.unpinAll(this.currentTab);
            if (window.showMessage) window.showMessage('Đã gỡ ghim tin nhắn', 'info');
        }
    }

    _jumpToMessage(msgId) {
        if (!msgId) return;
        const target = document.querySelector(`.tg-msg-wrapper[data-msg-id="${msgId}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('jump-highlight');
            setTimeout(() => target.classList.remove('jump-highlight'), 2000);
        } else {
            if (window.showMessage) window.showMessage('Tin nhắn gốc đã cũ hoặc không có trong bộ nhớ', 'info');
        }
    }

    _updateWelcomeStats() {
        // Pseudo presence for welcome screen if firebase not ready yet
        const init = () => {
            this._stopPresence = window.firebaseChat.trackPresence(
                'guest-' + Math.random().toString(36).substr(2, 9),
                count => {
                    const fmt = count.toLocaleString('vi-VN');
                    if (this.el.welcomeOnline) this.el.welcomeOnline.textContent = fmt;
                    if (this.el.headerOnline) this.el.headerOnline.textContent = `${fmt} người trực tuyến`;
                }
            );
        };
        if (window.firebaseChat?.ready) init();
        else window.firebaseChat?.onReady(init);
    }

    _showNotification(message, type = 'info', options = {}) {
        // Create toast notification element
        const toast = document.createElement('div');
        toast.className = `chat-toast chat-toast-${type}`;

        const icon = type === 'warning' ? '⚠️' : type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';

        let html = `
            <div class="chat-toast-icon">${icon}</div>
            <div class="chat-toast-content">
                <div class="chat-toast-message">${message}</div>
        `;

        // Add action button if provided
        if (options.action) {
            html += `
                <button class="chat-toast-action" onclick="${options.action.onClick}">
                    ${options.action.text}
                </button>
            `;
        }

        html += `</div>`;

        if (!options.persistent) {
            html += `<button class="chat-toast-close" onclick="this.parentElement.remove()">×</button>`;
        }

        toast.innerHTML = html;

        // Add to body
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove after duration (default 3s, or never if persistent)
        if (!options.persistent) {
            const duration = options.duration || 3000;
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    }

    _setupLoginListener() {
        // Check if user was not logged in initially
        const wasLoggedOut = !this.user;

        // Listen for storage changes (when user logs in via auth modal)
        window.addEventListener('storage', (e) => {
            if (e.key === 'cinestream_token' && e.newValue && wasLoggedOut) {
                this._showLoginSuccessNotification();
            }
        });

        // Also listen for custom event from auth modal
        document.addEventListener('userLoggedIn', () => {
            if (wasLoggedOut) {
                this._showLoginSuccessNotification();
            }
        });
    }

    _showLoginSuccessNotification() {
        this._showNotification(
            'Đăng nhập thành công! Vui lòng tải lại trang để sử dụng chat.',
            'success',
            {
                persistent: true,
                action: {
                    text: '🔄 Tải lại trang',
                    onClick: 'window.location.reload()'
                }
            }
        );
    }

    _listenTab(tab) {
        if (!window.firebaseChat?.ready) return;

        // 1. Initial Sync reactions from MongoDB (Persistence Fallback)
        this._syncReactions(tab);

        window.firebaseChat.listenMessages(tab, this.user?.id || '', msgs => {
            this._renderAllMessages(msgs);
        });
    }

    async _syncReactions(tab) {
        try {
            const resp = await fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/reactions-map/${tab}`);
            const res = await resp.json();
            if (res.success && res.data) {
                // Merge into cache
                this.reactionsCache = { ...this.reactionsCache, ...res.data };
                // If we already have messages rendered, re-render them to show reactions
                if (this.lastMessages) this._renderAllMessages(this.lastMessages);
            }
        } catch (e) {
            console.warn('[APFilmChat] Reactions sync failed', e);
        }
    }

    _renderAllMessages(msgs) {
        if (!this.el.messagesArea) return;
        this.lastMessages = msgs; // Keep for re-renders

        // Check if user is at bottom before rendering
        const shouldScroll = this._shouldAutoScroll();

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const tempContainer = document.createElement('div');

        let lastUserId = null;
        let lastTime = null;

        msgs.forEach(msg => {
            // STRICT IDENTIFICATION: Only own if IDs match AND are not falsy
            const currentId = this.user ? (this.user.id || this.user._id) : null;
            msg.isOwn = !!currentId && !!msg.userId && msg.userId === currentId;

            const isSameUser = msg.userId === lastUserId && lastTime === msg.time;

            // Create message element
            const msgElement = this._createMessageElement(msg, isSameUser);
            tempContainer.appendChild(msgElement);

            lastUserId = msg.userId;
            lastTime = msg.time;
        });

        // Batch DOM update
        requestAnimationFrame(() => {
            this.el.messagesArea.innerHTML = '';
            this.el.messagesArea.appendChild(tempContainer);

            // Only scroll if user was at bottom
            if (shouldScroll) {
                this._scrollToBottom(false);
            }
        });
    }

    _appendMessage(msg, doScroll = true, isSameUser = false) {
        if (!this.el.messagesArea) return;

        // Check if should auto-scroll before adding message
        const shouldScroll = doScroll && this._shouldAutoScroll();

        const msgElement = this._createMessageElement(msg, isSameUser);

        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            this.el.messagesArea.appendChild(msgElement);

            if (shouldScroll) {
                this._scrollToBottom(false);
            }
        });
    }

    _createMessageElement(msg, isSameUser = false) {

        const own = msg.isOwn ? 'own' : '';
        const isAdmin = (msg.chatRole && msg.chatRole.toLowerCase() === 'admin') ||
            (msg.role && msg.role.toLowerCase() === 'admin') ||
            (msg.user && msg.user.toLowerCase().includes('admin cinestream'));
        const time = msg.time || this._now();

        const div = document.createElement('div');
        div.className = `tg-msg-wrapper ${own} ${isSameUser ? 'same-user' : ''} ${isAdmin ? 'is-admin' : ''}`;
        div.setAttribute('data-msg-id', msg.id);

        // Hide name if it's our own message OR if it's the same user sending consecutive messages
        const showName = !msg.isOwn && !isSameUser;

        const avatarHtml = !isSameUser ? `
            <div class="tg-avatar-wrap ${isAdmin ? 'admin-glow' : ''}">
                <div class="shop-frame-wrap ${msg.frame || ''} size-sm" style="width:34px; height:34px; position:relative;">
                    <img src="${msg.avatar || '/apple-touch-icon.png'}" class="tg-avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
            </div>
        ` : '<div class="tg-avatar-spacer" style="width:34px; height:1px;"></div>';

        // Detect Forwarded message
        const isForwarded = msg.text.startsWith('Forwarded from');
        let cleanText = msg.text;
        let forwardInfo = '';
        if (isForwarded) {
            const lines = msg.text.split('\n');
            forwardInfo = lines[0]; // "Forwarded from Name:"
            cleanText = lines.slice(1).join('\n').trim().replace(/^"|"$/g, '');
        }

        // Reply OR Forward UI inside bubble (Telegram style)
        let replyInfoHtml = '';
        if (msg.replyTo || msg.forwardFrom) {
            const isForward = !!msg.forwardFrom;
            const target = isForward ? msg.forwardFrom : msg.replyTo;
            const title = isForward ? `Forwarded from ${target.user}` : target.user;
            const icon = isForward ? 'shortcut' : 'reply';
            const colorClass = isForward ? 'is-forward' : 'is-reply';

            replyInfoHtml = `
                <div class="msg-reply-preview ${colorClass}" onclick="event.stopPropagation(); ${target.id ? `window.apFilmChat._jumpToMessage('${target.id}')` : ''}">
                    <div class="reply-preview-line"></div>
                    <div class="reply-preview-content">
                        <div class="reply-preview-user">
                            <span class="material-icons" style="font-size:12px; vertical-align:middle; margin-right:2px;">${icon}</span>
                            ${this._esc(title)}
                        </div>
                        <div class="reply-preview-text">${this._esc(target.text)}</div>
                    </div>
                </div>
            `;
        }

        // Reactions UI (Telegram Consolidated Style)
        let reactionsHtml = '';
        const mergedReactions = { ...(msg.reactions || {}), ...(this.reactionsCache[msg.id] || {}) };
        const emojiList = Object.keys(mergedReactions);

        if (emojiList.length > 0) {
            // Calculate totals and first user data
            const firstEmoji = emojiList[0];
            const firstData = mergedReactions[firstEmoji];
            const firstAvatar = (firstData.avatars && firstData.avatars[0]) ? firstData.avatars[0] : '/apple-touch-icon.png';
            const totalCount = Object.values(mergedReactions).reduce((acc, curr) => acc + (curr.uids ? curr.uids.length : 0), 0);

            // Build Detailed Tooltip
            let tooltipHtml = '<div class="reaction-tooltip">';
            for (const [emo, data] of Object.entries(mergedReactions)) {
                const names = (data.names && data.names.length > 0) ? data.names.join(', ') : `${data.uids.length} người`;
                tooltipHtml += `
                    <div class="tooltip-row">
                        <span class="tooltip-emoji">${emo}</span>
                        <div class="tooltip-names">${names}</div>
                    </div>
                `;
            }
            tooltipHtml += '</div>';

            const hasReactedAny = emojiList.some(emo => {
                const uids = mergedReactions[emo].uids || [];
                return this.user && (uids.includes(this.user.id) || uids.includes(this.user._id));
            });

            reactionsHtml = `
                <div class="tg-reactions-pill">
                    <div class="reaction-item ${hasReactedAny ? 'active' : ''}" onclick="event.stopPropagation(); window.apFilmChat._handleReaction('${msg.id}', '${firstEmoji}')">
                        <span class="emoji">${firstEmoji}</span>
                        <div class="reaction-avatars-stack">
                            <img src="${firstAvatar}" class="reaction-avatar" style="width:22px; height:22px;">
                        </div>
                        <span class="count">${totalCount}</span>
                        ${tooltipHtml}
                    </div>
                </div>
            `;
        }

        const nameHtml = showName ? `
            <div class="tg-msg-name">
                ${this._esc(msg.user)} 
                ${isAdmin ? `
                    <span class="admin-badge-premium">
                        <span class="material-icons">verified</span>
                        Admin
                    </span>` : ''}
            </div>
        ` : '';

        const forwardHtml = isForwarded ? `
            <div class="forwarded-label">
                <span class="material-icons">shortcut</span> ${this._esc(forwardInfo)}
            </div>
        ` : '';

        div.innerHTML = `
            <div class="tg-msg-checkbox"></div>
            ${avatarHtml}
            <div class="tg-msg-bubble">
                <div class="quick-heart" title="Thả tim" onclick="event.stopPropagation(); window.apFilmChat._handleReaction('${msg.id}', '❤️')">
                    <span class="material-icons">favorite</span>
                </div>
                ${replyInfoHtml}
                ${forwardHtml}
                ${nameHtml}
                <div class="tg-msg-text">${this._esc(cleanText)}</div>
                <div class="tg-msg-meta">
                    ${msg.isPinned ? '<span class="material-icons pinned-msg-icon">push_pin</span>' : ''}
                    <span class="tg-msg-time">${time}</span>
                    ${msg.isOwn ? '<span class="material-icons read-icon">done_all</span>' : ''}
                </div>
                ${reactionsHtml}
            </div>
        `;

        const bubble = div.querySelector('.tg-msg-bubble');

        // Attachment events to BUBBLE for better hit area
        // Desktop: Right Click
        bubble.addEventListener('contextmenu', e => {
            e.preventDefault();
            // Only on desktop (screen width > 768px)
            if (window.innerWidth > 768) {
                this._showContextMenu(e, msg);
            }
        });

        // Mobile: Long Press (600ms)
        let touchTimer;
        bubble.addEventListener('touchstart', e => {
            // Only on mobile (screen width <= 768px)
            if (window.innerWidth <= 768) {
                touchTimer = setTimeout(() => {
                    if (window.navigator.vibrate) window.navigator.vibrate(50);
                    this._showContextMenu(e.touches[0], msg);
                }, 600);
            }
        }, { passive: true });

        bubble.addEventListener('touchend', () => clearTimeout(touchTimer));
        bubble.addEventListener('touchmove', () => clearTimeout(touchTimer));

        bubble.addEventListener('dblclick', e => {
            e.preventDefault();
            // Quick react with heart on double click (Telegram style)
            this._handleReaction(msg.id, '❤️');
        });

        bubble.addEventListener('click', e => {
            if (this.selectMode) {
                this._toggleMessageSelection(div, msg.id);
            }
        });

        // Click on checkbox specifically
        const checkbox = div.querySelector('.tg-msg-checkbox');
        checkbox.onclick = (e) => {
            e.stopPropagation();
            this._toggleMessageSelection(div, msg.id);
        };

        return div;
    }

    _handleReaction(msgId, emoji) {
        if (!this.user || !window.firebaseChat?.ready) return;

        // 1. Update local cache (Persistence & Data source for UI)
        if (!this.reactionsCache[msgId]) this.reactionsCache[msgId] = {};
        const cache = this.reactionsCache[msgId];
        if (!cache[emoji]) cache[emoji] = { uids: [], avatars: [], names: [] };

        const myUid = this.user.id || this.user._id;
        const myName = this.user.user || this.user.name || 'Khách';
        const myAvatar = this.user.avatar || '/apple-touch-icon.png';

        const idx = cache[emoji].uids.indexOf(myUid);
        if (idx !== -1) {
            cache[emoji].uids.splice(idx, 1);
            cache[emoji].avatars.splice(idx, 1);
            if (cache[emoji].names) cache[emoji].names.splice(idx, 1);
            if (cache[emoji].uids.length === 0) delete cache[emoji];
        } else {
            cache[emoji].uids.push(myUid);
            cache[emoji].avatars.push(myAvatar);
            if (!cache[emoji].names) cache[emoji].names = [];
            cache[emoji].names.push(myName);
        }

        // 2. Optimistic UI Update: Re-render the consolidated pill
        const msgWrapper = document.querySelector(`.tg-msg-wrapper[data-msg-id="${msgId}"]`);
        if (msgWrapper) {
            const bubble = msgWrapper.querySelector('.tg-msg-bubble');
            let pillContainer = msgWrapper.querySelector('.tg-reactions-pill');

            const emojiList = Object.keys(cache);
            if (emojiList.length === 0) {
                if (pillContainer) pillContainer.remove();
            } else {
                const firstEmoji = emojiList[0];
                const firstAvatar = cache[firstEmoji].avatars[0] || '/apple-touch-icon.png';
                const totalCount = Object.values(cache).reduce((acc, curr) => acc + curr.uids.length, 0);
                const hasReactedAny = emojiList.some(emo => cache[emo].uids.includes(myUid));

                // Build Tooltip HTML for optimistic update
                let tooltipHtml = '<div class="reaction-tooltip">';
                for (const [emo, data] of Object.entries(cache)) {
                    const names = (data.names && data.names.length > 0) ? data.names.join(', ') : `${data.uids.length} người`;
                    tooltipHtml += `
                        <div class="tooltip-row">
                            <span class="tooltip-emoji">${emo}</span>
                            <div class="tooltip-names">${names}</div>
                        </div>
                    `;
                }
                tooltipHtml += '</div>';

                const html = `
                    <div class="reaction-item ${hasReactedAny ? 'active' : ''}" onclick="event.stopPropagation(); window.apFilmChat._handleReaction('${msgId}', '${firstEmoji}')">
                        <span class="emoji">${firstEmoji}</span>
                        <div class="reaction-avatars-stack">
                            <img src="${firstAvatar}" class="reaction-avatar" style="width:22px; height:22px;">
                        </div>
                        <span class="count">${totalCount}</span>
                        ${tooltipHtml}
                    </div>
                `;

                if (!pillContainer) {
                    pillContainer = document.createElement('div');
                    pillContainer.className = 'tg-reactions-pill';
                    bubble.appendChild(pillContainer);
                }
                pillContainer.innerHTML = html;
            }

            // Burst animation
            const heart = msgWrapper.querySelector('.quick-heart');
            if (heart) {
                heart.style.animation = 'none';
                heart.offsetHeight;
                heart.style.animation = 'heartBurst 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        }

        // 3. Sync to Server
        window.firebaseChat.toggleReaction(this.currentTab, msgId, emoji, myUid, myAvatar, myName);
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    }

    _toggleMessageSelection(div, msgId) {
        div.classList.toggle('selected');
        const idx = this.selectedMsgs.indexOf(msgId);
        if (idx === -1) this.selectedMsgs.push(msgId);
        else this.selectedMsgs.splice(idx, 1);
        this._updateSelectedUI();
        if (this.selectedMsgs.length === 0) this._toggleSelectMode(false);
    }

    _showContextMenu(e, msg) {
        console.log('[APFilmChat] _showContextMenu entering...', { msgUser: msg.user });
        const menu = document.getElementById('chatContextMenu');
        if (!menu) return;

        const isAdmin = this.user && (this.user.chatRole === 'admin' || this.user.role === 'admin');
        
        // 1. Reset dynamic visibility states
        const ctxDangerSep = document.getElementById('ctxDangerSep');
        if (ctxDangerSep) ctxDangerSep.style.display = 'none';

        // Reset styles
        menu.style.display = 'flex';
        menu.style.flexDirection = 'column';

        const isMobile = window.innerWidth <= 768;

        if (!isMobile) {
            // 🚀 DESKTOP PRESETS
            menu.classList.remove('mobile-bottom-sheet');
            
            // Fetch coordinates and bounds
            const clientX = e.clientX;
            const clientY = e.clientY;
            
            // Safely acquire active message bubble context for precise anchoring
            const targetEl = e.target ? e.target.closest('.tg-msg-bubble') : null;
            const bubbleRect = targetEl ? targetEl.getBoundingClientRect() : null;

            // Cache measured menu constraints
            const menuRect = menu.getBoundingClientRect();
            const menuW = 220; // Exact layout width from css
            const menuH = 320; // Approx menu height
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            
            let left = clientX;
            let top = clientY;

            if (bubbleRect) {
                // Intelligent positioning aligned with parent bubble
                const msgRow = targetEl.closest('.message-row');
                const isOutgoing = msgRow && msgRow.classList.contains('outgoing');
                
                if (isOutgoing) {
                    // Align stack to flush against message end 
                    left = bubbleRect.right - menuW;
                } else {
                    // Align stack to start edge of bubble
                    left = bubbleRect.left;
                }
                top = bubbleRect.bottom + 6; // Directly beneath message bubble
            }

            // Right boundary overlap correction
            if (left + menuW > viewportW - 16) {
                left = viewportW - menuW - 16;
            }
            // Left boundary overlap correction
            if (left < 16) {
                left = 16;
            }

            // Bottom boundary overlap correction - AUTO VERTICAL FLIP
            let isFlipped = false;
            if (top + menuH > viewportH - 20) {
                isFlipped = true;
                if (bubbleRect) {
                    top = bubbleRect.top - menuH - 6; // Position ABOVE bubble
                } else {
                    top = clientY - menuH - 6;
                }
            }
            // Top boundary safety lock
            if (top < 16) {
                top = 16;
            }

            // Apply styles to fixed container
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
            menu.style.bottom = 'auto';
            menu.style.right = 'auto';
            menu.style.transform = 'none';
            menu.style.width = 'auto';

            // 🚀 UX Magic: If the menu flipped ABOVE the message, reverse flex layout 
            // to keep floating reaction bubbles absolutely closest to the text content!
            if (isFlipped) {
                menu.style.flexDirection = 'column-reverse';
            } else {
                menu.style.flexDirection = 'column';
            }
        } else {
            // 📱 MOBILE BOTTOM SHEET TRIGGER
            menu.classList.add('mobile-bottom-sheet');
            
            // Flush all specific coordinate metrics to inherit Bottom Sheet layout
            menu.style.left = '0';
            menu.style.top = 'auto';
            menu.style.bottom = '0';
            menu.style.right = '0';
            menu.style.width = '100%';
            menu.style.flexDirection = 'column';
        }

        // Setup Click Handlers
        document.getElementById('ctxReply').onclick = () => { this._setReply(msg); menu.style.display = 'none'; };
        document.getElementById('ctxForward').onclick = () => { this._forwardMessage(msg); menu.style.display = 'none'; };
        document.getElementById('ctxCopy').onclick = () => {
            navigator.clipboard.writeText(msg.text);
            menu.style.display = 'none';
            if (window.showMessage) window.showMessage('Đã sao chép tin nhắn', 'success');
        };
        document.getElementById('ctxSelect').onclick = () => {
            this._toggleSelectMode(true);
            menu.style.display = 'none';
        };

        const ctxPin = document.getElementById('ctxPin');
        const ctxBan = document.getElementById('ctxBan');
        const ctxDelete = document.getElementById('ctxDelete');

        // Handle Reactions
        const emojis = menu.querySelectorAll('.react-emoji');
        emojis.forEach(em => {
            const emojiText = em.dataset.emoji;

            // Check if user has already reacted with this emoji
            const hasReacted = msg.reactions && msg.reactions[emojiText] &&
                msg.reactions[emojiText].uids &&
                this.user && msg.reactions[emojiText].uids.includes(this.user.id);

            em.classList.toggle('already-reacted', !!hasReacted);

            em.onclick = () => {
                this._handleReaction(msg.id, emojiText);
                menu.style.display = 'none';
            };
        });

        if (isAdmin) {
            ctxPin.style.display = 'flex';
            ctxBan.style.display = 'flex';
            ctxDelete.style.display = 'flex';
            if (ctxDangerSep) ctxDangerSep.style.display = 'block';

            ctxPin.onclick = () => {
                if (window.firebaseChat?.ready) window.firebaseChat.pinMessage(this.currentTab, msg.id);
                menu.style.display = 'none';
            };
            ctxBan.onclick = () => {
                if (confirm(`Chặn người dùng "${msg.user}"? Họ sẽ không thể nhắn tin nữa.`)) {
                    if (window.firebaseChat?.ready) window.firebaseChat.banUser(msg.userId, msg.user);
                }
                menu.style.display = 'none';
            };
            ctxDelete.onclick = async () => {
                if (confirm('Xóa tin nhắn này?')) {
                    try {
                        // Delete from Firebase first
                        if (window.firebaseChat?.ready) {
                            await window.firebaseChat.deleteMessage(this.currentTab, msg.id);
                        }

                        // Also delete from MongoDB via API
                        const token = localStorage.getItem('cinestream_token');
                        if (token) {
                            const response = await fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/${msg.id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            const result = await response.json();
                            if (result.success) {
                                if (window.showMessage) {
                                    window.showMessage('✅ Đã xóa tin nhắn', 'success');
                                }
                            } else {
                                console.error('Delete failed:', result.message);
                                if (window.showMessage) {
                                    window.showMessage(`❌ Lỗi: ${result.message}`, 'error');
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Delete message error:', error);
                        if (window.showMessage) {
                            window.showMessage('❌ Không thể xóa tin nhắn', 'error');
                        }
                    }
                }
                menu.style.display = 'none';
            };
        } else {
            ctxPin.style.display = 'none';
            ctxBan.style.display = 'none';
            // Users can delete their own messages
            if (msg.isOwn) {
                ctxDelete.style.display = 'flex';
                ctxDelete.onclick = async () => {
                    if (confirm('Xóa tin nhắn của bạn?')) {
                        try {
                            // Delete from Firebase first
                            if (window.firebaseChat?.ready) {
                                await window.firebaseChat.deleteMessage(this.currentTab, msg.id);
                            }

                            // Also delete from MongoDB via API
                            const token = localStorage.getItem('cinestream_token');
                            if (token) {
                                const response = await fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/${msg.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                });

                                const result = await response.json();
                                if (result.success) {
                                    if (window.showMessage) {
                                        window.showMessage('✅ Đã xóa tin nhắn', 'success');
                                    }
                                } else {
                                    console.error('Delete failed:', result.message);
                                    if (window.showMessage) {
                                        window.showMessage(`❌ ${result.message}`, 'error');
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Delete message error:', error);
                            if (window.showMessage) {
                                window.showMessage('❌ Không thể xóa tin nhắn', 'error');
                            }
                        }
                    }
                    menu.style.display = 'none';
                };
            } else {
                ctxDelete.style.display = 'none';
            }
        }
    }

    _setReply(msg) {
        this.replyTo = msg;
        this.forwardFrom = null; // Clear forward if reply
        this._updateInputPrefix('reply', msg.user, msg.text);
        this.el.messageInput?.focus();
    }

    _forwardMessage(msg) {
        this.replyTo = null; // Clear reply if forward
        this.forwardFrom = msg;
        this._updateInputPrefix('shortcut', `Forwarded from ${msg.user}`, msg.text);
        this.el.messageInput?.focus();
    }

    _updateInputPrefix(icon, title, text) {
        console.log('[APFilmChat] _updateInputPrefix called', { icon, title, text });
        const el = this.el;
        if (!el.inputPrefix) {
            console.error('[APFilmChat] inputPrefix element NOT found in cache!');
            return;
        }

        el.inputPrefix.style.setProperty('display', 'flex', 'important');
        el.inputPrefix.style.zIndex = '1000';

        if (el.prefixIcon) el.prefixIcon.innerHTML = `<span class="material-icons">${icon}</span>`;
        if (el.prefixTitle) el.prefixTitle.textContent = title;
        if (el.prefixText) el.prefixText.textContent = text;

        const color = '#f87171';
        if (el.prefixIcon) el.prefixIcon.style.color = color;
        if (el.prefixTitle) el.prefixTitle.style.color = color;
        console.log('[APFilmChat] inputPrefix should now be visible');
    }

    _cancelReply() {
        this.replyTo = null;
        this.forwardFrom = null;
        if (this.el.inputPrefix) this.el.inputPrefix.style.display = 'none';
    }

    _toggleSelectMode(active) {
        this.selectMode = active;
        this.selectedMsgs = [];
        this.el.window.classList.toggle('select-mode', active);

        if (this.el.bulkActionBar) {
            this.el.bulkActionBar.classList.toggle('active', active);
        }

        if (!active) {
            document.querySelectorAll('.tg-msg-wrapper.selected').forEach(el => el.classList.remove('selected'));
        }
    }

    _updateSelectedUI() {
        if (this.el.selectedCount) {
            this.el.selectedCount.textContent = `${this.selectedMsgs.length} đã chọn`;
        }
        if (this.el.bulkActionBar) {
            this.el.bulkActionBar.style.display = this.selectedMsgs.length > 0 ? 'flex' : 'none';
        }
    }


    _sendMessage() {
        if (this.isBanned) {
            if (window.showMessage) window.showMessage('Bạn đang bị cấm khỏi phòng chat', 'error');
            return;
        }

        const text = (this.el.messageInput?.value || '').trim();
        if (!text || !this.user) return;

        const msg = {
            userId: this.user.id,
            user: this.user.name,
            avatar: this.user.avatar,
            frame: this.user.frame,
            chatRole: this.user.chatRole,
            text,
            replyTo: this.replyTo ? {
                id: this.replyTo.id,
                user: this.replyTo.user,
                text: this.replyTo.text
            } : null,
            forwardFrom: this.forwardFrom ? {
                user: this.forwardFrom.user,
                text: this.forwardFrom.text
            } : null
        };

        if (window.firebaseChat?.ready) {
            window.firebaseChat.sendMessage(this.currentTab, msg);
        }

        this.el.messageInput.value = '';
        this.el.messageInput.style.height = 'auto';
        this.el.sendBtn.disabled = true;
        this._cancelReply();
    }

    _jumpToMessage(id) {
        const target = document.querySelector(`.tg-msg-wrapper[data-msg-id="${id}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('jump-highlight');
            setTimeout(() => target.classList.remove('jump-highlight'), 2000);
        }
    }

    _scrollToBottom(smooth = false) {
        if (!this.el.messagesArea) return;

        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            const area = this.el.messagesArea;
            if (smooth) {
                area.scrollTo({
                    top: area.scrollHeight,
                    behavior: 'smooth'
                });
            } else {
                area.scrollTop = area.scrollHeight;
            }
        });
    }

    _shouldAutoScroll() {
        if (!this.el.messagesArea) return true;

        const area = this.el.messagesArea;
        const threshold = 100; // pixels from bottom
        const distanceFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;

        return distanceFromBottom < threshold;
    }

    _now() {
        return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    _esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            // Messenger style: hide chat completely, show FAB
            this.el.window?.classList.add('minimized');
            if (this.el.fab) this.el.fab.style.display = '';
            this.isOpen = false;
        } else {
            // Restore chat
            this.el.window?.classList.remove('minimized');
            if (this.el.fab) this.el.fab.style.display = 'none';
            this.isOpen = true;
            this._scrollToBottom();
        }
    }

    async open() {
        if (!this.el.window) return;

        // Force switch away from movies tab if currently on it
        if (this.currentTab === 'movies') {
            this.currentTab = 'general';
        }

        // Check if user is logged in before opening
        if (!this.user) {
            const token = localStorage.getItem('cinestream_token');
            if (token) {
                console.log('[APFilmChat] User not loaded yet, fetching...');
                await this._fetchUserFromAPI(token);
            }
        }

        this.isOpen = true;
        this.isMinimized = false;
        this.el.window.classList.remove('minimized');
        this.el.window.classList.add('active');
        if (this.el.fab) this.el.fab.style.display = 'none';

        // Add body class for mobile to prevent background scroll
        if (window.innerWidth <= 768) {
            document.body.classList.add('chat-open');
        }

        // Auto-enter room if user is logged in
        if (this.user) {
            console.log('[APFilmChat] User logged in, entering room directly');
            this._showScreen('room');
            this._enterRoomFirebase();
        } else {
            console.log('[APFilmChat] No user, showing welcome screen');
            this._showScreen('welcome');
        }

        this._scrollToBottom();

        // Auto-refresh user role to detect if they were promoted to admin
        if (this.user && this.user.id) {
            try {
                const token = localStorage.getItem('cinestream_token');
                if (token && !token.startsWith('demo_token_')) {
                    const apiBase = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) ? API_CONFIG.BACKEND_URL : '/api';
                    const res = await fetch(`${apiBase}/auth/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.data) {
                            const newUser = data.data;
                            this.user.chatRole = newUser.chatRole || 'user';
                            this.user.avatar = newUser.avatar || this.user.avatar;
                            this.user.frame = newUser.equippedFrameClass || this.user.frame;
                            this._syncUserUI();
                        }
                    } else if (res.status === 401) {
                        localStorage.removeItem('cinestream_token');
                    }
                }
            } catch (e) {
                console.warn('[APFilmChat] Profile refresh failed:', e);
            }
        }
    }

    close() {
        if (!this.el.window) return;
        this.isOpen = false;
        this.isMinimized = false;
        this.el.window.classList.remove('active');
        this.el.window.classList.remove('minimized');
        if (this.el.fab) this.el.fab.style.display = '';

        // Remove body class for mobile
        document.body.classList.remove('chat-open');
    }

    /* ── Desktop Interaction ── */
    _initDragResize() {
        // Skip drag/resize on mobile completely
        if (window.innerWidth <= 768) {
            console.log('[APFilmChat] Mobile detected - skipping drag/resize');
            return;
        }

        const win = this.el.window;
        const header = this.el.header;

        // Restore saved size
        const savedW = localStorage.getItem('chat_width');
        const savedH = localStorage.getItem('chat_height');
        if (savedW) win.style.width = savedW;
        if (savedH) win.style.height = savedH;

        // Drag logic (Header only) with boundary constraints
        let dragging = false, ox, oy;
        header.onmousedown = e => {
            if (e.target.closest('button')) return;
            dragging = true;
            win.style.transition = 'none';
            ox = e.clientX - win.offsetLeft;
            oy = e.clientY - win.offsetTop;

            const onDragMove = (ev) => {
                if (!dragging) return;

                // Calculate new position
                let newLeft = ev.clientX - ox;
                let newTop = ev.clientY - oy;

                // Get window dimensions
                const winWidth = win.offsetWidth;
                const winHeight = win.offsetHeight;
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Apply boundary constraints
                // Minimum 50px visible on each edge
                const minVisible = 50;
                newLeft = Math.max(-winWidth + minVisible, Math.min(newLeft, viewportWidth - minVisible));
                newTop = Math.max(0, Math.min(newTop, viewportHeight - minVisible));

                win.style.left = newLeft + 'px';
                win.style.top = newTop + 'px';
                win.style.right = 'auto';
                win.style.bottom = 'auto';
            };

            const onDragUp = () => {
                dragging = false;
                win.style.transition = '';
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('mouseup', onDragUp);
            };

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragUp);
        };

        this._bindResizeHandlers();
    }

    _ensureResizeHandles() {
        const win = this.el.window;
        if (!win) return;

        // Check if handles already exist
        if (win.querySelector('.cr-resize-handle')) {
            // Check if we have all 8 handles (n, s, e, w, nw, ne, se, sw)
            if (win.querySelectorAll('.cr-resize-handle').length >= 8) {
                return;
            }
            // If some missing, clear and re-create
            win.querySelectorAll('.cr-resize-handle').forEach(h => h.remove());
        }

        // Create 8 handles
        const positions = ['n', 's', 'e', 'w', 'nw', 'ne', 'se', 'sw'];
        positions.forEach(pos => {
            const div = document.createElement('div');
            div.className = `cr-resize-handle cr-resize-${pos}`;
            win.appendChild(div);
        });

        // Bind events to new handles
        this._bindResizeHandlers();
        console.log('[APFilmChat] 8-way Resize handles created ✓');
    }

    _bindResizeHandlers() {
        // Skip on mobile
        if (window.innerWidth <= 768) return;

        const win = this.el.window;
        if (!win) return;
        let hideTimeout;

        const onResizeStart = (e, type) => {
            if (this.isMinimized) return;
            e.preventDefault();
            e.stopPropagation();
            win.style.transition = 'none';
            win.classList.add('is-resizing');
            if (hideTimeout) clearTimeout(hideTimeout);

            const isTouch = e.type === 'touchstart';
            const startW = win.offsetWidth;
            const startH = win.offsetHeight;
            const startX = isTouch ? e.touches[0].clientX : e.clientX;
            const startY = isTouch ? e.touches[0].clientY : e.clientY;
            const startL = win.offsetLeft;
            const startT = win.offsetTop;

            // Clear right/bottom to allow left/top to control position
            win.style.right = 'auto';
            win.style.bottom = 'auto';
            win.style.left = startL + 'px';
            win.style.top = startT + 'px';

            const onMove = (ev) => {
                const curX = isTouch ? ev.touches[0].clientX : ev.clientX;
                const curY = isTouch ? ev.touches[0].clientY : ev.clientY;

                // Viewport constraints
                const vw = window.innerWidth;
                const vh = window.innerHeight;

                // Horizontal resize
                if (type.includes('w')) {
                    const diff = startX - curX;
                    let newW = startW + diff;
                    let newL = startL - diff;

                    if (newW < 300) { newW = 300; newL = startL + (startW - 300); }
                    if (newW > 1200) { newW = 1200; newL = startL + (startW - 1200); }
                    if (newL < 0) { newL = 0; newW = startW + startL; }

                    win.style.width = newW + 'px';
                    win.style.left = newL + 'px';
                    win.style.right = 'auto';
                } else if (type.includes('e')) {
                    let newW = startW + (curX - startX);
                    if (newW < 300) newW = 300;
                    if (newW > 1200) newW = 1200;
                    if (startL + newW > vw) newW = vw - startL;

                    win.style.width = newW + 'px';
                }

                // Vertical resize
                if (type.includes('n')) {
                    const diff = startY - curY;
                    let newH = startH + diff;
                    let newT = startT - diff;

                    if (newH < 350) { newH = 350; newT = startT + (startH - 350); }
                    if (newH > 950) { newH = 950; newT = startT + (startH - 950); }
                    if (newT < 0) { newT = 0; newH = startH + startT; }

                    win.style.height = newH + 'px';
                    win.style.top = newT + 'px';
                    win.style.bottom = 'auto';
                } else if (type.includes('s')) {
                    let newH = startH + (curY - startY);
                    if (newH < 350) newH = 350;
                    if (newH > 950) newH = 950;
                    if (startT + newH > vh) newH = vh - startT;

                    win.style.height = newH + 'px';
                }
            };

            const onUp = () => {
                win.style.transition = '';
                localStorage.setItem('chat_width', win.style.width);
                localStorage.setItem('chat_height', win.style.height);
                document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
                document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onUp);

                // Hide after 2 seconds
                hideTimeout = setTimeout(() => {
                    win.classList.remove('is-resizing');
                }, 2000);
            };

            document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: false });
            document.addEventListener(isTouch ? 'touchend' : 'mouseup', onUp);
        };

        win.querySelectorAll('.cr-resize-handle').forEach(h => {
            let type = '';
            if (h.classList.contains('cr-resize-n')) type = 'n';
            else if (h.classList.contains('cr-resize-s')) type = 's';
            else if (h.classList.contains('cr-resize-e')) type = 'e';
            else if (h.classList.contains('cr-resize-w')) type = 'w';
            else if (h.classList.contains('cr-resize-nw')) type = 'nw';
            else if (h.classList.contains('cr-resize-ne')) type = 'ne';
            else if (h.classList.contains('cr-resize-se')) type = 'se';
            else if (h.classList.contains('cr-resize-sw')) type = 'sw';

            // Mouse
            h.onmousedown = (e) => onResizeStart(e, type);
            // Touch
            h.ontouchstart = (e) => onResizeStart(e, type);
        });
    }

    _initMobileKeyboardFix() {
        // Only apply on mobile
        if (window.innerWidth > 768) return;
        if (!window.visualViewport) return;

        // On mobile, chat is full-screen, so we don't need to adjust for keyboard
        // The browser will handle scrolling automatically
        console.log('[APFilmChat] Mobile keyboard handling initialized');
    }

    _initMobileResize() {
        // Mobile resize is disabled - full-screen only
        console.log('[APFilmChat] Mobile resize disabled (full-screen mode)');
    }
}

// Auto-healing & Binding helper
function ensureChatInteraction() {
    const win = document.getElementById('chatWindow');
    if (win && (!win.querySelector('.cr-resize-handle') || win.querySelectorAll('.cr-resize-handle').length < 8)) {
        // Clear existing handles if any to avoid duplicates or partials
        win.querySelectorAll('.cr-resize-handle').forEach(h => h.remove());

        const positions = ['n', 's', 'e', 'w', 'nw', 'ne', 'se', 'sw'];
        positions.forEach(pos => {
            const div = document.createElement('div');
            div.className = `cr-resize-handle cr-resize-${pos}`;
            win.appendChild(div);
        });
        if (window.apFilmChat) window.apFilmChat._bindResizeHandlers();
        console.log('[APFilmChat] 8-way Resize system re-initialized ✓');
    }
}
setInterval(ensureChatInteraction, 4000);

// Call immediately on load
window.addEventListener('DOMContentLoaded', () => {
    ensureChatInteraction();
});

window.apFilmChat = new APFilmChat();

