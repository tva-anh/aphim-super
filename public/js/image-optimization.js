// Image Optimization & Lazy Loading + Progressive Blur-Up
class ImageOptimizer {
    constructor() {
        this.imageCache = new Map();
        this.loadingImages = new Set();
        this.isMobile = window.innerWidth <= 768;
        // Re-check on resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        }, { passive: true });
    }

    // Optimize image URL with CDN parameters
            optimizeImageUrl(url, width = 400, quality = 80, isPriority = false) {
        if (!url) return 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22 style=%22background:%23111%22%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E';
        
        let resolvedUrl = url;
        if (!resolvedUrl.startsWith('http')) {
            let filename = resolvedUrl.replace(/^\//, '');
            if (!filename.startsWith('uploads/')) {
                filename = 'uploads/movies/' + filename;
            }
            resolvedUrl = "https://phimimg.com/" + filename;
        }

        if (!resolvedUrl.includes('localhost') && !resolvedUrl.includes('127.0.0.1')) {
            // Priority images (like Hero Banner) bypass WP CDN proxy to ensure 
            // 100% original quality and fastest possible direct load without processing delay.
            if (isPriority === true) return resolvedUrl;

            let targetWidth = width;
            let targetQuality = quality;

            if (typeof this.isMobile !== 'undefined' && !this.isMobile) {
                targetQuality = Math.min(quality || 85, 90);
                if (targetQuality < 80) targetQuality = 85;
                targetWidth = Math.max(width, 800);
                if (isPriority) {
                    targetWidth = Math.max(width, 1920);
                    targetQuality = 90;
                }
            } else {
                if (isPriority) {
                    targetWidth = Math.max(width, 1200); 
                    targetQuality = Math.max(quality || 90, 90); 
                } else {
                    targetWidth = Math.min(width, 600);
                    targetQuality = Math.min(quality || 75, 75);
                }
            }
            
            // Chia cắt logic: Các ảnh Hero Thumbnails tải trực tiếp siêu tốc (Bypass CDN để không bị timeout)
            if (isPriority === 'thumbnail') {
                return resolvedUrl;
            }

            // DO CLOUDFLARE BLOCK WSRV.NL KHI TẢI TỪ IMG.OPHIM.LIVE (LỖI 302 ToS ABUSE), CHÚNG TA BUỘC PHẢI DÙNG LINK TRỰC TIẾP
            return resolvedUrl;
        }

        return resolvedUrl;
    }

    getProgressiveUrls(url) {
        if (!url) return { placeholder: null, full: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22 style=%22background:%23111%22%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E' };

        let full = url;
        if (!full.startsWith('http')) {
            let filename = full.replace(/^\//, "");
            if (!filename.startsWith('uploads/')) {
                filename = 'uploads/movies/' + filename;
            }
            full = "https://phimimg.com/" + filename;
        }

        // Bỏ qua CDN nếu đang run local
        if (full.includes('localhost') || full.includes('127.0.0.1')) {
            return { placeholder: null, full: full };
        }

        // DO CLOUDFLARE BLOCK WSRV.NL, CHÚNG TA KHÔNG THỂ DÙNG PROGRESSIVE BẰNG CDN TRUNG GIAN NỮA
        return {
            placeholder: null,
            full: full
        };
    }

    // ─────────────────────────────────────────────────────────────────
    // Apply progressive load lên một <img> element
    // imgEl: HTMLImageElement với class "img-progressive"
    // originalUrl: URL ảnh gốc (trước khi optimize)
    // ─────────────────────────────────────────────────────────────────
    applyProgressiveLoad(imgEl, originalUrl) {
        const { placeholder, full } = this.getProgressiveUrls(originalUrl);

        // Desktop hoặc không có placeholder → load thẳng, thêm class desktop
        if (!placeholder) {
            imgEl.classList.add('img-desktop');
            imgEl.src = full;
            return;
        }

        // Gán placeholder ngay lập tức → người dùng thấy nội dung tức thì
        imgEl.classList.add('img-loading');
        imgEl.src = placeholder;

        // Tải full-quality trong nền
        const fullImg = new Image();
        fullImg.onload = () => {
            // Swap sang full khi load xong
            imgEl.src = full;
            imgEl.classList.remove('img-loading');
            imgEl.classList.add('img-loaded');

            // Đánh dấu wrapper
            const wrap = imgEl.closest('.img-progressive-wrap');
            if (wrap) wrap.classList.add('img-wrap-loaded');
        };
        fullImg.onerror = () => {
            // Nếu lỗi: giữ placeholder hoặc fallback
            imgEl.classList.remove('img-loading');
            imgEl.classList.add('img-loaded');
        };
        fullImg.src = full;
    }

    // ─────────────────────────────────────────────────────────────────
    // Setup IntersectionObserver để trigger progressive load khi ảnh
    // vào viewport (kết hợp với lazy loading sẵn có)
    // ─────────────────────────────────────────────────────────────────
    setupProgressiveObserver() {
        if (!('IntersectionObserver' in window)) {
            // Fallback: load ngay tất cả
            document.querySelectorAll('img.img-progressive[data-original-src]').forEach(img => {
                this.applyProgressiveLoad(img, img.dataset.originalSrc);
            });
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                const originalSrc = img.dataset.originalSrc;
                if (originalSrc && !img.dataset.progressiveStarted) {
                    img.dataset.progressiveStarted = '1';
                    this.applyProgressiveLoad(img, originalSrc);
                    obs.unobserve(img);
                }
            });
        }, {
            rootMargin: '80px 0px', // Bắt đầu load trước 80px khi vào viewport
            threshold: 0
        });

        document.querySelectorAll('img.img-progressive[data-original-src]').forEach(img => {
            observer.observe(img);
        });

        return observer;
    }

