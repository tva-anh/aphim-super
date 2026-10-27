/**
 * lib/customStreams.js
 * Quản lý kho phim & luồng phát tùy biến do Admin gán (Cloudflare R2, m3u8, MP4, Embed Iframe, Phim Chiếu Rạp)
 * Dữ liệu lưu vĩnh viễn trong data/custom_streams.json và đồng bộ in-memory siêu tốc
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'custom_streams.json');

let memoryStreams = {};

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
        memoryStreams = {};
    }
}

function loadData() {
    ensureDataFile();
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        memoryStreams = JSON.parse(raw) || {};
    } catch (e) {
        console.error('[CustomStreams] Đọc file data lỗi, dùng bản sao bộ nhớ:', e.message);
        if (!memoryStreams) memoryStreams = {};
    }
    return memoryStreams;
}

function saveData(data) {
    ensureDataFile();
    try {
        memoryStreams = data || {};
        fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStreams, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[CustomStreams] Lưu file data lỗi:', e.message);
        return false;
    }
}

// Khởi tạo nạp dữ liệu
loadData();

function cleanSlug(slug) {
    if (!slug) return '';
    return String(slug).toLowerCase().trim();
}

function maskEpisodes(slug, episodes = []) {
    if (!Array.isArray(episodes)) return [];
    return episodes.map(server => ({
        ...server,
        server_data: Array.isArray(server.server_data) ? server.server_data.map(ep => {
            const realLink = ep.link_m3u8 || ep.link_embed;
            if (!realLink) return ep;
            // Nếu là link direct (r2, mp4, m3u8, direct storage), che giấu bằng stream gateway nội bộ
            const ext = realLink.includes('.mp4') ? '.mp4' : (realLink.includes('.m3u8') ? '.m3u8' : '.mp4');
            const epSlug = ep.slug || 'tap-full';
            const maskedUrl = `/api/stream/${slug}/${epSlug}${ext}`;
            return {
                ...ep,
                link_m3u8: maskedUrl,
                link_embed: maskedUrl,
                is_secure_proxy: true
            };
        }) : []
    }));
}

/**
 * Lấy tất cả custom streams
 * @param {boolean} mask Che giấu URL gốc (mặc định: true, false khi gọi trong Admin)
 */
function getAll(mask = true) {
    const data = loadData();
    const items = Object.values(data);
    if (!mask) return items;
    return items.map(item => ({
        ...item,
        is_custom: true,
        episodes: maskEpisodes(item.slug, item.episodes)
    }));
}

/**
 * Lấy theo slug
 * @param {string} slug
 * @param {boolean} mask Che giấu URL gốc (mặc định: true, false khi gọi trong Admin)
 */
function getBySlug(slug, mask = true) {
    const s = cleanSlug(slug);
    if (!s) return null;
    const data = loadData();
    const item = data[s];
    if (!item) return null;
    if (!mask) return item;

    return {
        ...item,
        is_custom: true,
        episodes: maskEpisodes(s, item.episodes)
    };
}

/**
 * Lấy URL phát thật từ server nội bộ (dùng cho Stream Proxy)
 */
function getRealStreamUrl(slug, epSlug = '') {
    const s = cleanSlug(slug);
    if (!s) return null;
    const data = loadData();
    const item = data[s];
    if (!item || !Array.isArray(item.episodes) || item.episodes.length === 0) return null;

    const cleanEp = (epSlug || '').toLowerCase().trim();

    // Duyệt qua các server để tìm tập khớp
    for (const server of item.episodes) {
        if (!Array.isArray(server.server_data)) continue;
        if (!cleanEp || cleanEp === 'tap-full' || cleanEp === 'full') {
            const first = server.server_data[0];
            if (first && (first.link_m3u8 || first.link_embed)) {
                return first.link_m3u8 || first.link_embed;
            }
        }
        const found = server.server_data.find(ep => {
            const epS = (ep.slug || '').toLowerCase();
            const epN = (ep.name || '').toLowerCase();
            return epS === cleanEp || epS === `tap-${cleanEp}` || epS.replace(/^tap-/, '') === cleanEp.replace(/^tap-/, '') || epN === cleanEp;
        });
        if (found && (found.link_m3u8 || found.link_embed)) {
            return found.link_m3u8 || found.link_embed;
        }
    }

    // Fallback: lấy tập đầu tiên của server đầu tiên
    const fallbackEp = item.episodes[0]?.server_data?.[0];
    return fallbackEp?.link_m3u8 || fallbackEp?.link_embed || null;
}

