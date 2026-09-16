/**
 * Fix Placeholder Timeout - Tự động chữa lành ảnh hỏng (Auto Heal Movie Image)
 */

(function () {
    'use strict';

    function fixPlaceholders() {
        document.querySelectorAll('img').forEach(img => {
            if (img.dataset.autoHealBound) return;
            img.dataset.autoHealBound = '1';

            const originalOnError = img.onerror;

            img.onerror = function (e) {
                if (typeof window.autoHealMovieImage === 'function') {
                    const slug = img.getAttribute('data-tmdb-slug') || img.getAttribute('data-slug') || '';
                    const title = img.alt || img.getAttribute('data-tmdb-name') || img.title || '';
                    window.autoHealMovieImage(this, slug, title);
                } else if (originalOnError) {
                    originalOnError.call(this, e);
                }
            };
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixPlaceholders);
    } else {
        fixPlaceholders();
    }

    const observer = new MutationObserver(() => {
        fixPlaceholders();
    });

    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();