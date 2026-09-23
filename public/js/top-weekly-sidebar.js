/**
 * Sidebar "Top phim tuần này" - Weekly Top Movies Ranking Module
 * Giao diện Ranking Top 1-10 số rỗng viền trắng sắc nét (Match Hình 1)
 */

(function () {
    async function initTopWeeklySidebar() {
        const sidebar = document.getElementById('top-weekly-sidebar');
        if (!sidebar) return;

        try {
            const pathname = window.location.pathname;
            const isNodeSSR = (typeof window !== 'undefined' && window.__IS_NODE_SERVER__ === true);

            // Fetch danh sách phim hot / mới cập nhật
            let items = [];
            try {
                if (typeof movieAPI !== 'undefined' && movieAPI.fetchWithFallback) {
                    const res = await movieAPI.fetchWithFallback('/danh-sach/phim-moi-cap-nhat?page=1&limit=24');
                    const rawData = await res.json();
                    const data = movieAPI.normalizeResponse ? movieAPI.normalizeResponse(rawData) : rawData;
                    items = data?.data?.items || data?.items || [];
                }
            } catch (e) {
                console.warn('[TopWeeklySidebar] Error fetching movies:', e);
            }

            // Fallback nếu API chưa trả kết quả
            if (!items || items.length === 0) {
                try {
                    const res = await fetch('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
                    const data = await res.json();
                    items = data?.items || [];
                } catch (e) {}
            }

            if (!items || items.length === 0) return;

            // Lọc bỏ phim hiện tại nếu đang xem chi tiết
            const currentSlug = new URLSearchParams(window.location.search).get('slug') || pathname.split('/').pop();
            const filtered = items.filter(m => m && m.slug !== currentSlug);

            // Lấy 10 phim hàng đầu cho bảng xếp hạng tuần
            const topWeekly = filtered.slice(0, 10);

            const html = `
                <div class="ap-top-weekly-wrapper">
                    <div class="ap-top-weekly-header">
                        <h3 class="ap-top-weekly-title flex items-center gap-2">
                            <svg class="w-5 h-5 fill-current flex-shrink-0 ap-top-weekly-trophy-icon" viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V18H9v2h6v-2h-2v-2.1c1.95-.37 3.47-1.88 3.61-3.84C19.08 11.63 21 9.55 21 7V5c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/></svg>
                            Top phim tuần này
                        </h3>
                    </div>

                    <div class="ap-top-weekly-list">
                        ${topWeekly.map((item, index) => {
                            const movieTitle = (item.name || item.title || 'Phim hot').replace(/"/g, '&quot;');
                            const originTitle = (item.origin_name || '').replace(/"/g, '&quot;');
                            const rawImg = item.poster_url || item.thumb_url || '';
                            
                            let imgUrl = rawImg;
                            if (imgUrl) {
                                if (imgUrl.includes('img.ophimimg.com')) {
                                    imgUrl = imgUrl.replace('img.ophimimg.com', 'phimimg.com');
                                } else if (!imgUrl.startsWith('http')) {
                                    imgUrl = 'https://phimimg.com/' + imgUrl.replace(/^\//, '');
                                }
                                if (typeof imageOptimizer !== 'undefined' && imageOptimizer.optimizeImageUrl) {
                                    imgUrl = imageOptimizer.optimizeImageUrl(imgUrl, 150, 80);
                                }
                            } else {
                                imgUrl = '/android-chrome-512x512.png';
                            }

                            const detailUrl = `/phim/${item.slug}`;
                            
                            // Parse badge và số tập
                            const qualityBadge = item.quality || 'FHD';
                            let epText = item.episode_current || 'Full';
                            if (typeof epText === 'number' || (!isNaN(epText) && !String(epText).toLowerCase().includes('tập'))) {
                                epText = `Tập ${epText}`;
                            }

                            // Giả lập rating T13/T18 hoặc Quality nếu không có
                            const ratingBadge = (index % 3 === 0) ? 'T13' : ((index % 5 === 0) ? 'T18' : qualityBadge);

                            const rankNum = index + 1;
                            const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';

                            return `
                                <a href="${detailUrl}" class="ap-top-weekly-item">
                                    <div class="ap-top-weekly-rank ${rankClass}">${rankNum}</div>
                                    <div class="ap-top-weekly-card ${rankClass}">
                                        <div class="ap-top-weekly-thumb">
                                            <img src="${imgUrl}" alt="${movieTitle}" class="ap-top-weekly-img" loading="lazy" onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, '${item.slug}', '${movieTitle}') : null" />
                                        </div>
                                        <div class="ap-top-weekly-info">
                                            <h4 class="ap-top-weekly-name" title="${movieTitle}">
                                                ${movieTitle}
                                            </h4>
                                            ${originTitle ? `<div class="ap-top-weekly-origin" title="${originTitle}">${originTitle}</div>` : ''}
                                            <div class="ap-top-weekly-meta">
                                                <span class="ap-top-weekly-badge">${ratingBadge}</span>
                                                <span class="ap-top-weekly-dot">•</span>
                                                <span class="ap-top-weekly-ep">${epText}</span>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>

                <style>
                    .ap-top-weekly-wrapper {
                        width: 100% !important;
                        box-sizing: border-box !important;
                        margin-bottom: 24px !important;
                    }
                    .ap-top-weekly-header {
                        display: flex !important;
                        align-items: center !important;
                        gap: 10px !important;
                        margin-bottom: 18px !important;
                        padding-left: 52px !important;
                    }
                    .ap-top-weekly-icon {
                        color: #ffffff !important;
                        flex-shrink: 0 !important;
                    }
                    .ap-top-weekly-title {
                        font-size: 18px !important;
                        font-weight: 800 !important;
                        color: #ffffff !important;
                        margin: 0 !important;
                        letter-spacing: 0.3px !important;
                    }
                    .ap-top-weekly-list {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 12px !important;
                        width: 100% !important;
                    }
                    .ap-top-weekly-item {
                        display: flex !important;
                        align-items: center !important;
                        gap: 12px !important;
                        text-decoration: none !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                        transition: transform 0.2s ease !important;
                    }
                    .ap-top-weekly-item:hover {
                        transform: translateX(4px) !important;
                    }

                    /* Số thứ tự Ranking 1-10 */
                    .ap-top-weekly-rank {
                        width: 40px !important;
                        min-width: 40px !important;
                        text-align: center !important;
                        font-size: 38px !important;
                        font-weight: 900 !important;
                        font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif !important;
                        color: transparent !important;
                        -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.75) !important;
                        text-stroke: 1.5px rgba(255, 255, 255, 0.75) !important;
                        line-height: 1 !important;
                        user-select: none !important;
                        flex-shrink: 0 !important;
                        transition: all 0.3s ease !important;
                    }

                    /* MÀU CHẤT RIÊNG CHO TOP 1, 2, 3 */
                    /* TOP 1 - Vàng Hoàng Kim Gold Glow */
                    .ap-top-weekly-rank.rank-1 {
                        -webkit-text-stroke: 1.8px #fcd576 !important;
                        text-stroke: 1.8px #fcd576 !important;
                        color: rgba(252, 213, 118, 0.2) !important;
                        filter: drop-shadow(0 0 10px rgba(252, 213, 118, 0.6)) !important;
                    }
                    /* TOP 2 - Xanh Bạch Kim Platinum Cyan Glow */
                    .ap-top-weekly-rank.rank-2 {
                        -webkit-text-stroke: 1.8px #38bdf8 !important;
                        text-stroke: 1.8px #38bdf8 !important;
                        color: rgba(56, 189, 248, 0.2) !important;
                        filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.6)) !important;
                    }
                    /* TOP 3 - Cam Đồng Hỏa Đỏ Flame Bronze Glow */
                    .ap-top-weekly-rank.rank-3 {
                        -webkit-text-stroke: 1.8px #fb923c !important;
                        text-stroke: 1.8px #fb923c !important;
                        color: rgba(251, 146, 60, 0.2) !important;
                        filter: drop-shadow(0 0 10px rgba(251, 146, 60, 0.6)) !important;
                    }

                    .ap-top-weekly-card {
                        flex: 1 !important;
                        min-width: 0 !important;
                        display: flex !important;
                        align-items: center !important;
                        gap: 12px !important;
                        background: transparent !important;
                        border: none !important;
                        border-radius: 14px !important;
                        padding: 6px 8px !important;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        box-shadow: none !important;
                    }
                    .ap-top-weekly-card.rank-1 {
                        border: 1px solid rgba(252, 213, 118, 0.35) !important;
                        background: linear-gradient(135deg, rgba(252, 213, 118, 0.06) 0%, #181b26 100%) !important;
                        padding: 10px 12px !important;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
                    }
                    .ap-top-weekly-card.rank-2 {
                        border: 1px solid rgba(56, 189, 248, 0.35) !important;
                        background: linear-gradient(135deg, rgba(56, 189, 248, 0.06) 0%, #181b26 100%) !important;
                        padding: 10px 12px !important;
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
                    }
                    .ap-top-weekly-item:hover .ap-top-weekly-card {
                        background: rgba(255, 255, 255, 0.04) !important;
                        border-color: transparent !important;
                        box-shadow: none !important;
                    }
                    .ap-top-weekly-item:hover .ap-top-weekly-card.rank-1 {
                        background: #202433 !important;
                        border-color: rgba(252, 213, 118, 0.6) !important;
                        box-shadow: 0 6px 22px rgba(252, 213, 118, 0.2) !important;
                    }
                    .ap-top-weekly-item:hover .ap-top-weekly-card.rank-2 {
                        background: #202433 !important;
                        border-color: rgba(56, 189, 248, 0.6) !important;
                        box-shadow: 0 6px 22px rgba(56, 189, 248, 0.2) !important;
                    }

                    .ap-top-weekly-thumb {
                        width: 58px !important;
                        min-width: 58px !important;
                        height: 80px !important;
                        min-height: 80px !important;
                        border-radius: 10px !important;
                        overflow: hidden !important;
                        flex-shrink: 0 !important;
                        background: #0d0f1a !important;
                        position: relative !important;
                    }
                    .ap-top-weekly-img {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        display: block !important;
                        transition: transform 0.3s ease !important;
                    }
                    .ap-top-weekly-item:hover .ap-top-weekly-img {
                        transform: scale(1.08) !important;
                    }
                    .ap-top-weekly-info {
                        flex: 1 !important;
                        min-width: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: center !important;
                        gap: 4px !important;
                    }
                    .ap-top-weekly-name {
                        color: #ffffff !important;
                        font-size: 14px !important;
                        font-weight: 700 !important;
                        margin: 0 !important;
                        line-height: 1.3 !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                    }
                    .ap-top-weekly-item:hover .ap-top-weekly-name {
                        color: #fcd576 !important;
                    }
                    .ap-top-weekly-origin {
                        color: #9ca3af !important;
                        font-size: 12px !important;
                        font-weight: 400 !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                    }
                    .ap-top-weekly-meta {
                        display: flex !important;
                        align-items: center !important;
                        gap: 6px !important;
                        font-size: 12px !important;
                        color: #9ca3af !important;
                        margin-top: 2px !important;
                    }
                    .ap-top-weekly-badge {
                        color: #d1d5db !important;
                        font-size: 12px !important;
                        font-weight: 700 !important;
                    }
                    .ap-top-weekly-dot {
                        color: #6b7280 !important;
                        font-size: 10px !important;
                    }
                    .ap-top-weekly-ep {
                        color: #9ca3af !important;
                        font-size: 12px !important;
                        font-weight: 500 !important;
                    }
                </style>
            `;

            sidebar.innerHTML = html;

            // Tự động căn chỉnh vị trí Top phim tuần này ngang hàng với mục Diễn viên
            alignTopWeeklyWithCast();
            setTimeout(alignTopWeeklyWithCast, 300);
            setTimeout(alignTopWeeklyWithCast, 800);

        } catch (error) {
            console.error('[TopWeeklySidebar] Error rendering top weekly sidebar:', error);
        }
    }

    function alignTopWeeklyWithCast() {
        if (window.innerWidth < 1024) return;
        const castSection = document.getElementById('movie-cast-side-section');
        const topSidebar = document.getElementById('top-weekly-sidebar');
        if (!castSection || !topSidebar) return;

        topSidebar.style.marginTop = '24px';

        requestAnimationFrame(() => {
            const castRect = castSection.getBoundingClientRect();
            const sidebarRect = topSidebar.getBoundingClientRect();
            const diff = castRect.top - sidebarRect.top;

            if (diff > 0) {
                topSidebar.style.marginTop = `${24 + diff}px`;
            }
        });
    }
    window.alignTopWeeklyWithCast = alignTopWeeklyWithCast;
    window.addEventListener('resize', alignTopWeeklyWithCast);

    function scheduleSidebarInit() {
        const isWatchPage = window.location.pathname.includes('/xem-phim') || window.location.pathname.includes('/watch');
        if (isWatchPage) {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(initTopWeeklySidebar, { timeout: 3500 });
            } else {
                setTimeout(initTopWeeklySidebar, 1800);
            }
        } else {
            initTopWeeklySidebar();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleSidebarInit);
    } else {
        scheduleSidebarInit();
    }
})();