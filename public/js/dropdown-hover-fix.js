// Fix dropdown hover behavior for both old .relative.group and new .nav-flat-dropdown
(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDropdownHover);
    } else {
        initDropdownHover();
    }

    function initDropdownHover() {
        // ── NEW: .nav-flat-dropdown (desktop v2) ──
        // Đã loại bỏ hoàn toàn JS can thiệp vào hover. 
        // Trình duyệt sẽ sử dụng CSS :hover và GPU (will-change) để xử lý mượt mà ở 60FPS.


        // ── OLD: .relative.group (fallback for other pages) ──
        const dropdownGroups = document.querySelectorAll('nav .relative.group');
        dropdownGroups.forEach(group => {
            const button = group.querySelector('button');
            const dropdown = group.querySelector('.absolute.top-full');
            if (!button || !dropdown) return;

            let hideTimeout;
            button.addEventListener('mouseenter', () => {
                dropdownGroups.forEach(g => {
                    if (g !== group) {
                        const d = g.querySelector('.absolute.top-full');
                        if (d) {
                            d.classList.remove('opacity-100', 'visible');
                            d.classList.add('opacity-0', 'invisible');
                        }
                    }
                });
                clearTimeout(hideTimeout);
                dropdown.classList.remove('opacity-0', 'invisible');
                dropdown.classList.add('opacity-100', 'visible');
            });

            dropdown.addEventListener('mouseenter', () => {
                clearTimeout(hideTimeout);
                dropdown.classList.remove('opacity-0', 'invisible');
                dropdown.classList.add('opacity-100', 'visible');
            });

            button.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    dropdown.classList.remove('opacity-100', 'visible');
                    dropdown.classList.add('opacity-0', 'invisible');
                }, 80);
            });

            dropdown.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    dropdown.classList.remove('opacity-100', 'visible');
                    dropdown.classList.add('opacity-0', 'invisible');
                }, 80);
            });
        });

        // Dropdown hover v2 initialized
    }
})();
