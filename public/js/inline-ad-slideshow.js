/**
 * APhim — Inline Ad Slideshow
 * - Mobile (≤768px): tất cả banners chuyển sang slideshow 1 cái / lần
 * - Desktop: chỉ kích hoạt slideshow nếu có thuộc tính data-always-slideshow
 */
(function () {
    'use strict';

    var SLIDE_INTERVAL = 3500;
    var MOBILE_BP      = 768;

    function isMobile() {
        return window.innerWidth <= MOBILE_BP;
    }

    function initSlideshow(inner) {
        var items = Array.prototype.slice.call(inner.querySelectorAll('.aphim-inline-ad-item'));
        if (items.length <= 1) return;

        var current = 0;
        inner.classList.add('is-slideshow');

        // Ẩn tất cả, hiện item đầu
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('slide-active');
        }
        items[0].classList.add('slide-active');

        // Tạo dot bar
        var dotBar = document.createElement('div');
        dotBar.className = 'aphim-inline-dot-bar';
        for (var j = 0; j < items.length; j++) {
            (function (idx) {
                var dot = document.createElement('button');
                dot.className = 'aphim-inline-dot' + (idx === 0 ? ' active' : '');
                dot.setAttribute('aria-label', 'Banner ' + (idx + 1));
                dot.addEventListener('click', function () {
                    goTo(idx);
                    resetTimer();
                });
                dotBar.appendChild(dot);
            })(j);
        }

        if (inner.parentNode) {
            inner.parentNode.insertBefore(dotBar, inner.nextSibling);
        }

        function getDots() {
            return Array.prototype.slice.call(dotBar.querySelectorAll('.aphim-inline-dot'));
        }

        function goTo(idx) {
            var dots = getDots();
            items[current].classList.remove('slide-active');
            if (dots[current]) dots[current].classList.remove('active');

            current = ((idx % items.length) + items.length) % items.length;

            items[current].classList.add('slide-active');
            if (dots[current]) dots[current].classList.add('active');
        }

        var timer;
        function startTimer() {
            timer = setInterval(function () { goTo(current + 1); }, SLIDE_INTERVAL);
        }
        function resetTimer() {
            clearInterval(timer);
            startTimer();
        }
        startTimer();
    }

    function init() {
        var inners = Array.prototype.slice.call(
            document.querySelectorAll('.aphim-inline-ad-inner')
        );
        for (var i = 0; i < inners.length; i++) {
            var el = inners[i];
            if (el.classList.contains('is-slideshow')) continue;
            if (el.hasAttribute('data-no-slideshow')) continue;

            // Kích hoạt khi: mobile HOẶC có thuộc tính data-always-slideshow
            var forceSlideshow = el.hasAttribute('data-always-slideshow');
            if (isMobile() || forceSlideshow) {
                initSlideshow(el);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
