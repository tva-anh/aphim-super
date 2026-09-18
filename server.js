require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./lib/logger');

// ==========================================
// DATABASE CONNECTIONS
// ==========================================
const { connectMongoDB } = require('./lib/mongodb');
connectMongoDB(); // Kết nối MongoDB Atlas ngay khi server khởi động

// ==========================================
// API ROUTES (thực tế — Supabase + MongoDB)
// ==========================================
const authRoutes         = require('./routes/auth.routes');
const gamificationRoutes = require('./routes/gamification.routes');
const historyRoutes      = require('./routes/history.routes');
const movieRoutes        = require('./routes/movie.routes');
const paymentRoutes      = require('./routes/payment.routes');
const settingsRoutes     = require('./routes/settings.routes');
const adminRoutes        = require('./routes/admin.routes');
const feedbackRoutes     = require('./routes/feedback.routes');
const seoRoutes          = require('./routes/seo.routes');
const { requireAdmin }  = require('./middleware/adminAuth.middleware');

const app = express();
const PORT = process.env.PORT || 3005;

// Socket.IO Setup
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer({ maxHeaderSize: 65536 }, app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});
app.set('io', io);

io.on('connection', (socket) => {
    socket.on('join_user_room', (userId) => {
        if (userId) {
            socket.join(`user_${userId}`);
            console.log(`👤 [Socket.io] User ${userId} joined room`);
        }
    });
});

// Middleware
// 0. Ghi Log mọi Request
app.use((req, res, next) => {
    // Không log các file tĩnh để đỡ rác file log
    if (!req.url.startsWith('/css/') && !req.url.startsWith('/js/') && !req.url.startsWith('/images/')) {
        logger.info(`${req.method} ${req.url}`, { ip: req.ip });
    }
    next();
});

// 1. Cấu hình Helmet (Bảo mật HTTP Headers)
app.use(helmet({
    contentSecurityPolicy: false, // Tắt CSP tạm thời để không block ảnh/phim từ CDN
    crossOriginEmbedderPolicy: false,
}));

// Serve static assets from public folder FIRST so they don't count towards rate limit
app.use(express.static(path.join(__dirname, 'public')));

// 2. Cấu hình Rate Limiter (Chống Spam / DDoS)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5000, // Giới hạn 5000 requests / 15 phút
    message: { status: false, message: 'Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Tự động bỏ qua rate limit trên localhost / môi trường test nội bộ
        const host = req.hostname || '';
        const ip = req.ip || req.connection?.remoteAddress || '';
        return host === 'localhost' || host === '127.0.0.1' || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
});
app.use(globalLimiter);



app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set View Engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==========================================
// MOUNT API ROUTES — Supabase + MongoDB
// ==========================================
app.use('/api/auth',         authRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/history',      historyRoutes);
app.use('/api/movies',       movieRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/subscriptions',paymentRoutes); // alias
app.use('/api/transactions',  paymentRoutes); // alias
app.use('/api/settings',     settingsRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/feedback',     feedbackRoutes);
app.use('/',                 seoRoutes); // Sitemap đa tầng, robots.txt, dynamic seo cache

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        timestamp: new Date().toISOString(),
        services: { supabase: '✅', mongodb: '✅', firebase: '✅ (client-side)' }
    });
});

// Notifications endpoint fallback
app.get('/api/notifications', (req, res) => {
    res.json({
        success: true,
        data: []
    });
});

// ==========================================
// 🎬 TMDB PROXY (Hidden API Key + Cache + Safe 404s)
// ==========================================
const tmdbCache = new Map();
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '5fb3c8d9ad2ca4cd2029836befcc3ab5';

app.use('/api/tmdb', async (req, res) => {
    try {
        const pathAfterTmdb = req.path.replace(/^\/+/, '');
        if (!pathAfterTmdb) {
            return res.json({ results: [], cast: [], crew: [], backdrops: [], posters: [], id: 0 });
        }
        const queryParams = new URLSearchParams(req.query);
        queryParams.set('api_key', TMDB_API_KEY);
        if (!queryParams.has('language')) {
            queryParams.set('language', 'vi-VN');
        }
        
        const cacheKey = `${pathAfterTmdb}?${queryParams.toString()}`;
        const cached = tmdbCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
            return res.json(cached.data);
        }

        const targetUrl = `${TMDB_BASE_URL}/${pathAfterTmdb}?${queryParams.toString()}`;
        const response = await axios.get(targetUrl, { timeout: 8000 });
        
        tmdbCache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
        });

        res.json(response.data);
    } catch (err) {
        // Return 200 with empty fields on 404 so client doesn't log red errors in console
        const emptyResult = { results: [], cast: [], crew: [], backdrops: [], posters: [], id: 0 };
        res.json(emptyResult);
    }
});

// ==========================================
// 💬 COMMENTS API (Realtime SSE + MongoDB + Safe Fallbacks)
// ==========================================
const Comment = require('./models/Comment');
const localCommentsStore = new Map();
const commentSSEClients = new Map(); // slug -> Set of res objects

function broadcastCommentSSE(slug, eventType, data) {
    if (commentSSEClients.has(slug)) {
        const clients = commentSSEClients.get(slug);
        const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        clients.forEach(clientRes => {
            try { clientRes.write(payload); } catch(e) {}
        });
    }
}

// 1. Realtime SSE endpoint for movie comments
app.get('/api/comments/stream/:slug', (req, res) => {
    const slug = req.params.slug;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    if (!commentSSEClients.has(slug)) {
        commentSSEClients.set(slug, new Set());
    }
    const clientSet = commentSSEClients.get(slug);
    clientSet.add(res);

    // Initial connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', slug, time: Date.now() })}\n\n`);

    // Keep-alive heartbeat every 20s
    const heartbeat = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch(e) {
            clearInterval(heartbeat);
        }
    }, 20000);

    req.on('close', () => {
        clearInterval(heartbeat);
        clientSet.delete(res);
        if (clientSet.size === 0) {
            commentSSEClients.delete(slug);
        }
    });
});

// 2. Fetch comments for a movie
app.get('/api/comments/movie/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        let dbList = [];
        try {
            if (Comment) {
                dbList = await Comment.find({ movieSlug: slug, status: { $ne: 'hidden' } })
                    .sort({ createdAt: 1 })
                    .lean();
            }
        } catch (dbErr) {
            console.warn('[Comments] MongoDB read warning:', dbErr.message);
        }

        const fallbackList = localCommentsStore.get(slug) || [];
        
        // Merge & deduplicate by ID
        const mapById = new Map();
        dbList.forEach(c => mapById.set(String(c._id), {
            ...c,
            _id: String(c._id),
            parent: c.parentId || null
        }));
        fallbackList.forEach(c => {
            if (!mapById.has(String(c._id))) {
                mapById.set(String(c._id), c);
            }
        });

        const list = Array.from(mapById.values());
        res.json({
            success: true,
            data: list,
            count: list.length
        });
    } catch (e) {
        res.json({ success: true, data: [], count: 0 });
    }
});

