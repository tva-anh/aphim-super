/**
 * public/js/reels.js
 * 🎬 APhim Super TikTok & Reels Dual-Host Controller
 * 100% Zero-Lag A/B Swapping Engine with PostMessage Controls, Gestures & Infinite Feed
 */

(function () {
    'use strict';

    // ── Application State ────────────────────────────────────────────────────────
    localStorage.setItem('aphim_reels_unmuted', 'true');
    const state = {
        currentIndex: 0,
        currentTab: new URLSearchParams(window.location.search).get('tab') || 'review',
        currentPage: 1,
        isLoadingMore: false,
        hasMore: true,
        volume: parseInt(localStorage.getItem('aphim_reels_volume') || '100', 10) || 100,
        prevVolume: 100,
        isMuted: false, // 🔊 TỰ ĐỘNG BẬT ÂM THANH FULL 100% KHI VÀO REELS
        userInteracted: true,
        playbackSpeed: 1.0,
        videoQuality: '720p',
        autoNext: true,
        loopClip: false,
        availableSpeeds: [0.75, 1.0, 1.25, 1.5, 2.0],
        speedIndex: 1,
        lastTapTime: 0,
        tapTimeout: null,
        activeDuration: 0,
        slideDurations: {},
        activeHostKey: 'a', // 'a' or 'b'
        players: {
            a: { hostId: 'reels-player-host-a', fr: null, ytId: null, ready: false },
            b: { hostId: 'reels-player-host-b', fr: null, ytId: null, ready: false }
        },
        likedReels: new Set(JSON.parse(localStorage.getItem('aphim_reels_liked') || '[]')),
        savedReels: new Set(JSON.parse(localStorage.getItem('aphim_reels_saved') || '[]')),
        userInterests: JSON.parse(localStorage.getItem('aphim_reels_user_interests') || '{}'),
        watchedHistory: JSON.parse(localStorage.getItem('aphim_reels_watched_history') || '[]'),
        slideEnterTime: Date.now(),
        recordedLongWatch: new Set(),
        recordedFullWatch: new Set(),
        stallWatchdogTimer: null,
        errorSkipTimer: null,
        videoStartedPlaying: false,
        userPaused: false,
        seenYtSet: new Set()
    };

    // ── TikTok AI Recommendation & Topic Recognition Engine ─────────────────
    const GENRE_KEYWORD_MAP = {
        'han-quoc': ['han quoc', 'korean', 'k-drama', 'kdrama', 'oppa', 'seoul', 'han'],
        'hanh-dong': ['hanh dong', 'action', 'sat thu', 'dac nhiem', 'vo thuat', 'chien tranh', 'ban sung', 'danh nhau'],
        'kinh-di': ['kinh di', 'horror', 'ma quy', 'rung ron', 'sat nhan', 'am anh', 'tam linh'],
        'co-trang': ['co trang', 'cung dau', 'kiem hiep', 'tien hiep', 'hoang de', 'vuong phi', 'trung quoc'],
        'tinh-cam': ['tinh cam', 'lang man', 'romance', 'ngon tinh', 'tinh yeu', 'yeu duong', 'chia tay', 'cap doi'],
        'hoat-hinh': ['hoat hinh', 'anime', 'manga', 'dau la', 'one piece', 'naruto', 'hoat hoa', 'wibu'],
        'vien-tuong': ['vien tuong', 'sci-fi', 'vu tru', 'star wars', 'robot', 'sieu anh hung', 'marvel', 'dc'],
        'hai-huoc': ['hai huoc', 'comedy', 'cuoi', 'hai kich', 'cham biem', 'vui nhon'],
        'hinh-su': ['hinh su', 'pha an', 'tham tu', 'toi pham', 'canh sat', 'dieu tra', 'trinh tham'],
        'phim-chieu-rap': ['chieu rap', 'bom tan', 'cinema', 'box office']
    };

    function extractTopicsFromReelElement(reelEl) {
        if (!reelEl) return ['phim-hot'];
        const topics = new Set();
        const text = [
            reelEl.getAttribute('data-title') || '',
            reelEl.getAttribute('data-movie-title') || '',
            reelEl.getAttribute('data-categories') || '',
            reelEl.getAttribute('data-description') || ''
        ].join(' ').toLowerCase();

        const textNorm = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

        for (const [genreKey, keywords] of Object.entries(GENRE_KEYWORD_MAP)) {
            for (const kw of keywords) {
                if (textNorm.includes(kw)) {
                    topics.add(genreKey);
                    break;
                }
            }
        }

        if (topics.size === 0) topics.add('phim-hot');
        return Array.from(topics);
    }

    function recordUserAffinity(action, reelIndexOrItem) {
        let reelEl = null;
        if (typeof reelIndexOrItem === 'number' || typeof reelIndexOrItem === 'string') {
            reelEl = document.getElementById(`reel-item-${reelIndexOrItem}`);
        } else if (reelIndexOrItem instanceof HTMLElement) {
            reelEl = reelIndexOrItem;
        }

        if (!reelEl) return;

        const topics = extractTopicsFromReelElement(reelEl);
        const ytId = reelEl.getAttribute('data-yt') || '';
        const slug = reelEl.getAttribute('data-slug') || '';

        // TikTok Scoring Weights
        let delta = 2;
        if (action === 'like') delta = 6;
        else if (action === 'bookmark') delta = 7;
        else if (action === 'share') delta = 6;
        else if (action === 'comment') delta = 5;
        else if (action === 'watch_movie') delta = 10;
        else if (action === 'watch_full') delta = 6;
        else if (action === 'watch_long') delta = 3;
        else if (action === 'quick_skip') delta = -1;

        topics.forEach(t => {
            const cur = state.userInterests[t] || 0;
            const updated = Math.max(0, Math.min(100, cur + delta));
            state.userInterests[t] = updated;
        });

        // Save interests
        localStorage.setItem('aphim_reels_user_interests', JSON.stringify(state.userInterests));
        document.cookie = `aphim_user_interests=${encodeURIComponent(JSON.stringify(state.userInterests))}; path=/; max-age=2592000; SameSite=Lax`;

        // Save watched history (suppress duplicates)
        if (ytId && !state.watchedHistory.includes(ytId)) {
            state.watchedHistory.unshift(ytId);
            if (state.watchedHistory.length > 50) state.watchedHistory = state.watchedHistory.slice(0, 50);
            localStorage.setItem('aphim_reels_watched_history', JSON.stringify(state.watchedHistory));
            document.cookie = `aphim_watched_reels=${encodeURIComponent(state.watchedHistory.slice(0, 20).join(','))}; path=/; max-age=2592000; SameSite=Lax`;
        }

        // Notify server asynchronously
        try {
            fetch('/api/reels/track-interaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: action, topics, yt: ytId, slug })
            }).catch(() => {});
        } catch (e) {}
    }

    function getTopInterestsQueryParam() {
        const entries = Object.entries(state.userInterests).filter(([_, w]) => w > 0).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) return '';
        return entries.slice(0, 5).map(([g, w]) => `${g}:${w}`).join(',');
    }

    function getWatchedQueryParam() {
        return (state.watchedHistory || []).slice(0, 25).join(',');
    }

    // ── Accurate Time Display Formatter (Auto MM:SS or HH:MM:SS) ─────────────
    function formatReelTime(sec, refDuration = 0) {
        if (!sec || isNaN(sec) || sec < 0) sec = 0;
        const totalSec = Math.floor(sec);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        const refSec = Math.floor(refDuration || 0);
        const hasHours = hrs > 0 || refSec >= 3600;

        if (hasHours) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function parseReelTimeToSeconds(str) {
        if (!str || typeof str !== 'string') return 0;
        const parts = str.trim().split(':').map(p => parseInt(p, 10) || 0);
        if (parts.length === 3) {
            return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        } else if (parts.length === 2) {
            return (parts[0] * 60) + parts[1];
        }
        return parseInt(str, 10) || 0;
    }

    let feedContainer = null;
    let observer = null;

    // ── Iframe Builder with Safe Origin & Referrer Policy ────────────────────────
    function createReelIframe(ytId, autoplay = true, mute = true) {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope; fullscreen');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.setAttribute('playsinline', '1');
        iframe.setAttribute('webkit-playsinline', '1');
        iframe.setAttribute('tabindex', '-1');
        iframe.style.cssText = 'border:none;background:transparent;pointer-events:none;';
        iframe.setAttribute('allowtransparency', 'true');

        const origin = window.location.origin;
        // YouTube embed security: Omit origin on localhost / 127.0.0.1 to prevent Error 153 configuration failure
        const originParam = (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) 
            ? `&origin=${encodeURIComponent(origin)}` 
            : '';

        // 🛡️ Always use autoplay=1&mute=1 so YouTube loads directly into playback without ever rendering the pause bezel icon!
        const autoVal = '1';
        const effectiveMute = '1';

        iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=${autoVal}&mute=${effectiveMute}&playsinline=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&loop=1&playlist=${ytId}&enablejsapi=1&hl=vi&cc_lang_pref=vi${originParam}`;
        return iframe;
    }

    // ── Send Command to YouTube Iframe ──────────────────────────────────────────
    function sendCmd(iframe, func, args = []) {
        if (!iframe || !iframe.contentWindow) return;
        try {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: func,
                args: args
            }), '*');
        } catch (e) {}
    }

    // ── Active Player Reference ─────────────────────────────────────────────────
    function getActiveIframe() {
        const activeObj = state.players[state.activeHostKey];
        if (activeObj && activeObj.fr) return activeObj.fr;
        const host = document.getElementById(activeObj ? activeObj.hostId : 'reels-player-host-a');
        return host ? host.querySelector('iframe') : null;
    }

    // ⚡ Multi-pulse autoplay trigger for mobile browsers (Eliminates YouTube center play button)
    function triggerAutoPlayWithSound(targetIfr, idx) {
        if (!targetIfr) return;
        const vol = state.volume > 0 ? state.volume : 100;
        
        [0, 50, 120, 250, 450, 750, 1100].forEach(delay => {
            setTimeout(() => {
                if (state.currentIndex === idx && !state.userPaused) {
                    sendCmd(targetIfr, 'playVideo');
                    sendCmd(targetIfr, 'unMute');
                    sendCmd(targetIfr, 'setVolume', [vol]);
                }
            }, delay);
        });
    }

    // ── Setup & Boot Dual Players (TikTok Low-Latency Engine) ───────────────────
    function setupDualPlayers(initialYtId, nextYtId) {
        const hostA = document.getElementById('reels-player-host-a');
        const hostB = document.getElementById('reels-player-host-b');

        if (hostA && !hostA.querySelector('iframe') && initialYtId) {
            const ifrA = createReelIframe(initialYtId, true, true);
            ifrA.addEventListener('load', () => {
                try {
                    ifrA.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
                } catch (e) {}
                state.players.a.ready = true;
                state.players.a.ytId = initialYtId;
                sendCmd(ifrA, 'setPlaybackRate', [state.playbackSpeed]);
                triggerAutoPlayWithSound(ifrA, 0);
            });
            hostA.appendChild(ifrA);
            state.players.a.fr = ifrA;
            state.players.a.ytId = initialYtId;
        }

        if (hostB && !hostB.querySelector('iframe')) {
            const cueYt = nextYtId || initialYtId;
            const ifrB = createReelIframe(cueYt, true, true);
            ifrB.addEventListener('load', () => {
                try {
                    ifrB.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
                } catch (e) {}
                state.players.b.ready = true;
                state.players.b.ytId = cueYt;
                sendCmd(ifrB, 'mute');
                // Prime background player silently with mute
                if (nextYtId) {
                    sendCmd(ifrB, 'loadVideoById', [nextYtId, 0]);
                    sendCmd(ifrB, 'mute');
                }
            });
            hostB.appendChild(ifrB);
            state.players.b.fr = ifrB;
            state.players.b.ytId = cueYt;
        }
    }

    // ── Smart Poster Reveal on Genuine Playback (Zero Black Screen / Zero Pause Bezel) ──
    function revealPlayingVideo(index) {
        state.videoStartedPlaying = true;
        clearTimeout(state.stallWatchdogTimer);
        clearTimeout(state.revealFallbackTimer);
        const curItem = document.getElementById(`reel-item-${index}`);
        if (curItem) {
            curItem.classList.add('is-playing');
            const cover = curItem.querySelector('.reel-thumb-cover');
            if (cover) cover.classList.add('hidden');
            const ind = curItem.querySelector('.reel-play-indicator');
            if (ind) ind.classList.add('hidden');
        }
    }

    // ── Switch & Pre-buffer Slide at Index (TikTok High-Performance Engine) ──────
    function playReelAtIndex(idx) {
        if (!feedContainer) return;

        const currentItem = feedContainer.querySelector(`.reel-item[data-index="${idx}"]`);
        if (!currentItem) return;

        const currentYt = currentItem.getAttribute('data-yt');
        if (!currentYt) return;

        const nextItem = feedContainer.querySelector(`.reel-item[data-index="${idx + 1}"]`);
        const nextYt = nextItem ? nextItem.getAttribute('data-yt') : null;

        // Reset is-playing on other items
        document.querySelectorAll('.reel-item.is-playing').forEach(el => {
            if (el.getAttribute('data-index') !== String(idx)) {
                el.classList.remove('is-playing');
            }
        });

        // 🛡️ Playback Stall Watchdog Timer (Auto-heal if video genuinely fails after 7.5s)
        clearTimeout(state.stallWatchdogTimer);
        clearTimeout(state.revealFallbackTimer);
        state.videoStartedPlaying = false;
        state.userPaused = false;
        document.querySelectorAll('.reel-play-indicator').forEach(el => el.classList.add('hidden'));

        // ⏱️ Reset YouTube logo shield timer for current slide (10s on 16:9 mode)
        resetYtLogoShield();

        state.stallWatchdogTimer = setTimeout(() => {
            if (state.currentIndex === idx && !state.videoStartedPlaying) {
                console.warn(`[Reels Watchdog] Reel #${idx} (${currentYt}) stalled or failed to start playing within 7.5s. Auto-advancing...`);
                showToast('⚡ Video tải chậm hoặc giới hạn, tự động chuyển tiếp...', 'info', 1600);
                window.scrollToNextReel();
            }
        }, 7500);

        const hostA = document.getElementById('reels-player-host-a');
        const hostB = document.getElementById('reels-player-host-b');

        if (!hostA || !hostA.querySelector('iframe')) {
            setupDualPlayers(currentYt, nextYt);
            // ⚡ Instant reveal for initial load
            state.revealFallbackTimer = setTimeout(() => {
                if (state.currentIndex === idx) {
                    revealPlayingVideo(idx);
                }
            }, 180);
        } else {
            const currentHostKey = state.activeHostKey;
            const otherHostKey = currentHostKey === 'a' ? 'b' : 'a';

            // Check if other host already has target video preloaded
            if (state.players[otherHostKey].ytId === currentYt && state.players[otherHostKey].fr) {
                // ⚡ Instant 0ms Swap!
                state.activeHostKey = otherHostKey;
                document.getElementById(state.players[otherHostKey].hostId).classList.add('active');
                document.getElementById(state.players[currentHostKey].hostId).classList.remove('active');

                sendCmd(state.players[otherHostKey].fr, 'setPlaybackRate', [state.playbackSpeed]);
                triggerAutoPlayWithSound(state.players[otherHostKey].fr, idx);

                if (state.players[currentHostKey].fr) {
                    sendCmd(state.players[currentHostKey].fr, 'mute');
                    sendCmd(state.players[currentHostKey].fr, 'pauseVideo');
                }

                // 🚀 INSTANT ZERO-LAG REVEAL: Preloaded video is already decoded in background!
                revealPlayingVideo(idx);
            } 
            // Current host already has this video
            else if (state.players[currentHostKey].ytId === currentYt && state.players[currentHostKey].fr) {
                sendCmd(state.players[currentHostKey].fr, 'setPlaybackRate', [state.playbackSpeed]);
                triggerAutoPlayWithSound(state.players[currentHostKey].fr, idx);

                // 🚀 INSTANT REVEAL
                revealPlayingVideo(idx);
            } 
            // Load new video into the other host and swap
            else {
                state.activeHostKey = otherHostKey;
                document.getElementById(state.players[otherHostKey].hostId).classList.add('active');
                document.getElementById(state.players[currentHostKey].hostId).classList.remove('active');

                state.players[otherHostKey].ytId = currentYt;
                const targetIfr = state.players[otherHostKey].fr;
                if (targetIfr) {
                    sendCmd(targetIfr, 'loadVideoById', [currentYt, 0]);
                    sendCmd(targetIfr, 'setPlaybackRate', [state.playbackSpeed]);
                    triggerAutoPlayWithSound(targetIfr, idx);
                }

                if (state.players[currentHostKey].fr) {
                    sendCmd(state.players[currentHostKey].fr, 'mute');
                    sendCmd(state.players[currentHostKey].fr, 'pauseVideo');
                }

                // ⚡ Fast fallback reveal (180ms) so static poster never freezes/lingers
                state.revealFallbackTimer = setTimeout(() => {
                    if (state.currentIndex === idx && !state.videoStartedPlaying) {
                        revealPlayingVideo(idx);
                    }
                }, 180);
            }

            // 🚀 Active Pre-buffering in the idle host silently without cueVideoById
            const idleHostKey = state.activeHostKey === 'a' ? 'b' : 'a';
            if (nextYt && state.players[idleHostKey].ytId !== nextYt && state.players[idleHostKey].fr) {
                state.players[idleHostKey].ytId = nextYt;
                const idleIfr = state.players[idleHostKey].fr;
                sendCmd(idleIfr, 'loadVideoById', [nextYt, 0]);
                sendCmd(idleIfr, 'mute');
            }
        }

        // Update Ambient Backdrop (for 16:9 mode)
        const backdropUrl = currentItem.getAttribute('data-backdrop') || currentItem.getAttribute('data-poster');
        const ambientEl = document.getElementById('reels-ambient-backdrop');
        if (ambientEl && backdropUrl) {
            ambientEl.style.backgroundImage = `url('${backdropUrl}')`;
        }

        // Sync duration state for newly focused slide
        const curDurEl = currentItem.querySelector(`#time-duration-${idx}`);
        if (state.slideDurations[idx]) {
            state.activeDuration = state.slideDurations[idx];
            if (curDurEl) curDurEl.textContent = formatReelTime(state.activeDuration, state.activeDuration);
        } else if (curDurEl && curDurEl.textContent && curDurEl.textContent.includes(':') && curDurEl.textContent !== '00:00' && curDurEl.textContent !== '03:45') {
            const parsed = parseReelTimeToSeconds(curDurEl.textContent);
            if (parsed > 0) {
                state.activeDuration = parsed;
                state.slideDurations[idx] = parsed;
            }
        }

        // Update Desktop Right Sidebar
        updateDesktopInfoPanel(currentItem);
    }

    // ── Desktop Right Panel Sync ────────────────────────────────────────────────
    function updateDesktopInfoPanel(itemElement) {
        if (!itemElement) return;

        const movieTitle = itemElement.getAttribute('data-movie-title') || '';
        const title = itemElement.getAttribute('data-title') || '';
        const poster = itemElement.getAttribute('data-poster') || itemElement.getAttribute('data-backdrop') || '';
        const quality = itemElement.getAttribute('data-quality') || 'Full HD';
        const year = itemElement.getAttribute('data-year') || '2025';
        const rating = itemElement.getAttribute('data-rating') || '9.6';
        const categories = itemElement.getAttribute('data-categories') || 'Review, Tóm Tắt Phim';
        const desc = itemElement.getAttribute('data-description') || '';
        const watchUrl = itemElement.getAttribute('data-watch-url') || '#';

        const heroImg = document.getElementById('panel-hero-img');
        const pTitle = document.getElementById('panel-title');
        const pSub = document.getElementById('panel-sub');
        const pQuality = document.getElementById('panel-quality');
        const pYear = document.getElementById('panel-year');
        const pRating = document.getElementById('panel-rating');
        const pCategories = document.getElementById('panel-categories');
        const pDesc = document.getElementById('panel-desc');
        const pWatchBtn = document.getElementById('panel-watch-btn');

        if (heroImg && poster) {
            heroImg.dataset.triedYt = '';
            heroImg.dataset.yt = itemElement.getAttribute('data-yt') || '';
            heroImg.src = poster;
        }
        if (pTitle) pTitle.textContent = movieTitle;
        if (pSub) {
            let catSummary = categories;
            if (typeof categories === 'string' && categories.includes(',')) {
                catSummary = categories.split(',').slice(0, 2).map(c => c.trim()).join(' • ');
            }
            pSub.textContent = `${year} • ${catSummary || 'Phim Hot'}`;
        }
        if (pQuality) pQuality.textContent = quality;
        if (pYear) pYear.textContent = year;
        if (pRating) pRating.textContent = `${rating} / 10`;
        if (pCategories) {
            let catFormatted = categories;
            if (typeof categories === 'string' && categories.includes(',')) {
                catFormatted = categories.split(',').map(c => c.trim()).join(' • ');
            }
            pCategories.textContent = catFormatted;
        }
        if (pDesc) pDesc.textContent = desc;
        if (pWatchBtn) pWatchBtn.href = watchUrl;

        // Sync Desktop Action Dock (Left of Video)
        syncDesktopActionDock(itemElement);

        // ⏱️ Reset 10s YouTube Logo Shield for current video
        resetYtLogoShield();
    }

    // ⏱️ Reset 10s YouTube Logo Shield Timer for each reel slide
    function resetYtLogoShield() {
        const shield = document.getElementById('reels-yt-logo-shield');
        if (!shield) return;

        if (window._ytShieldTimer) {
            clearTimeout(window._ytShieldTimer);
            window._ytShieldTimer = null;
        }

        shield.classList.remove('is-hidden');
        shield.style.opacity = '1';
        shield.style.visibility = 'visible';
        shield.style.transition = 'opacity 0.8s ease, visibility 0.8s ease';

        window._ytShieldTimer = setTimeout(() => {
            try {
                shield.classList.add('is-hidden');
                shield.style.opacity = '0';
                shield.style.visibility = 'hidden';
            } catch (err) {}
        }, 10000);
    }
    window.resetYtLogoShield = resetYtLogoShield;

    // ── Desktop Left Action Dock Sync & Handlers ────────────────────────────────
    function syncDesktopActionDock(itemElement) {
        const item = itemElement || (feedContainer ? feedContainer.querySelector(`.reel-item[data-index="${state.currentIndex}"]`) : null);
        if (!item) return;

        const poster = item.getAttribute('data-poster') || item.getAttribute('data-backdrop') || '';
        const movieTitle = item.getAttribute('data-movie-title') || '';
        const watchUrl = item.getAttribute('data-watch-url') || '#';
        const likes = item.getAttribute('data-likes') || '0';
        const comments = item.getAttribute('data-comments') || '0';
        const shares = item.getAttribute('data-shares') || '0';
        const reelId = item.getAttribute('data-id') || '';

        const avatarBtn = document.getElementById('desktop-dock-avatar-btn');
        const avatarImg = document.getElementById('desktop-dock-avatar-img');
        const likeBtn = document.getElementById('desktop-dock-btn-like');
        const likeCountEl = document.getElementById('desktop-dock-like-count');
        const commentCountEl = document.getElementById('desktop-dock-comment-count');
        const shareCountEl = document.getElementById('desktop-dock-share-count');
        const bookmarkBtn = document.getElementById('desktop-dock-btn-bookmark');

        if (avatarBtn) {
            avatarBtn.href = watchUrl;
            avatarBtn.title = `Xem phim ${movieTitle} ngay`;
        }
        if (avatarImg && poster) {
            avatarImg.src = poster;
            avatarImg.alt = movieTitle;
        }
        if (likeCountEl) {
            const internalBtn = document.getElementById(`btn-like-${state.currentIndex}`);
            const count = internalBtn?.querySelector('.like-count')?.textContent || likes;
            likeCountEl.textContent = count;
        }
        if (likeBtn) {
            likeBtn.classList.toggle('liked', state.likedReels.has(reelId));
        }
        if (commentCountEl) commentCountEl.textContent = comments;
        if (shareCountEl) shareCountEl.textContent = shares;
        if (bookmarkBtn) {
            bookmarkBtn.classList.toggle('saved', state.savedReels.has(reelId));
        }
    }

    window.handleDesktopDockLike = function () {
        const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
        if (curItem) {
            const reelId = curItem.getAttribute('data-id');
            window.toggleLikeReel(reelId, state.currentIndex);
            syncDesktopActionDock(curItem);
        }
    };

    window.handleDesktopDockComment = function () {
        const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
        if (curItem) {
            const reelId = curItem.getAttribute('data-id');
            const movieTitle = curItem.getAttribute('data-movie-title') || '';
            window.openReelsCommentsDrawer(reelId, movieTitle);
        }
    };

    window.handleDesktopDockBookmark = function () {
        const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
        if (curItem) {
            const reelId = curItem.getAttribute('data-id');
            window.toggleBookmarkReel(reelId, state.currentIndex);
            syncDesktopActionDock(curItem);
        }
    };

    window.handleDesktopDockShare = function () {
        const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
        if (curItem) {
            const slug = curItem.getAttribute('data-slug') || '';
            const title = curItem.getAttribute('data-title') || '';
            window.shareCurrentReel(slug, title);
        }
    };

    // ── Intersection Observer (Snap Scroll Detector) ────────────────────────────
    function initIntersectionObserver() {
        if (!feedContainer) return;

        const options = {
            root: feedContainer,
            rootMargin: '0px',
            threshold: 0.5
        };

        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const newIndex = parseInt(entry.target.getAttribute('data-index'), 10);
                    if (newIndex !== state.currentIndex) {
                        // Check dwell time on previous slide for quick-skip penalty
                        const prevIndex = state.currentIndex;
                        const dwellMs = Date.now() - state.slideEnterTime;
                        if (dwellMs < 2500) {
                            recordUserAffinity('quick_skip', prevIndex);
                        }
                        state.slideEnterTime = Date.now();

                        // Restore previous slide's poster cover
                        const prevItem = feedContainer.querySelector(`.reel-item[data-index="${prevIndex}"]`);
                        if (prevItem) {
                            const prevCover = prevItem.querySelector('.reel-thumb-cover');
                            if (prevCover) prevCover.classList.remove('hidden');
                        }

                        state.currentIndex = newIndex;
                        playReelAtIndex(newIndex);
                    }

                    // Infinite Scroll Pre-fetch (Pre-load next batch 5 slides before end for 0ms wait)
                    const allItems = feedContainer.querySelectorAll('.reel-item');
                    if (newIndex >= allItems.length - 5 && !state.isLoadingMore && state.hasMore) {
                        loadMoreReels();
                    }
                }
            });
        }, options);

        observeAllReelItems();
    }

    function observeAllReelItems() {
        if (!feedContainer || !observer) return;
        const items = feedContainer.querySelectorAll('.reel-item');
        items.forEach((item) => observer.observe(item));
    }

    // ── ⚡ TIKTOK INFINITE STREAM ENGINE (CONTINUOUS ZERO-WAIT FEEDER) ─────────
    async function loadMoreReels(retryCount = 0) {
        if (state.isLoadingMore) return;
        state.isLoadingMore = true;

        const nextPage = state.currentPage + 1;
        const activeTab = (state.currentTab === 'reel' || state.currentTab === 'for-you') ? 'reel' : 'review';
        const interestsParam = getTopInterestsQueryParam();
        const watchedParam = Array.from(state.seenYtSet).slice(-60).join(',');

        try {
            const url = `/api/reels/feed?tab=${activeTab}&page=${nextPage}&limit=12&interests=${encodeURIComponent(interestsParam)}&watched=${encodeURIComponent(watchedParam)}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data && data.success && Array.isArray(data.items) && data.items.length > 0) {
                // 🛡️ Client-side Strict Zero-Duplicate Filter
                const freshItems = data.items.filter(item => item && item.yt && !state.seenYtSet.has(item.yt));

                if (freshItems.length > 0) {
                    state.currentPage = nextPage;
                    const currentCount = feedContainer.querySelectorAll('.reel-item').length;
                    const fragment = document.createDocumentFragment();

                    freshItems.forEach((item, idx) => {
                        state.seenYtSet.add(item.yt);
                        const newIndex = currentCount + idx;
                        const el = createReelSlideElement(item, newIndex);
                        fragment.appendChild(el);
                    });

                    feedContainer.appendChild(fragment);

                    // Observe new items
                    observeAllReelItems();
                    state.hasMore = true;
                } else if (retryCount < 3) {
                    // Nếu page này trùng lặp, tự động nhảy page tiếp theo để lấy video mới
                    state.currentPage = nextPage;
                    state.isLoadingMore = false;
                    return loadMoreReels(retryCount + 1);
                } else {
                    state.hasMore = true;
                }
            } else {
                state.hasMore = true;
            }
        } catch (err) {
            console.warn('⚠️ [Reels Feed Error]:', err);
            state.hasMore = true;
        } finally {
            state.isLoadingMore = false;
        }
    }

    // 🔄 Tự động đồng bộ & nạp sẵn video mới ngầm mỗi 45s (TikTok Live Background Feeder)
    function startTikTokLiveAutoStream() {
        setInterval(() => {
            if (document.hidden) return; // Không nạp nếu tab trình duyệt đang ẩn
            const currentItemCount = feedContainer ? feedContainer.querySelectorAll('.reel-item').length : 0;
            if (currentItemCount > 0 && !state.isLoadingMore) {
                loadMoreReels().catch(() => {});
            }
        }, 45 * 1000);
    }

    function createReelSlideElement(item, index) {
        const div = document.createElement('section');
        div.className = 'reel-item';
        div.id = `reel-item-${index}`;
        div.setAttribute('data-index', index);
        div.setAttribute('data-id', item.id);
        div.setAttribute('data-yt', item.yt);
        div.setAttribute('data-title', item.title || item.movieTitle);
        div.setAttribute('data-movie-title', item.movieTitle);
        div.setAttribute('data-slug', item.slug);
        div.setAttribute('data-watch-url', item.watchUrl);
        div.setAttribute('data-poster', item.poster);
        div.setAttribute('data-backdrop', item.backdrop || item.poster);
        div.setAttribute('data-year', item.year);
        div.setAttribute('data-quality', item.quality);
        div.setAttribute('data-rating', item.rating);
        div.setAttribute('data-categories', Array.isArray(item.categories) ? item.categories.join(', ') : (item.categories || 'Phim Hot'));
        div.setAttribute('data-description', item.description || '');
        div.setAttribute('data-author', item.author || 'APhim Review');
        div.setAttribute('data-likes', item.likes || '42.5K');
        div.setAttribute('data-comments', item.comments || '180');
        div.setAttribute('data-shares', item.shares || '32');

        const isLiked = state.likedReels.has(item.id);
        const isSaved = state.savedReels.has(item.id);

        div.innerHTML = `
            <div class="reel-thumb-cover" id="thumb-${index}" style="background-image: url('${item.poster}');"></div>
            <div class="reel-gradient-overlay"></div>
            <div class="reel-gesture-overlay" onclick="handleReelGestureTap(event, '${index}')">
                <div class="reel-heart-burst" id="heart-burst-${index}">
                    <svg class="w-24 h-24" style="fill: #ff2b54 !important; color: #ff2b54 !important;" fill="#ff2b54" viewBox="0 0 24 24"><path fill="#ff2b54" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <div class="reel-play-indicator hidden" id="play-indicator-${index}">
                    <svg class="w-8 h-8 text-white fill-white ml-1" viewBox="0 0 24 24"><path fill="#ffffff" d="M8 5v14l11-7z"/></svg>
                </div>
            </div>

            <!-- Sound Unlock Prompt -->
            <div class="reels-sound-prompt ${state.userInteracted ? 'hidden' : ''}" id="sound-prompt-${index}" onclick="unlockSoundAndPlay()">
                <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                <span class="text-xs font-bold text-white">Chạm để bật âm thanh video</span>
            </div>

            <!-- Right Action Dock -->
            <div class="reels-actions-bar">
                <a href="${item.watchUrl}" class="reel-action-btn reel-avatar-btn group" title="Xem phim ${escapeHtml(item.movieTitle)} ngay">
                    <div class="reel-avatar-disc">
                        <img src="${item.poster}" alt="${escapeHtml(item.movieTitle)}" onerror="this.src='/android-chrome-192x192.png'" />
                    </div>
                    <div class="reel-avatar-plus-badge" title="Xem phim ${escapeHtml(item.movieTitle)} ngay">
                        <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                        </svg>
                    </div>
                </a>

                <button class="reel-action-btn btn-like ${isLiked ? 'liked' : ''}" id="btn-like-${index}" onclick="toggleLikeReel('${item.id}', '${index}')" title="Thích video này">
                    <div class="action-circle-icon">
                        <svg class="w-7 h-7 like-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    </div>
                    <span class="action-label like-count">${item.likes}</span>
                </button>

                <button class="reel-action-btn btn-comment" onclick="openReelsCommentsDrawer('${item.id}', '${escapeHtml(item.movieTitle)}')" title="Xem và gửi bình luận">
                    <div class="action-circle-icon">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    </div>
                    <span class="action-label">${item.comments}</span>
                </button>

                <button class="reel-action-btn btn-bookmark ${isSaved ? 'saved' : ''}" onclick="toggleBookmarkReel('${item.id}', '${index}')" title="Lưu lại xem sau">
                    <div class="action-circle-icon">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                    </div>
                    <span class="action-label">Lưu</span>
                </button>

                <button class="reel-action-btn btn-share" onclick="shareCurrentReel('${item.slug}', '${escapeHtml(item.title)}')" title="Chia sẻ video">
                    <div class="action-circle-icon">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                    </div>
                    <span class="action-label">${item.shares}</span>
                </button>

                <button class="reel-action-btn btn-speed" onclick="cyclePlaybackSpeed()" title="Đổi tốc độ phát">
                    <div class="action-circle-icon">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <span class="action-label speed-label-text">1.0x</span>
                </button>
            </div>

            <!-- 🎬 BOTTOM FLOATING TRANSLUCENT GLASS MOVIE CARD -->
            <div class="reel-bottom-info">
                <a href="/phim/${item.slug}" class="reel-movie-glass-card" title="Xem chi tiết ${escapeHtml(item.movieTitle)}">
                    <div class="reel-card-thumb-wrap">
                        <img src="${item.poster}" alt="${escapeHtml(item.movieTitle)}" class="reel-card-thumb" data-yt="${item.yt}" onerror="if(!this.dataset.triedYt && this.dataset.yt){ this.dataset.triedYt='1'; this.src='https://i.ytimg.com/vi/' + this.dataset.yt + '/hqdefault.jpg'; } else { this.src='/android-chrome-192x192.png'; }" />
                    </div>
                    <div class="reel-card-details">
                        <div class="reel-card-row-top">
                            <div class="reel-card-titles-wrap">
                                <span class="reel-card-name">${escapeHtml(item.movieTitle)}</span>
                                <span class="reel-card-year">(${item.year || '2026'})</span>
                                <div class="reel-card-rating-badge">
                                    <svg class="rating-star-icon" viewBox="0 0 24 24" width="12" height="12" fill="#f59e0b"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                    <span>${item.rating || '5.0'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="reel-card-origin">${escapeHtml(item.originTitle || item.movieTitleVn || '')}</div>
                    </div>
                </a>
                <div class="reel-caption-text">
                    <b class="text-amber-300 font-bold">@${escapeHtml(item.author || 'APhim Review')}:</b> ${escapeHtml(item.description || '')}
                </div>
            </div>
        `;
        return div;
    }

    // ── Document Loaded ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        feedContainer = document.getElementById('reels-feed-container');

        // 🛡️ Initialize seen YouTube set with all server-rendered slides
        if (feedContainer) {
            feedContainer.querySelectorAll('.reel-item').forEach(el => {
                const yt = el.getAttribute('data-yt');
                if (yt) state.seenYtSet.add(yt);
            });
        }

        initIntersectionObserver();
        setupKeyboardControls();
        restoreLikedStates();
        updateMuteButtonUI();
        initReelsVolumeControl();
        initReelsScrubber();
        initSidebarHistoryPreview(); // 📜 Populate count badge & mini last-watched card
        initSmoothSwipePhysics(); // 🚀 TikTok fluid gesture & discrete wheel momentum
        initSpaNavigation(); // ⚡ Seamless SPA navigation preserving Fullscreen / Theater mode
        startTikTokLiveAutoStream(); // ⚡ Continuous Live Stream Background Auto-Feeder (TikTok Style)
        resetYtLogoShield(); // ⏱️ Start 10s logo shield timer for initial slide

        // 🔊 TỰ ĐỘNG BẬT FULL 100% ÂM THANH KHI VÀO REELS
        ensureFullSound();
        ['click', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(evt => {
            document.addEventListener(evt, ensureFullSound, { once: true, passive: true });
        });

        // Ensure sound prompt is hidden
        document.querySelectorAll('.reels-sound-prompt').forEach((el) => el.classList.add('hidden'));

        // Mark if native vertical reel tab or review tab for ambient glow
        const viewport = document.querySelector('.reels-viewport');
        if (viewport) {
            if (state.currentTab === 'reel' || state.currentTab === 'for-you') {
                viewport.classList.add('is-tab-reel');
                viewport.classList.remove('is-tab-review');
            } else {
                viewport.classList.add('is-tab-review');
                viewport.classList.remove('is-tab-reel');
            }
        }

        // Boot Slide 0 Immediately
        const firstItem = feedContainer ? feedContainer.querySelector('.reel-item[data-index="0"]') : null;
        if (firstItem) {
            const firstYt = firstItem.getAttribute('data-yt');
            const secondItem = feedContainer.querySelector('.reel-item[data-index="1"]');
            const secondYt = secondItem ? secondItem.getAttribute('data-yt') : null;
            setupDualPlayers(firstYt, secondYt);
            updateDesktopInfoPanel(firstItem);

            // Arm watchdog for slide 0 (7.5s graceful timeout)
            state.videoStartedPlaying = false;
            clearTimeout(state.stallWatchdogTimer);
            state.stallWatchdogTimer = setTimeout(() => {
                if (state.currentIndex === 0 && !state.videoStartedPlaying) {
                    console.warn(`[Reels Watchdog] Initial video stalled. Auto-advancing to reel #1...`);
                    window.scrollToNextReel();
                }
            }, 7500);

            // ⚡ Eager Smooth Reveal for Slide 0
            setTimeout(() => {
                if (state.currentIndex === 0) {
                    revealPlayingVideo(0);
                }
            }, 250);

            const backdropUrl = firstItem.getAttribute('data-backdrop') || firstItem.getAttribute('data-poster');
            const ambientEl = document.getElementById('reels-ambient-backdrop');
            if (ambientEl && backdropUrl) {
                ambientEl.style.backgroundImage = `url('${backdropUrl}')`;
            }
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

    // ── Sidebar History Preview (count badge + mini last-watched card) ────────────
    function initSidebarHistoryPreview() {
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('aphim_reels_history') || '[]');
        } catch (e) { history = []; }

        // Update count badge
        const countBadge = document.getElementById('sidebar-history-count');
        if (countBadge) {
            if (history.length > 0) {
                countBadge.textContent = history.length > 99 ? '99+' : history.length;
                countBadge.style.display = 'inline-flex';
            } else {
                countBadge.style.display = 'none';
            }
        }

        // Populate mini last-watched card
        const card = document.getElementById('sidebar-last-watched-card');
        if (!card || history.length === 0) return;

        const latest = history[0];

        const thumbImg = document.getElementById('slw-thumb-img');
        const titleEl = document.getElementById('slw-title');
        const metaEl = document.getElementById('slw-meta');
        const progressFill = document.getElementById('slw-progress-fill');

        if (thumbImg) {
            thumbImg.src = latest.poster || '/android-chrome-192x192.png';
            thumbImg.alt = latest.movieTitle || '';
        }
        if (titleEl) titleEl.textContent = latest.movieTitle || 'Phim đã xem';
        if (metaEl) metaEl.textContent = `${latest.timeFormatted || ''} • ${latest.progressPct || 0}%`;
        if (progressFill) progressFill.style.width = `${Math.min(100, latest.progressPct || 0)}%`;

        card.classList.remove('hidden');
    }


    // ── 🔄 Toggle Landscape 16:9 / Vertical 9:16 (Xoay Nằm Ngang / Đứng Dọc - Zero Jank) ──
    window.toggleAspectMode = function () {
        const aspectBtn = document.getElementById('reels-aspect-btn');
        if (aspectBtn) {
            aspectBtn.classList.add('is-rotating');
            setTimeout(() => {
                try { aspectBtn.classList.remove('is-rotating'); } catch (e) {}
            }, 460);
        }

        const isLandscape = document.body.classList.contains('reels-cinema-mode') || 
                            (document.querySelector('.reels-viewport') && document.querySelector('.reels-viewport').classList.contains('mode-16-9'));
        
        requestAnimationFrame(() => {
            if (isLandscape) {
                window.applyAspectMode('standard');
            } else {
                window.applyAspectMode('mode-16-9');
            }
        });
    };

    window.applyAspectMode = function (mode) {
        const viewport = document.querySelector('.reels-viewport');
        const aspectBtn = document.getElementById('reels-aspect-btn');
        if (!viewport) return;

        const isCinema = (mode === 'mode-16-9' || mode === 'cinema' || mode === '16:9');

        requestAnimationFrame(() => {
            viewport.classList.remove('mode-cover', 'mode-rotate-90');
            
            if (isCinema) {
                viewport.classList.add('mode-16-9');
                document.body.classList.add('reels-cinema-mode');
                if (aspectBtn) {
                    aspectBtn.classList.add('text-amber-400', 'is-active');
                    aspectBtn.style.color = '#f59e0b';
                }
                showToast('🎬 Đã xoay ngang màn hình 16:9 (Nhấn 🔄 hoặc ESC để quay lại)', 'info', 1800);
            } else {
                viewport.classList.remove('mode-16-9');
                document.body.classList.remove('reels-cinema-mode');
                if (aspectBtn) {
                    aspectBtn.classList.remove('text-amber-400', 'is-active');
                    aspectBtn.style.color = '';
                }
                showToast('📱 Đã chuyển về chế độ dọc 9:16', 'info', 1500);
            }

            // Sync options sheet UI
            const aspectValEl = document.getElementById('sheet-aspect-val');
            if (aspectValEl) {
                aspectValEl.textContent = isCinema ? 'Ngang 16:9' : 'Dọc 9:16';
            }
            document.querySelectorAll('.sheet-pill-btn[data-aspect]').forEach((btn) => {
                const btnMode = btn.dataset.aspect;
                const isActive = (btnMode === 'cinema' && isCinema) ||
                                 (btnMode === 'vertical' && !isCinema);
                btn.classList.toggle('active', !!isActive);
            });
        });
    };

    // ── Gesture Controls (Single-Tap Play/Pause, Double-Tap Like) ───────────────
    window.handleReelGestureTap = function (e, index) {
        // On very first tap: silently unlock sound (no banner needed)
        if (!state.userInteracted) {
            window.unlockSoundAndPlay();
            return; // Let this first tap just unlock — next tap will play/pause
        }

        state.userInteracted = true;
        const now = Date.now();
        const timeDiff = now - state.lastTapTime;

        if (timeDiff < 240) {
            clearTimeout(state.tapTimeout);
            triggerDoubleTapHeart(index);
            const item = document.getElementById(`reel-item-${index}`);
            if (item) {
                const reelId = item.getAttribute('data-id');
                if (!state.likedReels.has(reelId)) {
                    window.toggleLikeReel(reelId, index);
                }
            }
        } else {
            state.tapTimeout = setTimeout(() => {
                togglePlayPauseActive(index);
            }, 180);
        }

        state.lastTapTime = now;
    };

    function triggerDoubleTapHeart(index) {
        const heart = document.getElementById(`heart-burst-${index}`);
        if (!heart) return;
        heart.classList.add('animate');
        setTimeout(() => {
            heart.classList.remove('animate');
        }, 650);
    }

    function togglePlayPauseActive(index) {
        const activeIframe = getActiveIframe();
        const item = document.getElementById(`reel-item-${index}`);
        if (!activeIframe || !item) return;

        const indicator = item.querySelector('.reel-play-indicator');
        if (!state.isPlaying || (indicator && !indicator.classList.contains('hidden'))) {
            sendCmd(activeIframe, 'playVideo');
            state.isPlaying = true;
            state.userPaused = false;
            if (indicator) indicator.classList.add('hidden');
        } else {
            sendCmd(activeIframe, 'pauseVideo');
            state.isPlaying = false;
            state.userPaused = true;
            // Show pause icon briefly then auto-hide after 700ms
            if (indicator) {
                indicator.classList.remove('hidden');
                clearTimeout(indicator._autohideTimer);
                indicator._autohideTimer = setTimeout(() => {
                    indicator.classList.add('hidden');
                }, 700);
            }
        }
    }

    // ── Sound & Volume Engine (Image 2: Vertical Volume Slider) ────────────────
    function ensureFullSound() {
        state.isMuted = false;
        state.userInteracted = true;
        state.volume = 100;
        localStorage.setItem('aphim_reels_unmuted', 'true');
        localStorage.setItem('aphim_reels_volume', '100');
        updateMuteButtonUI();
        document.querySelectorAll('.reels-sound-prompt').forEach((el) => el.classList.add('hidden'));

        const fill = document.getElementById('reels-volume-fill');
        const label = document.getElementById('reels-volume-label');
        if (fill) fill.style.height = '100%';
        if (label) label.textContent = '100%';

        const activeIframe = getActiveIframe();
        if (activeIframe) {
            sendCmd(activeIframe, 'unMute');
            sendCmd(activeIframe, 'setVolume', [100]);
        }
    }
    window.ensureFullSound = ensureFullSound;

    window.unlockSoundAndPlay = function () {
        ensureFullSound();
        const activeIframe = getActiveIframe();
        if (activeIframe) {
            sendCmd(activeIframe, 'playVideo');
        }
    };

        // Always hide sound prompt permanently once unlocked
        document.querySelectorAll('.reels-sound-prompt').forEach((el) => el.classList.add('hidden'));

        const fill = document.getElementById('reels-volume-fill');
        const label = document.getElementById('reels-volume-label');
        if (fill) fill.style.height = `${targetVol}%`;
        if (label) label.textContent = `${targetVol}%`;

        const activeIframe = getActiveIframe();
        if (activeIframe) {
            sendCmd(activeIframe, 'unMute');
            sendCmd(activeIframe, 'setVolume', [targetVol]);
            sendCmd(activeIframe, 'playVideo');
        }
    };

    window.setReelVolume = function (vol) {
        state.volume = Math.max(0, Math.min(100, Math.round(vol)));
        localStorage.setItem('aphim_reels_volume', state.volume);

        const fill = document.getElementById('reels-volume-fill');
        const label = document.getElementById('reels-volume-label');
        if (fill) fill.style.height = `${state.volume}%`;
        if (label) label.textContent = `${state.volume}%`;

        const activeIframe = getActiveIframe();
        if (state.volume === 0) {
            state.isMuted = true;
            localStorage.setItem('aphim_reels_unmuted', 'false');
            if (activeIframe) sendCmd(activeIframe, 'mute');
        } else {
            state.isMuted = false;
            state.userInteracted = true;
            localStorage.setItem('aphim_reels_unmuted', 'true');
            document.querySelectorAll('.reels-sound-prompt').forEach((el) => el.classList.add('hidden'));
            if (activeIframe) {
                sendCmd(activeIframe, 'unMute');
                sendCmd(activeIframe, 'setVolume', [state.volume]);
            }
        }
        updateMuteButtonUI();
    };

    window.toggleMuteGlobal = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        state.userInteracted = true;

        if (state.isMuted || state.volume === 0) {
            const restoreVol = state.prevVolume > 0 ? state.prevVolume : 100;
            state.isMuted = false;
            localStorage.setItem('aphim_reels_unmuted', 'true');
            window.setReelVolume(restoreVol);
        } else {
            state.prevVolume = state.volume;
            state.isMuted = true;
            localStorage.setItem('aphim_reels_unmuted', 'false');
            window.setReelVolume(0);
        }
    };

    function updateMuteButtonUI() {
        const iconSvg = document.getElementById('reels-mute-icon');
        const btn = document.getElementById('reels-mute-toggle-btn');
        if (!iconSvg) return;

        if (state.isMuted || state.volume === 0) {
            iconSvg.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
            `;
            if (btn) {
                btn.classList.remove('volume-unmuted');
                btn.classList.add('muted'); // Grey out when muted
            }
        } else {
            iconSvg.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            `;
            if (btn) {
                btn.classList.add('volume-unmuted');
                btn.classList.remove('muted'); // Red glow when sound on
            }
        }
    }

    function initReelsVolumeControl() {
        const wrap = document.getElementById('reels-volume-control-wrap');
        const capsule = document.getElementById('reels-volume-capsule');
        const track = document.getElementById('reels-volume-track');
        if (!wrap || !capsule || !track) return;

        let isDragging = false;
        let hideTimeout = null;

        function showCapsule() {
            if (hideTimeout) clearTimeout(hideTimeout);
            capsule.classList.add('active');
            wrap.classList.add('volume-active');
        }
        function scheduleHideCapsule() {
            if (isDragging) return;
            hideTimeout = setTimeout(() => {
                capsule.classList.remove('active');
                wrap.classList.remove('volume-active');
            }, 350);
        }

        wrap.addEventListener('mouseenter', showCapsule);
        wrap.addEventListener('mouseleave', scheduleHideCapsule);
        capsule.addEventListener('mouseenter', showCapsule);
        capsule.addEventListener('mouseleave', scheduleHideCapsule);

        let cachedTrackRect = null;
        function handleVolumeFromPointer(e) {
            if (!cachedTrackRect) {
                cachedTrackRect = track.getBoundingClientRect();
            }
            const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
            const pct = Math.max(0, Math.min(1, (cachedTrackRect.bottom - clientY) / (cachedTrackRect.height || 104)));
            const vol = Math.round(pct * 100);
            window.setReelVolume(vol);
        }

        track.addEventListener('mousedown', (e) => {
            isDragging = true;
            cachedTrackRect = track.getBoundingClientRect();
            handleVolumeFromPointer(e);
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                handleVolumeFromPointer(e);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                cachedTrackRect = null;
                scheduleHideCapsule();
            }
        });

        track.addEventListener('touchstart', (e) => {
            isDragging = true;
            cachedTrackRect = track.getBoundingClientRect();
            handleVolumeFromPointer(e);
            e.stopPropagation();
        }, { passive: true });

        track.addEventListener('touchmove', (e) => {
            if (isDragging) {
                handleVolumeFromPointer(e);
            }
        }, { passive: true });

        track.addEventListener('touchend', () => {
            isDragging = false;
            cachedTrackRect = null;
        });

        wrap.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 5 : -5;
            const newVol = Math.max(0, Math.min(100, (state.volume || 0) + delta));
            window.setReelVolume(newVol);
            showCapsule();
            scheduleHideCapsule();
        }, { passive: false });

        const initVol = state.volume !== undefined ? state.volume : 100;
        const fill = document.getElementById('reels-volume-fill');
        const label = document.getElementById('reels-volume-label');
        if (fill) fill.style.height = `${initVol}%`;
        if (label) label.textContent = `${initVol}%`;
    }

    // ── Reels Options Bottom Sheet (Image 3) ──────────────────────────────────
    window.openReelsOptionsSheet = function () {
        const backdrop = document.getElementById('reels-options-backdrop');
        if (!backdrop) return;
        backdrop.classList.add('show');

        // Sync Speed UI
        document.querySelectorAll('.sheet-pill-btn[data-speed]').forEach((btn) => {
            const spd = parseFloat(btn.dataset.speed);
            btn.classList.toggle('active', Math.abs(spd - state.playbackSpeed) < 0.05);
        });
        const speedValEl = document.getElementById('sheet-speed-val');
        if (speedValEl) speedValEl.textContent = `${state.playbackSpeed}x`;

        // Sync Quality UI
        document.querySelectorAll('.sheet-pill-btn[data-quality]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.quality === (state.videoQuality || '720p'));
        });
        const qualValEl = document.getElementById('sheet-quality-val');
        if (qualValEl) {
            qualValEl.textContent = state.videoQuality === '1080p' ? '1080p FHD' : (state.videoQuality === 'auto' ? 'Tự động' : '720p HD');
        }

        // Sync Auto Next
        const autoNextToggle = document.getElementById('sheet-toggle-autonext');
        if (autoNextToggle) autoNextToggle.checked = !!state.autoNext;

        // Sync Loop
        const loopToggle = document.getElementById('sheet-toggle-loop');
        if (loopToggle) loopToggle.checked = !!state.loopClip;

        // Sync Aspect
        const vp = document.querySelector('.reels-viewport');
        const isCover = vp && vp.classList.contains('mode-cover');
        const isRotate = vp && vp.classList.contains('mode-rotate-90');
        const currentAsp = isRotate ? 'rotate' : (isCover ? 'vertical' : 'cinema');
        document.querySelectorAll('.sheet-pill-btn[data-aspect]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.aspect === currentAsp);
        });
        const aspectValEl = document.getElementById('sheet-aspect-val');
        if (aspectValEl) {
            aspectValEl.textContent = currentAsp === 'vertical' ? 'Dọc 9:16' : (currentAsp === 'rotate' ? 'Xoay Ngang 90°' : 'Chuẩn Rạp 16:9');
        }
    };

    window.closeReelsOptionsSheet = function () {
        const backdrop = document.getElementById('reels-options-backdrop');
        if (backdrop) backdrop.classList.remove('show');
    };

    window.toggleRowSwitch = function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = !el.checked;
        el.dispatchEvent(new Event('change'));
    };

    window.setReelPlaybackSpeed = function (speed) {
        state.playbackSpeed = speed;
        // Synchronous 0ms UI update
        const speedValEl = document.getElementById('sheet-speed-val');
        if (speedValEl) speedValEl.textContent = `${speed}x`;
        document.querySelectorAll('.sheet-pill-btn[data-speed]').forEach((btn) => {
            btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
        });
        document.querySelectorAll('.speed-label-text').forEach((el) => {
            el.textContent = `${speed}x`;
        });
        const activeIframe = getActiveIframe();
        if (activeIframe) {
            sendCmd(activeIframe, 'setPlaybackRate', [speed]);
        }
    };

    window.setReelQuality = function (quality) {
        state.videoQuality = quality;
        const qualValEl = document.getElementById('sheet-quality-val');
        const label = quality === '1080p' ? '1080p FHD' : (quality === 'auto' ? 'Tự động' : '720p HD');
        if (qualValEl) qualValEl.textContent = label;
        document.querySelectorAll('.sheet-pill-btn[data-quality]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.quality === quality);
        });
    };

    window.toggleReelAutoNext = function (enabled) {
        state.autoNext = !!enabled;
        if (state.autoNext && state.loopClip) {
            state.loopClip = false;
            const loopToggle = document.getElementById('sheet-toggle-loop');
            if (loopToggle) loopToggle.checked = false;
        }
    };

    window.toggleReelLoop = function (enabled) {
        state.loopClip = !!enabled;
        if (state.loopClip && state.autoNext) {
            state.autoNext = false;
            const autoNextToggle = document.getElementById('sheet-toggle-autonext');
            if (autoNextToggle) autoNextToggle.checked = false;
        }
    };

    window.setReelAspect = function (mode) {
        if (mode === 'cinema' || mode === '16:9' || mode === 'mode-16-9') {
            currentAspectIndex = 1;
            window.applyAspectMode('mode-16-9');
        } else if (mode === 'vertical' || mode === '9:16' || mode === 'mode-cover') {
            currentAspectIndex = 2;
            window.applyAspectMode('mode-cover');
        } else if (mode === 'rotate' || mode === 'mode-rotate-90') {
            currentAspectIndex = 3;
            window.applyAspectMode('mode-rotate-90');
        } else {
            currentAspectIndex = 0;
            window.applyAspectMode('standard');
        }
    };

    window.copyCurrentReelLink = function () {
        const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
        const slug = curItem ? curItem.getAttribute('data-slug') : '';
        const title = curItem ? curItem.getAttribute('data-movie-title') : '';
        const url = `${window.location.origin}/reels?q=${encodeURIComponent(title || slug)}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('📋 Đã sao chép liên kết video!');
        }).catch(() => {
            showToast('📋 Liên kết: ' + url);
        });
    };

    window.openCurrentReelDetail = function () {
        const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
        const slug = curItem ? curItem.getAttribute('data-slug') : '';
        if (slug) {
            window.location.href = `/phim/${slug}`;
        } else {
            showToast('ℹ️ Không có thông tin phim chi tiết');
        }
    };

    window.cyclePlaybackSpeed = function () {
        state.speedIndex = (state.speedIndex + 1) % state.availableSpeeds.length;
        window.setReelPlaybackSpeed(state.availableSpeeds[state.speedIndex]);
    };

    // ── Interactive Drag & Click Scrubber Progress Engine ──────────────────────
    let isScrubbing = false;
    let activeScrubIndex = null;
    let activeScrubTrack = null;
    let lastScrubPercent = 0;
    // ⏱️ Seek Guard: after a manual seekTo, block infoDelivery from resetting
    // the progress fill for 2.5s — YouTube takes time to actually process the seek
    let seekGuardUntil = 0;

    function getEventClientX(e) {
        if (e.touches && e.touches.length > 0) {
            return e.touches[0].clientX;
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return e.changedTouches[0].clientX;
        }
        if (typeof e.clientX === 'number') {
            return e.clientX;
        }
        return null;
    }

    let scrubRaf = null;

    function applyScrub(e, commit = false) {
        if (!activeScrubTrack) return;
        const rect = activeScrubTrack.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;

        const clientX = getEventClientX(e);
        let percent = lastScrubPercent;
        if (clientX !== null) {
            percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            lastScrubPercent = percent;
        }

        const targetIndex = (activeScrubIndex !== null) ? activeScrubIndex : state.currentIndex;

        if (scrubRaf) cancelAnimationFrame(scrubRaf);
        scrubRaf = requestAnimationFrame(() => {
            const fill = document.getElementById(`progress-fill-${targetIndex}`);

            if (commit) {
                // ⚡ Instant visual: disable CSS transition for 300ms then restore
                if (fill) {
                    fill.style.transition = 'none';
                    fill.style.width = `${percent * 100}%`;
                    // Re-enable smooth transition after paint
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (fill) fill.style.transition = '';
                        });
                    });
                }
            } else {
                if (fill) fill.style.width = `${percent * 100}%`;
            }

            const curDurEl = document.getElementById(`time-duration-${targetIndex}`);
            let durSec = state.slideDurations[targetIndex] || state.activeDuration || 225;
            if (!state.slideDurations[targetIndex] && curDurEl && curDurEl.textContent.includes(':')) {
                const parsed = parseReelTimeToSeconds(curDurEl.textContent);
                if (parsed > 0) durSec = parsed;
            }
            const targetSec = durSec * percent;
            const formattedTime = formatReelTime(targetSec, durSec);

            const hoverEl = document.getElementById(`hover-time-${targetIndex}`);
            if (hoverEl) {
                hoverEl.textContent = formattedTime;
                hoverEl.style.left = `${percent * 100}%`;
            }

            const curTimeEl = document.getElementById(`time-current-${targetIndex}`);
            if (curTimeEl) {
                curTimeEl.textContent = formattedTime;
            }

            if (commit) {
                // ⏱️ Set seek guard: block infoDelivery from overwriting for 2.5s
                seekGuardUntil = Date.now() + 2500;

                const activeIframe = getActiveIframe();
                if (activeIframe) {
                    sendCmd(activeIframe, 'seekTo', [targetSec, true]);
                    sendCmd(activeIframe, 'playVideo');
                    state.isPlaying = true;
                }
                recordWatchHistory(targetIndex, targetSec, durSec);
            }
        });
    }

    window.seekReelProgress = function (e, index) {
        if (e && e.stopPropagation) e.stopPropagation();
        activeScrubIndex = (index !== undefined) ? index : state.currentIndex;
        activeScrubTrack = e.currentTarget || (e.target ? e.target.closest('.reel-progress-track') : null);
        applyScrub(e, true);
    };
    window.handleProgressBarClick = window.seekReelProgress;

    function initReelsScrubber() {
        // Desktop Mousedown & Click
        document.addEventListener('mousedown', (e) => {
            const track = e.target.closest('.reel-progress-track');
            if (!track) return;
            // Only activate for left click (button 0)
            if (typeof e.button === 'number' && e.button !== 0) return;
            isScrubbing = true;
            activeScrubTrack = track;
            const reelItem = track.closest('.reel-item');
            activeScrubIndex = reelItem ? reelItem.getAttribute('data-index') : state.currentIndex;
            track.classList.add('scrubbing');
            applyScrub(e, false);
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            // Safety: If mouse button is not held down (e.buttons === 0), isScrubbing CANNOT be true
            if (isScrubbing && e.buttons === 0) {
                isScrubbing = false;
                if (activeScrubTrack) {
                    activeScrubTrack.classList.remove('scrubbing');
                    activeScrubTrack = null;
                }
            }

            if (isScrubbing) {
                // ✅ Drag-scrubbing: fill follows cursor ONLY when user is actively pressing & dragging
                applyScrub(e, false);
            } else {
                // 👁️ Hover only: show time tooltip WITHOUT moving the fill or seeking
                const track = e.target.closest('.reel-progress-track');
                if (track) {
                    const rect = track.getBoundingClientRect();
                    if (!rect || rect.width <= 0) return;
                    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const reelItem = track.closest('.reel-item');
                    const hoverIndex = reelItem ? reelItem.getAttribute('data-index') : state.currentIndex;
                    const durSec = state.slideDurations[hoverIndex] || state.activeDuration || 225;
                    const hoverSec = durSec * percent;
                    const hoverEl = document.getElementById(`hover-time-${hoverIndex}`);
                    if (hoverEl) {
                        hoverEl.textContent = formatReelTime(hoverSec, durSec);
                        hoverEl.style.left = `${percent * 100}%`;
                    }
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isScrubbing) {
                isScrubbing = false;
                const track = activeScrubTrack;
                if (track) track.classList.remove('scrubbing');
                applyScrub(e, true);
                activeScrubTrack = null;
            }
        });

        // Mobile Touch Scrubbing with Zero Jitter
        document.addEventListener('touchstart', (e) => {
            const track = e.target.closest('.reel-progress-track');
            if (!track) return;
            isScrubbing = true;
            activeScrubTrack = track;
            const reelItem = track.closest('.reel-item');
            activeScrubIndex = reelItem ? reelItem.getAttribute('data-index') : state.currentIndex;
            track.classList.add('scrubbing');
            applyScrub(e, false);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (isScrubbing) {
                if (e.cancelable) e.preventDefault();
                applyScrub(e, false);
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (isScrubbing) {
                isScrubbing = false;
                const track = activeScrubTrack;
                if (track) track.classList.remove('scrubbing');
                applyScrub(e, true);
                activeScrubTrack = null;
            }
        });

        window.addEventListener('touchcancel', () => {
            if (isScrubbing) {
                isScrubbing = false;
                if (activeScrubTrack) activeScrubTrack.classList.remove('scrubbing');
                activeScrubTrack = null;
            }
        });
    }

    // ── YouTube PostMessage Event Listener (State Changes & Live Progress) ────
    let progressRaf = null; // Single RAF token for batching all progress DOM updates
    window.addEventListener('message', function (e) {
        if (!e.data) return;
        let data;
        try {
            data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        } catch (err) {
            return;
        }

        // 🛡️ Filter postMessages: ONLY accept playback events from the CURRENT ACTIVE IFRAME
        // This prevents the idle/background iframe (which is pausing, stopping, or buffering) from polluting active state!
        const activeIfr = getActiveIframe();
        if (activeIfr && activeIfr.contentWindow && e.source !== activeIfr.contentWindow) {
            return;
        }

        if (data.event === 'onStateChange') {
            // 1 = playing, 2 = paused, 0 = ended, 3 = buffering
            if (data.info === 1) {
                state.isPlaying = true;
                state.userPaused = false;
                revealPlayingVideo(state.currentIndex);
            } else if (data.info === 2) {
                state.isPlaying = false;
                // ONLY show pause icon briefly when user deliberately tapped — NOT during auto slide transitions
                if (state.userPaused) {
                    const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
                    if (curItem) {
                        const ind = curItem.querySelector('.reel-play-indicator');
                        if (ind) {
                            // Already handled by togglePlayPauseActive with auto-hide timer
                            // Just ensure it's visible if not already shown
                            if (ind.classList.contains('hidden')) {
                                ind.classList.remove('hidden');
                                clearTimeout(ind._autohideTimer);
                                ind._autohideTimer = setTimeout(() => ind.classList.add('hidden'), 700);
                            }
                        }
                    }
                }
            } else if (data.info === 0) {
                // Video ended: auto next reel if enabled, otherwise loop
                if (state.autoNext && !state.loopClip) {
                    window.scrollToNextReel();
                } else {
                    const activeIframe = getActiveIframe();
                    if (activeIframe) {
                        sendCmd(activeIframe, 'seekTo', [0, true]);
                        sendCmd(activeIframe, 'playVideo');
                    }
                }
            }
        } else if (data.event === 'onError') {
            // 🚨 YouTube Error Trap: 150/101 = embed blocked ("Video này không hoạt động"), 100 = deleted/private, 2/5 = invalid
            console.warn(`[Reels Auto-Heal] YouTube Error ${data.info} on index ${state.currentIndex}. Auto-skipping dead video...`);
            clearTimeout(state.stallWatchdogTimer);
            showToast('⚡ Video bị giới hạn bản quyền, đang tự động chuyển tiếp...', 'info', 1800);

            // Keep cover visible so the user never sees "Video này không hoạt động"
            const curItem = document.getElementById(`reel-item-${state.currentIndex}`);
            if (curItem) {
                const cover = curItem.querySelector('.reel-thumb-cover');
                if (cover) cover.classList.remove('hidden');
            }

            clearTimeout(state.errorSkipTimer);
            state.errorSkipTimer = setTimeout(() => {
                window.scrollToNextReel();
            }, 450);
        } else if (data.event === 'infoDelivery' && data.info) {
            // If currentTime > 0, video is actively decoding frames
            if (typeof data.info.currentTime === 'number' && data.info.currentTime > 0) {
                revealPlayingVideo(state.currentIndex);
            }
            const capturedIndex = state.currentIndex;
            const rawDur = typeof data.info.duration === 'number' && data.info.duration > 0 ? data.info.duration : null;
            if (rawDur) {
                state.activeDuration = rawDur;
                state.slideDurations[capturedIndex] = rawDur;
                const durEl = document.getElementById(`time-duration-${capturedIndex}`);
                if (durEl) {
                    durEl.textContent = formatReelTime(rawDur, rawDur);
                }
            }

            if (typeof data.info.currentTime === 'number') {
                const ct = data.info.currentTime;
                const dur = rawDur || state.slideDurations[capturedIndex] || state.activeDuration || 225;
                const loadedFraction = typeof data.info.videoLoadedFraction === 'number' ? data.info.videoLoadedFraction : null;
                recordWatchHistory(capturedIndex, ct, dur);

                // Anti-Endscreen Shield: If video is within 0.35s of the end, auto-next or loop
                if (dur > 3 && ct >= dur - 0.35) {
                    if (state.autoNext && !state.loopClip) {
                        window.scrollToNextReel();
                    } else {
                        const activeIframe = getActiveIframe();
                        if (activeIframe) {
                            sendCmd(activeIframe, 'seekTo', [0, true]);
                            sendCmd(activeIframe, 'playVideo');
                        }
                    }
                }

                // ⚡ Batch ALL DOM mutations into ONE RAF per frame — prevents layout thrashing
                // and makes progress bar updates buttery smooth at exactly 60fps.
                // 🛑 SEEK GUARD: If user just manually seeked, skip infoDelivery progress updates
                // for 2.5s to prevent YouTube's old currentTime from snapping the bar back to 0.
                const nowMs = Date.now();
                const isSeekGuarded = nowMs < seekGuardUntil;

                if (progressRaf) cancelAnimationFrame(progressRaf);
                const capturedCt = ct;
                const capturedDur = dur;
                const capturedFraction = loadedFraction;
                const capturedScrubbing = isScrubbing;
                const capturedGuarded = isSeekGuarded;
                progressRaf = requestAnimationFrame(() => {
                    progressRaf = null;
                    if (!capturedScrubbing && !capturedGuarded) {
                        const pct = capturedDur > 0 ? (capturedCt / capturedDur) : 0;
                        const fill = document.getElementById(`progress-fill-${capturedIndex}`);
                        if (fill) fill.style.width = `${Math.min(100, pct * 100)}%`;
                        const curTimeEl = document.getElementById(`time-current-${capturedIndex}`);
                        if (curTimeEl) {
                            curTimeEl.textContent = formatReelTime(capturedCt, capturedDur);
                        }
                    }
                    if (capturedFraction !== null) {
                        const buf = document.getElementById(`progress-buffer-${capturedIndex}`);
                        if (buf) buf.style.width = `${Math.min(100, capturedFraction * 100)}%`;
                    }
                    if (capturedDur > 0) {
                        const durEl = document.getElementById(`time-duration-${capturedIndex}`);
                        if (durEl) {
                            durEl.textContent = formatReelTime(capturedDur, capturedDur);
                        }
                    }
                });
            }
        }
    });

    // ── Likes & Bookmarks ───────────────────────────────────────────────────────
    window.toggleLikeReel = function (id, index) {
        const btn = document.getElementById(`btn-like-${index}`);
        const likeCountEl = btn ? btn.querySelector('.like-count') : null;

        if (state.likedReels.has(id)) {
            state.likedReels.delete(id);
            if (btn) btn.classList.remove('liked');
            if (likeCountEl) {
                const count = parseInt(likeCountEl.textContent.replace(/[^0-9]/g, '') || '0', 10);
                likeCountEl.textContent = Math.max(0, count - 1);
            }
        } else {
            state.likedReels.add(id);
            if (btn) btn.classList.add('liked');
            if (likeCountEl) {
                const count = parseInt(likeCountEl.textContent.replace(/[^0-9]/g, '') || '0', 10);
                likeCountEl.textContent = count + 1;
            }
            triggerDoubleTapHeart(index);
        }

        localStorage.setItem('aphim_reels_liked', JSON.stringify(Array.from(state.likedReels)));

        fetch(`/api/reels/like/${encodeURIComponent(id)}?action=${state.likedReels.has(id) ? 'like' : 'unlike'}`, {
            method: 'POST'
        }).catch(() => {});
    };

    window.toggleBookmarkReel = function (id, index) {
        if (state.savedReels.has(id)) {
            state.savedReels.delete(id);
            // Silent remove — visual feedback via button state is sufficient
        } else {
            state.savedReels.add(id);
            showToast('Đã lưu', 'success', 1000);
        }
        localStorage.setItem('aphim_reels_saved', JSON.stringify(Array.from(state.savedReels)));
    };

    function restoreLikedStates() {
        state.likedReels.forEach((id) => {
            const items = document.querySelectorAll(`.reel-item[data-id="${id}"]`);
            items.forEach((item) => {
                const idx = item.getAttribute('data-index');
                const btn = document.getElementById(`btn-like-${idx}`);
                if (btn) btn.classList.add('liked');
            });
        });
        syncDesktopActionDock();
    }

    // ── Share Controller ────────────────────────────────────────────────────────
    window.shareCurrentReel = function (slug, title) {
        const shareUrl = `${window.location.origin}/reels?q=${encodeURIComponent(slug)}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('📋 Đã sao chép link video review!');
            }).catch(() => {
                window.prompt('Sao chép liên kết video review:', shareUrl);
            });
        } else {
            window.prompt('Sao chép liên kết video review:', shareUrl);
        }
    };

    // ── Comments Slide-Over Drawer (Luxury Interactive Controller) ─────────────
    let currentDrawerReelId = null;
    let drawerCommentsStore = {};

    function generateDefaultComments(movieTitle) {
        return [
            {
                id: 'cm-admin',
                author: 'APhim Reviewer',
                isAdmin: true,
                avatarBg: 'admin',
                avatarText: 'AP',
                time: 'Ghim • Vừa xong',
                text: `Bấm nút "XEM PHIM" màu vàng ở góc phải để xem trọn bộ phim "${movieTitle || 'này'}" Full HD Vietsub miễn phí nhé mọi người! 🔥`,
                likes: 128,
                isLiked: false
            },
            {
                id: 'cm-1',
                author: 'Hoàng Nam',
                isAdmin: false,
                avatarBg: 'linear-gradient(135deg, #6366f1, #a855f7)',
                avatarText: 'HN',
                time: '25 phút trước',
                text: 'Video review cuốn thật sự, lướt mượt không giật lag tí nào 10/10 ⭐ cốt truyện bánh cuốn ghê!',
                likes: 42,
                isLiked: false
            },
            {
                id: 'cm-2',
                author: 'Minh Thư',
                isAdmin: false,
                avatarBg: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                avatarText: 'MT',
                time: '1 giờ trước',
                text: 'Đoạn cao trào xem nổi hết cả da gà! Diễn viên đóng đạt dã man 😍',
                likes: 19,
                isLiked: false
            },
            {
                id: 'cm-3',
                author: 'Tuấn Cường',
                isAdmin: false,
                avatarBg: 'linear-gradient(135deg, #10b981, #06b6d4)',
                avatarText: 'TC',
                time: '3 giờ trước',
                text: 'Ai xem full bộ này rồi cho xin review tập cuối có hậu không ạ? 🔥👏',
                likes: 8,
                isLiked: false
            }
        ];
    }

    window.openReelsCommentsDrawer = async function (reelId, movieTitle) {
        currentDrawerReelId = reelId || 'default-reel';
        const drawer = document.getElementById('reels-comments-drawer');
        const backdrop = document.getElementById('reels-comments-backdrop');
        const movieSubEl = document.getElementById('drawer-comments-movie');
        const badgeEl = document.getElementById('drawer-comments-badge');
        const popover = document.getElementById('comments-emoji-popover');
        const list = document.getElementById('drawer-comments-list');

        if (popover) popover.classList.add('hidden');
        if (movieSubEl) {
            movieSubEl.innerHTML = `
                <svg class="comments-movie-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
                <span>${escapeHtml(movieTitle || 'Đang phát')}</span>
            `;
        }

        if (drawer) drawer.classList.add('active');
        if (backdrop) backdrop.classList.add('active');

        // Tìm YouTube ID nếu có
        let ytId = '';
        const targetItem = document.getElementById(reelId) || 
                           document.querySelector(`[data-id="${reelId}"]`) || 
                           document.querySelector('.reel-item.active');
        if (targetItem) {
            ytId = targetItem.getAttribute('data-yt') || '';
        }

        // Nếu đã có sẵn trong cache bộ nhớ thì render tức thì 0ms
        if (drawerCommentsStore[currentDrawerReelId]) {
            const comments = drawerCommentsStore[currentDrawerReelId];
            if (badgeEl) badgeEl.textContent = `${comments.length + 38}`;
            renderDrawerCommentsList();
        } else {
            // Hiển thị hiệu ứng Loading Shimmer mượt mà
            if (list) {
                list.innerHTML = `
                    <div class="comments-loading-box flex flex-col items-center justify-center py-12 gap-3">
                        <div class="w-8 h-8 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin"></div>
                        <div class="text-xs text-gray-300 font-semibold flex items-center gap-2">
                            <span>Đang tải bình luận từ người xem...</span>
                        </div>
                    </div>
                `;
            }

            try {
                const fetchUrl = `/api/reels/comments?yt=${encodeURIComponent(ytId)}&title=${encodeURIComponent(movieTitle || '')}`;
                const res = await fetch(fetchUrl);
                const data = await res.json();

                if (data && data.success && Array.isArray(data.comments) && data.comments.length > 0) {
                    drawerCommentsStore[currentDrawerReelId] = data.comments;
                    if (badgeEl) badgeEl.textContent = `${data.total || (data.comments.length + 38)}`;
                } else {
                    drawerCommentsStore[currentDrawerReelId] = generateDefaultComments(movieTitle);
                }
            } catch (err) {
                drawerCommentsStore[currentDrawerReelId] = generateDefaultComments(movieTitle);
            }

            renderDrawerCommentsList();
        }

        // Focus input
        setTimeout(() => {
            const input = document.getElementById('drawer-comment-input');
            if (input && window.innerWidth >= 768) input.focus();
        }, 300);
    };

    window.closeReelsCommentsDrawer = function () {
        const drawer = document.getElementById('reels-comments-drawer');
        const backdrop = document.getElementById('reels-comments-backdrop');
        const popover = document.getElementById('comments-emoji-popover');
        if (drawer) drawer.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        if (popover) popover.classList.add('hidden');
    };

    function renderDrawerCommentsList() {
        const list = document.getElementById('drawer-comments-list');
        if (!list || !currentDrawerReelId) return;

        const comments = drawerCommentsStore[currentDrawerReelId] || [];
        list.innerHTML = comments.map(c => `
            <div class="comment-card-item ${c.isAdmin ? 'is-admin-card' : ''}" id="${c.id}">
                <div class="comment-avatar ${c.isAdmin ? 'admin-avatar' : ''}" style="${c.avatarBg !== 'admin' ? `background: ${c.avatarBg}` : ''}">
                    ${c.avatarText}
                </div>
                <div class="comment-content-wrap">
                    <div class="comment-header-row">
                        <span class="comment-author-name">${escapeHtml(c.author)}</span>
                        ${c.isAdmin ? `
                            <span class="comment-admin-badge">
                                <svg class="inline mr-0.5" viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                ADMIN
                            </span>
                            <span class="comment-pin-badge">
                                <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                                Đã ghim
                            </span>
                        ` : ''}
                        <span class="comment-time-ago">${c.time}</span>
                    </div>
                    <div class="comment-bubble-box ${c.isAdmin ? 'admin-bubble' : ''}">
                        <div class="comment-text-body">${escapeHtml(c.text)}</div>
                    </div>
                    <div class="comment-actions-bar">
                        <button type="button" class="comment-like-action-btn ${c.isLiked ? 'liked' : ''}" onclick="toggleCommentLike(this, '${c.id}')" title="Thích bình luận">
                            <svg class="comment-heart-icon" viewBox="0 0 24 24" width="14" height="14" fill="${c.isLiked ? '#ff4757' : 'none'}" stroke="${c.isLiked ? '#ff4757' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            <span class="like-count">${c.likes}</span>
                        </button>
                        <button type="button" class="comment-reply-action-btn" onclick="replyToCommentAuthor('${escapeHtml(c.author)}')" title="Trả lời bình luận này">
                            <svg class="comment-reply-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 17 4 12 9 7"></polyline>
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                            </svg>
                            <span>Trả lời</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.toggleCommentLike = function (btn, commentId) {
        if (!currentDrawerReelId || !drawerCommentsStore[currentDrawerReelId]) return;
        const comment = drawerCommentsStore[currentDrawerReelId].find(c => c.id === commentId);
        if (!comment) return;

        comment.isLiked = !comment.isLiked;
        comment.likes += comment.isLiked ? 1 : -1;

        btn.classList.toggle('liked', comment.isLiked);
        const heartSvg = btn.querySelector('.comment-heart-icon');
        if (heartSvg) {
            heartSvg.setAttribute('fill', comment.isLiked ? '#ff4757' : 'none');
            heartSvg.setAttribute('stroke', comment.isLiked ? '#ff4757' : 'currentColor');
        }
        const countSpan = btn.querySelector('.like-count');
        if (countSpan) countSpan.textContent = comment.likes;
    };

    window.replyToCommentAuthor = function (author) {
        const input = document.getElementById('drawer-comment-input');
        if (input) {
            input.value = `@${author} `;
            input.focus();
        }
    };

    window.sortDrawerComments = function (type, btn) {
        document.querySelectorAll('.comment-sort-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        if (!currentDrawerReelId || !drawerCommentsStore[currentDrawerReelId]) return;
        const comments = drawerCommentsStore[currentDrawerReelId];

        if (type === 'top') {
            comments.sort((a, b) => b.likes - a.likes);
        } else if (type === 'newest') {
            comments.sort((a, b) => {
                if (a.isAdmin) return -1;
                if (b.isAdmin) return 1;
                return 0;
            });
        }
        renderDrawerCommentsList();
    };

    window.insertQuickReaction = function (text) {
        const input = document.getElementById('drawer-comment-input');
        if (input) {
            input.value = text;
            window.submitReelComment();
        }
    };

    window.toggleQuickEmojiPicker = function (e) {
        if (e) e.stopPropagation();
        const popover = document.getElementById('comments-emoji-popover');
        if (popover) {
            popover.classList.toggle('hidden');
        }
    };

    // Close emoji popover on click outside
    document.addEventListener('click', function (e) {
        const popover = document.getElementById('comments-emoji-popover');
        const toggleBtn = document.querySelector('.comment-emoji-toggle-btn');
        if (popover && !popover.classList.contains('hidden')) {
            if (!popover.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
                popover.classList.add('hidden');
            }
        }
    });

    window.insertEmojiToComment = function (emoji) {
        const input = document.getElementById('drawer-comment-input');
        if (input) {
            input.value += emoji;
            input.focus();
        }
    };

    window.submitReelComment = function () {
        const input = document.getElementById('drawer-comment-input');
        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        input.value = '';

        const popover = document.getElementById('comments-emoji-popover');
        if (popover) popover.classList.add('hidden');

        if (!currentDrawerReelId) currentDrawerReelId = 'default-reel';
        if (!drawerCommentsStore[currentDrawerReelId]) {
            drawerCommentsStore[currentDrawerReelId] = generateDefaultComments('Phim');
        }

        const newComment = {
            id: 'cm-user-' + Date.now(),
            author: 'Bạn (Người xem)',
            isAdmin: false,
            avatarBg: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            avatarText: 'BẠN',
            time: 'Vừa xong',
            text: text,
            likes: 1,
            isLiked: true
        };

        // Insert after admin comment or at start
        const comments = drawerCommentsStore[currentDrawerReelId];
        const adminIdx = comments.findIndex(c => c.isAdmin);
        if (adminIdx !== -1) {
            comments.splice(adminIdx + 1, 0, newComment);
        } else {
            comments.unshift(newComment);
        }

        renderDrawerCommentsList();

        const badgeEl = document.getElementById('drawer-comments-badge');
        if (badgeEl) badgeEl.textContent = `${comments.length + 38}`;

        showToast('💬 Đã gửi bình luận của bạn thành công!');
    };

    window.handleCommentInputKey = function (e) {
        if (e.key === 'Enter') {
            window.submitReelComment();
        }
    };

    // Close on ESC key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const drawer = document.getElementById('reels-comments-drawer');
            if (drawer && drawer.classList.contains('active')) {
                window.closeReelsCommentsDrawer();
            }
        }
    });

    // ── Search Spotlight Modal ──────────────────────────────────────────────────
    let searchDebounceTimer = null;
    let initialTrendingSearchHtml = null;

    window.openReelsSearchModal = function () {
        const modal = document.getElementById('reels-search-modal');
        const input = document.getElementById('reels-search-input');
        const resultsList = document.getElementById('search-results-list');
        if (modal) modal.classList.add('active');
        if (!initialTrendingSearchHtml && resultsList) {
            initialTrendingSearchHtml = resultsList.innerHTML;
        }
        if (input) {
            input.focus();
            input.select();
        }
    };

    window.closeReelsSearchModal = function () {
        const modal = document.getElementById('reels-search-modal');
        if (modal) modal.classList.remove('active');
    };

    window.handleSearchBackdropClick = function (e) {
        if (e.target.id === 'reels-search-modal') {
            window.closeReelsSearchModal();
        }
    };

    window.clearReelsSearchInput = function () {
        const input = document.getElementById('reels-search-input');
        const clearBtn = document.getElementById('reels-search-clear-btn');
        const heading = document.getElementById('search-results-heading');
        const resultsList = document.getElementById('search-results-list');

        if (input) {
            input.value = '';
            input.focus();
        }
        if (clearBtn) clearBtn.classList.add('hidden');
        if (heading) heading.textContent = 'GỢI Ý THỊNH HÀNH';
        if (resultsList && initialTrendingSearchHtml) {
            resultsList.innerHTML = initialTrendingSearchHtml;
        }
    };

    window.debounceReelsSearch = function (val) {
        clearTimeout(searchDebounceTimer);
        const query = (val || '').trim();
        const clearBtn = document.getElementById('reels-search-clear-btn');
        const resultsList = document.getElementById('search-results-list');
        const heading = document.getElementById('search-results-heading');

        if (!initialTrendingSearchHtml && resultsList) {
            initialTrendingSearchHtml = resultsList.innerHTML;
        }

        if (clearBtn) {
            if (query.length > 0) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        }

        if (!query) {
            if (heading) heading.textContent = 'GỢI Ý THỊNH HÀNH';
            if (resultsList && initialTrendingSearchHtml) {
                resultsList.innerHTML = initialTrendingSearchHtml;
            }
            return;
        }

        searchDebounceTimer = setTimeout(async () => {
            if (heading) heading.textContent = `Kết quả cho "${query}"`;

            try {
                const res = await fetch(`/api/reels/instant-suggest?q=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data.success && data.items && data.items.length > 0) {
                    resultsList.innerHTML = data.items.map((item, idx) => `
                        <div class="search-result-card" onclick="filterReelsByQuery('${escapeHtml(item.name)}')">
                            <div class="search-card-thumb-wrap">
                                <img src="${item.poster}" class="search-card-thumb" alt="${escapeHtml(item.name)}" onerror="this.src='/android-chrome-192x192.png';" />
                                <span class="search-card-rank-badge rank-${idx + 1}">#${idx + 1}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="search-card-title">${escapeHtml(item.name)}</div>
                                <div class="search-card-sub">
                                    <span>${escapeHtml(item.year || '2026')}</span>
                                    <span class="search-card-dot">•</span>
                                    <span class="search-card-quality">${escapeHtml(item.quality || 'FHD')}</span>
                                    <span class="search-card-dot">•</span>
                                    <span class="search-card-rating">⭐ ${escapeHtml(item.rating || '9.6')}</span>
                                </div>
                            </div>
                            <span class="search-card-play-arrow">
                                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </span>
                        </div>
                    `).join('');
                } else {
                    resultsList.innerHTML = `
                        <div class="text-center py-8 text-sm text-gray-400 space-y-2">
                            <div class="text-2xl">🎬</div>
                            <div class="text-gray-300 font-semibold">Không tìm thấy video phù hợp</div>
                            <div class="text-xs text-gray-500">Thử tìm với từ khóa khác hoặc bấm thể loại bên trên</div>
                        </div>
                    `;
                }
            } catch (err) {
                console.error('Search error:', err);
            }
        }, 220);
    };

    window.filterReelsByQuery = function (query) {
        window.closeReelsSearchModal();
        if (window.selectSearchDropdownMovie) {
            window.selectSearchDropdownMovie(query);
        } else {
            window.location.href = `/reels?q=${encodeURIComponent(query)}`;
        }
    };

    // ── Keyboard Navigation ─────────────────────────────────────────────────────
    function setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                if (e.key === 'Escape') {
                    window.closeReelsSearchModal();
                    window.closeReelsCommentsDrawer();
                    window.closeReelsOptionsSheet();
                    window.closeReelsHistoryModal();
                }
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                case 'j':
                case 'J':
                    e.preventDefault();
                    scrollToReelIndex(state.currentIndex + 1);
                    break;

                case 'ArrowUp':
                case 'k':
                case 'K':
                    e.preventDefault();
                    scrollToReelIndex(Math.max(0, state.currentIndex - 1));
                    break;

                case ' ':
                    e.preventDefault();
                    togglePlayPauseActive(state.currentIndex);
                    break;

                case 'm':
                case 'M':
                    e.preventDefault();
                    window.toggleMuteGlobal();
                    break;

                case 'l':
                case 'L':
                    e.preventDefault();
                    const currentItem = document.getElementById(`reel-item-${state.currentIndex}`);
                    if (currentItem) {
                        window.toggleLikeReel(currentItem.getAttribute('data-id'), state.currentIndex);
                    }
                    break;

                case 'f':
                case 'F':
                    e.preventDefault();
                    window.toggleReelsFullscreen();
                    break;

                case 'Escape':
                    if (document.body.classList.contains('reels-cinema-mode')) {
                        window.applyAspectMode('standard');
                        return;
                    }
                    if (document.body.classList.contains('reels-theater-mode')) {
                        window.toggleReelsFullscreen();
                        return;
                    }
                    window.closeReelsSearchModal();
                    window.closeReelsCommentsDrawer();
                    window.closeReelsOptionsSheet();
                    window.closeReelsHistoryModal();
                    break;
            }
        });
    }

    window.handleExitTheaterOrCinema = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        if (document.body.classList.contains('reels-cinema-mode')) {
            window.applyAspectMode('standard');
        } else {
            window.toggleReelsFullscreen(null, false);
        }
    };

    // ── 🖥️ Desktop Theater / Fullscreen Mode Engine (Zero-Jank 60FPS Morphing) ──
    window.toggleReelsFullscreen = function (e, forceState = null) {
        if (e && e.stopPropagation) e.stopPropagation();
        
        const fsBtn = document.getElementById('reels-fullscreen-btn');
        const iconSvg = document.getElementById('reels-fullscreen-icon');
        if (fsBtn) {
            fsBtn.classList.add('is-animating');
            setTimeout(() => {
                try { fsBtn.classList.remove('is-animating'); } catch (err) {}
            }, 400);
        }

        const currentlyTheater = document.body.classList.contains('reels-theater-mode');
        const shouldBeTheater = forceState !== null ? forceState : !currentlyTheater;

        requestAnimationFrame(() => {
            if (shouldBeTheater) {
                document.body.classList.add('reels-theater-mode');
                if (fsBtn) {
                    fsBtn.classList.add('fullscreen-active');
                    fsBtn.title = 'Thoát toàn màn hình (ESC hoặc F)';
                }
                if (iconSvg) {
                    // Exit Fullscreen Icon
                    iconSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M9 9H4.5M9 9V4.5M9 9L3.75 3.75M9 15H4.5M9 15v4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25"/>`;
                }
                showToast('🎬 Rạp Chiếu Toàn Màn Hình (Nhấn F hoặc ESC để thoát)', 'info', 1800);

                // Smooth Native Fullscreen trigger after UI transition starts
                setTimeout(() => {
                    try {
                        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                            document.documentElement.requestFullscreen().catch(() => {});
                        }
                    } catch (err) {}
                }, 80);
            } else {
                document.body.classList.remove('reels-theater-mode');
                if (fsBtn) {
                    fsBtn.classList.remove('fullscreen-active');
                    fsBtn.title = 'Toàn màn hình / Rạp chiếu (Phím F)';
                }
                if (iconSvg) {
                    // Enter Fullscreen Icon
                    iconSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/>`;
                }
                showToast('Đã thoát toàn màn hình', 'info', 1500);

                try {
                    if (document.exitFullscreen && document.fullscreenElement) {
                        document.exitFullscreen().catch(() => {});
                    }
                } catch (err) {}
            }
        });
    };

    // Auto-sync when exiting browser fullscreen via ESC (Explicitly set false to avoid loop)
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && document.body.classList.contains('reels-theater-mode')) {
            window.toggleReelsFullscreen(null, false);
        }
    });

    window.scrollToReelIndex = function (index) {
        const item = document.getElementById(`reel-item-${index}`);
        if (item && feedContainer) {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    window.scrollToNextReel = function () {
        window.scrollToReelIndex(state.currentIndex + 1);
    };

    window.scrollToPrevReel = function () {
        window.scrollToReelIndex(Math.max(0, state.currentIndex - 1));
    };

    // ── 🚀 TikTok-Grade Discrete Wheel & Touch Momentum Navigation Engine ────────
    function initSmoothSwipePhysics() {
        if (!feedContainer) return;

        // 1. Desktop Wheel Controller: One distinct wheel roll = exactly one slide snap (Zero erratic jumping)
        let wheelLocked = false;
        feedContainer.addEventListener('wheel', (e) => {
            // Ignore if scrubbing or comments/search/history drawer is open
            if (isScrubbing) return;
            const commentsDrawer = document.getElementById('reels-comments-drawer');
            if (commentsDrawer && commentsDrawer.classList.contains('open')) return;
            const searchModal = document.getElementById('reels-search-modal');
            if (searchModal && searchModal.classList.contains('active')) return;
            const historyModal = document.getElementById('reels-history-modal');
            if (historyModal && historyModal.classList.contains('active')) return;

            // Only hijack if vertical delta is noticeable
            if (Math.abs(e.deltaY) < 28) return;
            e.preventDefault();

            if (wheelLocked) return;
            wheelLocked = true;

            if (e.deltaY > 0) {
                window.scrollToNextReel();
            } else {
                window.scrollToPrevReel();
            }

            setTimeout(() => {
                wheelLocked = false;
            }, 130); // 130ms responsive snap debounce for smooth mousewheel navigation
        }, { passive: false });
    }

    let toastTimeout = null;

    function showToast(msg, customType = null, durationOverride = null) {
        const toast = document.getElementById('reels-toast');
        const msgEl = document.getElementById('reels-toast-msg');
        const iconWrap = document.getElementById('reels-toast-icon-wrap');
        if (!toast || !msgEl) return;

        if (toastTimeout) clearTimeout(toastTimeout);

        let type = customType;
        if (!type) {
            if (msg.includes('nhận diện') || msg.includes('Đang tìm') || msg.includes('Đang mở')) type = 'detecting';
            else if (msg.includes('Đã mở') || msg.includes('thành công') || msg.includes('sao chép') || msg.includes('Đã lưu')) type = 'success';
            else if (msg.includes('Không tìm thấy') || msg.includes('lỗi')) type = 'warning';
            else if (msg.includes('âm lượng') || msg.includes('âm thanh')) type = 'volume';
            else if (msg.includes('Tốc độ')) type = 'speed';
            else type = 'info';
        }

        // Clean redundant leading emojis
        const cleanMsg = msg.replace(/^[\uD800-\uDBFF\uDC00-\uDFFF\u2600-\u27BF\uE000-\uF8FF\u2011-\u26FF\s]+/, '').trim();
        msgEl.innerHTML = cleanMsg;

        toast.className = `reels-toast toast-${type}`;

        if (iconWrap) {
            if (type === 'detecting') {
                iconWrap.innerHTML = `
                    <div class="toast-radar-loader">
                        <span class="radar-ping"></span>
                        <svg class="w-4 h-4 text-rose-400 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                            <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                `;
            } else if (type === 'success') {
                iconWrap.innerHTML = `
                    <div class="toast-icon-badge badge-success">
                        <svg class="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                `;
            } else if (type === 'warning') {
                iconWrap.innerHTML = `
                    <div class="toast-icon-badge badge-warning">
                        <svg class="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                `;
            } else if (type === 'volume') {
                iconWrap.innerHTML = `
                    <div class="toast-icon-badge badge-volume">
                        <svg class="w-3.5 h-3.5 text-rose-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                        </svg>
                    </div>
                `;
            } else {
                iconWrap.innerHTML = `
                    <div class="toast-icon-badge badge-info">
                        <svg class="w-3.5 h-3.5 text-sky-300" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                `;
            }
        }

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Shorter durations = less obstruction of the viewing area
        const duration = durationOverride || (type === 'detecting' ? 2000 : (type === 'info' ? 1400 : 1800));
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Direct Sidebar Search & Live Floating Dropdown Handler ──────────────────
    // ── Direct Sidebar Search & Live Floating Dropdown Handler (Ultra-Fast 0ms Recognition) ──
    const sidebarSuggestCache = new Map();
    let sidebarSuggestTimer = null;
    let sidebarAbortController = null;
    let sidebarNavIndex = -1;

    // Chuẩn hóa và xóa dấu tiếng Việt siêu tốc
    function removeVietnameseTones(str) {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .trim();
    }

    // Curated Hot Seed Index for 0ms Client Recognition
    const CLIENT_SEED_MOVIES = [
        { name: 'Bố Già', origin_name: 'The Godfather / Trấn Thành', slug: 'bo-gia', year: '2021', quality: 'Full HD', poster: 'https://phimimg.com/uploads/movies/20260923/bo-gia-hoc-viec-poster.webp' },
        { name: 'Bố Già Học Việc', origin_name: 'The Intern', slug: 'bo-gia-hoc-viec', year: '2015', quality: 'FHD', poster: 'https://phimimg.com/uploads/movies/20260923/bo-gia-hoc-viec-poster.webp' },
        { name: 'Mai', origin_name: 'Trấn Thành Cinema', slug: 'phim-mai', year: '2024', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/kngwPXyj9NU/hqdefault.jpg' },
        { name: 'Đào, Phở và Piano', origin_name: 'Việt Nam', slug: 'dao-pho-va-piano', year: '2024', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { name: 'Lật Mặt 7: Một Điều Ước', origin_name: 'Lý Hải Production', slug: 'lat-mat-7', year: '2024', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/Z7hYwWv-0g4/hqdefault.jpg' },
        { name: 'Star Wars: Mandalorian và Grogu', origin_name: 'The Mandalorian & Grogu', slug: 'star-wars-mandalorian-va-grogu', year: '2026', quality: '4K IMAX', poster: 'https://i.ytimg.com/vi/cLfQncRAWtQ/hqdefault.jpg' },
        { name: 'Khi Cuộc Đời Cho Bạn Quả Quýt', origin_name: 'When Life Gives You Tangerines', slug: 'khi-cuoc-doi-cho-ban-qua-quyt', year: '2025', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/kngwPXyj9NU/hqdefault.jpg' },
        { name: 'Theo Dòng Nước Ngầm (Phần 2)', origin_name: 'Undercurrent (Season 2)', slug: 'theo-dong-nuoc-ngam-phan-2', year: '2025', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/NxtF93RLhpA/hqdefault.jpg' },
        { name: 'Thám Tử Đại Tài (Phần 1)', origin_name: 'Great Detective', slug: 'tham-tu-dai-tai-phan-1', year: '2025', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { name: 'Còn Ra Thể Thống Gì Nữa', origin_name: 'No More Decorum', slug: 'con-ra-the-thong-gi-nua', year: '2026', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/6g-8uB0gM_0/hqdefault.jpg' },
        { name: 'Người Bảo Vệ', origin_name: 'The Defender', slug: 'nguoi-bao-ve', year: '2025', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/7jR0xYF8kKk/hqdefault.jpg' },
        { name: 'Lan Hương Như Cố', origin_name: 'Lan Huong Nhu Co', slug: 'lan-huong-nhu-co', year: '2025', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/v3LwB5h1k6k/hqdefault.jpg' },
        { name: 'Đấu La Đại Lục 2 (Tuyệt Thế Đường Môn)', origin_name: 'Soul Land 2', slug: 'dau-la-dai-luc-2', year: '2026', quality: '4K 60FPS', poster: 'https://i.ytimg.com/vi/kxE0DCTni3o/hqdefault.jpg' },
        { name: 'Ẩn Danh (Phần 3)', origin_name: 'Taxi Driver (Season 3)', slug: 'an-danh-phan-3', year: '2025', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/NxtF93RLhpA/hqdefault.jpg' },
        { name: 'Gia Đình Là Số 1 (Phần 3)', origin_name: 'High Kick 3', slug: 'gia-dinh-la-so-1-phan-3', year: '2025', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { name: 'One Piece (Đảo Hải Tặc)', origin_name: 'One Piece', slug: 'dao-hai-tac', year: '2026', quality: 'Full HD', poster: 'https://i.ytimg.com/vi/kxE0DCTni3o/hqdefault.jpg' }
    ];

    // Helper: Trích xuất toàn bộ reel hiện có trong DOM
    function getLoadedReelsInDom() {
        if (!feedContainer) return [];
        const items = feedContainer.querySelectorAll('.reel-item');
        const list = [];
        items.forEach((el, index) => {
            list.push({
                index,
                name: el.getAttribute('data-movie-title') || el.getAttribute('data-title') || '',
                origin_name: el.getAttribute('data-origin-title') || '',
                slug: el.getAttribute('data-slug') || '',
                yt: el.getAttribute('data-yt') || '',
                poster: el.getAttribute('data-poster') || el.getAttribute('data-backdrop') || '',
                year: el.getAttribute('data-year') || '2026',
                quality: el.getAttribute('data-quality') || 'Full HD',
                watchUrl: el.getAttribute('data-watch-url') || '#'
            });
        });
        return list;
    }

    // Helper: Khớp nối tức thì trên Client (0ms)
    function searchClientReelsInstant(rawQuery) {
        if (!rawQuery) return [];
        const norm = removeVietnameseTones(rawQuery);
        if (!norm) return [];

        const results = [];
        const seenSlugs = new Set();

        // 1. Tìm trong DOM trước
        const domReels = getLoadedReelsInDom();
        for (const r of domReels) {
            const nameNorm = removeVietnameseTones(r.name);
            const origNorm = removeVietnameseTones(r.origin_name);
            const slugNorm = removeVietnameseTones(r.slug);
            if (nameNorm.includes(norm) || origNorm.includes(norm) || slugNorm.includes(norm)) {
                if (!seenSlugs.has(r.slug || r.name)) {
                    seenSlugs.add(r.slug || r.name);
                    results.push(r);
                }
            }
        }

        // 2. Tìm trong Seed Movies
        for (const s of CLIENT_SEED_MOVIES) {
            const nameNorm = removeVietnameseTones(s.name);
            const origNorm = removeVietnameseTones(s.origin_name);
            const slugNorm = removeVietnameseTones(s.slug);
            if (nameNorm.includes(norm) || origNorm.includes(norm) || slugNorm.includes(norm)) {
                if (!seenSlugs.has(s.slug || s.name)) {
                    seenSlugs.add(s.slug || s.name);
                    results.push(s);
                }
            }
        }

        return results.slice(0, 8);
    }

    // Helper: Tô sáng phần chữ trùng khớp
    function highlightMatch(text, query) {
        if (!text || !query) return escapeHtml(text || '');
        const normText = removeVietnameseTones(text);
        const normQuery = removeVietnameseTones(query);
        const idx = normText.indexOf(normQuery);
        if (idx === -1) return escapeHtml(text);

        const before = escapeHtml(text.slice(0, idx));
        const match = escapeHtml(text.slice(idx, idx + query.length));
        const after = escapeHtml(text.slice(idx + query.length));
        return `${before}<mark class="search-match-highlight">${match}</mark>${after}`;
    }

    window.closeSidebarSearchDropdown = function () {
        const dropdown = document.getElementById('sidebar-search-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
        sidebarNavIndex = -1;
    };

    window.handleSidebarSearchFocus = function () {
        const input = document.getElementById('sidebar-direct-search-input');
        if (!input) return;
        const val = input.value.trim();
        if (val.length >= 1) {
            window.handleSidebarSearchInput(val);
        }
    };

    window.handleSidebarSearchKeyDown = function (e) {
        const dropdown = document.getElementById('sidebar-search-dropdown');
        const isDropdownOpen = dropdown && !dropdown.classList.contains('hidden');

        if (e.key === 'Escape') {
            window.closeSidebarSearchDropdown();
            return;
        }

        if (isDropdownOpen) {
            const items = dropdown.querySelectorAll('.sidebar-dropdown-item');
            if (items.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    sidebarNavIndex = (sidebarNavIndex + 1) % items.length;
                    items.forEach((el, idx) => el.classList.toggle('active', idx === sidebarNavIndex));
                    items[sidebarNavIndex].scrollIntoView({ block: 'nearest' });
                    return;
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    sidebarNavIndex = (sidebarNavIndex - 1 + items.length) % items.length;
                    items.forEach((el, idx) => el.classList.toggle('active', idx === sidebarNavIndex));
                    items[sidebarNavIndex].scrollIntoView({ block: 'nearest' });
                    return;
                } else if (e.key === 'Enter' && sidebarNavIndex >= 0 && items[sidebarNavIndex]) {
                    e.preventDefault();
                    items[sidebarNavIndex].click();
                    return;
                }
            }
        }

        if (e.key === 'Enter') {
            window.handleSidebarDirectSearch(e);
        }
    };

    window.handleSidebarSearchInput = function (val) {
        window.toggleSidebarSearchClear(val);

        const cleanVal = (val || '').trim();
        const dropdown = document.getElementById('sidebar-search-dropdown');
        const listEl = document.getElementById('sidebar-dropdown-list');
        const footerEl = document.getElementById('sidebar-dropdown-footer');
        const badgeEl = document.getElementById('sidebar-dropdown-badge');
        const queryTextEl = document.getElementById('sidebar-dropdown-query');

        if (!cleanVal) {
            window.closeSidebarSearchDropdown();
            return;
        }

        if (!dropdown || !listEl) return;

        dropdown.classList.remove('hidden');
        sidebarNavIndex = -1;
        if (queryTextEl) queryTextEl.textContent = cleanVal;

        // ⚡ BƯỚC 1: NHẬN DIỆN CLIENT SIÊU TỐC 0MS!
        const instantMatches = searchClientReelsInstant(cleanVal);
        if (instantMatches.length > 0) {
            renderSidebarSuggestResults(instantMatches, cleanVal);
        } else {
            if (badgeEl) badgeEl.textContent = 'Đang tìm...';
            listEl.innerHTML = `
                <div class="sidebar-dropdown-skeleton">
                    <div class="sidebar-skeleton-thumb"></div>
                    <div class="sidebar-skeleton-info">
                        <div class="sidebar-skeleton-line" style="width: 70%;"></div>
                        <div class="sidebar-skeleton-line" style="width: 45%;"></div>
                    </div>
                </div>
                <div class="sidebar-dropdown-skeleton">
                    <div class="sidebar-skeleton-thumb"></div>
                    <div class="sidebar-skeleton-info">
                        <div class="sidebar-skeleton-line" style="width: 85%;"></div>
                        <div class="sidebar-skeleton-line" style="width: 50%;"></div>
                    </div>
                </div>
            `;
        }

        // ⚡ BƯỚC 2: TRUY VẤN MỞ RỘNG SERVER (Debounce 60ms)
        const normKey = removeVietnameseTones(cleanVal);
        if (sidebarSuggestCache.has(normKey)) {
            const cachedItems = sidebarSuggestCache.get(normKey);
            renderSidebarSuggestResults(cachedItems, cleanVal);
            return;
        }

        clearTimeout(sidebarSuggestTimer);
        sidebarSuggestTimer = setTimeout(async () => {
            if (sidebarAbortController) {
                try { sidebarAbortController.abort(); } catch (e) {}
            }
            sidebarAbortController = new AbortController();

            try {
                const res = await fetch(`/api/reels/instant-suggest?q=${encodeURIComponent(cleanVal)}`, {
                    signal: sidebarAbortController.signal
                });
                const data = await res.json();

                if (data.success && Array.isArray(data.items)) {
                    // Gộp instant matches với remote items
                    const merged = [...instantMatches];
                    const seen = new Set(merged.map(m => m.slug || m.name));
                    for (const remoteItem of data.items) {
                        const key = remoteItem.slug || remoteItem.name;
                        if (!seen.has(key)) {
                            seen.add(key);
                            merged.push(remoteItem);
                        }
                    }

                    sidebarSuggestCache.set(normKey, merged);
                    const currentInputVal = (document.getElementById('sidebar-direct-search-input')?.value || '').trim();
                    if (removeVietnameseTones(currentInputVal) === normKey) {
                        requestAnimationFrame(() => {
                            renderSidebarSuggestResults(merged, cleanVal);
                        });
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }, 60);
    };

    function renderSidebarSuggestResults(items, query) {
        const listEl = document.getElementById('sidebar-dropdown-list');
        const footerEl = document.getElementById('sidebar-dropdown-footer');
        const badgeEl = document.getElementById('sidebar-dropdown-badge');
        const queryTextEl = document.getElementById('sidebar-dropdown-query');

        if (!listEl) return;
        if (queryTextEl) queryTextEl.textContent = query;

        if (!items || items.length === 0) {
            listEl.innerHTML = `
                <div class="sidebar-dropdown-empty">
                    <div class="text-xl mb-1">🎬</div>
                    <div>Không tìm thấy phim cho "<b>${escapeHtml(query)}</b>"</div>
                    <div class="text-[11px] text-gray-500 mt-1">Nhấn <b>Enter</b> để tìm kiếm</div>
                </div>
            `;
            if (badgeEl) badgeEl.textContent = '0 phim';
            if (footerEl) footerEl.classList.remove('hidden');
            return;
        }

        if (badgeEl) badgeEl.textContent = `${items.length} phim`;
        if (footerEl) footerEl.classList.remove('hidden');

        listEl.innerHTML = items.map(m => {
            const rawName = m.name || m.title || '';
            const highlightedTitle = highlightMatch(rawName, query);
            const safeOrigin = escapeHtml(m.origin_name || m.originTitle || '');
            const safeYear = escapeHtml(m.year || '2026');
            const safeQuality = escapeHtml(m.quality || 'FHD');
            const posterUrl = m.poster || '/android-chrome-192x192.png';
            const watchUrl = m.watchUrl || `/xem-phim/${m.slug || 'phim'}/tap-1`;
            const safeNameEsc = escapeHtml(rawName).replace(/'/g, "\\'");

            return `
                <div class="sidebar-dropdown-item" onclick="selectSearchDropdownMovie('${safeNameEsc}')" title="Xem review ${escapeHtml(rawName)}">
                    <div class="sidebar-dropdown-thumb-box">
                        <img class="sidebar-dropdown-thumb" src="${posterUrl}" alt="${escapeHtml(rawName)}" loading="lazy" decoding="async" onerror="this.src='/android-chrome-192x192.png'" />
                        <span class="sidebar-dropdown-badge-quality">${safeQuality}</span>
                    </div>
                    <div class="sidebar-dropdown-info">
                        <div class="sidebar-dropdown-title">${highlightedTitle}</div>
                        <div class="sidebar-dropdown-meta">
                            ${safeYear ? `<span>${safeYear}</span>` : ''}
                            ${safeOrigin ? `<span>• ${safeOrigin}</span>` : ''}
                        </div>
                    </div>
                    <div class="sidebar-dropdown-action-wrap">
                        <button type="button" class="sidebar-mini-watch-btn" title="Phát review ${escapeHtml(rawName)} ngay trên Reels" onclick="selectSearchDropdownMovie('${safeNameEsc}'); event.stopPropagation();">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="width: 9px !important; height: 9px !important; min-width: 9px !important; max-width: 9px !important; flex-shrink: 0;">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span>Phát Reel</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── SPA Instant Switch (Không làm đơ/reload trang) ──────────────────────────
    window.selectSearchDropdownMovie = function (movieName) {
        window.closeSidebarSearchDropdown();
        const input = document.getElementById('sidebar-direct-search-input');
        if (input) input.value = movieName;

        // 1. Kiểm tra xem movie này có sẵn trong feed hiện tại không
        const domReels = getLoadedReelsInDom();
        const normTarget = removeVietnameseTones(movieName);
        const found = domReels.find(r => {
            const rNorm = removeVietnameseTones(r.name);
            return rNorm.includes(normTarget) || normTarget.includes(rNorm);
        });

        if (found) {
            window.scrollToReelIndex(found.index);
            history.pushState(null, '', `/reels?q=${encodeURIComponent(movieName)}`);
            return;
        }

        // 2. Tải động SPA mà không reload trang
        loadMovieSearchFeedSPA(movieName);
    };

    window.handleSidebarDirectSearch = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        window.closeSidebarSearchDropdown();
        const input = document.getElementById('sidebar-direct-search-input');
        if (!input) return;
        const q = input.value.trim();
        if (!q) {
            loadDefaultFeedSPA();
            return;
        }

        loadMovieSearchFeedSPA(q);
    };

    window.clearSidebarSearch = function () {
        window.closeSidebarSearchDropdown();
        const input = document.getElementById('sidebar-direct-search-input');
        if (input) input.value = '';
        const clearBtn = document.getElementById('sidebar-search-clear-btn');
        if (clearBtn) clearBtn.classList.add('hidden');
        loadDefaultFeedSPA();
    };

    window.toggleSidebarSearchClear = function (val) {
        const clearBtn = document.getElementById('sidebar-search-clear-btn');
        if (clearBtn) {
            if (val && val.trim().length > 0) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }
        }
    };

    // ── SPA Tab Switching & Feed Loader (Keeps Fullscreen & Theater Mode 100% Active) ──
    let isTabSwitching = false;
    window.switchReelsTab = async function (tabName, event) {
        if (event) {
            if (event.preventDefault) event.preventDefault();
            if (event.stopPropagation) event.stopPropagation();
        }
        if (!tabName || isTabSwitching) return;

        const normalizedTab = (tabName === 'reel' || tabName === 'for-you') ? 'for-you' : 'review';
        const currentNormalized = (state.currentTab === 'reel' || state.currentTab === 'for-you') ? 'for-you' : 'review';

        // Prevent re-fetching if already on target tab and feed is populated
        if (normalizedTab === currentNormalized && feedContainer && feedContainer.querySelectorAll('.reel-item').length > 0) {
            return;
        }

        isTabSwitching = true;
        state.currentTab = (tabName === 'for-you') ? 'for-you' : tabName;

        // Update active class on top TikTok tabs
        const tabForYou = document.getElementById('tab-for-you');
        const tabReview = document.getElementById('tab-review');
        if (tabForYou && tabReview) {
            if (normalizedTab === 'for-you') {
                tabForYou.classList.add('active');
                tabReview.classList.remove('active');
            } else {
                tabReview.classList.add('active');
                tabForYou.classList.remove('active');
            }
        }

        // Update active class on sidebar nav items
        document.querySelectorAll('.sidebar-nav-item').forEach(el => {
            const href = el.getAttribute('href') || '';
            if (normalizedTab === 'for-you' && (href.includes('tab=reel') || href.includes('tab=for-you'))) {
                el.classList.add('active');
            } else if (normalizedTab === 'review' && href.includes('tab=review')) {
                el.classList.add('active');
            } else if (!href.includes('history') && !href.includes('saved')) {
                el.classList.remove('active');
            }
        });

        // Push URL without page reload (Keeps Fullscreen & Theater mode completely active!)
        const targetUrl = normalizedTab === 'for-you' ? '/reels?tab=for-you' : '/reels?tab=review';
        history.pushState({ tab: state.currentTab }, '', targetUrl);

        showToast(`⚡ Đang chuyển mục: ${normalizedTab === 'for-you' ? 'Dành cho bạn' : 'Review Phim'}...`);

        // Update viewport tab classes for ambient glow
        const switchViewport = document.querySelector('.reels-viewport');
        if (switchViewport) {
            if (normalizedTab === 'for-you') {
                switchViewport.classList.add('is-tab-reel');
                switchViewport.classList.remove('is-tab-review');
            } else {
                switchViewport.classList.add('is-tab-review');
                switchViewport.classList.remove('is-tab-reel');
            }
        }

        // 🔄 Reset seen-set so infinite scroll works correctly for the new tab
        state.seenYtSet = new Set();
        state.currentPage = 1;
        state.hasMore = true;

        try {
            const activeApiTab = normalizedTab === 'for-you' ? 'reel' : 'review';
            const res = await fetch(`/api/reels/feed?tab=${activeApiTab}&page=1&limit=15`);
            const data = await res.json();
            if (data && Array.isArray(data.items) && data.items.length > 0) {
                renderNewFeedBatch(data.items);
                // Track seen IDs for this new tab batch
                data.items.forEach(item => { if (item.yt) state.seenYtSet.add(item.yt); });
            } else {
                showToast('Không có thêm video cho mục này', 'info');
            }
        } catch (err) {
            console.error('[Reels SPA Tab] Error loading tab:', err);
        } finally {
            isTabSwitching = false;
        }
    };

    function initSpaNavigation() {
        // Intercept sidebar nav items for reels & review
        document.querySelectorAll('.sidebar-nav-item').forEach(el => {
            const href = el.getAttribute('href') || '';
            if (href.includes('/reels?tab=reel') || href.includes('/reels?tab=for-you')) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.switchReelsTab('for-you', e);
                });
            } else if (href.includes('/reels?tab=review')) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.switchReelsTab('review', e);
                });
            }
        });

        // Helper: bind SPA load on any sidebar link that points to /reels?genre= or /reels?q=
        function bindReelsLinkSPA(selector, activeGroupSelector) {
            document.querySelectorAll(selector).forEach(el => {
                const href = el.getAttribute('href') || '';
                if (!href.startsWith('/reels?')) return;
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    const urlParams = new URLSearchParams(href.split('?')[1]);
                    const genre = urlParams.get('genre');
                    const q = urlParams.get('q');
                    const targetQuery = genre || q;
                    if (targetQuery) {
                        // Mark active state within the same group
                        if (activeGroupSelector) {
                            document.querySelectorAll(activeGroupSelector).forEach(btn => btn.classList.remove('active'));
                        }
                        el.classList.add('active');
                        loadMovieSearchFeedSPA(targetQuery);
                    }
                });
            });
        }

        // Intercept genre tags (THỂ LOẠI HOT)
        bindReelsLinkSPA('.sidebar-tag-item', '.sidebar-tag-item');

        // Intercept country pills (QUỐC GIA)  
        bindReelsLinkSPA('.sidebar-country-pill', '.sidebar-country-pill');

        // Intercept explore items (KHÁM PHÁ: Phim Mới, Phim Bộ, Phim Lẻ, Lịch Chiếu, Hoạt Hình, ...)
        bindReelsLinkSPA('.sidebar-explore-item', '.sidebar-explore-item');

        // Popstate handler for browser back/forward
        window.addEventListener('popstate', (e) => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            const q = params.get('q') || params.get('genre');
            if (q) {
                loadMovieSearchFeedSPA(q);
            } else if (tab) {
                window.switchReelsTab(tab);
            } else {
                window.switchReelsTab('review');
            }
        });
    }

    // ── SPA Feed Loader (Tải và thay thế Feed ngay tức thì không cần F5) ─────────
    async function loadMovieSearchFeedSPA(keyword) {
        if (!feedContainer) return;
        showToast(`🔍 Đang mở review: ${keyword}...`);

        // Luôn giữ và cập nhật UI sang tab Review Phim chuẩn chất lượng
        state.currentTab = 'review';
        const tabForYou = document.getElementById('tab-for-you');
        const tabReview = document.getElementById('tab-review');
        if (tabForYou && tabReview) {
            tabReview.classList.add('active');
            tabForYou.classList.remove('active');
        }
        const switchViewport = document.querySelector('.reels-viewport');
        if (switchViewport) {
            switchViewport.classList.add('is-tab-review');
            switchViewport.classList.remove('is-tab-reel');
        }

        try {
            const res = await fetch(`/api/reels/search?q=${encodeURIComponent(keyword)}&tab=review`);
            const data = await res.json();

            if (data.success && Array.isArray(data.items) && data.items.length > 0) {
                renderNewFeedBatch(data.items);
                history.pushState({ tab: 'review' }, '', `/reels?q=${encodeURIComponent(keyword)}&tab=review`);
            } else {
                showToast(`Không tìm thấy review cho "${keyword}"`);
            }
        } catch (e) {
            window.location.href = `/reels?q=${encodeURIComponent(keyword)}&tab=review`;
        }
    }

    async function loadDefaultFeedSPA() {
        if (!feedContainer) return;
        try {
            const targetTab = (state.currentTab === 'reel' || state.currentTab === 'for-you') ? 'reel' : 'review';
            const res = await fetch(`/api/reels/feed?tab=${targetTab}&page=1&limit=15`);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                renderNewFeedBatch(data.items);
                history.pushState(null, '', `/reels${targetTab === 'reel' ? '?tab=reel' : ''}`);
            }
        } catch (e) {}
    }

    function renderNewFeedBatch(items) {
        if (!feedContainer || !items || items.length === 0) return;

        feedContainer.innerHTML = items.map((item, index) => {
            const movieTitle = escapeHtml(item.movieTitle || item.title || 'Phim Hot');
            const poster = item.poster || `https://i.ytimg.com/vi/${item.yt}/hqdefault.jpg`;
            const rating = item.rating10 || item.rating || '9.6';
            const categories = Array.isArray(item.categories) ? item.categories.join(', ') : (item.categories || 'Review');
            const author = escapeHtml(item.author || 'APhim Review');
            const likes = item.likes || '42.5K';
            const comments = item.comments || '188';
            const shares = item.shares || '3.4K';
            const desc = escapeHtml(item.description || item.title || '');
            const watchUrl = item.watchUrl || `/xem-phim/${item.slug || 'phim'}/tap-1`;

            return `
                <div class="reel-item" 
                     id="reel-item-${index}"
                     data-index="${index}"
                     data-id="${item.id}"
                     data-yt="${item.yt}"
                     data-slug="${item.slug || ''}"
                     data-title="${movieTitle}"
                     data-movie-title="${movieTitle}"
                     data-poster="${poster}"
                     data-backdrop="${poster}"
                     data-quality="${item.quality || 'Full HD'}"
                     data-year="${item.year || '2026'}"
                     data-rating="${rating}"
                     data-categories="${categories}"
                     data-author="${author}"
                     data-likes="${likes}"
                     data-comments="${comments}"
                     data-shares="${shares}"
                     data-watch-url="${watchUrl}"
                     data-aspect="${item.aspect || ((state.currentTab === 'reel' || state.currentTab === 'for-you') ? '9:16' : '16:9')}"
                     data-description="${desc}">

                    <!-- Media Layer Poster Placeholder (Fades out when playing) -->
                    <div class="reel-thumb-cover" id="thumb-${index}" style="background-image: url('${poster}');"></div>
                    <div class="reel-gradient-overlay"></div>

                    <!-- Gesture Tap Overlay -->
                    <div class="reel-gesture-overlay" onclick="handleReelGestureTap(event, '${index}')">
                        <div class="reel-heart-burst" id="heart-burst-${index}">
                            <svg class="w-24 h-24" style="fill: #ff2b54 !important; color: #ff2b54 !important;" fill="#ff2b54" viewBox="0 0 24 24"><path fill="#ff2b54" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </div>
                        <div class="reel-play-indicator hidden" id="play-indicator-${index}">
                            <svg class="w-8 h-8 text-white fill-white ml-1" viewBox="0 0 24 24"><path fill="#ffffff" d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>

                    <!-- Right Action Dock (TikTok / Reels Style - Pure White Crisp) -->
                    <div class="reels-actions-bar">
                        <a href="${watchUrl}" class="reel-action-btn reel-avatar-btn group" title="Xem phim ${movieTitle} ngay">
                            <div class="reel-avatar-disc">
                                <img src="${poster}" alt="${movieTitle}" data-yt="${item.yt}" onerror="if(!this.dataset.triedYt && this.dataset.yt){ this.dataset.triedYt='1'; this.src='https://i.ytimg.com/vi/' + this.dataset.yt + '/hqdefault.jpg'; } else { this.src='/android-chrome-192x192.png'; }" />
                            </div>
                            <div class="reel-avatar-plus-badge" title="Xem phim ${movieTitle} ngay">
                                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                                </svg>
                            </div>
                        </a>
                        <button class="reel-action-btn btn-like" id="btn-like-${index}" onclick="toggleLikeReel('${item.id}', '${index}')" title="Thích video này">
                            <div class="action-circle-icon">
                                <svg class="w-7 h-7 like-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </div>
                            <span class="action-label like-count">${likes}</span>
                        </button>
                        <button class="reel-action-btn btn-comment" onclick="openReelsCommentsDrawer('${item.id}', '${movieTitle}')" title="Xem và gửi bình luận">
                            <div class="action-circle-icon">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                            </div>
                            <span class="action-label">${comments}</span>
                        </button>
                        <button class="reel-action-btn btn-bookmark" onclick="toggleBookmarkReel('${item.id}', '${index}')" title="Lưu lại xem sau">
                            <div class="action-circle-icon">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                            </div>
                            <span class="action-label">Lưu</span>
                        </button>
                        <button class="reel-action-btn btn-share" onclick="shareCurrentReel('${item.slug}', '${movieTitle}')" title="Chia sẻ video">
                            <div class="action-circle-icon">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                            </div>
                            <span class="action-label">${shares}</span>
                        </button>
                        <button class="reel-action-btn btn-speed" onclick="cyclePlaybackSpeed()" title="Đổi tốc độ phát">
                            <div class="action-circle-icon">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <span class="action-label speed-label-text">${state.playbackSpeed || 1.0}x</span>
                        </button>
                    </div>

                    <!-- 🎬 BOTTOM FLOATING TRANSLUCENT GLASS MOVIE CARD -->
                    <div class="reel-bottom-info">
                        <a href="/phim/${item.slug}" class="reel-movie-glass-card" title="Xem chi tiết ${movieTitle}">
                            <div class="reel-card-thumb-wrap">
                                <img src="${poster}" alt="${movieTitle}" class="reel-card-thumb" data-yt="${item.yt}" onerror="if(!this.dataset.triedYt && this.dataset.yt){ this.dataset.triedYt='1'; this.src='https://i.ytimg.com/vi/' + this.dataset.yt + '/hqdefault.jpg'; } else { this.src='/android-chrome-192x192.png'; }" />
                            </div>
                            <div class="reel-card-details">
                                <div class="reel-card-row-top">
                                    <div class="reel-card-titles-wrap">
                                        <span class="reel-card-name">${movieTitle}</span>
                                        <span class="reel-card-year">(${item.year || '2026'})</span>
                                        <div class="reel-card-rating-badge">
                                            <svg class="rating-star-icon" viewBox="0 0 24 24" width="12" height="12" fill="#f59e0b"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                            <span>${rating || '5.0'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="reel-card-origin">${escapeHtml(item.originTitle || item.movieTitleVn || '')}</div>
                            </div>
                        </a>
                        <div class="reel-caption-text">
                            <b class="text-amber-300 font-bold">@${author}:</b> ${desc}
                        </div>
                    </div>

                    <!-- Scrubber Progress Bar with interactive Drag Thumb -->
                    <div class="reel-controls-bar">
                        <span class="reel-current-time" id="time-current-${index}">00:00</span>
                        <div class="reel-progress-track" id="progress-track-${index}" data-index="${index}" onclick="seekReelProgress(event, '${index}')">
                            <div class="reel-hover-time" id="hover-time-${index}">00:00</div>
                            <div class="reel-progress-buffer" id="progress-buffer-${index}"></div>
                            <div class="reel-progress-fill" id="progress-fill-${index}">
                                <div class="reel-progress-thumb"></div>
                            </div>
                        </div>
                        <span class="reel-duration" id="time-duration-${index}">${item.duration || '03:45'}</span>
                    </div>
                </div>
            `;
        }).join('');

        state.currentIndex = 0;
        state.currentPage = 1;
        state.hasMore = true;
        state.videoStartedPlaying = false;
        state.userPaused = false;
        state.isPlaying = false;
        state.activeDuration = 0;
        state.slideDurations = {};
        clearTimeout(state.stallWatchdogTimer);
        clearTimeout(state.revealFallbackTimer);
        feedContainer.scrollTop = 0;

        // Disconnect & re-connect observer so new items are observed fresh
        if (observer) { observer.disconnect(); }
        observeAllReelItems();

        // 🚀 Seamless Dual Players: Reuse existing iframes without innerHTML wipe
        const firstItem = feedContainer.querySelector('.reel-item[data-index="0"]');
        if (firstItem) {
            const firstYt = firstItem.getAttribute('data-yt');
            const secondItem = feedContainer.querySelector('.reel-item[data-index="1"]');
            const secondYt = secondItem ? secondItem.getAttribute('data-yt') : null;

            const hostA = document.getElementById('reels-player-host-a');
            const hostB = document.getElementById('reels-player-host-b');

            if (hostA && firstYt) {
                state.activeHostKey = 'a';
                hostA.classList.add('active');
                if (hostB) hostB.classList.remove('active');

                let ifrA = state.players.a.fr || hostA.querySelector('iframe');
                if (ifrA) {
                    state.players.a.ready = true;
                    state.players.a.ytId = firstYt;
                    state.players.a.fr = ifrA;
                    sendCmd(ifrA, 'loadVideoById', [firstYt, 0]);
                    sendCmd(ifrA, 'setPlaybackRate', [state.playbackSpeed]);
                    sendCmd(ifrA, 'playVideo');
                    if (!state.isMuted && state.userInteracted) {
                        sendCmd(ifrA, 'unMute');
                        sendCmd(ifrA, 'setVolume', [state.volume]);
                    }
                } else {
                    hostA.innerHTML = '';
                    ifrA = createReelIframe(firstYt, true, state.isMuted);
                    ifrA.addEventListener('load', () => {
                        try { ifrA.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*'); } catch (e) {}
                        state.players.a.ready = true;
                        state.players.a.ytId = firstYt;
                        sendCmd(ifrA, 'setPlaybackRate', [state.playbackSpeed]);
                        sendCmd(ifrA, 'playVideo');
                        if (!state.isMuted && state.userInteracted) {
                            sendCmd(ifrA, 'unMute');
                            sendCmd(ifrA, 'setVolume', [state.volume]);
                        }
                    });
                    hostA.appendChild(ifrA);
                    state.players.a.fr = ifrA;
                    state.players.a.ytId = firstYt;
                }
            }

            if (hostB && secondYt) {
                let ifrB = state.players.b.fr || hostB.querySelector('iframe');
                if (ifrB) {
                    state.players.b.ready = true;
                    state.players.b.ytId = secondYt;
                    state.players.b.fr = ifrB;
                    sendCmd(ifrB, 'loadVideoById', [secondYt, 0]);
                    sendCmd(ifrB, 'mute');
                } else {
                    hostB.innerHTML = '';
                    ifrB = createReelIframe(secondYt, true, true);
                    ifrB.addEventListener('load', () => {
                        try { ifrB.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*'); } catch (e) {}
                        state.players.b.ready = true;
                        state.players.b.ytId = secondYt;
                        sendCmd(ifrB, 'mute');
                    });
                    hostB.appendChild(ifrB);
                    state.players.b.fr = ifrB;
                    state.players.b.ytId = secondYt;
                    state.players.b.ready = true;
                }
            }

            updateDesktopInfoPanel(firstItem);

            const backdropUrl = firstItem.getAttribute('data-backdrop') || firstItem.getAttribute('data-poster');
            const ambientEl = document.getElementById('reels-ambient-backdrop');
            if (ambientEl && backdropUrl) {
                ambientEl.style.backgroundImage = `url('${backdropUrl}')`;
            }

            state.videoStartedPlaying = false;
            clearTimeout(state.revealFallbackTimer);
            state.revealFallbackTimer = setTimeout(() => {
                if (state.currentIndex === 0 && !state.videoStartedPlaying) {
                    revealPlayingVideo(0);
                }
            }, 180);
        }

        // 🌟 Đồng bộ danh sách "Review Tương Tự" ở thanh bên phải
        const relatedListEl = document.getElementById('panel-related-list');
        if (relatedListEl && items.length > 1) {
            relatedListEl.innerHTML = items.slice(1, 6).map((rel, rIdx) => {
                const rTitle = escapeHtml(rel.movieTitle || rel.title || '');
                const rPoster = rel.poster || `https://i.ytimg.com/vi/${rel.yt}/hqdefault.jpg`;
                const rAuthor = escapeHtml(rel.author || 'APhim Review');
                const rLikes = rel.likes || '42.2K';
                return `
                    <div class="info-related-item" onclick="scrollToReelIndex(${rIdx + 1})">
                        <div class="info-related-thumb-wrap">
                            <img src="${rPoster}" alt="${rTitle}" class="info-related-thumb" onerror="this.src='/android-chrome-192x192.png'" />
                            <span class="info-thumb-hd-badge">HD</span>
                        </div>
                        <div class="info-related-text">
                            <div class="info-related-title" title="${rTitle}">${rTitle}</div>
                            <div class="info-related-meta">
                                <span class="info-related-author" title="@${rAuthor}">@${rAuthor}</span>
                                <span class="info-related-dot">•</span>
                                <span class="info-related-stat">
                                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    <span>${rLikes}</span>
                                </span>
                            </div>
                        </div>
                        <div class="info-related-play-icon" title="Xem review">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fcd576" style="width: 12px !important; height: 12px !important; min-width: 12px; max-width: 12px; flex-shrink: 0;"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // ── 📜 Watch History Engine (LocalStorage Powered) ──────────────────────
    let lastHistorySaveTime = 0;

    function recordWatchHistory(index, currentSec, durationSec) {
        if (!currentSec || currentSec < 2) return;
        const now = Date.now();
        if (now - lastHistorySaveTime < 3000) return;
        lastHistorySaveTime = now;

        const curItem = document.getElementById(`reel-item-${index}`);
        if (!curItem) return;

        const id = curItem.getAttribute('data-id') || `reel-${index}`;
        const slug = curItem.getAttribute('data-slug') || '';
        const movieTitle = curItem.getAttribute('data-movie-title') || curItem.getAttribute('data-title') || 'Phim Hot';
        const author = curItem.getAttribute('data-author') || 'APhim Review';
        const poster = curItem.getAttribute('data-poster') || '/android-chrome-192x192.png';
        const watchUrl = curItem.getAttribute('data-watch-url') || `/phim/${slug}`;
        const yt = curItem.getAttribute('data-yt') || '';

        const dur = durationSec || 225;
        const pct = Math.min(100, Math.max(1, Math.round((currentSec / dur) * 100)));
        const curM = Math.floor(currentSec / 60);
        const curS = Math.floor(currentSec % 60);
        const durM = Math.floor(dur / 60);
        const durS = Math.floor(dur % 60);
        const timeFormatted = `${curM.toString().padStart(2, '0')}:${curS.toString().padStart(2, '0')} / ${durM.toString().padStart(2, '0')}:${durS.toString().padStart(2, '0')}`;

        try {
            let history = JSON.parse(localStorage.getItem('aphim_reels_history') || '[]');
            history = history.filter((item) => item.slug !== slug && item.id !== id);
            history.unshift({
                id,
                slug,
                movieTitle,
                author,
                poster,
                watchUrl,
                yt,
                currentTime: Math.round(currentSec),
                duration: Math.round(dur),
                progressPct: pct,
                timeFormatted,
                updatedAt: now
            });
            if (history.length > 50) history = history.slice(0, 50);
            localStorage.setItem('aphim_reels_history', JSON.stringify(history));
            // Refresh sidebar mini card to show latest watched
            initSidebarHistoryPreview();
        } catch (e) {}
    }

    window.openReelsHistoryModal = function () {
        const modal = document.getElementById('reels-history-modal');
        const container = document.getElementById('history-list-container');
        const countBadge = document.getElementById('history-count-badge');
        if (!modal || !container) return;

        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('aphim_reels_history') || '[]');
        } catch (e) {
            history = [];
        }

        if (countBadge) countBadge.textContent = `${history.length} video`;

        if (history.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-center text-gray-400 space-y-3">
                    <svg class="w-12 h-12 text-gray-600 mb-1" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9"/>
                        <polyline points="12 7 12 12 15 15"/>
                    </svg>
                    <p class="text-sm font-semibold text-gray-300">Chưa có lịch sử xem video</p>
                    <p class="text-xs text-gray-500 max-w-xs">Các video Reels và Review phim bạn đã xem sẽ tự động lưu lại ở đây để bạn dễ dàng xem tiếp.</p>
                </div>
            `;
        } else {
            container.innerHTML = history.map((item) => `
                <div class="history-item-card" onclick="window.playFromHistory('${escapeHtml(item.slug || '')}', '${escapeHtml(item.movieTitle || '')}', ${item.currentTime || 0})">
                    <div class="history-thumb-wrap">
                        <img src="${item.poster}" class="history-thumb-img" onerror="this.src='/android-chrome-192x192.png';" />
                        <div class="history-progress-overlay">
                            <div class="history-progress-bar-fill" style="width: ${item.progressPct || 0}%;"></div>
                        </div>
                    </div>
                    <div class="history-item-info">
                        <div class="history-item-title">${escapeHtml(item.movieTitle)}</div>
                        <div class="history-item-meta">@${escapeHtml(item.author)} • ${item.timeFormatted || ''}</div>
                        <div class="history-item-status">
                            <span>Đã xem ${item.progressPct || 0}%</span>
                        </div>
                    </div>
                    <button type="button" class="history-resume-btn" title="Xem tiếp">
                        <svg class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                </div>
            `).join('');
        }

        modal.classList.add('active');
    };

    window.closeReelsHistoryModal = function () {
        const modal = document.getElementById('reels-history-modal');
        if (modal) modal.classList.remove('active');
    };

    window.handleHistoryBackdropClick = function (e) {
        if (e.target.id === 'reels-history-modal') {
            window.closeReelsHistoryModal();
        }
    };

    window.clearReelsWatchHistory = function () {
        localStorage.removeItem('aphim_reels_history');
        window.openReelsHistoryModal();
        showToast('🗑️ Đã xóa toàn bộ lịch sử xem');
    };

    window.playFromHistory = function (slug, title, seekSec) {
        window.closeReelsHistoryModal();
        let matchedIndex = -1;
        document.querySelectorAll('.reel-item').forEach((el, idx) => {
            if (el.getAttribute('data-slug') === slug || (title && el.getAttribute('data-movie-title') === title)) {
                matchedIndex = idx;
            }
        });

        if (matchedIndex >= 0) {
            window.scrollToReelIndex(matchedIndex);
            setTimeout(() => {
                const activeIframe = getActiveIframe();
                if (activeIframe && seekSec > 0) {
                    sendCmd(activeIframe, 'seekTo', [seekSec, true]);
                }
            }, 300);
        } else if (title) {
            window.filterReelsByQuery(title);
        } else if (slug) {
            window.location.href = `/phim/${slug}`;
        }
    };

    // Close dropdown on outside click or ESC
    document.addEventListener('pointerdown', (e) => {
        const searchWrap = document.querySelector('.sidebar-top-search-wrap');
        if (searchWrap && !searchWrap.contains(e.target)) {
            window.closeSidebarSearchDropdown();
        }
    });

    // 🔙 Smart Multi-Tier Back Navigation (Seamlessly returns to previous Watch Page or Category)
    function handleReelsBackNavigation(e) {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }

        try {
            if (window.TouchSpeed && typeof window.TouchSpeed.showProgress === 'function') {
                window.TouchSpeed.showProgress();
            }
        } catch (err) {}

        // 1. Kiểm tra tham số URL (?return=... hoặc ?from=... hoặc ?back=...)
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('return') || urlParams.get('from') || urlParams.get('back');
            if (returnUrl) {
                const decoded = decodeURIComponent(returnUrl);
                if (decoded.startsWith('/') && !decoded.startsWith('//')) {
                    window.location.href = decoded;
                    return;
                }
            }
        } catch (err) {}

        // 2. Kiểm tra sessionStorage được lưu khi click từ trang xem phim
        try {
            const storedReferrer = sessionStorage.getItem('aphim_reels_referrer');
            if (storedReferrer) {
                sessionStorage.removeItem('aphim_reels_referrer');
                if (storedReferrer.startsWith('/') && !storedReferrer.startsWith('//')) {
                    window.location.href = storedReferrer;
                    return;
                }
            }
        } catch (err) {}

        // 3. Kiểm tra document.referrer từ cùng domain (loại trừ chính trang /reels)
        try {
            if (document.referrer) {
                const refUrl = new URL(document.referrer);
                if (refUrl.origin === window.location.origin && !refUrl.pathname.startsWith('/reels')) {
                    window.location.href = document.referrer;
                    return;
                }
            }
        } catch (err) {}

        // 4. Nếu có history stack trước đó thì dùng history.back()
        if (window.history.length > 1 && document.referrer && !document.referrer.includes('/reels')) {
            window.history.back();
            return;
        }

        // 5. Fallback về trang chủ
        window.location.href = '/';
    }
    window.handleReelsBackNavigation = handleReelsBackNavigation;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeSidebarSearchDropdown();
            window.closeReelsHistoryModal();
        }
    });

})();
