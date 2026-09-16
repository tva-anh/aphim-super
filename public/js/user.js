// User Service - Favorites, History, Progress
class UserService {
    constructor() {
        this.authService = typeof authService !== 'undefined' ? authService : (typeof window !== 'undefined' ? window.authService : null);
        this.lastProgressSyncTime = 0; // Kiểm soát tần suất đồng bộ cloud
    }

    getAuth() {
        if (!this.authService || typeof this.authService.isLoggedIn !== 'function') {
            this.authService = (typeof window !== 'undefined' && window.authService) ? window.authService : (typeof authService !== 'undefined' ? authService : null);
        }
        return this.authService;
    }

    // Get user favorites
    getFavorites() {
        try {
            const favStr = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            let favorites = favStr ? JSON.parse(favStr) : [];
            const auth = this.getAuth();
            if ((!favorites || favorites.length === 0) && auth && auth.currentUser && Array.isArray(auth.currentUser.favorites)) {
                favorites = auth.currentUser.favorites;
                localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
            }
            return Array.isArray(favorites) ? favorites : [];
        } catch (e) {
            return [];
        }
    }

    // Add to favorites (Hỗ trợ cả Khách & Thành viên đăng nhập)
    addToFavorites(movie) {
        if (!movie || (!movie.slug && !movie.id)) return false;

        const targetSlug = movie.slug || movie.id;
        const favorites = this.getFavorites();
        const exists = favorites.find(m => (m.slug || m.id) === targetSlug);

        if (exists) {
            return false;
        }

        const favItem = {
            slug: targetSlug,
            name: movie.name || movie.title || movie.name_vi || 'Phim',
            thumb_url: movie.thumb_url || movie.poster_url || movie.thumb || movie.poster || '',
            poster_url: movie.poster_url || movie.thumb_url || '',
            year: movie.year || '',
            addedAt: new Date().toISOString()
        };

        // Đưa phim mới lưu lên đầu danh sách
        favorites.unshift(favItem);

        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));

        // Nếu đã đăng nhập, tự động đồng bộ lên tài khoản cá nhân
        const auth = this.getAuth();
        if (auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn()) {
            auth.updateProfile({ favorites }).catch(() => {});
        }

        try {
            window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: favorites }));
        } catch (e) {}

        return true;
    }

    // Remove from favorites
    removeFromFavorites(slug) {
        if (!slug) return false;
        const favorites = this.getFavorites();
        const filtered = favorites.filter(m => (m.slug || m.id) !== slug);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));

        const auth = this.getAuth();
        if (auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn()) {
            auth.updateProfile({ favorites: filtered }).catch(() => {});
        }

        try {
            window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: filtered }));
        } catch (e) {}

        return true;
    }

    // Check if movie is in favorites
    isFavorite(slug) {
        if (!slug) return false;
        const favorites = this.getFavorites();
        return favorites.some(m => (m.slug || m.id) === slug);
    }

    // Get watch history
    getWatchHistory() {
        const historyStr = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
        return historyStr ? JSON.parse(historyStr) : [];
    }

    // Add to watch history (Hỗ trợ cả Khách & Thành viên)
    addToHistory(movie, episode = null, extra = {}) {
        if (!movie || !movie.slug) return;

        const history = this.getWatchHistory();
        const filtered = history.filter(m => m.slug !== movie.slug);

        const item = {
            slug: movie.slug,
            name: movie.name || movie.title || '',
            thumb_url: movie.thumb_url || movie.poster_url || '',
            poster_url: movie.poster_url || movie.thumb_url || '',
            year: movie.year || '',
            episode: episode || extra.episode || '',
            episodeSlug: extra.episodeSlug || (typeof episode === 'string' ? episode : (episode?.slug || '')),
            currentTime: extra.currentTime || 0,
            duration: extra.duration || 0,
            watchedAt: new Date().toISOString()
        };

        filtered.unshift(item);

        // Keep only last 50 items
        const limited = filtered.slice(0, 50);
        localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(limited));

        try {
            window.dispatchEvent(new CustomEvent('watchHistoryUpdated', { detail: limited }));
        } catch(e) {}

        const auth = this.getAuth();
        if (auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn()) {
            auth.updateProfile({ watchHistory: limited }).catch(()=>{});
        }
    }

    // Clear watch history
    clearHistory() {
        localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, '[]');
        try {
            window.dispatchEvent(new CustomEvent('watchHistoryUpdated', { detail: [] }));
        } catch(e) {}
        const auth = this.getAuth();
        if (auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn()) {
            auth.updateProfile({ watchHistory: [] }).catch(()=>{});
        }
    }

    // Get watch progress for a movie
    getWatchProgress(slug, episode = null) {
        const progressStr = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
        const allProgress = progressStr ? JSON.parse(progressStr) : {};

        const key = episode ? `${slug}_${episode}` : slug;
        return allProgress[key] || allProgress[slug] || { currentTime: 0, duration: 0 };
    }

    // Save watch progress (Hỗ trợ cả Khách & Thành viên)
    saveWatchProgress(slug, currentTime, duration, episode = null, movieInfo = null) {
        if (!slug) return;

        const progressStr = localStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS);
        const allProgress = progressStr ? JSON.parse(progressStr) : {};

        const key = episode ? `${slug}_${episode}` : slug;
        const progressData = {
            slug,
            episode,
            currentTime,
            duration,
            percentage: duration > 0 ? (currentTime / duration) * 100 : 0,
            updatedAt: new Date().toISOString()
        };

        allProgress[key] = progressData;
        allProgress[slug] = progressData; // Luôn cập nhật tiến trình mới nhất cho movie slug

        // 1. Luôn lưu ngay lập tức vào LocalStorage trên máy hiện tại
        localStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, JSON.stringify(allProgress));

        try {
            window.dispatchEvent(new CustomEvent('watchProgressUpdated', { detail: allProgress }));
        } catch(e) {}

        if (movieInfo) {
            this.addToHistory(movieInfo, episode, { currentTime, duration, episodeSlug: episode });
        }

        // 2. Đồng bộ lên Server nếu đã đăng nhập
        const auth = this.getAuth();
        if (auth && typeof auth.isLoggedIn === 'function' && auth.isLoggedIn()) {
            const now = Date.now();
            if (!this.lastProgressSyncTime || (now - this.lastProgressSyncTime > 5000)) {
                this.lastProgressSyncTime = now;
                auth.updateProfile({ watchProgress: allProgress })
                    .then(() => { console.log('☁️ [CloudSync] Watch progress backed up'); })
                    .catch(() => {});
            }
        }
    }

    // Get subscription info
    getSubscription() {
        const auth = this.getAuth();
        const user = auth ? auth.getCurrentUser() : null;
        if (!user) return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SUBSCRIPTION_PLANS) ? APP_CONFIG.SUBSCRIPTION_PLANS.FREE : { name: 'FREE' };

        const subStr = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
        const subscription = subStr ? JSON.parse(subStr) : null;

        if (!subscription || new Date(subscription.expiresAt) < new Date()) {
            return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.SUBSCRIPTION_PLANS) ? APP_CONFIG.SUBSCRIPTION_PLANS.FREE : { name: 'FREE' };
        }

        return subscription;
    }

    // Upgrade subscription
    upgradeSubscription(plan, paymentMethod) {
        const auth = this.getAuth();
        if (!auth || !auth.isLoggedIn()) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }

        const planConfig = APP_CONFIG.SUBSCRIPTION_PLANS[plan];
        if (!planConfig) {
            return { success: false, message: 'Gói không hợp lệ' };
        }

        // Simulate payment processing
        const subscription = {
            plan,
            ...planConfig,
            startDate: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (planConfig.yearly ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            paymentMethod,
            transactionId: 'TXN' + Date.now()
        };

        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscription));
        auth.updateProfile({ subscription: plan });

        return { success: true, subscription };
    }

    // Get payment history
    getPaymentHistory() {
        const historyStr = localStorage.getItem('cinestream_payment_history');
        return historyStr ? JSON.parse(historyStr) : [];
    }

    // Add payment to history
    addPaymentHistory(payment) {
        const history = this.getPaymentHistory();
        history.unshift({
            ...payment,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('cinestream_payment_history', JSON.stringify(history));
    }
}

// Initialize User Service
const userService = new UserService();
