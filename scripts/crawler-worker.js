/**
 * scripts/crawler-worker.js
 * ⚡ Worker tiến trình cào phim độc lập (Chạy riêng biệt qua PM2: pm2 start scripts/crawler-worker.js --name aphim-crawler)
 * 
 * LỢI ÍCH:
 * - Tách biệt hoàn toàn việc cào phim & kiểm tra luồng video khỏi tiến trình web chính.
 * - Giải phóng 100% CPU & Event Loop cho tiến trình web chính (aphim-super), giúp web load siêu nhanh 24/7.
 * - Khi cào xong, dữ liệu được ghi vào data/phim_ngan_seeds.json để web chính đọc nhanh.
 */
require('dotenv').config();
const phimNganService = require('../lib/phimNgan.service');
const phimNganAutoCrawler = require('../lib/phimNganAutoCrawler');

const intervalHours = parseFloat(process.env.CRAWLER_INTERVAL_HOURS) || 4;

console.log('====================================================');
console.log('🚀 [Worker-Crawler] Khởi động tiến trình cào phim độc lập...');
console.log(`⏰ Chu kỳ cào tự động: mỗi ${intervalHours} giờ.`);
console.log('====================================================');

phimNganAutoCrawler.setService(phimNganService);
phimNganAutoCrawler.startSchedule(intervalHours);

// Bắt các ngoại lệ để worker không bị crash bất ngờ
process.on('uncaughtException', (err) => {
    console.error('❌ [Worker-Crawler] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ [Worker-Crawler] Unhandled Rejection:', reason);
});
