// Splash Screen Loader - Bypassed for instant loading
(function () {
    'use strict';
    
    // Record start time just in case other scripts check it
    window.splashStartTime = Date.now();

    function enablePage() {
        if (document.body && !document.body.classList.contains('splash-ready')) {
            document.body.classList.add('splash-ready');
        }
    }

    // Run as soon as possible
    enablePage();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enablePage);
    } else {
        enablePage();
    }
    
    window.addEventListener('load', enablePage);
})();
