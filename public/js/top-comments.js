// js/top-comments.js

document.addEventListener('DOMContentLoaded', () => {
    initTopCommentsDashboard();
});

function generateSlug(str) {
    return str.toLowerCase()
        .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
        .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
        .replace(/ì|í|ị|ỉ|ĩ/g, "i")
        .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
        .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
        .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
}

const FAKE_USERS = [
    "Huy", "Tâm", "Diên Diên", "Cuong Dinh", "Tuan Pham", "phy", "Jane", 
    "Minh Nhật", "Hoàng Quân", "Lan Anh", "Quốc Bảo", "Hải Đăng", "user_9921",
    "Mọt Phim 2k", "Châu", "Tuấn Khải", "Bảo Châu", "Trần Kiên"
];

const FAKE_COMMENTS = [
    "Hay", "Hay?", "Phim này xem cuốn thật sự nha", 
    "lần trc đọc đã là 17 năm trước rồi bây h mới ra phim",
    "Sao hông sub mấy cái tên nhân vật luôn nhỉ",
    "7:48 Tùy Nguyện Thanh giết Mãn Đa trả thù vì đã tuột quần ảnh đó =)))))",
    "chi tiết rất hay, từ đầu đến cuối...",
    "cũng không thấy đề cập đến Alfi...",
    "jane kla má ơi",
    "Phim đỉnh thật sự, xem không rời mắt 1 giây nào 😍",
    "Ae cho hỏi phần 2 khi nào ra vậy?",
    "Nam chính đẹp trai xỉu ngang xỉu dọc",
    "Cốt truyện hơi dễ đoán nhưng bù lại kỹ xảo quá tuyệt",
    "Nhạc phim hay dã man, ai xin link OST với",
    "Kết thúc buồn quá, khóc hết nước mắt luôn 😭",
    "Tầm này cày lại lần 3 vẫn thấy hay",
    "Voice diễn viên lồng tiếng nghe êm tai thế",
    "10 điểm không có nhưng!",
    "Chờ đợi mỏi mòn cuối cùng cũng có vietsub"
];

const MOCK_MOVIES = [
    "Bóng Ma Anh Quốc: Người Bất Tử", "Trục Ngọc", 
    "Monarch: Thế Giới Quái Thú (Phần 2)", "Trận Chiến Sau Trận Chiến", 
    "Cỗ máy chiến tranh", "One Piece Live Action", "Mùa Rực Rỡ Của Em",
    "Đếm Ngày Xa Mẹ", "Thiếu Niên Ca Hành", "Loki Season 2"
];



async function initTopCommentsDashboard() {
    renderTheLoaiHot();
    startRealtimeComments();
    
    // Lấy phim từ nhiều danh mục khác nhau của OPhim
    try {
        const endpoints = [
            '/danh-sach/phim-bo?page=1',
            '/danh-sach/phim-le?page=1',
            '/danh-sach/hoat-hinh?page=1',
            '/danh-sach/tv-shows?page=1',
            '/danh-sach/phim-chieu-rap?page=1'
        ];
        
        const responses = await Promise.all(
            endpoints.map(ep => movieAPI.fetchWithFallback(ep).then(res => res.json()).then(data => movieAPI.normalizeResponse(data)).catch(() => null))
        );
        
        let allMixedMovies = [];
        let featuredMovies = [];
        
        // Mỗi danh mục chọn 3 bộ phim HOT NHẤT đưa lên thẻ bình luận lớn ở trên (Featured)
        responses.forEach(data => {
            if (data && data.data && data.data.items && data.data.items.length > 0) {
                const sortedList = data.data.items.sort((a,b) => (b.view || 0) - (a.view || 0));
                
                if (sortedList.length > 0) {
                    featuredMovies.push(...sortedList.slice(0, 3));
                }
                
                if (sortedList.length >= 6) {
                    allMixedMovies.push(...sortedList.slice(3, 6));
                }
            }
        });
        
        // Trộn ngẫu nhiên slider ở trên để phim các danh mục đan xen nhau
        featuredMovies = featuredMovies.sort(() => 0.5 - Math.random());
        
        // Cập nhật khung Featured Comments bằng 15 bộ đỉnh nhất (mỗi danh mục 3 bộ)
        renderFeaturedComments(featuredMovies);
        
        // Trộn ngẫu nhiên lại lần cuối và chia đều ra 2 cột (Sôi Nổi Nhất và Yêu Thích Nhất)
        allMixedMovies = allMixedMovies.sort(() => 0.5 - Math.random());
        
        if (allMixedMovies.length >= 10) {
            const soiNoi = allMixedMovies.slice(0, 5);
            const yeuThich = allMixedMovies.slice(5, 10);
            
            renderMovieList('tc-soi-noi', soiNoi, 'views');
            renderMovieList('tc-yeu-thich', yeuThich, 'rating'); // Yêu thích sẽ hiển thị Rate 10 sao
        }
    } catch(err) {
        console.error("Failed to fetch top comments movies", err);
    }
    
    // Setup scroll arrows
    const featuredWrapper = document.getElementById('tc-featured-container');
    const btnLeft = document.getElementById('tc-scroll-left');
    const btnRight = document.getElementById('tc-scroll-right');
    
    if (featuredWrapper && btnLeft && btnRight) {
        btnLeft.addEventListener('click', () => {
            featuredWrapper.scrollBy({ left: -320, behavior: 'smooth' });
        });
        btnRight.addEventListener('click', () => {
            featuredWrapper.scrollBy({ left: 320, behavior: 'smooth' });
        });
        
        // Tự động chuyển qua bài viết kế tiếp (Auto-play / auto scroll) sau mỗi 4 giây
        setInterval(() => {
            if (featuredWrapper.scrollLeft + featuredWrapper.clientWidth >= featuredWrapper.scrollWidth - 10) {
                featuredWrapper.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                featuredWrapper.scrollBy({ left: 320, behavior: 'smooth' });
            }
        }, 4000);
    }
}

