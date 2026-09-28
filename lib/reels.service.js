/**
 * lib/reels.service.js
 * 🚀 High-Performance Multi-Source Reels & Movie Review Engine for APhim Super
 * Aggregates curated reviews, short dramas, and automated YouTube movie summaries.
 * Direct connection to APhim Movie Watch System (/xem-phim/[slug]/tap-1)
 */

const axios = require('axios');
const { CURATED_REVIEWS, CURATED_REELS } = require('./reels.seeds');

const CACHE_TTL = 30 * 60 * 1000; // 30 phút cache
let reelsMemoryCache = {
    review: { items: Array.isArray(CURATED_REVIEWS) && CURATED_REVIEWS.length > 0 ? [...CURATED_REVIEWS] : [], lastFetched: Date.now() },
    reel: { items: Array.isArray(CURATED_REELS) && CURATED_REELS.length > 0 ? [...CURATED_REELS] : [], lastFetched: Date.now() }
};

const movieMatchCache = new Map();

const topicReelsCache = new Map();
const TOPIC_CACHE_TTL = 30 * 60 * 1000;

// Bảng ánh xạ chủ đề thể loại, quốc gia, danh mục phim siêu tốc
const EXPLORE_MAP = {
    // 🎭 Thể loại hot
    'hanh-dong': { type: 'the-loai', slug: 'hanh-dong', name: 'Hành Động' },
    'hành động': { type: 'the-loai', slug: 'hanh-dong', name: 'Hành Động' },
    'hanh dong': { type: 'the-loai', slug: 'hanh-dong', name: 'Hành Động' },
    'tinh-cam': { type: 'the-loai', slug: 'tinh-cam', name: 'Tình Cảm' },
    'tình cảm': { type: 'the-loai', slug: 'tinh-cam', name: 'Tình Cảm' },
    'tinh cam': { type: 'the-loai', slug: 'tinh-cam', name: 'Tình Cảm' },
    'co-trang': { type: 'the-loai', slug: 'co-trang', name: 'Cổ Trang' },
    'cổ trang': { type: 'the-loai', slug: 'co-trang', name: 'Cổ Trang' },
    'co trang': { type: 'the-loai', slug: 'co-trang', name: 'Cổ Trang' },
    'kinh-di': { type: 'the-loai', slug: 'kinh-di', name: 'Kinh Dị' },
    'kinh dị': { type: 'the-loai', slug: 'kinh-di', name: 'Kinh Dị' },
    'kinh di': { type: 'the-loai', slug: 'kinh-di', name: 'Kinh Dị' },
    'hai-huoc': { type: 'the-loai', slug: 'hai-huoc', name: 'Hài Hước' },
    'hài hước': { type: 'the-loai', slug: 'hai-huoc', name: 'Hài Hước' },
    'hai huoc': { type: 'the-loai', slug: 'hai-huoc', name: 'Hài Hước' },
    'vien-tuong': { type: 'the-loai', slug: 'vien-tuong', name: 'Viễn Tưởng' },
    'viễn tưởng': { type: 'the-loai', slug: 'vien-tuong', name: 'Viễn Tưởng' },
    'vien tuong': { type: 'the-loai', slug: 'vien-tuong', name: 'Viễn Tưởng' },
    'tam-ly': { type: 'the-loai', slug: 'tam-ly', name: 'Tâm Lý' },
    'tâm lý': { type: 'the-loai', slug: 'tam-ly', name: 'Tâm Lý' },
    'tam ly': { type: 'the-loai', slug: 'tam-ly', name: 'Tâm Lý' },
    'vo-thuat': { type: 'the-loai', slug: 'vo-thuat', name: 'Võ Thuật' },
    'võ thuật': { type: 'the-loai', slug: 'vo-thuat', name: 'Võ Thuật' },
    'vo thuat': { type: 'the-loai', slug: 'vo-thuat', name: 'Võ Thuật' },
    'hoat-hinh': { type: 'the-loai', slug: 'hoat-hinh', name: 'Hoạt Hình' },
    'hoạt hình': { type: 'the-loai', slug: 'hoat-hinh', name: 'Hoạt Hình' },
    'hoat hinh': { type: 'the-loai', slug: 'hoat-hinh', name: 'Hoạt Hình' },
    'anime': { type: 'the-loai', slug: 'hoat-hinh', name: 'Hoạt Hình' },

    // 🌐 Quốc gia
    'han-quoc': { type: 'quoc-gia', slug: 'han-quoc', name: 'Hàn Quốc' },
    'hàn quốc': { type: 'quoc-gia', slug: 'han-quoc', name: 'Hàn Quốc' },
    'han quoc': { type: 'quoc-gia', slug: 'han-quoc', name: 'Hàn Quốc' },
    'trung-quoc': { type: 'quoc-gia', slug: 'trung-quoc', name: 'Trung Quốc' },
    'trung quốc': { type: 'quoc-gia', slug: 'trung-quoc', name: 'Trung Quốc' },
    'trung quoc': { type: 'quoc-gia', slug: 'trung-quoc', name: 'Trung Quốc' },
    'au-my': { type: 'quoc-gia', slug: 'au-my', name: 'Âu Mỹ' },
    'âu mỹ': { type: 'quoc-gia', slug: 'au-my', name: 'Âu Mỹ' },
    'au my': { type: 'quoc-gia', slug: 'au-my', name: 'Âu Mỹ' },
    'thai-lan': { type: 'quoc-gia', slug: 'thai-lan', name: 'Thái Lan' },
    'thái lan': { type: 'quoc-gia', slug: 'thai-lan', name: 'Thái Lan' },
    'thai lan': { type: 'quoc-gia', slug: 'thai-lan', name: 'Thái Lan' },
    'nhat-ban': { type: 'quoc-gia', slug: 'nhat-ban', name: 'Nhật Bản' },
    'nhật bản': { type: 'quoc-gia', slug: 'nhat-ban', name: 'Nhật Bản' },
    'nhat ban': { type: 'quoc-gia', slug: 'nhat-ban', name: 'Nhật Bản' },
    'viet-nam': { type: 'quoc-gia', slug: 'viet-nam', name: 'Việt Nam' },
    'việt nam': { type: 'quoc-gia', slug: 'viet-nam', name: 'Việt Nam' },
    'viet nam': { type: 'quoc-gia', slug: 'viet-nam', name: 'Việt Nam' },

    // 🧭 Khám phá / Danh sách
    'phim-moi': { type: 'danh-sach', slug: 'phim-moi-cap-nhat', name: 'Phim Mới' },
    'phim-moi-cap-nhat': { type: 'danh-sach', slug: 'phim-moi-cap-nhat', name: 'Phim Mới' },
    'phim mới': { type: 'danh-sach', slug: 'phim-moi-cap-nhat', name: 'Phim Mới' },
    'phim moi': { type: 'danh-sach', slug: 'phim-moi-cap-nhat', name: 'Phim Mới' },
    'phim-bo': { type: 'danh-sach', slug: 'phim-bo', name: 'Phim Bộ' },
    'phim bộ': { type: 'danh-sach', slug: 'phim-bo', name: 'Phim Bộ' },
    'phim bo': { type: 'danh-sach', slug: 'phim-bo', name: 'Phim Bộ' },
    'phim-le': { type: 'danh-sach', slug: 'phim-le', name: 'Phim Lẻ' },
    'phim lẻ': { type: 'danh-sach', slug: 'phim-le', name: 'Phim Lẻ' },
    'phim le': { type: 'danh-sach', slug: 'phim-le', name: 'Phim Lẻ' },
    'phim-chieu-rap': { type: 'danh-sach', slug: 'phim-chieu-rap', name: 'Phim Chiếu Rạp' },
    'chieu-rap': { type: 'danh-sach', slug: 'phim-chieu-rap', name: 'Phim Chiếu Rạp' },
    'phim chiếu rạp': { type: 'danh-sach', slug: 'phim-chieu-rap', name: 'Phim Chiếu Rạp' },
    'lich-chieu': { type: 'danh-sach', slug: 'phim-chieu-rap', name: 'Lịch Chiếu' },
    'lịch chiếu': { type: 'danh-sach', slug: 'phim-chieu-rap', name: 'Lịch Chiếu' },
    'lich chieu': { type: 'danh-sach', slug: 'phim-chieu-rap', name: 'Lịch Chiếu' }
};

const GENRE_MAP = Object.fromEntries(
    Object.entries(EXPLORE_MAP).map(([k, v]) => [k, v.slug])
);
/**
 * 🧹 Siêu hàm làm sạch & chuẩn hóa toàn diện thông tin phim
 * Tách chuẩn xác movieTitle (tiếng Việt), originTitle (tên gốc), year, và description
 * Loại bỏ triệt để các chuỗi rác như "Review chi tiết siêu phẩm...", "Tóm tắt phim...", tags và ngoặc trùng lặp.
 */
function extractCleanMovieMeta(rawTitle = '', rawOrigin = '', rawCaption = '', rawYear = '') {
    let title = (rawTitle || '').trim();
    let origin = (rawOrigin || '').trim();
    let caption = (rawCaption || '').trim();
    let year = (rawYear || '').trim();

    // 1. Loại bỏ các tiền tố review rác
    const prefixRegex = /^(\[.*?\]|【.*?】|\(Review\s*phim\))\s*/gi;
    title = title.replace(prefixRegex, '');
    caption = caption.replace(prefixRegex, '');

    const reviewLeadRegex = /^(Review\s+chi\s+tiết\s+siêu\s+phẩm|Review\s+chi\s+tiết\s+phim|Review\s+chi\s+tiết|Review\s+phim\s+hay|Review\s+phim\s+hot|Review\s+phim|Review\s+siêu\s+phẩm|Tóm\s+tắt\s+phim\s+hay|Tóm\s+tắt\s+phim|Tóm\s+tắt\s+siêu\s+phẩm|Tóm\s+tắt\s+trọn\s+bộ|Tóm\s+tắt|Phim\s+mới|Phim\s+chiếu\s+rạp|Bom\s+tấn|Siêu\s+phẩm|Trailer)\s*[:\-\—\–]?\s*/gi;
    
    title = title.replace(reviewLeadRegex, '').trim();

    // 2. Trích xuất năm nếu có dạng (2024), (2025), (2026)
    const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch && !year) {
        year = yearMatch[1];
    }
    title = title.replace(/\s*\((?:19|20)\d{2}\)\s*$/g, '').replace(/\s*-(?:19|20)\d{2}\s*$/g, '').trim();

    // 3. Nếu tiêu đề chứa tên gốc trong ngoặc đơn ở cuối: ví dụ "Ừ Thì Ly Hôn! (OK! Let's Get Divorced)"
    const bracketMatch = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    if (bracketMatch) {
        const candidateTitle = bracketMatch[1].trim();
        const candidateOrigin = bracketMatch[2].trim();
        if (candidateTitle.length >= 2 && !/^(phần|tập|season|ep|episode)\s*\d+$/i.test(candidateOrigin) && !/^\d{4}$/.test(candidateOrigin)) {
            title = candidateTitle;
            if (!origin) {
                origin = candidateOrigin;
            }
        }
    }

    // 4. Bỏ các đuôi rác
    title = title.replace(/\s*[\|\-]\s*(Tóm Tắt Phim|Review Phim|Thuyết Minh|Vietsub|Full HD|Trọn Bộ).*$/i, '').trim();
    title = title.replace(/\.+$/, '').trim();

    // 5. Chuẩn hóa origin_title
    if (origin) {
        origin = origin.replace(reviewLeadRegex, '').replace(/\.+$/, '').trim();
        origin = origin.replace(/^\((.+)\)$/, '$1').trim();
    }

    // 6. Chuẩn hóa caption & description (Không bao giờ lặp từ ngữ "Review chi tiết siêu phẩm" 2 lần)
    let cleanDesc = caption;
    if (cleanDesc) {
        cleanDesc = cleanDesc.replace(prefixRegex, '');
        cleanDesc = cleanDesc.replace(/^(Video\s+tóm\s+tắt\s+&\s+review\s+chi\s+tiết\s+bộ\s+phim|Video\s+tóm\s+tắt\s+phim|Video\s+review\s+phim|Review\s+chi\s+tiết\s+siêu\s+phẩm|Review\s+chi\s+tiết|Review\s+phim\s+hay|Review\s+phim|Tóm\s+tắt\s+phim|Tóm\s+tắt\s+siêu\s+phẩm|Tóm\s+tắt\s+trọn\s+bộ)\s*[:\-\—\–]?\s*/gi, '');
        cleanDesc = cleanDesc.replace(/\.+$/, '').trim();
    }
    
    if (!cleanDesc || cleanDesc.length < 5 || cleanDesc.toLowerCase() === title.toLowerCase() || cleanDesc.toLowerCase().includes(title.toLowerCase())) {
        cleanDesc = `Tóm tắt và phân tích trọn bộ diễn biến chính của siêu phẩm ${title}${origin ? ` (${origin})` : ''}.`;
    } else if (!cleanDesc.startsWith('Tóm tắt') && !cleanDesc.startsWith('Review') && !cleanDesc.startsWith('Hành trình') && !cleanDesc.startsWith('Màn')) {
        cleanDesc = `Tóm tắt và phân tích trọn bộ diễn biến chính của siêu phẩm ${cleanDesc}.`;
    } else {
        cleanDesc = `${cleanDesc}.`;
    }

    return {
        movieTitle: title || 'Phim Hay Hot',
        originTitle: origin,
        year: year || '2026',
        description: cleanDesc
    };
}

