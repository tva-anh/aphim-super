const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Dictionary for popular/featured dramas to have rich Vietnamese names & descriptions
const DRAMA_TRANSLATIONS = {
    '68211': {
        title: 'Thần Tiên Manh Bảo: Ba Ba Siêu Bất Lực',
        genre: 'Ngọt sủng · Manh bảo gia đình',
        intro: 'Bảo bối thần tiên nghịch ngợm giáng trần khiến cả gia đình tổng tài vừa khóc vừa cười, hàn gắn tình cảm cha mẹ.'
    },
    '68210': {
        title: 'Manh Bảo Hai Mặt: Ba Ba Mau Nhận Hàng',
        genre: 'Tổng tài & Hào môn · Cưới trước yêu sau',
        intro: 'Hai nhóc tì thông minh siêu quậy lên kế hoạch gài bẫy tổng tài nhận mẹ ruột, vạch trần âm mưu của tiểu tam.'
    },
    '68155': {
        title: 'Kim Bảo Kim Quy: Bắt Đầu Từ Tìm Mẹ',
        genre: 'Gia đình & Tình thân · Ngọt sủng',
        intro: 'Bảo bối mang phúc khí trời ban từng bước giúp mẹ lấy lại danh dự và hạnh phúc trọn vẹn.'
    },
    '68154': {
        title: 'Tứ Bảo Lai Tập: Ba Ba Quá Khó Chiều',
        genre: 'Tổng tài & Hào môn · Ngọt sủng',
        intro: 'Bốn thiên thần nhỏ đại náo tập đoàn Lục thị, ép ba tổng tài bá đạo ký giấy kết hôn rước mẹ về dinh.'
    },
    '68124': {
        title: 'Bốn Con Cưng Náo Loạn: Chồng Cũ Hóa Cuồng Chiều Con',
        genre: 'Báo thù & Vả mặt · Nghịch tập',
        intro: 'Sau khi ly hôn, bốn bảo bối dẫn mẹ trở về đỉnh cao danh vọng, chồng cũ hối hận quỳ cầu tha thứ.'
    },
    '68093': {
        title: 'Đứa Trẻ Đến Từ Tương Lai',
        genre: 'Huyền huyễn & Tiên hiệp · Đô thị',
        intro: 'Một nhóc tì mang công nghệ từ tương lai xuyên không về cứu vãn vận mệnh bi kịch của gia tộc.'
    },
    '65214': {
        title: 'Chồng Phá Gia, Tôi Xuất Thủ Lật Kèo',
        genre: 'Nghịch tập & Vươn lên · Đô thị',
        intro: 'Chồng ăn chơi sa đọa tán gia bại sản, nữ tổng tài ẩn danh chính thức lộ diện quét sạch giới tài phiệt.'
    },
    '65128': {
        title: 'Bảy Người Chị Cưng Chiều Tôi Hết Nấc',
        genre: 'Chiến thần & Đô thị · Hài hước',
        intro: 'Chàng trai bình dị bất ngờ được 7 người chị là nữ vương tài phiệt, minh tinh, thần y, sát thủ cưng chiều lên tận mây.'
    },
    '65114': {
        title: 'Bái Kiến Sư Phụ Đại Nhân',
        genre: 'Tu chân & Huyền huyễn',
        intro: 'Ẩn cư ngàn năm, sư tôn tái xuất giang hồ thu phục vạn tông môn quy phục dưới chân.'
    },
    '65088': {
        title: 'Chồng Thua Sạch Gia Sản, Tôi Xuất Thủ Thắng Đậm',
        genre: 'Báo thù & Vả mặt · Đô thị',
        intro: 'Gia đình rơi vào đường cùng vì nợ nần, phu nhân lộ thân phận thần bài cứu vãn giang sơn và trừng trị kẻ ác.'
    },
    '65064': {
        title: 'Cô Ấy Dùng Tu Tiên Tung Hoành Đô Thị',
        genre: 'Tu chân & Huyền huyễn · Đô thị',
        intro: 'Nữ tu tiên đại năng xuyên không về hiện đại, dùng thần thông quét sạch bọn ức hiếp, mở ra con đường vô địch.'
    },
    '64446': {
        title: 'Vị Đạo Gia Này Thật Không Đơn Giản',
        genre: 'Kinh dị & Bí ẩn · Huyền thuật',
        intro: 'Đạo sĩ trẻ tuổi xuống núi phá giải các vụ án kỳ bí, vạch mặt kẻ giả thần giả quỷ và trừng trị tà ác.'
    },
    '64361': {
        title: 'Thành Hà Thể Thống (Ra Cái Thể Thống Gì)',
        genre: 'Cổ trang & Cung đấu · Hài hước',
        intro: 'Hai người xuyên không vào triều đình phong kiến đối đầu kịch liệt giữa hoàng đế và sủng phi, biến hậu cung thành chiến trường hài hước.'
    },
    '64358': {
        title: 'Thềm Trước Lỡ Duyên Hải Đường',
        genre: 'Cổ trang & Cung đấu · Ngược luyến',
        intro: 'Mối tình day dứt chốn vương triều giữa nàng tiểu thư phong trần và vị tướng quân lạnh lùng.'
    },
    '64315': {
        title: 'Cụ Cố 18 Tuổi Giáng Lâm: Chấn Hưng Gia Tộc',
        genre: 'Nghịch tập & Vươn lên · Hài hước',
        intro: 'Cụ tổ 18 tuổi thức tỉnh trở về trừng trị đám con cháu bất hiếu, vực dậy gia tộc số một kinh thành.'
    },
    '64201': {
        title: 'Đại Đồ Đệ Triệt Giáo: Sư Huynh Vô Địch',
        genre: 'Tu chân & Huyền huyễn',
        intro: 'Đại sư huynh lười biếng chỉ cần nằm ngủ, đàn em thi nhau đột phá cảnh giới vô địch thiên hạ.'
    },
    '64145': {
        title: 'Tuyệt Thế Vương Gia: Quyền Khuynh Thiên Hạ',
        genre: 'Cổ trang & Cung đấu · Quyền mưu',
        intro: 'Vương gia giả ngu chịu nhục mười năm, một đêm khởi binh chấn động toàn thiên hạ, đoạt lại vương quyền.'
    },
    '63722': {
        title: 'Chích Ái Tù Tâm: Tình Nồng Khó Dứt',
        genre: 'Tổng tài & Hào môn · Ngọt sủng',
        intro: 'Tình yêu nồng cháy đan xen thù hận gia tộc giữa tổng tài bá đạo và thiên kim sa cơ lỡ vận.'
    },
    '63721': {
        title: 'Viên Kẹo Hết Hạn Của Cô Ấy',
        genre: 'Thanh xuân & Học đường · Chữa lành',
        intro: 'Câu chuyện tình yêu đầy cảm xúc về sự nuối tiếc thanh xuân và cơ hội thứ hai để tìm lại hạnh phúc.'
    },
    '63720': {
        title: 'Người Khiến Trái Tim Tôi Rung Động',
        genre: 'Ngọt sủng · Đô thị',
        intro: 'Gặp gỡ định mệnh nơi thành phố hoa lệ, biến hai kẻ xa lạ thành tri kỷ sắt son cả đời.'
    },
    '63719': {
        title: 'Hôn Hậu Rung Động: Cưới Trước Yêu Sau',
        genre: 'Ngọt sủng · Cưới trước yêu sau',
        intro: 'Bản hợp đồng hôn nhân giả tạo dần trở thành tình yêu chân chính không thể tách rời qua từng biến cố.'
    },
    '61533': {
        title: 'Hậu Chia Tay Tôi Được Ba Anh Trai Chiều Chuộng',
        genre: 'Báo thù & Vả mặt · Hào môn',
        intro: 'Bị bạn trai tồi tệ bỏ rơi, cô gái bất ngờ được 3 người anh tài phiệt đón về cưng chiều tận trời.'
    },
    '61532': {
        title: 'Bố Mẹ Quá Thiên Vị! Tôi Cắt Đứt Quan Hệ Lộ Thân Phận',
        genre: 'Nghịch tập & Vươn lên · Gia đình',
        intro: 'Chịu đủ bất công từ gia đình thiên vị em trai, người con gái quyết định dứt áo ra đi trở thành nữ tỷ phú.'
    }
};