function renderFeaturedComments(movies) {
    const container = document.getElementById('tc-featured-container');
    if (!container) return;
    if (!movies || movies.length === 0) return;
    
    container.innerHTML = movies.map((m, i) => {
        const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
        const text = FAKE_COMMENTS[Math.floor(Math.random() * FAKE_COMMENTS.length)];
        const rawImg = m.thumb_url || m.poster_url || '';
        const thumbUrl = (typeof imageOptimizer !== 'undefined' && rawImg)
            ? imageOptimizer.optimizeImageUrl(rawImg, 400, 80)
            : (rawImg.startsWith('http') ? rawImg : `https://phimimg.com/${rawImg}`);
        const avatarUrl = `https://i.pravatar.cc/150?img=${i + 10}`;
        const genderIcons = ['all_inclusive', 'female', 'male'];
        const gender = genderIcons[Math.floor(Math.random() * genderIcons.length)];
        
        return `
        <a href="movie-detail.html?slug=${m.slug}" class="tc-featured-card cursor-pointer">
            <div class="tc-featured-bg-blur" style="background-image: url('${thumbUrl}')"></div>
            <div class="tc-featured-bg-overlay"></div>
            <img data-src="${thumbUrl}" alt="${m.name}" class="tc-featured-movie" 
                 data-tmdb-slug="${m.slug}"
                 data-tmdb-id="${m.tmdb?.id || ''}"
                 data-tmdb-name="${(m.name || '').replace(/"/g, '&quot;')}"
                 data-tmdb-year="${m.year || ''}"
                 data-tmdb-type="poster"
                 src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3C/svg%3E"
                 onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'"/>
            
            <div class="tc-featured-card-content">
                <div class="tc-featured-user">
                    <div class="tc-avatar-large">
                        <img src="${avatarUrl}" alt="${user}" onerror="this.style.display='none'">
                    </div>
                    <div class="tc-featured-name">
                        ${Math.random() > 0.5 ? '<span class="border border-[#10b981] text-white rounded px-1 text-[10px] mr-1 flex items-center justify-center bg-transparent">ROX</span>' : ''}
                        ${user} <span class="material-icons-round gender-icon text-[14px] ml-1">${gender}</span>
                    </div>
                </div>
                <div class="tc-featured-text">${text}</div>
                
                <div class="tc-metrics">
                    <div class="tc-metric"><span class="material-icons-round">arrow_circle_up</span> ${Math.floor(Math.random() * 50)}</div>
                    <div class="tc-metric"><span class="material-icons-round">arrow_circle_down</span> 0</div>
                    <div class="tc-metric"><span class="material-icons-round">chat</span> ${Math.floor(Math.random() * 10)}</div>
                </div>
            </div>
        </a>
    `}).join('');
}

