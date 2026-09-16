/**
 * A PHIM — Avatar Service
 * Dual-storage: localStorage (per-user) + Firebase Firestore (persistent cloud)
 * 
 * Storage priority:
 *   1. Firestore (source of truth)  — sync on login
 *   2. localStorage[user_id]        — instant load + offline fallback
 *   3. Backend /auth/updatedetails  — keep MongoDB in sync
 */

(function () {
    'use strict';

    // ── Firebase Config (Dự án aphim-super-new) ─────────────────────────
    const firebaseConfig = {
        apiKey           : "AIzaSyBoB2gTGuPAVy_HyYv4j3b7NU9rbTVQmno",
        authDomain       : "aphim-super-new.firebaseapp.com",
        projectId        : "aphim-super-new",
        storageBucket    : "aphim-super-new.firebasestorage.app",
        messagingSenderId: "276319755678",
        appId            : "1:276319755678:web:4d74442ea51112e6e4ca8f",
        databaseURL      : "https://aphim-super-new-default-rtdb.firebaseio.com"
    };

    // ── Helpers ────────────────────────────────────────────────────────
    function getLocalKey(userId) {
        return `ap_avatar_${userId}`;
    }

    function getLocalAvatar(userId) {
        if (!userId) return null;
        return localStorage.getItem(getLocalKey(userId)) || null;
    }

    function setLocalAvatar(userId, url) {
        if (!userId || !url) return;
        localStorage.setItem(getLocalKey(userId), url);
        // Also keep legacy key for backward compat (chat-room.js reads ap_chosen_avatar)
        localStorage.setItem('ap_chosen_avatar', url);
    }

    // ── AvatarService class ────────────────────────────────────────────
    class AvatarService {
        constructor() {
            this._db      = null;
            this._ready   = false;
            this._pending = [];
            this._initFirestore();
        }

        // ── Internal: init Firestore ───────────────────────────────────
        _initFirestore() {
            const tryInit = () => {
                try {
                    if (typeof firebase === 'undefined') {
                        setTimeout(tryInit, 600);
                        return;
                    }
                    // Reuse existing app if already initialized
                    const app = firebase.apps.length
                        ? firebase.apps[0]
                        : firebase.initializeApp(firebaseConfig);

                    this._db = app.firestore
                        ? firebase.firestore()
                        : null;

                    if (this._db) {
                        this._ready = true;
                        console.log('[AvatarService] Firestore ready ✓');
                        
                        // Ensure authenticated with Firebase (at least anonymous) to avoid permission-denied
                        if (typeof firebase.auth === 'function' && !firebase.auth().currentUser) {
                            firebase.auth().signInAnonymously().catch(err => {
                                console.warn('[AvatarService] Anonymous sign-in failed:', err.message);
                            });
                        }

                        this._pending.forEach(fn => fn());
                        this._pending = [];
                    }
                } catch (e) {
                    console.warn('[AvatarService] Firestore init failed:', e.message);
                }
            };
            tryInit();
        }

        // ── Wait for Firestore ─────────────────────────────────────────
        _onReady(fn) {
            if (this._ready) { fn(); return; }
            this._pending.push(fn);
        }

        // ── Firestore ref for a user ───────────────────────────────────
        _userRef(userId) {
            return this._db.collection('user_profiles').doc(String(userId));
        }

        // ── GET avatar (instant from local, then sync with Firestore) ──
        getAvatar(userId) {
            return getLocalAvatar(userId);
        }

        /**
         * Load avatar for a user:
         *   - Returns local cache immediately
         *   - Then fetches Firestore and calls onUpdate(url) if different
         */
        loadAvatar(userId, onUpdate) {
            if (!userId) return;

            let local = getLocalAvatar(userId);
            
            // Try MongoDB first (source of truth if Firestore fails)
            try {
                if (typeof authService !== 'undefined') {
                    const currentUser = authService.getCurrentUser();
                    if (currentUser && String(currentUser.id) === String(userId) && currentUser.avatar) {
                        local = currentUser.avatar;
                        setLocalAvatar(userId, local);
                    }
                }
            } catch(e) {}

            // If local exists, show immediately (will be updated if Firestore differs)
            if (local && typeof onUpdate === 'function') {
                onUpdate(local);
            }

            // Then pull from Firestore to stay in sync
            this._onReady(() => {
                this._userRef(userId).get()
                    .then(doc => {
                        if (!doc.exists) return;
                        const data = doc.data();
                        const cloudAvatar = data && data.avatar ? data.avatar : null;
                        if (cloudAvatar && cloudAvatar !== local) {
                            // Firestore has newer data → update local
                            setLocalAvatar(userId, cloudAvatar);
                            if (typeof onUpdate === 'function') onUpdate(cloudAvatar);
                        }
                    })
                    .catch(err => {
                        if (err.code !== 'permission-denied') {
                            console.warn('[AvatarService] loadAvatar Firestore error:', err.code || err.message);
                        }
                    });
            });
        }

        /**
         * Save avatar:
         *   1. localStorage immediately (instant UI)
         *   2. Firebase Firestore (cloud backup)
         *   3. Backend /auth/updatedetails (MongoDB sync) via authService
         * 
         * Returns Promise<{success, source}>
         */
        async saveAvatar(userId, url) {
            if (!userId || !url) return { success: false, message: 'Thiếu thông tin' };

            // 1. Local storage (instant, always succeeds)
            setLocalAvatar(userId, url);

            const results = { local: true, firestore: false, backend: false };

            // 2. Firestore (cloud backup)
            await new Promise(resolve => {
                this._onReady(() => {
                    this._userRef(userId).set({
                        avatar     : url,
                        updatedAt  : firebase.firestore.FieldValue.serverTimestamp(),
                        userId     : String(userId),
                    }, { merge: true })
                    .then(() => {
                        results.firestore = true;
                        console.log('[AvatarService] ✅ Saved to Firestore');
                        resolve();
                    })
                    .catch(err => {
                        console.warn('[AvatarService] ⚠️ Firestore save failed:', err.code || err.message);
                        resolve(); // non-blocking
                    });
                });
                // If Firestore isn't ready after 3s, continue anyway
                setTimeout(resolve, 3000);
            });

            // 3. Backend (MongoDB sync via existing authService)
            try {
                if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
                    const backendResult = await authService.updateProfile({ avatar: url });
                    results.backend = backendResult.success;
                    if (backendResult.success) {
                        console.log('[AvatarService] ✅ Saved to Backend');
                    } else {
                        console.warn('[AvatarService] ⚠️ Backend save failed:', backendResult.message);
                    }
                }
            } catch (err) {
                console.warn('[AvatarService] ⚠️ Backend save error:', err.message);
            }

            const anySuccess = results.local || results.firestore || results.backend;
            return {
                success : anySuccess,
                sources : results,
                message : anySuccess
                    ? `Đã lưu: ${[
                        results.local     ? 'Local' : '',
                        results.firestore ? 'Cloud' : '',
                        results.backend   ? 'Server' : '',
                      ].filter(Boolean).join(' + ')}`
                    : 'Không thể lưu hình đại diện'
            };
        }
    }

    // ── Singleton ──────────────────────────────────────────────────────
    window.avatarService = new AvatarService();

})();
