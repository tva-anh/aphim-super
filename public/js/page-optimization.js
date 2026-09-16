// Page-specific optimization module

class PageOptimization {
    constructor() {
        this.init();
    }

    init() {
        this.optimizePageLoad();
        this.setupImageLazyLoading();
        this.setupInfiniteScroll();
    }

    // Optimize initial page load
    optimizePageLoad() {
        // Preload critical images
        this.preloadCriticalImages();

        // Defer non-critical CSS
        this.deferNonCriticalCSS();

        // Optimize font loading
        this.optimizeFontLoading();
    }

    preloadCriticalImages() {
        // Preload first few movie images
        const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
        if (preloadLinks.length === 0) {
            // Create preload links for first 5 images
            const images = document.querySelectorAll('img[src*="ophim.live"]');
            for (let i = 0; i < Math.min(5, images.length); i++) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = images[i].src;
                document.head.appendChild(link);
            }
        }
    }

    deferNonCriticalCSS() {
        // Load non-critical CSS asynchronously
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            if (!link.href.includes('skeleton') && !link.href.includes('navigation')) {
                link.media = 'print';
                link.onload = function () {
                    this.media = 'all';
                };
            }
        });
    }

    optimizeFontLoading() {
        // Use font-display: swap for faster text rendering
        const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
        fontLinks.forEach(link => {
            if (!link.href.includes('display=swap')) {
                link.href += '&display=swap';
            }
        });
    }

    // Setup lazy loading for images
    setupImageLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;

                        // Load image
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }

                        // Add loaded class
                        img.classList.add('loaded');

                        // Stop observing
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '100px' // Start loading 100px before entering viewport
            });

            // Observe all images with data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });

            // Also observe new images added dynamically
            const mutationObserver = new MutationObserver(() => {
                document.querySelectorAll('img[data-src]:not([data-observed])').forEach(img => {
                    img.setAttribute('data-observed', 'true');
                    imageObserver.observe(img);
                });
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Setup infinite scroll or pagination optimization
    setupInfiniteScroll() {
        // Detect when user scrolls near bottom
        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Prefetch next page data
                    this.prefetchNextPage();
                }
            });
        }, {
            rootMargin: '500px' // Prefetch when 500px from bottom
        });

        // Create sentinel element at bottom
        const sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        sentinel.style.height = '1px';
        document.body.appendChild(sentinel);

        scrollObserver.observe(sentinel);
    }

    prefetchNextPage() {
        // This will be called when user scrolls near bottom
        // Implement page-specific prefetch logic
        console.log('📍 Prefetching next page...');
    }

    // Utility: Measure performance
    measurePerformance() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;
            const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;

            console.log(`⏱️ Page Load Time: ${loadTime}ms`);
            console.log(`⏱️ DOM Ready Time: ${domReadyTime}ms`);

            // Send to analytics if available
            if (window.gtag) {
                gtag('event', 'page_load_time', {
                    'value': loadTime,
                    'event_category': 'performance'
                });
            }
        }
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const pageOptimization = new PageOptimization();
        pageOptimization.measurePerformance();
    });
} else {
    const pageOptimization = new PageOptimization();
    pageOptimization.measurePerformance();
}

console.log('🚀 Page optimization initialized');
