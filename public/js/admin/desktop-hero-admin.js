/**
 * APHIM SUPER - DESKTOP HERO SHOWCASE & INTERESTS ADMIN CONTROLLER
 * - Giao diện gọn gàng, trực quan, thao tác nhanh trên 1 màn hình
 * - Kéo thả chuột (Drag & Drop) 7 phim Hero mượt mà
 * - Tìm kiếm phim & Chọn Backdrop/Poster cho "Bạn đang quan tâm gì?"
 * - Nút Đóng / Esc / Click ngoài backdrop hoạt động 100%
 * - Nút "Không Dùng Logo" hiển thị 1 dòng chuẩn xác
 * - Toàn bộ thông báo & xác nhận đều dùng giao diện in-app Enterprise Toast & Dialog riêng biệt
 */
(function() {
    'use strict';

    let heroSlides = [];
    let interestsCards = [];
    let isSavingHero = false;
    let searchDebounceTimer = null;
    let interestSearchDebounce = null;
    let cachedTrendingList = [];
    let currentLoadedBackdrops = [];
    let currentLoadedLogos = [];
    let draggedHeroIndex = null;

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

    // ================================================================
    // ENTERPRISE IN-APP NOTIFICATION & CONFIRMATION DIALOG (NO BROWSER ALERTS)
    // ================================================================
    const AdminNotice = {
        toast(msg, type = 'success') {
            const existing = document.getElementById('adminEnterpriseToast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.id = 'adminEnterpriseToast';
            
            const bgColor = type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' :
                            type === 'info' ? 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)' :
                            'linear-gradient(135deg, #10b981 0%, #047857 100%)';
            const iconSymbol = type === 'error' ? '✕' : type === 'info' ? 'ℹ' : '✓';

            toast.style.cssText = `
                position: fixed;
                bottom: 28px;
                right: 28px;
                z-index: 99999999;
                padding: 14px 22px;
                border-radius: 14px;
                background: ${bgColor};
                color: #ffffff;
                font-size: 13.5px;
                font-weight: 700;
                box-shadow: 0 15px 35px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.25);
                display: flex;
                align-items: center;
                gap: 12px;
                backdrop-filter: blur(14px);
                transition: transform 0.25s ease, opacity 0.25s ease;
                max-width: 420px;
            `;

            toast.innerHTML = `
                <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.25);font-size:12.5px;font-weight:900;flex-shrink:0;">${iconSymbol}</span>
                <span style="line-height:1.4;">${msg}</span>
            `;

            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(() => toast.remove(), 250);
            }, 3200);
        },

        confirm(title, message, onConfirm, onCancel) {
            const existing = document.getElementById('adminConfirmModal');
            if (existing) existing.remove();

            const backdrop = document.createElement('div');
            backdrop.id = 'adminConfirmModal';
            backdrop.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(10px);
                z-index: 999999999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
            `;

            backdrop.innerHTML = `
                <div class="glass-card" style="width: 100%; max-width: 440px; background: #0f172a; border: 1.5px solid rgba(245, 158, 11, 0.5); border-radius: 18px; padding: 22px; box-shadow: 0 25px 60px rgba(0,0,0,0.95);">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                        <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center; color: #f59e0b; font-size: 18px; flex-shrink: 0;">
                            ⚠️
                        </div>
                        <h3 style="font-size: 16px; font-weight: 800; color: #ffffff; margin: 0;">${title || 'Xác nhận'}</h3>
                    </div>
                    <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">${message}</p>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button id="btnAdminConfirmCancel" type="button" style="padding: 9px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; color: #e2e8f0; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); transition: all 0.2s ease;">Hủy Bỏ</button>
                        <button id="btnAdminConfirmOk" type="button" style="padding: 9px 22px; border-radius: 10px; cursor: pointer; font-weight: 800; font-size: 13px; color: #ffffff !important; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important; border: 1px solid rgba(255, 255, 255, 0.25) !important; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.45); transition: all 0.2s ease;">Đồng Ý</button>
                    </div>
                </div>
            `;

            document.body.appendChild(backdrop);

            const close = () => backdrop.remove();

            backdrop.querySelector('#btnAdminConfirmCancel').onclick = () => {
                close();
                if (onCancel) onCancel();
            };

            backdrop.querySelector('#btnAdminConfirmOk').onclick = () => {
                close();
                if (onConfirm) onConfirm();
            };

            backdrop.onclick = (e) => {
                if (e.target === backdrop) close();
            };
        }
    };

    window.AdminNotice = AdminNotice;

    const DesktopHeroAdmin = {
        async init() {
            const hasHero = document.getElementById('desktopHeroSpotlightCol') || document.getElementById('desktopHeroSplitLayout') || document.getElementById('desktopHeroList');
            const hasInterests = document.getElementById('interestsAdminList');
            if (!hasHero && !hasInterests) return;

            // Render immediately from memory cache if available to prevent any layout delay
            if (heroSlides && heroSlides.length) this.renderHeroList();
            if (interestsCards && interestsCards.length) this.renderInterestsList();

            this.bindEvents();
            await this.loadData();

            // Preload trending movies in background idle time
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => this.preloadTrending());
            } else {
                setTimeout(() => this.preloadTrending(), 1000);
            }
        },

        bindEvents() {
            if (this._eventsBound) return;
            this._eventsBound = true;

            const openHeroBtn = document.getElementById('btnOpenAddDesktopHero');
            if (openHeroBtn) {
                openHeroBtn.onclick = (e) => {
                    e.preventDefault();
                    this.openHeroModal();
                };
            }

            // Close modals on Backdrop Click
            const heroModal = document.getElementById('modalAddDesktopHero');
            if (heroModal) {
                heroModal.addEventListener('click', (e) => {
                    if (e.target === heroModal) this.closeHeroModal();
                });
            }

            const intModal = document.getElementById('modalEditInterestsCard');
            if (intModal) {
                intModal.addEventListener('click', (e) => {
                    if (e.target === intModal) this.closeInterestsModal();
                });
            }

            const mobModal = document.getElementById('modalAddShowcase3D');
            if (mobModal) {
                mobModal.addEventListener('click', (e) => {
                    if (e.target === mobModal && window.MobileShowcaseAdmin) window.MobileShowcaseAdmin.closeModal();
                });
            }

            // Escape key listener for all modals
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeHeroModal();
                    this.closeInterestsModal();
                    if (window.MobileShowcaseAdmin) window.MobileShowcaseAdmin.closeModal();
                }
            });

            // Live inputs preview
            const backdropInput = document.getElementById('dhImageUrl');
            if (backdropInput) backdropInput.oninput = () => this.updateLiveMockupPreview();

            const logoInput = document.getElementById('dhLogoUrl');
            if (logoInput) logoInput.oninput = () => this.updateLiveMockupPreview();

            const nameInput = document.getElementById('dhName');
            if (nameInput) nameInput.oninput = () => this.updateLiveMockupPreview();

            const originInput = document.getElementById('dhOriginName');
            if (originInput) originInput.oninput = () => this.updateLiveMockupPreview();
        },

        async preloadTrending() {
            if (cachedTrendingList && cachedTrendingList.length > 0) return;
            try {
                const res = await fetch('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
                const data = await res.json();
                if (data.status === true && data.items?.length) {
                    cachedTrendingList = data.items;
                }
            } catch (e) {}
        },

        autoSlideState: {
            enabled: true,
            interval: 6,
            pauseOnHover: true
        },

        async loadData() {
            try {
                const [heroRes, intRes, autoRes] = await Promise.all([
                    fetch('/api/settings/desktop-hero-showcase?t=' + Date.now()).then(r => r.json()).catch(() => ({ success: false })),
                    fetch('/api/settings/desktop-interests?t=' + Date.now()).then(r => r.json()).catch(() => ({ success: false })),
                    fetch('/api/settings/desktop-hero-autoslide?t=' + Date.now()).then(r => r.json()).catch(() => ({ success: false }))
                ]);

                if (heroRes && heroRes.success && Array.isArray(heroRes.data)) {
                    heroSlides = heroRes.data;
                    this.renderHeroList();
                }
                if (intRes && intRes.success && Array.isArray(intRes.data)) {
                    interestsCards = intRes.data;
                    this.renderInterestsList();
                }
                if (autoRes && autoRes.success && autoRes.data) {
                    this.renderAutoSlideControls(autoRes.data);
                }
            } catch (e) {
                console.error('Lỗi load desktop hero slides & interests:', e);
            }
        },

        // ================================================================
        // AUTO-SLIDE CONTROLS (TỰ ĐỘNG CHUYỂN HERO BANNER THEO GIÂY)
        // ================================================================
        renderAutoSlideControls(data) {
            if (!data) return;
            this.autoSlideState.enabled = typeof data.enabled === 'boolean' ? data.enabled : true;
            const parsed = parseInt(data.interval, 10);
            this.autoSlideState.interval = Math.min(10, Math.max(3, !isNaN(parsed) ? parsed : 6));
            this.autoSlideState.pauseOnHover = typeof data.pauseOnHover === 'boolean' ? data.pauseOnHover : true;

            const toggleEl = document.getElementById('heroAutoSlideToggle');
            const intervalEl = document.getElementById('heroAutoSlideIntervalInput');
            const pauseEl = document.getElementById('heroAutoSlidePauseOnHover');
            const badgeEl = document.getElementById('heroAutoSlideStatusBadge');

            if (toggleEl) toggleEl.checked = this.autoSlideState.enabled;
            if (intervalEl) intervalEl.value = this.autoSlideState.interval;
            if (pauseEl) pauseEl.checked = this.autoSlideState.pauseOnHover;
            if (badgeEl) {
                if (this.autoSlideState.enabled) {
                    badgeEl.textContent = `Đang Bật (${this.autoSlideState.interval}s/phim)`;
                    badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
                    badgeEl.style.color = '#34d399';
                    badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                } else {
                    badgeEl.textContent = 'Đã Tắt';
                    badgeEl.style.background = 'rgba(148, 163, 184, 0.12)';
                    badgeEl.style.color = '#94a3b8';
                    badgeEl.style.borderColor = 'rgba(148, 163, 184, 0.25)';
                }
            }
        },

        handleAutoSlideToggle(checked) {
            this.autoSlideState.enabled = !!checked;
            this.renderAutoSlideControls(this.autoSlideState);
            this.saveAutoSlideConfig();
        },

        handleAutoSlideIntervalInput(val) {
            let num = parseInt(val, 10);
            if (isNaN(num)) num = 6;
            // GIỚI HẠN TUYỆT ĐỐI: 3s <= num <= 10s (Không quá 10s)
            if (num > 10) {
                num = 10;
                const el = document.getElementById('heroAutoSlideIntervalInput');
                if (el) el.value = 10;
                AdminNotice.toast('Giới hạn thời gian tự động chuyển tối đa là 10 giây!', 'info');
            }
            if (num < 3 && val !== '') {
                num = 3;
            }
            this.autoSlideState.interval = num;
            this.renderAutoSlideControls(this.autoSlideState);
            this.saveAutoSlideConfigDebounced();
        },

        setAutoSlidePreset(seconds) {
            let num = Math.min(10, Math.max(3, parseInt(seconds, 10) || 6));
            this.autoSlideState.interval = num;
            this.autoSlideState.enabled = true;
            this.renderAutoSlideControls(this.autoSlideState);
            this.saveAutoSlideConfig();
            AdminNotice.toast(`⏱️ Đã chọn tự động chuyển mỗi ${num} giây!`, 'success');
        },

        handleAutoSlidePauseHover(checked) {
            this.autoSlideState.pauseOnHover = !!checked;
            this.saveAutoSlideConfig();
        },

        saveAutoSlideConfigDebounced() {
            if (this._autoSlideSaveTimer) clearTimeout(this._autoSlideSaveTimer);
            this._autoSlideSaveTimer = setTimeout(() => {
                this.saveAutoSlideConfig();
            }, 500);
        },

        async saveAutoSlideConfig() {
            try {
                const token = getAdminToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = 'Bearer ' + token;

                const res = await fetch('/api/settings/desktop-hero-autoslide', {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(this.autoSlideState)
                });
                const data = await res.json();
                if (data.success) {
                    AdminNotice.toast(data.message || 'Đã lưu cấu hình tự động chuyển!', 'success');
                }
            } catch (err) {
                console.warn('Lỗi lưu cấu hình AutoSlide:', err);
            }
        },

        // ================================================================
        // RENDER HERO SLIDES SPLIT 2-PART VIEW (HERO #1 + THUMBNAILS STRIP)
        // ================================================================
        renderHeroList() {
            const spotlightContainer = document.getElementById('desktopHeroSpotlightCol');
            const thumbnailsContainer = document.getElementById('desktopHeroThumbnailsCol');
            const titleEl = document.getElementById('desktopHeroSectionTitle');
            
            if (titleEl) {
                titleEl.textContent = `Hero Showcase Điện Ảnh Desktop (${heroSlides.length} Phim: 1 Banner Chính + ${Math.max(0, heroSlides.length - 1)} Thumbnails)`;
            }

            if (!spotlightContainer || !thumbnailsContainer) {
                const legacyContainer = document.getElementById('desktopHeroList');
                if (legacyContainer) legacyContainer.innerHTML = '';
                return;
            }

            if (!heroSlides.length) {
                spotlightContainer.innerHTML = `
                    <div class="hero-part-panel" style="text-align: center; padding: 30px 20px;">
                        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 12px 0;">Chưa có phim Hero nào.</p>
                        <button class="btn btn-outline" onclick="DesktopHeroAdmin.openHeroModal()" style="border-color:#f59e0b;color:#f59e0b;">
                            <i data-lucide="plus"></i> Thêm Phim Đầu Tiên
                        </button>
                    </div>
                `;
                thumbnailsContainer.innerHTML = '';
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            // ── CỘT 1: 👑 HERO BANNER SPOTLIGHT CHÍNH (#1 MẶC ĐỊNH) ──
            const mainHero = heroSlides[0];
            const mainBackdrop = mainHero.imageUrl || mainHero.thumb_url || mainHero.thumbUrl || mainHero.posterUrl || '';
            const mainLogo = mainHero.logoUrl || '';
            const mainRating = (mainHero.imdb && mainHero.imdb.vote_average) || (mainHero.tmdb && mainHero.tmdb.vote_average) || '9.5';
            const mainDesc = (mainHero.content || '').replace(/<[^>]*>/g, '').trim();
            const shortDesc = mainDesc.length > 150 ? mainDesc.substring(0, 145) + '...' : (mainDesc || 'Chưa có mô tả tóm tắt.');

            spotlightContainer.innerHTML = `
                <div class="hero-part-panel" style="border-color: rgba(245, 158, 11, 0.4); background: linear-gradient(180deg, rgba(20, 27, 45, 0.95) 0%, rgba(10, 14, 25, 0.98) 100%);">
                    <div class="hero-part-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 6px; box-shadow: 0 2px 10px rgba(245,158,11,0.4);">
                                👑 BANNER CHÍNH #1
                            </span>
                            <span style="color: #ffffff; font-size: 13.5px; font-weight: 800;">Mở Đầu Trang Chủ</span>
                        </div>
                        <span style="color: #64748b; font-size: 11px;">Mặc định</span>
                    </div>

                    <!-- Large Spotlight Preview Card -->
                    <div class="hero-spotlight-card"
                         draggable="true"
                         data-index="0"
                         ondragstart="DesktopHeroAdmin.handleDragStart(event, 0)"
                         ondragover="DesktopHeroAdmin.handleDragOver(event, 0)"
                         ondragleave="DesktopHeroAdmin.handleDragLeave(event)"
                         ondrop="DesktopHeroAdmin.handleDrop(event, 0)"
                         ondragend="DesktopHeroAdmin.handleDragEnd(event)"
                         style="cursor: grab;">
                        
                        <div class="hero-spotlight-preview">
                            <img src="${mainBackdrop}" alt="${mainHero.name}" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.9);" onerror="this.src='https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg'">
                            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(8,10,18,0.95) 100%);"></div>

                            <!-- Logo TMDB or Title Overlay -->
                            <div style="position: absolute; bottom: 10px; left: 14px; right: 14px; z-index: 5;">
                                ${mainLogo ? `
                                    <img src="${mainLogo}" alt="${mainHero.name}" style="max-height: 44px; max-width: 220px; object-fit: contain; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.95));">
                                ` : `
                                    <div style="color: #ffffff; font-size: 16px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.95); font-family: 'Playfair Display', serif;">${mainHero.name}</div>
                                `}
                            </div>
                        </div>

                        <div style="padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                                <h3 style="color: #ffffff; font-size: 15px; font-weight: 800; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${mainHero.name}">
                                    ${mainHero.name}
                                </h3>
                                <span style="background: rgba(245,158,11,0.15); color: #f59e0b; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(245,158,11,0.3); flex-shrink: 0;">
                                    IMDb ${mainRating}
                                </span>
                            </div>

                            <div style="color: #94a3b8; font-size: 11.5px; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${mainHero.originName || mainHero.origin_name || mainHero.slug || ''} • ${mainHero.year || '2026'} • ${mainHero.quality || 'FHD'} • ${mainHero.episodeCurrent || mainHero.episode_current || 'Full'}
                            </div>

                            <p style="color: #cbd5e1; font-size: 12px; line-height: 1.45; margin: 0 0 14px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${shortDesc}
                            </p>

                            <!-- Specialized Action Buttons for Main Hero -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                                <button type="button" class="u-btn u-btn-cyan" onclick="DesktopHeroAdmin.openBackdropGalleryOnly(0)" style="padding: 8px 10px; font-size: 12px; justify-content: center;" title="Chọn Backdrop TMDB 4K/HD">
                                    <i data-lucide="image" style="width:14px;height:14px;"></i> Đổi Backdrop TMDB
                                </button>
                                <button type="button" class="u-btn u-btn-amber" onclick="DesktopHeroAdmin.openLogoGalleryOnly(0)" style="padding: 8px 10px; font-size: 12px; justify-content: center;" title="Chọn Logo TMDB trong suốt">
                                    <i data-lucide="tag" style="width:14px;height:14px;"></i> Đổi Logo TMDB
                                </button>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                                <button type="button" class="u-btn" onclick="DesktopHeroAdmin.editHeroSlide(0)" style="padding: 8px 12px; font-size: 12px; justify-content: center; background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.18); color: #ffffff;" title="Chỉnh sửa chi tiết thông tin phim">
                                    <i data-lucide="edit" style="width:14px;height:14px;"></i> Chỉnh Sửa Thông Tin Phim #1
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // ── CỘT 2: 🎞️ DANH SÁCH THUMBNAILS TIẾP THEO (#2, #3, ...) ──
            const nextSlides = heroSlides.slice(1);

            thumbnailsContainer.innerHTML = `
                <div class="hero-part-panel">
                    <div class="hero-part-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: rgba(14, 165, 233, 0.2); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.4); font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 6px;">
                                🎞️ DẢI THUMBNAILS TIẾP THEO
                            </span>
                            <span style="color: #94a3b8; font-size: 12.5px;">(${nextSlides.length} Thumbnails đang hiển thị trên trang chủ)</span>
                        </div>
                        <button type="button" class="btn-top-action btn-top-gold-outline" onclick="DesktopHeroAdmin.openHeroModal()" style="padding: 5px 12px; font-size: 11.5px;">
                            <i data-lucide="plus" style="width:13px;height:13px;"></i> Thêm Thumbnail
                        </button>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                        ${nextSlides.map((item, subIdx) => {
                            const actualIdx = subIdx + 1;
                            const backdrop = item.imageUrl || item.thumb_url || item.thumbUrl || item.posterUrl || '';
                            const logo = item.logoUrl || '';
                            const rating = (item.imdb && item.imdb.vote_average) || (item.tmdb && item.tmdb.vote_average) || '9.5';

                            return `
                                <div class="hero-admin-card" 
                                     draggable="true" 
                                     data-index="${actualIdx}"
                                     ondragstart="DesktopHeroAdmin.handleDragStart(event, ${actualIdx})"
                                     ondragover="DesktopHeroAdmin.handleDragOver(event, ${actualIdx})"
                                     ondragleave="DesktopHeroAdmin.handleDragLeave(event)"
                                     ondrop="DesktopHeroAdmin.handleDrop(event, ${actualIdx})"
                                     ondragend="DesktopHeroAdmin.handleDragEnd(event)"
                                     style="border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: linear-gradient(180deg, rgba(20, 27, 45, 0.95) 0%, rgba(10, 14, 25, 0.98) 100%); overflow: hidden; display: flex; flex-direction: column; position: relative; cursor: grab; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 8px 24px rgba(0,0,0,0.45);">
                                    
                                    <!-- Top Bar: Badge + Drag Handle -->
                                    <div style="position: absolute; top: 6px; left: 6px; right: 6px; z-index: 10; display: flex; align-items: center; justify-content: space-between; pointer-events: none;">
                                        <span style="background: rgba(14, 165, 233, 0.25); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.5); font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.6);">
                                            #0${actualIdx + 1}
                                        </span>

                                        <div style="background: rgba(0,0,0,0.65); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; padding: 2px 6px; color: #cbd5e1; font-size: 9.5px; font-weight: 700; display: flex; align-items: center; gap: 3px;">
                                            <i data-lucide="grip-horizontal" style="width:11px;height:11px;color:#f59e0b;"></i> Kéo
                                        </div>
                                    </div>

                                    <!-- 16:9 Thumbnail Preview -->
                                    <div style="width: 100%; aspect-ratio: 16 / 9; max-height: 105px; position: relative; background: #000; overflow: hidden;">
                                        <img src="${backdrop}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.85);" onerror="this.src='https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg'">
                                        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%);"></div>

                                        <div style="position: absolute; bottom: 5px; left: 8px; right: 8px; z-index: 5;">
                                            ${logo ? `
                                                <img src="${logo}" alt="${item.name}" style="max-height: 24px; max-width: 110px; object-fit: contain; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.95));">
                                            ` : `
                                                <div style="color: #ffffff; font-size: 11.5px; font-weight: 800; text-shadow: 0 2px 5px rgba(0,0,0,0.95); font-family: 'Playfair Display', serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                                            `}
                                        </div>
                                    </div>

                                    <!-- Info Body -->
                                    <div style="padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <h4 style="color: #ffffff; font-size: 12.5px; font-weight: 700; margin: 0 0 2px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">
                                                ${item.name}
                                            </h4>
                                            <div style="color: #64748b; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6px;">
                                                ${item.originName || item.origin_name || item.slug || ''}
                                            </div>

                                            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px; flex-wrap: wrap;">
                                                <span style="background: rgba(245,158,11,0.15); color: #f59e0b; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.3);">IMDb ${rating}</span>
                                                <span style="background: rgba(255,255,255,0.06); color: #cbd5e1; font-size: 9.5px; padding: 1px 5px; border-radius: 4px;">${item.quality || 'FHD'}</span>
                                                <span style="background: rgba(255,255,255,0.06); color: #cbd5e1; font-size: 9.5px; padding: 1px 5px; border-radius: 4px;">${item.year || '2026'}</span>
                                            </div>
                                        </div>

                                        <!-- Actions -->
                                        <div class="unified-action-bar">
                                            <div class="u-btn-group">
                                                <button type="button" class="u-btn u-btn-icon" onclick="DesktopHeroAdmin.moveHeroSlide(${actualIdx}, -1)" title="Đưa lên trước">
                                                    <i data-lucide="chevron-up" style="width:12px;height:12px;"></i>
                                                </button>
                                                <button type="button" class="u-btn u-btn-icon" onclick="DesktopHeroAdmin.moveHeroSlide(${actualIdx}, 1)" ${actualIdx === heroSlides.length - 1 ? 'disabled' : ''} title="Đưa xuống sau">
                                                    <i data-lucide="chevron-down" style="width:12px;height:12px;"></i>
                                                </button>
                                            </div>
                                            <div class="u-btn-group">
                                                <button type="button" class="u-btn u-btn-cyan" onclick="DesktopHeroAdmin.openBackdropGalleryOnly(${actualIdx})" title="Đổi Ảnh Thumbnail">
                                                    <i data-lucide="image" style="width:11px;height:11px;"></i> Ảnh
                                                </button>
                                                <button type="button" class="u-btn u-btn-amber" onclick="DesktopHeroAdmin.editHeroSlide(${actualIdx})" title="Sửa thông tin">
                                                    <i data-lucide="edit" style="width:11px;height:11px;"></i> Sửa
                                                </button>
                                                <button type="button" class="u-btn u-btn-rose u-btn-icon" onclick="DesktopHeroAdmin.removeHeroSlide(${actualIdx})" title="Xóa thumbnail này">
                                                    <i data-lucide="trash-2" style="width:11px;height:11px;"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}

                        <!-- Add More Thumbnail Card Button -->
                        <div class="hero-add-thumb-card" onclick="DesktopHeroAdmin.openHeroModal()">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(245,158,11,0.15); border: 1.5px solid rgba(245,158,11,0.4); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                                <i data-lucide="plus" style="width:18px;height:18px;"></i>
                            </div>
                            <div style="font-size: 13px; font-weight: 800; margin-bottom: 2px;">Thêm Thumbnail Mới</div>
                            <div style="font-size: 11px; color: #94a3b8;">Không giới hạn số lượng</div>
                        </div>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();
        },

        // ================================================================
        // DRAG AND DROP HANDLERS (KÉO THẢ ĐỔI THỨ TỰ)
        // ================================================================
        handleDragStart(e, index) {
            draggedHeroIndex = index;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            if (e.currentTarget) {
                e.currentTarget.style.opacity = '0.45';
                e.currentTarget.style.cursor = 'grabbing';
            }
        },

        handleDragOver(e, index) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const targetCard = e.currentTarget;
            if (targetCard && draggedHeroIndex !== null && draggedHeroIndex !== index) {
                targetCard.style.borderColor = '#f59e0b';
                targetCard.style.boxShadow = '0 0 15px rgba(245,158,11,0.4)';
            }
        },

        handleDragLeave(e) {
            const targetCard = e.currentTarget;
            if (targetCard) {
                targetCard.style.borderColor = '';
                targetCard.style.boxShadow = '';
            }
        },

        async handleDrop(e, targetIndex) {
            e.preventDefault();
            const targetCard = e.currentTarget;
            if (targetCard) {
                targetCard.style.borderColor = '';
                targetCard.style.boxShadow = '';
            }

            if (draggedHeroIndex === null || draggedHeroIndex === targetIndex) return;

            const draggedItem = heroSlides.splice(draggedHeroIndex, 1)[0];
            heroSlides.splice(targetIndex, 0, draggedItem);
            draggedHeroIndex = null;

            this.renderHeroList();
            await this.saveHeroConfig(true);
            AdminNotice.toast(`Đã chuyển phim "${draggedItem.name}" lên vị trí #${targetIndex + 1}!`, 'success');
        },

        handleDragEnd(e) {
            if (e.currentTarget) {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.cursor = 'grab';
            }
            draggedHeroIndex = null;
            document.querySelectorAll('.hero-admin-card').forEach(card => {
                card.style.borderColor = '';
                card.style.boxShadow = '';
                card.style.opacity = '1';
            });
        },

        // ================================================================
        // RENDER INTERESTS CARDS ("Bạn đang quan tâm gì?")
        // ================================================================
        renderInterestsList() {
            const container = document.getElementById('interestsAdminList');
            if (!container) return;

            if (!interestsCards.length) {
                container.innerHTML = '<div style="color:#94a3b8;font-size:13px;grid-column:1 / -1;text-align:center;padding:20px;">Chưa có thẻ danh mục.</div>';
                return;
            }

            const themeColors = [
                { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' },
                { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
                { border: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c' },
                { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee' },
                { border: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15' },
                { border: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' }
            ];

            container.innerHTML = interestsCards.map((card, idx) => {
                const theme = themeColors[idx % themeColors.length];
                return `
                    <div class="discovery-card-v2" style="border-left: 3.5px solid ${theme.border};">
                        <div class="discovery-backdrop-blend" style="background-image: url('${card.imageUrl || ''}');"></div>

                        <div style="position: relative; z-index: 5; flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <span style="font-size: 10px; font-weight: 800; color: ${theme.text}; background: ${theme.bg}; padding: 2px 7px; border-radius: 5px; border: 1px solid ${theme.border}40; text-transform: uppercase;">
                                    Thẻ #${idx + 1}
                                </span>
                            </div>
                            <h4 style="font-size: 15px; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; letter-spacing: -0.2px;">${card.title}</h4>
                            <div style="font-size: 11px; color: #94a3b8; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${card.link}</div>
                        </div>

                        <button type="button" class="u-btn u-btn-amber" onclick="DesktopHeroAdmin.openInterestsModal(${idx})" style="position: relative; z-index: 5;">
                            <i data-lucide="search" style="width:12px;height:12px;"></i> Tìm Ảnh / Sửa
                        </button>
                    </div>
                `;
            }).join('');

            if (window.lucide) window.lucide.createIcons();
        },

        // ================================================================
        // HERO SLIDES ACTIONS (Move, Remove, Edit)
        // ================================================================
        async moveHeroSlide(index, direction) {
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= heroSlides.length) return;

            const temp = heroSlides[index];
            heroSlides[index] = heroSlides[targetIndex];
            heroSlides[targetIndex] = temp;

            this.renderHeroList();
            await this.saveHeroConfig(true);
        },

        removeHeroSlide(index) {
            const item = heroSlides[index];
            if (!item) return;
            AdminNotice.confirm('Xác nhận xóa phim', `Bạn có chắc muốn xóa phim "${item.name}" khỏi Hero Showcase Desktop?`, async () => {
                heroSlides.splice(index, 1);
                this.renderHeroList();
                await this.saveHeroConfig(true);
                AdminNotice.toast(`Đã xóa phim "${item.name}"`, 'info');
            });
        },

        editHeroSlide(index) {
            const item = heroSlides[index];
            if (!item) return;
            this.openHeroModal(item, index);
        },

        // ================================================================
        // MODAL 1: THÊM / CHỈNH SỬA HERO SHOWCASE DESKTOP
        // ================================================================
        openHeroModal(existingItem = null, editIndex = -1) {
            const modal = document.getElementById('modalAddDesktopHero');
            if (!modal) return;

            const titleEl = document.getElementById('modalDesktopHeroTitle');
            if (titleEl) {
                titleEl.textContent = editIndex >= 0 ? '✏️ Chỉnh Sửa Phim Hero Showcase Desktop' : '✨ Thêm Phim Mới Vào Hero Showcase Desktop';
            }

            const editIndexInput = document.getElementById('dhEditIndex');
            if (editIndexInput) editIndexInput.value = editIndex;

            document.getElementById('dhName').value = existingItem?.name || '';
            document.getElementById('dhOriginName').value = existingItem?.originName || existingItem?.origin_name || '';
            document.getElementById('dhSlug').value = existingItem?.movieSlug || existingItem?.slug || '';
            document.getElementById('dhImageUrl').value = existingItem?.imageUrl || existingItem?.thumb_url || existingItem?.thumbUrl || '';
            document.getElementById('dhPosterUrl').value = existingItem?.posterUrl || existingItem?.poster_url || '';
            document.getElementById('dhLogoUrl').value = existingItem?.logoUrl || '';
            document.getElementById('dhQuality').value = existingItem?.quality || 'FHD';
            document.getElementById('dhYear').value = existingItem?.year || '2026';
            document.getElementById('dhLang').value = existingItem?.lang || 'Vietsub Full';
            document.getElementById('dhEpisodeCurrent').value = existingItem?.episodeCurrent || existingItem?.episode_current || 'Full';
            document.getElementById('dhImdb').value = (existingItem?.imdb && existingItem.imdb.vote_average) || '9.5';
            document.getElementById('dhContent').value = existingItem?.content || '';

            currentLoadedBackdrops = [];
            currentLoadedLogos = [];
            document.getElementById('dhBackdropGallery').innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;padding:15px;grid-column:1/-1;">Tìm kiếm hoặc chọn phim bên trên để tải bộ sưu tập Backdrop 4K/FHD...</div>';
            document.getElementById('dhLogoGallery').innerHTML = '<div style="color:#64748b;font-size:12px;text-align:center;padding:10px;width:100%;">Chưa có logo TMDB</div>';

            modal.style.display = 'flex';
            this.updateLiveMockupPreview();

            if (existingItem) {
                this.loadBackdropsForMovie(existingItem.name, existingItem.originName || existingItem.origin_name, existingItem.slug, existingItem.tmdb?.id);
            } else {
                this.renderTrendingSuggestions();
            }

            const searchInput = document.getElementById('inputSearchHeroMovie');
            if (searchInput) {
                searchInput.value = '';
                setTimeout(() => searchInput.focus(), 150);
            }
        },

        closeHeroModal() {
            const modal = document.getElementById('modalAddDesktopHero');
            if (modal) modal.style.display = 'none';
        },

        // ================================================================
        // LIVE MOCKUP PREVIEW TRONG MODAL
        // ================================================================
        updateLiveMockupPreview() {
            const name = document.getElementById('dhName')?.value || 'Tựa Đề Phim';
            const originName = document.getElementById('dhOriginName')?.value || 'Origin Name';
            const backdropUrl = document.getElementById('dhImageUrl')?.value || 'https://phimimg.com/upload/vod/20260620-1/00083387b890aaac69f0490b3fda8c13.jpg';
            const logoUrl = document.getElementById('dhLogoUrl')?.value || '';
            const imdb = document.getElementById('dhImdb')?.value || '9.5';
            const quality = document.getElementById('dhQuality')?.value || 'FHD';
            const year = document.getElementById('dhYear')?.value || '2026';
            const ep = document.getElementById('dhEpisodeCurrent')?.value || 'Tập 30';

            const previewImg = document.getElementById('mockupBgImg');
            if (previewImg) previewImg.src = backdropUrl;

            const logoContainer = document.getElementById('mockupLogoArea');
            if (logoContainer) {
                if (logoUrl) {
                    logoContainer.innerHTML = `<img src="${logoUrl}" alt="${name}" style="max-height: 40px; max-width: 160px; object-fit: contain; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));">`;
                } else {
                    logoContainer.innerHTML = `<div style="font-family:'Playfair Display', serif; font-size:16px; font-weight:800; color:#fff; text-shadow:0 2px 8px rgba(0,0,0,0.9);">${name}</div>`;
                }
            }

            const subtitleEl = document.getElementById('mockupSubtitle');
            if (subtitleEl) subtitleEl.textContent = originName;

            const badgeArea = document.getElementById('mockupBadges');
            if (badgeArea) {
                badgeArea.innerHTML = `
                    <span style="border:1px solid #f59e0b;color:#f59e0b;font-size:9px;font-weight:700;padding:1px 4px;border-radius:4px;">IMDb ${imdb}</span>
                    <span style="background:rgba(255,255,255,0.15);color:#fff;font-size:9px;padding:1px 4px;border-radius:4px;">${quality}</span>
                    <span style="background:rgba(255,255,255,0.15);color:#fff;font-size:9px;padding:1px 4px;border-radius:4px;">${year}</span>
                    <span style="background:rgba(255,255,255,0.15);color:#fff;font-size:9px;padding:1px 4px;border-radius:4px;">${ep}</span>
                `;
            }
        },

        // ================================================================
        // LIVE SEARCH & SUGGESTIONS
        // ================================================================
        quickSearch(keyword) {
            const searchInput = document.getElementById('inputSearchHeroMovie');
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

            const indicator = document.getElementById('heroSearchLoading');
            if (indicator) indicator.style.display = 'inline';

            searchDebounceTimer = setTimeout(() => {
                this.searchMovieFromAPI(query);
            }, 300);
        },

        renderTrendingSuggestions() {
            const resultsBox = document.getElementById('heroSearchResults');
            if (!resultsBox) return;

            if (cachedTrendingList.length > 0) {
                resultsBox.style.display = 'flex';
                resultsBox.innerHTML = `
                    <div style="font-size:11.5px;color:#f59e0b;font-weight:700;padding:2px 4px;">
                        🔥 Gợi ý phim hot mới nhất:
                    </div>
                ` + cachedTrendingList.slice(0, 6).map(m => {
                    const poster = m.poster_url || m.thumb_url || '';
                    const fullPoster = poster.startsWith('http') ? poster : `https://phimimg.com/${poster.replace(/^\//, '')}`;
                    const thumb = m.thumb_url || m.poster_url || '';
                    const fullThumb = thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.replace(/^\//, '')}`;

                    const jsonStr = JSON.stringify({
                        name: m.name || '',
                        origin_name: m.origin_name || '',
                        slug: m.slug || '',
                        poster_url: fullPoster,
                        thumb_url: fullThumb,
                        year: String(m.year || '2026'),
                        quality: m.quality || 'FHD',
                        lang: m.lang || 'Vietsub Full'
                    }).replace(/"/g, '&quot;');

                    return `
                        <div onclick="DesktopHeroAdmin.selectSearchMovie('${jsonStr}')" style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(255,255,255,0.06);border-radius:8px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                            <img src="${fullPoster}" style="width:34px;height:48px;border-radius:6px;object-fit:cover;background:#000;flex-shrink:0;">
                            <div style="flex:1;min-width:0;">
                                <div style="color:#ffffff;font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.name}</div>
                                <div style="color:#94a3b8;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.origin_name || ''} • <span style="color:#f59e0b;font-weight:700;">${m.year || ''}</span></div>
                            </div>
                            <span style="color:#f59e0b;font-size:11.5px;font-weight:800;background:rgba(245,158,11,0.18);padding:3px 8px;border-radius:5px;flex-shrink:0;">Chọn ➔</span>
                        </div>
                    `;
                }).join('');
            } else {
                resultsBox.style.display = 'none';
            }
        },

        async searchMovieFromAPI(manualQuery = '') {
            const query = manualQuery || document.getElementById('inputSearchHeroMovie')?.value.trim();
            const resultsBox = document.getElementById('heroSearchResults');
            const indicator = document.getElementById('heroSearchLoading');
            if (!query || !resultsBox) return;

            resultsBox.style.display = 'flex';
            resultsBox.innerHTML = '<div style="color:#f59e0b;font-size:12px;padding:8px;text-align:center;">⏳ Đang tìm kiếm phim...</div>';
            if (indicator) indicator.style.display = 'inline';

            try {
                let list = [];
                try {
                    const res1 = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=10&page=1`);
                    const data1 = await res1.json();
                    if (data1.status === 'success' && data1.data?.items?.length) {
                        list = data1.data.items;
                    }
                } catch(e) {}

                if (!list.length) {
                    try {
                        const res2 = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`);
                        const data2 = await res2.json();
                        if (data2.data?.items?.length) {
                            list = data2.data.items;
                        }
                    } catch(e) {}
                }

                if (!list.length) {
                    resultsBox.innerHTML = '<div style="color:#94a3b8;font-size:12px;padding:8px;text-align:center;">Không tìm thấy phim phù hợp. Bạn có thể tự điền form bên dưới.</div>';
                    return;
                }

                resultsBox.innerHTML = `
                    <div style="font-size:11.5px;color:#f59e0b;font-weight:700;padding:2px 4px;">
                        ✨ Kết quả tìm kiếm (${list.length} phim):
                    </div>
                ` + list.slice(0, 8).map(m => {
                    const poster = m.poster_url || m.thumb_url || '';
                    const fullPoster = poster.startsWith('http') ? poster : `https://phimimg.com/${poster.replace(/^\//, '')}`;
                    const thumb = m.thumb_url || m.poster_url || '';
                    const fullThumb = thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.replace(/^\//, '')}`;

                    const jsonStr = JSON.stringify({
                        name: m.name || '',
                        origin_name: m.origin_name || '',
                        slug: m.slug || '',
                        poster_url: fullPoster,
                        thumb_url: fullThumb,
                        year: String(m.year || '2026'),
                        quality: m.quality || 'FHD',
                        lang: m.lang || 'Vietsub Full'
                    }).replace(/"/g, '&quot;');

                    return `
                        <div onclick="DesktopHeroAdmin.selectSearchMovie('${jsonStr}')" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.06);border-radius:8px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                            <img src="${fullPoster}" style="width:34px;height:48px;border-radius:6px;object-fit:cover;background:#000;flex-shrink:0;">
                            <div style="flex:1;min-width:0;">
                                <div style="color:#ffffff;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.name}</div>
                                <div style="color:#94a3b8;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.origin_name || ''} • <span style="color:#f59e0b;font-weight:700;">${m.year || ''}</span></div>
                            </div>
                            <span style="color:#f59e0b;font-size:12px;font-weight:800;background:rgba(245,158,11,0.18);padding:4px 10px;border-radius:6px;flex-shrink:0;">Chọn ➔</span>
                        </div>
                    `;
                }).join('');
            } catch (err) {
                resultsBox.innerHTML = `<div style="color:#ef4444;font-size:12px;padding:6px;">Lỗi: ${err.message}</div>`;
            } finally {
                if (indicator) indicator.style.display = 'none';
            }
        },

        async selectSearchMovie(jsonStr) {
            try {
                const m = JSON.parse(jsonStr.replace(/&quot;/g, '"'));
                document.getElementById('dhName').value = m.name || '';
                document.getElementById('dhOriginName').value = m.origin_name || '';
                document.getElementById('dhSlug').value = m.slug || '';
                document.getElementById('dhImageUrl').value = m.thumb_url || m.poster_url || '';
                document.getElementById('dhPosterUrl').value = m.poster_url || m.thumb_url || '';
                document.getElementById('dhQuality').value = m.quality || 'FHD';
                document.getElementById('dhYear').value = m.year || '2026';
                document.getElementById('dhLang').value = m.lang || 'Vietsub Full';

                const resultsBox = document.getElementById('heroSearchResults');
                if (resultsBox) resultsBox.style.display = 'none';

                this.updateLiveMockupPreview();
                AdminNotice.toast(`Đang tải bộ sưu tập Backdrop TMDB cho "${m.name}"...`, 'info');

                const detail = await this.fetchAndFillMovieDetails(m.slug);
                const tmdbId = detail?.tmdb?.id || m.tmdbId || null;
                const mediaType = detail?.tmdb?.type || (detail?.type === 'series' || detail?.type === 'hoathinh' || detail?.type === 'tvshows' ? 'tv' : 'movie');
                await this.loadBackdropsForMovie(m.name, m.origin_name, m.slug, tmdbId, mediaType);
            } catch (e) {
                console.error('Lỗi parse movie json:', e);
            }
        },

        async fetchAndFillMovieDetails(slug) {
            if (!slug) return null;
            const contentEl = document.getElementById('dhContent');

            try {
                let detail = null;
                try {
                    const res = await fetch(`https://phimapi.com/phim/${encodeURIComponent(slug)}`);
                    const data = await res.json();
                    if (data.status === true && data.movie) detail = data.movie;
                } catch(e) {}

                if (!detail) {
                    try {
                        const res2 = await fetch(`https://ophim1.com/phim/${encodeURIComponent(slug)}`);
                        const data2 = await res2.json();
                        if (data2.status === 'success' && data2.data?.item) detail = data2.data.item;
                    } catch(e) {}
                }

                if (detail) {
                    let cleanContent = (detail.content || detail.description || '')
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (cleanContent && contentEl) contentEl.value = cleanContent;
                    if (detail.episode_current) document.getElementById('dhEpisodeCurrent').value = detail.episode_current;
                    if (detail.quality) document.getElementById('dhQuality').value = detail.quality;
                    if (detail.year) document.getElementById('dhYear').value = String(detail.year);
                    if (detail.lang) document.getElementById('dhLang').value = detail.lang;
                    if (detail.tmdb && detail.tmdb.vote_average) document.getElementById('dhImdb').value = String(detail.tmdb.vote_average);
                    else if (detail.imdb && detail.imdb.vote_average) document.getElementById('dhImdb').value = String(detail.imdb.vote_average);

                    this.updateLiveMockupPreview();
                    return detail;
                }
            } catch (err) {
                console.warn('Lỗi fetch movie details:', err);
            }
            return null;
        },

        // ================================================================
        // BỘ SƯU TẬP BACKDROP & LOGO TMDB
        // ================================================================
        async loadBackdropsForMovie(name, originName, slug, tmdbId = null, mediaType = null) {
            const backdropGallery = document.getElementById('dhBackdropGallery');
            const logoGallery = document.getElementById('dhLogoGallery');
            if (!backdropGallery) return;

            backdropGallery.innerHTML = '<div style="color:#f59e0b;font-size:12px;padding:15px;text-align:center;grid-column:1/-1;">⏳ Đang tìm kiếm & tải bộ sưu tập ảnh nền điện ảnh TMDB...</div>';
            if (logoGallery) logoGallery.innerHTML = '<div style="color:#f59e0b;font-size:11px;padding:8px;text-align:center;width:100%;">⏳ Đang tải logo...</div>';

            try {
                let backdrops = [];
                let logos = [];

                // 1. Gọi backend /api/settings/movie-backdrops
                try {
                    const queryParams = new URLSearchParams({
                        name: name || '',
                        origin_name: originName || '',
                        slug: slug || ''
                    });
                    if (tmdbId) queryParams.set('tmdbId', tmdbId);
                    if (mediaType) queryParams.set('mediaType', mediaType);

                    const res = await fetch(`/api/settings/movie-backdrops?${queryParams.toString()}`);
                    const contentType = res.headers.get('content-type') || '';
                    if (res.ok && contentType.includes('application/json')) {
                        const data = await res.json();
                        if (data.success) {
                            backdrops = data.backdrops || [];
                            logos = data.logos || [];
                        }
                    }
                } catch(e) {}

                // 2. Fallback trực tiếp nếu thiếu logo hoặc backdrop
                if (!logos.length || !backdrops.length) {
                    const TMDB_KEY = '5fb3c8d9ad2ca4cd2029836befcc3ab5';
                    let targetTmdbId = tmdbId;
                    let targetType = mediaType || 'tv';

                    async function tmdbFetch(url) {
                        try {
                            const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
                            if (r.ok) return r;
                        } catch(e) {}
                        const proxies = [
                            `https://corsproxy.io/?${encodeURIComponent(url)}`,
                            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
                        ];
                        for (const p of proxies) {
                            try {
                                const r = await fetch(p, { signal: AbortSignal.timeout(4500) });
                                if (r.ok) return r;
                            } catch(e) {}
                        }
                        return null;
                    }

                    if (!targetTmdbId) {
                        const query = encodeURIComponent(originName || name || slug);
                        const sRes = await tmdbFetch(`https://api.tmdb.org/3/search/multi?api_key=${TMDB_KEY}&query=${query}&include_adult=false`);
                        if (sRes) {
                            const sData = await sRes.json();
                            if (sData.results && sData.results.length > 0) {
                                const valid = sData.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
                                const found = valid.find(r => r.vote_count > 0) || valid[0];
                                if (found && found.id) {
                                    targetTmdbId = found.id;
                                    targetType = found.media_type;
                                }
                            }
                        }
                    }

                    if (targetTmdbId) {
                        const imgRes = await tmdbFetch(`https://api.tmdb.org/3/${targetType}/${targetTmdbId}/images?api_key=${TMDB_KEY}&include_image_language=vi,en,zh,ja,ko,null`);
                        if (imgRes) {
                            const imgData = await imgRes.json();
                            if ((!backdrops.length) && imgData.backdrops && Array.isArray(imgData.backdrops)) {
                                backdrops = imgData.backdrops.slice(0, 20).map(b => ({
                                    url: `https://image.tmdb.org/t/p/original${b.file_path}`,
                                    previewUrl: `https://image.tmdb.org/t/p/w780${b.file_path}`,
                                    width: b.width || 1920
                                }));
                            }
                            if ((!logos.length) && imgData.logos && Array.isArray(imgData.logos)) {
                                logos = imgData.logos.slice(0, 20).map(l => ({
                                    url: `https://image.tmdb.org/t/p/w500${l.file_path}`,
                                    previewUrl: `https://image.tmdb.org/t/p/w300${l.file_path}`
                                }));
                            }
                        }
                    }
                }

                // Render backdrops gallery
                if (backdrops.length > 0) {
                    currentLoadedBackdrops = backdrops;
                    backdropGallery.innerHTML = backdrops.map((b) => `
                        <div onclick="DesktopHeroAdmin.selectBackdrop('${b.url}')" style="aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#000;position:relative;cursor:pointer;border:2px solid rgba(255,255,255,0.15);transition:all 0.2s;" onmouseover="this.style.borderColor='#f59e0b';this.style.transform='scale(1.03)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.transform='scale(1)'">
                            <img src="${b.previewUrl || b.url}" style="width:100%;height:100%;object-fit:cover;">
                            <div style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.75);color:#fff;font-size:9px;font-weight:700;padding:1px 4px;border-radius:4px;">
                                ${b.width ? `${b.width}p` : 'HD'}
                            </div>
                            <div style="position:absolute;top:4px;right:4px;background:#f59e0b;color:#000;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;">
                                Chọn
                            </div>
                        </div>
                    `).join('');
                } else {
                    backdropGallery.innerHTML = '<div style="color:#94a3b8;font-size:12px;text-align:center;padding:15px;grid-column:1/-1;">Không tìm thấy ảnh nền TMDB. Bạn có thể dán link ảnh trực tiếp vào ô URL bên dưới.</div>';
                }

                // Render logos gallery
                if (logoGallery) {
                    let logosHtml = '';
                    if (logos.length > 0) {
                        currentLoadedLogos = logos;
                        logosHtml = logos.map(l => `
                            <div onclick="DesktopHeroAdmin.selectLogo('${l.url}')" style="height:44px;min-width:90px;padding:4px 12px;border-radius:8px;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.15);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;" onmouseover="this.style.borderColor='#38bdf8';this.style.background='rgba(56,189,248,0.15)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.background='rgba(255,255,255,0.06)'">
                                <img src="${l.previewUrl || l.url}" style="max-height:100%;max-width:120px;object-fit:contain;">
                            </div>
                        `).join('');
                    }

                    logoGallery.innerHTML = logosHtml + `
                        <button type="button" onclick="DesktopHeroAdmin.selectLogo('')" style="height:44px;padding:6px 14px;border-radius:8px;background:rgba(239,68,68,0.18);border:1.5px solid rgba(239,68,68,0.45);color:#fca5a5;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap !important;flex-shrink:0 !important;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:145px;box-shadow:0 2px 8px rgba(239,68,68,0.25);" onmouseover="this.style.background='rgba(239,68,68,0.3)';" onmouseout="this.style.background='rgba(239,68,68,0.18)';">
                            <span style="font-size:14px;">✕</span> Không Dùng Logo
                        </button>
                    `;
                }
            } catch (err) {
                backdropGallery.innerHTML = `<div style="color:#ef4444;font-size:12px;padding:10px;">Lỗi tải ảnh: ${err.message}</div>`;
            }
        },

        selectBackdrop(url) {
            document.getElementById('dhImageUrl').value = url;
            this.updateLiveMockupPreview();
            AdminNotice.toast('✨ Đã chọn ảnh nền Backdrop cho Hero!', 'success');
        },

        selectLogo(url) {
            document.getElementById('dhLogoUrl').value = url;
            this.updateLiveMockupPreview();
            AdminNotice.toast(url ? '🏷️ Đã chọn Logo TMDB trong suốt!' : 'Đã chuyển sang dùng Chữ Nghệ Thuật', 'info');
        },

        openBackdropGalleryOnly(index) {
            const item = heroSlides[index];
            if (!item) return;
            this.openHeroModal(item, index);
        },

        // ================================================================
        // SUBMIT & SAVE HERO SHOWCASE CONFIG
        // ================================================================
        async submitHeroForm(e) {
            if (e) e.preventDefault();
            const editIndex = parseInt(document.getElementById('dhEditIndex')?.value || '-1', 10);
            const name = document.getElementById('dhName')?.value.trim();
            const originName = document.getElementById('dhOriginName')?.value.trim();
            const slug = document.getElementById('dhSlug')?.value.trim();
            const imageUrl = document.getElementById('dhImageUrl')?.value.trim();
            const posterUrl = document.getElementById('dhPosterUrl')?.value.trim() || imageUrl;
            const logoUrl = document.getElementById('dhLogoUrl')?.value.trim() || '';
            const quality = document.getElementById('dhQuality')?.value.trim() || 'FHD';
            const year = document.getElementById('dhYear')?.value.trim() || '2026';
            const lang = document.getElementById('dhLang')?.value.trim() || 'Vietsub Full';
            const episodeCurrent = document.getElementById('dhEpisodeCurrent')?.value.trim() || 'Full';
            const imdbVal = parseFloat(document.getElementById('dhImdb')?.value || '9.5') || 9.5;
            const content = document.getElementById('dhContent')?.value.trim() || '';

            if (!name || !slug || !imageUrl) {
                AdminNotice.toast('Vui lòng điền đầy đủ Tên phim, Slug và Ảnh Backdrop!', 'error');
                return;
            }

            const item = {
                movieSlug: slug,
                slug: slug,
                name,
                originName,
                origin_name: originName,
                imageUrl,
                thumbUrl: imageUrl,
                thumb_url: imageUrl,
                posterUrl,
                poster_url: posterUrl,
                logoUrl,
                quality,
                year,
                lang,
                episodeCurrent,
                episode_current: episodeCurrent,
                content,
                imdb: { vote_average: imdbVal },
                tmdb: { vote_average: imdbVal },
                category: []
            };

            if (editIndex >= 0 && editIndex < heroSlides.length) {
                heroSlides[editIndex] = item;
            } else {
                heroSlides.push(item);
            }

            this.closeHeroModal();
            this.renderHeroList();

            const ok = await this.saveHeroConfig(false);
            if (ok) {
                AdminNotice.toast(`🎉 Đã lưu phim "${name}" vào Hero Desktop!`, 'success');
            }
        },

        async saveHeroConfig(isSilent = false) {
            if (isSavingHero) return false;
            const btn = document.getElementById('btnSaveDesktopHero');
            const token = getAdminToken();

            try {
                isSavingHero = true;
                if (btn && !isSilent) {
                    btn.disabled = true;
                    btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Đang lưu...';
                }

                const res = await fetch('/api/settings/desktop-hero-showcase', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ items: heroSlides })
                });

                const data = await res.json();
                if (data.success) {
                    if (!isSilent) {
                        AdminNotice.toast('🎉 Đã lưu cấu hình Hero Showcase Desktop thành công! Trang chủ đã được cập nhật.', 'success');
                    } else {
                        AdminNotice.toast('Đã lưu thay đổi vào hệ thống', 'success');
                    }
                    return true;
                } else {
                    AdminNotice.toast('❌ Lỗi: ' + (data.message || 'Thất bại'), 'error');
                    return false;
                }
            } catch (err) {
                AdminNotice.toast('❌ Lỗi kết nối: ' + err.message, 'error');
                return false;
            } finally {
                isSavingHero = false;
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i data-lucide="save"></i> Lưu Cấu Hình Hero Desktop';
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        },

        // ================================================================
        // MODAL 2: CHỈNH SỬA THẺ "BẠN ĐANG QUAN TÂM GÌ?" (CÓ CHỌN MÀU ÁNH XẠ + MÀU ICON + TÌM ẢNH)
        // ================================================================
        iconSvgMap: {
            tv: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="3"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>`,
            flame: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
            zap: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
            heart: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`,
            smile: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14c1.5 2 6.5 2 8 0"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
            sparkles: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>`,
            film: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 3v18"></path><path d="M17 3v18"></path></svg>`,
            crown: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.201a4 4 0 0 1-3.847 2.93H8.7a4 4 0 0 1-3.847-2.93L2.019 6.02a.5.5 0 0 1 .798-.52l4.277 3.665a1 1 0 0 0 1.516-.294z"></path></svg>`
        },

        detectIconName(card, index) {
            if (card.iconName && this.iconSvgMap[card.iconName]) return card.iconName;
            const defaultIconList = ['tv', 'flame', 'zap', 'heart', 'smile', 'sparkles'];
            const title = (card.title || '').toLowerCase();
            if (title.includes('bộ') || title.includes('series')) return 'tv';
            if (title.includes('mới') || title.includes('hot')) return 'flame';
            if (title.includes('hành động') || title.includes('action')) return 'zap';
            if (title.includes('tình cảm') || title.includes('romance')) return 'heart';
            if (title.includes('hài') || title.includes('comedy')) return 'smile';
            if (title.includes('hoạt hình') || title.includes('anime')) return 'sparkles';
            return defaultIconList[index % defaultIconList.length];
        },

        hexToRgb(hex) {
            if (!hex) return '139, 92, 246';
            let c = hex.replace('#', '').trim();
            if (c.length === 3) c = c.split('').map(x => x + x).join('');
            if (c.length !== 6) {
                const m = hex.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
                if (m) return this.hexToRgb(m[0]);
                return '139, 92, 246';
            }
            const num = parseInt(c, 16);
            return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
        },

        extractHexFromCard(card, defaultHex = '#8b5cf6') {
            if (card.themeColor && card.themeColor.startsWith('#')) return card.themeColor;
            if (card.color && card.color.startsWith('#')) return card.color;
            if (card.gradient) {
                const m = card.gradient.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
                if (m) return m[0].length === 4 ? '#' + m[1].split('').map(x => x + x).join('') : m[0];
            }
            return defaultHex;
        },

        openInterestsModal(index) {
            const card = interestsCards[index];
            if (!card) return;

            const modal = document.getElementById('modalEditInterestsCard');
            if (!modal) return;

            const defaultColors = ['#8b5cf6', '#ef4444', '#f97316', '#ec4899', '#eab308', '#10b981'];
            const hexColor = this.extractHexFromCard(card, defaultColors[index % defaultColors.length]);
            const iconName = this.detectIconName(card, index);
            const iconColor = card.iconColor || '#ffffff';
            const isNoAura = !!(card.noAura === true || card.themeColor === 'none' || card.color === 'none');

            document.getElementById('intEditIndex').value = index;
            document.getElementById('intTitle').value = card.title || '';
            document.getElementById('intLink').value = card.link || '';
            document.getElementById('intImageUrl').value = card.imageUrl || '';
            document.getElementById('intGradient').value = hexColor;
            document.getElementById('intIconName').value = iconName;
            document.getElementById('intNoAura').value = isNoAura ? 'true' : 'false';

            const colorPicker = document.getElementById('intColorPicker');
            if (colorPicker) colorPicker.value = hexColor;

            const colorHex = document.getElementById('intColorHex');
            if (colorHex) colorHex.value = hexColor;

            const colorBox = document.getElementById('intColorBoxDisplay');
            if (colorBox) colorBox.style.background = hexColor;

            const iconPicker = document.getElementById('intIconColorPicker');
            if (iconPicker) iconPicker.value = iconColor.startsWith('#') ? iconColor : '#ffffff';

            const iconHex = document.getElementById('intIconColorHex');
            if (iconHex) iconHex.value = iconColor;

            const textColor = card.textColor || '#ffffff';
            const textPicker = document.getElementById('intTextColorPicker');
            if (textPicker) textPicker.value = textColor.startsWith('#') ? textColor : '#ffffff';

            const textHex = document.getElementById('intTextColorHex');
            if (textHex) textHex.value = textColor;

            // Highlight active icon button
            this.highlightActiveIconButton(iconName);
            this.updateDisableAuraButtonState(isNoAura);

            const previewImg = document.getElementById('intImgPreview');
            if (previewImg) previewImg.src = card.imageUrl || '';

            const searchInput = document.getElementById('inputSearchInterestMovie');
            if (searchInput) searchInput.value = '';

            const resultsBox = document.getElementById('intSearchResults');
            if (resultsBox) {
                resultsBox.innerHTML = '';
                resultsBox.style.display = 'none';
            }

            modal.style.display = 'flex';
            this.updateInterestLivePreview();
            this.renderInterestTrendingSuggestions();
        },

        closeInterestsModal() {
            const modal = document.getElementById('modalEditInterestsCard');
            if (modal) modal.style.display = 'none';
        },

        toggleDisableAura() {
            const noAuraInput = document.getElementById('intNoAura');
            const current = noAuraInput?.value === 'true';
            const next = !current;
            if (noAuraInput) noAuraInput.value = next ? 'true' : 'false';

            this.updateDisableAuraButtonState(next);
            this.updateInterestLivePreview();

            if (next) {
                AdminNotice.toast('🚫 Đã TẮT màu ánh xạ! Thẻ sẽ dùng ảnh nền thuần không bị ám màu.', 'info');
            } else {
                AdminNotice.toast('🎨 Đã BẬT lại màu ánh xạ điện ảnh!', 'success');
            }
        },

        updateDisableAuraButtonState(isNoAura) {
            const btn = document.getElementById('btnDisableIntAura');
            if (!btn) return;
            if (isNoAura) {
                btn.style.background = 'rgba(239,68,68,0.45)';
                btn.style.borderColor = '#ef4444';
                btn.style.color = '#ffffff';
                btn.style.boxShadow = '0 0 10px rgba(239,68,68,0.4)';
                btn.innerHTML = '<span>✓</span> Đang Tắt Ánh Xạ (Ảnh Thuần)';
            } else {
                btn.style.background = 'rgba(239,68,68,0.15)';
                btn.style.borderColor = 'rgba(239,68,68,0.4)';
                btn.style.color = '#fca5a5';
                btn.style.boxShadow = 'none';
                btn.innerHTML = '<span>🚫</span> Bỏ Màu Ánh Xạ';
            }
        },

        selectCardIcon(iconName) {
            document.getElementById('intIconName').value = iconName;
            this.highlightActiveIconButton(iconName);
            this.updateInterestLivePreview();
        },

        highlightActiveIconButton(iconName) {
            document.querySelectorAll('#intIconOptions .int-icon-opt-btn').forEach(btn => {
                const isActive = btn.getAttribute('data-icon') === iconName;
                btn.style.background = isActive ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)';
                btn.style.borderColor = isActive ? '#a855f7' : 'rgba(255,255,255,0.12)';
                btn.style.color = isActive ? '#ffffff' : '#cbd5e1';
            });
        },

        handleIconColorChange(colorHex) {
            const hexInput = document.getElementById('intIconColorHex');
            if (hexInput) hexInput.value = colorHex;
            this.updateInterestLivePreview();
        },

        handleIconHexChange(val) {
            let hex = (val || '').trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9a-fA-F]{6}$/i.test(hex)) {
                const picker = document.getElementById('intIconColorPicker');
                if (picker) picker.value = hex;
            }
            this.updateInterestLivePreview();
        },

        setIconColorPreset(hexColor) {
            const picker = document.getElementById('intIconColorPicker');
            if (picker) picker.value = hexColor;
            const hexInput = document.getElementById('intIconColorHex');
            if (hexInput) hexInput.value = hexColor;
            this.updateInterestLivePreview();
            AdminNotice.toast(`✨ Đã đổi màu icon thành ${hexColor}!`, 'info');
        },

        syncIconColorWithCard() {
            const cardColor = document.getElementById('intColorHex')?.value.trim() || document.getElementById('intColorPicker')?.value || '#8b5cf6';
            this.setIconColorPreset(cardColor);
        },

        handleTextColorChange(colorHex) {
            const hexInput = document.getElementById('intTextColorHex');
            if (hexInput) hexInput.value = colorHex;
            this.updateInterestLivePreview();
        },

        handleTextHexChange(val) {
            let hex = (val || '').trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9a-fA-F]{6}$/i.test(hex)) {
                const picker = document.getElementById('intTextColorPicker');
                if (picker) picker.value = hex;
            }
            this.updateInterestLivePreview();
        },

        setTextColorPreset(hexColor) {
            const picker = document.getElementById('intTextColorPicker');
            if (picker) picker.value = hexColor;
            const hexInput = document.getElementById('intTextColorHex');
            if (hexInput) hexInput.value = hexColor;
            this.updateInterestLivePreview();
            AdminNotice.toast(`✍️ Đã chọn màu chữ ${hexColor}!`, 'info');
        },

        syncTextColorWithCard() {
            const cardColor = document.getElementById('intColorHex')?.value.trim() || document.getElementById('intColorPicker')?.value || '#8b5cf6';
            this.setTextColorPreset(cardColor);
        },

        handleColorPickerChange(colorHex) {
            const hexInput = document.getElementById('intColorHex');
            if (hexInput) hexInput.value = colorHex;
            const colorBox = document.getElementById('intColorBoxDisplay');
            if (colorBox) colorBox.style.background = colorHex;
            document.getElementById('intGradient').value = colorHex;
            const noAuraInput = document.getElementById('intNoAura');
            if (noAuraInput) noAuraInput.value = 'false';
            this.updateDisableAuraButtonState(false);
            this.updateInterestLivePreview();
        },

        handleColorHexChange(val) {
            let hex = (val || '').trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9a-fA-F]{6}$/i.test(hex)) {
                const picker = document.getElementById('intColorPicker');
                if (picker) picker.value = hex;
                const colorBox = document.getElementById('intColorBoxDisplay');
                if (colorBox) colorBox.style.background = hex;
            }
            document.getElementById('intGradient').value = hex;
            const noAuraInput = document.getElementById('intNoAura');
            if (noAuraInput) noAuraInput.value = 'false';
            this.updateDisableAuraButtonState(false);
            this.updateInterestLivePreview();
        },

        setColorPreset(hexColor) {
            const picker = document.getElementById('intColorPicker');
            if (picker) picker.value = hexColor;
            const hexInput = document.getElementById('intColorHex');
            if (hexInput) hexInput.value = hexColor;
            const colorBox = document.getElementById('intColorBoxDisplay');
            if (colorBox) colorBox.style.background = hexColor;
            document.getElementById('intGradient').value = hexColor;
            const noAuraInput = document.getElementById('intNoAura');
            if (noAuraInput) noAuraInput.value = 'false';
            this.updateDisableAuraButtonState(false);
            this.updateInterestLivePreview();
            AdminNotice.toast(`🎨 Đã chọn màu ánh xạ ${hexColor}!`, 'info');
        },

        updateInterestLivePreview() {
            const imgUrl = document.getElementById('intImageUrl')?.value.trim() || '';
            const title = document.getElementById('intTitle')?.value.trim() || 'Tiêu đề thẻ';
            const hexColor = document.getElementById('intColorHex')?.value.trim() || document.getElementById('intColorPicker')?.value || '#8b5cf6';
            const iconName = document.getElementById('intIconName')?.value || 'tv';
            const iconColor = document.getElementById('intIconColorHex')?.value.trim() || document.getElementById('intIconColorPicker')?.value || '#ffffff';
            const textColor = document.getElementById('intTextColorHex')?.value.trim() || document.getElementById('intTextColorPicker')?.value || '#ffffff';
            const isNoAura = document.getElementById('intNoAura')?.value === 'true';
            const rgb = this.hexToRgb(hexColor);

            const previewBg = document.getElementById('intPreviewBg');
            if (previewBg) {
                previewBg.style.backgroundImage = imgUrl ? `url('${imgUrl}')` : 'none';
            }

            const previewAura = document.getElementById('intPreviewAura');
            const previewShine = document.getElementById('intPreviewShine');
            if (previewAura) {
                if (isNoAura) {
                    previewAura.style.display = 'none';
                    previewAura.style.background = 'none';
                    previewAura.style.opacity = '0';
                    if (previewShine) previewShine.style.display = 'none';
                } else {
                    previewAura.style.display = 'block';
                    previewAura.style.opacity = '1';
                    previewAura.style.background = `
                        radial-gradient(circle at 14% 20%, rgba(${rgb}, 0.82) 0%, rgba(${rgb}, 0.35) 48%, transparent 75%),
                        linear-gradient(100deg, rgba(${rgb}, 0.72) 0%, rgba(${rgb}, 0.3) 42%, rgba(10, 12, 18, 0.15) 68%, transparent 100%),
                        linear-gradient(0deg, rgba(8, 10, 16, 0.88) 0%, rgba(8, 10, 16, 0.25) 52%, transparent 100%)
                    `;
                    if (previewShine) previewShine.style.display = 'block';
                }
            }


            const previewIcon = document.getElementById('intPreviewIcon');
            if (previewIcon) {
                previewIcon.innerHTML = this.iconSvgMap[iconName] || this.iconSvgMap.tv;
                previewIcon.style.color = iconColor;
            }

            const previewTitle = document.getElementById('intPreviewTitle');
            if (previewTitle) {
                previewTitle.textContent = title;
                previewTitle.style.color = textColor;
            }

            const previewAction = document.getElementById('intPreviewAction');
            if (previewAction) {
                previewAction.style.color = textColor;
            }

            const previewImg = document.getElementById('intImgPreview');
            if (previewImg) previewImg.src = imgUrl;
        },

        quickSearchInterest(keyword) {
            const searchInput = document.getElementById('inputSearchInterestMovie');
            if (searchInput) {
                searchInput.value = keyword;
                this.searchMovieForInterests(keyword);
            }
        },

        handleInterestSearchInput(val) {
            clearTimeout(interestSearchDebounce);
            const query = (val || '').trim();
            if (!query) {
                const resultsBox = document.getElementById('intSearchResults');
                if (resultsBox) resultsBox.style.display = 'none';
                this.renderInterestTrendingSuggestions();
                return;
            }
            if (query.length < 2) return;

            interestSearchDebounce = setTimeout(() => {
                this.searchMovieForInterests(query);
            }, 300);
        },

        renderInterestTrendingSuggestions() {
            const galleryBox = document.getElementById('intMovieGallery');
            if (!galleryBox || !cachedTrendingList.length) return;

            galleryBox.innerHTML = cachedTrendingList.slice(0, 12).map(m => {
                const thumb = m.thumb_url || m.poster_url || '';
                const fullThumb = thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.replace(/^\//, '')}`;
                return `
                    <div onclick="DesktopHeroAdmin.selectInterestImage('${fullThumb}')" style="aspect-ratio:16/9;border-radius:7px;overflow:hidden;background:#000;position:relative;cursor:pointer;border:1.5px solid rgba(255,255,255,0.15);transition:all 0.2s;" onmouseover="this.style.borderColor='#a855f7';this.style.transform='scale(1.03)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.transform='scale(1)'">
                        <img src="${fullThumb}" style="width:100%;height:100%;object-fit:cover;">
                        <div style="position:absolute;bottom:2px;left:4px;right:4px;color:#fff;font-size:9.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 4px #000;">
                            ${m.name}
                        </div>
                    </div>
                `;
            }).join('');
        },

        async searchMovieForInterests(query) {
            const galleryBox = document.getElementById('intMovieGallery');
            const resultsBox = document.getElementById('intSearchResults');
            const indicator = document.getElementById('intSearchLoading');
            if (!query) return;

            if (indicator) indicator.style.display = 'inline';
            if (galleryBox) galleryBox.innerHTML = '<div style="color:#a855f7;font-size:12px;padding:12px;text-align:center;grid-column:1/-1;">⏳ Đang tìm kiếm & tải kho ảnh phim...</div>';

            try {
                let list = [];
                try {
                    const res = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=10&page=1`);
                    const data = await res.json();
                    if (data.status === 'success' && data.data?.items?.length) list = data.data.items;
                } catch(e) {}

                if (!list.length) {
                    try {
                        const res2 = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}`);
                        const data2 = await res2.json();
                        if (data2.data?.items?.length) list = data2.data.items;
                    } catch(e) {}
                }

                if (!list.length) {
                    if (resultsBox) {
                        resultsBox.style.display = 'block';
                        resultsBox.innerHTML = '<div style="color:#94a3b8;font-size:11.5px;padding:6px;text-align:center;">Không tìm thấy phim phù hợp.</div>';
                    }
                    if (galleryBox) galleryBox.innerHTML = '<div style="color:#94a3b8;font-size:11.5px;text-align:center;padding:10px;grid-column:1/-1;">Không có ảnh phù hợp.</div>';
                    return;
                }

                if (resultsBox) {
                    resultsBox.style.display = 'flex';
                    resultsBox.innerHTML = `
                        <div style="font-size:11px;color:#c084fc;font-weight:700;padding:2px 4px;">
                            ✨ Phim tìm thấy (${list.length} phim) - Chọn để tải trọn bộ Backdrop TMDB:
                        </div>
                    ` + list.slice(0, 6).map(m => {
                        const poster = m.poster_url || m.thumb_url || '';
                        const fullPoster = poster.startsWith('http') ? poster : `https://phimimg.com/${poster.replace(/^\//, '')}`;
                        const jsonStr = JSON.stringify({
                            name: m.name || '',
                            origin_name: m.origin_name || '',
                            slug: m.slug || '',
                            poster: fullPoster
                        }).replace(/"/g, '&quot;');

                        return `
                            <div onclick="DesktopHeroAdmin.selectInterestSearchMovie('${jsonStr}')" style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(255,255,255,0.06);border-radius:7px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='rgba(168,85,247,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                                <img src="${fullPoster}" style="width:28px;height:38px;border-radius:4px;object-fit:cover;background:#000;flex-shrink:0;">
                                <div style="flex:1;min-width:0;">
                                    <div style="color:#ffffff;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.name}</div>
                                    <div style="color:#94a3b8;font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.origin_name || ''} • <span style="color:#c084fc;">${m.year || ''}</span></div>
                                </div>
                                <span style="color:#c084fc;font-size:11px;font-weight:800;background:rgba(168,85,247,0.18);padding:3px 8px;border-radius:5px;flex-shrink:0;">Tải Ảnh ➔</span>
                            </div>
                        `;
                    }).join('');
                }

                // Automatically load backdrops for the 1st match
                const topMovie = list[0];
                this.loadBackdropsForInterestMovie(topMovie.name, topMovie.origin_name, topMovie.slug);

            } catch(e) {
                if (galleryBox) galleryBox.innerHTML = `<div style="color:#ef4444;font-size:12px;padding:6px;grid-column:1/-1;">Lỗi: ${e.message}</div>`;
            } finally {
                if (indicator) indicator.style.display = 'none';
            }
        },

        selectInterestSearchMovie(jsonStr) {
            try {
                const m = JSON.parse(jsonStr.replace(/&quot;/g, '"'));
                const resultsBox = document.getElementById('intSearchResults');
                if (resultsBox) resultsBox.style.display = 'none';

                this.loadBackdropsForInterestMovie(m.name, m.origin_name, m.slug);
                AdminNotice.toast(`Đang tải bộ sưu tập Backdrop cho "${m.name}"...`, 'info');
            } catch(e) {
                console.error('Lỗi selectInterestSearchMovie:', e);
            }
        },

        async loadBackdropsForInterestMovie(name, originName, slug) {
            const galleryBox = document.getElementById('intMovieGallery');
            if (!galleryBox) return;

            galleryBox.innerHTML = '<div style="color:#c084fc;font-size:12px;padding:12px;text-align:center;grid-column:1/-1;">⏳ Đang tải bộ sưu tập ảnh Backdrop TMDB...</div>';

            try {
                const queryParams = new URLSearchParams({
                    name: name || '',
                    origin_name: originName || '',
                    slug: slug || ''
                });

                const res = await fetch(`/api/settings/movie-backdrops?${queryParams.toString()}`);
                const data = await res.json();

                let backdrops = [];
                if (data.success && data.backdrops && data.backdrops.length > 0) {
                    backdrops = data.backdrops;
                }

                if (!backdrops.length) {
                    // Fallback to PhimAPI detail
                    try {
                        const res2 = await fetch(`https://phimapi.com/phim/${encodeURIComponent(slug)}`);
                        const data2 = await res2.json();
                        if (data2.status === true && data2.movie) {
                            const thumb = data2.movie.thumb_url || data2.movie.poster_url;
                            if (thumb) {
                                const fullThumb = thumb.startsWith('http') ? thumb : `https://phimimg.com/${thumb.replace(/^\//, '')}`;
                                backdrops.push({ url: fullThumb, previewUrl: fullThumb, width: 1920 });
                            }
                        }
                    } catch(e) {}
                }

                if (!backdrops.length) {
                    galleryBox.innerHTML = '<div style="color:#94a3b8;font-size:11.5px;text-align:center;padding:12px;grid-column:1/-1;">Không tìm thấy Backdrop TMDB. Bạn có thể dán link ảnh trực tiếp vào ô URL.</div>';
                    return;
                }

                galleryBox.innerHTML = backdrops.map(b => `
                    <div onclick="DesktopHeroAdmin.selectInterestImage('${b.url}')" style="aspect-ratio:16/9;border-radius:7px;overflow:hidden;background:#000;position:relative;cursor:pointer;border:2px solid rgba(255,255,255,0.15);transition:all 0.2s;" onmouseover="this.style.borderColor='#c084fc';this.style.transform='scale(1.03)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)';this.style.transform='scale(1)'">
                        <img src="${b.previewUrl || b.url}" style="width:100%;height:100%;object-fit:cover;">
                        <div style="position:absolute;bottom:3px;left:4px;background:rgba(0,0,0,0.75);color:#fff;font-size:8.5px;font-weight:700;padding:1px 4px;border-radius:3px;">
                            ${b.width ? `${b.width}p` : 'HD'}
                        </div>
                        <div style="position:absolute;top:3px;right:4px;background:#c084fc;color:#000;font-size:8.5px;font-weight:800;padding:1px 5px;border-radius:3px;">
                            Chọn
                        </div>
                    </div>
                `).join('');

                // Auto select first backdrop if user hasn't set one
                const currentImg = document.getElementById('intImageUrl')?.value;
                if (!currentImg && backdrops[0]) {
                    this.selectInterestImage(backdrops[0].url);
                }
            } catch (err) {
                galleryBox.innerHTML = `<div style="color:#ef4444;font-size:11.5px;padding:6px;grid-column:1/-1;">Lỗi tải ảnh: ${err.message}</div>`;
            }
        },

        selectInterestImage(url) {
            document.getElementById('intImageUrl').value = url;
            const previewImg = document.getElementById('intImgPreview');
            if (previewImg) previewImg.src = url;
            this.updateInterestLivePreview();
            AdminNotice.toast('✨ Đã chọn ảnh nền cho thẻ danh mục!', 'success');
        },

        setGradientPreset(gradientStr) {
            this.setColorPreset(this.extractHexFromCard({ gradient: gradientStr }));
        },

        async submitInterestsForm(e) {
            if (e) e.preventDefault();
            const index = parseInt(document.getElementById('intEditIndex')?.value || '-1', 10);
            if (index < 0 || index >= interestsCards.length) return;

            const hexColor = document.getElementById('intColorHex')?.value.trim() || document.getElementById('intColorPicker')?.value || '#8b5cf6';
            const iconName = document.getElementById('intIconName')?.value || 'tv';
            const iconColor = document.getElementById('intIconColorHex')?.value.trim() || document.getElementById('intIconColorPicker')?.value || '#ffffff';
            const textColor = document.getElementById('intTextColorHex')?.value.trim() || document.getElementById('intTextColorPicker')?.value || '#ffffff';
            const isNoAura = document.getElementById('intNoAura')?.value === 'true';
            const rgb = this.hexToRgb(hexColor);

            interestsCards[index].title = document.getElementById('intTitle')?.value.trim();
            interestsCards[index].link = document.getElementById('intLink')?.value.trim();
            interestsCards[index].imageUrl = document.getElementById('intImageUrl')?.value.trim();
            interestsCards[index].noAura = isNoAura;
            interestsCards[index].themeColor = isNoAura ? 'none' : hexColor;
            interestsCards[index].color = isNoAura ? 'none' : hexColor;
            interestsCards[index].colorRgb = isNoAura ? '0, 0, 0' : rgb;
            interestsCards[index].gradient = isNoAura ? 'none' : hexColor;
            interestsCards[index].iconName = iconName;
            interestsCards[index].iconColor = iconColor;
            interestsCards[index].textColor = textColor;
            interestsCards[index].iconSvg = this.iconSvgMap[iconName] || this.iconSvgMap.tv;

            this.closeInterestsModal();
            this.renderInterestsList();

            const token = getAdminToken();
            try {
                const res = await fetch('/api/settings/desktop-interests', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ items: interestsCards })
                });
                const data = await res.json();
                if (data.success) {
                    AdminNotice.toast('🎉 Đã lưu màu sắc, ảnh nền và biểu tượng danh mục thành công!', 'success');
                }
            } catch (e) {
                console.error('Lỗi lưu interests:', e);
            }

        }
    };

    window.DesktopHeroAdmin = DesktopHeroAdmin;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            DesktopHeroAdmin.init();
        });
    } else {
        DesktopHeroAdmin.init();
    }
})();
