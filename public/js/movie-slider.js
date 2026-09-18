/**
 * A PHIM SUPER - Movie Slider Bridge
 * Unified with section-swipe.js for ultra-smooth sitewide scrolling.
 */
(function() {
    'use strict';
    // Helper to refresh sliders if dynamically rendered
    window.refreshMovieSliders = function() {
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new Event('resize'));
        }
    };
})();
