// Watch Page Script
let currentMovie = null;
let currentEpisode = null;
let player = null;
let currentServerIndex = 0; // Track the current server index for failover
let requestedVariant = null; // SEO variant: 'thuyet-minh', 'long-tieng', 'vietsub'
let _isInitializingPlayer = false; // Guard: chỉ cho phép 1 lần initializePlayer chạy cùng lúc

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('slug');
    let episodeSlug = urlParams.get('episode');
    let serverIndex = urlParams.get('server');
    requestedVariant = urlParams.get('version') || urlParams.get('variant') || null;

    const pathname = window.location.pathname.toLowerCase();
    if (!slug && (pathname.startsWith('/xem-phim/') || pathname.startsWith('/watch/'))) {
        const parts = window.location.pathname.split('/').filter(Boolean); // ["xem-phim"|"watch", "slug", "episode", "variant"]
        if (parts.length >= 2) {
            slug = parts[1];
            let rawEp = parts[2] || null;
            let rawVar = parts[3] || null;

            if (rawVar) {
                requestedVariant = rawVar.toLowerCase();
            }

            if (rawEp) {
                const knownVariants = ['thuyet-minh', 'long-tieng', 'vietsub', 'ban-cam', 'raw'];
                if (knownVariants.includes(rawEp.toLowerCase())) {
                    requestedVariant = rawEp.toLowerCase();
                    rawEp = null;
                } else {
                    const variantSuffixes = [
                        { suffix: '-thuyet-minh', key: 'thuyet-minh' },
                        { suffix: '-long-tieng', key: 'long-tieng' },
                        { suffix: '-vietsub', key: 'vietsub' },
                        { suffix: '-ban-cam', key: 'ban-cam' }
                    ];
                    for (const v of variantSuffixes) {
                        if (rawEp.toLowerCase().endsWith(v.suffix)) {
                            requestedVariant = v.key;
                            rawEp = rawEp.slice(0, -v.suffix.length);
                            break;
                        }
                    }
                }
            }

            episodeSlug = rawEp;
            if (episodeSlug && episodeSlug.startsWith('tap-')) {
                episodeSlug = episodeSlug.replace('tap-', '');
            }
        }
    }

    if (!slug && window.initialMovie && window.initialMovie.slug) {
        slug = window.initialMovie.slug;
    }
    if (!requestedVariant && window.activeVariant) {
        requestedVariant = window.activeVariant;
    }

    if (!slug) {
        console.warn('[Watch] No movie slug provided, staying on current page.');
        return;
    }

    try {
        sessionStorage.setItem('aphim_last_watched_slug', slug);
        if (episodeSlug) sessionStorage.setItem('aphim_last_watched_ep', episodeSlug);
    } catch (e) { }

    await loadMovieAndPlay(slug, episodeSlug);
    setupVideoPlayer();

    // ⚡ Trì hoãn nạp phim đề xuất khi CPU rảnh (ưu tiên 100% tài nguyên mạng cho luồng video m3u8)
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadRecommendations(), { timeout: 3000 });
    } else {
        setTimeout(() => loadRecommendations(), 2000);
    }
});

// ─── SEO MULTI-VARIANT HELPERS (Vietsub, Thuyết Minh, Lồng Tiếng, Song Ngữ) ───
function getServerTypeTag(serverOrName, movie) {
    let raw = '';
    if (typeof serverOrName === 'string') {
        raw = serverOrName.toLowerCase();
    } else if (serverOrName) {
        raw = (serverOrName.original_server_name || serverOrName.server_name || '').toLowerCase();
    }
    if (raw.includes('song ngữ') || raw.includes('song ngu') || raw.includes('bilingual')) return 'song-ngu';
    if (raw.includes('thuyết minh') || raw.includes('thuyet minh')) return 'thuyet-minh';
    if (raw.includes('lồng tiếng') || raw.includes('long tieng')) return 'long-tieng';
    if (raw.includes('vietsub')) return 'vietsub';
    if (movie && movie.lang) {
        const mLang = movie.lang.toLowerCase();
        if (mLang.includes('song ngữ') || mLang.includes('song ngu')) return 'song-ngu';
        if (mLang.includes('thuyết minh') || mLang.includes('thuyet minh')) return 'thuyet-minh';
        if (mLang.includes('lồng tiếng') || mLang.includes('long tieng')) return 'long-tieng';
    }
    return 'vietsub';
}

function saveServerPreference(movieSlug, serverIndex, serverObj) {
    if (!movieSlug) return;
    try {
        const rawName = serverObj ? (serverObj.original_server_name || serverObj.server_name || '') : '';
        const pref = {
            index: serverIndex,
            name: rawName,
            type: getServerTypeTag(serverObj),
            updatedAt: Date.now()
        };
        localStorage.setItem('aphim_server_pref_' + movieSlug, JSON.stringify(pref));
        localStorage.setItem('aphim_server_' + movieSlug, String(serverIndex));
        sessionStorage.setItem('aphim_server_' + movieSlug, String(serverIndex));
    } catch (e) { }
}

function readServerPreference(movieSlug) {
    if (!movieSlug) return null;
    try {
        const prefStr = localStorage.getItem('aphim_server_pref_' + movieSlug);
        if (prefStr) {
            const parsed = JSON.parse(prefStr);
            if (parsed && typeof parsed === 'object') return parsed;
        }
        const oldNum = localStorage.getItem('aphim_server_' + movieSlug);
        if (oldNum !== null && !isNaN(oldNum)) {
            return { index: parseInt(oldNum, 10), type: null, name: null };
        }
    } catch (e) { }
    return null;
}

