// Preload Critical Resources
(function () {
    'use strict';

    // Preload fonts
    const fonts = [
        'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
        'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
    ];

    fonts.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = url;
        document.head.appendChild(link);
    });

    // Defer non-critical scripts
    window.addEventListener('load', () => {
        // Reserved for future use
    });

})();
