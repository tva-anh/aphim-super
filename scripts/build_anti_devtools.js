const fs = require('fs');
const path = require('path');

const libCode = fs.readFileSync(path.join(__dirname, '../public/js/disable-devtool.min.js'), 'utf8');

const output = `/**
 * APHIM - ADVANCED ANTI DEVTOOLS & REDIRECT TRAP ENGINE (v108)
 * Tích hợp engine DisableDevtool chuyên nghiệp:
 * - DefineId Detector (DOM node .id getter trap - bắt gọn Chrome Console)
 * - FuncToString Detector (Console formatter trap)
 * - Window Size Detector (Chống docked DevTools trên Desktop)
 * - DateToString & Performance Detector
 * - Chặn F12, Ctrl+Shift+I/J/C, Ctrl+U, chuột phải
 * - Tự động đá văng sang link trừng phạt
 * - Bỏ qua trên Localhost / IP nội bộ để dev
 */
(function () {
    'use strict';

    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' ||
                  hostname === '127.0.0.1' ||
                  hostname === '::1' ||
                  hostname.endsWith('.local') ||
                  hostname.startsWith('192.168.') ||
                  hostname.startsWith('10.');

    if (isLocal) {
        return;
    }

    // --- DISABLE-DEVTOOL CORE ENGINE ---
    ${libCode}
    // --- END DISABLE-DEVTOOL CORE ENGINE ---

    if (typeof DisableDevtool !== 'undefined') {
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        // Trên PC: bật toàn bộ detectors ('all', bao gồm Size để tóm gọn docked DevTools như F12/menu 3 chấm)
        // Trên Mobile: bỏ qua Size detector [0, 1, 3, 4, 5, 6, 7] để chống nhận nhầm khi bàn phím ảo bật lên
        var detectors = isMobile ? [0, 1, 3, 4, 5, 6, 7] : 'all';

        DisableDevtool({
            url: 'https://youtu.be/vLa5jvCJMGk?si=jZknktQr6iKtXRO6',
            timeOutUrl: 'https://youtu.be/vLa5jvCJMGk?si=jZknktQr6iKtXRO6',
            disableMenu: true,
            clearLog: true,
            interval: 400,
            detectors: detectors,
            ignore: function () {
                var h = window.location.hostname;
                return h === 'localhost' ||
                       h === '127.0.0.1' ||
                       h === '::1' ||
                       h.endsWith('.local') ||
                       h.startsWith('192.168.') ||
                       h.startsWith('10.');
            }
        });
    }
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/anti-devtools.js'), output, 'utf8');
console.log('Successfully compiled public/js/anti-devtools.js');
