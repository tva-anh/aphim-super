// Material Icons Font Loader - Optimized for Mobile
(function () {
    'use strict';

    let fontsLoaded = false;

    // Check if Material Icons font is loaded
    function checkFontLoaded() {
        if (fontsLoaded) return true;

        try {
            if (document.fonts && document.fonts.check) {
                // Modern browsers with Font Loading API
                const loaded = document.fonts.check('24px "Material Icons Round"') ||
                    document.fonts.check('24px "Material Icons"');
                if (loaded) fontsLoaded = true;
                return loaded;
            }
        } catch (e) {
            console.warn('Font check API error:', e);
        }
        return false;
    }

    // Add loaded class to all material icons
    function markIconsAsLoaded() {
        const icons = document.querySelectorAll('.material-icons-round, .material-icons, .material-icons-outlined, .material-symbols-outlined');
        console.log(`📦 Marking ${icons.length} icons as loaded`);
        icons.forEach(icon => {
            icon.classList.add('material-icons-loaded');
        });
        fontsLoaded = true;
    }

    // Wait for fonts to load
    function waitForFonts() {
        if (checkFontLoaded()) {
            markIconsAsLoaded();
            return;
        }

        if (document.fonts) {
            // Explicitly request browser to load the font family
            if (typeof document.fonts.load === 'function') {
                document.fonts.load('24px "Material Icons Round"')
                    .then(() => { if (checkFontLoaded()) markIconsAsLoaded(); })
                    .catch(() => {});
                document.fonts.load('24px "Material Icons"')
                    .then(() => { if (checkFontLoaded()) markIconsAsLoaded(); })
                    .catch(() => {});
            }

            // Keep polling until it actually loads (do not force timeout on modern browsers)
            // This ensures we keep showing the hourglass instead of ugly English text on slow networks
            const pollInterval = setInterval(() => {
                if (checkFontLoaded()) {
                    clearInterval(pollInterval);
                    markIconsAsLoaded();
                }
            }, 100);
            
            // Stop polling after a very long time (e.g. 30 seconds) just to free resources
            setTimeout(() => {
                clearInterval(pollInterval);
            }, 30000);

        } else {
            // Fallback for very old browsers only
            setTimeout(markIconsAsLoaded, 2000);
        }
    }

    // Observer for dynamically added icons
    function observeNewIcons() {
        const observer = new MutationObserver((mutations) => {
            if (!fontsLoaded && !checkFontLoaded()) return;

            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the node itself is an icon
                        if (node.classList && (
                            node.classList.contains('material-icons-round') ||
                            node.classList.contains('material-icons') ||
                            node.classList.contains('material-icons-outlined') ||
                            node.classList.contains('material-symbols-outlined')
                        )) {
                            node.classList.add('material-icons-loaded');
                        }

                        // Check for icon children
                        const icons = node.querySelectorAll && node.querySelectorAll('.material-icons-round, .material-icons, .material-icons-outlined, .material-symbols-outlined');
                        if (icons && icons.length > 0) {
                            icons.forEach(icon => icon.classList.add('material-icons-loaded'));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize immediately
    function init() {
        waitForFonts();
        observeNewIcons();
    }

    // Start as early as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
