/**
 * A PHIM SUPER — Ultra-Smooth 120FPS Desktop Mouse Drag & Kinetic Momentum Engine (v14.0)
 * Tối ưu hóa toàn diện: Triệt tiêu hoàn toàn hiện tượng giật lag khi kéo lướt trên Desktop.
 *
 * TÍNH NĂNG ĐỘT PHÁ V14.0:
 * 1. RequestAnimationFrame (rAF) Drag Coalescing: Đồng bộ hoàn toàn với tần số quét màn hình (60Hz / 120Hz / 144Hz / 240Hz),
 *    không bao giờ ghi đè DOM quá 1 lần/frame, giải phóng 100% CPU/GPU.
 * 2. Triệt tiêu layout thrashing: Loại bỏ hoàn toàn selector con '*', không kích hoạt style recalculation khi kéo.
 * 3. Bỏ setPointerCapture: Lắng nghe trực tiếp trên window, tracking mượt mà không khựng giật.
 * 4. Physics Inertia Glide: Gia tốc quán tính tự nhiên, giảm tốc mượt như macOS/iOS.
 * 5. Chống click nhầm tuyệt đối: Kéo lướt không mở phim, click nhẹ mở phim tức thì 0ms.
 * 6. Tuyệt đối không can thiệp vào cảm ứng di động (Mobile touch dùng 100% Native Compositor 120FPS).
 */
