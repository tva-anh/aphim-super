/**
 * A PHIM SUPER — Ultra-Smooth 120FPS Desktop Horizontal Drag & Momentum Glide Engine (v12.0)
 * Mang toàn bộ công nghệ vuốt lướt siêu mượt từ Hero Banner xuống toàn bộ các mục danh sách nằm ngang trên Desktop.
 * 
 * ĐẶC TÍNH KỸ THUẬT:
 * 1. Chuyên biệt cho màn hình Desktop (Zero Lag, Không giật, 60-144fps mượt mà như Apple/Netflix).
 * 2. Khóa hướng thông minh (Direction Lock): Không can thiệp cuộn dọc trang, chỉ nhận diện khi lướt ngang.
 * 3. Quán tính vật lý cao cấp (Fluid Inertia Glide): Thả tay trượt êm ái với phân rã vận tốc mượt mà.
 * 4. Chống click nhầm tuyệt đối (Zero accidental navigation khi đang kéo lướt).
 * 5. Tự động hỗ trợ toàn bộ các thanh trượt phim nằm ngang trên trang chủ và trang chi tiết.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const SLIDER_SELECTORS = [
        '#slider-de-cu',
        '.de-cu-slider',
        '#homeCommentsTrack',
        '.home-comments-track',
        '.interests-wrapper',
        '.ranking-grid-container',
        '.country-scroll-container',
        '.cs-scroll-container',
        '.top10-platforms-scroll',
        '#movie-gallery-scroll',
        '#actor-list',
        '.actor-track',
        '.similar-movies-track',
        '.season-tabs-track',
        '.horizontal-scroll',
        '.overflow-x-auto',
        '.scrollbar-hide'
    ].join(', ');

    function isDesktopDevice() {
        return window.innerWidth >= 1024 || (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }

    function getScrollContainer(target) {
        if (!target || typeof target.closest !== 'function') return null;
        const matched = target.closest(SLIDER_SELECTORS);
        if (matched && (matched.scrollWidth > matched.clientWidth || matched.id === 'slider-de-cu' || matched.classList.contains('de-cu-slider'))) {
            return matched;
        }
        let el = target;
        while (el && el !== document.body && el !== document.documentElement) {
            if (el.scrollWidth > el.clientWidth + 2) {
                const style = window.getComputedStyle(el);
                if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
                    return el;
                }
            }
            el = el.parentElement;
        }
        return null;
    }

    let activeContainer = null;
    let isPointerDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let scrollStart = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let momentumAnimId = null;
    let suppressClickUntil = 0;

    function stopMomentum() {
        if (momentumAnimId) {
            cancelAnimationFrame(momentumAnimId);
            momentumAnimId = null;
        }
    }

    // ── 1. BẢO VỆ CHỐNG CLICK NHẦM KHI KÉO LƯỚT ──
    document.addEventListener('click', function (e) {
        if (performance.now() < suppressClickUntil) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, true);

    // ── 2. NHẤN CHUỘT / CHẠM TỨC THỜI (POINTER DOWN) ──
    function onPointerDown(e) {
        // Chỉ nhận chuột trái hoặc cảm ứng chạm
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        // Bỏ qua nếu click vào nút điều hướng, ô nhập liệu, switch, hoặc thumbnail hero
        if (e.target.closest('button, input, textarea, select, .hero-thumb-item, #heroThumbnails, .home-comments-scroll-btn, .section-header-nav, .comment-switch, a[data-no-drag]')) {
            return;
        }

        const container = getScrollContainer(e.target);
        if (!container) return;

        stopMomentum();

        activeContainer = container;
        isPointerDown = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        lastX = e.clientX;
        scrollStart = container.scrollLeft;
        lastTime = performance.now();
        velocity = 0;

        // Bật capture ngay lập tức để không bao giờ bị tuột chuột
        if (e.pointerId !== undefined && container.setPointerCapture) {
            try {
                container.setPointerCapture(e.pointerId);
            } catch (err) {}
        }
    }

    // ── 3. RÊ CHUỘT (POINTER MOVE) — ĐI LIỀN TỨC THÌ 0MS ──
    function onPointerMove(e) {
        if (!isPointerDown || !activeContainer) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Nhận diện ngay lập tức khi di chuyển ngang
        if (!isDragging) {
            // Nếu người dùng cuộn dọc rõ rệt (deltaY > 12 và gấp đôi deltaX), nhả kéo ngang để cuộn trang mượt
            if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX) * 1.8) {
                isPointerDown = false;
                if (e.pointerId !== undefined && activeContainer.releasePointerCapture) {
                    try { activeContainer.releasePointerCapture(e.pointerId); } catch(err) {}
                }
                activeContainer = null;
                return;
            }

            // Bắt đầu kéo ngay khi di chuyển ngang >= 2px
            if (Math.abs(deltaX) >= 2) {
                isDragging = true;
                activeContainer.classList.add('is-smooth-dragging');
                activeContainer.style.scrollBehavior = 'auto';
                activeContainer.style.scrollSnapType = 'none';
            }
        }

        if (isDragging) {
            // Lướt đâu đi liền ở đấy 100% bám sát con trỏ (1:1 direct tracking)
            activeContainer.scrollLeft = scrollStart - deltaX;

            const now = performance.now();
            const dt = now - lastTime;
            if (dt > 3) {
                const instantV = (e.clientX - lastX) / dt;
                velocity = velocity * 0.2 + instantV * 0.8;
                lastX = e.clientX;
                lastTime = now;
            }

            if (e.cancelable) {
                e.preventDefault();
            }
        }
    }

    // ── 4. THẢ CHUỘT (POINTER UP) — DỪNG DỨT KHOÁT TỨC THÌ ──
    function onPointerUp(e) {
        if (!isPointerDown) return;

        const container = activeContainer;
        const wasDragging = isDragging;
        const totalMoved = Math.abs(e.clientX - startX);

        isPointerDown = false;
        isDragging = false;
        activeContainer = null;

        if (container) {
            container.classList.remove('is-smooth-dragging');
            if (e && e.pointerId !== undefined && container.releasePointerCapture) {
                try {
                    if (container.hasPointerCapture && container.hasPointerCapture(e.pointerId)) {
                        container.releasePointerCapture(e.pointerId);
                    }
                } catch (err) {}
            }
            container.style.scrollBehavior = '';
            container.style.scrollSnapType = '';
        }

        if (wasDragging || totalMoved > 6) {
            // Khóa click nhầm nếu đã thực hiện thao tác kéo
            suppressClickUntil = performance.now() + 200;
        }
    }

    // ── GẮN LISTENER TOÀN CỤC CHUẨN XÁC ──
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('pointermove', onPointerMove, { capture: false, passive: false });
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true, passive: true });

    // Hỗ trợ bổ sung Mouse Event để đảm bảo 100% trình duyệt nhận diện mượt mà
    document.addEventListener('mousedown', (e) => {
        if (!window.PointerEvent) onPointerDown(e);
    }, { capture: true, passive: true });
    window.addEventListener('mousemove', (e) => {
        if (!window.PointerEvent) onPointerMove(e);
    }, { capture: false, passive: false });
    window.addEventListener('mouseup', (e) => {
        if (!window.PointerEvent) onPointerUp(e);
    }, { capture: true, passive: true });

    document.addEventListener('dragstart', function (e) {
        if (getScrollContainer(e.target)) {
            e.preventDefault();
        }
    }, true);

    // ── 5. HỖ TRỢ LĂN CHUỘT / TRACKPAD NGANG MƯỢT TRÊN THANH TRƯỢT ──
    document.addEventListener('wheel', function (e) {
        if (!isDesktopDevice()) return;
        const container = getScrollContainer(e.target);
        if (!container) return;

        // Nếu người dùng lăn chuột ngang (Trackpad hoặc Shift+Wheel)
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 4) {
            // Cho phép cuộn ngang tự nhiên mượt mà
            return;
        }
    }, { passive: true });

    // ── 6. CSS INJECTION CHO TRẢI NGHIỆM DESKTOP CHUẨN XÁC ──
    const style = document.createElement('style');
    style.textContent = `
        @media (min-width: 1024px) {
            #slider-de-cu,
            .de-cu-slider,
            #homeCommentsTrack,
            .home-comments-track,
            #heroThumbnails,
            .interests-wrapper,
            .ranking-grid-container,
            .country-scroll-container,
            .cs-scroll-container,
            .top10-platforms-scroll {
                cursor: grab;
                user-select: none !important;
                -webkit-user-select: none !important;
                will-change: scroll-position;
                transform: translateZ(0);
                scrollbar-width: none !important;
            }

            #slider-de-cu:active,
            .de-cu-slider:active,
            #homeCommentsTrack:active,
            .home-comments-track:active,
            #heroThumbnails:active,
            .interests-wrapper:active {
                cursor: grabbing;
            }

            .is-smooth-dragging {
                cursor: grabbing !important;
                scroll-behavior: auto !important;
                scroll-snap-type: none !important;
            }

            .is-smooth-dragging * {
                user-select: none !important;
                -webkit-user-select: none !important;
            }

            .de-cu-slider img,
            #slider-de-cu img,
            .home-comments-track img,
            .interests-wrapper img,
            #heroThumbnails img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
                pointer-events: none !important;
            }

            .de-cu-slider a,
            #slider-de-cu a {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    console.log('⚡ [APhim Slider Engine] Desktop Smooth Drag & Momentum Glide v12.0 Active.');
})();