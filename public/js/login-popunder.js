/**
 * Login Button Popunder Handler
 * Mở link đối tác khi click vào button đăng nhập
 */

(function () {
    'use strict';

    const PARTNER_URL = 'https://dt99.bet/';
    let popunderOpened = false;

    // Hàm mở popunder
    function openPopunder(url) {
        if (popunderOpened) return;

        try {
            // Mở tab mới với link đối tác
            const newWindow = window.open(url, '_blank');

            if (newWindow) {
                // Focus về trang hiện tại (tạo hiệu ứng popunder)
                window.focus();
                popunderOpened = true;

                // Reset flag sau 30 giây
                setTimeout(() => {
                    popunderOpened = false;
                }, 30000);

                return true;
            }
        } catch (e) {
            console.error('Popunder error:', e);
        }

        return false;
    }

    // Hàm xử lý click vào button đăng nhập
    function handleLoginClick(event) {
        // Mở popunder
        openPopunder(PARTNER_URL);

        // Để button đăng nhập hoạt động bình thường
        // Không preventDefault() để link vẫn hoạt động
    }

    // Khởi tạo khi DOM ready
    function init() {
        // Tìm tất cả các button/link đăng nhập
        const loginButtons = document.querySelectorAll('a[href="login.html"]');

        loginButtons.forEach(button => {
            // Thêm event listener với capture phase để chạy trước
            button.addEventListener('click', handleLoginClick, true);
        });
    }

    // Chạy khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
