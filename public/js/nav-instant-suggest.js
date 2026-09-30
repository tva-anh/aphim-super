/**
 * APhim — Nav Instant Search Suggestion Module v6.0 (Ultra Smooth & Zero-Lag)
 * ─────────────────────────────────────────────────────────────
 * • Phản hồi thao tác gõ 120fps siêu tốc, không chặn luồng gõ chữ / IME tiếng Việt
 * • Click / Tap nhận diện tức thì (0ms latency, không dùng preventDefault gây đơ bàn phím)
 * • Debounce thông minh 180ms + LRU Cache bộ nhớ đệm hiển thị ngay lập tức
 * • Tự động AbortController hủy bỏ request cũ khi gõ tiếp, tránh nghẽn CPU/mạng
 * • Panel gợi ý tự động khớp kích thước chuẩn xác với khung tìm kiếm
 */
(function () {
    'use strict';

    const STYLE = `
        /* ── Suggestion Panel Container ── */
        .ap-suggest-panel {
            position: fixed;
            z-index: 999999;
            background: rgba(20, 23, 33, 0.98);
            border: 1px solid rgba(212, 175, 55, 0.45);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 20px rgba(212, 175, 55, 0.15);
            transform: translateY(3px) scale(0.995);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.12s ease, transform 0.12s ease;
            max-height: min(75vh, 480px);
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(212, 175, 55, 0.3) transparent;
            box-sizing: border-box !important;
            font-family: 'Inter', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif !important;
            will-change: opacity, transform;
            contain: layout style;
            -webkit-overflow-scrolling: touch;
        }
        .ap-suggest-panel.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: all;
        }

        /* ── Each Suggestion Item Row ── */
        .ap-suggest-row {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            padding: 9px 14px !important;
            text-decoration: none !important;
            cursor: pointer !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
            transition: background 0.1s ease !important;
            background: transparent !important;
            width: 100% !important;
            box-sizing: border-box !important;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }
        .ap-suggest-row:last-of-type {
            border-bottom: none !important;
        }
        .ap-suggest-row:hover,
        .ap-suggest-row:focus {
            background: rgba(255, 255, 255, 0.08) !important;
            outline: none !important;
        }
        .ap-suggest-row:hover .ap-suggest-title {
            color: #fcd576 !important;
        }

        /* ── Thumbnail Image (~46x64px, Radius 8px) ── */
        .ap-suggest-thumb-box {
            width: 46px !important;
            min-width: 46px !important;
            max-width: 46px !important;
            height: 64px !important;
            min-height: 64px !important;
            max-height: 64px !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            flex-shrink: 0 !important;
            background: #0d0f1a !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4) !important;
        }
        .ap-suggest-thumb {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
        }

        /* ── Text Info Block ── */
        .ap-suggest-info {
            flex: 1 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2.5px !important;
        }
        .ap-suggest-title {
            font-size: 14px !important;
            font-weight: 700 !important;
            color: #ffffff !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            transition: color 0.1s ease !important;
            line-height: 1.25 !important;
        }
        .ap-suggest-en {
            font-size: 11.5px !important;
            color: #94a3b8 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            font-weight: 400 !important;
        }
        .ap-suggest-meta-row {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            font-size: 11px !important;
            color: #94a3b8 !important;
            margin-top: 1.5px !important;
            font-weight: 500 !important;
        }
        .ap-suggest-badge {
            font-size: 9.5px !important;
            font-weight: 800 !important;
            padding: 1px 5px !important;
            border-radius: 4px !important;
            background: rgba(252, 213, 118, 0.15) !important;
            color: #fcd576 !important;
            border: 1px solid rgba(252, 213, 118, 0.35) !important;
            text-transform: uppercase !important;
            line-height: 1.3 !important;
        }

        /* ── "View All Results" Footer Row ── */
        .ap-suggest-footer {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            padding: 11px 14px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #fcd576 !important;
            background: rgba(0, 0, 0, 0.3) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
            text-decoration: none !important;
            cursor: pointer !important;
            transition: background 0.12s, color 0.12s !important;
            text-align: center !important;
            touch-action: manipulation;
        }
        .ap-suggest-footer:hover {
            background: rgba(252, 213, 118, 0.18) !important;
            color: #ffffff !important;
        }

        /* ── Backdrop ── */
        .ap-suggest-backdrop {
            position: fixed;
            inset: 0;
            z-index: 999998;
            background: transparent;
            display: none;
        }
        .ap-suggest-backdrop.active {
            display: block;
        }
    `;

    function injectCSS() {
        if (document.getElementById('ap-nav-suggest-css')) return;
        const s = document.createElement('style');
        s.id = 'ap-nav-suggest-css';
        s.textContent = STYLE;
        document.head.appendChild(s);
    }

    // ── Ultra Fast In-Memory LRU Cache ─────────────────────────────────────
    const _searchCache = new Map();
    const MAX_CACHE_SIZE = 200;

    function getCached(key) {
        if (!key) return null;
        const k = key.toLowerCase().trim();
        if (_searchCache.has(k)) {
            const data = _searchCache.get(k);
            _searchCache.delete(k);
            _searchCache.set(k, data); // Refresh LRU
            return data;
        }
        return null;
    }

    function setCache(key, data) {
        if (!key || !data) return;
        const k = key.toLowerCase().trim();
        if (_searchCache.size >= MAX_CACHE_SIZE) {
            const oldestKey = _searchCache.keys().next().value;
            _searchCache.delete(oldestKey);
        }
        _searchCache.set(k, data);
    }

    // ── API Fetch with AbortController & Cache ─────────────────────────
    let activeAbortController = null;

    async function fetchSearchSuggestions(keyword, limit = 5) {
        if (!keyword || keyword.trim().length < 2) return [];
        const cleanKw = keyword.trim();
        const cacheKey = cleanKw.toLowerCase();

        // 1. Fast Cache Hit (0ms)
        const cached = getCached(cacheKey);
        if (cached) return cached;

        // 2. Abort previous running request
        if (activeAbortController) {
            try { activeAbortController.abort(); } catch (e) {}
        }
        activeAbortController = new AbortController();
        const signal = activeAbortController.signal;

        // 3. Fetch from PhimAPI
        try {
            const url = `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(cleanKw)}&limit=${limit}&page=1`;
            const res = await fetch(url, { signal });
            if (res.ok) {
                const data = await res.json();
                const items = data?.data?.items || data?.items || [];
                if (items && items.length > 0) {
                    const sliced = items.slice(0, limit);
                    setCache(cacheKey, sliced);
                    return sliced;
                }
            }
        } catch (e) {
            if (e.name === 'AbortError') return null; // Cancelled silently
        }

        // 4. Fallback qua movieAPI nếu có
        try {
            if (typeof movieAPI !== 'undefined' && movieAPI.searchMovies) {
                const data = await movieAPI.searchMovies(cleanKw, 1, limit);
                const items = data?.items || data?.data?.items || [];
                if (items && items.length > 0) {
                    const sliced = items.slice(0, limit);
                    setCache(cacheKey, sliced);
                    return sliced;
                }
            }
        } catch (e) {}

        return [];
    }

    function buildImgSrc(movie) {
        let rawImg = movie.thumb_url || movie.poster_url || '';
        if (!rawImg) return '/android-chrome-512x512.png';

        if (rawImg.includes('img.ophimimg.com')) {
            rawImg = rawImg.replace('img.ophimimg.com', 'phimimg.com');
        } else if (!rawImg.startsWith('http')) {
            rawImg = 'https://phimimg.com/' + rawImg.replace(/^\//, '');
        }

        if (typeof imageOptimizer !== 'undefined' && imageOptimizer.optimizeImageUrl) {
            return imageOptimizer.optimizeImageUrl(rawImg, 100, 80);
        }
        return rawImg;
    }

    function buildRow(movie) {
        const thumb = buildImgSrc(movie);
        const title = (movie.name || movie.title || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        const enTitle = (movie.origin_name || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        const badge = movie.quality || 'FHD';
        const year = movie.year || '';
        const ep = movie.episode_current || '';
        const slug = movie.slug || '';
        const detailUrl = `/phim/${slug}`;

        return `
            <a class="ap-suggest-row" href="${detailUrl}">
                <div class="ap-suggest-thumb-box">
                    <img class="ap-suggest-thumb" src="${thumb}" alt="${title}" loading="lazy" decoding="async"
                         onerror="this.src='/android-chrome-512x512.png'" />
                </div>
                <div class="ap-suggest-info">
                    <div class="ap-suggest-title" title="${title}">${title}</div>
                    ${enTitle && enTitle !== title ? `<div class="ap-suggest-en">${enTitle}</div>` : ''}
                    <div class="ap-suggest-meta-row">
                        <span class="ap-suggest-badge">${badge}</span>
                        ${year ? `<span>• ${year}</span>` : ''}
                        ${ep ? `<span>• ${ep}</span>` : ''}
                    </div>
                </div>
            </a>
        `;
    }

    function attachSuggest(input) {
        if (!input || input.dataset.apSuggestAttached) return;
        input.dataset.apSuggestAttached = 'true';

        // Tạo Panel & Backdrop một lần duy nhất
        const panel = document.createElement('div');
        const backdrop = document.createElement('div');
        panel.className = 'ap-suggest-panel';
        backdrop.className = 'ap-suggest-backdrop';

        panel.style.display = 'none';
        backdrop.style.display = 'none';

        document.body.appendChild(backdrop);
        document.body.appendChild(panel);

        function getSearchContainer() {
            return input.closest('.sofa-desktop-search-form') ||
                   input.closest('.sofa-search-form') ||
                   input.closest('.nav-search-v2') ||
                   input.closest('.mobile-inline-search') ||
                   input.closest('.mobile-search-overlay') ||
                   input.closest('form') ||
                   input;
        }

        const container = getSearchContainer();

        function positionPanel() {
            if (!container) return;
            const rect = container.getBoundingClientRect();
            
            // Khung rộng bằng đúng chiều rộng khung tìm kiếm
            const exactWidth = rect.width > 240 ? Math.round(rect.width) : Math.max(Math.round(rect.width), 280);
            let leftPos = rect.left;
            
            const maxLeft = window.innerWidth - exactWidth - 8;
            if (leftPos > maxLeft && maxLeft > 0) {
                leftPos = Math.max(8, maxLeft);
            }
            
            panel.style.left = Math.max(4, Math.round(leftPos)) + 'px';
            panel.style.top = Math.round(rect.bottom + 6) + 'px';
            panel.style.width = exactWidth + 'px';
        }

        let debounceTimer = null;
        let lastKeyword = '';
        let isComposing = false;

        const handleOutsideClick = (e) => {
            if (!panel.classList.contains('visible')) return;
            if (input.contains(e.target) || panel.contains(e.target)) return;
            hide();
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape' && panel.classList.contains('visible')) {
                hide();
            }
        };

        function show(movies, keyword) {
            if (!movies || !movies.length) {
                hide();
                return;
            }

            let html = movies.map(m => buildRow(m)).join('');
            const searchPageUrl = `/search?keyword=${encodeURIComponent(keyword)}`;

            html += `
                <a class="ap-suggest-footer" href="${searchPageUrl}">
                    <svg style="width:15px;height:15px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    Xem tất cả cho "${keyword.length > 20 ? keyword.slice(0, 20) + '…' : keyword}"
                </a>
            `;

            panel.innerHTML = html;
            positionPanel();

            panel.style.display = 'block';
            backdrop.style.display = 'block';

            // Dùng 1 frame nhẹ để kích hoạt animation
            requestAnimationFrame(() => {
                panel.classList.add('visible');
                backdrop.classList.add('active');
            });

            document.addEventListener('pointerdown', handleOutsideClick, { passive: true });
            document.addEventListener('keydown', handleEscape);
        }

        function hide() {
            panel.classList.remove('visible');
            backdrop.classList.remove('active');
            document.removeEventListener('pointerdown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
            setTimeout(() => {
                if (!panel.classList.contains('visible')) {
                    panel.style.display = 'none';
                    backdrop.style.display = 'none';
                }
            }, 120);
        }

        async function onKeyword(kw) {
            const trimmed = kw.trim();
            if (!trimmed || trimmed.length < 2) {
                hide();
                lastKeyword = '';
                return;
            }
            if (trimmed === lastKeyword && panel.classList.contains('visible')) return;
            lastKeyword = trimmed;

            // Kiểm tra cache trước (0ms)
            const cached = getCached(trimmed.toLowerCase());
            if (cached) {
                if (input.value.trim() === trimmed) {
                    show(cached, trimmed);
                }
                return;
            }

            const movies = await fetchSearchSuggestions(trimmed, 5);
            if (movies === null) return; // Request was aborted
            if (input.value.trim() === trimmed) {
                show(movies, trimmed);
            }
        }

        function handleInputChange() {
            if (isComposing) return;
            const v = input.value.trim();

            if (!v || v.length < 2) {
                clearTimeout(debounceTimer);
                if (activeAbortController) {
                    try { activeAbortController.abort(); } catch (e) {}
                }
                hide();
                lastKeyword = '';
                return;
            }

            // Fast-path: Nếu từ khóa đã có trong cache -> hiển thị tức thì (0ms)
            const cached = getCached(v.toLowerCase());
            if (cached) {
                clearTimeout(debounceTimer);
                onKeyword(v);
                return;
            }

            // Debounce 180ms để thao tác gõ tiếng Việt hoàn toàn không bị trễ
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                onKeyword(v);
            }, 180);
        }

        input.addEventListener('compositionstart', () => {
            isComposing = true;
        }, { passive: true });

        input.addEventListener('compositionend', () => {
            isComposing = false;
            handleInputChange();
        }, { passive: true });

        input.addEventListener('input', (e) => {
            if (e && e.isComposing) return;
            handleInputChange();
        }, { passive: true });

        input.addEventListener('focus', () => {
            const v = input.value.trim();
            if (v.length >= 2) {
                onKeyword(v);
            }
        }, { passive: true });

        window.addEventListener('resize', () => {
            if (panel.classList.contains('visible')) positionPanel();
        }, { passive: true });
    }

    function init() {
        injectCSS();

        const selectors = [
            '.sofa-desktop-search-input',
            '.sofa-mobile-search-input-field',
            '.sofa-search-input',
            'input[name="keyword"]',
            '#mtiSearchInput',
            'input[name="q"]'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(attachSuggest);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('load', () => {
        setTimeout(init, 200);
    });

    window.initNavInstantSuggest = init;
})();