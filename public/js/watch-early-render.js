/**
 * ⚡ APHIM SUPER — Watch Early Render
 * Tối ưu tốc độ tải trang xem phim: Render danh sách MÁY CHỦ + TẬP PHIM tức thì
 * ngay khi HTML vừa parse xong (0ms delay), không phải chờ hls.js hay toàn bộ script nặng.
 */
(function() {
    'use strict';

    function getLangTag(server, movie) {
        const raw = (server.original_server_name || server.server_name || '').toLowerCase();
        if (raw.includes('song ngữ') || raw.includes('song ngu') || raw.includes('bilingual')) return 'Song Ngữ';
        if (raw.includes('thuyết minh') || raw.includes('thuyet minh')) return 'Thuyết Minh';
        if (raw.includes('lồng tiếng') || raw.includes('long tieng')) return 'Lồng Tiếng';
        if (raw.includes('vietsub')) return 'Vietsub';
        if (movie && movie.lang) {
            const mLang = movie.lang.toLowerCase();
            if (mLang.includes('thuyết minh') || mLang.includes('thuyet minh')) return 'Thuyết Minh';
            if (mLang.includes('lồng tiếng') || mLang.includes('long tieng')) return 'Lồng Tiếng';
        }
        return 'Vietsub';
    }

    // <585px: ô đầu Vietsub / Thuyết Minh không có "#N" nên ngắn hơn các ô sau.
    // Cân riêng từng nhóm theo ô dài nhất, không kéo ra mép phải.
    function equalizeServerBoxes(container) {
        var rows = container.querySelectorAll('.server-group-row.server-group-vietsub, .server-group-row.server-group-thuyet-minh');
        rows.forEach(function(row) {
            var btns = row.querySelectorAll('.server-tab-btn');
            var max = 0, i;
            for (i = 0; i < btns.length; i++) btns[i].style.width = '';
            if (btns.length) btns[0].style.justifyContent = '';
            if (window.matchMedia && window.matchMedia('(min-width: 585px)').matches) return;
            if (btns.length < 2) return;
            for (i = 0; i < btns.length; i++) {
                var w = btns[i].getBoundingClientRect().width;
                if (w > max) max = w;
            }
            for (i = 0; i < btns.length; i++) btns[i].style.width = Math.ceil(max) + 'px';
            // Chỉ giãn khoảng trống trong ô đầu thiếu "#N", không giãn cả hàng.
            btns[0].style.justifyContent = 'space-between';
        });
    }

    const ApWatchEarlyRender = {
        renderServers: function(episodes, currentServerIndex, currentMovie) {
            if (!episodes || episodes.length === 0) return;
            const container = document.getElementById('server-list');
            if (!container) return;

            currentServerIndex = typeof currentServerIndex === 'number' ? currentServerIndex : 0;

            episodes.forEach(function(s) {
                if (!s.original_server_name) s.original_server_name = s.server_name;
            });

            var groups = {};
            episodes.forEach(function(server, index) {
                var langTag = getLangTag(server, currentMovie);
                var category = 'Vietsub';
                if (langTag === 'Song Ngữ') {
                    category = 'Song Ngữ';
                } else if (langTag.toLowerCase().includes('thuyết minh') || langTag.toLowerCase().includes('thuyet minh')) {
                    category = 'Thuyết Minh';
                } else if (langTag.toLowerCase().includes('lồng tiếng') || langTag.toLowerCase().includes('long tieng')) {
                    category = 'Lồng Tiếng';
                }

                if (!groups[category]) groups[category] = [];
                groups[category].push({ server: server, index: index, langTag: langTag });
            });

            var groupOrder = ['Song Ngữ', 'Vietsub', 'Thuyết Minh', 'Lồng Tiếng', 'Khác'];
            var html = '';

            groupOrder.forEach(function(category) {
                var items = groups[category];
                if (!items || items.length === 0) return;

                var catSlug = category === 'Song Ngữ'
                    ? 'song-ngu'
                    : (category === 'Vietsub'
                        ? 'vietsub'
                        : (category === 'Thuyết Minh'
                            ? 'thuyet-minh'
                            : (category === 'Lồng Tiếng' ? 'long-tieng' : 'khac')));

                var categoryTag = category === 'Song Ngữ'
                    ? '<span class="server-cat-tag server-cat-tag-song-ngu">文A</span>'
                    : category === 'Vietsub'
                        ? '<span class="server-cat-tag server-cat-tag-vietsub">CC</span>'
                        : category === 'Thuyết Minh'
                            ? '<span class="server-cat-tag server-cat-tag-thuyet-minh">🎙️</span>'
                            : '<span class="server-cat-tag server-cat-tag-long-tieng">🗣️</span>';

                var buttonsInGroup = items.map(function(item) {
                    var server = item.server;
                    var index = item.index;
                    var isActive = index === currentServerIndex;
                    var totalEps = server.server_data ? server.server_data.length : 0;
                    // 📱 Mobile: badge chỉ hiện số tập (gọn để vừa 3 nhãn/hàng); desktop giữ nguyên "N tập"
                    var epText = totalEps === 1 ? 'Full' : totalEps + ' tập';

                    var isSongNgu = category === 'Song Ngữ';
                    var isFirstInGroup = items[0].index === index;
                    var groupSubIndex = items.findIndex(function(it) { return it.index === index; });
                    var rawTitle = server.original_server_name || server.server_name || '';
                    var displayTitle = isSongNgu
                        ? (rawTitle.toLowerCase().includes('song ngữ') ? rawTitle : (isFirstInGroup ? 'Song Ngữ' : 'Song Ngữ #' + groupSubIndex))
                        : (isFirstInGroup ? category : category + ' #' + groupSubIndex);

                    if (isSongNgu) {
                        return '<button onclick="changeServer(' + index + ')"' +
                            ' data-category="' + category + '"' +
                            ' class="select-none server-tab-btn server-cat-song-ngu' + (isActive ? ' active' : '') + '">' +
                            '<span class="server-tab-prefix">文A</span>' +
                            '<span class="server-tab-title">' + displayTitle + '</span>' +
                            '<span class="server-tab-badge">' +
                                '<span class="server-tab-count">' + (totalEps === 1 ? '1' : totalEps) + '</span>' +
                            '</span>' +
                        '</button>';
                    }

                    return '<button onclick="changeServer(' + index + ')"' +
                        ' data-category="' + category + '"' +
                        ' class="select-none server-tab-btn server-cat-' + catSlug + (isActive ? ' active' : '') + '">' +
                        '<span class="server-tab-title">' + displayTitle + '</span>' +
                        '<span class="server-tab-badge">' +
                            '<span class="server-tab-dot"></span>' +
                            '<span class="server-tab-count">' + epText + '</span>' +
                        '</span>' +
                    '</button>';
                }).join('');

                html += '<div class="server-group-row server-group-' + catSlug + '">' +
                    '<div class="server-group-label server-group-label-' + catSlug + '">' +
                        categoryTag +
                        '<span class="server-group-name">' + category + '</span>' +
                    '</div>' +
                    '<div class="server-buttons-wrap">' +
                        buttonsInGroup +
                    '</div>' +
                '</div>';
            });

            container.innerHTML = html;
            container.className = "w-full space-y-2";
            equalizeServerBoxes(container);
        },

        earlyInit: function() {
            try {
                var eps = window.initialEpisodes || [];
                var movie = window.initialMovie || null;
                var serverIdx = -1;

                try {
                    var urlParams = new URLSearchParams(window.location.search);
                    var qServer = urlParams.get('server');

                    // 1A. URL Variant (/full-song-ngu, /tap-1-song-ngu, /tap-1-thuyet-minh, ?version=song-ngu)
                    // 🌟 Ưu tiên số 1: Người dùng tìm kiếm hoặc mở link Song Ngữ/Thuyết Minh -> Bắt buộc nạp đúng biến thể đó!
                    if (typeof window.location !== 'undefined') {
                        var path = window.location.pathname.toLowerCase();
                        var qVer = new URLSearchParams(window.location.search).get('version');
                        var reqVar = '';
                        // 🌟 Đối với phim Song Ngữ, luôn để Vietsub phát đầu tiên theo yêu cầu, chỉ nạp Thuyết minh / Lồng tiếng nếu có chủ đích
                        if (path.includes('-thuyet-minh') || qVer === 'thuyet-minh' || (window.activeVariant === 'thuyet-minh')) reqVar = 'thuyet-minh';
                        else if (path.includes('-long-tieng') || qVer === 'long-tieng' || (window.activeVariant === 'long-tieng')) reqVar = 'long-tieng';

                        if (reqVar) {
                            var vIdx = eps.findIndex(function(s) {
                                var tag = getLangTag(s, movie).toLowerCase();
                                if (reqVar === 'song-ngu') return tag.includes('song ngữ') || tag.includes('song ngu') || tag.includes('bilingual');
                                if (reqVar === 'thuyet-minh') return tag.includes('thuyết minh') || tag.includes('thuyet minh');
                                if (reqVar === 'long-tieng') return tag.includes('lồng tiếng') || tag.includes('long tieng');
                                return false;
                            });
                            if (vIdx !== -1) serverIdx = vIdx;
                        }
                    }

                    // 1B. Tham số ?server=X trong URL
                    if (serverIdx === -1 && qServer !== null && qServer !== '' && !isNaN(qServer)) {
                        var parsedQ = parseInt(qServer, 10);
                        if (parsedQ >= 0 && parsedQ < eps.length) {
                            serverIdx = parsedQ;
                        }
                    }

                    // 2. ƯU TIÊN 2: localStorage (BỎ QUA nếu là Song Ngữ để luôn phát Vietsub trước)
                    if (serverIdx === -1 && movie && movie.slug) {
                        try {
                            var prefStr = localStorage.getItem('aphim_server_pref_' + movie.slug);
                            if (prefStr) {
                                var pref = JSON.parse(prefStr);
                                if (pref && pref.type !== 'song-ngu') {
                                    if (pref.name && !pref.name.toLowerCase().includes('song ngữ') && !pref.name.toLowerCase().includes('song ngu') && !pref.name.toLowerCase().includes('bilingual')) {
                                        var byName = eps.findIndex(function(s) {
                                            var sName = s.original_server_name || s.server_name || '';
                                            return sName.trim().toLowerCase() === pref.name.trim().toLowerCase();
                                        });
                                        if (byName !== -1) serverIdx = byName;
                                    }
                                    if (serverIdx === -1 && pref.type) {
                                        var byType = eps.findIndex(function(s) {
                                            var tag = getLangTag(s, movie).toLowerCase();
                                            if (pref.type === 'thuyet-minh') return tag.includes('thuyết minh') || tag.includes('thuyet minh');
                                            if (pref.type === 'long-tieng') return tag.includes('lồng tiếng') || tag.includes('long tieng');
                                            if (pref.type === 'vietsub') return tag.includes('vietsub');
                                            return false;
                                        });
                                        if (byType !== -1) serverIdx = byType;
                                    }
                                }
                            }
                        } catch (ePref) {}

                        if (serverIdx === -1) {
                            var saved = localStorage.getItem('aphim_server_' + movie.slug);
                            if (saved !== null && !isNaN(saved)) {
                                var sOld = parseInt(saved, 10);
                                if (sOld >= 0 && sOld < eps.length) {
                                    var oldTag = getLangTag(eps[sOld], movie).toLowerCase();
                                    if (!oldTag.includes('song ngữ') && !oldTag.includes('song ngu') && !oldTag.includes('bilingual')) {
                                        serverIdx = sOld;
                                    }
                                }
                            }
                        }
                    }

                    // 3. 🌟 LUÔN LUÔN ƯU TIÊN MÁY CHỦ VIETSUB (API) ĐẦU TIÊN
                    // Cho dù phim có máy chủ Song Ngữ ở trên đầu, khi mới vào trang luôn chọn máy chủ Vietsub đầu tiên (API) để lên hình tức thì!
                    var firstVietsub = eps.findIndex(function(s) {
                        var tag = getLangTag(s, movie).toLowerCase();
                        return !tag.includes('song ngữ') && !tag.includes('song ngu') && !tag.includes('bilingual') && !tag.includes('thuyết minh') && !tag.includes('thuyet minh') && !tag.includes('lồng tiếng') && !tag.includes('long tieng');
                    });

                    if (serverIdx === -1) {
                        if (typeof window.requestedServerIndex === 'number' && window.requestedServerIndex >= 0 && window.requestedServerIndex < eps.length) {
                            var reqTag = getLangTag(eps[window.requestedServerIndex], movie).toLowerCase();
                            // Chỉ dùng window.requestedServerIndex nếu nó KHÔNG PHẢI là Song Ngữ
                            if (!reqTag.includes('song ngữ') && !reqTag.includes('song ngu') && !reqTag.includes('bilingual')) {
                                serverIdx = window.requestedServerIndex;
                            }
                        }
                    }

                    if (serverIdx === -1) {
                        serverIdx = (firstVietsub !== -1) ? firstVietsub : 0;
                    }
                } catch (paramErr) { }

                // Safe bounds check
                if (serverIdx < 0 || serverIdx >= eps.length) serverIdx = 0;

                if (eps && eps.length > 0) {
                    window.requestedServerIndex = serverIdx;
                    ApWatchEarlyRender.renderServers(eps, serverIdx, movie);
                }
            } catch (e) {
                console.warn('[ApWatchEarlyRender] Early init notice:', e);
            }
        }
    };

    // Fallback cho click máy chủ trước khi watch.js hoàn tất nạp
    window.changeServer = window.changeServer || function(index) {
        window.requestedServerIndex = index;
        window.currentServerIndex = index;
        try {
            var m = window.initialMovie;
            if (m && m.slug) {
                var sObj = (window.initialEpisodes && window.initialEpisodes[index]) || null;
                var rawName = sObj ? (sObj.original_server_name || sObj.server_name || '') : '';
                var prefObj = {
                    index: index,
                    name: rawName,
                    type: rawName.toLowerCase().includes('song ngữ') ? 'song-ngu' : (rawName.toLowerCase().includes('thuyết minh') ? 'thuyet-minh' : (rawName.toLowerCase().includes('lồng tiếng') ? 'long-tieng' : 'vietsub')),
                    updatedAt: Date.now()
                };
                localStorage.setItem('aphim_server_pref_' + m.slug, JSON.stringify(prefObj));
                localStorage.setItem('aphim_server_' + m.slug, String(index));
                sessionStorage.setItem('aphim_server_' + m.slug, String(index));
            }
        } catch(e) {}
        if (window.initialEpisodes && window.initialEpisodes.length > 0) {
            ApWatchEarlyRender.renderServers(window.initialEpisodes, index, window.initialMovie);
        }
    };

    window.ApWatchEarlyRender = ApWatchEarlyRender;

    // Xoay màn / đổi khổ: cân lại Vietsub và Thuyết Minh (≥585px dùng grid).
    var _eqResizeTimer = null;
    window.addEventListener('resize', function() {
        clearTimeout(_eqResizeTimer);
        _eqResizeTimer = setTimeout(function() {
            var c = document.getElementById('server-list');
            if (c) equalizeServerBoxes(c);
        }, 150);
    });

    // Tự động kích hoạt render sớm ngay khi file parse xong hoặc DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ApWatchEarlyRender.earlyInit);
    } else {
        ApWatchEarlyRender.earlyInit();
    }
})();
