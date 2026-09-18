/**
 * A PHIM SUPER - Master Desktop & Mobile Horizontal Scroll Engine v4.0 (Ultra Smooth Edition)
 * Inspired by Netflix, Apple TV+ & Disney+ Desktop UI/UX
 *
 * Key Technical Solutions:
 * 1. Disables all hover triggers & reflows during drag via `pointer-events: none` on child items.
 * 2. High-precision EMA (Exponential Moving Average) velocity tracking.
 * 3. Time-delta independent friction glide `Math.pow(0.955, dt / 16.67)` for consistent 60Hz/120Hz/144Hz/240Hz smoothness.
 * 4. Silky smooth mouse wheel-to-horizontal spring interpolation.
 * 5. 100% Native untouched mobile touch swipe.
 */
(function () {
    'use strict';

    const DRAG_THRESHOLD = 6; // px threshold before initiating drag
    const isDesktopPointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Helper: Find closest scrollable horizontal container
    function findScrollableContainer(target) {
        let el = target;
        while (el && el !== document.body && el !== document.documentElement) {
            if (el.matches && el.matches(
                '.overflow-x-auto, .overflow-x-scroll, [class*="overflow-x-"], ' +
                '.de-cu-slider, .scrollbar-hide, #heroThumbnails, #movie-gallery-scroll, ' +
                '#actor-list, #episode-list, .interests-wrapper, .az-container, ' +
                '.horizontal-scroll-container, .ranking-grid-container, [data-drag-scroll="true"], .snap-x, .home-comments-track, .country-scroll-container, .cs-scroll-container'
            )) {
                if (el.scrollWidth > el.clientWidth + 4 || window.getComputedStyle(el).overflowX !== 'visible') {
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
    let floatScrollPos = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumRaf = null;
    let dragPreventClickTimer = null;
    let isTouchActive = false;

    // ─── 1. DESKTOP MOUSE DRAG-TO-SCROLL WITH TIME-DELTA KINETIC GLIDE ───
    document.addEventListener('mousedown', function (e) {
        if (isTouchActive || !isDesktopPointer()) return;
        if (e.button !== 0) return; // Only standard left click
        if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; // Ignore simulated touch

        const container = findScrollableContainer(e.target);
        if (!container) return;

        // Cancel running momentum / wheel animation on user grab
        if (momentumRaf) {
            cancelAnimationFrame(momentumRaf);
            momentumRaf = null;
        }
        if (container._wheelRaf) {
            cancelAnimationFrame(container._wheelRaf);
            container._wheelRaf = null;
        }

        activeContainer = container;
        isMouseDown = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeftStart = container.scrollLeft;
        floatScrollPos = container.scrollLeft;
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
            // Cancel horizontal drag if vertical mouse gesture is dominant
            if (absDy > absDx && absDy > 8) {
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

        // 1:1 Direct Pixel Tracking
        floatScrollPos = scrollLeftStart - dx;
        activeContainer.scrollLeft = Math.round(floatScrollPos);

        // Exponential Moving Average (EMA) Velocity Estimation
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0 && dt < 100) {
            const instantaneousV = (e.clientX - lastX) / dt;
            velocity = velocity * 0.3 + instantaneousV * 0.7;
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

        if (isDragging && container) {
            container.setAttribute('data-was-dragged', 'true');

            // High-precision Time-Delta Independent Inertia Glide
            if (Math.abs(velocity) > 0.06) {
                let v = Math.sign(velocity) * Math.min(Math.abs(velocity) * 8.0, 26);
                let currentFloat = container.scrollLeft;
                let lastFrameTime = performance.now();
                const baseFriction = 0.955;
                const minV = 0.1;

                const inertiaGlide = function (nowTime) {
                    if (isMouseDown || Math.abs(v) < minV) {
                        momentumRaf = null;
                        return;
                    }

                    const dt = Math.min(nowTime - lastFrameTime, 32);
                    lastFrameTime = nowTime;

                    const frameRatio = dt / 16.667;
                    currentFloat -= v * frameRatio;
                    v *= Math.pow(baseFriction, frameRatio);

                    const maxScroll = container.scrollWidth - container.clientWidth;

                    // Boundary Cushion Dampening
                    if (currentFloat <= 0) {
                        currentFloat = 0;
                        container.scrollLeft = 0;
                        momentumRaf = null;
                        return;
                    } else if (currentFloat >= maxScroll) {
                        currentFloat = maxScroll;
                        container.scrollLeft = maxScroll;
                        momentumRaf = null;
                        return;
                    }

                    container.scrollLeft = Math.round(currentFloat);
                    momentumRaf = requestAnimationFrame(inertiaGlide);
                };
                momentumRaf = requestAnimationFrame(inertiaGlide);
            }

            clearTimeout(dragPreventClickTimer);
            dragPreventClickTimer = setTimeout(function () {
                isDragging = false;
                if (container) {
                    container.removeAttribute('data-was-dragged');
                }
                activeContainer = null;
            }, 100);
        } else {
            activeContainer = null;
        }
    }

    document.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('blur', handleMouseUp);

    // ─── 2. DESKTOP MOUSE WHEEL-TO-HORIZONTAL SMOOTH SPRING INTERPOLATION ───
    document.addEventListener('wheel', function (e) {
        if (!isDesktopPointer() || e.ctrlKey || e.altKey || isTouchActive) return;

        const container = findScrollableContainer(e.target);
        if (!container) return;

        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll <= 5) return; // Not scrollable horizontally

        const deltaY = e.deltaY;
        const deltaX = e.deltaX;

        // If user is scrolling vertical wheel over a horizontal slider
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 2) {
            const isAtStart = container.scrollLeft <= 2 && deltaY < 0;
            const isAtEnd = container.scrollLeft >= maxScroll - 2 && deltaY > 0;

            // If at the boundary, allow normal vertical page scroll seamlessly
            if (isAtStart || isAtEnd) return;

            e.preventDefault();

            if (!container._wheelTarget) {
                container._wheelTarget = container.scrollLeft;
            }

            // Smooth target accumulation
            const stepDelta = Math.sign(deltaY) * Math.min(Math.abs(deltaY) * 0.95, 160);
            container._wheelTarget = Math.max(0, Math.min(maxScroll, container._wheelTarget + stepDelta));

            if (!container._wheelRaf) {
                let lastWheelTime = performance.now();
                const smoothWheelScroll = function (now) {
                    const dt = Math.min(now - lastWheelTime, 32);
                    lastWheelTime = now;
                    const frameRatio = dt / 16.667;

                    const current = container.scrollLeft;
                    const diff = container._wheelTarget - current;

                    if (Math.abs(diff) < 0.6) {
                        container.scrollLeft = Math.round(container._wheelTarget);
                        container._wheelRaf = null;
                        container._wheelTarget = null;
                        return;
                    }

                    // Lerp easing (16% per frame)
                    const step = diff * (1 - Math.pow(1 - 0.16, frameRatio));
                    container.scrollLeft = Math.round(current + step);
                    container._wheelRaf = requestAnimationFrame(smoothWheelScroll);
                };
                container._wheelRaf = requestAnimationFrame(smoothWheelScroll);
            }
        }
    }, { passive: false });

    // ─── 3. NATIVE MOBILE TOUCH HANDLING (100% UNTOUCHED) ───
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

    // ─── 4. CLICK GUARD (Prevents accidental navigation on drag/swipe) ───
    document.addEventListener('click', function (e) {
        if (isDragging || touchSwiped || (e.target && e.target.closest && e.target.closest('[data-was-dragged="true"]'))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, true);

    // Prevent default browser ghost image dragging
    document.addEventListener('dragstart', function (e) {
        if (findScrollableContainer(e.target)) {
            e.preventDefault();
        }
    }, true);

    // ─── 5. FLUID DESKTOP GRAB & MOBILE TOUCH STYLES ───
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .overflow-x-auto, .overflow-x-scroll, [class*="overflow-x-"],
        .de-cu-slider, .scrollbar-hide, #heroThumbnails, #movie-gallery-scroll,
        #actor-list, #episode-list, .interests-wrapper, .az-container,
        .horizontal-scroll-container, .ranking-grid-container, [data-drag-scroll="true"], .snap-x, .home-comments-track, .country-scroll-container, .cs-scroll-container {
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-x pan-y !important;
            overscroll-behavior-x: contain !important;
        }
        @media (hover: hover) and (pointer: fine) {
            .overflow-x-auto, .overflow-x-scroll, [class*="overflow-x-"],
            .de-cu-slider, .scrollbar-hide, #heroThumbnails, #movie-gallery-scroll,
            #actor-list, #episode-list, .interests-wrapper, .az-container,
            .horizontal-scroll-container, .ranking-grid-container, [data-drag-scroll="true"], .snap-x, .home-comments-track, .country-scroll-container, .cs-scroll-container {
                cursor: grab;
                -webkit-user-select: none;
                user-select: none;
                scroll-behavior: auto !important;
            }
        }
        .is-dragging-scroll {
            cursor: grabbing !important;
            scroll-behavior: auto !important;
        }
        /* CRITICAL: Neutralize card hover triggers & reflow thrashing during drag */
        .is-dragging-scroll * {
            cursor: grabbing !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            pointer-events: none !important;
        }
        .select-none-global {
            -webkit-user-select: none !important;
            user-select: none !important;
        }
    `;
    document.head.appendChild(styleEl);

    console.log('[APhim Engine] Sitewide Netflix-Grade Desktop Kinetic Scroll Engine v4.0 initialized.');
})();