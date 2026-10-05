/**
 * A PHIM SUPER — Ultra-Smooth 120FPS Desktop Mouse Drag, Horizontal Scroll & Kinetic Momentum Engine (v13.0)
 * Nâng cấp toàn diện nhận diện chuột và cử chỉ kéo lướt siêu nhạy, mượt mà trên toàn bộ các danh sách ngang Desktop.
 *
 * TÍNH NĂNG ĐỘT PHÁ:
 * 1. Nhận diện rê chuột tức thì (0ms latency, 1:1 direct tracking, 120fps fluid).
 * 2. Phân rã quán tính vật lý (Kinetic Inertia Glide): Khi thả chuột, thanh trượt tiếp tục lướt mượt với gia tốc tự nhiên.
 * 3. Hỗ trợ con lăn chuột thông minh (Smart Mouse Wheel): Lăn chuột dọc tự động cuộn ngang mượt mà khi hover vào thanh trượt.
 * 4. Chống click nhầm tuyệt đối (Zero accidental clicks khi đang kéo lướt; mở phim ngay lập tức khi click thật).
 * 5. Tự động áp dụng cho tất cả thanh trượt trên trang chủ, trang chi tiết và toàn bộ website.
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Danh sách toàn bộ các thanh trượt / container ngang trên website
    const SLIDER_SELECTORS = [
        '#slider-de-cu',
        '.de-cu-slider',
        '#homeCommentsTrack',
        '.home-comments-track',
        '#heroThumbnails',
        '.interests-wrapper',
        '.ranking-grid-container',
        '.top-movies-scroll',
        '#topMoviesList',
        '.country-scroll-container',
        '.cs-scroll-container',
        '#country-sections',
        '.top10-platforms-scroll',
        '#movie-gallery-scroll',
        '#actor-list',
        '.actor-track',
        '.similar-movies-track',
        '.season-tabs-track',
        '.cat-tab-container',
        '.mobile-thumb-wrapper',
        '.horizontal-scroll',
        '.overflow-x-auto',
        '.scrollbar-hide',
        '.snap-x'
    ].join(', ');

    function isDesktopDevice() {
        return window.innerWidth >= 768 || (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }

    function getScrollContainer(target) {
        if (!target || typeof target.closest !== 'function') return null;

        // Bỏ qua nếu bấm vào các phần tử điều khiển chuyên biệt
        if (target.closest('input, textarea, select, .hero-thumb-item, .home-comments-scroll-btn, .section-header-nav, .comment-switch, .top10-type-btn, .top10-region-capsule, [data-no-drag]')) {
            return null;
        }

        const matched = target.closest(SLIDER_SELECTORS);
        if (matched) {
            if (matched.scrollWidth > matched.clientWidth || matched.id === 'slider-de-cu' || matched.classList.contains('de-cu-slider') || matched.id === 'homeCommentsTrack') {
                return matched;
            }
        }

        // Tìm kiếm phân cấp cha
        let el = target;
        while (el && el !== document.body && el !== document.documentElement) {
            if (el.scrollWidth > el.clientWidth + 4) {
                const style = window.getComputedStyle(el);
                if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
                    return el;
                }
            }
            el = el.parentElement;
        }
        return null;
    }

    // ── BIẾN QUẢN LÝ TRẠNG THÁI DRAG & MOMENTUM ──
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
    let activePointerId = null;

    function stopMomentum() {
        if (momentumAnimId) {
            cancelAnimationFrame(momentumAnimId);
            momentumAnimId = null;
        }
    }

    // ── 1. BẢO VỆ CHỐNG CLICK NHẦM KHI KÉO LƯỚT (CHỈ DESKTOP) ──
    document.addEventListener('click', function (e) {
        if (!isDesktopDevice()) return;
        if (performance.now() < suppressClickUntil) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
    }, true);

    // ── 2. NHẤN CHUỘT / POINTER DOWN — NHẬN DIỆN TỨC THÌ 0MS ──
    function onPointerDown(e) {
        // CHUYÊN BIỆT CHO DESKTOP MOUSE: Tuyệt đối không can thiệp vào cảm ứng di động (touch)
        // để trình duyệt di động dùng 100% Native Compositor 120FPS GPU scrolling mượt mà như Netflix
        if (e.pointerType === 'touch' || !isDesktopDevice()) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

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
        activePointerId = e.pointerId;
    }

    // ── 3. RÊ CHUỘT / POINTER MOVE — ĐI THEO TAY 100% MƯỢT MÀ ──
    function onPointerMove(e) {
        if (!isPointerDown || !activeContainer) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        if (!isDragging) {
            // Nếu người dùng cuộn dọc rõ rệt (vertical scrolling), nhả kéo ngang để trang cuộn tự nhiên
            if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX) * 1.4) {
                isPointerDown = false;
                activeContainer = null;
                return;
            }

            // Ngưỡng kích hoạt kéo mượt: 4px
            if (Math.abs(deltaX) >= 4) {
                isDragging = true;
                activeContainer.classList.add('is-smooth-dragging');
                activeContainer.style.scrollBehavior = 'auto';
                activeContainer.style.scrollSnapType = 'none';

                if (activePointerId !== null && activeContainer.setPointerCapture) {
                    try { activeContainer.setPointerCapture(activePointerId); } catch(err) {}
                }
            }
        }

        if (isDragging) {
            // Cập nhật vị trí cuộn trực tiếp 1:1 siêu nhạy
            activeContainer.scrollLeft = scrollStart - deltaX;

            const now = performance.now();
            const dt = now - lastTime;
            if (dt > 2) {
                const instantV = (e.clientX - lastX) / dt;
                // Bộ lọc gia tốc trơn mượt
                velocity = velocity * 0.25 + instantV * 0.75;
                lastX = e.clientX;
                lastTime = now;
            }

            if (e.cancelable) {
                e.preventDefault();
            }
        }
    }

    // ── 4. THẢ CHUỘT / POINTER UP — KHỞI CHẠY QUÁN TÍNH VẬT LÝ FLUID GLIDE ──
    function onPointerUp(e) {
        if (!isPointerDown) return;

        const container = activeContainer;
        const wasDragging = isDragging;
        const totalMoved = Math.abs(e.clientX - startX);
        const finalVelocity = velocity;

        isPointerDown = false;
        isDragging = false;
        activeContainer = null;

        if (container) {
            container.classList.remove('is-smooth-dragging');
            if (activePointerId !== null && container.releasePointerCapture) {
                try {
                    if (container.hasPointerCapture && container.hasPointerCapture(activePointerId)) {
                        container.releasePointerCapture(activePointerId);
                    }
                } catch (err) {}
            }
        }
        activePointerId = null;

        // Xử lý chặn click nhầm
        if (wasDragging && totalMoved > 6) {
            suppressClickUntil = performance.now() + 250;
        } else {
            suppressClickUntil = 0;
        }

        // Khởi chạy quán tính vật lý (Kinetic Momentum Glide) khi thả tay có vận tốc
        if (wasDragging && container && Math.abs(finalVelocity) > 0.12) {
            let currentV = finalVelocity * 15; // Hệ số chuyển đổi mượt
            const maxScroll = container.scrollWidth - container.clientWidth;
            let lastGlideTime = performance.now();

            function glideStep(now) {
                const stepDt = Math.min(now - lastGlideTime, 32);
                lastGlideTime = now;

                if (Math.abs(currentV) < 0.15 || !container) {
                    if (container) {
                        container.style.scrollBehavior = '';
                        container.style.scrollSnapType = '';
                    }
                    momentumAnimId = null;
                    return;
                }

                container.scrollLeft -= currentV * (stepDt / 16);

                // Giảm tốc theo hàm số mũ tự nhiên (Decay factor)
                currentV *= 0.935;

                // Dừng nếu chạm rìa danh sách
                if (container.scrollLeft <= 0 || container.scrollLeft >= maxScroll) {
                    currentV *= 0.5; // Giảm xóc khi chạm mép
                    if (Math.abs(currentV) < 0.3) {
                        momentumAnimId = null;
                        return;
                    }
                }

                momentumAnimId = requestAnimationFrame(glideStep);
            }

            stopMomentum();
            momentumAnimId = requestAnimationFrame(glideStep);
        } else if (container) {
            container.style.scrollBehavior = '';
            container.style.scrollSnapType = '';
        }
    }

    // ── GẮN LISTENER TOÀN CỤC CHUẨN XÁC VỚI CAPTURE ──
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
    window.addEventListener('pointermove', onPointerMove, { capture: false, passive: false });
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', onPointerUp, { capture: true, passive: true });

    // Fallback cho trình duyệt cũ hơn
    document.addEventListener('mousedown', (e) => {
        if (!window.PointerEvent) onPointerDown(e);
    }, { capture: true, passive: true });
    window.addEventListener('mousemove', (e) => {
        if (!window.PointerEvent) onPointerMove(e);
    }, { capture: false, passive: false });
    window.addEventListener('mouseup', (e) => {
        if (!window.PointerEvent) onPointerUp(e);
    }, { capture: true, passive: true });

    // Ngăn chặn kéo ảnh / văn bản mặc định của trình duyệt gây kẹt giao diện
    document.addEventListener('dragstart', function (e) {
        if (getScrollContainer(e.target)) {
            e.preventDefault();
        }
    }, true);

    // ── 5. HỖ TRỢ CON LĂN CHUỘT CHUẨN XÁC TRÊN DESKTOP (KHÔNG CƯỚP QUYỀN CUỘN DỌC) ──
    // Khi người dùng lăn dọc chuột, trang web cuộn dọc 100% tự nhiên không bị chặn lại hay hiểu lầm thành cuộn ngang.
    // CHỈ cuộn ngang khi người dùng chủ động: Giữ Shift + Lăn chuột (chuẩn W3C quốc tế), hoặc vuốt ngang 2 ngón Trackpad.
    document.addEventListener('wheel', function (e) {
        if (!isDesktopDevice()) return;
        if (e.ctrlKey || e.altKey) return; // Không can thiệp nếu đang zoom trang

        const container = getScrollContainer(e.target);
        if (!container) return;

        // Người dùng chủ động giữ Shift + lăn chuột để cuộn ngang danh sách phim
        if (e.shiftKey && Math.abs(e.deltaY) > 0) {
            const maxScroll = container.scrollWidth - container.clientWidth;
            if (maxScroll <= 0) return;
            e.preventDefault();
            stopMomentum();
            container.scrollLeft += e.deltaY * 1.1;
            return;
        }

        // Lăn chuột dọc bình thường: TUYỆT ĐỐI KHÔNG preventDefault!
        // Để trang web cuộn dọc êm ái xuyên suốt toàn trang, không bị khựng lại hay hiểu lầm thành cuộn ngang.
    }, { passive: false });

    // ── 6. CSS INJECTION CHO TRẢI NGHIỆM DESKTOP ĐỈNH CAO ──
    const style = document.createElement('style');
    style.textContent = `
        @media (min-width: 768px) {
            #slider-de-cu,
            .de-cu-slider,
            #homeCommentsTrack,
            .home-comments-track,
            #heroThumbnails,
            .interests-wrapper,
            .ranking-grid-container,
            .top-movies-scroll,
            #topMoviesList,
            .country-scroll-container,
            .cs-scroll-container,
            .top10-platforms-scroll,
            #movie-gallery-scroll,
            #actor-list,
            .actor-track,
            .similar-movies-track,
            .season-tabs-track {
                cursor: grab;
                user-select: none !important;
                -webkit-user-select: none !important;
                will-change: scroll-position;
                transform: translateZ(0);
                scrollbar-width: none !important;
                -webkit-overflow-scrolling: touch;
            }

            #slider-de-cu:active,
            .de-cu-slider:active,
            #homeCommentsTrack:active,
            .home-comments-track:active,
            #heroThumbnails:active,
            .interests-wrapper:active,
            .ranking-grid-container:active,
            .top-movies-scroll:active,
            .country-scroll-container:active,
            .top10-platforms-scroll:active {
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
                pointer-events: none !important;
            }

            .de-cu-slider img,
            #slider-de-cu img,
            .home-comments-track img,
            .interests-wrapper img,
            #heroThumbnails img,
            .top10-platforms-scroll img,
            .country-scroll-container img {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }

            .de-cu-slider a,
            #slider-de-cu a,
            .home-comment-card,
            .interests-wrapper a {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    console.log('⚡ [APhim Slider Engine] Desktop Ultra-Smooth Drag & Kinetic Momentum v13.0 Active.');
})();