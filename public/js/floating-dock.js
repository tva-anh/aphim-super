/* ==========================================================================
   A PHIM — Floating Side Dock JS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const dockGroup = document.getElementById('fdDockGroup');
    const handle = document.getElementById('fdHandle');
    const btnClose = document.getElementById('fdBtnClose');
    const btnChat = document.getElementById('fdBtnChat');
    const btnTop = document.getElementById('fdBtnTop');

    const btnTheme = document.getElementById('themeToggleFab') || document.getElementById('fdBtnTheme');

    // Init theme icon state (Mặc định là Light Mode / Nền kem nếu chưa lưu cài đặt)
    const getSavedTheme = () => {
        let t = localStorage.getItem('aphim_theme') || localStorage.getItem('cinestream_theme');
        if (!t) {
            try {
                const u = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
                if (u && u.theme) t = u.theme;
            } catch (e) { }
        }
        return t;
    };

    const savedTheme = getSavedTheme();
    const isLightMode = savedTheme !== 'dark';
    if (isLightMode) {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }

    const updateThemeIcon = (isLight) => {
        if (!btnTheme) return;
        const sunIcon = btnTheme.querySelector('.theme-icon-sun');
        const moonIcon = btnTheme.querySelector('.theme-icon-moon');
        if (sunIcon && moonIcon) {
            if (isLight) {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        } else {
            const icon = btnTheme.querySelector('.material-icons-round');
            if (icon) icon.textContent = isLight ? 'dark_mode' : 'light_mode';
        }
    };

    updateThemeIcon(isLightMode);

    function toggleThemeWithoutJank() {
        const style = document.createElement('style');
        style.id = 'ap-theme-freeze-style';
        style.textContent = `
            *, *::before, *::after {
                -webkit-transition: none !important;
                -moz-transition: none !important;
                -o-transition: none !important;
                -ms-transition: none !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(style);

        const isLight = document.documentElement.classList.toggle('light-mode');

        // Force a single synchronous layout flush
        void document.documentElement.offsetHeight;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const el = document.getElementById('ap-theme-freeze-style');
                if (el) el.remove();
            });
        });

        return isLight;
    }

    // Theme Switcher Click Handler
    if (btnTheme) {
        btnTheme.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dockGroup) dockGroup.classList.remove('expanded');

            // Micro-animation on theme icon
            btnTheme.style.transform = 'scale(0.88) rotate(180deg)';
            setTimeout(() => {
                btnTheme.style.transform = '';
            }, 200);

            const isLight = toggleThemeWithoutJank();
            const themeVal = isLight ? 'light' : 'dark';
            localStorage.setItem('aphim_theme', themeVal);
            localStorage.setItem('cinestream_theme', themeVal);

            updateThemeIcon(isLight);

            // Defer non-critical updates to next frame
            setTimeout(() => {
                try {
                    const u = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
                    if (u) {
                        u.theme = themeVal;
                        localStorage.setItem('cinestream_user', JSON.stringify(u));
                        if (typeof authService !== 'undefined' && typeof authService.updateProfile === 'function') {
                            authService.updateProfile({ theme: themeVal });
                        }
                    }
                } catch (err) { }
                
                if (typeof updateUserUI === 'function') updateUserUI();
                window.dispatchEvent(new CustomEvent('aphim:theme-changed', { detail: { theme: themeVal, isLight } }));

                if (typeof showToast === 'function') {
                    showToast(isLight ? '☀️ Đã chuyển sang Giao diện Sáng' : '🌙 Đã chuyển sang Giao diện Tối', 'info');
                }
            }, 10);
        });
    }

    // Lắng nghe đồng bộ đa tab (Multi-tab theme sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'aphim_theme' || e.key === 'cinestream_theme') {
            const isLight = e.newValue !== 'dark';
            document.documentElement.classList.toggle('light-mode', isLight);
            updateThemeIcon(isLight);
            if (typeof updateUserUI === 'function') updateUserUI();
        }
    });

    // 1. Expand / Collapse Dock
    if (handle && dockGroup && btnClose) {
        handle.addEventListener('click', () => {
            dockGroup.classList.add('expanded');
        });

        btnClose.addEventListener('click', (e) => {
            e.stopPropagation();
            dockGroup.classList.remove('expanded');
        });
        
        // Bấm ra ngoài để đóng dock
        document.addEventListener('click', (e) => {
            if (dockGroup.classList.contains('expanded') && !dockGroup.contains(e.target)) {
                dockGroup.classList.remove('expanded');
            }
        });
    }

    // 2. Open Chat Window
    if (btnChat) {
        btnChat.addEventListener('click', (e) => {
            e.stopPropagation();
            dockGroup.classList.remove('expanded');
            
            // Tìm nút chat gốc để trigger click (dùng logic có sẵn của chat-room.js)
            const oldChatFab = document.getElementById('chatFab');
            if (oldChatFab) {
                oldChatFab.click();
            } else {
                // Thử tìm chatWindow và mở trực tiếp nếu không tìm thấy chatFab
                const chatWindow = document.getElementById('chatWindow');
                if (chatWindow && typeof chatWindow.classList !== 'undefined') {
                    chatWindow.classList.add('active');
                    chatWindow.classList.remove('minimized');
                }
            }
        });
    }

    // 3. Scroll to Top Logic
    if (btnTop) {
        let scrollTicking = false;
        const updateScrollTopVisibility = () => {
            const isScrolled = window.scrollY > 200;
            if (isScrolled) {
                btnTop.classList.add('show');
            } else {
                btnTop.classList.remove('show');
            }
            scrollTicking = false;
        };

        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                requestAnimationFrame(updateScrollTopVisibility);
                scrollTicking = true;
            }
        }, { passive: true });
        updateScrollTopVisibility();

        btnTop.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});