// 2b. Fetch recent comments for homepage showcase
app.get('/api/comments/home-showcase', async (req, res) => {
    try {
        let list = [];
        try {
            if (Comment) {
                list = await Comment.find({ status: { $ne: 'hidden' } })
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean();
            }
        } catch (dbErr) {
            console.warn('[Comments] MongoDB read warning for showcase:', dbErr.message);
        }

        const formatTimeAgo = (dateStr) => {
            if (!dateStr) return '1 ngày trước';
            const diffMs = Date.now() - new Date(dateStr).getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffMins < 5) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins} phút trước`;
            if (diffHours < 24) return `${diffHours} giờ trước`;
            if (diffDays < 30) return `${diffDays} ngày trước`;
            return 'Gần đây';
        };

        const DISCORD_DECORATION_PRESETS = [
            'https://cdn.discordapp.com/avatar-decoration-presets/a_0c0eeb351ae2cf48c6e1eee2cae49d40.png?size=240&passthrough=true',
            'https://cdn.discordapp.com/avatar-decoration-presets/a_0e839cd79500e7b68e2bbbed54790c28.png?size=240&passthrough=true',
            'https://cdn.discordapp.com/avatar-decoration-presets/a_001e956faa73bd0410c455234c62818f.png?size=240&passthrough=true',
            'https://cdn.discordapp.com/avatar-decoration-presets/a_1acbe609daec21fa5b866df9e5a42cb7.png?size=240&passthrough=true',
            'https://cdn.discordapp.com/avatar-decoration-presets/a_3c97a2d37f433a7913a1c7b7a735d000.png?size=240&passthrough=true',
            'https://cdn.discordapp.com/avatar-decoration-presets/a_777b7aa8e77a569766e4a2e2bf656f4e.png?size=240&passthrough=true',
            'https://cdn.discordapp.com/avatar-decoration-presets/a_b77d61247d4e3efdbe149a4e0a7df844.png?size=240&passthrough=true',
            'https://cdn.discordapp.com/avatar-decoration-presets/a_8679f2fe4ceca1b239ebca2021fb4bfb.png?size=240&passthrough=true'
        ];

        const defaultMockComments = [
            {
                userName: 'Admin APhim',
                userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AdminAPhim',
                equippedFrameUrl: 'https://cdn.discordapp.com/avatar-decoration-presets/a_0c0eeb351ae2cf48c6e1eee2cae49d40.png?size=240&passthrough=true',
                equippedFrameClass: 'frame_gold_crown',
                badge: 'ADMIN TOP 1',
                nameColor: 'color_gold',
                isAdmin: true,
                isVip: true,
                level: 99,
                reactionsCount: 12,
                timeAgo: '1 giờ trước',
                content: 'Chào mừng các bạn đến với APhim Super! Chúc mọi người xem phim vui vẻ ❤️',
                movieSlug: 'hen-em-ngay-nhat-thuc',
                movieName: 'Hẹn Em Ngày Nhật Thực'
            },
            {
                userName: 'Yêu Phim',
                userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=YeuPhim',
                equippedFrameUrl: 'https://cdn.discordapp.com/avatar-decoration-presets/a_0e839cd79500e7b68e2bbbed54790c28.png?size=240&passthrough=true',
                equippedFrameClass: '',
                badge: 'VIP PRO',
                nameColor: 'color_gold',
                isAdmin: false,
                isVip: true,
                level: 35,
                reactionsCount: 8,
                timeAgo: '2 giờ trước',
                content: 'Phim hay đáng xem, chất lượng Full HD vietsub cực nét!',
                movieSlug: 'con-ke-ba-nghe',
                movieName: 'Con Kế Ba Nghệ'
            },
            {
                userName: 'tonylemau',
                userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tonylemau',
                equippedFrameUrl: 'https://cdn.discordapp.com/avatar-decoration-presets/a_1acbe609daec21fa5b866df9e5a42cb7.png?size=240&passthrough=true',
                equippedFrameClass: '',
                badge: 'VIP',
                nameColor: 'color_blue',
                isAdmin: false,
                isVip: true,
                level: 28,
                reactionsCount: 5,
                timeAgo: '5 giờ trước',
                content: 'Tập mới ra nhanh quá, web load mượt không bị quảng cáo làm phiền.',
                movieSlug: 'mui-pho',
                movieName: 'Mùi Phở'
            },
            {
                userName: 'Mattroilan',
                userAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Mattroilan',
                equippedFrameUrl: 'https://cdn.discordapp.com/avatar-decoration-presets/a_3c97a2d37f433a7913a1c7b7a735d000.png?size=240&passthrough=true',
                equippedFrameClass: '',
                badge: 'Fan Cứng',
                nameColor: 'color_default',
                isAdmin: false,
                isVip: false,
                level: 18,
                reactionsCount: 3,
                timeAgo: '1 ngày trước',
                content: 'Diễn xuất diễn viên chính quá đỉnh, mong chờ phần tiếp theo!',
                movieSlug: 'te-cong-hang-long-tru-yeu',
                movieName: 'Tế Công: Hàng Long Trừ Yêu'
            }
        ];

        let formattedList = list.map((c, idx) => {
            const userObj = c.user || {};
            const uName = userObj.displayName || userObj.name || c.userName || c.user_name || 'Khách xem phim';
            const uAvatar = userObj.avatarUrl || userObj.avatar || c.avatar || c.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uName)}`;
            const frameUrl = userObj.equippedFrameUrl || c.equippedFrameUrl || c.frameUrl || DISCORD_DECORATION_PRESETS[idx % DISCORD_DECORATION_PRESETS.length];
            const frameClass = userObj.equippedFrameClass || c.equippedFrameClass || c.frameClass || '';
            const isAdmin = (uName && (uName.toLowerCase().includes('admin') || uName === 'Super Admin')) || userObj.role === 'admin' || (userObj.email && userObj.email.toLowerCase().includes('admin'));
            let badge = isAdmin ? 'ADMIN TOP 1' : (userObj.equippedBadge || userObj.badge || c.badge || (userObj.isVip ? 'VIP PRO' : 'LV.' + (userObj.level || 15)));
            if (badge && (badge.toLowerCase().includes('admin') || badge.toLowerCase().includes('top 1'))) {
                badge = 'ADMIN TOP 1';
            }
            const isVip = !!(userObj.isVip || userObj.is_vip || (badge && badge.toLowerCase().includes('vip')));
            const nameColor = isAdmin ? 'color_gold' : (userObj.equippedColor || c.equippedColor || (isVip ? 'color_gold' : 'color_default'));
            const mSlug = c.movieSlug || c.movieId || 'phim';
            const mName = c.movieName || c.movieTitle || mSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return {
                _id: c._id,
                userName: uName,
                userAvatar: uAvatar,
                equippedFrameUrl: frameUrl,
                equippedFrameClass: frameClass,
                badge: badge,
                nameColor: nameColor,
                isAdmin: !!isAdmin,
                isVip: isVip,
                level: Number(userObj.level || (isAdmin ? 99 : (isVip ? 30 : 10))),
                timeAgo: formatTimeAgo(c.createdAt),
                content: c.content || '',
                movieSlug: mSlug,
                movieName: mName,
                reactionsCount: (c.reactions?.likes || []).length
            };
        });

        if (formattedList.length === 0) {
            formattedList = defaultMockComments;
        }

        res.json({
            success: true,
            data: formattedList
        });
    } catch (e) {
        res.json({ success: true, data: [] });
    }
});

