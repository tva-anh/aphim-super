// Kịch bản để load động Dropdown danh sách các quốc gia (Menu Phim)
async function loadCountriesDropdown() {
    try {
        const dropdown = document.getElementById('countryDropdown');
        if (!dropdown) return;

        // Hardcode danh sách quốc gia để không phụ thuộc vào thứ tự load của api.js
        const countriesData = [
            { slug: 'viet-nam', name: 'Việt Nam' }, { slug: 'trung-quoc', name: 'Trung Quốc' },
            { slug: 'han-quoc', name: 'Hàn Quốc' }, { slug: 'nhat-ban', name: 'Nhật Bản' },
            { slug: 'thai-lan', name: 'Thái Lan' }, { slug: 'au-my', name: 'Âu Mỹ' },
            { slug: 'dai-loan', name: 'Đài Loan' }, { slug: 'hong-kong', name: 'Hồng Kông' },
            { slug: 'an-do', name: 'Ấn Độ' }, { slug: 'anh', name: 'Anh' },
            { slug: 'phap', name: 'Pháp' }, { slug: 'canada', name: 'Canada' },
            { slug: 'duc', name: 'Đức' }, { slug: 'tay-ban-nha', name: 'Tây Ban Nha' },
            { slug: 'tho-nhi-ky', name: 'Thổ Nhĩ Kỳ' }, { slug: 'ha-lan', name: 'Hà Lan' },
            { slug: 'indonesia', name: 'Indonesia' }, { slug: 'nga', name: 'Nga' },
            { slug: 'mexico', name: 'Mexico' }, { slug: 'ba-lan', name: 'Ba Lan' },
            { slug: 'uc', name: 'Úc' }, { slug: 'thuy-dien', name: 'Thụy Điển' },
            { slug: 'malaysia', name: 'Malaysia' }, { slug: 'brazil', name: 'Brazil' },
            { slug: 'philippines', name: 'Philippines' }, { slug: 'bo-dao-nha', name: 'Bồ Đào Nha' },
            { slug: 'y', name: 'Ý' }, { slug: 'dan-mach', name: 'Đan Mạch' },
            { slug: 'uae', name: 'UAE' }, { slug: 'na-uy', name: 'Na Uy' },
            { slug: 'thuy-si', name: 'Thụy Sĩ' }, { slug: 'chau-phi', name: 'Châu Phi' },
            { slug: 'nam-phi', name: 'Nam Phi' }, { slug: 'ukraina', name: 'Ukraina' },
            { slug: 'a-rap-xe-ut', name: 'Ả Rập Xê Út' }
        ];

        // Gộp mục Tất Cả vào chung 1 lưới thiết kế để không vỡ khung grid-cols-4
        const countries = [{ slug: 'all', name: 'Tất Cả Quốc Gia' }, ...countriesData];

        // Map mã ISO lấy cờ từ FlagCDN (Vì Window PC không hỗ trợ hiển thị Emoji quốc gia 🇻🇳)
        const flags = {
            'viet-nam': 'vn', 'trung-quoc': 'cn', 'han-quoc': 'kr', 'nhat-ban': 'jp',
            'thai-lan': 'th', 'au-my': 'us', 'dai-loan': 'tw', 'hong-kong': 'hk',
            'an-do': 'in', 'anh': 'gb', 'phap': 'fr', 'canada': 'ca', 'duc': 'de',
            'tay-ban-nha': 'es', 'tho-nhi-ky': 'tr', 'ha-lan': 'nl', 'indonesia': 'id',
            'nga': 'ru', 'mexico': 'mx', 'ba-lan': 'pl', 'uc': 'au', 'thuy-dien': 'se',
            'malaysia': 'my', 'brazil': 'br', 'philippines': 'ph', 'bo-dao-nha': 'pt',
            'y': 'it', 'dan-mach': 'dk', 'uae': 'ae', 'na-uy': 'no', 'thuy-si': 'ch',
            'chau-phi': 'globe', 'nam-phi': 'za', 'ukraina': 'ua', 'a-rap-xe-ut': 'sa',
            'all': 'globe'
        };

        // Tính toán số ô bị thiếu để grid đầy đủ viền (đang dùng 4 cột)
        const totalCells = Math.ceil(countries.length / 4) * 4;
        const missingCells = totalCells - countries.length;

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
        
        gridHTML += countries.map((country, index) => {
            const isLastRow = index >= totalCells - 4;
            const isRightEdge = (index + 1) % 4 === 0;
            const borderColor = 'rgba(255,255,255,0.08)';
            let borderStyle = '';
            if (!isRightEdge) borderStyle += `border-right: 1px solid ${borderColor};`;
            if (!isLastRow)   borderStyle += `border-bottom: 1px solid ${borderColor};`;
            
            const code = flags[country.slug] || 'globe';
            
            const iconHtml = (code === 'globe') 
                ? `<span style="margin-right:8px;font-size:15px;flex-shrink:0;">🌍</span>`
                : `<img src="https://flagcdn.com/16x12/${code}.png" alt="${code}" style="width:16px;height:12px;object-fit:cover;border-radius:2px;margin-right:8px;flex-shrink:0;">`;

            const url = (country.slug === 'all') 
                ? 'phim-theo-quoc-gia.html' 
                : `phim-theo-quoc-gia.html?country=${country.slug}`;

            const fontWeight = (country.slug === 'all') ? 'font-weight:700;' : '';

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
                    ${iconHtml}
                    <span style="overflow:hidden;text-overflow:ellipsis;">${country.name}</span>
                </a>
            `;
        }).join('');

        // Empty cells
        for (let i = 0; i < missingCells; i++) {
            const index = countries.length + i;
            const isRightEdge = (index + 1) % 4 === 0;
            const borderColor = 'rgba(255,255,255,0.08)';
            let borderStyle = !isRightEdge ? `border-right: 1px solid ${borderColor};` : '';
            gridHTML += `<div style="display:block;padding:11px 16px;pointer-events:none;${borderStyle}"></div>`;
        }

        gridHTML += '</div></div>';
        dropdown.innerHTML = gridHTML;
        
    } catch (error) {
        console.error('Error loading countries dropdown:', error);
        const dropdown = document.getElementById('countryDropdown');
        if (dropdown) {
            dropdown.innerHTML = '<div class="p-4 text-center text-red-400">Không thể tải danh sách</div>';
        }
    }
}

// Load dropdown on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCountriesDropdown);
} else {
    loadCountriesDropdown();
}

