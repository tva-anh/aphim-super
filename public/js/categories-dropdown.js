// Load categories for dropdown menu (Zero-latency version)
function loadCategoriesDropdown() {
    try {
        const dropdown = document.getElementById('categoryDropdown');
        if (!dropdown) return;

        // Hardcode categories to bypass API delay completely
        const categoriesData = [
            { slug: 'hanh-dong', name: 'Hành Động' }, { slug: 'tinh-cam', name: 'Tình Cảm' },
            { slug: 'hai-huoc', name: 'Hài Hước' }, { slug: 'co-trang', name: 'Cổ Trang' },
            { slug: 'tam-ly', name: 'Tâm Lý' }, { slug: 'hinh-su', name: 'Hình Sự' },
            { slug: 'chien-tranh', name: 'Chiến Tranh' }, { slug: 'the-thao', name: 'Thể Thao' },
            { slug: 'vo-thuat', name: 'Võ Thuật' }, { slug: 'vien-tuong', name: 'Viễn Tưởng' },
            { slug: 'phieu-luu', name: 'Phiêu Lưu' }, { slug: 'khoa-hoc', name: 'Khoa Học' },
            { slug: 'kinh-di', name: 'Kinh Dị' }, { slug: 'am-nhac', name: 'Âm Nhạc' },
            { slug: 'than-thoai', name: 'Thần Thoại' }, { slug: 'tai-lieu', name: 'Tài Liệu' },
            { slug: 'gia-dinh', name: 'Gia Đình' }, { slug: 'chinh-kich', name: 'Chính kịch' },
            { slug: 'bi-an', name: 'Bí ẩn' }, { slug: 'hoc-duong', name: 'Học Đường' },
            { slug: 'kinh-dien', name: 'Kinh Điển' }, { slug: 'phim-18', name: 'Phim 18+' },
            { slug: 'short-drama', name: 'Short Drama' }
        ];

        // Gộp mục Tất Cả vào chung 1 lưới thiết kế để không vỡ khung grid-cols-4
        const categories = [{ slug: 'all', name: 'Tất Cả Thể Loại' }, ...categoriesData];

        // Tính toán số ô bị thiếu để grid đầy đủ viền (đang dùng 4 cột)
        const totalCells = Math.ceil(categories.length / 4) * 4;
        const missingCells = totalCells - categories.length;

        // Render as grid 4 columns — bọc trong nền xanh dương
        let gridHTML = `
            <div style="
                background: linear-gradient(160deg, #1e4d8c 0%, #2563b8 40%, #1a3d7a 100%);
                border-radius: 12px;
                padding: 6px;
                border: 1px solid rgba(59,130,246,0.25);
                box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
            ">
                <div class="grid grid-cols-4 gap-0">`;
        
        gridHTML += categories.map((cat, index) => {
            const isLastRow = index >= totalCells - 4;
            const isRightEdge = (index + 1) % 4 === 0;
            const borderColor = 'rgba(255,255,255,0.08)';
            
            // Border CSS
            let borderStyle = '';
            if (!isRightEdge) borderStyle += `border-right: 1px solid ${borderColor};`;
            if (!isLastRow)   borderStyle += `border-bottom: 1px solid ${borderColor};`;
            
            // Link URL
            const url = (cat.slug === 'all') 
                ? 'categories.html' 
                : `categories.html?category=${cat.slug}`;

            // Bold for Tất Cả
            const fontWeight = (cat.slug === 'all') ? 'font-weight:700;' : '';

            return `
                <a href="${url}" 
                   style="
                       display: flex; align-items: center;
                       padding: 11px 16px;
                       color: rgba(255,255,255,0.88);
                       font-size: 0.82rem;
                       ${fontWeight}
                       ${borderStyle}
                       white-space: nowrap;
                       transition: background 0.18s, color 0.18s;
                       border-radius: 0;
                       text-decoration: none;
                   "
                   onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.color='#ffd700';"
                   onmouseout="this.style.background='';this.style.color='rgba(255,255,255,0.88)';"
                >
                    <span style="overflow:hidden;text-overflow:ellipsis;">${cat.name}</span>
                </a>
            `;
        }).join('');

        // Empty cells
        for (let i = 0; i < missingCells; i++) {
            const index = categories.length + i;
            const isRightEdge = (index + 1) % 4 === 0;
            const borderColor = 'rgba(255,255,255,0.08)';
            let borderStyle = !isRightEdge ? `border-right: 1px solid ${borderColor};` : '';
            gridHTML += `<div style="display:block;padding:11px 16px;pointer-events:none;${borderStyle}"></div>`;
        }

        gridHTML += '</div></div>';
        dropdown.innerHTML = gridHTML;
        
    } catch (error) {
        console.error('Error loading categories dropdown:', error);
        const dropdown = document.getElementById('categoryDropdown');
        if (dropdown) {
            dropdown.innerHTML = '<div class="p-4 text-center text-red-400">Không thể tải thể loại</div>';
        }
    }
}

// Load dropdown on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCategoriesDropdown);
} else {
    loadCategoriesDropdown();
}

