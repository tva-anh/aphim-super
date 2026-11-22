const fs = require('fs');
const path = require('path');

const output = `(function () {
    'use strict';

    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' ||
                  hostname === '127.0.0.1' ||
                  hostname === '::1' ||
                  hostname === '0.0.0.0' ||
                  hostname === '' ||
                  hostname.endsWith('.local') ||
                  hostname.endsWith('.internal') ||
                  hostname.startsWith('192.168.') ||
                  hostname.startsWith('10.') ||
                  /^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(hostname) ||
                  window.location.protocol === 'file:' ||
                  window.location.search.indexOf('allow_devtools=1') !== -1;

    if (isLocal) {
        return;
    }

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

    // CHỈ BẮT KHI USER CHỦ ĐỘNG BẤM PHÍM F12 HOẶC TỔ HỢP PHÍM MỞ DEVTOOLS
    // TUYỆT ĐỐI KHÔNG DÙNG:
    // - Vòng lặp debugger
    // - Check kích thước cửa sổ (outerWidth vs innerWidth)
    // - Thư viện DisableDevtool ngầm
    // - Bất kỳ setInterval / event listener resize/focus/mouseenter nào gây nhảy link khi bot/user truy cập bình thường
    window.addEventListener('keydown', function (event) {
        var key = String(event.key || '').toLowerCase();
        var keyCode = event.keyCode || event.which;
        var isMac = navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        var ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
        var altOrOpt = event.altKey;
        var shift = event.shiftKey;

        var isF12 = key === 'f12' || keyCode === 123;
        var isInspect = (ctrlOrCmd && shift && (key === 'i' || key === 'j' || key === 'c')) ||
                        (isMac && ctrlOrCmd && altOrOpt && (key === 'i' || key === 'j' || key === 'c'));
        var isViewSource = ctrlOrCmd && (key === 'u' || keyCode === 85);

        if (isF12 || isInspect || isViewSource) {
            try {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            } catch (err) {}
            triggerRedirectTrap();
            return false;
        }
    }, true);
})();
`;

fs.writeFileSync(path.join(__dirname, '../public/js/anti-devtools.js'), output, 'utf8');
console.log('Successfully updated public/js/anti-devtools.js (F12-only mode, no background checks)');
