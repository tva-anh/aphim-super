/**
 * Lazy Loader - Load sections khi scroll gần đến
 * Giảm thời gian tải trang ban đầu
 */

class LazyLoader {
    constructor(options = {}) {
        this.rootMargin = options.rootMargin || '200px';
        this.threshold = options.threshold || 0.01;
        this.loadedSections = new Set();

        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            {
                rootMargin: this.rootMargin,
                threshold: this.threshold
            }
        );
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this.loadedSections.has(entry.target)) {
                this.loadSection(entry.target);
            }
        });
    }

    loadSection(element) {
        const loadFunction = element.dataset.loadFunction;
        const sectionId = element.id;

        if (!loadFunction) {
            console.warn('No load function specified for section:', sectionId);
            return;
        }

        // Mark as loaded
        this.loadedSections.add(element);

        // Execute load function
        if (typeof window[loadFunction] === 'function') {
            console.log(`🚀 Lazy loading section: ${sectionId}`);
            window[loadFunction]();

            // Stop observing this element
            this.observer.unobserve(element);
        } else {
            console.error(`Load function not found: ${loadFunction}`);
        }
    }

    observe(selector) {
        const elements = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : [selector];

        elements.forEach(element => {
            if (element) {
                this.observer.observe(element);
            }
        });
    }

    disconnect() {
        this.observer.disconnect();
        this.loadedSections.clear();
    }
}

// Export for use
window.LazyLoader = LazyLoader;

// Auto-initialize for sections with data-lazy-load attribute
document.addEventListener('DOMContentLoaded', () => {
    const lazyLoader = new LazyLoader({
        rootMargin: '300px', // Load 300px trước khi vào viewport
        threshold: 0.01
    });

    // Observe all sections with data-load-function
    lazyLoader.observe('[data-load-function]');

    // Store instance globally
    window.lazyLoaderInstance = lazyLoader;
});
