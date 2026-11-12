/**
 * lib/bilingual-sitemap.js
 * Nguồn dữ liệu Song Ngữ cho bộ sinh sitemap (CI + runtime).
 * Chỉ đọc file catalog cục bộ, không gọi mạng, không khởi tạo R2.
 */
const fs = require('fs');
const path = require('path');
const { KNOWN_SLUG_ALIASES } = require('./bilingual-aliases');

const CATALOG_PATH = path.join(__dirname, '../data/bilingual_catalog.json');
const MAX_EPISODES = 250;

const BLOCKED_SLUGS = new Set([
    'trai-cam',
    'moi-thu-la-loi-co-ay',
    'michael',
    'dac-vu-xuyen-quoc-gia',
    'xac-song-thanh-pho-chet-phan-2'
]);

let catalogCache = null;

function loadCatalog() {
    if (catalogCache) return catalogCache;
    try {
        const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        catalogCache = Array.isArray(parsed) ? parsed : [];
    } catch (_) {
        catalogCache = [];
    }
    return catalogCache;
}

function normalizeSlug(slug) {
    const clean = String(slug || '').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    return KNOWN_SLUG_ALIASES[clean] || clean;
}

/**
 * Chuẩn hoá URL ảnh catalog về absolute để sitemap image hợp lệ.
 * - /img/...  → oncdn.vip (kho ảnh Tophim/ChoPhim)
 * - uploads/ → phimimg.com
 */
function resolveImageUrl(raw) {
    const url = String(raw || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/img/')) return `https://oncdn.vip${url}`;
    if (url.startsWith('uploads/')) return `https://phimimg.com/${url}`;
    if (url.startsWith('/uploads/')) return `https://phimimg.com${url}`;
    return '';
}

function isBilingualEntry(entry) {
    if (!entry) return false;
    if (entry.is_songngu === true) return true;
    return String(entry.lang || '').toLowerCase().includes('song');
}

function isSingleEntry(entry) {
    const type = String(entry.type || '').toLowerCase();
    return type === 'single' || type === 'movie' || type === 'phim-le' || type === 'phim_lẻ';
}

/**
 * Suy ra số tập đã phát từ metadata catalog.
 * Trả 0 nếu không có dữ liệu tin cậy (không bịa số tập).
 */
function extractEpisodeCount(entry) {
    const tokens = [];
    const current = String(entry.episode_current || '');

    const fraction = current.match(/(\d+)\s*\/\s*(\d+)/);
    if (fraction) {
        tokens.push(parseInt(fraction[1], 10));
        tokens.push(parseInt(fraction[2], 10));
    }

    const numbers = current.match(/\d+/g);
    if (numbers) tokens.push(...numbers.map(Number));

    const total = String(entry.episode_total || '').match(/\d+/g);
    if (total) tokens.push(...total.map(Number));

    if (Array.isArray(entry.available_languages)) {
        for (const lang of entry.available_languages) {
            const match = String(lang).match(/:\s*(\d+)\s*$/);
            if (match) tokens.push(parseInt(match[1], 10));
        }
    }

    const valid = tokens.filter(n => Number.isFinite(n) && n > 0);
    if (valid.length === 0) return 0;
    return Math.min(Math.max(...valid), MAX_EPISODES);
}

/**
 * Trả về danh sách phim Song Ngữ đã chuẩn hoá, dedupe theo canonical slug.
 */
function getBilingualSitemapEntries() {
    const map = new Map();

    for (const entry of loadCatalog()) {
        if (!isBilingualEntry(entry)) continue;

        const slug = normalizeSlug(entry.slug);
        if (!slug || BLOCKED_SLUGS.has(slug)) continue;

        const episodeCount = extractEpisodeCount(entry);
        const isSingle = isSingleEntry(entry);
        const normalized = {
            slug,
            name: entry.name || entry.origin_name || slug,
            origin_name: entry.origin_name || '',
            type: entry.type || (isSingle ? 'single' : 'series'),
            isSingle,
            episodeCount,
            poster_url: resolveImageUrl(entry.poster_url),
            thumb_url: resolveImageUrl(entry.thumb_url),
            episode_current: entry.episode_current || '',
            episode_total: entry.episode_total || '',
            updated_at: entry.updated_at ? String(entry.updated_at).slice(0, 10) : ''
        };

        const existing = map.get(slug);
        if (!existing) {
            map.set(slug, normalized);
            continue;
        }

        existing.isSingle = existing.isSingle && normalized.isSingle;
        existing.episodeCount = Math.max(existing.episodeCount, normalized.episodeCount);
        if (!existing.poster_url && normalized.poster_url) existing.poster_url = normalized.poster_url;
        if (!existing.thumb_url && normalized.thumb_url) existing.thumb_url = normalized.thumb_url;
        if (!existing.episode_current && normalized.episode_current) existing.episode_current = normalized.episode_current;
    }

    return Array.from(map.values());
}

module.exports = {
    getBilingualSitemapEntries,
    extractEpisodeCount,
    normalizeSlug,
    isSingleEntry,
    MAX_EPISODES
};