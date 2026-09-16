// Enhanced search icon for desktop
document.addEventListener('DOMContentLoaded', function () {
    // Only apply on desktop
    if (window.innerWidth >= 1024) {
        // Only select search.html links that contain material-icons (icon, not text link)
        const searchLinks = document.querySelectorAll('a[href="search.html"]');

        searchLinks.forEach(link => {
            // Check if this link contains a material-icons element
            const hasIcon = link.querySelector('.material-icons-round, .material-icons, .material-icons-outlined');

            if (hasIcon) {
                // Add pulse animation once on page load
                setTimeout(() => {
                    link.classList.add('pulse-once');

                    // Remove class after animation completes
                    setTimeout(() => {
                        link.classList.remove('pulse-once');
                    }, 2000);
                }, 500);
            }
        });
    }
});