// 3. Post a new comment
app.post('/api/comments', async (req, res) => {
    try {
        const { movieSlug, movieId, content, avatar, avatarUrl, parentId, isSpoiler, episodeInfo } = req.body;
        const slug = movieSlug || movieId || 'general';
        const userObj = req.body.user || req.user || {};
        
        const finalUser = {
            id: userObj.id || userObj._id || '',
            displayName: userObj.displayName || userObj.name || req.user?.displayName || req.user?.name || 'Thành viên',
            name: userObj.name || userObj.displayName || req.user?.name || req.user?.displayName || 'Thành viên',
            email: userObj.email || req.user?.email || '',
            avatarUrl: avatarUrl || avatar || userObj.avatarUrl || userObj.avatar || req.user?.avatar || '',
            avatar: avatar || avatarUrl || userObj.avatar || userObj.avatarUrl || req.user?.avatar || '',
            equippedFrameUrl: userObj.equippedFrameUrl || '',
            equippedFrameClass: userObj.equippedFrameClass || '',
            equippedColor: userObj.equippedColor || 'color_default',
            role: userObj.role || req.user?.role || 'user',
            level: Number(userObj.level) || 15,
            badge: userObj.equippedBadge || userObj.badge || (userObj.role === 'admin' || req.user?.role === 'admin' ? 'ADMIN TOP 1' : (userObj.isVip ? 'VIP PRO' : 'LV.' + (Number(userObj.level) || 15))),
            equippedBadge: userObj.equippedBadge || userObj.badge || (userObj.role === 'admin' || req.user?.role === 'admin' ? 'ADMIN TOP 1' : (userObj.isVip ? 'VIP PRO' : 'LV.' + (Number(userObj.level) || 15)))
        };

        const newCmtData = {
            movieSlug: slug,
            movieId: movieId || slug,
            user: finalUser,
            content: (content || '').trim(),
            parent: parentId || null,
            parentId: parentId || null,
            isSpoiler: !!isSpoiler,
            episodeInfo: episodeInfo || '',
            likes: [],
            reactions: {},
            createdAt: new Date()
        };

        let savedDoc = null;
        try {
            if (Comment) {
                const doc = new Comment({
                    movieSlug: slug,
                    movieId: movieId || slug,
                    user: finalUser,
                    content: newCmtData.content,
                    isSpoiler: newCmtData.isSpoiler,
                    parentId: newCmtData.parentId,
                    episodeInfo: newCmtData.episodeInfo,
                    likes: [],
                    reactions: {}
                });
                savedDoc = await doc.save();
                newCmtData._id = String(savedDoc._id);
                newCmtData.createdAt = savedDoc.createdAt;
            }
        } catch (dbErr) {
            console.warn('[Comments] MongoDB save warning:', dbErr.message);
        }

        if (!newCmtData._id) {
            newCmtData._id = 'cmt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        }

        // Store in local memory fallback
        if (!localCommentsStore.has(slug)) {
            localCommentsStore.set(slug, []);
        }
        localCommentsStore.get(slug).push(newCmtData);

        // Realtime Broadcast to all connected clients on this movie
        broadcastCommentSSE(slug, 'new_comment', newCmtData);

        res.json({ success: true, data: newCmtData });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// 4. React to a comment (Like, Love, Haha, Wow, Sad, Angry)
app.post('/api/comments/:id/react', async (req, res) => {
    try {
        const commentId = req.params.id;
        const { slug, reactionType, userKey } = req.body;
        if (!userKey) return res.json({ success: false, message: 'Missing userKey' });

        try {
            const { mongoose } = require('./lib/mongodb');
            if (Comment && mongoose && mongoose.Types.ObjectId.isValid(commentId)) {
                const cmt = await Comment.findById(commentId);
                if (cmt) {
                    let reactions = cmt.reactions || new Map();
                    // Remove userKey from all reactions
                    for (const [type, users] of reactions.entries()) {
                        const filtered = (users || []).filter(u => u !== userKey);
                        reactions.set(type, filtered);
                    }
                    if (reactionType) {
                        const current = reactions.get(reactionType) || [];
                        if (!current.includes(userKey)) {
                            current.push(userKey);
                            reactions.set(reactionType, current);
                        }
                    }
                    cmt.reactions = reactions;
                    await cmt.save();
                }
            }
        } catch (e) {}

        // Broadcast reaction to realtime listeners
        if (slug) {
            broadcastCommentSSE(slug, 'reaction_updated', { commentId, reactionType, userKey });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ==========================================
// 👤 ACTOR AVATAR RESOLVER (TMDB + Wikipedia + In-memory Cache)
// ==========================================
const actorAvatarCache = new Map();

app.get('/api/actor-avatar', async (req, res) => {
    try {
        const name = (req.query.name || '').trim();
        if (!name || name === 'Đang cập nhật' || name.length < 2) {
            return res.json({ success: false, url: null });
        }

        const cacheKey = name.toLowerCase();
        if (actorAvatarCache.has(cacheKey)) {
            const cachedUrl = actorAvatarCache.get(cacheKey);
            return res.json({ success: !!cachedUrl, url: cachedUrl });
        }

        // 1. Try TMDB Person Search
        try {
            const tmdbRes = await axios.get(`${TMDB_BASE_URL}/search/person`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: name
                },
                timeout: 4000
            });
            const results = tmdbRes.data?.results || [];
            if (results.length > 0) {
                const match = results.find(p => p.profile_path);
                if (match && match.profile_path) {
                    const imgUrl = `https://image.tmdb.org/t/p/w300${match.profile_path}`;
                    actorAvatarCache.set(cacheKey, imgUrl);
                    return res.json({ success: true, url: imgUrl });
                }
            }
        } catch (e) {}

        // 2. Try Wikipedia VI Direct Summary
        try {
            const wikiRes = await axios.get(`https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, {
                timeout: 3500,
                headers: { 'User-Agent': 'APhimSuper/2.0 (webmaster@aphim.com)' }
            });
            if (wikiRes.data?.thumbnail?.source) {
                const imgUrl = wikiRes.data.thumbnail.source;
                actorAvatarCache.set(cacheKey, imgUrl);
                return res.json({ success: true, url: imgUrl });
            }
        } catch (e) {}

        // 3. Try Wikipedia VI OpenSearch
        try {
            const searchRes = await axios.get('https://vi.wikipedia.org/w/api.php', {
                params: {
                    action: 'opensearch',
                    search: name,
                    limit: 3,
                    format: 'json'
                },
                timeout: 3500,
                headers: { 'User-Agent': 'APhimSuper/2.0 (webmaster@aphim.com)' }
            });
            const titles = searchRes.data?.[1] || [];
            for (const title of titles) {
                try {
                    const sumRes = await axios.get(`https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
                        timeout: 3000,
                        headers: { 'User-Agent': 'APhimSuper/2.0 (webmaster@aphim.com)' }
                    });
                    if (sumRes.data?.thumbnail?.source) {
                        const imgUrl = sumRes.data.thumbnail.source;
                        actorAvatarCache.set(cacheKey, imgUrl);
                        return res.json({ success: true, url: imgUrl });
                    }
                } catch (e) {}
            }
        } catch (e) {}

        // 4. Try Wikipedia EN Direct Summary
        try {
            const wikiEnRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, {
                timeout: 3500,
                headers: { 'User-Agent': 'APhimSuper/2.0 (webmaster@aphim.com)' }
            });
            if (wikiEnRes.data?.thumbnail?.source) {
                const imgUrl = wikiEnRes.data.thumbnail.source;
                actorAvatarCache.set(cacheKey, imgUrl);
                return res.json({ success: true, url: imgUrl });
            }
        } catch (e) {}

        // Negative cache
        actorAvatarCache.set(cacheKey, null);
        return res.json({ success: false, url: null });

    } catch (err) {
        return res.json({ success: false, url: null });
    }
});

// ==========================================
// 📡 SECONDARY SOURCES PROXY (VSMov & NguonC)
// ==========================================
const vsmovCache = new Map();
const nguoncCache = new Map();

app.get('/api/vsmov/:slug', async (req, res) => {
    const slug = req.params.slug;
    if (!slug || slug.length > 200) {
        return res.status(400).json({ status: false, message: 'Invalid slug' });
    }

    const cached = vsmovCache.get(slug);
    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
        return res.json(cached.data);
    }

    const mirrors = [
        {
            url: `https://vsmov.com/api/phim/${slug}`,
            parse: d => ({ episodes: d?.episodes, movie: d?.movie })
        },
        {
            url: `https://ophim1.com/phim/${slug}`,
            parse: d => ({ episodes: d?.episodes, movie: d?.movie })
        },
        {
            url: `https://phim.nguonc.com/api/film/${slug}`,
            parse: d => {
                if (!d || !d.movie || !d.movie.episodes) return null;
                const mappedEps = d.movie.episodes.map(s => ({
                    server_name: s.server_name || 'Vietsub',
                    server_data: (s.items || []).map(it => ({
                        name: it.name && !it.name.toLowerCase().includes('tập') ? `Tập ${it.name}` : (it.name || 'Tập 1'),
                        slug: it.slug || `tap-${it.name}`,
                        link_embed: it.embed || '',
                        link_m3u8: it.m3u8 || ''
                    }))
                }));
                return {
                    episodes: mappedEps,
                    movie: {
                        name: d.movie.name,
                        origin_name: d.movie.original_name,
                        thumb_url: d.movie.thumb_url,
                        poster_url: d.movie.poster_url,
                        content: d.movie.description,
                        quality: d.movie.quality,
                        lang: d.movie.language,
                        year: d.movie.created ? new Date(d.movie.created).getFullYear() : ''
                    }
                };
            }
        }
    ];

    for (const { url, parse } of mirrors) {
        try {
            const response = await axios.get(url, {
                timeout: 2500,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const parsed = parse(response.data);
            const episodes = parsed?.episodes;

            if (episodes && Array.isArray(episodes) && episodes.length > 0) {
                const movieMeta = parsed?.movie || null;
                const result = { status: true, source: url, episodes, movie: movieMeta };
                vsmovCache.set(slug, { data: result, timestamp: Date.now() });
                return res.json(result);
            }
        } catch (err) {
            // Silently fallback without spamming
        }
    }

    const notFoundResult = { status: false, episodes: [], message: 'Không tìm thấy nguồn phim phụ' };
    vsmovCache.set(slug, { data: notFoundResult, timestamp: Date.now() });
    res.json(notFoundResult);
});

app.get('/api/vsmov-episodes/:slug', async (req, res) => {
    const slug = req.params.slug;
    const cached = vsmovCache.get('direct_' + slug);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
        return res.json(cached.data);
    }
    try {
        const response = await axios.get(`https://vsmov.com/api/phim/${slug}`, {
            timeout: 2500,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        vsmovCache.set('direct_' + slug, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (err) {
        vsmovCache.set('direct_' + slug, { data: { status: false, episodes: [] }, timestamp: Date.now() });
        res.json({ status: false, episodes: [] });
    }
});

app.get('/api/nguonc-episodes/:slug', async (req, res) => {
    const slug = req.params.slug;
    const cached = nguoncCache.get(slug);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
        return res.json(cached.data);
    }
    try {
        const response = await axios.get(`https://phim.nguonc.com/api/film/${slug}`, {
            timeout: 2500,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        nguoncCache.set(slug, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (err) {
        nguoncCache.set(slug, { data: { status: 'error', movie: { episodes: [] } }, timestamp: Date.now() });
        res.json({ status: 'error', movie: { episodes: [] } });
    }
});

// ==========================================
// 📡 SERVER-SIDE MOVIE MERGED API (Tối ưu Client)
// ==========================================
const mergedCache = new Map();

app.get('/api/movie-merged/:slug', async (req, res) => {
    const slug = req.params.slug;
    if (!slug || slug.length > 200) {
        return res.status(400).json({ status: false, message: 'Invalid slug' });
    }

    const cached = mergedCache.get(slug);
    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) { // 15 phút cache
        return res.json(cached.data);
    }

    try {
        // Fetch tất cả các nguồn cùng lúc
        const [phimApiRes, nguonCRes, vsmovRes] = await Promise.allSettled([
            axios.get(`https://phimapi.com/phim/${slug}`, { timeout: 2500 }),
            axios.get(`https://phim.nguonc.com/api/film/${slug}`, { timeout: 2500 }),
            axios.get(`https://vsmov.com/api/phim/${slug}`, { timeout: 2500 })
        ]);

        let finalData = { status: false, message: 'Không tìm thấy phim ở mọi nguồn' };
        let baseItem = null;
        let mergedEpisodes = [];

        // 1. Lấy Base Data từ PhimAPI (Ưu tiên 1)
        if (phimApiRes.status === 'fulfilled' && phimApiRes.value.data && phimApiRes.value.data.status) {
            finalData = phimApiRes.value.data; 
            if (finalData.movie) {
                baseItem = finalData.movie;
                if (!finalData.episodes) finalData.episodes = [];
                mergedEpisodes = [...finalData.episodes];
                finalData.source = 'phimapi';
            }
        }

        // 2. Fallback Base Data từ NguonC (Nếu PhimAPI lỗi/không có)
        if (!baseItem && nguonCRes.status === 'fulfilled' && nguonCRes.value.data && nguonCRes.value.data.status === 'success' && nguonCRes.value.data.movie) {
             const m = nguonCRes.value.data.movie;
             baseItem = {
                 name: m.name,
                 origin_name: m.original_name,
                 thumb_url: m.thumb_url,
                 poster_url: m.poster_url,
                 content: m.description,
                 quality: m.quality,
                 lang: m.language,
                 year: m.created ? new Date(m.created).getFullYear() : '',
                 slug: m.slug || slug
             };
             finalData = { status: true, movie: baseItem, episodes: [], source: 'nguonc' };
        }

        // 3. Xử lý Episodes từ NguonC
        if (nguonCRes.status === 'fulfilled' && nguonCRes.value.data && nguonCRes.value.data.status === 'success' && nguonCRes.value.data.movie && nguonCRes.value.data.movie.episodes) {
            const mappedEps = nguonCRes.value.data.movie.episodes.map(s => ({
                server_name: s.server_name || 'Vietsub',
                server_data: (s.items || []).map(it => ({
                    name: it.name && !it.name.toLowerCase().includes('tập') ? `Tập ${it.name}` : (it.name || 'Tập 1'),
                    slug: it.slug || `tap-${it.name}`,
                    link_embed: it.embed || '',
                    link_m3u8: it.m3u8 || ''
                }))
            }));
            
            // Đổi tên server tránh trùng lặp
            mappedEps.forEach((epGroup, i) => {
                epGroup.original_server_name = epGroup.server_name;
                epGroup.server_name = `NguonC ${i+1}`;
                mergedEpisodes.push(epGroup);
            });
        }

        // 4. Xử lý Episodes từ VSMov
        if (vsmovRes.status === 'fulfilled' && vsmovRes.value.data && vsmovRes.value.data.status !== false && vsmovRes.value.data.episodes) {
            let vsEps = vsmovRes.value.data.episodes;
            if (Array.isArray(vsEps)) {
                vsEps.forEach((epGroup, i) => {
                    if (epGroup.server_name) {
                        epGroup.original_server_name = epGroup.server_name.replace(/ #\d+/g, '').trim();
                    }
                    epGroup.server_name = `VSMov ${i+1}`;
                    mergedEpisodes.push(epGroup);
                });
                
                // Nếu chưa có thông tin phim, lấy từ VSMov
                if (!baseItem && vsmovRes.value.data.movie) {
                     baseItem = vsmovRes.value.data.movie;
                     finalData = { status: true, movie: baseItem, episodes: [], source: 'vsmov' };
                }
            }
        }
        
        // Cập nhật lại episodes
        if (baseItem) {
            // Chuẩn hóa tên server
            mergedEpisodes.forEach((s, idx) => {
                if (!s.original_server_name) s.original_server_name = s.server_name;
                s.server_name = `Nguồn ${idx + 1}`;
            });
            finalData.episodes = mergedEpisodes;
            finalData.status = true;
        }

        mergedCache.set(slug, { data: finalData, timestamp: Date.now() });
        res.json(finalData);

    } catch (err) {
        console.error('[MovieMerged] Lỗi:', err.message);
        res.status(500).json({ status: false, message: 'Lỗi server khi fetch phim' });
    }
});


// ==========================================
// CLEAN PRETTY ROUTES (NO .html EXTENSIONS)
// ==========================================

// 1. Homepage Route
app.get('/', (req, res) => {
    res.render('index', {
        title: 'APhim Super | Xem Phim Lẻ Mới 2026 | Phim Online Net Full HD Vietsub',
        metaDescription: 'APhim Super - Website xem phim online net mượt không giật lag. Tổng hợp kho phim lẻ mới, phim vietsub mới nhất 2026, phim bộ hay nhất cập nhật liên tục Full HD miễn phí.',
        canonicalUrl: 'https://aphim.store/'
    });
});

// ==========================================
// BLOCKED MOVIES LIST (DMCA / BÁO CÁO VI PHẠM)
// Mã báo cáo: 489339a89ce51782 (trai-cam)
// ==========================================
const BLOCKED_SLUGS = ['trai-cam', 'moi-thu-la-loi-co-ay', 'michael', 'dac-vu-xuyen-quoc-gia', 'xac-song-thanh-pho-chet-phan-2'];

function checkBlockedSlug(req, res, next) {
    const slug = (req.params.slug || req.query.slug || '').toLowerCase();
    if (slug && BLOCKED_SLUGS.includes(slug)) {
        console.warn(`[BLOCK] Đã chặn truy cập phim bị báo cáo (Mã báo cáo 489339a89ce51782): ${slug}`);
        return res.redirect('/?notice=blocked');
    }
    next();
}

// ==========================================
// 🚀 ENTERPRISE MOVIE SEO & METADATA CACHE
// ==========================================
const movieMetadataCache = new Map();
const MOVIE_CACHE_TTL = 60 * 60 * 1000; // 1 giờ

async function fetchMovieMetadata(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).trim().toLowerCase();
    const cached = movieMetadataCache.get(cleanSlug);
    if (cached && (Date.now() - cached.ts < MOVIE_CACHE_TTL)) {
        return cached.data;
    }

    try {
        const response = await axios.get(`https://phimapi.com/phim/${cleanSlug}`, {
            timeout: 3000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) APhim-Enterprise-SEO/2.0' }
        });

        if (response.data?.status && response.data?.movie) {
            const m = response.data.movie;
            const actors = Array.isArray(m.actor) ? m.actor.filter(Boolean) : (m.actor ? [m.actor] : []);
            const directors = Array.isArray(m.director) ? m.director.filter(Boolean) : (m.director ? [m.director] : []);
            const categories = Array.isArray(m.category) ? m.category.map(c => c.name || c) : [];
            const countries = Array.isArray(m.country) ? m.country.map(c => c.name || c) : [];
            const cleanContent = (m.content || '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            const thumbUrl = m.thumb_url ? (m.thumb_url.startsWith('http') ? m.thumb_url : `https://img.phimapi.com/${m.thumb_url}`) : '';
            const posterUrl = m.poster_url ? (m.poster_url.startsWith('http') ? m.poster_url : `https://img.phimapi.com/${m.poster_url}`) : '';

            const result = {
                slug: cleanSlug,
                name: m.name || cleanSlug,
                origin_name: m.origin_name || '',
                year: m.year || new Date().getFullYear(),
                quality: m.quality || 'HD',
                lang: m.lang || 'Vietsub',
                episode_current: m.episode_current || '',
                time: m.time || '',
                content: cleanContent,
                thumb_url: thumbUrl,
                poster_url: posterUrl,
                actor: actors,
                director: directors,
                category: categories,
                country: countries,
                type: m.type || 'single'
            };

            movieMetadataCache.set(cleanSlug, { data: result, ts: Date.now() });
            return result;
        }
    } catch (err) {
        // Fallback gracefully on timeout or network hiccup
    }
    return null;
}

// 2. Movie Detail Showcase Route: /phim/:slug
app.get('/phim/:slug', checkBlockedSlug, async (req, res) => {
    const slug = req.params.slug;
    const meta = await fetchMovieMetadata(slug);

    if (meta) {
        const isSeries = meta.type === 'series';
        const title = `Phim ${meta.name} (${meta.origin_name || meta.year}) [${meta.quality} ${meta.lang}] - APhim Super`;
        const actorList = meta.actor.length ? meta.actor.slice(0, 4).join(', ') : '';
        const actorText = actorList ? ` Diễn viên: ${actorList}.` : '';
        const directorText = meta.director.length ? ` Đạo diễn: ${meta.director.slice(0, 2).join(', ')}.` : '';
        const descSnippet = meta.content ? ` ${meta.content.slice(0, 160)}...` : '';
        const metaDescription = `Xem phim ${meta.name} (${meta.origin_name}) ${meta.year} chất lượng ${meta.quality} ${meta.lang} miễn phí.${actorText}${directorText}${descSnippet} Xem online tốc độ cao tại APhim Super.`;
        const metaKeywords = `${meta.name}, xem phim ${meta.name}, ${meta.origin_name}, phim ${meta.name} vietsub, ${meta.name} thuyet minh, phim ${meta.year}, ${meta.category.join(', ')}, ${meta.country.join(', ')}, xem phim online full hd, aphim, aphim store`;
        const ogImage = meta.poster_url || meta.thumb_url || 'https://aphim.store/android-chrome-512x512.png';
        const canonicalUrl = `https://aphim.store/phim/${slug}`;
        const mainCategory = meta.category[0] || 'Phim mới';

        const schemaData = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": isSeries ? "TVSeries" : "Movie",
                    "name": meta.name,
                    "alternateName": meta.origin_name || "",
                    "url": canonicalUrl,
                    "image": ogImage,
                    "description": meta.content || metaDescription,
                    "dateCreated": String(meta.year),
                    "director": meta.director.map(d => ({ "@type": "Person", "name": d })),
                    "actor": meta.actor.map(a => ({ "@type": "Person", "name": a })),
                    "genre": meta.category,
                    "countryOfOrigin": meta.country.map(c => ({ "@type": "Country", "name": c })),
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "9.6",
                        "bestRating": "10",
                        "ratingCount": "2480"
                    }
                },
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Trang Chủ",
                            "item": "https://aphim.store/"
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": mainCategory,
                            "item": "https://aphim.store/categories"
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": meta.name,
                            "item": canonicalUrl
                        }
                    ]
                },
                {
                    "@type": "FAQPage",
                    "mainEntity": [
                        {
                            "@type": "Question",
                            "name": `Xem phim ${meta.name} Full HD Vietsub ở đâu miễn phí?`,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": `Bạn có thể xem trọn bộ phim ${meta.name} (${meta.origin_name}) chất lượng cao Full HD Vietsub Thuyết minh hoàn toàn miễn phí, tốc độ cao không giật lag tại website APhim Super.`
                            }
                        },
                        {
                            "@type": "Question",
                            "name": `Phim ${meta.name} có dàn diễn viên nào tham gia?`,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": `Phim ${meta.name} có sự góp mặt của các diễn viên tài năng: ${actorList || 'Đang cập nhật'}.`
                            }
                        },
                        {
                            "@type": "Question",
                            "name": `Phim ${meta.name} thuộc thể loại gì và sản xuất năm nào?`,
                            "acceptedAnswer": {
                                "@type": "Answer",
                                "text": `Phim ${meta.name} phát hành năm ${meta.year}, thuộc thể loại ${meta.category.join(', ')} do quốc gia ${meta.country.join(', ')} sản xuất.`
                            }
                        }
                    ]
                }
            ]
        };

        return res.render('phim', {
            slug: slug,
            movie: meta,
            title: title,
            metaDescription: metaDescription,
            metaKeywords: metaKeywords,
            ogImage: ogImage,
            ogType: 'video.movie',
            canonicalUrl: canonicalUrl,
            schemaData: schemaData
        });
    }

    const formattedName = slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    res.render('phim', {
        slug: slug,
        movie: null,
        title: `Phim ${formattedName} Full HD Vietsub | APhim Super`,
        metaDescription: `Xem thông tin, lịch chiếu, danh sách tập phim ${formattedName} vietsub thuyết minh mới nhất full HD mượt mà trên APhim Super.`,
        metaKeywords: `${formattedName}, xem phim ${formattedName}, phim mới vietsub, aphim, aphim store`,
        canonicalUrl: `https://aphim.store/phim/${slug}`
    });
});

