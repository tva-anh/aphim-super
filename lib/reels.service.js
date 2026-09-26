/**
 * lib/reels.service.js
 * 🚀 High-Performance Multi-Source Reels & Movie Review Engine for APhim Super
 * Aggregates curated reviews, short dramas, and automated YouTube movie summaries.
 */

const axios = require('axios');

const CACHE_TTL = 30 * 60 * 1000; // 30 phút cache
let reelsMemoryCache = {
    review: { items: [], lastFetched: 0 },
    reel: { items: [], lastFetched: 0 }
};

// Danh sách Review Phim khởi tạo chất lượng cao (Seed Curated Data)
const INITIAL_CURATED_REVIEWS = [
    {
        id: 'rev_khi_cuoc_doi_cho_ban_qua_quyt',
        yt: 'kngwPXyj9NU',
        title: 'Khi Cuộc Đời Cho Bạn Quả Quýt',
        origin_title: 'When Life Gives You Tangerines',
        slug: 'khi-cuoc-doi-cho-ban-qua-quyt',
        type: 'review',
        poster: 'https://phimimg.com/uploads/movies/20250715/khi-cuoc-doi-cho-ban-qua-quyt-poster.webp',
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
        poster: 'https://phimimg.com/uploads/movies/20260101/the-mandalorian-and-grogu-poster.webp',
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
        poster: 'https://phimimg.com/uploads/movies/20250610/theo-dong-nuoc-ngam-phan-2-poster.webp',
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
        poster: 'https://phimimg.com/uploads/movies/20240915/tham-tu-dai-tai-poster.webp',
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
        poster: 'https://phimimg.com/uploads/movies/20260312/con-ra-the-thong-gi-nua-poster.webp',
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
        poster: 'https://phimimg.com/uploads/movies/20260210/nguoi-bao-ve-poster.webp',
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
        poster: 'https://phimimg.com/uploads/movies/20260912/lan-huong-nhu-co-poster.webp',
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
        poster: 'https://phimimg.com/upload/vod/20240103-1/af2ae10bcb72617994f00dce440205dc.jpg',
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
        id: 'reel_bao_dong_mayday',
        yt: 'd889_HcNvd4',
        title: 'Báo Động Mayday',
        origin_title: 'Mayday Alert',
        slug: 'bao-dong-mayday',
        type: 'reel',
        poster: 'https://phimimg.com/uploads/movies/20260515/bao-dong-mayday-poster.webp',
        year: '2026',
        rating: '4.5',
        views: 28900,
        likes: 64200,
        comments_count: 142,
        caption: 'Khoảnh khắc sinh tử trên chuyến bay nghẹt thở.'
    },
    {
        id: 'reel_thieu_chu_chay_tron',
        yt: 'DKZ2F9niXiU',
        title: 'Thiếu Chủ Giỏi Chạy Trốn (Phần 2)',
        origin_title: 'The Elusive Samurai',
        slug: 'thieu-chu-gioi-chay-tron-phan-2',
        type: 'reel',
        poster: 'https://phimimg.com/uploads/movies/20260719/thieu-chu-gioi-chay-tron-phan-2-poster.webp',
        year: '2026',
        rating: '4.8',
        views: 39500,
        likes: 91400,
        comments_count: 310,
        caption: 'Kỹ năng chạy trốn đỉnh cao của vị thiếu chủ huyền thoại.'
    },
    {
        id: 'reel_one_piece_climax',
        yt: 'kxE0DCTni3o',
        title: 'One Piece (Đảo Hải Tặc)',
        origin_title: 'One Piece',
        slug: 'dao-hai-tac',
        type: 'reel',
        poster: 'https://phimimg.com/uploads/movies/20240101/one-piece-poster.webp',
        year: '2026',
        rating: '5.0',
        views: 310000,
        likes: 540000,
        comments_count: 3200,
        caption: 'Trận chiến đỉnh cao kích hoạt Gear 5 bùng nổ sức mạnh.'
    }
];

/**
 * Crawl các review mới nhất từ GuPhim và các nguồn đối tác
 */
async function crawlPartnerReels(tab = 'review') {
    try {
        const url = `https://guphimz.com/reels?tab=${tab}`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            timeout: 7000
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
            const rating = (attrStr.match(/data-qv-rating="([^"]+)"/)?.[1] || '4.8').trim();
            const rawViews = attrStr.match(/data-qv-views="([^"]+)"/)?.[1];

            if (yt) {
                // Làm sạch slug, loại bỏ đuôi hash ngẫu nhiên (ví dụ -13afd)
                const cleanSlug = rawSlug.replace(/-[a-f0-9]{4,10}$/i, '');
                const cleanPoster = poster.startsWith('http') ? poster : (poster.startsWith('/') ? `https://guphimz.com${poster}` : `https://phimimg.com/${poster}`);
                const views = rawViews ? parseInt(rawViews, 10) : (Math.floor(Math.random() * 40000) + 15000);

                items.push({
                    id: `reel_${tab}_${yt}_${index++}`,
                    yt,
                    title: name,
                    origin_title: originName,
                    slug: cleanSlug,
                    type: tab,
                    poster: cleanPoster,
                    year,
                    rating,
                    views,
                    likes: Math.floor(views * (0.6 + Math.random() * 0.8)),
                    comments_count: Math.floor(views * 0.015) + 12,
                    caption: `Review và trích đoạn hấp dẫn phim ${name} (${year}).`
                });
            }
        }

        return items;
    } catch (err) {
        console.warn(`⚠️ [Reels Crawl] Không thể tải từ partner [${tab}]:`, err.message);
        return [];
    }
}