function resolveServerIndex(episodes, requestedServer, reqVariant, movie, requestedEpSlug) {
    if (!episodes || episodes.length === 0) return 0;

    let targetIndex = -1;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ƯU TIÊN 1 (CAO NHẤT): YÊU CẦU TRỰC TIẾP TỪ URL (Search Intent / Direct Link)
    // ──────────────────────────────────────────────────────────────────────────
    // 1A. Tham số rõ ràng ?server=X trong URL
    if (requestedServer !== null && requestedServer !== undefined && requestedServer !== '' && !isNaN(requestedServer)) {
        const idx = parseInt(requestedServer, 10);
        if (idx >= 0 && idx < episodes.length) {
            targetIndex = idx;
        }
    }

    // 1B. URL Variant (/full-thuyet-minh, /tap-1-thuyet-minh, /tap-1-song-ngu, /tap-1-long-tieng)
    // Người dùng tìm kiếm trên Google click vào bản thuyết minh/song ngữ -> Bắt buộc ưu tiên cao nhất!
    if (targetIndex === -1 && reqVariant && reqVariant !== 'vietsub' && episodes.length > 1) {
        const foundVariant = episodes.findIndex(s => {
            const cat = getServerTypeTag(s, movie);
            return cat === reqVariant;
        });
        if (foundVariant !== -1) {
            targetIndex = foundVariant;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ƯU TIÊN 2: LỰA CHỌN CỦA NGƯỜI DÙNG TỪ LOCALSTORAGE
    // (CHỈ áp dụng khi URL là đường dẫn gốc không có biến thể đặc biệt hay ?server=)
    // ──────────────────────────────────────────────────────────────────────────
    if (targetIndex === -1) {
        const movieSlug = (movie && movie.slug) || (window.initialMovie && window.initialMovie.slug);
        const pref = readServerPreference(movieSlug);

        if (pref) {
            // Khớp 1: Khớp theo tên máy chủ gốc (chống lệch index khi merge server phụ)
            if (pref.name) {
                const byName = episodes.findIndex(s => {
                    const sName = s.original_server_name || s.server_name || '';
                    return sName.trim().toLowerCase() === pref.name.trim().toLowerCase();
                });
                if (byName !== -1) targetIndex = byName;
            }

            // Khớp 2: Khớp theo loại máy chủ (song-ngu, thuyet-minh, long-tieng, vietsub)
            if (targetIndex === -1 && pref.type) {
                const byType = episodes.findIndex(s => getServerTypeTag(s, movie) === pref.type);
                if (byType !== -1) targetIndex = byType;
            }

            // Khớp 3: Fallback theo index nếu hợp lệ trong phạm vi mảng
            if (targetIndex === -1 && typeof pref.index === 'number' && pref.index >= 0 && pref.index < episodes.length) {
                targetIndex = pref.index;
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ƯU TIÊN 3: MẶC ĐỊNH HỆ THỐNG
    // ──────────────────────────────────────────────────────────────────────────
    if (targetIndex === -1) {
        targetIndex = 0;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. KIỂM TRA BIÊN AN TOÀN & KIỂM TRA TẬP PHIM TỒN TẠI (CHỐNG LỖI OUT OF BOUNDS)
    // ──────────────────────────────────────────────────────────────────────────
    if (targetIndex < 0 || targetIndex >= episodes.length) {
        targetIndex = 0;
    }

    // Nếu tập phim được chỉ định (e.g. tập 15), xác nhận server đã chọn có tập này không
    if (requestedEpSlug && episodes[targetIndex]?.server_data) {
        const cleanEp = String(requestedEpSlug).replace(/^tap-/, '').toLowerCase();
        const hasRequestedEp = episodes[targetIndex].server_data.some(ep => {
            const epSlug = String(ep.slug || '').replace(/^tap-/, '').toLowerCase();
            return epSlug === cleanEp || (ep.name && ep.name.toLowerCase() === cleanEp);
        });

        if (!hasRequestedEp) {
            // Máy chủ đã chọn không có tập này -> Tìm máy chủ nào CÓ tập này
            const fallbackServerIdx = episodes.findIndex(s => (s.server_data || []).some(ep => {
                const epSlug = String(ep.slug || '').replace(/^tap-/, '').toLowerCase();
                return epSlug === cleanEp || (ep.name && ep.name.toLowerCase() === cleanEp);
            }));

            if (fallbackServerIdx !== -1) {
                targetIndex = fallbackServerIdx;
            } else {
                targetIndex = 0;
            }
        }
    }

    return targetIndex;
}

function updateWatchUrlState(movie, episode, serverIndex, isReplace = false) {
    if (!movie || !movie.slug) return;
    const episodes = movie.episodes || [];
    const server = episodes[serverIndex];
    let catSlug = '';
    if (server) {
        const cat = getLangTag(server, movie);
        if (cat === 'Song Ngữ') catSlug = '-song-ngu';
        else if (cat === 'Thuyết Minh') catSlug = '-thuyet-minh';
        else if (cat === 'Lồng Tiếng') catSlug = '-long-tieng';
    }

    const rawType = String(movie.type || '').trim().toLowerCase();
    const epTotal = String(movie.episode_total || '').trim().toLowerCase();
    const epCurrent = String(movie.episode_current || '').trim().toLowerCase();
    const catList = Array.isArray(movie.category)
        ? movie.category.map(c => (typeof c === 'string' ? c : (c.name || c.slug || '')).toLowerCase())
        : [];

    const parsedTotal = parseInt(epTotal.replace(/[^0-9]/g, ''), 10);
    const isMultiTotal = !isNaN(parsedTotal) && parsedTotal > 1;
    const hasSeriesCategory = catList.some(c => c.includes('phim bộ') || c.includes('phim-bo') || c.includes('tv series') || c.includes('tv-series'));
    const isExplicitSeriesType = rawType === 'series' || rawType === 'tvshows';
    const isOngoingSeriesEpisode = /tập\s*\d+/i.test(epCurrent) && !epCurrent.includes('full') && !epCurrent.includes('trọn bộ') && !epCurrent.includes('hoàn tất');

    // Chặn triệt để bẫy nhận diện sai Phim Bộ mới ra Tập 1 thành Phim Lẻ
    const isDefinitelySeries = isExplicitSeriesType || isMultiTotal || isOngoingSeriesEpisode || hasSeriesCategory;

    const isSingle = !isDefinitelySeries && Boolean(
        rawType === 'single' ||
        rawType === 'movie' ||
        movie.chieu_rap === true ||
        movie.is_cinema === true ||
        epTotal === '1' ||
        epTotal === '01' ||
        epCurrent.includes('full') ||
        epCurrent.includes('chiếu rạp') ||
        catList.some(c => c.includes('chiếu rạp') || c.includes('phim lẻ'))
    );

    const cleanEp = (episode && episode.slug) ? episode.slug.replace(/^tap-/, '') : (isSingle ? 'full' : '1');
    const serverParam = (serverIndex > 0) ? `?server=${serverIndex}` : '';

    let newUrl = '';
    let variantTag = catSlug === '-thuyet-minh' ? 'Thuyết Minh Tiếng Việt' : (catSlug === '-long-tieng' ? 'Lồng Tiếng Trọn Bộ' : 'Vietsub Full HD');

    if (isSingle) {
        newUrl = `/xem-phim/${movie.slug}/full${catSlug}${serverParam}`;
        document.title = `Xem Phim ${movie.name} - Bản Full HD [${variantTag}] - APhim Super`;
    } else {
        const seriesEp = cleanEp === 'full' ? '1' : cleanEp;
        newUrl = `/xem-phim/${movie.slug}/tap-${seriesEp}${catSlug}${serverParam}`;
        let epStr = episode?.name ? (episode.name.toLowerCase().includes('tập') ? episode.name : `Tập ${episode.name}`) : `Tập ${seriesEp}`;
        document.title = `Xem Phim ${movie.name} ${epStr ? epStr + ' ' : ''}[${variantTag}] - APhim Super`;
    }

    // 🛡️ Dùng replaceState khi tự động đổi server lỗi để không làm hỏng nút Back của trình duyệt
    if (isReplace) {
        window.history.replaceState({}, '', newUrl);
    } else {
        window.history.pushState({}, '', newUrl);
    }

    // Cập nhật breadcrumbs đồng bộ tức thì
    const catBreadcrumb = document.getElementById('breadcrumb-category');
    if (catBreadcrumb) {
        if (isSingle) {
            catBreadcrumb.textContent = 'Phim Lẻ';
            catBreadcrumb.href = '/danh-sach?list=phim-le';
        } else {
            catBreadcrumb.textContent = 'Phim Bộ';
            catBreadcrumb.href = '/danh-sach?list=phim-bo';
        }
    }
    const epNameEl = document.getElementById('watchBreadcrumbEpName');
    if (epNameEl) {
        epNameEl.textContent = isSingle ? ' - Bản Full' : ` - Tập ${cleanEp === 'full' ? '1' : cleanEp}`;
        epNameEl.style.display = 'inline';
    }
}

// Load movie and play
async function loadMovieAndPlay(slug, episodeSlug) {
    let ophimOk = false;

    // Helper kiểm tra danh sách server có ít nhất 1 tập có stream link hợp lệ hay không
    const checkHasStreamLinks = (epList) => {
        if (!epList || !Array.isArray(epList)) return false;
        return epList.some(s => (s.server_data || []).some(ep => Boolean(ep.link_m3u8 || ep.link_embed)));
    };

    // ⚡ 1. KIỂM TRA DỮ LIỆU TẢI TRƯỚC TỪ SESSIONSTORAGE (Chuyển từ /phim sang xem ngay trong 0ms)
    let preloaded = null;
    try {
        const raw = sessionStorage.getItem('aphim_preloaded_movie_' + slug);
        if (raw) preloaded = JSON.parse(raw);
    } catch (e) { }

    // Luôn ưu tiên đồng bộ link stream mới nhất từ SSR vào Preloaded Data để cập nhật tức thì khi Admin đổi link
    if (preloaded && preloaded.slug === slug) {
        if (checkHasStreamLinks(window.initialEpisodes)) {
            console.log('🔄 [Watch] Đồng bộ streaming links mới nhất từ SSR vào Preloaded Data');
            preloaded.episodes = window.initialEpisodes;
        }
    }

    const canUsePreloaded = preloaded && preloaded.slug === slug && preloaded.episodes && preloaded.episodes.length > 0 && checkHasStreamLinks(preloaded.episodes);

    if (canUsePreloaded) {
        console.log('⚡ [Watch] Khởi chạy tức thì từ Preloaded Data (0ms, 0 Network Request)!', preloaded.name);
        currentMovie = preloaded;

        // Chuẩn hóa tên Nguồn 1, Nguồn 2...
        currentMovie.episodes.forEach((server, idx) => {
            if (!server.original_server_name) server.original_server_name = server.server_name;
            if (!server.server_name.toLowerCase().includes('song ngữ')) {
                server.server_name = `Nguồn ${idx + 1}`;
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const requestedServer = urlParams.get('server');
        currentServerIndex = resolveServerIndex(currentMovie.episodes, requestedServer, requestedVariant, currentMovie, episodeSlug);

        const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
        currentEpisode = episodeSlug
            ? serverData.find(ep => ep.slug.replace(/^tap-/, '') === episodeSlug.replace(/^tap-/, ''))
            : serverData[0];

        if (!currentEpisode) currentEpisode = serverData[0];

        renderMovieInfo(currentMovie, currentEpisode);
        renderEpisodeList(currentMovie.episodes);
        handleInitialPlayerMount(currentEpisode);
        setupActionButtons();
        injectVideoSchema(currentMovie, currentEpisode);

        userService.addToHistory(currentMovie, currentEpisode?.name);
        if (window._apInitComment) window._apInitComment();
        ophimOk = true;

        // ⚡ Nguồn phụ được fetch ngầm sau 1.2s, hoàn toàn KHÔNG chặn Player phát video!
        setTimeout(() => {
            fetchAndMergeSecondaryServers(slug, false, episodeSlug).catch(err => console.warn('Background secondary fetch:', err));
        }, 1200);

        return;
    }

    // Check if initialMovie from SSR is available
    if (window.initialMovie && (window.initialMovie.slug === slug || !slug)) {
        currentMovie = window.initialMovie;
        if (window.initialEpisodes && window.initialEpisodes.length > 0) {
            currentMovie.episodes = window.initialEpisodes;
        }

        const ssrHasLinks = checkHasStreamLinks(currentMovie.episodes);
        if (ssrHasLinks) {
            currentMovie.episodes.forEach((server, idx) => {
                if (!server.original_server_name) server.original_server_name = server.server_name;
                if (!server.server_name.toLowerCase().includes('song ngữ')) {
                    server.server_name = `Nguồn ${idx + 1}`;
                }
            });

            const urlParams = new URLSearchParams(window.location.search);
            const requestedServer = urlParams.get('server');
            currentServerIndex = resolveServerIndex(currentMovie.episodes, requestedServer, requestedVariant, currentMovie, episodeSlug);

            const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
            currentEpisode = episodeSlug
                ? serverData.find(ep => ep.slug.replace(/^tap-/, '') === episodeSlug.replace(/^tap-/, ''))
                : serverData[0];

            if (!currentEpisode) currentEpisode = serverData[0];

            renderMovieInfo(currentMovie, currentEpisode);
            renderEpisodeList(currentMovie.episodes);
            handleInitialPlayerMount(currentEpisode);
            setupActionButtons();
            injectVideoSchema(currentMovie, currentEpisode);
            userService.addToHistory(currentMovie, currentEpisode?.name);
            ophimOk = true;
        } else {
            console.warn('⚠️ [Watch] SSR thiếu stream links, chuyển sang nạp API trực tiếp...');
        }
    }

    if (!ophimOk) {
        try {
            console.log('🎥 Loading movie:', slug);
            const response = await movieAPI.getMovieDetail(slug);
            console.log('📦 API Response:', response);

            if (response && (response.status === 'success' || response.status === true || response.status) && response.data) {
                currentMovie = response.data.item;
                console.log('✅ Movie loaded:', currentMovie.name);
                console.log('📺 Episodes:', currentMovie.episodes);

                // Tự động chuẩn hóa tên tất cả các nguồn thành Nguồn 1, Nguồn 2...
                if (currentMovie.episodes && currentMovie.episodes.length > 0) {
                    currentMovie.episodes.forEach((server, idx) => {
                        if (!server.original_server_name) server.original_server_name = server.server_name;
                        if (!server.server_name.toLowerCase().includes('song ngữ')) {
                            server.server_name = `Nguồn ${idx + 1}`;
                        }
                    });
                }

                // Find episode
                if (currentMovie.episodes && currentMovie.episodes.length > 0) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const requestedServer = urlParams.get('server');
                    currentServerIndex = resolveServerIndex(currentMovie.episodes, requestedServer, requestedVariant, currentMovie, episodeSlug);

                    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;

                    currentEpisode = episodeSlug
                        ? serverData.find(ep => ep.slug.replace(/^tap-/, '') === episodeSlug.replace(/^tap-/, ''))
                        : serverData[0];

                    if (!currentEpisode) currentEpisode = serverData[0];
                }

                renderMovieInfo(currentMovie, currentEpisode);
                renderEpisodeList(currentMovie.episodes);
                handleInitialPlayerMount(currentEpisode);
                setupActionButtons();
                injectVideoSchema(currentMovie, currentEpisode);

                userService.addToHistory(currentMovie, currentEpisode?.name);
                if (window._apInitComment) window._apInitComment();
                ophimOk = true;
            } else {
                console.warn('⚠️ [Watch] OPhim không có phim này, thử nguồn phụ (VSMOV)...');
            }
        } catch (error) {
            console.warn('⚠️ [Watch] OPhim lỗi:', error.message, '→ thử VSMOV...');
        }
    }

    // ⚡ Tối ưu luồng: Nếu nguồn chính (OPhim) đã OK, không await nguồn phụ làm chậm player!
    // Chạy ngầm fetchAndMergeSecondaryServers ở chế độ non-blocking để player phát ngay lập tức
    if (ophimOk) {
        setTimeout(() => {
            fetchAndMergeSecondaryServers(slug, false, episodeSlug).catch(err => console.warn('Background secondary fetch error:', err));
        }, 1200);
    } else {
        // Chỉ bắt buộc await nếu nguồn chính lỗi hoàn toàn
        await fetchAndMergeSecondaryServers(slug, true, episodeSlug);
    }
}

// 🔄 Fetch VSMOV qua proxy server-side (tránh CORS)
// isPrimary=true  → OPhim thất bại, dùng VSMOV làm nguồn chính + tự phát
// 🔄 Helper fetch nguồn phụ thông minh: Thử proxy server-side trước, nếu fail thì gọi thẳng phimapi.com (có CORS)
// 🔄 Fetch tất cả nguồn phụ đồng thời (VSMOV proxy, PhimAPI, NguonC)
async function getSecondaryEpisodes(slug) {
    try {
        // Ưu tiên nạp từ API Movie Merged tổng hợp trên server (hỗ trợ PhimAPI + NguonC + VSMov + TopXX 18+)
        const mergedRes = await fetch(`/api/movie-merged/${encodeURIComponent(slug)}`);
        if (mergedRes.ok) {
            const data = await mergedRes.json();
            if (data && data.status && data.episodes && data.episodes.length > 0) {
                return {
                    status: true,
                    source: data.source || 'multi-source',
                    episodes: data.episodes,
                    movie: data.movie
                };
            }
        }
    } catch (err) {
        console.warn('⚠️ Merged API fetch failed, trying direct fallbacks:', err.message);
    }

    const proxyUrl = `/api/vsmov/${encodeURIComponent(slug)}`;
    const directUrl = `https://phimapi.com/phim/${encodeURIComponent(slug)}`;
    const nguonCUrl = `https://phim.nguonc.com/api/film/${encodeURIComponent(slug)}`;

    try {
        // Gọi các nguồn fallback cùng lúc
        const [vsRes, phimApiRes, ncRes] = await Promise.allSettled([
            fetch(proxyUrl).then(async r => {
                if (!r.ok) throw new Error('VSMOV HTTP error ' + r.status);
                return r.json();
            }),
            fetch(directUrl).then(async r => {
                if (!r.ok) throw new Error('PhimAPI HTTP error ' + r.status);
                return r.json();
            }),
            fetch(nguonCUrl).then(async r => {
                if (!r.ok) throw new Error('NguonC HTTP error ' + r.status);
                return r.json();
            })
        ]);

        let mergedEpisodes = [];
        let movieMeta = null;

        // Xử lý PhimAPI (có CORS, ổn định nhất)
        if (phimApiRes.status === 'fulfilled' && phimApiRes.value && phimApiRes.value.episodes && phimApiRes.value.episodes.length > 0) {
            mergedEpisodes.push(...phimApiRes.value.episodes);
            if (!movieMeta && phimApiRes.value.movie) movieMeta = phimApiRes.value.movie;
        }

        // Xử lý VSMOV (qua Proxy Vercel)
        if (vsRes.status === 'fulfilled' && vsRes.value && vsRes.value.episodes && vsRes.value.episodes.length > 0) {
            mergedEpisodes.push(...vsRes.value.episodes);
            if (!movieMeta && vsRes.value.movie) movieMeta = vsRes.value.movie;
        }

        // Xử lý NguonC
        if (ncRes.status === 'fulfilled' && ncRes.value && ncRes.value.status === 'success' && ncRes.value.movie && ncRes.value.movie.episodes) {
            const mappedEps = ncRes.value.movie.episodes.map(s => ({
                server_name: s.server_name || 'Vietsub',
                server_data: (s.items || []).map(it => ({
                    name: it.name && !it.name.toLowerCase().includes('tập') ? `Tập ${it.name}` : (it.name || 'Tập 1'),
                    slug: it.slug || `tap-${it.name}`,
                    link_embed: it.embed || '',
                    link_m3u8: it.m3u8 || ''
                }))
            }));
            mergedEpisodes.push(...mappedEps);

            if (!movieMeta) {
                movieMeta = {
                    name: ncRes.value.movie.name,
                    origin_name: ncRes.value.movie.original_name,
                    thumb_url: ncRes.value.movie.thumb_url,
                    poster_url: ncRes.value.movie.poster_url,
                    content: ncRes.value.movie.description,
                    quality: ncRes.value.movie.quality,
                    lang: ncRes.value.movie.language
                };
            }
        }

        if (mergedEpisodes.length > 0) {
            return {
                status: true,
                source: 'multi-source',
                episodes: mergedEpisodes,
                movie: movieMeta
            };
        }
    } catch (e) {
        console.warn('⚠️ All secondary sources failed:', e.message);
    }

    return null;
}

// 🔄 Fetch và merge các server phụ
async function fetchAndMergeSecondaryServers(slug, isPrimary = false, episodeSlug = null) {
    // 🎬 Nếu phim là luồng tùy biến VIP / Phim Rạp của APhim thì 100% dùng nguồn nội bộ, không gọi API ngoài tránh 404
    if (window.initialMovie?.is_custom || currentMovie?.is_custom || window.initialMovie?.is_cinema || currentMovie?.is_cinema) {
        return;
    }

    try {
        const qP = new URLSearchParams();
        if (typeof currentMovie !== 'undefined' && currentMovie) {
            if (currentMovie.name) qP.set('name', currentMovie.name);
            if (currentMovie.origin_name) qP.set('origin_name', currentMovie.origin_name);
            if (currentMovie.year) qP.set('year', currentMovie.year); // 🛡️ Truyền năm để rào chắn tránh ghép nhầm phim khác năm
        }
        const qStr = qP.toString() ? `?${qP.toString()}` : '';

        const [data, bilingualData] = await Promise.all([
            getSecondaryEpisodes(slug).catch(function() { return null; }),
            fetch(`/api/movies/bilingual/${encodeURIComponent(slug)}${qStr}`)
                .then(function(r) { return r.ok ? r.json() : null; })
                .catch(function() { return null; })
        ]);

        if ((!data || !data.status || !data.episodes || data.episodes.length === 0) && (!bilingualData || !bilingualData.server)) {
            console.warn('⚠️ Không có dữ liệu máy chủ phụ');
            if (isPrimary) showError('Phim này chưa có nguồn phát — vui lòng thử lại sau');
            return;
        }

        // ── CASE 1: OPhim thất bại → dùng nguồn phụ làm nguồn chính ────
        if (isPrimary && data && data.episodes) {
            const meta = data.movie || {};
            const initialMergedEps = data.episodes.map((s, idx) => ({
                ...s,
                original_server_name: s.original_server_name || s.server_name,
                server_name: `Nguồn ${idx + 1}`
            }));

            if (bilingualData && bilingualData.server) {
                initialMergedEps.unshift(bilingualData.server);
            }

            currentMovie = {
                name: meta.name || slug,
                origin_name: meta.origin_name || '',
                year: meta.year || '',
                thumb_url: meta.thumb_url || meta.poster_url || '',
                poster_url: meta.poster_url || meta.thumb_url || '',
                content: meta.content || '',
                type: meta.type || 'series',
                status: meta.status || 'ongoing',
                time: meta.time || '',
                quality: meta.quality || 'HD',
                lang: meta.lang || 'Vietsub',
                episode_current: meta.episode_current || '',
                episode_total: meta.episode_total || '',
                category: meta.category || [],
                country: meta.country || [],
                director: meta.director || [],
                actor: meta.actor || [],
                slug: meta.slug || slug,
                tmdb: meta.tmdb || {},
                imdb: meta.imdb || {},
                episodes: initialMergedEps
            };

            console.log('✅ [Watch] Dùng nguồn phụ làm nguồn chính:', currentMovie.name);

            const serverData = currentMovie.episodes[0]?.server_data || [];
            currentEpisode = episodeSlug
                ? serverData.find(ep => ep.slug.replace(/^tap-/, '') === episodeSlug.replace(/^tap-/, '')) || serverData[0]
                : serverData[0];

            renderMovieInfo(currentMovie, currentEpisode);
            renderEpisodeList(currentMovie.episodes);
            renderPlayerPlaceholder(currentEpisode);
            setupActionButtons();
            injectVideoSchema(currentMovie, currentEpisode);
            userService.addToHistory(currentMovie, currentEpisode?.name);
            return;
        }

        // ── CASE 2: OPhim OK → merge thêm server phụ ────────────────────
        if (!currentMovie) return;
        if (!currentMovie.episodes) currentMovie.episodes = [];

        // Đổi tên tất cả nguồn chính thành Nguồn 1, Nguồn 2...
        currentMovie.episodes.forEach((s, idx) => {
            if (!s.original_server_name) s.original_server_name = s.server_name;
            if (!s.server_name.toLowerCase().includes('song ngữ')) {
                s.server_name = `Nguồn ${idx + 1}`;
            }
        });

        let added = 0;

        // 🌟 Đồng bộ nguồn Song Ngữ nếu chưa có trong danh sách
        if (bilingualData && bilingualData.server && currentMovie && currentMovie.episodes) {
            const hasSongNgu = currentMovie.episodes.some(s => {
                const sName = (s.original_server_name || s.server_name || '').toLowerCase();
                return sName.includes('song ngữ') || sName.includes('bilingual');
            });
            if (!hasSongNgu) {
                currentMovie.episodes.unshift(bilingualData.server);
                added++;
            }
        }

        if (data && data.episodes) {
            data.episodes.forEach((server) => {
                if (server.server_data && server.server_data.length > 0) {
                    const svrNum = currentMovie.episodes.length + 1;
                    const origName = server.original_server_name || server.server_name;
                    currentMovie.episodes.push({
                        ...server,
                        original_server_name: origName,
                        server_name: `Nguồn ${svrNum}`
                    });
                    added++;
                }
            });
        }

        if (added > 0) {
            console.log(`✅ Đã thêm ${added} máy chủ mới (Tổng: ${currentMovie.episodes.length} nguồn)`);
            renderServerList(currentMovie.episodes);
            // ❌ KHÔNG tự động gọi changeServer hay initializePlayer ở đây
            // → tránh gọi player nhiều lần gây xung đột luồng video
        }
    } catch (err) {
        console.warn('⚠️ Nguồn phụ thất bại:', err.message);
        if (isPrimary) showError('Đã xảy ra lỗi khi tải phim');
    }
}


// ─── SEO: VideoObject JSON-LD Schema ────────────────────────────────────────
// Giúp Google index video trên trang watch — fix lỗi "videos from being indexed"
function injectVideoSchema(movie, episode) {
    try {
        // Xóa schema cũ nếu có (khi đổi tập)
        const old = document.getElementById('video-schema-ld');
        if (old) old.remove();

        const slug = movie.slug;
        const rawType = String(movie.type || '').trim().toLowerCase();
        const epTotal = String(movie.episode_total || '').trim().toLowerCase();
        const epCurrent = String(movie.episode_current || '').trim().toLowerCase();
        const catList = Array.isArray(movie.category)
            ? movie.category.map(c => (typeof c === 'string' ? c : (c.name || c.slug || '')).toLowerCase())
            : [];
        const parsedTotal = parseInt(epTotal.replace(/[^0-9]/g, ''), 10);
        const isMultiTotal = !isNaN(parsedTotal) && parsedTotal > 1;
        const hasSeriesCategory = catList.some(c => c.includes('phim bộ') || c.includes('phim-bo') || c.includes('tv series') || c.includes('tv-series'));
        const isExplicitSeriesType = rawType === 'series' || rawType === 'tvshows';
        const isOngoingSeriesEpisode = /tập\s*\d+/i.test(epCurrent) && !epCurrent.includes('full') && !epCurrent.includes('trọn bộ') && !epCurrent.includes('hoàn tất');

        const isDefinitelySeries = isExplicitSeriesType || isMultiTotal || isOngoingSeriesEpisode || hasSeriesCategory;
        const isSingle = !isDefinitelySeries && Boolean(
            rawType === 'single' ||
            rawType === 'movie' ||
            movie.chieu_rap === true ||
            movie.is_cinema === true ||
            epTotal === '1' ||
            epTotal === '01' ||
            epCurrent.includes('full') ||
            epCurrent.includes('chiếu rạp') ||
            catList.some(c => c.includes('chiếu rạp') || c.includes('phim lẻ'))
        );

        const pageUrl = isSingle
            ? 'https://aphim.store/xem-phim/' + encodeURIComponent(slug) + '/full'
            : 'https://aphim.store/xem-phim/' + encodeURIComponent(slug) + '/tap-' + encodeURIComponent(episode && episode.slug ? episode.slug.replace(/^tap-/, '') : '1');
        const canonicalUrl = pageUrl;

        let rawThumb = movie.thumb_url || movie.poster_url || '';
        let absoluteThumb = 'https://aphim.store/android-chrome-512x512.png';
        if (rawThumb) {
            if (rawThumb.startsWith('http')) {
                absoluteThumb = rawThumb;
            } else {
                absoluteThumb = 'https://phimimg.com/' + rawThumb.replace(/^\//, '');
            }
        }

        let rawPoster = movie.poster_url || movie.thumb_url || '';
        let absolutePoster = '';
        if (rawPoster) {
            absolutePoster = rawPoster.startsWith('http') ? rawPoster : ('https://phimimg.com/' + rawPoster.replace(/^\//, ''));
        }

        const thumbsList = [absoluteThumb, absolutePoster].filter(Boolean);

        const videoUrl = (episode && (episode.link_m3u8 || episode.link_embed)) || pageUrl;
        const epName = episode ? episode.name : '';
        const fullName = epName ? (movie.name + ' - ' + epName) : movie.name;
        const description = (movie.content || movie.description || movie.name)
            .replace(/<[^>]+>/g, '') // strip HTML tags
            .substring(0, 300);

        // uploadDate: dùng năm phát hành, format ISO (có timezone)
        const uploadDate = (movie.year ? movie.year + '-01-01T00:00:00+07:00' : new Date().getFullYear() + '-01-01T00:00:00+07:00');

        const schema = {
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            'name': fullName,
            'description': description,
            'thumbnailUrl': thumbsList,
            'uploadDate': uploadDate,
            'contentUrl': pageUrl,
            'embedUrl': pageUrl,
            'url': pageUrl,
            'inLanguage': 'vi',
            'publisher': {
                '@type': 'Organization',
                'name': 'APhim Super',
                'url': 'https://aphim.store',
                'logo': {
                    '@type': 'ImageObject',
                    'url': 'https://aphim.store/android-chrome-512x512.png'
                }
            }
        };

        // Thêm duration nếu có (format PT1H30M)
        if (movie.time) {
            const timeStr = movie.time.replace(/phút/gi, '').trim();
            const mins = parseInt(timeStr);
            if (!isNaN(mins) && mins > 0) schema.duration = 'PT' + mins + 'M';
        }

        const script = document.createElement('script');
        script.id = 'video-schema-ld';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    } catch (e) {
        console.warn('[SEO] VideoObject schema inject failed:', e);
    }
}

// Render movie info
function renderMovieInfo(movie, episode) {
    // 🚀 INJECT DYNAMIC SEO - Overrides meta & title immediately
    if (typeof SEO !== 'undefined') {
        SEO.updateMovieSEO(movie, episode);
    } else {
        let epName = episode?.name ? (episode.name.toLowerCase().includes('tập') ? episode.name : `Tập ${episode.name}`) : '';
        document.title = `Xem Phim ${movie.name} ${epName ? '- ' + epName : ''} Full HD | APhim Super`;
    }

    const titleElement = document.querySelector('h1');
    if (titleElement) {
        titleElement.style.background = 'linear-gradient(135deg, #FFF6CC 0%, #FCD576 40%, #E6A817 75%, #C48600 100%)';
        titleElement.style.webkitBackgroundClip = 'text';
        titleElement.style.webkitTextFillColor = 'transparent';
        titleElement.style.backgroundClip = 'text';
        titleElement.style.filter = 'drop-shadow(0 2px 8px rgba(230,168,23,0.35))';
        titleElement.textContent = movie.name;
    }

    // ✅ Update breadcrumb in watch.html
    const breadcrumb = document.getElementById('breadcrumb-movie-name');
    if (breadcrumb) {
        breadcrumb.textContent = movie.name;

        const epNameEl = document.getElementById('watchBreadcrumbEpName');
        if (epNameEl && episode && episode.name) {
            let epStr = episode.name.trim();
            if (!isNaN(epStr)) epStr = `Tập ${epStr}`;
            if (!epStr.toLowerCase().startsWith('tập') && !epStr.toLowerCase().includes('full')) epStr = `Tập ${epStr}`;
            epNameEl.textContent = ` - ${epStr}`;
            epNameEl.style.display = 'inline';
        } else if (epNameEl) {
            epNameEl.textContent = '';
            epNameEl.style.display = 'none';
        }

        let categoryName = '';
        let categoryLink = '';

        // Xử lý breadcrumb thông minh: nhớ trang trước đó (referrer) hoặc lấy từ sessionStorage do movie-detail.html truyền sang
        const savedName = sessionStorage.getItem('breadcrumbName');
        const savedLink = sessionStorage.getItem('breadcrumbLink');

        const referrer = document.referrer;
        let refMatched = false;

        if (savedName && savedLink) {
            categoryName = savedName;
            categoryLink = savedLink;
            refMatched = true;
        } else {
            try {
                if (referrer && referrer.includes(window.location.host)) {
                    const refUrl = new URL(referrer);

                    if (referrer.includes('phim-theo-quoc-gia.html')) {
                        categoryName = (movie.country && movie.country.length > 0) ? movie.country[0].name : 'Quốc Gia';
                        categoryLink = referrer;
                        refMatched = true;
                    } else if (referrer.includes('phim-theo-the-loai.html')) {
                        categoryName = (movie.category && movie.category.length > 0) ? movie.category[0].name : 'Thể Loại';
                        categoryLink = referrer;
                        refMatched = true;
                    } else if (referrer.includes('search.html')) {
                        categoryName = 'Tìm Kiếm';
                        categoryLink = referrer;
                        refMatched = true;
                    } else if (referrer.includes('danh-sach.html')) {
                        const listParam = refUrl.searchParams.get('list');
                        const listMap = {
                            'phim-moi': 'Phim Mới',
                            'phim-bo': 'Phim Bộ',
                            'phim-le': 'Phim Lẻ',
                            'tv-shows': 'TV Shows',
                            'hoat-hinh': 'Hoạt Hình',
                            'phim-vietsub': 'Phim Vietsub',
                            'phim-thuyet-minh': 'Thuyết Minh',
                            'phim-long-tien': 'Lồng Tiếng',
                            'phim-bo-dang-chieu': 'Đang Chiếu',
                            'phim-bo-hoan-thanh': 'Đã Hoàn Thành',
                            'phim-sap-chieu': 'Sắp Chiếu'
                        };
                        if (listParam && listMap[listParam]) {
                            categoryName = listMap[listParam];
                            categoryLink = referrer;
                            refMatched = true;
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not parse referrer URL for breadcrumb', e);
            }
        }

        // Fallback nếu không có referrer (vào thẳng link)
        if (!refMatched) {
            if (movie.type === 'series') {
                categoryName = 'Phim Bộ';
                categoryLink = '/danh-sach?list=phim-bo';
            } else if (movie.type === 'single') {
                categoryName = 'Phim Lẻ';
                categoryLink = '/danh-sach?list=phim-le';
            } else if (movie.type === 'hoathinh') {
                categoryName = 'Hoạt Hình';
                categoryLink = '/danh-sach?list=hoat-hinh';
            } else if (movie.type === 'tvshows') {
                categoryName = 'TV Shows';
                categoryLink = '/danh-sach?list=tv-shows';
            }
        }

        const catElement = document.getElementById('breadcrumb-category');
        if (catElement && categoryName) {
            catElement.textContent = categoryName;
            if (categoryLink) catElement.href = categoryLink;
        } else if (categoryName) {
            const separator = document.createElement('span');
            separator.innerHTML = `<svg style="width: 12px !important; height: 12px !important; min-width: 12px !important; min-height: 12px !important; display: inline-block !important;" class="text-gray-300 mx-0.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;

            const categoryElement = document.createElement('a');
            categoryElement.id = 'breadcrumb-category';
            categoryElement.className = 'hover:text-[#fcd576] transition-colors flex-shrink-0 text-white font-bold whitespace-nowrap';
            categoryElement.href = categoryLink;
            categoryElement.textContent = categoryName;

            breadcrumb.parentNode.insertBefore(categoryElement, breadcrumb);
            breadcrumb.parentNode.insertBefore(separator, breadcrumb);
        }
    }

    // Populate new Netflix-style inline meta badges under player
    const metaYearBadge = document.getElementById('meta-year-badge');
    if (metaYearBadge) metaYearBadge.textContent = movie.year;

    const metaRatingVal = document.getElementById('meta-rating-val');
    if (metaRatingVal) {
        const avgRating = ratingService.getAverageRating(movie.slug);
        metaRatingVal.textContent = avgRating;
    }

    const metaGenre = document.getElementById('meta-genre');
    if (metaGenre && movie.category) {
        metaGenre.textContent = movie.category.map(c => c.name).join(', ');
    }

    const metaDuration = document.getElementById('meta-duration');
    if (metaDuration) metaDuration.textContent = movie.time || '-- phút';

    // 🌟 Render Sidebar Premium Movie Card Details
    const sidebarPoster = document.getElementById('sidebar-poster');
    if (sidebarPoster) {
        const posterUrl = movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 300, 85, true);
        sidebarPoster.dataset.src = posterUrl;
        sidebarPoster.dataset.tmdbSlug = movie.slug;
        sidebarPoster.dataset.tmdbId = movie.tmdb?.id || '';
        sidebarPoster.dataset.tmdbName = (movie.name || '').replace(/"/g, '&quot;');
        sidebarPoster.dataset.tmdbYear = movie.year || '';
        sidebarPoster.dataset.tmdbType = 'poster';
        sidebarPoster.src = posterUrl || "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E";
        sidebarPoster.onerror = function () {
            this.onerror = null;
            if (window.autoHealMovieImage) {
                window.autoHealMovieImage(this, movie.slug, movie.name || movie.title);
            }
        };

        // ⚡ Anti-Stall Watchdog: Nếu phimimg.com bị nghẽn (>3s), chủ động kích hoạt TMDB cho poster xem phim
        if (movie.tmdb && movie.tmdb.id && typeof imageOptimizer !== 'undefined') {
            setTimeout(() => {
                if (!sidebarPoster.complete || sidebarPoster.naturalWidth === 0) {
                    imageOptimizer.getTMDBImageUrl(sidebarPoster).then(url => {
                        if (url && (!sidebarPoster.complete || sidebarPoster.naturalWidth === 0)) {
                            sidebarPoster.src = url;
                        }
                    }).catch(() => {});
                }
            }, 3000);
        }
    }

    const sidebarName = document.getElementById('sidebar-movie-name');
    if (sidebarName) {
        sidebarName.textContent = movie.name;
        if (document.documentElement.classList.contains('light-mode')) {
            sidebarName.style.background = 'linear-gradient(135deg, #78350f 0%, #b45309 35%, #d97706 70%, #92400e 100%)';
        } else {
            sidebarName.style.background = 'linear-gradient(135deg, #FFF6CC 0%, #FCD576 40%, #E6A817 75%, #C48600 100%)';
        }
        sidebarName.style.webkitBackgroundClip = 'text';
        sidebarName.style.webkitTextFillColor = 'transparent';
        sidebarName.style.backgroundClip = 'text';
    }

    const sidebarOrigin = document.getElementById('sidebar-movie-origin');
    if (sidebarOrigin) {
        if (movie.origin_name && movie.origin_name.trim() !== '' && movie.origin_name.trim().toLowerCase() !== (movie.name || '').trim().toLowerCase()) {
            sidebarOrigin.textContent = movie.origin_name;
            sidebarOrigin.style.display = 'block';
        } else {
            sidebarOrigin.textContent = '';
            sidebarOrigin.style.display = 'none';
        }
    }

    // 🌟 Populate New Sidebar Summary Card Elements Dynamically
    const sidebarDescription = document.getElementById('sidebar-description-text');
    if (sidebarDescription) {
        let rawContent = movie.content || movie.description || 'Nội dung phim đang được cập nhật...';
        // Clean HTML tags if any exist
        let cleanContent = rawContent.replace(/<[^>]*>/g, '').trim();
        sidebarDescription.textContent = cleanContent || 'Nội dung phim đang được cập nhật...';

        const hasActors = movie.actor && movie.actor.length > 0;
        const clampLines = (window.innerWidth >= 1024) ? (hasActors ? 10 : 14) : 10;
        sidebarDescription.style.display = '-webkit-box';
        sidebarDescription.style.webkitBoxOrient = 'vertical';
        sidebarDescription.style.overflow = 'hidden';
        sidebarDescription.style.textOverflow = 'ellipsis';
        sidebarDescription.style.webkitLineClamp = String(clampLines);
    }

    const sidebarGenresRow = document.getElementById('sidebar-genres-row');
    if (sidebarGenresRow) {
        if (movie.category && (Array.isArray(movie.category) ? movie.category.length > 0 : Object.keys(movie.category).length > 0)) {
            const genreColors = [
                { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' },   // Blue (Chính Kịch, etc.)
                { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' },  // Purple (Tâm Lý, etc.)
                { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.4)', color: '#f472b6' },  // Pink (Tình Cảm, etc.)
                { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', color: '#34d399' },   // Emerald Green
                { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' },   // Amber Gold
                { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.4)', color: '#38bdf8' }    // Sky Cyan
            ];

            let rawCats = [];
            if (Array.isArray(movie.category)) {
                rawCats = movie.category;
            } else if (movie.category && typeof movie.category === 'object') {
                rawCats = Object.values(movie.category).flatMap(g => g.list || g);
            }

            const validCats = rawCats.map((cat) => {
                const name = typeof cat === 'string' ? cat : (cat?.name || '');
                const slug = typeof cat === 'string'
                    ? cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                    : (cat?.slug || '');
                return { name, slug };
            }).filter(c => c.name && c.name !== 'undefined');

            if (validCats.length > 0) {
                sidebarGenresRow.innerHTML = validCats.map((cat, idx) => {
                    const palette = genreColors[idx % genreColors.length];
                    return `<a href="/categories?category=${cat.slug}" style="background-color: ${palette.bg}; border: 1px solid ${palette.border}; color: ${palette.color};" class="px-2.5 py-1 rounded-lg text-xs font-bold hover:brightness-125 transition-all shadow-sm">
                        ${cat.name}
                    </a>`;
                }).join('');
            } else {
                sidebarGenresRow.innerHTML = `<span style="background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa;" class="px-3 py-1 rounded-lg text-xs font-bold shadow-sm">Tổng hợp</span>`;
            }
        } else {
            sidebarGenresRow.innerHTML = `<span style="background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa;" class="px-3 py-1 rounded-lg text-xs font-bold shadow-sm">Tổng hợp</span>`;
        }
    }

    const sidebarQualityBadge = document.getElementById('sidebar-quality-badge');
    if (sidebarQualityBadge) sidebarQualityBadge.textContent = movie.quality || 'FHD';

    const sidebarYearBadge = document.getElementById('sidebar-year-badge');
    if (sidebarYearBadge) sidebarYearBadge.textContent = movie.year || '2026';

    const sidebarLangText = document.getElementById('sidebar-lang-text');
    if (sidebarLangText) {
        let langVal = movie.lang || 'Vietsub';
        if (langVal.toLowerCase().includes('vietsub')) langVal = 'VS.1';
        else if (langVal.toLowerCase().includes('thuyết minh')) langVal = 'TM';
        else if (langVal.toLowerCase().includes('lồng tiếng')) langVal = 'LT';
        sidebarLangText.textContent = langVal;
    }

    const sidebarEpBadge = document.getElementById('sidebar-ep-badge');
    if (sidebarEpBadge) {
        const catList = Array.isArray(movie.category) ? movie.category : [];
        const isSingleOrCinema = movie.type === 'single' ||
            movie.chieu_rap === true ||
            movie.is_cinema === true ||
            catList.some(c => {
                const n = (typeof c === 'string' ? c : (c.name || c.slug || '')).toLowerCase();
                return n.includes('chiếu rạp') || n.includes('chieu-rap') || n.includes('phim lẻ') || n.includes('phim-le');
            }) ||
            String(movie.episode_total || '').trim() === '1' ||
            String(movie.episode_current || '').toLowerCase().includes('full') ||
            String(movie.episode_current || '').toLowerCase().includes('chiếu rạp');

        let epStr = 'Full';
        if (isSingleOrCinema) {
            epStr = 'Full';
        } else if (movie.episode_total && !isNaN(movie.episode_total) && Number(movie.episode_total) > 1) {
            epStr = `${movie.episode_total} Tập`;
        } else if (movie.episode_current) {
            epStr = movie.episode_current;
            if (!isNaN(epStr)) epStr = `${epStr} Tập`;
        }
        sidebarEpBadge.textContent = epStr;
    }

    const sidebarAiredStatusText = document.getElementById('sidebar-aired-status-text');
    if (sidebarAiredStatusText) {
        sidebarAiredStatusText.textContent = movie.status === 'completed'
            ? 'Đã chiếu: Full tập'
            : (movie.episode_current ? `Đang chiếu: ${movie.episode_current}` : 'Đang chiếu');
    }

    const sidebarImdbScore = document.getElementById('sidebar-imdb-score');
    if (sidebarImdbScore) {
        sidebarImdbScore.textContent = (movie.imdb && movie.imdb.vote_average) ? movie.imdb.vote_average : '9.2';
    }

    const sidebarInfoLink = document.getElementById('sidebar-info-link');
    if (sidebarInfoLink && movie && movie.slug) {
        sidebarInfoLink.href = `/phim/${movie.slug}`;
    }

    const sidebarReelsReviewLink = document.getElementById('sidebar-reels-review-link');
    if (sidebarReelsReviewLink && movie && movie.slug) {
        const currentWatchUrl = window.location.pathname + window.location.search;
        const targetReelsUrl = `/reels/review/${movie.slug}?return=${encodeURIComponent(currentWatchUrl)}`;
        sidebarReelsReviewLink.href = targetReelsUrl;

        // 🚀 Instant Prefetch on Hover / Touch
        const prefetchReelsPage = () => {
            if (!sidebarReelsReviewLink.dataset.prefetched) {
                sidebarReelsReviewLink.dataset.prefetched = 'true';
                const prefetchTag = document.createElement('link');
                prefetchTag.rel = 'prefetch';
                prefetchTag.href = targetReelsUrl;
                document.head.appendChild(prefetchTag);
            }
        };
        sidebarReelsReviewLink.addEventListener('mouseenter', prefetchReelsPage, { once: true });
        sidebarReelsReviewLink.addEventListener('touchstart', prefetchReelsPage, { once: true, passive: true });

        // ⚡ Ultra-Smooth Seamless Transition on Click
        sidebarReelsReviewLink.onclick = () => {
            try {
                sessionStorage.setItem('aphim_reels_referrer', currentWatchUrl);
                if (window.artInstance && typeof window.artInstance.currentTime === 'number') {
                    sessionStorage.setItem('aphim_watch_time_' + movie.slug, String(window.artInstance.currentTime));
                }
            } catch (err) {}

            // Pause watch player immediately to stop audio overlap
            try {
                if (window.artInstance && typeof window.artInstance.pause === 'function') window.artInstance.pause();
                document.querySelectorAll('video, audio').forEach(v => { try { v.pause(); } catch(_) {} });
            } catch (_) {}

            // Show top loading progress bar
            let bar = document.getElementById('reels-transit-bar');
            if (!bar) {
                bar = document.createElement('div');
                bar.id = 'reels-transit-bar';
                bar.className = 'reels-transit-bar';
                document.body.appendChild(bar);
            }
            bar.style.width = '35%';
            sidebarReelsReviewLink.classList.add('is-transitioning');
            requestAnimationFrame(() => {
                if (bar) bar.style.width = '90%';
            });
        };
    }

    // 🎬 Tải thời lượng Review thông minh (Tách luồng, nạp nền khi cuộn tới hoặc lúc rảnh, không cản trở Video Player)
    const durationChip = document.getElementById('sidebar-reels-duration-chip');
    if (durationChip && movie) {
        const movieKey = movie.slug || movie.name || '';
        const durCacheKey = 'aphim_reels_dur_' + movieKey;

        // 1. Nếu đã lưu trong bộ nhớ tạm (0ms - Không tốn request mạng)
        try {
            const cachedDur = sessionStorage.getItem(durCacheKey);
            if (cachedDur) {
                durationChip.textContent = cachedDur;
            }
        } catch (_) {}

        // 2. Hàm nạp nền thời lượng review khi trình duyệt rảnh rỗi (Low Priority)
        let _durFetched = false;
        const fetchReelsDurationLazy = () => {
            if (_durFetched || durationChip.dataset.loaded) return;
            _durFetched = true;
            durationChip.dataset.loaded = 'true';

            const queryTarget = movie.name || movie.slug;
            if (!queryTarget) return;

            const executeQuery = () => {
                fetch(`/api/reels/search?q=${encodeURIComponent(queryTarget)}&tab=review`, { priority: 'low' })
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.success && data.items && data.items.length > 0) {
                            const firstMatch = data.items[0];
                            let formattedBadge = '';
                            if (firstMatch.durationBadge) {
                                formattedBadge = firstMatch.durationBadge;
                            } else if (firstMatch.duration) {
                                const parts = String(firstMatch.duration).trim().split(':').map(p => parseInt(p, 10) || 0);
                                if (parts.length === 3) {
                                    const [h, m, s] = parts;
                                    formattedBadge = h > 0 ? `${h} GIỜ ${m > 0 ? m + 'P' : ''}`.trim() : `${m} PHÚT`;
                                } else if (parts.length === 2) {
                                    const [m, s] = parts;
                                    formattedBadge = m >= 60 ? `${Math.floor(m / 60)} GIỜ ${m % 60 > 0 ? (m % 60) + 'P' : ''}`.trim() : `${m} PHÚT`;
                                }
                            }
                            if (formattedBadge) {
                                durationChip.textContent = formattedBadge;
                                try { sessionStorage.setItem(durCacheKey, formattedBadge); } catch (_) {}
                            }
                        }
                    })
                    .catch(() => {});
            };

            if ('requestIdleCallback' in window) {
                requestIdleCallback(executeQuery, { timeout: 4000 });
            } else {
                setTimeout(executeQuery, 2000);
            }
        };

        // 3. Chỉ kích hoạt khi người dùng lướt tới banner (IntersectionObserver) hoặc tương tác
        if ('IntersectionObserver' in window && sidebarReelsReviewLink) {
            const reelsBannerObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        fetchReelsDurationLazy();
                        observer.disconnect();
                    }
                });
            }, { rootMargin: '120px' });
            reelsBannerObserver.observe(sidebarReelsReviewLink);
        } else {
            // Thiết bị cũ: trì hoãn sau 4s khi video player đã bắt đầu phát ổn định
            setTimeout(fetchReelsDurationLazy, 4000);
        }

        if (sidebarReelsReviewLink) {
            sidebarReelsReviewLink.addEventListener('mouseenter', fetchReelsDurationLazy, { once: true, passive: true });
            sidebarReelsReviewLink.addEventListener('touchstart', fetchReelsDurationLazy, { once: true, passive: true });
        }
    }

    const sidebarQuality = document.getElementById('sidebar-quality');
    if (sidebarQuality) sidebarQuality.textContent = movie.quality || 'HD';

    const sidebarLang = document.getElementById('sidebar-lang');
    if (sidebarLang) sidebarLang.textContent = movie.lang || 'Vietsub';

    const sidebarMetadataCards = document.getElementById('sidebar-metadata-cards');
    if (sidebarMetadataCards) {
        const metadataHTML = `
            <!-- Thể Loại -->
            ${movie.category && movie.category.length > 0 ? `
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span style="width:10px;height:10px;border-radius:50%;background:#4A9EFF;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(74,158,255,0.6)"></span>
                        <h4 style="color: #60a5fa; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="text-[13px] font-bold tracking-wide">Thể loại</h4>
                    </div>
                    <span style="background-color: rgba(59,130,246,0.25); color: #eff6ff;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">${movie.category.length}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${movie.category.map(cat => `
                        <a href="/search?category=${cat.slug}" style="border-color: rgba(59,130,246,0.3); color: #93c5fd; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="px-2.5 py-0.5 border rounded-lg text-[11px] font-medium hover:bg-blue-500/30 transition-colors">
                            ${cat.name}
                        </a>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- Quốc Gia -->
            ${movie.country && movie.country.length > 0 ? `
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span style="width:10px;height:10px;border-radius:50%;background:#A855F7;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(168,85,247,0.6)"></span>
                        <h4 style="color: #c084fc; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="text-[13px] font-bold tracking-wide">Quốc gia</h4>
                    </div>
                    <span style="background-color: rgba(168,85,247,0.25); color: #faf5ff;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">${movie.country.length}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${movie.country.map(c => `
                        <a href="/search?country=${c.slug}" style="border-color: rgba(168,85,247,0.3); color: #d8b4fe; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="px-2.5 py-0.5 border rounded-lg text-[11px] font-medium hover:bg-purple-500/30 transition-colors">
                            ${c.name}
                        </a>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Thông Tin -->
            <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); grid-column: span 2;" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <span style="width:10px;height:10px;border-radius:50%;background:#22C55E;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(34,197,94,0.6)"></span>
                        <h4 style="color: #4ade80; text-shadow: 0 1px 2px rgba(0,0,0,0.5);" class="text-[13px] font-bold tracking-wide">Thông tin</h4>
                    </div>
                    <span style="background-color: rgba(34,197,94,0.25); color: #f0fdf4;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase">${movie.status === 'completed' ? 'Full' : movie.status === 'ongoing' ? 'ongoing' : 'Trailer'}</span>
                </div>
                <div class="space-y-2 text-[11px]">
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Thời lượng:</span>
                        <span class="text-white font-semibold">${movie.time || 'Đang cập nhật'}</span>
                    </div>
                    <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                        <span>Tập hiện tại:</span>
                        <span style="color: #4ade80;" class="font-bold text-[12px]">${movie.episode_current || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- TMDB & IMDB Group -->
            ${(movie.tmdb && movie.tmdb.id) || (movie.imdb && movie.imdb.id) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; grid-column: span 2;">
                <!-- TMDB -->
                ${movie.tmdb && movie.tmdb.id ? `
                <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <span style="background:#01B4E4;color:white;font-size:10px;font-weight:900;padding:2px 5px;border-radius:3px;margin-right:6px;letter-spacing:0.5px">TMDB</span>
                        </div>
                        <span style="background-color: rgba(14,165,233,0.25); color: #f0f9ff;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase">${movie.tmdb.type || 'tv'}</span>
                    </div>
                    <div class="space-y-2 text-[11px]">
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>ID:</span>
                            <span class="text-white font-semibold">${movie.tmdb.id}</span>
                        </div>
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>Điểm số:</span>
                            <span class="text-white font-semibold"><span style="color: #38bdf8;" class="font-bold text-[12px]">${movie.tmdb.vote_average || 'N/A'}</span> /10</span>
                        </div>
                    </div>
                </div>
                ` : '<div></div>'}

                <!-- IMDB -->
                ${movie.imdb && movie.imdb.id ? `
                <div style="background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);" class="rounded-xl p-3 shadow-lg hover:bg-white/20 transition-all duration-300">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <span style="background:#F5C518;color:#000000;font-size:10px;font-weight:900;padding:2px 5px;border-radius:3px;margin-right:6px;letter-spacing:0.5px">IMDb</span>
                        </div>
                        <span style="background-color: rgba(234,179,8,0.25); color: #fefce8;" class="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase">Rating</span>
                    </div>
                    <div class="space-y-2 text-[11px]">
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>ID:</span>
                            <span class="text-white font-semibold">${movie.imdb.id}</span>
                        </div>
                        <div class="flex justify-between items-center text-gray-200" style="text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                            <span>Điểm số:</span>
                            <span class="text-white font-semibold"><span style="color: #fde047;" class="font-bold text-[12px]">N/A</span> /10</span>
                        </div>
                    </div>
                </div>
                ` : '<div></div>'}
            </div>
            ` : ''}
        `;
        sidebarMetadataCards.innerHTML = metadataHTML;
    }

    // 🎭 Render Cast (Diễn viên) circular avatars in sidebar (limit to max 6 in single line)
    const sidebarCastSection = document.getElementById('sidebar-cast-section');
    const sidebarCast = document.getElementById('sidebar-cast');
    if (sidebarCast && movie.actor && movie.actor.length > 0) {
        if (sidebarCastSection) sidebarCastSection.classList.remove('hidden');

        sidebarCast.innerHTML = movie.actor.slice(0, 20).map((actor, index) => {
            const colors = ['from-red-500 to-red-700', 'from-blue-500 to-blue-700', 'from-green-500 to-green-700', 'from-yellow-500 to-yellow-700', 'from-purple-500 to-purple-700', 'from-pink-500 to-pink-700', 'from-indigo-500 to-indigo-700', 'from-teal-500 to-teal-700'];
            const colorClass = colors[index % colors.length];
            const initial = actor.charAt(0).toUpperCase();

            return `
                <div class="flex-shrink-0 w-[68px] sm:w-[76px] text-center group cursor-pointer" data-actor-name="${actor}">
                    <div class="relative mb-1">
                        <div class="actor-avatar-container w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-xs sm:text-sm font-black border border-white/10 group-hover:border-primary transition-all duration-300 group-hover:scale-105 overflow-hidden shadow-lg">
                            ${initial}
                        </div>
                    </div>
                    <p class="text-gray-300 text-[10px] sm:text-[11px] font-semibold truncate w-full group-hover:text-primary transition-colors leading-tight">${actor}</p>
                </div>
            `;
        }).join('');

        // Trigger TMDB actor avatar loading in the background
        if (typeof loadActorImagesFromTMDB === 'function') {
            setTimeout(() => {
                const actorElements = document.querySelectorAll('[data-actor-name]');
                if (actorElements.length > 0) {
                    loadActorImagesFromTMDB(movie).catch(err => {
                        console.warn('⚠️ Failed to load actor images:', err);
                    });
                }
            }, 500);
        }
    } else if (sidebarCastSection) {
        sidebarCastSection.classList.add('hidden');
    }

    // Tích hợp Các bản chiếu (Đã tắt theo yêu cầu để tối ưu tốc độ trang)
    // renderVersions(movie);

    // Load movie gallery
    loadMovieGallery(movie);

    // Sync card height with left player box
    if (typeof window.syncSidebarCardHeight === 'function') {
        setTimeout(window.syncSidebarCardHeight, 50);
        setTimeout(window.syncSidebarCardHeight, 500);
    }
}

// Render "Các bản chiếu" trên trang Xem Phim (Đã vô hiệu hóa để tăng tốc tải trang)
function renderVersions(movie) {
    const oldVersions = document.getElementById('watch-versions-container');
    if (oldVersions) oldVersions.remove();
}

// Logic chuyển hướng linh hoạt giữa Node và HTML
window.changeVersion = function (domain) {
    const currentDomain = window.location.hostname;

    // Nếu domain mục tiêu trùng với domain hiện tại
    if (currentDomain.includes(domain) || (domain === 'aphim.top' && (currentDomain === 'localhost' || currentDomain === '127.0.0.1'))) {
        if (typeof showToast === 'function') {
            showToast('Bạn đang xem bản chiếu này rồi!', 'info');
        } else {
            alert('Bạn đang xem bản chiếu này rồi!');
        }
        return; // Ngừng thực hiện load lại trang
    }

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const params = new URLSearchParams(currentSearch);

    let slug = '';
    let episode = '';
    let isWatchPage = false;

    // Ưu tiên đọc từ biến toàn cục nếu đang ở trang xem phim (bảo đảm luôn lấy đúng tập hiện tại)
    if (typeof currentMovie !== 'undefined' && currentMovie && currentMovie.slug) {
        slug = currentMovie.slug;
        if (typeof currentEpisode !== 'undefined' && currentEpisode && currentEpisode.slug) {
            episode = currentEpisode.slug;
            isWatchPage = true;
        } else if (currentPath.includes('/xem-phim/') || currentPath.includes('watch.html')) {
            isWatchPage = true;
        }
    }

    // Fallback: Đọc từ URL nếu không có biến toàn cục
    if (!slug) {
        if (currentPath.includes('/phim/')) {
            slug = currentPath.split('/phim/')[1].replace('/', '');
        } else if (currentPath.includes('/xem-phim/')) {
            isWatchPage = true;
            const parts = currentPath.split('/xem-phim/')[1].split('/');
            slug = parts[0];
            if (parts.length > 1) {
                episode = parts[1];
            }
        } else if (currentPath.includes('movie-detail.html')) {
            slug = params.get('slug');
        } else if (currentPath.includes('watch.html')) {
            isWatchPage = true;
            slug = params.get('slug');
            episode = params.get('episode');
        }
    }

    // Chuẩn hóa biến tập phim (bỏ "tap-" đi để ghép lại cho chuẩn, tránh lỗi tap-tap-5)
    if (episode) {
        episode = episode.replace(/^tap-/, '');
    }

    if (!slug) {
        window.location.href = "https://" + domain + currentPath + currentSearch;
        return;
    }

    // Xây dựng URL đích
    const isNodeDomain = domain === 'aphim.top' || domain === 'aphim.store' || domain === 'localhost' || domain === '127.0.0.1';
    let newUrl = 'https://' + domain;

    if (isNodeDomain) {
        if (isWatchPage) {
            newUrl += '/xem-phim/' + slug;
            if (episode) {
                if (episode.toLowerCase() === 'full') {
                    newUrl += '/full';
                } else {
                    newUrl += '/tap-' + episode;
                }
            }
        } else {
            newUrl += '/phim/' + slug;
        }
    } else {
        if (isWatchPage) {
            newUrl += '/watch.html?slug=' + slug;
            if (episode) {
                if (episode.toLowerCase() === 'full') {
                    newUrl += '&episode=full';
                } else {
                    newUrl += '&episode=tap-' + episode;
                }
            }
        } else {
            newUrl += '/movie-detail.html?slug=' + slug;
        }
    }

    window.location.href = newUrl;
};

// Load movie gallery from API
async function loadMovieGallery(movie) {
    const galleryContainer = document.getElementById('movie-gallery-container');
    const scrollContainer = document.getElementById('movie-gallery-scroll');
    const galleryCount = document.getElementById('movie-gallery-count');
    if (!galleryContainer || !scrollContainer) return;

    // Phim tùy biến hoặc không có TMDB metadata thì bỏ qua, không gọi phimapi gây lỗi 404
    if (movie.is_custom || movie.is_cinema || (!movie.tmdb?.id && !movie.tmdb_id)) {
        return;
    }

    try {
        const url = `https://phimapi.com/v1/api/phim/${movie.slug}/images`;
        const options = { method: 'GET', headers: { accept: 'application/json' } };

        const res = await fetch(url, options);
        if (!res.ok) return;

        const json = await res.json();

        if (json.success && json.data && json.data.images && json.data.images.length > 0) {
            const backdrops = json.data.images.filter(img => img.type === 'backdrop' || img.aspect_ratio > 1);

            if (backdrops.length > 0) {
                window.movieGalleryImageUrls = backdrops.map(img => `https://image.tmdb.org/t/p/w1280${img.file_path}`);
                galleryContainer.classList.remove('hidden');
                galleryCount.textContent = `(${backdrops.length} ảnh)`;

                scrollContainer.innerHTML = backdrops.map((img, index) => `
                    <div style="flex-shrink: 0; width: 280px; aspect-ratio: 16/9; max-width: 80vw;" class=" rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:border-white/30 transition-colors relative cursor-pointer" onclick="openLightbox(window.movieGalleryImageUrls, ${index})">
                        <img src="https://image.tmdb.org/t/p/w780${img.file_path}" alt="Cảnh phim ${movie.name}" loading="lazy" class="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110">
                    </div>
                `).join('');

                setupGalleryScroll();
            }
        }
    } catch (err) {
        console.warn('Lỗi tải hình ảnh phim:', err);
    }
}

function setupGalleryScroll() {
    const scrollContainer = document.getElementById('movie-gallery-scroll');
    const btnLeft = document.getElementById('btn-scroll-left');
    const btnRight = document.getElementById('btn-scroll-right');

    if (!scrollContainer || !btnLeft || !btnRight) return;

    btnLeft.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: -400, behavior: 'smooth' });
    });

    btnRight.addEventListener('click', () => {
        scrollContainer.scrollBy({ left: 400, behavior: 'smooth' });
    });

    const checkScroll = () => {
        btnLeft.style.opacity = scrollContainer.scrollLeft > 10 ? '1' : '0';
        btnRight.style.opacity = scrollContainer.scrollLeft < (scrollContainer.scrollWidth - scrollContainer.clientWidth - 10) ? '1' : '0';

        btnLeft.style.pointerEvents = scrollContainer.scrollLeft > 10 ? 'auto' : 'none';
        btnRight.style.pointerEvents = scrollContainer.scrollLeft < (scrollContainer.scrollWidth - scrollContainer.clientWidth - 10) ? 'auto' : 'none';
    };

    scrollContainer.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    setTimeout(checkScroll, 500);
}

if (typeof window.openLightbox === 'undefined') {
    window.openLightbox = function (images, index) {
        let current = index;
        const isMobile = window.innerWidth <= 768;
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.97);z-index:99999;display:flex;align-items:center;justify-content:center';

        const img = document.createElement('img');
        img.style.cssText = isMobile ? 'max-width:92vw;max-height:70vh;object-fit:contain;border-radius:8px' : 'max-width:70vw;max-height:75vh;object-fit:contain;border-radius:8px';
        img.src = images[current];

        const counter = document.createElement('div');
        counter.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:white;font-size:14px';
        counter.textContent = (current + 1) + ' / ' + images.length;

        const btnClose = document.createElement('button');
        btnClose.innerHTML = '✕';
        btnClose.style.cssText = 'position:absolute;top:16px;right:20px;background:none;border:none;color:white;font-size:28px;cursor:pointer;z-index:1';

        const btnPrev = document.createElement('button');
        btnPrev.innerHTML = '‹';
        btnPrev.style.cssText = isMobile ? 'position:absolute;left:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;left:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';

        const btnNext = document.createElement('button');
        btnNext.innerHTML = '›';
        btnNext.style.cssText = isMobile ? 'position:absolute;right:10px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:28px;cursor:pointer;padding:6px 12px;border-radius:8px;z-index:1' : 'position:absolute;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;font-size:40px;cursor:pointer;padding:8px 16px;border-radius:8px;z-index:1';

        function update() { img.src = images[current]; counter.textContent = (current + 1) + ' / ' + images.length; }
        btnPrev.onclick = () => { current = (current - 1 + images.length) % images.length; update(); };
        btnNext.onclick = () => { current = (current + 1) % images.length; update(); };
        btnClose.onclick = () => document.body.removeChild(overlay);
        overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { if (document.body.contains(overlay)) { document.body.removeChild(overlay); document.removeEventListener('keydown', escHandler); } }
            if (e.key === 'ArrowLeft') { current = (current - 1 + images.length) % images.length; update(); }
            if (e.key === 'ArrowRight') { current = (current + 1) % images.length; update(); }
        });

        overlay.appendChild(img);
        overlay.appendChild(counter);
        overlay.appendChild(btnClose);
        overlay.appendChild(btnPrev);
        overlay.appendChild(btnNext);
        document.body.appendChild(overlay);
    }
}

// 🛡️ PHASE 1: RENDER INTERACTIVE PLAYER PLACEHOLDER (Anti-DMCA Gate)
function renderPlayerPlaceholder(episode) {
    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) return;

    if (!currentMovie) {
        playerContainer.innerHTML = `
            <div id="playerPlaceholder" class="absolute inset-0 w-full h-full flex flex-col items-center justify-center cursor-pointer overflow-hidden group/overlay" style="border-radius: 12px; background: #0a0c10;">
                <div style="position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(252, 211, 77, 0.08) 0%, rgba(18, 20, 29, 0.95) 70%, #0a0c10 100%);"></div>
                
                <!-- Spinner -->
                <div style="position: relative; z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
                    <div style="position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
                        <div class="animate-spin" style="position: absolute; inset: 0; border-radius: 50%; border: 2.5px solid transparent; border-top-color: #fcd576; border-right-color: #f59e0b; box-shadow: 0 0 20px rgba(252, 211, 77, 0.5);"></div>
                        <div style="position: absolute; inset: 8px; border-radius: 50%; border: 2.5px solid transparent; border-bottom-color: #a855f7; border-left-color: #818cf8; animation: spin 1.5s linear infinite reverse;"></div>
                        <div style="width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #fcd576); color: #0a0c10; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 25px rgba(245, 158, 11, 0.6);">
                            <span class="material-icons-round" style="font-size: 26px; margin-left: 2px;">play_arrow</span>
                        </div>
                    </div>
                </div>

                <!-- 3D Cinematic Meta — Loading State -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 20; pointer-events: none;
                     background: linear-gradient(to top, rgba(5,5,15,0.98) 0%, rgba(5,5,15,0.82) 40%, rgba(5,5,15,0.35) 70%, transparent 100%);
                     padding: 60px 20px 18px 20px; border-radius: 0 0 12px 12px;">
                    <div style="perspective: 800px; perspective-origin: 20% 100%;">
                        <div style="transform: rotateX(0.8deg) rotateY(-0.4deg); transform-style: preserve-3d; display: flex; flex-direction: column; gap: 9px;">
                            <!-- Badges -->
                            <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
                                <span class="badge-aphim-studio" style="display: inline-flex; align-items: center; gap: 5px;
                                    background: linear-gradient(135deg, #ffe87c 0%, #f59e0b 45%, #b45309 100%);
                                    color: #0a0c10; font-weight: 900; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
                                    padding: 3.5px 10px; border-radius: 4px;
                                    border-top: 1px solid rgba(255,240,120,0.9); border-left: 1px solid rgba(255,240,120,0.6);
                                    border-right: 1px solid rgba(120,70,0,0.5); border-bottom: 1px solid rgba(120,70,0,0.5);
                                    box-shadow: 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.3) inset, 2px 4px 12px rgba(245,158,11,0.55), 0 2px 4px rgba(0,0,0,0.6);
                                    text-shadow: 0 1px 0 rgba(255,255,255,0.4);">
                                    <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.85"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                    APHIM STUDIO
                                </span>
                                <div style="display: inline-flex; align-items: center; gap: 6px;
                                    background: rgba(10,20,10,0.65); backdrop-filter: blur(8px);
                                    border: 1px solid rgba(52,211,153,0.45); padding: 3.5px 10px; border-radius: 4px;
                                    box-shadow: 0 0 10px rgba(52,211,153,0.25), 0 2px 4px rgba(0,0,0,0.5);">
                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 6px #34d399; display: inline-block; animation: pulse-cdn 1.4s ease-in-out infinite;"></span>
                                    <span style="color: #6ee7b7; font-weight: 700; font-size: 9px; letter-spacing: 0.9px; text-transform: uppercase; white-space: nowrap;">CDN LIVE</span>
                                </div>
                            </div>
                            <!-- Title -->
                            <div style="transform: translateZ(10px);">
                                <h3 style="margin: 0; padding: 0; font-size: clamp(18px, 2.2vw, 30px); font-weight: 900; letter-spacing: -0.4px; line-height: 1.15;
                                    background: linear-gradient(135deg, #ffffff 0%, #fde68a 35%, #fbbf24 65%, #ffffff 100%);
                                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                                    filter: drop-shadow(0 2px 16px rgba(251,191,36,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.9));">
                                    Đang tải dữ liệu phim...
                                </h3>
                                <p style="margin: 5px 0 0; font-size: 11px; color: rgba(203,213,225,0.7); font-weight: 500; letter-spacing: 0.2px;">Vui lòng chờ trong giây lát để hệ thống khởi tạo trình phát tốc độ cao</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // Use thumb_url (horizontal banner) instead of poster_url (vertical) for 16:9 video player
    const posterUrl = movieAPI.getImageURL(currentMovie.thumb_url || currentMovie.poster_url, 1200, 90, true);
    const movieName = currentMovie.name;

    // Thông minh hóa tên tập: Nếu là số thì thêm chữ "Tập", nếu là chữ (Full, Trailer...) thì giữ nguyên
    let epName = 'Full HD';
    if (episode && episode.name) {
        if (episode.name.toLowerCase().includes('tập')) {
            epName = episode.name;
        } else if (!isNaN(episode.name)) {
            epName = `Tập ${episode.name}`;
        } else {
            epName = episode.name;
        }
    }

    const quality = currentMovie.quality || 'Full HD';
    const lang = currentMovie.lang || 'Vietsub';

    playerContainer.innerHTML = `
        <div id="playerPlaceholder" class="absolute inset-0 w-full h-full cursor-pointer overflow-hidden rounded-xl group/overlay" 
             style="transform: translate3d(0,0,0); -webkit-transform: translate3d(0,0,0); border-radius: 12px;"
             onclick="window.startActualPlayback()">
            <!-- Background Layer 1: Cinematic Ambient Blur (Covers everything with soft colors) -->
            <div class="absolute inset-0 bg-cover bg-center bg-no-repeat transform-gpu scale-105" 
                 style="background-image: url('${posterUrl}'); filter: brightness(0.25) blur(15px); border-radius: 12px; overflow: hidden;"></div>
            
            <!-- Background Layer 2: Sharp Centered Image (Cover - fills the ENTIRE horizontal frame perfectly) -->
            <div class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-[1.5s] ease-out group-hover/overlay:scale-103" 
                 style="background-image: url('${posterUrl}'); filter: brightness(0.6) contrast(1.05); border-radius: 12px; overflow: hidden;"></div>
            
            <!-- Netflix/Disney+ Premium Double Gradients -->
            <!-- Top Gradient (Fade out header backdrop) -->
            <div class="absolute inset-0 bg-gradient-to-b from-black/95 via-black/30 to-transparent opacity-95" style="border-radius: 12px;"></div>
            <!-- Bottom Gradient (Fade out text backdrop - cinematic) -->
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-transparent opacity-95" style="border-radius: 12px;"></div>
            
            <!-- Central Play Button (Dead Centered - Absolute Horizontal & Vertical Center) -->
            <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div id="play-btn" class="w-[55px] h-[55px] sm:w-[80px] sm:h-[80px] pointer-events-auto transition-transform duration-500 transform group-hover/overlay:scale-110 filter drop-shadow-[0_10px_35px_rgba(252,211,77,0.35)]" style="cursor: pointer;"></div>
            </div>
            
            <!-- ═══ 3D CINEMATIC PREMIUM META BLOCK (JS version) ═══ -->
            <div class="player-overlay-meta absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
                style="background: linear-gradient(to top, rgba(5,5,15,0.98) 0%, rgba(5,5,15,0.82) 40%, rgba(5,5,15,0.35) 70%, transparent 100%); padding: 60px 20px 16px 20px; border-radius: 0 0 12px 12px;">
                
                <!-- 3D Perspective Depth Container -->
                <div style="perspective: 800px; perspective-origin: 20% 100%;">
                    <div class="player-meta-3d-card" style="transform: rotateX(0.8deg) rotateY(-0.4deg); transform-style: preserve-3d; display: flex; flex-direction: column; gap: 9px;">
                        
                        <!-- Row 1: Studio Badge + Quality/Sub Badges -->
                        <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
                            
                            <!-- APHIM STUDIO Badge — 3D Gold Foil -->
                            <span class="badge-aphim-studio" style="
                                position: relative;
                                display: inline-flex; align-items: center; gap: 5px;
                                background: linear-gradient(135deg, #ffe87c 0%, #f59e0b 45%, #b45309 100%);
                                color: #0a0c10; font-weight: 900; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
                                padding: 3.5px 10px; border-radius: 4px;
                                border-top: 1px solid rgba(255,240,120,0.9); border-left: 1px solid rgba(255,240,120,0.6);
                                border-right: 1px solid rgba(120,70,0,0.5); border-bottom: 1px solid rgba(120,70,0,0.5);
                                box-shadow: 0 1px 0 rgba(255,255,255,0.35) inset, 0 -1px 0 rgba(0,0,0,0.3) inset, 2px 4px 12px rgba(245,158,11,0.55), 0 2px 4px rgba(0,0,0,0.6), 4px 6px 16px rgba(0,0,0,0.4);
                                transform: translateZ(6px); text-shadow: 0 1px 0 rgba(255,255,255,0.4);">
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.85"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                APHIM STUDIO
                            </span>

                            <!-- Quality Badge — Glass Blue -->
                            <span style="
                                display: inline-flex; align-items: center; gap: 4px;
                                background: rgba(15,20,40,0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                                border: 1px solid rgba(99,179,237,0.5); color: #93c5fd; font-weight: 800; font-size: 9px;
                                letter-spacing: 1.2px; text-transform: uppercase; padding: 3.5px 9px; border-radius: 4px;
                                box-shadow: 0 0 12px rgba(96,165,250,0.3), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(147,197,253,0.15);
                                transform: translateZ(4px);">
                                <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                                ${quality}
                            </span>

                            <!-- Sub/Dub Badge — Glass Purple -->
                            <span style="
                                display: inline-flex; align-items: center; gap: 4px;
                                background: rgba(40,15,65,0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                                border: 1px solid rgba(168,85,247,0.55); color: #d8b4fe; font-weight: 800; font-size: 9px;
                                letter-spacing: 1.2px; text-transform: uppercase; padding: 3.5px 9px; border-radius: 4px;
                                box-shadow: 0 0 12px rgba(168,85,247,0.35), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(216,180,254,0.12);
                                transform: translateZ(4px);">
                                ${lang}
                            </span>

                        </div>

                        <!-- Row 2: Movie Title + Episode badge (3D elevated) -->
                        <div style="transform: translateZ(10px); display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            
                            <!-- Movie Title — 3D Gold Gradient Text -->
                            <h3 class="player-movie-title" style="
                                margin: 0; padding: 0;
                                font-size: clamp(16px, 2.2vw, 30px); font-weight: 900; letter-spacing: -0.4px; line-height: 1.15;
                                background: linear-gradient(135deg, #ffffff 0%, #fde68a 35%, #fbbf24 65%, #ffffff 100%);
                                -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
                                filter: drop-shadow(0 2px 16px rgba(251,191,36,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.9));
                                max-width: min(70vw, 650px);
                                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${movieName}
                            </h3>

                            ${epName ? `
                            <!-- Episode Badge — 3D Amber/Red shimmer -->
                            <span class="badge-ep-name" style="
                                display: inline-flex; align-items: center; align-self: center; flex-shrink: 0;
                                background: linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(245,158,11,0.35) 100%);
                                border: 1px solid rgba(245,158,11,0.7);
                                color: #fbbf24; font-weight: 900; font-size: clamp(10px, 1.1vw, 13px);
                                padding: 4px 11px; border-radius: 5px; white-space: nowrap;
                                box-shadow: 0 0 10px rgba(251,191,36,0.3), 0 2px 6px rgba(0,0,0,0.5);
                                text-shadow: 0 0 8px rgba(251,191,36,0.7);
                                line-height: 1; vertical-align: middle;">
                                ${epName}
                            </span>
                            ` : ''}

                        </div>

                    </div><!-- /3d-card -->
                </div><!-- /perspective -->

            </div><!-- /player-overlay-meta -->

        </div>
    `;

    // 🎬 Step 4 — Initialize Lottie Animation (Load from /icons/play.json)
    if (typeof lottie !== 'undefined') {
        const anim = lottie.loadAnimation({
            container: document.getElementById('play-btn'),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            path: '/icons/play.json'
        });

        const placeholder = document.getElementById('playerPlaceholder');
        if (placeholder) {
            placeholder.addEventListener('mouseenter', () => anim.play());
            placeholder.addEventListener('mouseleave', () => anim.stop());
        }
    }

    if (currentMovie) {
        const bgUrl = (typeof movieAPI !== 'undefined' && movieAPI.getImageURL)
            ? movieAPI.getImageURL(currentMovie.thumb_url || currentMovie.poster_url, 1200, 90, true)
            : (currentMovie.thumb_url || currentMovie.poster_url);
        if (bgUrl) {
            const bgs = document.querySelectorAll('#playerPlaceholder .bg-cover');
            bgs.forEach(bg => {
                bg.style.backgroundImage = `url('${bgUrl}')`;
            });
        }
    }
}

// ⚡ Tự động nhận diện phiên xem / tải lại trang (Auto-Resume Bypass Ads & Instant Resume)
function shouldAutoResumePlayback(movie, episode) {
    if (!movie || !movie.slug) return false;
    const epSlug = (episode && episode.slug) ? episode.slug : '';

    // 1. Người dùng đang trong phiên xem trước đó và vừa bấm tải lại trang (F5 / Reload)
    const isActivelyWatching = sessionStorage.getItem('aphim_active_playing_' + movie.slug) === 'true';

    // 2. Người dùng có tiến độ xem phim đã lưu (> 5s và chưa hết phim)
    let hasProgress = false;
    try {
        const progress = (typeof userService !== 'undefined' && userService.getWatchProgress)
            ? userService.getWatchProgress(movie.slug, epSlug)
            : null;
        hasProgress = Boolean(progress && progress.currentTime > 5 && !progress.completed &&
            (!progress.duration || (progress.duration - progress.currentTime > 15 && (progress.currentTime / progress.duration) < 0.95)));
    } catch (e) {}

    // 3. Người dùng đã xem qua quảng cáo TVC trong phiên này (trong vòng 30 phút)
    let hasRecentTvcSeen = false;
    try {
        const tvcSeenTime = sessionStorage.getItem('aphim_tvc_seen_' + movie.slug);
        hasRecentTvcSeen = Boolean(tvcSeenTime && (Date.now() - parseInt(tvcSeenTime, 10) < 30 * 60 * 1000));
    } catch (e) {}

    return Boolean(isActivelyWatching || hasProgress || hasRecentTvcSeen);
}

function handleInitialPlayerMount(episode) {
    if (shouldAutoResumePlayback(currentMovie, episode)) {
        console.log('⚡ [Auto-Resume] Phát hiện người dùng đang xem phim / tải lại trang -> Tự động phát tiếp tức thì tại vị trí đã xem, không cần xem lại quảng cáo!');
        window._isTvcActive = false;
        initializePlayer(episode);
    } else {
        renderPlayerPlaceholder(episode);
    }
}

// ── 🎬 DIRECT INSTANT MOVIE PLAYBACK CONTROLLER (ZERO ADS) ─
window._isTvcActive = false;

function playTvcPreroll(onFinished) {
    window._isTvcActive = false;
    const placeholder = document.getElementById('playerPlaceholder');
    if (placeholder) placeholder.style.display = 'none';

    const mainVideo = document.getElementById('videoPlayer') || window.player;
    if (mainVideo && typeof mainVideo.play === 'function') {
        mainVideo.muted = false;
        mainVideo.volume = 0.9;
        mainVideo.play().catch(() => {});
    } else {
        initializePlayer(currentEpisode);
    }
    if (typeof onFinished === 'function') onFinished();
}

// ⚡ Global callback: Bấm Play là phát phim trực tiếp tức thì 0ms, không quảng cáo
window.startActualPlayback = function () {
    window._isTvcActive = false;
    const placeholder = document.getElementById('playerPlaceholder');
    if (placeholder) placeholder.style.display = 'none';

    try {
        initializePlayer(currentEpisode);
    } catch (e) {
        console.warn('Lỗi khởi tạo player:', e);
    }
};

function getLangTag(server, movie) {
    const raw = (server.original_server_name || server.server_name || '').toLowerCase();
    if (raw.includes('song ngữ') || raw.includes('song ngu') || raw.includes('bilingual')) return 'Song Ngữ';
    if (raw.includes('thuyết minh') || raw.includes('thuyet minh')) return 'Thuyết Minh';
    if (raw.includes('lồng tiếng') || raw.includes('long tieng')) return 'Lồng Tiếng';
    if (raw.includes('vietsub')) return 'Vietsub';
    if (movie && movie.lang) {
        const mLang = movie.lang.toLowerCase();
        if (mLang.includes('song ngữ') || mLang.includes('song ngu')) return 'Song Ngữ';
        if (mLang.includes('thuyết minh') || mLang.includes('thuyet minh')) return 'Thuyết Minh';
        if (mLang.includes('lồng tiếng') || mLang.includes('long tieng')) return 'Lồng Tiếng';
    }
    return 'Vietsub';
}

// Render server list grouped by language (Exact Screenshot 1 design & color fill)
// ⚡ Markup được sinh bởi /js/watch-early-render.js (ApWatchEarlyRender.renderServers):
//    file đó được nạp bằng `defer` TRƯỚC watch.js nên luôn sẵn sàng ở đây, đồng thời
//    cho phép trang render danh sách máy chủ NGAY khi HTML parse xong (không phải chờ
//    hls.js / lottie / watch.js). Giữ 1 nguồn markup duy nhất ⇒ không lo lệch UI.
function renderServerList(episodes) {
    if (!episodes || episodes.length === 0) return;

    if (window.ApWatchEarlyRender && typeof window.ApWatchEarlyRender.renderServers === 'function') {
        window.ApWatchEarlyRender.renderServers(episodes, currentServerIndex, currentMovie);
        return;
    }

    __legacyRenderServerList_UNUSED(episodes);
}

// eslint-disable-next-line no-unused-vars
function __legacyRenderServerList_UNUSED(episodes) {
    if (!episodes || episodes.length === 0) return;

    const container = document.getElementById('server-list');
    if (!container) return;

    episodes.forEach((s, idx) => {
        if (!s.original_server_name) s.original_server_name = s.server_name;
    });

    // Group servers by language category
    const groups = {};
    episodes.forEach((server, index) => {
        const langTag = getLangTag(server, currentMovie);
        let category = 'Vietsub';
        if (langTag === 'Song Ngữ') {
            category = 'Song Ngữ';
        } else if (langTag.toLowerCase().includes('thuyết minh') || langTag.toLowerCase().includes('thuyet minh')) {
            category = 'Thuyết Minh';
        } else if (langTag.toLowerCase().includes('lồng tiếng') || langTag.toLowerCase().includes('long tieng')) {
            category = 'Lồng Tiếng';
        }

        if (!groups[category]) groups[category] = [];
        groups[category].push({ server, index, langTag });
    });

    // Render HTML for each group row
    const groupOrder = ['Song Ngữ', 'Vietsub', 'Thuyết Minh', 'Lồng Tiếng', 'Khác'];
    let html = '';

    groupOrder.forEach(category => {
        const items = groups[category];
        if (!items || items.length === 0) return;

        let categoryIcon = category === 'Song Ngữ'
            ? '<span style="background: rgba(168,85,247,0.2); color: #c084fc; font-size: 11px; font-weight: 900; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px; border: 1px solid rgba(168,85,247,0.35); display: inline-flex; align-items: center; justify-content: center;">文A</span>'
            : category === 'Vietsub'
                ? '<span style="background: rgba(255,255,255,0.12); color: #e2e8f0; font-size: 10px; font-weight: 900; padding: 2px 5px; border-radius: 4px; letter-spacing: 0.5px;">CC</span>'
                : category === 'Thuyết Minh'
                    ? '<span style="font-size: 13px; line-height: 1;">🎙️</span>'
                    : '<span style="font-size: 13px; line-height: 1;">🗣️</span>';

        const buttonsInGroup = items.map(({ server, index }) => {
            const isActive = index === currentServerIndex;
            const totalEps = server.server_data ? server.server_data.length : 0;
            const epText = totalEps === 1 ? 'Full' : `${totalEps} tập`;

            let isSongNgu = category === 'Song Ngữ';
            let isFirstInGroup = items[0].index === index;
            let groupSubIndex = items.findIndex(item => item.index === index);
            let rawTitle = server.original_server_name || server.server_name || '';
            let displayTitle = isSongNgu
                ? (rawTitle.toLowerCase().includes('song ngữ') ? rawTitle : (isFirstInGroup ? 'Song Ngữ' : `Song Ngữ #${groupSubIndex}`))
                : (isFirstInGroup ? category : `${category} #${groupSubIndex}`);
            let catSlug = isSongNgu ? 'song-ngu' : (category === 'Vietsub' ? 'vietsub' : category === 'Thuyết Minh' ? 'thuyet-minh' : 'long-tieng');

            if (isActive) {
                if (isSongNgu) {
                    return `
                        <button onclick="changeServer(${index})"
                            data-category="${category}"
                            style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); border: 1px solid #c084fc; color: #ffffff; font-weight: 800; border-radius: 7px; padding: 4px 10px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 0 14px rgba(168,85,247,0.5); transition: all 0.2s;"
                            class="select-none server-tab-btn active server-cat-song-ngu">
                            <span style="font-weight: 900; font-size: 12px; color: #ffffff;">文A</span>
                            <span class="server-tab-title" style="font-weight: 800; font-size: 12.5px; color: #ffffff;">${displayTitle}</span>
                            <span class="server-tab-badge" style="background: #ffffff; color: #581c87; font-weight: 800; font-size: 11px; padding: 1px 7px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; min-width: 20px;">${totalEps}</span>
                        </button>
                    `;
                }

                // Active Pill (Dark Mode Base Colors)
                let activeBg = category === 'Vietsub' ? '#9bb0ff' : category === 'Thuyết Minh' ? '#d8b4fe' : '#86efac';
                let activeText = category === 'Vietsub' ? '#0a0c10' : category === 'Thuyết Minh' ? '#2e1065' : '#052e16';
                let dotColor = category === 'Vietsub' ? '#2563eb' : category === 'Thuyết Minh' ? '#9333ea' : '#16a34a';

                return `
                    <button onclick="changeServer(${index})"
                        data-category="${category}"
                        style="background: ${activeBg}; border: none; color: ${activeText}; font-weight: 800; border-radius: 6px; padding: 3.5px 8.5px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;"
                        class="select-none server-tab-btn active server-cat-${catSlug}">
                        <span class="server-tab-title" style="font-weight: 800; font-size: 12.5px; color: ${activeText};">${displayTitle}</span>
                        <span class="server-tab-badge" style="background: rgba(0, 0, 0, 0.15); font-weight: 800; font-size: 11px; padding: 1px 6.5px; border-radius: 10px; display: inline-flex; align-items: center; gap: 3.5px;">
                            <span class="server-tab-dot" style="width: 6px; height: 6px; min-width: 6px; min-height: 6px; max-width: 6px; max-height: 6px; border-radius: 50%; background: ${dotColor}; display: inline-block; flex-shrink: 0; border: none;"></span>
                            <span class="server-tab-count">${epText}</span>
                        </span>
                    </button>
                `;
            } else {
                if (isSongNgu) {
                    return `
                        <button onclick="changeServer(${index})"
                            data-category="${category}"
                            style="background: #111827; border: 1px solid rgba(255, 255, 255, 0.25); color: #f8fafc; font-weight: 700; border-radius: 7px; padding: 4px 10px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all 0.2s;"
                            class="hover:brightness-125 select-none server-tab-btn server-cat-song-ngu">
                            <span style="font-weight: 900; font-size: 12px; color: #cbd5e1;">文A</span>
                            <span class="server-tab-title" style="color: #f8fafc; font-weight: 700; font-size: 12.5px;">${displayTitle}</span>
                            <span class="server-tab-badge" style="background: #ffffff; color: #000000; font-weight: 800; font-size: 11px; padding: 1px 7px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; min-width: 20px;">${totalEps}</span>
                        </button>
                    `;
                }

                // Inactive Pill (Dark Mode Base Colors)
                let inactiveBg = category === 'Vietsub' ? '#1e293b' : category === 'Thuyết Minh' ? '#2c2236' : '#143126';
                let inactiveText = category === 'Vietsub' ? '#94a3b8' : category === 'Thuyết Minh' ? '#e9d5ff' : '#6ee7b7';
                let badgeBg = category === 'Vietsub' ? '#0f172a' : category === 'Thuyết Minh' ? '#3d2552' : '#0d231b';
                let dotColor = category === 'Vietsub' ? '#64748b' : category === 'Thuyết Minh' ? '#c084fc' : '#34d399';

                return `
                    <button onclick="changeServer(${index})"
                        data-category="${category}"
                        style="background: ${inactiveBg}; border: none; color: ${inactiveText}; font-weight: 700; border-radius: 6px; padding: 3.5px 8.5px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;"
                        class="hover:brightness-125 select-none server-tab-btn server-cat-${catSlug}">
                        <span class="server-tab-title" style="color: ${inactiveText}; font-weight: 700; font-size: 12.5px;">${displayTitle}</span>
                        <span class="server-tab-badge" style="background: ${badgeBg}; color: ${inactiveText}; font-weight: 700; font-size: 11px; padding: 1px 6.5px; border-radius: 10px; display: inline-flex; align-items: center; gap: 3.5px;">
                            <span class="server-tab-dot" style="width: 6px; height: 6px; min-width: 6px; min-height: 6px; max-width: 6px; max-height: 6px; border-radius: 50%; background: ${dotColor}; display: inline-block; flex-shrink: 0; border: none;"></span>
                            <span class="server-tab-count">${epText}</span>
                        </span>
                    </button>
                `;
            }
        }).join('');

        html += `
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;" class="server-group-row">
                <div style="display: flex; align-items: center; gap: 5px; color: #e2e8f0; font-weight: 700; font-size: 13px; min-width: 76px; user-select: none;" class="server-group-label">
                    ${categoryIcon}
                    <span>${category}</span>
                </div>
                <div class="server-buttons-wrap" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${buttonsInGroup}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    container.className = "w-full space-y-2";
}

// Toggle Rút gọn episodes grid view
window.toggleRutGonEpisodes = function (isRutGon) {
    const container = document.getElementById('episode-list');
    if (!container) return;
    if (isRutGon) {
        container.style.maxHeight = '110px';
        container.style.overflowY = 'auto';
    } else {
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';
    }
};

window.changeServer = function (index) {
    if (!currentMovie || !currentMovie.episodes || index < 0 || index >= currentMovie.episodes.length) return;
    if (index === currentServerIndex) return;

    currentServerIndex = index;
    window.currentServerIndex = index;
    window.requestedServerIndex = index;

    // Khi người dùng chủ động chọn server, xóa vết các server lỗi trước đó để thử lại
    if (window._failedServersForEpisode) {
        window._failedServersForEpisode.clear();
    }

    // Lưu máy chủ người dùng chọn (cả type, name và index) vào localStorage để khi tải lại không bị nhảy
    try {
        if (currentMovie && currentMovie.slug) {
            saveServerPreference(currentMovie.slug, index, currentMovie.episodes[index]);
        }
    } catch (e) { }

    // Tìm tập tương ứng bên server mới nếu có (dựa theo tên tập)
    const newServerData = currentMovie.episodes[currentServerIndex].server_data;
    if (currentEpisode) {
        const matchingEp = newServerData.find(ep => ep.name === currentEpisode.name);
        if (matchingEp) {
            currentEpisode = matchingEp;
        } else {
            // Nếu không có tập cùng tên, lấy tập đầu tiên
            currentEpisode = newServerData[0];
        }
    } else {
        currentEpisode = newServerData[0];
    }

    // Cập nhật URL chuẩn SEO với biến thể ngôn ngữ
    updateWatchUrlState(currentMovie, currentEpisode, currentServerIndex);

    renderServerList(currentMovie.episodes);
    renderEpisodeList(currentMovie.episodes);

    // Nếu đang xem thì tự động đổi luồng video
    if (player && !player.paused) {
        showSeekOverlay(`Đang tải máy chủ: ${currentMovie.episodes[index].server_name}...`, true);
        setTimeout(() => {
            initializePlayer(currentEpisode);
        }, 300);
    } else {
        initializePlayer(currentEpisode);
    }
};

// Biến toàn cục cho search/sort
window.episodeSearchTerm = window.episodeSearchTerm || '';
window.episodeSortOrder = window.episodeSortOrder || 'asc';

// Render episode list
function renderEpisodeList(episodes) {
    if (!episodes || episodes.length === 0) return;

    renderServerList(episodes); // Gọi kèm renderServerList để cập nhật UI Máy chủ

    const container = document.getElementById('episode-list') || document.querySelector('.grid.grid-cols-2');
    if (!container) return;

    const serverData = episodes[currentServerIndex]?.server_data || episodes[0].server_data;

    // Update dynamic episode count indicator
    const episodeCountEl = document.getElementById('episode-count');
    if (episodeCountEl) {
        episodeCountEl.textContent = `(${serverData.length} TẬP)`;
    }

    // --- SEARCH & SORT LOGIC ---
    const searchContainer = document.getElementById('episode-search-container');
    if (searchContainer) {
        if (serverData.length > 0) {
            searchContainer.style.display = 'flex';
        } else {
            searchContainer.style.display = 'none';
        }
    }

    let displayEpisodes = [...serverData];
    if (window.episodeSearchTerm) {
        const term = window.episodeSearchTerm.toLowerCase();
        displayEpisodes = displayEpisodes.filter(ep => ep.name.toLowerCase().includes(term));
    }
    if (window.episodeSortOrder === 'desc') {
        displayEpisodes.reverse();
    }

    container.innerHTML = displayEpisodes.map(ep => {
        const isActive = currentEpisode && ep.slug.replace(/^tap-/, '') === currentEpisode.slug.replace(/^tap-/, '');

        let epLabel = ep.name.trim();
        if (epLabel.toLowerCase() === 'full' || epLabel.toLowerCase() === 'tập full') {
            epLabel = 'Tập FULL';
        } else if (!isNaN(epLabel)) {
            epLabel = `Tập ${epLabel}`;
        } else if (!epLabel.toLowerCase().startsWith('tập')) {
            epLabel = `Tập ${epLabel}`;
        }

        if (isActive) {
            return `
                <button type="button" onclick="changeEpisode('${ep.slug}')"
                    style="background-color: #fcd576; color: #000000; font-weight: 800; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13.5px; min-height: 38px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(252, 211, 118, 0.3); text-decoration: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none;"
                    class="active hover:brightness-105 transition-all w-full">
                    <span>${epLabel}</span>
                </button>
            `;
        } else {
            return `
                <button type="button" onclick="changeEpisode('${ep.slug}')"
                    style="background-color: #202332; color: #e2e8f0; font-weight: 600; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 8px 14px; font-size: 13.5px; min-height: 38px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none;"
                    class="hover:bg-[#2a2e42] hover:text-white transition-all w-full">
                    <span>${epLabel}</span>
                </button>
            `;
        }
    }).join('');

    container.className = "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 w-full transition-all duration-300";

    // Dynamically update under-player control bar navigation buttons
    if (typeof updateEpisodeNavButtons === 'function') {
        updateEpisodeNavButtons();
    }

    // ⚡ Touch Drag vs Click Safety Protection on Mobile:
    // Ngăn chặn 100% tình trạng vuốt/lướt danh sách tập bị kích hoạt nhầm sự kiện click vào tập phim & giữ cuộn mượt 60-120fps
    if (container && !container.hasAttribute('data-touch-guard-bound')) {
        container.setAttribute('data-touch-guard-bound', 'true');
        let touchStartY = 0;
        let touchStartX = 0;
        let isTouchDragging = false;

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
                isTouchDragging = false;
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const dy = Math.abs(e.touches[0].clientY - touchStartY);
                const dx = Math.abs(e.touches[0].clientX - touchStartX);
                if (dy > 14 || dx > 14) {
                    isTouchDragging = true;
                }
            }
        }, { passive: true });

        container.addEventListener('click', (e) => {
            if (isTouchDragging) {
                e.preventDefault();
                e.stopImmediatePropagation();
                isTouchDragging = false;
                return;
            }
        }, true);
    }

    // Automatically scroll the active episode into view ONLY inside its parent container (Without jumping the window)
    setTimeout(() => {
        const activeBtn = container.querySelector('button.active');
        if (activeBtn && container) {
            container.scrollTop = activeBtn.offsetTop - container.offsetTop - (container.clientHeight / 2) + (activeBtn.clientHeight / 2);
        }
    }, 100);
}

// Initialize video player
function initializePlayer(episode) {
    // Guard: nếu đang trong quá trình khởi tạo, bỏ qua lần gọi này
    if (_isInitializingPlayer) {
        console.warn('⚠️ initializePlayer đang chạy, bỏ qua lần gọi trùng lặp.');
        return;
    }
    _isInitializingPlayer = true;
    setTimeout(() => { _isInitializingPlayer = false; }, 5000);

    console.log('🎥 Initializing ArtPlayer:', episode?.name || 'Tập phim');

    if (!episode) {
        console.error('❌ No episode provided');
        showError('Không tìm thấy tập phim');
        return;
    }

    // Check if admin has set a custom link in localStorage
    const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');
    const customLink = movieLinks[currentMovie.slug];

    let videoUrl = customLink || episode.link_m3u8 || episode.link_embed;

    if (!videoUrl) {
        console.warn('⚠️ Tập hiện tại thiếu link phát, đang tự động quét các server khác...', episode);
        if (currentMovie && currentMovie.episodes && currentMovie.episodes.length > 0) {
            for (let sIdx = 0; sIdx < currentMovie.episodes.length; sIdx++) {
                const s = currentMovie.episodes[sIdx];
                const altEp = (s.server_data || []).find(e => {
                    const matchName = e.name && episode.name && e.name.toLowerCase() === episode.name.toLowerCase();
                    const matchSlug = e.slug && episode.slug && e.slug.replace(/^tap-/, '') === episode.slug.replace(/^tap-/, '');
                    return (matchName || matchSlug) && Boolean(e.link_m3u8 || e.link_embed);
                }) || (s.server_data || []).find(e => Boolean(e.link_m3u8 || e.link_embed));

                if (altEp && (altEp.link_m3u8 || altEp.link_embed)) {
                    console.log(`✅ Đã tìm thấy luồng phát hợp lệ từ ${s.server_name}!`);
                    _isInitializingPlayer = false;
                    currentServerIndex = sIdx;
                    currentEpisode = altEp;
                    renderServerList(currentMovie.episodes);
                    renderEpisodeList(currentMovie.episodes);
                    initializePlayer(altEp);
                    return;
                }
            }
        }

        console.error('❌ No video link found in episode:', episode);
        showError('Không tìm thấy link phim. Vui lòng liên hệ admin để cập nhật link.');
        return;
    }

    // Auto upgrade http to https to prevent Mixed Content security blocking on mobile browsers
    if (videoUrl.startsWith('http://')) {
        videoUrl = videoUrl.replace('http://', 'https://');
        console.log('🔒 Upgraded video URL to HTTPS');
    }

    // Log an toàn (không để lộ URL lưu trữ đám mây gốc)
    if (videoUrl.includes('/api/stream/')) {
        console.log('🔗 [Secure Gateway Stream]:', videoUrl);
    } else {
        console.log('🔗 [Stream Mode Active]');
    }
    if (customLink) {
        console.log('✅ Using custom link from admin');
    }

    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) {
        console.error('❌ Player container not found');
        return;
    }

    // Load watch progress
    const progress = userService.getWatchProgress(currentMovie.slug, episode.slug);

    const isEmbed = !episode.link_m3u8 && episode.link_embed;

    // ── CASE 1: Nguồn phát Iframe (Embed) ──────────────────────────────────
    if (isEmbed) {
        if (window.artInstance) {
            try { window.artInstance.destroy(true); } catch (e) { }
            window.artInstance = null;
        }

        playerContainer.innerHTML = `
            <iframe id="videoIframe" 
                src="${videoUrl}" 
                class="w-full h-full bg-black border-0" 
                allowfullscreen 
                allow="autoplay; fullscreen">
            </iframe>
        `;

        // Mock player to prevent errors in other scripts
        window.player = {
            currentTime: 0,
            duration: 0,
            paused: false,
            play: async () => { },
            pause: () => { },
            addEventListener: () => { },
            removeEventListener: () => { },
            canPlayType: () => false,
            requestFullscreen: async () => {
                const iframe = document.getElementById('videoIframe');
                if (iframe && iframe.requestFullscreen) iframe.requestFullscreen();
            }
        };

        const mobCtrl = document.getElementById('mob-player-ctrl');
        if (mobCtrl) mobCtrl.style.display = 'none';
        _isInitializingPlayer = false;
        return;
    }

    // ── CASE 2: Nguồn phát Video HLS m3u8 (Hybrid Native Core + High-End Custom Controls) ───────
    if (window.artInstance) {
        try { window.artInstance.destroy(true); } catch (e) { }
        window.artInstance = null;
    }

    const bgUrl = (typeof movieAPI !== 'undefined' && movieAPI.getImageURL)
        ? movieAPI.getImageURL(currentMovie.thumb_url || currentMovie.poster_url, 1200, 90, true)
        : (currentMovie.thumb_url || currentMovie.poster_url || '');

    // Format time helper (00:00 or 00:00:00)
    function formatPlayerTime(seconds, forceHours) {
        if (isNaN(seconds) || seconds < 0) return forceHours ? '00:00:00' : '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0 || forceHours) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // Render 100% Hardware-Accelerated Native Video with Original High-Contrast Pure White Toolset
    playerContainer.innerHTML = `
        <div id="aphim-player-wrapper" class="relative w-full h-full group/player select-none overflow-hidden bg-black flex items-center justify-center">
            <!-- 100% Direct GPU Hardware Decoded Native Video -->
            <video id="videoPlayer" 
                class="w-full h-full object-contain bg-black block" 
                playsinline 
                preload="auto"
                poster="${bgUrl}">
                Trình duyệt của bạn không hỗ trợ video.
            </video>

            <!-- Dual Subtitles Overlay (Vietnamese Top White + Korean Bottom Yellow) -->
            <div id="aphim-dual-subtitles-overlay" class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end items-center px-4 transition-all duration-200">
                <div id="aphim-sub-top" class="text-center font-bold mb-1 leading-snug tracking-wide" style="display: none; color: #ffffff; font-size: clamp(17px, 2.3vw, 26px); -webkit-text-stroke: 2.2px #000000; paint-order: stroke fill; text-shadow: 0 0 2px #000000, 0 2px 4px rgba(0,0,0,0.95); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 90%; letter-spacing: 0.2px;"></div>
                <div id="aphim-sub-bottom" class="text-center font-bold leading-snug tracking-wide" style="display: none; color: #ffd215; font-size: clamp(16px, 2.1vw, 24px); -webkit-text-stroke: 2px #000000; paint-order: stroke fill; text-shadow: 0 0 2px #000000, 0 2px 4px rgba(0,0,0,0.95); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 90%; letter-spacing: 0.2px;"></div>
            </div>

            <!-- Clickable Center Video Zone (Tap/Click to Play/Pause) -->
            <div id="aphim-clickzone" class="absolute inset-0 z-10 cursor-pointer"></div>

            <!-- Center Animated Play/Pause Indicator -->
            <div id="aphim-center-indicator">
                <span class="material-icons-round" id="aphim-center-icon">play_arrow</span>
            </div>

            <!-- Bottom Floating Control Bar (Original Layout, Pure White Visibility) -->
            <div id="aphim-controls" class="absolute bottom-0 left-0 right-0 z-20 flex flex-col justify-end px-3.5 sm:px-6 pb-4 sm:pb-6 pt-16 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 opacity-100">
                
                <!-- Row 1: Full-Width Interactive Scrubbing Timeline -->
                <div id="aphim-timeline-container" class="relative w-full h-5 flex items-center cursor-pointer group/timeline py-1 mb-2.5 sm:mb-3 select-none">
                    <!-- Background Rail -->
                    <div id="aphim-timeline-rail" class="relative w-full h-[4px] group-hover/timeline:h-[6px] bg-white/30 rounded-full overflow-hidden transition-all duration-150">
                        <!-- Buffer Bar -->
                        <div id="aphim-buffer-bar" class="absolute top-0 bottom-0 left-0 bg-white/45 rounded-full w-0 transition-all duration-150"></div>
                        <!-- Played Progress Bar (Solid Gold Gradient) -->
                        <div id="aphim-progress-bar" class="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#f59e0b] to-[#fcd576] rounded-full w-0 shadow-[0_0_10px_rgba(252,211,118,0.9)]"></div>
                    </div>
                    <!-- Thumb Scrubber Dot / Capsule (Bright White Pill) -->
                    <div id="aphim-scrubber-dot" class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-[0_0_8px_rgba(0,0,0,0.85)] pointer-events-none transition-transform duration-100 scale-90 group-hover/timeline:scale-125" style="left: 0%;"></div>
                    <!-- Hover Time Tooltip -->
                    <div id="aphim-hover-time" class="absolute bottom-6 -translate-x-1/2 px-2 py-0.5 rounded bg-black/95 text-white text-[11px] font-mono font-bold pointer-events-none opacity-0 transition-opacity duration-150 backdrop-blur-md border border-white/25 shadow-2xl">00:00</div>
                </div>

                <!-- Row 2: Bottom Control Buttons (Material Standard High-Contrast Layout) -->
                <div id="aphim-row-bottom" class="flex items-center justify-between gap-1 sm:gap-2 w-full text-white">
                    
                    <!-- Left Group: Play/Pause, Rewind 10s (replay_10), Forward 10s (forward_10), Volume Speaker + Slider, Time (Current / Total) -->
                    <div id="aphim-left-group" class="flex items-center gap-0.5 sm:gap-2 min-w-0">
                        <!-- Play/Pause Button -->
                        <button type="button" id="aphim-btn-play" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white flex-shrink-0" title="Phát / Tạm dừng (Space)">
                            <span class="material-icons-round" id="aphim-icon-play">play_arrow</span>
                        </button>

                        <!-- Rewind 10s (replay_10) -->
                        <button type="button" id="aphim-btn-rewind" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white flex-shrink-0" title="Lùi 10s (← / J)">
                            <span class="material-icons-round">replay_10</span>
                        </button>

                        <!-- Forward 10s (forward_10) -->
                        <button type="button" id="aphim-btn-forward" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white flex-shrink-0" title="Tới 10s (→ / L)">
                            <span class="material-icons-round">forward_10</span>
                        </button>

                        <!-- Volume Button & Slider -->
                        <div id="aphim-volume-wrapper" class="flex items-center group/vol relative ml-0.5 flex-shrink-0">
                            <button type="button" id="aphim-btn-volume" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white flex-shrink-0" title="Âm lượng (M)">
                                <span class="material-icons-round" id="aphim-icon-volume">volume_up</span>
                            </button>
                            <div id="aphim-volume-slider-box" class="w-12 sm:w-24 transition-all duration-200 flex items-center pl-1">
                                <input type="range" id="aphim-volume-slider" min="0" max="1" step="0.01" value="0.9" class="w-10 sm:w-20 h-1.5 bg-white/40 rounded-lg appearance-none cursor-pointer accent-[#fcd576]">
                            </div>
                        </div>

                        <!-- Current Time / Duration (Clean Modern Sans-Serif) -->
                        <div id="aphim-time-wrapper" class="flex-shrink-0">
                            <span id="aphim-time-current">00:00</span>
                            <span class="aphim-time-divider">/</span>
                            <span id="aphim-time-duration">00:00</span>
                        </div>
                    </div>

                    <!-- Right Group: Next Episode, Speed Pill [1x], PiP, Theater Mode, Fullscreen -->
                    <div id="aphim-right-group" class="flex items-center gap-1 sm:gap-2.5 flex-shrink-0">
                        <!-- Next Episode Button -->
                        <button type="button" id="aphim-btn-next" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white flex-shrink-0" title="Tập tiếp theo (N)">
                            <span class="material-icons-round">skip_next</span>
                        </button>

                        <!-- Nguồn âm thanh / Song Ngữ Button (Matching Image 2) -->
                        <div id="aphim-audio-wrapper" class="relative inline-flex items-center">
                            <button type="button" id="aphim-btn-audio" class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white" title="Nguồn âm thanh / Phụ đề Song ngữ">
                                <svg viewBox="0 0 24 24" class="aphim-btn-icon" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="22" />
                                </svg>
                                <span id="aphim-song-badge" style="
                                    position: absolute;
                                    top: 1px;
                                    right: -2px;
                                    background: #ffffff;
                                    color: #000000;
                                    font-size: 8px;
                                    font-weight: 800;
                                    line-height: 1;
                                    padding: 1.5px 3.5px;
                                    border-radius: 4px;
                                    letter-spacing: -0.2px;
                                    box-shadow: 0 1px 3px rgba(0,0,0,0.6);
                                    pointer-events: none;
                                    font-family: system-ui, -apple-system, sans-serif;
                                ">Song</span>
                            </button>

                            <!-- Nguồn âm thanh Flyout Menu (Đồng bộ chuẩn kính mờ trong suốt CÀI ĐẶT) -->
                            <div id="aphim-audio-menu" class="hidden">
                                <div class="aphim-settings-header">
                                    <span>NGUỒN ÂM THANH</span>
                                </div>
                                <div class="aphim-settings-list" id="aphim-audio-options-list">
                                </div>
                            </div>
                        </div>

                        <!-- Settings Button & Multi-Level Flyout Menu (Hexagon Settings) -->
                        <div id="aphim-settings-wrapper" class="relative inline-flex items-center">
                            <button type="button" id="aphim-btn-settings" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white" title="Cài đặt">
                                <svg viewBox="0 0 24 24" class="aphim-btn-icon" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 2.2L20.8 7.3V16.7L12 21.8L3.2 16.7V7.3L12 2.2Z" />
                                    <circle cx="12" cy="12" r="3.5" />
                                </svg>
                            </button>

                            <!-- Multi-level Settings Flyout Menu -->
                            <div id="aphim-settings-menu" class="hidden">
                                <!-- Main Panel -->
                                <div id="aphim-settings-main-panel" class="aphim-settings-panel">
                                    <div class="aphim-settings-header">
                                        <span>CÀI ĐẶT</span>
                                    </div>
                                    <div class="aphim-settings-list">
                                        <!-- Máy chủ -->
                                        <div class="aphim-settings-item" data-target="aphim-panel-server">
                                            <div class="aphim-item-left">
                                                <svg class="aphim-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                    <rect x="2.5" y="4.5" width="19" height="15" rx="3.5"></rect>
                                                    <polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="currentColor"></polygon>
                                                </svg>
                                                <span class="aphim-item-label">Máy chủ</span>
                                            </div>
                                            <div class="aphim-item-right">
                                                <span class="aphim-item-value" id="aphim-val-server">Vietsub</span>
                                                <svg class="aphim-item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                            </div>
                                        </div>

                                        <!-- Tốc độ phát -->
                                        <div class="aphim-settings-item" data-target="aphim-panel-speed">
                                            <div class="aphim-item-left">
                                                <svg class="aphim-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M12 4a8 8 0 0 0-8 8c0 2.2.9 4.2 2.3 5.7M12 4a8 8 0 0 1 8 8c0 2.2-.9 4.2-2.3 5.7"></path>
                                                    <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
                                                    <line x1="12" y1="12" x2="16" y2="9" stroke-width="2"></line>
                                                </svg>
                                                <span class="aphim-item-label">Tốc độ phát</span>
                                            </div>
                                            <div class="aphim-item-right">
                                                <span class="aphim-item-value" id="aphim-val-speed">Bình thường</span>
                                                <svg class="aphim-item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                            </div>
                                        </div>

                                        <!-- Chất lượng -->
                                        <div class="aphim-settings-item" data-target="aphim-panel-quality">
                                            <div class="aphim-item-left">
                                                <svg class="aphim-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                    <rect x="2.5" y="4.5" width="19" height="15" rx="3.5"></rect>
                                                    <polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="currentColor"></polygon>
                                                </svg>
                                                <span class="aphim-item-label">Chất lượng</span>
                                            </div>
                                            <div class="aphim-item-right">
                                                <span class="aphim-item-value" id="aphim-val-quality">Auto</span>
                                                <svg class="aphim-item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                            </div>
                                        </div>

                                        <!-- Tỉ lệ khung hình -->
                                        <div class="aphim-settings-item" data-target="aphim-panel-ratio">
                                            <div class="aphim-item-left">
                                                <svg class="aphim-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                    <rect x="2.5" y="4.5" width="19" height="15" rx="3.5"></rect>
                                                    <polygon points="10 8.5 16 12 10 15.5 10 8.5" fill="currentColor"></polygon>
                                                </svg>
                                                <span class="aphim-item-label">Tỉ lệ khung hình</span>
                                            </div>
                                            <div class="aphim-item-right">
                                                <span class="aphim-item-value" id="aphim-val-ratio">Mặc định</span>
                                                <svg class="aphim-item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Sub-panel: Máy chủ -->
                                <div id="aphim-panel-server" class="aphim-settings-panel aphim-panel-sub hidden">
                                    <div class="aphim-settings-header aphim-sub-header" data-back="main">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="15 18 9 12 15 6"></polyline>
                                        </svg>
                                        <span>Máy chủ</span>
                                    </div>
                                    <div class="aphim-settings-list" id="aphim-server-options-list">
                                    </div>
                                </div>

                                <!-- Sub-panel: Tốc độ phát -->
                                <div id="aphim-panel-speed" class="aphim-settings-panel aphim-panel-sub hidden">
                                    <div class="aphim-settings-header aphim-sub-header" data-back="main">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="15 18 9 12 15 6"></polyline>
                                        </svg>
                                        <span>Tốc độ phát</span>
                                    </div>
                                    <div class="aphim-settings-list" id="aphim-speed-options-list">
                                        <div class="aphim-sub-opt" data-speed="0.5"><span>0.5x</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-speed="0.75"><span>0.75x</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt active" data-speed="1.0"><span>1.0x (Bình thường)</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-speed="1.25"><span>1.25x</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-speed="1.5"><span>1.5x</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-speed="2.0"><span>2.0x</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    </div>
                                </div>

                                <!-- Sub-panel: Chất lượng -->
                                <div id="aphim-panel-quality" class="aphim-settings-panel aphim-panel-sub hidden">
                                    <div class="aphim-settings-header aphim-sub-header" data-back="main">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="15 18 9 12 15 6"></polyline>
                                        </svg>
                                        <span>Chất lượng</span>
                                    </div>
                                    <div class="aphim-settings-list" id="aphim-quality-options-list">
                                        <div class="aphim-sub-opt active" data-quality="-1"><span>Tự động (Auto)</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-quality="1080"><span>1080p Full HD</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-quality="720"><span>720p HD</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-quality="480"><span>480p SD</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-quality="360"><span>360p</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    </div>
                                </div>

                                <!-- Sub-panel: Tỉ lệ khung hình -->
                                <div id="aphim-panel-ratio" class="aphim-settings-panel aphim-panel-sub hidden">
                                    <div class="aphim-settings-header aphim-sub-header" data-back="main">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="15 18 9 12 15 6"></polyline>
                                        </svg>
                                        <span>Tỉ lệ khung hình</span>
                                    </div>
                                    <div class="aphim-settings-list" id="aphim-ratio-options-list">
                                        <div class="aphim-sub-opt active" data-ratio="default"><span>Mặc định (Tự động)</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-ratio="16/9"><span>16:9 (Chuẩn màn ảnh)</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-ratio="4/3"><span>4:3 (Cổ điển)</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-ratio="cover"><span>Tràn màn hình (Cắt viền)</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                        <div class="aphim-sub-opt" data-ratio="stretch"><span>Kéo giãn (Stretch)</span><svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Picture-in-Picture Button -->
                        <button type="button" id="aphim-btn-pip" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white" title="Hình trong hình (PiP)">
                            <svg viewBox="0 0 24 24" class="aphim-btn-icon" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 10V6.8C20 5.25 18.75 4 17.2 4H6.8C5.25 4 4 5.25 4 6.8V16.2C4 17.75 5.25 19 6.8 19H10.5" />
                                <rect x="12.5" y="12.5" width="8" height="6.5" rx="1.6" fill="currentColor" stroke="none" />
                            </svg>
                        </button>

                        <!-- Fullscreen Button -->
                        <button type="button" id="aphim-btn-fs" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:text-[#fcd576] hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center cursor-pointer text-white" title="Toàn màn hình (F)">
                            <span class="material-icons-round aphim-btn-icon" id="aphim-icon-fs">fullscreen</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    player = document.getElementById('videoPlayer');
    window.player = player;
    if (player && window._isTvcActive) {
        player.muted = true;
        player.volume = 0;
    }

    const wrapper = document.getElementById('aphim-player-wrapper');
    const controls = document.getElementById('aphim-controls');
    const btnPlay = document.getElementById('aphim-btn-play');
    const iconPlay = document.getElementById('aphim-icon-play');
    const btnRewind = document.getElementById('aphim-btn-rewind');
    const btnForward = document.getElementById('aphim-btn-forward');
    const btnNext = document.getElementById('aphim-btn-next');
    const btnVolume = document.getElementById('aphim-btn-volume');
    const iconVolume = document.getElementById('aphim-icon-volume');
    const volumeSlider = document.getElementById('aphim-volume-slider');
    const timeCurrent = document.getElementById('aphim-time-current');
    const timeDuration = document.getElementById('aphim-time-duration');
    const timelineContainer = document.getElementById('aphim-timeline-container');
    const bufferBar = document.getElementById('aphim-buffer-bar');
    const progressBar = document.getElementById('aphim-progress-bar');
    const scrubberDot = document.getElementById('aphim-scrubber-dot');
    const hoverTime = document.getElementById('aphim-hover-time');
    const btnSettings = document.getElementById('aphim-btn-settings');
    const settingsMenu = document.getElementById('aphim-settings-menu');
    const btnAudio = document.getElementById('aphim-btn-audio');
    const audioMenu = document.getElementById('aphim-audio-menu');
    const audioOptionsList = document.getElementById('aphim-audio-options-list');
    const valServer = document.getElementById('aphim-val-server');
    const valSpeed = document.getElementById('aphim-val-speed');
    const valQuality = document.getElementById('aphim-val-quality');
    const valRatio = document.getElementById('aphim-val-ratio');
    const serverOptionsList = document.getElementById('aphim-server-options-list');
    const qualityOptionsList = document.getElementById('aphim-quality-options-list');
    const btnPip = document.getElementById('aphim-btn-pip');
    const btnFs = document.getElementById('aphim-btn-fs');
    const iconFs = document.getElementById('aphim-icon-fs');
    const clickzone = document.getElementById('aphim-clickzone');
    const centerIndicator = document.getElementById('aphim-center-indicator');
    const centerIcon = document.getElementById('aphim-center-icon');

    // UI helper: Ripple Seek Overlay Feedback
    function showSeekOverlay(text, isForward, isMobileTouchArc = false) {
        let overlay = document.getElementById('aphim-seek-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'aphim-seek-overlay';
            overlay.className = 'pointer-events-none absolute z-30 flex items-center justify-center transition-all duration-300 opacity-0';
            if (wrapper) wrapper.appendChild(overlay);
        }
        
        // CHỈ khi là cử chỉ Double-tap trên Mobile thì mới vẽ cánh cung mờ ở mép màn hình
        if (isMobileTouchArc && isForward !== undefined) {
            overlay.style.top = '0';
            overlay.style.bottom = '0';
            overlay.style.width = '42%';
            overlay.style.transform = 'none';
            if (isForward) {
                overlay.style.right = '0';
                overlay.style.left = 'auto';
                overlay.style.borderTopLeftRadius = '140px';
                overlay.style.borderBottomLeftRadius = '140px';
                overlay.style.borderTopRightRadius = '0';
                overlay.style.borderBottomRightRadius = '0';
                overlay.style.background = 'radial-gradient(circle at 90% 50%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)';
            } else {
                overlay.style.left = '0';
                overlay.style.right = 'auto';
                overlay.style.borderTopRightRadius = '140px';
                overlay.style.borderBottomRightRadius = '140px';
                overlay.style.borderTopLeftRadius = '0';
                overlay.style.borderBottomLeftRadius = '0';
                overlay.style.background = 'radial-gradient(circle at 10% 50%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)';
            }
            overlay.innerHTML = `
                <div class="aphim-seek-badge aphim-seek-animated">
                    <span class="material-icons-round aphim-seek-icon">${isForward ? 'fast_forward' : 'fast_rewind'}</span>
                    <span class="aphim-seek-text">${text}</span>
                </div>
            `;
        } else {
            // TRÊN DESKTOP HOẶC BẤM NÚT / BÀN PHÍM:
            // Nền HOÀN TOÀN TRONG SUỐT (KHÔNG mờ nền cả một vùng màn hình)
            overlay.style.top = '50%';
            overlay.style.left = '50%';
            overlay.style.bottom = 'auto';
            overlay.style.right = 'auto';
            overlay.style.width = 'auto';
            overlay.style.transform = 'translate(-50%, -50%)';
            overlay.style.borderRadius = '0';
            overlay.style.background = 'transparent';
            overlay.innerHTML = `
                <div class="aphim-seek-badge aphim-seek-animated">
                    ${isForward !== undefined ? `<span class="material-icons-round aphim-seek-icon">${isForward ? 'fast_forward' : 'fast_rewind'}</span>` : ''}
                    <span class="aphim-seek-text">${text}</span>
                </div>
            `;
        }

        overlay.style.opacity = '1';
        clearTimeout(overlay._timer);
        overlay._timer = setTimeout(() => {
            overlay.style.opacity = '0';
        }, 600);
    }

    // UI helper: pulse center indicator
    let centerIndicatorTimer = null;
    function pulseCenterIndicator(isPlay) {
        if (!centerIndicator || !centerIcon) return;
        centerIcon.textContent = isPlay ? 'play_arrow' : 'pause';
        if (centerIndicatorTimer) clearTimeout(centerIndicatorTimer);
        centerIndicator.classList.add('active');
        centerIndicatorTimer = setTimeout(() => {
            centerIndicator.classList.remove('active');
        }, 450);
    }

    // Toggle Play/Pause
    function togglePlayPause() {
        if (player.paused) {
            player.play().catch(e => console.log('Play prevented:', e));
        } else {
            player.pause();
        }
    }

    if (btnPlay) btnPlay.onclick = togglePlayPause;
    if (clickzone) {
        clickzone.onclick = (e) => {
            if (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                return;
            }
            togglePlayPause();
        };
    }

    // Seek 10s with snappy spring rotation feedback (tức thì 0ms, không nghẽn)
    if (btnRewind) {
        btnRewind.onclick = () => {
            const icon = btnRewind.querySelector('.material-icons-round') || btnRewind;
            icon.style.transition = 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)';
            icon.style.transform = 'rotate(-35deg) scale(1.12)';
            setTimeout(() => { icon.style.transform = 'none'; }, 130);
            
            player.currentTime = Math.max(0, player.currentTime - 10);
            showSeekOverlay('-10s', false);
        };
    }
    if (btnForward) {
        btnForward.onclick = () => {
            const icon = btnForward.querySelector('.material-icons-round') || btnForward;
            icon.style.transition = 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)';
            icon.style.transform = 'rotate(35deg) scale(1.12)';
            setTimeout(() => { icon.style.transform = 'none'; }, 130);

            player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
            showSeekOverlay('+10s', true);
        };
    }
    if (btnNext) {
        btnNext.onclick = () => {
            const icon = btnNext.querySelector('.material-icons-round') || btnNext;
            icon.style.transition = 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)';
            icon.style.transform = 'translateX(3px) scale(1.12)';
            setTimeout(() => { icon.style.transform = 'none'; }, 130);
            playNextEpisode();
        };
    }

    // Volume Slider & Mute
    let lastVolume = 0.9;
    function updateVolumeSliderFill(vol) {
        if (!volumeSlider) return;
        const pct = Math.max(0, Math.min(100, (vol * 100))).toFixed(1);
        volumeSlider.style.setProperty('--vol-pct', `${pct}%`);
        volumeSlider.style.background = `linear-gradient(to right, #fcd576 0%, #fcd576 ${pct}%, rgba(255, 255, 255, 0.28) ${pct}%, rgba(255, 255, 255, 0.28) 100%)`;
    }

    function updateVolumeIcon(vol, muted) {
        if (!iconVolume) return;
        if (muted || vol === 0) {
            iconVolume.textContent = 'volume_off';
        } else if (vol < 0.5) {
            iconVolume.textContent = 'volume_down';
        } else {
            iconVolume.textContent = 'volume_up';
        }
        updateVolumeSliderFill(muted ? 0 : vol);
    }

    if (volumeSlider) {
        volumeSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            player.volume = val;
            player.muted = (val === 0);
            updateVolumeIcon(val, player.muted);
        };
    }

    if (btnVolume) {
        btnVolume.onclick = () => {
            if (player.muted || player.volume === 0) {
                player.muted = false;
                player.volume = lastVolume > 0 ? lastVolume : 0.9;
                if (volumeSlider) volumeSlider.value = player.volume;
            } else {
                lastVolume = player.volume;
                player.muted = true;
                if (volumeSlider) volumeSlider.value = 0;
            }
            updateVolumeIcon(player.volume, player.muted);
        };
    }

    // Initialize initial volume slider fill
    updateVolumeSliderFill(player.muted ? 0 : (player.volume !== undefined ? player.volume : 0.9));

    // Timeline Scrubbing & Hover Preview (Ultra-smooth 60/120fps hardware response)
    let isDraggingTimeline = false;
    let wasPlayingBeforeDrag = false;
    let rafScrubId = null;
    let throttledSeekTimer = null;
    let lastDragPct = 0;

    function getTimelinePercentage(e) {
        if (!timelineContainer) return 0;
        const rect = timelineContainer.getBoundingClientRect();
        let clientX = 0;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return pos;
    }

    function renderScrubUI(pct) {
        if (!player || !player.duration) return;
        lastDragPct = pct;
        const targetTime = pct * player.duration;
        const pctStr = `${(pct * 100).toFixed(2)}%`;
        const hasHours = (player.duration >= 3600);
        
        if (progressBar) progressBar.style.width = pctStr;
        if (scrubberDot) scrubberDot.style.left = pctStr;
        if (hoverTime) {
            hoverTime.style.left = pctStr;
            hoverTime.textContent = formatPlayerTime(targetTime, hasHours);
            hoverTime.style.opacity = '1';
        }
        if (timeCurrent) {
            timeCurrent.textContent = formatPlayerTime(targetTime, hasHours);
        }
    }

    function handleScrubStart(e) {
        if (!player || !player.duration || !timelineContainer) return;
        isDraggingTimeline = true;
        wasPlayingBeforeDrag = !player.paused;
        timelineContainer.classList.add('is-scrubbing');
        
        const pct = getTimelinePercentage(e);
        renderScrubUI(pct);
        
        // Instant snappy jump on click
        const targetTime = pct * player.duration;
        if (player.fastSeek) {
            player.fastSeek(targetTime);
        } else {
            player.currentTime = targetTime;
        }
        
        showControls();
    }

    function handleScrubMove(e) {
        if (!isDraggingTimeline || !player || !player.duration) return;
        if (e.cancelable) e.preventDefault();
        const pct = getTimelinePercentage(e);
        
        if (rafScrubId) cancelAnimationFrame(rafScrubId);
        rafScrubId = requestAnimationFrame(() => {
            renderScrubUI(pct);
        });

        if (!throttledSeekTimer) {
            throttledSeekTimer = setTimeout(() => {
                throttledSeekTimer = null;
                if (isDraggingTimeline && player && player.duration) {
                    const targetTime = pct * player.duration;
                    if (player.fastSeek) {
                        player.fastSeek(targetTime);
                    } else {
                        player.currentTime = targetTime;
                    }
                }
            }, 35); // 35ms ultra-smooth fluid live scrub
        }
        showControls();
    }

    function handleScrubEnd(e) {
        if (!isDraggingTimeline) return;
        isDraggingTimeline = false;
        if (timelineContainer) timelineContainer.classList.remove('is-scrubbing');
        if (rafScrubId) cancelAnimationFrame(rafScrubId);
        if (throttledSeekTimer) {
            clearTimeout(throttledSeekTimer);
            throttledSeekTimer = null;
        }

        const pct = getTimelinePercentage(e);
        if (player && player.duration) {
            player.currentTime = pct * player.duration;
        }
        if (hoverTime) {
            hoverTime.style.opacity = '0';
        }
        if (wasPlayingBeforeDrag && player && player.paused) {
            player.play().catch(err => console.log('Resume playback error:', err));
        }
        showControls(3800);
        doSaveProgress();
    }

    if (timelineContainer) {
        timelineContainer.addEventListener('mousedown', handleScrubStart);
        timelineContainer.addEventListener('touchstart', handleScrubStart, { passive: false });

        timelineContainer.addEventListener('mousemove', (e) => {
            if (isDraggingTimeline || !player || !player.duration) return;
            const pct = getTimelinePercentage(e);
            const targetTime = pct * player.duration;
            const hasHours = (player.duration >= 3600);
            if (hoverTime) {
                hoverTime.style.left = `${(pct * 100).toFixed(2)}%`;
                hoverTime.textContent = formatPlayerTime(targetTime, hasHours);
                hoverTime.style.opacity = '1';
            }
        });

        timelineContainer.addEventListener('mouseleave', () => {
            if (hoverTime && !isDraggingTimeline) hoverTime.style.opacity = '0';
        });

        window.addEventListener('mousemove', handleScrubMove);
        window.addEventListener('touchmove', handleScrubMove, { passive: false });
        window.addEventListener('mouseup', handleScrubEnd);
        window.addEventListener('touchend', handleScrubEnd);
        window.addEventListener('touchcancel', handleScrubEnd);
    }

    // Playback Speed Menu
    // ─── SETTINGS FLYOUT MENU CONTROLLER ───
    function showSettingsPanel(panelId) {
        if (!settingsMenu) return;
        const allPanels = settingsMenu.querySelectorAll('.aphim-settings-panel');
        allPanels.forEach(p => p.classList.add('hidden'));
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            const list = targetPanel.querySelector('.aphim-settings-list');
            if (list) {
                list.scrollTop = 0;
                if (window.innerWidth <= 640) {
                    if (panelId === 'aphim-settings-main-panel') {
                        list.style.maxHeight = 'none';
                        list.style.overflow = 'visible';
                    } else {
                        list.style.maxHeight = '140px';
                        list.style.overflowY = 'auto';
                    }
                }
            }
        }
        if (window.innerWidth <= 640) {
            settingsMenu.style.maxHeight = (panelId === 'aphim-settings-main-panel') ? '185px' : '180px';
            settingsMenu.style.overflow = 'hidden';
            settingsMenu.style.display = 'flex';
            settingsMenu.style.flexDirection = 'column';
        }
    }

    function refreshSettingsServers() {
        if (!serverOptionsList) return;
        if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0) {
            serverOptionsList.innerHTML = '<div class="px-4 py-2 text-xs text-white/50 text-center">Không có danh sách máy chủ</div>';
            return;
        }

        const categoryCounts = {};
        currentMovie.episodes.forEach(s => {
            const lang = getLangTag(s, currentMovie);
            categoryCounts[lang] = (categoryCounts[lang] || 0) + 1;
        });

        const categoryIndices = {};
        let currentActiveName = 'Vietsub';

        serverOptionsList.innerHTML = currentMovie.episodes.map((s, idx) => {
            const isActive = (idx === currentServerIndex);
            const lang = getLangTag(s, currentMovie);
            categoryIndices[lang] = (categoryIndices[lang] || 0) + 1;
            
            let sName = lang;
            if (categoryCounts[lang] > 1) {
                sName = (categoryIndices[lang] === 1) ? `${lang} (Chính)` : `${lang} #${categoryIndices[lang]}`;
            }
            if (isActive) currentActiveName = sName;

            // Đọc dữ liệu ping từ Ping Engine
            const pingData = (window.getServerPingDataSync && window.getServerPingDataSync(s, idx)) || null;
            const pingText = pingData ? (pingData.ok ? `${pingData.ping} ms` : (pingData.text || 'Lỗi')) : 'Đang đo...';
            const pingColor = pingData ? (pingData.ok ? (pingData.status === 'fast' ? 'text-emerald-400' : (pingData.status === 'good' ? 'text-amber-400' : 'text-rose-400')) : 'text-rose-400') : 'text-gray-400';
            const signalSvg = (window.renderSignalBars && window.renderSignalBars(pingData ? pingData.status : 'loading', true)) || `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
                    <rect x="2" y="15" width="3.5" height="6" rx="1" fill="#64748b" />
                    <rect x="7.5" y="11" width="3.5" height="10" rx="1" fill="#64748b" />
                    <rect x="13" y="7" width="3.5" height="14" rx="1" fill="#64748b" />
                    <rect x="18.5" y="3" width="3.5" height="18" rx="1" fill="#64748b" />
                </svg>
            `;

            return `
                <div class="aphim-sub-opt ${isActive ? 'active' : ''}" data-server-idx="${idx}" style="display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 7px 10px !important;">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                        <div id="settings-server-signal-${idx}" style="width: 22px; height: 22px; min-width: 22px; border-radius: 6px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            ${signalSvg}
                        </div>
                        <span class="truncate" style="font-weight: ${isActive ? '700' : '500'}; font-size: 13px; color: ${isActive ? '#fcd576' : '#f8fafc'};">${sName}</span>
                        ${isActive ? '<span style="color: #fcd576; font-size: 12px; font-weight: 800; margin-left: 2px;">✓</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <span id="settings-server-ping-${idx}" class="${pingColor}" style="font-size: 11px; font-weight: 700;">${pingText}</span>
                        <svg class="opt-check" style="${isActive ? 'opacity: 1 !important;' : 'opacity: 0 !important;'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
            `;
        }).join('');

        if (valServer) valServer.textContent = currentActiveName;

        // Kích hoạt đo ping nền nếu chưa có
        if (typeof window.triggerMeasureAllPings === 'function') {
            window.triggerMeasureAllPings();
        }

        const sOpts = serverOptionsList.querySelectorAll('.aphim-sub-opt');
        sOpts.forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(opt.dataset.serverIdx);
                if (typeof window.changeServer === 'function') {
                    window.changeServer(idx);
                }
                refreshSettingsServers();
                showSettingsPanel('aphim-settings-main-panel');
            };
        });
    }

    function refreshSettingsQuality() {
        if (!qualityOptionsList) return;
        if (window.hls && window.hls.levels && window.hls.levels.length > 1) {
            const curLvl = window.hls.currentLevel;
            let currentQualityLabel = (curLvl === -1) ? 'Auto' : `${window.hls.levels[curLvl]?.height || 'HD'}p`;
            if (valQuality) valQuality.textContent = currentQualityLabel;

            let html = `
                <div class="aphim-sub-opt ${curLvl === -1 ? 'active' : ''}" data-quality="-1">
                    <span>Tự động (Auto)</span>
                    <svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            `;
            window.hls.levels.forEach((lvl, idx) => {
                const label = `${lvl.height}p ${lvl.height >= 1080 ? 'Full HD' : lvl.height >= 720 ? 'HD' : ''}`.trim();
                html += `
                    <div class="aphim-sub-opt ${curLvl === idx ? 'active' : ''}" data-quality="${idx}">
                        <span>${label}</span>
                        <svg class="opt-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                `;
            });
            qualityOptionsList.innerHTML = html;

            const qOpts = qualityOptionsList.querySelectorAll('.aphim-sub-opt');
            qOpts.forEach(opt => {
                opt.onclick = (e) => {
                    e.stopPropagation();
                    const qIdx = parseInt(opt.dataset.quality);
                    if (window.hls) {
                        window.hls.currentLevel = qIdx;
                    }
                    refreshSettingsQuality();
                    showSettingsPanel('aphim-settings-main-panel');
                };
            });
        } else {
            if (valQuality) valQuality.textContent = 'Auto (FHD)';
        }
    }

    if (btnSettings && settingsMenu) {
        btnSettings.onclick = (e) => {
            e.stopPropagation();
            const isHidden = settingsMenu.classList.contains('hidden');
            if (isHidden) {
                if (audioMenu) audioMenu.classList.add('hidden');
                showSettingsPanel('aphim-settings-main-panel');
                refreshSettingsServers();
                refreshSettingsQuality();
                settingsMenu.classList.remove('hidden');
                btnSettings.classList.add('is-active');
                if (wrapper) wrapper.classList.add('aphim-menu-open');
                if (window.innerWidth <= 640) {
                    settingsMenu.style.maxHeight = '185px';
                    settingsMenu.style.overflow = 'hidden';
                    settingsMenu.style.display = 'flex';
                    settingsMenu.style.flexDirection = 'column';
                }
            } else {
                settingsMenu.classList.add('hidden');
                btnSettings.classList.remove('is-active');
                if (wrapper) wrapper.classList.remove('aphim-menu-open');
            }
        };

        const navItems = settingsMenu.querySelectorAll('.aphim-settings-item');
        navItems.forEach(item => {
            item.onclick = (e) => {
                e.stopPropagation();
                const target = item.dataset.target;
                if (target === 'aphim-panel-server') {
                    refreshSettingsServers();
                    showSettingsPanel('aphim-panel-server');
                } else if (target === 'aphim-panel-speed') {
                    showSettingsPanel('aphim-panel-speed');
                } else if (target === 'aphim-panel-quality') {
                    refreshSettingsQuality();
                    showSettingsPanel('aphim-panel-quality');
                } else if (target === 'aphim-panel-ratio') {
                    showSettingsPanel('aphim-panel-ratio');
                }
            };
        });

        const backHeaders = settingsMenu.querySelectorAll('.aphim-sub-header');
        backHeaders.forEach(hdr => {
            hdr.onclick = (e) => {
                e.stopPropagation();
                showSettingsPanel('aphim-settings-main-panel');
            };
        });

        const speedPanel = document.getElementById('aphim-panel-speed');
        if (speedPanel) {
            const speedOpts = speedPanel.querySelectorAll('.aphim-sub-opt');
            speedOpts.forEach(opt => {
                opt.onclick = (e) => {
                    e.stopPropagation();
                    const rate = parseFloat(opt.dataset.speed);
                    player.playbackRate = rate;
                    speedOpts.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    if (valSpeed) valSpeed.textContent = (rate === 1.0) ? 'Bình thường' : `${rate}x`;
                    try { localStorage.setItem('aphim_playback_speed', rate); } catch (err) {}
                    showSettingsPanel('aphim-settings-main-panel');
                };
            });
        }

        const ratioPanel = document.getElementById('aphim-panel-ratio');
        if (ratioPanel) {
            const ratioOpts = ratioPanel.querySelectorAll('.aphim-sub-opt');
            ratioOpts.forEach(opt => {
                opt.onclick = (e) => {
                    e.stopPropagation();
                    const ratio = opt.dataset.ratio;
                    ratioOpts.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');

                    if (ratio === '16/9') {
                        player.style.objectFit = 'contain';
                        player.style.aspectRatio = '16 / 9';
                        if (valRatio) valRatio.textContent = '16:9';
                    } else if (ratio === '4/3') {
                        player.style.objectFit = 'contain';
                        player.style.aspectRatio = '4 / 3';
                        if (valRatio) valRatio.textContent = '4:3';
                    } else if (ratio === 'cover') {
                        player.style.objectFit = 'cover';
                        player.style.aspectRatio = '';
                        if (valRatio) valRatio.textContent = 'Tràn viền';
                    } else if (ratio === 'stretch') {
                        player.style.objectFit = 'fill';
                        player.style.aspectRatio = '';
                        if (valRatio) valRatio.textContent = 'Kéo giãn';
                    } else {
                        player.style.objectFit = 'contain';
                        player.style.aspectRatio = '';
                        if (valRatio) valRatio.textContent = 'Mặc định';
                    }
                    try { localStorage.setItem('aphim_aspect_ratio', ratio); } catch (err) {}
                    showSettingsPanel('aphim-settings-main-panel');
                };
            });
        }

        ['click', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, (e) => {
                if (settingsMenu && !settingsMenu.classList.contains('hidden') && !settingsMenu.contains(e.target) && e.target !== btnSettings && !btnSettings.contains(e.target)) {
                    settingsMenu.classList.add('hidden');
                    btnSettings.classList.remove('is-active');
                    if (wrapper) wrapper.classList.remove('aphim-menu-open');
                }
            }, { passive: true });
        });
    }

    // 🎧 NGUỒN ÂM THANH & PHỤ ĐỀ SONG NGỮ (VIỆT - HÀN / DUAL SUBTITLES)
    function parseWebVTT(vttText) {
        if (!vttText || typeof vttText !== 'string') return [];
        const cues = [];
        function parseTime(tStr) {
            if (!tStr) return 0;
            const p = tStr.trim().split(':');
            if (p.length === 3) {
                return (parseFloat(p[0]) || 0) * 3600 + (parseFloat(p[1]) || 0) * 60 + (parseFloat(p[2]) || 0);
            } else if (p.length === 2) {
                return (parseFloat(p[0]) || 0) * 60 + (parseFloat(p[1]) || 0);
            }
            return 0;
        }
        const blocks = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/);
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('-->')) {
                    const [startStr, endStr] = lines[i].split('-->');
                    const start = parseTime(startStr);
                    const end = parseTime(endStr ? endStr.trim().split(/\s+/)[0] : '');
                    const text = lines.slice(i + 1).map(l => l.replace(/<[^>]*>/g, '').trim()).filter(Boolean).join('\n');
                    if (end > start && text) {
                        cues.push({ start, end, text });
                    }
                    break;
                }
            }
        }
        return cues;
    }

    function setupDualSubtitles(ep, videoEl) {
        const subTopEl = document.getElementById('aphim-sub-top');
        const subBottomEl = document.getElementById('aphim-sub-bottom');
        if (!subTopEl || !subBottomEl || !videoEl) return;

        subTopEl.textContent = '';
        subTopEl.style.display = 'none';
        subBottomEl.textContent = '';
        subBottomEl.style.display = 'none';

        const subtitles = (ep && ep.subtitles) ? ep.subtitles : [];
        if (!subtitles || subtitles.length === 0) return;

        const vietSub = subtitles.find(s => (s.language === 'vi' || (s.label || '').toLowerCase().includes('việt')));
        // Tìm phụ đề ngoại ngữ (Trung, Hàn, Anh, Nhật... bất kỳ phụ đề nào khác Tiếng Việt)
        const foreignSub = subtitles.find(s => {
            if (s === vietSub) return false;
            const l = (s.language || '').toLowerCase();
            const lbl = (s.label || '').toLowerCase();
            return l !== 'vi' && !lbl.includes('việt');
        });

        let topCues = [];
        let bottomCues = [];

        // 🇻🇳 Dòng TRÊN: Phụ đề Tiếng Việt (Chữ Trắng sắc nét)
        if (vietSub && vietSub.url) {
            const vUrl = vietSub.url.startsWith('http') ? `/api/proxy/vtt?url=${encodeURIComponent(vietSub.url)}` : vietSub.url;
            fetch(vUrl)
                .then(r => r.text())
                .then(t => {
                    topCues = parseWebVTT(t);
                    console.log(`[DualSub] Loaded ${topCues.length} Vietnamese cues (Top - White)`);
                })
                .catch(err => console.warn('[DualSub Viet Error]:', err));
        }

        // 🇰🇷 Dòng DƯỚI: Phụ đề Tiếng Hàn / Ngoại ngữ (Chữ Vàng rực rỡ chuẩn ảnh mẫu)
        if (foreignSub && foreignSub.url) {
            const fUrl = foreignSub.url.startsWith('http') ? `/api/proxy/vtt?url=${encodeURIComponent(foreignSub.url)}` : foreignSub.url;
            fetch(fUrl)
                .then(r => r.text())
                .then(t => {
                    bottomCues = parseWebVTT(t);
                    console.log(`[DualSub] Loaded ${bottomCues.length} foreign cues (${foreignSub.label}) (Bottom - Yellow)`);
                })
                .catch(err => console.warn('[DualSub Foreign Error]:', err));
        }

        const onTimeUpdate = () => {
            const t = videoEl.currentTime;

            if (topCues.length > 0) {
                const cue = topCues.find(c => t >= c.start && t <= c.end);
                if (cue && cue.text) {
                    subTopEl.textContent = cue.text;
                    subTopEl.style.display = 'block';
                } else {
                    subTopEl.style.display = 'none';
                }
            } else {
                subTopEl.style.display = 'none';
            }

            if (bottomCues.length > 0) {
                const cue = bottomCues.find(c => t >= c.start && t <= c.end);
                if (cue && cue.text) {
                    subBottomEl.textContent = cue.text;
                    subBottomEl.style.display = 'block';
                } else {
                    subBottomEl.style.display = 'none';
                }
            } else {
                subBottomEl.style.display = 'none';
            }
        };

        if (videoEl._dualSubHandler) {
            videoEl.removeEventListener('timeupdate', videoEl._dualSubHandler);
        }
        videoEl._dualSubHandler = onTimeUpdate;
        videoEl.addEventListener('timeupdate', onTimeUpdate);
    }

    function setupAudioSourceMenu() {
        if (!btnAudio || !audioMenu || !audioOptionsList) return;

        const servers = (currentMovie && currentMovie.episodes) ? currentMovie.episodes : [];
        const hasSongNgu = servers.some(s => (s.server_name || '').toLowerCase().includes('song ngữ'));
        const songBadge = document.getElementById('aphim-song-badge');

        if (!hasSongNgu && servers.length <= 1) {
            btnAudio.style.display = 'none';
            return;
        } else {
            btnAudio.style.display = 'flex';
        }

        const curServer = servers[currentServerIndex];
        const isCurSongNgu = curServer && (curServer.server_name || '').toLowerCase().includes('song ngữ');
        
        // Cập nhật trạng thái màu sắc nút Audio Icon chuẩn hình số 2 & 3
        if (isCurSongNgu) {
            btnAudio.style.color = '#fcd576';
            if (songBadge) {
                songBadge.style.display = 'inline-block';
                songBadge.style.background = '#ffffff';
                songBadge.style.color = '#000000';
            }
        } else {
            btnAudio.style.color = '#ffffff';
            if (songBadge) {
                songBadge.style.display = 'none';
            }
        }

        function renderAudioOptions() {
            audioOptionsList.innerHTML = '';
            servers.forEach((srv, sIdx) => {
                const isSongNgu = (srv.server_name || '').toLowerCase().includes('song ngữ');
                const isActive = sIdx === currentServerIndex;

                const opt = document.createElement('div');
                opt.className = `aphim-audio-opt ${isActive ? 'active' : ''}`;

                let labelText = '';
                if (isSongNgu) {
                    labelText = srv.server_name || srv.original_server_name || 'Song Ngữ';
                    // Định dạng khoảng cách gạch nối chuẩn đẹp: Việt-Trung-Anh -> Việt - Trung - Anh
                    labelText = labelText.replace(/([^\s])-([^\s])/g, '$1 - $2');
                } else {
                    const origName = srv.original_server_name || srv.server_name || `Nguồn ${sIdx + 1}`;
                    if (origName.toLowerCase().includes('vietsub') || origName.toLowerCase().includes('thuyết minh') || origName.toLowerCase().includes('lồng tiếng')) {
                        labelText = origName;
                    } else {
                        labelText = `Vietsub (${srv.server_name || `Nguồn ${sIdx + 1}`})`;
                    }
                }

                opt.innerHTML = `
                    <span style="
                        width: 9px;
                        height: 9px;
                        border-radius: 50%;
                        ${isActive ? 'background: #fcd576; box-shadow: 0 0 10px #f59e0b; border: none;' : 'background: transparent; border: 1.5px solid rgba(255, 255, 255, 0.4);'}
                        flex-shrink: 0;
                        display: inline-block;
                        transition: all 0.15s ease;
                    "></span>
                    <span style="
                        font-size: 13.5px;
                        font-weight: ${isActive ? '700' : '500'};
                        color: ${isActive ? '#fcd576' : 'rgba(255, 255, 255, 0.88)'};
                        letter-spacing: -0.15px;
                        white-space: nowrap;
                        flex: 1;
                    ">${labelText}</span>
                    ${isActive ? `
                    <svg style="width: 15px; height: 15px; color: #fcd576; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>` : ''}
                `;

                opt.onclick = (e) => {
                    e.stopPropagation();
                    audioMenu.classList.add('hidden');
                    if (sIdx !== currentServerIndex) {
                        currentServerIndex = sIdx;
                        const serverData = servers[sIdx].server_data || [];
                        const currentEpSlug = currentEpisode ? currentEpisode.slug : 'tap-1';
                        const targetEp = serverData.find(e => e.slug.replace(/^tap-/, '') === currentEpSlug.replace(/^tap-/, '')) || serverData[0];
                        if (targetEp) {
                            currentEpisode = targetEp;
                            _isInitializingPlayer = false;
                            initializePlayer(currentEpisode);
                            renderServerList(servers);
                            renderEpisodeList(servers);
                        }
                    }
                };

                audioOptionsList.appendChild(opt);
            });
        }

        btnAudio.onclick = (e) => {
            e.stopPropagation();
            const isHidden = audioMenu.classList.contains('hidden');
            if (settingsMenu) {
                settingsMenu.classList.add('hidden');
                if (btnSettings) btnSettings.classList.remove('is-active');
            }
            if (isHidden) {
                renderAudioOptions();
                audioMenu.classList.remove('hidden');
            } else {
                audioMenu.classList.add('hidden');
            }
        };

        ['click', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, (e) => {
                if (audioMenu && !audioMenu.classList.contains('hidden') && !audioMenu.contains(e.target) && e.target !== btnAudio && !btnAudio.contains(e.target)) {
                    audioMenu.classList.add('hidden');
                }
            }, { passive: true });
        });
    }

    setupAudioSourceMenu();
    setupDualSubtitles(episode, player);

    // Picture-in-Picture
    if (btnPip) {
        if ('pictureInPictureEnabled' in document) {
            btnPip.onclick = async () => {
                try {
                    if (document.pictureInPictureElement) {
                        await document.exitPictureInPicture();
                    } else {
                        await player.requestPictureInPicture();
                    }
                } catch (e) {
                    console.warn('PiP error:', e);
                }
            };
        } else {
            btnPip.style.display = 'none';
        }
    }

    // Device Helper: Accurately detect Mobile (iPhone, iPad, Android, touch devices)
    function isMobileDevice() {
        if (typeof window === 'undefined') return false;
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        const isSmallTouchScreen = (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && window.innerWidth <= 850;
        return isMobileUA || isIPadOS || isSmallTouchScreen;
    }

    // Fullscreen Toggle Controller (Desktop Custom Fullscreen vs. Mobile Native Video Fullscreen)
    function isCurrentlyFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            (player && player.webkitDisplayingFullscreen) ||
            (!isMobileDevice() && wrapper && wrapper.classList.contains('aphim-web-fullscreen'))
        );
    }

    function updateFullscreenIcons(isFs) {
        if (!iconFs) return;
        iconFs.textContent = isFs ? 'fullscreen_exit' : 'fullscreen';
        if (btnFs) {
            btnFs.title = isFs ? 'Thu nhỏ (F / Esc)' : 'Toàn màn hình (F)';
        }
    }

    async function enterFullscreen() {
        if (!player) return;

        // ─── A. MOBILE FLOW (iOS & Android: Native OS Video Fullscreen - Exactly Image 3) ───
        if (isMobileDevice()) {
            // 1. iOS Safari (iPhone / iPad) -> Direct native webkitEnterFullscreen on video element
            if (player.webkitEnterFullscreen) {
                try {
                    player.webkitEnterFullscreen();
                    updateFullscreenIcons(true);
                    return;
                } catch (e) {
                    console.warn('iOS webkitEnterFullscreen error:', e);
                }
            }

            // 2. Android / Other Mobile -> Native Fullscreen on <video> with native media controls
            if (player.requestFullscreen || player.webkitRequestFullscreen) {
                try {
                    player.controls = true; // Show native OS controls (Image 3)
                    if (player.requestFullscreen) {
                        await player.requestFullscreen();
                    } else if (player.webkitRequestFullscreen) {
                        await player.webkitRequestFullscreen();
                    }
                    updateFullscreenIcons(true);
                    return;
                } catch (e) {
                    console.warn('Mobile native video requestFullscreen error:', e);
                    player.controls = false;
                }
            }
        }

        // ─── B. DESKTOP FLOW (PC / Laptop: Custom Player Fullscreen) ───
        if (!wrapper) return;
        let nativeSuccess = false;

        // 1. Try Native Fullscreen API on wrapper
        try {
            if (wrapper.requestFullscreen) {
                await wrapper.requestFullscreen();
                nativeSuccess = true;
            } else if (wrapper.webkitRequestFullscreen) {
                await wrapper.webkitRequestFullscreen();
                nativeSuccess = true;
            } else if (wrapper.mozRequestFullScreen) {
                await wrapper.mozRequestFullScreen();
                nativeSuccess = true;
            } else if (wrapper.msRequestFullscreen) {
                await wrapper.msRequestFullscreen();
                nativeSuccess = true;
            }
        } catch (e) {
            console.warn('Native requestFullscreen on wrapper rejected, trying fallbacks:', e);
        }

        // 2. Web Fullscreen (CSS Fullscreen) ONLY as fallback on Desktop (Never on mobile)
        if (!nativeSuccess && !isMobileDevice() && !document.fullscreenElement && !document.webkitFullscreenElement) {
            wrapper.classList.add('aphim-web-fullscreen');
            document.body.classList.add('aphim-body-fullscreen');
        }

        updateFullscreenIcons(true);
        showControls();
    }

    async function exitFullscreen() {
        // 1. Reset mobile native player state
        if (isMobileDevice() && player) {
            player.controls = false; // Restore custom inline controls for outside viewing
            if (player.webkitExitFullscreen) {
                try { player.webkitExitFullscreen(); } catch (e) {}
            }
        }

        // 2. Exit native browser fullscreen
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                await document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
        } catch (e) {
            console.warn('Exit fullscreen error:', e);
        }

        // 3. Unlock screen orientation
        if (screen.orientation && screen.orientation.unlock) {
            try {
                screen.orientation.unlock();
            } catch (e) {}
        }

        // 4. Remove Web Fullscreen classes
        if (wrapper) wrapper.classList.remove('aphim-web-fullscreen');
        document.body.classList.remove('aphim-body-fullscreen');

        updateFullscreenIcons(false);
        showControls();
    }

    function toggleFullscreen() {
        if (isCurrentlyFullscreen()) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }
    window.toggleFullscreen = toggleFullscreen;

    if (btnFs) {
        btnFs.onclick = (e) => {
            e.stopPropagation();
            toggleFullscreen();
        };
    }

    const handleFsChange = () => {
        const isFs = isCurrentlyFullscreen();
        updateFullscreenIcons(isFs);
        if (!isFs) {
            if (player && isMobileDevice()) {
                player.controls = false; // Switch back to custom tools outside fullscreen
            }
            if (wrapper) wrapper.classList.remove('aphim-web-fullscreen');
            document.body.classList.remove('aphim-body-fullscreen');
            if (screen.orientation && screen.orientation.unlock) {
                try { screen.orientation.unlock(); } catch (e) {}
            }
        }
        showControls();
        scheduleHideControls(2400);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    // ESC key listener for Web Fullscreen on Desktop
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && wrapper && wrapper.classList.contains('aphim-web-fullscreen')) {
            exitFullscreen();
        }
    });

    // iOS native video fullscreen change events (Direct Native Player - Image 3)
    if (player) {
        player.addEventListener('webkitbeginfullscreen', () => {
            updateFullscreenIcons(true);
        });
        player.addEventListener('webkitendfullscreen', () => {
            if (player) player.controls = false;
            if (wrapper) wrapper.classList.remove('aphim-web-fullscreen');
            document.body.classList.remove('aphim-body-fullscreen');
            updateFullscreenIcons(false);
            showControls();
            scheduleHideControls(2500);
        });
    }

    // Controls Auto-Hide & Mouse Hover Visibility Logic (Professional Cinema Standard - YouTube/Netflix)
    let hideTimeout = null;
    let isHoveringControls = false;

    function showControls(customDelay) {
        if (!controls) return;
        
        // Loại bỏ inline styles cũ để CSS transition 0.36s chạy mượt mà 100% không bị chớp giật
        controls.style.opacity = '';
        controls.style.visibility = '';
        controls.style.pointerEvents = '';

        if (controls.classList.contains('aphim-controls-hidden')) {
            controls.classList.remove('aphim-controls-hidden');
        }

        if (wrapper) {
            wrapper.classList.remove('aphim-hide-cursor');
            wrapper.style.cursor = 'default';
        }

        const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768);
        const delay = (typeof customDelay === 'number' && customDelay > 0) ? customDelay : (isTouch ? 3800 : 2500);
        scheduleHideControls(delay);
    }

    function hideControls(force = false) {
        if (!controls) return;
        if (!force) {
            if (!player || player.paused || isDraggingTimeline || isHoveringControls) return;
            if (settingsMenu && !settingsMenu.classList.contains('hidden')) return;
        }

        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        // Loại bỏ inline styles cũ
        controls.style.opacity = '';
        controls.style.visibility = '';
        controls.style.pointerEvents = '';

        controls.classList.add('aphim-controls-hidden');

        if (wrapper) {
            wrapper.classList.add('aphim-hide-cursor');
            wrapper.style.cursor = 'none';
        }
        if (settingsMenu) settingsMenu.classList.add('hidden');
    }

    function scheduleHideControls(delay) {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        // Khi video đang tạm dừng (paused), hoặc đang kéo timeline, hoặc đang chạm/rê chuột trên thanh điều khiển: KHÔNG bao giờ tự ẩn!
        if (!player || player.paused || isDraggingTimeline || isHoveringControls) return;
        if (settingsMenu && !settingsMenu.classList.contains('hidden')) return;

        const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768);
        const actualDelay = (typeof delay === 'number' && delay > 0) ? delay : (isTouch ? 3800 : 2500);

        hideTimeout = setTimeout(() => {
            hideControls();
        }, actualDelay);
    }

    if (controls) {
        // Desktop mouse hover
        controls.addEventListener('mouseenter', () => {
            isHoveringControls = true;
            if (hideTimeout) clearTimeout(hideTimeout);
            showControls();
        });
        controls.addEventListener('mouseleave', () => {
            isHoveringControls = false;
            scheduleHideControls(1500);
        });
        // Mobile touch interaction: Chạm vào bất kỳ nút nào hoặc thanh tiến trình -> Giữ sáng và gia hạn timer 3.8s
        ['touchstart', 'touchmove'].forEach(evt => {
            controls.addEventListener(evt, () => {
                isHoveringControls = false;
                showControls(3800);
            }, { passive: true });
        });
        controls.addEventListener('touchend', () => {
            showControls(3800);
        }, { passive: true });
    }

    if (settingsMenu) {
        settingsMenu.addEventListener('mouseenter', () => {
            isHoveringControls = true;
            if (hideTimeout) clearTimeout(hideTimeout);
        });
        settingsMenu.addEventListener('mouseleave', () => {
            isHoveringControls = false;
            scheduleHideControls(1500);
        });
        ['touchstart', 'touchmove', 'touchend'].forEach(evt => {
            settingsMenu.addEventListener(evt, () => {
                showControls(4500);
            }, { passive: true });
        });
    }

    // ─── SMART DUAL-ZONE HOVER CONTROLLER (DESKTOP WINDOWED & FULLSCREEN) ───
    // Tự động phân chia 2 vùng nhạy bén trên Desktop:
    // 1. Vùng dưới (Bottom Zone, ~35-40% đáy): Di chuột xuống -> Hiện bộ công cụ tức thì
    // 2. Vùng trên (Top Zone, ~60-65% đỉnh): Đưa chuột lên lại -> Tự động nhận biết đang xem phim và ẩn mượt mà
    function handleDesktopDualZoneMouseMove(e) {
        if (e && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768) {
            return;
        }

        const isFs = isCurrentlyFullscreen();
        const targetEl = wrapper;
        if (!targetEl) return;

        const rect = targetEl.getBoundingClientRect();
        if (rect.height <= 0) return;

        const clientY = e.clientY;
        const relativeY = clientY - rect.top;
        const height = rect.height;

        // Ngưỡng phân chia 2 vùng thông minh:
        // - Trên Fullscreen: Vùng dưới là 32% chiều cao đáy (hoặc từ đáy tính lên 220px)
        // - Chế độ thường: Vùng dưới là 38% chiều cao đáy (hoặc từ đáy tính lên 150px)
        const bottomTriggerThreshold = isFs 
            ? Math.max(height * 0.68, height - 220)
            : Math.max(height * 0.62, height - 150);

        // Vùng đệm rời đi (Hysteresis - tránh giật nhấp nháy khi rê chuột chậm quanh ranh giới)
        const topExitThreshold = isFs
            ? Math.max(height * 0.64, height - 250)
            : Math.max(height * 0.58, height - 170);

        if (relativeY >= bottomTriggerThreshold) {
            // Chuột đang ở VÙNG DƯỚI:
            // - Nếu controls đang ẨN → mới gọi showControls để trigger transition trượt lên mượt mà
            // - Nếu controls đã HIỆN rồi → chỉ gia hạn timer, KHÔNG gọi lại showControls tránh chớp giật
            if (controls && controls.classList.contains('aphim-controls-hidden')) {
                showControls(2800);
            } else {
                scheduleHideControls(2800); // Chỉ gia hạn, không làm gián đoạn transition
            }
        } else if (relativeY < topExitThreshold) {
            // Chuột đã được đưa lên lại VÙNG TRÊN (vùng xem phim) → Nhận biết user không cần controls nữa:
            if (wrapper) {
                wrapper.classList.remove('aphim-hide-cursor');
                wrapper.style.cursor = 'default';
            }
            if (player && !player.paused && !isDraggingTimeline && !isHoveringControls) {
                if (!settingsMenu || settingsMenu.classList.contains('hidden')) {
                    scheduleHideControls(180); // Ẩn mượt mà sau 180ms
                }
            }
        }
    }

    if (wrapper) {
        wrapper.addEventListener('mousemove', handleDesktopDualZoneMouseMove);

        wrapper.addEventListener('mouseenter', (e) => {
            if (e && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768) {
                showControls();
                return;
            }

            const rect = wrapper.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const bottomThreshold = Math.max(rect.height * 0.62, rect.height - 150);

            if (relativeY >= bottomThreshold) {
                // mouseenter vào vùng dưới: chỉ show nếu đang ẩn, tránh interrupt transition
                if (controls && controls.classList.contains('aphim-controls-hidden')) {
                    showControls(2800);
                } else {
                    scheduleHideControls(2800);
                }
            } else {
                // Di chuột vào ở vùng trên: không bật controls che mắt, chỉ đảm bảo con trỏ hiển thị
                if (wrapper) {
                    wrapper.classList.remove('aphim-hide-cursor');
                    wrapper.style.cursor = 'default';
                }
            }
        });

        wrapper.addEventListener('mouseleave', () => {
            // Không áp dụng mouseleave trên thiết bị cảm ứng
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768) return;
            isHoveringControls = false;
            if (hideTimeout) clearTimeout(hideTimeout);
            if (wrapper) wrapper.style.cursor = 'default';
            if (player && !player.paused && !isDraggingTimeline) {
                // Di chuột ra khỏi khung chiếu -> ẩn mượt mà sau 180ms với transition trượt mờ điện ảnh
                hideTimeout = setTimeout(() => {
                    hideControls();
                }, 180);
            }
        });
        // ĐÃ LOẠI BỎ wrapper.addEventListener('touchstart') gọi showControls() sớm
        // Để clickzone quản lý luồng tap/double-tap/long-press chuẩn xác 100%
    }

    // Global listener khi ở Fullscreen: Vẫn áp dụng chính xác Smart Dual-Zone Hover (Không bao giờ bị lỗi hiện trơ trơ nữa)
    document.addEventListener('mousemove', (e) => {
        if (isCurrentlyFullscreen()) {
            handleDesktopDualZoneMouseMove(e);
        }
    });

    let isTimeRestored = false;
    const activeEpSlug = (episode && episode.slug) ? episode.slug : null;
    const activeEpName = (episode && episode.name) ? episode.name : null;

    // Helper lưu tiến độ xem (Gắn chặt theo episode hiện tại, chống ghi đè nhầm tập khác)
    function doSaveProgress() {
        if (player && player.currentTime > 5 && player.duration > 0 && currentMovie && activeEpSlug) {
            userService.saveWatchProgress(
                currentMovie.slug,
                player.currentTime,
                player.duration,
                activeEpSlug,
                currentMovie
            );

            try {
                sessionStorage.setItem('aphim_active_playing_' + currentMovie.slug, 'true');
                sessionStorage.setItem('aphim_tvc_seen_' + currentMovie.slug, Date.now().toString());
            } catch (e) {}

            if (typeof userService.addToHistory === 'function') {
                userService.addToHistory(currentMovie, activeEpSlug, {
                    currentTime: player.currentTime,
                    duration: player.duration,
                    episode: activeEpName,
                    episodeSlug: activeEpSlug
                });
            }
        }
    }

    // Direct MP4 or HLS connection
    const isDirectMp4 = videoUrl.endsWith('.mp4') || videoUrl.includes('.mp4?') || videoUrl.includes('/api/stream/');
    if (isDirectMp4) {
        console.log('✅ [Direct MP4 Core] Khởi tạo phát MP4 bảo mật tốc độ cao (Range 206 Native)');
        if (window.hlsInstance) {
            try { window.hlsInstance.destroy(); } catch (e) { }
            window.hlsInstance = null;
        }
        player.src = videoUrl;
        player.addEventListener('loadedmetadata', () => {
            const shouldResume = !isTimeRestored && 
                                 progress && 
                                 progress.currentTime > 5 && 
                                 !progress.completed &&
                                 (!progress.duration || (progress.duration - progress.currentTime > 15 && (progress.currentTime / progress.duration) < 0.95));
            if (shouldResume) {
                isTimeRestored = true;
                player.currentTime = progress.currentTime;
            }
            player.play().catch(e => console.log('Autoplay prevented:', e));
        }, { once: true });
    } else if (Hls.isSupported()) {
        console.log('✅ [Hybrid Native Core] Khởi tạo HLS với 100% chất lượng GPU DirectComposition');
        if (window.hlsInstance) {
            try { window.hlsInstance.destroy(); } catch (e) { }
        }
        const isMobileDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 850);
        const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: isMobileDevice ? 30 : 60, // ⚡ Mobile buffer 30s tiết kiệm pin & RAM, Desktop buffer 60s
            maxMaxBufferLength: isMobileDevice ? 60 : 120,
            startLevel: -1, // ⚡ Auto chọn bitrate thích ứng mạng 4G/Wifi
            fragLoadingTimeOut: 18000,
            manifestLoadingTimeOut: 12000,
            levelLoadingTimeOut: 12000,
            preload: true
        });
        window.hlsInstance = hls;

        hls.loadSource(videoUrl);
        hls.attachMedia(player);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('🚀 Manifest parsed, ready to play');
            if (window._isTvcActive) {
                console.log('⚡ TVC is playing -> Pre-buffering main stream in background (muted)...');
                player.muted = true;
                player.volume = 0;
                player.play().catch(e => console.log('Preload buffer play muted:', e));
                return;
            }

            const shouldResume = !isTimeRestored && 
                                 progress && 
                                 progress.currentTime > 5 && 
                                 !progress.completed &&
                                 (!progress.duration || (progress.duration - progress.currentTime > 15 && (progress.currentTime / progress.duration) < 0.95));

            if (shouldResume) {
                isTimeRestored = true;
                setTimeout(() => {
                    player.currentTime = progress.currentTime;
                    player.play().catch(e => {
                        console.log('Auto-play unmuted prevented, falling back to muted autoplay:', e);
                        player.muted = true;
                        player.play().catch(() => {});
                    });
                }, 150);
            } else {
                player.currentTime = 0;
                player.play().catch(e => {
                    console.log('⚠️ Autoplay prevented:', e);
                });
            }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.error('❌ HLS Fatal Error:', data.type, data.details);
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log('🔄 Trying to recover network error...');
                        hls.startLoad();
                        if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                            hls.destroy();
                            handleStreamError();
                        }
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log('🔄 Trying to recover media error...');
                        hls.recoverMediaError();
                        break;
                    default:
                        _isInitializingPlayer = false;
                        handleStreamError();
                        break;
                }
            }
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = videoUrl;
        player.addEventListener('canplay', () => {
            if (window._isTvcActive) {
                console.log('⚡ TVC is playing -> Pre-buffering main stream in background (muted Safari)...');
                player.muted = true;
                player.volume = 0;
                player.play().catch(e => console.log('Preload buffer play muted:', e));
                return;
            }

            const shouldResume = !isTimeRestored && 
                                 progress && 
                                 progress.currentTime > 5 && 
                                 !progress.completed &&
                                 (!progress.duration || (progress.duration - progress.currentTime > 15 && (progress.currentTime / progress.duration) < 0.95));

            if (shouldResume) {
                isTimeRestored = true;
                setTimeout(() => {
                    player.currentTime = progress.currentTime;
                    player.play().catch(e => {
                        player.muted = true;
                        player.play().catch(() => {});
                    });
                }, 200);
            } else {
                player.currentTime = 0;
                player.play().catch(e => console.log('Auto-play prevented:', e));
            }
        }, { once: true });
    }

    // Video State Synchronizations
    player.addEventListener('play', () => {
        if (iconPlay) iconPlay.textContent = 'pause';
        pulseCenterIndicator(true);
        showControls();
        try {
            if (currentMovie && currentMovie.slug) {
                sessionStorage.setItem('aphim_active_playing_' + currentMovie.slug, 'true');
                sessionStorage.setItem('aphim_tvc_seen_' + currentMovie.slug, Date.now().toString());
            }
        } catch (e) {}
    });

    player.addEventListener('pause', () => {
        if (iconPlay) iconPlay.textContent = 'play_arrow';
        pulseCenterIndicator(false);
        showControls();
        doSaveProgress();
    });

    player.addEventListener('loadedmetadata', () => {
        if (player.duration) {
            const hasHours = (player.duration >= 3600);
            if (timeDuration) timeDuration.textContent = formatPlayerTime(player.duration, hasHours);
            if (timeCurrent) timeCurrent.textContent = formatPlayerTime(player.currentTime || 0, hasHours);
        }
    });

    player.addEventListener('durationchange', () => {
        if (player.duration) {
            const hasHours = (player.duration >= 3600);
            if (timeDuration) timeDuration.textContent = formatPlayerTime(player.duration, hasHours);
        }
    });

    player.addEventListener('timeupdate', () => {
        if (!player.duration || isDraggingTimeline) return;
        const cur = player.currentTime;
        const dur = player.duration;
        const pct = (cur / dur) * 100;
        const hasHours = (dur >= 3600);

        if (timeCurrent) timeCurrent.textContent = formatPlayerTime(cur, hasHours);
        if (timeDuration) timeDuration.textContent = formatPlayerTime(dur, hasHours);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (scrubberDot) scrubberDot.style.left = `${pct}%`;

        // Update buffer progress
        if (player.buffered && player.buffered.length > 0 && bufferBar) {
            try {
                const bufEnd = player.buffered.end(player.buffered.length - 1);
                const bufPct = (bufEnd / dur) * 100;
                bufferBar.style.width = `${bufPct}%`;
            } catch (e) { }
        }

        // ⚡ Lưu tiến độ định kỳ mỗi 4 giây
        if (!player._lastSaveTime || Date.now() - player._lastSaveTime > 4000) {
            player._lastSaveTime = Date.now();
            doSaveProgress();
        }
    });

    player.addEventListener('seeked', () => {
        doSaveProgress();
    });

    player.addEventListener('ended', () => {
        doSaveProgress();
        if (typeof autoPlayNext === 'function') autoPlayNext();
    });

    // Mobile Gestures & Touch Controller (Chuẩn YouTube Mobile - Double-tap Seek 5s & 2X Speed Pill)
    let lastTapTime = 0;
    let lastTapSide = null; // 'left' | 'right' | 'center'
    let accumulatedSeekSec = 0;
    let seekAccumulateTimer = null;
    let singleTapTimer = null;
    let longPressTimer = null;
    let isLongPressActive = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    let wasControlsVisibleOnTouchStart = false;
    let preSpeed = 1.0;

    // Helper: Hiển thị Pill 2X tinh tế trên đỉnh giữa player (chuẩn YouTube Mobile)
    function toggleSpeedPill(active) {
        let pill = document.getElementById('aphim-speed-pill');
        if (!pill && wrapper) {
            pill = document.createElement('div');
            pill.id = 'aphim-speed-pill';
            pill.innerHTML = `
                <span class="pill-icon">▶▶</span>
                <span>2X Tốc độ phát</span>
            `;
            wrapper.appendChild(pill);
        }
        if (!pill) return;
        if (active) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    }

    if (clickzone) {
        // Touchstart: Ghi nhận vị trí và trạng thái ban đầu của bộ công cụ
        clickzone.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            const t = e.touches[0];
            touchStartX = t.clientX;
            touchStartY = t.clientY;
            touchMoved = false;

            // Ghi nhớ xem bộ công cụ ĐANG HIỆN hay ĐANG ẨN tại đúng khoảnh khắc ngón tay vừa chạm vào màn hình
            wasControlsVisibleOnTouchStart = controls && 
                !controls.classList.contains('aphim-controls-hidden') && 
                controls.style.opacity !== '0' && 
                controls.style.visibility !== 'hidden';

            // Kích hoạt tính năng nhấn giữ để tua nhanh 2x (YouTube style với Speed Pill siêu đẹp)
            isLongPressActive = false;
            if (longPressTimer) clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                if (!touchMoved && player && !player.paused) {
                    isLongPressActive = true;
                    preSpeed = player.playbackRate || 1.0;
                    player.playbackRate = 2.0;
                    toggleSpeedPill(true);
                }
            }, 380);
        }, { passive: true });

        // Touchmove: Nếu người dùng vuốt ngón tay (cuộn trang web) -> huỷ tap và long-press
        clickzone.addEventListener('touchmove', (e) => {
            if (!e.touches.length) return;
            const t = e.touches[0];
            const dist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
            if (dist > 12) {
                touchMoved = true;
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
        }, { passive: true });

        const cancelLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            if (isLongPressActive) {
                isLongPressActive = false;
                toggleSpeedPill(false);
                if (player) {
                    player.playbackRate = preSpeed || 1.0;
                }
                return true;
            }
            return false;
        };

        // Touchend: Xử lý Chạm đơn (Bật/Tắt thanh công cụ) và Chạm đúp (Tua 5s Trái / Phải chuẩn YouTube)
        clickzone.addEventListener('touchend', (e) => {
            // Nếu vừa thả ngón tay sau khi nhấn giữ 2x -> chỉ trở về 1x, không kích hoạt tap
            if (cancelLongPress()) {
                lastTapTime = 0;
                accumulatedSeekSec = 0;
                lastTapSide = null;
                return;
            }

            // Nếu người dùng đang vuốt cuộn trang web -> bỏ qua
            if (touchMoved) {
                lastTapTime = 0;
                accumulatedSeekSec = 0;
                lastTapSide = null;
                return;
            }

            const now = Date.now();
            const DOUBLE_TAP_THRESHOLD = 300;
            const timeSinceLastTap = now - lastTapTime;

            const rect = clickzone.getBoundingClientRect();
            const t = e.changedTouches[0] || e.touches[0];
            if (!t || rect.width <= 0) return;

            const tapX = t.clientX - rect.left;
            const isLeft = tapX < rect.width * 0.42;
            const isRight = tapX > rect.width * 0.58;
            const currentSide = isLeft ? 'left' : (isRight ? 'right' : 'center');

            if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD && currentSide !== 'center' && (lastTapSide === currentSide || !lastTapSide)) {
                // ─── CHẠM ĐÚP / NHẤP LIÊN TIẾP (TUA 5S MỖI LẦN NHẤP CHUẨN YOUTUBE) ───
                // Huỷ ngay timer Single Tap để không bị chớp bật/tắt thanh điều khiển
                if (singleTapTimer) {
                    clearTimeout(singleTapTimer);
                    singleTapTimer = null;
                }

                lastTapTime = now;
                lastTapSide = currentSide;

                if (seekAccumulateTimer) clearTimeout(seekAccumulateTimer);
                accumulatedSeekSec += 5; // Bước tua 5s

                const isForward = (currentSide === 'right');
                const seekSign = isForward ? '+' : '-';
                const targetDelta = isForward ? 5 : -5;

                if (player) {
                    const newTime = isForward 
                        ? Math.min(player.duration || 0, player.currentTime + targetDelta)
                        : Math.max(0, player.currentTime + targetDelta);
                    player.currentTime = newTime;
                }

                showSeekOverlay(`${seekSign}${accumulatedSeekSec}s`, isForward, true);
                showControls(3800);

                // Tự động reset bộ đếm cộng dồn sau 650ms nếu người dùng ngưng nhấp
                seekAccumulateTimer = setTimeout(() => {
                    accumulatedSeekSec = 0;
                    lastTapSide = null;
                }, 650);

            } else if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD && currentSide === 'center') {
                // Chạm đúp ở giữa màn hình -> Tạm dừng / Tiếp tục
                if (singleTapTimer) {
                    clearTimeout(singleTapTimer);
                    singleTapTimer = null;
                }
                lastTapTime = 0;
                accumulatedSeekSec = 0;
                lastTapSide = null;
                togglePlayPause();
                showControls(3800);
            } else {
                // ─── CHẠM LẦN 1 (SINGLE TAP) - CÓ DEBOUNCE 240MS CHỐNG CHỚP MÀN HÌNH ───
                lastTapTime = now;
                lastTapSide = currentSide;
                accumulatedSeekSec = 0;

                if (singleTapTimer) clearTimeout(singleTapTimer);

                // Chờ 240ms: Nếu người dùng không chạm lần 2 (để tua 5s) thì mới chuyển đổi bật/tắt controls
                singleTapTimer = setTimeout(() => {
                    singleTapTimer = null;
                    lastTapSide = null;
                    if (!controls) return;

                    if (!wasControlsVisibleOnTouchStart) {
                        // Nếu đang ẩn -> Hiện thanh điều khiển trong 3.8s
                        showControls(3800);
                    } else {
                        // Nếu đang hiện -> Ẩn ngay lập tức
                        if (settingsMenu && !settingsMenu.classList.contains('hidden')) {
                            settingsMenu.classList.add('hidden');
                        } else {
                            hideControls(true);
                        }
                    }
                }, 240);
            }
        });

        clickzone.addEventListener('touchcancel', () => {
            cancelLongPress();
            touchMoved = false;
            lastTapTime = 0;
            accumulatedSeekSec = 0;
            lastTapSide = null;
            if (singleTapTimer) {
                clearTimeout(singleTapTimer);
                singleTapTimer = null;
            }
            if (seekAccumulateTimer) {
                clearTimeout(seekAccumulateTimer);
                seekAccumulateTimer = null;
            }
        });
    }

    // Keyboard Shortcuts: Space (Play/Pause), ArrowRight/Left (10s), ArrowUp/Down (Vol), M (Mute), F (FS)
    if (window._watchKeydownHandler) {
        document.removeEventListener('keydown', window._watchKeydownHandler, true);
    }
    window._watchKeydownHandler = function (e) {
        if (e.isComposing) return;
        const active = document.activeElement;
        if (active && (
            active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT' ||
            active.isContentEditable ||
            active.closest('input, textarea, select, [contenteditable], .ap-auth-input, .ap-cmt-textarea')
        )) {
            return;
        }

        if (e.code === 'Space' || e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.code === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
            showSeekOverlay('+10s', true);
        } else if (e.code === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
            e.preventDefault();
            player.currentTime = Math.max(0, player.currentTime - 10);
            showSeekOverlay('-10s', false);
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            player.volume = Math.min(1, player.volume + 0.1);
            if (volumeSlider) volumeSlider.value = player.volume;
            updateVolumeIcon(player.volume, player.muted);
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            player.volume = Math.max(0, player.volume - 0.1);
            if (volumeSlider) volumeSlider.value = player.volume;
            updateVolumeIcon(player.volume, player.muted);
        } else if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            if (btnVolume) btnVolume.click();
        } else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            if (btnFs) btnFs.click();
        }
    };
    document.addEventListener('keydown', window._watchKeydownHandler, true);

    player.addEventListener('error', (e) => {
        // Chỉ kích hoạt handleStreamError nếu lỗi thực sự và KHÔNG dùng Hls (vì Hls đã có bộ xử lý hls.on(Hls.Events.ERROR) riêng)
        // Tránh video element bắn lỗi giả lúc vừa mount khi src đang chờ Hls attach
        if (!window.hls && player.src && player.src !== window.location.href) {
            console.error('❌ Video element error:', e);
            _isInitializingPlayer = false;
            handleStreamError();
        }
    });

    player.addEventListener('loadstart', () => {
        _isInitializingPlayer = false;
    }, { once: true });
}

// Server error handler
function handleStreamError() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0) {
        showError('Không thể phát video từ máy chủ này. Vui lòng thử lại sau.');
        return;
    }

    // 🛡️ CHỐNG VÒNG LẶP VÔ TẬN: Lưu vết các server đã thử trong phiên phát
    window._failedServersForEpisode = window._failedServersForEpisode || new Set();
    window._failedServersForEpisode.add(currentServerIndex);

    const totalServers = currentMovie.episodes.length;

    // Kiểm tra nếu tất cả máy chủ đều đã thử và thất bại -> Dừng ngay, không quay vòng lặp vô tận
    if (window._failedServersForEpisode.size >= totalServers) {
        console.error('❌ Toàn bộ máy chủ đều không phát được (Dead servers):', Array.from(window._failedServersForEpisode));
        showError('Tất cả máy chủ đều đang bảo trì hoặc gặp sự cố đường truyền. Vui lòng bấm Báo Lỗi để Admin xử lý ngay nhé!');
        return;
    }

    // Tìm máy chủ tiếp theo CHƯA từng bị lỗi (tránh nhảy vào server chết đã biết)
    let nextServerIndex = -1;
    for (let i = 1; i < totalServers; i++) {
        const candidate = (currentServerIndex + i) % totalServers;
        if (!window._failedServersForEpisode.has(candidate)) {
            nextServerIndex = candidate;
            break;
        }
    }

    if (nextServerIndex === -1) {
        showError('Tất cả máy chủ đều đang bảo trì hoặc gặp sự cố đường truyền. Vui lòng bấm Báo Lỗi để Admin xử lý ngay nhé!');
        return;
    }

    // Trên mobile: Nếu có iframe (trừ opstream) thì dùng tạm để tránh kẹt, nếu không thì NHẢY SANG MÁY CHỦ KẾ TIẾP (VSMOV)
    if (window.innerWidth <= 768) {
        console.warn('⚠️ Stream error detected on Mobile.');

        // 1. Fallback sang iframe CỦA NGUỒN HIỆN TẠI nếu có (không phải opstream)
        if (currentEpisode && currentEpisode.link_embed && !currentEpisode.link_embed.includes('opstream')) {
            console.log('🔄 Mobile native player failed. Falling back to current iframe:', currentEpisode.link_embed);
            loadIframeFallback(currentEpisode.link_embed);
            return;
        }

        // 2. Chuyển sang MÁY CHỦ TIẾP THEO (Tự động nhảy nguồn trên Mobile luôn)
        currentServerIndex = nextServerIndex;
        window.currentServerIndex = nextServerIndex;
        window.requestedServerIndex = nextServerIndex;
        const nextServer = currentMovie.episodes[nextServerIndex];
        console.warn(`🔄 Mobile switching to backup server: ${nextServer.server_name}`);

        // 🛡️ CHỐNG DEAD SERVER LOOP: Ghi đè ngay máy chủ sống mới vào localStorage
        if (currentMovie && currentMovie.slug) {
            saveServerPreference(currentMovie.slug, nextServerIndex, nextServer);
        }

        const matchingEpisode = nextServer.server_data.find(ep => ep.name === currentEpisode.name) || nextServer.server_data[0];
        if (matchingEpisode) {
            currentEpisode = matchingEpisode;
            // 🛡️ DÙNG replaceState: Không làm ô nhiễm lịch sử nút Back của trình duyệt
            updateWatchUrlState(currentMovie, currentEpisode, currentServerIndex, true);
            renderEpisodeList(currentMovie.episodes);

            // Nếu nguồn mới (VSMOV) có iframe, NÊN ưu tiên dùng iframe trên Mobile để tránh lỗi "Require User Gesture" khi auto-play
            if (currentEpisode.link_embed && !currentEpisode.link_embed.includes('opstream')) {
                console.log('🔄 Mobile loading backup iframe:', currentEpisode.link_embed);
                loadIframeFallback(currentEpisode.link_embed);
            } else {
                // Nếu phải dùng HLS, load nhưng không auto-play (để người dùng bấm)
                showSeekOverlay(`Chuyển sang: ${nextServer.server_name}... Vui lòng bấm Phát!`, true);
                setTimeout(() => {
                    initializePlayer(currentEpisode);
                    // Force pause to wait for user gesture
                    if (player) {
                        player.pause();
                        // Show play button overlay
                        const mobCtrl = document.getElementById('mob-player-ctrl');
                        if (mobCtrl) mobCtrl.style.display = 'flex';
                    }
                }, 500);
            }
            return;
        }

        showError('Không thể phát video từ máy chủ này. Vui lòng chọn máy chủ khác.');
        return;
    }

    // Trên PC: Ưu tiên iframe hiện tại (nếu có, loại trừ opstream)
    if (currentEpisode && currentEpisode.link_embed && !currentEpisode.link_embed.includes('opstream')) {
        console.log('🔄 PC native player failed. Falling back to iframe embed:', currentEpisode.link_embed);
        loadIframeFallback(currentEpisode.link_embed);
        return;
    }

    // Trên PC: Tự động nhảy sang máy chủ tiếp theo
    currentServerIndex = nextServerIndex;
    window.currentServerIndex = nextServerIndex;
    window.requestedServerIndex = nextServerIndex;
    const nextServer = currentMovie.episodes[nextServerIndex];
    console.warn(`🔄 Stream error detected. Switching to backup server: ${nextServer.server_name}`);

    // 🛡️ CHỐNG DEAD SERVER LOOP: Ghi đè ngay máy chủ sống mới vào localStorage
    if (currentMovie && currentMovie.slug) {
        saveServerPreference(currentMovie.slug, nextServerIndex, nextServer);
    }

    const matchingEpisode = nextServer.server_data.find(ep => ep.name === currentEpisode.name) || nextServer.server_data[0];
    if (matchingEpisode) {
        currentEpisode = matchingEpisode;
        // 🛡️ DÙNG replaceState: Không làm ô nhiễm lịch sử nút Back của trình duyệt
        updateWatchUrlState(currentMovie, currentEpisode, currentServerIndex, true);
        renderEpisodeList(currentMovie.episodes);
        showSeekOverlay(`Đang chuyển: ${nextServer.server_name}...`, true);
        setTimeout(() => {
            initializePlayer(currentEpisode);
        }, 1200);
    } else {
        showError('Không tìm thấy tập phim trên server dự phòng.');
    }
}

// Hàm hỗ trợ load iframe nhanh chóng
function loadIframeFallback(embedUrl) {
    const playerContainer = document.querySelector('.aspect-video') || document.getElementById('player-container');
    if (playerContainer) {
        playerContainer.innerHTML = `
            <iframe id="videoIframe" 
                src="${embedUrl}" 
                class="w-full h-full bg-black border-0" 
                allowfullscreen 
                allow="autoplay; fullscreen">
            </iframe>
        `;

        window.player = {
            currentTime: 0, duration: 0, paused: false,
            play: async () => { }, pause: () => { },
            addEventListener: () => { }, removeEventListener: () => { },
            canPlayType: () => false,
            requestFullscreen: async () => {
                const iframe = document.getElementById('videoIframe');
                if (iframe && iframe.requestFullscreen) iframe.requestFullscreen();
            }
        };

        const mobCtrl = document.getElementById('mob-player-ctrl');
        if (mobCtrl) mobCtrl.style.display = 'none';
        _isInitializingPlayer = false;
    }
}

// Setup video player controls
function setupVideoPlayer() {
    // Add custom controls if needed
    addQualitySelector();
    addSpeedControl();
    addFullscreenButton();
}

// Add quality selector
function addQualitySelector() {
    // Quality selector implementation
    const qualities = APP_CONFIG.VIDEO_QUALITIES;
    // Add UI for quality selection
}

// Add speed control
function addSpeedControl() {
    if (!player) return;

    const speeds = APP_CONFIG.PLAYBACK_SPEEDS;
    // Add UI for playback speed
}

// Add fullscreen button
function addFullscreenButton() {
    if (!player) return;

    // Fullscreen functionality
    player.addEventListener('dblclick', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            player.requestFullscreen();
        }
    });
}

// Change episode is defined globally as an instant transition helper below

// Auto play next episode is implemented with Netflix-grade countdown overlay below

// Load recommendations
async function loadRecommendations() {
    const sidebar = document.getElementById('recommendations-list') || document.querySelector('aside .space-y-4');
    if (!sidebar) return;

    try {
        const data = await movieAPI.getMovieList(1);
        let movies = [];

        if (data && data.data && data.data.items) {
            movies = data.data.items.slice(0, 6);
        } else if (data && data.items) {
            movies = data.items.slice(0, 6);
        } else if (Array.isArray(data)) {
            movies = data.slice(0, 6);
        }

        if (movies.length > 0) {
            renderRecommendations(movies, sidebar);
        } else {
            console.warn("No recommendation movies found. API Response:", data);
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
    }
}

// Render recommendations
function renderRecommendations(movies) {
    const containers = document.querySelectorAll('.watch-rec-container');
    if (containers.length === 0) return;

    // Inject CSS for the new list format
    if (!document.getElementById('watch-recommendations-css')) {
        const style = document.createElement('style');
        style.id = 'watch-recommendations-css';
        style.innerHTML = `
            .watch-rec-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .watch-rec-item {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 16px !important;
                padding: 10px 8px !important;
                border-radius: 12px;
                background: transparent;
                transition: background 0.2s ease;
                text-decoration: none;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .watch-rec-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
            .watch-rec-thumb {
                width: 76px !important;
                height: 102px !important;
                min-width: 76px !important;
                max-width: 76px !important;
                object-fit: cover !important;
                border-radius: 8px !important;
                flex-shrink: 0 !important;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
                position: static !important;
            }
            .watch-rec-info {
                flex: 1 !important;
                min-width: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                justify-content: center !important;
                gap: 6px !important;
            }
            .watch-rec-name {
                color: #e5e7eb;
                font-size: 15.5px;
                font-weight: 600;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
            }
            .watch-rec-meta {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12.5px;
                color: #9ca3af;
            }
            .watch-rec-badge {
                background: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: bold;
                color: #fff;
            }
            .watch-rec-dot {
                font-size: 14px;
            }
            
            /* --- Mobile Horizontal Scroll Layout --- */
            @media (max-width: 1023px) {
                .watch-rec-list {
                    flex-direction: row;
                    overflow-x: auto;
                    overflow-y: hidden;
                    scroll-snap-type: x mandatory;
                    padding-bottom: 8px;
                    scrollbar-width: none;
                }
                .watch-rec-list::-webkit-scrollbar {
                    display: none;
                }
                .watch-rec-item {
                    min-width: 290px !important;
                    width: 290px !important;
                    max-width: 290px !important;
                    scroll-snap-align: start;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
            }
        `;
        document.head.appendChild(style);
    }

    const html = movies.map(movie => {
        let ratingNum = movie.tmdb?.vote_average || movie.imdb?.vote_average || 0;
        const rating = ratingNum > 0 ? Number(ratingNum).toFixed(1) : '7.1';
        const badge = movie.quality || 'HD';
        const episode = movie.episode_current || 'Tập 1';

        return `
            <a href="/phim/${movie.slug}" class="watch-rec-item group">
                <img data-src="${movieAPI.getImageURL(movie.thumb_url, 300, 85, true)}" 
                     alt="${movie.name}" class="watch-rec-thumb" loading="lazy" 
                     data-tmdb-slug="${movie.slug}"
                     data-tmdb-id="${movie.tmdb?.id || ''}"
                     data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                     data-tmdb-year="${movie.year || ''}"
                     data-tmdb-type="poster"
                     src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E" onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '', typeof movie !== 'undefined' ? (movie.name || movie.title) : '') : null" />
                <div class="watch-rec-info">
                    <h4 class="watch-rec-name group-hover:text-red-500 transition-colors">${movie.name}</h4>
                    <div class="watch-rec-meta">
                        <span class="watch-rec-badge">${badge}</span>
                        <span class="watch-rec-dot">•</span>
                        <span>${episode}</span>
                        <span class="watch-rec-dot">•</span>
                        <span class="flex items-center gap-[2px] text-yellow-400 font-bold"><span class="material-icons-round" style="font-size: 12px;">star</span>${rating}</span>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    containers.forEach(container => {
        container.className = 'watch-rec-container watch-rec-list';
        container.innerHTML = html;
    });
}

// Show error
function showError(message) {
    if (!document.getElementById('dotlottie-script')) {
        const script = document.createElement('script');
        script.id = 'dotlottie-script';
        script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
        script.type = "module";
        document.body.appendChild(script);
    }

    let altServerHTML = '';
    const totalServers = (typeof currentMovie !== 'undefined' && currentMovie && currentMovie.episodes) ? currentMovie.episodes.length : 0;
    const isAllServersDead = window._failedServersForEpisode && totalServers > 0 && window._failedServersForEpisode.size >= totalServers;

    if (isAllServersDead) {
        // 🛡️ Khi TẤT CẢ máy chủ đều sập: Dừng lại và hiện nút BÁO LỖI PHIM
        altServerHTML = `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4);" class="mt-4 p-4 rounded-xl max-w-md flex flex-col items-center gap-3 shadow-xl backdrop-blur-md">
                <div class="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <span class="material-icons-round text-base">warning</span>
                    <span>Tất cả máy chủ đều đang bảo trì</span>
                </div>
                <p class="text-gray-300 text-xs text-center leading-relaxed">Toàn bộ các nguồn phát hiện tại đang gặp sự cố đường truyền hoặc bản quyền. Bạn vui lòng bấm nút Báo Lỗi để Admin kiểm tra và khắc phục sớm nhất nhé!</p>
                <button onclick="reportError()" class="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer">
                    <span class="material-icons-round text-base">report_problem</span>
                    Báo lỗi cho Admin ngay
                </button>
            </div>
        `;
    } else if (typeof currentMovie !== 'undefined' && currentMovie && currentMovie.episodes && currentMovie.episodes.length > 1) {
        let targetIndex = -1;
        for (let i = 1; i < totalServers; i++) {
            const candidate = (currentServerIndex + i) % totalServers;
            if (!window._failedServersForEpisode || !window._failedServersForEpisode.has(candidate)) {
                targetIndex = candidate;
                break;
            }
        }
        if (targetIndex !== -1) {
            const targetServer = currentMovie.episodes[targetIndex];
            const targetName = targetServer.original_server_name || targetServer.server_name || `Nguồn ${targetIndex + 1}`;

            altServerHTML = `
                <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4);" class="mt-4 p-3.5 rounded-xl max-w-md flex flex-col items-center gap-2 shadow-xl backdrop-blur-md">
                    <div class="flex items-center gap-1.5 text-emerald-400 font-bold text-xs sm:text-sm">
                        <span class="material-icons-round text-sm">info</span>
                        <span>Gợi ý: Thử đổi sang máy chủ dự phòng</span>
                    </div>
                    <p class="text-gray-300 text-xs">Máy chủ hiện tại không phát được. Bạn hãy bấm nút bên dưới để đổi sang <b>${targetName}</b> nhé!</p>
                    <button onclick="changeServer(${targetIndex})" class="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-md hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer">
                        <span class="material-icons-round text-base">swap_horiz</span>
                        Chuyển sang ${targetName} ngay
                    </button>
                </div>
            `;
        }
    }

    const playerContainer = document.querySelector('.aspect-video');
    if (playerContainer) {
        playerContainer.innerHTML = `
            <div class="w-full h-full bg-black flex flex-col items-center justify-center text-center overflow-y-auto" style="padding: 16px; box-sizing: border-box;">
                ${altServerHTML}
            </div>
        `;
    } else {
        const main = document.querySelector('main');
        if (main) {
            const currentSlug = (typeof slug !== 'undefined' && slug) ? slug : (window.location.pathname.split('/').filter(Boolean).pop() || '');
            const movieTitle = (typeof currentMovie !== 'undefined' && currentMovie && currentMovie.name ? currentMovie.name : '') ||
                document.getElementById('breadcrumb-movie-name')?.textContent?.trim() ||
                document.querySelector('h1')?.textContent?.trim() ||
                (currentSlug ? currentSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Phim');

            // Hiển thị popup modal thông báo trên nền trang xem phim (chuẩn Ảnh số 3)
            const existing = document.getElementById('cinemaNoticeModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'cinemaNoticeModal';
            modal.className = 'cinema-notice-modal-backdrop';
            modal.innerHTML = `
                <div class="cinema-notice-card" onclick="event.stopPropagation();" onpointerdown="event.stopPropagation();">
                    <button onpointerdown="window.closeCinemaWatchNotice(event)" onclick="window.closeCinemaWatchNotice(event)" class="cinema-notice-close-btn" title="Đóng thông báo">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <div class="cinema-notice-mascot">
                        <dotlottie-wc src="/icons/panda-popcorn.lottie" autoplay loop></dotlottie-wc>
                    </div>
                    <div class="cinema-notice-content">
                        <div class="cinema-notice-title">
                            Phim đang chiếu Rạp • Sớm có bản đẹp! 🎉
                        </div>
                        <div class="cinema-notice-desc">
                            <strong style="color: #fef08a;">${movieTitle}</strong> hiện đang công chiếu tại rạp. Trang sẽ sớm cập nhật bản đẹp, bạn vui lòng quay lại sau nhé!
                        </div>
                    </div>
                    <a href="/danh-sach?list=phim-chieu-rap" class="cinema-notice-btn" title="Khám phá các phim chiếu rạp khác">
                        Phim khác
                    </a>
                </div>
            `;
            window.closeCinemaWatchNotice = function(e) {
                if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                const m = document.getElementById('cinemaNoticeModal');
                if (m) {
                    if (m._closing) return;
                    m._closing = true;
                    const c = m.querySelector('.cinema-notice-card');
                    if (c) {
                        c.style.transition = 'transform 0.12s cubic-bezier(0.4, 0, 1, 1), opacity 0.12s ease';
                        c.style.transform = 'scale(0.88)';
                        c.style.opacity = '0';
                    }
                    m.style.transition = 'opacity 0.12s ease';
                    m.style.opacity = '0';
                    setTimeout(() => m.remove(), 120);
                }
            };
            modal.addEventListener('pointerdown', (e) => {
                if (e.target === modal) window.closeCinemaWatchNotice(e);
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) window.closeCinemaWatchNotice(e);
            });
            document.body.appendChild(modal);
        }
    }
}

// Setup Share and Save buttons
function setupActionButtons() {
    const saveBtns = [document.getElementById('saveMovieBtn'), document.getElementById('sidebarSaveMovieBtn')].filter(Boolean);
    const favBtns = [document.getElementById('favoriteMovieBtn'), document.getElementById('sidebarFavoriteMovieBtn')].filter(Boolean);

    // Setup save buttons
    saveBtns.forEach(btn => {
        if (currentMovie) {
            updateSaveButton(btn);
            btn.onclick = (e) => {
                e.preventDefault();
                toggleSaveMovie(btn);
            };
        }
    });

    // Setup favorite buttons
    favBtns.forEach(btn => {
        if (currentMovie) {
            updateFavoriteButton(btn);
            btn.onclick = (e) => {
                e.preventDefault();
                toggleFavoriteMovie(btn);
            };
        }
    });

    // Programmatically bind click and touch handlers for Safari/iOS compatibility
    const prevBtn = document.getElementById('btn-prev-episode');
    const nextBtn = document.getElementById('btn-next-episode');
    const cinemaBtn = document.getElementById('cinemaModeBtn');
    const fsBtn = document.getElementById('fullscreenBtn');

    if (prevBtn && !prevBtn.hasAttribute('data-safari-bound')) {
        prevBtn.setAttribute('data-safari-bound', 'true');
        const handlePrev = (e) => {
            e.preventDefault();
            if (typeof playPreviousEpisode === 'function') playPreviousEpisode();
        };
        prevBtn.addEventListener('click', handlePrev);
        prevBtn.addEventListener('touchend', handlePrev, { passive: false });
    }

    if (nextBtn && !nextBtn.hasAttribute('data-safari-bound')) {
        nextBtn.setAttribute('data-safari-bound', 'true');
        const handleNext = (e) => {
            e.preventDefault();
            if (typeof playNextEpisode === 'function') playNextEpisode();
        };
        nextBtn.addEventListener('click', handleNext);
        nextBtn.addEventListener('touchend', handleNext, { passive: false });
    }

    // Note: cinemaModeBtn is handled directly via onclick/toggleCinemaMode to avoid double-firing

    if (fsBtn && !fsBtn.hasAttribute('data-safari-bound')) {
        fsBtn.setAttribute('data-safari-bound', 'true');
        const handleFs = (e) => {
            e.preventDefault();
            if (typeof toggleFullscreen === 'function') toggleFullscreen();
        };
        fsBtn.addEventListener('click', handleFs);
        fsBtn.addEventListener('touchend', handleFs, { passive: false });
    }
}

// Share movie function
function shareMovie() {
    if (!currentMovie) return;

    const shareData = {
        title: currentMovie.name,
        text: `Xem phim ${currentMovie.name} (${currentMovie.year}) trên A Phim`,
        url: window.location.href
    };

    // Check if Web Share API is supported
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('✅ Shared successfully'))
            .catch((error) => console.log('❌ Error sharing:', error));
    } else {
        // Fallback: Copy link to clipboard
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                alert('✅ Đã sao chép link phim vào clipboard!');
            })
            .catch(() => {
                // Show share modal with social media options
                showShareModal();
            });
    }
}

// Show share modal
function showShareModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.innerHTML = `
        <div class="bg-surface-dark rounded-xl p-6 max-w-md w-full mx-4 border border-white/10">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-white">Chia sẻ phim</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            <div class="mb-4">
                <p class="text-gray-300 mb-2">${currentMovie.name}</p>
                <div class="flex items-center gap-2 bg-black/40 p-3 rounded-lg">
                    <input type="text" value="${window.location.href}" 
                        class="flex-1 bg-transparent text-gray-300 text-sm outline-none" readonly />
                    <button onclick="copyShareLink()" 
                        class="px-3 py-1 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors text-sm">
                        Sao chép
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-4 gap-3">
                <button onclick="shareToFacebook()" 
                    class="flex flex-col items-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                    <span class="text-2xl">📘</span>
                    <span class="text-xs text-white">Facebook</span>
                </button>
                <button onclick="shareToTwitter()" 
                    class="flex flex-col items-center gap-2 p-3 bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors">
                    <span class="text-2xl">🐦</span>
                    <span class="text-xs text-white">Twitter</span>
                </button>
                <button onclick="shareToTelegram()" 
                    class="flex flex-col items-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
                    <span class="text-2xl">✈️</span>
                    <span class="text-xs text-white">Telegram</span>
                </button>
                <button onclick="shareToZalo()" 
                    class="flex flex-col items-center gap-2 p-3 bg-blue-400 hover:bg-blue-500 rounded-lg transition-colors">
                    <span class="text-2xl">💬</span>
                    <span class="text-xs text-white">Zalo</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Copy share link
window.copyShareLink = function () {
    navigator.clipboard.writeText(window.location.href)
        .then(() => {
            alert('✅ Đã sao chép link!');
        });
};

// Share to social media
window.shareToFacebook = function () {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

window.shareToTwitter = function () {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Xem phim ${currentMovie.name} trên A Phim`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
};

window.shareToTelegram = function () {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Xem phim ${currentMovie.name}`);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
};

window.shareToZalo = function () {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://zalo.me/share?url=${url}`, '_blank');
};

