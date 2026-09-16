// Lazy Load Images - Tăng tốc độ trang
(function () {
    'use strict';

    // Intersection Observer cho lazy loading
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;

                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px' // Load trước 50px
    });

    // Observe tất cả images có data-src
    function observeImages() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // Init khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeImages);
    } else {
        observeImages();
    }

    // Export để có thể gọi lại sau khi load dynamic content
    window.initLazyLoad = observeImages;

})();