/**
 * Tự động tìm kiếm video Review trên YouTube cho một bộ phim bất kỳ
 */
async function searchYouTubeMovieReviews(movieTitle, movieSlug) {
    if (!movieTitle) return [];
    try {
        const query = `Review phim ${movieTitle.replace(/\(\d+\)/g, '').trim()}`;
        const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'vi,en;q=0.9'
            },
            timeout: 6000
        });

        const html = res.data;
        const videoIds = [];
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            videoIds.push(match[1]);
        }

        const uniqueIds = [...new Set(videoIds)].slice(0, 6);
        return uniqueIds.map((ytId, idx) => formatReelItem({
            id: `yt_auto_${movieSlug}_${ytId}_${idx}`,
            yt: ytId,
            title: movieTitle,
            slug: movieSlug,
            type: 'review',
            poster: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
            backdrop: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
            year: new Date().getFullYear().toString(),
            rating: '4.9',
            views: Math.floor(Math.random() * 50000) + 12000,
            likes: Math.floor(Math.random() * 30000) + 5000,
            comments_count: Math.floor(Math.random() * 200) + 20,
            caption: `Video tóm tắt & review chi tiết bộ phim ${movieTitle}.`
        }, 'review'));
    } catch (err) {
        console.warn(`⚠️ [Reels Auto-YT] Lỗi tìm YouTube cho [${movieTitle}]:`, err.message);
        return [];
    }
}

/**
 * Chuẩn hóa cấu trúc Reel item cho View và Client API
 */
function formatReelItem(item, tab = 'review') {
    const movieTitle = item.title || item.movieTitle || 'Phim Hay Hot';
    const slug = item.slug || movieTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const rawLikes = typeof item.likes === 'number' ? item.likes : (parseInt(item.likes, 10) || Math.floor(Math.random() * 40000) + 5000);
    const formattedLikes = rawLikes >= 1000 ? `${(rawLikes / 1000).toFixed(1)}K` : rawLikes.toString();
    const rawComments = item.comments_count || item.comments || Math.floor(Math.random() * 300) + 25;
    const formattedComments = typeof rawComments === 'number' && rawComments >= 1000 ? `${(rawComments / 1000).toFixed(1)}K` : rawComments.toString();
    const rawShares = item.shares || Math.floor(rawLikes * 0.08) + 12;
    const formattedShares = typeof rawShares === 'number' && rawShares >= 1000 ? `${(rawShares / 1000).toFixed(1)}K` : rawShares.toString();

    let ratingVal = item.rating || '9.6';
    if (parseFloat(ratingVal) <= 5.0) {
        ratingVal = (parseFloat(ratingVal) * 2).toFixed(1);
    }

    return {
        id: item.id || `reel_${item.yt}`,
        yt: item.yt,
        movieTitle: movieTitle,
        movieTitleVn: item.origin_title || item.movieTitleVn || movieTitle,
        title: item.caption || item.title || `Review phim ${movieTitle}`,
        description: item.caption || `Tóm tắt và phân tích trọn bộ diễn biến chính của siêu phẩm ${movieTitle}.`,
        slug: slug,
        watchUrl: `/xem-phim/${slug}/tap-1`,
        poster: item.poster || `https://i.ytimg.com/vi/${item.yt}/hqdefault.jpg`,
        backdrop: item.backdrop || item.poster || `https://i.ytimg.com/vi/${item.yt}/hqdefault.jpg`,
        year: item.year || '2025',
        quality: item.quality || 'Full HD',
        rating: ratingVal,
        categories: item.categories || ['Review', 'Tóm Tắt Phim', 'Phim Hot'],
        author: item.author || (tab === 'reel' ? 'APhim Short' : 'APhim Review'),
        likes: formattedLikes,
        comments: formattedComments,
        shares: formattedShares,
        views: item.views || 25000,
        duration: item.duration || '03:45'
    };
}

/**
 * Lấy danh sách Reels theo Tab (review hoặc reel) kèm phân trang
 */
async function getReelsFeed({ tab = 'review', page = 1, limit = 15 } = {}) {
    const normalizedTab = tab === 'reel' ? 'reel' : 'review';
    const cache = reelsMemoryCache[normalizedTab];

    let allItems = [];

    // Nếu cache còn hiệu lực và có dữ liệu
    if (cache.items.length > 0 && (Date.now() - cache.lastFetched < CACHE_TTL)) {
        allItems = cache.items;
    } else {
        // Thu thập dữ liệu đa nguồn
        const baseSeed = normalizedTab === 'reel' ? INITIAL_CURATED_REELS : INITIAL_CURATED_REVIEWS;
        const partnerItems = await crawlPartnerReels(normalizedTab);

        const mergedMap = new Map();
        [...baseSeed, ...partnerItems].forEach(item => {
            if (item.yt && !mergedMap.has(item.yt)) {
                mergedMap.set(item.yt, item);
            }
        });

        allItems = Array.from(mergedMap.values());
        reelsMemoryCache[normalizedTab] = {
            items: allItems,
            lastFetched: Date.now()
        };
    }

    const start = (page - 1) * limit;
    const rawPaginated = allItems.slice(start, start + limit);
    const paginated = rawPaginated.map(item => formatReelItem(item, normalizedTab));
    const hasMore = start + limit < allItems.length;

    return {
        tab: normalizedTab,
        page,
        total: allItems.length,
        hasMore,
        items: paginated
    };
}

module.exports = {
    getReelsFeed,
    searchYouTubeMovieReviews,
    crawlPartnerReels,
    formatReelItem
};
