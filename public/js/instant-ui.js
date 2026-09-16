// Instant UI - Show content immediately with skeleton loading

class InstantUI {
    constructor() {
        this.init();
    }

    init() {
        console.log('⚡ Instant UI initialized');
        // Fix for Bfcache: remove page-exiting when restoring from back button
        window.addEventListener('pageshow', () => {
            if (document.body) {
                document.body.classList.remove('page-exiting');
            }
        });
    }

    // Show skeleton loading for movie grid
    showMovieGridSkeleton(container, count = 20) {
        const skeletonHTML = Array(count).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-poster"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-subtitle"></div>
            </div>
        `).join('');

        container.innerHTML = skeletonHTML;
        container.classList.remove('hidden');
    }

    // Show skeleton for category grid
    showCategoryGridSkeleton(container, count = 20) {
        const skeletonHTML = Array(count).fill(0).map(() => `
            <div class="skeleton-card" style="aspect-ratio: 1/1;">
                <div class="skeleton-poster" style="aspect-ratio: 1/1;"></div>
            </div>
        `).join('');

        container.innerHTML = skeletonHTML;
        container.classList.remove('hidden');
    }

    // Progressive image loading
    loadImageProgressively(img, src) {
        return new Promise((resolve, reject) => {
            // Create a temporary image to preload
            const tempImg = new Image();

            tempImg.onload = () => {
                img.src = src;
                img.classList.remove('loading');
                img.classList.add('loaded');

                // Mark parent as loaded
                const parent = img.closest('.progressive-image');
                if (parent) {
                    parent.classList.add('loaded');
                }

                resolve();
            };

            tempImg.onerror = () => {
                // Fallback: show placeholder
                img.classList.remove('loading');
                img.classList.add('error');
                reject();
            };

            // Start loading
            tempImg.src = src;
        });
    }

    // Batch load images with priority
    async loadImagesInBatches(images, batchSize = 5) {
        const batches = [];
        for (let i = 0; i < images.length; i += batchSize) {
            batches.push(images.slice(i, i + batchSize));
        }

        for (const batch of batches) {
            await Promise.all(
                batch.map(img => {
                    const src = img.dataset.src || img.getAttribute('data-src');
                    if (src) {
                        return this.loadImageProgressively(img, src);
                    }
                    return Promise.resolve();
                })
            );
        }
    }

    // Render movies with instant skeleton → real content
    async renderMoviesInstantly(container, movies, renderFunction) {
        // 1. Show skeleton immediately
        this.showMovieGridSkeleton(container, movies.length);

        // 2. Wait a tiny bit for skeleton to render
        await new Promise(resolve => setTimeout(resolve, 50));

        // 3. Render real content
        container.innerHTML = movies.map((movie, index) => {
            const html = renderFunction(movie);
            // Add grid-item class for stagger animation
            return html.replace(/class="/, `class="grid-item `);
        }).join('');

        // 4. Progressive load images
        const images = container.querySelectorAll('img[data-src], img[src]');
        this.loadImagesInBatches(Array.from(images), 5);
    }

    // Optimized image URL with CDN parameters
    getOptimizedImageURL(url, width = 300, quality = 80) {
        if (!url) return '';

        // If already a full URL, return as is
        if (url.startsWith('http')) return url;

        // Build optimized CDN URL
        const baseURL = 'https://phimimg.com/';
        return `${baseURL}${url}?w=${width}&q=${quality}`;
    }

    // Preload critical images
    preloadImages(urls) {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
        });
    }

    // Show loading overlay
    showLoadingOverlay(message = 'Đang tải...') {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
        overlay.innerHTML = `
            <div class="bg-surface-dark p-6 rounded-xl border border-white/10 flex flex-col items-center gap-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p class="text-white">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Instant page transition — không delay, dùng CSS class
    transitionToPage(url) {
        if (!url || url === '#') return;
        // Dùng TouchSpeed nếu có (ưu tiên)
        if (window.TouchSpeed && window.TouchSpeed.navigate) {
            window.TouchSpeed.navigate(url);
            return;
        }
        // Fallback: fade body ra rồi navigate
        document.body.classList.add('page-exiting');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.location.href = url;
            });
        });
    }
}

// Initialize
const instantUI = new InstantUI();

// Export for global use
window.instantUI = instantUI;
