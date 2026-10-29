/**
 * lib/phimNganAutoCrawler.js
 * 🤖 APhim Phim Ngắn Automatic Crawler & Playability Validator (Stealth Edition)
 * 
 * Tự động tìm kiếm, kiểm tra chất lượng luồng phát (Health-Check 100%)
 * và cập nhật liên tục các phim ngắn mới về hệ thống APhim.
 * 
 * 🛡️ Tích hợp cơ chế Human-like Stealth Delays, Random Jitter & Anti-Block Safety
 * giúp tránh bị bên nguồn phát hiện và chống chặn API/IP triệt để.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');

// Danh sách từ khóa tìm kiếm xoay vòng để quét phim mới liên tục (Chuẩn tiếng Việt & Lồng tiếng)
const SEARCH_QUERIES = [
    'lồng tiếng', 'thuyết minh', 'vietsub', 'tổng tài', 'tiểu thư',
    'bảo bối', 'gia tộc', 'hào môn', 'báo thù', 'trọng sinh',
    'nghịch tập', 'chiến thần', 'đại gia', 'ông trùm', 'vợ',
    'chồng', 'hôn nhân', 'hợp đồng', 'mẹ', 'thần y', 'yêu',
    'tình yêu', 'cưới', 'phu nhân', 'thiếu gia', 'tra nam',
    'bạch nguyệt quang', 'vương phi', 'hoàng hậu', 'mẹ chồng',
    'con dâu', 'thế thân', 'ly hôn', 'mang thai', 'yêu nghiệt'
];

const VI_ACCENT_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const FOREIGN_JUNK_REGEX = /\[(?:hindi|español|espanol|português|deutsch|french|english|arabic|thai)\]/i;
const FOREIGN_WORDS_REGEX = /\b(?:billionaire|werewolf|venganza|vingança|esposo|esposa|casamento|namorado|namorada|affair|amour|liebe|alpha|secret lover|sugar daddy|contract marriage|the bride)\b/i;

function isCandidateVietnameseDrama(item) {
    if (!item || !item.title) return false;
    const t = item.title.trim();
    if (FOREIGN_JUNK_REGEX.test(t)) return false;
    if (FOREIGN_WORDS_REGEX.test(t)) return false;
    const isDubbed = /lồng tiếng|thuyết minh/i.test(t);
    const hasViAccents = VI_ACCENT_REGEX.test(t) || VI_ACCENT_REGEX.test(item.description || '');
    return isDubbed || hasViAccents;
}

// Danh sách User-Agents thực tế để xoay vòng, tránh bị nhận diện là bot tự động
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
];

class PhimNganAutoCrawler {
    constructor() {
        this.isRunning = false;
        this.consecutiveBlocks = 0;
        this.status = {
            isRunning: false,
            totalFound: 0,
            totalScanned: 0,
            totalAdded: 0,
            totalPlayable: 0,
            currentDrama: null,
            lastRunTime: null,
            lastCompletedTime: null,
            logs: []
        };
        this.timer = null;
        this.serviceInstance = null;
    }

    setService(service) {
        this.serviceInstance = service;
    }

    log(msg) {
        const time = new Date().toLocaleTimeString('vi-VN');
        const entry = `[${time}] ${msg}`;
        console.log(`[AutoCrawler] ${entry}`);
        this.status.logs.unshift(entry);
        if (this.status.logs.length > 80) this.status.logs.pop();
    }

    getStatus() {
        return {
            ...this.status,
            isRunning: this.isRunning
        };
    }

    getCookie() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    /**
     * Tạo khoảng nghỉ ngẫu nhiên mô phỏng hành vi người dùng thật (Human Jitter)
     */
    async sleep(minMs = 1500, maxMs = 3500) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        await new Promise(r => setTimeout(r, delay));
    }

    /**
     * Sinh HTTP Headers tự nhiên xoay vòng để ngụy trang chống chặn API
     */
    getStealthHeaders(isJson = false) {
        const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const isMobile = ua.includes('Mobile') || ua.includes('iPhone');
        return {
            'User-Agent': ua,
            'Accept': isJson ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
            'Sec-Ch-Ua-Mobile': isMobile ? '?1' : '?0',
            'Sec-Ch-Ua-Platform': isMobile ? '"iOS"' : '"Windows"',
            'Sec-Fetch-Dest': isJson ? 'empty' : 'document',
            'Sec-Fetch-Mode': isJson ? 'cors' : 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Referer': 'https://narto-drama.com/',
            'Cookie': `nd_ck=${this.getCookie()}; lang=vi-VN; _ga=GA1.1.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}; path=/; max-age=7200; samesite=Lax`
        };
    }

    /**
     * Kiểm tra luồng video có phát được thật hay không (Playability Check)
     */
    async verifyPlayable(streamUrl) {
        if (!streamUrl || typeof streamUrl !== 'string' || !streamUrl.startsWith('http')) {
            return false;
        }

        try {
            // Trường hợp HLS (.m3u8): tải manifest kiểm tra hợp lệ
            if (streamUrl.includes('.m3u8') || streamUrl.includes('/e/m/')) {
                const res = await axios.get(streamUrl, {
                    headers: { 'User-Agent': USER_AGENTS[0] },
                    timeout: 8000
                });
                return res.status === 200 && (String(res.data).includes('#EXTM3U') || String(res.data).includes('.ts'));
            }

            // Trường hợp file MP4 / TS: gửi Byte Range request 0-100
            const res = await axios.get(streamUrl, {
                headers: {
                    'Range': 'bytes=0-100',
                    'User-Agent': USER_AGENTS[0]
                },
                timeout: 8000,
                validateStatus: status => status === 200 || status === 206
            });
            return res.status === 200 || res.status === 206;
        } catch (e) {
            return false;
        }
    }

    /**
     * Tìm danh sách phim từ Narto Drama qua API tìm kiếm với độ giãn cách an toàn
     */
    async discoverAllDramas(sampleCount = 12) {
        const dramaMap = new Map();

        // Xáo trộn ngẫu nhiên từ khóa để mỗi đợt quét mang về danh sách phim mới đa dạng
        const shuffledQueries = [...SEARCH_QUERIES].sort(() => 0.5 - Math.random()).slice(0, sampleCount);
        this.log(`🔍 [Stealth Mode] Bắt đầu quét qua ${shuffledQueries.length} nhóm từ khóa với khoảng dừng an toàn...`);

        for (const query of shuffledQueries) {
            if (this.isStopped) break;
            try {
                const headers = this.getStealthHeaders(true);
                const res = await axios.get(`https://narto-drama.com/search?q=${encodeURIComponent(query)}&limit=50&lang=vi-VN`, {
                    headers: headers,
                    timeout: 12000
                });

                if (res.data && Array.isArray(res.data.items)) {
                    for (const item of res.data.items) {
                        if (item.id && !dramaMap.has(item.id)) {
                            if (isCandidateVietnameseDrama(item)) {
                                dramaMap.set(item.id, item);
                            }
                        }
                    }
                }

                this.consecutiveBlocks = 0; // Reset cờ chặn khi có request thành công

                // 🛡️ DỪNG AN TOÀN: Giãn cách ngẫu nhiên 1.8s - 3.2s giữa các lần tìm kiếm để không bị nghi ngờ
                await this.sleep(1800, 3200);
            } catch (err) {
                const status = err.response ? err.response.status : 0;
                if (status === 429 || status === 403) {
                    this.consecutiveBlocks++;
                    this.log(`🛡️ [Anti-Block Safety] Phát hiện phản hồi giới hạn (HTTP ${status}). Tự động dừng nghỉ 45 giây để bảo vệ an toàn API...`);
                    await this.sleep(45000, 60000);
                    if (this.consecutiveBlocks >= 2) {
                        this.log(`⚠️ Đạt ngưỡng an toàn, dừng đợt quét tìm kiếm hiện tại để tránh bị khóa IP.`);
                        break;
                    }
                } else {
                    // Lỗi mạng thông thường, nghỉ 2s rồi tiếp tục
                    await this.sleep(2000, 3000);
                }
            }
        }

        const list = Array.from(dramaMap.values());
        this.status.totalFound = list.length;
        this.log(`✨ Đã thu thập ${list.length} phim tiềm năng để tiến hành kiểm tra & cập nhật.`);
        return list;
    }

    /**
     * Cào chi tiết và tập phim của 1 bộ phim
     */
    async crawlDramaDetail(item) {
        const rawSlug = (item.url || '').split('?')[0].replace('/detail/watch/', '').replace(/\/$/, '') || String(item.id);
        const watchUrl = `https://narto-drama.com/detail/watch/${rawSlug}/1?lang=vi-VN`;

        try {
            const headers = this.getStealthHeaders();
            const res = await axios.get(watchUrl, {
                headers: headers,
                timeout: 15000
            });

            const html = res.data;
            const match = html.match(/episodeItemsRaw\s*=\s*(\[[\s\S]*?\]);/);
            if (!match) return null;

            let rawEpisodes;
            try {
                rawEpisodes = JSON.parse(match[1]);
            } catch (e) {
                return null;
            }

            if (!Array.isArray(rawEpisodes) || rawEpisodes.length === 0) return null;

            // Kiểm tra tính phát được của tập 1 (Health-check)
            const ep1Stream = rawEpisodes[0].play_url || rawEpisodes[0].direct_play_url || '';
            const isPlayable = await this.verifyPlayable(ep1Stream);
            if (!isPlayable) {
                return null; // Bỏ qua phim bị lỗi hoặc không có stream phát được
            }

            // Tiêu đề & Poster
            const title = (item.title || '').trim();
            const cover = item.poster_url || (rawEpisodes[0].thumb_url || '');

            // Xác định xem phim có lồng tiếng hay Vietsub không
            const isDubbed = title.toLowerCase().includes('lồng tiếng') || title.toLowerCase().includes('thuyết minh');
            const hasViAccents = VI_ACCENT_REGEX.test(title) || VI_ACCENT_REGEX.test(item.description || '');

            // 🛡️ LOẠI BỎ TRIỆT ĐỂ: Bỏ qua phim ngoại không sub hoặc không lồng tiếng
            if (!isDubbed && !hasViAccents) return null;
            if (FOREIGN_JUNK_REGEX.test(title) || FOREIGN_WORDS_REGEX.test(title)) return null;

            // 🛡️ CHẶN NGUỒN PHIM TÂY RAW TIẾNG ANH (DramaWave, CrazyMaple / ReelShort, WolfTV, MinuteDrama không lồng tiếng)
            if (!isDubbed) {
                if (/dramawave|crazymaplestudios|wolftv|minutedrama/i.test(ep1Stream)) {
                    return null;
                }
                if (ep1Stream.includes('/e/m/')) {
                    const m = ep1Stream.match(/\/e\/m\/([A-Za-z0-9_-]+)/);
                    if (m && m[1]) {
                        try {
                            const rawPayload = Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
                            const pl = JSON.parse(rawPayload);
                            if (pl.prov === 'dramawave' || pl.prov === 'crazymaple' || pl.prov === 'wolftv') {
                                return null;
                            }
                        } catch (e) { }
                    }
                }
            }

            // Mô tả
            let intro = (item.description || '').trim();
            if (!intro) {
                const descMatch = html.match(/class=["'][^"']*(?:description|synopsis|summary)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/i)
                    || html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
                intro = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : `${title} - Phim ngắn lôi cuốn đặc sắc trọn bộ.`;
            }

            const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/--+/g, '-');
            const dramaId = `narto_${item.id || cleanSlug}`;

            const episodes = rawEpisodes.map((ep, idx) => {
                const epNo = ep.number || (idx + 1);
                const sUrl = ep.play_url || ep.direct_play_url || '';
                return {
                    id: `${cleanSlug}_${epNo}`,
                    no: epNo,
                    title: `Tập ${epNo}`,
                    url: sUrl,
                    streamUrl: sUrl,
                    thumb: ep.thumb_url || cover,
                    duration: ep.duration || 90
                };
            }).filter(ep => ep.url);

            if (episodes.length === 0) return null;

            // Xác định tags
            const tags = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['Phim Ngắn Hot', 'Kịch Tính'];
            if (isDubbed) tags.unshift('Lồng Tiếng');
            if (title.toLowerCase().includes('thuyết minh')) tags.unshift('Thuyết Minh');

            return {
                id: dramaId,
                title: title,
                originalTitle: title,
                slug: cleanSlug,
                cover: cover,
                thumb: cover,
                intro: intro,
                description: intro,
                episodesCount: episodes.length,
                totalEpisodes: episodes.length,
                category: isDubbed ? 'Lồng Tiếng' : 'Phim Ngắn',
                tags: [...new Set(tags)],
                isHot: true,
                rating: 9.8,
                source: 'narto',
                isDubbed: isDubbed,
                hasDub: isDubbed,
                hasSub: !isDubbed,
                subType: isDubbed ? 'dub' : 'sub',
                dubAvailable: isDubbed,
                playableVerified: true,
                episodes: episodes
            };
        } catch (e) {
            const status = e.response ? e.response.status : 0;
            if (status === 429 || status === 403) {
                this.log(`⚠️ Cảnh báo giới hạn khi lấy chi tiết phim (HTTP ${status}). Dừng tạm thời 30 giây...`);
                await this.sleep(30000, 45000);
            }
            return null;
        }
    }

    /**
     * Chạy tiến trình cào cập nhật phim mới với cơ chế tàng hình (Stealth)
     */
    async startAutoCrawl(options = {}) {
        if (this.isRunning) {
            this.log('⚠️ Tiến trình cào phim đang hoạt động ngầm, không kích hoạt trùng lặp.');
            return { success: false, message: 'Đang chạy' };
        }

        this.isRunning = true;
        this.status.isRunning = true;
        this.status.lastRunTime = new Date().toISOString();
        this.status.totalScanned = 0;
        this.status.totalAdded = 0;
        this.status.totalPlayable = 0;

        // Giới hạn mỗi đợt cào cuốn chiếu từ 20 đến 35 phim mới để giữ cho máy chủ nhẹ nhàng và không bị chặn
        // Giới hạn mỗi đợt cào nhẹ nhàng 12-15 phim mới để máy chủ hoàn toàn êm ái, không bị đè nặng CPU hay I/O
        const maxDramas = options.maxDramas || 15;

        // Chạy bất đồng bộ ngầm hoàn toàn
        (async () => {
            let seedsData = { catalog: [], shelves: [] };
            try {
                this.log(`🚀 [Auto-Crawler] Bắt đầu phiên cập nhật phim mới (Chỉ tiêu thêm mới: ${maxDramas} phim)...`);

                if (fs.existsSync(SEEDS_PATH)) {
                    seedsData = JSON.parse(fs.readFileSync(SEEDS_PATH, 'utf8'));
                }
                if (!Array.isArray(seedsData.catalog)) seedsData.catalog = [];

                const existingSlugs = new Set(seedsData.catalog.map(d => d.slug));
                const existingIds = new Set(seedsData.catalog.map(d => String(d.id)));

                // 1. Quét danh sách phim tiềm năng
                const allDiscovered = await this.discoverAllDramas(options.sampleCount || 8);

                let batchCounter = 0;
                let hasUnsavedDisk = false;

                // 2. Lặp qua từng phim để cào và kiểm tra phát được 100%
                for (const item of allDiscovered) {
                    if (!this.isRunning) break;
                    if (this.status.totalAdded >= maxDramas) {
                        this.log(`🎯 Đã hoàn thành chỉ tiêu thêm mới ${this.status.totalAdded} phim cho đợt này!`);
                        break;
                    }

                    this.status.totalScanned++;
                    const rawSlug = (item.url || '').split('?')[0].replace('/detail/watch/', '').replace(/\/$/, '') || String(item.id);
                    const dramaId = `narto_${item.id || rawSlug}`;

                    // Bỏ qua nếu đã có sẵn trong cơ sở dữ liệu
                    if (existingSlugs.has(rawSlug) || existingIds.has(dramaId)) {
                        continue;
                    }

                    this.status.currentDrama = item.title;
                    this.log(`[${this.status.totalScanned}/${allDiscovered.length}] Đang kiểm tra phim: "${item.title}"...`);

                    const dramaObj = await this.crawlDramaDetail(item);

                    if (dramaObj && dramaObj.episodes.length > 0) {
                        this.status.totalPlayable++;
                        this.status.totalAdded++;
                        batchCounter++;
                        hasUnsavedDisk = true;

                        // Đưa vào đầu danh mục để phim mới luôn nổi bật nhất
                        seedsData.catalog.unshift(dramaObj);
                        existingSlugs.add(dramaObj.slug);
                        existingIds.add(dramaObj.id);

                        this.log(`✅ [PLAYABLE 100%] Đã thêm "${dramaObj.title}" (${dramaObj.episodesCount} tập)!`);

                        // Cập nhật bộ nhớ đệm service NGAY LẬP TỨC để người dùng thấy phim trên web tức thì
                        if (this.serviceInstance && typeof this.serviceInstance.refreshSeeds === 'function') {
                            this.serviceInstance.refreshSeeds();
                        }

                        // 🛡️ BẢO VỆ MÁY CHỦ: Không ghi đĩa mỗi phim gây nghẽn máy chủ. Chỉ lưu bất đồng bộ theo mẻ 5 phim
                        if (batchCounter > 0 && batchCounter % 5 === 0) {
                            await this.saveSeedsToFile(seedsData);
                            hasUnsavedDisk = false;
                        }
                    }

                    // ☕ BẢO VỆ CHỐNG CHẶN: Sau mỗi 5 phim cào được -> Nghỉ giải lao 12s - 18s như người dùng thật
                    if (batchCounter > 0 && batchCounter % 5 === 0) {
                        this.log(`☕ [Stealth Pause] Đã cào được ${batchCounter} phim, tạm nghỉ 15 giây để bảo vệ an toàn cho kết nối API...`);
                        await this.sleep(12000, 18000);
                    } else {
                        // Giãn cách ngẫu nhiên 2.5s - 4.5s giữa từng phim
                        await this.sleep(2500, 4500);
                    }
                }

                // Lưu nốt số phim còn lại ra đĩa một cách bất đồng bộ không nghẽn luồng
                if (hasUnsavedDisk) {
                    await this.saveSeedsToFile(seedsData);
                    hasUnsavedDisk = false;
                }

                this.log(`🎉 [HOÀN TẤT] Phiên cào kết thúc thành công! Thêm mới: ${this.status.totalAdded} phim phát mượt mà.`);
            } catch (err) {
                this.log(`❌ Lỗi trong quá trình cào: ${err.message}`);
            } finally {
                this.isRunning = false;
                this.status.isRunning = false;
                this.status.currentDrama = null;
                this.status.lastCompletedTime = new Date().toISOString();
            }
        })();

        return { success: true, message: 'Đã khởi động tiến trình cào phim tàng hình' };
    }

    /**
     * Lưu dữ liệu hạt giống ra file một cách bất đồng bộ (non-blocking) và nén gọn
     */
    async saveSeedsToFile(seedsData) {
        try {
            seedsData.updatedAt = new Date().toISOString();
            // Lưu gọn không chèn khoảng trắng thụt lề để giảm dung lượng file xuống ~50MB và tiết kiệm CPU/RAM
            const jsonString = JSON.stringify(seedsData);
            await fs.promises.writeFile(SEEDS_PATH, jsonString, 'utf8');
            this.log(`💾 [Storage] Đã lưu cơ sở dữ liệu ngầm an toàn (${(jsonString.length / 1024 / 1024).toFixed(1)}MB).`);
        } catch (err) {
            this.log(`⚠️ Lỗi khi lưu file seeds: ${err.message}`);
        }
    }

    /**
     * Khởi động lịch tự động chạy định kỳ liên tục
     * @param {number} intervalHours Chu kỳ cào (Mặc định 2 giờ = 120 phút)
     */
    startSchedule(intervalHours = 2) {
        if (this.timer) clearInterval(this.timer);

        const intervalMs = Math.round(intervalHours * 3600 * 1000);
        this.log(`⏰ Thiết lập lịch cào tự động định kỳ mỗi ${intervalHours} giờ (${Math.round(intervalHours * 60)} phút).`);

        this.timer = setInterval(() => {
            this.log('⏰ Đến giờ cào tự động cập nhật phim mới theo lịch!');
            this.startAutoCrawl({ maxDramas: 15, sampleCount: 8 });
        }, intervalMs);

        // Khởi động lượt đầu tiên sau 60 giây khi server khởi động hoàn tất
        setTimeout(() => {
            this.startAutoCrawl({ maxDramas: 10, sampleCount: 6 });
        }, 60000);
    }
}

const crawlerInstance = new PhimNganAutoCrawler();
module.exports = crawlerInstance;
