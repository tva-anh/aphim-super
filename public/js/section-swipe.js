/**
 * Master Sitewide Drag-To-Scroll Engine (APhim Super)
 * Enables click-and-drag horizontal scrolling for desktop mouse users
 * and ultra-smooth, native touch swipe for mobile / tablet users across the website.
 */
(function () {
    'use strict';

    const DRAG_THRESHOLD = 8; // px threshold for drag movement
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Helper: Find closest scrollable horizontal container from an element
    function findScrollableContainer(target) {
        let el = target;
        while (el && el !== document.body && el !== document.documentElement) {
            if (el.matches && el.matches(
                '.overflow-x-auto, .overflow-x-scroll, [class*="overflow-x-"], ' +
                '.de-cu-slider, .scrollbar-hide, #heroThumbnails, #movie-gallery-scroll, ' +
                '#actor-list, #episode-list, .interests-wrapper, .az-container, ' +
                '.horizontal-scroll-container, .ranking-grid-container, [data-drag-scroll="true"]'
            )) {
                if (el.scrollWidth > el.clientWidth || window.getComputedStyle(el).overflowX !== 'visible') {
                    return el;
                }
            }
            
            if (el.scrollWidth > el.clientWidth + 5) {
                const style = window.getComputedStyle(el);
                if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
                    return el;
                }
            }
            el = el.parentElement;
        }
        return null;
    }

    let activeContainer = null;
    let isMouseDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let scrollLeftStart = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumRaf = null;
    let dragPreventClickTimer = null;
    let isTouchActive = false;

    // --- DESKTOP MOUSE DRAG-TO-SCROLL (Ignored during touch) ---
    document.addEventListener('mousedown', function (e) {
        if (isTouchActive) return;
        if (e.button !== 0) return; // Only left click
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; // Ignore simulated mouse events

        const container = findScrollableContainer(e.target);
        if (!container) return;

        if (momentumRaf) {
            cancelAnimationFrame(momentumRaf);
            momentumRaf = null;
        }

        activeContainer = container;
        isMouseDown = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeftStart = container.scrollLeft;
        lastX = e.clientX;
        lastTime = performance.now();
        velocity = 0;
    }, { capture: true, passive: true });

    document.addEventListener('mousemove', function (e) {
        if (isTouchActive || !isMouseDown || !activeContainer) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (!isDragging) {
            // Cancel horizontal drag if vertical mouse movement is dominant
            if (absDy > absDx && absDy > 10) {
                isMouseDown = false;
                activeContainer = null;
                return;
            }
            if (absDx >= DRAG_THRESHOLD) {
                isDragging = true;
                activeContainer.classList.add('is-dragging-scroll');
                document.body.classList.add('select-none-global');
            } else {
                return;
            }
        }

        e.preventDefault();

        // Perform 1:1 mouse drag scroll
        activeContainer.scrollLeft = scrollLeftStart - dx;

        // Velocity tracking for smooth momentum
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
            velocity = (e.clientX - lastX) / dt;
            lastX = e.clientX;
            lastTime = now;
        }
    }, { capture: true, passive: false });

    function handleMouseUp() {
        if (!isMouseDown) return;

        const container = activeContainer;
        isMouseDown = false;

        if (container) {
            container.classList.remove('is-dragging-scroll');
        }
        document.body.classList.remove('select-none-global');

        if (isDragging) {
            if (container) {
                container.setAttribute('data-was-dragged', 'true');
            }

            // Momentum Inertia Effect for mouse drag
            if (container && Math.abs(velocity) > 0.15) {
                let v = velocity * 14;
                const step = function () {
                    if (isMouseDown || Math.abs(v) < 0.3) {
                        momentumRaf = null;
                        return;
                    }
                    container.scrollLeft -= v;
                    v *= 0.92;
                    momentumRaf = requestAnimationFrame(step);
                };
                momentumRaf = requestAnimationFrame(step);
            }

            clearTimeout(dragPreventClickTimer);
            dragPreventClickTimer = setTimeout(function () {
                isDragging = false;
                if (container) {
                    container.removeAttribute('data-was-dragged');
                }
                activeContainer = null;
            }, 120);
        } else {
            activeContainer = null;
        }
    }

    document.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('blur', handleMouseUp);

    // --- NATIVE MOBILE TOUCH HANDLING ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchContainer = null;
    let touchSwiped = false;

    document.addEventListener('touchstart', function (e) {
        isTouchActive = true;
        if (!e.touches || e.touches.length === 0) return;
        const container = findScrollableContainer(e.target);
        if (!container) return;

        touchContainer = container;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchSwiped = false;
    }, { capture: true, passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!touchContainer || !e.touches || e.touches.length === 0) return;
        const dx = Math.abs(e.touches[0].clientX - touchStartX);
        const dy = Math.abs(e.touches[0].clientY - touchStartY);

        if (dx > DRAG_THRESHOLD && dx > dy) {
            touchSwiped = true;
            touchContainer.setAttribute('data-was-dragged', 'true');
        }
    }, { capture: true, passive: true });

    document.addEventListener('touchend', function () {
        setTimeout(() => { isTouchActive = false; }, 300);
        if (touchSwiped && touchContainer) {
            const container = touchContainer;
            clearTimeout(dragPreventClickTimer);
            dragPreventClickTimer = setTimeout(function () {
                touchSwiped = false;
                if (container) container.removeAttribute('data-was-dragged');
                touchContainer = null;
            }, 120);
        } else {
            touchSwiped = false;
            touchContainer = null;
        }
    }, { capture: true, passive: true });

    document.addEventListener('touchcancel', function () {
        isTouchActive = false;
        touchSwiped = false;
        touchContainer = null;
    }, { capture: true, passive: true });

    // --- CLICK GUARD FOR DRAG / SWIPE (Prevent accidental link clicks when dragging) ---
    document.addEventListener('click', function (e) {
        if (isDragging || touchSwiped || (e.target && e.target.closest && e.target.closest('[data-was-dragged="true"]'))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, true);

    // Prevent ghost image drag in desktop browser
    document.addEventListener('dragstart', function (e) {
        if (findScrollableContainer(e.target)) {
            e.preventDefault();
        }
    }, true);

    // Inject Fluid Mobile Touch & Desktop Grab Styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .overflow-x-auto, .overflow-x-scroll, [class*="overflow-x-"],
        .de-cu-slider, .scrollbar-hide, #heroThumbnails, #movie-gallery-scroll,
        #actor-list, #episode-list, .interests-wrapper, .az-container,
        .horizontal-scroll-container, .ranking-grid-container, [data-drag-scroll="true"] {
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-x pan-y !important;
            overscroll-behavior-x: contain !important;
        }
        @media (hover: hover) and (pointer: fine) {
            .overflow-x-auto, .overflow-x-scroll, [class*="overflow-x-"],
            .de-cu-slider, .scrollbar-hide, #heroThumbnails, #movie-gallery-scroll,
            #actor-list, #episode-list, .interests-wrapper, .az-container,
            .horizontal-scroll-container, .ranking-grid-container, [data-drag-scroll="true"] {
                cursor: grab;
                -webkit-user-select: none;
                user-select: none;
            }
        }
        .is-dragging-scroll, .is-dragging-scroll * {
            cursor: grabbing !important;
            -webkit-user-select: none !important;
            user-select: none !important;
        }
        .select-none-global {
            -webkit-user-select: none !important;
            user-select: none !important;
        }
    `;
    document.head.appendChild(styleEl);

    console.log('[APhim Engine] Sitewide Horizontal Touch & Mouse Drag Engine initialized.');
})();