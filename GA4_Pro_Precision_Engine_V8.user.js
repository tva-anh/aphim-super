// ==UserScript==
// @name         GA4 Pro Ultimate Engine V12 - aphim.store
// @namespace    https://analytics.google.com/
// @version      12.1
// @description  Bản chuẩn hóa tuyệt đối: Chống treo tải trang GA4, bảo vệ popup cuốn lịch & trục biểu đồ, 7D (~108K), 30D (~425K) & Realtime (1.768)
// @match        https://analytics.google.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. TỪ ĐIỂN DỮ LIỆU 7 NGÀY (~108K USER)
    // ==========================================
    const MAP_7_DAYS = {
        // Trang / Màn hình hàng đầu (7 ngày)
        '3,6 N': '86 N',
        '1 N': '24 N',
        '6,9 N': '165 N',
        '3 N': '72 N',
        '1,1 N': '26 N',
        '9,6 N': '230 N',
        '1,3 N': '31 N',
        '545': '13 N',
        '4,4 N': '105 N',
        '888': '21 N',
        '143': '3,4 N',
        '1,4 N': '33 N',
        '798': '19 N',
        '103': '2,4 N',
        '285': '6,8 N',
        '221': '5,2 N',
        '737': '17 N',
        '237': '5,6 N',
        '72': '1,7 N',
        '446': '10 N',

        // Nguồn / Phương tiện & Phiên (7 ngày)
        '1,8 N': '43 N',
        '1,5 N': '36 N',
        '828': '19,8 N',
        '134': '3,2 N',
        '95': '2,2 N',
        '14': '330',
        '13': '310',
        '5,7 N': '136 N',
        '1,6 N': '38 N',
        '776': '18,5 N',
        '512': '12,2 N',
        '135': '3,2 N',

        // Thành phố (7 ngày)
        '1,4 N': '33 N',
        '352': '8,4 N',
        '194': '4,6 N',
        '182': '4,3 N',
        '120': '2,8 N',
        '40': '960',

        // Thu nạp người dùng chi tiết 7 ngày
        '4.481': '107.540',
        '3.065': '73.560',
        '2.085': '50.040',
        '102.624': '2.462.900',
        '1.899': '45.570',
        '1.216': '29.180',
        '822': '19.720',
        '39.152': '939.640',
        '1.572': '37.720',
        '908': '21.790',
        '797': '19.120',
        '42.882': '1.029.160',
        '951': '22.820',
        '757': '18.160',
        '361': '8.660',
        '15.727': '377.440',
        '210': '5.040',
        '145': '3.480',
        '91': '2.180',
        '4.196': '100.700',
        '44': '1.050',
        '35': '840',
        '641': '15.380',
        '4': '96',
        '1': '24',
        '27': '648',

        // Quốc gia (7 ngày)
        '4.457': '106.960',
        '7.888': '189.310',
        '3.745': '89.880',
        '2.558': '61.390',
        '7.098': '170.350',
        '92.941': '2.230.580',
        '168': '4.030',
        '129': '3.090',
        '2.054': '49.290',
        '152': '3.640',
        '102': '2.440',
        '219': '5.250',
        '2.284': '54.810',
        '67': '1.600',
        '50': '1.200',
        '57': '1.360',
        '748': '17.950',
        '47': '1.120',
        '22': '528',
        '59': '1.410',
        '610': '14.640',
        '43': '1.030',
        '33': '790',
        '725': '17.400',
        '31': '740',
        '357': '8.560',
        '20': '480',
        '225': '5.400',
        '19': '450',
        '18': '430',
        '226': '5.420',
        '17': '400',
        '10': '240',
        '21': '500',
        '267': '6.400'
    };

    // ==========================================
    // 2. TỪ ĐIỂN DỮ LIỆU 30 NGÀY (~425K USER)
    // ==========================================
    const MAP_30_DAYS = {
        // Trang / Màn hình hàng đầu (30 ngày)
        '14 N': '290 N',
        '3,9 N': '80 N',
        '43 N': '885 N',
        '5,7 N': '118 N',
        '2,2 N': '45 N',
        '20 N': '410 N',
        '2,5 N': '52 N',
        '559': '11,5 N',
        '5 N': '103 N',
        '1,7 N': '35 N',
        '331': '6,8 N',
        '3,5 N': '72 N',
        '1,1 N': '23 N',
        '340': '7 N',
        '2,3 N': '47 N',
        '273': '5,6 N',
        '2,9 N': '60 N',
        '30 N': '620 N',
        '3,4 N': '70 N',

        // Nguồn / Phương tiện & Phiên (30 ngày)
        '8,9 N': '183 N',
        '39 N': '805 N',
        '6 N': '124 N',
        '19 N': '390 N',
        '4,4 N': '90 N',
        '689': '14,2 N',
        '3 N': '62 N',
        '248': '5,1 N',
        '73': '1,5 N',
        '523': '10,8 N',
        '64': '1,3 N',
        '486': '10 N',

        // Thành phố (30 ngày)
        '5,5 N': '113 N',
        '4 N': '82 N',
        '1,5 N': '31 N',
        '886': '18,2 N',
        '479': '9,8 N',
        '191': '3,9 N',

        // Thu nạp người dùng chi tiết (30 ngày)
        '20.969': '431.960',
        '18.429': '379.630',
        '7.235': '149.040',
        '511.140': '10.529.480',
        '10.629': '218.950',
        '9.406': '193.760',
        '3.766': '77.570',
        '269.030': '5.542.010',
        '6.531': '134.530',
        '5.484': '112.970',
        '2.410': '49.640',
        '169.007': '3.481.540',
        '2.842': '58.540',
        '2.608': '53.720',
        '802': '16.520',
        '50.761': '1.045.670',
        '706': '14.540',
        '691': '14.230',
        '242': '4.980',
        '17.902': '368.780',
        '241': '4.960',
        '232': '4.770',
        '51': '1.050',
        '4.345': '89.500',
        '8': '164',
        '2': '41',
        '95': '1.950',

        // Thu nạp lưu lượng truy cập (30 ngày)
        '75.040': '1.545.820',
        '41.574': '856.420',
        '44.213': '910.780',
        '23.987': '494.130',
        '284.028': '5.850.970',
        '20.763': '427.710',
        '11.297': '232.710',
        '144.413': '2.974.900',
        '8.156': '168.010',
        '4.453': '91.730',
        '57.346': '1.181.320',
        '3.093': '63.710',
        '1.964': '40.450',
        '18.279': '376.540',
        '874': '18.000',
        '418': '8.610',
        '4.900': '100.940',
        '415': '8.540',
        '47': '968',
        '2.174': '44.780',

        // Quốc gia (30 ngày)
        '20.577': '423.880',
        '17.227': '354.870',
        '15.501': '319.320',
        '37.672': '776.040',
        '462.021': '9.517.630',
        '819': '16.870',
        '711': '14.640',
        '729': '15.010',
        '9.543': '196.580',
        '665': '13.690',
        '547': '11.260',
        '1.013': '20.860',
        '11.173': '230.160',
        '383': '7.890',
        '335': '6.900',
        '391': '8.050',
        '4.327': '89.130',
        '224': '4.610',
        '203': '4.180',
        '408': '8.400',
        '4.311': '88.800',
        '202': '4.160',
        '151': '3.110',
        '333': '6.850',
        '3.478': '71.640',
        '147': '3.020',
        '159': '3.270',
        '1.721': '35.450',
        '116': '2.380',
        '107': '2.200',
        '112': '2.300',
        '1.771': '36.480',
        '99': '2.030',
        '87': '1.790',
        '81': '1.660',
        '814': '16.760',
        '92': '1.890',
        '65': '1.330',
        '124': '2.550',
        '1.253': '25.810'
    };

    // ==========================================
    // 3. KHÓA BẢO VỆ CHỐNG LỖI LỊCH & BIỂU ĐỒ
    // ==========================================
    function isProtectedZone(node) {
        if (!node) return true;
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el) return true;

        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
            return true;
        }

        return Boolean(el.closest('svg, [role="graphics-axis"], [class*="axis"], [class*="tick"], [class*="legend"], .cdk-overlay-container, .cdk-overlay-pane, [role="dialog"], [role="menu"], mat-datepicker-content, .mat-calendar, mat-calendar, .mat-datepicker-popup, [class*="datepicker"], [class*="calendar"], [class*="dropdown-panel"], [class*="overlay"]'));
    }

    // ==========================================
    // 4. NHẬN DIỆN CHẾ ĐỘ NGÀY (SIÊU NHẸ, KHÔNG REFLOW)
    // ==========================================
    function detectMode() {
        const url = window.location.href;
        if (url.includes('realtime')) return 'REALTIME';
        if (url.includes('last7Days') || url.includes('3Dlast7Days') || url.includes('7days') || url.includes('7D')) return '7D';

        const dateBtn = document.querySelector('[data-guided-helpid="date-picker-label"], .date-range-text, [class*="date-range"]');
        if (dateBtn) {
            const txt = (dateBtn.textContent || '').toLowerCase();
            if (txt.includes('7 ngày') || txt.includes('7 days') || txt.includes('18 thg 11')) return '7D';
        }
        return '30D';
    }

    // ==========================================
    // 5. CẬP NHẬT 3 THẺ TỔNG QUAN LỚN TRÊN CÙNG
    // ==========================================
    function updateSummaryCards(mode) {
        const activeUsersVal = mode === '7D' ? '108 N' : '425 N';
        const newUsersVal    = mode === '7D' ? '75 N'  : '375 N';
        const eventCountVal  = mode === '7D' ? '2,5 Tr': '10,5 Tr';

        const configs = [
            { keyword: 'Số người dùng đang hoạt động', target: activeUsersVal },
            { keyword: 'Số người dùng mới', target: newUsersVal },
            { keyword: 'Số lượng sự kiện', target: eventCountVal }
        ];

        // Quét có chọn lọc các container thẻ báo cáo thay vì duyệt toàn bộ thẻ '*'
        const cardContainers = document.querySelectorAll('[class*="card"], [class*="tile"], [class*="metric"], [class*="summary"], [class*="scorecard"], material-card, ga-reporting-card');
        const searchScope = cardContainers.length > 0 ? cardContainers : [document.body];

        searchScope.forEach(container => {
            if (isProtectedZone(container)) return;
            const text = container.textContent || '';
            for (const cfg of configs) {
                if (text.includes(cfg.keyword)) {
                    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
                    let node;
                    while ((node = walker.nextNode())) {
                        if (isProtectedZone(node)) continue;
                        const v = node.nodeValue.trim();
                        if (/^\d+(?:,\d+)?\s*(?:N|Tr)?$/.test(v) && !v.includes('phút') && !v.includes('giây') && v !== cfg.keyword) {
                            if (node.nodeValue !== cfg.target) {
                                node.nodeValue = cfg.target;
                            }
                            break;
                        }
                    }
                }
            }
        });

        // Đồng bộ ô "All Users" bằng số người dùng hoạt động
        document.querySelectorAll('tr, div[role="row"]').forEach(row => {
            if (isProtectedZone(row)) return;
            if (row.textContent && row.textContent.includes('All Users')) {
                const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while ((node = walker.nextNode())) {
                    const v = node.nodeValue.trim();
                    if (/^\d+(?:,\d+)?\s*N$/.test(v) && node.nodeValue !== activeUsersVal) {
                        node.nodeValue = activeUsersVal;
                    }
                }
            }
        });
    }

    // ==========================================
    // 6. BỘ CHUYỂN ĐỔI CHUẨN XÁC CÁC BẢNG DỮ LIỆU
    // ==========================================
    function transformText(rawText, activeMap) {
        if (!rawText) return rawText;
        const clean = rawText.replace(/[\s\u00a0]+/g, ' ').trim();

        if (clean.includes('phút') || clean.includes('giây') || clean.includes('thg') || clean.includes('2026') || clean.startsWith('G-')) {
            return rawText;
        }

        if (/^\d+(?:,\d+)?%$/.test(clean)) {
            return rawText;
        }

        if (activeMap.hasOwnProperty(clean)) {
            return activeMap[clean];
        }

        // Khớp số có phần trăm: "1.899 (40,57%)" -> "45.570 (40,57%)"
        for (const [oldVal, newVal] of Object.entries(activeMap)) {
            if (clean.startsWith(oldVal + ' (') || clean.startsWith(oldVal + '(')) {
                return clean.replace(oldVal, newVal);
            }
        }

        return rawText;
    }

    // ==========================================
    // 7. XỬ LÝ RIÊNG CHO MÀN HÌNH REALTIME
    // ==========================================
    function processRealtime() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            if (isProtectedZone(node)) continue;
            const val = node.nodeValue.trim();

            if (val === '59') node.nodeValue = '1,768';
            if (val === '163') node.nodeValue = '3,985';

            const isCell = node.parentElement && node.parentElement.closest('tr, td, div[role="cell"], div[role="gridcell"]');
            if (!isCell) {
                if (val === '20') node.nodeValue = '112';
                if (val === '10') node.nodeValue = '56';
            }

            if (node.nodeValue.includes('1-10 of 86') || node.nodeValue.includes('1-10 trên 86')) {
                node.nodeValue = node.nodeValue.replace(/86/g, '1,768');
            }
        }

        const rowsData = [
            { path: '/', users: '725', views: '1,732' },
            { path: '/movie-detail', users: '398', views: '942' },
            { path: '/watch', users: '326', views: '758' },
            { path: '/search', users: '132', views: '254' },
            { path: '/watch.html', users: '81', views: '169' },
            { path: '/phim/chien-huu', users: '34', views: '55' },
            { path: '/danh-sach', users: '18', views: '25' },
            { path: '/phim/bach-phat-vuong-phi', users: '9', views: '13' },
            { path: '/phim/canh-dep-ngay-vui-biet-bao-gio', users: '7', views: '10' },
            { path: '/phim/doi-dieu-tra-toi-pham-tren-mang-phan-1', users: '5', views: '6' }
        ];

        document.querySelectorAll('tr, div[role="row"]').forEach(row => {
            if (isProtectedZone(row)) return;
            const cells = row.querySelectorAll('td, div[role="cell"], div[role="gridcell"]');
            if (cells.length >= 3) {
                const path = cells[cells.length - 3].textContent.trim();
                const found = rowsData.find(item => item.path === path);
                if (found) {
                    cells[cells.length - 2].textContent = found.users;
                    cells[cells.length - 1].textContent = found.views;
                }
            }
        });
    }

    // ==========================================
    // 8. BỘ MÁY ĐIỀU PHỐI (CHỐNG TREO TẢI TRANG GA4 100%)
    // ==========================================
    let isTransforming = false;
    let debounceTimer = null;

    function runEngine() {
        if (!document.body || isTransforming) return;

        // 🛡️ Nếu GA4 đang hiển thị spinner "Đang tải...", không can thiệp để tránh nghẽn khởi động
        const isPageLoading = document.querySelector('mat-spinner, .mat-progress-spinner, [class*="loading-bar"], [aria-label*="Đang tải"], [aria-label*="Loading"]');
        if (isPageLoading && !document.querySelector('ga-reporting-hub, [class*="reporting-hub"], [class*="report-container"]')) {
            return;
        }

        isTransforming = true;
        try {
            const mode = detectMode();
            if (mode === 'REALTIME') {
                processRealtime();
                return;
            }

            const activeMap = mode === '7D' ? MAP_7_DAYS : MAP_30_DAYS;

            // 1. Quét dữ liệu trong trang
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                if (isProtectedZone(node)) continue;
                const raw = node.nodeValue;
                if (!raw || !raw.trim()) continue;
                const updated = transformText(raw, activeMap);
                if (updated !== raw) {
                    node.nodeValue = updated;
                }
            }

            // 2. Ép chuẩn 3 thẻ lớn trên cùng
            updateSummaryCards(mode);
        } finally {
            setTimeout(() => {
                isTransforming = false;
            }, 60);
        }
    }

    function scheduleRun() {
        if (isTransforming) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runEngine, 250);
    }

    // 🛡️ Observer an toàn (Chống lặp vô hạn)
    const observer = new MutationObserver((mutations) => {
        if (isTransforming) return;
        let shouldRun = false;
        for (let i = 0; i < mutations.length; i++) {
            const t = mutations[i].target;
            if (t && !isProtectedZone(t)) {
                shouldRun = true;
                break;
            }
        }
        if (shouldRun) scheduleRun();
    });

    function init() {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(runEngine, 800);
        }
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init, { once: true });
    }

    // Nhịp tim kiểm tra nhẹ nhàng mỗi 2.5s (thay vì 200ms gây đơ máy)
    setInterval(() => {
        if (!isTransforming) runEngine();
    }, 2500);

    console.log('[GA4 Pro Ultimate Engine V12.1] ✅ Đã kích hoạt an toàn chống treo trang & bảo vệ lịch.');
})();
