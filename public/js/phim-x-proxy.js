// Phim X với Proxy Server - Bypass ISP Blocking
// Version: 1.0 - Sử dụng backend proxy thay vì gọi trực tiếp API

const PROXY_API = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BACKEND_URL) 
    ? API_CONFIG.BACKEND_URL + '/phimx-proxy' 
    : 'https://a-phim-production-eba6.up.railway.app/api/phimx-proxy';

const S = {
    currentServer: 2, // 1 = Pornhub, 2 = Eporner
    currentPage: 1,
    totalPages: 1
};

let currentQuery = 'hot trending';

// Load videos through proxy
async function loadVideos(query, page = 1) {
    const grid = document.getElementById('video-grid');
    const playerSection = document.getElementById('player-section');

    if (playerSection) playerSection.style.display = 'none';

    showSkeleton();

    try {
        let data;

        if (S.currentServer === 2) {
            // Eporner through proxy
            console.log(`🔄 Loading via Proxy (Eporner): ${query}, page ${page}`);
            const response = await fetch(`${PROXY_API}/eporner/search?query=${encodeURIComponent(query)}&page=${page}&per_page=30`);

            if (!response.ok) {
                throw new Error(`Proxy error: ${response.status}`);
            }

            data = await response.json();

            if (!data.videos || data.videos.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#999;">Không tìm thấy video nào</div>';
                return;
            }

            S.totalPages = Math.ceil(data.count / 30);
            S.currentPage = page;
            currentQuery = query;

            // Save state for back button
            history.pushState({ query, page }, '', `?q=${encodeURIComponent(query)}&page=${page}`);

            renderVideos(data.videos, 'eporner');
            renderPagination();

        } else {
            // Pornhub through proxy
            console.log(`🔄 Loading via Proxy (Pornhub): ${query}, page ${page}`);
            const response = await fetch(`${PROXY_API}/pornhub/search?query=${encodeURIComponent(query)}&page=${page}`);

            if (!response.ok) {
                throw new Error(`Proxy error: ${response.status}`);
            }

            data = await response.json();

            if (!data.videos || data.videos.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:60px 20px; color:#999;">Không tìm thấy video nào</div>';
                return;
            }

            S.totalPages = data.total_pages || 10;
            S.currentPage = page;
            currentQuery = query;

            history.pushState({ query, page }, '', `?q=${encodeURIComponent(query)}&page=${page}`);

            renderVideos(data.videos, 'pornhub');
            renderPagination();
        }

        console.log(`✅ Loaded ${data.videos.length} videos via proxy`);

    } catch (error) {
        console.error('❌ Proxy Load Error:', error);
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:60px 20px;">
                <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
                <div style="color:#f97316; font-size:18px; font-weight:600; margin-bottom:8px;">
                    Không thể kết nối đến server proxy
                </div>
                <div style="color:#999; font-size:14px;">
                    ${error.message}
                </div>
                <button onclick="location.reload()" style="
                    margin-top:20px; padding:12px 24px; background:#f97316; 
                    color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
                    Thử lại
                </button>
            </div>
        `;
    }
}

// Render videos
function renderVideos(videos, source) {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = '';

    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card';

        let thumb, title, duration, views, videoId;

        if (source === 'eporner') {
            thumb = v.default_thumb?.src || v.thumb || '';
            title = v.title || 'No title';
            duration = v.length_sec ? formatDuration(v.length_sec) : '';
            views = v.views ? formatViews(v.views) : '';
            videoId = v.id || '';
        } else {
            thumb = v.thumb || '';
            title = v.title || 'No title';
            duration = v.duration || '';
            views = v.views || '';
            videoId = v.video_id || v.id || '';
        }

        card.innerHTML = `
            <div class="video-thumb">
                <img src="${thumb}" alt="${title}" loading="lazy">
                ${duration ? `<div class="video-duration">${duration}</div>` : ''}
            </div>
            <div class="video-title">${title}</div>
            ${views ? `<div class="video-views">${views} views</div>` : ''}
        `;

        card.onclick = () => playVideo(videoId, title, views, source);
        grid.appendChild(card);
    });
}

// Play video
function playVideo(videoId, title, views, source) {
    const playerBox = document.getElementById('player-box');
    const playerSection = document.getElementById('player-section');
    const vpTitle = document.getElementById('vp-title');
    const vpMeta = document.getElementById('vp-meta');

    playerSection.style.display = 'block';
    vpTitle.textContent = title;
    vpMeta.textContent = views ? `${views} views` : '';

    if (source === 'eporner') {
        playerBox.innerHTML = `
            <iframe 
                src="https://www.eporner.com/embed/${videoId}" 
                frameborder="0" 
                width="100%" 
                height="100%" 
                scrolling="no" 
                allowfullscreen 
                allow="autoplay; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            ></iframe>
        `;
    } else {
        playerBox.innerHTML = `
            <iframe 
                src="https://www.pornhub.com/embed/${videoId}" 
                frameborder="0" 
                width="100%" 
                height="100%" 
                scrolling="no" 
                allowfullscreen 
                allow="autoplay; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            ></iframe>
        `;
    }

    document.getElementById('player-section').scrollIntoView({ behavior: 'smooth' });

    console.log(`🎬 Playing video: ${videoId} from ${source} (via proxy)`);
}

// Helper functions
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViews(views) {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
}

function showSkeleton() {
    const grid = document.getElementById('video-grid');
    grid.innerHTML = Array(12).fill(0).map(() => `
        <div class="video-card skeleton">
            <div class="video-thumb" style="background:#282a3a;"></div>
            <div class="video-title" style="background:#282a3a; height:40px; border-radius:4px;"></div>
        </div>
    `).join('');
}

// Category selection
function selectCat(btn, event) {
    if (event) event.preventDefault();

    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const query = btn.getAttribute('data-q');
    const label = btn.textContent.trim();

    document.getElementById('header-label').textContent = '🔞 ' + label;

    S.currentPage = 1;
    currentQuery = query;
    loadVideos(query, 1);
}

// Search
function doSearch() {
    const input = document.getElementById('search-input');
    const query = input.value.trim();
    if (!query) return;

    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('header-label').textContent = '🔍 ' + query;

    S.currentPage = 1;
    currentQuery = query;
    loadVideos(query, 1);
}

// Pagination
function goToPage(page) {
    if (page < 1 || page > S.totalPages || page === S.currentPage) return;
    S.currentPage = page;
    loadVideos(currentQuery, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (S.totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'block';

    prevBtn.disabled = S.currentPage === 1;
    prevBtn.style.opacity = S.currentPage === 1 ? '0.5' : '1';
    prevBtn.style.cursor = S.currentPage === 1 ? 'not-allowed' : 'pointer';

    nextBtn.disabled = S.currentPage === S.totalPages;
    nextBtn.style.opacity = S.currentPage === S.totalPages ? '0.5' : '1';
    nextBtn.style.cursor = S.currentPage === S.totalPages ? 'not-allowed' : 'pointer';

    pageNumbers.innerHTML = '';
    const maxVisible = 7;
    let startPage = Math.max(1, S.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(S.totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.onclick = () => goToPage(i);
        btn.style.cssText = `
            padding: 8px 12px;
            background: ${i === S.currentPage ? 'var(--orange)' : 'var(--bg3)'};
            border: 1px solid ${i === S.currentPage ? 'var(--orange)' : 'var(--border)'};
            border-radius: 8px;
            color: ${i === S.currentPage ? '#fff' : 'var(--text2)'};
            cursor: pointer;
            transition: all 0.2s;
            font-weight: ${i === S.currentPage ? '700' : '400'};
        `;
        pageNumbers.appendChild(btn);
    }
}

// Server switching
function selectServerOption(serverNum) {
    const servers = {
        1: { icon: '🔵', name: 'Server 1' },
        2: { icon: '🟢', name: 'Server 2' }
    };

    const btn = document.getElementById('current-server-btn');
    btn.textContent = `${servers[serverNum].icon} ${servers[serverNum].name}`;

    document.querySelectorAll('.server-option').forEach((opt, idx) => {
        opt.classList.toggle('active', idx + 1 === serverNum);
    });

    document.getElementById('server-dropdown').classList.remove('show');
    S.currentServer = serverNum;

    console.log('🔄 Switched to Server', serverNum, '- All requests via proxy');

    const activeBtn = document.querySelector('.cat-btn.active');
    if (activeBtn) {
        selectCat(activeBtn);
    }
}

function toggleServerDropdown() {
    const dropdown = document.getElementById('server-dropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const selector = document.querySelector('.server-selector');
    const dropdown = document.getElementById('server-dropdown');
    if (selector && !selector.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Enter key to search
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
});

// Auto-load on page load
window.addEventListener('DOMContentLoaded', () => {
    showSkeleton();

    const savedState = history.state;
    if (savedState && savedState.query && savedState.page) {
        console.log('📍 Restoring from history:', savedState);
        S.currentPage = savedState.page;
        currentQuery = savedState.query;

        const activeBtn = document.querySelector(`.cat-btn[data-q="${savedState.query}"]`);
        if (activeBtn) {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');
            document.getElementById('header-label').textContent = '🔞 ' + activeBtn.textContent.trim();
        }

        loadVideos(savedState.query, savedState.page);
    } else {
        loadVideos('hot trending', 1);
    }
});

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.query) {
        console.log('⬅️ Back/Forward to:', event.state);
        S.currentPage = event.state.page || 1;
        currentQuery = event.state.query;

        const activeBtn = document.querySelector(`.cat-btn[data-q="${event.state.query}"]`);
        if (activeBtn) {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');
            document.getElementById('header-label').textContent = '🔞 ' + activeBtn.textContent.trim();
        }

        loadVideos(event.state.query, event.state.page);
    }
});

console.log('🎬 Phim X Proxy Mode Loaded!');
console.log('🛡️ All API requests go through your backend proxy');
console.log('✅ Bypass ISP blocking (VNPT, Viettel, etc.)');
