const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://aphim.store';
const todayStr = new Date().toISOString().split('T')[0];

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const seedsPath = path.join(__dirname, '..', 'data', 'phim_ngan_seeds.json');
const seeds = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
const catalog = seeds.catalog || [];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

xml += `  <url>\n`;
xml += `    <loc>${BASE_URL}/phim-ngan</loc>\n`;
xml += `    <lastmod>${todayStr}</lastmod>\n`;
xml += `    <changefreq>always</changefreq>\n`;
xml += `    <priority>1.0</priority>\n`;
xml += `  </url>\n`;

xml += `  <url>\n`;
xml += `    <loc>${BASE_URL}/phim-ngan/de-xuat</loc>\n`;
xml += `    <lastmod>${todayStr}</lastmod>\n`;
xml += `    <changefreq>daily</changefreq>\n`;
xml += `    <priority>0.9</priority>\n`;
xml += `  </url>\n`;

const seenDramaIds = new Set();
catalog.forEach(item => {
    const dramaId = String(item.id || item.slug || '').trim();
    if (!dramaId || seenDramaIds.has(dramaId)) return;
    seenDramaIds.add(dramaId);

    const title = escapeXml(item.title || item.originalTitle || 'Phim Ngắn');
    let poster = item.cover || item.coverVertical || '';
    if (poster && !poster.startsWith('http')) {
        poster = `${BASE_URL}${poster.startsWith('/') ? '' : '/'}${poster}`;
    }
    poster = escapeXml(poster);

    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/phim-ngan/thong-tin/${escapeXml(dramaId)}</loc>\n`;
    xml += `    <lastmod>${todayStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.85</priority>\n`;
    if (poster) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${poster}</image:loc>\n`;
        xml += `      <image:title>Xem trọn bộ phim ngắn ${title} Full HD Vietsub - APhim Super</image:title>\n`;
        xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;

    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/phim-ngan/xem/${escapeXml(dramaId)}</loc>\n`;
    xml += `    <lastmod>${todayStr}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.85</priority>\n`;
    if (poster) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${poster}</image:loc>\n`;
        xml += `      <image:title>Xem phim ngắn ${title} tập 1 Vietsub Thuyết minh - APhim Super</image:title>\n`;
        xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
});

xml += `</urlset>`;

const targetPath = path.join(__dirname, '..', 'public', 'sitemap-phim-ngan.xml');
fs.writeFileSync(targetPath, xml, 'utf8');
console.log('✅ Generated public/sitemap-phim-ngan.xml, size:', (fs.statSync(targetPath).size / 1024).toFixed(1), 'KB');
