// Page Loader - Show spinner while page loads
(function () {
    'use strict';

    // Hide loader when page is fully loaded
    function hideLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('hidden');
            // Remove from DOM after transition
            setTimeout(() => {
                loader.remove();
            }, 300);
        }
    }

    // Show loader immediately
    function showLoader() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.remove('hidden');
        }
    }

    // Hide loader when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideLoader);
    } else {
        hideLoader();
    }

    // Also hide on window load (for images, etc.)
    window.addEventListener('load', hideLoader);

    // Fallback: hide after 3 seconds max
    setTimeout(hideLoader, 3000);
})();
