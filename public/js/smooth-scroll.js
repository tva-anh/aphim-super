/**
 * ================================================================
 * APHIM SUPER — LUXURY MOMENTUM & SMOOTH INERTIA SCROLL ENGINE (v101)
 * Inspired by Linear.app, Stripe, Apple, and Lenis Scroll.
 * Converts harsh mouse-wheel step increments into silky-smooth 60-120fps gliding motion.
 * ================================================================
 */
(function() {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Do not run inside reels page (Reels has its own vertical snap system)
    if (window.location.pathname.startsWith('/reels')) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let isRunning = false;
    let targetY = window.pageYOffset || document.documentElement.scrollTop || 0;
    let currentY = targetY;
    let animId = null;

    // ── Tuned Physics Constants for High-End Cinematic Gliding ──
    const EASING = 0.088;      // Smooth interpolation factor (8.8% remaining distance per frame)
    const STEP_MULTIPLIER = 1.05; // Natural step scale
    const MAX_ACCEL = 380;     // Max single-scroll impulse cap
    const EPSILON = 0.4;       // Sub-pixel rest threshold

    function getMaxScrollY() {
        return Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        ) - window.innerHeight;
    }

    // Check if cursor is over a nested scroll container (modal, dropdown, etc.)
    function isScrollableNestedElement(el, deltaY) {
        if (!el || el === document.body || el === document.documentElement) return false;

        if (el.closest('#aphim-guide-overlay, [data-prevent-smooth-scroll]')) {
            return true;
        }

        let node = el;
        while (node && node !== document.body && node !== document.documentElement) {
            const style = window.getComputedStyle(node);
            const overflowY = style.overflowY;
            const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && (node.scrollHeight > node.clientHeight + 4);

            if (isScrollable) {
                if (deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 2) {
                    return true;
                }
                if (deltaY < 0 && node.scrollTop > 2) {
                    return true;
                }
            }
            node = node.parentElement;
        }
        return false;
    }

    function renderSmoothScroll() {
        const maxScroll = Math.max(0, getMaxScrollY());
        targetY = Math.max(0, Math.min(targetY, maxScroll));

        const diff = targetY - currentY;
        currentY += diff * EASING;

        if (Math.abs(diff) > EPSILON) {
            window.scrollTo({
                top: Math.round(currentY * 10) / 10,
                behavior: 'instant'
            });
            animId = requestAnimationFrame(renderSmoothScroll);
        } else {
            currentY = targetY;
            window.scrollTo({
                top: targetY,
                behavior: 'instant'
            });
            isRunning = false;
            animId = null;
        }
    }

    // Native high-performance hardware-accelerated scroll (Wheel hijacking disabled to avoid scroll jank)
    // Smooth Anchor Scroll handler
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const hash = anchor.getAttribute('href');
        if (!hash || hash === '#') return;
        try {
            const targetEl = document.querySelector(hash);
            if (targetEl) {
                e.preventDefault();
                const topPos = targetEl.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({
                    top: topPos,
                    behavior: 'smooth'
                });
            }
        } catch(err) {}
    });

    // Global programmatic smooth scroll utility
    window.aphimSmoothScrollTo = function(y) {
        window.scrollTo({
            top: y,
            behavior: 'smooth'
        });
    };
})();
