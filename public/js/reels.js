/**
 * public/js/reels.js
 * 🎬 APhim Super Reels & Review Client-side Controller
 * High-Performance Dual Player YouTube Iframe Engine with Touch Gestures,
 * Infinite Scroll, Comments Drawer, Search Spotlight & Instant Watch CTA.
 */

(function () {
    'use strict';

    // ── Application State ────────────────────────────────────────────────────────
    const state = {
        currentIndex: 0,
        currentTab: new URLSearchParams(window.location.search).get('tab') || 'review',
        currentPage: 1,
        isLoadingMore: false,
        hasMore: true,
        isMuted: true,
        playbackSpeed: 1.0,
        availableSpeeds: [1.0, 1.25, 1.5, 2.0],
        speedIndex: 0,
        lastTapTime: 0,
        tapTimeout: null,
        playerA: null,
        playerB: null,
        activeHost: 'a', // 'a' or 'b'
        isYTApiReady: false,
        progressInterval: null,
        likedReels: new Set(JSON.parse(localStorage.getItem('aphim_reels_liked') || '[]')),
        savedReels: new Set(JSON.parse(localStorage.getItem('aphim_reels_saved') || '[]'))
    };

    // ── DOM References ──────────────────────────────────────────────────────────
    let feedContainer = null;
    let observer = null;
    let desktopInfoPanel = null;

    // ── YouTube Iframe API Initialization ───────────────────────────────────────
    window.onYouTubeIframeAPIReady = function () {
        state.isYTApiReady = true;
        initDualPlayers();
    };

    function initDualPlayers() {
        const hostA = document.getElementById('reels-player-host-a');
        const hostB = document.getElementById('reels-player-host-b');

        if (!hostA || !hostB) return;

        state.playerA = new YT.Player('reels-player-host-a', {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                playsinline: 1,
                enablejsapi: 1,
                origin: window.location.origin
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange
            }
        });

        state.playerB = new YT.Player('reels-player-host-b', {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                playsinline: 1,
                enablejsapi: 1,
                origin: window.location.origin
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange
            }
        });
    }

    function onPlayerReady(event) {
        // Player ready - if this is the first item, load video
        if (state.currentIndex === 0) {
            playReelAtIndex(0);
        }
    }

    function onPlayerStateChange(event) {
        const currentItem = document.getElementById(`reel-item-${state.currentIndex}`);
        if (!currentItem) return;

        const cover = currentItem.querySelector('.reel-thumb-cover');

        // YT.PlayerState.PLAYING = 1
        if (event.data === YT.PlayerState.PLAYING) {
            if (cover) cover.classList.add('hidden');
            startScrubberTracking();
        } 
        // YT.PlayerState.ENDED = 0
        else if (event.data === YT.PlayerState.ENDED) {
            // Tự động cuộn sang video tiếp theo hoặc lặp lại
            const nextIdx = state.currentIndex + 1;
            const nextItem = document.getElementById(`reel-item-${nextIdx}`);
            if (nextItem) {
                scrollToReelIndex(nextIdx);
            } else {
                // Loop video hiện tại
                const activePlayer = state.activeHost === 'a' ? state.playerA : state.playerB;
                if (activePlayer && activePlayer.seekTo) {
                    activePlayer.seekTo(0);
                    activePlayer.playVideo();
                }
            }
        } else if (event.data === YT.PlayerState.PAUSED) {
            stopScrubberTracking();
        }
    }

    // ── Main Controller Setup ───────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        feedContainer = document.getElementById('reels-feed-container');
        desktopInfoPanel = document.getElementById('reels-desktop-info-panel');

        initIntersectionObserver();
        setupKeyboardControls();
        restoreLikedStates();
        updateMuteButtonUI();

        // Check if YouTube API was already loaded before DOMContentLoaded
        if (window.YT && window.YT.Player && !state.playerA) {
            initDualPlayers();
        }

        // Re-run Lucide Icons for clean vector rendering
        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

    // ── Intersection Observer (Scroll-Snap Detector) ────────────────────────────
    function initIntersectionObserver() {
        const options = {
            root: feedContainer,
            rootMargin: '0px',
            threshold: 0.65
        };

        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const newIndex = parseInt(entry.target.getAttribute('data-index'), 10);
                    if (newIndex !== state.currentIndex) {
                        state.currentIndex = newIndex;
                        playReelAtIndex(newIndex);
                        updateDesktopInfoPanel(entry.target);
                    }

                    // Check for infinite loading near the end
                    const allItems = feedContainer.querySelectorAll('.reel-item');
                    if (newIndex >= allItems.length - 3 && !state.isLoadingMore && state.hasMore) {
                        loadMoreReels();
                    }
                }
            });
        }, options);

        // Observe initial items
        observeAllReelItems();
    }

    function observeAllReelItems() {
        if (!feedContainer || !observer) return;
        const items = feedContainer.querySelectorAll('.reel-item');
        items.forEach((item) => observer.observe(item));
    }

    // ── Seamless Playback Controller ────────────────────────────────────────────
    function playReelAtIndex(index) {
        const item = document.getElementById(`reel-item-${index}`);
        if (!item) return;

        const ytId = item.getAttribute('data-yt');
        if (!ytId) return;

        const mediaWrapper = item.querySelector('.reel-media-wrapper');
        const hostA = document.getElementById('reels-player-host-a');
        const hostB = document.getElementById('reels-player-host-b');

        if (!mediaWrapper || !hostA || !hostB) return;

        // Toggle Active Host A/B to eliminate lag
        const targetHost = state.activeHost === 'a' ? hostA : hostB;
        const targetPlayer = state.activeHost === 'a' ? state.playerA : state.playerB;
        const otherPlayer = state.activeHost === 'a' ? state.playerB : state.playerA;

        // Pause the inactive player
        if (otherPlayer && otherPlayer.pauseVideo) {
            try { otherPlayer.pauseVideo(); } catch (e) {}
        }

        // Move target player iframe inside active slide
        mediaWrapper.appendChild(targetHost);
        targetHost.classList.add('active');

        if (targetPlayer && targetPlayer.loadVideoById) {
            try {
                targetPlayer.loadVideoById({
                    videoId: ytId,
                    startSeconds: 0,
                    suggestedQuality: 'hd720'
                });

                if (state.isMuted) {
                    targetPlayer.mute();
                } else {
                    targetPlayer.unMute();
                }

                targetPlayer.setPlaybackRate(state.playbackSpeed);
                targetPlayer.playVideo();
            } catch (err) {
                console.warn('⚠️ [Player Playback Warning]:', err.message);
            }
        }

        // Reset scrubber fill
        const progressFill = document.getElementById(`progress-fill-${index}`);
        if (progressFill) progressFill.style.width = '0%';
    }

    // ── Desktop Right Panel Updater ─────────────────────────────────────────────
    function updateDesktopInfoPanel(itemElement) {
        if (!itemElement) return;

        const movieTitle = itemElement.getAttribute('data-movie-title') || '';
        const title = itemElement.getAttribute('data-title') || '';
        const poster = itemElement.getAttribute('data-poster') || itemElement.getAttribute('data-backdrop') || '';
        const quality = itemElement.getAttribute('data-quality') || 'Full HD';
        const year = itemElement.getAttribute('data-year') || '2024';
        const rating = itemElement.getAttribute('data-rating') || '9.5';
        const categories = itemElement.getAttribute('data-categories') || 'Hành Động, Kịch Tính';
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

        if (heroImg && poster) heroImg.src = poster;
        if (pTitle) pTitle.textContent = movieTitle;
        if (pSub) pSub.textContent = title;
        if (pQuality) pQuality.textContent = quality;
        if (pYear) pYear.textContent = year;
        if (pRating) pRating.textContent = `${rating} / 10`;
        if (pCategories) pCategories.textContent = categories;
        if (pDesc) pDesc.textContent = desc;
        if (pWatchBtn) pWatchBtn.href = watchUrl;
    }

    // ── Infinite Scroll Dynamic Feed Loader ─────────────────────────────────────
    async function loadMoreReels() {
        if (state.isLoadingMore || !state.hasMore) return;
        state.isLoadingMore = true;
        state.currentPage += 1;

        try {
            const res = await fetch(`/api/reels/feed?tab=${state.currentTab}&page=${state.currentPage}&limit=10`);
            const data = await res.json();

            if (data.success && data.items && data.items.length > 0) {
                const currentCount = feedContainer.querySelectorAll('.reel-item').length;
                appendReelItems(data.items, currentCount);
                state.hasMore = data.hasMore !== false;
            } else {
                state.hasMore = false;
            }
        } catch (err) {
            console.error('❌ [Load More Reels Error]:', err.message);
        } finally {
            state.isLoadingMore = false;
        }
    }

    function appendReelItems(newItems, startIndex) {
        if (!feedContainer || !newItems.length) return;

        const fragment = document.createDocumentFragment();

        newItems.forEach((item, idx) => {
            const index = startIndex + idx;
            const reelDiv = document.createElement('div');
            reelDiv.className = 'reel-item';
            reelDiv.id = `reel-item-${index}`;
            reelDiv.setAttribute('data-index', index);
            reelDiv.setAttribute('data-id', item.id);
            reelDiv.setAttribute('data-yt', item.yt);
            reelDiv.setAttribute('data-slug', item.slug);
            reelDiv.setAttribute('data-title', item.title);
            reelDiv.setAttribute('data-movie-title', item.movieTitle);
            reelDiv.setAttribute('data-poster', item.poster);
            reelDiv.setAttribute('data-backdrop', item.backdrop);
            reelDiv.setAttribute('data-quality', item.quality);
            reelDiv.setAttribute('data-year', item.year);
            reelDiv.setAttribute('data-rating', item.rating);
            reelDiv.setAttribute('data-categories', Array.isArray(item.categories) ? item.categories.join(', ') : item.categories);
            reelDiv.setAttribute('data-author', item.author);
            reelDiv.setAttribute('data-likes', item.likes);
            reelDiv.setAttribute('data-comments', item.comments);
            reelDiv.setAttribute('data-shares', item.shares);
            reelDiv.setAttribute('data-watch-url', item.watchUrl);
            reelDiv.setAttribute('data-description', item.description);

            reelDiv.innerHTML = `
                <div class="reel-media-wrapper">
                    <div class="reel-thumb-cover" style="background-image: url('${item.poster || item.backdrop}');"></div>
                </div>
                <div class="reel-gradient-overlay"></div>
                <div class="reel-gesture-overlay" onclick="handleReelGestureTap(event, '${index}')">
                    <div class="reel-heart-burst" id="heart-burst-${index}">
                        <i data-lucide="heart" class="text-rose-500 fill-rose-500 w-24 h-24"></i>
                    </div>
                    <div class="reel-play-indicator hidden" id="play-indicator-${index}">
                        <i data-lucide="play" class="text-white/80 w-16 h-16 fill-white/60"></i>
                    </div>
                </div>
                <div class="reels-actions-bar">
                    <a href="/phim/${item.slug}" class="reel-action-btn group" title="Xem thông tin ${item.movieTitle}">
                        <div class="w-11 h-11 rounded-full border-2 border-amber-300 p-0.5 overflow-hidden bg-black/60 shadow-lg group-hover:scale-105 transition-transform">
                            <img src="${item.poster || item.backdrop}" alt="${item.movieTitle}" class="w-full h-full rounded-full object-cover" onerror="this.src='/android-chrome-192x192.png';" />
                        </div>
                    </a>
                    <a href="${item.watchUrl}" class="reel-action-btn btn-watch-movie" title="Xem trọn bộ ${item.movieTitle} ngay">
                        <div class="action-circle-icon">
                            <i data-lucide="play" class="w-6 h-6 fill-black text-black ml-0.5"></i>
                        </div>
                        <span class="action-label">XEM PHIM</span>
                    </a>
                    <button class="reel-action-btn btn-like" id="btn-like-${index}" onclick="toggleLikeReel('${item.id}', '${index}')" title="Thích video này">
                        <div class="action-circle-icon">
                            <i data-lucide="heart" class="like-icon w-5 h-5"></i>
                        </div>
                        <span class="action-label like-count">${item.likes}</span>
                    </button>
                    <button class="reel-action-btn btn-comment" onclick="openReelsCommentsDrawer('${item.id}', '${item.movieTitle}')" title="Xem và gửi bình luận">
                        <div class="action-circle-icon">
                            <i data-lucide="message-circle" class="w-5 h-5"></i>
                        </div>
                        <span class="action-label">${item.comments}</span>
                    </button>
                    <button class="reel-action-btn btn-bookmark" onclick="toggleBookmarkReel('${item.id}', '${index}')" title="Lưu lại xem sau">
                        <div class="action-circle-icon">
                            <i data-lucide="bookmark" class="w-5 h-5"></i>
                        </div>
                        <span class="action-label">Lưu</span>
                    </button>
                    <button class="reel-action-btn btn-share" onclick="shareCurrentReel('${item.slug}', '${item.title}')" title="Chia sẻ video">
                        <div class="action-circle-icon">
                            <i data-lucide="share-2" class="w-5 h-5"></i>
                        </div>
                        <span class="action-label">${item.shares}</span>
                    </button>
                    <button class="reel-action-btn btn-speed" onclick="cyclePlaybackSpeed()" title="Đổi tốc độ phát">
                        <div class="action-circle-icon">
                            <i data-lucide="gauge" class="w-5 h-5"></i>
                        </div>
                        <span class="action-label" id="speed-label-${index}">1.0x</span>
                    </button>
                </div>
                <div class="reel-bottom-info">
                    <a href="/phim/${item.slug}" class="reel-movie-card-link">
                        <img src="${item.poster || item.backdrop}" alt="${item.movieTitle}" class="reel-movie-mini-poster" onerror="this.src='/android-chrome-192x192.png';" />
                        <div class="reel-movie-header-info">
                            <div class="reel-movie-title">${item.movieTitle}</div>
                            <div class="reel-movie-meta-sub">
                                <span class="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold text-[10px]">${item.quality}</span>
                                <span>• ${item.year}</span>
                                <span>• ⭐ ${item.rating}</span>
                            </div>
                        </div>
                        <i data-lucide="chevron-right" class="lucide-sm text-gray-400 ml-1"></i>
                    </a>
                    <div class="reel-caption-text">
                        <b class="text-amber-300 font-semibold">@${item.author}:</b> ${item.title} — ${item.description}
                    </div>
                </div>
                <div class="reel-controls-bar">
                    <span class="reel-current-time" id="time-current-${index}">00:00</span>
                    <div class="reel-progress-track" onclick="seekReelProgress(event, '${index}')">
                        <div class="reel-progress-fill" id="progress-fill-${index}"></div>
                    </div>
                    <span class="reel-duration" id="time-duration-${index}">${item.duration || '03:00'}</span>
                </div>
            `;

            fragment.appendChild(reelDiv);
            if (observer) observer.observe(reelDiv);
        });

        feedContainer.appendChild(fragment);

        // Render newly added Lucide vector icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // ── Gesture Handler (Double-Tap Like & Single-Tap Play/Pause) ───────────────
    window.handleReelGestureTap = function (e, index) {
        const now = Date.now();
        const timeDiff = now - state.lastTapTime;

        // Double-Tap Detected (within 300ms)
        if (timeDiff < 300) {
            clearTimeout(state.tapTimeout);
            triggerDoubleTapHeart(index);
            const item = document.getElementById(`reel-item-${index}`);
            if (item) {
                const reelId = item.getAttribute('data-id');
                if (!state.likedReels.has(reelId)) {
                    window.toggleLikeReel(reelId, index);
                }
            }
        } 
        // Single Tap Candidate
        else {
            state.tapTimeout = setTimeout(() => {
                togglePlayPauseActive();
            }, 300);
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

    function togglePlayPauseActive() {
        const player = state.activeHost === 'a' ? state.playerA : state.playerB;
        if (!player || !player.getPlayerState) return;

        const pState = player.getPlayerState();
        const indicator = document.getElementById(`play-indicator-${state.currentIndex}`);

        if (pState === YT.PlayerState.PLAYING) {
            player.pauseVideo();
            if (indicator) indicator.classList.remove('hidden');
        } else {
            player.playVideo();
            if (indicator) indicator.classList.add('hidden');
        }
    }

    // ── Sound & Volume Global Engine ────────────────────────────────────────────
    window.unlockSoundAndPlay = function () {
        state.isMuted = false;
        updateMuteButtonUI();

        // Hide all sound prompts
        document.querySelectorAll('.reels-sound-prompt').forEach((prompt) => {
            prompt.classList.add('hidden');
        });

        const activePlayer = state.activeHost === 'a' ? state.playerA : state.playerB;
        if (activePlayer && activePlayer.unMute) {
            activePlayer.unMute();
            activePlayer.playVideo();
        }

        showToast('🔊 Đã bật âm thanh video!');
    };

    window.toggleMuteGlobal = function () {
        state.isMuted = !state.isMuted;
        updateMuteButtonUI();

        const activePlayer = state.activeHost === 'a' ? state.playerA : state.playerB;
        if (activePlayer) {
            if (state.isMuted) {
                activePlayer.mute();
                showToast('🔇 Đã tắt âm thanh');
            } else {
                activePlayer.unMute();
                showToast('🔊 Đã bật âm thanh');
            }
        }
    };

    function updateMuteButtonUI() {
        const muteIcon = document.getElementById('reels-mute-icon');
        if (!muteIcon) return;

        if (state.isMuted) {
            muteIcon.setAttribute('data-lucide', 'volume-x');
            muteIcon.classList.remove('text-emerald-400');
            muteIcon.classList.add('text-amber-300');
        } else {
            muteIcon.setAttribute('data-lucide', 'volume-2');
            muteIcon.classList.remove('text-amber-300');
            muteIcon.classList.add('text-emerald-400');
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // ── Speed Controls ──────────────────────────────────────────────────────────
    window.cyclePlaybackSpeed = function () {
        state.speedIndex = (state.speedIndex + 1) % state.availableSpeeds.length;
        state.playbackSpeed = state.availableSpeeds[state.speedIndex];

        const activePlayer = state.activeHost === 'a' ? state.playerA : state.playerB;
        if (activePlayer && activePlayer.setPlaybackRate) {
            activePlayer.setPlaybackRate(state.playbackSpeed);
        }

        // Update all speed labels
        const speedText = `${state.playbackSpeed.toFixed(1)}x`;
        document.querySelectorAll('.btn-speed .action-label').forEach((label) => {
            label.textContent = speedText;
        });

        showToast(`⚡ Tốc độ phát: ${speedText}`);
    };

    // ── Scrubber Tracking & Progress Bar ────────────────────────────────────────
    function startScrubberTracking() {
        stopScrubberTracking();
        state.progressInterval = setInterval(() => {
            const player = state.activeHost === 'a' ? state.playerA : state.playerB;
            if (!player || !player.getCurrentTime || !player.getDuration) return;

            const curr = player.getCurrentTime() || 0;
            const dur = player.getDuration() || 1;
            const percent = Math.min(100, (curr / dur) * 100);

            const fill = document.getElementById(`progress-fill-${state.currentIndex}`);
            const timeCurrent = document.getElementById(`time-current-${state.currentIndex}`);

            if (fill) fill.style.width = `${percent}%`;
            if (timeCurrent) timeCurrent.textContent = formatTime(curr);
        }, 300);
    }

    function stopScrubberTracking() {
        if (state.progressInterval) {
            clearInterval(state.progressInterval);
            state.progressInterval = null;
        }
    }

    window.seekReelProgress = function (e, index) {
        const track = e.currentTarget;
        const rect = track.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));

        const player = state.activeHost === 'a' ? state.playerA : state.playerB;
        if (player && player.getDuration && player.seekTo) {
            const dur = player.getDuration();
            const targetSec = dur * percent;
            player.seekTo(targetSec, true);

            const fill = document.getElementById(`progress-fill-${index}`);
            if (fill) fill.style.width = `${percent * 100}%`;
        }
    };

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }

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

        // Send interaction to server
        fetch(`/api/reels/like/${encodeURIComponent(id)}?action=${state.likedReels.has(id) ? 'like' : 'unlike'}`, {
            method: 'POST'
        }).catch(() => {});
    };

    window.toggleBookmarkReel = function (id, index) {
        if (state.savedReels.has(id)) {
            state.savedReels.delete(id);
            showToast('Đã xóa khỏi danh sách đã lưu');
        } else {
            state.savedReels.add(id);
            showToast('🔖 Đã lưu video vào kho cá nhân!');
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
    }

    // ── Share Controller ────────────────────────────────────────────────────────
    window.shareCurrentReel = function (slug, title) {
        const shareUrl = `${window.location.origin}/reels?q=${encodeURIComponent(slug)}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('📋 Đã sao chép link video review!');
            }).catch(() => {
                promptCopyFallback(shareUrl);
            });
        } else {
            promptCopyFallback(shareUrl);
        }
    };

    function promptCopyFallback(url) {
        window.prompt('Sao chép liên kết xem video review:', url);
    }

    // ── Comments Slide-Over Drawer ──────────────────────────────────────────────
    window.openReelsCommentsDrawer = function (reelId, movieTitle) {
        const drawer = document.getElementById('reels-comments-drawer');
        const backdrop = document.getElementById('reels-comments-backdrop');
        const countEl = document.getElementById('drawer-comments-count');

        if (countEl) countEl.textContent = `Bình luận: ${movieTitle}`;
        if (drawer) drawer.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
    };

    window.closeReelsCommentsDrawer = function () {
        const drawer = document.getElementById('reels-comments-drawer');
        const backdrop = document.getElementById('reels-comments-backdrop');
        if (drawer) drawer.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
    };

    window.submitReelComment = function () {
        const input = document.getElementById('drawer-comment-input');
        const list = document.getElementById('drawer-comments-list');

        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        input.value = '';

        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.innerHTML = `
            <div class="comment-avatar bg-gradient-to-tr from-amber-400 to-yellow-600 text-black">BẠN</div>
            <div class="comment-content">
                <div class="comment-author">
                    <span>Bạn</span>
                    <span class="text-[10px] px-1 py-0.2 rounded bg-emerald-400/20 text-emerald-300">Vừa xong</span>
                </div>
                <div class="comment-text">${escapeHtml(text)}</div>
            </div>
            <button class="comment-like-btn" onclick="toggleCommentLike(this)">
                <i data-lucide="heart" class="w-4 h-4"></i>
                <span>0</span>
            </button>
        `;

        if (list) list.prepend(commentItem);

        if (window.lucide) {
            window.lucide.createIcons();
        }

        showToast('💬 Đã đăng bình luận thành công!');
    };

    window.handleCommentInputKey = function (e) {
        if (e.key === 'Enter') {
            window.submitReelComment();
        }
    };

    window.toggleCommentLike = function (btn) {
        btn.classList.toggle('text-rose-500');
        const span = btn.querySelector('span');
        if (span) {
            let count = parseInt(span.textContent || '0', 10);
            span.textContent = btn.classList.contains('text-rose-500') ? count + 1 : Math.max(0, count - 1);
        }
    };

    // ── Search Spotlight Modal ──────────────────────────────────────────────────
    let searchDebounceTimer = null;

    window.openReelsSearchModal = function () {
        const modal = document.getElementById('reels-search-modal');
        const input = document.getElementById('reels-search-input');
        if (modal) modal.classList.add('active');
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

    window.debounceReelsSearch = function (val) {
        clearTimeout(searchDebounceTimer);
        const query = val.trim();

        if (!query) return;

        searchDebounceTimer = setTimeout(async () => {
            const resultsList = document.getElementById('search-results-list');
            const heading = document.getElementById('search-results-heading');
            if (heading) heading.textContent = `Kết quả cho "${query}"`;

            try {
                const res = await fetch(`/api/reels/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data.success && data.items && data.items.length > 0) {
                    resultsList.innerHTML = data.items.map((item) => `
                        <div class="search-result-row" onclick="filterReelsByQuery('${escapeHtml(item.movieTitle || item.title)}')">
                            <img src="${item.poster || item.backdrop}" class="search-row-thumb" onerror="this.src='/android-chrome-192x192.png';" />
                            <div>
                                <div class="search-row-title">${escapeHtml(item.movieTitle)}</div>
                                <div class="search-row-subtitle">${escapeHtml(item.title)} • ⭐ ${item.rating}</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    resultsList.innerHTML = `
                        <div class="text-center py-6 text-sm text-gray-400">
                            Không tìm thấy video review cho từ khóa "${escapeHtml(query)}".
                        </div>
                    `;
                }
            } catch (err) {
                console.error('Search error:', err);
            }
        }, 350);
    };

    window.filterReelsByQuery = function (query) {
        window.closeReelsSearchModal();
        window.location.href = `/reels?q=${encodeURIComponent(query)}`;
    };

    // ── Keyboard Controls (Desktop UX) ──────────────────────────────────────────
    function setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            // Disable shortcuts when typing in inputs
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                if (e.key === 'Escape') {
                    window.closeReelsSearchModal();
                    window.closeReelsCommentsDrawer();
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
                    togglePlayPauseActive();
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

                case 'c':
                case 'C':
                    e.preventDefault();
                    const activeItem = document.getElementById(`reel-item-${state.currentIndex}`);
                    if (activeItem) {
                        window.openReelsCommentsDrawer(activeItem.getAttribute('data-id'), activeItem.getAttribute('data-movie-title'));
                    }
                    break;

                case 'Escape':
                    window.closeReelsSearchModal();
                    window.closeReelsCommentsDrawer();
                    break;
            }
        });
    }

    window.scrollToReelIndex = function (index) {
        const item = document.getElementById(`reel-item-${index}`);
        if (item && feedContainer) {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // ── Toast Notification Helper ───────────────────────────────────────────────
    function showToast(msg) {
        const toast = document.getElementById('reels-toast');
        const msgEl = document.getElementById('reels-toast-msg');
        if (!toast || !msgEl) return;

        msgEl.textContent = msg;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
