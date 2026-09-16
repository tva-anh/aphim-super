/**
 * Dynamic Interests Section — Static HTML Version with Admin Configuration Support
 * 
 * Luồng đồng bộ từ backend qua:
 *  - Gọi API backend /api/settings/public trước để lấy custom category backgrounds do Admin cấu hình.
 *  - Nếu có cấu hình, sử dụng ảnh của Admin.
 *  - Nếu không có cấu hình hoặc ảnh lỗi, fallback tự động lấy ảnh ngẫu nhiên từ Ophim API.
 */
(async function loadDynamicInterests() {
    const cards = document.querySelectorAll('.interest-card[data-api]');
    if (!cards.length) return;

    const usedImages = new Set();
    let customBgs = {};

    // 1. Tải cấu hình từ Backend Admin
    try {
        const apiUrl = typeof window.getBackendBaseURL === 'function' ? window.getBackendBaseURL() : '';
        if (apiUrl) {
            const res = await fetch(`${apiUrl}/api/settings/public`);
            const data = await res.json();
            if (data.success && data.data?.content?.categoryBackgrounds) {
                customBgs = data.data.content.categoryBackgrounds;
            }
        }
    } catch (e) {
        console.warn('[Interests] Could not load custom category backgrounds from backend:', e);
    }

    /**
     * Lấy ảnh thumbnail từ Ophim API cho một apiPath nhất định
     */
    const fetchImageFromOphim = async (apiPath, page = 1) => {
        try {
            const response = await movieAPI.fetchWithFallback(`/${apiPath}?page=${page}`);
            const rawData = await response.json();
            const data = movieAPI.normalizeResponse(rawData);

            const items = data?.data?.items || [];
            if (!items.length) return null;

            // Chọn phim đầu tiên chưa dùng ảnh
            for (const movie of items) {
                const thumbUrl = movie.thumb_url || movie.poster_url;
                if (thumbUrl && !usedImages.has(thumbUrl)) {
                    return thumbUrl;
                }
            }

            // Nếu tất cả đã dùng, trả về ảnh đầu tiên
            return items[0]?.thumb_url || items[0]?.poster_url || null;
        } catch (e) {
            console.warn(`[Interests] Fetch from Ophim error for ${apiPath}:`, e);
            return null;
        }
    };

    /**
     * Tạo URL ảnh đã được tối ưu
     */
    const buildFinalUrl = (thumbUrl) => {
        if (!thumbUrl) return '';

        const rawUrl = thumbUrl.startsWith('http')
            ? thumbUrl
            : `https://phimimg.com/${thumbUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${thumbUrl}`;

        if (typeof imageOptimizer !== 'undefined' && imageOptimizer.optimizeImageUrl) {
            return imageOptimizer.optimizeImageUrl(thumbUrl, 400, 70);
        }

        // Dùng wsrv.nl để resize + convert sang webp
        try {
            const encoded = encodeURIComponent(rawUrl);
            return imgUrl;
        } catch {
            return rawUrl;
        }
    };

    /**
     * Áp dụng ảnh nền cho một card, kèm hiệu ứng fade-in
     */
    const applyBackground = (bgImgEl, thumbUrl) => {
        const finalUrl = buildFinalUrl(thumbUrl);
        if (!finalUrl) return;

        bgImgEl.style.opacity = '0';
        bgImgEl.style.transition = 'opacity 1s ease';

        const img = new Image();
        img.onload = () => {
            bgImgEl.style.backgroundImage = `url('${finalUrl}')`;
            bgImgEl.style.opacity = '1';
        };
        img.onerror = () => {
            const rawUrl = thumbUrl.startsWith('http')
                ? thumbUrl
                : `https://phimimg.com/${thumbUrl.startsWith('uploads/') ? '' : 'uploads/movies/'}${thumbUrl}`;
            bgImgEl.style.backgroundImage = `url('${rawUrl}')`;
            bgImgEl.style.opacity = '0.85';
        };
        img.src = finalUrl;

        usedImages.add(thumbUrl);
    };

    /**
     * Tự động tải từ Ophim API (Fallback)
     */
    const loadAutoFromOphim = async (apiPath, bgImgEl, index) => {
        const page = (index % 3) + 1;
        let thumbUrl = await fetchImageFromOphim(apiPath, page);

        if (!thumbUrl || usedImages.has(thumbUrl)) {
            const altPage = page === 1 ? 2 : 1;
            thumbUrl = await fetchImageFromOphim(apiPath, altPage);
        }

        if (thumbUrl) {
            applyBackground(bgImgEl, thumbUrl);
        }
    };

    // Xử lý từng card
    const fetchPromises = Array.from(cards).map(async (card, index) => {
        const apiPath = card.getAttribute('data-api');
        const bgImgEl = card.querySelector('.interest-bg-img');
        if (!apiPath || !bgImgEl) return;

        // Ưu tiên 1: Lấy ảnh tùy chỉnh từ Backend Admin cấu hình
        if (customBgs[apiPath] && customBgs[apiPath].trim() !== '') {
            const finalUrl = customBgs[apiPath].trim();
            bgImgEl.style.opacity = '0';
            bgImgEl.style.transition = 'opacity 1s ease';

            const img = new Image();
            img.onload = () => {
                bgImgEl.style.backgroundImage = `url('${finalUrl}')`;
                bgImgEl.style.opacity = '1';
            };
            img.onerror = async () => {
                console.warn(`[Interests] Custom bg error for ${apiPath}, fallback to Ophim.`);
                await loadAutoFromOphim(apiPath, bgImgEl, index);
            };
            img.src = finalUrl;
        } else {
            // Ưu tiên 2: Fallback tự động lấy từ Ophim API
            await loadAutoFromOphim(apiPath, bgImgEl, index);
        }
    });

    await Promise.all(fetchPromises);
})();

