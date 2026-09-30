/**
 * ⚡ APHIM SUPER — Watch Early Render
 * Tối ưu tốc độ tải trang xem phim: Render danh sách MÁY CHỦ + TẬP PHIM tức thì
 * ngay khi HTML vừa parse xong (0ms delay), không phải chờ hls.js hay toàn bộ script nặng.
 */
(function() {
    'use strict';

    function getLangTag(server, movie) {
        const raw = (server.original_server_name || server.server_name || '').toLowerCase();
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
                if (langTag.toLowerCase().includes('thuyết minh') || langTag.toLowerCase().includes('thuyet minh')) {
                    category = 'Thuyết Minh';
                } else if (langTag.toLowerCase().includes('lồng tiếng') || langTag.toLowerCase().includes('long tieng')) {
                    category = 'Lồng Tiếng';
                }

                if (!groups[category]) groups[category] = [];
                groups[category].push({ server: server, index: index, langTag: langTag });
            });

            var groupOrder = ['Vietsub', 'Thuyết Minh', 'Lồng Tiếng', 'Khác'];
            var html = '';

            groupOrder.forEach(function(category) {
                var items = groups[category];
                if (!items || items.length === 0) return;

                var categoryIcon = category === 'Vietsub'
                    ? '<span style="background: rgba(255,255,255,0.12); color: #e2e8f0; font-size: 10px; font-weight: 900; padding: 2px 5px; border-radius: 4px; letter-spacing: 0.5px;">CC</span>'
                    : category === 'Thuyết Minh'
                        ? '<span style="font-size: 13px; line-height: 1;">🎙️</span>'
                        : '<span style="font-size: 13px; line-height: 1;">🗣️</span>';

                var buttonsInGroup = items.map(function(item) {
                    var server = item.server;
                    var index = item.index;
                    var isActive = index === currentServerIndex;
                    var totalEps = server.server_data ? server.server_data.length : 0;
                    var epText = totalEps === 1 ? 'Full' : totalEps + ' tập';

                    var isFirstInGroup = items[0].index === index;
                    var groupSubIndex = items.findIndex(function(it) { return it.index === index; });
                    var displayTitle = isFirstInGroup ? category : category + ' #' + groupSubIndex;
                    var catSlug = category === 'Vietsub' ? 'vietsub' : category === 'Thuyết Minh' ? 'thuyet-minh' : 'long-tieng';

                    if (isActive) {
                        var activeBg = category === 'Vietsub' ? '#9bb0ff' : category === 'Thuyết Minh' ? '#d8b4fe' : '#86efac';
                        var activeText = category === 'Vietsub' ? '#0a0c10' : category === 'Thuyết Minh' ? '#2e1065' : '#052e16';
                        var dotColor = category === 'Vietsub' ? '#2563eb' : category === 'Thuyết Minh' ? '#9333ea' : '#16a34a';

                        return '<button onclick="changeServer(' + index + ')"' +
                            ' data-category="' + category + '"' +
                            ' style="background: ' + activeBg + '; border: none; color: ' + activeText + '; font-weight: 800; border-radius: 6px; padding: 3.5px 8.5px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;"' +
                            ' class="select-none server-tab-btn active server-cat-' + catSlug + '">' +
                            '<span class="server-tab-title" style="font-weight: 800; font-size: 12.5px; color: ' + activeText + ';">' + displayTitle + '</span>' +
                            '<span class="server-tab-badge" style="background: rgba(0, 0, 0, 0.15); font-weight: 800; font-size: 11px; padding: 1px 6.5px; border-radius: 10px; display: inline-flex; align-items: center; gap: 3.5px;">' +
                                '<span class="server-tab-dot" style="width: 6px; height: 6px; min-width: 6px; min-height: 6px; max-width: 6px; max-height: 6px; border-radius: 50%; background: ' + dotColor + '; display: inline-block; flex-shrink: 0; border: none;"></span>' +
                                '<span class="server-tab-count">' + epText + '</span>' +
                            '</span>' +
                        '</button>';
                    } else {
                        var inactiveBg = category === 'Vietsub' ? '#1e293b' : category === 'Thuyết Minh' ? '#2c2236' : '#143126';
                        var inactiveText = category === 'Vietsub' ? '#94a3b8' : category === 'Thuyết Minh' ? '#e9d5ff' : '#6ee7b7';
                        var badgeBg = category === 'Vietsub' ? '#0f172a' : category === 'Thuyết Minh' ? '#3d2552' : '#0d231b';
                        var dotColor = category === 'Vietsub' ? '#64748b' : category === 'Thuyết Minh' ? '#c084fc' : '#34d399';

                        return '<button onclick="changeServer(' + index + ')"' +
                            ' data-category="' + category + '"' +
                            ' style="background: ' + inactiveBg + '; border: none; color: ' + inactiveText + '; font-weight: 700; border-radius: 6px; padding: 3.5px 8.5px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;"' +
                            ' class="hover:brightness-125 select-none server-tab-btn server-cat-' + catSlug + '">' +
                            '<span class="server-tab-title" style="color: ' + inactiveText + '; font-weight: 700; font-size: 12.5px;">' + displayTitle + '</span>' +
                            '<span class="server-tab-badge" style="background: ' + badgeBg + '; color: ' + inactiveText + '; font-weight: 700; font-size: 11px; padding: 1px 6.5px; border-radius: 10px; display: inline-flex; align-items: center; gap: 3.5px;">' +
                                '<span class="server-tab-dot" style="width: 6px; height: 6px; min-width: 6px; min-height: 6px; max-width: 6px; max-height: 6px; border-radius: 50%; background: ' + dotColor + '; display: inline-block; flex-shrink: 0; border: none;"></span>' +
                                '<span class="server-tab-count">' + epText + '</span>' +
                            '</span>' +
                        '</button>';
                    }
                }).join('');

                html += '<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;" class="server-group-row">' +
                    '<div style="display: flex; align-items: center; gap: 5px; color: #e2e8f0; font-weight: 700; font-size: 13px; min-width: 76px; user-select: none;" class="server-group-label">' +
                        categoryIcon +
                        '<span>' + category + '</span>' +
                    '</div>' +
                    '<div class="server-buttons-wrap" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">' +
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
                var serverIdx = typeof window.requestedServerIndex === 'number' ? window.requestedServerIndex : 0;

                if (eps && eps.length > 0) {
                    ApWatchEarlyRender.renderServers(eps, serverIdx, movie);
                }
            } catch (e) {
                console.warn('[ApWatchEarlyRender] Early init notice:', e);
            }
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
