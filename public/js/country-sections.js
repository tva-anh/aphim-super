// Country Sections - Unified Frame Layout with Landscape Cards
// Phim Hàn Quốc, Trung Quốc, US-UK

const COUNTRY_CONFIGS = {
    korea: {
        id: 'korea',
        title: 'Phim Hàn Quốc mới',
        endpoint: '/quoc-gia/han-quoc?limit=20',
        linkUrl: 'phim-theo-quoc-gia.html?country=han-quoc'
    },
    china: {
        id: 'china',
        title: 'Phim Trung Quốc mới',
        endpoint: '/quoc-gia/trung-quoc?limit=20',
        linkUrl: 'phim-theo-quoc-gia.html?country=trung-quoc'
    },
    usuk: {
        id: 'usuk',
        title: 'Phim US-UK mới',
        endpoint: '/quoc-gia/au-my?limit=20',
        linkUrl: 'phim-theo-quoc-gia.html?country=au-my'
    }
};

// Create Landscape Movie Card
function createLandscapeMovieCard(movie) {
    const rawImg = movie.poster_url || movie.thumb_url || '';
    const posterUrl = (typeof imageOptimizer !== 'undefined' && rawImg)
        ? imageOptimizer.optimizeImageUrl(rawImg, 480, 70)
        : (rawImg.startsWith('http') ? rawImg : `https://phimimg.com/${rawImg}`);
    const detailUrl = `movie-detail.html?slug=${movie.slug}`;
    const hiddenUI = window.getHiddenMovieOverlay ? window.getHiddenMovieOverlay(movie.slug) : { badge: '', imgClass: '', containerClass: '' };
    
    const quality = movie.quality || movie.lang || 'HD';
    
    return `
        <div class="landscape-card ${hiddenUI.containerClass}">
            <a href="${detailUrl}">
                <div class="landscape-poster">
                    <img data-src="${posterUrl}" 
                         alt="${movie.name}" 
                         class="${hiddenUI.imgClass}"
                         data-tmdb-slug="${movie.slug}"
                         data-tmdb-id="${movie.tmdb?.id || ''}"
                         data-tmdb-name="${(movie.name || '').replace(/"/g, '&quot;')}"
                         data-tmdb-year="${movie.year || ''}"
                         data-tmdb-type="poster"
                         src="data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E"
                         onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23111%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%23555%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 font-family=%22sans-serif%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'"
                         loading="lazy" />
                    
                    <div class="landscape-overlay"></div>
                    
                    ${hiddenUI.badge}
                    <div class="landscape-badge">${quality}</div>
                    
                    <div class="landscape-play">
                        <div class="landscape-play-icon">
                            <span class="material-icons-round">play_arrow</span>
                        </div>
                    </div>
                </div>
                
                <div class="landscape-info">
                    <h3 class="landscape-title">${movie.name}</h3>
                    <p class="landscape-subtitle">${movie.origin_name || ''}</p>
                </div>
            </a>
        </div>
    `;
}

// Create a single row inside the unified frame
function createCountryRow(config) {
    return `
        <div class="country-row" id="row-${config.id}">
            <!-- Left: Title Column -->
            <div class="country-title-col">
                <h2 class="country-main-title">${config.title}</h2>
                <a href="${config.linkUrl}" class="country-view-all">
                    Xem toàn bộ 
                    <span class="material-icons-round text-sm">arrow_forward_ios</span>
                </a>
            </div>
            
            <!-- Right: Content Column -->
            <div class="country-content-col">
                <!-- Navigation Arrows -->
                <button onclick="scrollRows('${config.id}', 'left')" class="nav-arrow nav-arrow-left">
                    <span class="material-icons-round">chevron_left</span>
                </button>
                <button onclick="scrollRows('${config.id}', 'right')" class="nav-arrow nav-arrow-right">
                    <span class="material-icons-round">chevron_right</span>
                </button>
                
                <div id="${config.id}Container" class="country-scroll-container">
                    <!-- Loading placeholder items -->
                    <div class="animate-pulse flex gap-4 w-full">
                        <div class="bg-white/5 rounded-xl aspect-video w-[250px] flex-shrink-0"></div>
                        <div class="bg-white/5 rounded-xl aspect-video w-[250px] flex-shrink-0"></div>
                        <div class="bg-white/5 rounded-xl aspect-video w-[250px] flex-shrink-0"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load movies for each row
async function loadRowMovies(config) {
    const container = document.getElementById(`${config.id}Container`);
    if (!container) return;

    try {
        const response = await movieAPI.fetchWithFallback(config.endpoint);
        const rawData = await response.json();
        const data = movieAPI.normalizeResponse(rawData);
        const items = data?.data?.items || [];

        if (items && items.length > 0) {
            const movies = items.slice(0, 15);
            container.innerHTML = movies.map(movie => createLandscapeMovieCard(movie)).join('');
        } else {
            container.innerHTML = `<p class="text-gray-400 p-4">Không thể tải phim</p>`;
        }
    } catch (error) {
        console.error(`Error loading ${config.id} row:`, error);
        container.innerHTML = `<p class="text-red-400 p-4">Không thể tải phim</p>`;
    }
}

// Scroll function
function scrollRows(id, direction) {
    const container = document.getElementById(`${id}Container`);
    if (!container) return;
    
    const amount = container.clientWidth * 0.8;
    container.scrollBy({
        left: direction === 'right' ? amount : -amount,
        behavior: 'smooth'
    });
}

// Init Function
function initUnifiedCountryFrame() {
    // We want to insert this before the Top Hot movies section as before
    const insertionPoint = document.querySelector('section.top-movies-section');
    if (!insertionPoint) return;

    // Check if hero banner bridge already exists
    const hasBridge = !!document.querySelector('.hero-to-content-bridge');
    const bridgeClass = hasBridge ? '' : 'hero-to-content-bridge';

    const html = `
        <section class="pb-6 md:pb-8 pt-0 ${bridgeClass}">
            <div class="container mx-auto px-6">
                <div class="country-unified-frame">
                    ${Object.values(COUNTRY_CONFIGS).map(config => createCountryRow(config)).join('')}
                </div>
            </div>
        </section>
    `;

    insertionPoint.insertAdjacentHTML('beforebegin', html);

    // Initial load
    Object.values(COUNTRY_CONFIGS).forEach(config => {
        loadRowMovies(config);
    });
}

// Run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUnifiedCountryFrame);
} else {
    initUnifiedCountryFrame();
}

// Bind to window
window.scrollRows = scrollRows;