// Toggle save movie (Launch Playlist Modal)
function toggleSaveMovie(button) {
    if (!currentMovie) return;

    // Check if user is logged in
    if (!authService.isLoggedIn()) {
        if (typeof window.showAuthModal === 'function') {
            window.showAuthModal('login');
        }
        return;
    }

    // Open standard playlist management modal
    if (typeof openPlaylistModal === 'function') {
        openPlaylistModal({
            slug: currentMovie.slug,
            name: currentMovie.name,
            thumb_url: currentMovie.thumb_url || currentMovie.poster_url,
            year: currentMovie.year
        });
    } else {
        console.error('❌ openPlaylistModal function not defined. Verify playlist-modal.js loading.');
    }
}

// Update save button UI
function updateSaveButton(button) {
    // For playlist modal, the button always triggers the prompt. 
    // Optional: we could dynamically check if it exists in ANY playlist.
    // Keeping it simple and functional as a prompt trigger.
    if (!currentMovie) return;
}

// setupActionButtons is now called directly in loadMovieAndPlay() after currentMovie is set

// Toggle favorite movie
function toggleFavoriteMovie(button) {
    if (!currentMovie) return;

    const loggedIn = (typeof authService !== 'undefined' && authService && typeof authService.isLoggedIn === 'function') ? authService.isLoggedIn() : false;
    if (!loggedIn) {
        if (typeof window.showAuthModal === 'function') {
            window.showAuthModal('login');
        } else if (typeof showAuthModal === 'function') {
            showAuthModal('login');
        } else {
            alert('Vui lòng đăng nhập để thích phim!');
        }
        return;
    }

    const targetSlug = currentMovie.slug || currentMovie.id;
    if (userService.isFavorite(targetSlug)) {
        userService.removeFromFavorites(targetSlug);
    } else {
        userService.addToFavorites(currentMovie);
    }

    // Synchronize both primary and sidebar favorite buttons
    const favBtns = [document.getElementById('favoriteMovieBtn'), document.getElementById('sidebarFavoriteMovieBtn')].filter(Boolean);
    favBtns.forEach(btn => updateFavoriteButton(btn));
}

