// Phim X - Dual Server Logic (Independent Servers)
// Mỗi server có bộ phim riêng, KHÔNG tự động fallback

// Config
const RAPIDAPI_KEY = 'd486069129msh0b8da27c0be5495p1d859djsn1739664b1f9a';
const RAPIDAPI_HOST = 'pornhub-api-xnxx.p.rapidapi.com';

// State
const S = {
    videos: [],
    loading: false,
    query: 'hot trending',
    page: 1,
    active: null,
    currentServer: 2 // Default to Server 2 (Eporner)
};

// Search Server 1 ONLY (RapidAPI Pornhub)
async function searchServer1(query, page) {
    console.log('🔵 Server 1 (RapidAPI Pornhub):', query, 'Page:', page);

    const response = await fetch(`https://pornhub-api-xnxx.p.rapidapi.com/api/search`, {
        method: 'POST',
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, pages: page })
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Server 1: Rate limit exceeded. API key hết quota.');
        } else if (response.status === 403) {
            throw new Error('Server 1: API key không hợp lệ.');
        }
        throw new Error(`Server 1 error: ${response.status}`);
    }

    const data = await response.json();
    const videos = Array.isArray(data) ? data : (data.videos || data.data || []);

    if (videos.length === 0) {
        throw new Error('Server 1: Không tìm thấy video');
    }

    console.log('✅ Server 1 success:', videos.length, 'videos');

    return {
        videos: videos.map(v => ({
            id: v.id || v.video_id,
            title: v.title,
            thumbnail: v.thumbnail || v.thumb || v.default_thumb?.src,
            duration: v.duration || v.length_min || 'N/A',
            views: v.views || 0,
            rating: v.rating || v.rate || 0,
            quality: 'HD',
            embed: v.embed || v.embedUrl,
            url: v.url || v.video_url,
            server: 1
        })),
        totalPages: 50
    };
}

// Search Server 2 ONLY (Eporner)
async function searchServer2(query, page) {
    console.log('🟢 Server 2 (Eporner):', query, 'Page:', page);

    const epornerUrl = `https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(query)}&per_page=20&page=${page}&thumbsize=big&order=top-weekly&gay=0&lq=1&format=json`;

    const response = await fetch(epornerUrl);

    if (!response.ok) {
        throw new Error(`Server 2 error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
        throw new Error('Server 2: Không tìm thấy video');
    }

    console.log('✅ Server 2 success:', data.videos.length, 'videos');

    return {
        videos: data.videos.map(v => ({
            id: v.id,
            title: v.title,
            thumbnail: v.default_thumb?.src,
            duration: v.length_min || 'N/A',
            views: typeof v.views === 'number' ? v.views.toLocaleString() : v.views,
            rating: v.rate || 'N/A',
            quality: 'HD',
            embed: v.embed,
            url: v.url,
            server: 2
        })),
        totalPages: data.total_pages || 50
    };
}

// Main API Search - Route to correct server (NO FALLBACK)
async function apiSearch(query, page) {
    console.log('🔍 Searching on Server', S.currentServer, ':', query, 'Page:', page);

    if (S.currentServer === 1) {
        // Server 1 ONLY - RapidAPI Pornhub
        return await searchServer1(query, page);
    } else {
        // Server 2 ONLY - Eporner
        return await searchServer2(query, page);
    }
}

// Override the original apiSearch if it exists
if (typeof window !== 'undefined') {
    window.apiSearch = apiSearch;
    window.S = S;
    console.log('🎬 Phim X Dual Server (Independent) loaded!');
    console.log('📡 Current Server:', S.currentServer === 1 ? 'Server 1 - RapidAPI Pornhub' : 'Server 2 - Eporner');
}
