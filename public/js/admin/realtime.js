// Real-time Data Sync for Admin Panel
// This module handles real-time updates from MongoDB

class RealtimeSync {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.listeners = new Map();
        this.pollInterval = 30000; // 30 seconds
        this.intervals = new Map();
    }

    // Subscribe to real-time updates for a resource
    subscribe(resource, callback, interval = this.pollInterval) {
        if (!this.listeners.has(resource)) {
            this.listeners.set(resource, []);
        }

        this.listeners.get(resource).push(callback);

        // Start polling if not already started
        if (!this.intervals.has(resource)) {
            this.startPolling(resource, interval);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(resource, callback);
    }

    // Unsubscribe from updates
    unsubscribe(resource, callback) {
        const callbacks = this.listeners.get(resource);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }

            // Stop polling if no more listeners
            if (callbacks.length === 0) {
                this.stopPolling(resource);
            }
        }
    }

    // Start polling for a resource
    startPolling(resource, interval) {
        const poll = async () => {
            try {
                const data = await this.fetchResource(resource);
                this.notifyListeners(resource, data);
            } catch (error) {
                console.error(`Error polling ${resource}:`, error);
            }
        };

        // Initial fetch
        poll();

        // Set up interval
        const intervalId = setInterval(poll, interval);
        this.intervals.set(resource, intervalId);
    }

    // Stop polling for a resource
    stopPolling(resource) {
        const intervalId = this.intervals.get(resource);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(resource);
        }
    }

    // Fetch resource from API
    async fetchResource(resource) {
        const token = localStorage.getItem('cinestream_admin_token') || sessionStorage.getItem('cinestream_admin_token');
        const response = await fetch(`${this.apiUrl}/${resource}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.success ? data.data : null;
    }

    // Notify all listeners for a resource
    notifyListeners(resource, data) {
        const callbacks = this.listeners.get(resource);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in listener callback for ${resource}:`, error);
                }
            });
        }
    }

    // Get stats with caching
    async getStats(resource, cacheDuration = 60000) {
        const cacheKey = `stats_${resource}`;
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            return cached;
        }

        const token = localStorage.getItem('cinestream_admin_token') || sessionStorage.getItem('cinestream_admin_token');
        const response = await fetch(`${this.apiUrl}/${resource}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const stats = data.success ? data.data : null;

        this.saveToCache(cacheKey, stats, cacheDuration);
        return stats;
    }

    // Cache helpers
    getFromCache(key) {
        const item = localStorage.getItem(`cache_${key}`);
        if (!item) return null;

        const { data, expiry } = JSON.parse(item);
        if (Date.now() > expiry) {
            localStorage.removeItem(`cache_${key}`);
            return null;
        }

        return data;
    }

    saveToCache(key, data, duration) {
        const item = {
            data,
            expiry: Date.now() + duration
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    }

    clearCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }

    // Cleanup all intervals
    destroy() {
        this.intervals.forEach((intervalId, resource) => {
            clearInterval(intervalId);
        });
        this.intervals.clear();
        this.listeners.clear();
    }
}

// Create global instance
// Auto-detect environment
const realtimeApiUrl = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) 
    ? API_CONFIG.BACKEND_URL 
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://a-phim-production-eba6.up.railway.app/api');
const realtimeSync = new RealtimeSync(realtimeApiUrl);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealtimeSync, realtimeSync };
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    realtimeSync.destroy();
});
