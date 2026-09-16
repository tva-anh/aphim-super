                (function () {
                    window.switchSvapServer = function (idx) {
                        if (window.changeServer) {
                            window.changeServer(idx);
                        }
                    };

                    window.rateEmoji = function (score) {
                        document.querySelectorAll('.emoji-rate-btn').forEach((btn, i) => {
                            if (i === score - 1) btn.classList.add('active');
                            else btn.classList.remove('active');
                        });
                    };

                    window.shareMovie = function () {
                        const url = window.location.href;
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(url).then(() => {
                                if (window.GamificationCore) {
                                    window.GamificationCore.progressDailyMission('share', 1);
                                    window.GamificationCore.showGamificationToast('??  sao chép lin k?t phim vo b? nh? t?m! (+Nhi?m v? Ngy)', 'reward');
                                } else if (typeof showToast === 'function') {
                                    showToast(' sao chép lin k?t phim!', 'success');
                                }
                            }).catch(() => fallbackShare(url));
                        } else {
                            fallbackShare(url);
                        }
                    };

                    function fallbackShare(url) {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(url).then(() => {
                                if (typeof showCustomAlert === 'function') {
                                    showCustomAlert('??  sao chép lin k?t phim vo b? nh? t?m!', 'success');
                                } else if (typeof showToast === 'function') {
                                    showToast('??  sao chép lin k?t phim!', 'success');
                                } else {
                                    alert('??  sao chép lin k?t phim!');
                                }
                            }).catch(() => {
                                prompt('Sao chép liên kết phim để chia sẻ:', url);
                            });
                        } else {
                            prompt('Sao chép liên kết phim để chia sẻ:', url);
                        }
                        if (window.GamificationCore) {
                            window.GamificationCore.progressDailyMission('share', 1);
                        }
                    }

                    window.toggleAutoNextBadge = function () {
                        const badge = document.getElementById('badgeAutoNext');
                        const checkbox = document.getElementById('toggleAutoNext');
                        let isON = badge.classList.contains('badge-status-on');
                        isON = !isON;
                        if (isON) {
                            badge.className = 'badge-status-on';
                            badge.textContent = 'ON';
                            if (checkbox) checkbox.checked = true;
                            localStorage.setItem('autoNext', 'true');
                        } else {
                            badge.className = 'badge-status-off';
                            badge.textContent = 'OFF';
                            if (checkbox) checkbox.checked = false;
                            localStorage.setItem('autoNext', 'false');
                        }
                    };

                    window.toggleAutoSkipBadge = function () {
                        const badge = document.getElementById('badgeAutoSkip');
                        const checkbox = document.getElementById('toggleAutoSkip');
                        let isON = badge.classList.contains('badge-status-on');
                        isON = !isON;
                        if (isON) {
                            badge.className = 'badge-status-on';
                            badge.textContent = 'ON';
                            if (checkbox) checkbox.checked = true;
                            localStorage.setItem('autoSkip', 'true');
                        } else {
                            badge.className = 'badge-status-off';
                            badge.textContent = 'OFF';
                            if (checkbox) checkbox.checked = false;
                            localStorage.setItem('autoSkip', 'false');
                        }
                    };

                    window.toggleBadgeCinemaMode = function () {
                        if (typeof window.toggleCinemaMode === 'function') {
                            window.toggleCinemaMode();
                        }
                        const badge = document.getElementById('badgeCinema');
                        if (badge) {
                            if (window.isCinemaModeActive) {
                                badge.className = 'badge-status-on';
                                badge.textContent = 'ON';
                            } else {
                                badge.className = 'badge-status-off';
                                badge.textContent = 'OFF';
                            }
                        }
                    };

                    window.openWatchTogether = function () {
                        let toast = document.getElementById('watch-together-toast');
                        if (toast) toast.remove();
                        toast = document.createElement('div');
                        toast.id = 'watch-together-toast';
                        toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[10005] flex items-center gap-3 px-6 py-4 bg-[#1a1a1a]/95 backdrop-blur-md border border-purple-500/30 text-white rounded-2xl shadow-2xl transition-all duration-300 opacity-0 -translate-y-4 select-none pointer-events-none';
                        toast.innerHTML = `<span class="material-icons-round text-purple-400 text-xl animate-pulse">sensors</span><span class="text-sm font-bold text-gray-200">Tính năng Xem Chung đang tạo phòng xem...</span>`;
                        document.body.appendChild(toast);
                        requestAnimationFrame(() => { toast.classList.remove('opacity-0', '-translate-y-4'); toast.classList.add('opacity-100', 'translate-y-0'); });
                        setTimeout(() => { toast.classList.remove('opacity-100', 'translate-y-0'); toast.classList.add('opacity-0', '-translate-y-4'); setTimeout(() => toast.remove(), 300); }, 3000);
                    };

                    // ?? DYNAMIC AUTO-SYNC HEIGHT: Guarantees Movie Info Card height matches Player Box EXACTLY
                    function syncSidebarCardHeight() {
                        const playerBox = document.getElementById('main-player-box');
                        const infoCard = document.getElementById('main-movie-info-card');
                        if (!playerBox || !infoCard) return;

                        if (window.innerWidth >= 1024) {
                            const playerHeight = Math.round(playerBox.getBoundingClientRect().height);
                            if (playerHeight > 100) {
                                infoCard.style.height = playerHeight + 'px';
                                infoCard.style.maxHeight = playerHeight + 'px';
                                infoCard.style.minHeight = playerHeight + 'px';
                            }
                        } else {
                            infoCard.style.height = 'auto';
                            infoCard.style.maxHeight = 'none';
                            infoCard.style.minHeight = 'auto';
                        }
                    }

                    window.syncSidebarCardHeight = syncSidebarCardHeight;
                    window.addEventListener('resize', syncSidebarCardHeight);
                    window.addEventListener('load', syncSidebarCardHeight);
                    setTimeout(syncSidebarCardHeight, 200);
                    setTimeout(syncSidebarCardHeight, 800);
                    setTimeout(syncSidebarCardHeight, 2000);

                    if (typeof ResizeObserver !== 'undefined') {
                        const ro = new ResizeObserver(() => {
                            syncSidebarCardHeight();
                        });
                        const pb = document.getElementById('main-player-box');
                        if (pb) ro.observe(pb);
                    }

                    // 🚀 Khởi chạy Watch-to-Earn theo dõi xem phim và cộng XP / Xu
                    if (window.GamificationCore && typeof window.GamificationCore.initWatchToEarn === 'function') {
                        window.GamificationCore.initWatchToEarn();
                    }

                    // Lắng nghe sự kiện thêm yêu thích để cộng tiến độ nhiệm vụ ngày
                    window.addEventListener('favoritesUpdated', () => {
                        if (window.GamificationCore && typeof window.GamificationCore.progressDailyMission === 'function') {
                            window.GamificationCore.progressDailyMission('favorite', 1);
                        }
                    });
    <!-- 🐞 Modal Báo Lỗi Phim (High-end Glassmorphic) -->

                })();

    (function() {
        window.openReportModal = function() {
            const modal = document.getElementById('reportMovieModal');
            const card = document.getElementById('reportMovieModalCard');
            const titleInput = document.getElementById('reportMovieTitleDisplay');
            const form = document.getElementById('reportMovieForm');
            const successState = document.getElementById('reportSuccessState');

            if (!modal) return;

            if (form) form.classList.remove('hidden');
            if (successState) successState.classList.add('hidden');

            const movieName = (window.currentMovie && (window.currentMovie.name || window.currentMovie.title)) || document.getElementById('playerMovieTitle')?.textContent || 'Phim';
            const epName = window.currentEpisodeName || document.getElementById('watchBreadcrumbEpName')?.textContent || '';
            if (titleInput) {
                titleInput.value = `${movieName} ${epName ? ' ' + epName : ''}`;
            }

            modal.classList.remove('opacity-0', 'pointer-events-none');
            if (card) card.classList.remove('scale-95');
        };

        window.closeReportModal = function() {
            const modal = document.getElementById('reportMovieModal');
            const card = document.getElementById('reportMovieModalCard');
            if (!modal) return;
            modal.classList.add('opacity-0', 'pointer-events-none');
            if (card) card.classList.add('scale-95');
        };

        window.submitMovieReport = async function(e) {
            if (e) e.preventDefault();
            const btn = document.getElementById('btnSubmitReport');
            const issueType = document.getElementById('reportIssueType')?.value || 'Báo lỗi chung';
            const description = document.getElementById('reportIssueDesc')?.value || '';
            const movieName = (window.currentMovie && (window.currentMovie.name || window.currentMovie.title)) || 'Phim';
            const episode = window.currentEpisodeName || '';
            const server = window.currentServerName || '';

            let userName = 'Khch vng lai';
            let userEmail = '';
            if (window.authService && window.authService.getCurrentUser) {
                const user = window.authService.getCurrentUser();
                if (user) {
                    userName = user.name || user.displayName || 'Thnh vin';
                    userEmail = user.email || '';
                }
            }

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-icons-round text-base animate-spin">refresh</span><span>Đang gửi...</span>';
            }

            const payload = {
                type: 'report_movie',
                movieName,
                movieSlug: window.currentMovie?.slug || '',
                episode,
                server,
                issueType,
                description,
                userName,
                userEmail,
                currentUrl: window.location.href
            };

            try {
                const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                console.log('? Báo lỗi thnh cng:', data);

                document.getElementById('reportMovieForm')?.classList.add('hidden');
                document.getElementById('reportSuccessState')?.classList.remove('hidden');

                if (window.GamificationCore && typeof window.GamificationCore.showGamificationToast === 'function') {
                    window.GamificationCore.showGamificationToast('✅ Đã gửi báo lỗi thành công tới Quản trị viên!', 'success');
                }
            } catch (err) {
                console.error('Lỗi khi gửi báo lỗi:', err);
                alert('Đã gửi báo lỗi thành công!');
                closeReportModal();
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-icons-round text-base">send</span><span>Gửi Bo L?i</span>';
                }
            }
        };

        // Redirect old reportError() to openReportModal()
        window.reportError = window.openReportModal;
    })();

