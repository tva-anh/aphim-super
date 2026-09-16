// Load and render all movie sections from home API
async function loadHomeMovies() {
    try {
        const response = await movieAPI.fetchWithFallback('/home', {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        }, 'phimapi');

        const data = await response.json();
        console.log('Home API data:', data);

        if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data) {
            // Home API trả về flat array của movies, không phải sections
            // Chúng ta sẽ group chúng theo category hoặc hiển thị như "Phim Mới Cập Nhật"
            if (Array.isArray(data.data.items) && data.data.items.length > 0) {
                const movies = data.data.items;
                console.log('Processing movies from home API:', movies.length);

                // 🚀 SEO STRUCTURED DATA BOOST: Inject dynamic ItemList Schema to boost Google suggestions
                try {
                    let allSEOList = [...movies];
                    if (data.data.sections && Array.isArray(data.data.sections)) {
                        data.data.sections.forEach(sec => {
                            if (Array.isArray(sec.items)) allSEOList = allSEOList.concat(sec.items);
                        });
                    }
                    const uniqueMap = {};
                    const dedupedSEOList = [];
                    allSEOList.forEach(m => {
                        if (m.slug && !uniqueMap[m.slug]) {
                            uniqueMap[m.slug] = true;
                            dedupedSEOList.push(m);
                        }
                    });
                    if (typeof SEO !== 'undefined' && typeof SEO.injectItemListSchema === 'function') {
                        SEO.injectItemListSchema(dedupedSEOList);
                    }
                } catch (seoErr) {
                    console.warn('SEO dynamic injection skipped:', seoErr);
                }

                // Hiển thị loading và dynamicSections
                const loading = document.getElementById('sectionsLoading');
                const container = document.getElementById('dynamicSections');
                if (loading) loading.style.display = 'block';
                if (container) container.style.display = 'block';

                // Nếu data.data có sections (v1/api/home version mới)
                if (data.data.sections) {
                    renderAllSections(data.data.sections);
                } else {
                    // Fallback render flat list if no sections
                    renderLatestMoviesSection(movies);
                }

                // Load Vietnamese movies separately
                loadVietnameseMoviesHome();
            } else {
                console.log('No movies in home API, loading fallback');

                // Hiển thị loading và dynamicSections
                const loading = document.getElementById('sectionsLoading');
                const container = document.getElementById('dynamicSections');
                if (loading) loading.style.display = 'block';
                if (container) container.style.display = 'block';

                loadVietnameseMoviesHome();
            }
        }
    } catch (error) {
        console.error('Error loading home movies:', error);

        // Hiển thị loading để báo lỗi
        const loading = document.getElementById('sectionsLoading');
        const container = document.getElementById('dynamicSections');
        if (loading) loading.style.display = 'block';
        if (container) container.style.display = 'block';

        loadVietnameseMoviesHome();
    }
}

