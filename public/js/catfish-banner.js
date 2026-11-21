/**
 * APhim — Ad Management System: Catfish Bottom, Top Bar, Popup 1 Khung Chuyển 1s, Under Ads Gộp 4 vào 1
 * Version: 7.0 | 2026-11-19
 *
 * 1. Catfish Bottom: Stake (hàng trên) + 1 hàng 3 banner (VSBet + ColaTV + ColaScore)
 * 2. 3 Popup: 3 trong 1 khung, tự chuyển 1s 1 cái (400x400.gif, 728x180.gif)
 * 3. 3 Top: Desktop trải ngang, Mobile xếp hàng lên nhau (column)
 * 4. 4 Under (watch.html & movie-detail.html): Trên Mobile gộp 4 vào 1 khung chuyển xoay vòng gọn gàng
 */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────────────────
       CONFIG
    ───────────────────────────────────────────────────────── */
    var CONFIG = {
        // 1. CATFISH ĐÁY (Stake + 3 banner)
        catfish: {
            enabled: false,
            sessionKey: 'aphim_catfish_closed_v8',
            stake: {
                img: '/quangcao/stake/Dice%20VN.gif',
                url: 'https://stake.com/pages/200depositvn',
                label: 'Stake — Dice VN Đăng Ký Nhận 364,000 VNĐ'
            },
            banners: [
                {
                    img: '/quangcao/catfish/vsbet.gif',
                    url: 'http://178.128.49.112/vsthethao.html',
                    label: 'VSBet — Bảo Hiểm Đơn Thể Thao 100%'
                },
                {
                    img: '/quangcao/catfish/colatv.gif',
                    url: 'http://178.128.49.112/colatv.html',
                    label: 'ColaTV — Trực Tiếp Bóng Đá'
                },
                {
                    img: '/quangcao/catfish/colascore.gif',
                    url: 'http://178.128.49.112/colaapp.html',
                    label: 'ColaScore — Xem TTBĐ Full HD'
                }
            ]
        },

        // 2. 3 POPUP (TRẢI NGANG 3 BANNER VUÔNG CHUẨN MẪU)
        popup: {
            enabled: true,
            showAfterMs: 400,
            sessionKey: 'aphim_popup_closed_v16',
            excludePaths: ['/admin'],
            banners: [
                {
                    img: '/quangcao/sc88/400x400.gif',
                    url: 'https://bit.ly/SC88phim105a',
                    label: 'SC88 — Tặng Thưởng Cực Khủng'
                },
                {
                    img: '/quangcao/ok9/ok9-300x300.gif',
                    url: 'https://ok999.me/aphim',
                    label: 'OK9 — Nhà Cái Uy Tín Hàng Đầu'
                },
                {
                    img: '/quangcao/fly88/fly88-300x300.gif',
                    url: 'https://fly88a1.site/aphim',
                    label: 'FLY88 — Đỉnh Cao Giải Trí'
                }
            ]
        },

        // 3. 3 TOP (Desktop trải ngang, Mobile xếp hàng lên nhau)
        catfishTop: {
            enabled: true,
            sessionKey: 'aphim_top_closed_v6',
            excludePaths: ['/admin'],
            banners: [
                {
                    img: '/quangcao/sc88/728x90.gif',
                    url: 'https://bit.ly/SC88phim105a',
                    label: 'SC88 — Cược Đỉnh Thắng Lớn'
                },
                {
                    img: '/quangcao/ok9/ok9-728x90.gif',
                    url: 'https://ok999.me/aphim',
                    label: 'OK9 — Uy Tín Hàng Đầu'
                },
                {
                    img: '/quangcao/fly88/fly88-728x90.gif',
                    url: 'https://fly88a1.site/aphim',
                    label: 'FLY88 — Thưởng Nạp Siêu Khủng'
                }
            ]
        },

        // 4. UNDER PLAYER (3 BANNER: SC88, OK9, FLY88 — Desktop 3 ngang, Mobile gộp 3 vào 1 chuyển 1s)
        underAds: {
            enabled: true,
            intervalMs: 1000, // Chuyển banner mỗi 1s theo đúng yêu cầu
            banners: [
                {
                    img: '/quangcao/sc88/728x90.gif',
                    url: 'https://bit.ly/SC88phim105a',
                    label: 'SC88 — Thể Thao & Casino'
                },
                {
                    img: '/quangcao/ok9/ok9-728x90.gif',
                    url: 'https://ok999.me/aphim',
                    label: 'OK9 — Cá Cược Đẳng Cấp'
                },
                {
                    img: '/quangcao/fly88/fly88-728x90.gif',
                    url: 'https://fly88a1.site/aphim',
                    label: 'FLY88 — Khuyến Mãi Bùng Nổ'
                }
            ]
        }
    };

    /* ─────────────────────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────────────────────── */
    function renderMedia(item, extraClass) {
        if (!item) return '';
        var cls = extraClass ? ' class="' + extraClass + '"' : '';
        if (item.isVideo || (item.img && item.img.toLowerCase().indexOf('.mp4') !== -1)) {
            return '<video src="' + item.img + '" autoplay loop muted playsinline disablePictureInPicture' + cls + ' style="width:100%; height:100%; object-fit:fill; display:block; pointer-events:none;"></video>';
        }
        return '<img src="' + item.img + '" alt="' + (item.label || '') + '"' + cls + ' loading="eager">';
    }

    function getSession(key) {
        try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function setSession(key) {
        try { sessionStorage.setItem(key, '1'); } catch (e) {}
    }

    function currentPath() {
        return window.location.pathname || '/';
    }

    function isPathExcluded(list) {
        if (!list || !list.length) return false;
        var p = currentPath();
        for (var i = 0; i < list.length; i++) {
            if (p.indexOf(list[i]) !== -1) return true;
        }
        return false;
    }

    function isMobileDevice() {
        if (typeof window === "undefined") return false;
        var ua = (navigator.userAgent || navigator.vendor || window.opera || "").toLowerCase();
        var isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
        var isNarrow = window.innerWidth <= 768;
        return isMobileUA || isNarrow;
    }

    function isBannerPermanentlyHidden(key) {
        try {
            if (localStorage.getItem(key + "_perm_closed") === "true") {
                return true;
            }
            if (localStorage.getItem("aphim_all_banners_perm_closed") === "true") {
                return true;
            }
        } catch (e) {}
        return false;
    }

    function isBannerHidden(key, usePageKey) {
        if (isBannerPermanentlyHidden(key)) return true;
        if (usePageKey) {
            var pageKey = key + "_" + (window.location.pathname || "/");
            if (getSession(pageKey)) return true;
        } else {
            if (getSession(key)) return true;
        }
        return false;
    }

    function registerBannerClose(key, usePageKey) {
        if (usePageKey) {
            var pageKey = key + "_" + (window.location.pathname || "/");
            setSession(pageKey);
        } else {
            setSession(key);
        }

        try {
            if (isMobileDevice()) {
                // 📱 Mobile: Bấm nút đóng 1 lần là ẩn vĩnh viễn luôn!
                localStorage.setItem(key + "_perm_closed", "true");
                console.log("📱 [Banner Close - Mobile] Đã đóng và ẩn vĩnh viễn banner: " + key);
            } else {
                // 💻 Desktop: Bấm nút đóng 3 lần thì ẩn vĩnh viễn không hiển thị nữa!
                var countKey = key + "_close_count";
                var count = parseInt(localStorage.getItem(countKey) || "0", 10) + 1;
                localStorage.setItem(countKey, count.toString());
                console.log("💻 [Banner Close - Desktop] Đã đóng lần " + count + "/3 banner: " + key);
                if (count >= 3) {
                    localStorage.setItem(key + "_perm_closed", "true");
                    console.log("💻 [Banner Close - Desktop] Đạt 3 lần đóng -> Ẩn vĩnh viễn banner: " + key);
                }
            }
        } catch (e) {}
    }

    /* ─────────────────────────────────────────────────────────
       1. CATFISH BOTTOM
    ───────────────────────────────────────────────────────── */
    function shouldShowCatfish() {
        if (!CONFIG.catfish.enabled) return false;
        if (isPathExcluded(CONFIG.catfish.excludePaths)) return false;
        return !isBannerHidden(CONFIG.catfish.sessionKey, true);
    }

    function initCatfish() {
        if (!shouldShowCatfish()) return;

        var banners = CONFIG.catfish.banners;
        var stake = CONFIG.catfish.stake;
        var bar = document.createElement('div');
        bar.id = 'aphim-catfish';
        bar.setAttribute('role', 'complementary');
        bar.setAttribute('aria-label', 'Quảng cáo đối tác');

        var itemsHTML = '';
        for (var i = 0; i < banners.length; i++) {
            var b = banners[i];
            itemsHTML +=
                '<a class="catfish-item catfish-col-' + (i + 1) + '" href="' + b.url + '" target="_blank" rel="noopener nofollow" aria-label="' + b.label + '">' +
                    renderMedia(b) +
                '</a>';
        }

        var stakeHTML = '';
        if (stake) {
            stakeHTML =
                '<div class="catfish-row-stake">' +
                    '<a class="catfish-stake-item" href="' + stake.url + '" target="_blank" rel="noopener nofollow" aria-label="' + stake.label + '">' +
                        renderMedia(stake) +
                    '</a>' +
                '</div>';
        }

        bar.innerHTML =
            '<div class="catfish-inner">' +
                stakeHTML +
                '<div class="catfish-row-single">' +
                    itemsHTML +
                '</div>' +
            '</div>' +
            '<button id="aphim-catfish-close" title="Đóng quảng cáo" aria-label="Đóng">&#10005;</button>';

        document.body.appendChild(bar);
        document.body.classList.add('aphim-has-catfish');

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                bar.classList.add('visible');
            });
        });

        var closeBtn = document.getElementById('aphim-catfish-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                bar.classList.remove('visible');
                document.body.classList.remove('aphim-has-catfish');
                setTimeout(function () {
                    if (bar.parentNode) bar.parentNode.removeChild(bar);
                }, 400);
                registerBannerClose(CONFIG.catfish.sessionKey, true);
            });
        }
    }

    /* ─────────────────────────────────────────────────────────
       2. CATFISH TOP: Desktop trải ngang, Mobile xếp hàng lên nhau
    ───────────────────────────────────────────────────────── */
    function shouldShowCatfishTop() {
        if (!CONFIG.catfishTop.enabled) return false;
        if (isPathExcluded(CONFIG.catfishTop.excludePaths)) return false;
        return !isBannerHidden(CONFIG.catfishTop.sessionKey, true);
    }

    function initCatfishTop() {
        if (!shouldShowCatfishTop()) return;

        var banners = CONFIG.catfishTop.banners;
        var bar = document.createElement('div');
        bar.id = 'aphim-catfish-top';
        bar.setAttribute('role', 'complementary');
        bar.setAttribute('aria-label', 'Quảng cáo Top đối tác');

        var itemsHTML = '';
        for (var i = 0; i < banners.length; i++) {
            var b = banners[i];
            itemsHTML +=
                '<a class="catfish-top-item" href="' + b.url + '" target="_blank" rel="noopener nofollow" aria-label="' + b.label + '">' +
                    renderMedia(b) +
                '</a>';
        }

        bar.innerHTML =
            '<div class="catfish-top-inner">' +
                '<div class="catfish-top-row">' +
                    itemsHTML +
                '</div>' +
                '<button id="aphim-catfish-top-close" title="Đóng quảng cáo" aria-label="Đóng">&#10005;</button>' +
            '</div>';

        document.body.appendChild(bar);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                bar.classList.add('visible');
            });
        });

        var closeBtn = document.getElementById('aphim-catfish-top-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                bar.classList.remove('visible');
                setTimeout(function () {
                    if (bar.parentNode) bar.parentNode.removeChild(bar);
                }, 400);
                registerBannerClose(CONFIG.catfishTop.sessionKey, true);
            });
        }
    }

    /* ─────────────────────────────────────────────────────────
       3. 3 POPUP (TRẢI NGANG 3 BANNER VUÔNG CHUẨN MẪU)
    ───────────────────────────────────────────────────────── */
    function shouldShowPopup() {
        if (!CONFIG.popup.enabled) return false;
        if (isPathExcluded(CONFIG.popup.excludePaths)) return false;
        return !isBannerHidden(CONFIG.popup.sessionKey, false);
    }

    function initPopup() {
        if (!shouldShowPopup()) return;

        var banners = CONFIG.popup.banners;
        var colsHTML = '';
        for (var i = 0; i < banners.length; i++) {
            var b = banners[i];
            colsHTML +=
                '<a class="aph-popup-box" href="' + b.url + '" target="_blank" rel="noopener nofollow" aria-label="' + b.label + '">' +
                    renderMedia(b) +
                '</a>';
        }

        var overlay = document.createElement('div');
        overlay.id = 'aphim-popup-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Quảng cáo đối tác');

        overlay.innerHTML =
            '<div class="aph-popup-wrapper aph-popup-triple-mode">' +
                '<button id="aphim-popup-close-btn" title="Đóng quảng cáo" aria-label="Đóng">&#10005;</button>' +
                '<div id="aphim-popup" class="aph-popup-card">' +
                    '<div class="aph-popup-triple-row">' +
                        colsHTML +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        var showTimer = setTimeout(function () {
            requestAnimationFrame(function () { overlay.classList.add('visible'); });
        }, CONFIG.popup.showAfterMs);

        function closePopup() {
            clearTimeout(showTimer);
            registerBannerClose(CONFIG.popup.sessionKey, false);
            overlay.classList.remove('visible');
            setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 360);
        }

        var closeBtn = document.getElementById('aphim-popup-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                closePopup();
            });
        }
        overlay.addEventListener('click', function (e) {
            if (e.target.closest('.aph-popup-box')) {
                return;
            }
            closePopup();
        });
        document.addEventListener('keydown', function escH(e) {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', escH);
            }
        });
    }

    /* ─────────────────────────────────────────────────────────
       4. UNDER ADS (GỘP 4 VÀO 1 TRÊN MOBILE — CHUYỂN XOAY VÒNG)
    ───────────────────────────────────────────────────────── */
    function initUnderAds() {
        if (!CONFIG.underAds.enabled) return;
        var containers = document.querySelectorAll('#watch-episodes-ad, #movie-detail-content-ad');
        if (!containers || !containers.length) return;

        var banners = CONFIG.underAds.banners;
        var n = banners.length;

        containers.forEach(function (container) {
            var desktopItemsHTML = '';
            var mobileSlidesHTML = '';

            for (var i = 0; i < n; i++) {
                var b = banners[i];
                desktopItemsHTML +=
                    '<a href="' + b.url + '" target="_blank" rel="noopener nofollow" class="watch-ad-col-item" aria-label="' + b.label + '">' +
                        renderMedia(b) +
                    '</a>';

                mobileSlidesHTML +=
                    '<div class="watch-ad-mobile-slide' + (i === 0 ? ' active' : '') + '">' +
                        '<a href="' + b.url + '" target="_blank" rel="noopener nofollow" aria-label="' + b.label + '">' +
                            renderMedia(b) +
                        '</a>' +
                    '</div>';
            }

            var wrapper = document.createElement('div');
            wrapper.className = 'watch-ad-responsive-container';
            wrapper.innerHTML =
                '<!-- Desktop: 4 banner trải ngang -->' +
                '<div class="watch-ad-desktop-row">' +
                    desktopItemsHTML +
                '</div>' +
                '<!-- Mobile: Gộp 4 vào 1 khung chuyển slide gọn gàng -->' +
                '<div class="watch-ad-mobile-slider">' +
                    mobileSlidesHTML +
                '</div>';

            var btn = container.querySelector('button');
            container.innerHTML = '';
            if (btn) container.appendChild(btn);
            container.appendChild(wrapper);

            var mobileSliderEl = container.querySelector('.watch-ad-mobile-slider');
            if (mobileSliderEl) {
                var currentMobIdx = 0;
                var mobSlides = mobileSliderEl.querySelectorAll('.watch-ad-mobile-slide');
                setInterval(function () {
                    if (!mobSlides || mobSlides.length <= 1) return;
                    mobSlides[currentMobIdx].classList.remove('active');
                    currentMobIdx = (currentMobIdx + 1) % mobSlides.length;
                    mobSlides[currentMobIdx].classList.add('active');
                }, CONFIG.underAds.intervalMs);
            }
        });
    }

    /* ─────────────────────────────────────────────────────────
       BOOTSTRAP
    ───────────────────────────────────────────────────────── */
    function boot() {
        initCatfish();
        initCatfishTop();
        initPopup();
        initUnderAds();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
