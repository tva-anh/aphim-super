/* Gives equipped profile banners a distinct, lightweight signature below the global navigation. */
(function () {
    'use strict';

    const DEFAULT_BANNER = 'banner_default';

    function getBannerId() {
        try {
            const savedUser = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
            return localStorage.getItem('ap_equipped_banner') || (savedUser && savedUser.equippedBanner) || DEFAULT_BANNER;
        } catch (error) {
            return localStorage.getItem('ap_equipped_banner') || DEFAULT_BANNER;
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
        const id = bannerId || getBannerId();

        aura.dataset.banner = id;
        const isActive = id && id !== DEFAULT_BANNER;
        aura.classList.toggle('is-active', !!isActive);
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

    window.addEventListener('storage', function (event) {
        if (event.key === 'ap_equipped_banner' || event.key === 'cinestream_user') {
            applyProfileBannerAura();
        }
    });
})();
