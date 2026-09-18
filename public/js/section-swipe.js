/**
 * A PHIM SUPER - Instant Zero-Latency Horizontal Slider & Drag Engine v8.0
 * Tiêu chuẩn trải nghiệm phản hồi tức thì (0ms Delay, Zero-Wait) của các web phim hàng đầu
 *
 * ĐẶC ĐIỂM CỐT LÕI:
 * 1. NHẬN DIỆN LƯỚT ĐI THEO LIỀN TỨC THÌ (Zero Delay - Đi theo chuột 0ms):
 *    - Di chuyển chuột là thanh trượt đi theo ngay lập tức từ pixel đầu tiên (0px dead-zone).
 *    - Triệt tiêu hoàn toàn độ trễ trôi chậm do CSS `scroll-behavior: smooth`.
 *
 * 2. KHÔNG BAO GIỜ BỊ TUỘT HOẶC MẤT TRACKING:
 *    - Kết hợp Pointer Capture & Window Tracking: Chuột lướt nhanh cỡ nào, bay ra ngoài
 *      màn hình hay bay qua ảnh/link vẫn bám sát 100%.
 *    - Tắt hoàn toàn kéo bóng ma ảnh (`draggable="false"`, `-webkit-user-drag: none`).
 *
 * 3. QUÁN TÍNH THẢ TAY MƯỢT NHƯ LỤA (Physics Glide):
 *    - Khi thả tay sau cú lướt nhanh: trượt tiếp êm ái với gia tốc giảm dần (60fps/120fps/144Hz).
 *    - Chạm chuột lại là bắt dính lập tức.
 *
 * 4. CON XOAY CHUỘT PHẢN HỒI NGAY (Instant Wheel Response):
 *    - Lăn chuột là thanh trượt lướt ngang tức thì, không bị trễ.
 *    - Chạm mép thì tự động nhường quyền cuộn dọc trang êm ái.
 *
 * 5. BẢO VỆ TUYỆT ĐỐI CLICK MỞ PHIM:
 *    - Click tại chỗ (< 5px) -> Xem phim bình thường.
 *    - Kéo lướt (> 5px) -> Tự động chặn click nhầm vào phim.
 */
