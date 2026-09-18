/**
 * A PHIM - Firebase Comments Service v4
 * Giữ nguyên Input Box chuẩn ban đầu + Nâng cấp Giao diện bình luận phía dưới
 */

(function () {
    'use strict';

    // Firebase Project MỚI: aphim-super-new
    const COMMENTS_CONFIG = {
        apiKey           : "AIzaSyBoB2gTGuPAVy_HyYv4j3b7NU9rbTVQmno",
        authDomain       : "aphim-super-new.firebaseapp.com",
        projectId        : "aphim-super-new",
        storageBucket    : "aphim-super-new.firebasestorage.app",
        messagingSenderId: "276319755678",
        appId            : "1:276319755678:web:4d74442ea51112e6e4ca8f",
        measurementId    : "G-WX2RYSDNPC"
    };

    const COMMENTS_APP_NAME = 'aphim-comments';
    const COMMENT_LIMIT = 200;

    const AVATAR_COLORS = [
        '#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6',
        '#f97316','#06b6d4','#ec4899','#84cc16','#6366f1'
    ];

    const AVATAR_LIST = [
        "https://i.ex-cdn.com/giadinhmoi.vn/files/content/2024/12/13/470107535_1156674079362932_3220600486106282952_n-0953.jpg",
        "https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/07/anh-son-tung-2.jpg",
        "https://cdn2.fptshop.com.vn/unsafe/800x0/anh_lisa_6_d83ab4e404.jpg",
        "https://img.tripi.vn/cdn-cgi/image/width=700,height=700/https://gcs.tripi.vn/public-tripi/tripi-feed/img/482756agE/anh-mo-ta.png",
        "https://tophinhanh.net/wp-content/uploads/2023/12/anh-kim-jisoo-cute-1.jpg",
        "https://i.pinimg.com/736x/3c/d7/24/3cd724dd754d0b42bd6599efe18ceff0.jpg"
    ];

    function getAvatarColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    }

    function timeAgo(ts) {
        if (!ts) return '';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60)     return 'vừa xong';
        if (diff < 3600)   return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400)  return `${Math.floor(diff / 3600)} giờ trước`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    }

    function sanitize(str) {
        if (typeof str !== 'string') return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // Lấy thông tin tập phim tự động
    function getEpisodeInfo() {
        try {
            const activeEp = document.querySelector('#episode-list a.active, .episode-btn.active, .server-btn.active');
            if (activeEp) {
                let epText = activeEp.textContent.trim();
                if (/^\d+$/.test(epText)) epText = `Tập ${epText}`;
                return `P.1 - ${epText}`;
            }
        } catch(e) {}
        return '';
    }

    function getCurrentUser() {
        try {
            if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
                const u = authService.getCurrentUser();
                if (u) return u;
            }
        } catch (e) {}
        try {
            const uStr = localStorage.getItem('A Phim_user') || localStorage.getItem('user');
            if (uStr) return JSON.parse(uStr);
        } catch (e) {}
        return null;
    }

    // ── API SERVICE (Replaced Firebase) ──────────────────────────────────────────────
    const API_URL = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) 
        ? API_CONFIG.BACKEND_URL 
        : '/api';

    function getUserToken() {
        if (typeof STORAGE_KEYS !== 'undefined') {
            return localStorage.getItem(STORAGE_KEYS.TOKEN) || sessionStorage.getItem(STORAGE_KEYS.TOKEN);
        }
        return localStorage.getItem('A Phim_token') || sessionStorage.getItem('A Phim_token');
    }

    // ── STORED REACTIONS (Guest & Logged User Reactions Persistence) ──
    function getStoredReactions(slug) {
        try {
            const str = localStorage.getItem('ap_reactions_' + (slug || 'main'));
            return str ? JSON.parse(str) : {};
        } catch(e) { return {}; }
    }

    function saveStoredReaction(slug, commentId, reactionType, userKey) {
        try {
            const stored = getStoredReactions(slug);
            if (!stored[commentId]) stored[commentId] = {};
            
            for (const type of Object.keys(stored[commentId])) {
                if (Array.isArray(stored[commentId][type])) {
                    stored[commentId][type] = stored[commentId][type].filter(u => u !== userKey);
                    if (stored[commentId][type].length === 0) delete stored[commentId][type];
                }
            }
            
            if (reactionType) {
                if (!stored[commentId][reactionType]) stored[commentId][reactionType] = [];
                if (!stored[commentId][reactionType].includes(userKey)) {
                    stored[commentId][reactionType].push(userKey);
                }
            }
            localStorage.setItem('ap_reactions_' + (slug || 'main'), JSON.stringify(stored));
        } catch(e) {}
    }

    class APIComments {
        constructor() {
            this.ready = true;
            this._onReady = [];
            this.currentSlug = null;
            this.pollInterval = null;
            this.eventSource = null;
            this._bc = null;
        }

        onReady(fn) { fn(); }

        async getMovieIdFromSlug(slug) {
            return slug;
        }

        async add(slug, { name, text, isSpoiler, parentId, userEmail, avatarUrl }) {
            text = (text || '').trim();
            if (text.length < 2)    return { ok: false, msg: 'Bình luận quá ngắn!' };
            if (text.length > 1000) return { ok: false, msg: 'Tối đa 1000 ký tự!' };
            
            const user = getCurrentUser();
            if (!user) return { ok: false, msg: 'Vui lòng đăng nhập để bình luận!' };

            const userFrameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(user) : { type: 'none', value: '' };
            const userId = user.id || user._id || user.email || '';
            const userAva = avatarUrl || user.avatar || user.avatarUrl || (typeof avatarService !== 'undefined' ? avatarService.getAvatar(userId) : null) || localStorage.getItem('user_avatar') || localStorage.getItem('ap_chosen_avatar') || '';
            const userBadge = typeof getEquippedBadge === 'function' ? getEquippedBadge(user) : (user.equippedBadge || user.badge || localStorage.getItem('ap_equipped_badge') || (user.role === 'admin' ? 'ADMIN TOP 1' : (user.isVip ? 'VIP PRO' : 'LV.' + (user.level || 15))));
            
            const commentPayload = {
                id: 'local-' + Date.now(),
                movieSlug: slug,
                movieId: window.currentMovie ? window.currentMovie._id : slug,
                content: text,
                isSpoiler: !!isSpoiler,
                parentId: parentId || null,
                episodeInfo: getEpisodeInfo(),
                user: {
                    id: userId,
                    displayName: user.displayName || user.name || name || 'Người dùng',
                    name: user.displayName || user.name || name || 'Người dùng',
                    email: user.email || userEmail || '',
                    avatarUrl: userAva,
                    avatar: userAva,
                    equippedFrameUrl: userFrameInfo.type === 'url' ? userFrameInfo.value : (user.equippedFrameUrl || localStorage.getItem('ap_frame_url') || ''),
                    equippedFrameClass: userFrameInfo.type === 'class' ? userFrameInfo.value : (user.equippedFrameClass || localStorage.getItem('ap_frame_class') || ''),
                    equippedColor: typeof getEquippedColorId === 'function' ? getEquippedColorId(user) : (user.equippedColor || localStorage.getItem('ap_equipped_color') || 'color_default'),
                    role: user.role || 'user',
                    level: user.level || 15,
                    badge: userBadge,
                    equippedBadge: userBadge
                }
            };

            // Save comment locally for instantaneous zero-latency local feedback
            const localKey = 'ap_local_comments_' + (slug || 'main');
            const existingLocalStr = localStorage.getItem(localKey);
            const localList = existingLocalStr ? JSON.parse(existingLocalStr) : [];
            
            const optimisticComment = {
                id: commentPayload.id,
                name: commentPayload.user.displayName,
                email: commentPayload.user.email,
                text: text,
                color: getAvatarColor(commentPayload.user.name || 'U'),
                avatarUrl: userAva,
                equippedFrameUrl: commentPayload.user.equippedFrameUrl,
                equippedFrameClass: commentPayload.user.equippedFrameClass,
                equippedColor: commentPayload.user.equippedColor,
                userRole: commentPayload.user.role,
                level: commentPayload.user.level,
                badge: commentPayload.user.badge,
                timestamp: new Date(),
                isSpoiler: !!isSpoiler,
                parentId: parentId || null,
                episodeInfo: commentPayload.episodeInfo,
                likedBy: [],
                dislikedBy: []
            };

            localList.push(optimisticComment);
            localStorage.setItem(localKey, JSON.stringify(localList));

            // Gamification hook: Progress comment mission & increment total user comments
            try {
                if (window.GamificationCore && typeof window.GamificationCore.progressDailyMission === 'function') {
                    window.GamificationCore.progressDailyMission('comment', 1);
                    let cCount = Number(localStorage.getItem('ap_user_comment_count') || 0) + 1;
                    localStorage.setItem('ap_user_comment_count', cCount);
                }
            } catch(e) {}

            // Send to Realtime Backend Database
            const token = getUserToken();
            try {
                const response = await fetch(`${API_URL}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(commentPayload)
                });
                const resData = await response.json();
                if (resData && resData.success && resData.data) {
                    // Update ID in local list if saved to MongoDB
                    const updatedLocal = localList.map(item => item.id === optimisticComment.id ? { ...item, id: resData.data._id } : item);
                    localStorage.setItem(localKey, JSON.stringify(updatedLocal));
                }
            } catch(e) {
                console.warn('[Comments] Offline/fallback save used:', e.message);
            }

            // Cross-tab instant broadcast
            try {
                if (typeof BroadcastChannel !== 'undefined') {
                    const bc = new BroadcastChannel('ap_movie_comments');
                    bc.postMessage({ type: 'new_comment', slug, comment: optimisticComment, timestamp: Date.now() });
                    bc.close();
                }
            } catch(e) {}

            if (this._lastCb) this.fetchData(slug, this._lastCb);
            return { ok: true };
        }

        async vote(slug, commentId, type, userEmail) {}

        async toggleSpoiler(slug, commentId, currentState) {}

        async fetchData(slug, cb) {
            let serverList = [];
            try {
                const res = await fetch(`${API_URL}/comments/movie/${encodeURIComponent(slug)}`).catch(() => null);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.success && Array.isArray(data.data)) {
                        serverList = data.data.map(d => ({
                            id: String(d._id),
                            name: d.user ? (d.user.displayName || d.user.name) : 'Thành viên',
                            email: d.user ? d.user.email : '',
                            text: d.content,
                            color: getAvatarColor(d.user ? (d.user.name || 'U') : 'U'),
                            avatarUrl: d.user ? (d.user.avatarUrl || d.user.avatar) : '',
                            equippedFrameUrl: d.user ? (d.user.equippedFrameUrl || '') : '',
                            equippedFrameClass: d.user ? (d.user.equippedFrameClass || '') : '',
                            equippedColor: d.user ? (d.user.equippedColor || 'color_default') : 'color_default',
                            userRole: d.user ? (d.user.role || 'user') : 'user',
                            level: d.user ? (d.user.level || 15) : 15,
                            badge: d.user ? (d.user.equippedBadge || d.user.badge || (d.user.role === 'admin' ? 'ADMIN TOP 1' : (d.user.isVip ? 'VIP PRO' : 'LV.' + (d.user.level || 15)))) : '',
                            timestamp: new Date(d.createdAt || Date.now()),
                            isSpoiler: d.isSpoiler || false,
                            parentId: d.parent || d.parentId || null, 
                            episodeInfo: d.episodeInfo || '',
                            reactions: d.reactions || {},
                            likedBy: d.likes || [],
                            dislikedBy: []
                        }));
                    }
                }
            } catch(e) {}

            // Load local user added comments (fallbacks not yet in server)
            const localKey = 'ap_local_comments_' + (slug || 'main');
            const localStr = localStorage.getItem(localKey);
            const localList = localStr ? JSON.parse(localStr).map(item => ({ ...item, timestamp: new Date(item.timestamp) })) : [];

            // Auto-push any pending local comments to MongoDB Atlas in the background
            if (localList.length > 0) {
                const unsynced = localList.filter(item => String(item.id).startsWith('local-'));
                if (unsynced.length > 0) {
                    unsynced.forEach(async (unsyncedItem) => {
                        try {
                            const res = await fetch(`${API_URL}/comments`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    movieSlug: slug,
                                    movieId: window.currentMovie ? window.currentMovie._id : slug,
                                    content: unsyncedItem.text,
                                    isSpoiler: !!unsyncedItem.isSpoiler,
                                    parentId: unsyncedItem.parentId || null,
                                    episodeInfo: unsyncedItem.episodeInfo || '',
                                    user: {
                                        displayName: unsyncedItem.name || 'Người dùng',
                                        name: unsyncedItem.name || 'Người dùng',
                                        email: unsyncedItem.email || '',
                                        avatarUrl: unsyncedItem.avatarUrl || '',
                                        equippedFrameUrl: unsyncedItem.equippedFrameUrl || '',
                                        equippedFrameClass: unsyncedItem.equippedFrameClass || '',
                                        equippedColor: unsyncedItem.equippedColor || 'color_default',
                                        role: unsyncedItem.userRole || 'user',
                                        level: unsyncedItem.level || 15,
                                        badge: unsyncedItem.badge || ''
                                    }
                                })
                            });
                            const data = await res.json();
                            if (data && data.success && data.data) {
                                unsyncedItem.id = String(data.data._id);
                                localStorage.setItem(localKey, JSON.stringify(localList));
                            }
                        } catch(e) {}
                    });
                }
            }

            // Combine backend + local comments deduplicated by ID & content+timestamp
            const combinedMap = new Map();
            serverList.forEach(c => combinedMap.set(c.id, c));
            localList.forEach(c => {
                if (!combinedMap.has(c.id)) {
                    // Check if server already has equivalent comment
                    const isDupe = serverList.some(s => s.email === c.email && s.text === c.text && Math.abs(new Date(s.timestamp) - new Date(c.timestamp)) < 15000);
                    if (!isDupe) {
                        combinedMap.set(c.id, c);
                    }
                }
            });

            let rawList = Array.from(combinedMap.values());

            // Build nested tree
            const commentMap = {};
            const topLevelComments = [];

            rawList.forEach(c => {
                commentMap[c.id] = { ...c, replies: c.replies ? [...c.replies] : [] };
            });

            rawList.forEach(c => {
                if (c.parentId && commentMap[c.parentId]) {
                    commentMap[c.parentId].replies.push(commentMap[c.id]);
                } else if (!c.parentId) {
                    topLevelComments.push(commentMap[c.id]);
                }
            });

            // Sort: oldest top, newest bottom (or chronological order)
            topLevelComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // Apply stored reactions & user reaction state
            const storedReactions = getStoredReactions(slug);
            const user = getCurrentUser();
            let uKey = user ? (user.email || user.id || user._id) : (localStorage.getItem('ap_guest_react_id') || '');

            function applyReactions(c) {
                if (!c.reactions) {
                    c.reactions = {};
                    if (c.likedBy && Array.isArray(c.likedBy)) {
                        c.reactions.like = Array.from(c.likedBy);
                    }
                }
                if (storedReactions[c.id]) {
                    for (const [rType, uList] of Object.entries(storedReactions[c.id])) {
                        if (!c.reactions[rType]) c.reactions[rType] = [];
                        if (Array.isArray(uList)) {
                            uList.forEach(u => {
                                if (!c.reactions[rType].includes(u)) c.reactions[rType].push(u);
                            });
                        }
                    }
                }
                c.userReaction = null;
                if (uKey) {
                    for (const [rType, uList] of Object.entries(c.reactions)) {
                        if (Array.isArray(uList) && uList.includes(uKey)) {
                            c.userReaction = rType;
                            break;
                        }
                    }
                }
                if (c.replies && Array.isArray(c.replies)) {
                    c.replies.forEach(applyReactions);
                }
            }

            topLevelComments.forEach(applyReactions);

            let totalCount = topLevelComments.length;
            topLevelComments.forEach(tc => { if(tc.replies) totalCount += tc.replies.length; });

            cb({ comments: topLevelComments, count: totalCount });
        }

        listen(slug, cb) {
            this.currentSlug = slug;
            this._lastCb = cb;
            this.fetchData(slug, cb);
            
            // 1. Realtime Server-Sent Events (SSE) Stream
            if (typeof EventSource !== 'undefined') {
                if (this.eventSource) {
                    try { this.eventSource.close(); } catch(e) {}
                }
                try {
                    this.eventSource = new EventSource(`/api/comments/stream/${encodeURIComponent(slug)}`);
                    this.eventSource.addEventListener('new_comment', () => {
                        this.fetchData(slug, cb);
                    });
                    this.eventSource.addEventListener('reaction_updated', () => {
                        this.fetchData(slug, cb);
                    });
                    this.eventSource.addEventListener('comment_deleted', () => {
                        this.fetchData(slug, cb);
                    });
                    this.eventSource.onerror = () => {
                        // Will automatically reconnect or use fallback polling
                    };
                } catch(e) {
                    console.warn('[CommentsSSE] Stream init warning:', e);
                }
            }

            // 2. Cross-tab Broadcast Channel
            if (typeof BroadcastChannel !== 'undefined') {
                if (this._bc) {
                    try { this._bc.close(); } catch(e) {}
                }
                try {
                    this._bc = new BroadcastChannel('ap_movie_comments');
                    this._bc.onmessage = (e) => {
                        if (e.data && e.data.slug === slug) {
                            this.fetchData(slug, cb);
                        }
                    };
                } catch(e) {}
            }

            // 3. Fallback active polling (every 5 seconds)
            if (this.pollInterval) clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => this.fetchData(slug, cb), 5000);
        }

        stopListen() { 
            if (this.eventSource) {
                try { this.eventSource.close(); } catch(e) {}
                this.eventSource = null;
            }
            if (this._bc) {
                try { this._bc.close(); } catch(e) {}
                this._bc = null;
            }
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
                this.pollInterval = null;
            }
        }
    }

    if(!window.firebaseComments) {
        window.firebaseComments = new APIComments();
    }

    // ════════════════════════════════════════════════════════════════════
    // ── UI CONTROLLER ─────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('ap-cmt-css-v4')) return;
        const s = document.createElement('style');
        s.id = 'ap-cmt-css-v4';
        s.textContent = `
        /* ── Wrapper ── */
        .ap-cmt-wrapper { margin-top:0; }

        /* ── BOX CHƯA ĐĂNG NHẬP (LẤY LẠI GIAO DIỆN CŨ) ── */
        .ap-cmt-guest {
            padding: 32px 20px; text-align: center;
            background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12);
            border-radius: 16px; margin-bottom: 24px;
        }
        .ap-guest-icon { font-size: 48px; margin-bottom: 12px; color: rgba(255,255,255,0.3); }
        .ap-cmt-guest h4 { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .ap-cmt-guest p { font-size: 13px; color: #9ca3af; margin-bottom: 20px; }
        .ap-guest-btns { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
        .ap-btn-login {
            display:inline-flex; align-items:center; gap:6px;
            padding: 10px 24px; border-radius: 24px;
            background: #fcd576; color: #1a1200;
            font-weight: 700; font-size: 14px; text-decoration: none; transition: background 0.2s; border:none; cursor:pointer;
        }
        .ap-btn-login:hover { background: #e0b84e; }
        .ap-btn-register {
            display:inline-flex; align-items:center; gap:6px;
            padding: 10px 24px; border-radius: 24px;
            background: rgba(255,255,255,0.08); color: #fff;
            font-weight: 600; font-size: 14px; text-decoration: none; border: 1px solid rgba(255,255,255,0.15);
            transition: background 0.2s; cursor:pointer;
        }
        .ap-btn-register:hover { background: rgba(255,255,255,0.14); }

        /* ── BOX ĐÃ ĐĂNG NHẬP (LẤY LẠI GIAO DIỆN CŨ ĐẸP) ── */
        .ap-cmt-form-logged {
            background: rgba(30, 33, 42, 0.85); 
            border: 1px solid rgba(255, 255, 255, 0.05); 
            border-radius: 20px; 
            overflow: hidden; 
            transition: all 0.3s ease; 
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }
        .ap-cmt-form-logged:focus-within { 
            border-color: rgba(252, 213, 118, 0.3); 
            box-shadow: 0 8px 32px rgba(252, 213, 118, 0.05);
        }
        .ap-form-user-bar {
            display: flex; align-items: center; gap: 10px; padding: 14px 18px 4px 18px;
            background: transparent; border-bottom: none;
        }
        .ap-form-user-ava {
            width: 32px; height: 32px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 13px; color: #fff; flex-shrink:0;
            position: relative; overflow: visible;
        }
        .ap-form-user-name { font-size: 13px; font-weight: 600; color: #fff; }
        .ap-form-user-badge {
            font-size: 11px; color: #10b981; font-weight:500;
            background: rgba(16,185,129,0.12); padding: 2px 8px; border-radius: 12px;
        }
        .ap-form-logout-btn {
            margin-left: auto; font-size: 11px; color: #6b7280;
            background: none; border: none; cursor: pointer;
            padding: 4px 8px; border-radius: 8px; transition: color 0.2s;
        }
        .ap-form-logout-btn:hover { color: #ef4444; }

        .ap-cmt-textarea {
            width: 100%; box-sizing: border-box !important; background: transparent; border: none; outline: none;
            color: #e5e7eb; font-size: 14px; line-height: 1.6;
            padding: 10px 18px; resize: none; font-family: inherit;
            box-sizing: border-box; min-height: 60px; max-height: 160px;
            -webkit-appearance: none; box-shadow: none !important; border-radius: 0;
            overflow-y: auto;
        }
        .ap-cmt-textarea::placeholder { color: #6b7280; font-weight: 400; }

        .ap-form-footer-wrap {
            display: flex; flex-direction: column;
            background: rgba(0, 0, 0, 0.15); /* Seamless slight contrast */
            padding: 12px 18px;
            border-top: 1px solid rgba(255,255,255,0.03);
        }

        .ap-form-footer { flex-wrap: wrap; gap: 8px;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0; border-top: none;
        }
        
        /* Chuyển Slider UI (Spoiler Toggle) của cũ */
        .ap-spoiler-row {
            display: flex; align-items: center; gap: 10px; padding: 0 0 12px 0; border-top: none;
        }
        .ap-toggle-wrap { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
        .ap-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .ap-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .ap-toggle-track { position: absolute; inset: 0; background: #4b5563; border-radius: 20px; transition: background 0.25s; }
        .ap-toggle input:checked + .ap-toggle-track { background: #fcd576; }
        .ap-toggle-thumb {
            position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; 
            border-radius: 50%; background: #fff; transition: transform 0.25s; pointer-events: none;
        }
        .ap-toggle input:checked ~ .ap-toggle-thumb { transform: translateX(16px); }
        .ap-spoiler-label { font-size: 13px; color: #9ca3af; }
        .ap-spoiler-label.active { color: #fcd576; font-weight: 600; }

        .ap-char-count { font-size: 11px; color: #6b7280; }
        .ap-send-btn { white-space: nowrap; flex-shrink: 0;
            display: flex; align-items: center; gap: 6px;
            padding: 8px 20px; border-radius: 20px;
            background: #fcd576; color: #1a1200;
            font-weight: 700; font-size: 13px; border: none;
            cursor: pointer; transition: all 0.2s;
        }
        .ap-send-btn:hover { background: #e0b84e; transform: scale(1.02); }
        .ap-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        
        /* ── MODERN EMOJI & GIF SELECTOR (MATCHING USER REFERENCE) ── */
        .ap-emoji-select { position: relative; display: inline-flex; align-items: center; }
        .ap-btn-emoji-trigger {
            display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 20px;
            background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
            color: #fcd576; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
            user-select: none;
        }
        .ap-btn-emoji-trigger:hover {
            background: rgba(252, 213, 118, 0.15); border-color: rgba(252, 213, 118, 0.4);
            transform: translateY(-1px);
        }
        .ap-emoji-popover {
            position: absolute; bottom: calc(100% + 10px); left: 0;
            width: 290px; max-width: 90vw; background: #141724;
            border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 18px;
            padding: 14px 14px 12px 14px; box-shadow: 0 16px 45px rgba(0, 0, 0, 0.75), 0 0 20px rgba(0, 0, 0, 0.4);
            opacity: 0; visibility: hidden; transform: translateY(12px) scale(0.96);
            transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 99999;
            backdrop-filter: blur(14px); box-sizing: border-box;
        }
        .ap-emoji-popover.show {
            opacity: 1; visibility: visible; transform: translateY(0) scale(1); pointer-events: auto;
        }
        .ap-emoji-grid {
            display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px;
        }
        .ap-emoji-item {
            display: flex; align-items: center; justify-content: center;
            width: 46px; height: 46px; border-radius: 12px; font-size: 24px; line-height: 1;
            cursor: pointer; background: transparent; border: none;
            transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease;
            user-select: none; padding: 0;
        }
        .ap-emoji-item:hover {
            background: rgba(255, 255, 255, 0.12); transform: scale(1.25);
        }
        .ap-emoji-item:active { transform: scale(0.95); }

        /* GIF Button & Panel */
        .ap-gif-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 6px;
            padding: 8px 16px; border-radius: 10px; background: #1e2233;
            border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1;
            font-size: 13px; font-weight: 800; letter-spacing: 0.5px;
            cursor: pointer; transition: all 0.2s ease; width: 100%; box-sizing: border-box;
        }
        .ap-gif-btn:hover {
            background: #282e44; color: #ffffff; border-color: rgba(252, 213, 118, 0.5);
            transform: translateY(-1px);
        }
        .ap-gif-grid {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
            max-height: 220px; overflow-y: auto; padding-right: 4px; margin-bottom: 8px;
        }
        .ap-gif-item {
            border-radius: 10px; overflow: hidden; cursor: pointer;
            border: 1.5px solid rgba(255, 255, 255, 0.08); transition: all 0.2s ease;
            aspect-ratio: 16/10; background: #0f121d;
        }
        .ap-gif-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ap-gif-item:hover { border-color: #fcd576; transform: scale(1.04); }

        /* Light Mode Overrides for Emoji & GIF Popover */
        html.light-mode .ap-emoji-popover {
            background: #ffffff !important; border-color: #e2e8f0 !important;
            box-shadow: 0 16px 40px rgba(78, 64, 45, 0.2) !important;
        }
        html.light-mode .ap-emoji-item:hover { background: #f1f5f9 !important; }
        html.light-mode .ap-gif-btn {
            background: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #334155 !important;
        }
        html.light-mode .ap-gif-btn:hover {
            background: #e2e8f0 !important; color: #0f172a !important; border-color: #d97706 !important;
        }
        html.light-mode .ap-btn-emoji-trigger {
            background: #f8fafc !important; border-color: #cbd5e1 !important; color: #d97706 !important;
        }
        html.light-mode .ap-btn-emoji-trigger:hover {
            background: #f1f5f9 !important; border-color: #d97706 !important;
        }

        /* Attached GIF Live Preview in Input Box */
        .ap-attached-gif-wrap {
            position: relative; width: fit-content; max-width: 220px;
            margin: 10px 0 6px 0; border-radius: 12px; overflow: hidden;
            border: 1.5px solid rgba(252, 213, 118, 0.45);
            box-shadow: 0 4px 18px rgba(0,0,0,0.5); background: #0b0d14;
            animation: apGifFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes apGifFadeIn {
            from { opacity: 0; transform: scale(0.92) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .ap-gif-remove-btn {
            position: absolute; top: 6px; right: 6px;
            background: rgba(0,0,0,0.75); color: #ffffff;
            border: 1px solid rgba(255,255,255,0.3); border-radius: 50%;
            width: 24px; height: 24px; font-size: 11px; font-weight: 700; line-height: 1;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(4px); transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .ap-gif-remove-btn:hover {
            background: #ef4444; color: #ffffff; border-color: #ef4444; transform: scale(1.15);
        }


        /* ── GIAO DIỆN BÌNH LUẬN TRẢ LỜI ĐẸP & THANH LỊCH NHƯ TIKTOK/YOUTUBE ── */
        .ap-cmt-list { 
            display: flex; flex-direction: column; text-align: left; gap: 14px;
            max-width: 100%;
            min-height: 140px;
            max-height: 850px;
            overflow-y: auto;
            overflow-x: visible !important;
            padding: 20px 4px 24px 4px !important;
            background: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            scroll-behavior: smooth;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        html.light-mode .ap-cmt-list, body.light-mode .ap-cmt-list {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        .ap-cmt-list::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
        .ap-cmt-list::-webkit-scrollbar-track { display: none !important; background: transparent !important; }
        .ap-cmt-list::-webkit-scrollbar-thumb { display: none !important; background: transparent !important; }
        .ap-cmt-item { 
            display: flex; flex-direction: column; gap: 8px; padding: 8px 0; 
            background: transparent;
            border: none; border-radius: 0;
            position:relative; align-items: flex-start; text-align: left;
            overflow: visible !important;
            width: 100%;
            box-sizing: border-box;
        }
        
        .ap-cmt-main-row {
            display: flex; gap: 8px; width: 100%; align-items: flex-start;
            overflow: visible !important;
        }
        
        /* ── Header Tab Switcher (Bình luận / Đánh giá) ── */
        .ap-cmt-tabs-wrap {
            display: inline-flex; align-items: center;
            background: #12141d; border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px; padding: 2px; user-select: none;
        }
        .ap-cmt-tab-btn {
            padding: 4px 14px; border-radius: 6px;
            font-size: 13px; font-weight: 600;
            background: transparent; color: #cbd5e1;
            border: none; cursor: pointer; transition: all 0.2s;
        }
        .ap-cmt-tab-btn.active {
            background: #ffffff; color: #000000; font-weight: 700;
        }
        .ap-cmt-icon { fill: #ffffff; }
        .ap-cmt-title { color: #ffffff; }
        .ap-cmt-count { color: #cbd5e1; }

        /* Light Mode Header Tab Switcher Overrides */
        html.light-mode .ap-cmt-tabs-wrap {
            background: #eae3d5 !important;
            border: 1px solid #d6cebf !important;
        }
        html.light-mode .ap-cmt-tab-btn {
            color: #57534e !important;
        }
        html.light-mode .ap-cmt-tab-btn.active {
            background: #ffffff !important;
            color: #1c1917 !important;
            font-weight: 800 !important;
            box-shadow: 0 2px 6px rgba(78, 64, 45, 0.12) !important;
        }
        html.light-mode .ap-cmt-icon { fill: #1c1917 !important; }
        html.light-mode .ap-cmt-title { color: #1c1917 !important; }
        html.light-mode .ap-cmt-count { color: #57534e !important; }

        /* ── AVATAR FRAME v9 INTEGRATION ── */
        .ap-cmt-avatar, .ap-form-user-ava, .shop-frame-wrap, .user-avatar-frame-wrap {
            overflow: visible !important;
        }
        .ap-cmt-avatar, .ap-form-user-ava {
            flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1;
        }
        /* Overwrite size-sm specifically for comment context */
        .ap-cmt-avatar.shop-frame-wrap.size-sm { 
            width: 38px !important; 
            height: 38px !important; 
            min-width: 38px !important;
            max-width: 38px !important;
            overflow: visible !important;
        }
        .ap-form-user-ava.shop-frame-wrap.size-sm { 
            width: 38px !important; 
            height: 38px !important; 
            min-width: 38px !important;
            max-width: 38px !important;
            overflow: visible !important;
        }
        .ap-cmt-avatar img, .ap-form-user-ava img {
            width: 100% !important; height: 100% !important; border-radius: 50% !important; object-fit: cover !important; position: relative; z-index: 1;
        }
        
        .ap-cmt-body { flex: 1; min-width: 0; overflow: visible !important; display:flex; flex-direction:column; align-items: flex-start; text-align: left; margin-left: 0; position: relative; }
        
        .ap-cmt-info { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; flex-wrap:wrap; width: 100%;}
        .ap-cmt-badge { font-size: 8px; font-weight: 700; color: #10b981; border: 1px solid rgba(16,185,129,0.5); padding: 1px 4px; border-radius: 4px; background: rgba(16,185,129,0.1); letter-spacing: 0.5px; }
        .ap-cmt-name { font-weight: 600; font-size: 13.5px; color: #fff; display:flex; align-items:center; gap:4px; letter-spacing: 0.1px; }
        .ap-cmt-name .infinity { color: #f59e0b; font-size: 13px; font-weight:bold; line-height: 1;}
        
        .ap-ep-tag { 
            font-size: 11px; font-weight: 700; padding: 2.5px 8px; border-radius: 6px; 
            background: rgba(252, 213, 118, 0.15); color: #fcd576; border: 1px solid rgba(252, 213, 118, 0.35); 
            display: inline-flex; align-items: center; gap: 4px; margin-left: auto; line-height: 1.2;
        }
        .ap-ep-tag svg { width: 10px; height: 10px; fill: currentColor; flex-shrink: 0; }
        
        html.light-mode .ap-ep-tag, body.light-mode .ap-ep-tag {
            background: rgba(245, 158, 11, 0.14) !important;
            color: #b45309 !important;
            border: 1px solid rgba(217, 119, 6, 0.45) !important;
            font-weight: 700 !important;
        }
        html.light-mode .ap-ep-tag svg, body.light-mode .ap-ep-tag svg {
            fill: #b45309 !important;
        }

        .ap-cmt-text { 
            font-size: 15px; font-weight: 400; color: #FFFFFF; line-height: 1.45; margin-bottom: 4px; margin-top: 2px;
            white-space: pre-wrap; word-break: break-word; transition: filter 0.3s;
            text-align: left; width: 100%; box-sizing: border-box !important;
            background: transparent; padding: 0; border-radius: 0;
            display: inline-block; max-width: 100%;
        }
        .ap-cmt-text.is-spoiler { filter: blur(6px); cursor: pointer; user-select: none; }
        .ap-cmt-text.is-spoiler.revealed { filter: blur(0); }

        .ap-cmt-actions-bottom { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; position: relative; z-index: 50; overflow: visible !important; }
        .ap-cmt-time { font-size: 12px; color: #9ca3af; }
        .ap-action-reply-btn { background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 13px; font-weight: 600; padding: 2px 4px; border-radius: 4px; transition: color 0.15s; }
        .ap-action-reply-btn:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.06); }
        
        /* ── LIGHT MODE CONTRAST OVERRIDES (IMAGE 1 & 4) ── */
        html.light-mode .ap-cmt-text, body.light-mode .ap-cmt-text {
            color: #1e293b !important;
        }
        html.light-mode .ap-cmt-name, body.light-mode .ap-cmt-name {
            color: #0f172a !important;
        }
        html.light-mode .ap-action-reply-btn, body.light-mode .ap-action-reply-btn {
            color: #334155 !important;
            font-weight: 700 !important;
        }
        html.light-mode .ap-action-reply-btn:hover, body.light-mode .ap-action-reply-btn:hover {
            color: #0284c7 !important;
            background: rgba(0, 0, 0, 0.05) !important;
        }
        html.light-mode .ap-cmt-time, body.light-mode .ap-cmt-time {
            color: #475569 !important;
            font-weight: 600 !important;
        }
        html.light-mode .fb-dot, body.light-mode .fb-dot {
            color: #64748b !important;
            font-weight: 700 !important;
        }
        html.light-mode .ap-cmt-notice-text, body.light-mode .ap-cmt-notice-text {
            color: #334155 !important;
        }
        html.light-mode .ap-cmt-notice-sub, body.light-mode .ap-cmt-notice-sub {
            color: #64748b !important;
        }
        html.light-mode .ap-cmt-textarea, body.light-mode .ap-cmt-textarea {
            color: #0f172a !important;
        }
        html.light-mode .ap-cmt-textarea::placeholder, body.light-mode .ap-cmt-textarea::placeholder {
            color: #64748b !important;
        }
        /* ── LIGHT MODE: Ẩn viền hộp bình luận trên nền kem ── */
        html.light-mode .ap-cmt-form-logged, body.light-mode .ap-cmt-form-logged {
            background: rgba(255, 252, 245, 0.7) !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }
        html.light-mode .ap-cmt-form-logged:focus-within, body.light-mode .ap-cmt-form-logged:focus-within {
            border: none !important;
            box-shadow: none !important;
        }
        html.light-mode .ap-form-footer-wrap, body.light-mode .ap-form-footer-wrap {
            background: rgba(0,0,0,0.04) !important;
            border-top: 1px solid rgba(0,0,0,0.05) !important;
        }
        html.light-mode .ap-form-user-name, body.light-mode .ap-form-user-name {
            color: #1c1917 !important;
        }
        html.light-mode .ap-form-logout-btn, body.light-mode .ap-form-logout-btn {
            color: #78716c !important;
        }
        html.light-mode .ap-char-count, body.light-mode .ap-char-count {
            color: #78716c !important;
        }
        
        .ap-cmt-right-actions { display: none !important; }

        /* ── USER NAME ALIGNMENT & SIZING FIX (IMAGE 1 & 4) ── */
        .ap-cmt-user-highlight {
            font-size: 14px !important;
            font-weight: 700 !important;
            display: inline-flex !important;
            align-items: center !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .ap-cmt-user-highlight.has-custom-name-color {
            font-size: 14px !important;
            display: inline-flex !important;
            align-items: center !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
        }
        .ap-cmt-notice-user-row {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            flex-wrap: wrap !important;
            line-height: 1.2 !important;
        }
        .ap-cmt-notice-user-row .ap-user-badge-tag,
        .ap-cmt-notice-user-row .ap-cmt-badge-wrap {
            display: inline-flex !important;
            align-items: center !important;
            vertical-align: middle !important;
            transform: translateY(2px) !important;
        }
        .ap-cmt-name.has-custom-name-color {
            font-size: 13px !important;
            transform: translateY(-1px) !important;
        }

        /* ── FACEBOOK REACTION POPOVER & BUTTONS (SILKY SMOOTH + INSTANT TOOLTIP) ── */
        .fb-reaction-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
            overflow: visible !important;
            z-index: 100;
        }
        
        .fb-reaction-popover {
            position: absolute;
            bottom: calc(100% + 10px);
            left: 0px;
            display: flex;
            align-items: center;
            gap: 6px;
            background: #242526;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 36px;
            padding: 6px 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            opacity: 0;
            visibility: hidden;
            transform: translateY(6px) scale(0.9);
            transform-origin: bottom left;
            transition: opacity 0.1s ease, transform 0.1s ease, visibility 0.1s;
            transition-delay: 0.12s;
            z-index: 99999;
            pointer-events: auto;
            overflow: visible !important;
            will-change: transform, opacity;
        }

        /* Invisible hover bridge extending 28px downward to cover the gap above the Thích button */
        .fb-reaction-popover::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            height: 28px;
            background: transparent;
        }

        html.light-mode .fb-reaction-popover {
            background: #ffffff !important;
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.1) !important;
        }

        .fb-reaction-wrap:hover .fb-reaction-popover,
        .fb-reaction-popover:hover {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
            transition-delay: 0s !important;
        }

        .fb-react-btn {
            position: relative;
            background: transparent !important;
            border: none !important;
            cursor: pointer;
            padding: 2px 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            outline: none;
            box-shadow: none !important;
            overflow: visible !important;
            transform: translateZ(0);
            will-change: transform;
            transition: transform 0.12s cubic-bezier(0.2, 0.9, 0.3, 1.3);
        }

        .fb-react-icon-anim {
            font-size: 26px;
            line-height: 1;
            display: inline-block;
            transform: translateZ(0);
            transition: transform 0.12s cubic-bezier(0.2, 0.9, 0.3, 1.3);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
        }

        .fb-react-btn:hover {
            transform: scale(1.36) translateY(-6px);
            z-index: 100000;
        }

        .fb-react-tooltip {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.92);
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 9px;
            border-radius: 20px;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
            z-index: 100001;
            transition: none !important;
        }

        .fb-react-btn:hover .fb-react-tooltip {
            opacity: 1 !important;
            visibility: visible !important;
        }

        .fb-like-trigger-btn {
            background: transparent !important;
            border: none !important;
            color: #94a3b8;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            transition: color 0.15s;
        }

        html.light-mode .fb-like-trigger-btn {
            color: #57534e !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }

        .fb-like-trigger-btn:hover {
            color: #38bdf8 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }

        html.light-mode .fb-like-trigger-btn:hover {
            color: #0284c7 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }

        .fb-like-trigger-btn.active {
            color: #38bdf8;
            font-weight: 700;
        }

        .fb-reaction-count-pill {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            font-size: 12px;
            color: #cbd5e1;
            cursor: pointer;
        }

        html.light-mode .fb-reaction-count-pill {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: #44403c !important;
        }

        .fb-count-icons {
            display: inline-flex;
            align-items: center;
            margin-right: 2px;
        }

        .fb-count-icon {
            font-size: 13px;
            line-height: 1;
            margin-left: -3px;
        }
        .fb-count-icon:first-child {
            margin-left: 0;
        }

        .fb-dot {
            color: #64748b;
            font-size: 10px;
        }

        /* ── VIVID GREEN SPOILER TOGGLE SWITCH (IMAGE 2) ── */
        .ap-toggle { position: relative; width: 34px; height: 19px; display: inline-flex; align-items: center; flex-shrink: 0; }
        .ap-toggle-track {
            position: absolute; inset: 0;
            background: #334155; border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px; transition: all 0.22s ease;
        }
        .ap-toggle-thumb {
            position: absolute; top: 2px; left: 2px;
            width: 13px; height: 13px; border-radius: 50%;
            background: #94a3b8; transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            pointer-events: none;
        }
        .ap-toggle input:checked ~ .ap-toggle-track {
            background: #10b981 !important; border-color: #059669 !important;
        }
        .ap-toggle input:checked ~ .ap-toggle-thumb {
            transform: translateX(15px) !important; background: #ffffff !important;
        }
        .ap-spoiler-label {
            font-size: 13px; color: #94a3b8; transition: color 0.2s; font-weight: 500;
        }
        .ap-spoiler-label.active {
            color: #10b981 !important; font-weight: 700 !important;
        }

        /* Light Mode Toggle Overrides (Image 2) */
        html.light-mode .ap-toggle-track {
            background: #e2e8f0 !important;
            border: 1px solid #cbd5e1 !important;
        }
        html.light-mode .ap-toggle-thumb {
            background: #64748b !important;
        }
        html.light-mode .ap-toggle input:checked ~ .ap-toggle-track {
            background: #10b981 !important;
            border-color: #059669 !important;
        }
        html.light-mode .ap-toggle input:checked ~ .ap-toggle-thumb {
            background: #ffffff !important;
        }
        html.light-mode .ap-spoiler-label {
            color: #475569 !important;
            font-weight: 600 !important;
        }
        html.light-mode .ap-spoiler-label.active {
            color: #059669 !important;
            font-weight: 700 !important;
        }

        .ap-btn-ava:hover { background: rgba(255,255,255,0.12) !important; }
        .ap-send-btn:not(:disabled):hover { opacity: 0.85; transform: scale(1.02); }

        /* ── DESKTOP ONLY TWEAKS (>= 768px) ── */
        @media (min-width: 768px) {
            .ap-cmt-avatar.shop-frame-wrap.size-sm { width: 34px; height: 34px; }
            .ap-cmt-list { max-width: 720px; }
            .ap-cmt-item { border-bottom: none !important; padding: 10px 0 !important; transition: none; background: transparent !important; }
            .ap-cmt-item:last-child { border-bottom: none !important; }
            .ap-cmt-item:hover { background: transparent !important; border-bottom-color: transparent !important; box-shadow: none !important; }
            
            .ap-cmt-name { font-size: 13px; font-weight: bold; }
            .ap-cmt-text { font-size: 14px; }
            .ap-cmt-time { font-size: 12px; }
            .ap-action-reply-btn { font-size: 12px; }
            
            .ap-cmt-right-actions { flex-direction: row; gap: 12px; margin-left: 12px; width: auto; align-items: center; justify-content: flex-end; }
            .ap-right-btn { flex-direction: row; gap: 4px; font-size: 12px; color: #9ca3af; }
            .ap-right-btn .material-icons-round { font-size: 16px; }
        }

        /* Dropdown Thêm */
        .ap-dropdown-wrap { position: relative; }
        .ap-dropdown-menu {
            position: absolute; bottom: 100%; right: 0; left: auto; margin-bottom: 8px;
            background: #ffffff; border-radius: 8px; padding: 6px 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 50; min-width: 160px; pointer-events: none;
            opacity: 0; transform: translateY(10px); transition: all 0.2s ease;
        }
        .ap-dropdown-menu.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .ap-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 16px; background: none; border: none; font-size: 14px; color: #1f2937; cursor: pointer; }
        .ap-dropdown-item:hover { background: #f3f4f6; }
        .ap-dropdown-item .material-icons-round { font-size: 18px; color: #4b5563; }

        /* Nested Comments Layout (No Left Vertical Border) */
        .ap-cmt-replies { 
            display: flex; flex-direction: column;
            margin-left: 36px;
            padding-left: 0;
            border-left: none !important;
            border: none !important;
            gap: 6px; 
            margin-top: 4px;
        }
        html.light-mode .ap-cmt-replies {
            border-left: none !important;
            border: none !important;
        }
        .ap-cmt-replies .ap-cmt-item { padding: 4px 0; background: transparent; }
        .ap-cmt-replies .ap-cmt-avatar.shop-frame-wrap.size-sm { width: 28px; height: 28px; }
        .ap-cmt-replies .ap-cmt-name { font-size: 12px; }
        .ap-cmt-replies .ap-cmt-text { font-size: 13px; }
        .ap-cmt-replies .ap-cmt-time { font-size: 11px; }
        .ap-more-replies-btn { color: #9ca3af; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; margin-top: 4px; }
        .ap-more-replies-btn .line { width: 20px; height: 1px; background: #4b5563; margin-right: 8px; }
        
        /* Form Trả lời lồng nhau */
        .ap-reply-form-container { margin-top: 16px; display: none; margin-bottom: 8px; width: 100%; margin-left: 52px; box-sizing: border-box; padding-right: 52px;}
        .ap-reply-form-container.active { display: block; animation: ap-in 0.2s ease; }

        @keyframes ap-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

        /* Toast */
        #ap-cmt-toast {
            position:fixed; bottom:80px; left:50%; transform:translateX(-50%) translateY(20px);
            padding:10px 20px; border-radius:24px; font-size:13px; font-weight:600;
            z-index:9999; opacity:0; transition:all 0.3s; white-space:nowrap;
            box-shadow:0 4px 20px rgba(0,0,0,0.3); color:#fff; pointer-events:none;
        }

        /* =================================================================
           MOBILE FIX — chỉ khóa scroll ngang, không phá layout chữ
           ================================================================= */

        @media (max-width: 768px) {
            /* Cấp page: KHÔNG cho scroll ngang (Chỉ áp dụng trên mobile) */
            body {
                overflow-x: hidden !important;
                max-width: 100vw !important;
            }

            .ap-cmt-wrapper {
                padding: 0 4px 50px 4px !important;
                margin-bottom: 30px !important;
                overflow: visible !important;
                width: 100% !important;
                box-sizing: border-box !important;
                max-width: 100% !important;
            }

            .ap-cmt-input-container {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                margin-bottom: 16px !important;
            }

            .ap-cmt-list {
                width: 100% !important;
                max-width: 100% !important;
                max-height: 750px !important;
                overflow-y: auto !important;
                overflow-x: visible !important;
                box-sizing: border-box !important;
                padding: 12px 2px 20px 2px !important;
                background: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }
            .ap-cmt-list::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
            .ap-cmt-list::-webkit-scrollbar-track { display: none !important; background: transparent !important; }
            .ap-cmt-list::-webkit-scrollbar-thumb { display: none !important; background: transparent !important; }

            .ap-cmt-item {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                padding: 8px 0 !important;
                overflow: visible !important;
            }

            .ap-cmt-main-row {
                display: flex !important;
                gap: 8px !important;
                width: 100% !important;
                align-items: flex-start !important;
                overflow: visible !important;
            }

            /* Avatar cố định kích thước & overflow visible để khung cánh/hào quang không bị lấn/cắt */
            .ap-cmt-avatar.shop-frame-wrap.size-sm,
            .ap-form-user-ava.shop-frame-wrap.size-sm {
                width: 36px !important;
                height: 36px !important;
                min-width: 36px !important;
                max-width: 36px !important;
                flex-shrink: 0 !important;
                overflow: visible !important;
            }

            /* Body: canh đều thẳng hàng từ trên xuống */
            .ap-cmt-body {
                flex: 1 !important;
                min-width: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                overflow: visible !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                text-align: left !important;
                margin-left: 0 !important;
            }

            /* Text: word-wrap chuẩn xác, thẳng hàng */
            .ap-cmt-text {
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                white-space: pre-wrap !important;
                font-size: 13.5px !important;
                line-height: 1.45 !important;
                text-align: left !important;
                margin: 3px 0 4px 0 !important;
                padding: 0 !important;
            }

            .ap-cmt-info {
                gap: 6px !important;
                flex-wrap: wrap !important;
                overflow: visible !important;
                align-items: center !important;
                width: 100% !important;
            }

            .ap-cmt-name {
                font-size: 13px !important;
                font-weight: 700 !important;
                line-height: 1.3 !important;
                max-width: 100% !important;
                display: inline-flex !important;
                align-items: center !important;
                flex-wrap: wrap !important;
            }
            .ap-cmt-time { font-size: 11px !important; white-space: nowrap !important; flex-shrink: 0 !important; }
            .ap-ep-tag { display: none !important; }

            .ap-cmt-actions-bottom {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                margin-top: 6px !important;
                flex-wrap: wrap !important;
                position: relative !important;
                z-index: 10 !important;
                overflow: visible !important;
                width: 100% !important;
            }

            .ap-cmt-actions {
                flex-wrap: nowrap !important;
                gap: 0 !important;
                overflow: hidden !important;
            }
            .ap-action-btn {
                padding: 4px 5px !important;
                font-size: 11px !important;
                flex-shrink: 0 !important;
                white-space: nowrap !important;
            }
            .ap-action-btn .action-label { display: none !important; }

            /* Replies */
            .ap-cmt-replies {
                margin-left: 20px !important;
                padding-left: 0 !important;
                border-left: none !important;
                border: none !important;
                margin-top: 6px !important;
                gap: 4px !important;
                box-sizing: border-box !important;
                overflow: visible !important;
            }
            .ap-cmt-replies .ap-cmt-avatar.shop-frame-wrap.size-sm {
                width: 28px !important;
                height: 28px !important;
                min-width: 28px !important;
                max-width: 28px !important;
                overflow: visible !important;
            }

            /* Form */
            .ap-cmt-form-logged, .ap-cmt-guest {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            .ap-form-footer { flex-wrap: wrap !important; gap: 6px !important; padding: 8px 12px !important; }
            .ap-cmt-textarea { font-size: 14px !important; }
            
            .ap-form-user-bar {
                flex-wrap: nowrap !important;
                gap: 6px !important;
                padding: 12px 14px 4px 14px !important;
            }
            .ap-form-user-name {
                font-size: 12px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                max-width: 30vw !important;
            }
            .ap-form-user-badge {
                font-size: 10px !important;
                white-space: nowrap !important;
                padding: 2px 6px !important;
            }
            .ap-form-logout-btn {
                font-size: 10px !important;
                white-space: nowrap !important;
                padding: 4px 6px !important;
                margin-left: auto !important;
            }

            .ap-dropdown-menu { right: 0 !important; left: auto !important; max-width: 80vw !important; }
            .ap-ava-dropdown { right: 0 !important; max-width: 75vw !important; }
        }

        @media (max-width: 390px) {
            .ap-cmt-replies { margin-left: 10px !important; }
            .ap-cmt-name { max-width: 35vw !important; }
        }
        `;
        document.head.insertBefore(s, document.head.firstChild);
    }

    function showToast(msg, type = 'info') {
        let t = document.getElementById('ap-cmt-toast');
        if (!t) { t = document.createElement('div'); t.id = 'ap-cmt-toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
        requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
        clearTimeout(t._t);
        t._t = setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(20px)'; }, 3000);
    }


    const MODERN_COMMENT_EMOJIS = [
        { char: '😊', name: 'Vui vẻ' },
        { char: '😂', name: 'Cười vỡ bụng' },
        { char: '😍', name: 'Mê mẩn' },
        { char: '😭', name: 'Khóc ròng' },
        { char: '😱', name: 'Kinh ngạc' },

        { char: '👍', name: 'Tuyệt vời / Thích' },
        { char: '👎', name: 'Chưa hay' },
        { char: '🔥', name: 'Cháy quá / Siêu phẩm' },
        { char: '👏', name: 'Vỗ tay tán thưởng' },
        { char: '💖', name: 'Tim lấp lánh' },

        { char: '🤔', name: 'Suy ngẫm / Plot twist' },
        { char: '😎', name: 'Ngầu đét' },
        { char: '🍿', name: 'Bắp rang bơ / Hóng phim' },
        { char: '🎬', name: 'Điện ảnh' },
        { char: '💯', name: '100 Điểm hoàn hảo' },

        { char: '🙏', name: 'Hóng tập mới / Cảm ơn' },
        { char: '👑', name: 'Đẳng cấp hoàng gia' },
        { char: '⚡', name: 'Cuốn hút' },
        { char: '🚀', name: 'Đỉnh nóc' },
        { char: '💣', name: 'Bom tấn' }
    ];

    const TRENDING_COMMENT_GIFS = [
        { name: 'Ăn bắp hóng phim', url: 'https://media.giphy.com/media/t3sZxY5zS5B0z5zMIz/giphy.gif' },
        { name: 'Kinh ngạc Wow', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
        { name: 'Bùng nổ Mind blown', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
        { name: 'Vỗ tay Clapping', url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1RwY/giphy.gif' },
        { name: 'Khóc cảm động', url: 'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif' },
        { name: 'Cười vỡ bụng', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
        { name: 'Ngầu thần thái', url: 'https://media.giphy.com/media/62PP2yEIAZF6g/giphy.gif' },
        { name: 'Tuyệt vời 10 điểm', url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' }
    ];

    function renderEmojiPickerHtml(pid) {
        let emojisGrid = MODERN_COMMENT_EMOJIS.map(item => `
            <button type="button" class="ap-emoji-item" title="${item.name}" onclick="window.insertCommentEmoji('${item.char}', '${pid}', event)">
                ${item.char}
            </button>
        `).join('');

        let gifsGrid = TRENDING_COMMENT_GIFS.map(g => `
            <div class="ap-gif-item" title="${g.name}" onclick="window.insertCommentGif('${g.url}', '${pid}', event)">
                <img src="${g.url}" loading="lazy" alt="${g.name}">
            </div>
        `).join('');

        return `
        <div class="ap-emoji-inner-container">
            <!-- Emoji View -->
            <div id="ap-emoji-view-${pid}">
                <div class="ap-emoji-grid">
                    ${emojisGrid}
                </div>
                <button type="button" class="ap-gif-btn" onclick="window.toggleGifView('${pid}', true, event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right:4px;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 9.5H8.5v1h1.5v1H7V9h3v3.5zm3 2.5h-1V9h1v6zm4.5-4h-2v1h1.5v1H16v2h-1V9h2.5v1z"/></svg>
                    <span>GIF</span>
                </button>
            </div>

            <!-- GIF View -->
            <div id="ap-gif-view-${pid}" style="display:none;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08);">
                    <button type="button" style="background:none; border:none; color:#fcd576; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="window.toggleGifView('${pid}', false, event)">
                        <span>⬅ Quay lại</span>
                    </button>
                    <span style="font-size:11.5px; color:#94a3b8; font-weight:600;">GIF Xu hướng</span>
                </div>
                <div class="ap-gif-grid">
                    ${gifsGrid}
                </div>
            </div>
        </div>
        `;
    }

    function formatCommentText(rawText) {
        if (!rawText) return '';
        let formatted = sanitize(rawText);

        // Render [gif:https://...]
        formatted = formatted.replace(/\[gif:(https?:\/\/[^\]\s]+)\]/gi, (match, url) => {
            return `<div class="ap-cmt-gif-wrap" style="margin: 8px 0 4px 0; max-width: 260px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 4px 16px rgba(0,0,0,0.35);"><img src="${url}" loading="lazy" style="width: 100%; height: auto; display: block; object-fit: cover;" alt="GIF"></div>`;
        });

        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    // ── Generate Main Input Box HTML ─────────────────────────────────
    function renderInputForm(boxId, rootId) {
        const user = getCurrentUser();
        const pid = boxId || 'main';
        const submitPid = rootId || boxId || '';

        const displayName = user ? sanitize(user.displayName || user.name || user.email || 'Người dùng') : '';
        const userId = user ? (user._id || user.id || user.email) : '';
        const savedAva = user 
            ? ((typeof avatarService !== 'undefined' ? avatarService.getAvatar(userId) : null)
               || user.avatar
               || user.avatarUrl
               || localStorage.getItem('ap_chosen_avatar')
               || '')
            : '';

        // Load Equipped Name Color & Style
        const nameColorClass = user && typeof getEquippedNameColorClass === 'function' ? getEquippedNameColorClass(user) : '';
        const nameColorStyle = user && typeof getEquippedNameColorStyle === 'function' ? getEquippedNameColorStyle(user) : '';

        // Load Equipped Avatar Frame
        const frameInfo = user && typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(user) : { type: 'none', value: '' };
        const avaInner = savedAva 
            ? `<img src="${savedAva}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` 
            : `<div style="width:100%;height:100%;border-radius:50%;background:#fcd576;color:#1a1000;display:flex;align-items:center;justify-content:center;font-weight:900;">${(displayName.charAt(0) || 'U').toUpperCase()}</div>`;
        const userAvaWithFrame = typeof renderAvatarWithFrame === 'function' 
            ? renderAvatarWithFrame(avaInner, 38, frameInfo) 
            : avaInner;

        // User Badge / Title Sync
        const userBadgeText = typeof getEquippedBadge === 'function' ? getEquippedBadge(user) : (user ? (user.equippedBadge || user.badge || localStorage.getItem('ap_equipped_badge') || (user.role === 'admin' ? 'ADMIN TOP 1' : (user.isVip ? 'VIP PRO' : 'LV.' + (user.level || 15)))) : 'LV.15');
        const userBadgeHtml = typeof renderUserBadgeHtml === 'function' ? renderUserBadgeHtml(userBadgeText) : `<span style="font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.12); color: #cbd5e1; padding: 2px 7px; border-radius: 4px;">${userBadgeText}</span>`;

        const noticeHtml = user 
            ? `<div style="font-size: 13.5px; color: #94a3b8; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 4px 6px 0 6px; overflow: visible !important;" class="ap-cmt-notice-text">
                 <div style="display: inline-flex; align-items: center; gap: 12px; overflow: visible !important;">
                     <div style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 4px 6px; overflow: visible !important;">
                         ${userAvaWithFrame}
                     </div>
                     <div style="display: flex; flex-direction: column; justify-content: center; gap: 2px;">
                         <span style="font-size: 12px; color: #94a3b8; font-weight: 500; line-height: 1.2;" class="ap-cmt-notice-sub">Bình luận với tên</span> 
                         <div class="ap-cmt-notice-user-row" style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; line-height: 1.2;">
                             <strong class="ap-cmt-user-highlight ${nameColorClass}" style="${nameColorStyle}">${displayName}</strong> 
                             <span class="ap-cmt-badge-wrap" style="display: inline-flex; align-items: center; vertical-align: middle; transform: translateY(2px);">${userBadgeHtml}</span>
                         </div>
                     </div>
                 </div>
                 <button style="font-size: 12px; color: #94a3b8; background: none; border: none; cursor: pointer; text-decoration: underline;" onclick="try{ if(typeof authService !== 'undefined') authService.logout(); else { localStorage.removeItem('A Phim_user'); localStorage.removeItem('user'); window.location.reload(); } } catch(e){ window.location.reload(); }">Đăng xuất</button>
               </div>`
            : `<div style="font-size: 13.5px; color: #94a3b8; margin-bottom: 14px; padding: 4px 6px 0 6px;" class="select-none ap-cmt-notice-text">
                 Vui lòng <span style="color: #fcd576; font-weight: 700; cursor: pointer;" onclick="if(window.showAuthModal){window.showAuthModal('login');}else{alert('Vui lòng đăng nhập!');}">đăng nhập</span> để tham gia bình luận.
               </div>`;

        return `
        <div class="ap-cmt-input-container" style="margin-bottom: 20px; width: 100%; box-sizing: border-box; overflow: visible !important;">
            ${noticeHtml}

            <!-- Form Container -->
            <div style="position: relative; width: 100%; background: #181a24; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 14px 16px 12px 16px; transition: border-color 0.2s;" class="focus-within:border-[#fcd576]/50">
                <textarea class="ap-cmt-textarea" 
                          id="ap-input-${pid}" 
                          placeholder="Viết bình luận..." 
                          maxlength="1000" 
                          rows="3" 
                          style="width: 100%; background: transparent; border: none; outline: none; color: #e2e8f0; font-size: 14px; resize: none; font-family: inherit; box-sizing: border-box; padding-right: 65px; min-height: 70px;"></textarea>
                <span class="ap-char-count" id="ap-count-${pid}" style="position: absolute; top: 14px; right: 24px; font-size: 11px; color: #64748b; font-weight: 500; user-select: none;">0 / 1000</span>

                <!-- Attached GIF Live Preview Card -->
                <div class="ap-attached-gif-wrap" id="ap-gif-preview-${pid}" style="display: none;">
                    <img id="ap-gif-preview-img-${pid}" src="" style="width: 100%; max-height: 150px; display: block; object-fit: cover; border-radius: 10px;" alt="GIF đã chọn">
                    <button type="button" class="ap-gif-remove-btn" onclick="window.removeAttachedGif('${pid}', event)" title="Gỡ GIF">✕</button>
                </div>

                <!-- Bottom Toolbar -->
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                    <!-- Left tools: Toggle + Emoji/GIF Picker -->
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <!-- Spoiler Toggle Switch (Vivid Green Active Indicator) -->
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                            <span class="ap-toggle">
                                <input type="checkbox" id="ap-spoiler-${pid}" style="opacity: 0; width: 0; height: 0; position: absolute;" onchange="const lb=this.closest('label')?.querySelector('.ap-spoiler-label'); if(lb){if(this.checked){lb.classList.add('active');}else{lb.classList.remove('active');}}">
                                <span class="ap-toggle-track"></span>
                                <span class="ap-toggle-thumb"></span>
                            </span>
                            <span class="ap-spoiler-label">Tiết lộ?</span>
                        </label>

                        <!-- Modern Emoji & GIF Button (Matching User Photo Reference) -->
                        <div class="ap-emoji-select" id="ap-emoji-select-${pid}">
                            <button type="button" class="ap-btn-emoji-trigger" onclick="window.toggleEmojiPopover('${pid}', event)">
                                <span style="font-size: 17px; line-height: 1;">😊</span>
                                <span>Biểu cảm</span>
                            </button>
                            <div class="ap-emoji-popover" id="ap-emoji-drop-${pid}">
                                ${renderEmojiPickerHtml(pid)}
                            </div>
                        </div>
                    </div>

                    <!-- Right tool: Submit Button with Gold Text & Gold Paper Plane Icon -->
                    <button type="button" class="ap-send-btn" id="ap-btn-${pid}" onclick="window.submitComment('${submitPid}', '${pid}')" disabled style="display: inline-flex; align-items: center; gap: 6px; background: transparent; border: none; color: #fcd576; font-weight: 700; font-size: 14px; cursor: pointer; padding: 2px 4px; transition: opacity 0.2s;">
                        <span>Gửi</span>
                        <svg style="width: 16px; height: 16px; fill: #fcd576; flex-shrink: 0;" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        </div>
        `;
    }

    // ── Generate Comment List Item ───────────────────────────────────
    function generateHtml(c, userEmail, isChild = false, rootId = null) {
        const initial = sanitize((c.name || 'K').charAt(0).toUpperCase());
        const tAgo = sanitize(timeAgo(c.timestamp));
        const txt = formatCommentText(c.text);
        const localHidden = localStorage.getItem('ap_hide_' + c.id) === '1';
        const hiddenStyle = localHidden ? 'opacity: 0.4; filter: blur(1.5px);' : '';

        const localLiked = localStorage.getItem('ap_like_' + c.id) === '1';
        const baseLikes = (c.likedBy && c.likedBy.length) ? c.likedBy.length : 0;
        let finalLikes = baseLikes + (localLiked && (!c.likedBy || !c.likedBy.includes(userEmail)) ? 1 : 0);
        const likeCountStr = finalLikes > 0 ? finalLikes : '';
        const liked = localLiked;
        const disliked = localHidden;

        // Custom Name Colors for Comment Author
        const currentUser = getCurrentUser();
        let nameColorClass = c.nameColorClass || '';
        let nameColorStyle = c.nameColorStyle || '';
        if (!nameColorClass && c.equippedColor && c.equippedColor !== 'color_default' && c.equippedColor !== 'none') {
            nameColorClass = `ap-nc-${c.equippedColor} has-custom-name-color`;
            if (typeof NAME_COLORS_MAP !== 'undefined' && NAME_COLORS_MAP[c.equippedColor]) {
                nameColorStyle = NAME_COLORS_MAP[c.equippedColor].textStyle || '';
            }
        }
        if (!nameColorClass && currentUser && currentUser.email === c.email) {
            nameColorClass = typeof getEquippedNameColorClass === 'function' ? getEquippedNameColorClass(currentUser) : '';
            nameColorStyle = typeof getEquippedNameColorStyle === 'function' ? getEquippedNameColorStyle(currentUser) : '';
        }

        // Badge / Level / Role rendering via modern SVG badge helper
        const authorBadgeText = c.badge || (c.userRole === 'admin' ? 'ADMIN TOP 1' : (c.level ? ('LV.' + c.level) : 'LV.15'));
        const badgeHtml = typeof renderUserBadgeHtml === 'function' 
            ? renderUserBadgeHtml(authorBadgeText, c.badgeClass) 
            : `<span class="ap-cmt-badge">${sanitize(authorBadgeText)}</span>`;

        // 3D Cosmic Star Icon matching Image 1 in header menu
        const cosmicStarIconHtml = typeof renderCosmicStarSvg === 'function' 
            ? renderCosmicStarSvg(18) 
            : `<span class="ap-vip-modern-badge" title="Thành viên nổi bật" style="display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; vertical-align:middle; margin-left:3px; line-height:1;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="display:block; filter:drop-shadow(0 2px 6px rgba(129,140,248,0.7)); overflow:visible;"><defs><linearGradient id="facetNW_fb" x1="12" y1="1.5" x2="10" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#a5b4fc"/></linearGradient><linearGradient id="facetNE_fb" x1="12" y1="1.5" x2="14" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#e0e7ff"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="facetEN_fb" x1="22.5" y1="12" x2="12" y2="9.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#a855f7"/></linearGradient><linearGradient id="facetES_fb" x1="22.5" y1="12" x2="12" y2="14.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#f472b6"/><stop offset="100%" stop-color="#c026d3"/></linearGradient><linearGradient id="facetSE_fb" x1="12" y1="22.5" x2="14" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#9333ea"/></linearGradient><linearGradient id="facetSW_fb" x1="12" y1="22.5" x2="10" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#4f46e5"/></linearGradient><linearGradient id="facetWS_fb" x1="1.5" y1="12" x2="12" y2="14.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#2563eb"/></linearGradient><linearGradient id="facetWN_fb" x1="1.5" y1="12" x2="12" y2="9.5" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#6366f1"/></linearGradient></defs><polygon points="12,1.5 9.5,9.5 12,12" fill="url(#facetNW_fb)"/><polygon points="12,1.5 14.5,9.5 12,12" fill="url(#facetNE_fb)"/><polygon points="22.5,12 14.5,9.5 12,12" fill="url(#facetEN_fb)"/><polygon points="22.5,12 14.5,14.5 12,12" fill="url(#facetES_fb)"/><polygon points="12,22.5 14.5,14.5 12,12" fill="url(#facetSE_fb)"/><polygon points="12,22.5 9.5,14.5 12,12" fill="url(#facetSW_fb)"/><polygon points="1.5,12 9.5,14.5 12,12" fill="url(#facetWS_fb)"/><polygon points="1.5,12 9.5,9.5 12,12" fill="url(#facetWN_fb)"/><polygon points="12,8.5 13.8,12 12,15.5 10.2,12" fill="#ffffff" opacity="0.9"/><circle cx="20" cy="4" r="1.3" fill="#e0e7ff" opacity="0.95"/><circle cx="4" cy="20" r="1.1" fill="#c084fc" opacity="0.9"/></svg></span>`;

        const currentRootId = rootId || c.id;

        let repliesHtml = '';
        if (c.replies && c.replies.length > 0) {
            let visibleReplies = c.replies.slice(0, 3);
            let hiddenReplies = c.replies.slice(3);
            
            let visibleHtml = visibleReplies.map(r => generateHtml(r, userEmail, true, currentRootId)).join('');
            let hiddenHtml = hiddenReplies.length > 0 ? `<div style="display:none; flex-direction:column; gap:6px;" id="hidden-replies-${c.id}">${hiddenReplies.map(r => generateHtml(r, userEmail, true, currentRootId)).join('')}</div>` : '';
            let moreBtnHtml = hiddenReplies.length > 0 ? `
                <div class="ap-more-replies-btn" id="more-btn-${c.id}" onclick="window.actionToggleReplies('${c.id}', ${hiddenReplies.length})">
                    <div class="line"></div> <span class="btn-text">Xem thêm ${hiddenReplies.length} câu trả lời</span> <span class="material-icons-round btn-icon" style="font-size:16px; margin-left:2px;">expand_more</span>
                </div>
            ` : '';

            repliesHtml = `
            <div class="ap-cmt-replies">
                ${visibleHtml}
                ${hiddenHtml}
                ${moreBtnHtml}
            </div>`;
        }

        // Frame Info
        let frameInfo = { type: 'none', value: '' };
        if (c.equippedFrameUrl || c.frameUrl) {
            frameInfo = { type: 'url', value: c.equippedFrameUrl || c.frameUrl };
        } else if (c.equippedFrameClass || c.frameClass) {
            frameInfo = { type: 'class', value: c.equippedFrameClass || c.frameClass };
        } else if (c.equippedFrame) {
            frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo({ equippedFrame: c.equippedFrame }) : { type: 'none', value: '' };
        } else if (currentUser && currentUser.email === c.email) {
            frameInfo = typeof getEquippedFrameInfo === 'function' ? getEquippedFrameInfo(currentUser) : { type: 'none', value: '' };
        }

        const avaInnerList = c.avatarUrl 
            ? `<img src="${sanitize(c.avatarUrl)}" style="width:100% !important; height:100% !important; border-radius:50% !important; object-fit:cover !important; display:block !important; position:relative; z-index:2;">` 
            : `<div style="width:100%; height:100%; border-radius:50%; background:${sanitize(c.color || '#f59e0b')}; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; position:relative; z-index:2;">${initial}</div>`;

        const userAva = typeof renderAvatarWithFrame === 'function'
            ? renderAvatarWithFrame(avaInnerList, isChild ? 32 : 44, frameInfo)
            : `<div class="ap-cmt-avatar shop-frame-wrap size-sm ${frameInfo.value || ''}" style="z-index:1;">${avaInnerList}</div>`;

        // Build Facebook Reactions data
        const FB_REACTIONS_MAP = {
            like: { name: 'Thích', icon: '👍', color: '#38bdf8' },
            love: { name: 'Yêu thích', icon: '❤️', color: '#f43f5e' },
            care: { name: 'Thương thương', icon: '🥰', color: '#f59e0b' },
            haha: { name: 'HaHa', icon: '😆', color: '#f59e0b' },
            wow: { name: 'Wow', icon: '😮', color: '#f59e0b' },
            sad: { name: 'Buồn', icon: '😢', color: '#f59e0b' },
            angry: { name: 'Phẫn nộ', icon: '😡', color: '#ef4444' }
        };

        let userReactType = c.userReaction || null;
        let reactionsData = c.reactions || {};
        if (!c.reactions && c.likedBy && Array.isArray(c.likedBy)) {
            reactionsData = { like: Array.from(c.likedBy) };
        }

        let totalReactCount = 0;
        const countsByType = [];
        for (const [rId, uList] of Object.entries(reactionsData)) {
            const cnt = Array.isArray(uList) ? uList.length : (typeof uList === 'number' ? uList : 0);
            if (cnt > 0) {
                totalReactCount += cnt;
                countsByType.push({ rId, count: cnt, icon: (FB_REACTIONS_MAP[rId] ? FB_REACTIONS_MAP[rId].icon : '👍') });
            }
        }
        countsByType.sort((a, b) => b.count - a.count);
        const topIconsHtml = countsByType.slice(0, 3).map(item => `<span class="fb-count-icon">${item.icon}</span>`).join('');

        const activeReactObj = userReactType ? FB_REACTIONS_MAP[userReactType] : null;

        return `
        <div class="ap-cmt-item" data-id="${c.id}" style="${hiddenStyle}">
            <div class="ap-cmt-main-row">
                <div style="display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 4px 6px; overflow: visible !important;">
                    ${userAva}
                </div>
                <div class="ap-cmt-body">
                    <div class="ap-cmt-info">
                        ${badgeHtml}
                        <span class="ap-cmt-name ${nameColorClass}" style="${nameColorStyle}">${sanitize(c.name)} ${cosmicStarIconHtml}</span>
                        ${!isChild && c.episodeInfo ? `<span class="ap-ep-tag"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> ${sanitize(c.episodeInfo)}</span>` : ''}
                    </div>
                    
                    <div class="ap-cmt-text ${c.isSpoiler ? 'is-spoiler' : ''}" onclick="this.classList.add('revealed')">${c.isSpoiler ? '<span class="material-icons-round" style="font-size:14px;vertical-align:middle;color:#fcd576">visibility_off</span> <span style="color:#fcd576;font-weight:700">[Bình luận Tiết lộ nội dung - Click để xem]</span><br>' : ''}${txt}</div>
                    
                    <div class="ap-cmt-actions-bottom">
                        <div class="fb-reaction-wrap">
                            <div class="fb-reaction-popover">
                                <button type="button" class="fb-react-btn" aria-label="Thích" onclick="window.actionReact('${c.id}', 'like', event)"><span class="fb-react-icon-anim">👍</span><span class="fb-react-tooltip">Thích</span></button>
                                <button type="button" class="fb-react-btn" aria-label="Yêu thích" onclick="window.actionReact('${c.id}', 'love', event)"><span class="fb-react-icon-anim">❤️</span><span class="fb-react-tooltip">Yêu thích</span></button>
                                <button type="button" class="fb-react-btn" aria-label="Thương thương" onclick="window.actionReact('${c.id}', 'care', event)"><span class="fb-react-icon-anim">🥰</span><span class="fb-react-tooltip">Thương thương</span></button>
                                <button type="button" class="fb-react-btn" aria-label="HaHa" onclick="window.actionReact('${c.id}', 'haha', event)"><span class="fb-react-icon-anim">😆</span><span class="fb-react-tooltip">HaHa</span></button>
                                <button type="button" class="fb-react-btn" aria-label="Wow" onclick="window.actionReact('${c.id}', 'wow', event)"><span class="fb-react-icon-anim">😮</span><span class="fb-react-tooltip">Wow</span></button>
                                <button type="button" class="fb-react-btn" aria-label="Buồn" onclick="window.actionReact('${c.id}', 'sad', event)"><span class="fb-react-icon-anim">😢</span><span class="fb-react-tooltip">Buồn</span></button>
                                <button type="button" class="fb-react-btn" aria-label="Phẫn nộ" onclick="window.actionReact('${c.id}', 'angry', event)"><span class="fb-react-icon-anim">😡</span><span class="fb-react-tooltip">Phẫn nộ</span></button>
                            </div>

                            <button type="button" class="fb-like-trigger-btn ${activeReactObj ? 'active' : ''}" 
                                    style="${activeReactObj ? `color: ${activeReactObj.color} !important; font-weight: 700;` : ''}"
                                    onclick="window.actionReact('${c.id}', '${activeReactObj ? 'toggle' : 'like'}', event)">
                                <span class="fb-like-icon" style="font-size: 14px; line-height: 1;">${activeReactObj ? activeReactObj.icon : '👍'}</span>
                                <span>${activeReactObj ? activeReactObj.name : 'Thích'}</span>
                            </button>
                        </div>

                        ${totalReactCount > 0 ? `
                        <div class="fb-reaction-count-pill" onclick="window.actionReact('${c.id}', 'like', event)">
                            <span class="fb-count-icons">${topIconsHtml}</span>
                            <span class="fb-count-num">${totalReactCount}</span>
                        </div>
                        ` : ''}

                        <span class="fb-dot">•</span>

                        <button type="button" class="ap-action-reply-btn" onclick="window.actionReplyToggle('${c.id}', '${currentRootId}')">Trả lời</button>

                        <span class="fb-dot">•</span>

                        <span class="ap-cmt-time">${tAgo}</span>
                    </div>
                </div>
            </div>
            
            <div class="ap-reply-form-container" id="reply-form-${c.id}"></div>

            ${repliesHtml}
        </div>
        `;
    }

    // ── Global Handlers for clicks ────────────────────────────────────
    window.actionToggleReplies = function(cmtId, count) {
        const hiddenDiv = document.getElementById(`hidden-replies-${cmtId}`);
        const btnText = document.querySelector(`#more-btn-${cmtId} .btn-text`);
        const btnIcon = document.querySelector(`#more-btn-${cmtId} .btn-icon`);
        if (!hiddenDiv) return;
        
        if (hiddenDiv.style.display === 'none') {
            hiddenDiv.style.display = 'flex';
            if (btnText) btnText.innerText = 'Ẩn ∧';
            if (btnIcon) btnIcon.style.display = 'none';
        } else {
            hiddenDiv.style.display = 'none';
            if (btnText) btnText.innerText = `Xem thêm ${count} câu trả lời`;
            if (btnIcon) {
                btnIcon.style.display = 'inline-block';
                btnIcon.innerText = 'expand_more';
            }
        }
    };

    window.actionReplyToggle = function(clickId, rootId) {
        const user = getCurrentUser();
        if (!user) { window.showAuthModal && window.showAuthModal('login'); return; }

        if(!rootId) rootId = clickId;

        const box = document.getElementById(`reply-form-${clickId}`);
        if (!box) return;
        
        document.querySelectorAll('.ap-reply-form-container.active').forEach(el => {
            if (el.id !== `reply-form-${clickId}`) {
                el.innerHTML = ''; el.classList.remove('active');
            }
        });

        if (box.classList.contains('active')) {
            box.innerHTML = ''; box.classList.remove('active');
        } else {
            box.innerHTML = renderInputForm(clickId, rootId);
            box.classList.add('active');
            setupInputEvents(clickId);
            document.getElementById(`ap-input-${clickId}`).focus();
        }
    }

    window.actionToggleMore = function(commentId) {
        const mId = `ap-menu-${commentId}`;
        document.querySelectorAll('.ap-dropdown-menu').forEach(menu => {
            if (menu.id !== mId) menu.classList.remove('show');
        });
        const m = document.getElementById(mId);
        if (m) m.classList.toggle('show');
    };

    window.toggleEmojiPopover = function(pid, event) {
        if (event) { event.stopPropagation(); }
        const pop = document.getElementById(`ap-emoji-drop-${pid}`);
        if (!pop) return;
        
        // Close other open popovers
        document.querySelectorAll('.ap-emoji-popover.show').forEach(p => {
            if (p.id !== `ap-emoji-drop-${pid}`) p.classList.remove('show');
        });

        if (!pop.innerHTML.trim()) {
            pop.innerHTML = renderEmojiPickerHtml(pid);
        }
        pop.classList.toggle('show');
    };

    window.toggleGifView = function(pid, showGif, event) {
        if (event) { event.stopPropagation(); }
        const emojiView = document.getElementById(`ap-emoji-view-${pid}`);
        const gifView = document.getElementById(`ap-gif-view-${pid}`);
        if (emojiView && gifView) {
            emojiView.style.display = showGif ? 'none' : 'block';
            gifView.style.display = showGif ? 'block' : 'none';
        }
    };

    window.insertCommentEmoji = function(emoji, pid, event) {
        if (event) { event.stopPropagation(); }
        const ta = document.getElementById(`ap-input-${pid}`);
        if (!ta) return;

        const start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
        const end = ta.selectionEnd != null ? ta.selectionEnd : ta.value.length;
        const val = ta.value;
        ta.value = val.substring(0, start) + emoji + val.substring(end);
        ta.selectionStart = ta.selectionEnd = start + emoji.length;
        ta.focus();

        ta.dispatchEvent(new Event('input', { bubbles: true }));

        const pop = document.getElementById(`ap-emoji-drop-${pid}`);
        if (pop) pop.classList.remove('show');
    };

    window.insertCommentGif = function(gifUrl, pid, event) {
        if (event) { event.stopPropagation(); }
        const ta = document.getElementById(`ap-input-${pid}`);
        const preview = document.getElementById(`ap-gif-preview-${pid}`);
        const previewImg = document.getElementById(`ap-gif-preview-img-${pid}`);
        const sb = document.getElementById(`ap-btn-${pid}`);

        if (ta && preview && previewImg) {
            ta.dataset.attachedGif = gifUrl;
            previewImg.src = gifUrl;
            preview.style.display = 'block';
            if (sb) {
                sb.disabled = false;
                sb.style.opacity = '1';
            }
        }

        const pop = document.getElementById(`ap-emoji-drop-${pid}`);
        if (pop) pop.classList.remove('show');
    };

    window.removeAttachedGif = function(pid, event) {
        if (event) { event.stopPropagation(); }
        const ta = document.getElementById(`ap-input-${pid}`);
        const preview = document.getElementById(`ap-gif-preview-${pid}`);
        const previewImg = document.getElementById(`ap-gif-preview-img-${pid}`);
        const sb = document.getElementById(`ap-btn-${pid}`);

        if (ta) {
            delete ta.dataset.attachedGif;
        }
        if (previewImg) previewImg.src = '';
        if (preview) preview.style.display = 'none';

        if (ta && sb) {
            sb.disabled = ta.value.trim().length < 1;
        }
    };

    // Close emoji popovers on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.ap-emoji-select')) {
            document.querySelectorAll('.ap-emoji-popover.show').forEach(pop => pop.classList.remove('show'));
        }
    });

    window.selectAvatar = function(url, pid) {
        // Save with avatarService (per-user) OR fallback to legacy key
        const user = getCurrentUser();
        if (user && typeof avatarService !== 'undefined') {
            const userId = user._id || user.id || user.email;
            avatarService.saveAvatar(userId, url).catch(()=>{});
        } else {
            localStorage.setItem('ap_chosen_avatar', url);
        }
        // Legacy key for backward compat
        localStorage.setItem('ap_chosen_avatar', url);
        document.querySelectorAll(`#ap-ava-drop-${pid} .ap-ava-option`).forEach(img => img.classList.remove('selected'));
        if (event && event.target) event.target.classList.add('selected');
        
        const preview = document.getElementById(`ap-preview-${pid}`);
        if(preview) {
            if(preview.tagName === 'SPAN') {
                preview.outerHTML = `<img src="${url}" class="ap-ava-preview" id="ap-preview-${pid}">`;
            } else {
                preview.src = url;
            }
        }
        document.getElementById(`ap-ava-drop-${pid}`)?.classList.remove('show');
        
        // Cập nhật DOM ảnh đại diện ở bar góc trên (Bar User) cho tất cả các form hiện tại
        document.querySelectorAll('div[id^="ap-user-ava-"], img[id^="ap-user-ava-"]').forEach(barAva => {
            if(barAva.tagName === 'DIV') {
                barAva.outerHTML = `<img src="${url}" class="ap-form-user-ava" id="${barAva.id}" style="object-fit:cover;">`;
            } else {
                barAva.src = url;
            }
        });
    }

    window.actionReact = function(commentId, reactionType, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const user = getCurrentUser();
        let userKey = user ? (user.email || user.id || user._id) : (localStorage.getItem('ap_guest_react_id') || '');
        if (!userKey) {
            userKey = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ap_guest_react_id', userKey);
        }

        const slug = (window.firebaseComments && window.firebaseComments.currentSlug) || 'main';
        const stored = getStoredReactions(slug);
        
        let currentReact = null;
        if (stored[commentId]) {
            for (const [rType, uList] of Object.entries(stored[commentId])) {
                if (Array.isArray(uList) && uList.includes(userKey)) {
                    currentReact = rType;
                    break;
                }
            }
        }

        let targetReaction = reactionType;
        if (reactionType === 'toggle') {
            targetReaction = currentReact ? null : 'like';
        } else if (currentReact === reactionType) {
            targetReaction = null;
        }

        saveStoredReaction(slug, commentId, targetReaction, userKey);

        // Send to real-time server database
        try {
            fetch(`${API_URL}/comments/${encodeURIComponent(commentId)}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, reactionType: targetReaction, userKey })
            }).catch(() => {});
            if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('ap_movie_comments');
                bc.postMessage({ type: 'reaction_updated', slug, commentId, reactionType: targetReaction, userKey, timestamp: Date.now() });
                bc.close();
            }
        } catch(e) {}

        // Refresh UI immediately
        if (window.firebaseComments && window.firebaseComments._lastCb) {
            window.firebaseComments.fetchData(slug, window.firebaseComments._lastCb);
        }
    };

    window.actionVote = async function(commentId, type, e) {
        if (e) e.preventDefault();
        const btn = e ? e.currentTarget : (event ? event.currentTarget : null);

        if (type === 'down') {
            if (!btn) return;
            const isDisliked = localStorage.getItem('ap_hide_' + commentId) === '1';
            const item = document.querySelector(`.ap-cmt-item[data-id="${commentId}"]`);
            
            if (isDisliked) {
                localStorage.removeItem('ap_hide_' + commentId);
                btn.classList.remove('active');
                if (item) {
                    item.style.opacity = '1';
                    item.style.filter = 'none';
                }
            } else {
                localStorage.setItem('ap_hide_' + commentId, '1');
                btn.classList.add('active');
                if (item) {
                    item.style.opacity = '0.4';
                    item.style.filter = 'blur(1.5px)';
                }
                showToast('Đã làm mờ bình luận!', 'info');
            }
            return;
        }

        if (type === 'up') {
            if (!btn) return;
            const isLiked = localStorage.getItem('ap_like_' + commentId) === '1';
            
            // Toggle local state
            if (isLiked) {
                localStorage.removeItem('ap_like_' + commentId);
                btn.classList.remove('active');
            } else {
                localStorage.setItem('ap_like_' + commentId, '1');
                btn.classList.add('active');
            }

            // Update UI count
            const countSpan = btn.querySelector('.like-count');
            let currentCount = countSpan ? parseInt(countSpan.innerText) : 0;
            if (isNaN(currentCount)) currentCount = 0;
            
            let newCount = isLiked ? currentCount - 1 : currentCount + 1;
            
            if (newCount > 0) {
                if (countSpan) {
                    countSpan.innerText = newCount;
                } else {
                    btn.insertAdjacentHTML('beforeend', `<span class="like-count">${newCount}</span>`);
                }
            } else {
                if (countSpan) countSpan.remove();
            }
        }
    }

    window.actionToggleSpoiler = async function(commentId, isCurrentlySpoiler) {
        const user = getCurrentUser();
        if(!user) return;
        await window.firebaseComments.toggleSpoiler(window.firebaseComments.currentSlug, commentId, isCurrentlySpoiler);
        document.getElementById(`ap-menu-${commentId}`).classList.remove('show');
        showToast('Đã cập nhật trạng thái hiển thị!', 'success');
    }

    window.submitComment = async function(submitParentId, boxId) {
        const user = getCurrentUser();
        if (!user) return;
        const slug = window.firebaseComments.currentSlug;
        const pid = boxId || 'main';
        // Get per-user avatar
        const userId2 = user._id || user.id || user.email;
        const avatarUrl = (typeof avatarService !== 'undefined' ? avatarService.getAvatar(userId2) : null)
                       || user.avatar
                       || user.avatarUrl
                       || localStorage.getItem('ap_chosen_avatar')
                       || '';

        
        const ta = document.getElementById(`ap-input-${pid}`);
        let text = ta ? ta.value.trim() : '';
        const attachedGif = ta ? ta.dataset.attachedGif : '';
        if (attachedGif) {
            text = (text ? text + ' ' : '') + `[gif:${attachedGif}]`;
        }

        if (!text) {
            showToast('Vui lòng nhập nội dung bình luận hoặc chọn GIF!', 'info');
            return;
        }

        const sc = document.getElementById(`ap-spoiler-${pid}`);
        const isSpoiler = sc ? sc.checked : false;
        
        const btn = document.getElementById(`ap-btn-${pid}`);
        if(btn) { btn.disabled = true; btn.innerHTML = 'Đang gửi...'; }

        const res = await window.firebaseComments.add(slug, {
            name: user.name, userEmail: user.email, text, isSpoiler, parentId: submitParentId || null, avatarUrl
        });

        if (res.ok) {
            if (ta) {
                ta.value = '';
                delete ta.dataset.attachedGif;
            }
            const preview = document.getElementById(`ap-gif-preview-${pid}`);
            const previewImg = document.getElementById(`ap-gif-preview-img-${pid}`);
            if (preview) preview.style.display = 'none';
            if (previewImg) previewImg.src = '';
            
            const countEl = document.getElementById(`ap-count-${pid}`);
            if (countEl) countEl.textContent = '0 / 1000';

            if (boxId && boxId !== 'main') {
                const b = document.getElementById(`reply-form-${boxId}`);
                if (b) { b.classList.remove('active'); b.innerHTML = ''; }
            }
            showToast('Bình luận đã được gửi! ✅', 'success');
            // ✅ Auto-scroll xuống cuối list (như Facebook)
            setTimeout(() => {
                const cList = document.querySelector('.ap-cmt-list');
                if (cList) cList.scrollTop = cList.scrollHeight;
            }, 500);
        } else {
            showToast(res.msg, 'error');
            if(btn) { btn.disabled = false; btn.innerHTML = '<span>Gửi</span><svg style="width: 16px; height: 16px; fill: #fcd576; flex-shrink: 0;" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'; }
        }
    };

    // ── Input Length Helper ────────────────────────────────────
    function setupInputEvents(idSuffix) {
        const ta = document.getElementById(`ap-input-${idSuffix}`);
        const c  = document.getElementById(`ap-count-${idSuffix}`);
        const sb = document.getElementById(`ap-btn-${idSuffix}`);
        if(!ta || !c || !sb) return;
        const updateCount = (e) => {
            if (e && e.isComposing) return;
            const l = ta.value.trim().length;
            const hasGif = Boolean(ta.dataset.attachedGif);
            c.textContent = `${l} / 1000`;
            c.style.color = l > 900 ? '#ef4444' : l > 700 ? '#f59e0b' : '#6b7280';
            sb.disabled = (l < 1 && !hasGif);
        };
        ta.addEventListener('input', updateCount);
        ta.addEventListener('compositionend', () => updateCount());
    }

    // ── Khởi Tạo Chính ──────────────────────────────────────────────────
    function initCommentUI() {
        const params = new URLSearchParams(window.location.search);
        let slug = params.get('slug');
        if (!slug) {
            const pathname = window.location.pathname;
            const mXem = pathname.match(/\/xem-phim\/([^\/]+)/);
            if (mXem) {
                slug = mXem[1];
            } else {
                const mPhim = pathname.match(/\/phim\/([^\/]+)/);
                if (mPhim) slug = mPhim[1];
            }
        }
        if (!slug && typeof currentMovie !== 'undefined' && currentMovie && currentMovie.slug) {
            slug = currentMovie.slug;
        }
        if (!slug && typeof window !== 'undefined' && window.initialMovie && window.initialMovie.slug) {
            slug = window.initialMovie.slug;
        }
        if (!slug && window.location.pathname.includes('watch.html')) slug = 'demo-cam-nang-yeu';
        if (!slug) return;

        const section = document.getElementById('comments-section');
        if (!section) return;

        // If already initialized for this exact slug, don't wipe and rebuild DOM to prevent flickering
        if (section.dataset.initialized === slug) {
            if (window.firebaseComments && window.firebaseComments._lastCb) {
                window.firebaseComments.fetchData(slug, window.firebaseComments._lastCb);
            }
            return;
        }
        section.dataset.initialized = slug;

        section.style.background = 'transparent';
        section.style.border = 'none';
        section.style.boxShadow = 'none';
        section.style.padding = '0';
        section.style.margin = '0';

        injectStyles();
        window._apInitComment = initCommentUI;

        // Wipe any legacy/static HTML inside #comments-section completely
        section.innerHTML = '';

        // 1. Header Bar
        const headerWrap = document.createElement('div');
        headerWrap.className = 'ap-cmt-header-wrap';
        headerWrap.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; border-bottom: none !important; padding-bottom: 0 !important; width: 100%;';
        headerWrap.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg class="ap-cmt-icon" style="width: 22px; height: 22px; flex-shrink: 0;" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 12c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm6 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm6 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1z"/></svg>
                <h3 class="ap-cmt-title" style="font-weight: 700; font-size: 17px; margin: 0; display: flex; align-items: center; gap: 6px; letter-spacing: -0.2px;">
                    Bình luận <span id="ap-cmt-count-span" class="ap-cmt-count" style="font-weight: 600; font-size: 16px;">(0)</span>
                </h3>
            </div>
            <div class="ap-cmt-tabs-wrap">
                <button type="button" class="ap-cmt-tab-btn active" id="ap-tab-cmt" onclick="window.switchCmtTab && window.switchCmtTab('cmt')">Bình luận</button>
                <button type="button" class="ap-cmt-tab-btn" id="ap-tab-rating" onclick="window.switchCmtTab && window.switchCmtTab('rating')">Đánh giá</button>
            </div>
        `;
        section.appendChild(headerWrap);

        // 2. Main Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'ap-cmt-wrapper';
        section.appendChild(wrapper);

        // 3. Form Input Box at Top
        const formWrap = document.createElement('div');
        formWrap.innerHTML = renderInputForm(null);
        wrapper.appendChild(formWrap);
        setupInputEvents('main');

        // 4. Comments List Box at Bottom
        const listEl = document.createElement('div');
        listEl.className = 'ap-cmt-list';
        listEl.innerHTML = '<div style="text-align:center;color:#6b7280;padding:20px;width:100%;">⏳ Đang tải bình luận...</div>';
        wrapper.appendChild(listEl);

        const user = getCurrentUser();
        const userEmail = user ? user.email : null;

        window.firebaseComments.onReady(() => {
            window.firebaseComments.listen(slug, ({ comments, count }) => {
                const countSpan = document.getElementById('ap-cmt-count-span');
                if (countSpan) countSpan.textContent = `(${count})`;

                const newHtml = comments.length === 0 
                    ? '<div class="ap-cmt-empty-msg" style="text-align:center;color:#78716c;padding:32px 20px;width:100%;display:flex;align-items:center;justify-content:center;margin:0 auto;font-weight:600;">💬 Hãy là người đầu tiên bình luận!</div>'
                    : comments.map(c => generateHtml(c, userEmail, false)).join('');

                if (listEl.dataset.lastHtml !== newHtml) {
                    listEl.dataset.lastHtml = newHtml;
                    const prevScrollTop = listEl.scrollTop;
                    listEl.innerHTML = newHtml;
                    listEl.scrollTop = prevScrollTop;
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCommentUI);
    } else {
        setTimeout(initCommentUI, 100);
    }

})();

