const fs = require('fs');
const path = require('path');

const libCode = fs.readFileSync(path.join(__dirname, '../public/js/disable-devtool.min.js'), 'utf8');

const output = `(function () {
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

    window.addEventListener('contextmenu', function (event) {
        var tag = event.target && event.target.tagName ? event.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea') return true;
        event.preventDefault();
        event.stopPropagation();
        return false;
    }, true);

    function runDebuggerCheck() {
        if (isBlocked) return;
        var startedAt = performance.now();
        debugger;
        if (performance.now() - startedAt > 100) {
            triggerRedirectTrap();
        }
    }

    window.setInterval(runDebuggerCheck, 1000);
    window.addEventListener('resize', runDebuggerCheck, true);
    window.addEventListener('focus', runDebuggerCheck, true);
    window.addEventListener('mouseenter', runDebuggerCheck, true);

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