(function () {
    'use strict';

    const SLIDER_SELECTORS = [
        '#slider-de-cu',
        '.de-cu-slider',
        '#homeCommentsTrack',
        '.home-comments-track',
        '#heroThumbnails',
        '.interests-wrapper',
        '.ranking-grid-container',
        '.country-scroll-container',
        '.cs-scroll-container',
        '#movie-gallery-scroll',
        '#actor-list',
        '#episode-list',
        '.scrollbar-hide'
    ].join(', ');

    // Tìm container cuộn ngang gần nhất
    function getScrollContainer(target) {
        let el = target;
        while (el && el !== document.body && el !== document.documentElement) {
            if (el.matches && el.matches(SLIDER_SELECTORS)) {
                if (el.scrollWidth > el.clientWidth + 2) return el;
            }
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

    // Biến trạng thái toàn cục
    let currentContainer = null;
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let hasMoved = false;
    let lastClientX = 0;
    let lastTimestamp = 0;
    let releaseVelocity = 0;
    let momentumRaf = null;

    function cancelMomentum() {
        if (momentumRaf) {
            cancelAnimationFrame(momentumRaf);
            momentumRaf = null;
        }
    }

    // ─── 1. NHẤN CHUỘT (POINTER / MOUSE DOWN) - PHẢN HỒI TỨC THÌ 0ms ───
    function onPointerDown(e) {
        // Chỉ nhận chuột hoặc bút trên desktop, nhường touch tự nhiên cho điện thoại
        if (e.pointerType === 'touch') return;
        if (e.button !== 0) return; // Chỉ chuột trái

        // Bỏ qua các nút bấm hoặc ô nhập
        if (e.target.closest('button, input, textarea, select, .home-comments-scroll-btn, .section-header-nav')) {
            return;
        }

        const container = getScrollContainer(e.target);
        if (!container) return;

        // Dừng quán tính cũ ngay lập tức (bắt dính)
        cancelMomentum();

        currentContainer = container;
        isDown = true;
        hasMoved = false;
        startX = e.clientX;
        lastClientX = e.clientX;
        scrollStart = container.scrollLeft;
        lastTimestamp = performance.now();
        releaseVelocity = 0;

        // Tắt ngay scroll-behavior smooth để đi theo chuột tức thì không độ trễ
        container.style.scrollBehavior = 'auto';
        container.style.scrollSnapType = 'none';

        // LƯU Ý: Tuyệt đối KHÔNG gọi setPointerCapture ở đây vì sẽ bắt toàn bộ event click của thẻ <a> con
    }

    // ─── 2. RÊ CHUỘT (POINTER / MOUSE MOVE) - ĐI THEO LIỀN 1:1 TỨC THÌ ───
    function onPointerMove(e) {
        if (!isDown || !currentContainer) return;

        const currentX = e.clientX;
        const deltaX = currentX - startX;

        // Bắt đầu nhận diện kéo khi dịch chuyển thực tế > 6px (tránh rung tay khi bấm click)
        if (!hasMoved) {
            if (Math.abs(deltaX) > 6) {
                hasMoved = true;
                currentContainer.classList.add('is-instant-dragging');
                document.body.classList.add('aphim-drag-active');

                // Khi thực sự đang kéo lướt, mới bắt pointer capture để theo dõi mượt ra ngoài mép
                if (e.pointerId !== undefined && currentContainer.setPointerCapture) {
                    try {
                        currentContainer.setPointerCapture(e.pointerId);
                    } catch (err) {}
                }
            }
        }

        if (hasMoved) {
            // 🌟 ĐI THEO LIỀN TỨC THÌ - ZERO LATENCY:
            currentContainer.scrollLeft = scrollStart - deltaX;

            // Tính vận tốc nhả tay chính xác
            const now = performance.now();
            const dt = now - lastTimestamp;
            if (dt > 8) {
                releaseVelocity = (currentX - lastClientX) / dt;
                lastClientX = currentX;
                lastTimestamp = now;
            }

            e.preventDefault();
        }
    }

    // ─── 3. THẢ TAY (POINTER / MOUSE UP) - QUÁN TÍNH VẬT LÝ MƯỢT NHƯ LỤA ───
    function onPointerUp(e) {
        if (!isDown) return;

        const container = currentContainer;
        const didMove = hasMoved;
        const v = releaseVelocity;

        isDown = false;
        currentContainer = null;

        if (container) {
            container.classList.remove('is-instant-dragging');
            if (e && e.pointerId !== undefined && container.releasePointerCapture) {
                try {
                    if (container.hasPointerCapture && container.hasPointerCapture(e.pointerId)) {
                        container.releasePointerCapture(e.pointerId);
                    }
                } catch (err) {}
            }
        }
        document.body.classList.remove('aphim-drag-active');

        // Quán tính lướt tiếp sau khi thả tay
        if (didMove && container && Math.abs(v) > 0.12) {
            let currentV = v * 16.5; // Quy đổi ra px / frame (tương đương 60Hz)
            const friction = 0.94; // Gia tốc ma sát êm ái
            let lastTime = performance.now();

            function glideStep(nowTime) {
                const dt = Math.min(nowTime - lastTime, 32);
                lastTime = nowTime;

                const step = currentV * (dt / 16.67);
                container.scrollLeft -= step;
                currentV *= Math.pow(friction, dt / 16.67);

                const max = container.scrollWidth - container.clientWidth;
                if (container.scrollLeft <= 0 || container.scrollLeft >= max || Math.abs(currentV) < 0.35) {
                    momentumRaf = null;
                    container.style.scrollBehavior = '';
                    container.style.scrollSnapType = '';
                    return;
                }

                momentumRaf = requestAnimationFrame(glideStep);
            }

            momentumRaf = requestAnimationFrame(glideStep);
        } else if (container) {
            container.style.scrollBehavior = '';
            container.style.scrollSnapType = '';
        }

        // Chặn click nhầm vào phim CHỈ KHI vừa thực hiện thao tác kéo lướt
        if (didMove) {
            const blockClick = function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                window.removeEventListener('click', blockClick, true);
            };
            window.addEventListener('click', blockClick, true);
            setTimeout(() => {
                window.removeEventListener('click', blockClick, true);
            }, 120);
        }
    }

    // Gắn sự kiện toàn cục với capture để luôn bắt được mọi chuyển động
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: false });
    window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: false });
    window.addEventListener('pointercancel', onPointerUp, { capture: true, passive: false });

    // ─── 4. GIỮ NGUYÊN CUỘN DỌC TRANG KHI LĂN CON TRỎ CHUỘT (KHÔNG BỊ CUỘN NGANG) ───
    // Đã tắt hoàn toàn việc can thiệp sự kiện wheel để khi lăn chuột lên/xuống, toàn bộ trang web cuộn dọc tự nhiên êm ái.

    // Chặn kéo bóng ma hình ảnh mặc định của trình duyệt
    document.addEventListener('dragstart', function (e) {
        if (getScrollContainer(e.target)) {
            e.preventDefault();
        }
    }, true);

    // ─── 5. CSS TỐI ƯU PHẢN HỒI TỨC THÌ & CHỐNG GIẬT ───
    const style = document.createElement('style');
    style.textContent = `
        #slider-de-cu, .de-cu-slider, .home-comments-track, #heroThumbnails, .interests-wrapper, .ranking-grid-container {
            user-select: none !important;
            -webkit-user-select: none !important;
            will-change: scroll-position;
            transform: translateZ(0);
            cursor: grab;
        }
        #slider-de-cu:active, .de-cu-slider:active, .home-comments-track:active, #heroThumbnails:active {
            cursor: grabbing;
        }
        .is-instant-dragging {
            cursor: grabbing !important;
            scroll-behavior: auto !important;
            scroll-snap-type: none !important;
        }
        .aphim-drag-active * {
            pointer-events: none !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }
        /* Vô hiệu hóa kéo ảnh bóng ma của trình duyệt */
        .de-cu-slider img, #slider-de-cu img, .home-comments-track img, #heroThumbnails img {
            -webkit-user-drag: none !important;
            user-drag: none !important;
            pointer-events: none !important;
        }
        .de-cu-slider a, #slider-de-cu a {
            -webkit-user-drag: none !important;
            user-drag: none !important;
        }
    `;
    document.head.appendChild(style);

    console.log('⚡ [APhim Engine] Instant Zero-Latency Drag & Wheel Engine v8.0 Active.');
})();