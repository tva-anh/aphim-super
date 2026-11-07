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

            var groupOrder = ['Vietsub', 'Thuyết Minh', 'Lồng Tiếng', 'Song Ngữ', 'Khác'];
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

                html += '<div class="server-group-row">' +
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
        },

        earlyInit: function() {
            try {
                var eps = window.initialEpisodes || [];
                var movie = window.initialMovie || null;
                var serverIdx = -1;

                try {
                    var urlParams = new URLSearchParams(window.location.search);
                    var qServer = urlParams.get('server');

                    // 1. ƯU TIÊN 1: ?server=X trong URL
                    if (qServer !== null && qServer !== '' && !isNaN(qServer)) {
                        var parsedQ = parseInt(qServer, 10);
                        if (parsedQ >= 0 && parsedQ < eps.length) {
                            serverIdx = parsedQ;
                        }
                    }

                    // 1B. URL Variant (/full-thuyet-minh, /tap-1-thuyet-minh, /tap-1-song-ngu)
                    if (serverIdx === -1 && typeof window.location !== 'undefined') {
                        var path = window.location.pathname.toLowerCase();
                        var qVer = new URLSearchParams(window.location.search).get('version');
                        var reqVar = '';
                        if (path.includes('-thuyet-minh') || qVer === 'thuyet-minh') reqVar = 'thuyet-minh';
                        else if (path.includes('-long-tieng') || qVer === 'long-tieng') reqVar = 'long-tieng';
                        else if (path.includes('-song-ngu') || qVer === 'song-ngu') reqVar = 'song-ngu';

                        if (reqVar && eps.length > 1) {
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

                    // 2. ƯU TIÊN 2: localStorage (CHỈ áp dụng khi URL là đường dẫn gốc không variant)
                    if (serverIdx === -1 && movie && movie.slug) {
                        try {
                            var prefStr = localStorage.getItem('aphim_server_pref_' + movie.slug);
                            if (prefStr) {
                                var pref = JSON.parse(prefStr);
                                if (pref && pref.name) {
                                    var byName = eps.findIndex(function(s) {
                                        var sName = s.original_server_name || s.server_name || '';
                                        return sName.trim().toLowerCase() === pref.name.trim().toLowerCase();
                                    });
                                    if (byName !== -1) serverIdx = byName;
                                }
                                if (serverIdx === -1 && pref && pref.type) {
                                    var byType = eps.findIndex(function(s) {
                                        var tag = getLangTag(s, movie).toLowerCase();
                                        if (pref.type === 'song-ngu') return tag.includes('song ngữ') || tag.includes('song ngu') || tag.includes('bilingual');
                                        if (pref.type === 'thuyet-minh') return tag.includes('thuyết minh') || tag.includes('thuyet minh');
                                        if (pref.type === 'long-tieng') return tag.includes('lồng tiếng') || tag.includes('long tieng');
                                        if (pref.type === 'vietsub') return tag.includes('vietsub');
                                        return false;
                                    });
                                    if (byType !== -1) serverIdx = byType;
                                }
                                if (serverIdx === -1 && pref && typeof pref.index === 'number' && pref.index >= 0 && pref.index < eps.length) {
                                    serverIdx = pref.index;
                                }
                            }
                        } catch (ePref) {}

                        if (serverIdx === -1) {
                            var saved = localStorage.getItem('aphim_server_' + movie.slug);
                            if (saved !== null && !isNaN(saved)) {
                                var sOld = parseInt(saved, 10);
                                if (sOld >= 0 && sOld < eps.length) serverIdx = sOld;
                            }
                        }
                    }

                    // 3. Fallback window.requestedServerIndex
                    if (serverIdx === -1 && typeof window.requestedServerIndex === 'number' && window.requestedServerIndex >= 0 && window.requestedServerIndex < eps.length) {
                        serverIdx = window.requestedServerIndex;
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

    // Tự động kích hoạt render sớm ngay khi file parse xong hoặc DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ApWatchEarlyRender.earlyInit);
    } else {
        ApWatchEarlyRender.earlyInit();
    }
})();