// Update favorite button UI
function updateFavoriteButton(button) {
    if (!currentMovie || !button) return;

    const loggedIn = (typeof authService !== 'undefined' && authService && typeof authService.isLoggedIn === 'function') ? authService.isLoggedIn() : false;
    const isFav = loggedIn ? userService.isFavorite(currentMovie.slug) : false;
    const icon = button.querySelector('.material-icons-round') || button.querySelector('.material-icons-outlined');
    const svg = button.querySelector('svg');
    const textSpan = button.querySelector('.whitespace-nowrap') || button.querySelector('span:not(.material-icons-round)');

    if (isFav) {
        if (icon) {
            icon.textContent = 'favorite';
            icon.classList.remove('group-hover:text-red-400');
            icon.classList.add('text-red-500');
            icon.style.color = '#ef4444';
        }
        if (svg) {
            svg.style.color = '#ef4444';
            svg.style.stroke = '#ef4444';
            svg.style.fill = '#ef4444';
        }
        if (textSpan) {
            textSpan.textContent = 'Đã thích';
            textSpan.classList.add('text-red-500');
        }
        button.classList.add('text-red-500', 'is-favorite-active');
        button.classList.remove('text-gray-300', 'text-gray-200');
    } else {
        if (icon) {
            icon.textContent = 'favorite_border';
            icon.classList.add('group-hover:text-red-400');
            icon.classList.remove('text-red-500');
            icon.style.color = '';
        }
        if (svg) {
            svg.style.color = '';
            svg.style.stroke = 'currentColor';
            svg.style.fill = 'none';
        }
        if (textSpan) {
            textSpan.textContent = 'Yêu thích';
            textSpan.classList.remove('text-red-500');
        }
        button.classList.remove('text-red-500', 'is-favorite-active');
        button.classList.add('text-gray-200');
    }
}