/**
 * ⚡ Bảng dữ liệu Reels được curation sẵn cho từng Thể loại/Quốc gia/Danh mục
 * Đảm bảo 100% video riêng biệt độc nhất (Zero Duplicate) cho từng mục
 */
const TOPIC_CURATED_DATA = {
    // 🎭 HÀNH ĐỘNG
    'hanh-dong': [
        { yt: '1MmeiWOtUuc', title: 'Hiệp Sĩ Mặt Nạ MY-TH: Huyền Thoại 12 Con Giáp', origin_title: 'Kamen Rider MY-TH', slug: 'hiep-si-mat-na-my-th-huyen-thoai-12-con-giap', year: '2026', rating: '9.3', poster: 'https://phimimg.com/uploads/movies/20260907/hiep-si-mat-na-my-th-poster.webp' },
        { yt: 'Ey5VRdEGhNI', title: 'Bước Đường Cùng', origin_title: 'Bronson', slug: 'buoc-duong-cung', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260927/buoc-duong-cung-poster.webp' },
        { yt: 'Y_G0A8ohFLo', title: 'Trùm Cuối Hoang Dã Giá Lâm (Phần 2)', origin_title: 'A Wild Last Boss Appeared! (Season 2)', slug: 'trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2', year: '2026', rating: '9.0', poster: 'https://phimimg.com/uploads/movies/20260927/trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2-poster.webp' },
        { yt: 'd889_HcNvd4', title: 'Báo Động Mayday', origin_title: 'Plane / Mayday Alert', slug: 'bao-dong-mayday', year: '2026', rating: '8.8', poster: 'https://i.ytimg.com/vi/d889_HcNvd4/hqdefault.jpg' },
        { yt: '7jR0xYF8kKk', title: 'Người Bảo Vệ', origin_title: 'The Defender', slug: 'nguoi-bao-ve', year: '2025', rating: '8.6', poster: 'https://i.ytimg.com/vi/7jR0xYF8kKk/hqdefault.jpg' },
        { yt: 'cLfQncRAWtQ', title: 'Star Wars: Mandalorian & Grogu', origin_title: 'The Mandalorian & Grogu', slug: 'star-wars-mandalorian-va-grogu', year: '2026', rating: '9.4', poster: 'https://i.ytimg.com/vi/cLfQncRAWtQ/hqdefault.jpg' }
    ],
    // 🌸 TÌNH CẢM
    'tinh-cam': [
        { yt: 'kngwPXyj9NU', title: 'Khi Cuộc Đời Cho Bạn Quả Quýt', origin_title: 'When Life Gives You Tangerines', slug: 'khi-cuoc-doi-cho-ban-qua-quyt', year: '2025', rating: '9.5', poster: 'https://i.ytimg.com/vi/kngwPXyj9NU/hqdefault.jpg' },
        { yt: 's_NWSnhHNxg', title: 'Vụng Trộm Không Thể Giấu', origin_title: 'Hidden Love', slug: 'vung-trom-khong-the-giau', year: '2025', rating: '9.3', poster: 'https://i.ytimg.com/vi/s_NWSnhHNxg/hqdefault.jpg' },
        { yt: 'yYw6LBz6oiw', title: 'Tình Yêu Và Danh Vọng', origin_title: 'Love & Ambition', slug: 'tinh-yeu-va-danh-vong', year: '2026', rating: '8.7', poster: 'https://i.ytimg.com/vi/yYw6LBz6oiw/hqdefault.jpg' },
        { yt: 'sA7Eayl5ff8', title: 'Chìm Vào Mắt Em', origin_title: 'Dive into You', slug: 'chim-vao-mat-em-phan-1', year: '2026', rating: '9.1', poster: 'https://phimimg.com/uploads/movies/20260927/chim-vao-mat-em-phan-1-poster.webp' },
        { yt: 'pbeDDMlT0rI', title: 'Cậu Và Tớ Là Hai Thái Cực Đối Lập', origin_title: 'You and I Are Polar Opposites', slug: 'cau-va-to-la-hai-thai-cuc-doi-lap-seihantai-na-kimi-to-boku-phan-2', year: '2026', rating: '9.0', poster: 'https://phimimg.com/upload/vod/20260706-1/a7325eb2658ffe5ad2d8a782910f5542.jpg' },
        { yt: 'RAzoSbzSHd4', title: 'Nhất Âu Xuân', origin_title: 'Spring Of The Blade', slug: 'nhat-au-xuan', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260917/nhat-au-xuan-poster.webp' }
    ],
    // 👘 CỔ TRANG
    'co-trang': [
        { yt: 'HXxzKhKBwAM', title: 'Lan Hương Như Cố', origin_title: 'Against The Current', slug: 'lan-huong-nhu-co', year: '2026', rating: '9.2', poster: 'https://phimimg.com/uploads/movies/20260912/lan-huong-nhu-co-poster.webp' },
        { yt: 'YU-Nj97B8aY', title: 'Đấu La Đại Lục (Phần 1)', origin_title: 'Soul Land', slug: 'dau-la-dai-luc', year: '2025', rating: '9.1', poster: 'https://i.ytimg.com/vi/YU-Nj97B8aY/hqdefault.jpg' },
        { yt: 'Q5bvFUEPRuE', title: 'Tiên Nghịch', origin_title: 'Renegade Immortal', slug: 'tien-nghich', year: '2025', rating: '9.4', poster: 'https://phimimg.com/uploads/movies/20260720/tien-nghich-poster.webp' },
        { yt: '6g-8uB0gM_0', title: 'Còn Ra Thể Thống Gì Nữa', origin_title: 'No More Decorum', slug: 'con-ra-the-thong-gi-nua', year: '2026', rating: '8.7', poster: 'https://i.ytimg.com/vi/6g-8uB0gM_0/hqdefault.jpg' },
        { yt: 'v3LwB5h1k6k', title: 'Mộng Hoa Lục', origin_title: 'A Dream of Splendor', slug: 'mong-hoa-luc', year: '2025', rating: '9.0', poster: 'https://i.ytimg.com/vi/v3LwB5h1k6k/hqdefault.jpg' }
    ],
    // 👻 KINH DỊ
    'kinh-di': [
        { yt: 'nLJR2twdK00', title: 'Truyện Kinh Dị Mỹ (Phần 13)', origin_title: 'American Horror Story (Season 13)', slug: 'truyen-kinh-di-my-phan-13', year: '2026', rating: '8.8', poster: 'https://phimimg.com/uploads/movies/20260927/truyen-kinh-di-my-phan-13-poster.webp' },
        { yt: 'd889_HcNvd4', title: 'Quỷ Nhập Tràng', origin_title: 'Possession Spirit', slug: 'quy-nhap-trang', year: '2026', rating: '8.4', poster: 'https://i.ytimg.com/vi/d889_HcNvd4/hqdefault.jpg' },
        { yt: '7jR0xYF8kKk', title: 'Ngôi Nhà Bí Ẩn', origin_title: 'The Mystery Haunted House', slug: 'ngoi-nha-bi-an', year: '2025', rating: '8.2', poster: 'https://i.ytimg.com/vi/7jR0xYF8kKk/hqdefault.jpg' },
        { yt: 'bWNZ84d2b_o', title: 'Ác Mộng Trong Đêm', origin_title: 'Midnight Nightmare', slug: 'ac-mong-trong-dem', year: '2026', rating: '8.5', poster: 'https://phimimg.com/uploads/movies/20260726/tho-san-giac-thu-omegahorn-poster.webp' }
    ],
    // 😂 HÀI HƯỚC
    'hai-huoc': [
        { yt: 'yL6kxL4nTgo', title: 'Gia Đình Là Số 1 (Phần 3)', origin_title: 'High Kick 3', slug: 'gia-dinh-la-so-1-phan-3', year: '2025', rating: '9.2', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { yt: 'qLptbTLNJGo', title: 'Những Câu Nói Hay Của Châu Tinh Trì', origin_title: 'Stephen Chow Best Comedy', slug: 'chau-tinh-tri', year: '2026', rating: '9.6', poster: 'https://i.ytimg.com/vi/qLptbTLNJGo/hqdefault.jpg' },
        { yt: 'nMfSOQJ4kOM', title: 'Ừ Thì Ly Hôn!', origin_title: "OK! Let's Get Divorced", slug: 'u-thi-ly-hon', year: '2026', rating: '9.0', poster: 'https://phimimg.com/uploads/movies/20260821/u-thi-ly-hon-poster.webp' },
        { yt: '6g-8uB0gM_0', title: 'Còn Ra Thể Thống Gì Nữa', origin_title: 'No More Decorum', slug: 'con-ra-the-thong-gi-nua', year: '2026', rating: '8.8', poster: 'https://i.ytimg.com/vi/6g-8uB0gM_0/hqdefault.jpg' },
        { yt: 'sA7Eayl5ff8', title: 'Chìm Vào Mắt Em', origin_title: 'Dive into You', slug: 'chim-vao-mat-em-phan-1', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260927/chim-vao-mat-em-phan-1-poster.webp' }
    ],
    // 🚀 VIỄN TƯỞNG
    'vien-tuong': [
        { yt: 'cLfQncRAWtQ', title: 'Star Wars: Mandalorian & Grogu', origin_title: 'The Mandalorian & Grogu', slug: 'star-wars-mandalorian-va-grogu', year: '2026', rating: '9.5', poster: 'https://i.ytimg.com/vi/cLfQncRAWtQ/hqdefault.jpg' },
        { yt: '1MmeiWOtUuc', title: 'Hiệp Sĩ Mặt Nạ MY-TH', origin_title: 'Kamen Rider MY-TH', slug: 'hiep-si-mat-na-my-th-huyen-thoai-12-con-giap', year: '2026', rating: '9.2', poster: 'https://phimimg.com/uploads/movies/20260907/hiep-si-mat-na-my-th-poster.webp' },
        { yt: 'Y_G0A8ohFLo', title: 'Trùm Cuối Hoang Dã Giá Lâm (Phần 2)', origin_title: 'A Wild Last Boss Appeared!', slug: 'trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2', year: '2026', rating: '9.0', poster: 'https://phimimg.com/uploads/movies/20260927/trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2-poster.webp' },
        { yt: 'nLJR2twdK00', title: 'Truyện Kinh Dị Mỹ: Không Gian Ảo', origin_title: 'American Horror Story Sci-Fi', slug: 'truyen-kinh-di-my-phan-13', year: '2026', rating: '8.8', poster: 'https://phimimg.com/uploads/movies/20260927/truyen-kinh-di-my-phan-13-poster.webp' }
    ],
    // 🧠 TÂM LÝ
    'tam-ly': [
        { yt: 'bWNZ84d2b_o', title: 'Thợ Săn Giác Thú Omegahorn', origin_title: 'KakuseiHunter Omegahorn', slug: 'tho-san-giac-thu-omegahorn', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260726/tho-san-giac-thu-omegahorn-poster.webp' },
        { yt: 'NxtF93RLhpA', title: 'Theo Dòng Nước Ngầm (Phần 2)', origin_title: 'Undercurrent (Season 2)', slug: 'theo-dong-nuoc-ngam-phan-2', year: '2025', rating: '9.2', poster: 'https://i.ytimg.com/vi/NxtF93RLhpA/hqdefault.jpg' },
        { yt: 'nMfSOQJ4kOM', title: 'Ừ Thì Ly Hôn!', origin_title: "OK! Let's Get Divorced", slug: 'u-thi-ly-hon', year: '2026', rating: '9.1', poster: 'https://phimimg.com/uploads/movies/20260821/u-thi-ly-hon-poster.webp' },
        { yt: 'Ey5VRdEGhNI', title: 'Bước Đường Cùng', origin_title: 'Bronson', slug: 'buoc-duong-cung', year: '2026', rating: '8.8', poster: 'https://phimimg.com/uploads/movies/20260927/buoc-duong-cung-poster.webp' }
    ],
    // ⚔️ VÕ THUẬT
    'vo-thuat': [
        { yt: 'DJ7cOjSC8E4', title: 'Võ Thuật Đỉnh Cao Tony Jaa', origin_title: 'Tony Jaa Best Martial Arts', slug: 'vo-thuat-dinh-cao', year: '2026', rating: '9.6', poster: 'https://i.ytimg.com/vi/DJ7cOjSC8E4/hqdefault.jpg' },
        { yt: '1MmeiWOtUuc', title: 'Hiệp Sĩ Mặt Nạ: Võ Thuật 12 Con Giáp', origin_title: 'Kamen Rider Combat', slug: 'hiep-si-mat-na-my-th-huyen-thoai-12-con-giap', year: '2026', rating: '9.2', poster: 'https://phimimg.com/uploads/movies/20260907/hiep-si-mat-na-my-th-poster.webp' },
        { yt: 'YU-Nj97B8aY', title: 'Đấu La Đại Lục 2: Tuyệt Thế Võ Hồn', origin_title: 'Soul Land Martial Combat', slug: 'dau-la-dai-luc-2', year: '2026', rating: '9.3', poster: 'https://i.ytimg.com/vi/YU-Nj97B8aY/hqdefault.jpg' },
        { yt: '7jR0xYF8kKk', title: 'Người Bảo Vệ: Quyết Chiến', origin_title: 'The Defender Combat', slug: 'nguoi-bao-ve', year: '2025', rating: '8.7', poster: 'https://i.ytimg.com/vi/7jR0xYF8kKk/hqdefault.jpg' }
    ],
    // 🎌 HOẠT HÌNH / ANIME
    'hoat-hinh': [
        { yt: 'kxE0DCTni3o', title: 'One Piece (Đảo Hải Tặc)', origin_title: 'One Piece', slug: 'dao-hai-tac', year: '2026', rating: '9.7', poster: 'https://i.ytimg.com/vi/kxE0DCTni3o/hqdefault.jpg' },
        { yt: 'Q5bvFUEPRuE', title: 'Tiên Nghịch', origin_title: 'Renegade Immortal', slug: 'tien-nghich', year: '2025', rating: '9.5', poster: 'https://phimimg.com/uploads/movies/20260720/tien-nghich-poster.webp' },
        { yt: 'DKZ2F9niXiU', title: 'Thiếu Chủ Giỏi Chạy Trốn (Phần 2)', origin_title: 'The Elusive Samurai', slug: 'thieu-chu-gioi-chay-tron-phan-2', year: '2026', rating: '9.1', poster: 'https://i.ytimg.com/vi/DKZ2F9niXiU/hqdefault.jpg' },
        { yt: 'Y_G0A8ohFLo', title: 'Trùm Cuối Hoang Dã Giá Lâm (Phần 2)', origin_title: 'A Wild Last Boss Appeared! 2', slug: 'trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2', year: '2026', rating: '9.0', poster: 'https://phimimg.com/uploads/movies/20260927/trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2-poster.webp' }
    ],
    // 🇰🇷 HÀN QUỐC
    'han-quoc': [
        { yt: 'kngwPXyj9NU', title: 'Khi Cuộc Đời Cho Bạn Quả Quýt', origin_title: 'When Life Gives You Tangerines', slug: 'khi-cuoc-doi-cho-ban-qua-quyt', year: '2025', rating: '9.6', poster: 'https://i.ytimg.com/vi/kngwPXyj9NU/hqdefault.jpg' },
        { yt: 'NxtF93RLhpA', title: 'Theo Dòng Nước Ngầm (Phần 2)', origin_title: 'Undercurrent (Season 2)', slug: 'theo-dong-nuoc-ngam-phan-2', year: '2025', rating: '9.1', poster: 'https://i.ytimg.com/vi/NxtF93RLhpA/hqdefault.jpg' },
        { yt: 'yL6kxL4nTgo', title: 'Gia Đình Là Số 1 (Phần 3)', origin_title: 'High Kick 3', slug: 'gia-dinh-la-so-1-phan-3', year: '2025', rating: '9.2', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { yt: '7jR0xYF8kKk', title: 'Ẩn Danh (Phần 3)', origin_title: 'Taxi Driver (Season 3)', slug: 'an-danh-phan-3', year: '2025', rating: '9.0', poster: 'https://i.ytimg.com/vi/7jR0xYF8kKk/hqdefault.jpg' }
    ],
    // 🇨🇳 TRUNG QUỐC
    'trung-quoc': [
        { yt: 'HXxzKhKBwAM', title: 'Lan Hương Như Cố', origin_title: 'Against The Current', slug: 'lan-huong-nhu-co', year: '2026', rating: '9.3', poster: 'https://phimimg.com/uploads/movies/20260912/lan-huong-nhu-co-poster.webp' },
        { yt: 'Q5bvFUEPRuE', title: 'Tiên Nghịch', origin_title: 'Renegade Immortal', slug: 'tien-nghich', year: '2025', rating: '9.5', poster: 'https://phimimg.com/uploads/movies/20260720/tien-nghich-poster.webp' },
        { yt: 'YU-Nj97B8aY', title: 'Đấu La Đại Lục (Phần 1)', origin_title: 'Soul Land', slug: 'dau-la-dai-luc', year: '2025', rating: '9.1', poster: 'https://i.ytimg.com/vi/YU-Nj97B8aY/hqdefault.jpg' },
        { yt: '6g-8uB0gM_0', title: 'Còn Ra Thể Thống Gì Nữa', origin_title: 'No More Decorum', slug: 'con-ra-the-thong-gi-nua', year: '2026', rating: '8.8', poster: 'https://i.ytimg.com/vi/6g-8uB0gM_0/hqdefault.jpg' }
    ],
    // 🇺🇸 ÂU MỸ
    'au-my': [
        { yt: 'cLfQncRAWtQ', title: 'Star Wars: Mandalorian & Grogu', origin_title: 'The Mandalorian & Grogu', slug: 'star-wars-mandalorian-va-grogu', year: '2026', rating: '9.5', poster: 'https://i.ytimg.com/vi/cLfQncRAWtQ/hqdefault.jpg' },
        { yt: 'Ey5VRdEGhNI', title: 'Bước Đường Cùng', origin_title: 'Bronson', slug: 'buoc-duong-cung', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260927/buoc-duong-cung-poster.webp' },
        { yt: 'd889_HcNvd4', title: 'Báo Động Mayday', origin_title: 'Mayday Plane', slug: 'bao-dong-mayday', year: '2026', rating: '8.8', poster: 'https://i.ytimg.com/vi/d889_HcNvd4/hqdefault.jpg' },
        { yt: 'nLJR2twdK00', title: 'Truyện Kinh Dị Mỹ (Phần 13)', origin_title: 'American Horror Story', slug: 'truyen-kinh-di-my-phan-13', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260927/truyen-kinh-di-my-phan-13-poster.webp' }
    ],
    // 🇹🇭 THÁI LAN
    'thai-lan': [
        { yt: 'DJ7cOjSC8E4', title: 'Võ Thuật Đỉnh Cao Tony Jaa', origin_title: 'Tony Jaa Best Action', slug: 'vo-thuat-dinh-cao', year: '2026', rating: '9.5', poster: 'https://i.ytimg.com/vi/DJ7cOjSC8E4/hqdefault.jpg' },
        { yt: 'yYw6LBz6oiw', title: 'Tình Yêu Và Danh Vọng', origin_title: 'Love & Ambition Thailand', slug: 'tinh-yeu-va-danh-vong', year: '2026', rating: '8.7', poster: 'https://i.ytimg.com/vi/yYw6LBz6oiw/hqdefault.jpg' },
        { yt: 'NxtF93RLhpA', title: 'Tình Bạo Lực Thái Lan', origin_title: 'Bad Love Thailand', slug: 'tinh-bao-luc', year: '2025', rating: '8.5', poster: 'https://i.ytimg.com/vi/NxtF93RLhpA/hqdefault.jpg' }
    ],
    // 🇯🇵 NHẬT BẢN
    'nhat-ban': [
        { yt: '1MmeiWOtUuc', title: 'Hiệp Sĩ Mặt Nạ MY-TH', origin_title: 'Kamen Rider MY-TH', slug: 'hiep-si-mat-na-my-th-huyen-thoai-12-con-giap', year: '2026', rating: '9.3', poster: 'https://phimimg.com/uploads/movies/20260907/hiep-si-mat-na-my-th-poster.webp' },
        { yt: 'kxE0DCTni3o', title: 'One Piece (Đảo Hải Tặc)', origin_title: 'One Piece Japan', slug: 'dao-hai-tac', year: '2026', rating: '9.7', poster: 'https://i.ytimg.com/vi/kxE0DCTni3o/hqdefault.jpg' },
        { yt: 'pbeDDMlT0rI', title: 'Cậu Và Tớ Là Hai Thái Cực Đối Lập', origin_title: 'Seihantai na Kimi to Boku', slug: 'cau-va-to-la-hai-thai-cuc-doi-lap-seihantai-na-kimi-to-boku-phan-2', year: '2026', rating: '9.1', poster: 'https://phimimg.com/upload/vod/20260706-1/a7325eb2658ffe5ad2d8a782910f5542.jpg' },
        { yt: 'DKZ2F9niXiU', title: 'Thiếu Chủ Giỏi Chạy Trốn (Phần 2)', origin_title: 'The Elusive Samurai', slug: 'thieu-chu-gioi-chay-tron-phan-2', year: '2026', rating: '9.0', poster: 'https://i.ytimg.com/vi/DKZ2F9niXiU/hqdefault.jpg' }
    ],
    // 🇻🇳 VIỆT NAM
    'viet-nam': [
        { yt: 'Z7hYwWv-0g4', title: 'Lật Mặt 7: Một Điều Ước', origin_title: 'Face Off 7', slug: 'lat-mat-7', year: '2024', rating: '9.2', poster: 'https://i.ytimg.com/vi/Z7hYwWv-0g4/hqdefault.jpg' },
        { yt: 'yL6kxL4nTgo', title: 'Đào, Phở và Piano', origin_title: 'Peach, Pho & Piano', slug: 'dao-pho-va-piano', year: '2024', rating: '9.3', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { yt: 'kngwPXyj9NU', title: 'Phim Mai (Trấn Thành)', origin_title: 'Mai Movie', slug: 'phim-mai', year: '2024', rating: '9.1', poster: 'https://i.ytimg.com/vi/kngwPXyj9NU/hqdefault.jpg' },
        { yt: '7jR0xYF8kKk', title: 'Người Bảo Vệ Việt Nam', origin_title: 'The Defender VN', slug: 'nguoi-bao-ve', year: '2025', rating: '8.6', poster: 'https://i.ytimg.com/vi/7jR0xYF8kKk/hqdefault.jpg' }
    ],
    // 📺 PHIM MỚI
    'phim-moi-cap-nhat': [
        { yt: '1MmeiWOtUuc', title: 'Hiệp Sĩ Mặt Nạ MY-TH', origin_title: 'Kamen Rider MY-TH', slug: 'hiep-si-mat-na-my-th-huyen-thoai-12-con-giap', year: '2026', rating: '9.4', poster: 'https://phimimg.com/uploads/movies/20260907/hiep-si-mat-na-my-th-poster.webp' },
        { yt: 'Ey5VRdEGhNI', title: 'Bước Đường Cùng', origin_title: 'Bronson', slug: 'buoc-duong-cung', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260927/buoc-duong-cung-poster.webp' },
        { yt: 'Y_G0A8ohFLo', title: 'Trùm Cuối Hoang Dã Giá Lâm (Phần 2)', origin_title: 'A Wild Last Boss Appeared!', slug: 'trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2', year: '2026', rating: '9.1', poster: 'https://phimimg.com/uploads/movies/20260927/trum-cuoi-hoang-da-gia-lam-trum-cuoi-hoang-da-xuat-hien-phan-2-poster.webp' },
        { yt: 'sA7Eayl5ff8', title: 'Chìm Vào Mắt Em', origin_title: 'Dive into You', slug: 'chim-vao-mat-em-phan-1', year: '2026', rating: '9.0', poster: 'https://phimimg.com/uploads/movies/20260927/chim-vao-mat-em-phan-1-poster.webp' },
        { yt: 'RAzoSbzSHd4', title: 'Nhất Âu Xuân', origin_title: 'Spring Of The Blade', slug: 'nhat-au-xuan', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260917/nhat-au-xuan-poster.webp' }
    ],
    // 🎞️ PHIM BỘ
    'phim-bo': [
        { yt: 'kngwPXyj9NU', title: 'Khi Cuộc Đời Cho Bạn Quả Quýt', origin_title: 'When Life Gives You Tangerines', slug: 'khi-cuoc-doi-cho-ban-qua-quyt', year: '2025', rating: '9.6', poster: 'https://i.ytimg.com/vi/kngwPXyj9NU/hqdefault.jpg' },
        { yt: 'NxtF93RLhpA', title: 'Theo Dòng Nước Ngầm (Phần 2)', origin_title: 'Undercurrent (Season 2)', slug: 'theo-dong-nuoc-ngam-phan-2', year: '2025', rating: '9.1', poster: 'https://i.ytimg.com/vi/NxtF93RLhpA/hqdefault.jpg' },
        { yt: 'yL6kxL4nTgo', title: 'Gia Đình Là Số 1 (Phần 3)', origin_title: 'High Kick 3', slug: 'gia-dinh-la-so-1-phan-3', year: '2025', rating: '9.2', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { yt: 'nLJR2twdK00', title: 'Truyện Kinh Dị Mỹ (Phần 13)', origin_title: 'American Horror Story (Season 13)', slug: 'truyen-kinh-di-my-phan-13', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260927/truyen-kinh-di-my-phan-13-poster.webp' },
        { yt: 'HXxzKhKBwAM', title: 'Lan Hương Như Cố', origin_title: 'Against The Current', slug: 'lan-huong-nhu-co', year: '2026', rating: '9.3', poster: 'https://phimimg.com/uploads/movies/20260912/lan-huong-nhu-co-poster.webp' }
    ],
    // 🎬 PHIM LẺ
    'phim-le': [
        { yt: 'Ey5VRdEGhNI', title: 'Bước Đường Cùng', origin_title: 'Bronson', slug: 'buoc-duong-cung', year: '2026', rating: '8.9', poster: 'https://phimimg.com/uploads/movies/20260927/buoc-duong-cung-poster.webp' },
        { yt: 'bWNZ84d2b_o', title: 'Thợ Săn Giác Thú Omegahorn', origin_title: 'KakuseiHunter Omegahorn', slug: 'tho-san-giac-thu-omegahorn', year: '2026', rating: '8.8', poster: 'https://phimimg.com/uploads/movies/20260726/tho-san-giac-thu-omegahorn-poster.webp' },
        { yt: 'nMfSOQJ4kOM', title: 'Ừ Thì Ly Hôn!', origin_title: "OK! Let's Get Divorced", slug: 'u-thi-ly-hon', year: '2026', rating: '9.2', poster: 'https://phimimg.com/uploads/movies/20260821/u-thi-ly-hon-poster.webp' },
        { yt: 'd889_HcNvd4', title: 'Báo Động Mayday', origin_title: 'Plane Alert', slug: 'bao-dong-mayday', year: '2026', rating: '8.8', poster: 'https://i.ytimg.com/vi/d889_HcNvd4/hqdefault.jpg' },
        { yt: 'Z7hYwWv-0g4', title: 'Lật Mặt 7: Một Điều Ước', origin_title: 'Face Off 7', slug: 'lat-mat-7', year: '2024', rating: '9.2', poster: 'https://i.ytimg.com/vi/Z7hYwWv-0g4/hqdefault.jpg' }
    ],
    // 🎭 PHIM CHIẾU RẠP / LỊCH CHIẾU
    'phim-chieu-rap': [
        { yt: 'cLfQncRAWtQ', title: 'Star Wars: Mandalorian & Grogu', origin_title: 'The Mandalorian & Grogu', slug: 'star-wars-mandalorian-va-grogu', year: '2026', rating: '9.5', poster: 'https://i.ytimg.com/vi/cLfQncRAWtQ/hqdefault.jpg' },
        { yt: 'Z7hYwWv-0g4', title: 'Lật Mặt 7: Một Điều Ước', origin_title: 'Face Off 7', slug: 'lat-mat-7', year: '2024', rating: '9.2', poster: 'https://i.ytimg.com/vi/Z7hYwWv-0g4/hqdefault.jpg' },
        { yt: 'd889_HcNvd4', title: 'Báo Động Mayday', origin_title: 'Mayday Alert', slug: 'bao-dong-mayday', year: '2026', rating: '8.8', poster: 'https://i.ytimg.com/vi/d889_HcNvd4/hqdefault.jpg' },
        { yt: 'yL6kxL4nTgo', title: 'Đào, Phở và Piano', origin_title: 'Peach, Pho and Piano', slug: 'dao-pho-va-piano', year: '2024', rating: '9.3', poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg' },
        { yt: '7jR0xYF8kKk', title: 'Người Bảo Vệ', origin_title: 'The Defender', slug: 'nguoi-bao-ve', year: '2025', rating: '8.7', poster: 'https://i.ytimg.com/vi/7jR0xYF8kKk/hqdefault.jpg' }
    ],
};

/**
 * Lấy danh sách Reels/Review chuẩn xác cho từng Thể loại, Quốc gia, Danh mục
 * Ưu tiên: ⚡ Curated 0ms → 🗄️ Cache → 🌐 External API & Seed Filtering
 */
async function fetchTopicReels(topicInfo, tab = 'review') {
    if (!topicInfo) return [];
    const cacheKey = `${topicInfo.type}_${topicInfo.slug}_${tab}`;
    if (topicReelsCache.has(cacheKey)) {
        const cached = topicReelsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < TOPIC_CACHE_TTL && cached.items.length > 0) {
            return cached.items;
        }
    }

    const items = [];
    const seenYts = new Set();

    // ⚡ BƯỚC 0: Trả về dữ liệu curated riêng biệt của topic này
    const curatedRaw = TOPIC_CURATED_DATA[topicInfo.slug] || [];
    curatedRaw.forEach((raw, idx) => {
        if (raw && raw.yt && !seenYts.has(raw.yt)) {
            seenYts.add(raw.yt);
            items.push(formatReelItem({
                id: `curated_${topicInfo.slug}_${raw.yt}_${idx}`,
                yt: raw.yt,
                title: raw.title,
                movieTitle: raw.title,
                origin_title: raw.origin_title || '',
                slug: raw.slug,
                type: tab,
                poster: raw.poster || `https://i.ytimg.com/vi/${raw.yt}/hqdefault.jpg`,
                backdrop: raw.poster || `https://i.ytimg.com/vi/${raw.yt}/hqdefault.jpg`,
                year: raw.year || '2026',
                rating: raw.rating || '9.0',
                quality: 'Full HD',
                categories: [topicInfo.name],
                author: 'APhim Review',
                views: Math.floor(Math.random() * 80000) + 20000,
                likes: Math.floor(Math.random() * 50000) + 10000,
                comments_count: Math.floor(Math.random() * 400) + 50,
                caption: `Video review chi tiết bộ phim ${raw.title}.`,
                watchUrl: `/xem-phim/${raw.slug}/tap-1`
            }, tab));
        }
    });

    // ⚡ BƯỚC 1: Lọc thêm từ kho 120+ Seeds (CURATED_REVIEWS & CURATED_REELS) theo danh mục
    const allSeeds = tab === 'reel' ? [...CURATED_REELS, ...INITIAL_CURATED_REELS] : [...CURATED_REVIEWS, ...INITIAL_CURATED_REVIEWS];
    const normTopicName = removeVietnameseTones(topicInfo.name);
    const normTopicSlug = topicInfo.slug.replace(/-/g, ' ');

    const matchingSeeds = allSeeds.filter(s => {
        if (!s || !s.yt || seenYts.has(s.yt)) return false;
        const catStr = removeVietnameseTones((s.categories || []).join(' '));
        const titleStr = removeVietnameseTones(s.title || '');
        const originStr = removeVietnameseTones(s.origin_title || '');
        return catStr.includes(normTopicName) || 
               catStr.includes(normTopicSlug) || 
               titleStr.includes(normTopicSlug) || 
               originStr.includes(normTopicSlug);
    });

    matchingSeeds.forEach(s => {
        if (!seenYts.has(s.yt)) {
            seenYts.add(s.yt);
            items.push(formatReelItem(s, tab));
        }
    });

    // Nếu đã có ít nhất 4 video chất lượng: Lưu cache và trả về ngay (0ms)
    if (items.length >= 4) {
        topicReelsCache.set(cacheKey, { items, timestamp: Date.now() });
        return items;
    }

    // ⚡ BƯỚC 2: Tải thêm từ PhimAPI nếu danh sách còn ít
    try {
        let apiUrl = '';
        if (topicInfo.type === 'the-loai') apiUrl = `https://phimapi.com/v1/api/the-loai/${topicInfo.slug}?limit=8`;
        else if (topicInfo.type === 'quoc-gia') apiUrl = `https://phimapi.com/v1/api/quoc-gia/${topicInfo.slug}?limit=8`;
        else if (topicInfo.type === 'danh-sach') apiUrl = `https://phimapi.com/v1/api/danh-sach/${topicInfo.slug}?limit=8`;

        if (apiUrl) {
            const res = await axios.get(apiUrl, { timeout: 4000 });
            const movies = res.data?.data?.items || res.data?.items || [];
            for (const m of movies.slice(0, 6)) {
                const cleanName = m.name || '';
                if (!cleanName) continue;
                const ytId = m.trailer_url?.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1] || null;
                if (ytId && !seenYts.has(ytId)) {
                    seenYts.add(ytId);
                    items.push(formatReelItem({
                        id: `api_${topicInfo.slug}_${m.slug}`,
                        yt: ytId,
                        title: m.name,
                        movieTitle: m.name,
                        origin_title: m.origin_name || '',
                        slug: m.slug,
                        type: tab,
                        poster: (m.poster_url || m.thumb_url || '').startsWith('http') ? (m.poster_url || m.thumb_url) : `https://phimimg.com/${(m.poster_url || m.thumb_url || '').replace(/^\//, '')}`,
                        year: m.year ? String(m.year) : '2026',
                        rating: m.tmdb?.vote_average ? (m.tmdb.vote_average / 2).toFixed(1) : '4.9',
                        quality: m.quality || 'Full HD',
                        author: 'APhim Review',
                        views: 20000,
                        likes: 10000,
                        comments_count: 100,
                        caption: `Review phim ${m.name}.`
                    }, tab));
                }
            }
        }
    } catch (apiErr) {}

    if (items.length > 0) {
        topicReelsCache.set(cacheKey, { items, timestamp: Date.now() });
    }

    return items;
}

// Danh sách Review Phim khởi tạo chất lượng cao (Seed Curated Data)
const INITIAL_CURATED_REVIEWS = [
    {
        id: 'rev_khi_cuoc_doi_cho_ban_qua_quyt',
        yt: 'kngwPXyj9NU',
        title: 'Khi Cuộc Đời Cho Bạn Quả Quýt',
        origin_title: 'When Life Gives You Tangerines',
        slug: 'khi-cuoc-doi-cho-ban-qua-quyt',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/kngwPXyj9NU/hqdefault.jpg',
        year: '2025',
        rating: '5.0',
        views: 48888,
        likes: 113494,
        comments_count: 342,
        caption: 'Tóm tắt trọn bộ siêu phẩm tình cảm lãng mạn Hàn Quốc hot nhất 2025.'
    },
    {
        id: 'rev_star_wars_mandalorian',
        yt: 'cLfQncRAWtQ',
        title: 'Star Wars: Mandalorian và Grogu',
        origin_title: 'The Mandalorian & Grogu',
        slug: 'star-wars-mandalorian-va-grogu',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/cLfQncRAWtQ/hqdefault.jpg',
        year: '2026',
        rating: '4.9',
        views: 10422,
        likes: 42180,
        comments_count: 188,
        caption: 'Phân tích chi tiết bom tấn chiến tranh vũ trụ đỉnh cao của Disney & Lucasfilm.'
    },
    {
        id: 'rev_theo_dong_nuoc_ngam_2',
        yt: 'NxtF93RLhpA',
        title: 'Theo Dòng Nước Ngầm (Phần 2)',
        origin_title: 'Undercurrent (Season 2)',
        slug: 'theo-dong-nuoc-ngam-phan-2',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/NxtF93RLhpA/hqdefault.jpg',
        year: '2025',
        rating: '4.6',
        views: 10260,
        likes: 28940,
        comments_count: 95,
        caption: 'Review phim hình sự phá án kịch tính nghẹt thở từng giây.'
    },
    {
        id: 'rev_tham_tu_dai_tai_1',
        yt: 'yL6kxL4nTgo',
        title: 'Thám Tử Đại Tài (Phần 1)',
        origin_title: 'Great Detective',
        slug: 'tham-tu-dai-tai-phan-1',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/yL6kxL4nTgo/hqdefault.jpg',
        year: '2024',
        rating: '5.0',
        views: 52839,
        likes: 98120,
        comments_count: 512,
        caption: 'Những vụ án hóc búa nhất và màn đấu trí đỉnh cao giữa thám tử và tội phạm.'
    },
    {
        id: 'rev_con_ra_the_thong_gi_nua',
        yt: 'n4rb6pKcrtk',
        title: 'Còn Ra Thể Thống Gì Nữa',
        origin_title: 'What a Mess',
        slug: 'con-ra-the-thong-gi-nua',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/n4rb6pKcrtk/hqdefault.jpg',
        year: '2026',
        rating: '4.2',
        views: 54567,
        likes: 87400,
        comments_count: 230,
        caption: 'Phim ngắn hài hước châm biếm sâu cay siêu cuốn hút.'
    },
    {
        id: 'rev_nguoi_bao_ve',
        yt: '-Rhryh1_F2g',
        title: 'Người Bảo Vệ',
        origin_title: 'Protector',
        slug: 'nguoi-bao-ve',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/-Rhryh1_F2g/hqdefault.jpg',
        year: '2026',
        rating: '4.7',
        views: 78500,
        likes: 125300,
        comments_count: 640,
        caption: 'Màn trả thù đẫm máu của cựu đặc nhiệm bảo vệ công lý.'
    },
    {
        id: 'rev_lan_huong_nhu_co',
        yt: '2yc7NIDflPU',
        title: 'Lan Hương Như Cố',
        origin_title: 'Lan Xiang Ru Gu',
        slug: 'lan-huong-nhu-co',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/2yc7NIDflPU/hqdefault.jpg',
        year: '2026',
        rating: '4.8',
        views: 94100,
        likes: 182000,
        comments_count: 890,
        caption: 'Tóm tắt phim cổ trang cung đấu tình cảm cảm động lòng người.'
    },
    {
        id: 'rev_dau_la_dai_luc_2',
        yt: 'YU-Nj97B8aY',
        title: 'Đấu La Đại Lục 2 (Tuyệt Thế Đường Môn)',
        origin_title: 'Soul Land 2',
        slug: 'dau-la-dai-luc-2-tuyet-the-duong-mon',
        type: 'review',
        poster: 'https://i.ytimg.com/vi/YU-Nj97B8aY/hqdefault.jpg',
        year: '2025',
        rating: '5.0',
        views: 145000,
        likes: 245000,
        comments_count: 1420,
        caption: 'Hành trình phục hưng Đường Môn của Hoắc Vũ Hạo với sức mạnh Hồn Sư vô địch.'
    }
];

const INITIAL_CURATED_REELS = [
    {
        id: 'reel_v_qLptbTLNJGo',
        yt: 'qLptbTLNJGo',
        title: 'Những Câu Nói Hay Của Châu Tinh Trì',
        origin_title: 'Stephen Chow Short',
        slug: 'chau-tinh-tri',
        type: 'reel',
        aspect: '9:16',
        poster: 'https://i.ytimg.com/vi/qLptbTLNJGo/hqdefault.jpg',
        year: '2026',
        rating: '4.9',
        views: 84000,
        likes: 52100,
        comments_count: 310,
        caption: 'Những triết lý và câu nói kinh điển của Vua Hài Châu Tinh Trì.',
        categories: ['Hài Hước', 'Phim Ngắn', 'Hot Trend']
    },
    {
        id: 'reel_v_s_NWSnhHNxg',
        yt: 's_NWSnhHNxg',
        title: 'Vụng Trộm Không Thể Giấu - Đoạn Trích Ngọt Ngào',
        origin_title: 'Hidden Love',
        slug: 'vung-trom-khong-the-giau',
        type: 'reel',
        aspect: '9:16',
        poster: 'https://i.ytimg.com/vi/s_NWSnhHNxg/hqdefault.jpg',
        year: '2026',
        rating: '4.9',
        views: 195000,
        likes: 89000,
        comments_count: 540,
        caption: 'Đôi mắt tràn đầy cảm xúc của Triệu Lộ Tư và Trần Triết Viễn.',
        categories: ['Tình Cảm', 'Ngôn Tình', 'Phim Ngắn']
    },
    {
        id: 'reel_v_DJ7cOjSC8E4',
        yt: 'DJ7cOjSC8E4',
        title: 'Võ Thuật Đỉnh Cao Tony Jaa',
        origin_title: 'Tony Jaa Best Martial Arts',
        slug: 'vo-thuat-dinh-cao',
        type: 'reel',
        aspect: '9:16',
        poster: 'https://i.ytimg.com/vi/DJ7cOjSC8E4/hqdefault.jpg',
        year: '2026',
        rating: '5.0',
        views: 310000,
        likes: 94000,
        comments_count: 720,
        caption: 'Những màn đấu võ đối kháng nghẹt thở đỉnh cao của Tony Jaa.',
        categories: ['Hành Động', 'Võ Thuật', 'Hot Trend']
    }
];

// ⚡ Khởi tạo ngay cache trong RAM từ Curated data + 63 verified movies để đảm bảo phản hồi 0ms & 70+ video độc nhất
function buildInitialPool(baseSeeds, curatedSeeds, tab = 'review') {
    const map = new Map();
    [...baseSeeds, ...(curatedSeeds || [])].forEach(it => {
        if (it && it.yt && !map.has(it.yt)) {
            map.set(it.yt, formatReelItem(it, tab));
        }
    });
    return Array.from(map.values());
}

reelsMemoryCache.review.items = buildInitialPool(INITIAL_CURATED_REVIEWS, CURATED_REVIEWS, 'review');
reelsMemoryCache.review.lastFetched = Date.now();
reelsMemoryCache.reel.items = buildInitialPool(INITIAL_CURATED_REELS, CURATED_REELS, 'reel');
reelsMemoryCache.reel.lastFetched = Date.now();

let isCrawlingBackground = { review: false, reel: false };

/**
 * ⚡ TIKTOK-STYLE CONTINUOUS AUTO-DISCOVERY ENGINE:
 * Tự động tìm kiếm & đồng bộ video Review/Tóm tắt phim mới liên tục từ PhimAPI + YouTube
 */
async function syncReelsFromPhimAPI(tab = 'review', maxPages = 3) {
    try {
        const newDiscovered = [];
        const existingYts = new Set(reelsMemoryCache[tab].items.map(i => i.yt));

        for (let p = 1; p <= maxPages; p++) {
            try {
                const res = await axios.get(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${p}`, { timeout: 4000 });
                const items = res.data?.data?.items || res.data?.items || [];
                
                for (const item of items.slice(0, 6)) {
                    if (!item.name) continue;
                    try {
                        const ytReviews = await searchYouTubeMovieReviews(item.name, item.slug);
                        if (ytReviews && ytReviews.length > 0) {
                            for (const ytv of ytReviews) {
                                if (ytv && ytv.yt && !existingYts.has(ytv.yt)) {
                                    existingYts.add(ytv.yt);
                                    newDiscovered.push(ytv);
                                }
                            }
                        }
                    } catch (itemErr) {}
                }
            } catch (pageErr) {}
        }
        return newDiscovered;
    } catch (e) {
        return [];
    }
}

/**
 * Thu thập và làm mới kho Reels ngầm trong background liên tục mà KHÔNG chặn người dùng
 */
async function triggerBackgroundReelsRefresh(normalizedTab = 'review', deepPage = 1) {
    if (isCrawlingBackground[normalizedTab]) return;
    isCrawlingBackground[normalizedTab] = true;
    try {
        const baseSeed = normalizedTab === 'reel' ? reelsMemoryCache.reel.items : reelsMemoryCache.review.items;
        const [partnerItems, apiItems] = await Promise.all([
            crawlPartnerReels(normalizedTab).catch(() => []),
            syncReelsFromPhimAPI(normalizedTab, deepPage <= 1 ? 2 : deepPage).catch(() => [])
        ]);

        const mergedMap = new Map();
        [...baseSeed, ...apiItems, ...partnerItems].forEach(item => {
            if (item && item.yt && !mergedMap.has(item.yt)) {
                mergedMap.set(item.yt, item);
            }
        });

        const allItems = Array.from(mergedMap.values());
        if (allItems.length > 0) {
            reelsMemoryCache[normalizedTab] = {
                items: allItems,
                lastFetched: Date.now()
            };
        }
    } catch (e) {
        // Im lặng trong background
    } finally {
        isCrawlingBackground[normalizedTab] = false;
    }
}

// Khởi chạy đồng bộ ngầm sau 2s khi tiến trình Node đã sẵn sàng
setTimeout(() => {
    triggerBackgroundReelsRefresh('review', 2).catch(() => {});
    triggerBackgroundReelsRefresh('reel', 2).catch(() => {});
}, 2000);

// Định kỳ 3 phút tự động khám phá video phim mới liên tục
setInterval(() => {
    const randomPage = Math.floor(Math.random() * 5) + 1;
    triggerBackgroundReelsRefresh('review', randomPage).catch(() => {});
}, 3 * 60 * 1000);

/**
 * Khớp nối tên phim / từ khóa với kho phim chuẩn của APhim (PhimAPI)
 */
async function matchMovieWithAPhim(query) {
    if (!query) return null;
    const cleanQ = query.replace(/\(\d+\)/g, '').replace(/\[.*?\]/g, '').trim();
    if (!cleanQ || cleanQ.length < 2) return null;

    if (movieMatchCache.has(cleanQ.toLowerCase())) {
        return movieMatchCache.get(cleanQ.toLowerCase());
    }

    try {
        const res = await axios.get(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(cleanQ)}&limit=5`, { timeout: 4500 });
        const items = res.data?.data?.items || [];
        if (items.length > 0) {
            const m = items[0];
            let cleanPoster = m.poster_url || m.thumb_url || '';
            if (cleanPoster && !cleanPoster.startsWith('http')) {
                cleanPoster = `https://phimimg.com/${cleanPoster.replace(/^\//, '')}`;
            }

            const matchResult = {
                name: m.name,
                origin_name: m.origin_name || '',
                slug: m.slug,
                poster: cleanPoster || '/images/no-poster.jpg',
                year: m.year ? String(m.year) : '2026',
                rating: m.tmdb?.vote_average ? (m.tmdb.vote_average / 2).toFixed(1) : '4.9',
                watchUrl: `/xem-phim/${m.slug}/tap-1`,
                detailUrl: `/phim/${m.slug}`,
                quality: m.quality || 'Full HD',
                categories: (m.category || []).map(c => c.name)
            };

            movieMatchCache.set(cleanQ.toLowerCase(), matchResult);
            return matchResult;
        }
    } catch (e) {
        // Fallback im lặng
    }
    return null;
}

/**
 * Làm sạch tiêu đề video thô từ YouTube để trích xuất tên phim thật
 */
function cleanMovieTitleFromYT(rawTitle) {
    if (!rawTitle) return '';
    let t = rawTitle;
    // Bỏ các tag tiền tố như [Review Phim], Review Phim:, Tóm Tắt Phim:, v.v.
    t = t.replace(/^\[.*?\]\s*/i, '')
         .replace(/^(Review Phim|Tóm Tắt Phim|Phim Mới|Bom Tấn|Review)\s*:\s*/i, '')
         .replace(/^(Review Phim|Tóm Tắt Phim|Phim Hay)\s+/i, '');

    // Nếu có dấu phân cách gạch đứng hoặc gạch ngang phân tách tên tiếng Anh
    const parts = t.split(/\s*\|\s*|\s*-\s*Review|\s*--\s*/i);
    let candidate = parts[0].trim();

    // Loại bỏ năm ở đuôi nếu có dạng (2026)
    candidate = candidate.replace(/\s*\(\d{4}\)\s*$/g, '').trim();
    return candidate || rawTitle;
}

/**
 * Crawl các review mới nhất từ GuPhim và các nguồn đối tác theo Tab hoặc Genre
 */
async function crawlPartnerReels(tab = 'review', genre = null) {
    try {
        let url = `https://guphimz.com/reels?tab=${tab}`;
        if (genre) {
            url = `https://guphimz.com/reels?genre=${encodeURIComponent(genre)}`;
        }

        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            timeout: 1500
        });

        const html = res.data;
        const regex = /<section class="reel-item[^"]*"([^>]+)>/g;
        let match;
        const items = [];
        let index = 0;

        while ((match = regex.exec(html)) !== null) {
            const attrStr = match[1];
            const yt = attrStr.match(/data-yt="([^"]+)"/)?.[1];
            const rawSlug = attrStr.match(/data-qv-slug="([^"]+)"/)?.[1] || attrStr.match(/data-slug="([^"]+)"/)?.[1] || '';
            const name = attrStr.match(/data-qv-name="([^"]+)"/)?.[1] || '';
            const originName = attrStr.match(/data-qv-origin="([^"]+)"/)?.[1] || '';
            const poster = attrStr.match(/data-qv-poster="([^"]+)"/)?.[1] || '';
            const year = attrStr.match(/data-qv-year="([^"]+)"/)?.[1] || '2026';
            const rating = (attrStr.match(/data-qv-rating="([^"]+)"/)?.[1] || '4.9').trim();
            const rawViews = attrStr.match(/data-qv-views="([^"]+)"/)?.[1];

            if (yt && name) {
                // Làm sạch slug, loại bỏ đuôi hash ngẫu nhiên của đối tác (ví dụ: tro-choi-con-muc-phan-1-a1bc0 -> tro-choi-con-muc-phan-1)
                const cleanSlug = rawSlug.replace(/-[a-f0-9]{4,10}$/i, '') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                let cleanPoster = poster;
                if (cleanPoster) {
                    if (!cleanPoster.startsWith('http')) {
                        cleanPoster = cleanPoster.startsWith('/images') ? `https://guphimz.com${cleanPoster}` : `https://phimimg.com/${cleanPoster.replace(/^\//, '')}`;
                    }
                } else {
                    cleanPoster = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
                }

                const views = rawViews ? parseInt(rawViews, 10) : (Math.floor(Math.random() * 40000) + 15000);

                items.push({
                    id: `reel_${genre || tab}_${yt}_${index++}`,
                    yt,
                    title: name,
                    movieTitle: name,
                    movieTitleVn: name,
                    origin_title: originName || '',
                    slug: cleanSlug,
                    type: tab,
                    poster: cleanPoster,
                    year,
                    rating,
                    views,
                    likes: Math.floor(views * (0.6 + Math.random() * 0.8)),
                    comments_count: Math.floor(views * 0.015) + 12,
                    caption: `Video tóm tắt & review chi tiết bộ phim ${name} (${originName || year}).`
                });
            }
        }

        return items;
    } catch (err) {
        return [];
    }
}

/**
 * Tự động tìm kiếm video Review trên YouTube hoặc kho APhim cho từ khóa phim
 */
async function searchYouTubeMovieReviews(movieTitle, movieSlug) {
    if (!movieTitle) return [];
    try {
        const query = `Review phim ${movieTitle.replace(/\(\d+\)/g, '').trim()}`;
        const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'vi,en;q=0.9'
            },
            timeout: 6500
        });

        const html = res.data;
        const videoList = [];

        // Trích xuất dữ liệu chi tiết từ ytInitialData
        const initialDataMatch = html.match(/var ytInitialData = ({[\s\S]+?});<\/script>/);
        if (initialDataMatch) {
            try {
                const ytData = JSON.parse(initialDataMatch[1]);
                const contents = ytData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
                for (const item of contents) {
                    const vr = item.videoRenderer;
                    if (vr && vr.videoId && vr.title?.runs?.[0]?.text) {
                        const durationText = vr.lengthText?.simpleText || vr.lengthText?.runs?.[0]?.text || null;
                        videoList.push({
                            ytId: vr.videoId,
                            rawTitle: vr.title.runs[0].text,
                            author: vr.ownerText?.runs?.[0]?.text || 'APhim Review',
                            duration: durationText
                        });
                    }
                }
            } catch (e) {}
        }

        // Fallback regex videoId nếu ytInitialData không trích xuất được
        if (videoList.length === 0) {
            const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
            let match;
            const seen = new Set();
            while ((match = regex.exec(html)) !== null) {
                if (!seen.has(match[1])) {
                    seen.add(match[1]);
                    videoList.push({
                        ytId: match[1],
                        rawTitle: movieTitle,
                        author: 'APhim Review',
                        duration: null
                    });
                }
            }
        }

        // Khớp nối với Database APhim để lấy thông tin chính xác
        const matchedAPhim = await matchMovieWithAPhim(movieTitle);

        const results = [];
        const topVideos = videoList.slice(0, 6);

        for (let idx = 0; idx < topVideos.length; idx++) {
            const v = topVideos[idx];
            const cleanTitle = cleanMovieTitleFromYT(v.rawTitle);

            // Nếu đã khớp với APhim: Dùng toàn bộ siêu dữ liệu chuẩn của APhim
            const finalTitle = matchedAPhim ? matchedAPhim.name : (cleanTitle || movieTitle);
            const finalOrigin = matchedAPhim ? matchedAPhim.origin_name : '';
            const finalSlug = matchedAPhim ? matchedAPhim.slug : (movieSlug || finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
            const finalPoster = matchedAPhim ? matchedAPhim.poster : `https://i.ytimg.com/vi/${v.ytId}/hqdefault.jpg`;
            const finalYear = matchedAPhim ? matchedAPhim.year : new Date().getFullYear().toString();
            const finalRating = matchedAPhim ? matchedAPhim.rating : '4.9';

            results.push(formatReelItem({
                id: `yt_auto_${finalSlug}_${v.ytId}_${idx}`,
                yt: v.ytId,
                title: finalTitle,
                movieTitle: finalTitle,
                movieTitleVn: finalTitle,
                origin_title: finalOrigin,
                slug: finalSlug,
                type: 'review',
                poster: finalPoster,
                backdrop: finalPoster,
                year: finalYear,
                rating: finalRating,
                quality: matchedAPhim ? matchedAPhim.quality : 'Full HD',
                categories: matchedAPhim ? matchedAPhim.categories : ['Review', 'Tóm Tắt Phim', 'Phim Hot'],
                author: v.author || 'APhim Review',
                views: Math.floor(Math.random() * 50000) + 12000,
                likes: Math.floor(Math.random() * 30000) + 5000,
                comments_count: Math.floor(Math.random() * 200) + 20,
                duration: v.duration || null,
                caption: `Video tóm tắt & review chi tiết bộ phim ${finalTitle}${finalOrigin ? ` (${finalOrigin})` : ''}.`
            }, 'review'));
        }

        return results;
    } catch (err) {
        console.warn(`⚠️ [Reels Auto-YT] Lỗi tìm YouTube cho [${movieTitle}]:`, err.message);
        return [];
    }
}

/**
 * Chuẩn hóa và xóa dấu tiếng Việt để so khớp siêu tốc (Accent-Insensitive Recognition)
 */
function removeVietnameseTones(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim();
}

/**
 * Tìm kiếm tổng hợp phim Reel / Review theo từ khóa, thể loại, quốc gia hoặc danh mục
 */
async function searchMovieReels(keyword, tab = 'review') {
    if (!keyword) return [];
    const cleanKey = keyword.trim().toLowerCase();
    const normKey = removeVietnameseTones(keyword);

    // 1. Kiểm tra xem có phải là chủ đề Khám Phá, Thể Loại, hay Quốc Gia không (Hành Động, Hàn Quốc, Phim Bộ, v.v.)
    const cleanPrefix = cleanKey.replace(/^(the-loai|quoc-gia|danh-sach|filter|genre|country)\//, '');
    const topicInfo = EXPLORE_MAP[cleanKey] || EXPLORE_MAP[normKey] || EXPLORE_MAP[cleanPrefix];
    
    if (topicInfo) {
        const topicItems = await fetchTopicReels(topicInfo, tab);
        if (topicItems && topicItems.length > 0) {
            return topicItems;
        }
    }

    // 2. Tìm kiếm trong Seed Curated & In-Memory Cache (0ms Instant Recognition)
    const baseSeed = tab === 'reel' 
        ? (CURATED_REELS && CURATED_REELS.length ? CURATED_REELS : INITIAL_CURATED_REELS) 
        : (CURATED_REVIEWS && CURATED_REVIEWS.length ? CURATED_REVIEWS : INITIAL_CURATED_REVIEWS);
    const localMatches = baseSeed.filter(item => {
        const titleNorm = removeVietnameseTones(item.title);
        const origNorm = removeVietnameseTones(item.origin_title);
        const slugNorm = removeVietnameseTones(item.slug || '');
        return titleNorm.includes(normKey) || origNorm.includes(normKey) || slugNorm.includes(normKey);
    });

    if (localMatches.length > 0) {
        const formatted = localMatches.map(item => formatReelItem(item, tab));
        if (formatted.length >= 3) {
            return formatted;
        }
    }

    // 3. Tìm kiếm trong GuPhimz theo từ khóa (có hỗ trợ không dấu)
    try {
        const guphimItems = await crawlPartnerReels(tab, null);
        const filtered = guphimItems.filter(item => {
            const titleNorm = removeVietnameseTones(item.title);
            const origNorm = removeVietnameseTones(item.origin_title);
            const slugNorm = removeVietnameseTones(item.slug || '');
            return titleNorm.includes(normKey) || origNorm.includes(normKey) || slugNorm.includes(normKey);
        });
        if (filtered.length >= 2) {
            return filtered.map(item => formatReelItem(item, tab));
        }
    } catch (e) {}

    // 4. Khớp nối APhim + Tìm YouTube Review
    const matched = await matchMovieWithAPhim(keyword);
    const targetTitle = matched ? matched.name : keyword;
    const targetSlug = matched ? matched.slug : keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const ytResults = await searchYouTubeMovieReviews(targetTitle, targetSlug);
    if (ytResults && ytResults.length > 0) {
        return ytResults;
    }

    // Fallback: trả về local matches nếu có
    if (localMatches.length > 0) {
        return localMatches.map(item => formatReelItem(item, tab));
    }

    return [];
}

/**
 * Chuẩn hóa cấu trúc Reel item cho View và Client API
 */
function formatReelItem(item, tab = 'review') {
    const rawName = item.movieTitle || item.title || item.name || 'Phim Hay Hot';
    const rawOrigin = item.origin_title || item.originTitle || item.origin_name || item.movieTitleVn || '';
    const rawCaption = item.caption || item.description || '';
    const rawYear = item.year || '2026';

    const cleanMeta = extractCleanMovieMeta(rawName, rawOrigin, rawCaption, rawYear);
    const movieTitle = cleanMeta.movieTitle;
    const originTitle = cleanMeta.originTitle;
    const slug = item.slug || movieTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const rawLikes = typeof item.likes === 'number' ? item.likes : (parseInt(item.likes, 10) || Math.floor(Math.random() * 40000) + 5000);
    const formattedLikes = rawLikes >= 1000 ? `${(rawLikes / 1000).toFixed(1)}K` : rawLikes.toString();
    const rawComments = item.comments_count || item.comments || Math.floor(Math.random() * 300) + 25;
    const formattedComments = typeof rawComments === 'number' && rawComments >= 1000 ? `${(rawComments / 1000).toFixed(1)}K` : rawComments.toString();
    const rawShares = item.shares || Math.floor(rawLikes * 0.08) + 12;
    const formattedShares = typeof rawShares === 'number' && rawShares >= 1000 ? `${(rawShares / 1000).toFixed(1)}K` : rawShares.toString();

    let rawRating = item.rating || '4.9';
    let rating5 = parseFloat(rawRating) > 5 ? (parseFloat(rawRating) / 2).toFixed(1) : parseFloat(rawRating).toFixed(1);
    let rating10 = parseFloat(rawRating) <= 5 ? (parseFloat(rawRating) * 2).toFixed(1) : parseFloat(rawRating).toFixed(1);
    
    let posterUrl = item.poster || `https://i.ytimg.com/vi/${item.yt}/mqdefault.jpg`;
    if (posterUrl && !posterUrl.startsWith('http')) {
        posterUrl = `https://phimimg.com/${posterUrl.replace(/^\//, '')}`;
    }

    let rawDuration = item.duration || item.lengthText || '';
    if (!rawDuration && tab === 'reel') rawDuration = '00:55';
    if (!rawDuration && tab === 'review') rawDuration = '15:20';

    // Tạo durationBadge tiếng Việt thông minh cho chip hiển thị
    let durationBadge = 'TÓM TẮT';
    if (rawDuration) {
        const parts = String(rawDuration).trim().split(':').map(p => parseInt(p, 10) || 0);
        if (parts.length === 3) {
            const [h, m, s] = parts;
            durationBadge = h > 0 ? `${h} GIỜ ${m > 0 ? m + 'P' : ''}`.trim() : `${m} PHÚT`;
        } else if (parts.length === 2) {
            const [m, s] = parts;
            durationBadge = m >= 60 ? `${Math.floor(m / 60)} GIỜ ${m % 60 > 0 ? (m % 60) + 'P' : ''}`.trim() : `${m} PHÚT`;
        }
    }

    return {
        id: item.id || `reel_${item.yt}`,
        yt: item.yt,
        movieTitle: movieTitle,
        movieTitleVn: movieTitle,
        originTitle: originTitle,
        title: movieTitle,
        description: cleanMeta.description,
        slug: slug,
        watchUrl: `/xem-phim/${slug}/tap-1`,
        detailUrl: `/phim/${slug}`,
        poster: posterUrl,
        backdrop: item.backdrop || posterUrl,
        year: cleanMeta.year,
        quality: item.quality || 'Full HD',
        rating: rating5,
        rating10: rating10,
        categories: item.categories || ['Review', 'Tóm Tắt Phim', 'Phim Hot'],
        author: item.author || (tab === 'reel' ? 'APhim Short' : 'APhim Review'),
        likes: formattedLikes,
        comments: formattedComments,
        shares: formattedShares,
        views: item.views || 25000,
        duration: rawDuration,
        durationBadge: durationBadge,
        aspect: item.aspect || (tab === 'reel' ? '9:16' : '16:9')
    };
}

/**
 * Trích xuất các chủ đề/thể loại từ siêu dữ liệu của Reel item
 */
function extractReelTopics(item) {
    const topics = new Set();
    const text = [
        item.movieTitle || '',
        item.title || '',
        item.origin_title || '',
        item.caption || '',
        item.description || '',
        Array.isArray(item.categories) ? item.categories.join(' ') : (item.categories || '')
    ].join(' ').toLowerCase();

    const textNorm = removeVietnameseTones(text);

    // 1. Kiểm tra trực tiếp các chuyên mục đã gắn
    if (Array.isArray(item.categories)) {
        item.categories.forEach(c => {
            if (typeof c === 'string') {
                const cNorm = removeVietnameseTones(c.toLowerCase().trim());
                if (GENRE_MAP[cNorm]) topics.add(GENRE_MAP[cNorm]);
            }
        });
    }

    // 2. Nhận diện ngữ cảnh và từ khóa đặc trưng (Keyword Pattern Recognition)
    if (textNorm.includes('han quoc') || textNorm.includes('korean') || textNorm.includes('k-drama') || textNorm.includes('kdrama') || textNorm.includes('oppa') || textNorm.includes('seoul')) {
        topics.add('han-quoc');
    }
    if (textNorm.includes('hanh dong') || textNorm.includes('action') || textNorm.includes('sat thu') || textNorm.includes('dac nhiem') || textNorm.includes('vo thuat') || textNorm.includes('chien tranh')) {
        topics.add('hanh-dong');
    }
    if (textNorm.includes('kinh di') || textNorm.includes('horror') || textNorm.includes('ma quy') || textNorm.includes('rung ron') || textNorm.includes('sat nhan') || textNorm.includes('am anh')) {
        topics.add('kinh-di');
    }
    if (textNorm.includes('co trang') || textNorm.includes('cung dau') || textNorm.includes('kiem hiep') || textNorm.includes('tien hiep') || textNorm.includes('hoang de') || textNorm.includes('vuong phi')) {
        topics.add('co-trang');
    }
    if (textNorm.includes('tinh cam') || textNorm.includes('lang man') || textNorm.includes('romance') || textNorm.includes('ngon tinh') || textNorm.includes('tinh yeu') || textNorm.includes('yeu duong') || textNorm.includes('chia tay')) {
        topics.add('tinh-cam');
    }
    if (textNorm.includes('hoat hinh') || textNorm.includes('anime') || textNorm.includes('manga') || textNorm.includes('dau la') || textNorm.includes('one piece') || textNorm.includes('naruto') || textNorm.includes('hoat hoa')) {
        topics.add('hoat-hinh');
    }
    if (textNorm.includes('vien tuong') || textNorm.includes('sci-fi') || textNorm.includes('vu tru') || textNorm.includes('star wars') || textNorm.includes('robot') || textNorm.includes('sieu anh hung') || textNorm.includes('marvel')) {
        topics.add('vien-tuong');
    }
    if (textNorm.includes('hai huoc') || textNorm.includes('comedy') || textNorm.includes('cuoi') || textNorm.includes('hai kich') || textNorm.includes('cham biem')) {
        topics.add('hai-huoc');
    }
    if (textNorm.includes('hinh su') || textNorm.includes('pha an') || textNorm.includes('tham tu') || textNorm.includes('toi pham') || textNorm.includes('canh sat') || textNorm.includes('dieu tra')) {
        topics.add('hinh-su');
    }
    if (textNorm.includes('chieu rap') || textNorm.includes('bom tan') || textNorm.includes('cinema') || textNorm.includes('box office')) {
        topics.add('phim-chieu-rap');
    }

    if (topics.size === 0) {
        topics.add('phim-hot');
    }

    return Array.from(topics);
}

/**
 * Phân tích danh sách sở thích từ client
 */
function parseUserInterests(raw) {
    if (!raw) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{')) {
            try {
                return JSON.parse(trimmed);
            } catch (e) {}
        }
        const result = {};
        const parts = trimmed.split(',');
        parts.forEach((p, idx) => {
            const [g, w] = p.split(':');
            const genre = (g || '').trim().toLowerCase();
            if (genre) {
                const weight = w ? parseFloat(w) : Math.max(1, 15 - idx * 3);
                result[genre] = isNaN(weight) ? 5 : weight;
            }
        });
        return result;
    }
    return {};
}

/**
 * Phân tích danh sách video đã xem từ client
 */
function parseWatchedList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('[')) {
            try {
                return JSON.parse(trimmed);
            } catch (e) {}
        }
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

/**
 * 🎯 Thuật toán đề xuất thông minh phong cách TikTok FYP (For You Page)
 * Dựa trên trọng số sở thích chủ đề của người dùng, video đã xem, chất lượng nội dung và khám phá mới.
 */
function rankReelsForPersonalizedFeed(items, userInterests = {}, watchedList = [], tab = 'reel') {
    if (!items || items.length === 0) return [];
    
    const watchedSet = new Set(
        Array.isArray(watchedList) ? watchedList.map(w => String(w).toLowerCase()) : []
    );

    const interestMap = {};
    if (typeof userInterests === 'object' && userInterests !== null) {
        for (const [key, val] of Object.entries(userInterests)) {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
                interestMap[key.toLowerCase()] = num;
            }
        }
    }

    const hasInterests = Object.keys(interestMap).length > 0;

    // Chấm điểm từng Reel
    const scoredItems = items.map(item => {
        const topics = extractReelTopics(item);
        let affinityScore = 0;

        if (hasInterests) {
            topics.forEach(t => {
                if (interestMap[t]) {
                    affinityScore += interestMap[t] * 3.5;
                }
            });
        }

        // Điểm đánh giá & tương tác chất lượng (Quality & Engagement Signal)
        const rating = parseFloat(item.rating) || 4.5;
        const views = typeof item.views === 'number' ? item.views : 20000;
        const qualityScore = (rating * 2) + (Math.log10(views + 10) * 1.5);

        // Điểm khám phá ngẫu nhiên (Serendipity Jitter) để luôn tạo sự tươi mới
        const noveltyScore = Math.random() * 4;

        // Phạt video đã xem gần đây (Suppression Penalty)
        let watchedPenalty = 0;
        if (item.yt && watchedSet.has(item.yt.toLowerCase())) watchedPenalty += 80;
        if (item.slug && watchedSet.has(item.slug.toLowerCase())) watchedPenalty += 60;
        if (item.id && watchedSet.has(item.id.toLowerCase())) watchedPenalty += 80;

        const totalScore = (affinityScore * 2.5) + qualityScore + noveltyScore - watchedPenalty;

        return {
            item,
            topics,
            affinityScore,
            totalScore
        };
    });

    // Nếu người dùng có lịch sử quan tâm: Áp dụng quy tắc phối trộn TikTok (60% Sở thích - 20% Trending - 20% Khám phá mới)
    if (hasInterests) {
        // Nhóm A: Match cao với sở thích của User (Affinity > 0)
        const matchedItems = scoredItems
            .filter(si => si.affinityScore > 0 && si.totalScore > 0)
            .sort((a, b) => b.totalScore - a.totalScore)
            .map(si => si.item);

        // Nhóm B: Trending / Đánh giá cao nhất
        const trendingItems = scoredItems
            .filter(si => !matchedItems.includes(si.item))
            .sort((a, b) => (parseFloat(b.item.rating) || 0) - (parseFloat(a.item.rating) || 0))
            .map(si => si.item);

        // Nhóm C: Khám phá mới ngẫu nhiên
        const exploreItems = shuffleReelsArray(
            scoredItems.filter(si => !matchedItems.includes(si.item) && !trendingItems.includes(si.item)).map(si => si.item)
        );

        // Phối trộn xen kẽ: 3 Sở thích -> 1 Thịnh hành -> 1 Khám phá mới
        const blended = [];
        let mIdx = 0, tIdx = 0, eIdx = 0;

        while (mIdx < matchedItems.length || tIdx < trendingItems.length || eIdx < exploreItems.length) {
            // Lấy 2-3 video theo sở thích
            for (let i = 0; i < 3 && mIdx < matchedItems.length; i++) {
                blended.push(matchedItems[mIdx++]);
            }
            // Lấy 1 video thịnh hành
            if (tIdx < trendingItems.length) {
                blended.push(trendingItems[tIdx++]);
            }
            // Lấy 1 video khám phá mới
            if (eIdx < exploreItems.length) {
                blended.push(exploreItems[eIdx++]);
            }

            // Nếu đã hết video sở thích, đổ tiếp trending & explore
            if (mIdx >= matchedItems.length && (tIdx < trendingItems.length || eIdx < exploreItems.length)) {
                if (tIdx < trendingItems.length) blended.push(trendingItems[tIdx++]);
                if (eIdx < exploreItems.length) blended.push(exploreItems[eIdx++]);
            }
        }

        // Lọc trùng lặp video theo YouTube ID
        const finalMap = new Map();
        blended.forEach(it => {
            if (it && it.yt && !finalMap.has(it.yt)) {
                finalMap.set(it.yt, it);
            }
        });

        return Array.from(finalMap.values());
    }

    // Trường hợp Cold Start (Người dùng mới chưa có lịch sử): Sắp xếp theo chất lượng và điểm tổng
    const sorted = scoredItems.sort((a, b) => b.totalScore - a.totalScore).map(si => si.item);
    return sorted;
}

/**
 * Hàm xáo trộn mảng ngẫu nhiên (Fisher-Yates Shuffle) cho luồng đề xuất TikTok
 */
function shuffleReelsArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Lấy danh sách Reels theo Tab kèm thuật toán đề xuất thông minh cá nhân hóa và CHỐNG TRÙNG LẶP TUYỆT ĐỐI
 */
async function getReelsFeed({ tab = 'review', page = 1, limit = 15, genre = null, shuffle = false, interests = null, watched = null } = {}) {
    const normalizedTab = (tab === 'for-you' || tab === 'reel') ? 'reel' : 'review';
    const parsedInterests = parseUserInterests(interests);
    const parsedWatched = parseWatchedList(watched);

    // Nếu có lọc theo thể loại hoặc chủ đề cụ thể
    if (genre) {
        const topicItems = await searchMovieReels(genre, normalizedTab);
        if (topicItems && topicItems.length > 0) {
            const start = (page - 1) * limit;
            const paginated = topicItems.slice(start, start + limit).map(item => formatReelItem(item, normalizedTab));
            return {
                tab: normalizedTab,
                page,
                total: topicItems.length,
                hasMore: start + limit < topicItems.length,
                items: paginated,
                topInterests: [genre]
            };
        }
    }

    const cache = reelsMemoryCache[normalizedTab];
    let allItems = [];

    // ⚡ PHẢN HỒI SIÊU TỐC 0ms: Luôn ưu tiên dữ liệu bộ nhớ đệm RAM đã nạp sẵn
    if (cache.items && cache.items.length > 0) {
        allItems = cache.items;
        // Nếu cache đã quá hạn, trigger crawl ngầm không chờ (non-blocking)
        if (Date.now() - cache.lastFetched > CACHE_TTL) {
            triggerBackgroundReelsRefresh(normalizedTab).catch(() => {});
        }
    } else {
        const baseSeed = normalizedTab === 'reel' 
            ? (CURATED_REELS && CURATED_REELS.length ? CURATED_REELS : INITIAL_CURATED_REELS) 
            : (CURATED_REVIEWS && CURATED_REVIEWS.length ? CURATED_REVIEWS : INITIAL_CURATED_REVIEWS);
        allItems = [...baseSeed];
        cache.items = allItems;
        cache.lastFetched = Date.now();
        triggerBackgroundReelsRefresh(normalizedTab).catch(() => {});
    }

    const start = (page - 1) * limit;

    // 🚀 LIVE STREAMING DISCOVERY & TOPIC PRE-FETCH (CHẠY NGẦM HOÀN TOÀN - NON-BLOCKING):
    if (start + limit > allItems.length || page > 1 || Object.keys(parsedInterests).length > 0) {
        setImmediate(async () => {
            try {
                const topInterestsSorted = Object.entries(parsedInterests).sort((a, b) => b[1] - a[1]);
                const topGenreSlug = topInterestsSorted.length > 0 ? topInterestsSorted[0][0] : null;

                const targetPage = Math.max(1, page % 10 + 1);
                let apiUrl = `https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${targetPage}`;
                if (topGenreSlug && GENRE_MAP[topGenreSlug]) {
                    apiUrl = `https://phimapi.com/v1/api/the-loai/${GENRE_MAP[topGenreSlug]}?page=${targetPage}`;
                }

                const newMoviesRes = await axios.get(apiUrl, { timeout: 4000 });
                const newMovies = newMoviesRes.data?.data?.items || newMoviesRes.data?.items || [];
                
                let updated = false;
                for (const m of newMovies.slice(0, 6)) {
                    const existing = allItems.find(i => i.slug === m.slug);
                    if (!existing && m.name) {
                        const ytVideos = await searchYouTubeMovieReviews(m.name, m.slug);
                        if (ytVideos && ytVideos.length > 0) {
                            for (const ytv of ytVideos) {
                                if (!allItems.some(i => i.yt === ytv.yt)) {
                                    allItems.push(ytv);
                                    updated = true;
                                }
                            }
                        }
                    }
                }
                if (updated) {
                    reelsMemoryCache[normalizedTab].items = allItems;
                }
            } catch (crawlErr) {
                // Im lặng nếu network timeout
            }
        });
    }

    // 🎯 TIKTOK FOR-YOU RECOMMENDATION ENGINE:
    let feedPool = rankReelsForPersonalizedFeed(allItems, parsedInterests, parsedWatched, normalizedTab);

    // 🛡️ CHỐNG LẶP TUYỆT ĐỐI (Strict Zero-Duplicate Streaming):
    // Nếu client gửi danh sách đã xem/đã render (parsedWatched), loại bỏ hoàn toàn các video đó khỏi kết quả
    let paginated = [];

    if (parsedWatched.length > 0) {
        const watchedSet = new Set(parsedWatched.map(w => String(w).toLowerCase()));
        const unseenItems = feedPool.filter(it => it && it.yt && !watchedSet.has(it.yt.toLowerCase()) && !watchedSet.has((it.slug || '').toLowerCase()));

        if (unseenItems.length >= limit) {
            paginated = unseenItems.slice(0, limit).map(item => formatReelItem(item, normalizedTab));
        } else if (unseenItems.length > 0) {
            // Lấy hết unseen items còn lại + bổ sung thêm từ pool để đủ số lượng limit
            const needed = limit - unseenItems.length;
            const recentSet = new Set(parsedWatched.slice(0, 20).map(w => String(w).toLowerCase()));
            const fillerPool = feedPool.filter(it => it && it.yt && !recentSet.has(it.yt.toLowerCase()) && !unseenItems.some(u => u.yt === it.yt));
            const combined = [...unseenItems, ...fillerPool.slice(0, needed)];
            paginated = combined.map(item => formatReelItem(item, normalizedTab));
        } else {
            // Khi người dùng đã xem trọn bộ: tuần hoàn từ video cũ nhất nhưng trừ 20 video mới xem gần nhất
            const recentSet = new Set(parsedWatched.slice(0, 20).map(w => String(w).toLowerCase()));
            const fallbackPool = feedPool.filter(it => it && it.yt && !recentSet.has(it.yt.toLowerCase()));
            const source = fallbackPool.length >= limit ? fallbackPool : feedPool;
            paginated = shuffleReelsArray(source).slice(0, limit).map(item => formatReelItem(item, normalizedTab));
        }
    } else {
        const rawPaginated = feedPool.slice(start, start + limit);
        if (rawPaginated.length < limit && feedPool.length > 0) {
            // Nếu đã vượt start, tuần hoàn thông minh
            paginated = shuffleReelsArray(feedPool).slice(0, limit).map(item => formatReelItem(item, normalizedTab));
        } else {
            paginated = rawPaginated.map(item => formatReelItem(item, normalizedTab));
        }
    }

    return {
        tab: normalizedTab,
        page,
        total: allItems.length,
        hasMore: true, // ⚡ Luôn luôn true cho dòng chảy vô tận phong cách TikTok FYP
        items: paginated,
        topInterests: Object.keys(parsedInterests)
    };
}

module.exports = {
    getReelsFeed,
    searchYouTubeMovieReviews,
    searchMovieReels,
    crawlPartnerReels,
    matchMovieWithAPhim,
    formatReelItem,
    removeVietnameseTones,
    INITIAL_CURATED_REVIEWS: (CURATED_REVIEWS && CURATED_REVIEWS.length ? CURATED_REVIEWS : INITIAL_CURATED_REVIEWS),
    INITIAL_CURATED_REELS: (CURATED_REELS && CURATED_REELS.length ? CURATED_REELS : INITIAL_CURATED_REELS),
    CURATED_REVIEWS,
    CURATED_REELS
};
