// Add Danh Sách menu to all navigation bars
document.addEventListener('DOMContentLoaded', function () {
    // Desktop menu - find Phim dropdown and add Danh Sách after it
    const desktopMenus = document.querySelectorAll('nav .hidden.lg\\:flex');

    desktopMenus.forEach(menu => {
        // Find Phim dropdown
        const phimDropdown = Array.from(menu.children).find(el =>
            el.querySelector('button') && el.querySelector('button').textContent.includes('Phim')
        );

        if (phimDropdown) {
            // Create Danh Sách dropdown
            const danhSachDropdown = document.createElement('div');
            danhSachDropdown.className = 'relative group';
            danhSachDropdown.innerHTML = `
                <button class="text-gray-300 hover:text-primary font-medium transition-colors text-sm uppercase tracking-wide flex items-center gap-1">
                    Danh Sách
                    <span class="material-icons-round text-sm">expand_more</span>
                </button>
                <div class="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <a href="danh-sach.html?list=phim-moi" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Mới</a>
                    <a href="danh-sach.html?list=phim-bo" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Bộ</a>
                    <a href="danh-sach.html?list=phim-le" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Lẻ</a>
                    <a href="danh-sach.html?list=tv-shows" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">TV Shows</a>
                    <a href="danh-sach.html?list=hoat-hinh" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Hoạt Hình</a>
                    <a href="danh-sach.html?list=phim-vietsub" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Vietsub</a>
                    <a href="danh-sach.html?list=phim-thuyet-minh" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Thuyết Minh</a>
                    <a href="danh-sach.html?list=phim-long-tien" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Lồng Tiếng</a>
                    <a href="danh-sach.html?list=phim-bo-dang-chieu" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Bộ Đang Chiếu</a>
                    <a href="danh-sach.html?list=phim-bo-hoan-thanh" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Bộ Đã Hoàn Thành</a>
                    <a href="danh-sach.html?list=phim-sap-chieu" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Sắp Chiếu</a>
                    <a href="danh-sach.html?list=subteam" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Subteam</a>
                    <a href="danh-sach.html?list=phim-chieu-rap" class="block px-4 py-3 text-gray-300 hover:text-primary hover:bg-white/5 transition-colors">Phim Chiếu Rạp</a>
                </div>
            `;

            // Insert after Phim dropdown
            phimDropdown.after(danhSachDropdown);
        }
    });

    // Mobile menu - find PHIM section and add DANH SÁCH after it
    const mobileMenus = document.querySelectorAll('#mobileMenu .container, #mobileMenu > div');

    mobileMenus.forEach(menu => {
        // Find PHIM section
        const phimSection = Array.from(menu.children).find(el =>
            el.querySelector('.text-gray-400') && el.textContent.includes('PHIM')
        );

        if (phimSection) {
            // Create Danh Sách section
            const danhSachSection = document.createElement('div');
            danhSachSection.className = 'py-3';
            danhSachSection.innerHTML = `
                <div class="text-gray-400 text-sm font-bold mb-2">DANH SÁCH</div>
                <a href="danh-sach.html?list=phim-moi" class="block py-2 pl-4 text-gray-300 hover:text-primary transition-colors">Phim Mới</a>
                <a href="danh-sach.html?list=phim-bo" class="block py-2 pl-4 text-gray-300 hover:text-primary transition-colors">Phim Bộ</a>
                <a href="danh-sach.html?list=phim-le" class="block py-2 pl-4 text-gray-300 hover:text-primary transition-colors">Phim Lẻ</a>
                <a href="danh-sach.html?list=tv-shows" class="block py-2 pl-4 text-gray-300 hover:text-primary transition-colors">TV Shows</a>
                <a href="danh-sach.html?list=hoat-hinh" class="block py-2 pl-4 text-gray-300 hover:text-primary transition-colors">Hoạt Hình</a>
                <a href="danh-sach.html?list=phim-chieu-rap" class="block py-2 pl-4 text-gray-300 hover:text-primary transition-colors">Phim Chiếu Rạp</a>
            `;

            // Insert after PHIM section
            phimSection.after(danhSachSection);
        }
    });
});
