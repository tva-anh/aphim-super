/**
 * lib/indexnow.service.js
 * 🚀 High-Speed Automated IndexNow Engine for APhim Super
 * Officially supports Bing, Yandex, Seznam, Naver & partner search engines.
 */

const axios = require('axios');

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'e7b92f4c19a8451187491cf02b9365c1';
const HOST = 'aphim.store';
const BASE_URL = 'https://' + HOST;
const KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;

// Lưu lịch sử các URL đã submit gần đây để tránh spam request trùng lặp (In-memory Set)
const recentlySubmittedUrls = new Set();
const MAX_HISTORY = 5000;

/**
 * Gửi mảng danh sách URLs đến IndexNow API
 * @param {string[]} urls - Danh sách URL cần index
 * @returns {Promise<{success: boolean, count: number, message: string}>}
 */
async function submitUrlsToIndexNow(urls = []) {
    if (!Array.isArray(urls) || urls.length === 0) {
        return { success: false, count: 0, message: 'Danh sách URL trống' };
    }

    // Lọc ra các URL mới chưa submit gần đây
    const freshUrls = urls
        .map(u => String(u).trim())
        .filter(u => u.startsWith(BASE_URL) && !recentlySubmittedUrls.has(u));

    if (freshUrls.length === 0) {
        return { success: true, count: 0, message: 'Tất cả URL đã được submit trước đó (No new URLs)' };
    }

    // IndexNow cho phép tối đa 10,000 URLs / request
    const batch = freshUrls.slice(0, 1000);

    const payload = {
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: batch
    };

    const endpoints = [
        'https://api.indexnow.org/indexnow',
        'https://www.bing.com/indexnow',
        'https://yandex.com/indexnow'
    ];

    let lastStatus = 0;
    let success = false;

    for (const ep of endpoints) {
        try {
            const res = await axios.post(ep, payload, {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                timeout: 8000
            });
            lastStatus = res.status;
            if (res.status === 200 || res.status === 202) {
                success = true;
                break; // Thành công 1 endpoint là hệ thống IndexNow tự phân phối sang các công cụ khác
            }
        } catch (err) {
            lastStatus = err.response?.status || 500;
        }
    }

    if (success || lastStatus === 200 || lastStatus === 202) {
        batch.forEach(u => {
            recentlySubmittedUrls.add(u);
            if (recentlySubmittedUrls.size > MAX_HISTORY) {
                const first = recentlySubmittedUrls.values().next().value;
                recentlySubmittedUrls.delete(first);
            }
        });

        console.log(`⚡ [IndexNow] Đã bắn thành công ${batch.length} URLs tới IndexNow API (Status ${lastStatus})`);
        return { success: true, count: batch.length, message: `Đã submit thành công ${batch.length} URLs` };
    }

    console.warn(`⚠️ [IndexNow] Gửi URL thất bại với mã phản hồi: ${lastStatus}`);
    return { success: false, count: 0, message: `Gửi thất bại (Status ${lastStatus})` };
}

/**
 * Tự động thu thập 50-100 phim & tập mới nhất từ PhimAPI để submit IndexNow
 */
async function autoSubmitRecentMovies() {
    try {
        const res = await axios.get('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1', { timeout: 8000 });
        const items = res.data?.items || [];
        if (!items.length) return;

        const urls = [
            `${BASE_URL}/`,
            `${BASE_URL}/danh-sach`,
            `${BASE_URL}/categories`
        ];

        items.forEach(movie => {
            if (movie.slug) {
                urls.push(`${BASE_URL}/phim/${movie.slug}`);
                urls.push(`${BASE_URL}/xem-phim/${movie.slug}/tap-1`);
            }
        });

        return await submitUrlsToIndexNow(urls);
    } catch (err) {
        console.warn('⚠️ [IndexNow Auto] Lỗi khi lấy danh sách phim mới:', err.message);
    }
}

module.exports = {
    INDEXNOW_KEY,
    submitUrlsToIndexNow,
    autoSubmitRecentMovies
};
