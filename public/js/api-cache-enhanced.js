/**
 * Enhanced API Cache với localStorage persistence
 * Giảm số lượng API calls và tăng tốc độ tải
 */

class APICache {
    constructor(options = {}) {
        this.cacheDuration = options.cacheDuration || 5 * 60 * 1000; // 5 phút
        this.useLocalStorage = options.useLocalStorage !== false;
        this.prefix = options.prefix || 'api_cache_';
        this.memoryCache = new Map();

        // Load cache từ localStorage khi khởi tạo
        if (this.useLocalStorage) {
            this.loadFromLocalStorage();
        }
    }

    /**
     * Tạo cache key từ URL và params
     */
    generateKey(url, params = {}) {
        const paramString = Object.keys(params).length > 0
            ? JSON.stringify(params)
            : '';
        return `${this.prefix}${url}${paramString}`;
    }

    /**
     * Lấy data từ cache
     */
    get(url, params = {}) {
        const key = this.generateKey(url, params);

        // Check memory cache first
        const memoryData = this.memoryCache.get(key);
        if (memoryData && this.isValid(memoryData)) {
            console.log('✅ Cache HIT (memory):', url);
            return memoryData.data;
        }

        // Check localStorage
        if (this.useLocalStorage) {
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (this.isValid(parsed)) {
                        console.log('✅ Cache HIT (localStorage):', url);
                        // Restore to memory cache
                        this.memoryCache.set(key, parsed);
                        return parsed.data;
                    } else {
                        // Expired, remove
                        localStorage.removeItem(key);
                    }
                }
            } catch (error) {
                console.warn('Error reading from localStorage:', error);
            }
        }

        console.log('❌ Cache MISS:', url);
        return null;
    }

    /**
     * Lưu data vào cache
     */
    set(url, data, params = {}) {
        const key = this.generateKey(url, params);
        const cacheEntry = {
            data,
            timestamp: Date.now(),
            url
        };

        // Save to memory
        this.memoryCache.set(key, cacheEntry);

        // Save to localStorage
        if (this.useLocalStorage) {
            try {
                localStorage.setItem(key, JSON.stringify(cacheEntry));
            } catch (error) {
                console.warn('Error saving to localStorage:', error);
                // If quota exceeded, clear old cache
                if (error.name === 'QuotaExceededError') {
                    this.clearOldCache();
                    // Try again
                    try {
                        localStorage.setItem(key, JSON.stringify(cacheEntry));
                    } catch (e) {
                        console.error('Still cannot save to localStorage');
                    }
                }
            }
        }

        console.log('💾 Cached:', url);
    }

    /**
     * Kiểm tra cache còn valid không
     */
    isValid(cacheEntry) {
        if (!cacheEntry || !cacheEntry.timestamp) {
            return false;
        }
        return Date.now() - cacheEntry.timestamp < this.cacheDuration;
    }

    /**
     * Load cache từ localStorage vào memory
     */
    loadFromLocalStorage() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        try {
                            const parsed = JSON.parse(stored);
                            if (this.isValid(parsed)) {
                                this.memoryCache.set(key, parsed);
                            } else {
                                localStorage.removeItem(key);
                            }
                        } catch (e) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            });
        } catch (error) {
            console.warn('Error loading from localStorage:', error);
        }
    }

    /**
     * Xóa cache cũ
     */
    clearOldCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        try {
                            const parsed = JSON.parse(stored);
                            if (!this.isValid(parsed)) {
                                localStorage.removeItem(key);
                            }
                        } catch (e) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            });
        } catch (error) {
            console.warn('Error clearing old cache:', error);
        }
    }

    /**
     * Xóa toàn bộ cache
     */
    clear() {
        this.memoryCache.clear();

        if (this.useLocalStorage) {
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (error) {
                console.warn('Error clearing localStorage:', error);
            }
        }

        console.log('🗑️ Cache cleared');
    }

    /**
     * Fetch với cache
     */
    async fetch(url, options = {}) {
        const params = options.params || {};

        // Check cache first
        const cached = this.get(url, params);
        if (cached) {
            return cached;
        }

        // Fetch from API
        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: options.headers || { 'accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Cache the result
            this.set(url, data, params);

            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
}

// Create global instance
window.apiCache = new APICache({
    cacheDuration: 5 * 60 * 1000, // 5 phút
    useLocalStorage: true,
    prefix: 'aphim_cache_'
});

// Export
window.APICache = APICache;

console.log('✅ API Cache Enhanced initialized');