// Render latest movies section (from home API)
function renderLatestMoviesSection(movies) {
    const container = document.getElementById('dynamicSections');
    const loading = document.getElementById('sectionsLoading');

    if (!container) {
        console.error('dynamicSections container not found!');
        return;
    }

    console.log('Rendering latest movies section:', movies.length);

    // Hide loading
    if (loading) {
        loading.style.display = 'none';
    }

    const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');
    const filteredMovies = movies; // Don't filter anymore, show with "Hidden" badge instead

    const html = `
        <section class="py-4 md:py-5 bg-transparent">
            <div class="w-full px-4 md:px-10 lg:px-16">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-3xl font-bold text-white flex items-center gap-3">
                        <span class="w-1.5 h-8 bg-primary rounded-full block shadow-[0_0_10px_rgba(242,242,13,0.5)]"></span>
                        Phim Mới Cập Nhật
                    </h2>
                    <a href="danh-sach.html?list=phim-moi"
                        class="text-primary text-sm font-semibold hover:text-white transition-colors flex items-center gap-1 group">
                        Xem tất cả <span class="material-icons-round text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </a>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    ${filteredMovies.slice(0, 18).map(movie => {
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };
        const hasCustomLink = !!movieLinks[movie.slug];
        const linkUrl = hasCustomLink ? `watch-simple.html?slug=${movie.slug}` : `movie-detail.html?slug=${movie.slug}`;

        let imgUrl = typeof movieAPI !== 'undefined' ? movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 350, 75) : (movie.poster_url || movie.thumb_url || '');
        if (imgUrl && imgUrl.includes('phimimg.com')) {
            imgUrl = imgUrl.replace('phimimg.com', 'phimimg.com');
        } else if (imgUrl && !imgUrl.startsWith('http')) {
            imgUrl = 'https://phimimg.com/' + imgUrl.replace(/^\//, '');
        }

        return `
                            <a href="${linkUrl}"
                                class="group relative block rounded-xl overflow-hidden hover:opacity-90 transition-all duration-300 ${hiddenUI.containerClass}">
                                <div class="aspect-[2/3] w-full overflow-hidden relative">
                                            <img alt="Xem Phim ${movie.name} (${movie.year}) Full HD Vietsub"
                                                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${hiddenUI.imgClass}"
                                                src="${imgUrl}"
                                                data-tmdb-slug="${movie.slug}"
                                                data-tmdb-id="${movie.tmdb?.id || ''}"
                                                data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                                                data-tmdb-year="${movie.year || ''}"
                                                data-tmdb-type="poster"
                                                loading="lazy"
                                                onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '') : null" />
                                    ${hiddenUI.badge}
                                    ${!hiddenUI.badge ? `
                                    <div class="absolute top-2 left-2 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded">
                                        ${movie.quality || 'HD'}
                                    </div>` : ''}
                                    ${movie.episode_current ? `
                                    <div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                        ${movie.episode_current}
                                    </div>` : ''}
                                    ${hasCustomLink ? `
                                    <div class="absolute bottom-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        <span class="material-icons-round text-[10px]">check_circle</span>
                                    </div>` : ''}
                                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                        <div class="w-10 h-10 bg-primary/90 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                            <span class="material-icons-round text-black text-xl">play_arrow</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="p-4">
                                    <h3 class="text-white font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                        ${movie.name}
                                    </h3>
                                    <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
                                        <span>${movie.year || 'N/A'}</span>
                                        ${movie.tmdb?.vote_average ? `
                                        <span class="flex items-center gap-1 text-yellow-500 font-bold">
                                            <span class="material-icons-round text-[10px]">star</span> 
                                            ${movie.tmdb.vote_average.toFixed(1)}
                                        </span>` : ''}
                                    </div>
                                </div>
                            </a>
                        `;
    }).join('')}
                </div>
            </div>
        </section>
    `;

    container.innerHTML = html;
    console.log('Latest movies section rendered');
}

