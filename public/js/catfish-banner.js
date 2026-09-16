/**
 * APhim — Catfish Banner + Welcome Popup Slideshow
 * Version: 4.0 | 2026-05-18
 *
 * Catfish: sticky 2-hàng dưới màn hình
 * Popup: SLIDESHOW 3 banner, style Bet365/1xBet, hiện 1 lần mỗi session
 */

(function () {
    'use strict';

    /* ─────────────────────────────────────────────────────────
       CONFIG
    ───────────────────────────────────────────────────────── */
    var CONFIG = {

        catfish: {
            enabled: true,
            sessionKey: 'aphim_catfish_closed_v4'  // per-page sessionStorage key
        },
        popup: {
            enabled: false, // Đã tắt theo yêu cầu để tránh gây khó chịu
            showAfterMs: 800,         // Delay trước khi popup hiện (ms)
            slideIntervalMs: 2500,    // Tự chuyển slide sau N ms
            sessionKey: 'aphim_popup_closed_v4',  // sessionStorage key
            excludePaths: ['/admin']  // Chỉ loại trừ admin
        },

        banners: [
            {
                img: '/quangcao/8svui/BANNER.mp4',
                url: 'https://8svui.com',
                label: '8SVui — Khuyến Mãi 150%',
                isVideo: true
            },
            {
                img: '/ads/catfish/728x90-AFF-Cup.gif',
                url: 'https://vsbet9k8.com/p/BSYk',
                label: 'VSBet — Nạp Đầu Nhận 68,888,000đ'
            },
            {
                img: '/ads/catfish/colatv.gif',
                url: 'https://colatv77.live',
                label: 'ColaTV — Xem Phim HD Miễn Phí'
            },
            {
                img: '/ads/catfish/colascore.gif',
                url: 'https://colascores.com',
                label: 'ColaScore — Tỷ Số Bóng Đá Trực Tiếp'
            }
        ]
    };

    /* ─────────────────────────────────────────────────────────
       HELPERS
    ───────────────────────────────────────────────────────── */

    function renderMedia(item) {
        if (item.isVideo || (item.img && item.img.endsWith('.mp4'))) {
            return '<video src="' + item.img + '" autoplay loop muted playsinline disablePictureInPicture style="width:100%; height:100%; object-fit:cover; display:block; pointer-events:none;"></video>';
        }
        return '<img src="' + item.img + '" alt="' + item.label + '" loading="eager">';
    }

    function isExpired(key, hours) {
        try {
            var ts = localStorage.getItem(key);
            if (!ts) return true;
            return (Date.now() - parseInt(ts, 10)) > (hours * 3600 * 1000);
        } catch (e) { return true; }
    }

    function setLSTimestamp(key) {
        try { localStorage.setItem(key, Date.now().toString()); } catch (e) {}
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

    function shouldShowPopup() {
        if (!CONFIG.popup.enabled) return false;
        var path = currentPath();
        for (var i = 0; i < CONFIG.popup.excludePaths.length; i++) {
            if (path.indexOf(CONFIG.popup.excludePaths[i]) !== -1) return false;
        }
        // Key riêng theo từng trang — mỗi trang có state độc lập
        var pageKey = CONFIG.popup.sessionKey;
        return !getSession(pageKey);
    }

    function shouldShowCatfish() {
        if (!CONFIG.catfish.enabled) return false;
        
        // Trên màn hình lớn (Desktop >= 768px), luôn luôn hiển thị lại khi tải trang
        // dù trước đó đã bấm đóng.
        if (window.innerWidth >= 768) {
            return true;
        }

        // Trên điện thoại (Mobile < 768px), giữ luồng cũ (đã bấm đóng thì sang trang không hiện lại nữa trong phiên)
        var pageKey = CONFIG.catfish.sessionKey;
        return !getSession(pageKey);
    }

    /* ─────────────────────────────────────────────────────────
       CATFISH STICKY BAR
    ───────────────────────────────────────────────────────── */
    function initCatfish() {
        if (!shouldShowCatfish()) return;

        var b = CONFIG.banners;
        var bar = document.createElement('div');
        bar.id = 'aphim-catfish';
        bar.setAttribute('role', 'complementary');
        bar.setAttribute('aria-label', 'Quảng cáo đối tác');
        bar.innerHTML =
            '<div class="catfish-inner">' +
                '<!-- Row 1: Desktop (8SVui + VSBet) / Mobile (Slot xoay mượt VSBet <-> 8SVui) -->' +
                '<div class="catfish-row catfish-row-1">' +
                    '<a class="catfish-item catfish-item-desktop-only" href="' + b[0].url + '" target="_blank" rel="noopener nofollow" aria-label="' + b[0].label + '">' +
                        renderMedia(b[0]) +
                    '</a>' +
                    '<div class="catfish-rotate-slot">' +
                        '<a class="catfish-item catfish-slide slide-active" href="' + b[1].url + '" target="_blank" rel="noopener nofollow" aria-label="' + b[1].label + '">' +
                            renderMedia(b[1]) +
                        '</a>' +
                        '<a class="catfish-item catfish-slide" href="' + b[0].url + '" target="_blank" rel="noopener nofollow" aria-label="' + b[0].label + '">' +
                            renderMedia(b[0]) +
                        '</a>' +
                    '</div>' +
                '</div>' +
                '<!-- Row 2: ColaTV & ColaScore -->' +
                '<div class="catfish-row catfish-row-2">' +
                    '<a class="catfish-item" href="' + b[2].url + '" target="_blank" rel="noopener nofollow" aria-label="' + b[2].label + '">' +
                        renderMedia(b[2]) +
                    '</a>' +
                    '<a class="catfish-item" href="' + b[3].url + '" target="_blank" rel="noopener nofollow" aria-label="' + b[3].label + '">' +
                        renderMedia(b[3]) +
                    '</a>' +
                '</div>' +
            '</div>' +
            '<button id="aphim-catfish-close" title="Đóng quảng cáo" aria-label="Đóng">&#10005;</button>';

        document.body.appendChild(bar);
        document.body.classList.add('aphim-has-catfish');

        // Tự động xoay mượt giữa VSBet và 8SVui ở slot Row 1 (mỗi 3.5s - CHỈ TRÊN MOBILE)
        var rotateSlot = bar.querySelector('.catfish-rotate-slot');
        if (rotateSlot) {
            var slides = rotateSlot.querySelectorAll('.catfish-slide');
            if (slides.length >= 2) {
                var currentIdx = 0;
                setInterval(function () {
                    // Trên Desktop (> 768px) giữ cố định duy nhất banner VSBet (slide 0), không xoay sang 8SVui
                    if (window.innerWidth > 768) {
                        if (currentIdx !== 0) {
                            slides[currentIdx].classList.remove('slide-active');
                            currentIdx = 0;
                            slides[0].classList.add('slide-active');
                        }
                        return;
                    }
                    slides[currentIdx].classList.remove('slide-active');
                    currentIdx = (currentIdx + 1) % slides.length;
                    slides[currentIdx].classList.add('slide-active');
                }, 3500);
            }
        }

        requestAnimationFrame(function () {
            requestAnimationFrame(function () { 
                bar.classList.add('visible'); 
            });
        });

        var closeBtn = document.getElementById('aphim-catfish-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                bar.classList.remove('visible');
                document.body.classList.remove('aphim-has-catfish');
                setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 450);
                var pageKey = CONFIG.catfish.sessionKey;
                setSession(pageKey);
            });
        }
    }

    
    /* ─────────────────────────────────────────────────────────
       CATFISH TOP STICKY BAR (8QBet) — Treo từ thanh điều hướng xuống
    ───────────────────────────────────────────────────────── */
    function shouldShowCatfishTop() {
        if (!CONFIG.catfishTop || !CONFIG.catfishTop.enabled) return false;
        if (window.innerWidth >= 768) {
            return true;
        }
        var pageKey = CONFIG.catfishTop.sessionKey;
        return !getSession(pageKey);
    }

    function initCatfishTop() {
        if (!shouldShowCatfishTop()) return;

        var bar = document.createElement('div');
        bar.id = 'aphim-catfish-top';
        bar.setAttribute('role', 'complementary');
        bar.setAttribute('aria-label', 'Quảng cáo đối tác 8QBet');
        bar.innerHTML =
            '<div class="catfish-inner">' +
                '<div class="catfish-row">' +
                    '<a class="catfish-item" href="https://www.aa8qbet.com/?ch=74858ce908" target="_blank" rel="noopener nofollow" aria-label="8QBet — Thưởng Khủng 888K">' +
                        '<img src="/quangcao/8pbet/banner_8Qbet.gif" alt="8QBet Thưởng Khủng" loading="eager">' +
                    '</a>' +
                '</div>' +
            '</div>' +
            '<button id="aphim-catfish-top-close" title="Đóng quảng cáo" aria-label="Đóng">&#10005;</button>';

        document.body.appendChild(bar);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () { 
                bar.classList.add('visible'); 
            });
        });

        var closeBtn = document.getElementById('aphim-catfish-top-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                bar.classList.remove('visible');
                setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 450);
                var pageKey = CONFIG.catfishTop.sessionKey;
                setSession(pageKey);
            });
        }
    }

    /* ─────────────────────────────────────────────────────────
       WELCOME POPUP — Slideshow style Bet365 / 1xBet
       - 3 banner xoay vòng tự động mỗi 4 giây
       - Hiện 1 lần / session (đóng → không hiện lại đến khi refresh)
       - Nút "Đóng QC ×" đỏ nổi bật ngoài card
       - Dot indicators + progress bar
    ───────────────────────────────────────────────────────── */
    function initPopup() {
        if (!shouldShowPopup()) return;

        var banners = CONFIG.banners;
        var n = banners.length;

        // --- Build slides HTML ---
        var slidesHTML = '';
        for (var i = 0; i < n; i++) {
            slidesHTML +=
                '<div class="aph-slide' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
                    '<a href="' + banners[i].url + '" target="_blank" rel="noopener nofollow" ' +
                       'class="aph-slide-link" aria-label="' + banners[i].label + '">' +
                        '<img src="' + banners[i].img + '" alt="' + banners[i].label + '" loading="eager">' +
                    '</a>' +
                '</div>';
        }

        // --- Build dots HTML ---
        var dotsHTML = '';
        for (var j = 0; j < n; j++) {
            dotsHTML += '<button class="aph-dot' + (j === 0 ? ' active' : '') + '" data-index="' + j + '" aria-label="Banner ' + (j + 1) + '"></button>';
        }

        // --- Overlay ---
        var overlay = document.createElement('div');
        overlay.id = 'aphim-popup-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Quảng cáo đối tác');

        overlay.innerHTML =
            '<div class="aph-popup-wrapper">' +
                // Nút đóng nổi bật bên ngoài card — top right
                '<button id="aphim-popup-x" aria-label="Bỏ qua quảng cáo">' +
                    'Nh\u1ea5n b\u1ea5t k\u1ef3 \u0111\u00e2u \u0111\u1ec3 b\u1ecf qua' +
                '</button>' +
                // Card popup
                '<div id="aphim-popup">' +
                    // Slideshow
                    '<div class="aph-slideshow">' +
                        slidesHTML +
                        // Progress bar
                        '<div class="aph-progress"><div class="aph-progress-bar" id="aph-progress-bar"></div></div>' +
                        // Dots
                        '<div class="aph-dots">' + dotsHTML + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        // --- Hiện popup ---
        var showTimer = setTimeout(function () {
            requestAnimationFrame(function () { overlay.classList.add('visible'); });
            startSlideshow();
        }, CONFIG.popup.showAfterMs);

        // --- Slideshow logic ---
        var currentSlide = 0;
        var slideTimer = null;
        var progressAnim = null;
        var closed = false;

        function goToSlide(idx) {
            var slides = overlay.querySelectorAll('.aph-slide');
            var dots   = overlay.querySelectorAll('.aph-dot');
            if (!slides[idx]) return;

            // Remove active from current
            slides[currentSlide].classList.remove('active');
            slides[currentSlide].classList.add('prev');
            dots[currentSlide].classList.remove('active');

            currentSlide = (idx + n) % n;

            // Add active to new
            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');

            // Clean up prev after transition
            setTimeout(function () {
                for (var s = 0; s < slides.length; s++) {
                    slides[s].classList.remove('prev');
                }
            }, 500);

            resetProgress();
        }

        function resetProgress() {
            var bar = document.getElementById('aph-progress-bar');
            if (!bar) return;
            bar.style.transition = 'none';
            bar.style.width = '0%';
            setTimeout(function () {
                bar.style.transition = 'width ' + CONFIG.popup.slideIntervalMs + 'ms linear';
                bar.style.width = '100%';
            }, 30);
        }

        function startSlideshow() {
            resetProgress();
            slideTimer = setInterval(function () {
                if (!closed) goToSlide(currentSlide + 1);
            }, CONFIG.popup.slideIntervalMs);
        }

        // Dot click
        var dots = overlay.querySelectorAll('.aph-dot');
        for (var d = 0; d < dots.length; d++) {
            (function(dotEl) {
                dotEl.addEventListener('click', function () {
                    clearInterval(slideTimer);
                    var target = parseInt(dotEl.getAttribute('data-index'), 10);
                    goToSlide(target);
                    slideTimer = setInterval(function () {
                        if (!closed) goToSlide(currentSlide + 1);
                    }, CONFIG.popup.slideIntervalMs);
                });
            })(dots[d]);
        }

        // --- Close ---
        function closePopup() {
            if (closed) return;
            closed = true;
            clearTimeout(showTimer);
            clearInterval(slideTimer);
            // Lưu key theo pathname — chỉ ẩn trên trang này
            setSession(CONFIG.popup.sessionKey);
            overlay.classList.remove('visible');
            setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 360);
        }

        document.getElementById('aphim-popup-x').addEventListener('click', closePopup);
        overlay.addEventListener('click', function (e) {
            if (e.target.classList.contains('aph-dot')) return;
            closePopup();
        });
        document.addEventListener('keydown', function escH(e) {
            if (e.key === 'Escape') { closePopup(); document.removeEventListener('keydown', escH); }
        });
    }

    /* ─────────────────────────────────────────────────────────
       BOOTSTRAP
    ───────────────────────────────────────────────────────── */
    function boot() {
        initCatfish();
        initPopup();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
