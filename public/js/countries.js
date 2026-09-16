// Countries data for movie filtering
const COUNTRIES = [
    { slug: 'viet-nam', name: 'Việt Nam', flag: '🇻🇳' },
    { slug: 'han-quoc', name: 'Hàn Quốc', flag: '🇰🇷' },
    { slug: 'trung-quoc', name: 'Trung Quốc', flag: '🇨🇳' },
    { slug: 'nhat-ban', name: 'Nhật Bản', flag: '🇯🇵' },
    { slug: 'thai-lan', name: 'Thái Lan', flag: '🇹🇭' },
    { slug: 'au-my', name: 'Âu Mỹ', flag: '🇺🇸' },
    { slug: 'hong-kong', name: 'Hồng Kông', flag: '🇭🇰' },
    { slug: 'dai-loan', name: 'Đài Loan', flag: '🇹🇼' },
    { slug: 'an-do', name: 'Ấn Độ', flag: '🇮🇳' },
    { slug: 'anh', name: 'Anh', flag: '🇬🇧' },
    { slug: 'phap', name: 'Pháp', flag: '🇫🇷' },
    { slug: 'canada', name: 'Canada', flag: '🇨🇦' },
    { slug: 'duc', name: 'Đức', flag: '🇩🇪' },
    { slug: 'tay-ban-nha', name: 'Tây Ban Nha', flag: '🇪🇸' },
    { slug: 'tho-nhi-ky', name: 'Thổ Nhĩ Kỳ', flag: '🇹🇷' },
    { slug: 'ha-lan', name: 'Hà Lan', flag: '🇳🇱' },
    { slug: 'indonesia', name: 'Indonesia', flag: '🇮🇩' },
    { slug: 'nga', name: 'Nga', flag: '🇷🇺' },
    { slug: 'mexico', name: 'Mexico', flag: '🇲🇽' },
    { slug: 'ba-lan', name: 'Ba Lan', flag: '🇵🇱' },
    { slug: 'uc', name: 'Úc', flag: '🇦🇺' },
    { slug: 'thuy-dien', name: 'Thụy Điển', flag: '🇸🇪' },
    { slug: 'malaysia', name: 'Malaysia', flag: '🇲🇾' },
    { slug: 'brazil', name: 'Brazil', flag: '🇧🇷' },
    { slug: 'philippines', name: 'Philippines', flag: '🇵🇭' },
    { slug: 'bo-dao-nha', name: 'Bồ Đào Nha', flag: '🇵🇹' },
    { slug: 'y', name: 'Ý', flag: '🇮🇹' },
    { slug: 'dan-mach', name: 'Đan Mạch', flag: '🇩🇰' },
    { slug: 'na-uy', name: 'Na Uy', flag: '🇳🇴' },
    { slug: 'thuy-si', name: 'Thụy Sĩ', flag: '🇨🇭' },
    { slug: 'nam-phi', name: 'Nam Phi', flag: '🇿🇦' },
    { slug: 'ukraina', name: 'Ukraina', flag: '🇺🇦' }
];

// Get country by slug
function getCountryBySlug(slug) {
    return COUNTRIES.find(c => c.slug === slug);
}

// Get all countries
function getAllCountries() {
    return COUNTRIES;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COUNTRIES, getCountryBySlug, getAllCountries };
}