// Render all movie sections
function renderAllSections(sections) {
    const container = document.getElementById('dynamicSections');
    const loading = document.getElementById('sectionsLoading');

    if (!container) {
        console.error('dynamicSections container not found!');
        return;
    }

    console.log('Rendering sections:', sections.length);

    const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');

    // Filter out Vietnam section (already displayed separately)
    // Lấy TẤT CẢ các sections có phim
    const filteredSections = sections.filter(section => {
        // Bỏ qua section Việt Nam và Hành Động (đã hiển thị riêng)
        if (section.slug === 'viet-nam' || section.name?.toLowerCase().includes('việt nam') ||
            section.slug === 'hanh-dong' || section.name?.toLowerCase().includes('hành động')) {
            return false;
        }

        // Chỉ lấy sections có items và items là array có phần tử
        const hasItems = Array.isArray(section.items) && section.items.length > 0;

        if (!hasItems) {
            console.log('Skipping section (no items):', section.name, 'slug:', section.slug);
        }

        return hasItems;
    });

    console.log('Filtered sections:', filteredSections.length, filteredSections.map(s => s.name));

    // Check if sections have items
    filteredSections.forEach((section, i) => {
        console.log(`Section ${i}: ${section.name}, items:`, section.items?.length || 0);
    });

    // Hide loading
    if (loading) {
        loading.style.display = 'none';
    }

    const html = filteredSections.map((section, index) => {
        const bgClass = 'bg-transparent';

        return `
            <section class="py-1 md:py-1 ${bgClass}">
                <div class="w-full px-4 md:px-10 lg:px-16">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-3xl font-bold text-white flex items-center gap-3">
                            <span class="w-1.5 h-8 bg-primary rounded-full block shadow-[0_0_10px_rgba(242,242,13,0.5)]"></span>
                            ${section.name || 'Phim'}
                        </h2>
                        ${section.slug ? `
                        <a href="search.html?category=${section.slug}"
                            class="text-primary text-sm font-semibold hover:text-white transition-colors flex items-center gap-1 group">
                            Xem tất cả <span class="material-icons-round text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </a>
                        ` : ''}
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        ${(section.items || []).slice(0, 20).map(movie => {
            const hasCustomLink = !!movieLinks[movie.slug];
            const linkUrl = hasCustomLink ? `watch-simple.html?slug=${movie.slug}` : `movie-detail.html?slug=${movie.slug}`;
            const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

            let imgUrl = typeof movieAPI !== 'undefined' ? movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 350, 75) : (movie.poster_url || movie.thumb_url || '');
            if (imgUrl && imgUrl.includes('phimimg.com')) {
                imgUrl = imgUrl.replace('phimimg.com', 'phimimg.com');
            } else if (imgUrl && !imgUrl.startsWith('http')) {
                imgUrl = 'https://phimimg.com/' + imgUrl.replace(/^\//, '');
            }

            return `
                                <a href="${linkUrl}"
                                    class="group relative block rounded-xl overflow-hidden hover:opacity-90 transition-all duration-300 ${hiddenUI.containerClass}">
                                    <div class="aspect-[2/3] w-full overflow-hidden relative">
                                        <img alt="Xem Phim ${movie.name} (${movie.year}) Vietsub"
                                            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${hiddenUI.imgClass}"
                                            src="${imgUrl}"
                                            data-tmdb-slug="${movie.slug}"
                                            data-tmdb-id="${movie.tmdb?.id || ''}"
                                            data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                                            data-tmdb-year="${movie.year || ''}"
                                            data-tmdb-type="poster"
                                            loading="lazy"
                                            onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '') : null" />
                                        ${hiddenUI.badge}
                                        ${!hiddenUI.badge ? `
                                        <div class="absolute top-2 left-2 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded">
                                            ${movie.quality || 'HD'}
                                        </div>` : ''}
                                        ${movie.episode_current ? `
                                        <div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                            ${movie.episode_current}
                                        </div>` : ''}
                                        ${hasCustomLink ? `
                                        <div class="absolute bottom-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                            <span class="material-icons-round text-[10px]">check_circle</span>
                                        </div>` : ''}
                                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                                            <div class="w-10 h-10 bg-primary/90 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                                                <span class="material-icons-round text-black text-xl">play_arrow</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="p-4">
                                        <h3 class="text-white font-semibold truncate group-hover:text-primary transition-colors">
                                            ${movie.name}
                                        </h3>
                                        <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
                                            <span>${movie.year || 'N/A'}</span>
                                            <span class="flex items-center gap-1 text-yellow-500 font-bold">
                                                <span class="material-icons-round text-[10px]">star</span> 
                                                ${movie.tmdb?.vote_average?.toFixed(1) || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </a>
                            `;
        }).join('')}
                    </div>
                </div>
            </section>
        `;
    }).join('');

    container.innerHTML = html;
    console.log('Sections rendered, HTML length:', html.length);
}

