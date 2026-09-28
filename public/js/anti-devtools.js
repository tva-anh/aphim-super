/**
 * APHIM - ADVANCED ANTI DEVTOOLS & REDIRECT TRAP PROTECTION
 * Chống F12, Inspect Element, Xem nguồn trang & Tự động đá văng sang link trừng phạt
 * (Tự động mở F12 & Console Logs trên môi trường Localhost / Nội bộ để debug)
 */
(function () {
    'use strict';

    // Bỏ qua anti-devtools khi đang chạy ở môi trường Localhost / IP nội bộ / Port thử nghiệm
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    hostname === '::1' ||
                    hostname.endsWith('.local') ||
                    hostname.startsWith('192.168.') ||
                    hostname.startsWith('10.') ||
                    (window.location.port !== '' && window.location.port !== '80' && window.location.port !== '443');

    if (isLocal) {
        console.log('🛠️ [Local Mode] F12, Chuột phải, DevTools Redirect Trap đã được tắt để phát triển và kiểm tra log.');
        return;
    }

    // 🎯 LINK TRỪNG PHẠT KHI PHÁT HIỆN CỐ TÌNH F12 / MỞ DEVTOOLS
    const TRAP_REDIRECT_URL = 'https://youtu.be/vLa5jvCJMGk?si=jZknktQr6iKtXRO6';

    function triggerRedirectTrap() {
        try {
            window.location.replace(TRAP_REDIRECT_URL);
        } catch (e) {
            window.location.href = TRAP_REDIRECT_URL;
        }
    }

    // 1. CHẶN TOÀN BỘ CONSOLE LOGS TRÊN TRÌNH DUYỆT (Giữ cho Console luôn sạch hoàn toàn ở Production)
    const _noop = () => {};
    const consoleMethods = [
        'log', 'warn', 'error', 'info', 'debug', 'trace',
        'table', 'dir', 'dirxml', 'group', 'groupCollapsed',
        'groupEnd', 'time', 'timeLog', 'timeEnd', 'count',
        'countReset', 'assert', 'profile', 'profileEnd'
    ];
    consoleMethods.forEach(method => {
        try {
            console[method] = _noop;
        } catch(e) {}
    });

    // 2. CHẶN PHÍM TẮT F12 & CÁC TỔ HỢP PHÍM SOI CODE -> CHUYỂN HƯỚNG TRỪNG PHẠT NGAY LẬP TỨC
    window.addEventListener('keydown', function (e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
        const altOrOpt = e.altKey;
        const shift = e.shiftKey;
        const key = e.key ? e.key.toUpperCase() : '';
        const keyCode = e.keyCode || e.which;

        const isF12 = key === 'F12' || keyCode === 123;
        
        // Windows/Linux: Ctrl+Shift+I/J/C/K, Mac: Cmd+Opt+I/J/C/K
        const isInspect = (ctrlOrCmd && shift && ['I', 'J', 'C', 'K'].includes(key)) ||
                          (isMac && ctrlOrCmd && altOrOpt && ['I', 'J', 'C', 'K'].includes(key)) ||
                          (ctrlOrCmd && altOrOpt && ['I', 'J', 'C'].includes(key));
        
        // View Source: Ctrl+U, Cmd+U, Cmd+Opt+U
        const isViewSource = (ctrlOrCmd && (key === 'U' || keyCode === 85)) ||
                             (isMac && ctrlOrCmd && altOrOpt && key === 'U');
        
        // Save Page: Ctrl+S, Cmd+S
        const isSavePage = ctrlOrCmd && (key === 'S' || keyCode === 83);

        if (isF12 || isInspect || isViewSource || isSavePage) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            triggerRedirectTrap();
            return false;
        }
    }, true);

    // 3. VÔ HIỆU HÓA CHUỘT PHẢI TRÊN TOÀN TRANG
    document.addEventListener('contextmenu', function (e) {
        const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return true;

        e.preventDefault();
        e.stopPropagation();
        return false;
    }, true);

    // 4. BẪY DEBUGGER & PHÁT HIỆN MỞ DEVTOOLS QUA MENU TRÌNH DUYỆT (ĐÁ BAY KHỎI TRANG)
    setInterval(() => {
        const start = performance.now();
        (function() {
            return false;
        }['constructor']('debugger')['call']());
        const elapsed = performance.now() - start;

        // Nếu DevTools đang mở, lệnh debugger sẽ dừng chương trình > 100ms
        if (elapsed > 100) {
            triggerRedirectTrap();
        }
    }, 1200);

    // 5. THEO DÕI THAY ĐỔI KÍCH THƯỚC DEVTOOLS ĐỘT BIẾN (DOCK/UNDOCK DETECTOR)
    const threshold = 160;
    setInterval(() => {
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        if (widthDiff || heightDiff) {
            triggerRedirectTrap();
        }
    }, 1200);
})();
