/**
 * A PHIM - Chat Widget Guard v1.2
 * 
 * CHÈN VÀO ĐẦU TIÊN TRONG <head> CỦA MỌI TRANG
 */
(function () {
    'use strict';

    // ═════════════════════════════════════════════════════════════════════
    // TĂNG TỐC & TẮT CÁC LỖI LOG RÁC TỪ TAWK.TO (CORS/ERR_FAILED)
    // ═════════════════════════════════════════════════════════════════════
    try {
        // Chặn Fetch API gọi log hiệu suất lỗi của Tawk
        const originalFetch = window.fetch;
        window.fetch = function () {
            const url = arguments[0];
            if (typeof url === 'string' && url.includes('va.tawk.to/log-performance')) {
                return Promise.resolve(new Response('{"blocked":true}', { status: 200 }));
            }
            return originalFetch.apply(this, arguments);
        };

        // Chặn XMLHttpRequest gọi log hiệu suất lỗi của Tawk
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url) {
            if (typeof url === 'string' && url.includes('va.tawk.to/log-performance')) {
                this.isBlockedRequest = true;
                return; // Không mở request
            }
            return originalOpen.apply(this, arguments);
        };
        
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function () {
            if (this.isBlockedRequest) {
                // Giả lập đã hoàn tất thành công
                Object.defineProperty(this, 'readyState', { get: () => 4 });
                Object.defineProperty(this, 'status', { get: () => 200 });
                if (this.onload) this.onload();
                return;
            }
            return originalSend.apply(this, arguments);
        };
    } catch (e) {
        console.warn('[Guard] Block optimization skipped.');
    }
    // ═════════════════════════════════════════════════════════════════════

    // 5. Material Icons Fix
    function fixIcons() {
        var existing = Array.from(document.querySelectorAll('link[href*="googleapis.com/icon"]')).map(l => l.href).join('');
        if (existing.indexOf('Material+Icons') === -1 || existing.indexOf('Material+Icons+') !== -1 && existing.indexOf('Material+Icons|') === -1 && existing.indexOf('|Material+Icons') === -1) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            document.head.appendChild(link);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixIcons);
    } else {
        fixIcons();
    }
})();
