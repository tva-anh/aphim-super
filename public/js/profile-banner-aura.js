/* Gives equipped profile banners a distinct, lightweight signature below the global navigation. */
(function () {
    'use strict';

    const DEFAULT_BANNER = 'banner_default';

    function isUserLoggedIn() {
        try {
            if (typeof authService !== 'undefined' && typeof authService.isLoggedIn === 'function') {
                return Boolean(authService.isLoggedIn());
            }
            const savedUser = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
            const token = localStorage.getItem('cinestream_token');
            return Boolean(savedUser && (savedUser._id || savedUser.id || savedUser.email || savedUser.username) && token);
        } catch (e) {
            return false;
        }
    }

    function getBannerId() {
        try {
            // Khi người dùng CHƯA ĐĂNG NHẬP hoặc ĐÃ ĐĂNG XUẤT: Luôn trả về DEFAULT_BANNER
            if (!isUserLoggedIn()) {
                return DEFAULT_BANNER;
            }
            const savedUser = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
            return (savedUser && savedUser.equippedBanner) || localStorage.getItem('ap_equipped_banner') || DEFAULT_BANNER;
        } catch (error) {
            return DEFAULT_BANNER;
        }
    }

    function getAuraElement() {
        let aura = document.getElementById('ap-banner-aura');
        if (!aura) {
            aura = document.createElement('div');
            aura.id = 'ap-banner-aura';
            aura.setAttribute('aria-hidden', 'true');
            if (document.body) {
                document.body.appendChild(aura);
            } else {
                document.addEventListener('DOMContentLoaded', function () {
                    if (!document.getElementById('ap-banner-aura') && document.body) {
                        document.body.appendChild(aura);
                    }
                });
            }
        } else if (aura.parentElement && aura.parentElement !== document.body) {
            document.body.appendChild(aura);
        }
        return aura;
    }

    function applyProfileBannerAura(bannerId) {
        const aura = getAuraElement();
        if (!aura) return;

        // Nếu khách chưa đăng nhập / đã đăng xuất: Luôn reset và ẩn aura hoàn toàn
        if (!isUserLoggedIn()) {
            aura.dataset.banner = DEFAULT_BANNER;
            aura.classList.remove('is-active');
            aura.style.display = 'none';
            return;
        }

        const id = bannerId || getBannerId();
        aura.dataset.banner = id;
        const isActive = Boolean(id && id !== DEFAULT_BANNER && id !== 'none');
        aura.classList.toggle('is-active', isActive);
        aura.style.display = isActive ? 'block' : 'none';
    }

    window.applyProfileBannerAura = applyProfileBannerAura;

    // Apply immediately if body exists
    if (document.body) {
        applyProfileBannerAura();
    }

    document.addEventListener('DOMContentLoaded', function () {
        applyProfileBannerAura();
    });

    window.addEventListener('load', function () {
        applyProfileBannerAura();
    });

    window.addEventListener('aphim:banner-equipped', function (event) {
        applyProfileBannerAura(event.detail && event.detail.bannerId);
    });

    window.addEventListener('auth:login', function () {
        applyProfileBannerAura();
    });

    window.addEventListener('auth:logout', function () {
        try { localStorage.removeItem('ap_equipped_banner'); } catch (e) { }
        applyProfileBannerAura(DEFAULT_BANNER);
    });

    window.addEventListener('storage', function (event) {
        if (event.key === 'ap_equipped_banner' || event.key === 'cinestream_user' || event.key === 'cinestream_token') {
            applyProfileBannerAura();
        }
    });
})();
