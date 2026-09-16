/**
 * A PHIM - Touch Speed Engine v1.0
 * Mục tiêu: phản hồi tap/click NGAY LẬP TỨC trên mobile
 * Load: KHÔNG defer, KHÔNG async - phải chạy ngay đầu <head>
 */
(function () {
    'use strict';

    // ── Progress bar ──────────────────────────────────────────
    var _bar = null;
    var _barTimer = null;

    function showProgressBar() {
        if (!_bar) {
            _bar = document.createElement('div');
            _bar.id = 'page-progress-bar';
            document.body ? document.body.appendChild(_bar) : document.addEventListener('DOMContentLoaded', function() {
                document.body.appendChild(_bar);
            });
        }
        _bar.style.width = '0%';
        _bar.classList.add('active');
        // Tiến dần đến 80% đợi response
        clearTimeout(_barTimer);
        setTimeout(function () { if (_bar) _bar.style.width = '30%'; }, 50);
        setTimeout(function () { if (_bar) _bar.style.width = '60%'; }, 200);
        setTimeout(function () { if (_bar) _bar.style.width = '80%'; }, 500);
    }

    function completeProgressBar() {
        if (document.body) document.body.classList.remove('page-exiting');
        if (!_bar) return;
        _bar.style.width = '100%';
        _barTimer = setTimeout(function () {
            if (_bar) {
                _bar.classList.remove('active');
                _bar.style.width = '0%';
            }
        }, 300);
    }

    // ── Ripple effect ─────────────────────────────────────────
    function createRipple(el, e) {
        if (!el || el.classList.contains('no-ripple')) return;

        var rect = el.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        var y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        var size = Math.max(rect.width, rect.height) * 1.5;

        var dot = document.createElement('span');
        dot.className = 'tap-ripple-dot';
        dot.style.cssText = [
            'width:' + size + 'px',
            'height:' + size + 'px',
            'left:' + (x - size / 2) + 'px',
            'top:' + (y - size / 2) + 'px'
        ].join(';');

        el.appendChild(dot);
        setTimeout(function () {
            if (dot.parentNode) dot.parentNode.removeChild(dot);
        }, 500);
    }

    // ── Instant navigate ─────────────────────────────────────
    // Thay window.location.href trực tiếp bằng hàm có progress bar
    window.instantNavigate = function (url) {
        if (!url || url === '#' || url.startsWith('javascript')) return;
        showProgressBar();
        document.body.classList.add('page-exiting');
        // requestAnimationFrame đảm bảo browser render opacity=0 trước khi navigate
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                window.location.href = url;
            });
        });
    };

    // ── Prefetch URL ─────────────────────────────────────────
    var _prefetched = {};
    function prefetchURL(url) {
        if (!url || url === '#' || _prefetched[url]) return;
        if (url.startsWith('javascript') || url.startsWith('mailto')) return;
        // Chỉ prefetch cùng origin
        try {
            var u = new URL(url, location.href);
            if (u.origin !== location.origin) return;
        } catch (e) { return; }

        _prefetched[url] = true;
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        document.head.appendChild(link);
    }

    // ── Fast tap handler ─────────────────────────────────────
    // Lắng nghe touchstart (kích hoạt ngay khi chạm, không chờ 300ms)
    // cho tất cả <a> và [data-href]
    var _touchStartTime = 0;
    var _touchStartX = 0;
    var _touchStartY = 0;
    var _touchTarget = null;
    var _touchHandled = false;
    var _rippleEl = null;     // Element đang có ripple
    var _swipeCancelled = false; // True khi phát hiện là swipe ngang

    // Hàm xóa ripple ngay lập tức (gọi khi swipe được xác nhận)
    function cancelRipple() {
        if (_rippleEl) {
            _rippleEl.classList.remove('tap-ripple');
            var dots = _rippleEl.querySelectorAll('.tap-ripple-dot');
            dots.forEach(function(d) { if (d.parentNode) d.parentNode.removeChild(d); });
            _rippleEl = null;
        }
    }

    document.addEventListener('touchstart', function (e) {
        var target = e.target.closest('a[href], [data-href], .mm-card-item[href], .mm-nav-full[href]');
        if (!target) return;

        _touchStartTime = Date.now();
        _touchStartX = e.touches[0].clientX;
        _touchStartY = e.touches[0].clientY;
        _touchTarget = target;
        _touchHandled = false;
        _swipeCancelled = false;
        _rippleEl = null;

        // Visual feedback ngay lập tức
        var rippleEl = target.classList.contains('tap-ripple') ? target : target;
        rippleEl.classList.add('tap-ripple');
        createRipple(rippleEl, e);
        _rippleEl = rippleEl; // Lưu để có thể cancel sau

        // ĐÃ TẮT: Prefetch URL ngay khi chạm để tránh lỗi 503 (DDOS tự tạo)
        // var url = target.getAttribute('href') || target.getAttribute('data-href');
        // if (url) prefetchURL(new URL(url, location.href).href);

    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        if (!_touchTarget || _touchHandled) return;

        var dx = Math.abs(e.changedTouches[0].clientX - _touchStartX);
        var dy = Math.abs(e.changedTouches[0].clientY - _touchStartY);
        var dt = Date.now() - _touchStartTime;

        // Chỉ xử lý tap thực (không phải scroll)
        if (dx < 10 && dy < 10 && dt < 500) {
            var url = _touchTarget.getAttribute('href') || _touchTarget.getAttribute('data-href');
            // Chỉ navigate nếu là URL thực, không phải # hay javascript:
            if (url && url !== '#' && !url.startsWith('javascript') && !url.startsWith('mailto')) {
                var target = _touchTarget.getAttribute('target');
                if (target === '_blank') {
                    // Để browser xử lý
                } else {
                    // Chặn touch-speed nếu là link đăng nhập/đăng ký (để auth-modal.js xử lý)
                    const isAuth = url.includes('login') || url.includes('register') || url.includes('profile');
                    if (isAuth || _touchTarget.getAttribute('onclick')) {
                        _touchTarget = null;
                        return;
                    }
                    
                    _touchHandled = true;
                    e.preventDefault();
                    window.instantNavigate(url);
                }
            }
        }
        _touchTarget = null;
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
        if (!_touchTarget) return;
        var dx = Math.abs(e.touches[0].clientX - _touchStartX);
        var dy = Math.abs(e.touches[0].clientY - _touchStartY);
        // Nếu lướt ngang nhiều hơn dọc → là swipe → hủy ripple ngay
        if (dx > 8 && dx > dy * 0.8 && !_swipeCancelled) {
            _swipeCancelled = true;
            cancelRipple();
            _touchTarget = null;
        } else if (dy > 10) {
            _touchTarget = null; // scroll dọc → cancel
        }
    }, { passive: true });

    // ── Prefetch on hover (desktop) ──────────────────────────
    // ĐÃ TẮT: Tránh gây lỗi 503 Service Unavailable khi di chuột qua quá nhiều poster
    var _hoverTimer = null;
    document.addEventListener('mouseover', function (e) {
        var a = e.target.closest('a[href]');
        if (!a) return;
        clearTimeout(_hoverTimer);
        /* 
        _hoverTimer = setTimeout(function () {
            prefetchURL(a.href);
        }, 150); 
        */
    });

    document.addEventListener('mouseout', function () {
        clearTimeout(_hoverTimer);
    });

    // ── Complete progress bar khi trang load xong ────────────
    window.addEventListener('pageshow', completeProgressBar);
    window.addEventListener('load', completeProgressBar);

    // ── Override window.location navigation ─────────────────
    // Intercept click thông thường để thêm progress bar
    document.addEventListener('click', function (e) {
        if (_touchHandled) { _touchHandled = false; return; }
        var a = e.target.closest('a[href]');
        if (!a || !a.href) return;

        try {
            var u = new URL(a.href);
            if (u.origin !== location.origin) return; // external link
            if (u.hash && u.pathname === location.pathname) return; // anchor scroll
            if (a.getAttribute('target') === '_blank') return;
            // onClick override có explicit - let it handle
            if (a.getAttribute('onclick')) return;
        } catch (e) { return; }

        showProgressBar();
        // Không preventDefault — để browser navigate bình thường,
        // chỉ hiện progress bar cho UX
    });

    // ── Expose API ────────────────────────────────────────────
    window.TouchSpeed = {
        prefetch: prefetchURL,
        navigate: window.instantNavigate,
        showProgress: showProgressBar,
        completeProgress: completeProgressBar
    };

    // ── Prefetch trang phổ biến sau khi page load ────────────
    // ĐÃ TẮT: Tránh cạnh tranh tài nguyên và lỗi 503
    /*
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            var popularPages = ['search.html', 'danh-sach.html', 'categories.html'];
            popularPages.forEach(function (p) {
                prefetchURL(new URL(p, location.href).href);
            });
        }, 3000);
    });
    */

})();
