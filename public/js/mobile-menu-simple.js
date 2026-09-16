// Mobile Menu với Dropdown Phim - Version 2.0 (Có Phim X)
// Cập nhật: 2024 - Thêm menu Phim X cho mobile

function injectSimpleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;

    // Get current page to highlight active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const menuHTML = `
        <div class="container mx-auto px-6 py-4">
            <a href="index.html" class="block py-3 ${currentPage === 'index.html' ? 'text-primary font-bold' : 'text-gray-300 hover:text-primary'} transition-colors">
                🏠 Trang chủ
            </a>
            
            <!-- Phim Dropdown -->
            <div>
                <button onclick="toggleMobileSection('mobilePhimSection')" class="w-full flex items-center justify-between py-3 text-gray-300 hover:text-primary transition-colors">
                    <span>🌏 Phim</span>
                    <span id="mobilePhimSectionIcon" class="material-icons-round text-sm transition-transform">expand_more</span>
                </button>
                <div id="mobilePhimSection" class="hidden pl-4 space-y-1">
                    <a href="phim-theo-quoc-gia.html" class="block py-2 text-gray-400 hover:text-primary transition-colors">
                        🌍 Tất Cả Quốc Gia
                    </a>
                    <a href="phim-theo-quoc-gia.html?country=viet-nam" class="flex items-center py-2 text-gray-400 hover:text-primary transition-colors">
                        <svg class="w-5 h-5 mr-2" viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg">
                            <rect width="30" height="20" fill="#DA251D"/>
                            <polygon points="15,4 16.5,9 21.5,9 17.5,12 19,17 15,14 11,17 12.5,12 8.5,9 13.5,9" fill="#FFFF00"/>
                        </svg>
                        Phim Việt Nam
                    </a>
                    <a href="phim-theo-quoc-gia.html?country=han-quoc" class="block py-2 text-gray-400 hover:text-primary transition-colors">
                        🇰🇷 Phim Hàn Quốc
                    </a>
                    <a href="phim-theo-quoc-gia.html?country=trung-quoc" class="block py-2 text-gray-400 hover:text-primary transition-colors">
                        🇨🇳 Phim Trung Quốc
                    </a>
                    <a href="phim-theo-quoc-gia.html?country=nhat-ban" class="block py-2 text-gray-400 hover:text-primary transition-colors">
                        🇯🇵 Phim Nhật Bản
                    </a>
                    <a href="phim-theo-quoc-gia.html?country=thai-lan" class="block py-2 text-gray-400 hover:text-primary transition-colors">
                        🇹🇭 Phim Thái Lan
                    </a>
                    <a href="phim-theo-quoc-gia.html?country=au-my" class="block py-2 text-gray-400 hover:text-primary transition-colors">
                        🇺🇸 Phim Âu Mỹ
                    </a>
                </div>
            </div>
            
            <a href="danh-sach.html" class="block py-3 ${currentPage === 'danh-sach.html' ? 'text-primary font-bold' : 'text-gray-300 hover:text-primary'} transition-colors">
                📋 Danh Sách
            </a>
            <a href="categories.html" class="block py-3 ${currentPage === 'categories.html' ? 'text-primary font-bold' : 'text-gray-300 hover:text-primary'} transition-colors">
                🎬 Thể Loại
            </a>
            <a href="search.html" class="block py-3 ${currentPage === 'search.html' ? 'text-primary font-bold' : 'text-gray-300 hover:text-primary'} transition-colors">
                🔍 Khám phá
            </a>
            <a href="pricing.html" class="block py-3 ${currentPage === 'pricing.html' ? 'text-primary font-bold' : 'text-gray-300 hover:text-primary'} transition-colors">
                💎 Gói cước
            </a>
            
            <!-- Phim X (18+) -->
            <a href="phim-x.html" class="block py-3 ${currentPage === 'phim-x.html' ? 'text-red-400 font-bold' : 'text-red-400 hover:text-red-300'} transition-colors font-bold">
                🔞 Phim X
            </a>
        </div>
    `;

    mobileMenu.innerHTML = menuHTML;
}

// Toggle mobile section
window.toggleMobileSection = function (sectionId) {
    const section = document.getElementById(sectionId);
    const icon = document.getElementById(sectionId + 'Icon');
    if (section && icon) {
        section.classList.toggle('hidden');
        icon.style.transform = section.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSimpleMobileMenu);
} else {
    injectSimpleMobileMenu();
}