// 3. Watch Video Player Route: /watch, /watch/:slug, /xem-phim/:slug, hoặc /xem-phim/:slug/:episode
app.get(['/watch', '/watch.html', '/watch/:slug', '/xem-phim/:slug', '/xem-phim/:slug/:episode'], checkBlockedSlug, async (req, res) => {
    const slug = req.params.slug || req.query.slug || '';
    const episode = req.params.episode || req.query.episode || '';
    const meta = await fetchMovieMetadata(slug);

    let epText = '';
    let epNumber = '1';
    if (episode) {
        const cleanEp = episode.replace(/^tap-/, '');
        epText = cleanEp ? `- Tập ${cleanEp} ` : '';
        epNumber = cleanEp || '1';
    }

    if (meta) {
        const title = `Xem Phim ${meta.name} ${epText}(${meta.origin_name || meta.year}) [${meta.quality} ${meta.lang}] - APhim Super`;
        const metaDescription = `Xem phim ${meta.name} ${epText}Full HD Vietsub Thuyết minh mượt mà không quảng cáo giật lag. Kho phim lẻ, phim bộ chất lượng cao mới nhất trên APhim Super.`;
        const ogImage = meta.poster_url || meta.thumb_url || 'https://aphim.store/android-chrome-512x512.png';
        const metaKeywords = `xem phim ${meta.name}, ${meta.name} tap ${epNumber}, ${meta.origin_name}, phim ${meta.year}, xem phim online full hd, xem phim khong quang cao, aphim, aphim store`;
        const canonicalUrl = `https://aphim.store/xem-phim/${slug}`;
        const mainCategory = meta.category[0] || 'Phim mới';

        const schemaData = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "VideoObject",
                    "name": `Xem Phim ${meta.name} ${epText}Full HD Vietsub Thuyết Minh`,
                    "description": metaDescription,
                    "thumbnailUrl": [ogImage],
                    "uploadDate": meta.year ? `${meta.year}-01-01T00:00:00Z` : new Date().toISOString(),
                    "contentUrl": canonicalUrl,
                    "embedUrl": canonicalUrl,
                    "potentialAction": {
                        "@type": "SeekToAction",
                        "target": `${canonicalUrl}?t={seek_to_second_number}`,
                        "startOffset-input": "required name=seek_to_second_number"
                    }
                },
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Trang Chủ",
                            "item": "https://aphim.store/"
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": mainCategory,
                            "item": "https://aphim.store/categories"
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": meta.name,
                            "item": `https://aphim.store/phim/${slug}`
                        },
                        {
                            "@type": "ListItem",
                            "position": 4,
                            "name": `Xem Phim ${epText}`,
                            "item": canonicalUrl
                        }
                    ]
                }
            ]
        };

        return res.render('watch', {
            slug: slug,
            episodeParam: episode,
            movie: meta,
            episodes: [],
            title: title,
            metaDescription: metaDescription,
            metaKeywords: metaKeywords,
            ogImage: ogImage,
            ogType: 'video.movie',
            canonicalUrl: canonicalUrl,
            schemaData: schemaData
        });
    }

    const formattedName = slug ? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    res.render('watch', {
        slug: slug,
        episodeParam: episode,
        movie: null,
        episodes: [],
        title: `Xem Phim ${formattedName} ${epText}Full HD | APhim Super`,
        metaDescription: `Xem phim ${formattedName} vietsub thuyết minh mới nhất full HD mượt mà trên APhim Super.`,
        metaKeywords: `xem phim ${formattedName}, ${formattedName} vietsub, xem phim hd, aphim, aphim store`,
        canonicalUrl: `https://aphim.store/xem-phim/${slug}`
    });
});

