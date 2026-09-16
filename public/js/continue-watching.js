/**
 * Continue Watching (Tiếp tục xem) Module - Tone Màu Vàng Ánh APhim (#ffd700)
 * Hỗ trợ cả Web Tĩnh (watch.html) & Server Node SSR / Clean Routing (/xem-phim/:slug/:episode)
 */

(function () {
    function initContinueWatching() {
        const section = document.getElementById('continueWatchingSection');
        const container = document.getElementById('continueWatchingContainer');
        const countBadge = document.getElementById('continueWatchingCount');
        if (!section || !container) return;

        try {
            let history = [];
            const historyStr = localStorage.getItem('cinestream_watch_history');
            if (historyStr) {
                history = JSON.parse(historyStr);
            }

            // Fallback: Nếu localStorage rỗng, kiểm tra watchHistory trong profile của user đã đăng nhập
            if ((!history || history.length === 0) && typeof authService !== 'undefined' && authService.getCurrentUser) {
                const user = authService.getCurrentUser();
                if (user && user.watchHistory && Array.isArray(user.watchHistory) && user.watchHistory.length > 0) {
                    history = user.watchHistory;
                }
            }

            const progressStr = localStorage.getItem('cinestream_watch_progress');
            const allProgress = progressStr ? JSON.parse(progressStr) : {};

            if (!history || !Array.isArray(history) || history.length === 0) {
                section.classList.add('hidden');
                container.classList.add('hidden');
                return;
            }

            const validItems = history.filter(item => item && item.slug && (item.name || item.title)).slice(0, 10);

            if (validItems.length === 0) {
                section.classList.add('hidden');
                container.classList.add('hidden');
                return;
            }

            section.classList.remove('hidden');
            container.classList.remove('hidden');

            if (countBadge) {
                countBadge.textContent = `${validItems.length}/5 phim gần nhất`;
            }

            // Tự động phát hiện xem trang đang chạy trên Server Node (phụ thuộc clean URL) hay Web Tĩnh (.html)
            const pathname = window.location.pathname;
            const isCleanRoute = !pathname.endsWith('.html') && (pathname === '/' || pathname.startsWith('/xem-phim') || pathname.startsWith('/phim') || pathname.startsWith('/danh-sach'));

            container.innerHTML = validItems.map((item, index) => {
                const progKey = item.episodeSlug ? `${item.slug}_${item.episodeSlug}` : item.slug;
                const prog = allProgress[progKey] || allProgress[item.slug] || { currentTime: item.currentTime || 0, duration: item.duration || 0 };
                
                // Tính phần trăm xem dở thực tế chính xác
                let percent = 0;
                const currTime = (prog && prog.currentTime) ? Number(prog.currentTime) : Number(item.currentTime || 0);
                const dur = (prog && prog.duration) ? Number(prog.duration) : Number(item.duration || 0);

                if (dur > 0 && currTime > 0) {
                    percent = Math.min(100, Math.max(12, Math.round((currTime / dur) * 100)));
                } else if (currTime > 0) {
                    percent = 45;
                } else {
                    percent = 35;
                }

                let imgUrl = item.thumb_url || item.poster_url || '';
                if (imgUrl) {
                    if (!imgUrl.startsWith('http')) {
                        imgUrl = 'https://phimimg.com/uploads/movies/' + imgUrl.replace(/^\/?(uploads\/movies\/)?/, '');
                    }
                    if (typeof imageOptimizer !== 'undefined' && typeof imageOptimizer.optimizeImageUrl === 'function') {
                        imgUrl = imageOptimizer.optimizeImageUrl(imgUrl, 350, 75);
                    }
                } else {
                    imgUrl = '/android-chrome-512x512.png';
                }

                const rawEp = item.episodeSlug || (item.episode ? (String(item.episode).toLowerCase().includes('tập') ? item.episode.toLowerCase().replace(/\s+/g, '-').replace('tập-', 'tap-') : `tap-${item.episode}`) : 'tap-1');
                const epParam = rawEp.startsWith('tap-') ? rawEp : `tap-${rawEp}`;
                const timeParam = currTime > 0 ? `?t=${Math.floor(currTime)}` : '';

                let watchUrl = '';
                if (isCleanRoute) {
                    watchUrl = `/xem-phim/${item.slug}/${epParam}${timeParam}`;
                } else {
                    watchUrl = `watch.html?slug=${item.slug}&episode=${epParam}${timeParam.replace('?', '&')}`;
                }

                // Format nhãn tập sáng đẹp chuẩn Tone Vàng Ánh APhim (#ffd700)
                let epLabel = 'Tập 1';
                if (item.episode) {
                    if (typeof item.episode === 'object') {
                        epLabel = item.episode.name || item.episode.episode || 'Tập 1';
                    } else {
                        epLabel = String(item.episode);
                    }
                }
                if (!String(epLabel).toLowerCase().includes('tập') && !String(epLabel).toLowerCase().includes('full') && !isNaN(epLabel)) {
                    epLabel = `Tập ${epLabel}`;
                }

                const movieName = item.name || item.title || 'Phim đang xem';

                // Format Nhãn Số Thứ Tự góc trên bên phải (#1, #2, #3...)
                const orderNum = `#${index + 1}`;
                const isLatest = index === 0;
                const topBadgeStyle = isLatest
                    ? `background: linear-gradient(135deg, #ffd700, #f59e0b) !important; color: #000000 !important; font-weight: 900 !important; padding: 2px 8px !important; border-radius: 9999px !important; font-size: 10px !important; box-shadow: 0 0 10px rgba(255,215,0,0.8) !important; letter-spacing: 0.5px;`
                    : `background: rgba(13, 17, 23, 0.8) !important; backdrop-filter: blur(4px) !important; color: #ffd700 !important; font-weight: 800 !important; padding: 2px 7px !important; border: 1px solid rgba(255, 215, 0, 0.4) !important; border-radius: 9999px !important; font-size: 10px !important; shadow: 0 2px 4px rgba(0,0,0,0.6);`;

                return `
                <div class="continue-card group relative rounded-xl overflow-hidden border border-amber-500/30 hover:border-amber-400 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_6px_18px_rgba(245,158,11,0.35)] bg-[#0d1117] cursor-pointer hover:scale-[1.03] hover:-translate-y-0.5"
                     style="width: 220px !important; min-width: 220px !important; max-width: 220px !important; height: 130px !important; flex: 0 0 220px !important;">
                    <a href="${watchUrl}" class="block w-full h-full relative" style="width: 100% !important; height: 100% !important;">
                        <!-- Poster Image -->
                        <img src="${imgUrl}" alt="${movieName}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100" style="width: 100% !important; height: 100% !important; object-fit: cover !important;" loading="lazy" onerror="this.src='/android-chrome-512x512.png';" />
                        
                        <!-- Top-Right Order Index Badge (#1, #2, #3...) -->
                        <div class="absolute top-2 right-2 z-20">
                            <span style="${topBadgeStyle}">${orderNum}</span>
                        </div>

                        <!-- Hover Play Icon -->
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                            <div class="w-8 h-8 bg-[#ffd700] text-black rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                <span class="material-icons-round text-lg">play_arrow</span>
                            </div>
                        </div>

                        <!-- Card Content Overlay -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent flex flex-col justify-end px-3.5 pt-4 z-10"
                             style="padding-bottom: 16px !important;">
                            <!-- Movie Title & Golden Yellow Pill Badge -->
                            <div class="flex items-center justify-between gap-2 mb-2 w-full">
                                <h3 class="text-white font-extrabold text-sm truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] tracking-wide flex-1"
                                    style="font-size: 13px !important; line-height: 1.3 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; max-width: 120px !important; margin: 0 !important;"
                                    title="${movieName}">${movieName}</h3>
                                <span style="background: linear-gradient(135deg, #ffd700, #f59e0b) !important; color: #000000 !important; font-weight: 900 !important; padding: 2px 8px !important; border-radius: 9999px !important; font-size: 10px !important; display: inline-block !important; flex-shrink: 0 !important; box-shadow: 0 0 10px rgba(255,215,0,0.6) !important; line-height: 1.2 !important;">${epLabel}</span>
                            </div>

                            <!-- Gold Amber Glow Progress Bar -->
                            <div class="w-full rounded-full overflow-hidden border border-amber-500/40"
                                 style="height: 5px !important; background: rgba(15, 23, 42, 0.95) !important; width: 100% !important; margin-top: 2px !important;">
                                <div class="h-full transition-all duration-300"
                                     style="width: ${percent}% !important; min-width: 14px !important; height: 100% !important; background: linear-gradient(90deg, #f59e0b, #ffd700) !important; box-shadow: 0 0 10px #ffd700 !important; border-radius: 9999px !important;"></div>
                            </div>
                        </div>
                    </a>
                </div>
                `;
            }).join('');

        } catch (e) {
            console.error('[ContinueWatching] Error rendering section:', e);
            if (section) section.classList.add('hidden');
        }
    }

    window.scrollContinueWatching = function (direction) {
        const container = document.getElementById('continueWatchingContainer');
        if (!container) return;
        const scrollAmount = 230;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // Global Listeners để tự động re-render khi tiến trình/lịch sử thay đổi hoặc khi chuyển tab
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContinueWatching);
    } else {
        initContinueWatching();
    }

    window.addEventListener('pageshow', initContinueWatching);
    window.addEventListener('focus', initContinueWatching);
    window.addEventListener('storage', initContinueWatching);
    window.addEventListener('watchHistoryUpdated', initContinueWatching);
    window.addEventListener('watchProgressUpdated', initContinueWatching);
    window.addEventListener('configSynced', initContinueWatching);
})();