(function () {
    'use strict';

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Danh sách toàn bộ các thanh trượt / container ngang trên website
    const SLIDER_SELECTORS = [
        '#slider-de-cu',
        '.de-cu-slider',
        '#slider-cinema-hot',
        '.cinema-hot-slider',
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
        return window.innerWidth >= 768 && (!window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }

    function getScrollContainer(target) {
        if (!target || typeof target.closest !== 'function') return null;

        // Bỏ qua nếu bấm vào các phần tử điều khiển chuyên biệt
        if (target.closest('input, textarea, select, .hero-thumb-item, .home-comments-scroll-btn, .section-header-nav, .comment-switch, .top10-type-btn, .top10-region-capsule, [data-no-drag]')) {
            return null;
        }

        const matched = target.closest(SLIDER_SELECTORS);
        if (matched) {
            if (matched.scrollWidth > matched.clientWidth || 
                matched.id === 'slider-de-cu' || matched.classList.contains('de-cu-slider') || 
                matched.id === 'slider-cinema-hot' || matched.classList.contains('cinema-hot-slider') ||
                matched.id === 'homeCommentsTrack') {
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
    let targetScroll = 0;
    let maxScroll = 0;
    let dragRafId = null;
    let momentumAnimId = null;
    let suppressClickUntil = 0;
    let moveHistory = [];

    function stopMomentum() {
        if (momentumAnimId) {
            cancelAnimationFrame(momentumAnimId);
            momentumAnimId = null;
        }
    }

    function stopDragRaf() {
        if (dragRafId) {
            cancelAnimationFrame(dragRafId);
            dragRafId = null;
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
        // CHUYÊN BIỆT CHO DESKTOP MOUSE: Tuyệt đối không can thiệp vào touch di động
        if (e.pointerType === 'touch' || !isDesktopDevice()) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const container = getScrollContainer(e.target);
        if (!container) return;

        // Tạm dừng auto-advance phim rạp nếu đang tương tác
        if (container.id === 'slider-cinema-hot' || container.classList.contains('cinema-hot-slider')) {
            if (typeof window.pauseCinemaHotOnUserAction === 'function') {
                window.pauseCinemaHotOnUserAction();
            }
        }

        stopMomentum();
        stopDragRaf();

        // Ngắt ngay lập tức smooth-scroll và scroll-snap để tránh xung đột khi kéo
        container.style.scrollBehavior = 'auto';
        container.style.scrollSnapType = 'none';

        activeContainer = container;
        isPointerDown = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollStart = container.scrollLeft;
        targetScroll = scrollStart;
        maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);

        const now = performance.now();
        moveHistory = [{ x: e.clientX, t: now }];
    }

    // ── 3. RÊ CHUỘT / POINTER MOVE — 120FPS BATCHED WITH RAF (ZERO JANK) ──
    function onPointerMove(e) {
        if (!isPointerDown || !activeContainer) return;

        const deltaX = e.clientX - startX;
        const now = performance.now();

        moveHistory.push({ x: e.clientX, t: now });
        if (moveHistory.length > 5) moveHistory.shift();

        if (!isDragging) {
            // Ngưỡng kích hoạt kéo mượt: 3px (Không hủy kéo vì rê chéo trên Desktop mouse)
            if (Math.abs(deltaX) >= 3) {
                isDragging = true;
                activeContainer.classList.add('is-smooth-dragging');
                activeContainer.style.scrollBehavior = 'auto';
                activeContainer.style.scrollSnapType = 'none';
            }
        }

        if (isDragging) {
            // Tính toán vị trí đích (clamped)
            targetScroll = Math.max(0, Math.min(maxScroll, scrollStart - deltaX));

            // Gom cụm DOM write vào requestAnimationFrame duy nhất theo chu kỳ VSYNC màn hình
            if (!dragRafId) {
                dragRafId = requestAnimationFrame(function () {
                    dragRafId = null;
                    if (activeContainer && isDragging) {
                        activeContainer.scrollLeft = targetScroll;
                    }
                });
            }

            if (e.cancelable) {
                e.preventDefault();
            }
        }
    }

    // ── 4. THẢ CHUỘT / POINTER UP — KHỞI CHẠY QUÁN TÍNH VẬT LÝ FLUID GLIDE ──
    function onPointerUp(e) {
        if (!isPointerDown) return;

        stopDragRaf();

        const container = activeContainer;
        const wasDragging = isDragging;
        const totalMoved = Math.abs(e.clientX - startX);

        if (container && wasDragging) {
            // Áp dụng vị trí cuộn cuối cùng ngay lập tức
            container.scrollLeft = targetScroll;
            container.classList.remove('is-smooth-dragging');

            if (container.id === 'slider-cinema-hot' || container.classList.contains('cinema-hot-slider')) {
                if (typeof window.resumeCinemaHotAfterUserAction === 'function') {
                    window.resumeCinemaHotAfterUserAction();
                }
            }
        }

        isPointerDown = false;
        isDragging = false;
        activeContainer = null;

        // Xử lý chặn click nhầm: Nếu đã kéo hơn 5px, chặn click vào link phim
        if (wasDragging && totalMoved > 5) {
            suppressClickUntil = performance.now() + 250;
        } else {
            suppressClickUntil = 0;
        }

        // Tính toán vận tốc thả tay dựa trên các điểm gần nhất (trong 100ms)
        const now = performance.now();
        const recentPoints = moveHistory.filter(p => (now - p.t) <= 100);
        let velocity = 0;
        if (recentPoints.length >= 2) {
            const first = recentPoints[0];
            const last = recentPoints[recentPoints.length - 1];
            const dt = last.t - first.t;
            if (dt > 8) {
                velocity = (last.x - first.x) / dt; // px/ms
            }
        }

        // Khởi chạy quán tính vật lý (Kinetic Momentum Glide) mượt mà
        if (wasDragging && container && Math.abs(velocity) > 0.15) {
            let v = -velocity * 16; // Chuyển đổi px/ms sang px/frame (nghịch đảo)
            v = Math.max(-45, Math.min(45, v)); // Giới hạn tốc độ tối đa tránh văng quá đà
            const friction = 0.925; // Hệ số ma sát mũ trơn tự nhiên
            const maxS = Math.max(0, container.scrollWidth - container.clientWidth);

            function glideStep() {
                if (!container || Math.abs(v) < 0.25) {
                    if (container) {
                        container.style.scrollBehavior = '';
                        container.style.scrollSnapType = '';
                    }
                    momentumAnimId = null;
                    return;
                }

                container.scrollLeft += v;
                v *= friction;

                // Dừng nếu chạm biên
                if (container.scrollLeft <= 0 || container.scrollLeft >= maxS) {
                    if (container) {
                        container.style.scrollBehavior = '';
                        container.style.scrollSnapType = '';
                    }
                    momentumAnimId = null;
                    return;
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

    // ── GẮN LISTENER TOÀN CỤC CHUẨN XÁC VỚI PASSIVE TỐI ƯU ──
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    // Fallback cho trình duyệt cũ
    document.addEventListener('mousedown', (e) => {
        if (!window.PointerEvent) onPointerDown(e);
    }, { passive: true });
    window.addEventListener('mousemove', (e) => {
        if (!window.PointerEvent) onPointerMove(e);
    }, { passive: false });
    window.addEventListener('mouseup', (e) => {
        if (!window.PointerEvent) onPointerUp(e);
    }, { passive: true });

    // Ngăn chặn hành vi kéo ảnh / kéo link mặc định của trình duyệt
    document.addEventListener('dragstart', function (e) {
        if (getScrollContainer(e.target)) {
            e.preventDefault();
        }
    }, true);

    // ── 5. HỖ TRỢ CON LĂN CHUỘT THÔNG MINH TRÊN DESKTOP ──
    // Shift + Lăn chuột để cuộn ngang mượt mà, lăn dọc bình thường giữ nguyên để cuộn trang êm ái
    document.addEventListener('wheel', function (e) {
        // Fast-exit tức thì 0ms cho cuộn dọc thông thường, tuyệt đối không chạm vào DOM để tránh reflow
        if (!e.shiftKey || !isDesktopDevice() || e.ctrlKey || e.altKey || Math.abs(e.deltaY) <= 0) return;

        const container = getScrollContainer(e.target);
        if (!container) return;

        const maxS = container.scrollWidth - container.clientWidth;
        if (maxS <= 0) return;
        e.preventDefault();
        stopMomentum();
        container.scrollLeft += e.deltaY * 1.0;
    }, { passive: false });

    // ── 6. CSS INJECTION CHO TRẢI NGHIỆM DESKTOP MƯỢT NHƯ BƠ ──
    const style = document.createElement('style');
    style.textContent = `
        @media (min-width: 768px) {
            #slider-de-cu,
            .de-cu-slider,
            #slider-cinema-hot,
            .cinema-hot-slider,
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
                scrollbar-width: none !important;
            }

            #slider-de-cu:active,
            .de-cu-slider:active,
            #slider-cinema-hot:active,
            .cinema-hot-slider:active,
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
                user-select: none !important;
                -webkit-user-select: none !important;
            }

            /* Khóa click link và tắt transition hover trong khi kéo để đạt 120fps bơ mượt */
            .is-smooth-dragging a {
                pointer-events: none !important;
            }

            .is-smooth-dragging .de-cu-card,
            .is-smooth-dragging .cinema-hot-card,
            .is-smooth-dragging .de-cu-poster-wrap,
            .is-smooth-dragging .cinema-hot-poster-wrap {
                transition: none !important;
                pointer-events: none !important;
            }

            .de-cu-slider img,
            #slider-de-cu img,
            .cinema-hot-slider img,
            #slider-cinema-hot img,
            .cinema-hot-card img,
            .cinema-hot-card a,
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
            .cinema-hot-slider a,
            #slider-cinema-hot a,
            .home-comment-card,
            .interests-wrapper a {
                -webkit-user-drag: none !important;
                user-drag: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    console.log('⚡ [APhim Slider Engine] Desktop Ultra-Smooth Drag & Kinetic Momentum v14.0 Active.');
})();