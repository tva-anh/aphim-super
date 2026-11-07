const fs = require('fs');
const path = require('path');

const PINNED_METADATA = [
  {
    slug: 'viec-ma-luong-quai',
    name: 'Việc Ma, Lương Quái',
    origin_name: 'Dead-End Job',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/yyA9CI8BLNg6LtVRvmVxki4xiGb.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/gWedDgBsZkuOho2qe3q2sTQmbpO.jpg',
    episode_current: 'Hoàn Tất (8/8)',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:8', 'SN', 'TM:8'],
    source: 'homepage'
  },
  {
    slug: 'bac-si-x-mafia-ao-trang',
    name: 'Bác Sĩ X: Mafia Áo Trắng',
    origin_name: 'Doctor X: Mafia in White',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/original/a5kWnqgoTOWrv2xZoruQgTSbGgA.jpg',
    thumb_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/4aad347312854fd3bd98be6ee3d1826b',
    episode_current: 'Tập 8',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:8', 'SN:4', 'TM:8'],
    source: 'homepage'
  },
  {
    slug: '100-ngay-doi-tra',
    name: '100 Ngày Lừa Dối',
    origin_name: '100 Days of Deception',
    type: 'series',
    poster_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/486ede16393348299d83fa75f5f6e72f',
    thumb_url: 'https://image.tmdb.org/t/p/original/3SvKCITqMtjgPIhFBjRc4yTAc4H.jpg',
    episode_current: 'Tập 8',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:8', 'SN:8', 'TM:8'],
    source: 'homepage'
  },
  {
    slug: 'buoc-vao-tim-em',
    name: 'Bước Vào Tim Em',
    origin_name: 'Dive Into You (2026)',
    type: 'series',
    poster_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/e2f2c9d8d1af4d8498633069f2934c1c',
    thumb_url: 'https://image.tmdb.org/t/p/original/tbQdHooAyZia9aasC8NhBTK8BoC.jpg',
    episode_current: 'Tập 12',
    lang: 'Vietsub',
    available_languages: ['PD:12', 'SN'],
    source: 'homepage'
  },
  {
    slug: 'giua-nhung-buoc-chan',
    name: 'Giữa Những Bước Chân',
    origin_name: 'Between Steps',
    type: 'series',
    poster_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/777934e847254dfb89c092715a19c391',
    thumb_url: 'https://image.tmdb.org/t/p/original/mA4ClzkBvBCiTHQ8zHFsuWRaLW2.jpg',
    episode_current: 'Tập 10',
    lang: 'Vietsub',
    available_languages: ['PD:10', 'SN'],
    source: 'homepage'
  },
  {
    slug: 'nap-day-trai-tim',
    name: 'Nạp Đầy Trái Tim',
    origin_name: 'Take Charge Of My Heart',
    type: 'series',
    poster_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/901b92afd64b496caecd3f0f4ee645a5',
    thumb_url: 'https://image.tmdb.org/t/p/original/3fCBU4IT091cSPiJTdu60FONeb2.jpg',
    episode_current: 'Hoàn Tất (10/10)',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:10', 'SN:10', 'TM:10'],
    source: 'homepage'
  },
  {
    slug: 'keo-ngot-tinh-yeu',
    name: 'Kẹo ngọt tình yêu',
    origin_name: 'Our Sticky Love',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/eiFUSgFwmgjZbtJAsbZDrQlK4m1.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/oUOytQ13F1vVKXK8cYCYB5Pt5ez.jpg',
    episode_current: 'Hoàn Tất (12/12)',
    lang: 'Vietsub + Lồng Tiếng',
    available_languages: ['PD:12', 'SN:12', 'LT:12'],
    source: 'homepage'
  },
  {
    slug: 'tai-phiet-va-canh-sat-phan-2',
    name: 'Tài Phiệt Và Cảnh Sát (Phần 2)',
    origin_name: 'Flex X Cop 2',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/tNqYz2z3rRxNseKcMize9SAp3wS.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/nOGPxfYqd0f3oeFGGinpDOP68MQ.jpg',
    episode_current: 'Tập 14',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:14', 'SN:14', 'TM:14'],
    source: 'homepage'
  },
  {
    slug: 'sep-chinh-la-than-tuong',
    name: 'Sếp Chính Là Thần Tượng',
    origin_name: 'My Bias, My Boss',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/ulZRwSHpR48veyusMs98OitwVID.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/eBD46F44qKGPZiRLffO4q3JF8Hc.jpg',
    episode_current: 'Tập 12',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:12', 'SN:12', 'TM:12'],
    source: 'homepage'
  },
  {
    slug: 'trung-so-doc-dac-van-phai-di-lam',
    name: 'Trúng Số Độc Đắc Vẫn Phải Đi Làm',
    origin_name: 'The Ordinary Jackpot',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/original/3jLoiPorNssIfLlEuw8Om7ujca6.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/oxJIuxIWiBEcIBRDdu48vTwQcJZ.jpg',
    episode_current: 'Tập 10',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:10', 'SN:10', 'TM:10'],
    source: 'homepage'
  },
  {
    slug: 'ga-kim-thoa',
    name: 'Gả Kim Thoa',
    origin_name: 'Where the Mask Ends',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/ozczlsMlKUhzB11ygTj4QVEGS7v.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/gAJV0W0RgpxxYJpaE8Hraa3Ohpp.jpg',
    episode_current: 'Tập 30',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:27', 'SN:18', 'TM:27'],
    source: 'homepage'
  },
  {
    slug: 'thuong-cong-chua',
    name: 'Thượng Công Chúa',
    origin_name: 'Tigers Sniff the Rose',
    type: 'series',
    poster_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/03f3900987754a5fb545f79817717eea',
    thumb_url: 'https://image.tmdb.org/t/p/original/ccG6WAuf2XBC808HFaeIjvk2hXW.jpg',
    episode_current: 'Tập 25',
    lang: 'Vietsub + Thuyết Minh + Lồng Tiếng',
    available_languages: ['PD:25', 'SN:25', 'TM:25', 'LT:25'],
    source: 'homepage'
  },
  {
    slug: 'mi-anh-than-bo',
    name: 'Mị Ảnh Thần Bộ',
    origin_name: 'Shadow Punisher (2026)',
    type: 'series',
    poster_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/97d0ae28d45a41ab808b23a55dc63fc2',
    thumb_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/7ed965b8278c41e0ac5594f27923ae48',
    episode_current: 'Tập 30',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:30', 'SN:30', 'TM:30'],
    source: 'homepage'
  },
  {
    slug: 'ban-gai-thien-tai',
    name: 'Bạn Gái Thiên Tài',
    origin_name: 'Genius Girlfriend',
    type: 'series',
    poster_url: 'https://sf-static.upanhlaylink.com/img/image_20260802a58bf6f5c1c487bd8794cd21cc18ad92.jpg',
    thumb_url: 'https://sf-static.upanhlaylink.com/img/image_202608064d22654a2f354875aea1dbdd1e8a553e.jpg',
    episode_current: 'Hoàn Tất (28/28)',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:28', 'SN:28', 'TM:28'],
    source: 'homepage'
  },
  {
    slug: 'khong-the-thay-the-2026',
    name: 'Không Thể Thay Thế (2026)',
    origin_name: 'Irreplaceable (2026)',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/ugdQvfUB7RBw1tPCEjwxaADWYpO.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/rNFBrko4F5RQ5E9YktBRXVqwzjl.jpg',
    episode_current: 'Tập 20',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:20', 'SN:20', 'TM:20'],
    source: 'homepage'
  },
  {
    slug: 'tieu-thanh-luong-phuong',
    name: 'Tiểu Thành Lương Phương',
    origin_name: 'Small Town Remedy',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/original/yXlDXC1dPDoVAGWOk0Pb25zggqE.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/nhQKKALP3SOi1Ft5MZU6KU05VcY.jpg',
    episode_current: 'Tập 28',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:28', 'SN:28', 'TM:28'],
    source: 'homepage'
  },
  {
    slug: 'ngu-dinh-dao',
    name: 'Ngự Đình Dao',
    origin_name: 'Royal Betrothal',
    type: 'series',
    poster_url: 'https://sf-static.upanhlaylink.com/img/image_202607306add23058e960f1669bc11f83f4bef01.jpg',
    thumb_url: 'https://sf-static.upanhlaylink.com/img/image_20260730646f0998c3e2224809cb167c5f7ff0a9.jpg',
    episode_current: 'Hoàn Tất (32/32)',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:32', 'SN:32', 'TM:32'],
    source: 'homepage'
  },
  {
    slug: 'vision-truy-tim-ban-nga',
    name: 'Vision: Truy Tìm Bản Ngã',
    origin_name: 'Vision Quest',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/WGyAyBPncfuu8MZhLY9RtfZPM0.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/uoXXbN2PrOxH6UKyP7kYwmGpAAP.jpg',
    episode_current: 'Tập 7',
    lang: 'Vietsub',
    available_languages: ['PD:7', 'SN:7'],
    source: 'homepage'
  },
  {
    slug: 'vung-dat-quy-du-2026',
    name: 'Vùng Đất Quỷ Dữ (2026)',
    origin_name: 'Resident Evil (2026)',
    type: 'single',
    poster_url: 'https://p16-lp-sg.ibyteimg.com/origin/tos-alisg-i-375lmtcpo0-sg/7e9888c9ef564dfc8ea72c653bc582d8',
    thumb_url: 'https://image.tmdb.org/t/p/original/3icyRAqgakNcQn6aDVz9libFmBA.jpg',
    episode_current: 'Hoàn Tất (1/1)',
    lang: 'Vietsub',
    available_languages: ['PD:Full', 'SN'],
    source: 'homepage'
  },
  {
    slug: 'quy-quyet-ranh-gioi-vo-dinh',
    name: 'Quỷ Quyệt: Ranh Giới Vô Định',
    origin_name: 'Insidious: Out of the Further',
    type: 'single',
    poster_url: 'https://image.tmdb.org/t/p/w500/u1ZyMm7HcYO1CJwtk28dStDH9Bp.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/w2xDGa1252imRPgCbiY48AbkRBn.jpg',
    episode_current: 'Tập 1',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:1', 'SN:1', 'TM:1'],
    source: 'homepage'
  },
  {
    slug: 'carrie-2026',
    name: 'Carrie (2026)',
    origin_name: 'Carrie (2026)',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/w500/eXjk4W4robXs7l1YXwaXMv4f2qb.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/9yCJtipMeDe8uAdSJKvw8BnYfRz.jpg',
    episode_current: 'Tập 8',
    lang: 'Vietsub',
    available_languages: ['PD:8', 'SN:8'],
    source: 'homepage'
  },
  {
    slug: 'tau-buon-nguoi-2026',
    name: 'Tàu Buôn Người (2026)',
    origin_name: 'Mutiny (2026)',
    type: 'single',
    poster_url: 'https://image.tmdb.org/t/p/original/wByA2U6EYAzXcwtlZawVPBy5Gtj.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/lTejmGdrRLS6IzdQakMbO1hVcbl.jpg',
    episode_current: 'Tập 1',
    lang: 'Vietsub',
    available_languages: ['PD:1', 'SN'],
    source: 'homepage'
  },
  {
    slug: 'tieng-yeu-nay-anh-dich-duoc-khong',
    name: 'Tiếng yêu này anh dịch được không?',
    origin_name: 'Can This Love Be Translated?',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/original/zgUh4cgalSzBjbsT5P0qmU7Rjzk.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/svnZYhAboLrwHEtkKRm2mIdjocB.jpg',
    episode_current: 'Hoàn tất (12/12)',
    lang: 'Vietsub + Lồng Tiếng',
    available_languages: ['PD:12', 'SN:12', 'LT:12'],
    source: 'homepage'
  },
  {
    slug: 'dac-vu-kim-tai-khoi-dong',
    name: 'Đặc Vụ Kim Tái Khởi Động',
    origin_name: 'Agent Kim Reactivated',
    type: 'series',
    poster_url: 'https://image.tmdb.org/t/p/original/mxa7YxVln3Rwnd2Va82PoclTznj.jpg',
    thumb_url: 'https://image.tmdb.org/t/p/original/g1LJLlmWP74zv9yXKEXm7g9p10O.jpg',
    episode_current: 'Hoàn tất (10/10)',
    lang: 'Vietsub + Thuyết Minh',
    available_languages: ['PD:10', 'SN:10', 'TM:10'],
    source: 'homepage'
  }
];

const catalogPath = path.join(__dirname, '../data/bilingual_catalog.json');
let catalog = [];
if (fs.existsSync(catalogPath)) {
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch(e) {}
}

const pinnedSlugs = new Set(PINNED_METADATA.map(m => m.slug));
const otherMovies = catalog.filter(m => !pinnedSlugs.has(m.slug));

const merged = [...PINNED_METADATA, ...otherMovies];

// Ensure all items have poster_url, thumb_url, episode_current, lang
merged.forEach(m => {
  if (!m.thumb_url) m.thumb_url = m.poster_url;
  if (!m.episode_current) m.episode_current = 'Full';
  if (!m.lang) m.lang = 'Vietsub + Thuyết Minh';
});

fs.writeFileSync(catalogPath, JSON.stringify(merged, null, 2), 'utf8');
console.log('Successfully wrote', merged.length, 'movies to', catalogPath);
console.log('Page 1 count:', PINNED_METADATA.length);