// Common terms translation dictionary
const PHRASE_MAP = [
    [/爹地/g, 'Ba Ba'],
    [/妈咪/g, 'Mẹ Yêu'],
    [/萌宝/g, 'Manh Bảo'],
    [/神仙/g, 'Thần Tiên'],
    [/太难缠/g, 'Quá Khó Chiều'],
    [/请查收/g, 'Mau Nhận Hàng'],
    [/来自未来/g, 'Đến Từ Tương Lai'],
    [/宠妻/g, 'Chiều Vợ'],
    [/团宠/g, 'Cưng Chiều'],
    [/千金/g, 'Thiên Kim'],
    [/真假/g, 'Thật Giả'],
    [/战神/g, 'Chiến Thần'],
    [/归来/g, 'Trở Về'],
    [/重回/g, 'Trọng Sinh'],
    [/首富/g, 'Đại Phú Hào'],
    [/修仙/g, 'Tu Tiên'],
    [/无敌/g, 'Vô Địch'],
    [/王爷/g, 'Vương Gia'],
    [/绝世/g, 'Tuyệt Thế'],
    [/短剧/g, ''],
    [/第二季/g, ' Phần 2'],
    [/第三季/g, ' Phần 3'],
    [/第四季/g, ' Phần 4']
];

function translateTitle(id, name) {
    if (DRAMA_TRANSLATIONS[id]) return DRAMA_TRANSLATIONS[id].title;
    let t = name;
    for (const [re, rep] of PHRASE_MAP) {
        t = t.replace(re, rep);
    }
    return t.trim();
}

function getGenre(id, item) {
    if (DRAMA_TRANSLATIONS[id]) return DRAMA_TRANSLATIONS[id].genre;
    if (item.vod_class && item.vod_class.includes('古装')) return 'Cổ trang & Cung đấu';
    if (item.vod_class && item.vod_class.includes('爱情')) return 'Ngọt sủng, Cưới trước yêu sau';
    return 'Phim Ngắn Kịch Tính';
}

function getIntro(id, item) {
    if (DRAMA_TRANSLATIONS[id]) return DRAMA_TRANSLATIONS[id].intro;
    const clean = (item.vod_content || '').replace(/<[^>]+>/g, '').trim();
    if (clean && clean.length > 20) return clean;
    return `Bộ phim ngắn "${translateTitle(id, item.vod_name)}" đặc sắc với cốt truyện lôi cuốn, tình tiết hấp dẫn gay cấn từng tập.`;
}

module.exports = {
    DRAMA_TRANSLATIONS,
    translateTitle,
    getGenre,
    getIntro
};