// Show YouTube/Netflix-style visual seek notification overlay
function showSeekOverlay(text, isRight) {
    const container = document.querySelector('.aspect-video');
    if (!container) return;

    // Remove existing seek indicators to avoid overlaps
    const oldIndicator = container.querySelector('.seek-indicator');
    if (oldIndicator) oldIndicator.remove();

    const indicator = document.createElement('div');
    indicator.className = `seek-indicator absolute z-30 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center bg-black/70 text-white rounded-full w-24 h-24 backdrop-blur-md transition-all duration-300 scale-75 opacity-0`;

    // Explicitly enforce horizontal positioning on correct side of the parent player container
    indicator.style.position = 'absolute';
    indicator.style.top = '50%';
    indicator.style.transform = 'translate(-50%, -50%)';
    if (isRight) {
        indicator.style.right = '20%';
        indicator.style.left = 'auto';
    } else {
        indicator.style.left = '20%';
        indicator.style.right = 'auto';
    }

    const icon = isRight ? 'fast_forward' : 'fast_rewind';
    indicator.innerHTML = `
        <span class="material-icons-round text-4xl mb-1.5 animate-pulse">${icon}</span>
        <span class="text-xs font-black tracking-wider">${text}</span>
    `;

    container.appendChild(indicator);

    // Smooth fade & scale entrance
    requestAnimationFrame(() => {
        indicator.classList.remove('scale-75', 'opacity-0');
        indicator.classList.add('scale-100', 'opacity-100');
    });

    // Fade out and self-destruct after 800ms
    setTimeout(() => {
        indicator.classList.add('scale-75', 'opacity-0');
        setTimeout(() => indicator.remove(), 300);
    }, 800);
}

