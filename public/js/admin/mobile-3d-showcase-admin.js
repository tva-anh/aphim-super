/**
 * APHIM SUPER - MOBILE 3D SHOWCASE ADMIN CONTROLLER
 * Quản lý danh sách phim hiển thị trên khối 3D Coverflow Mobile Trang chủ
 * Tích hợp gợi ý nhanh 1-click, Live Search Debounce & Tự động điền đầy đủ
 */
(function() {
    'use strict';

    let showcaseItems = [];
    let isSaving = false;
    let searchDebounceTimer = null;
    let cachedTrendingList = [];

    function getAdminToken() {
        try {
            return sessionStorage.getItem('cinestream_admin_token') || 
                   sessionStorage.getItem('aphim_admin_token') ||
                   sessionStorage.getItem('adminToken') ||
                   sessionStorage.getItem('token') ||
                   localStorage.getItem('cinestream_admin_token') || 
                   localStorage.getItem('aphim_admin_token') || 
                   localStorage.getItem('adminToken') || 
                   localStorage.getItem('token') ||
                   (document.cookie.match(/adminToken=([^;]+)/) || [])[1] || 
                   (document.cookie.match(/cinestream_admin_token=([^;]+)/) || [])[1] ||
                   (document.cookie.match(/aphim_admin_token=([^;]+)/) || [])[1] ||
                   (document.cookie.match(/token=([^;]+)/) || [])[1] ||
                   (document.cookie.match(/sb-access-token=([^;]+)/) || [])[1] || '';
        } catch (e) {
            return '';
        }
    }

    function showNotice(msg, type = 'success') {
        if (window.AdminCore && typeof window.AdminCore.showToast === 'function') {
            window.AdminCore.showToast(msg, type);
        } else {
            const existingToast = document.getElementById('showcaseAdminToast');
            if (existingToast) existingToast.remove();

            const toast = document.createElement('div');
            toast.id = 'showcaseAdminToast';
            toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999999;padding:12px 20px;border-radius:12px;background:${type === 'error' ? '#ef4444' : '#0284c7'};color:#fff;font-weight:700;font-size:13.5px;box-shadow:0 10px 30px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px;`;
            toast.innerHTML = `<span>${msg}</span>`;
            document.body.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 3500);
        }
    }

    const MobileShowcaseAdmin = {
        async init() {
            await this.loadData();
            this.bindEvents();
            this.preloadTrending();
        },

        bindEvents() {
            const openBtn = document.getElementById('btnOpenAddShowcase3D');
            if (openBtn) {
                openBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openAddModal();
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('modalAddShowcase3D');
                    if (modal && modal.style.display === 'flex') {
                        this.closeModal();
                    }
                }
            });

            // Live poster input change listener
            const posterInput = document.getElementById('scPoster');
            if (posterInput) {
                posterInput.addEventListener('input', (e) => {
                    const url = e.target.value.trim();
                    const name = document.getElementById('scName')?.value || 'Phim mới';
                    const year = document.getElementById('scYear')?.value || '';
                    this.updatePosterPreview(url, name, year);
                });
            }
        },

        async preloadTrending() {
            try {
                const res = await fetch('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
                const data = await res.json();
                if (data.status === true && data.items?.length) {
                    cachedTrendingList = data.items;
                }
            } catch (e) {}
        },

        async loadData() {
            const container = document.getElementById('mobileShowcaseList');
            if (!container) return;

            try {
                const res = await fetch('/api/settings/mobile-3d-showcase?t=' + Date.now());
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    showcaseItems = data.data;
                    this.renderList();
                } else {
                    container.innerHTML = '<div style="color:#ef4444;text-align:center;padding:20px;">Không thể tải dữ liệu 3D Showcase</div>';
                }
            } catch (e) {
                console.error('Lỗi load mobile showcase:', e);
                container.innerHTML = '<div style="color:#ef4444;text-align:center;padding:20px;">Lỗi kết nối máy chủ</div>';
            }
        },

        renderList() {
            const container = document.getElementById('mobileShowcaseList');
            if (!container) return;

            if (!showcaseItems.length) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px dashed rgba(255,255,255,0.15);">
                        <i data-lucide="film" style="width: 38px; height: 38px; color: #64748b; margin: 0 auto 10px auto;"></i>
                        <p style="color: #94a3b8; font-size: 13.5px; margin: 0 0 12px 0;">Chưa có phim nào trong danh sách 3D Showcase Mobile.</p>
                        <button class="btn btn-outline" onclick="MobileShowcaseAdmin.openAddModal()" style="border-color:#38bdf8;color:#38bdf8;">
                            <i data-lucide="plus"></i> Thêm Phim Đầu Tiên
                        </button>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            container.innerHTML = showcaseItems.map((item, idx) => `
                <div class="glass-card" style="display: flex; gap: 14px; padding: 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; background: rgba(15, 23, 42, 0.65); position: relative;">
                    <!-- Badge Order Number -->
                    <div style="position: absolute; top: 10px; left: 10px; z-index: 5; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                        #${idx + 1}
                    </div>

                    <!-- Poster -->
                    <div style="width: 80px; height: 115px; flex-shrink: 0; border-radius: 10px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.15);">
                        <img src="${item.poster_url || item.thumb_url || ''}" alt="${item.name || ''}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://phimimg.com/upload/vod/20240506-1/3ea3a7267104b2bfe6f481c4e72750db.jpg'">
                    </div>

                    <!-- Info -->
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="color: #ffffff; font-size: 13.5px; font-weight: 700; margin: 0 0 3px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name || ''}">
                                ${item.name || 'Chưa đặt tên'}
                            </h4>
                            <div style="color: #64748b; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6px;">
                                ${item.origin_name || item.slug || ''}
                            </div>
                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${item.quality || 'FHD'}</span>
                                <span style="background: rgba(255, 255, 255, 0.08); color: #cbd5e1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${item.year || '2026'}</span>
                                <span style="background: rgba(255, 255, 255, 0.08); color: #cbd5e1; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${item.lang || 'Vietsub'}</span>
                            </div>
                        </div>

                        <!-- Actions (Move Up, Move Down, Edit, Remove) -->
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 8px;">
                            <button type="button" class="btn btn-xs btn-outline" onclick="MobileShowcaseAdmin.moveItem(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Đưa lên trên">
                                <i data-lucide="arrow-up" style="width:13px;height:13px;"></i>
                            </button>
                            <button type="button" class="btn btn-xs btn-outline" onclick="MobileShowcaseAdmin.moveItem(${idx}, 1)" ${idx === showcaseItems.length - 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} title="Đưa xuống dưới">
                                <i data-lucide="arrow-down" style="width:13px;height:13px;"></i>
                            </button>
                            <button type="button" class="btn btn-xs btn-outline" onclick="MobileShowcaseAdmin.editItem(${idx})" title="Chỉnh sửa">
                                <i data-lucide="edit" style="width:13px;height:13px;"></i>
                            </button>
                            <button type="button" class="btn btn-xs btn-danger" onclick="MobileShowcaseAdmin.removeItem(${idx})" title="Xóa khỏi 3D Showcase">
                                <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            if (window.lucide) window.lucide.createIcons();
        },

        async moveItem(index, direction) {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= showcaseItems.length) return;

            const temp = showcaseItems[index];
            showcaseItems[index] = showcaseItems[targetIndex];
            showcaseItems[targetIndex] = temp;

            this.renderList();
            await this.saveConfig(true);
        },

        async removeItem(index) {
            const item = showcaseItems[index];
            if (!item) return;
            if (confirm(`Bạn có chắc muốn xóa phim "${item.name}" khỏi 3D Showcase Mobile?`)) {
                showcaseItems.splice(index, 1);
                this.renderList();
                await this.saveConfig(true);
                showNotice(`Đã xóa phim "${item.name}" khỏi 3D Showcase`, 'info');
            }
        },

        editItem(index) {
            const item = showcaseItems[index];
            if (!item) return;
            this.openAddModal(item, index);
        },

        openAddModal(existingItem = null, editIndex = -1) {
            const modal = document.getElementById('modalAddShowcase3D');
            if (!modal) return;

            const titleEl = document.getElementById('modalShowcase3DTitle');
            if (titleEl) {
                titleEl.textContent = editIndex >= 0 ? '✏️ Chỉnh Sửa Phim 3D Showcase' : '✨ Thêm Phim Mới Vào 3D Showcase Mobile';
            }

            const editIndexInput = document.getElementById('scEditIndex');
            if (editIndexInput) editIndexInput.value = editIndex;

            if (document.getElementById('scName')) document.getElementById('scName').value = existingItem?.name || '';
            if (document.getElementById('scOriginName')) document.getElementById('scOriginName').value = existingItem?.origin_name || '';
            if (document.getElementById('scSlug')) document.getElementById('scSlug').value = existingItem?.slug || '';
            if (document.getElementById('scPoster')) document.getElementById('scPoster').value = existingItem?.poster_url || existingItem?.thumb_url || '';
            if (document.getElementById('scQuality')) document.getElementById('scQuality').value = existingItem?.quality || 'FHD';
            if (document.getElementById('scYear')) document.getElementById('scYear').value = existingItem?.year || '2026';
            if (document.getElementById('scLang')) document.getElementById('scLang').value = existingItem?.lang || 'Vietsub Full';
            if (document.getElementById('scContent')) document.getElementById('scContent').value = existingItem?.content || '';

            const posterUrl = existingItem?.poster_url || existingItem?.thumb_url || '';
            if (posterUrl) {
                this.updatePosterPreview(posterUrl, existingItem?.name || '', existingItem?.year || '');
            } else {
                const previewWrap = document.getElementById('scPosterPreviewWrap');
                if (previewWrap) previewWrap.style.display = 'none';
            }

            const searchInput = document.getElementById('inputSearchMovieAPI');
            if (searchInput) searchInput.value = '';

            modal.style.display = 'flex';
            if (window.lucide) window.lucide.createIcons();

            // Hiển thị danh sách phim hot gợi ý ngay khi mở modal nếu chưa gõ gì
            if (editIndex === -1) {
                this.renderTrendingSuggestions();
            } else {
                const resultsBox = document.getElementById('apiSearchResults');
                if (resultsBox) resultsBox.style.display = 'none';
            }

            if (searchInput) setTimeout(() => searchInput.focus(), 150);
        },

        closeModal() {
            const modal = document.getElementById('modalAddShowcase3D');
            if (modal) modal.style.display = 'none';
        },

        quickSearch(keyword) {
            const searchInput = document.getElementById('inputSearchMovieAPI');
            if (searchInput) {
                searchInput.value = keyword;
                this.searchMovieFromAPI(keyword);
            }
        },

        handleSearchInput(val) {
            clearTimeout(searchDebounceTimer);
            const query = (val || '').trim();
            if (!query) {
                this.renderTrendingSuggestions();
                return;
            }
            if (query.length < 2) return;

            const indicator = document.getElementById('searchLoadingIndicator');
            if (indicator) indicator.style.display = 'inline';

            searchDebounceTimer = setTimeout(() => {
                this.searchMovieFromAPI(query);
            }, 300);
        },

        renderTrendingSuggestions() {
            const resultsBox = document.getElementById('apiSearchResults');
            if (!resultsBox) return;

            if (cachedTrendingList.length > 0) {
                resultsBox.style.display = 'flex';
                resultsBox.innerHTML = `
                    <div style="font-size:11.5px;color:#38bdf8;font-weight:700;padding:2px 4px;display:flex;align-items:center;gap:6px;">
                        <span>🔥 Phim Mới Cập Nhật / Đề Cử Nhanh:</span>
                    </div>
                ` + cachedTrendingList.slice(0, 6).map(m => {
                    const poster = m.poster_url || m.thumb_url || '';
                    const fullPoster = poster.startsWith('http') ? poster : `https://phimimg.com/${poster.replace(/^\//, '')}`;
                    const jsonStr = JSON.stringify({
                        name: m.name || '',
                        origin_name: m.origin_name || '',
                        slug: m.slug || '',
                        poster_url: fullPoster,
                        year: String(m.year || '2026'),
                        quality: m.quality || 'FHD',
                        lang: m.lang || 'Vietsub Full',
                        content: m.content ? m.content.replace(/<[^>]*>/g, '').trim() : ''
                    }).replace(/"/g, '&quot;');

                    return `
                        <div onclick="MobileShowcaseAdmin.selectSearchMovie('${jsonStr}')" style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(255,255,255,0.06);border-radius:8px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(56,189,248,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                            <img src="${fullPoster}" style="width:34px;height:48px;border-radius:6px;object-fit:cover;background:#000;flex-shrink:0;" onerror="this.src='https://phimimg.com/upload/vod/20240506-1/3ea3a7267104b2bfe6f481c4e72750db.jpg'">
                            <div style="flex:1;min-width:0;">
                                <div style="color:#ffffff;font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.name}</div>
                                <div style="color:#94a3b8;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.origin_name || ''} • <span style="color:#38bdf8;font-weight:700;">${m.year || ''}</span></div>
                            </div>
                            <span style="color:#38bdf8;font-size:11.5px;font-weight:800;background:rgba(56,189,248,0.18);padding:3px 8px;border-radius:5px;flex-shrink:0;">Chọn ➔</span>
                        </div>
                    `;
                }).join('');
            } else {
                resultsBox.style.display = 'none';
            }
        },

        async searchMovieFromAPI(manualQuery = '') {
            const query = manualQuery || document.getElementById('inputSearchMovieAPI')?.value.trim();
            const resultsBox = document.getElementById('apiSearchResults');
            const indicator = document.getElementById('searchLoadingIndicator');
            if (!query || !resultsBox) return;

            resultsBox.style.display = 'flex';
            resultsBox.innerHTML = '<div style="color:#38bdf8;font-size:12px;padding:8px;text-align:center;">⏳ Đang tìm kiếm phim...</div>';
            if (indicator) indicator.style.display = 'inline';

            try {
                let list = [];
                // 1. PhimAPI search
                try {
                    const res1 = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=10&page=1`);
                    const data1 = await res1.json();
                    if (data1.status === 'success' && data1.data?.items?.length) {
                        list = data1.data.items;
                    }
                } catch(e) {}

                // 2. Ophim fallback
                if (!list.length) {
                    try {
                        const res2 = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`);
                        const data2 = await res2.json();
                        if (data2.data?.items?.length) {
                            list = data2.data.items;
                        }
                    } catch(e) {}
                }

                // 3. NguonC fallback
                if (!list.length) {
                    try {
                        const res3 = await fetch(`https://phim.nguonc.com/api/films/search?name=${encodeURIComponent(query)}`);
                        const data3 = await res3.json();
                        if (data3.items && Array.isArray(data3.items)) {
                            list = data3.items.map(it => ({
                                name: it.name,
                                origin_name: it.original_name,
                                slug: it.slug,
                                poster_url: it.poster_url || it.thumb_url,
                                year: it.year,
                                quality: it.quality,
                                lang: it.language,
                                content: it.description
                            }));
                        }
                    } catch(e) {}
                }

                if (!list.length) {
                    resultsBox.innerHTML = '<div style="color:#94a3b8;font-size:12px;padding:8px;text-align:center;">Không tìm thấy phim phù hợp với từ khóa "' + query + '". Bạn có thể tự điền vào form bên dưới.</div>';
                    return;
                }

                resultsBox.innerHTML = `
                    <div style="font-size:11.5px;color:#38bdf8;font-weight:700;padding:2px 4px;">
                        ✨ Kết quả tìm kiếm (${list.length} phim):
                    </div>
                ` + list.slice(0, 8).map(m => {
                    const poster = m.poster_url || m.thumb_url || '';
                    const fullPoster = poster.startsWith('http') ? poster : `https://phimimg.com/${poster.replace(/^\//, '')}`;
                    const jsonStr = JSON.stringify({
                        name: m.name || '',
                        origin_name: m.origin_name || '',
                        slug: m.slug || '',
                        poster_url: fullPoster,
                        year: String(m.year || '2026'),
                        quality: m.quality || 'FHD',
                        lang: m.lang || 'Vietsub Full',
                        content: m.content ? m.content.replace(/<[^>]*>/g, '').trim() : ''
                    }).replace(/"/g, '&quot;');

                    return `
                        <div onclick="MobileShowcaseAdmin.selectSearchMovie('${jsonStr}')" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.06);border-radius:8px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(56,189,248,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                            <img src="${fullPoster}" style="width:34px;height:48px;border-radius:6px;object-fit:cover;background:#000;flex-shrink:0;" onerror="this.src='https://phimimg.com/upload/vod/20240506-1/3ea3a7267104b2bfe6f481c4e72750db.jpg'">
                            <div style="flex:1;min-width:0;">
                                <div style="color:#ffffff;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.name}</div>
                                <div style="color:#94a3b8;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.origin_name || ''} • <span style="color:#38bdf8;font-weight:700;">${m.year || ''}</span> • ${m.lang || 'Vietsub'}</div>
                            </div>
                            <span style="color:#38bdf8;font-size:12px;font-weight:800;background:rgba(56,189,248,0.18);padding:4px 10px;border-radius:6px;flex-shrink:0;">Chọn ➔</span>
                        </div>
                    `;
                }).join('');
            } catch (err) {
                resultsBox.innerHTML = `<div style="color:#ef4444;font-size:12px;padding:6px;">Lỗi tìm kiếm: ${err.message}</div>`;
            } finally {
                if (indicator) indicator.style.display = 'none';
            }
        },

        async selectSearchMovie(jsonStr) {
            try {
                const m = JSON.parse(jsonStr.replace(/&quot;/g, '"'));
                if (document.getElementById('scName')) document.getElementById('scName').value = m.name || '';
                if (document.getElementById('scOriginName')) document.getElementById('scOriginName').value = m.origin_name || '';
                if (document.getElementById('scSlug')) document.getElementById('scSlug').value = m.slug || '';
                if (document.getElementById('scPoster')) document.getElementById('scPoster').value = m.poster_url || '';
                if (document.getElementById('scQuality')) document.getElementById('scQuality').value = m.quality || 'FHD';
                if (document.getElementById('scYear')) document.getElementById('scYear').value = m.year || '2026';
                if (document.getElementById('scLang')) document.getElementById('scLang').value = m.lang || 'Vietsub Full';

                const contentEl = document.getElementById('scContent');
                if (contentEl) {
                    contentEl.value = m.content || '';
                    if (!m.content) {
                        contentEl.placeholder = '⏳ Đang tự động lấy tóm tắt nội dung phim...';
                    }
                }

                this.updatePosterPreview(m.poster_url, m.name, m.year);

                const resultsBox = document.getElementById('apiSearchResults');
                if (resultsBox) resultsBox.style.display = 'none';

                showNotice(`Đã chọn phim "${m.name}". Đang đồng bộ nội dung...`, 'info');

                // Tự động fetch nội dung chi tiết từ API nếu chưa có hoặc cập nhật đầy đủ nhất
                if (m.slug) {
                    await this.fetchAndFillMovieDetails(m.slug);
                }
            } catch (e) {
                console.error('Lỗi parse movie json:', e);
            }
        },

        async fetchAndFillMovieDetails(slug) {
            if (!slug) return;
            const contentEl = document.getElementById('scContent');

            try {
                let detail = null;

                // 1. PhimAPI detail
                try {
                    const res = await fetch(`https://phimapi.com/phim/${encodeURIComponent(slug)}`);
                    const data = await res.json();
                    if (data.status === true && data.movie) {
                        detail = data.movie;
                    }
                } catch(e) {}

                // 2. Ophim detail fallback
                if (!detail) {
                    try {
                        const res2 = await fetch(`https://ophim1.com/phim/${encodeURIComponent(slug)}`);
                        const data2 = await res2.json();
                        if (data2.status === 'success' && data2.data?.item) {
                            detail = data2.data.item;
                        }
                    } catch(e) {}
                }

                // 3. NguonC detail fallback
                if (!detail) {
                    try {
                        const res3 = await fetch(`https://phim.nguonc.com/api/film/${encodeURIComponent(slug)}`);
                        const data3 = await res3.json();
                        if (data3.movie) {
                            detail = data3.movie;
                        }
                    } catch(e) {}
                }

                if (detail) {
                    // Clean HTML tags and entities
                    let rawContent = detail.content || detail.description || '';
                    let cleanContent = rawContent
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (cleanContent && contentEl) {
                        contentEl.value = cleanContent;
                        contentEl.placeholder = 'Nội dung ngắn của phim...';
                    }

                    // Update extra info if available
                    if (detail.quality && document.getElementById('scQuality')) {
                        document.getElementById('scQuality').value = detail.quality;
                    }
                    if (detail.year && document.getElementById('scYear')) {
                        document.getElementById('scYear').value = String(detail.year);
                    }
                    if (detail.lang && document.getElementById('scLang')) {
                        document.getElementById('scLang').value = detail.lang;
                    }

                    // High res poster fallback
                    const fullPoster = detail.poster_url || detail.thumb_url;
                    if (fullPoster && document.getElementById('scPoster')) {
                        const resolvedPoster = fullPoster.startsWith('http') ? fullPoster : `https://phimimg.com/${fullPoster.replace(/^\//, '')}`;
                        document.getElementById('scPoster').value = resolvedPoster;
                        this.updatePosterPreview(resolvedPoster, detail.name, detail.year);
                    }

                    showNotice('✅ Đã tự động lấy trọn vẹn tóm tắt nội dung phim!', 'success');
                }
            } catch (err) {
                console.warn('Không thể tự động tải chi tiết phim:', err);
                if (contentEl) contentEl.placeholder = 'Nội dung ngắn của phim...';
            }
        },

        updatePosterPreview(url, name = '', year = '') {
            const wrap = document.getElementById('scPosterPreviewWrap');
            const img = document.getElementById('scPosterPreviewImg');
            const title = document.getElementById('scPosterPreviewTitle');
            const meta = document.getElementById('scPosterPreviewMeta');

            if (!wrap || !img) return;
            if (!url) {
                wrap.style.display = 'none';
                return;
            }

            img.src = url;
            if (title) title.textContent = name || 'Chưa đặt tên phim';
            if (meta) meta.textContent = `Năm: ${year || '2026'} • Đã sẵn sàng lưu`;
            wrap.style.display = 'flex';
        },

        async submitForm(e) {
            if (e) e.preventDefault();
            const editIndex = parseInt(document.getElementById('scEditIndex')?.value || '-1', 10);
            const name = document.getElementById('scName')?.value.trim();
            const origin_name = document.getElementById('scOriginName')?.value.trim();
            const slug = document.getElementById('scSlug')?.value.trim();
            const poster_url = document.getElementById('scPoster')?.value.trim();
            const quality = document.getElementById('scQuality')?.value.trim() || 'FHD';
            const year = document.getElementById('scYear')?.value.trim() || '2026';
            const lang = document.getElementById('scLang')?.value.trim() || 'Vietsub Full';
            const content = document.getElementById('scContent')?.value.trim() || '';

            if (!name || !slug || !poster_url) {
                alert('Vui lòng điền đầy đủ Tên phim, Slug và Link Poster!');
                return;
            }

            const item = {
                name,
                origin_name,
                slug,
                poster_url,
                thumb_url: poster_url,
                quality,
                year,
                lang,
                content
            };

            if (editIndex >= 0 && editIndex < showcaseItems.length) {
                showcaseItems[editIndex] = item;
            } else {
                showcaseItems.push(item);
            }

            this.closeModal();
            this.renderList();

            // Auto-save immediately
            const ok = await this.saveConfig(false);
            if (ok) {
                showNotice(`🎉 Đã thêm/cập nhật phim "${name}" thành công!`, 'success');
            }
        },

        async saveConfig(isSilent = false) {
            if (isSaving) return false;
            const btn = document.getElementById('btnSave3DShowcase');
            const token = getAdminToken();

            try {
                isSaving = true;
                if (btn && !isSilent) {
                    btn.disabled = true;
                    btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Đang lưu...';
                }

                const res = await fetch('/api/settings/mobile-3d-showcase', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ items: showcaseItems })
                });

                const data = await res.json();
                if (data.success) {
                    if (!isSilent) {
                        alert('🎉 Đã lưu cấu hình Showcase 3D Mobile thành công! Giao diện điện thoại đã được cập nhật.');
                    } else {
                        showNotice('Đã lưu thay đổi vào hệ thống', 'success');
                    }
                    return true;
                } else {
                    if (!isSilent) {
                        alert('❌ Lỗi khi lưu: ' + (data.message || 'Thao tác thất bại'));
                    } else {
                        showNotice('Lỗi khi lưu: ' + (data.message || 'Thất bại'), 'error');
                    }
                    return false;
                }
            } catch (err) {
                if (!isSilent) {
                    alert('❌ Lỗi kết nối: ' + err.message);
                } else {
                    showNotice('Lỗi kết nối máy chủ', 'error');
                }
                return false;
            } finally {
                isSaving = false;
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i data-lucide="save"></i> Lưu Cấu Hình 3D Mobile';
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        }
    };

    window.MobileShowcaseAdmin = MobileShowcaseAdmin;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            MobileShowcaseAdmin.init();
        });
    } else {
        MobileShowcaseAdmin.init();
    }
})();