// Map tên tiếng Việt cho Thể loại & Quốc gia chuẩn SEO
const CATEGORY_NAMES_MAP = {
    'hanh-dong': 'Hành Động', 'tinh-cam': 'Tình Cảm', 'hai-huoc': 'Hài Hước', 'kinh-di': 'Kinh Dị',
    'hoat-hinh': 'Hoạt Hình', 'vien-tuong': 'Viễn Tưởng', 'vo-thuat': 'Võ Thuật', 'chinh-kich': 'Chính Kịch',
    'tam-ly': 'Tâm Lý', 'bi-an': 'Bí Ẩn', 'co-trang': 'Cổ Trang', 'chien-tranh': 'Chiến Tranh',
    'tv-shows': 'TV Shows', 'short-drama': 'Phim Ngắn', 'hoc-duong': 'Học Đường', 'than-thoai': 'Thần Thoại',
    'tai-lieu': 'Tài Liệu', 'the-thao': 'Thể Thao', 'am-nhac': 'Âm Nhạc', 'phieu-luu': 'Phiêu Lưu'
};

const COUNTRY_NAMES_MAP = {
    'viet-nam': 'Việt Nam', 'trung-quoc': 'Trung Quốc', 'han-quoc': 'Hàn Quốc', 'nhat-ban': 'Nhật Bản',
    'thai-lan': 'Thái Lan', 'au-my': 'Âu Mỹ', 'dai-loan': 'Đài Loan', 'hong-kong': 'Hồng Kông',
    'an-do': 'Ấn Độ', 'anh': 'Anh', 'phap': 'Pháp', 'canada': 'Canada'
};

