/**
 * Movie Slider - Drag to Scroll + Wheel to Horizontal
 * Works on all horizontal movie sliders across the site
 * Unified: distinguishes drag/swipe vs click for both Mouse and Touch, handles mouseup outside
 */
(function() {
    'use strict';

    const DRAG_THRESHOLD = 8; // px - minimum distance to consider it a drag/swipe

    // -- DRAG & SWIPE TO SCROLL --
    function initSliderDrag(slider) {
        let isDown = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let hasDragged = false;
        let lockVertical = false;

        // Qu�n t�nh (Inertia)
        let lastX = 0;
        let lastTime = 0;
        let velocity = 0;
        let rafId = null;

        // --- MOUSE EVENTS (Desktop Drag-to-Scroll) ---
        slider.addEventListener('mousedown', function(e) {
            // Ignore if middle/right click
            if (e.button !== 0) return;

            isDown = true;
            hasDragged = false;
            lockVertical = false;
            slider.classList.add('active');

            // T?m th?i t?t cu?n mu?t v� snap-scroll d? k�o mu?t m� 1:1 theo chu?t
            slider.classList.add('is-dragging');
            

            startX = e.pageX - slider.offsetLeft;
            startY = e.pageY - slider.offsetTop;
            scrollLeft = slider.scrollLeft;

            // Kh?i t?o t�nh to�n qu�n t�nh
            lastX = e.pageX;
            lastTime = Date.now();
            velocity = 0;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        });

        // Global mouseup to prevent stuck drag
        window.addEventListener('mouseup', function() {
            if (!isDown) return;
            isDown = false;
            slider.classList.remove('active');
            lockVertical = false;

            // Kh�i ph?c thu?c t�nh CSS ban d?u
            slider.classList.remove('is-dragging');
            

            if (hasDragged) {
                slider.setAttribute('data-dragged', 'true');
                setTimeout(function() {
                    slider.removeAttribute('data-dragged');
                }, 300);

                // Th?c hi?n lu?t qu�n t�nh t? t? mu?t m�
                if (Math.abs(velocity) > 0.1) {
                    let tempVelocity = velocity;
                    const inertiaStep = function() {
                        if (isDown) return; // D?ng l?i n?u ngu?i d�ng click/ch?m ti?p

                        tempVelocity *= 0.93; // H? s? ma s�t (gi?m d?n t?c d?)
                        if (Math.abs(tempVelocity) < 0.08) return;

                        slider.scrollLeft -= tempVelocity * 12;
                        rafId = requestAnimationFrame(inertiaStep);
                    };
                    rafId = requestAnimationFrame(inertiaStep);
                }
            }
        });

        slider.addEventListener('mousemove', function(e) {
            if (!isDown) return;

            const xVal = e.pageX - slider.offsetLeft;
            const yVal = e.pageY - slider.offsetTop;
            const dx = Math.abs(xVal - startX);
            const dy = Math.abs(yVal - startY);

            // Ph�n bi?t cu?n d?c vs k�o ngang tru?c khi x�c nh?n k�o slider
            if (!hasDragged) {
                if (dy > dx && dy > 4) {
                    // C? ch? cu?n d?c -> H?y k�o slider d? trang cu?n d?c t? nhi�n
                    isDown = false;
                    slider.classList.remove('active');
                    slider.classList.remove('is-dragging');
                    
                    return;
                }
                if (dx >= DRAG_THRESHOLD) {
                    hasDragged = true;
                    lockVertical = true;
                } else {
                    return; // �?i vu?t ngu?ng threshold
                }
            }

            e.preventDefault(); // Ch?n h�nh vi k�o th? ?nh/ch? m?c d?nh c?a tr�nh duy?t

            // Di chuy?n slider theo tay chu?t
            const walk = (xVal - startX) * 1.5;
            slider.scrollLeft = scrollLeft - walk;

            // T�nh v?n t?c k�o cho qu�n t�nh
            const now = Date.now();
            const dt = now - lastTime;
            if (dt > 0) {
                const currentX = e.pageX;
                velocity = (currentX - lastX) / dt;
                lastX = currentX;
                lastTime = now;
            }
        });

        // Prevent native image/link dragging browser behavior
        slider.addEventListener('dragstart', function(e) {
            e.preventDefault();
        });

        // --- TOUCH EVENTS (Mobile Swipe Guard) ---
        let touchStartX = 0;
        let touchStartY = 0;
        let touchHasDragged = false;

        slider.addEventListener('touchstart', function(e) {
            if (!e.touches || e.touches.length === 0) return;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchHasDragged = false;

            // D?ng ho?t d?ng qu�n t�nh khi ngu?i d�ng ch?m v�o m�n h�nh
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }, { passive: true });

        slider.addEventListener('touchmove', function(e) {
            if (!e.touches || e.touches.length === 0 || touchHasDragged) return;
            const dx = Math.abs(e.touches[0].clientX - touchStartX);
            const dy = Math.abs(e.touches[0].clientY - touchStartY);

            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                touchHasDragged = true;
            }
        }, { passive: true });

        slider.addEventListener('touchend', function() {
            if (touchHasDragged) {
                slider.setAttribute('data-dragged', 'true');
                setTimeout(function() {
                    slider.removeAttribute('data-dragged');
                }, 300);
            }
            touchHasDragged = false;
        }, { passive: true });

        // --- CLICK INTERCEPTOR (Capture Phase) ---
        slider.addEventListener('click', function(e) {
            if (slider.getAttribute('data-dragged') === 'true') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
        }, true);
    }

    // -- INIT ALL SLIDERS --
    function init() {
        // Select all horizontal sliders/scrollers
        const sliders = document.querySelectorAll('.overflow-x-auto, .snap-x, .scrollbar-hide, #heroThumbnails');

        sliders.forEach(function(slider) {
            // Skip elements that are not sliders (like small nav bars or pagination)
            if (slider.classList.contains('justify-center') || slider.tagName === 'NAV') return;
            
            if (slider.dataset.sliderInit) return;
            slider.dataset.sliderInit = 'true';

            initSliderDrag(slider);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-init after dynamic content loads
    window.refreshMovieSliders = function() {
        const sliders = document.querySelectorAll('.overflow-x-auto, .snap-x, .scrollbar-hide, #heroThumbnails');
        sliders.forEach(function(slider) {
            delete slider.dataset.sliderInit;
        });
        init();
    };
})();




