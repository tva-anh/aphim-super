/**
 * PWA MODE DETECTOR
 * Detect if app is running in standalone mode (added to home screen)
 * Add appropriate classes and handle safe area insets
 */

(function () {
    'use strict';

    // Detect PWA mode
    function isPWA() {
        // iOS Safari
        const isIOSStandalone = window.navigator.standalone === true;

        // Android Chrome
        const isAndroidStandalone = window.matchMedia('(display-mode: standalone)').matches;

        // Check if launched from home screen
        const isStandalone = isIOSStandalone || isAndroidStandalone;

        return isStandalone;
    }

    // Detect iOS
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    // Detect Android
    function isAndroid() {
        return /Android/.test(navigator.userAgent);
    }

    // Get safe area insets
    function getSafeAreaInsets() {
        const style = getComputedStyle(document.documentElement);

        return {
            top: style.getPropertyValue('--sat') || '0px',
            right: style.getPropertyValue('--sar') || '0px',
            bottom: style.getPropertyValue('--sab') || '0px',
            left: style.getPropertyValue('--sal') || '0px'
        };
    }

    // Initialize PWA detection
    function init() {
        const html = document.documentElement;
        const body = document.body;

        // Add platform classes
        if (isIOS()) {
            html.classList.add('ios');
            body.classList.add('ios');
        }

        if (isAndroid()) {
            html.classList.add('android');
            body.classList.add('android');
        }

        // Add PWA class if in standalone mode
        if (isPWA()) {
            html.classList.add('pwa-mode', 'standalone');
            body.classList.add('pwa-mode', 'standalone');

            console.log('[PWA] Running in standalone mode');
            console.log('[PWA] Safe area insets:', getSafeAreaInsets());

            // Store PWA state
            sessionStorage.setItem('isPWA', 'true');

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('pwa:ready', {
                detail: {
                    platform: isIOS() ? 'ios' : isAndroid() ? 'android' : 'unknown',
                    safeArea: getSafeAreaInsets()
                }
            }));
        } else {
            console.log('[PWA] Running in browser mode');
            sessionStorage.setItem('isPWA', 'false');
        }

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                console.log('[PWA] Orientation changed, safe area:', getSafeAreaInsets());
            }, 100);
        });

        // Handle resize (for foldable devices)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (isPWA()) {
                    console.log('[PWA] Window resized, safe area:', getSafeAreaInsets());
                }
            }, 250);
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export to window
    window.PWADetector = {
        isPWA: isPWA,
        isIOS: isIOS,
        isAndroid: isAndroid,
        getSafeAreaInsets: getSafeAreaInsets
    };

})();