    // Preload image
    preloadImage(url) {
        if (this.imageCache.has(url)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(url, true);
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    // Setup lazy loading for images
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(async entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;

                        // --- TMDB LAZY LOADING ---
                        if (img.dataset.tmdbName || img.dataset.tmdbSlug) {
                            observer.unobserve(img); // Prevent duplicate loads
                            
                            // Load fallback src if present
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                            }

                            // Fetch from TMDB
                            const tmdbUrl = await this.getTMDBImageUrl(img);
                            if (tmdbUrl) {
                                // Mượt mà thay thế ảnh
                                const tempImg = new Image();
                                tempImg.onload = () => { img.src = tmdbUrl; };
                                tempImg.src = tmdbUrl;
                            }
                            return;
                        }

                        // Normal lazy loading
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '150px' // Tăng root margin để load ảnh sớm hơn khi cuộn
            });

            // Observe all lazy-load images (bao gồm cả ảnh có data-tmdb-name)
            document.querySelectorAll('img[data-src], img[data-tmdb-name], img[data-tmdb-slug]').forEach(img => {
                imageObserver.observe(img);
            });

            return imageObserver;
        }
    }

    // Batch preload images
    async preloadImages(urls, batchSize = 5) {
        const batches = [];
        for (let i = 0; i < urls.length; i += batchSize) {
            batches.push(urls.slice(i, i + batchSize));
        }

        for (const batch of batches) {
            await Promise.allSettled(
                batch.map(url => this.preloadImage(url))
            );
        }
    }

    // Helper: tạo HTML img tag với progressive loading sẵn sàng
    // Dùng trong các section render card
    createProgressiveImgTag({ originalUrl, altText, extraClasses = '', extraAttrs = '' }) {
        const isMob = this.isMobile && originalUrl && originalUrl.includes('ophim.live');

        if (isMob) {
            // Mobile: dùng progressive, src ban đầu là empty, data-original-src để observer xử lý
            return `<img
                alt="${altText}"
                class="img-progressive img-loading ${extraClasses}"
                data-original-src="${originalUrl}"
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null"
                ${extraAttrs}
            />`;
        } else {
            // Desktop: load trực tiếp ảnh gốc
            return `<img
                alt="${altText}"
                class="img-progressive img-desktop ${extraClasses}"
                src="${originalUrl}"
                onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null"
                loading="lazy"
                ${extraAttrs}
            />`;
        }
    }

    // --- TMDB INTEGRATION ---
    async getTMDBImageUrl(img) {
        const slug = img.dataset.tmdbSlug;
        const tmdbId = img.dataset.tmdbId;
        const name = img.dataset.tmdbName;
        const year = img.dataset.tmdbYear;
        const type = img.dataset.tmdbType || 'poster';

        if (!slug && !name) return null;

        const cacheKey = `tmdb_img_${type}_${slug || name}_${tmdbId || ''}`;
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
                return cached === 'null' ? null : cached;
            }
        } catch (e) {}

        const TMDB_PROXY_URL = '/api/tmdb';
        let imageUrl = null;

        try {
            // 1. Try movieAPI.getMovieImages (Exact match with movie-detail, routes through backend)
            if (slug && typeof movieAPI !== 'undefined' && movieAPI.getMovieImages) {
                const json = await movieAPI.getMovieImages(slug);
                let imagesList = null;
                
                if (json && json.data && json.data.images) {
                    imagesList = json.data.images;
                } else if (json && json.images) {
                    imagesList = json.images;
                }

                if (imagesList && imagesList.length > 0) {
                    if (type === 'backdrop') {
                        const bd = imagesList.find(i => i.type === 'backdrop' || i.aspect_ratio > 1);
                        if (bd) imageUrl = `https://image.tmdb.org/t/p/w780${bd.file_path}`;
                    } else {
                        const pt = imagesList.find(i => i.type === 'poster' || i.aspect_ratio <= 1) || imagesList[0];
                        if (pt) imageUrl = `https://image.tmdb.org/t/p/w500${pt.file_path}`;
                    }
                }
            }

            // 2. Try TMDB ID with strict 1200ms timeout
            if (!imageUrl && tmdbId && tmdbId !== 'undefined' && tmdbId !== 'null' && tmdbId !== '') {
                const mediaType = (img.dataset?.tmdbMediaType === 'tv' || img.dataset?.tmdbType === 'tv') ? 'tv' : 'movie';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1200);
                try {
                    const res = await fetch(`${TMDB_PROXY_URL}/${mediaType}/${tmdbId}?language=vi-VN`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        const data = await res.json();
                        const tmdbTitle = (data.title || data.name || data.original_title || data.original_name || '').toLowerCase();
                        const reqName = (name || slug || '').toLowerCase().replace(/[-_]/g, ' ');

                        // Verify title match if name is available to prevent wrong ID assignment
                        let isMatch = true;
                        if (reqName && tmdbTitle) {
                            const reqWords = reqName.split(' ').filter(w => w.length > 2);
                            const hasCommonWord = reqWords.some(w => tmdbTitle.includes(w));
                            if (!hasCommonWord && reqWords.length > 0) {
                                isMatch = false;
                            }
                        }

                        if (isMatch) {
                            if (type === 'backdrop') {
                                const path = data.backdrop_path || data.poster_path;
                                if (path) imageUrl = `https://image.tmdb.org/t/p/w780${path}`;
                            } else {
                                const path = data.poster_path || data.backdrop_path;
                                if (path) imageUrl = `https://image.tmdb.org/t/p/w500${path}`;
                            }
                        }
                    }
                } catch (err) {
                    clearTimeout(timeoutId);
                }
            }

            // 3. Fallback to Search if ID failed or not present (with 1200ms timeout)
            if (!imageUrl && name && !tmdbId) {
                const searchName = encodeURIComponent(name);
                const yearParam = year && year !== 'undefined' && year !== 'null' ? `&year=${year}` : '';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1200);
                try {
                    const res = await fetch(`${TMDB_PROXY_URL}/search/multi?query=${searchName}${yearParam}&language=vi-VN`, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                            const first = data.results[0];
                            if (type === 'backdrop') {
                                const path = first.backdrop_path || first.poster_path;
                                if (path) imageUrl = `https://image.tmdb.org/t/p/w780${path}`;
                            } else {
                                const path = first.poster_path || first.backdrop_path;
                                if (path) imageUrl = `https://image.tmdb.org/t/p/w500${path}`;
                            }
                        }
                    }
                } catch (err) {
                    clearTimeout(timeoutId);
                }
            }
        } catch (e) {}

        // Always cache result (even if null) to avoid infinite retry loops
        try { sessionStorage.setItem(cacheKey, imageUrl || 'null'); } catch(e) {}
        return imageUrl;
    }
}

// Initialize image optimizer
const imageOptimizer = new ImageOptimizer();

// Setup lazy loading và progressive observer on page load
document.addEventListener('DOMContentLoaded', () => {
    imageOptimizer.setupLazyLoading();
});

// Debounced DOM observer for dynamic content
let _mutationDebounceTimer = null;
const _progressiveMutationObserver = new MutationObserver(() => {
    if (_mutationDebounceTimer) return;
    _mutationDebounceTimer = setTimeout(() => {
        _mutationDebounceTimer = null;
        imageOptimizer.setupLazyLoading();
        imageOptimizer.setupProgressiveObserver();
    }, 300);
});

_progressiveMutationObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// Legacy mutation observer (kept for backward compatibility)
const mutationObserver = _progressiveMutationObserver;



