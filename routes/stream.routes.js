/**
 * routes/stream.routes.js
 * 🚀 High-Performance Enterprise Video Streaming Gateway
 * - Giấu 100% URL gốc của Cloudflare R2 / S3 / Direct Storage
 * - Hỗ trợ chuẩn HTTP 206 Partial Content (Range requests) cho Player tua video siêu mượt
 * - Client (ArtPlayer/Browser) chỉ thấy link nội bộ: /api/stream/:slug/:epSlug.mp4
 */

const express = require('express');
const router = express.Router();
const http = require('http');
const https = require('https');
const axios = require('axios');
const customStreams = require('../lib/customStreams');

// Keep-Alive Connection Pool để tái sử dụng kết nối TLS, giảm độ trễ mỗi phân đoạn buffer
const streamHttpAgent = new http.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 25, timeout: 60000 });
const streamHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100, maxFreeSockets: 25, timeout: 60000 });

async function handleStreamProxy(req, res) {
    let { slug, epSlug } = req.params;
    if (!slug) {
        return res.status(400).send('Missing movie slug');
    }

    const cleanSlug = String(slug).replace(/\.(mp4|m3u8|webm|ts)$/i, '').toLowerCase().trim();
    const cleanEpSlug = epSlug ? String(epSlug).replace(/\.(mp4|m3u8|webm|ts)$/i, '').toLowerCase().trim() : '';

    const realUrl = customStreams.getRealStreamUrl(cleanSlug, cleanEpSlug);
    if (!realUrl) {
        return res.status(404).json({ error: 'Video stream not found', slug: cleanSlug });
    }

    // Nếu không phải URL HTTP/HTTPS (ví dụ iframe code), không thể proxy byte
    if (!realUrl.startsWith('http://') && !realUrl.startsWith('https://')) {
        return res.status(400).json({ error: 'Stream source is not a direct URL', stream: realUrl });
    }

    const isHead = req.method.toUpperCase() === 'HEAD';

    try {
        const headers = {};
        if (req.headers.range) {
            headers['range'] = req.headers.range;
        }
        if (req.headers['user-agent']) {
            headers['user-agent'] = req.headers['user-agent'];
        }

        const upstream = await axios({
            method: isHead ? 'head' : 'get',
            url: realUrl,
            headers,
            responseType: isHead ? 'text' : 'stream',
            timeout: 25000,
            httpAgent: streamHttpAgent,
            httpsAgent: streamHttpsAgent,
            validateStatus: status => status >= 200 && status < 400
        });

        res.status(upstream.status);

        const forwardHeaders = [
            'content-type',
            'content-length',
            'content-range',
            'accept-ranges',
            'last-modified',
            'etag'
        ];

        forwardHeaders.forEach(h => {
            if (upstream.headers[h]) {
                res.setHeader(h, upstream.headers[h]);
            }
        });

        // Đảm bảo trình duyệt luôn nhận diện đúng Range và không bị cache sai range
        if (!upstream.headers['accept-ranges']) {
            res.setHeader('Accept-Ranges', 'bytes');
        }

        // Content-Type mặc định video/mp4 nếu server upstream trả octet-stream
        const cType = upstream.headers['content-type'] || '';
        if (!cType || cType.includes('application/octet-stream')) {
            if (realUrl.endsWith('.m3u8')) {
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            } else {
                res.setHeader('Content-Type', 'video/mp4');
            }
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type, User-Agent');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        if (isHead) {
            return res.end();
        }

        upstream.data.pipe(res);

        // Hủy luồng tải từ R2 nếu người dùng đóng tab / dừng xem
        req.on('close', () => {
            try {
                if (upstream.data && typeof upstream.data.destroy === 'function') {
                    upstream.data.destroy();
                }
            } catch (e) {}
        });

    } catch (err) {
        console.error(`[StreamProxy] Lỗi proxy luồng phim ${cleanSlug}:`, err.message);
        if (!res.headersSent) {
            return res.status(502).json({
                error: 'Stream gateway connection error',
                message: err.message
            });
        }
    }
}

router.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Type, User-Agent');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(204).end();
    }
    next();
});

// Hỗ trợ cả GET và HEAD cho mọi cấu trúc đường dẫn (Tương thích Express 5)
router.get('/:slug/:epSlug', handleStreamProxy);
router.get('/:slug', handleStreamProxy);
router.head('/:slug/:epSlug', handleStreamProxy);
router.head('/:slug', handleStreamProxy);

module.exports = router;
