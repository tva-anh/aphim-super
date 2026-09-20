/**
 * APHIM - ANTI DEVTOOLS & CONSOLE PROTECTION
 * Chống F12, Inspect Element & Xóa sạch Console Log
 * (Tự động mở F12 & Console Logs trên môi trường Localhost để debug)
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
                    window.location.port !== '';

    if (isLocal) {
        console.log('🛠️ [Local Mode] F12, Chuột phải và Console Logs đã được mở để xem log.');
        return;
    }

    // 1. CHẶN TOÀN BỘ CONSOLE LOGS TRÊN TRÌNH DUYỆT (Giữ cho Console luôn sạch ở Production)
    const _noop = () => {};
    ['log', 'warn', 'error', 'info', 'debug', 'table', 'dir', 'group', 'groupEnd', 'time', 'timeEnd'].forEach(method => {
        try {
            console[method] = _noop;
        } catch(e) {}
    });

    // 2. CHẶN PHÍM TẮT F12 & INSPECT ELEMENT (Ctrl+Shift+I, J, C, Ctrl+U, Right Click)
    document.addEventListener('keydown', function (e) {
        const blockedKeys = [
            e.key === 'F12',
            e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'),
            e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j'),
            e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c'),
            e.ctrlKey && (e.key === 'u' || e.key === 'U'),
            e.ctrlKey && (e.key === 's' || e.key === 'S')
        ];

        if (blockedKeys.some(Boolean)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // 3. VÔ HIỆU HÓA CHUỘT PHẢI (Right click menu)
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // 4. BẪY DEBUGGER (Làm đóng băng DevTools nếu họ cố tình mở)
    // Kỹ thuật này sẽ gọi lệnh 'debugger' liên tục trong bộ nhớ, 
    // khiến cho DevTools nếu mở lên sẽ bị kẹt không thao tác được.
    const debuggerTrap = function() {
        try {
            (function() {
                return false;
            }['constructor']('debugger')['call']());
        } catch (err) {
            // Chặn lỗi
        }
    };
    
    // Khởi chạy bẫy mỗi 2000ms để không chiếm dụng CPU/GC khi người dùng vừa vào trang
    setInterval(debuggerTrap, 2000);
})();