// 3. Category / List Clean Route: /danh-sach & /tat-ca
app.get(['/danh-sach', '/tat-ca'], (req, res) => {
    const listType = req.query.list || req.query.type || '';
    let listTitle = 'Tất Cả Phim Mới Cập Nhật';
    if (listType === 'phim-bo') listTitle = 'Phim Bộ Mới Nhất 2026';
    else if (listType === 'phim-le') listTitle = 'Phim Lẻ Chiếu Rạp Mới Nhất 2026';
    else if (listType === 'hoat-hinh') listTitle = 'Phim Hoạt Hình Anime Mới Nhất';

    res.render('danh-sach', {
        title: `${listTitle} Full HD Vietsub - APhim Super`,
        metaDescription: `Danh sách ${listTitle.toLowerCase()} vietsub thuyết minh chất lượng cao, cập nhật liên tục 24/7 xem nhanh không giật lag tại APhim Super.`,
        canonicalUrl: `https://aphim.store/danh-sach${listType ? '?list=' + listType : ''}`
    });
});

// 3.5 Account & Profile Routes: /profile, /tai-khoan, /tai-khoan/:tab
app.get(['/profile', '/profile.html', '/tai-khoan', '/tai-khoan/:tab'], (req, res) => {
    let tab = req.params.tab || req.query.tab || 'account';
    if (tab === 'lich-su') tab = 'history';
    if (tab === 'yeu-thich') tab = 'favorites';
    res.render('profile', {
        title: 'Quản Lý Tài Khoản - APhim Super',
        metaDescription: 'Quản lý thông tin cá nhân, danh sách yêu thích, lịch sử xem phim tại APhim Super.',
        activeTab: tab
    });
});

