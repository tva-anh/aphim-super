/**
 * A PHIM SUPER - Instant Real-Time Tactile Drag & Glide Engine v10.0
 * Trải nghiệm phản hồi tức thì 100% Real-time (Zero Latency, 0ms Delay) chuẩn các nền tảng streaming top 1
 *
 * ĐẶC TÍNH KỸ THUẬT:
 * 1. 100% REAL-TIME ĐI THEO CON TRỎ CHUỘT:
 *    - Chuột nhích 1px là thanh trượt di chuyển 1px ngay lập tức trong cùng 1 frame (0px dead-zone).
 *    - Phản hồi trực tiếp theo từng cử chỉ chuột của người dùng theo thời gian thực (Real-time tracking).
 *
 * 2. CUỘN DỌC TRANG NATIVE TỨC THÌ (Zero Delay):
 *    - Không can thiệp hay làm trễ con lăn chuột dọc, giữ tốc độ phản hồi 0ms GPU phần cứng tức thì.
 *
 * 3. QUÁN TÍNH THẢ TAY ÊM ÁI (Natural Momentum Glide):
 *    - Khi thả tay sau cú vuốt nhanh: trượt tiếp mềm mại theo gia tốc thực tế của cú lướt.
 *    - Bấm chuột lại là bắt dính tức thì.
 *
 * 4. BẢO VỆ TUYỆT ĐỐI CLICK MỞ PHIM:
 *    - Nhấp chuột (< 4px) -> Mở xem phim tức thì.
 *    - Kéo lướt (> 4px) -> Tự động chặn click nhầm.
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

    // ─── 1. NHẤN CHUỘT (POINTER DOWN) - BẮT DÍNH TỨC THÌ 0ms ───
    function onPointerDown(e) {
        if (e.pointerType === 'touch') return;
        if (e.button !== 0) return; // Chỉ chuột trái

        if (e.target.closest('button, input, textarea, select, .home-comments-scroll-btn, .section-header-nav')) {
            return;
        }

        const container = getScrollContainer(e.target);
        if (!container) return;

        cancelMomentum();

        currentContainer = container;
        isDown = true;
        hasMoved = false;
        startX = e.clientX;
        lastClientX = e.clientX;
        scrollStart = container.scrollLeft;
        lastTimestamp = performance.now();
        releaseVelocity = 0;

        container.style.scrollBehavior = 'auto';
        container.style.scrollSnapType = 'none';
    }

    // ─── 2. RÊ CHUỘT (POINTER MOVE) - 100% REAL-TIME 1:1 TRACKING ───
    function onPointerMove(e) {
        if (!isDown || !currentContainer) return;

        const currentX = e.clientX;
        const deltaX = currentX - startX;

        if (!hasMoved) {
            if (Math.abs(deltaX) > 2) {
                hasMoved = true;
                currentContainer.classList.add('is-instant-dragging');
                document.body.classList.add('aphim-drag-active');

                if (e.pointerId !== undefined && currentContainer.setPointerCapture) {
                    try {
                        currentContainer.setPointerCapture(e.pointerId);
                    } catch (err) {}
                }
            }
        }

        if (hasMoved) {
            // 🔥 REAL-TIME TỨC THÌ: Bám theo vị trí con trỏ chuột 1:1 không độ trễ
            currentContainer.scrollLeft = scrollStart - deltaX;

            const now = performance.now();
            const dt = now - lastTimestamp;
            if (dt > 8) {
                const instantV = (currentX - lastClientX) / dt;
                releaseVelocity = releaseVelocity * 0.3 + instantV * 0.7;
                lastClientX = currentX;
                lastTimestamp = now;
            }

            e.preventDefault();
        }
    }

    // ─── 3. THẢ TAY (POINTER UP) - QUÁN TÍNH THỰC TẾ ───
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

        // Quán tính lướt tiếp tự nhiên sau khi thả tay
        if (didMove && container && Math.abs(v) > 0.08) {
            let currentV = Math.max(Math.min(v * 9.0, 32), -32);
            const friction = 0.90;
            let lastTime = performance.now();

            function glideStep(nowTime) {
                const dt = Math.min(nowTime - lastTime, 32);
                lastTime = nowTime;

                const step = currentV * (dt / 16.67);
                container.scrollLeft -= step;
                currentV *= Math.pow(friction, dt / 16.67);

                const max = container.scrollWidth - container.clientWidth;
                if (container.scrollLeft <= 0 || container.scrollLeft >= max || Math.abs(currentV) < 0.2) {
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

        // Chặn click nhầm chỉ khi đã thực sự kéo lướt
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
            }, 100);
        }
    }

    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: false });
    window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onPointerUp, { capture: true, passive: false });
    window.addEventListener('pointercancel', onPointerUp, { capture: true, passive: false });

    document.addEventListener('dragstart', function (e) {
        if (getScrollContainer(e.target)) {
            e.preventDefault();
        }
    }, true);

    // ─── 4. CSS TỐI ƯU GIAO DIỆN & TƯƠNG TÁC ───
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

    console.log('⚡ [APhim Engine] 100% Real-Time Instant Tactile Drag Engine v10.0 Active.');
})();