// Global changeEpisode helper to update query string parameters and transition instantly
window.changeEpisode = function (episodeSlug) {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0) return;

    // 0. Clean up any active countdown overlay and timer
    if (window._autoNextInterval) {
        clearInterval(window._autoNextInterval);
        window._autoNextInterval = null;
    }
    const existingNextOverlay = document.getElementById('netflix-next-countdown');
    if (existingNextOverlay) {
        existingNextOverlay.remove();
    }

    // Pause old player to prevent background sound or ghost progress events
    if (player && typeof player.pause === 'function') {
        try { player.pause(); } catch(e) {}
    }

    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const foundEp = serverData.find(ep => ep.slug.replace(/^tap-/, '') === episodeSlug.replace(/^tap-/, ''));
    if (!foundEp) return;

    // 1. Update active state variables
    currentEpisode = foundEp;
    if (window._failedServersForEpisode) {
        window._failedServersForEpisode.clear();
    }

    // 2. Update URL query parameter cleanly without page reload
    updateWatchUrlState(currentMovie, currentEpisode, currentServerIndex);

    // 4. Update play stream (Re-initialize player or switch stream)
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        initializePlayer(currentEpisode);
    } else {
        renderPlayerPlaceholder(currentEpisode);
    }

    // 5. Update Watch History
    if (typeof userService !== 'undefined' && typeof userService.addToHistory === 'function') {
        userService.addToHistory(currentMovie, currentEpisode.name);
    }

    // 6. Rerender Episode List to update highlights
    renderEpisodeList(currentMovie.episodes);

    // 7. Update prev/next episode navigation buttons
    updateEpisodeNavButtons();
};

