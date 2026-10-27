/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎬 APHIM SOCIAL STUDIO CLIENT CONTROLLER (VANILLA JS)
 * ═══════════════════════════════════════════════════════════════════
 * - Primary Source: Main Website Movies (Phim Mới / Rạp / Bộ)
 * - Secondary Source: Phim Ngắn Drama Mini
 * - Collapsible Left Panel & Dual View Modes
 * - High-speed Dual-Engine AI (Groq 120B ~0.2s)
 * - Facebook Feed Simulator Multi-Photo Grid (1 - 4 images)
 */

(function () {
  'use strict';

  let currentMovie = null;
  let allMedia = [];
  let selectedMediaUrls = [];
  let isGenerating = false;
  let isRegenPostRunning = false;
  let isRegenCommentRunning = false;
  let isPublishing = false;
  let currentCatalog = 'main'; // 'main' (Phim chính) or 'phim-ngan'
  let initialMoviesList = [];
  let isLeftPanelCollapsed = false;
  let autoSaveTimer = null;

  // Facebook Reels Studio State
  let currentPostType = 'feed'; // 'feed' or 'reels'
  let currentDramaEpisodes = [];
  let selectedEpisode = null;
  let isPublishingReels = false;

  // Post History Pagination State
  let historyItems = [];
  let historyCurrentPage = 1;
  const HISTORY_PAGE_SIZE = 5;

  const SocialStudio = {
    init: function () {
      this.bindEvents();
      this.loadTrends();
      this.loadHistory();
      this.checkFbStatus();

      // Check if a saved session/draft exists on local machine
      const hasDraft = this.restoreDraft();
      if (!hasDraft) {
        this.loadInitialMovies(currentCatalog, false);
      } else {
        // Load shelf movies in background without overriding the restored draft
        this.loadInitialMovies(currentCatalog, true);
      }

      if (window.lucide) window.lucide.createIcons();
    },

    bindEvents: function () {
      const searchInput = document.getElementById('movieSearchInput');
      const dropdown = document.getElementById('movieSuggestDropdown');

      let debounceTimer = null;
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          clearTimeout(debounceTimer);
          const val = e.target.value.trim();
          if (val.length < 1) {
            dropdown.style.display = 'none';
            return;
          }
          debounceTimer = setTimeout(() => this.searchMovies(val), 200);
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
          }
        });
      }

      // ── Explicitly turn off spellchecking to eradicate browser red squiggly underlines ──
      ['fbPostTextarea', 'fbFirstCommentInput', 'customAIPromptInput', 'seoKeywordsInput', 'movieSearchInput', 'reelsCaptionInput', 'reelsFirstCommentInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('spellcheck', 'false');
          el.spellcheck = false;
        }
      });

      // ── Reels Caption input synchronization ──
      const reelsCaptionInput = document.getElementById('reelsCaptionInput');
      if (reelsCaptionInput) {
        reelsCaptionInput.addEventListener('input', () => {
          const previewEl = document.getElementById('reelsCaptionPreview');
          if (previewEl) previewEl.textContent = reelsCaptionInput.value;
          this.scheduleAutoSave();
        });
      }

      // ── Auto-save listeners on all editable controls ──
      const postTextarea = document.getElementById('fbPostTextarea');
      if (postTextarea) {
        postTextarea.addEventListener('input', () => this.scheduleAutoSave());
      }
      const commentInput = document.getElementById('fbFirstCommentInput');
      if (commentInput) {
        commentInput.addEventListener('input', () => this.scheduleAutoSave());
      }
      const promptInput = document.getElementById('customAIPromptInput');
      if (promptInput) {
        promptInput.addEventListener('input', () => this.scheduleAutoSave());
      }
      const seoInput = document.getElementById('seoKeywordsInput');
      if (seoInput) {
        seoInput.addEventListener('input', () => this.scheduleAutoSave());
      }
      const toneSelect = document.getElementById('aiToneSelect');
      if (toneSelect) {
        toneSelect.addEventListener('change', () => this.scheduleAutoSave());
      }

      // Immediate save when user unloads or switches away from the page
      window.addEventListener('beforeunload', () => this.saveDraft());

      // ── Bind Sidebar Collapse Button (next to brand logo) ──
      const btnSidebarCollapse = document.getElementById('btnToggleSidebarCollapse');
      if (btnSidebarCollapse) {
        btnSidebarCollapse.onclick = (e) => {
          e.preventDefault();
          const isCollapsed = document.documentElement.classList.toggle('sidebar-collapsed');
          document.body.classList.toggle('sidebar-collapsed', isCollapsed);
          const sidebar = document.getElementById('adminSidebar');
          if (sidebar) sidebar.classList.toggle('collapsed', isCollapsed);
          localStorage.setItem('aphim_admin_sidebar_collapsed', isCollapsed ? 'true' : 'false');
          if (window.lucide) window.lucide.createIcons();
        };
      }

      const headerSidebarToggle = document.getElementById('headerSidebarToggle');
      if (headerSidebarToggle) {
        headerSidebarToggle.onclick = (e) => {
          e.preventDefault();
          const isCollapsed = document.documentElement.classList.toggle('sidebar-collapsed');
          document.body.classList.toggle('sidebar-collapsed', isCollapsed);
          const sidebar = document.getElementById('adminSidebar');
          if (sidebar) sidebar.classList.toggle('collapsed', isCollapsed);
          localStorage.setItem('aphim_admin_sidebar_collapsed', isCollapsed ? 'true' : 'false');
          if (window.lucide) window.lucide.createIcons();
        };
      }

      // Keyboard navigation for Lightbox
      document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('socialStudioLightbox');
        if (!modal || modal.style.display !== 'flex') return;
        if (e.key === 'Escape') SocialStudio.closeLightbox();
        else if (e.key === 'ArrowLeft') SocialStudio.prevLightbox();
        else if (e.key === 'ArrowRight') SocialStudio.nextLightbox();
      });

      // ── Direct Event Binding for Independent Section Rewrite Buttons ──
      const btnRegenPost = document.getElementById('btnCardRegenPost');
      if (btnRegenPost) {
        btnRegenPost.onclick = (e) => {
          e.preventDefault();
          this.regeneratePostOnly();
        };
      }
      const btnRegenComment = document.getElementById('btnCardRegenComment');
      if (btnRegenComment) {
        btnRegenComment.onclick = (e) => {
          e.preventDefault();
          this.regenerateCommentOnly();
        };
      }
    },

    // ── 0. Layout Management: Collapse/Expand Left Column ──────────
    toggleLeftPanel: function () {
      this.setLayoutMode(isLeftPanelCollapsed ? 'split' : 'focus');
    },

    setLayoutMode: function (mode) {
      const grid = document.getElementById('studioWorkspaceGrid');
      const btnSplit = document.getElementById('btnModeSplit');
      const btnFocus = document.getElementById('btnModeFocus');
      const label = document.getElementById('labelToggleLeftCol');
      const icon = document.getElementById('iconToggleLeftCol');

      if (mode === 'focus') {
        isLeftPanelCollapsed = true;
        if (grid) grid.classList.add('left-collapsed');
        if (btnSplit) btnSplit.classList.remove('active');
        if (btnFocus) btnFocus.classList.add('active');
        if (label) label.textContent = 'Mở Bảng Trái';
        if (icon) icon.setAttribute('data-lucide', 'panel-left-open');
      } else {
        isLeftPanelCollapsed = false;
        if (grid) grid.classList.remove('left-collapsed');
        if (btnSplit) btnSplit.classList.add('active');
        if (btnFocus) btnFocus.classList.remove('active');
        if (label) label.textContent = 'Thu Gọn Bảng Trái';
        if (icon) icon.setAttribute('data-lucide', 'panel-left-close');
      }
      if (window.lucide) window.lucide.createIcons();
    },

    // ── 1. Catalog Switcher (Phim Chính vs Phim Ngắn) ───────────────
    switchCatalog: function (catalogType) {
      currentCatalog = catalogType;
      const tabMain = document.getElementById('tabSourceMain');
      const tabShort = document.getElementById('tabSourceShort');
      const badge = document.getElementById('catalogSourceBadge');

      if (catalogType === 'phim-ngan') {
        if (tabMain) tabMain.classList.remove('active');
        if (tabShort) tabShort.classList.add('active');
        if (badge) {
          badge.textContent = 'PHIM NGẮN DRAMA';
          badge.className = 'badge badge-gold';
        }
      } else {
        if (tabMain) tabMain.classList.add('active');
        if (tabShort) tabShort.classList.remove('active');
        if (badge) {
          badge.textContent = 'PHIM CHÍNH WEBSITE';
          badge.className = 'badge badge-primary';
        }
      }

      this.loadInitialMovies(catalogType);
    },

    // ── 2. Google Trends Real-Time Sync ──────────────────────────────
    loadTrends: async function () {
      const scrollEl = document.getElementById('trendsRadarScroll');
      if (!scrollEl) return;

      try {
        const res = await fetch('/api/admin/social-studio/trends');
        const json = await res.json();

        if (json.success && Array.isArray(json.trends) && json.trends.length > 0) {
          scrollEl.innerHTML = json.trends.map(t => `
            <div class="trend-pill-item" onclick="window.SocialStudio.applyTrendMovie('${t.title.replace(/'/g, "\\'")}', '${(t.traffic || '').replace(/'/g, "\\'")}')" title="Bấm để chọn ngay phim trend '${t.title}' & tạo bài viết viral">
              <i data-lucide="flame" style="width: 12px; height: 12px; color: #f97316;"></i>
              <span>${t.title}</span>
              <span class="trend-traffic-count">${t.traffic}</span>
            </div>
          `).join('');
          if (window.lucide) window.lucide.createIcons();
        } else {
          scrollEl.innerHTML = '<span style="font-size: 12px; color: #78716c;">Chưa có dữ liệu phim trends mới.</span>';
        }
      } catch (err) {
        scrollEl.innerHTML = '<span style="font-size: 12px; color: #ef4444;">Không thể tải Google Trends phim.</span>';
      }
    },

    applyTrendMovie: async function (trendTitle, traffic) {
      const searchInput = document.getElementById('movieSearchInput');
      const promptInput = document.getElementById('customAIPromptInput');
      
      if (searchInput) searchInput.value = trendTitle;
      if (promptInput) {
        promptInput.value = `Phim '${trendTitle}' đang là hiện tượng Top 1 Google Trends Việt Nam (${traffic}). Viết bài cực sốc ngắt đoạn rõ ràng từng ý, kèm hashtag xu hướng và thương hiệu #APhim #APhimSuper!`;
      }

      // Try searching for this trending movie
      try {
        const res = await fetch(`/api/admin/social-studio/movies?q=${encodeURIComponent(trendTitle)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.movies) && json.movies.length > 0) {
          this.selectMovie(json.movies[0]);
        } else {
          // If not in catalog yet, create a trending movie draft
          this.selectMovie({
            name: trendTitle,
            slug: trendTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-'),
            year: '2026',
            rating: '9.8',
            category: 'Phim Xu Hướng Hot',
            content: `Bộ phim ${trendTitle} đang dẫn đầu danh sách tìm kiếm trên Google Trends với lượng quan tâm tăng vọt ${traffic}.`
          });
        }
      } catch (e) {
        this.generateAI(true);
      }
    },

    // ── 3. Quick-Pick Shelf & Catalog Switcher ───────────────
    switchCatalog: async function (type) {
      currentCatalog = type;
      const tabMain = document.getElementById('tabSourceMain');
      const tabShort = document.getElementById('tabSourceShort');
      const badge = document.getElementById('catalogSourceBadge');
      const searchInput = document.getElementById('movieSearchInput');
      const dropdown = document.getElementById('movieSuggestDropdown');

      if (dropdown) dropdown.style.display = 'none';
      if (searchInput) searchInput.value = '';

      if (type === 'phim-ngan') {
        if (tabShort) tabShort.classList.add('active');
        if (tabMain) tabMain.classList.remove('active');
        if (badge) {
          badge.textContent = 'PHIM NGẮN (DRAMA MINI)';
          badge.style.background = 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)';
          badge.style.color = '#ffffff';
        }
        if (searchInput) {
          searchInput.placeholder = '🔍 Tìm kiếm phim ngắn, drama mini, tổng tài, vietsub, lồng tiếng...';
        }
      } else {
        if (tabMain) tabMain.classList.add('active');
        if (tabShort) tabShort.classList.remove('active');
        if (badge) {
          badge.textContent = 'PHIM CHÍNH WEBSITE';
          badge.style.background = '#4f46e5';
          badge.style.color = '#ffffff';
        }
        if (searchInput) {
          searchInput.placeholder = '🔍 Gõ tên phim bất kỳ để tìm nhanh (Phim Mới, Rạp, Bộ, Lẻ...)';
        }
      }

      await this.loadInitialMovies(type, false);
      if (window.lucide) window.lucide.createIcons();
    },

    loadInitialMovies: async function (type = 'main', isSilent = false) {
      const shelf = document.getElementById('quickPickShelf');
      if (shelf && !isSilent) shelf.innerHTML = `<div style="font-size: 12px; color: #78716c; padding: 6px;">Đang tải danh sách ${type === 'phim-ngan' ? 'phim ngắn' : 'phim chính'}...</div>`;

      try {
        const res = await fetch(`/api/admin/social-studio/movies?type=${encodeURIComponent(type)}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.movies) && json.movies.length > 0) {
          initialMoviesList = json.movies;

          // Render Quick-Pick Shelf
          if (shelf) {
            shelf.innerHTML = initialMoviesList.slice(0, 14).map((m, idx) => {
              const isActive = currentMovie ? currentMovie.slug === m.slug : (!isSilent && idx === 0);
              return `
              <div class="quick-pick-chip ${isActive ? 'active' : ''}" id="chip-movie-${m.slug}" onclick="window.SocialStudio.selectMovieBySlug('${m.slug}')">
                <img src="${m.poster_url || m.thumb_url || '/quangcao/no-cover.png'}" onerror="this.src='/quangcao/no-cover.png'" class="quick-pick-poster" alt="${m.name}">
                <div class="quick-pick-name" title="${m.name}">${m.name}</div>
                <div class="quick-pick-rating">⭐ ${m.rating || '9.5'}</div>
              </div>
            `;
            }).join('');
          }

          // Auto-select the first movie ONLY if not silent and no movie is currently set
          if (!isSilent && !currentMovie) {
            this.selectMovie(initialMoviesList[0]);
          }
        } else {
          if (shelf && !isSilent) shelf.innerHTML = '<div style="font-size: 12px; color: #78716c; padding: 6px;">Không tìm thấy phim.</div>';
        }
      } catch (e) {
        if (shelf && !isSilent) shelf.innerHTML = '<div style="font-size: 12px; color: #ef4444; padding: 6px;">Lỗi tải kho phim.</div>';
      }
    },

    selectMovieBySlug: function (slug) {
      const found = initialMoviesList.find(m => m.slug === slug);
      if (found) {
        this.selectMovie(found);
      }
    },

    searchMovies: async function (query) {
      const dropdown = document.getElementById('movieSuggestDropdown');
      dropdown.style.display = 'block';
      const isShort = currentCatalog === 'phim-ngan';
      dropdown.innerHTML = `<div style="padding: 10px; text-align: center; color: #78716c; font-size: 12px;">⏳ Đang tìm kiếm trong kho ${isShort ? 'Phim Ngắn / Drama Mini' : 'Phim Chính Website'}...</div>`;

      try {
        const res = await fetch(`/api/admin/social-studio/movies?q=${encodeURIComponent(query)}&type=${encodeURIComponent(currentCatalog)}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.movies) && json.movies.length > 0) {
          dropdown.innerHTML = json.movies.map(m => {
            const isShortItem = (m.sourceType === 'short') || isShort;
            const badgeHtml = isShortItem
              ? `<span style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #fff; font-size: 9.5px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 6px; white-space: nowrap;">🎥 PHIM NGẮN</span>`
              : `<span style="background: #e0e7ff; color: #4338ca; font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; white-space: nowrap;">🎬 PHIM CHÍNH</span>`;

            const epInfo = m.episodesCount ? ` · ${m.episodesCount} tập` : '';

            return `
            <div class="movie-suggest-item" onclick='window.SocialStudio.selectMovie(${JSON.stringify(m).replace(/'/g, "&apos;")})'>
              <img src="${m.poster_url || m.thumb_url || '/quangcao/no-cover.png'}" onerror="this.src='/quangcao/no-cover.png'" class="movie-suggest-thumb" alt="${m.name}">
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                  <div style="font-size: 13px; font-weight: 700; color: #1c1917; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.name}</div>
                  ${badgeHtml}
                </div>
                <div style="font-size: 11px; color: #78716c; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${m.origin_name || ''} · ${m.category || (isShortItem ? 'Drama Mini' : 'Phim Hay')}${epInfo} · ⭐ ${m.rating || 9.5}
                </div>
              </div>
            </div>
          `;
          }).join('');
        } else {
          dropdown.innerHTML = `<div style="padding: 12px; text-align: center; color: #78716c; font-size: 12px;">Không tìm thấy phim phù hợp trong kho <b>${isShort ? 'Phim Ngắn' : 'Phim Chính'}</b>.<br><span style="font-size: 11px; color: #a8a29e;">Thử từ khóa khác (ví dụ: ${isShort ? 'tổng tài, bé cưng, hào môn...' : 'avatar, người nhện, batman...'})</span></div>`;
        }
      } catch (e) {
        dropdown.innerHTML = `<div style="padding: 10px; text-align: center; color: #ef4444; font-size: 12px;">Lỗi tìm kiếm: ${e.message}</div>`;
      }
    },

    selectMovie: async function (movie, autoGen = true) {
      currentMovie = movie;
      const dropdown = document.getElementById('movieSuggestDropdown');
      if (dropdown) dropdown.style.display = 'none';

      const searchInput = document.getElementById('movieSearchInput');
      if (searchInput) searchInput.value = movie.name;

      // Update Quick-Pick Active State
      document.querySelectorAll('.quick-pick-chip').forEach(c => c.classList.remove('active'));
      const activeChip = document.getElementById(`chip-movie-${movie.slug}`);
      if (activeChip) activeChip.classList.add('active');

      // Show Selected Movie Card
      const card = document.getElementById('selectedMovieCard');
      card.style.display = 'flex';
      document.getElementById('selMoviePoster').src = movie.poster_url || movie.thumb_url || '/quangcao/no-cover.png';
      document.getElementById('selMovieTitle').textContent = movie.name;
      document.getElementById('selMovieRating').textContent = `${movie.rating || 9.5} ⭐`;
      document.getElementById('selMovieMeta').textContent = `${movie.category || 'Phim Mới'} · ${movie.year || '2026'}`;
      document.getElementById('selMovieOverview').textContent = movie.content || 'Đang cập nhật tóm tắt nội dung hấp dẫn...';

      // Pre-fill first comment with watch link
      const siteUrl = 'https://aphim.store';
      const commentInput = document.getElementById('fbFirstCommentInput');
      if (commentInput) {
        commentInput.value = `👉 Xem phim trọn bộ FHD Vietsub tại: ${siteUrl}/phim/${movie.slug}\nChúc cả nhà xem phim vui vẻ! 🍿🎬`;
      }

      // Short Drama Auto-Detection: Show Episodes Card & Switch to Reels Mode
      const isShortDrama = (movie.sourceType === 'short') || (currentCatalog === 'phim-ngan') || (movie.category && movie.category.toLowerCase().includes('ngắn')) || (Array.isArray(movie.episodes) && movie.episodes.length > 0);
      const dramaCard = document.getElementById('cardDramaEpisodes');

      if (isShortDrama) {
        if (dramaCard) dramaCard.style.display = 'block';
        await this.loadDramaEpisodes(movie.slug);
        this.setPostType('reels');
      } else {
        if (dramaCard) dramaCard.style.display = 'none';
        this.setPostType('feed');
      }

      // Fetch all available media
      await this.loadMovieMedia(movie.slug);

      // Auto-trigger AI generation immediately if requested
      if (autoGen) {
        this.generateAI();
      }
      this.scheduleAutoSave();
    },

    // ── 3B. Facebook Reels Studio Controller (Video 9:16) ────────────
    setPostType: function (type) {
      currentPostType = type;
      const btnFeed = document.getElementById('btnModeFeed');
      const btnReels = document.getElementById('btnModeReels');
      const feedSec = document.getElementById('feedSimulatorSection');
      const reelsSec = document.getElementById('reelsSimulatorSection');

      if (type === 'reels') {
        if (btnFeed) btnFeed.classList.remove('active');
        if (btnReels) btnReels.classList.add('active');
        if (feedSec) feedSec.style.display = 'none';
        if (reelsSec) reelsSec.style.display = 'block';

        // If no episode selected yet but drama has episodes, select episode 1
        if (!selectedEpisode && currentDramaEpisodes.length > 0) {
          this.selectDramaEpisode(1);
        }
      } else {
        if (btnFeed) btnFeed.classList.add('active');
        if (btnReels) btnReels.classList.remove('active');
        if (feedSec) feedSec.style.display = 'block';
        if (reelsSec) reelsSec.style.display = 'none';
      }
      if (window.lucide) window.lucide.createIcons();
    },

    loadDramaEpisodes: async function (slug) {
      const card = document.getElementById('cardDramaEpisodes');
      const grid = document.getElementById('dramaEpisodesGrid');
      const countBadge = document.getElementById('dramaEpCountBadge');

      if (card) card.style.display = 'block';
      if (grid) grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 14px; text-align: center; color: #78716c; font-size: 12px;">Đang tải danh sách tập phim ngắn...</div>';

      try {
        const res = await fetch(`/api/admin/social-studio/drama-episodes/${encodeURIComponent(slug)}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.episodes) && json.episodes.length > 0) {
          currentDramaEpisodes = json.episodes;
          if (countBadge) countBadge.textContent = `${currentDramaEpisodes.length} Tập`;

          if (grid) {
            grid.innerHTML = currentDramaEpisodes.map(ep => `
              <div class="episode-btn ${ep.no === 1 ? 'active' : ''}" id="btn-ep-${ep.no}" onclick="window.SocialStudio.selectDramaEpisode(${ep.no})" title="${ep.title} (~${ep.duration || 90}s)">
                <span class="episode-num">Tập ${ep.no}</span>
                <span class="episode-dur">${ep.duration || 90}s · HD</span>
              </div>
            `).join('');
          }

          // Select Episode 1 by default
          this.selectDramaEpisode(1);
        } else {
          if (grid) grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 12px; text-align: center; color: #78716c; font-size: 12px;">Chưa có danh sách tập cho phim này.</div>';
        }
      } catch (e) {
        if (grid) grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 12px; text-align: center; color: #ef4444; font-size: 12px;">Lỗi kết nối tải tập phim.</div>';
      }
    },

    selectDramaEpisode: function (epNo) {
      const ep = currentDramaEpisodes.find(e => e.no === epNo);
      if (!ep) return;
      selectedEpisode = ep;

      // Update UI active states
      document.querySelectorAll('.episode-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById(`btn-ep-${epNo}`);
      if (activeBtn) activeBtn.classList.add('active');

      const badgeNum = document.getElementById('badgeActiveEpNum');
      if (badgeNum) badgeNum.textContent = `TẬP ${ep.no}`;

      const labelTitle = document.getElementById('labelActiveEpTitle');
      if (labelTitle) labelTitle.textContent = `Đang chọn: ${ep.title || 'Tập ' + ep.no}`;

      const reelsEpBadge = document.getElementById('reelsEpisodeBadge');
      if (reelsEpBadge) reelsEpBadge.textContent = `Tập ${ep.no}`;

      const durTag = document.getElementById('reelsEpDurationTag');
      if (durTag) durTag.textContent = `${ep.duration || 90}s`;

      // Update Video Player
      const videoPlayer = document.getElementById('reelsVideoPlayer');
      if (videoPlayer) {
        const streamSrc = ep.streamUrl || ep.url;
        if (streamSrc) {
          videoPlayer.src = streamSrc;
          videoPlayer.load();
        }
      }

      // Generate or refresh Reels caption
      this.generateReelsCaption();
    },

    generateReelsCaption: async function (options = {}) {
      const movie = this.ensureCurrentMovie();
      const movieTitle = movie ? movie.name : 'Phim Ngắn Cực Hay';
      const movieSlug = movie ? (movie.slug || 'phim-ngan') : 'phim-ngan';
      const epNum = selectedEpisode ? selectedEpisode.no : 1;
      const movieTag = movieTitle.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '');
      const movieLink = `https://aphim.store/phim/${movieSlug}`;

      const btn = document.getElementById('btnGenerateReelsCaption');
      const captionTextarea = document.getElementById('reelsCaptionInput');
      const firstCommentInput = document.getElementById('reelsFirstCommentInput');
      const previewEl = document.getElementById('reelsCaptionPreview');

      const origBtnHtml = btn ? btn.innerHTML : '';
      if (btn) {
        btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 12px; height: 12px;"></i> Đang tạo AI...';
        btn.disabled = true;
        if (window.lucide) window.lucide.createIcons();
      }

      let generatedCaption = '';
      let generatedComment = '';

      // 1. Cố gắng tạo bằng AI qua backend API
      try {
        const res = await fetch('/api/admin/social-studio/generate-reels-caption', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dramaTitle: movieTitle,
            episodeNo: epNum,
            slug: movieSlug,
            summary: movie ? (movie.content || movie.description || '') : ''
          })
        });
        const data = await res.json();
        if (data && data.success && data.caption) {
          generatedCaption = data.caption;
          if (data.firstComment) generatedComment = data.firstComment;
        }
      } catch (err) {
        console.warn('[SocialStudio] AI generation error, using rich local engine:', err);
      }

      // 2. Nếu AI chưa có sẵn (hoặc fallback), dùng bộ sinh nội dung đa dạng chống lặp (Anti-Repeat Engine)
      if (!generatedCaption) {
        const currentCaption = captionTextarea ? captionTextarea.value.trim() : '';

        const hookVariants = [
          `⚡ [TẬP ${epNum}] ${movieTitle.toUpperCase()}: CÚ LẬT KÈO KHIẾN TẤT CẢ NÍN THỞ! 😱`,
          `🔥 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: BÍ MẬT THÂN PHẬN CUỐI CÙNG BỊ PHƠI BÀY! 💥`,
          `🎬 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: ĐỪNG ĐÙA VỚI NỮ CHÍNH KHI CÔ ẤY ĐÃ TRỞ LẠI! ✨`,
          `🍿 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: DIỄN BIẾN CAO TRÀO KHÔNG THỂ BỎ LỠ! ⚡`,
          `💥 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: BẢN LĨNH THỰC SỰ ĐƯỢC CHỨNG MINH! 🚀`,
          `👑 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: VẠCH TRẦN BỘ MẶT GIẢ TẠO TRƯỚC MẶT CẢ GIA TỘC! 🔥`,
          `⚡ [TẬP ${epNum}] ${movieTitle.toUpperCase()}: TỰ TAY ĐẬP TAN ÂM MƯU CỦA KẺ PHẢN BỘI! 💥`,
          `✨ [TẬP ${epNum}] ${movieTitle.toUpperCase()}: AI MỚI THỰC SỰ LÀ CHỦ NHÂN CỦA VÁN CỜ NÀY? 🎭`,
          `💅 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: MÀN ĐÁP TRẢ CỰC GẮT KHIẾN TRÀ XANH CÂM NÍN! 🍿`,
          `🔥 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: TỔNG TÀI ĐÍCH THÂN RA TAY BẢO VỆ NGƯỜI PHỤ NỮ CỦA MÌNH! 👑`,
          `😱 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: TÌNH THẾ NGÀN CÂN TREO SỢI TÓC, CÚ BẺ LÁI KHÔNG AI NGỜ! ⚡`,
          `💥 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: LỘT MẶT NẠ KẺ GIẢ MẠO, CẢ HÀO MÔN CHẾT LẶNG! 🚀`,
          `🎬 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: ĐỪNG TƯỞNG DỄ BẮT NẠT, MÀN PHẢN KÍCH MÃN NHÃN TỪNG GIÂY! ⚡`,
          `🍿 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: SỰ THẬT TÀN NHẪN ĐƯỢC HÉ LỘ SAU BAO NĂM GIẤU KÍN! 💥`,
          `🚀 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: MÀN LỘI NGƯỢC DÒNG ĐỈNH CAO CỦA KẺ TỪNG BỊ COI THƯỜNG! 👑`,
          `⚡ [TẬP ${epNum}] ${movieTitle.toUpperCase()}: CAO TRÀO NGHẸT THỞ, TỪNG GIÂY ĐỀU KHÔNG THỂ RỜI MẮT! 😱`,
          `🔥 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: MÂU THUẪN BÙNG NỔ ĐẾN ĐỈNH ĐIỂM, MỘT MẤT MỘT CÒN! 💥`,
          `🎭 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: CỨ TƯỞNG THẮNG CHẮC, AI NGỜ LẠI LÀ CHIẾC BẪY TINH VI! ⚡`,
          `👑 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: ĐỐI ĐẦU NẢY LỬA, KẺ THỦ ÁC BẮT ĐẦU HOẢNG LOẠN! 🚀`,
          `✨ [TẬP ${epNum}] ${movieTitle.toUpperCase()}: ĐỨNG HÌNH TRƯỚC PHA XỬ LÝ QUÁ ĐỖI THÔNG MINH! 💅`,
          `🍿 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: HÀO MÔN DẬY SÓNG, CƠN BÃO BẮT ĐẦU NỔI LÊN! 🔥`,
          `💥 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: ĐỈNH CAO ĐẤU TRÍ, ĐI TRƯỚC ĐỐI THỦ MỘT BƯỚC CỜ! ⚡`,
          `🎬 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: MÀN TRỪNG TRỊ THÍCH ĐÁNG KHIẾN NGƯỜI XEM HẢ HÊ! 🚀`,
          `😱 [TẬP ${epNum}] ${movieTitle.toUpperCase()}: BỨC MÀN NHUNG ĐÃ HẠ, AI LÀ BẠN VÀ AI LÀ THÙ? ⚡`
        ];

        const bodyVariants = [
          `Diễn xuất bùng nổ, tình tiết dồn dập khiến người xem không thể rời mắt khỏi màn hình! Càng xem càng cuốn không dứt ra được.`,
          `Một tập phim nghẹt thở với những toan tính khó lường. Liệu kết cục nào đang chờ đợi ở những tập tiếp theo?`,
          `Cú twist bất ngờ đảo lộn mọi dự đoán của khán giả! Đỉnh cao kịch tính của drama mini hot nhất hiện nay.`,
          `Màn ra tay dứt khoát khiến đối phương không kịp trở tay. Xem đến đoạn này thực sự quá đã và quá thỏa mãn!`,
          `Từng ánh mắt, cử chỉ đều toát lên thần thái đỉnh cao. Phản ứng hóa học giữa hai nhân vật chính bùng nổ vượt ngoài mong đợi!`,
          `Không khí căng như dây đàn, từng nút thắt được tháo gỡ thông minh đưa khán giả đi từ bất ngờ này sang kinh ngạc khác.`,
          `Khi lòng người bị thử thách, chân tướng hé lộ cũng là lúc thế cờ hoàn toàn xoay chuyển. Quá kịch tính và cuốn hút!`,
          `Nhịp phim nhanh gọn, dứt khoát, không một giây thừa thãi. Càng về sau các phân cảnh đối đầu càng nghẹt thở!`,
          `Một pha xử lý quá bản lĩnh chứng minh ai mới là người nắm giữ quyền lực thật sự. Khán giả chỉ biết vỗ tay thán phục!`,
          `Cảm xúc được đẩy lên cao trào tột độ. Xem xong tập này chắc chắn bạn sẽ phải tìm ngay tập kế tiếp để xem tiếp!`
        ];

        const ctaVariants = [
          `👉 Xem TRỌN BỘ ${movieTitle} Full HD Vietsub tại: ${movieLink}`,
          `🍿 Đừng bỏ lỡ trọn bộ Full HD Vietsub tốc độ cao tại: ${movieLink}`,
          `🎬 Trọn bộ không quảng cáo đã có sẵn tại: ${movieLink}`,
          `✨ Khám phá toàn bộ diễn biến các tập tiếp theo tại: ${movieLink}`,
          `🚀 Link xem trọn bộ siêu nét, cập nhật sớm nhất: ${movieLink}`
        ];

        // Lọc bỏ hook và body đang hiển thị để đảm bảo 100% đổi mới mỗi lần bấm
        const availableHooks = hookVariants.filter(h => !currentCaption.includes(h.substring(0, 30)));
        const finalHookPool = availableHooks.length > 0 ? availableHooks : hookVariants;
        const selectedHook = finalHookPool[Math.floor(Math.random() * finalHookPool.length)];

        const availableBodies = bodyVariants.filter(b => !currentCaption.includes(b.substring(0, 30)));
        const finalBodyPool = availableBodies.length > 0 ? availableBodies : bodyVariants;
        const selectedBody = finalBodyPool[Math.floor(Math.random() * finalBodyPool.length)];

        const selectedCta = ctaVariants[Math.floor(Math.random() * ctaVariants.length)];
        const hashtags = `#APhim #APhimSuper #PhimNgan #DramaMini #ReelsPhim #${movieTag} #TrendingReels #XemPhimOnline`;

        generatedCaption = `${selectedHook}\n\n${selectedBody}\n\n${selectedCta}\n\n${hashtags}`;
      }

      if (captionTextarea) {
        captionTextarea.value = generatedCaption;
        // Hiệu ứng phát sáng visual feedback để người dùng thấy rõ caption đã thay đổi
        captionTextarea.style.transition = 'all 0.35s ease';
        captionTextarea.style.borderColor = '#ec4899';
        captionTextarea.style.boxShadow = '0 0 0 3px rgba(236, 72, 153, 0.25)';
        setTimeout(() => {
          captionTextarea.style.borderColor = '#e2e8f0';
          captionTextarea.style.boxShadow = 'none';
        }, 800);
      }

      if (previewEl) {
        const firstLine = generatedCaption.split('\n')[0] || '';
        const secondLine = (generatedCaption.split('\n\n')[1] || '').split('\n')[0] || '';
        previewEl.textContent = `${firstLine} ${secondLine}`.trim();
      }

      if (firstCommentInput) {
        const commentVariants = [
          `👉 Xem trọn bộ "${movieTitle}" Full HD Vietsub tốc độ cao tại:\n${movieLink}\nChúc cả nhà xem phim vui vẻ! 🍿🎬`,
          `🍿 Link xem trọn bộ bản đẹp nhất mình đã ghim sẵn tại đây nha:\n👉 ${movieLink}\nMọi người xem đến tập mấy rồi, cmt cho mình biết với nhé! ✨`,
          `🎬 Tập tiếp theo còn gay cấn gấp bội! Xem trọn bộ không chờ đợi tại:\n👉 ${movieLink}\nThả tim và follow kênh để không bỏ lỡ các tập mới nhất nha! ❤️🔥`,
          `✨ Khám phá trọn bộ diễn biến kịch tính Full HD tại:\n👉 ${movieLink}\nBật mí là cú twist phía sau sẽ khiến bạn đứng hình đấy! 😱🍿`
        ];
        firstCommentInput.value = generatedComment || commentVariants[Math.floor(Math.random() * commentVariants.length)];
      }

      if (btn) {
        btn.innerHTML = '<i data-lucide="check" style="width: 12px; height: 12px; color: #10b981;"></i> Đã tạo mới!';
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = origBtnHtml || '<i data-lucide="sparkles" style="width: 12px; height: 12px;"></i> Tạo Lại Caption Reels';
          btn.disabled = false;
          if (window.lucide) window.lucide.createIcons();
        }, 900);
      }

      if (typeof showToast === 'function') {
        showToast(`✨ Đã tạo caption Reels mới cho Tập ${epNum}!`, 'success');
      }
    },

    publishReels: async function () {
      if (!selectedEpisode) {
        alert('Vui lòng chọn một tập phim ngắn ở Bước 1B trước khi đăng Reels.');
        return;
      }

      const videoUrl = selectedEpisode.streamUrl || selectedEpisode.url;
      if (!videoUrl) {
        alert('Tập phim này không có link video hợp lệ.');
        return;
      }

      const caption = (document.getElementById('reelsCaptionInput').value || '').trim();
      const firstComment = (document.getElementById('reelsFirstCommentInput').value || '').trim();
      const movie = this.ensureCurrentMovie();

      if (isPublishingReels) return;

      const btn = document.getElementById('btnPublishReels');
      const origText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 17px; height: 17px;"></i> <span>Đang tải video & xuất bản Reels lên Meta (khoảng 3 - 5s)...</span>';
      btn.disabled = true;
      isPublishingReels = true;
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetch('/api/admin/social-studio/publish-reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl,
            caption,
            firstComment,
            dramaTitle: movie ? movie.name : 'Phim Ngắn',
            episodeNo: selectedEpisode.no,
            slug: movie ? movie.slug : 'phim'
          })
        });

        const rawText = await res.text();
        let json = null;
        try { json = JSON.parse(rawText); } catch (e) {
          throw new Error('Máy chủ trả về phản hồi không hợp lệ: ' + rawText);
        }

        if (json.success) {
          const reelsLink = json.postLink || `https://www.facebook.com/reel/${json.videoId}`;
          alert(`🎉 XUẤT BẢN FACEBOOK REELS THÀNH CÔNG RỰC RỠ!\n\n🎬 Tập: ${selectedEpisode.no} - ${movie.name}\n🎥 Reels ID: ${json.videoId}\n🔗 Link: ${reelsLink}\n\nVideo Reels đang được Facebook xử lý và hiển thị ngay trên Fanpage APhim Super!`);
          this.loadHistory();
        } else {
          alert('❌ Lỗi đăng Reels: ' + (json.error || 'Facebook từ chối xuất bản'));
        }
      } catch (err) {
        alert('❌ Lỗi kết nối khi đăng Reels: ' + err.message);
      } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
        isPublishingReels = false;
        if (window.lucide) window.lucide.createIcons();
      }
    },

    copyReelsCaption: function () {
      const text = document.getElementById('reelsCaptionInput').value;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        alert('Đã sao chép nội dung Caption Reels vào bộ nhớ tạm!');
      });
    },

    // ── 4. Media Extraction & Multi-Photo Layout ────────────────────
    loadMovieMedia: async function (slug) {
      const gallery = document.getElementById('movieMediaGallery');
      gallery.innerHTML = '<div style="grid-column: 1 / -1; padding: 12px; text-align: center; color: #78716c; font-size: 12px;">Đang tải toàn bộ ảnh Poster & Cảnh phim...</div>';
      selectedMediaUrls = [];

      try {
        const res = await fetch(`/api/admin/social-studio/movie-media/${encodeURIComponent(slug)}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.media) && json.media.length > 0) {
          allMedia = json.media;

          // If currentMovie didn't have synopsis before, update it from fetched detail
          if (json.movie && json.movie.content && currentMovie) {
            currentMovie.content = json.movie.content;
            const overviewEl = document.getElementById('selMovieOverview');
            if (overviewEl) overviewEl.textContent = json.movie.content;
          }

          // Default select up to first 4 images
          selectedMediaUrls = allMedia.slice(0, 4).map(m => m.url);
          this.renderMediaGallery();
          this.renderFbPhotoGrid();
        } else {
          // Fallback to poster and thumb from currentMovie
          if (currentMovie && (currentMovie.poster_url || currentMovie.thumb_url)) {
            allMedia = [
              { url: currentMovie.poster_url, label: 'Poster Chính', type: 'poster' },
              { url: currentMovie.thumb_url, label: 'Ảnh Bìa Ngang', type: 'backdrop' }
            ].filter(m => !!m.url);
            selectedMediaUrls = allMedia.map(m => m.url);
            this.renderMediaGallery();
            this.renderFbPhotoGrid();
          } else {
            gallery.innerHTML = '<div style="grid-column: 1 / -1; padding: 12px; text-align: center; color: #78716c; font-size: 12px;">Không tìm thấy ảnh sẵn có. Bạn có thể tải ảnh lên bên dưới.</div>';
          }
        }
      } catch (err) {
        gallery.innerHTML = '<div style="grid-column: 1 / -1; padding: 12px; text-align: center; color: #ef4444; font-size: 12px;">Lỗi khi tải ảnh phim.</div>';
      }
    },

    renderMediaGallery: function () {
      const gallery = document.getElementById('movieMediaGallery');
      const badge = document.getElementById('selectedPhotoCountBadge');
      if (badge) badge.textContent = `Đã chọn: ${selectedMediaUrls.length} Ảnh`;

      if (!allMedia || allMedia.length === 0) {
        gallery.innerHTML = '<div style="grid-column: 1 / -1; padding: 12px; text-align: center; color: #78716c; font-size: 12px;">Không có hình ảnh.</div>';
        return;
      }

      gallery.innerHTML = allMedia.map((item, idx) => {
        const isSelected = selectedMediaUrls.includes(item.url);
        const orderNum = isSelected ? selectedMediaUrls.indexOf(item.url) + 1 : '';
        return `
          <div class="media-thumb-item ${isSelected ? 'selected' : ''}" onclick="window.SocialStudio.toggleMediaSelect('${item.url}')">
            <img src="${item.url}" onerror="this.onerror=null;this.src='/quangcao/no-cover.png'" alt="${item.label}">
            <div class="media-thumb-badge">${orderNum}</div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.65); color: #fff; font-size: 9px; padding: 2px 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${item.label || ('Ảnh ' + (idx + 1))}
            </div>
          </div>
        `;
      }).join('');
    },

    toggleMediaSelect: function (url) {
      const idx = selectedMediaUrls.indexOf(url);
      if (idx > -1) {
        selectedMediaUrls.splice(idx, 1);
      } else {
        selectedMediaUrls.push(url);
      }
      this.renderMediaGallery();
      this.renderFbPhotoGrid();
      this.scheduleAutoSave();
    },

    selectAllMedia: function () {
      if (!allMedia || allMedia.length === 0) return;
      selectedMediaUrls = allMedia.map(m => m.url);
      this.renderMediaGallery();
      this.renderFbPhotoGrid();
      this.scheduleAutoSave();
    },

    clearAllMedia: function () {
      selectedMediaUrls = [];
      this.renderMediaGallery();
      this.renderFbPhotoGrid();
      this.scheduleAutoSave();
    },

    renderFbPhotoGrid: function () {
      const grid = document.getElementById('fbPhotoGrid');
      const indicator = document.getElementById('fbPhotoCountIndicator');
      if (!grid) return;

      const count = selectedMediaUrls.length;
      if (count === 0) {
        grid.style.display = 'none';
        grid.innerHTML = '';
        if (indicator) indicator.style.display = 'none';
        return;
      }

      grid.style.display = 'grid';
      if (indicator) {
        indicator.style.display = 'flex';
        indicator.innerHTML = `<i data-lucide="images" style="width: 14px; height: 14px;"></i> Đang hiển thị trọn vẹn cả <strong>${count} / ${count}</strong> ảnh đã chọn · Nhấp vào ảnh để phóng to xem chi tiết`;
        if (window.lucide) window.lucide.createIcons();
      }

      // Responsive grid layout based on exact count
      if (count === 1) {
        grid.className = 'fb-photo-grid grid-1';
      } else if (count === 2) {
        grid.className = 'fb-photo-grid grid-2';
      } else if (count === 3) {
        grid.className = 'fb-photo-grid grid-3';
      } else if (count === 4) {
        grid.className = 'fb-photo-grid grid-4';
      } else if (count === 5) {
        grid.className = 'fb-photo-grid grid-5';
      } else if (count === 6) {
        grid.className = 'fb-photo-grid grid-6';
      } else {
        grid.className = 'fb-photo-grid grid-many';
      }

      // Render every single selected photo
      grid.innerHTML = selectedMediaUrls.map((url, idx) => `
        <div class="fb-photo-item" onclick="window.SocialStudio.openLightbox(${idx})" title="Nhấp để xem ảnh #${idx + 1} kích thước đầy đủ">
          <img src="${url}" onerror="this.onerror=null;this.src='/quangcao/no-cover.png'" alt="Ảnh ${idx + 1}">
          <div class="fb-photo-item-badge">#${idx + 1}</div>
          <div class="fb-photo-item-zoom">🔍</div>
        </div>
      `).join('');
    },

    // ── 5. Lightbox Fullscreen Photo Viewer ────────────────────────
    currentLightboxIndex: 0,

    openLightbox: function (idx) {
      if (!selectedMediaUrls || selectedMediaUrls.length === 0) return;
      this.currentLightboxIndex = (idx >= 0 && idx < selectedMediaUrls.length) ? idx : 0;
      this.updateLightbox();
      const modal = document.getElementById('socialStudioLightbox');
      if (modal) modal.style.display = 'flex';
    },

    closeLightbox: function (e) {
      if (e && e.target && e.target.closest('.studio-lightbox-content') && !e.target.classList.contains('studio-lightbox-close')) {
        return;
      }
      const modal = document.getElementById('socialStudioLightbox');
      if (modal) modal.style.display = 'none';
    },

    prevLightbox: function () {
      if (!selectedMediaUrls || selectedMediaUrls.length === 0) return;
      this.currentLightboxIndex = (this.currentLightboxIndex - 1 + selectedMediaUrls.length) % selectedMediaUrls.length;
      this.updateLightbox();
    },

    nextLightbox: function () {
      if (!selectedMediaUrls || selectedMediaUrls.length === 0) return;
      this.currentLightboxIndex = (this.currentLightboxIndex + 1) % selectedMediaUrls.length;
      this.updateLightbox();
    },

    updateLightbox: function () {
      const img = document.getElementById('studioLightboxImg');
      const caption = document.getElementById('studioLightboxCaption');
      if (!img || !caption) return;
      const url = selectedMediaUrls[this.currentLightboxIndex];
      img.src = url;
      caption.textContent = `Ảnh ${this.currentLightboxIndex + 1} / ${selectedMediaUrls.length}`;
    },

    // ── 6. Custom File Upload (Pure Client Memory — Zero Disk Bloat) ──
    compressImageFile: function (file) {
      return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 1920;
            let width = img.width;
            let height = img.height;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            try {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to standard Facebook JPEG 0.88 quality
              const compressed = canvas.toDataURL('image/jpeg', 0.88);
              resolve(compressed);
            } catch (err) {
              resolve(e.target.result);
            }
          };
          img.onerror = () => resolve(e.target.result);
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    handleFileUpload: async function (input) {
      if (!input.files || input.files.length === 0) return;
      const files = Array.from(input.files);

      for (const file of files) {
        try {
          const base64Url = await this.compressImageFile(file);
          allMedia.unshift({
            url: base64Url,
            label: file.name || 'Ảnh tải lên từ máy tính',
            type: 'custom'
          });
          selectedMediaUrls.push(base64Url);
        } catch (err) {
          console.warn('[SocialStudio] Error reading upload:', err);
        }
      }

      this.renderMediaGallery();
      this.renderFbPhotoGrid();
      this.scheduleAutoSave();
      input.value = '';
    },

    addCustomUrlImage: function () {
      const input = document.getElementById('customImageUrlInput');
      const url = (input.value || '').trim();
      if (!url) return;

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Vui lòng nhập đường link ảnh hợp lệ (bắt đầu bằng https://)');
        return;
      }

      allMedia.unshift({ url, label: 'Ảnh Link Ngoài', type: 'custom' });
      selectedMediaUrls.push(url);
      input.value = '';
      this.renderMediaGallery();
      this.renderFbPhotoGrid();
      this.scheduleAutoSave();
    },

    sanitizeVietnameseText: function (text) {
      if (!text || typeof text !== 'string') return '';
      let clean = text.normalize('NFKC');
      clean = clean.replace(/\uFFFD/g, '');
      clean = clean.replace(/B[\s\uFFFD\?]*n\s+có\s+dám/gi, 'Bạn có dám');
      clean = clean.replace(/(^|[\s\p{P}\p{S}])Bn(?=[\s\p{P}\p{S}]|$)/gu, '$1Bạn');
      clean = clean.replace(/(^|[\s\p{P}\p{S}])bn(?=[\s\p{P}\p{S}]|$)/gu, '$1bạn');
      clean = clean.replace(/B\?+n\b/gi, 'Bạn');
      clean = clean.replace(/b\?+n\b/g, 'bạn');
      return clean;
    },

    setLengthPreset: function (preset) {
      const input = document.getElementById('aiLengthInput');
      if (input) input.value = preset;
      const group = document.getElementById('aiLengthPillGroup');
      if (group) {
        group.querySelectorAll('.studio-pill-btn').forEach(btn => {
          if (btn.getAttribute('data-length') === preset) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
      const hint = document.getElementById('aiLengthHint');
      if (hint) {
        if (preset === 'short') hint.textContent = 'Khoảng 180 - 250 từ (Ngắn gọn, kịch tính)';
        else if (preset === 'standard') hint.textContent = 'Khoảng 350 - 500 từ (Chuẩn SEO Facebook)';
        else if (preset === 'deep') hint.textContent = 'Khoảng 600 - 850 từ (Phân tích sâu, blogger)';
      }
      this.scheduleAutoSave();
    },

    setGoalPreset: function (preset) {
      const input = document.getElementById('aiGoalInput');
      if (input) input.value = preset;
      const group = document.getElementById('aiGoalPillGroup');
      if (group) {
        group.querySelectorAll('.studio-pill-btn').forEach(btn => {
          if (btn.getAttribute('data-goal') === preset) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
      this.scheduleAutoSave();
    },

    addIdeaChip: function (text) {
      const input = document.getElementById('customAIPromptInput');
      if (!input) return;
      if (!input.value.trim()) {
        input.value = text;
      } else {
        input.value += `, ${text}`;
      }
      input.focus();
      this.scheduleAutoSave();
    },

    formatSocialPost: function (content, headline = '', hashtags = []) {
      let text = this.sanitizeVietnameseText(content || '').trim();

      // 1. Strip existing hashtags from body to prevent cluttering or duplication
      const existingHashtagsInBody = text.match(/#[\p{L}0-9_]+/gu) || [];
      let cleanBody = text.replace(/#[\p{L}0-9_]+/gu, '').trim();

      // 2. Remove headline from cleanBody if it was duplicated
      if (headline && cleanBody.includes(headline)) {
        cleanBody = cleanBody.replace(headline, '').trim();
      }

      // 3. Attach any trailing lonely emojis to previous sentence (e.g. \n\n👇 ->  👇)
      cleanBody = cleanBody.replace(/\n+👇/g, ' 👇');
      cleanBody = cleanBody.replace(/\n+([👇👈👉🎬🔥🍿⚡✨🌟💥]+)\s*$/gu, ' $1');
      cleanBody = cleanBody.replace(/\n+([\p{Extended_Pictographic}\u200d\ufe0f\s]{1,6})$/gu, (match, emoji) => {
        const trimmed = emoji.trim();
        return trimmed ? ` ${trimmed}` : '';
      });

      // 4. Convert single newlines between text to double newlines (guarantee \n\n spacing)
      cleanBody = cleanBody.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

      // 5. Automatically split sentences before transition emojis (🔥, 🎬, 🍿, ⚡, 📌, 👉, 🎧, ✨, 💡, 🌟, 💥, 📢)
      cleanBody = cleanBody.replace(/([.?!…])\s*(?=([🎬🔥🍿⚡📌👉🎧✨💡🌟💥📢]))/g, '$1\n\n');

      // 6. Clean any newly created lonely emojis between paragraphs
      cleanBody = cleanBody.replace(/\n+([\p{Extended_Pictographic}\u200d\ufe0f\s]{1,6})\n+/gu, (match, emoji) => {
        const trimmed = emoji.trim();
        return trimmed ? `\n\n${trimmed} ` : '\n\n';
      });

      // 7. Split into paragraphs
      let rawParagraphs = cleanBody.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

      // 8. If any paragraph is too long (> 3 sentences or > 260 chars), break into 2-sentence chunks
      const refinedParagraphs = [];
      for (const p of rawParagraphs) {
        if (p.startsWith('👉') || p.startsWith('#')) {
          refinedParagraphs.push(p);
          continue;
        }
        const sentences = p.split(/(?<=[.?!…])\s+/);
        if (sentences.length > 3 || (p.length > 260 && sentences.length > 2)) {
          for (let i = 0; i < sentences.length; i += 2) {
            const sub = sentences.slice(i, i + 2).join(' ').trim();
            if (sub) refinedParagraphs.push(sub);
          }
        } else {
          refinedParagraphs.push(p);
        }
      }

      // 9. Guarantee each paragraph has a leading bullet emoji (⚡, 🎬, 🔥, ✨, 🍿, 🌟, 💥)
      const bulletIcons = ['⚡', '🎬', '🔥', '✨', '🍿', '🌟', '💥'];
      let iconIdx = 0;

      const formattedParagraphs = refinedParagraphs.map(p => {
        if (p.startsWith('👉') || p.startsWith('#')) return p;
        const startsWithEmoji = /^[\p{Extended_Pictographic}\u200d\ufe0f]/u.test(p);
        if (!startsWithEmoji) {
          const icon = bulletIcons[iconIdx % bulletIcons.length];
          iconIdx++;
          return `${icon} ${p}`;
        }
        return p;
      });

      // 10. Format Headline with icon if missing
      let formattedHeadline = headline ? headline.trim() : '';
      if (formattedHeadline && !/^[\p{Extended_Pictographic}\u200d\ufe0f]/u.test(formattedHeadline)) {
        formattedHeadline = `⚡ ${formattedHeadline}`;
      }

      // 11. Assemble final body with strict double newline separation
      let result = '';
      if (formattedHeadline) {
        result = `${formattedHeadline}\n\n${formattedParagraphs.join('\n\n')}`;
      } else {
        result = formattedParagraphs.join('\n\n');
      }

      // 12. Combine and enrich hashtags
      const tagSet = new Set();
      (hashtags || []).forEach(t => tagSet.add(t.startsWith('#') ? t : `#${t}`));
      existingHashtagsInBody.forEach(t => tagSet.add(t));

      // Brand & trend hashtags
      tagSet.add('#APhim');
      tagSet.add('#APhimSuper');
      if (currentMovie && currentMovie.name) {
        const movieTag = currentMovie.name.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '');
        if (movieTag) tagSet.add(`#${movieTag}`);
      }
      tagSet.add('#GoogleTrendsVN');
      tagSet.add('#PhimHayMoiNgay');
      tagSet.add('#PhimMoi2026');
      tagSet.add('#ReviewPhim');
      tagSet.add('#XemPhimOnline');

      const finalHashtags = Array.from(tagSet).slice(0, 10).join(' ');

      return `${result.trim()}\n\n${finalHashtags}`.trim();
    },

    // ── 6. AI Dual-Engine Content Generation (0.2s) ─────────────────
    generateAI: async function (forceNewAngle = false) {
      if (!currentMovie) {
        alert('Vui lòng chọn một bộ phim ở Bước 1 trước khi tạo nội dung.');
        return;
      }
      if (isGenerating) return;

      const btn = document.getElementById('btnGenerateAI');
      const origText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 15px; height: 15px;"></i> <span>Đang sáng tạo (0.2s)...</span>';
      if (window.lucide) window.lucide.createIcons();
      isGenerating = true;

      const toneEl = document.getElementById('aiToneSelect');
      const tone = toneEl ? toneEl.value : 'creator';

      const lengthInput = document.getElementById('aiLengthInput');
      const length = lengthInput ? lengthInput.value : 'standard';

      const goalInput = document.getElementById('aiGoalInput');
      const goal = goalInput ? goalInput.value : 'views';

      const seoKeywordsInput = document.getElementById('seoKeywordsInput');
      const seoKeywords = seoKeywordsInput ? seoKeywordsInput.value.trim() : '';

      const customPrompt = document.getElementById('customAIPromptInput').value.trim();

      try {
        const res = await fetch('/api/admin/social-studio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movie: currentMovie,
            customPrompt: forceNewAngle ? (customPrompt ? customPrompt + ' (Đổi góc nhìn hoàn toàn mới lạ)' : 'Hãy đổi một góc nhìn và cốt truyện bất ngờ khác') : customPrompt,
            tone,
            length,
            goal,
            seoKeywords
          })
        });

        const json = await res.json();
        if (json.success && json.data) {
          const postTextarea = document.getElementById('fbPostTextarea');
          const commentInput = document.getElementById('fbFirstCommentInput');

          let formattedText = this.formatSocialPost(json.data.content, json.data.headline, json.data.suggestedHashtags);
          postTextarea.value = formattedText;

          if (json.data.firstComment && commentInput) {
            commentInput.value = this.sanitizeVietnameseText(json.data.firstComment);
          }

          // Automatically persist generated draft to local machine
          this.saveDraft();

          // Trigger Security Check Automatically
          this.auditSecurity();
        } else {
          alert(json.error || 'Không thể tạo bài viết từ AI.');
        }
      } catch (err) {
        alert('Lỗi kết nối khi gọi AI Groq.');
      } finally {
        btn.innerHTML = origText;
        if (window.lucide) window.lucide.createIcons();
        isGenerating = false;
      }
    },

    // ── Helper: Ensure Current Movie with Multi-Source Auto-Recovery ──
    ensureCurrentMovie: function () {
      if (currentMovie && currentMovie.name && currentMovie.name !== 'Chưa chọn phim' && currentMovie.name !== 'Tên Phim') {
        return currentMovie;
      }

      // 1. Try from selected movie title card in DOM
      const selCard = document.getElementById('selectedMovieCard');
      const selTitleEl = document.getElementById('selMovieTitle');
      const posterEl = document.getElementById('selMoviePoster');
      const overviewEl = document.getElementById('selMovieOverview');
      const ratingEl = document.getElementById('selMovieRating');
      const metaEl = document.getElementById('selMovieMeta');

      if (selCard && selCard.style.display !== 'none' && selTitleEl && selTitleEl.textContent) {
        const title = selTitleEl.textContent.trim();
        if (title && title !== 'Chưa chọn phim' && title !== 'Tên Phim') {
          const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-');
          currentMovie = {
            name: title,
            slug: slug,
            year: metaEl ? (metaEl.textContent.match(/\b(19\d\d|20\d\d)\b/) || ['2026'])[0] : '2026',
            category: metaEl ? metaEl.textContent.split('·')[0].trim() : 'Phim Mới',
            rating: ratingEl ? ratingEl.textContent.replace(/[^\d.]/g, '') || '9.5' : '9.5',
            poster_url: posterEl ? posterEl.src : '',
            content: overviewEl ? overviewEl.textContent.trim() : title
          };
          return currentMovie;
        }
      }

      // 2. Try from movie search input
      const searchInput = document.getElementById('movieSearchInput');
      if (searchInput && searchInput.value && searchInput.value.trim()) {
        const title = searchInput.value.trim();
        const slug = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-');
        currentMovie = {
          name: title,
          slug: slug,
          year: '2026',
          category: 'Phim Mới',
          rating: '9.5',
          content: title
        };
        return currentMovie;
      }

      // 3. Try from first comment link (e.g. aphim.store/phim/ga-kim-thoa)
      const commentInput = document.getElementById('fbFirstCommentInput');
      if (commentInput && commentInput.value) {
        const linkMatch = commentInput.value.match(/aphim\.store\/phim\/([a-zA-Z0-9-]+)/);
        if (linkMatch && linkMatch[1]) {
          const slug = linkMatch[1];
          const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          currentMovie = {
            name: name,
            slug: slug,
            year: '2026',
            category: 'Phim Hot',
            rating: '9.5',
            content: name
          };
          return currentMovie;
        }
      }

      // 4. Try from post textarea title in quotes or first line
      const postTextarea = document.getElementById('fbPostTextarea');
      if (postTextarea && postTextarea.value && postTextarea.value.trim()) {
        const textVal = postTextarea.value.trim();
        const quoteMatch = textVal.match(/['"“]([^'"”\n]{2,60})['"”]/);
        if (quoteMatch && quoteMatch[1]) {
          const name = quoteMatch[1].trim();
          const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-');
          currentMovie = {
            name: name,
            slug: slug,
            year: '2026',
            category: 'Phim Hot',
            rating: '9.5',
            content: name
          };
          return currentMovie;
        }
      }

      // 5. Try from quick pick shelf or loaded movies list
      if (Array.isArray(initialMoviesList) && initialMoviesList.length > 0 && initialMoviesList[0].name) {
        currentMovie = initialMoviesList[0];
        return currentMovie;
      }

      // 6. Universal default fallback - NEVER return null, NEVER block user!
      currentMovie = {
        name: 'Siêu Phẩm Điện Ảnh',
        slug: 'sieu-pham-hot',
        year: '2026',
        category: 'Phim Hot',
        rating: '9.8',
        content: 'Bộ phim hấp dẫn đang được đông đảo khán giả quan tâm theo dõi'
      };
      return currentMovie;
    },

    // ── Helper: Studio Toast Notification ───────────────────────────
    showStudioToast: function (msg, type = 'success') {
      let toast = document.getElementById('studioQuickToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'studioQuickToast';
        toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transition: all 0.3s ease; display: flex; align-items: center; gap: 8px; pointer-events: none; opacity: 0; transform: translateY(10px);';
        document.body.appendChild(toast);
      }

      if (type === 'success') {
        toast.style.background = '#0f172a';
        toast.style.color = '#f8fafc';
        toast.style.border = '1px solid #334155';
      } else {
        toast.style.background = '#7f1d1d';
        toast.style.color = '#fee2e2';
        toast.style.border = '1px solid #991b1b';
      }

      toast.textContent = msg;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';

      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        if (toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
        }
      }, 2500);
    },

    // ── Helper: Fallback Instant Post Rewrite (Zero-Failure) ─────────
    _postAngleIndex: 0,
    fallbackRewritePost: function () {
      const movie = this.ensureCurrentMovie();
      const movieTitle = movie ? movie.name : 'Bộ phim siêu phẩm';
      const movieYear = movie ? (movie.year || '2026') : '2026';
      const movieGenres = movie ? (movie.category || 'Kịch tính, Hấp dẫn') : 'Kịch tính, Hấp dẫn';
      const movieRating = movie ? (movie.rating || '9.5') : '9.5';
      const postTextarea = document.getElementById('fbPostTextarea');

      const angles = [
        {
          headline: `🔥 ĐỪNG BẬT TẬP 1 NẾU NGÀY MAI BẠN PHẢI ĐI LÀM: "${movieTitle}" (${movieYear})! 🎬`,
          body: `Một khi đã nhấn nút phát, rất khó để bạn có thể dứt mắt ra khỏi diễn biến của "${movieTitle}". Cốt truyện ${movieGenres} khó lường cùng những cú ngoặt bất ngờ khiến người xem không thể rời mắt.\n\nTừng diễn biến tâm lý nhân vật được bóc tách sâu sắc, góc máy nghệ thuật và âm nhạc chạm đến cảm xúc. Điểm số ${movieRating} ⭐ là hoàn toàn xứng đáng cho một tác phẩm chỉn chu từ hình ảnh đến kịch bản.\n\n👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`
        },
        {
          headline: `💥 CÚ TWIST LẬT NGỬA THẾ CỜ: "${movieTitle}" (${movieYear}) quá xuất sắc! 🍿`,
          body: `Nếu bạn nghĩ mình đã đoán trước được kết cục, "${movieTitle}" sẽ khiến bạn phải nghĩ lại ngay từ nửa sau bộ phim! Sự đan xen giữa yêu hận, phản bội và toan tính đẩy nhịp phim lên cao trào nghẹt thở.\n\nDiễn xuất của dàn diễn viên chính cực kỳ bùng nổ, từng ánh mắt và lời thoại đều có sức nặng ghê gớm. Một bộ phim ${movieGenres} trọn vẹn điểm 10 trải nghiệm cho những ai mê điện ảnh thực thụ.\n\n👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`
        },
        {
          headline: `🌟 HIỆN TƯỢNG ĐIỆN ẢNH ĐANG GÂY SỐT: "${movieTitle}" (${movieYear})! 🎬`,
          body: `Không phải ngẫu nhiên mà "${movieTitle}" đang nhận về cơn mưa lời khen khắp mạng xã hội. Kịch bản thông minh, nhịp phim cuốn hút từ phút mở màn đến tận phân cảnh cuối cùng.\n\nBộ phim ${movieGenres} này không chỉ giải trí mà còn để lại nhiều suy ngẫm sâu sắc về tình cảm và số phận con người. Chấm điểm ${movieRating} ⭐ tuyệt đối không uổng phí thời gian theo dõi!\n\n👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`
        },
        {
          headline: `⚡ XEM MÀ NGHẸT THỞ TỪNG PHÚT: Cực phẩm "${movieTitle}" (${movieYear})! 🎭`,
          body: `Lâu lắm rồi mới có một bộ phim giữ được nhịp căng thẳng từ đầu đến cuối như "${movieTitle}". Mọi chi tiết nhỏ nhặt ở các phân cảnh đầu đều là manh mối đắt giá cho cú chốt hạ đỉnh cao phía sau.\n\nPhần hình ảnh và âm thanh được đầu tư chuẩn điện ảnh, tạo nên không khí hồi hộp cuốn hút khó cưỡng. Một tác phẩm ${movieGenres} xứng đáng nằm trong danh sách phải xem tuần này!\n\n👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`
        },
        {
          headline: `🎬 VÌ SAO "${movieTitle}" LẠI ĐANG CHIẾM LĨNH TOP TRENDING? 📈`,
          body: `Bỏ qua những công thức phim thông thường, "${movieTitle}" (${movieYear}) chinh phục khán giả bằng chính chiều sâu tâm lý và những mâu thuẫn đời thực gai góc.\n\nDàn diễn viên nhập vai xuất thần, tái hiện trọn vẹn từng cung bậc cảm xúc từ hy vọng, đau đớn đến giải thoát. Rating ${movieRating} ⭐ là minh chứng rõ nhất cho sức hút không thể chối từ của tác phẩm.\n\n👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`
        },
        {
          headline: `🍿 LỜI KHUYÊN CHÂN THÀNH: Hãy chuẩn bị khăn giấy trước khi xem "${movieTitle}"! ❤️`,
          body: `Không chỉ có những pha kịch tính thót tim, "${movieTitle}" (${movieYear}) còn lấy đi không ít nước mắt bởi những phân đoạn tình cảm đầy lắng đọng và xúc động.\n\nThông điệp phim nhân văn được truyền tải khéo léo qua từng ánh mắt và lời thoại sâu cay. Cả nhà tranh thủ cuối tuần thưởng thức ngay siêu phẩm ${movieGenres} này nhé!\n\n👉 Link xem trọn bộ Full HD Vietsub mình đã ghim sẵn ngay dưới BÌNH LUẬN ĐẦU TIÊN cho cả nhà rồi nha! 👇`
        }
      ];

      this._postAngleIndex = (this._postAngleIndex + 1) % angles.length;
      const picked = angles[this._postAngleIndex];
      if (postTextarea) {
        postTextarea.value = this.formatSocialPost(picked.body, picked.headline, ['#ReviewPhim', '#XemPhimOnline', '#PhimMoi2026']);
        postTextarea.setAttribute('spellcheck', 'false');
        postTextarea.spellcheck = false;

        // Visual flash highlight
        postTextarea.style.transition = 'box-shadow 0.3s, border-color 0.3s';
        postTextarea.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.4)';
        setTimeout(() => { if (postTextarea) postTextarea.style.boxShadow = 'none'; }, 1200);
      }
      this.saveDraft();
      this.showStudioToast('Đã viết lại thân bài mới thành công (Giữ nguyên Cmt & Ảnh)!', 'success');
    },

    // ── 6a. Chỉ Viết Lại Thân Bài (Giữ nguyên Comment & Ảnh & Phim) ──
    regeneratePostOnly: async function () {
      if (isRegenPostRunning) return;
      isRegenPostRunning = true;

      const movie = this.ensureCurrentMovie();
      const postTextarea = document.getElementById('fbPostTextarea');
      const btnAction = document.getElementById('btnCardRegenPost');
      const origActionHtml = btnAction ? btnAction.innerHTML : '';

      if (btnAction) {
        btnAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 14px; height: 14px;"></i> <span>Đang viết lại...</span>';
        if (window.lucide) window.lucide.createIcons();
      }

      const toneEl = document.getElementById('aiToneSelect');
      const tone = toneEl ? toneEl.value : 'creator';

      const lengthInput = document.getElementById('aiLengthInput');
      const length = lengthInput ? lengthInput.value : 'standard';

      const goalInput = document.getElementById('aiGoalInput');
      const goal = goalInput ? goalInput.value : 'views';

      const seoKeywordsInput = document.getElementById('seoKeywordsInput');
      const seoKeywords = seoKeywordsInput ? seoKeywordsInput.value.trim() : '';

      const promptInput = document.getElementById('customAIPromptInput');
      const customPrompt = promptInput ? promptInput.value.trim() : '';

      const angles = [
        'Tập trung vào trải nghiệm cảm xúc và diễn xuất đỉnh cao',
        'Bóc tách cú twist lật ngửa tình thế cực kịch tính',
        'Khai thác bối cảnh và lý do bộ phim đang viral xu hướng',
        'Lời bình chân thực và sâu lắng dưới góc nhìn một reviewer điện ảnh uy tín',
        'Phân tích nhịp phim nghẹt thở và thông điệp sâu sắc',
        'Lời khuyên chân thực vì sao người mê điện ảnh không thể bỏ lỡ tác phẩm này'
      ];
      const randomAngle = angles[Math.floor(Math.random() * angles.length)];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const res = await fetch('/api/admin/social-studio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            movie: movie,
            customPrompt: customPrompt ? `${customPrompt} (${randomAngle})` : `Hãy viết lại thân bài với ${randomAngle}, khác biệt hoàn toàn với bài trước`,
            tone,
            length,
            goal,
            seoKeywords,
            target: 'post'
          })
        });
        clearTimeout(timeoutId);

        const json = await res.json();
        if (json.success && json.data && (json.data.content || json.data.headline)) {
          let formattedText = this.formatSocialPost(json.data.content, json.data.headline, json.data.suggestedHashtags);
          if (postTextarea) {
            postTextarea.value = formattedText;
            postTextarea.setAttribute('spellcheck', 'false');
            postTextarea.spellcheck = false;

            // Visual feedback flash
            postTextarea.style.transition = 'box-shadow 0.3s, border-color 0.3s';
            postTextarea.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.4)';
            setTimeout(() => { if (postTextarea) postTextarea.style.boxShadow = 'none'; }, 1200);
          }

          // Note: DO NOT touch commentInput or selectedMediaUrls!
          this.saveDraft();
          this.showStudioToast('Đã viết lại thân bài mới thành công (Giữ nguyên Cmt & Ảnh)!', 'success');
        } else {
          this.fallbackRewritePost();
        }
      } catch (err) {
        this.fallbackRewritePost();
      } finally {
        if (btnAction) {
          btnAction.innerHTML = origActionHtml;
          if (window.lucide) window.lucide.createIcons();
        }
        isRegenPostRunning = false;
      }
    },

    // ── 6b. Chỉ Đổi Lời Dẫn Bình Luận (Giữ nguyên Thân Bài & Ảnh & Phim) ──
    regenerateCommentOnly: async function () {
      if (isRegenCommentRunning) return;
      isRegenCommentRunning = true;

      const movie = this.ensureCurrentMovie();
      const commentInput = document.getElementById('fbFirstCommentInput');
      const btnAction = document.getElementById('btnCardRegenComment');
      const origActionHtml = btnAction ? btnAction.innerHTML : '';

      if (btnAction) {
        btnAction.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 13px; height: 13px;"></i> <span>Đang đổi...</span>';
        if (window.lucide) window.lucide.createIcons();
      }

      const toneEl = document.getElementById('aiToneSelect');
      const tone = toneEl ? toneEl.value : 'creator';
      const goalInput = document.getElementById('aiGoalInput');
      const goal = goalInput ? goalInput.value : 'views';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5500);

        const res = await fetch('/api/admin/social-studio/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            movie: movie,
            customPrompt: 'Chỉ tạo lời dẫn bình luận đầu tiên (firstComment) cực kỳ cuốn hút, kêu gọi click link xem phim và tương tác',
            tone,
            goal,
            target: 'comment'
          })
        });
        clearTimeout(timeoutId);

        const json = await res.json();
        if (json.success && json.data && json.data.firstComment) {
          if (commentInput) {
            commentInput.value = this.sanitizeVietnameseText(json.data.firstComment);
            commentInput.setAttribute('spellcheck', 'false');
            commentInput.spellcheck = false;

            commentInput.style.transition = 'box-shadow 0.3s';
            commentInput.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.4)';
            setTimeout(() => { if (commentInput) commentInput.style.boxShadow = 'none'; }, 1200);
          }
          // Note: DO NOT touch postTextarea or selectedMediaUrls!
          this.saveDraft();
          this.showStudioToast('Đã đổi lời dẫn bình luận thành công (Giữ nguyên Thân Bài & Ảnh)!', 'success');
        } else {
          this.cycleFallbackComment();
        }
      } catch (err) {
        this.cycleFallbackComment();
      } finally {
        if (btnAction) {
          btnAction.innerHTML = origActionHtml;
          if (window.lucide) window.lucide.createIcons();
        }
        isRegenCommentRunning = false;
      }
    },

    // ── 6c. Xoay Vòng Bình Luận Hấp Dẫn (Fallback Nhanh) ──────────────
    cycleFallbackComment: function () {
      const commentInput = document.getElementById('fbFirstCommentInput');
      if (!commentInput) return;
      const movie = this.ensureCurrentMovie();
      const movieTitle = movie ? movie.name : 'bộ phim';
      const movieSlug = movie ? (movie.slug || 'xem-phim') : 'xem-phim';
      const siteUrl = 'https://aphim.store';
      const link = `${siteUrl}/phim/${movieSlug}`;

      const variants = [
        `👉 Xem trọn bộ "${movieTitle}" Full HD Vietsub tốc độ cao tại:\n${link}\nChúc cả nhà xem phim vui vẻ! 🍿🎬`,
        `🍿 Link xem Full HD Vietsub không quảng cáo giật lag mình ghim sẵn ở đây nha:\n👉 ${link}\nAi xem rồi cho mình xin 1 review cảm nghĩ dưới cmt nha! ✨`,
        `🎬 Đừng bỏ lỡ siêu phẩm này! Bấm vào link dưới đây để xem bản nét nhất Full HD Vietsub:\n👉 ${link}\nTag ngay hội bạn thân hoặc người yêu vào cùng cày đêm nha! ❤️🚀`,
        `✨ Cả nhà bấm vào đây để thưởng thức trọn bộ Full HD Vietsub miễn phí:\n👉 ${link}\nBật mí là cái kết sẽ khiến mọi người đứng hình đấy! 🍿🔥`,
        `🌟 Trọn bộ "${movieTitle}" bản quyền sắc nét Full HD Vietsub đã sẵn sàng tại:\n👉 ${link}\nXem xong nhớ quay lại chia sẻ cảm xúc cùng mình nhé! 🎥❤️`,
        `🔥 Bản đẹp Full HD Vietsub chuẩn âm thanh vòm mình ghim ngay tại:\n👉 ${link}\nCày ngay thôi nào cả nhà ơi, phim đang cực kỳ cuốn! 🍿⚡`
      ];

      const currentVal = commentInput.value.trim();
      let nextIndex = 0;
      const foundIdx = variants.findIndex(v => v.trim() === currentVal);
      if (foundIdx > -1) {
        nextIndex = (foundIdx + 1) % variants.length;
      } else {
        nextIndex = Math.floor(Math.random() * variants.length);
      }
      commentInput.value = variants[nextIndex];
      commentInput.setAttribute('spellcheck', 'false');
      commentInput.spellcheck = false;

      commentInput.style.transition = 'box-shadow 0.3s';
      commentInput.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.4)';
      setTimeout(() => { if (commentInput) commentInput.style.boxShadow = 'none'; }, 1200);

      this.saveDraft();
      this.showStudioToast('Đã đổi lời dẫn bình luận thành công (Giữ nguyên Thân Bài & Ảnh)!', 'success');
    },

    // ── 6d. Đặt Lại Link Gốc Mặc Định ────────────────────────────────
    resetDefaultComment: function () {
      const commentInput = document.getElementById('fbFirstCommentInput');
      if (!commentInput) return;
      const movie = this.ensureCurrentMovie();
      const movieTitle = movie ? movie.name : 'phim';
      const movieSlug = movie ? (movie.slug || 'xem-phim') : 'xem-phim';
      const siteUrl = 'https://aphim.store';
      const link = `${siteUrl}/phim/${movieSlug}`;

      commentInput.value = `👉 Xem trọn bộ "${movieTitle}" Full HD Vietsub tốc độ cao tại:\n${link}\nChúc cả nhà xem phim vui vẻ! 🍿🎬`;
      commentInput.setAttribute('spellcheck', 'false');
      commentInput.spellcheck = false;

      commentInput.style.transition = 'box-shadow 0.3s';
      commentInput.style.boxShadow = '0 0 0 3px rgba(217, 119, 6, 0.4)';
      setTimeout(() => { if (commentInput) commentInput.style.boxShadow = 'none'; }, 1200);

      this.saveDraft();
      this.showStudioToast('Đã đặt lại link gốc mặc định!', 'success');
    },

    // ── 7. Agent 2: Security & Trend Audit ──────────────────────────
    auditSecurity: async function () {
      const postTextarea = document.getElementById('fbPostTextarea');
      const commentInput = document.getElementById('fbFirstCommentInput');
      const feedbackBox = document.getElementById('auditFeedbackBox');
      const btn = document.getElementById('btnAuditSecurity');

      const text = (postTextarea.value || '').trim();
      if (!text) return;

      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/admin/social-studio/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postContent: text,
            firstComment: commentInput ? commentInput.value : '',
            movieTitle: currentMovie ? currentMovie.name : ''
          })
        });

        const json = await res.json();
        if (json.success) {
          feedbackBox.style.display = 'block';
          document.getElementById('auditSafetyScore').textContent = `An toàn: ${json.safetyScore || 99}%`;
          document.getElementById('auditTrendScore').textContent = `Viral: ${json.trendScore || 95}%`;
          document.getElementById('auditPolicyFeedback').textContent = json.policyFeedback || 'Nội dung đạt chuẩn thuật toán Facebook Meta, link được tách an toàn vào comment chống bóp tương tác.';

          if (json.refinedContent && json.refinedContent !== text) {
            postTextarea.value = this.formatSocialPost(json.refinedContent);
          }
          if (json.refinedFirstComment && commentInput) {
            commentInput.value = this.sanitizeVietnameseText(json.refinedFirstComment);
          }

          // Persist audited post to local machine
          this.saveDraft();
        }
      } catch (e) {
        console.warn('Audit error:', e.message);
      } finally {
        if (btn) btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
      }
    },

    // ── 8. Toggle Facebook Theme (Light / Dark) ─────────────────────
    toggleFbTheme: function () {
      const card = document.getElementById('fbFeedCard');
      const label = document.getElementById('fbThemeLabel');
      if (!card || !label) return;

      if (card.classList.contains('theme-dark')) {
        card.classList.remove('theme-dark');
        label.textContent = '🌙 Nền Tối';
      } else {
        card.classList.add('theme-dark');
        label.textContent = '☀️ Nền Sáng';
      }
      this.scheduleAutoSave();
    },

    // ── 9. Publish to Facebook Fanpage via Graph API ─────────────────
    publishPost: async function () {
      const message = document.getElementById('fbPostTextarea').value.trim();
      const firstComment = document.getElementById('fbFirstCommentInput').value.trim();

      if (!message) {
        alert('Vui lòng tạo hoặc nhập nội dung bài viết trước khi đăng.');
        return;
      }

      if (selectedMediaUrls.length === 0) {
        if (!confirm('Bạn chưa chọn hình ảnh nào. Bạn có chắc chắn muốn đăng bài viết chỉ có chữ?')) {
          return;
        }
      }

      const btn = document.getElementById('btnPublishFB');
      const origText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width: 17px; height: 17px;"></i> <span>Đang đăng lên Facebook Page...</span>';
      btn.disabled = true;
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetch('/api/admin/social-studio/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            firstComment,
            imageUrls: selectedMediaUrls,
            movieName: currentMovie ? currentMovie.name : 'Bài viết phim'
          })
        });

        const rawText = await res.text();
        let json = null;
        try {
          json = JSON.parse(rawText);
        } catch (parseErr) {
          if (res.status === 413) {
            throw new Error('Ảnh tải lên vượt quá dung lượng cho phép. Hệ thống đã tự nén ảnh lại, vui lòng thử bấm Đăng lại!');
          }
          const cleanSnippet = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 150);
          throw new Error(`Server phản hồi lỗi (${res.status}): ${cleanSnippet || 'Không thể xử lý'}`);
        }

        if (json && json.success) {
          if (json.commentId) {
            alert(`🎉 ĐÃ ĐĂNG LÊN FANPAGE APHIM SUPER THÀNH CÔNG!\n\n✅ Bài viết: Đã xuất bản (${json.postId})\n✅ Bình luận ghim: Đã tự động bình luận kèm link xem phim!`);
          } else {
            // Auto copy first comment to clipboard for instant pasting
            if (firstComment && navigator.clipboard) {
              navigator.clipboard.writeText(firstComment).catch(() => {});
            }
            alert(`🎉 ĐÃ ĐĂNG BÀI VIẾT LÊN FANPAGE THÀNH CÔNG!\nID Bài Viết: ${json.postId}\n\n⚠️ LƯU Ý VỀ BÌNH LUẬN GHIM:\nFacebook báo: Token hiện tại chưa có quyền "pages_manage_engagement" nên chưa thể tự động cmt.\n👉 Nội dung bình luận đã được TỰ ĐỘNG SAO CHÉP vào bộ nhớ tạm!\nKhi Facebook mở ra, bạn chỉ cần bấm Ctrl + V vào ô bình luận để dán nhé!`);
          }
          this.clearDraft();
          this.loadHistory();
          if (json.postLink) {
            window.open(json.postLink, '_blank');
          }
        } else {
          alert('Lỗi đăng bài Facebook: ' + ((json && json.error) || 'Không xác định'));
        }
      } catch (err) {
        alert('Lỗi đăng bài Fanpage: ' + err.message);
      } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
      }
    },

    // ── 10. Local Session & Draft Persistence (Auto-Save on Local Machine) ──
    scheduleAutoSave: function () {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        this.saveDraft();
      }, 350);
    },

    saveDraft: function () {
      try {
        const postTextarea = document.getElementById('fbPostTextarea');
        const commentInput = document.getElementById('fbFirstCommentInput');
        const promptInput = document.getElementById('customAIPromptInput');
        const seoInput = document.getElementById('seoKeywordsInput');
        const toneSelect = document.getElementById('aiToneSelect');
        const lengthInput = document.getElementById('aiLengthInput');
        const goalInput = document.getElementById('aiGoalInput');

        const postText = postTextarea ? postTextarea.value : '';
        const firstComment = commentInput ? commentInput.value : '';

        // Only save if there is content or a selected movie
        if (!currentMovie && (!postText || !postText.trim())) {
          return;
        }

        const draft = {
          savedAt: Date.now(),
          currentCatalog: currentCatalog,
          currentMovie: currentMovie,
          allMedia: allMedia,
          selectedMediaUrls: selectedMediaUrls,
          postText: postText,
          firstComment: firstComment,
          customPrompt: promptInput ? promptInput.value : '',
          seoKeywords: seoInput ? seoInput.value : '',
          tone: toneSelect ? toneSelect.value : 'creator',
          length: lengthInput ? lengthInput.value : 'standard',
          goal: goalInput ? goalInput.value : 'views',
          isLeftPanelCollapsed: isLeftPanelCollapsed
        };

        localStorage.setItem('aphim_social_studio_draft_v1', JSON.stringify(draft));

        const statusText = document.getElementById('draftStatusText');
        if (statusText) {
          const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          statusText.textContent = `Đã tự động lưu (${timeStr})`;
        }
      } catch (err) {
        console.warn('[SocialStudio] Error saving draft:', err.message);
      }
    },

    restoreDraft: function () {
      try {
        const raw = localStorage.getItem('aphim_social_studio_draft_v1');
        if (!raw) return false;
        const draft = JSON.parse(raw);
        if (!draft || (!draft.currentMovie && (!draft.postText || !draft.postText.trim()))) {
          return false;
        }

        // 1. Restore Catalog
        if (draft.currentCatalog) {
          currentCatalog = draft.currentCatalog;
          const tabMain = document.getElementById('tabSourceMain');
          const tabShort = document.getElementById('tabSourceShort');
          const badge = document.getElementById('catalogSourceBadge');
          if (currentCatalog === 'phim-ngan') {
            if (tabMain) tabMain.classList.remove('active');
            if (tabShort) tabShort.classList.add('active');
            if (badge) {
              badge.textContent = 'PHIM NGẮN DRAMA';
              badge.className = 'badge badge-gold';
            }
          } else {
            if (tabMain) tabMain.classList.add('active');
            if (tabShort) tabShort.classList.remove('active');
            if (badge) {
              badge.textContent = 'PHIM CHÍNH WEBSITE';
              badge.className = 'badge badge-primary';
            }
          }
        }

        // 2. Restore Current Movie Info Card
        if (draft.currentMovie) {
          currentMovie = draft.currentMovie;
          const card = document.getElementById('selectedMovieCard');
          if (card) {
            card.style.display = 'flex';
            const posterEl = document.getElementById('selMoviePoster');
            if (posterEl) posterEl.src = currentMovie.poster_url || currentMovie.thumb_url || '/quangcao/no-cover.png';
            const titleEl = document.getElementById('selMovieTitle');
            if (titleEl) titleEl.textContent = currentMovie.name;
            const ratingEl = document.getElementById('selMovieRating');
            if (ratingEl) ratingEl.textContent = `${currentMovie.rating || 9.5} ⭐`;
            const metaEl = document.getElementById('selMovieMeta');
            if (metaEl) metaEl.textContent = `${currentMovie.category || 'Phim Mới'} · ${currentMovie.year || '2026'}`;
            const overviewEl = document.getElementById('selMovieOverview');
            if (overviewEl) overviewEl.textContent = currentMovie.content || 'Đang cập nhật tóm tắt nội dung hấp dẫn...';
          }
          const searchInput = document.getElementById('movieSearchInput');
          if (searchInput && currentMovie.name) searchInput.value = currentMovie.name;
        }

        // 3. Restore Gallery & Selected Media
        if (Array.isArray(draft.allMedia) && draft.allMedia.length > 0) {
          allMedia = draft.allMedia;
          selectedMediaUrls = Array.isArray(draft.selectedMediaUrls) ? draft.selectedMediaUrls : [];
          this.renderMediaGallery();
          this.renderFbPhotoGrid();
        }

        // 4. Restore Post Text & First Comment
        const postTextarea = document.getElementById('fbPostTextarea');
        if (postTextarea && typeof draft.postText === 'string') {
          postTextarea.value = draft.postText;
        }
        const commentInput = document.getElementById('fbFirstCommentInput');
        if (commentInput && typeof draft.firstComment === 'string') {
          commentInput.value = draft.firstComment;
        }

        // 5. Restore Inputs & Presets
        const promptInput = document.getElementById('customAIPromptInput');
        if (promptInput && typeof draft.customPrompt === 'string') {
          promptInput.value = draft.customPrompt;
        }
        const seoInput = document.getElementById('seoKeywordsInput');
        if (seoInput && typeof draft.seoKeywords === 'string') {
          seoInput.value = draft.seoKeywords;
        }
        if (draft.tone) {
          const toneSelect = document.getElementById('aiToneSelect');
          if (toneSelect) toneSelect.value = draft.tone;
        }
        if (draft.length) {
          this.setLengthPreset(draft.length);
        }
        if (draft.goal) {
          this.setGoalPreset(draft.goal);
        }

        // 6. Restore Left Panel Collapse Mode
        if (draft.isLeftPanelCollapsed) {
          this.setLayoutMode('focus');
        }

        // 7. Show Restored Banner
        const banner = document.getElementById('draftRestoredBanner');
        if (banner) banner.style.display = 'flex';

        // 8. Update Status Badge
        const statusText = document.getElementById('draftStatusText');
        if (statusText && draft.savedAt) {
          const timeStr = new Date(draft.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          statusText.textContent = `Đã khôi phục nháp (${timeStr})`;
        }

        return true;
      } catch (err) {
        console.warn('[SocialStudio] Error restoring draft:', err);
        return false;
      }
    },

    resetDraftPrompt: function () {
      if (confirm('Bạn có chắc chắn muốn xóa bản nháp đang lưu và làm mới bài viết? Toàn bộ nội dung đang soạn sẽ được đặt lại từ đầu.')) {
        this.clearDraft();
        window.location.reload();
      }
    },

    clearDraft: function () {
      try {
        localStorage.removeItem('aphim_social_studio_draft_v1');
        const statusText = document.getElementById('draftStatusText');
        if (statusText) statusText.textContent = 'Bản nháp đã xóa';
      } catch (e) {}
    },

    copyContent: function () {
      const text = document.getElementById('fbPostTextarea').value;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        alert('Đã sao chép nội dung bài viết vào bộ nhớ tạm!');
      });
    },

    // ── 10. Load Post History Log with Pagination ──────────────────
    loadHistory: async function () {
      const tbody = document.getElementById('postHistoryTableBody');
      if (!tbody) return;

      try {
        const res = await fetch('/api/admin/social-studio/history');
        const json = await res.json();

        if (json.success && Array.isArray(json.history)) {
          historyItems = json.history;
          historyCurrentPage = 1;
          this.renderHistoryTable();
        } else {
          historyItems = [];
          this.renderHistoryTable();
        }
      } catch (err) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px; color: #ef4444; font-size: 13px;">
              Không thể tải lịch sử bài viết.
            </td>
          </tr>
        `;
      }
    },

    renderHistoryTable: function () {
      const tbody = document.getElementById('postHistoryTableBody');
      const pageInfo = document.getElementById('historyPageInfo');
      const pageBtns = document.getElementById('historyPageBtns');
      const paginationWrap = document.getElementById('postHistoryPagination');
      if (!tbody) return;

      if (!historyItems || historyItems.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 20px; color: #78716c; font-size: 13px;">
              Chưa có bài viết hoặc video Reels nào được đăng qua hệ thống.
            </td>
          </tr>
        `;
        if (paginationWrap) paginationWrap.style.display = 'none';
        return;
      }

      if (paginationWrap) paginationWrap.style.display = 'flex';

      const totalPages = Math.ceil(historyItems.length / HISTORY_PAGE_SIZE) || 1;
      if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
      if (historyCurrentPage < 1) historyCurrentPage = 1;

      const startIndex = (historyCurrentPage - 1) * HISTORY_PAGE_SIZE;
      const endIndex = Math.min(startIndex + HISTORY_PAGE_SIZE, historyItems.length);
      const currentSlice = historyItems.slice(startIndex, endIndex);

      tbody.innerHTML = currentSlice.map(item => {
        const isReels = item.type === 'reels';
        const typeBadge = isReels
          ? '<span class="badge" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #fff; font-size: 11px;">🎥 REELS (9:16)</span>'
          : '<span class="badge badge-primary" style="font-size: 11px;">📱 FEED POST</span>';
        const mediaText = isReels ? '<span style="color:#ec4899; font-weight:700;">Video 9:16</span>' : `${item.imageCount || 0} ảnh`;
        const postLink = item.postLink || (isReels ? `https://www.facebook.com/reel/${item.id}` : `https://facebook.com/${item.id}`);
        const btnLabel = isReels ? 'Xem Reels' : 'Mở Post';

        return `
        <tr style="border-bottom: 1px solid var(--border-subtle, #f0eae0); font-size: 13px;">
          <td style="padding: 10px 14px; font-weight: 700; color: #1c1917;">${item.movieName || 'Bài đăng'}</td>
          <td style="padding: 10px 14px;">${typeBadge}</td>
          <td style="padding: 10px 14px;">
            <a href="${postLink}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
              <span>${item.id}</span>
              <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
            </a>
          </td>
          <td style="padding: 10px 14px; color: #44403c;">${mediaText}</td>
          <td style="padding: 10px 14px;">
            ${item.hasFirstComment ? '<span class="badge badge-emerald">Đã ghim link</span>' : '<span style="color:#78716c;">Không</span>'}
          </td>
          <td style="padding: 10px 14px; color: #78716c; font-size: 12px;">${new Date(item.createdAt).toLocaleString('vi-VN')}</td>
          <td style="padding: 10px 14px; text-align: right;">
            <a href="${postLink}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-size: 11px; padding: 3px 8px; text-decoration: none;">
              ${btnLabel}
            </a>
          </td>
        </tr>
      `;
      }).join('');

      if (window.lucide) window.lucide.createIcons();

      // Render Page Info
      if (pageInfo) {
        pageInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} / ${historyItems.length} bài đăng (Trang ${historyCurrentPage}/${totalPages})`;
      }

      // Render Pagination Buttons
      if (pageBtns) {
        let btnsHtml = `
          <button type="button" class="history-pagination-btn" onclick="window.SocialStudio.changeHistoryPage(${historyCurrentPage - 1})" ${historyCurrentPage === 1 ? 'disabled' : ''} title="Trang trước">
            « Trước
          </button>
        `;

        for (let p = 1; p <= totalPages; p++) {
          btnsHtml += `
            <button type="button" class="history-pagination-btn ${p === historyCurrentPage ? 'active' : ''}" onclick="window.SocialStudio.changeHistoryPage(${p})">
              ${p}
            </button>
          `;
        }

        btnsHtml += `
          <button type="button" class="history-pagination-btn" onclick="window.SocialStudio.changeHistoryPage(${historyCurrentPage + 1})" ${historyCurrentPage === totalPages ? 'disabled' : ''} title="Trang sau">
            Sau »
          </button>
        `;

        pageBtns.innerHTML = btnsHtml;
      }
    },

    changeHistoryPage: function (page) {
      const totalPages = Math.ceil(historyItems.length / HISTORY_PAGE_SIZE) || 1;
      if (page < 1 || page > totalPages) return;
      historyCurrentPage = page;
      this.renderHistoryTable();
    },

    // ── Facebook Fanpage Token & Connection Management ──
    checkFbStatus: async function () {
      try {
        const res = await fetch('/api/admin/social-studio/fb-status');
        const data = await res.json();
        const shortText = document.getElementById('fbStatusShortText');
        const btn = document.getElementById('btnFbConfig');
        if (data.success) {
          if (shortText) shortText.innerHTML = `🟢 ${data.pageName || 'Đã kết nối Fanpage'}`;
          if (btn) {
            btn.style.background = 'rgba(22, 163, 74, 0.08)';
            btn.style.borderColor = 'rgba(22, 163, 74, 0.3)';
            btn.style.color = '#16a34a';
          }
        } else {
          if (shortText) shortText.innerHTML = '🔴 Lỗi Token Fanpage';
          if (btn) {
            btn.style.background = 'rgba(239, 68, 68, 0.08)';
            btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            btn.style.color = '#dc2626';
          }
        }
      } catch (e) {}
    },

    openFbModal: function () {
      const modal = document.getElementById('fbConfigModal');
      if (modal) modal.style.display = 'flex';
      this.testFbConnection(true);
      if (window.lucide) window.lucide.createIcons();
    },

    closeFbModal: function (e) {
      if (e && e.target && e.target.id !== 'fbConfigModal' && !e.target.closest('button')) return;
      const modal = document.getElementById('fbConfigModal');
      if (modal) modal.style.display = 'none';
    },

    testFbConnection: async function (isAuto = false) {
      const box = document.getElementById('fbLiveStatusBox');
      const tokenInput = document.getElementById('inputFbPageToken');
      const pageIdInput = document.getElementById('inputFbPageId');
      const btn = document.getElementById('btnTestFbToken');

      if (btn && !isAuto) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width:14px;height:14px;"></i> Đang kiểm tra...';
      }

      if (box) {
        box.style.display = 'block';
        box.style.background = '#eff6ff';
        box.style.borderColor = '#bfdbfe';
        box.style.color = '#1e40af';
        box.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;font-weight:700;">
            <i data-lucide="loader-2" class="animate-spin" style="width:16px;height:16px;"></i>
            <span>Đang kiểm tra kết nối với máy chủ Facebook Graph API...</span>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }

      try {
        const queryToken = (tokenInput && tokenInput.value.trim()) ? encodeURIComponent(tokenInput.value.trim()) : '';
        const queryPageId = (pageIdInput && pageIdInput.value.trim()) ? encodeURIComponent(pageIdInput.value.trim()) : '';
        const url = `/api/admin/social-studio/fb-status?token=${queryToken}&pageId=${queryPageId}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
          if (box) {
            box.style.background = '#f0fdf4';
            box.style.borderColor = '#bbf7d0';
            box.style.color = '#166534';
            box.innerHTML = `
              <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px;margin-bottom:4px;">
                <i data-lucide="check-circle-2" style="width:18px;height:18px;color:#16a34a;"></i>
                <span>${data.message || 'Kết nối Fanpage hoàn hảo!'}</span>
              </div>
              <div style="font-size:12px;opacity:0.9;">
                <b>Trang:</b> ${data.pageName} | <b>ID:</b> ${data.pageId} | <b>Loại Token:</b> ${data.tokenType || 'Page Access Token'}
              </div>
            `;
          }
          if (pageIdInput && data.pageId) pageIdInput.value = data.pageId;
          this.checkFbStatus();
        } else {
          if (box) {
            box.style.background = '#fef2f2';
            box.style.borderColor = '#fecaca';
            box.style.color = '#991b1b';
            const guide = (data.formattedGuide || data.message || 'Lỗi kết nối').replace(/\\n/g, '<br>');
            box.innerHTML = `
              <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:13.5px;margin-bottom:6px;">
                <i data-lucide="alert-triangle" style="width:18px;height:18px;color:#dc2626;"></i>
                <span>Chưa thể kết nối Fanpage (Token không hợp lệ)</span>
              </div>
              <div style="font-size:12px;line-height:1.5;background:#fff;border-radius:8px;padding:10px;border:1px solid #fee2e2;">
                ${guide}
              </div>
            `;
          }
        }
      } catch (err) {
        if (box) {
          box.style.background = '#fef2f2';
          box.style.borderColor = '#fecaca';
          box.style.color = '#991b1b';
          box.innerHTML = `<div style="font-weight:700;">Lỗi kiểm tra: ${err.message}</div>`;
        }
      } finally {
        if (btn && !isAuto) {
          btn.disabled = false;
          btn.innerHTML = '<i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Kiểm Tra Token';
        }
        if (window.lucide) window.lucide.createIcons();
      }
    },

    saveFbToken: async function () {
      const tokenInput = document.getElementById('inputFbPageToken');
      const pageIdInput = document.getElementById('inputFbPageId');
      const btn = document.getElementById('btnSaveFbToken');

      const pageToken = tokenInput ? tokenInput.value.trim() : '';
      const pageId = pageIdInput ? pageIdInput.value.trim() : '';

      if (!pageToken) {
        alert('Vui lòng dán mã Page Access Token trước khi lưu!');
        return;
      }

      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width:14px;height:14px;"></i> Đang lưu...';

      try {
        const res = await fetch('/api/admin/social-studio/update-fb-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId, pageToken })
        });
        const data = await res.json();
        if (data.success) {
          alert('🎉 ' + data.message);
          this.testFbConnection(true);
          this.checkFbStatus();
        } else {
          alert('Lỗi lưu Token: ' + (data.error || data.message));
        }
      } catch (err) {
        alert('Lỗi kết nối máy chủ: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  };

  window.SocialStudio = SocialStudio;

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SocialStudio.init());
  } else {
    SocialStudio.init();
  }
})();
