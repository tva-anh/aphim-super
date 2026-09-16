// Performance Optimization Module

class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.prefetchQueue = new Set();
        this.init();
    }

    init() {
        this.setupAPICache();
        this.setupPrefetch();
        this.setupImageOptimization();
        this.setupNavigationOptimization();
    }

    // 1. API Response Caching
    setupAPICache() {
        // Wrap fetch to add caching
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            // Only cache GET requests
            if (options.method && options.method !== 'GET') {
                return originalFetch(url, options);
            }

            // Check cache first
            const cacheKey = url.toString();
            const cached = this.getFromCache(cacheKey);

            if (cached) {
                console.log('📦 Cache hit:', url);
                return new Response(JSON.stringify(cached), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Fetch and cache
            try {
                const response = await originalFetch(url, options);
                const clone = response.clone();

                if (response.ok && url.includes('ophim')) {
                    const data = await clone.json();
                    this.setCache(cacheKey, data);
                }

                return response;
            } catch (error) {
                console.error('Fetch error:', error);
                throw error;
            }
        };
    }

    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        const now = Date.now();
        if (now - item.timestamp > this.cacheExpiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Limit cache size
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }

    // 2. Link Prefetching
    setupPrefetch() {
        // Prefetch on hover
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            // Only prefetch internal links
            if (href.startsWith('http') && !href.includes(window.location.hostname)) return;

            this.prefetchLink(href);
        }, { passive: true });
    }

    prefetchLink(href) {
        if (this.prefetchQueue.has(href)) return;
        this.prefetchQueue.add(href);

        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'document';
        document.head.appendChild(link);

        console.log('🔗 Prefetching:', href);
    }

    // 3. Image Optimization
    setupImageOptimization() {
        // Use Intersection Observer for lazy loading
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px' // Load 50px before entering viewport
            });

            // Observe all images with data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // 4. Navigation Optimization
    setupNavigationOptimization() {
        // Instant page navigation using History API
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href');

            // Skip external links, anchors, and special protocols
            if (!href ||
                href.startsWith('#') ||
                href.startsWith('javascript:') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:') ||
                (href.startsWith('http') && !href.includes(window.location.hostname))) {
                return;
            }

            // Skip if Ctrl/Cmd/Shift key is pressed (open in new tab)
            if (e.ctrlKey || e.metaKey || e.shiftKey) return;

            // Skip if target="_blank"
            if (link.target === '_blank') return;

            e.preventDefault();
            this.navigateInstant(href);
        });

        // Handle back/forward buttons
        window.addEventListener('popstate', () => {
            // Reset body styles trước khi reload (phòng trường hợp bfcache)
            this.resetBodyStyles();
            window.location.reload();
        });

        // FIX CHÍNH: Khi trang được restore từ bfcache (mobile back button)
        // persisted = true nghĩa là trang được lấy từ bfcache, không reload
        window.addEventListener('pageshow', (e) => {
            if (e.persisted) {
                // Trang restore từ bfcache → reset styles ngay lập tức
                this.resetBodyStyles();
            }
        });
    }

    resetBodyStyles() {
        document.body.style.opacity = '';
        document.body.style.pointerEvents = '';
    }

    navigateInstant(url) {
        // Show loading indicator
        document.body.style.opacity = '0.7';
        document.body.style.pointerEvents = 'none';

        // Safety net: nếu navigation thất bại sau 3 giây, tự reset
        setTimeout(() => {
            this.resetBodyStyles();
        }, 3000);

        // Navigate
        window.location.href = url;
    }

    // 5. Debounce utility
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 6. Throttle utility
    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize performance optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Expose utilities globally
window.debounce = performanceOptimizer.debounce.bind(performanceOptimizer);
window.throttle = performanceOptimizer.throttle.bind(performanceOptimizer);

// Clear cache on page unload (optional)
window.addEventListener('beforeunload', () => {
    // Keep cache for faster back navigation
    // performanceOptimizer.clearCache();
});

console.log('⚡ Performance optimizer initialized');