// Update under-player navigation skip buttons (opacity, clickability)
function updateEpisodeNavButtons() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug.replace(/^tap-/, '') === currentEpisode.slug.replace(/^tap-/, ''));

    const prevBtn = document.getElementById('btn-prev-episode');
    const nextBtn = document.getElementById('btn-next-episode');

    if (prevBtn) {
        if (currentIndex <= 0) {
            prevBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            prevBtn.classList.remove('hover:text-primary');
        } else {
            prevBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            prevBtn.classList.add('hover:text-primary');
        }
    }

    if (nextBtn) {
        if (currentIndex >= serverData.length - 1) {
            nextBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            nextBtn.classList.remove('hover:text-primary');
        } else {
            nextBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
            nextBtn.classList.add('hover:text-primary');
        }
    }
}

// Navigation skip buttons action
function playPreviousEpisode() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug.replace(/^tap-/, '') === currentEpisode.slug.replace(/^tap-/, ''));
    if (currentIndex > 0) {
        window.changeEpisode(serverData[currentIndex - 1].slug);
    }
}

function playNextEpisode() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug.replace(/^tap-/, '') === currentEpisode.slug.replace(/^tap-/, ''));
    if (currentIndex < serverData.length - 1) {
        window.changeEpisode(serverData[currentIndex + 1].slug);
    }
}

