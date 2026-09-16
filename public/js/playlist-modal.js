// ══════════════════════════════════════════════════════════════════
//  APhim Playlist Modal – World-Class Streaming Benchmark
//  (Netflix / Spotify / YouTube Music Standard)
//  Usage: window.openPlaylistModal({ slug, name, thumb_url, year })
// ══════════════════════════════════════════════════════════════════

(function () {
    const MODAL_ID = 'ap-playlist-modal';
    const CREATE_MODAL_ID = 'ap-create-playlist-modal';
    const EDIT_MODAL_ID = 'ap-edit-playlist-modal';
    const DELETE_MODAL_ID = 'ap-delete-playlist-modal';

    // Ensure stylesheet is loaded
    function ensureStylesheet() {
        if (!document.getElementById('ap-pl-stylesheet')) {
            const link = document.createElement('link');
            link.id = 'ap-pl-stylesheet';
            link.rel = 'stylesheet';
            link.href = '/css/playlist-modal.css?v=2';
            document.head.appendChild(link);
        }
    }

    // ── Inject Modals HTML ────────────────────────────────
    function injectModals() {
        ensureStylesheet();

        // 1. Main "Add to Playlist" Modal / Bottom Sheet
        if (!document.getElementById(MODAL_ID)) {
            const modal = document.createElement('div');
            modal.id = MODAL_ID;
            modal.className = 'ap-pl-overlay';
            modal.innerHTML = `
                <div class="ap-pl-sheet" role="dialog" aria-modal="true" aria-labelledby="ap-pl-main-title">
                    <div class="ap-pl-drag-handle" id="ap-pl-drag"></div>
                    
                    <div class="ap-pl-header">
                        <div class="ap-pl-header-info">
                            <h3 id="ap-pl-main-title">
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#f59e0b; flex-shrink:0;">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                </svg>
                                Thêm vào Danh sách phát
                            </h3>
                            <div class="ap-pl-header-sub">Chọn danh sách để lưu phim của bạn</div>
                        </div>
                        <button id="ap-pl-close" class="ap-pl-close-btn" onclick="window._apClosePlaylistModal()" title="Đóng" aria-label="Đóng">✕</button>
                    </div>

                    <!-- Movie Preview Card (Top streaming benchmark) -->
                    <div id="ap-pl-movie-card" class="ap-pl-movie-card" style="display:none;">
                        <img id="ap-pl-movie-poster" class="ap-pl-movie-poster" src="" alt="Poster phim" onerror="this.style.display='none'; document.getElementById('ap-pl-movie-fallback').style.display='flex';" />
                        <div id="ap-pl-movie-fallback" class="ap-pl-movie-poster-fallback" style="display:none;">🎬</div>
                        <div class="ap-pl-movie-meta">
                            <div id="ap-pl-movie-name" class="ap-pl-movie-name">Tên phim</div>
                            <div class="ap-pl-movie-badges">
                                <span id="ap-pl-movie-year" class="ap-pl-movie-year">2026</span>
                                <span class="ap-pl-movie-hint">• Chạm vào danh sách để thêm</span>
                            </div>
                        </div>
                    </div>

                    <!-- Playlist Items List -->
                    <div id="ap-pl-list" class="ap-pl-body"></div>

                    <!-- Footer with Primary CTA Button -->
                    <div class="ap-pl-footer">
                        <button id="ap-pl-create-btn" class="ap-pl-btn-create-trigger" type="button" onclick="window._apOpenCreateModal()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Tạo danh sách phát mới
                        </button>
                    </div>
                </div>
            `;
            modal.addEventListener('click', (e) => { if (e.target === modal) closePlaylistModal(); });
            document.body.appendChild(modal);
        }

        // 2. Create Playlist Modal
        if (!document.getElementById(CREATE_MODAL_ID)) {
            const createModal = document.createElement('div');
            createModal.id = CREATE_MODAL_ID;
            createModal.className = 'ap-pl-overlay';
            createModal.innerHTML = `
                <div class="ap-pl-sheet" role="dialog" aria-modal="true" aria-labelledby="ap-pl-create-title">
                    <div class="ap-pl-drag-handle"></div>

                    <div class="ap-pl-header">
                        <div class="ap-pl-header-info">
                            <h3 id="ap-pl-create-title">
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#f59e0b; flex-shrink:0;">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Tạo danh sách phát mới
                            </h3>
                            <div class="ap-pl-header-sub">Tập hợp các bộ phim yêu thích của riêng bạn</div>
                        </div>
                        <button id="ap-pl-create-close" class="ap-pl-close-btn" onclick="window._apCloseCreateModal()" title="Đóng" aria-label="Đóng">✕</button>
                    </div>

                    <div class="ap-pl-body" style="padding-top:16px; padding-bottom:16px;">
                        <div class="ap-pl-form-group">
                            <label class="ap-pl-form-label" for="ap-pl-name-input">
                                TÊN DANH SÁCH <span style="color:#ef4444;">*</span>
                            </label>
                            <input id="ap-pl-name-input" class="ap-pl-form-input" type="text" maxlength="60"
                                placeholder="Ví dụ: Phim hành động đỉnh nhất, Anime 2026..." autocomplete="off" onkeydown="if(event.key==='Enter') window._apSubmitCreatePlaylist()" />
                        </div>

                        <div class="ap-pl-form-group">
                            <label class="ap-pl-form-label" for="ap-pl-desc-input">
                                MÔ TẢ (KHÔNG BẮT BUỘC)
                            </label>
                            <textarea id="ap-pl-desc-input" class="ap-pl-form-textarea" rows="3" maxlength="200"
                                placeholder="Mô tả ngắn gọn về danh sách phát này..."></textarea>
                        </div>

                        <div class="ap-pl-form-actions">
                            <button id="ap-pl-create-cancel" class="ap-pl-btn-cancel" type="button" onclick="window._apCloseCreateModal()">HỦY</button>
                            <button id="ap-pl-create-confirm" class="ap-pl-btn-confirm" type="button" onclick="window._apSubmitCreatePlaylist()">
                                TẠO DANH SÁCH
                            </button>
                        </div>
                    </div>
                </div>
            `;
            createModal.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); });
            document.body.appendChild(createModal);
        }

        // 3. Edit Playlist Modal
        if (!document.getElementById(EDIT_MODAL_ID)) {
            const editModal = document.createElement('div');
            editModal.id = EDIT_MODAL_ID;
            editModal.className = 'ap-pl-overlay';
            editModal.innerHTML = `
                <div class="ap-pl-sheet" role="dialog" aria-modal="true" aria-labelledby="ap-pl-edit-title">
                    <div class="ap-pl-drag-handle"></div>

                    <div class="ap-pl-header">
                        <div class="ap-pl-header-info">
                            <h3 id="ap-pl-edit-title">
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#f59e0b; flex-shrink:0;">
                                    <path d="M12 20h9"></path>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                </svg>
                                Chỉnh sửa Danh sách phát
                            </h3>
                            <div class="ap-pl-header-sub">Cập nhật tên và mô tả cho danh sách phát của bạn</div>
                        </div>
                        <button id="ap-pl-edit-close" class="ap-pl-close-btn" onclick="window._apCloseEditModal()" title="Đóng" aria-label="Đóng">✕</button>
                    </div>

                    <div class="ap-pl-body" style="padding-top:16px; padding-bottom:16px;">
                        <input type="hidden" id="ap-pl-edit-id" value="" />
                        <div class="ap-pl-form-group">
                            <label class="ap-pl-form-label" for="ap-pl-edit-name-input">
                                TÊN DANH SÁCH <span style="color:#ef4444;">*</span>
                            </label>
                            <input id="ap-pl-edit-name-input" class="ap-pl-form-input" type="text" maxlength="60"
                                placeholder="Nhập tên mới cho danh sách phát..." autocomplete="off" onkeydown="if(event.key==='Enter') window._apSubmitEditPlaylist()" />
                        </div>

                        <div class="ap-pl-form-group">
                            <label class="ap-pl-form-label" for="ap-pl-edit-desc-input">
                                MÔ TẢ (KHÔNG BẮT BUỘC)
                            </label>
                            <textarea id="ap-pl-edit-desc-input" class="ap-pl-form-textarea" rows="3" maxlength="200"
                                placeholder="Mô tả về danh sách phát này..."></textarea>
                        </div>

                        <div class="ap-pl-form-actions">
                            <button id="ap-pl-edit-cancel" class="ap-pl-btn-cancel" type="button" onclick="window._apCloseEditModal()">HỦY</button>
                            <button id="ap-pl-edit-confirm" class="ap-pl-btn-confirm" type="button" onclick="window._apSubmitEditPlaylist()">
                                LƯU THAY ĐỔI
                            </button>
                        </div>
                    </div>
                </div>
            `;
            editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
            document.body.appendChild(editModal);
        }

        // 4. Delete Playlist Confirm Modal
        if (!document.getElementById(DELETE_MODAL_ID)) {
            const deleteModal = document.createElement('div');
            deleteModal.id = DELETE_MODAL_ID;
            deleteModal.className = 'ap-pl-overlay';
            deleteModal.innerHTML = `
                <div class="ap-pl-sheet" role="dialog" aria-modal="true" aria-labelledby="ap-pl-delete-title" style="max-width:400px;">
                    <div class="ap-pl-drag-handle"></div>

                    <div class="ap-pl-header" style="border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px;">
                        <div class="ap-pl-header-info">
                            <h3 id="ap-pl-delete-title" style="color:#ef4444; font-size:16px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#ef4444; flex-shrink:0;">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Xác nhận xóa Danh sách phát
                            </h3>
                            <div class="ap-pl-header-sub" style="color:#94a3b8;">Hành động này không thể hoàn tác</div>
                        </div>
                        <button id="ap-pl-delete-close" class="ap-pl-close-btn" onclick="window._apCloseDeleteModal()" title="Đóng" aria-label="Đóng">✕</button>
                    </div>

                    <div class="ap-pl-body" style="padding:18px 22px 18px 22px;">
                        <input type="hidden" id="ap-pl-delete-id" value="" />
                        <p id="ap-pl-delete-msg" style="font-size:13.5px; color:#cbd5e1; line-height:1.6; margin:0 0 18px 0;">
                            Bạn có chắc chắn muốn xóa danh sách phát này?
                        </p>
                        <div class="ap-pl-form-actions">
                            <button id="ap-pl-delete-cancel" class="ap-pl-btn-cancel" type="button" onclick="window._apCloseDeleteModal()">HỦY</button>
                            <button id="ap-pl-delete-confirm" class="ap-pl-btn-confirm" style="background:linear-gradient(135deg, #ef4444, #dc2626); color:#ffffff; box-shadow:0 6px 18px rgba(239,68,68,0.35);" type="button" onclick="window._apSubmitDeletePlaylist()">
                                XÓA DANH SÁCH
                            </button>
                        </div>
                    </div>
                </div>
            `;
            deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });
            document.body.appendChild(deleteModal);
        }

        // Close on ESC
        if (!window._apPlEscBound) {
            window._apPlEscBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeDeleteModal();
                    closeEditModal();
                    closeCreateModal();
                    closePlaylistModal();
                }
            });
        }
    }

    function submitCreatePlaylist() {
        const input = document.getElementById('ap-pl-name-input');
        const descInput = document.getElementById('ap-pl-desc-input');
        if (!input) return;
        const name = input.value.trim();
        const desc = descInput ? descInput.value.trim() : '';
        if (!name) {
            input.style.borderColor = '#ef4444';
            input.focus();
            return;
        }
        if (typeof playlistService === 'undefined') {
            showToast('Lỗi: Playlist service chưa sẵn sàng', 'error');
            return;
        }
        const pl = playlistService.create(name, desc);
        if (pl) {
            if (window._apCurrentMovie) {
                playlistService.addMovie(pl.id, window._apCurrentMovie);
                showToast(`Đã tạo và thêm vào "${pl.name}"`, 'success');
            } else {
                showToast(`Đã tạo danh sách "${pl.name}"`, 'success');
            }
            input.value = '';
            if (descInput) descInput.value = '';
            closeCreateModal();
            if (window._apCurrentMovie) {
                closePlaylistModal();
            }

            // Refresh profile tab if open
            if (typeof switchTab === 'function' && typeof currentTab !== 'undefined') {
                switchTab(currentTab);
            } else if (typeof renderTab === 'function' && typeof currentTab !== 'undefined' && (currentTab === 'watchlist' || currentTab === 'playlists')) {
                renderTab(currentTab);
            }
        }
    }

    function submitEditPlaylist() {
        const idInput = document.getElementById('ap-pl-edit-id');
        const nameInput = document.getElementById('ap-pl-edit-name-input');
        const descInput = document.getElementById('ap-pl-edit-desc-input');
        if (!idInput || !nameInput) return;
        const id = idInput.value;
        const name = nameInput.value.trim();
        const desc = descInput ? descInput.value.trim() : '';

        if (!name) {
            nameInput.style.borderColor = '#ef4444';
            nameInput.focus();
            return;
        }

        if (typeof playlistService !== 'undefined') {
            playlistService.update(id, name, desc);
        } else {
            let playlists = JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
            const idx = playlists.findIndex(p => p.id === id);
            if (idx !== -1) {
                playlists[idx].name = name;
                playlists[idx].description = desc;
                playlists[idx].desc = desc;
                playlists[idx].updatedAt = new Date().toISOString();
                localStorage.setItem('cinestream_playlists', JSON.stringify(playlists));
            }
        }

        // Direct localStorage update to guarantee sync
        try {
            let playlists = JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
            const idx = playlists.findIndex(p => p.id === id);
            if (idx !== -1) {
                playlists[idx].name = name;
                playlists[idx].description = desc;
                playlists[idx].desc = desc;
                playlists[idx].updatedAt = new Date().toISOString();
                localStorage.setItem('cinestream_playlists', JSON.stringify(playlists));
            }
            const u = JSON.parse(localStorage.getItem('cinestream_user') || 'null');
            if (u && Array.isArray(u.playlists)) {
                const uIdx = u.playlists.findIndex(p => p.id === id);
                if (uIdx !== -1) {
                    u.playlists[uIdx].name = name;
                    u.playlists[uIdx].description = desc;
                    u.playlists[uIdx].desc = desc;
                    localStorage.setItem('cinestream_user', JSON.stringify(u));
                }
            }
        } catch(e) {}

        showToast('Đã cập nhật danh sách phát thành công', 'success');
        closeEditModal();

        if (typeof switchTab === 'function' && typeof currentTab !== 'undefined') {
            switchTab(currentTab);
        } else if (typeof renderTab === 'function') {
            renderTab(typeof currentTab !== 'undefined' ? currentTab : 'watchlist');
        }
    }

    function submitDeletePlaylist() {
        const idInput = document.getElementById('ap-pl-delete-id');
        if (!idInput) return;
        const id = idInput.value;
        if (!id) return;

        if (typeof playlistService !== 'undefined') {
            playlistService.delete(id);
        } else {
            let playlists = JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
            playlists = playlists.filter(p => p.id !== id);
            localStorage.setItem('cinestream_playlists', JSON.stringify(playlists));
        }

        showToast('Đã xóa danh sách phát', 'info');
        closeDeleteModal();

        if (typeof window._activePlaylistId !== 'undefined' && window._activePlaylistId === id) {
            window._activePlaylistId = null;
        }

        if (typeof switchTab === 'function' && typeof currentTab !== 'undefined') {
            switchTab(currentTab);
        } else if (typeof renderTab === 'function') {
            renderTab(typeof currentTab !== 'undefined' ? currentTab : 'watchlist');
        }
    }

    function openCreateModal() {
        injectModals();
        closePlaylistModal(true); // silent close main modal
        const createModal = document.getElementById(CREATE_MODAL_ID);
        if (createModal) {
            createModal.style.display = 'flex';
            requestAnimationFrame(() => {
                createModal.classList.add('active');
                setTimeout(() => {
                    const inp = document.getElementById('ap-pl-name-input');
                    if (inp) {
                        inp.style.borderColor = '';
                        inp.focus();
                    }
                }, 100);
            });
        }
    }

    function closeCreateModal() {
        const createModal = document.getElementById(CREATE_MODAL_ID);
        if (createModal && createModal.classList.contains('active')) {
            createModal.classList.remove('active');
            setTimeout(() => {
                createModal.style.display = 'none';
                if (window._apCurrentMovie) {
                    openPlaylistModal(window._apCurrentMovie);
                }
            }, 250);
        }
    }

    function closePlaylistModal(silent = false) {
        const modal = document.getElementById(MODAL_ID);
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                if (!silent) window._apCurrentMovie = null;
            }, 250);
        }
    }

    function openEditPlaylistModal(id) {
        injectModals();
        let pl = null;
        if (typeof playlistService !== 'undefined') {
            pl = playlistService.getById(id);
        }
        if (!pl) {
            try {
                const list = JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
                pl = list.find(p => p.id === id);
            } catch(e) {}
        }
        if (!pl) return;

        const idInp = document.getElementById('ap-pl-edit-id');
        const nameInp = document.getElementById('ap-pl-edit-name-input');
        const descInp = document.getElementById('ap-pl-edit-desc-input');
        if (idInp) idInp.value = id;
        if (nameInp) {
            nameInp.value = pl.name || '';
            nameInp.style.borderColor = '';
        }
        if (descInp) {
            descInp.value = pl.description || pl.desc || '';
        }

        const editModal = document.getElementById(EDIT_MODAL_ID);
        if (editModal) {
            editModal.style.display = 'flex';
            requestAnimationFrame(() => {
                editModal.classList.add('active');
                setTimeout(() => {
                    if (nameInp) nameInp.focus();
                }, 100);
            });
        }
    }

    function closeEditModal() {
        const editModal = document.getElementById(EDIT_MODAL_ID);
        if (editModal && editModal.classList.contains('active')) {
            editModal.classList.remove('active');
            setTimeout(() => {
                editModal.style.display = 'none';
            }, 250);
        }
    }

    function openDeletePlaylistModal(id) {
        injectModals();
        let pl = null;
        if (typeof playlistService !== 'undefined') {
            pl = playlistService.getById(id);
        }
        if (!pl) {
            try {
                const list = JSON.parse(localStorage.getItem('cinestream_playlists') || '[]');
                pl = list.find(p => p.id === id);
            } catch(e) {}
        }
        if (!pl) return;

        const idInp = document.getElementById('ap-pl-delete-id');
        if (idInp) idInp.value = id;
        const msgEl = document.getElementById('ap-pl-delete-msg');
        if (msgEl) {
            msgEl.innerHTML = `Bạn có chắc chắn muốn xóa danh sách phát <b style="color:#ffffff;">"${escapeHtml(pl.name)}"</b>?<br><span style="font-size:12px; color:#94a3b8;">Các bộ phim bên trong sẽ không bị xóa khỏi hệ thống.</span>`;
        }

        const deleteModal = document.getElementById(DELETE_MODAL_ID);
        if (deleteModal) {
            deleteModal.style.display = 'flex';
            requestAnimationFrame(() => {
                deleteModal.classList.add('active');
            });
        }
    }

    function closeDeleteModal() {
        const deleteModal = document.getElementById(DELETE_MODAL_ID);
        if (deleteModal && deleteModal.classList.contains('active')) {
            deleteModal.classList.remove('active');
            setTimeout(() => {
                deleteModal.style.display = 'none';
            }, 250);
        }
    }

    // ── Render Playlist List ──────────────────────────────
    function renderList() {
        const container = document.getElementById('ap-pl-list');
        if (!container) return;
        if (typeof playlistService === 'undefined') {
            container.innerHTML = `
                <div class="ap-pl-empty">
                    <span class="ap-pl-empty-icon">⚠️</span>
                    <div class="ap-pl-empty-title">Không thể tải danh sách</div>
                    <div class="ap-pl-empty-desc">Vui lòng đăng nhập để lưu phim vào danh sách</div>
                </div>`;
            return;
        }

        const playlists = playlistService.getAll();
        const movie = window._apCurrentMovie;

        if (playlists.length === 0) {
            container.innerHTML = `
                <div class="ap-pl-empty">
                    <span class="ap-pl-empty-icon">📁</span>
                    <div class="ap-pl-empty-title">Chưa có danh sách phát nào</div>
                    <div class="ap-pl-empty-desc">Tạo danh sách phát đầu tiên để lưu bộ phim này và xem lại bất kỳ lúc nào!</div>
                </div>`;
            return;
        }

        container.innerHTML = playlists.map(pl => {
            const alreadyIn = movie && Array.isArray(pl.movies) && pl.movies.some(m => m.slug === movie.slug);
            return `
                <div class="ap-pl-item ${alreadyIn ? 'is-added' : ''}" data-pl-id="${pl.id}" onclick="window._apToggleMovie('${pl.id}', this)">
                    <div class="ap-pl-check" aria-hidden="true">
                        <span class="ap-pl-check-icon">✓</span>
                    </div>
                    <div class="ap-pl-item-info">
                        <div class="ap-pl-item-title">${escapeHtml(pl.name)}</div>
                        <div class="ap-pl-item-meta">
                            <span>📁</span>
                            <span class="ap-pl-count">${(pl.movies || []).length} phim</span>
                        </div>
                    </div>
                    <span class="ap-pl-item-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Đã thêm
                    </span>
                </div>
            `;
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Toggle movie in playlist ──────────────────────────
    window._apToggleMovie = function (playlistId, itemEl) {
        const movie = window._apCurrentMovie;
        if (!movie || typeof playlistService === 'undefined') return;
        const pl = playlistService.getById(playlistId);
        if (!pl) return;

        const alreadyIn = Array.isArray(pl.movies) && pl.movies.some(m => m.slug === movie.slug);
        if (alreadyIn) {
            playlistService.removeMovie(playlistId, movie.slug);
            showToast(`Đã xóa khỏi "${pl.name}"`, 'info');
            if (itemEl) {
                itemEl.classList.remove('is-added');
                const updatedPl = playlistService.getById(playlistId);
                const countEl = itemEl.querySelector('.ap-pl-count');
                if (countEl && updatedPl) countEl.textContent = `${(updatedPl.movies || []).length} phim`;
            }
        } else {
            playlistService.addMovie(playlistId, movie);
            showToast(`Đã thêm vào "${pl.name}"`, 'success');
            if (itemEl) {
                itemEl.classList.add('is-added');
                const updatedPl = playlistService.getById(playlistId);
                const countEl = itemEl.querySelector('.ap-pl-count');
                if (countEl && updatedPl) countEl.textContent = `${(updatedPl.movies || []).length} phim`;
            }
        }
    };

    // ── Public API ────────────────────────────────────────
    window.openPlaylistModal = function (movie) {
        injectModals();
        window._apCurrentMovie = movie;

        // Render Movie Preview Card
        const card = document.getElementById('ap-pl-movie-card');
        const poster = document.getElementById('ap-pl-movie-poster');
        const fallback = document.getElementById('ap-pl-movie-fallback');
        const nameEl = document.getElementById('ap-pl-movie-name');
        const yearEl = document.getElementById('ap-pl-movie-year');

        if (movie && movie.name) {
            card.style.display = 'flex';
            nameEl.textContent = movie.name;
            yearEl.textContent = movie.year || '2026';
            if (movie.thumb_url) {
                poster.src = movie.thumb_url;
                poster.style.display = 'block';
                fallback.style.display = 'none';
            } else {
                poster.style.display = 'none';
                fallback.style.display = 'flex';
                fallback.textContent = (movie.name || '🎬').charAt(0).toUpperCase();
            }
        } else {
            card.style.display = 'none';
        }

        renderList();

        const modal = document.getElementById(MODAL_ID);
        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    };

    window.openCreatePlaylistModalStandalone = function () {
        injectModals();
        window._apCurrentMovie = null;
        openCreateModal();
    };

    window.openEditPlaylistModal = openEditPlaylistModal;
    window.openDeletePlaylistModal = openDeletePlaylistModal;
    window.editPlaylist = openEditPlaylistModal;
    window.deletePlaylist = openDeletePlaylistModal;
    window._apClosePlaylistModal = closePlaylistModal;
    window._apOpenCreateModal = openCreateModal;
    window._apCloseCreateModal = closeCreateModal;
    window._apSubmitCreatePlaylist = submitCreatePlaylist;
    window._apCloseEditModal = closeEditModal;
    window._apSubmitEditPlaylist = submitEditPlaylist;
    window._apCloseDeleteModal = closeDeleteModal;
    window._apSubmitDeletePlaylist = submitDeletePlaylist;

    // ── Toast Helper ──────────────────────────────────────
    function showToast(msg, type = 'success') {
        if (typeof showMessage === 'function') {
            showMessage(msg, type);
            return;
        }
        const colors = { success: '#f59e0b', info: '#3b82f6', error: '#ef4444' };
        const t = document.createElement('div');
        t.style.cssText = `
            position: fixed; bottom: 84px; left: 50%; transform: translateX(-50%);
            background: #1e293b; border: 1.5px solid ${colors[type] || colors.success};
            color: #ffffff; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 700;
            z-index: 999999; box-shadow: 0 8px 24px rgba(0,0,0,0.5); font-family: system-ui, sans-serif;
            display: flex; align-items: center; gap: 8px; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        t.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ'}</span> <span>${msg}</span>`;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(8px)';
            setTimeout(() => t.remove(), 250);
        }, 2200);
    }
})();