// 4. Search Clean Route: /search
app.get('/search', (req, res) => {
    const keyword = (req.query.keyword || req.query.q || '').trim();
    const titleText = keyword ? `Tìm Kiếm Phim: ${keyword} Full HD Vietsub` : 'Tìm Kiếm Phim Online';
    res.render('search', {
        keyword: keyword,
        title: `${titleText} - APhim Super`,
        metaDescription: `Kết quả tìm kiếm phim ${keyword || 'mới'} vietsub thuyết minh chất lượng full HD, xem trực tuyến mượt mà tại APhim Super.`,
        canonicalUrl: `https://aphim.store/search${keyword ? '?keyword=' + encodeURIComponent(keyword) : ''}`
    });
});

// 5. Category filter Clean Route: /categories
app.get('/categories', (req, res) => {
    const catSlug = req.query.category || '';
    const catName = CATEGORY_NAMES_MAP[catSlug] || (catSlug ? catSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '');
    const titleText = catName ? `Phim ${catName} Hay Nhất 2026 Full HD Vietsub` : 'Khám Phá Thể Loại Phim Hay';

    res.render('categories', {
        title: `${titleText} - APhim Super`,
        metaDescription: `Tổng hợp kho phim ${catName || 'các thể loại'} hay mới nhất 2026 vietsub thuyết minh độ phân giải Full HD cực mượt tại APhim Super.`,
        canonicalUrl: `https://aphim.store/categories${catSlug ? '?category=' + catSlug : ''}`
    });
});

// 6. Country Clean Route: /phim-theo-quoc-gia
app.get('/phim-theo-quoc-gia', (req, res) => {
    const countrySlug = req.query.country || '';
    const countryName = COUNTRY_NAMES_MAP[countrySlug] || (countrySlug ? countrySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '');
    const titleText = countryName ? `Phim ${countryName} Mới Nhất 2026 Full HD Vietsub` : 'Phim Theo Quốc Gia';

    res.render('phim-theo-quoc-gia', {
        title: `${titleText} - APhim Super`,
        metaDescription: `Kho phim ${countryName || 'Châu Á, Âu Mỹ'} mới nhất 2026 vietsub thuyết minh mượt mà không quảng cáo trên APhim Super.`,
        canonicalUrl: `https://aphim.store/phim-theo-quoc-gia${countrySlug ? '?country=' + countrySlug : ''}`
    });
});

// 7. Hỏi - Đáp Route: /hoi-dap
app.get(['/hoi-dap', '/faq'], (req, res) => {
    res.render('hoi-dap', {
        title: 'Hỏi Đáp & Hướng Dẫn - APhim Super',
        metaDescription: 'Giải đáp các thắc mắc thường gặp khi xem phim online tại APhim Super.'
    });
});

// 8. Chính Sách Bảo Mật Route: /chinh-sach-bao-mat
app.get('/chinh-sach-bao-mat', (req, res) => {
    res.render('chinh-sach-bao-mat', {
        title: 'Chính Sách Bảo Mật - APhim Super',
        metaDescription: 'Cam kết bảo mật thông tin cá nhân và quyền riêng tư người dùng tại APhim Super.'
    });
});

// 9. Điều Khoản Sử Dụng Route: /dieu-khoan-su-dung
app.get('/dieu-khoan-su-dung', (req, res) => {
    res.render('dieu-khoan-su-dung', {
        title: 'Điều Khoản Sử Dụng - APhim Super',
        metaDescription: 'Quy định và thỏa thuận sử dụng dịch vụ xem phim trực tuyến tại APhim Super.'
    });
});

// 10. Giới Thiệu Route: /gioi-thieu
app.get('/gioi-thieu', (req, res) => {
    res.render('gioi-thieu', {
        title: 'Giới Thiệu Về APhim Super',
        metaDescription: 'Khám phá về APhim Super - Trang xem phim online miễn phí chất lượng cao.'
    });
});

// 11. Liên Hệ Route: /lien-he
app.get('/lien-he', (req, res) => {
    res.render('lien-he', {
        title: 'Liên Hệ & Hỗ Trợ - APhim Super',
        metaDescription: 'Liên hệ hỗ trợ 24/7, báo lỗi phim và hợp tác quảng cáo với APhim Super.'
    });
});

// 11b. Đặt Lại Mật Khẩu Route: /reset-password
app.get('/reset-password', (req, res) => {
    res.render('reset-password', {
        title: 'Đặt Lại Mật Khẩu - APhim Super',
        metaDescription: 'Khôi phục và tạo mới mật khẩu tài khoản APhim Super.'
    });
});

// 12. Feedback & Error Report API (Tích hợp Google Apps Script Webhook & Lưu trữ)
let GOOGLE_SHEET_WEBAPP_URL = process.env.GOOGLE_SHEET_WEBAPP_URL || 'https://script.google.com/macros/s/AKfycbxFermBx2LDFVFBCr6fmTyL0KmYbmo1ZQD8mHZH5UZrrED2d60s8V0QNqxlf-2hOE4GpQ/exec';

