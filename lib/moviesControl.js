/**
 * lib/moviesControl.js
 * Quản lý trạng thái phim: Chặn DMCA (Báo cáo vi phạm), Ẩn khỏi Web, và Ghim Trang Chủ
 * Dữ liệu được lưu trữ vĩnh viễn trong data/movies_control.json và đồng bộ siêu tốc in-memory
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'movies_control.json');

const INITIAL_DATA = {
    dmca: [
        'trai-cam',
        'moi-thu-la-loi-co-ay',
        'michael',
        'dac-vu-xuyen-quoc-gia',
        'xac-song-thanh-pho-chet-phan-2'
    ],
    hidden: [],
    featured: []
};

let memoryData = null;

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
        memoryData = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
}

function loadData() {
    ensureDataFile();
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        memoryData = {
            dmca: Array.isArray(parsed.dmca) ? Array.from(new Set(parsed.dmca.map(s => String(s).toLowerCase().trim()).filter(Boolean))) : [...INITIAL_DATA.dmca],
            hidden: Array.isArray(parsed.hidden) ? Array.from(new Set(parsed.hidden.map(s => String(s).toLowerCase().trim()).filter(Boolean))) : [],
            featured: Array.isArray(parsed.featured) ? Array.from(new Set(parsed.featured.map(s => String(s).toLowerCase().trim()).filter(Boolean))) : []
        };
    } catch (e) {
        console.error('[MoviesControl] Đọc file data lỗi, dùng bản sao bộ nhớ:', e.message);
        if (!memoryData) memoryData = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    return memoryData;
}

function saveData(data) {
    ensureDataFile();
    try {
        memoryData = {
            dmca: Array.from(new Set((data.dmca || []).map(s => String(s).toLowerCase().trim()).filter(Boolean))),
            hidden: Array.from(new Set((data.hidden || []).map(s => String(s).toLowerCase().trim()).filter(Boolean))),
            featured: Array.from(new Set((data.featured || []).map(s => String(s).toLowerCase().trim()).filter(Boolean)))
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(memoryData, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[MoviesControl] Lưu file data lỗi:', e.message);
        return false;
    }
}

// Khởi tạo nạp dữ liệu vào RAM
loadData();

function cleanSlug(slug) {
    if (!slug) return '';
    return String(slug).toLowerCase().trim();
}

function isBlockedDMCA(slug) {
    const s = cleanSlug(slug);
    if (!s) return false;
    const data = memoryData || loadData();
    return data.dmca.includes(s);
}

function isHidden(slug) {
    const s = cleanSlug(slug);
    if (!s) return false;
    const data = memoryData || loadData();
    return data.hidden.includes(s);
}

function isFeatured(slug) {
    const s = cleanSlug(slug);
    if (!s) return false;
    const data = memoryData || loadData();
    return data.featured.includes(s);
}

function getMovieStatus(slug) {
    const s = cleanSlug(slug);
    if (!s) return 'active';
    if (isBlockedDMCA(s)) return 'dmca';
    if (isHidden(s)) return 'hidden';
    if (isFeatured(s)) return 'featured';
    return 'active';
}

function toggleDMCA(slug, forceState = null) {
    const s = cleanSlug(slug);
    if (!s) return { success: false, message: 'Slug không hợp lệ' };
    const data = memoryData || loadData();
    const isCurrentlyBlocked = data.dmca.includes(s);
    const targetState = forceState !== null ? Boolean(forceState) : !isCurrentlyBlocked;

    if (targetState) {
        if (!data.dmca.includes(s)) data.dmca.push(s);
        // Nếu đã chặn DMCA thì tự động gỡ khỏi Ghim nổi bật
        data.featured = data.featured.filter(item => item !== s);
    } else {
        data.dmca = data.dmca.filter(item => item !== s);
    }

    saveData(data);
    return {
        success: true,
        slug: s,
        isBlockedDMCA: targetState,
        status: getMovieStatus(s),
        message: targetState ? `Đã CHẶN DMCA (Báo Cáo Vi Phạm) cho phim "${s}"` : `Đã MỞ CHẶN DMCA cho phim "${s}"`
    };
}

function toggleHidden(slug, forceState = null) {
    const s = cleanSlug(slug);
    if (!s) return { success: false, message: 'Slug không hợp lệ' };
    const data = memoryData || loadData();
    const isCurrentlyHidden = data.hidden.includes(s);
    const targetState = forceState !== null ? Boolean(forceState) : !isCurrentlyHidden;

    if (targetState) {
        if (!data.hidden.includes(s)) data.hidden.push(s);
        // Nếu ẩn thì tự động gỡ khỏi Ghim nổi bật
        data.featured = data.featured.filter(item => item !== s);
    } else {
        data.hidden = data.hidden.filter(item => item !== s);
    }

    saveData(data);
    return {
        success: true,
        slug: s,
        isHidden: targetState,
        status: getMovieStatus(s),
        message: targetState ? `Đã ẨN phim "${s}" khỏi toàn bộ website` : `Đã BỎ ẨN (Hiện lên web) cho phim "${s}"`
    };
}

function toggleFeatured(slug, forceState = null) {
    const s = cleanSlug(slug);
    if (!s) return { success: false, message: 'Slug không hợp lệ' };
    const data = memoryData || loadData();
    const isCurrentlyFeatured = data.featured.includes(s);
    const targetState = forceState !== null ? Boolean(forceState) : !isCurrentlyFeatured;

    if (targetState) {
        if (!data.featured.includes(s)) data.featured.push(s);
        // Nếu ghim thì không được ở trạng thái ẩn hoặc DMCA
        data.dmca = data.dmca.filter(item => item !== s);
        data.hidden = data.hidden.filter(item => item !== s);
    } else {
        data.featured = data.featured.filter(item => item !== s);
    }

    saveData(data);
    return {
        success: true,
        slug: s,
        isFeatured: targetState,
        status: getMovieStatus(s),
        message: targetState ? `Đã GHIM phim "${s}" lên vị trí Nổi Bật Trang Chủ` : `Đã BỎ GHIM phim "${s}"`
    };
}

function batchAction(slugs = [], action = '') {
    if (!Array.isArray(slugs) || slugs.length === 0) {
        return { success: false, message: 'Danh sách phim trống' };
    }
    const cleanList = slugs.map(cleanSlug).filter(Boolean);
    const data = memoryData || loadData();

    switch (action) {
        case 'dmca':
            cleanList.forEach(s => {
                if (!data.dmca.includes(s)) data.dmca.push(s);
                data.featured = data.featured.filter(item => item !== s);
            });
            break;
        case 'unblock_dmca':
            data.dmca = data.dmca.filter(item => !cleanList.includes(item));
            break;
        case 'hidden':
            cleanList.forEach(s => {
                if (!data.hidden.includes(s)) data.hidden.push(s);
                data.featured = data.featured.filter(item => item !== s);
            });
            break;
        case 'unhide':
            data.hidden = data.hidden.filter(item => !cleanList.includes(item));
            break;
        case 'featured':
            cleanList.forEach(s => {
                if (!data.featured.includes(s)) data.featured.push(s);
                data.dmca = data.dmca.filter(item => item !== s);
                data.hidden = data.hidden.filter(item => item !== s);
            });
            break;
        case 'unfeature':
            data.featured = data.featured.filter(item => !cleanList.includes(item));
            break;
        case 'active':
            data.dmca = data.dmca.filter(item => !cleanList.includes(item));
            data.hidden = data.hidden.filter(item => !cleanList.includes(item));
            break;
        default:
            return { success: false, message: `Hành động "${action}" không được hỗ trợ` };
    }

    saveData(data);
    return {
        success: true,
        action,
        count: cleanList.length,
        message: `Đã áp dụng thao tác "${action}" thành công cho ${cleanList.length} phim!`
    };
}

function getAll() {
    return memoryData || loadData();
}

module.exports = {
    getAll,
    loadData,
    saveData,
    isBlockedDMCA,
    isHidden,
    isFeatured,
    getMovieStatus,
    toggleDMCA,
    toggleHidden,
    toggleFeatured,
    batchAction
};