// Fallback function - load Vietnamese movies
async function loadVietnameseMoviesHome() {
    try {
        const response = await movieAPI.fetchWithFallback('/quoc-gia/viet-nam?page=1&limit=20', {
            method: 'GET',
            headers: { 'accept': 'application/json' }
        }, 'phimapi');

        const data = await response.json();

        if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
            const movies = data.data.items.slice(0, 20);
            renderVietnameseMovies(movies);
        }
    } catch (error) {
        console.error('Error loading Vietnamese movies:', error);
        const loading = document.getElementById('vietnamLoading');
        if (loading) {
            loading.innerHTML = `<p class="text-red-400">Không thể tải phim Việt Nam</p>`;
        }
    }
}

function renderVietnameseMovies(movies) {
    const loading = document.getElementById('vietnamLoading');
    const grid = document.getElementById('vietnamMoviesGrid');

    if (!loading || !grid) return;

    loading.classList.add('hidden');
    grid.classList.remove('hidden');

    const movieLinks = JSON.parse(localStorage.getItem('movieLinks') || '{}');

    grid.innerHTML = movies.map(movie => {
        const hasCustomLink = !!movieLinks[movie.slug];
        const linkUrl = hasCustomLink ? `watch-simple.html?slug=${movie.slug}` : `movie-detail.html?slug=${movie.slug}`;
        const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };

        let imgUrl = typeof movieAPI !== 'undefined' ? movieAPI.getImageURL(movie.poster_url || movie.thumb_url, 350, 75) : (movie.poster_url || movie.thumb_url || '');
        if (imgUrl && imgUrl.includes('phimimg.com')) {
            imgUrl = imgUrl.replace('phimimg.com', 'phimimg.com');
        } else if (imgUrl && !imgUrl.startsWith('http')) {
            imgUrl = 'https://phimimg.com/' + imgUrl.replace(/^\//, '');
        }

        return `
        <a href="${linkUrl}"
            class="group relative block rounded-xl overflow-hidden hover:opacity-90 transition-all duration-300 movie-card-w-sm ${hiddenUI.containerClass}">
            <div class="aspect-[2/3] w-full overflow-hidden relative">
                <img alt="Xem Phim ${movie.name} (${movie.year}) Thuyết Minh Vietsub"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${hiddenUI.imgClass}"
                    src="${imgUrl}"
                    data-tmdb-slug="${movie.slug}"
                    data-tmdb-id="${movie.tmdb?.id || ''}"
                    data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                    data-tmdb-year="${movie.year || ''}"
                    data-tmdb-type="poster"
                    loading="lazy"
                    onerror="window.autoHealMovieImage ? window.autoHealMovieImage(this, typeof movie !== 'undefined' ? movie.slug : '') : null"
                    />
                ${hiddenUI.badge}
                ${!hiddenUI.badge ? `
                <div class="absolute top-2 left-2 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded">
                    ${movie.quality || 'HD'}
                </div>` : ''}
                ${movie.episode_current ? `
                <div class="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    ${movie.episode_current}
                </div>` : ''}
                ${hasCustomLink ? `
                <div class="absolute bottom-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span class="material-icons-round text-[10px]">check_circle</span> Có link
                </div>` : ''}
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                    <div class="w-10 h-10 bg-primary/90 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <span class="material-icons-round text-black text-xl">play_arrow</span>
                    </div>
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-white font-semibold truncate group-hover:text-primary transition-colors">
                    ${movie.name}
                </h3>
                <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>${movie.year || 'N/A'}</span>
                    <span class="flex items-center gap-1 text-yellow-500 font-bold">
                        <span class="material-icons-round text-[10px]">star</span> 
                        ${movie.tmdb?.vote_average?.toFixed(1) || 'N/A'}
                    </span>
                </div>
            </div>
        </a>
    `;
    }).join('');
}

// Auto load on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHomeMovies);
} else {
    loadHomeMovies();
}

// Re-render when hidden movies are synced from backend to ensure badges appear correctly
window.addEventListener('hiddenMoviesSynced', () => {
    console.log('Hidden movies synced, re-rendering home sections...');
    loadHomeMovies();
});
