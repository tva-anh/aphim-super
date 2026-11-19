// ==UserScript==
// @name         GA4 Pro Precision Engine V8 (Ultimate Precision)
// @namespace    https://analytics.google.com/
// @version      8.0
// @description  Chuẩn hóa số liệu 7 ngày (112 N) & 30 ngày (445 N), bảo vệ tuyệt đối popup cuốn lịch, tránh đè chữ Thg 10, khóa trục biểu đồ SVG
// @match        https://analytics.google.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // 1. BẢNG DỮ LIỆU 7 NGÀY CHUẨN (MỤC TIÊU ~112 N USER - THEO ẢNH 2 THỰC TẾ)
    // =========================================================================
    const MAP_7_DAYS = {
        // --- Top Cards Tổng quan ---
        '5 N': '112 N',
        '5,3 N': '112 N',
        '5.320': '112.450',
        '5.520': '112.450',
        '3,4 N': '86 N',
        '3.385': '86.120',
        '118 N': '118 N',

        // --- Bảng "Trang/màn hình hàng đầu" 7 ngày (Ảnh 2) ---
        '3.721': '3,7 N',
        '3.650': '3,7 N',
        '1.215': '1,2 N',
        '6.540': '6,5 N',
        '36.120': '36 N',
        '1.026': '1 N',
        '1.039': '1 N',
        '6.012': '6 N',
        '3.015': '3 N',
        '1.112': '1,1 N',
        '9.310': '9,3 N',
        '1.314': '1,3 N',
        '589': '589',
        '4.112': '4,1 N',
        '853': '853',
        '143': '143',
        '1.420': '1,4 N',
        '826': '826',
        '108': '108',
        '1.305': '1,3 N',
        '246': '246',
        '315': '315',
        '988': '988',

        // --- Nguồn / phương tiện (Người dùng - 7 ngày) ---
        '1.955': '1,9 N',
        '1.812': '1,8 N',
        '920': '920',
        '196': '196',
        '97': '97',
        '27': '27',
        '15': '15',

        // --- Phiên theo Nguồn / phương tiện (7 ngày) ---
        '7.215': '7,2 N',
        '5.310': '5,3 N',
        '2.315': '2,3 N',
        '17.320': '17.320',
        '523': '523',
        '155': '155',
        '125': '125',

        // --- Thành phố (7 ngày) ---
        '1.512': '1,5 N',
        '1.205': '1,2 N',
        '392': '392',
        '213': '213',
        '206': '206',
        '128': '128',
        '55': '55',

        // --- Tên đối tượng (7 ngày) ---
        'All Users': 'All Users',
        '112 N': '112 N',

        // --- Bổ sung chi tiết Thu nạp lưu lượng & Người dùng khác ---
        '17.011': '382.750',
        '86.286': '474.570',
        '45.294': '249.120',
        '9.404': '211.590',
        '7.326': '164.830',
        '4.215': '94.830',
        '5.334': '120.010',
        '2.789': '62.750',
        '3.065': '68.960',
        '1.779': '40.020',
        '770': '17.320',
        '457': '10.280',
        '195': '4.380',
        '156': '3.510',
        '44': '990',
        '54.557': '1.227.500',
        '1.111,00': '24.990,00',
        '517,00': '11.630,00',
        '20.951': '471.390',
        '244,00': '5.490,00',
        '34,00': '765,00',
        '1.029': '23.150',
        '18,00': '405,00',
        '714': '16.060',
        '200,00': '4.500,00',
        '117.529': '2.350.580',
        '1.933,00': '38.660,00',
        '41.733': '834.660',
        '602,00': '12.040,00',
        '51.851': '1.037.000',
        '1.075,00': '21.500,00',
        '18.961': '379.200',
        '203,00': '4.060,00',
        '4.201': '84.000',
        '37,00': '740,00',
        '757': '15.140',
        '16,00': '320,00',
        '4.997': '111.430',
        '4.160': '92.770',
        '2.814': '62.750',
        '8.149': '181.720',
        '103.097': '2.299.000',
        '1.745,00': '38.910,00',
        '191': '4.260',
        '171': '3.810',
        '2.633': '58.700',
        '26,00': '580,00',
        '278': '6.200',
        '3.278': '73.100',
        '55,00': '1.220,00',
        '89': '1.980',
        '63': '1.400',
        '1.260': '28.000',
        '9,00': '200,00',
        '58': '1.290',
        '151': '3.360',
        '1.249': '27.800',
        '52': '1.160',
        '40': '890',
        '36': '800'
    };

    // =========================================================================
    // 2. BẢNG DỮ LIỆU 30 NGÀY CHUẨN (MỤC TIÊU ~445 N USER - THEO ẢNH 1 THỰC TẾ)
    // =========================================================================
    const MAP_30_DAYS = {
        // --- Top Cards Tổng quan ---
        '20 N': '445 N',
        '23 N': '445 N',
        '23.526': '445.680',
        '445 N': '445 N',
        '595 N': '595 N',

        // --- Bảng "Trang/màn hình hàng đầu" 30 ngày (Ảnh 1) ---
        '17 N': '17 N',
        '4,7 N': '4,7 N',
        '37 N': '37 N',
        '3,5 N': '3,5 N',
        '28 N': '28 N',
        '14 N': '14 N',
        '4 N': '4 N',
        '44 N': '44 N',
        '6,2 N': '6,2 N',
        '2,4 N': '2,4 N',
        '2,6 N': '2,6 N',
        '606': '606',
        '5,2 N': '5,2 N',
        '355': '355',
        '3,7 N': '3,7 N',
        '22 N': '22 N',
        '356': '356',

        // --- Nguồn / phương tiện (Người dùng - 30 ngày) ---
        '12 N': '12 N',
        '7 N': '7 N',
        '2,8 N': '2,8 N',
        '698': '698',
        '280': '280',
        '109': '109',
        '73': '73',

        // --- Phiên theo Nguồn / phương tiện (30 ngày) ---
        '56 N': '56 N',
        '24 N': '24 N',
        '7,2 N': '7,2 N',
        '3,1 N': '3,1 N',
        '756': '756',
        '602': '602',

        // --- Thành phố (30 ngày) ---
        '6,5 N': '6,5 N',
        '72 N': '72 N',
        '29 N': '29 N',
        '1,2 N': '1,2 N',
        '591': '591',
        '235': '235',

        // --- Bổ sung chi tiết Thu nạp lưu lượng & Người dùng khác 30 ngày ---
        '18 N': '392 N',
        '542 N': '11,8 Tr',
        '15 N': '210 N',
        '13 N': '185 N',
        '5,6 N': '82 N',
        '4,2 N': '68 N',
        '3,5 N': '56 N',
        '3,3 N': '52 N',
        '2,5 N': '38 N',
        '2,2 N': '35 N',
        '1,8 N': '28 N',
        '1,1 N': '22 N',
        '41 N': '420 N',
        '32 N': '480 N',
        '26 N': '390 N',
        '4,9 N': '72 N',
        '95.083': '1.854.120',
        '49.795': '971.000',
        '594.705': '11.596.750',
        '9.174,00': '178.890,00',
        '56.374': '1.099.300',
        '29.179': '568.990',
        '336.182': '6.555.500',
        '5.762,00': '112.360,00',
        '24.395': '475.700',
        '12.299': '239.830',
        '157.986': '3.080.700',
        '2.250,00': '43.875,00',
        '11.199': '218.380',
        '6.308': '123.000',
        '73.641': '1.436.000',
        '881,00': '17.180,00',
        '3.121': '60.860',
        '1.938': '37.790',
        '17.889': '348.800',
        '102,00': '1.990,00',
        '1.022': '19.930',
        '502': '9.790',
        '5.622': '109.600',
        '125,00': '2.440,00',
        '634': '12.360',
        '3.385': '66.000',
        '54,00': '1.050,00',
        '324.576': '6.491.500',
        '5.487,00': '109.740,00',
        '184.118': '3.682.360',
        '2.704,00': '54.080,00',
        '63.312': '1.266.240',
        '750,00': '15.000,00',
        '17.625': '352.500',
        '110,00': '2.200,00',
        '4.949': '98.980',
        '122,00': '2.440,00',
        '22.876': '445.680',
        '19.808': '385.860',
        '18.986': '369.850',
        '16.589': '323.160',
        '42.979': '837.230',
        '517.229': '10.075.600',
        '8.251,00': '160.730,00',
        '887': '17.280',
        '727': '14.160',
        '1.067': '20.780',
        '13.241': '257.940',
        '126,00': '2.450,00',
        '810': '15.780',
        '623': '12.130',
        '1.636': '31.870',
        '18.480': '359.990',
        '254,00': '4.950,00',
        '468': '9.120',
        '380': '7.400',
        '625': '12.170',
        '6.861': '133.700',
        '71,00': '1.380,00',
        '269': '5.240',
        '238': '4.640',
        '814': '15.850',
        '7.287': '142.000',
        '220': '4.280',
        '175': '3.410',
        '164': '3.190',
        '121': '2.360',
        '116': '2.260'
    };

    // =========================================================================
    // 🛡️ KHÓA BẢO VỆ TUYỆT ĐỐI (TRÁNH LỖI LỊCH & ĐÈ CHỮ "THG 10" NHƯ ẢNH 3)
    // =========================================================================
    function isProtectedZone(node) {
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el) return false;

        // 1. Bảo vệ toàn bộ Biểu đồ SVG & Trục tọa độ
        if (el.closest('svg, [role="graphics-axis"], [class*="axis"], [class*="tick"], [class*="legend"]')) {
            return true;
        }

        // 2. Bảo vệ triệt để popup cuốn lịch, date-picker, overlay của GA4 (Khắc phục lỗi đè chữ Ảnh 3)
        if (el.closest(`
            .cdk-overlay-container,
            .cdk-overlay-pane,
            [role="dialog"],
            [role="menu"],
            [role="listbox"],
            mat-datepicker-content,
            .mat-calendar,
            .mat-datepicker-popup,
            [class*="datepicker"],
            [class*="calendar"],
            [class*="flyout"],
            [class*="date-range"],
            [class*="picker"],
            [class*="dropdown"],
            [class*="popover"],
            ga-date-range-selector,
            ga-calendar,
            material-dialog,
            material-popup,
            .particle-flyout,
            .sandwich-panel,
            [aria-label*="Lịch"],
            [aria-label*="lịch"],
            [aria-label*="Calendar"],
            [aria-label*="calendar"],
            [aria-label*="Date"],
            [aria-label*="Khoảng ngày"]
        `)) {
            return true;
        }

        return false;
    }

    // Nhận diện đang xem 7 ngày hay 30 ngày (Siêu nhẹ, tuyệt đối KHÔNG gọi document.body.innerText gây treo trình duyệt)
    function is7DaysMode() {
        const url = window.location.href;
        if (url.includes('last7Days') || url.includes('7days') || url.includes('7_days') || url.includes('7D')) return true;
        const dateBtn = document.querySelector('[data-guided-helpid="date-picker-label"], .date-range-text, [class*="date-range"]');
        if (dateBtn) {
            const txt = (dateBtn.textContent || '').toLowerCase();
            if (txt.includes('7 ngày') || txt.includes('7 days') || txt.includes('18 thg 11')) return true;
        }
        return false;
    }

    // =========================================================================
    // ⚡ BỘ BIẾN ĐỔI CHUẨN XÁC: BẢO VỆ CHỮ "THG 10", GIỮ NGUYÊN %, KHÔNG ĐÈ LỊCH
    // =========================================================================
    function transformText(rawText, activeMap) {
        if (!rawText) return rawText;
        const clean = rawText.replace(/[\s\u00a0]+/g, ' ').trim();
        if (!clean) return rawText;

        const lower = clean.toLowerCase();

        // 🛡️ BẢO VỆ 1: Khóa tuyệt đối ngày tháng chữ Thg/Tháng (nguyên nhân gây lỗi Ảnh 3)
        if (lower.includes('thg') || lower.includes('tháng') || lower.includes('năm') ||
            lower.includes('2024') || lower.includes('2025') || lower.includes('2026') || lower.includes('2027')) {
            return rawText;
        }

        // 🛡️ BẢO VỆ 2: Khóa ngày trong tuần & khoảng thời gian
        if (lower.includes('chủ nhật') || lower.includes('thứ') || lower.includes('phút') || lower.includes('giây') || lower.includes('giờ') ||
            lower.startsWith('g-') || lower.includes('ngày trước')) {
            return rawText;
        }

        // 🛡️ BẢO VỆ 3: Khóa số ngày đơn lẻ từ 1 đến 31 (tránh đổi ngày 10, 18, 9, 8 thành số khác trong lịch)
        if (/^(?:[1-9]|[12]\d|3[01])$/.test(clean)) {
            return rawText;
        }

        // 🛡️ BẢO VỆ 4: Giữ nguyên số phần trăm đứng độc lập (ví dụ "38,2%", "10,3%", "15,7%", "23,6%")
        if (/^\d+(?:,\d+)?%$/.test(clean)) {
            return rawText;
        }

        // --- Realtime cố định chuẩn ---
        if (clean === '59') return '1.836';
        if (clean === '163') return '4.172';
        if (clean === '1-10 of 86') return '1-10 of 1.836';

        // 1. Khớp chính xác hoàn toàn giá trị trong MAP
        if (activeMap.hasOwnProperty(clean)) {
            return activeMap[clean];
        }

        // 2. Khớp số kèm theo phần trăm phía sau: ví dụ "12.077 (51,33%)" -> "241.540 (51,33%)"
        for (const [oldVal, newVal] of Object.entries(activeMap)) {
            if (clean.startsWith(oldVal + ' (') || clean.startsWith(oldVal + '(')) {
                return clean.replace(oldVal, newVal);
            }
        }

        return rawText;
    }

    // =========================================================================
    // 🚀 ENGINE THỰC THI CHÍNH (CÓ KHÓA CHỐNG LẶP VÔ HẠN & DEBOUNCE AN TOÀN)
    // =========================================================================
    let isTransforming = false;
    let debounceTimer = null;

    function runEngine() {
        if (!document.body) return;

        // 🛡️ Nếu GA4 đang hiển thị overlay tải ban đầu, tuyệt đối KHÔNG can thiệp để tránh xung đột luồng khởi động
        const isPageLoading = document.querySelector('mat-spinner, .mat-progress-spinner, [class*="loading-bar"], [aria-label*="Đang tải"], [aria-label*="Loading"]');
        if (isPageLoading && !document.querySelector('ga-reporting-hub, [class*="reporting-hub"], [class*="report-container"]')) {
            return;
        }

        isTransforming = true;
        try {
            const is7 = is7DaysMode();
            const activeMap = is7 ? MAP_7_DAYS : MAP_30_DAYS;

            // Quét từng TextNode trên trang một cách an toàn
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
        } finally {
            // Giải phóng khóa biến đổi sau 60ms
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

    // 🛡️ LẮNG NGHE DOM AN TOÀN: Bỏ qua các mutation do chính script tạo ra
    const observer = new MutationObserver((mutations) => {
        if (isTransforming) return;

        let hasMeaningfulChange = false;
        for (let i = 0; i < mutations.length; i++) {
            const t = mutations[i].target;
            if (t && !isProtectedZone(t)) {
                hasMeaningfulChange = true;
                break;
            }
        }

        if (hasMeaningfulChange) {
            scheduleRun();
        }
    });

    // Khởi động nhẹ nhàng sau khi GA4 đã mount xong DOM
    function init() {
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: false
            });
            setTimeout(runEngine, 800);
        }
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init, { once: true });
    }

    // Nhịp tim kiểm tra định kỳ nhẹ nhàng mỗi 2 giây (không làm nặng CPU)
    setInterval(() => {
        if (!isTransforming) runEngine();
    }, 2000);

    console.log('[GA4 Pro Precision Engine V8] ✅ Đã kích hoạt cơ chế chống treo trang và bảo vệ lịch.');
})();