/**
 * Kiểm tra xem phim có custom stream không
 */
function has(slug) {
    const s = cleanSlug(slug);
    if (!s) return false;
    const data = memoryStreams || loadData();
    return Boolean(data[s] && data[s].episodes && data[s].episodes.length > 0);
}

/**
 * Lưu hoặc cập nhật link stream cho phim
 * @param {string} slug
 * @param {object} payload
 */
function saveStream(slug, payload = {}) {
    const s = cleanSlug(slug || payload.slug);
    if (!s) throw new Error('Slug phim không hợp lệ');

    const data = memoryStreams || loadData();
    const existing = data[s] || {};

    let formattedEpisodes = [];

    // Nếu truyền episodes dạng cấu trúc chuẩn
    if (Array.isArray(payload.episodes) && payload.episodes.length > 0) {
        formattedEpisodes = payload.episodes.map((server, idx) => ({
            server_name: server.server_name || (idx === 0 ? 'APhim VIP Server' : `Nguồn Dự Phòng #${idx + 1}`),
            server_data: Array.isArray(server.server_data) ? server.server_data.map((ep, eIdx) => ({
                name: ep.name || (server.server_data.length === 1 ? 'Full' : `Tập ${eIdx + 1}`),
                slug: ep.slug || (server.server_data.length === 1 ? 'tap-full' : `tap-${eIdx + 1}`),
                link_m3u8: (ep.link_m3u8 || '').trim(),
                link_embed: (ep.link_embed || '').trim()
            })) : []
        }));
    } else {
        // Nếu truyền trực tiếp link_m3u8 hoặc link_embed dạng đơn giản
        const m3u8 = (payload.link_m3u8 || '').trim();
        const embed = (payload.link_embed || '').trim();

        if (m3u8 || embed) {
            formattedEpisodes = [
                {
                    server_name: payload.server_name || 'APhim VIP Server (R2 / CDN Bản Đẹp)',
                    server_data: [
                        {
                            name: payload.episode_name || 'Full',
                            slug: payload.episode_slug || 'tap-full',
                            link_m3u8: m3u8,
                            link_embed: embed
                        }
                    ]
                }
            ];
        }
    }

    const item = {
        slug: s,
        name: payload.name || existing.name || s,
        origin_name: payload.origin_name || existing.origin_name || '',
        year: payload.year || existing.year || new Date().getFullYear(),
        quality: payload.quality || existing.quality || 'Bản Đẹp Rạp (Full HD)',
        lang: payload.lang || existing.lang || 'Vietsub / Thuyết Minh',
        thumb_url: payload.thumb_url || existing.thumb_url || '',
        poster_url: payload.poster_url || existing.poster_url || payload.thumb_url || existing.thumb_url || '',
        content: payload.content || existing.content || `Phim ${payload.name || s} bản đẹp sắc nét đã được cập nhật luồng phát tốc độ cao.`,
        category: payload.category || existing.category || ['Phim Chiếu Rạp'],
        country: payload.country || existing.country || ['Việt Nam'],
        type: payload.type || existing.type || 'single',
        episodes: formattedEpisodes,
        created_at: existing.created_at || Date.now(),
        updated_at: Date.now()
    };

    data[s] = item;
    saveData(data);
    return item;
}

/**
 * Xóa custom stream
 */
function deleteStream(slug) {
    const s = cleanSlug(slug);
    if (!s) return false;
    const data = memoryStreams || loadData();
    if (data[s]) {
        delete data[s];
        saveData(data);
        return true;
    }
    return false;
}

module.exports = {
    getAll,
    getBySlug,
    getRealStreamUrl,
    has,
    saveStream,
    deleteStream
};