// Autoplay next episode with a gorgeous Netflix/Apple TV+ style countdown overlay
function autoPlayNext() {
    if (!currentMovie || !currentMovie.episodes || currentMovie.episodes.length === 0 || !currentEpisode) return;
    const serverData = currentMovie.episodes[currentServerIndex]?.server_data || currentMovie.episodes[0].server_data;
    const currentIndex = serverData.findIndex(ep => ep.slug.replace(/^tap-/, '') === currentEpisode.slug.replace(/^tap-/, ''));

    // If it's the last episode, do nothing
    if (currentIndex < 0 || currentIndex >= serverData.length - 1) return;

    const nextEpisode = serverData[currentIndex + 1];
    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) return;

    // Check if autoNext is enabled in settings
    const isAutoNextOn = localStorage.getItem('autoNext') !== 'false';

    // Clear any existing next-countdown
    if (window._autoNextInterval) {
        clearInterval(window._autoNextInterval);
        window._autoNextInterval = null;
    }
    const oldOverlay = document.getElementById('netflix-next-countdown');
    if (oldOverlay) oldOverlay.remove();

    // Hide control bar so it doesn't clutter behind the countdown card
    const controls = document.getElementById('aphim-controls');
    if (controls) {
        controls.classList.add('aphim-controls-hidden');
        controls.style.opacity = '0';
        controls.style.visibility = 'hidden';
    }

    const overlay = document.createElement('div');
    overlay.id = 'netflix-next-countdown';
    overlay.className = 'aphim-next-overlay';

    let countdownVal = 10;
    const totalDuration = 10;
    const circumference = 2 * Math.PI * 38; // ~238.76

    const movieName = currentMovie.name || currentMovie.title || '';
    const nextEpLabel = nextEpisode.name || `Tập ${currentIndex + 2}`;

    const movieThumb = (typeof movieAPI !== 'undefined' && movieAPI.getImageURL)
        ? movieAPI.getImageURL(currentMovie.thumb_url || currentMovie.poster_url, 600, 85, true)
        : (currentMovie.thumb_url || currentMovie.poster_url || '');

    overlay.innerHTML = `
        <div class="aphim-next-backdrop-img" style="background-image: url('${movieThumb}');"></div>
        <div class="aphim-next-backdrop-vignette"></div>

        <div class="aphim-next-card" id="aphim-next-card">
            <!-- Left: Thumbnail Preview with Glowing Circular Countdown Overlay -->
            <div class="aphim-next-thumb-wrap">
                <img src="${movieThumb}" alt="${nextEpLabel}" class="aphim-next-thumb-img" onerror="this.style.opacity='0'" />
                <div class="aphim-next-thumb-overlay"></div>
                
                <!-- Countdown Ring on Thumbnail -->
                <div class="aphim-next-thumb-timer">
                    <svg class="aphim-next-timer-svg" viewBox="0 0 88 88">
                        <defs>
                            <linearGradient id="aphimCountdownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#ffffff" />
                                <stop offset="45%" stop-color="#fcd576" />
                                <stop offset="100%" stop-color="#f59e0b" />
                            </linearGradient>
                            <filter id="aphimGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#fcd576" flood-opacity="0.8" />
                            </filter>
                        </defs>
                        <circle cx="44" cy="44" r="38" stroke="rgba(255, 255, 255, 0.2)" stroke-width="4.5" fill="rgba(0, 0, 0, 0.45)" />
                        <circle id="countdown-progress-bar" cx="44" cy="44" r="38" 
                                stroke="${isAutoNextOn ? 'url(#aphimCountdownGrad)' : 'rgba(252, 211, 118, 0.4)'}" 
                                stroke-width="4.5" 
                                stroke-linecap="round" 
                                fill="none" 
                                stroke-dasharray="${circumference}" 
                                stroke-dashoffset="0" 
                                filter="url(#aphimGlow)" 
                                style="transition: stroke-dashoffset 1s linear;"
                                transform="rotate(-90 44 44)" />
                    </svg>
                    <div class="aphim-next-timer-center">
                        ${isAutoNextOn ? `
                            <span id="countdown-number" class="aphim-next-timer-num">${countdownVal}</span>
                            <span id="countdown-unit" class="aphim-next-timer-unit">s</span>
                        ` : `
                            <div class="flex items-center justify-center text-[#fcd576]">
                                <svg class="w-5 h-5 fill-current ml-0.5 drop-shadow-[0_0_8px_rgba(252,211,118,0.8)]" viewBox="0 0 24 24"><polygon points="6 4 19 12 6 20 6 4"></polygon></svg>
                            </div>
                        `}
                    </div>
                </div>

                <div class="aphim-next-thumb-pill">
                    <span>HD</span>
                    <span>•</span>
                    <span>Vietsub</span>
                </div>
            </div>

            <!-- Right: Episode Information & Actions -->
            <div class="aphim-next-info-wrap">
                <div class="aphim-next-badge-row">
                    <div class="aphim-next-badge">
                        <svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></line></svg>
                        <span>Tập tiếp theo</span>
                    </div>
                    ${isAutoNextOn ? `
                        <span class="aphim-next-status-hint">Tự động phát sau <b id="countdown-sec-text">${countdownVal}</b>s</span>
                    ` : `
                        <span class="aphim-next-status-hint">Sẵn sàng phát</span>
                    `}
                </div>

                <div class="aphim-next-titles">
                    <h3 class="aphim-next-ep-name" title="${nextEpLabel}">${nextEpLabel}</h3>
                    ${movieName ? `<div class="aphim-next-movie-name" title="${movieName}">${movieName}</div>` : ''}
                </div>

                <div class="aphim-next-actions">
                    <button type="button" id="play-now-countdown-btn" class="aphim-next-btn-play" title="Phát tập tiếp theo ngay (Enter)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Phát ngay</span>
                    </button>
                    <button type="button" id="cancel-countdown-btn" class="aphim-next-btn-cancel" title="Ở lại tập này (Esc)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span>Ở lại</span>
                    </button>
                </div>

                <div class="aphim-next-kbd-hint">
                    <span><span class="aphim-next-kbd">Enter</span> Phát ngay</span>
                    <span>•</span>
                    <span><span class="aphim-next-kbd">Esc</span> Ở lại</span>
                </div>
            </div>
        </div>
    `;

    playerContainer.appendChild(overlay);

    // Fade and scale in smoothly
    requestAnimationFrame(() => {
        overlay.classList.add('is-active');
    });

    const progressCircle = document.getElementById('countdown-progress-bar');
    const countdownNumber = document.getElementById('countdown-number');

    // Dismiss helper
    function dismissCountdown() {
        if (window._autoNextInterval) {
            clearInterval(window._autoNextInterval);
            window._autoNextInterval = null;
        }
        window.removeEventListener('keydown', handleKeyDown);
        overlay.classList.remove('is-active');
        setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
        }, 320);
        if (typeof showControls === 'function') {
            showControls(3000);
        }
    }

    // Play next helper
    function triggerPlayNext() {
        if (window._autoNextInterval) {
            clearInterval(window._autoNextInterval);
            window._autoNextInterval = null;
        }
        window.removeEventListener('keydown', handleKeyDown);
        overlay.classList.remove('is-active');
        setTimeout(() => {
            if (overlay.parentNode) overlay.remove();
        }, 200);
        window.changeEpisode(nextEpisode.slug);
    }

    // Keyboard navigation listener
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            dismissCountdown();
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerPlayNext();
        }
    }
    window.addEventListener('keydown', handleKeyDown);

    // Button event listeners
    const cancelBtn = document.getElementById('cancel-countdown-btn');
    if (cancelBtn) cancelBtn.onclick = (e) => {
        e.stopPropagation();
        dismissCountdown();
    };

    const playBtn = document.getElementById('play-now-countdown-btn');
    if (playBtn) playBtn.onclick = (e) => {
        e.stopPropagation();
        triggerPlayNext();
    };

    // If autoNext is ON, start the 10-second countdown
    if (isAutoNextOn) {
        window._autoNextInterval = setInterval(() => {
            countdownVal--;
            if (countdownNumber) countdownNumber.textContent = countdownVal;
            const secText = document.getElementById('countdown-sec-text');
            if (secText) secText.textContent = countdownVal;
            if (progressCircle) {
                const offset = circumference * (1 - countdownVal / totalDuration);
                progressCircle.style.strokeDashoffset = offset;
            }

            if (countdownVal <= 0) {
                triggerPlayNext();
            }
        }, 1000);
    }
}

// =========================================================================
// 🎬 CINEMA / THEATER MODE (Rạp phim / Tắt đèn) - World-Class Standard
// =========================================================================
window.isCinemaModeActive = false;

window.toggleCinemaMode = function (forcedState) {
    const body = document.body;
    const mainPlayerBox = document.getElementById('main-player-box') || document.getElementById('player-and-controls');
    const badgeCinema = document.getElementById('badgeCinema');
    const cinemaBtn = document.getElementById('cinemaModeBtn');

    if (typeof forcedState === 'boolean') {
        window.isCinemaModeActive = forcedState;
    } else {
        window.isCinemaModeActive = !window.isCinemaModeActive;
    }

    if (window.isCinemaModeActive) {
        body.classList.add('cinema-active');

        // Update badge to ON (Green active badge)
        if (badgeCinema) {
            badgeCinema.className = 'badge-status-on';
            badgeCinema.textContent = 'ON';
        }
        if (cinemaBtn) {
            cinemaBtn.classList.add('text-amber-400', 'is-active');
        }

        // On Desktop, smooth scroll to top where player is centered in Cinema Mode. On Mobile, stay in place.
        try {
            if (window.innerWidth >= 1024) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (e) {}
    } else {
        body.classList.remove('cinema-active');

        // Update badge to OFF
        if (badgeCinema) {
            badgeCinema.className = 'badge-status-off';
            badgeCinema.textContent = 'OFF';
        }
        if (cinemaBtn) {
            cinemaBtn.classList.remove('text-amber-400', 'is-active');
        }
    }
};

window.toggleBadgeCinemaMode = function () {
    window.toggleCinemaMode();
};

// Keyboard Shortcuts: 'T' (Theater/Cinema mode) and 'Escape' (Exit Cinema Mode)
document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
    if (isInput) return;

    if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        window.toggleCinemaMode();
    } else if (e.key === 'Escape' && window.isCinemaModeActive) {
        e.preventDefault();
        window.toggleCinemaMode(false);
    }
});

// Toggle browser Fullscreen API on player container
function toggleFullscreen() {
    const playerContainer = document.querySelector('.aspect-video');
    if (!playerContainer) return;

    const fsBtn = document.getElementById('fullscreenBtn');

    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().then(() => {
            if (fsBtn) {
                fsBtn.innerHTML = `
                    <span class="material-icons-round text-sm sm:text-base">fullscreen_exit</span>
                    <span>Thu nhỏ</span>
                `;
            }
        }).catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen().then(() => {
            if (fsBtn) {
                fsBtn.innerHTML = `
                    <span class="material-icons-round text-sm sm:text-base">fullscreen</span>
                    <span>Toàn màn hình</span>
                `;
            }
        });
    }
}

// Sync fullscreen Escape exit
document.addEventListener('fullscreenchange', () => {
    const fsBtn = document.getElementById('fullscreenBtn');
    if (!fsBtn) return;
    if (document.fullscreenElement) {
        fsBtn.innerHTML = `
            <span class="material-icons-round text-sm sm:text-base">fullscreen_exit</span>
            <span>Thu nhỏ</span>
        `;
    } else {
        fsBtn.innerHTML = `
            <span class="material-icons-round text-sm sm:text-base">fullscreen</span>
            <span>Toàn màn hình</span>
        `;
    }
});

// Open Modal for reporting movie error
function reportError() {
    if (typeof window.openReportModal === 'function') {
        window.openReportModal();
    } else {
        const modal = document.getElementById('reportMovieModal');
        if (modal) {
            modal.classList.remove('opacity-0', 'pointer-events-none');
        }
    }
}





// --- EVENT LISTENERS CHO TÌM KIẾM/SẮP XẾP TẬP PHIM (WATCH PAGE) ---
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-episode-input');
    const sortBtn = document.getElementById('sort-episodes-btn');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            window.episodeSearchTerm = e.target.value;
            if (currentMovie && currentMovie.episodes) {
                renderEpisodeList(currentMovie.episodes);
            }
        });
    }

    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            window.episodeSortOrder = window.episodeSortOrder === 'asc' ? 'desc' : 'asc';
            if (currentMovie && currentMovie.episodes) {
                renderEpisodeList(currentMovie.episodes);
            }
        });
    }
});
const style = document.createElement('style');
style.innerHTML = '#mpbFs, #mab-fs, #fullscreenBtn { display: none !important; }';
document.head.appendChild(style);

