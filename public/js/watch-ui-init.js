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
                        const btn = document.getElementById('btnAutoNext') || (badge ? badge.closest('.player-ctrl-item') : null);
                        const checkbox = document.getElementById('toggleAutoNext');
                        let isON = badge.classList.contains('badge-status-on');
                        isON = !isON;
                        if (isON) {
                            badge.className = 'badge-status-on';
                            badge.textContent = 'ON';
                            if (btn) btn.classList.add('is-active');
                            if (checkbox) checkbox.checked = true;
                            localStorage.setItem('autoNext', 'true');
                        } else {
                            badge.className = 'badge-status-off';
                            badge.textContent = 'OFF';
                            if (btn) btn.classList.remove('is-active');
                            if (checkbox) checkbox.checked = false;
                            localStorage.setItem('autoNext', 'false');
                        }
                    };

                    window.toggleAutoSkipBadge = function () {
                        const badge = document.getElementById('badgeAutoSkip');
                        const btn = document.getElementById('btnAutoSkip') || (badge ? badge.closest('.player-ctrl-item') : null);
                        const checkbox = document.getElementById('toggleAutoSkip');
                        let isON = badge.classList.contains('badge-status-on');
                        isON = !isON;
                        if (isON) {
                            badge.className = 'badge-status-on';
                            badge.textContent = 'ON';
                            if (btn) btn.classList.add('is-active');
                            if (checkbox) checkbox.checked = true;
                            localStorage.setItem('autoSkip', 'true');
                        } else {
                            badge.className = 'badge-status-off';
                            badge.textContent = 'OFF';
                            if (btn) btn.classList.remove('is-active');
                            if (checkbox) checkbox.checked = false;
                            localStorage.setItem('autoSkip', 'false');
                        }
                    };

                    window.toggleBadgeCinemaMode = function () {
                        if (typeof window.toggleCinemaMode === 'function') {
                            window.toggleCinemaMode();
                        }
                        const badge = document.getElementById('badgeCinema');
                        const btn = document.getElementById('cinemaModeBtn') || (badge ? badge.closest('.player-ctrl-item') : null);
                        if (badge) {
                            if (window.isCinemaModeActive) {
                                badge.className = 'badge-status-on';
                                badge.textContent = 'ON';
                                if (btn) btn.classList.add('is-active');
                            } else {
                                badge.className = 'badge-status-off';
                                badge.textContent = 'OFF';
                                if (btn) btn.classList.remove('is-active');
                            }
                        }
                    };

                    // Initial sync of toggle states from localStorage
                    function syncToggleStates() {
                        const autoNextSaved = localStorage.getItem('autoNext') !== 'false';
                        const badgeNext = document.getElementById('badgeAutoNext');
                        const btnNext = document.getElementById('btnAutoNext') || (badgeNext ? badgeNext.closest('.player-ctrl-item') : null);
                        const chkNext = document.getElementById('toggleAutoNext');
                        if (badgeNext) {
                            badgeNext.className = autoNextSaved ? 'badge-status-on' : 'badge-status-off';
                            badgeNext.textContent = autoNextSaved ? 'ON' : 'OFF';
                            if (btnNext) {
                                if (autoNextSaved) btnNext.classList.add('is-active');
                                else btnNext.classList.remove('is-active');
                            }
                            if (chkNext) chkNext.checked = autoNextSaved;
                        }

                        const autoSkipSaved = localStorage.getItem('autoSkip') === 'true';
                        const badgeSkip = document.getElementById('badgeAutoSkip');
                        const btnSkip = document.getElementById('btnAutoSkip') || (badgeSkip ? badgeSkip.closest('.player-ctrl-item') : null);
                        const chkSkip = document.getElementById('toggleAutoSkip');
                        if (badgeSkip) {
                            badgeSkip.className = autoSkipSaved ? 'badge-status-on' : 'badge-status-off';
                            badgeSkip.textContent = autoSkipSaved ? 'ON' : 'OFF';
                            if (btnSkip) {
                                if (autoSkipSaved) btnSkip.classList.add('is-active');
                                else btnSkip.classList.remove('is-active');
                            }
                            if (chkSkip) chkSkip.checked = autoSkipSaved;
                        }
                    }
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', syncToggleStates);
                    } else {
                        syncToggleStates();
                    }

                    // Shortcuts Guide Modal (?) - Matching Image 2 with Mobile Gestures & Button Directory
                    window.openShortcutsGuideModal = function () {
                        let modal = document.getElementById('shortcutsGuideModal');
                        if (!modal) {
                            modal = document.createElement('div');
                            modal.id = 'shortcutsGuideModal';
                            modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; background: rgba(0, 0, 0, 0.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 14px; opacity: 0; transition: opacity 0.25s ease;';
                            modal.onclick = (e) => { if (e.target === modal) window.closeShortcutsGuideModal(); };
                            modal.innerHTML = `
                                <div class="guide-modal-card relative w-full max-w-sm sm:max-w-md overflow-hidden flex flex-col max-h-[92vh] transform scale-95 transition-transform duration-250" onclick="event.stopPropagation()">
                                    <!-- Header -->
                                    <div class="guide-modal-header">
                                        <div class="flex items-center gap-2">
                                            <span class="w-2 h-2 rounded-full bg-[#fcd576] inline-block shadow-[0_0_8px_#fcd576]"></span>
                                            <span class="guide-modal-title">Hướng Dẫn & Tiện Ích</span>
                                        </div>
                                        <button type="button" onclick="closeShortcutsGuideModal()" class="guide-modal-close" title="Đóng">
                                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>

                                    <!-- Scrollable Body -->
                                    <div class="guide-modal-body space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                        <!-- Block 1: Mobile Gestures (Ảnh số 2) -->
                                        <div class="guide-section-box">
                                            <div class="guide-section-title">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                                                    <path d="M12 18h.01"/>
                                                </svg>
                                                <span>Mobile</span>
                                            </div>
                                            <!-- 3 Gestures (Thụt lề mục con) -->
                                            <div class="guide-items-list">
                                                <div class="guide-item-row">
                                                    <svg class="gesture-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path d="m9 9 5 12 1.8-5.2L21 14Z"/>
                                                        <path d="M7.2 2.2 8 5.1"/>
                                                        <path d="m5.1 8-2.9-.8"/>
                                                        <path d="M14 4.1 12 6"/>
                                                    </svg>
                                                    <span class="guide-item-text">Chạm một lần để hiện / ẩn thanh điều khiển</span>
                                                </div>
                                                <div class="guide-item-row">
                                                    <svg class="gesture-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path d="m9 9 5 12 1.8-5.2L21 14Z"/>
                                                        <path d="M7.2 2.2 8 5.1"/>
                                                        <path d="m5.1 8-2.9-.8"/>
                                                        <path d="M14 4.1 12 6"/>
                                                    </svg>
                                                    <span class="guide-item-text">Chạm đúp bên trái / phải để tua 10 giây</span>
                                                </div>
                                                <div class="guide-item-row">
                                                    <svg class="gesture-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path d="m9 9 5 12 1.8-5.2L21 14Z"/>
                                                        <path d="M7.2 2.2 8 5.1"/>
                                                        <path d="m5.1 8-2.9-.8"/>
                                                        <path d="M14 4.1 12 6"/>
                                                    </svg>
                                                    <span class="guide-item-text">Nhấn giữ trên video để tua nhanh 2x, thả tay để trở lại tốc độ cũ</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Block 2: Nút dưới video (Đầy đủ từ tim & dấu + chuẩn Ảnh 2) -->
                                        <div class="guide-section-box">
                                            <div class="guide-section-title">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                                </svg>
                                                <span>Nút dưới video</span>
                                            </div>
                                            <!-- Full List of Buttons (Thụt lề mục con) -->
                                            <div class="guide-items-list">
                                                <!-- Yêu thích -->
                                                <div class="guide-item-row">
                                                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                                    </svg>
                                                    <span class="guide-item-text">Yêu thích: Lưu vào danh sách phim yêu thích</span>
                                                </div>
                                                <!-- Thêm vào -->
                                                <div class="guide-item-row">
                                                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    </svg>
                                                    <span class="guide-item-text">Thêm vào: Lưu phim vào danh sách phát</span>
                                                </div>
                                                <!-- Tự động chuyển tập -->
                                                <div class="guide-item-row">
                                                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <polygon points="5 4 15 12 5 20 5 4"></polygon>
                                                        <line x1="19" y1="5" x2="19" y2="19"></line>
                                                    </svg>
                                                    <span class="guide-item-text">Tự động chuyển tập</span>
                                                </div>
                                                <!-- Tự động bỏ qua intro -->
                                                <div class="guide-item-row">
                                                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <polyline points="9 6 15 12 9 18"></polyline>
                                                        <line x1="19" y1="6" x2="19" y2="18"></line>
                                                    </svg>
                                                    <span class="guide-item-text">Tự động bỏ qua intro</span>
                                                </div>
                                                <!-- Chế độ rạp phim -->
                                                <div class="guide-item-row">
                                                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"></path>
                                                        <path d="m6.2 5.3 3.1 3.9"></path>
                                                        <path d="m12.4 3.4 3.1 4"></path>
                                                        <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path>
                                                    </svg>
                                                    <span class="guide-item-text">Chế độ rạp phim</span>
                                                </div>
                                                <!-- Báo lỗi phim -->
                                                <div class="guide-item-row">
                                                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <rect width="8" height="14" x="8" y="6" rx="4"></rect>
                                                        <path d="m19 7-3 2"></path>
                                                        <path d="m5 7 3 2"></path>
                                                        <path d="m19 19-3-2"></path>
                                                        <path d="m5 19 3-2"></path>
                                                        <path d="M20 13h-4"></path>
                                                        <path d="M4 13h4"></path>
                                                        <path d="m10 4 1 2"></path>
                                                        <path d="m14 4-1 2"></path>
                                                    </svg>
                                                    <span class="guide-item-text">Báo lỗi phim</span>
                                                </div>
                                                <!-- Status note inside guide-items-list -->
                                                <div class="guide-status-note">
                                                    <span class="w-1.5 h-1.5 rounded-full bg-[#fcd576] inline-block shadow-[0_0_6px_#fcd576]"></span>
                                                    <span>Vàng = đang bật</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Block 3: Phím tắt PC -->
                                        <div class="guide-pc-box">
                                            <button type="button" id="togglePcShortcutsBtn" onclick="window.togglePcShortcutsView()" class="guide-pc-toggle">
                                                <span class="flex items-center gap-2">
                                                    <span class="material-icons-round text-sm text-[#fcd576]">keyboard</span>
                                                    <span>Phím tắt trên Máy tính (PC / Laptop)</span>
                                                </span>
                                                <span class="material-icons-round text-sm transition-transform duration-200" id="pcShortcutsChevron">expand_more</span>
                                            </button>
                                            <div id="pcShortcutsList">
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Phát / Tạm dừng</span><kbd class="pc-shortcut-key">Space / K</kbd></div>
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Toàn màn hình</span><kbd class="pc-shortcut-key">F</kbd></div>
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Bật / Tắt âm thanh</span><kbd class="pc-shortcut-key">M</kbd></div>
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Tua lùi 10 giây</span><kbd class="pc-shortcut-key">← / J</kbd></div>
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Tua tới 10 giây</span><kbd class="pc-shortcut-key">→ / L</kbd></div>
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Tăng / Giảm âm lượng</span><kbd class="pc-shortcut-key">↑ / ↓</kbd></div>
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Tập tiếp theo</span><kbd class="pc-shortcut-key">N</kbd></div>
                                                <div class="pc-shortcut-row"><span class="pc-shortcut-name">Chế độ Rạp phim</span><kbd class="pc-shortcut-key">T / ESC</kbd></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                            document.body.appendChild(modal);
                        }
                        const pcList = document.getElementById('pcShortcutsList');
                        const pcChevron = document.getElementById('pcShortcutsChevron');
                        if (pcList) pcList.classList.remove('open');
                        if (pcChevron) pcChevron.style.transform = 'rotate(0deg)';

                        modal.style.display = 'flex';
                        requestAnimationFrame(() => {
                            modal.style.opacity = '1';
                            const card = modal.querySelector('div');
                            if (card) card.classList.remove('scale-95');
                        });
                    };

                    window.togglePcShortcutsView = function () {
                        const list = document.getElementById('pcShortcutsList');
                        const chevron = document.getElementById('pcShortcutsChevron');
                        if (!list) return;
                        const isOpen = list.classList.contains('open');
                        if (isOpen) {
                            list.classList.remove('open');
                            if (chevron) chevron.style.transform = 'rotate(0deg)';
                        } else {
                            list.classList.add('open');
                            if (chevron) chevron.style.transform = 'rotate(180deg)';
                            setTimeout(() => {
                                const modalBody = list.closest('.guide-modal-body');
                                if (modalBody) {
                                    modalBody.scrollTo({ top: modalBody.scrollHeight, behavior: 'smooth' });
                                }
                            }, 60);
                        }
                    };

                    window.closeShortcutsGuideModal = function () {
                        const modal = document.getElementById('shortcutsGuideModal');
                        if (!modal) return;
                        modal.style.opacity = '0';
                        const card = modal.querySelector('div');
                        if (card) card.classList.add('scale-95');
                        setTimeout(() => { modal.style.display = 'none'; }, 250);
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
                titleInput.value = `${movieName} ${epName ? ' ' + epName : ''}`.trim();
            }

            modal.style.display = 'flex';
            void modal.offsetWidth; // force reflow for smooth fade
            modal.classList.remove('opacity-0');
            if (card) {
                card.classList.remove('scale-95');
                card.classList.add('scale-100');
            }
            document.body.style.overflow = 'hidden';
        };

        window.toggleReportIssueDropdown = function(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const menu = document.getElementById('reportIssueDropdownMenu');
            const arrow = document.getElementById('reportIssueArrow');
            if (!menu) return;
            const isHidden = menu.classList.contains('hidden');
            if (isHidden) {
                menu.classList.remove('hidden');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            } else {
                menu.classList.add('hidden');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        };

        window.selectReportIssue = function(el) {
            if (!el) return;
            const val = el.getAttribute('data-value');
            const label = el.querySelector('.truncate')?.textContent || el.textContent;
            const icon = el.querySelector('span:first-child')?.textContent || '';

            const hiddenInput = document.getElementById('reportIssueType');
            const displayLabel = document.getElementById('reportIssueSelectedLabel');
            if (hiddenInput) hiddenInput.value = val;
            if (displayLabel) displayLabel.innerHTML = `${icon} <span class="truncate">${label}</span>`.trim();

            document.querySelectorAll('.report-issue-option').forEach(opt => {
                opt.classList.remove('active-issue-option', 'text-[#fcd576]', 'bg-[#fcd576]/15');
            });
            el.classList.add('active-issue-option', 'text-[#fcd576]', 'bg-[#fcd576]/15');

            const menu = document.getElementById('reportIssueDropdownMenu');
            const arrow = document.getElementById('reportIssueArrow');
            if (menu) menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const wrapper = document.getElementById('reportIssueDropdownWrapper');
            const menu = document.getElementById('reportIssueDropdownMenu');
            const arrow = document.getElementById('reportIssueArrow');
            if (wrapper && !wrapper.contains(e.target) && menu && !menu.classList.contains('hidden')) {
                menu.classList.add('hidden');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
            }
        });

        window.closeReportModal = function() {
            const modal = document.getElementById('reportMovieModal');
            const card = document.getElementById('reportMovieModalCard');
            const menu = document.getElementById('reportIssueDropdownMenu');
            const arrow = document.getElementById('reportIssueArrow');
            if (menu) menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';

            if (!modal) return;
            modal.classList.add('opacity-0');
            if (card) {
                card.classList.remove('scale-100');
                card.classList.add('scale-95');
            }
            setTimeout(function() {
                if (modal.classList.contains('opacity-0')) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            }, 300);
        };

        window.submitMovieReport = async function(e) {
            if (e) e.preventDefault();
            const btn = document.getElementById('btnSubmitReport');
            const form = document.getElementById('reportMovieForm');
            const successState = document.getElementById('reportSuccessState');
            const issueType = document.getElementById('reportIssueType')?.value || 'Báo lỗi chung';
            const description = document.getElementById('reportIssueDesc')?.value || '';
            const movieName = (window.currentMovie && (window.currentMovie.name || window.currentMovie.title)) || document.getElementById('playerMovieTitle')?.textContent || 'Phim';
            const episode = window.currentEpisodeName || document.getElementById('watchBreadcrumbEpName')?.textContent || '';
            const server = window.currentServerName || '';

            let userName = 'Khách vãng lai';
            let userEmail = '';
            if (window.authService && window.authService.getCurrentUser) {
                const user = window.authService.getCurrentUser();
                if (user) {
                    userName = user.name || user.displayName || 'Thành viên';
                    userEmail = user.email || '';
                }
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

            // ⚡ Phản hồi NGAY LẬP TỨC (Optimistic UI) - Không để người dùng chờ đợi dù chỉ 1ms
            if (form) form.classList.add('hidden');
            if (successState) successState.classList.remove('hidden');

            if (window.GamificationCore && typeof window.GamificationCore.showGamificationToast === 'function') {
                window.GamificationCore.showGamificationToast('✅ Đã gửi báo lỗi thành công tới Quản trị viên!', 'success');
            }

            // Gửi dữ liệu ngầm lên server
            try {
                fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => res.json()).then(data => {
                    console.log('⚡ [Feedback] Báo lỗi đã gửi thành công:', data);
                }).catch(err => {
                    console.warn('⚡ [Feedback] Ghi nhận nền:', err);
                });
            } catch (err) {
                console.error('Lỗi khi gửi báo lỗi:', err);
            }
        };

        // Redirect old reportError() to openReportModal()
        window.reportError = window.openReportModal;
    })();