function renderMovieList(elementId, items, displayMode = 'views') {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    container.innerHTML = items.map((item, index) => {
        const rawImg = item.thumb_url || item.poster_url || '';
        const thumbUrl = (typeof imageOptimizer !== 'undefined' && rawImg)
            ? imageOptimizer.optimizeImageUrl(rawImg, 200, 75)
            : (rawImg.startsWith('http') ? rawImg : `https://phimimg.com/${rawImg}`);
        
        // Giả lập view cao và rating 9.5-10
        const views = Math.floor(Math.random() * 500) + 100; // 100k - 600k
        const rating = (Math.random() * 0.5 + 9.5).toFixed(1); // 9.5 - 10 sao
        
        const metaHtml = displayMode === 'views' 
            ? `<div class="tc-list-meta" style="color:#3b82f6;"><span class="material-icons-round" style="font-size:11px;vertical-align:-1px;">visibility</span> ${views}K bình luận</div>`
            : `<div class="tc-list-meta" style="color:#ef4444;"><span class="material-icons-round" style="font-size:11px;vertical-align:-1px;">star</span> 10 / 10</div>`;

        return `
        <a href="movie-detail.html?slug=${item.slug}" class="tc-list-item group">
            <span class="tc-list-rank">${index + 1}.</span>
            <span class="tc-list-dash material-icons-round">trending_up</span>
            <img data-src="${thumbUrl}" class="tc-list-thumbnail" alt="${item.name}" 
                 data-tmdb-slug="${item.slug}"
                 data-tmdb-id="${item.tmdb?.id || ''}"
                 data-tmdb-name="${(item.name || '').replace(/"/g, '&quot;')}"
                 data-tmdb-year="${item.year || ''}"
                 data-tmdb-type="poster"
                 src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3C/svg%3E"
                 onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            <div class="tc-list-info">
                <div class="tc-list-title">${item.name}</div>
                ${metaHtml}
            </div>
        </a>
    `}).join('');
}

function renderTheLoaiHot() {
    const container = document.getElementById('tc-the-loai');
    if (!container) return;
    
    const genres = [
        { name: "Chính Kịch", colorCls: "tc-genre-c1", slug: "chinh-kich" },
        { name: "Tâm Lý", colorCls: "tc-genre-c2", slug: "tam-ly" },
        { name: "Tình Cảm", colorCls: "tc-genre-c3", slug: "tinh-cam" },
        { name: "Hài Hước", colorCls: "tc-genre-c4", slug: "hai-huoc" },
        { name: "Phiêu Lưu", colorCls: "tc-genre-c5", slug: "phieu-luu" },
        { name: "Hành Động", colorCls: "tc-genre-c2", slug: "hanh-dong" },
        { name: "Kinh Dị", colorCls: "tc-genre-c1", slug: "kinh-di" }
    ];
    
    container.innerHTML = genres.map((g, index) => {
        const trendIcon = index === 3 || index === 4 ? 'trending_down' : 'trending_up';
        const trendColor = index === 3 || index === 4 ? 'text-pink-500' : 'text-green-400';
        return `
        <a href="/categories?category=${g.slug}" class="tc-genre-item hover:opacity-80 transition-opacity">
            <span class="tc-list-rank">${index + 1}.</span>
            <span class="tc-list-dash material-icons-round text-[14px] ${trendColor}">${trendIcon}</span>
            <span class="tc-genre-pill ${g.colorCls}">${g.name}</span>
        </a>
    `}).join('');
}

function startRealtimeComments() {
    const container = document.getElementById('tc-realtime-comments');
    if (!container) return;
    
    // Initial populate
    for(let i = 0; i < 4; i++) {
        container.appendChild(createRandomCommentElement());
    }
    
    // Interval loop
    setInterval(() => {
        const newEl = createRandomCommentElement();
        container.insertBefore(newEl, container.firstChild);
        
        // Remove oldest if there are too many to save DOM
        if (container.children.length > 5) {
            const last = container.lastElementChild;
            // Add fade out animation class if desired
            last.classList.add('removing');
            setTimeout(() => {
                if(last.parentNode) {
                    last.parentNode.removeChild(last);
                }
            }, 400); // 400ms match css transition
        }
    }, 3500); // Every 3.5 seconds
}

function createRandomCommentElement() {
    const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
    const text = FAKE_COMMENTS[Math.floor(Math.random() * FAKE_COMMENTS.length)];
    const movie = MOCK_MOVIES[Math.floor(Math.random() * MOCK_MOVIES.length)];
    const avatarUrl = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50) + 20}`;
    const genderIcons = ['all_inclusive', 'female', 'male'];
    const gender = genderIcons[Math.floor(Math.random() * genderIcons.length)];
    
    const slug = generateSlug(movie);
    const el = document.createElement('a');
    el.href = `movie-detail.html?slug=${slug}`;
    el.className = 'tc-realtime-comment group cursor-pointer';
    el.style.textDecoration = 'none';
    
    el.innerHTML = `
        <div class="tc-realtime-avatar">
            <img src="${avatarUrl}" alt="${user}" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">
        </div>
        <div class="tc-realtime-content">
            <div class="tc-realtime-top">
                <span class="tc-realtime-name">${user} <span class="material-icons-round gender-icon text-[14px]" style="color:#ffd700;">${gender}</span></span>
            </div>
            <div class="tc-realtime-text">${text}</div>
            <div class="tc-realtime-movie group-hover:text-white transition-colors" style="display: flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="color:#ffd700; font-size: 10px;">play_arrow</span>
                ${movie}
            </div>
        </div>
    `;
    return el;
}

function getRandomColor() {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    return colors[Math.floor(Math.random() * colors.length)];
}
