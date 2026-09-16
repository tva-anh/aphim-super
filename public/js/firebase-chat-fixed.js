/**
 * A PHIM - Firebase Chat Service (FIXED VERSION)
 * Sử dụng Firestore realtime cho chat cộng đồng
 */

(function () {
    'use strict';

    // ── Firebase Config ──────────────────────────────────────────────
    const firebaseConfig = {
        apiKey: "AIzaSyBAcSx1rRMC79-yUz6XINMZOeYuKlNWA00",
        authDomain: "chat-a-phim.firebaseapp.com",
        projectId: "chat-a-phim",
        storageBucket: "chat-a-phim.firebasestorage.app",
        messagingSenderId: "450796005025",
        appId: "1:450796005025:web:c36985db03de84c6a972e0"
    };

    const TABS = ['general', 'movies', 'support'];
    const MSG_LIMIT = 80;

    class FirebaseChat {
        constructor() {
            this.app = null;
            this.db = null;
            this.ready = false;
            this._listeners = {};
            this._onReady = [];
            this._initAttempts = 0;
            this._maxAttempts = 3;

            this._init();
        }

        _init() {
            // Prevent multiple initializations
            if (this.ready) {
                console.log('[APFilmChat] Already initialized');
                return;
            }

            // Limit retry attempts
            if (this._initAttempts >= this._maxAttempts) {
                console.error('[APFilmChat] Max init attempts reached');
                return;
            }

            this._initAttempts++;

            try {
                if (typeof firebase === 'undefined') {
                    console.warn('[APFilmChat] Firebase SDK not loaded, retry', this._initAttempts);
                    setTimeout(() => this._init(), 500);
                    return;
                }

                // Use existing app if available
                if (!firebase.apps.length) {
                    this.app = firebase.initializeApp(firebaseConfig);
                } else {
                    this.app = firebase.apps[0];
                }

                this.db = firebase.firestore();

                this.ready = true;
                console.log('[APFilmChat] Firebase Firestore initialized ✓');

                // Call all waiting callbacks
                this._onReady.forEach(fn => fn());
                this._onReady = [];

            } catch (err) {
                console.error('[APFilmChat] Firebase init error:', err);

                // Only retry if not already initialized
                if (!this.ready && this._initAttempts < this._maxAttempts) {
                    setTimeout(() => this._init(), 2000);
                }
            }
        }

        onReady(fn) {
            if (this.ready) {
                fn();
                return;
            }
            this._onReady.push(fn);
        }

        _msgCol(tab) {
            return this.db.collection('chats').doc(tab).collection('messages');
        }

        // MODERN SEND MESSAGE
        async sendMessage(tab, msg) {
            if (!this.db) return null;
            if (!TABS.includes(tab)) tab = 'general';

            try {
                const docRef = await this._msgCol(tab).add({
                    userId: msg.userId || 'guest',
                    user: msg.user || 'Khách',
                    avatar: msg.avatar || '/apple-touch-icon.png',
                    chatRole: msg.chatRole || 'user',
                    frame: msg.frame || '',
                    text: msg.text || '',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    isPinned: false,
                    replyTo: msg.replyTo || null,
                    forwardFrom: msg.forwardFrom || null
                });

                // Sync to MongoDB
                fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ ...msg, tab, firebaseId: docRef.id })
                }).catch(e => console.warn('[APFilmChat] Sync to MongoDB failed:', e));

                return docRef.id;
            } catch (err) {
                console.error('[APFilmChat] Send error:', err);
                return null;
            }
        }

        // Realtime Listening
        listenMessages(tab, userId, callback) {
            if (!this.db) return;
            if (!TABS.includes(tab)) tab = 'general';

            if (this._listeners[tab]) this._listeners[tab]();

            this._listeners[tab] = this._msgCol(tab)
                .orderBy('timestamp', 'desc')
                .limit(MSG_LIMIT)
                .onSnapshot(snap => {
                    const msgs = [];
                    snap.forEach(doc => {
                        msgs.push({ id: doc.id, ...doc.data() });
                    });
                    callback(msgs.reverse());
                }, err => {
                    console.error(`[APFilmChat] Listen error (${tab}):`, err);

                    if (err.code === 'permission-denied') {
                        if (window.showMessage) {
                            window.showMessage('Lỗi quyền truy cập Firestore', 'error');
                        }
                    }
                });

            return this._listeners[tab];
        }

        // Pinning Logic
        async pinMessage(tab, messageId) {
            if (!this.db) return;
            try {
                const pinnedDocs = await this.db.collection('chats').doc(tab).collection('pinned').get();
                const batch = this.db.batch();
                pinnedDocs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

                const msgSnap = await this._msgCol(tab).doc(messageId).get();
                if (!msgSnap.exists) return;
                const msgData = msgSnap.data();

                await this.db.collection('chats').doc(tab).collection('pinned').doc('current').set({
                    id: messageId,
                    ...msgData,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                await fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/pin/${messageId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });

            } catch (err) {
                console.error('[APFilmChat] Pin error:', err);
            }
        }

        listenPinned(tab, callback) {
            if (!this.db) return;
            return this.db.collection('chats').doc(tab).collection('pinned')
                .onSnapshot(snap => {
                    const doc = snap.docs.find(d => d.id === 'current');
                    callback(doc ? { id: doc.id, ...doc.data() } : null);
                });
        }

        async unpinAll(tab) {
            if (!this.db) return;
            try {
                const snap = await this.db.collection('chats').doc(tab).collection('pinned').get();
                const batch = this.db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            } catch (err) {
                console.error('[APFilmChat] Unpin error:', err);
            }
        }

        // Moderation
        async deleteMessage(tab, messageId) {
            if (!this.db) return;
            try {
                await this._msgCol(tab).doc(messageId).delete();
                fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/${messageId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
            } catch (err) {
                console.error('[APFilmChat] Delete error:', err);
            }
        }

        async banUser(userId, username) {
            if (!this.db) return;
            try {
                await this.db.collection('banned').doc(userId).set({
                    username,
                    bannedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/users/${userId}/chat-ban`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
            } catch (err) {
                console.error('[APFilmChat] Ban error:', err);
            }
        }

        async isBanned(userId) {
            if (!this.db || !userId) return false;
            const doc = await this.db.collection('banned').doc(userId).get();
            return doc.exists;
        }

        // Reactions
        async toggleReaction(tab, messageId, emoji, userId, avatar, name) {
            try {
                await fetch(`${typeof API_CONFIG !== 'undefined' ? API_CONFIG.BACKEND_URL : 'http://localhost:5000/api'}/chat/reaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        tab,
                        firebaseId: messageId,
                        emoji,
                        avatar,
                        name
                    })
                });
            } catch (err) {
                console.error('[APFilmChat] Reaction sync error:', err);
            }
        }

        // Presence
        trackPresence(userId, onUpdate) {
            if (!this.db) return;
            const ref = this.db.collection('presence').doc('stats');
            return ref.onSnapshot(snap => {
                if (snap.exists) onUpdate(snap.data().onlineCount || 0);
            });
        }
    }

    window.firebaseChat = new FirebaseChat();
})();

