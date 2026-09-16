/* ==========================================================================
   A PHIM — Mobile Search Overlay JS
   Live autocomplete khi tap icon Search trên mobile
   ========================================================================== */

(function () {
    'use strict';

    let overlay, input, clearBtn, closeBtn, resultsArea, resultsList, resultsCount, seeAllLink, resultsHeader;
    let searchTimeout = null;

    document.addEventListener('DOMContentLoaded', function () {
        overlay = document.getElementById('mobileSearchOverlay');
        if (!overlay) return;

        input = document.getElementById('msoInput');
        clearBtn = document.getElementById('msoClearBtn');
        closeBtn = document.getElementById('msoCloseBtn');
        resultsArea = document.querySelector('.mso-results-area');
        resultsList = document.getElementById('msoResultsList');
        resultsCount = document.getElementById('msoResultsCount');
        seeAllLink = document.getElementById('msoSeeAll');
        resultsHeader = document.querySelector('.mso-results-header');

        // Hook: nút search trên mobile header
        const searchTrigger = document.getElementById('mtiSearchBtn');
        if (searchTrigger) {
            searchTrigger.addEventListener('click', function (e) {
                e.preventDefault();
                openOverlay();
            });
        }

        // Close
        if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

        // Clear
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                input.value = '';
                input.focus();
                clearBtn.classList.remove('visible');
                if (resultsArea) resultsArea.classList.remove('visible');
            });
        }

        // Input debounce
        if (input) {
            const handleMSOInput = function (e) {
                if (e && e.isComposing) return;
                clearTimeout(searchTimeout);
                clearBtn?.classList.toggle('visible', input.value.trim().length > 0);
                searchTimeout = setTimeout(handleInput, 150);
            };

            input.addEventListener('input', handleMSOInput);
            input.addEventListener('compositionend', function () { handleMSOInput(); });

            input.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    const q = input.value.trim();
                    if (q) window.location.href = `search.html?q=${encodeURIComponent(q)}`;
                }
            });
        }

        // Close on Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeOverlay();
        });
    });

    function openOverlay() {
        if (!overlay) return;
        overlay.classList.add('mso-open');
        document.body.style.overflow = 'hidden';
        setTimeout(function () { input && input.focus(); }, 250);
    }

    function closeOverlay() {
        if (!overlay) return;
        overlay.classList.remove('mso-open');
        document.body.style.overflow = '';
        input && input.blur();
    }

    async function handleInput() {
        const keyword = input ? input.value.trim() : '';
        if (keyword.length < 2) {
            if (resultsArea) resultsArea.classList.remove('visible');
            return;
        }

        if (resultsArea) resultsArea.classList.add('visible');
        if (resultsHeader) resultsHeader.style.display = 'none';
        if (seeAllLink) seeAllLink.style.display = 'none';
        if (resultsList) resultsList.innerHTML = `
            <div class="mso-loader">
                <span class="material-icons-round" style="animation:spin 1s linear infinite;">autorenew</span>
            </div>
        `;

        try {
            let items = [], total = 0;

            // Thử dùng movieAPI nếu có
            if (typeof movieAPI !== 'undefined' && movieAPI.searchMovies) {
                try {
                    const data = await movieAPI.searchMovies(keyword, 1);
                    if (data && data.data && data.data.items && data.data.items.length > 0) {
                        items = data.data.items;
                        total = data.data.params?.pagination?.totalItems || data.data.pagination?.totalItems || items.length;
                    }
                } catch(e) {}
            }
            
            // Nếu API 1 lỗi hoặc không có phim, lập tức chuyển sang API dự phòng
            if (!items || items.length === 0) {
                try {
                    const base1 = (typeof API_CONFIG !== 'undefined' && API_CONFIG.OPHIM_URL) ? API_CONFIG.OPHIM_URL : 'https://ophim1.com/v1/api';
                    const res1 = await fetch(`${base1}/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=10&page=1`);
                    const data1 = await res1.json();
                    if (data1 && data1.data && data1.data.items && data1.data.items.length > 0) {
                        items = data1.data.items;
                        total = data1.data.params?.pagination?.totalItems || items.length;
                    } else {
                        throw new Error('Primary API returned empty or failed');
                    }
                } catch (err) {
                    console.warn('Primary API failed, immediately switching to backup API...');
                    try {
                        const base2 = (typeof API_CONFIG !== 'undefined' && API_CONFIG.OPHIM17_URL) ? API_CONFIG.OPHIM17_URL : 'https://ophim1.com/v1/api';
                        const res2 = await fetch(`${base2}/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=10&page=1`);
                        const data2 = await res2.json();
                        if (data2 && data2.data && data2.data.items) {
                            items = data2.data.items;
                            total = data2.data.params?.pagination?.totalItems || items.length;
                        }
                    } catch (backupErr) {
                        console.error('Backup API also failed');
                    }
                }
            }

            renderResults(items, keyword, total);
        } catch (err) {
            console.error('Search overlay error:', err);
            if (resultsList) resultsList.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.4);">Lỗi tải dữ liệu</div>`;
        }
    }

    function renderResults(movies, keyword, total) {
        if (!movies || movies.length === 0) {
            if (resultsHeader) resultsHeader.style.display = 'none';
            if (seeAllLink) seeAllLink.style.display = 'none';
            if (resultsList) resultsList.innerHTML = `
                <div style="text-align:center;padding:40px 20px;">
                    <span class="material-icons-round" style="font-size:40px;color:rgba(255,255,255,0.2);">search_off</span>
                    <p style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:8px;">Không tìm thấy "${keyword}"</p>
                </div>
            `;
            return;
        }

        if (resultsHeader) {
            resultsHeader.style.display = 'flex';
            if (resultsCount) resultsCount.textContent = `${total} phim`;
        }

        const display = movies.slice(0, 5);
        let html = '';
        display.forEach(function (movie) {
            const rawImg = movie.thumb_url || movie.poster_url || '';
            const poster = (typeof imageOptimizer !== 'undefined' && rawImg)
                ? imageOptimizer.optimizeImageUrl(rawImg, 100, 80)
                : (rawImg ? `https://phimimg.com/${rawImg.startsWith('uploads/') ? '' : 'uploads/movies/'}${rawImg}` : '');
            const badge = movie.year || movie.episode_current || 'HD';
            const title = (movie.name || '').replace(/</g, '&lt;');
            const enTitle = (movie.origin_name || '').replace(/</g, '&lt;');

            html += `
                <a href="movie-detail.html?slug=${movie.slug}" class="mso-suggest-row">
                    <img data-src="${poster}" class="mso-suggest-thumb" alt="${title}" loading="lazy"
                         data-tmdb-slug="${movie.slug}"
                         data-tmdb-id="${movie.tmdb?.id || ''}"
                         data-tmdb-name="${title.replace(/"/g, '&quot;')}"
                         data-tmdb-year="${movie.year || ''}"
                         data-tmdb-type="poster"
                         src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22%3E%3Crect fill=%22%23111%22 width=%22100%22 height=%22150%22/%3E%3C/svg%3E"
                         onerror="this.style.display='none'">
                    <div class="mso-suggest-info">
                        <div class="mso-suggest-title">${title}</div>
                        ${enTitle && enTitle !== title ? `<div class="mso-suggest-en">${enTitle}</div>` : ''}
                        <div class="mso-suggest-badge">${badge}</div>
                    </div>
                </a>
            `;
        });

        if (resultsList) resultsList.innerHTML = html;

        if (seeAllLink) {
            const short = keyword.length > 20 ? keyword.slice(0, 20) + '…' : keyword;
            seeAllLink.innerHTML = `Xem tất cả kết quả cho "${short}" >`;
            seeAllLink.href = `search.html?q=${encodeURIComponent(keyword)}`;
            seeAllLink.style.display = 'flex';
        }
    }

    // Expose globally
    window.openMobileSearch = openOverlay;
    window.closeMobileSearch = closeOverlay;

    // CSS spin animation
    if (!document.getElementById('mso-spin-style')) {
        const st = document.createElement('style');
        st.id = 'mso-spin-style';
        st.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
    }
})();


