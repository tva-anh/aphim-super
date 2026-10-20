const fs = require('fs');
const path = require('path');

const libCode = fs.readFileSync(path.join(__dirname, '../public/js/disable-devtool.min.js'), 'utf8');

const output = `/**
 * APHIM - ADVANCED ANTI DEVTOOLS & REDIRECT TRAP ENGINE (v109)
 * - Bẫy Debugger trực tiếp (dừng khựng code tại dòng debugger;, hiện thông báo Paused in debugger như MâmPhim)
 * - Đo độ trễ thời gian (nếu pause > 100ms rồi bấm resume -> redirect ngay lập tức)
 * - Chặn phím tắt F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S
 * - Chặn chuột phải (contextmenu)
 * - Tích hợp engine DisableDevtool phòng trường hợp đối phương tắt breakpoint (Deactivate breakpoints)
 * - Tự động bỏ qua trên Localhost / IP nội bộ để dev
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

    // 🎯 LINK TRỪNG PHẠT
    var TRAP_REDIRECT_URL = 'https://youtu.be/vLa5jvCJMGk?si=jZknktQr6iKtXRO6';
    var isBlocked = false;

    function triggerRedirectTrap() {
        if (isBlocked) return;
        isBlocked = true;
        try {
            window.location.replace(TRAP_REDIRECT_URL);
        } catch (e) {
            window.location.href = TRAP_REDIRECT_URL;
        }
    }

    // 1. CHẶN PHÍM TẮT F12, CTRL+SHIFT+I/J/C, CTRL+U, CTRL+S
    window.addEventListener('keydown', function (event) {
        var key = String(event.key || '').toLowerCase();
        var keyCode = event.keyCode || event.which;
        var isF12 = key === 'f12' || keyCode === 123;
        var isInspect = event.ctrlKey && event.shiftKey && (key === 'i' || key === 'j' || key === 'c');
        var isViewSource = event.ctrlKey && (key === 'u' || keyCode === 85);
        var isSave = event.ctrlKey && (key === 's' || keyCode === 83);
        var isMacInspect = event.metaKey && event.altKey && (key === 'i' || key === 'j' || key === 'c');
        var isMacViewSource = event.metaKey && event.altKey && key === 'u';

        if (isF12 || isInspect || isViewSource || isSave || isMacInspect || isMacViewSource) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            triggerRedirectTrap();
            return false;
        }
    }, true);

    // 2. CHẶN CHUỘT PHẢI
    window.addEventListener('contextmenu', function (event) {
        var tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return true;
        event.preventDefault();
        event.stopPropagation();
        return false;
    }, true);

    // 3. BẪY DEBUGGER TRỰC TIẾP (CHUẨN 100% NHƯ HÌNH MÂMPHIM)
    // Khi DevTools mở (bằng bất kỳ cách nào), Chrome lập tức dừng lại ở dòng debugger;
    // và hiện thông báo vàng "Paused in debugger", đóng băng toàn bộ trang web.
    // Nếu cố bấm Resume (F8) để chạy tiếp, thời gian tạm dừng > 100ms sẽ kích hoạt redirect ngay lập tức.
    window.setInterval(function () {
        if (isBlocked) return;
        var startedAt = performance.now();
        debugger;
        if (performance.now() - startedAt > 100) {
            triggerRedirectTrap();
        }
    }, 1500);

    // 4. LỚP PHÒNG THỦ DỰ PHÒNG DISABLE-DEVTOOL (Nếu cố tình Deactivate Breakpoints để né debugger)
    try {
        ${libCode}

        if (typeof DisableDevtool !== 'undefined') {
            var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            var detectors = isMobile ? [0, 1, 3, 4, 6, 7] : [0, 1, 2, 3, 4, 6, 7];

            DisableDevtool({
                url: TRAP_REDIRECT_URL,
                timeOutUrl: TRAP_REDIRECT_URL,
                disableMenu: true,
                clearLog: true,
                interval: 800,
                detectors: detectors,
                ondevtoolopen: function () {
                    triggerRedirectTrap();
                },
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
    } catch (e) {}
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/anti-devtools.js'), output, 'utf8');
console.log('Successfully compiled public/js/anti-devtools.js with debugger trap');