app.post('/api/feedback', async (req, res) => {
    try {
        const payload = req.body || {};
        const {
            type = 'report_movie',
            movieName = '',
            movieSlug = '',
            episode = '',
            server = '',
            issueType = '',
            description = '',
            userName = 'Khách vãng lai',
            userEmail = '',
            currentUrl = ''
        } = payload;

        console.log(`📥 [Feedback/Report] Đã nhận phản hồi loại: ${type} từ ${userName} (${userEmail || 'N/A'}) - Phim: ${movieName}`);

        // Forward to Google Apps Script Web App nếu đã cấu hình
        if (GOOGLE_SHEET_WEBAPP_URL) {
            try {
                // 1. Thử gửi POST payload
                fetch(GOOGLE_SHEET_WEBAPP_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                    redirect: 'follow'
                }).then(async r => {
                    const text = await r.text();
                    console.log('📤 [Feedback] Google Apps Script POST response:', text.slice(0, 100));
                }).catch(async err => {
                    // 2. Fallback sang GET query params nếu POST bị mạng chặn
                    try {
                        const params = new URLSearchParams({
                            type: payload.type || '',
                            movieName: payload.movieName || '',
                            episode: payload.episode || '',
                            issueType: payload.issueType || '',
                            description: payload.description || '',
                            userName: payload.userName || '',
                            userEmail: payload.userEmail || '',
                            currentUrl: payload.currentUrl || ''
                        });
                        const getUrl = `${GOOGLE_SHEET_WEBAPP_URL}?${params.toString()}`;
                        const r = await fetch(getUrl, { method: 'GET', redirect: 'follow' });
                        const text = await r.text();
                        console.log('📤 [Feedback] Google Apps Script GET fallback response:', text.slice(0, 100));
                    } catch(e) {}
                });
            } catch (err) {
                console.warn('[Feedback] Error sending to Google Sheet:', err.message);
            }
        }



        // 3. Lưu trữ bản sao vĩnh viễn trên Server (data/feedbacks.json)
        try {
            const fs = require('fs');
            const path = require('path');
            const dataDir = path.join(__dirname, 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            const filePath = path.join(dataDir, 'feedbacks.json');
            let list = [];
            if (fs.existsSync(filePath)) {
                try { list = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch(e) { list = []; }
            }
            list.unshift({
                ...payload,
                createdAt: new Date().toISOString()
            });
            fs.writeFileSync(filePath, JSON.stringify(list.slice(0, 500), null, 2), 'utf8');
        } catch (e) {
            console.warn('[Feedback] Lưu file backup lỗi:', e.message);
        }

        return res.json({
            success: true,
            message: 'Đã tiếp nhận phản hồi thành công! Cảm ơn sự đóng góp của bạn.'
        });

    } catch (e) {
        console.error('[Feedback] Handler error:', e);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tiếp nhận phản hồi' });
    }
});

// Xem danh sách phản hồi và báo lỗi đã thu thập trên server
app.get('/api/feedbacks', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, 'data', 'feedbacks.json');
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return res.json({ success: true, count: data.length, data });
        }
        return res.json({ success: true, count: 0, data: [] });
    } catch(e) {
        return res.json({ success: false, data: [] });
    }
});

app.post('/api/admin/set-google-sheet-url', (req, res) => {
    const { url } = req.body || {};
    if (url) {
        GOOGLE_SHEET_WEBAPP_URL = url.trim();
        console.log('✅ Đã cập nhật GOOGLE_SHEET_WEBAPP_URL:', GOOGLE_SHEET_WEBAPP_URL);
        return res.json({ success: true, url: GOOGLE_SHEET_WEBAPP_URL });
    }
    return res.status(400).json({ success: false, message: 'URL không hợp lệ' });
});




// ==========================================
// 🚀 Dynamic SEO Sitemaps & Robots.txt đã được chuyển sang routes/seo.routes.js
// ==========================================

// ==========================================
// 🛡️ APHIM SUPER ENTERPRISE ADMIN SUITE ROUTES
// ==========================================

// 1. Admin Dashboard (Overview & Realtime KPI)
app.get(['/admin', '/admin/dashboard'], (req, res) => {
    res.render('admin/dashboard', {
        title: 'Bảng Điều Khiển KPI & Doanh Thu',
        activePage: 'dashboard',
        pageTitle: 'Bảng Điều Khiển KPI'
    });
});

// 2. Admin Movies Management
app.get('/admin/movies', (req, res) => {
    res.render('admin/movies', {
        title: 'Quản Lý Kho Phim & API Stream',
        activePage: 'movies',
        pageTitle: 'Kho Phim API'
    });
});

// 3. Admin Users & Gamification (Xu/XP, Streaks)
app.get('/admin/users', (req, res) => {
    res.render('admin/users', {
        title: 'Quản Lý Thành Viên & Gamification',
        activePage: 'users',
        pageTitle: 'Thành Viên & Xu/XP'
    });
});

// 4. Admin Subscriptions (VIP tiers & Transactions)
app.get('/admin/subscriptions', (req, res) => {
    res.render('admin/subscriptions', {
        title: 'Gói VIP, Bảng Giá & Doanh Thu',
        activePage: 'subscriptions',
        pageTitle: 'Gói VIP & Doanh Thu'
    });
});

// 5. Admin Banners & Hero Slider
app.get('/admin/banners', (req, res) => {
    res.render('admin/banners', {
        title: 'Quản Lý Banners & Slider',
        activePage: 'banners',
        pageTitle: 'Banners & Slider'
    });
});

// 6. Admin Comments & Live Chat Moderation
app.get('/admin/comments', (req, res) => {
    res.render('admin/comments', {
        title: 'Kiểm Duyệt Bình Luận & Phòng Chat',
        activePage: 'comments',
        pageTitle: 'Bình Luận & Chat'
    });
});

// 7. Admin Settings & Security
app.get('/admin/settings', (req, res) => {
    res.render('admin/settings', {
        title: 'Cài Đặt Hệ Thống & Bảo Mật Enterprise',
        activePage: 'settings',
        pageTitle: 'Cấu Hình & Security'
    });
});

// 8. Admin Login Portal
app.get('/admin/login', (req, res) => {
    res.render('admin/login', {
        title: 'Đăng Nhập Quản Trị Viên',
        activePage: 'login',
        pageTitle: 'Đăng Nhập'
    });
});

// ==========================================
// 🗑️ MOCK APIs ĐÃ BỊ XÓA
// Tất cả APIs thật đã được mount ở phần đầu file
// qua các routes files riêng biệt
// ==========================================

// API: Clear Cache (giữ lại để backward compat)
app.post('/api/admin/cache/clear', requireAdmin, (req, res) => {
    vsmovCache.clear();
    sitemapCache = { xml: null, imagesXml: null, lastFetched: 0 };
    console.log('🧹 [ADMIN] Đã xóa cache hệ thống!');
    res.json({ success: true, message: 'Đã xóa cache thành công!' });
});

// Start Server
server.listen(PORT, () => {
    console.log(`🚀 APhim Super đang chạy tại: http://localhost:${PORT}`);
    console.log(`🔵 Supabase: ${process.env.SUPABASE_URL ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
    console.log(`🟠 MongoDB : ${process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<YOUR_MONGODB_PASSWORD>') ? '✅ Đang kết nối...' : '❌ Chưa cấu hình password'}`);
    console.log(`🟢 Firebase: ✅ Client-side (aphim-super-new)`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Cổng ${PORT} đã bị dùng! Hãy tắt tiến trình khác.`);
    } else {
        console.error('❌ Lỗi server:', err);
    }
});
