/**
 * ⚡ APHIM SUPER — Máy Chủ & Ping HTTP Engine (Chuẩn Giao Diện Hình 3 & Popover Kính Mờ)
 * Đo độ trễ HTTP thực tế đến CDN video, hiển thị danh sách máy chủ dạng popover kính mờ tinh gọn,
 * tự động đồng bộ số liệu ms và cột sóng phát wifi sang cả Menu Cài đặt của Video Player.
 */
(function () {
    'use strict';

    // Cache kết quả ping trong phiên xem phim (giảm tải request lặp)
    const pingCache = new Map();
    let isPinging = false;
    let currentTriggerEl = null;

    // Helper: Lấy link m3u8 để đo ping của 1 máy chủ
    function getServerTestUrl(server, targetEpName) {
        if (!server || !server.server_data || !server.server_data.length) return '';
        const list = server.server_data;
        // Ưu tiên tập đang xem hiện tại
        if (targetEpName) {
            const ep = list.find(e => e.name === targetEpName || e.slug === targetEpName);
            if (ep && ep.link_m3u8) return ep.link_m3u8;
        }
        // Fallback tập đầu tiên
        return list[0]?.link_m3u8 || list[0]?.link_embed || '';
    }

    // Helper: Đo độ trễ HTTP đến URL (Qua backend proxy để tránh trình duyệt báo đỏ lỗi CORS từ CDN bên ngoài)
    async function measureHttpPing(url) {
        if (!url) return { ok: false, ping: -1, status: 'error', text: 'Không khả dụng' };

        // Kiểm tra cache nếu vừa đo trong 30 giây qua
        const cached = pingCache.get(url);
        if (cached && (Date.now() - cached.time < 30000)) {
            return cached.data;
        }

        let pingResult = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);
            const proxyRes = await fetch(`/api/movies/ping-server?url=${encodeURIComponent(url)}`, {
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const json = await proxyRes.json();
            if (json && json.success && (json.ok || (json.latency > 0 && json.status !== 404 && json.status !== 502 && json.status !== 503))) {
                pingResult = formatPingData(json.latency || 120, true);
            } else if (json && json.latency && json.latency > 0) {
                pingResult = formatPingData(json.latency, true);
            } else {
                pingResult = { ok: false, ping: -1, status: 'error', text: 'Chậm/Lỗi' };
            }
        } catch (err) {
            pingResult = { ok: false, ping: -1, status: 'error', text: 'Mất kết nối' };
        }

        pingCache.set(url, { time: Date.now(), data: pingResult });
        return pingResult;
    }

    function formatPingData(elapsed, isOk) {
        if (!isOk) {
            return { ok: false, ping: elapsed, status: 'error', text: 'Lỗi' };
        }
        if (elapsed < 350) {
            return { ok: true, ping: elapsed, status: 'fast', text: 'Nhanh' };
        } else if (elapsed < 750) {
            return { ok: true, ping: elapsed, status: 'good', text: 'Trung bình' };
        } else {
            return { ok: true, ping: elapsed, status: 'slow', text: 'Chậm' };
        }
    }

    // Helper tạo SVG 4 cột sóng mạng / wifi (Chuẩn hình 3)
    window.renderSignalBars = function (status, isMini = false) {
        let bar1Color = '#334155';
        let bar2Color = '#334155';
        let bar3Color = '#334155';
        let bar4Color = '#334155';

        if (status === 'fast') {
            // Xanh lục tươi (Nhanh < 350ms)
            bar1Color = '#10b981';
            bar2Color = '#10b981';
            bar3Color = '#10b981';
            bar4Color = '#10b981';
        } else if (status === 'good') {
            // Vàng hổ phách (Trung bình 350 - 750ms)
            bar1Color = '#f59e0b';
            bar2Color = '#f59e0b';
            bar3Color = '#f59e0b';
            bar4Color = '#334155';
        } else if (status === 'slow') {
            // Đỏ hồng (Chậm > 750ms)
            bar1Color = '#f43f5e';
            bar2Color = '#f43f5e';
            bar3Color = '#334155';
            bar4Color = '#334155';
        } else if (status === 'error') {
            // Đỏ báo lỗi
            bar1Color = '#ef4444';
            bar2Color = '#334155';
            bar3Color = '#334155';
            bar4Color = '#334155';
        } else {
            // Đang đo... (màu xám)
            bar1Color = '#64748b';
            bar2Color = '#64748b';
            bar3Color = '#64748b';
            bar4Color = '#64748b';
        }

        if (isMini) {
            return `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
                    <rect x="2" y="15" width="3.5" height="6" rx="1" fill="${bar1Color}" />
                    <rect x="7.5" y="11" width="3.5" height="10" rx="1" fill="${bar2Color}" />
                    <rect x="13" y="7" width="3.5" height="14" rx="1" fill="${bar3Color}" />
                    <rect x="18.5" y="3" width="3.5" height="18" rx="1" fill="${bar4Color}" />
                </svg>
            `;
        }

        return `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
                <rect x="2" y="15" width="3.5" height="6" rx="1" fill="${bar1Color}" />
                <rect x="7.5" y="11" width="3.5" height="10" rx="1" fill="${bar2Color}" />
                <rect x="13" y="7" width="3.5" height="14" rx="1" fill="${bar3Color}" />
                <rect x="18.5" y="3" width="3.5" height="18" rx="1" fill="${bar4Color}" />
            </svg>
        `;
    };

    // Lấy dữ liệu ping đồng bộ từ cache (dùng cho menu cài đặt)
    window.getServerPingDataSync = function (server, index) {
        if (!server) return null;
        const currentEpName = window.currentEpisode?.name || '';
        const testUrl = getServerTestUrl(server, currentEpName);
        if (!testUrl) return null;
        return pingCache.get(testUrl)?.data || null;
    };

    // Lấy tên hiển thị thân thiện của server (e.g. "Vietsub #1", "4K", "Thuyết Minh #1")
    function getCleanServerTitle(server, index, allServers) {
        if (!server) return `Máy chủ #${index + 1}`;
        const rawName = (server.original_server_name || server.server_name || '').trim();
        if (rawName.toLowerCase().includes('4k')) return '4K';
        if (rawName.toLowerCase().includes('dự phòng') || rawName.toLowerCase().includes('du phong')) return 'Dự phòng';

        // Phân loại ngôn ngữ
        let cat = 'Vietsub';
        if (rawName.toLowerCase().includes('song ngữ') || rawName.toLowerCase().includes('song ngu') || rawName.toLowerCase().includes('bilingual')) {
            cat = 'Song Ngữ';
        } else if (rawName.toLowerCase().includes('thuyết minh') || rawName.toLowerCase().includes('thuyet minh')) {
            cat = 'Thuyết Minh';
        } else if (rawName.toLowerCase().includes('lồng tiếng') || rawName.toLowerCase().includes('long tieng')) {
            cat = 'Lồng Tiếng';
        }

        if (cat === 'Song Ngữ') {
            return rawName.toLowerCase().includes('song ngữ') ? rawName : 'Song Ngữ';
        }

        // Đếm xem trong cùng nhóm ngôn ngữ có bao nhiêu server
        const sameCatServers = allServers.filter(s => {
            const n = (s.original_server_name || s.server_name || '').toLowerCase();
            if (cat === 'Thuyết Minh') return n.includes('thuyết minh') || n.includes('thuyet minh');
            if (cat === 'Lồng Tiếng') return n.includes('lồng tiếng') || n.includes('long tieng');
            return !n.includes('song ngữ') && !n.includes('song ngu') && !n.includes('bilingual') && !n.includes('thuyết minh') && !n.includes('thuyet minh') && !n.includes('lồng tiếng') && !n.includes('long tieng');
        });

        if (sameCatServers.length <= 1) {
            return cat;
        }

        const subIdx = sameCatServers.indexOf(server) + 1;
        return `${cat} #${subIdx}`;
    }

    // Cập nhật số lượng máy chủ trên badge [ 2 ]
    function updateServerCountBadge() {
        const episodes = window.initialEpisodes || (window.currentMovie && window.currentMovie.episodes) || [];
        const count = episodes.length || 1;
        const badgeEl = document.getElementById('badgeServerCount');
        if (badgeEl) {
            badgeEl.textContent = count;
        }
    }

    // Định vị Popover xuất hiện chuẩn xác theo vị trí nút bấm & phân loại trong/ngoài khung chiếu
    function positionServerPopover(triggerEl) {
        const card = document.getElementById('serverPingModalCard');
        if (!card) return;

        const isMobile = window.innerWidth <= 768;
        const cardWidth = Math.min(isMobile ? 290 : 315, window.innerWidth - 20);
        card.style.width = `${cardWidth}px`;

        if (!triggerEl) {
            card.style.top = '50%';
            card.style.left = '50%';
            card.style.right = 'auto';
            card.style.bottom = 'auto';
            card.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const rect = triggerEl.getBoundingClientRect();

        // 🎯 YÊU CẦU ĐẶC BIỆT: Khi ấn nút Ping HTTP ở danh sách tập (cả Mobile lẫn Desktop)
        // Menu hiện ra xuất phát từ bên trái của ô ngay bên cạnh ô Ping (Flyout sang bên trái, không đè nút)
        const isEpisodePingBtn = !!(triggerEl.id === 'btnEpisodePingHttp' || triggerEl.closest('#btnEpisodePingHttp'));
        if (isEpisodePingBtn) {
            const availableLeft = rect.left - 10;
            const cardWidth = Math.min(300, isMobile ? Math.max(260, availableLeft) : 315, window.innerWidth - 20);
            card.style.width = `${cardWidth}px`;

            // 1. Canh lề ngang: Neo sát mép trái của ô Ping (xuất phát từ cạnh trái, ngay bên cạnh)
            const rightMargin = window.innerWidth - rect.left + 10;
            if (window.innerWidth - rightMargin - cardWidth < 10) {
                // Nếu màn hình hẹp, neo cách mép trái màn hình 10px an toàn
                card.style.left = '10px';
                card.style.right = 'auto';
            } else {
                card.style.right = `${rightMargin}px`;
                card.style.left = 'auto';
            }

            // 2. Canh lề dọc: Canh thẳng hàng đỉnh với ô Ping
            const spaceBelow = window.innerHeight - rect.top;
            if (spaceBelow < 280) {
                // Nếu gần đáy màn hình: neo đáy menu theo đáy nút bấm
                card.style.bottom = `${Math.max(10, window.innerHeight - rect.bottom)}px`;
                card.style.top = 'auto';
                card.style.transformOrigin = 'bottom right';
                card.style.maxHeight = `${Math.min(360, rect.bottom - 20)}px`;
            } else {
                // Neo đỉnh cùng hàng với ô Ping (lùi lên 4px cho thẳng hàng mỹ thuật nhất)
                card.style.top = `${Math.max(10, rect.top - 4)}px`;
                card.style.bottom = 'auto';
                card.style.transformOrigin = 'top right';
                card.style.maxHeight = `${Math.max(200, Math.min(360, spaceBelow - 20))}px`;
            }
            return;
        }

        // Kiểm tra xem nút bấm có nằm BÊN TRONG khung chiếu (video player) hay thanh công cụ máy chủ player
        const isInsidePlayer = !!(triggerEl.closest('#aphim-player-wrapper') || triggerEl.closest('#playerWrapper') || triggerEl.closest('.art-video-player') || triggerEl.closest('.art-player-wrapper') || triggerEl.closest('#aphim-controls'));
        const isPlayerCtrlBar = !!(triggerEl.id === 'btnServerPingModal' || triggerEl.closest('#btnServerPingModal') || triggerEl.closest('.player-ctrl-bar'));
        const isDesktop = window.innerWidth > 768;
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        // 1. Hướng xuất hiện cho các nút khác:
        // - Trên Desktop: Khi ấn nút Máy chủ ở khung chiếu -> Luôn HIỆN LÊN TRÊN (bung vào trong màn chiếu phim)
        // - Hoặc khi nút nằm bên trong player (isInsidePlayer)
        // - Hoặc khi khoảng trống bên dưới không đủ (spaceBelow < 320 && spaceAbove >= 280)
        const shouldPopUp = isInsidePlayer || (isDesktop && isPlayerCtrlBar) || (spaceAbove >= 300 && spaceBelow < 320);

        if (shouldPopUp) {
            card.style.bottom = `${Math.max(10, window.innerHeight - rect.top + 8)}px`;
            card.style.top = 'auto';
            card.style.maxHeight = `${Math.min(360, rect.top - 20)}px`;
        } else {
            card.style.top = `${rect.bottom + 8}px`;
            card.style.bottom = 'auto';
            const availableBelow = window.innerHeight - rect.bottom - 20;
            card.style.maxHeight = `${Math.max(200, Math.min(360, availableBelow))}px`;
        }

        // 2. Canh lề ngang: Neo menu đổ đúng ngay bên mục user ấn vào (chuẩn đẹp trên Mobile lẫn Desktop)
        const triggerCenter = rect.left + (rect.width / 2);
        const isRightHalf = triggerCenter > (window.innerWidth / 2);

        if (isRightHalf) {
            // Nút bấm ở nửa phải: Neo mép phải menu thẳng hàng với mép phải nút bấm
            const rightMargin = window.innerWidth - rect.right;
            let targetRight = Math.max(10, rightMargin - 4);
            if (targetRight + cardWidth > window.innerWidth - 10) {
                targetRight = window.innerWidth - cardWidth - 10;
            }
            card.style.right = `${targetRight}px`;
            card.style.left = 'auto';
            card.style.transformOrigin = shouldPopUp ? 'bottom right' : 'top right';
        } else {
            // Nút bấm ở nửa trái: Neo mép trái menu thẳng hàng với mép trái nút bấm
            let targetLeft = Math.max(10, rect.left - 4);
            if (targetLeft + cardWidth > window.innerWidth - 10) {
                targetLeft = window.innerWidth - cardWidth - 10;
            }
            card.style.left = `${targetLeft}px`;
            card.style.right = 'auto';
            card.style.transformOrigin = shouldPopUp ? 'bottom left' : 'top left';
        }
    }

    // Mở Popover Máy chủ • Ping HTTP (Chuẩn Thiết Kế Hình 3)
    window.openServerPingModal = function (triggerEl, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const modal = document.getElementById('serverPingModal');
        const card = document.getElementById('serverPingModalCard');
        if (!modal || !card) return;

        // Nếu đang mở, click lại thì toggle đóng
        if (modal.style.display === 'block') {
            window.closeServerPingModal();
            return;
        }

        currentTriggerEl = triggerEl || event?.currentTarget || document.getElementById('btnServerPingModal') || document.getElementById('btnEpisodePingHttp');

        updateServerCountBadge();
        modal.style.display = 'block';

        // Định vị popover ngay trên/dưới nút bấm
        positionServerPopover(currentTriggerEl);

        // Hiệu ứng Fade in & Scale mượt mà
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100');
            card.classList.remove('scale-95', 'opacity-0');
            card.classList.add('scale-100', 'opacity-100');
        });

        renderServerPingList();
    };

    // Đóng Popover
    window.closeServerPingModal = function () {
        const modal = document.getElementById('serverPingModal');
        const card = document.getElementById('serverPingModalCard');
        if (!modal) return;

        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        if (card) {
            card.classList.remove('scale-100', 'opacity-100');
            card.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(() => {
            modal.style.display = 'none';
        }, 180);
    };

    // Render danh sách máy chủ trong Popover (Chuẩn 100% Giao Diện Hình 3)
    async function renderServerPingList() {
        const container = document.getElementById('serverPingListContainer');
        if (!container) return;

        const episodes = (window.currentMovie && window.currentMovie.episodes) || window.initialEpisodes || [];
        if (!episodes || !episodes.length) {
            container.innerHTML = `
                <div class="text-center py-6 text-gray-400 text-xs">
                    <p>Không có máy chủ khả dụng cho phim này</p>
                </div>
            `;
            return;
        }

        const activeServerIdx = typeof window.currentServerIndex === 'number' ? window.currentServerIndex : (window.requestedServerIndex || 0);
        const currentEpName = window.currentEpisode?.name || '';

        // 1. Render cấu trúc danh sách ban đầu ngay tức thì (không giật layout)
        let html = '';
        episodes.forEach((server, index) => {
            const title = getCleanServerTitle(server, index, episodes);
            const totalEps = server.server_data ? server.server_data.length : 0;
            const epText = totalEps === 1 ? '1 tập' : `${totalEps} tập`;
            const isActive = index === activeServerIdx;

            // Đọc kết quả ping từ cache nếu đã đo
            const testUrl = getServerTestUrl(server, currentEpName);
            const cached = testUrl ? pingCache.get(testUrl)?.data : null;
            const pingText = cached ? (cached.ok ? `${cached.ping} ms` : cached.text) : 'Đang đo...';
            const statusText = cached ? cached.text : 'Đang kiểm tra';
            const statusColor = cached ? (cached.ok ? (cached.status === 'fast' ? 'text-emerald-400' : (cached.status === 'good' ? 'text-amber-400' : 'text-rose-400')) : 'text-rose-400') : 'text-gray-400';
            const statusHex = cached ? (cached.ok ? (cached.status === 'fast' ? '#34d399' : (cached.status === 'good' ? '#fbbf24' : '#f87171')) : '#f87171') : '#94a3b8';
            const pingColor = cached ? (cached.ok ? (cached.status === 'fast' ? 'text-emerald-400' : (cached.status === 'good' ? 'text-amber-400' : 'text-rose-400')) : 'text-rose-400') : 'text-gray-400';
            const pingHex = cached ? (cached.ok ? (cached.status === 'fast' ? '#34d399' : (cached.status === 'good' ? '#fbbf24' : '#f87171')) : '#f87171') : '#94a3b8';
            const signalSvg = window.renderSignalBars(cached ? cached.status : 'loading');

            html += `
                <div class="server-ping-row flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-white/[0.20] shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-white/25' : 'hover:bg-white/[0.12]'}"
                     id="server-ping-item-${index}"
                     onclick="window.selectServerFromPingModal(${index})"
                     title="Bấm để chọn máy chủ ${title}">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <!-- Icon khối hộp tín hiệu cột sóng (Chuẩn hình 3) -->
                        <div class="w-7 h-7 rounded-lg bg-white/[0.14] flex items-center justify-center flex-shrink-0"
                             id="server-signal-box-${index}">
                            ${signalSvg}
                        </div>
                        <!-- Tiêu đề & Thông tin máy chủ (Hòa trộn màu trắng sắc nét, chống đen nền) -->
                        <div class="min-w-0 text-left">
                            <div class="font-bold flex items-center gap-1.5 truncate leading-tight">
                                <span class="server-title-text" style="color: ${isActive ? '#fcd576' : '#ffffff'} !important; -webkit-text-fill-color: ${isActive ? '#fcd576' : '#ffffff'} !important; font-size: 13px; font-weight: ${isActive ? '800' : '600'}; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${title}</span>
                                ${isActive ? '<span style="color: #fcd576 !important; -webkit-text-fill-color: #fcd576 !important; font-size: 11.5px; font-weight: 900; margin-left: 2px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">✓</span>' : ''}
                            </div>
                            <div class="server-subtext flex items-center gap-1.5 mt-0.5" style="font-size: 11px; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">
                                <span style="color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important;">${epText}</span>
                                <span style="color: #94a3b8 !important;">•</span>
                                <span class="${statusColor} font-semibold" id="server-status-label-${index}" style="color: ${statusHex} !important; -webkit-text-fill-color: ${statusHex} !important;">${statusText}</span>
                            </div>
                        </div>
                    </div>
                    <!-- Độ trễ ms bên phải (Cân đối tinh gọn 11px) -->
                    <div class="text-right flex-shrink-0">
                        <span class="font-semibold text-[11px] ${pingColor}" id="server-ping-val-${index}" style="color: ${pingHex} !important; -webkit-text-fill-color: ${pingHex} !important; font-size: 11px !important; font-weight: 600 !important; font-variant-numeric: tabular-nums;">${pingText}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // 2. Kích hoạt đo ping song song và cập nhật cả Popover lẫn Menu Cài Đặt
        window.triggerMeasureAllPings();
    }

    // Kích hoạt đo ping song song toàn bộ máy chủ (dùng chung cho cả Popover & Cài đặt)
    window.triggerMeasureAllPings = function () {
        const episodes = (window.currentMovie && window.currentMovie.episodes) || window.initialEpisodes || [];
        if (!episodes || !episodes.length) return;

        const currentEpName = window.currentEpisode?.name || '';

        episodes.forEach(async (server, index) => {
            const testUrl = getServerTestUrl(server, currentEpName);
            if (!testUrl) return;

            const res = await measureHttpPing(testUrl);

            // A. Cập nhật trên Popover Máy chủ (nếu đang mở)
            const pingValEl = document.getElementById(`server-ping-val-${index}`);
            const statusLabelEl = document.getElementById(`server-status-label-${index}`);
            const signalBoxEl = document.getElementById(`server-signal-box-${index}`);

            if (pingValEl && statusLabelEl && signalBoxEl) {
                if (res.ok) {
                    pingValEl.textContent = `${res.ping} ms`;
                    const colorClass = res.status === 'fast' ? 'text-emerald-400' : (res.status === 'good' ? 'text-amber-400' : 'text-rose-400');
                    const colorHex = res.status === 'fast' ? '#34d399' : (res.status === 'good' ? '#fbbf24' : '#f87171');
                    pingValEl.className = `font-semibold text-[11px] ${colorClass}`;
                    pingValEl.style.fontSize = '11px';
                    pingValEl.style.fontWeight = '600';
                    pingValEl.style.color = `${colorHex} !important`;
                    pingValEl.style.webkitTextFillColor = `${colorHex} !important`;
                    statusLabelEl.textContent = res.text;
                    statusLabelEl.className = `${colorClass} font-semibold`;
                    statusLabelEl.style.color = `${colorHex} !important`;
                    statusLabelEl.style.webkitTextFillColor = `${colorHex} !important`;
                } else {
                    pingValEl.textContent = 'Lỗi';
                    pingValEl.className = 'font-semibold text-[11px] text-rose-400';
                    pingValEl.style.fontSize = '11px';
                    pingValEl.style.fontWeight = '600';
                    pingValEl.style.color = '#f87171 !important';
                    pingValEl.style.webkitTextFillColor = '#f87171 !important';
                    statusLabelEl.textContent = res.text || 'Không phát';
                    statusLabelEl.className = 'text-rose-400 font-semibold';
                    statusLabelEl.style.color = '#f87171 !important';
                    statusLabelEl.style.webkitTextFillColor = '#f87171 !important';
                }
                signalBoxEl.innerHTML = window.renderSignalBars(res.status);
            }

            // B. Cập nhật trên Menu Cài Đặt (Player Settings Submenu Máy chủ)
            const settingsPingEl = document.getElementById(`settings-server-ping-${index}`);
            const settingsSignalEl = document.getElementById(`settings-server-signal-${index}`);

            if (settingsPingEl) {
                if (res.ok) {
                    settingsPingEl.textContent = `${res.ping} ms`;
                    settingsPingEl.className = `text-[11.5px] font-bold ${res.status === 'fast' ? 'text-emerald-400' : (res.status === 'good' ? 'text-amber-400' : 'text-rose-400')}`;
                } else {
                    settingsPingEl.textContent = 'Lỗi';
                    settingsPingEl.className = 'text-[11.5px] font-bold text-rose-400';
                }
            }
            if (settingsSignalEl) {
                settingsSignalEl.innerHTML = window.renderSignalBars(res.status, true);
            }
        });
    };

    // Nút làm mới ping (⟳)
    window.refreshServerPings = function (event) {
        if (event) event.stopPropagation();
        const refreshIcon = document.getElementById('serverPingRefreshSvg');
        if (refreshIcon) {
            refreshIcon.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshIcon.style.transform = 'rotate(0deg)';
            }, 500);
        }

        // Xóa cache ping
        pingCache.clear();
        renderServerPingList();
    };

    // Chọn máy chủ từ Popover
    window.selectServerFromPingModal = function (index) {
        if (typeof window.changeServer === 'function') {
            window.changeServer(index);
        }

        // Đóng popover với hiệu ứng êm ái
        setTimeout(() => {
            window.closeServerPingModal();
        }, 150);

        // Hiển thị thông báo nhỏ
        const episodes = (window.currentMovie && window.currentMovie.episodes) || window.initialEpisodes || [];
        const title = episodes[index] ? getCleanServerTitle(episodes[index], index, episodes) : `Máy chủ #${index + 1}`;
        if (typeof window.showToast === 'function') {
            window.showToast(`Đang phát trên ${title}`);
        }
    };

    // Tự động kiểm tra lỗi video player để nhắc đổi server khi cần
    function setupPlayerErrorAutoCheck() {
        const checkAndPromptAltServer = async () => {
            const episodes = (window.currentMovie && window.currentMovie.episodes) || window.initialEpisodes || [];
            if (!episodes || episodes.length <= 1) return;

            const currentIdx = typeof window.currentServerIndex === 'number' ? window.currentServerIndex : 0;
            const currentEpName = window.currentEpisode?.name || '';

            for (let i = 0; i < episodes.length; i++) {
                if (i === currentIdx) continue;
                const testUrl = getServerTestUrl(episodes[i], currentEpName);
                if (!testUrl) continue;

                const res = await measureHttpPing(testUrl);
                if (res.ok && res.status !== 'error') {
                    const altTitle = getCleanServerTitle(episodes[i], i, episodes);
                    showStallServerAlert(i, altTitle, res.ping);
                    break;
                }
            }
        };

        const attachVideoListeners = () => {
            const video = document.getElementById('videoPlayer') || document.querySelector('video');
            if (!video || video._hasPingListeners) return;
            video._hasPingListeners = true;

            video.addEventListener('error', () => {
                console.warn('[PingEngine] Video Player báo lỗi phát stream.');
                checkAndPromptAltServer();
            });

            let stallTimer = null;
            video.addEventListener('waiting', () => {
                if (!stallTimer) {
                    stallTimer = setTimeout(() => {
                        if (video.paused) return;
                        console.warn('[PingEngine] Video bị nghẽn buffer > 9s.');
                        checkAndPromptAltServer();
                    }, 9000);
                }
            });

            video.addEventListener('playing', () => {
                if (stallTimer) {
                    clearTimeout(stallTimer);
                    stallTimer = null;
                }
                dismissStallAlert();
            });
        };

        setInterval(attachVideoListeners, 2000);
    }

    // Banner gợi ý đổi server khi phát hiện video nghẽn
    function showStallServerAlert(targetIndex, targetName, latency) {
        if (document.getElementById('stallServerAlertBanner')) return;

        const mainPlayerBox = document.getElementById('main-player-box') || document.getElementById('playerPlaceholder')?.parentElement;
        if (!mainPlayerBox) return;

        const banner = document.createElement('div');
        banner.id = 'stallServerAlertBanner';
        banner.className = 'stall-server-alert-banner';
        banner.style.cssText = `
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            background: rgba(18, 22, 30, 0.94);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(245, 158, 11, 0.5);
            box-shadow: 0 10px 25px rgba(0,0,0,0.7), 0 0 15px rgba(245, 158, 11, 0.2);
            border-radius: 12px;
            padding: 8px 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 92%;
            animation: fadeInDown 0.3s ease;
        `;

        banner.innerHTML = `
            <span class="material-icons-round text-amber-400 text-lg flex-shrink-0 animate-bounce">wifi_tethering_error</span>
            <span class="text-xs text-gray-200 leading-snug">
                Máy chủ hiện tại phản hồi chậm. Bấm đổi sang <b class="text-amber-400">${targetName}</b> (${latency}ms) để xem mượt hơn!
            </span>
            <button type="button" onclick="window.selectServerFromPingModal(${targetIndex})"
                class="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-[11px] rounded-lg shadow transition-transform hover:scale-105 flex-shrink-0 cursor-pointer">
                Đổi ngay
            </button>
            <button type="button" onclick="document.getElementById('stallServerAlertBanner')?.remove()"
                class="text-gray-400 hover:text-white p-0.5 flex-shrink-0">
                <span class="material-icons-round text-sm">close</span>
            </button>
        `;

        mainPlayerBox.appendChild(banner);
    }

    function dismissStallAlert() {
        const el = document.getElementById('stallServerAlertBanner');
        if (el) el.remove();
    }

    // Tự động đóng popover khi click ra ngoài
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('serverPingModal');
        const card = document.getElementById('serverPingModalCard');
        if (!modal || modal.style.display !== 'block') return;

        // Nếu click bên trong card hoặc vào nút trigger thì không đóng
        if (card && card.contains(e.target)) return;
        if (currentTriggerEl && (currentTriggerEl === e.target || currentTriggerEl.contains(e.target))) return;

        window.closeServerPingModal();
    });

    // Cập nhật vị trí khi resize cửa sổ
    window.addEventListener('resize', () => {
        const modal = document.getElementById('serverPingModal');
        if (modal && modal.style.display === 'block') {
            positionServerPopover(currentTriggerEl);
        }
    });

    // Đóng bằng phím ESC
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('serverPingModal');
            if (modal && modal.style.display !== 'none') {
                window.closeServerPingModal();
            }
        }
    });

    // Khởi tạo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            updateServerCountBadge();
            setupPlayerErrorAutoCheck();
        });
    } else {
        updateServerCountBadge();
        setupPlayerErrorAutoCheck();
    }

})();
