const ADMIN_STORAGE_KEYS = {
    ADMIN_TOKEN: 'aphim_admin_token',
    ADMIN_USER:  'aphim_admin_user'
};

// ============================================================
// API Configuration — APhim Super (Supabase + MongoDB Backend)
// ============================================================
const BACKEND_OPTIONS = {
    // Server Express local (chạy cùng domain) — KHÔNG dùng Railway cũ nữa
    LOCAL: window.location.origin,
    // Production domain
    PRODUCTION: 'https://aphim.io.vn'
};

// Tự động detect môi trường
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let chosenBackend = isLocal ? BACKEND_OPTIONS.LOCAL : BACKEND_OPTIONS.PRODUCTION;

// Xóa cache backend cũ (Railway)
try {
    const oldKeys = ['cinestream_active_backend','cinestream_new_backend_active','cinestream_admin_token','cinestream_admin_user'];
    oldKeys.forEach(k => localStorage.removeItem(k));
} catch(e) {}

// Default API Configuration
const API_CONFIG = {
    BACKEND_URL: chosenBackend + '/api',

    // Nguồn phim (external APIs — không thay đổi)
    OPHIM_URL:   'https://ophim1.com/v1/api',
    OPHIM17_URL: 'https://ophim1.com',
    NGUONC_URL:  'https://phim.nguonc.com/api/films',
    NGUONC_DETAIL_URL: 'https://phim.nguonc.com/api/film',

    ENDPOINTS: {
        HOME: '/home', MOVIE_LIST: '/danh-sach/phim-bo', MOVIE_DETAIL: '/phim',
        SEARCH: '/tim-kiem', CATEGORY: '/the-loai', COUNTRY: '/quoc-gia', YEAR: '/nam-phat-hanh'
    },
    IMAGE_BASE: 'https://phimimg.com/',
    IMAGE_BASE_BACKUP: 'https://phimimg.com/uploads/movies/',
    STREAM_BASE: 'https://vip.opstream13.com',

    USE_BACKEND_FOR_MOVIES: false,
    USE_BACKEND_FOR_AUTH: true,
    USE_MULTIPLE_SOURCES: false,
    CATEGORY_BACKGROUNDS: {},
    HERO_THUMBNAILS: []
};

// Firebase Config MỚI (aphim-super-new)
window.FIREBASE_CONFIG_NEW = {
    apiKey: 'AIzaSyBoB2gTGuPAVy_HyYv4j3b7NU9rbTVQmno',
    authDomain: 'aphim-super-new.firebaseapp.com',
    projectId: 'aphim-super-new',
    storageBucket: 'aphim-super-new.firebasestorage.app',
    messagingSenderId: '276319755678',
    appId: '1:276319755678:web:4d74442ea51112e6e4ca8f',
    measurementId: 'G-WX2RYSDNPC',
    databaseURL: 'https://aphim-super-new-default-rtdb.firebaseio.com'
};

// ─ ─Dynamic Configuration Override ─ 
// Apply cached config immediately for fast render
try {
    const cachedConfigStr = localStorage.getItem('cinestream_public_settings');
    if (cachedConfigStr) {
        const cachedContent = JSON.parse(cachedConfigStr);
        if (cachedContent.apiBase) {
            API_CONFIG.OPHIM_URL = cachedContent.apiBase;
        } else {
            API_CONFIG.OPHIM_URL = 'https://ophim1.com/v1/api';
            // Clear broken cached apiBase
            delete cachedContent.apiBase;
            localStorage.setItem('cinestream_public_settings', JSON.stringify(cachedContent));
        }
        if (cachedContent.apiSecondary && !cachedContent.apiSecondary.includes('_next/data') && !cachedContent.apiSecondary.includes('ophim17.cc')) {
            API_CONFIG.OPHIM17_URL = cachedContent.apiSecondary;
        } else {
            API_CONFIG.OPHIM17_URL = 'https://ophim1.com'; // fallback khi URL cũ hỏng
        }
        if (typeof cachedContent.enableMultipleSources === 'boolean') API_CONFIG.USE_MULTIPLE_SOURCES = cachedContent.enableMultipleSources;
        if (cachedContent.watermarkUrl) API_CONFIG.WATERMARK_URL = cachedContent.watermarkUrl;
        if (typeof cachedContent.enableWatermark === 'boolean') API_CONFIG.ENABLE_WATERMARK = cachedContent.enableWatermark;
        if (typeof cachedContent.enablePhimX === 'boolean') API_CONFIG.ENABLE_PHIM_X = cachedContent.enablePhimX;
        if (typeof cachedContent.maintenanceMode === 'boolean') API_CONFIG.MAINTENANCE_MODE = cachedContent.maintenanceMode;
        if (typeof cachedContent.allowRegister === 'boolean') API_CONFIG.ALLOW_REGISTER = cachedContent.allowRegister;
        if (typeof cachedContent.allowComments === 'boolean') API_CONFIG.ALLOW_COMMENTS = cachedContent.allowComments;
        if (cachedContent.categoryBackgrounds) API_CONFIG.CATEGORY_BACKGROUNDS = cachedContent.categoryBackgrounds;
        if (cachedContent.heroThumbnails) API_CONFIG.HERO_THUMBNAILS = cachedContent.heroThumbnails;
    }
} catch (e) { console.error('Cache config read error:', e); }

// Fetch fresh config in background
(async function syncServerConfig() {
    try {
        const res = await fetch(`${API_CONFIG.BACKEND_URL}/settings/public`).catch(() => null);
        if (!res || !res.ok) return;
        const data = await res.json();
        if (data && data.success && data.data) {
            const { content, general } = data.data;
            let configMap = {
                apiBase: (content?.apiBase && !content.apiBase.includes('_next/data')) ? content.apiBase : 'https://ophim1.com/v1/api',
                apiSecondary: (content?.apiSecondary && !content.apiSecondary.includes('_next/data') && !content.apiSecondary.includes('ophim17.cc')) ? content.apiSecondary : 'https://ophim1.com',
                enableMultipleSources: content?.enableMultipleSources,
                enableWatermark: content?.enableWatermark,
                watermarkUrl: content?.watermarkUrl,
                enablePhimX: content?.enablePhimX,
                autoplayDelay: content?.autoplayDelay,
                defaultServer: content?.defaultServer,
                logoUrl: general?.logoUrl,
                maintenanceMode: general?.maintenanceMode,
                allowRegister: general?.allowRegister,
                allowComments: general?.allowComments,
                siteName: general?.siteName,
                categoryBackgrounds: content?.categoryBackgrounds,
                heroThumbnails: content?.heroThumbnails
            };
            
            // Check diff
            const oldStr = localStorage.getItem('cinestream_public_settings');
            const newStr = JSON.stringify(configMap);
            
            if (oldStr !== newStr) {
                localStorage.setItem('cinestream_public_settings', newStr);
                // Dispatch event — pages listen to update UI live
                window.dispatchEvent(new CustomEvent('configSynced', { detail: configMap }));
                
                // Override runtime values
                if (configMap.apiBase) API_CONFIG.OPHIM_URL = configMap.apiBase;
                if (configMap.apiSecondary && !configMap.apiSecondary.includes('_next/data')) API_CONFIG.OPHIM17_URL = configMap.apiSecondary;
                if (typeof configMap.enableMultipleSources === 'boolean') API_CONFIG.USE_MULTIPLE_SOURCES = configMap.enableMultipleSources;
                if (configMap.watermarkUrl) API_CONFIG.WATERMARK_URL = configMap.watermarkUrl;
                if (typeof configMap.enableWatermark === 'boolean') API_CONFIG.ENABLE_WATERMARK = configMap.enableWatermark;
                if (typeof configMap.enablePhimX === 'boolean') API_CONFIG.ENABLE_PHIM_X = configMap.enablePhimX;
                if (typeof configMap.maintenanceMode === 'boolean') API_CONFIG.MAINTENANCE_MODE = configMap.maintenanceMode;
                if (typeof configMap.allowRegister === 'boolean') API_CONFIG.ALLOW_REGISTER = configMap.allowRegister;
                if (typeof configMap.allowComments === 'boolean') API_CONFIG.ALLOW_COMMENTS = configMap.allowComments;
                if (configMap.categoryBackgrounds) API_CONFIG.CATEGORY_BACKGROUNDS = configMap.categoryBackgrounds;
                if (configMap.heroThumbnails) API_CONFIG.HERO_THUMBNAILS = configMap.heroThumbnails;
            }
        }
    } catch (e) {}
})();

// App Configuration
const APP_CONFIG = {
    ITEMS_PER_PAGE: 20,
    VIDEO_QUALITIES: ['360p', '480p', '720p', '1080p', '4K'],
    PLAYBACK_SPEEDS: [0.5, 0.75, 1, 1.25, 1.5, 2],
    SUBSCRIPTION_PLANS: {
        FREE: {
            id: 'FREE',
            name: 'Cơ bản',
            price: 0,
            features: ['Xem phim miễn phí', 'Chất lượng SD', 'Có quảng cáo'],
            quality: 'SD', devices: 1,
            ads: true,
            coinsReward: 0
        },
        PREMIUM: {
            id: 'PREMIUM',
            name: 'Cao cấp',
            price: 69000,
            features: ['Không quảng cáo', 'Chất lượng Full HD', 'Tải phim offline', 'Tặng 5.000 Xu'],
            quality: 'FHD', devices: 3,
            ads: false,
            coinsReward: 5000
        },
        FAMILY: {
            id: 'FAMILY',
            name: 'Gia đình',
            price: 699000,
            features: ['Không quảng cáo', 'Chất lượng 4K', 'Tải phim offline', 'Chia sẻ 5 màn hình', 'Tặng 50.000 Xu'],
            quality: '4K', devices: 5,
            ads: false,
            yearly: true,
            coinsReward: 50000
        }
    }
};

// Backward compatibility and Global Helper
const API_BASE_URL = chosenBackend;

// Global helper to get base URL without /api suffix
window.getBackendBaseURL = function() {
    if (window.API_CONFIG && window.API_CONFIG.BACKEND_URL) {
        return window.API_CONFIG.BACKEND_URL.replace(/\/api$/, '');
    }
    return API_BASE_URL;
};

// Global Sync for Hidden Movies
// We dispatch 'hiddenMoviesSynced' event when done
window.is_hidden_movies_synced = false;

(async function syncHiddenMovies() {
    try {
        const res = await fetch(`${API_CONFIG.BACKEND_URL}/movies/hidden/list`).catch(() => null);
        if (!res || !res.ok) { window.is_hidden_movies_synced = true; return; }
        const data = await res.json();
        if (data && data.success) {
            localStorage.setItem('cinestream_hidden_movies', JSON.stringify(data.data));
            window.is_hidden_movies_synced = true;
            window.dispatchEvent(new CustomEvent('hiddenMoviesSynced', { detail: data.data }));
        }
    } catch (e) {
        window.is_hidden_movies_synced = true;
    }
})();

// Real-time synchronization for hidden movies across different origins/tabs
setInterval(async () => {
    // Only poll if the tab is currently active/visible to save resources
    if (document.hidden) return;
    
    try {
        const res = await fetch(`${API_CONFIG.BACKEND_URL}/movies/hidden/list`);
        const data = await res.json();
        if (data && data.success) {
            const currentDataStr = localStorage.getItem('cinestream_hidden_movies');
            const newDataStr = JSON.stringify(data.data);
            
            // Only dispatch event if data has actually changed
            if (currentDataStr !== newDataStr) {
                localStorage.setItem('cinestream_hidden_movies', newDataStr);
                window.is_hidden_movies_synced = true;
                window.dispatchEvent(new CustomEvent('hiddenMoviesSynced', { detail: data.data }));
            }
        }
    } catch (e) {
        // Silently fail during polling if backend is unreachable
    }
}, 120000); // Polling every 120 seconds (2 minutes) to save server resources

// Utility helper: Trả về đối tượng CSS class & HTML badge
window.getHiddenMovieOverlay = function(slug) {
    const hidden = JSON.parse(localStorage.getItem('cinestream_hidden_movies') || '[]');
    if (hidden && Array.isArray(hidden) && hidden.includes(slug)) {
        return {
            badge: `<div class="absolute top-2 left-2 z-30 pointer-events-none">
                <div class="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-2xl flex items-center gap-2 transform transition-transform group-hover:scale-105">
                    <div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
                    <span class="text-white text-[10px] font-black uppercase tracking-[0.15em] drop-shadow-sm">Đang Ẩn</span>
                </div>
            </div>`,
            imgClass: 'grayscale brightness-[0.3] contrast-[0.8] blur-[1px] opacity-80 transition-all duration-700',
            containerClass: 'pointer-events-none select-none touch-none cursor-not-allowed filter-none' // Filter none to keep badge clear
        };
    }
    return { badge: '', imgClass: '', containerClass: '' };
};


// 🚀 BACKEND HEALTH CHECK: Kiểm tra backend mới có sống không, log ra console
(async function checkNewBackend() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${BACKEND_OPTIONS.NEW}/api/settings/public`, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (res.ok) {
            console.log('✅ [Backend] Railway e45a is online and healthy.');
        } else {
            console.warn('⚠️ [Backend] Railway e45a returned status:', res.status);
        }
    } catch (e) {
        console.warn('⚠️ [Backend] Could not reach Railway e45a:', e.message);
    }
})();

// Initialize Global Lottie Icons (Replaces static icons with premium Lottie animations)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lottie === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
        script.onload = () => {
            injectGlobalLottieStyles();
            initLottieSearchGlobal();
            initLottieUserGlobal();
        };
        document.head.appendChild(script);
    } else {
        injectGlobalLottieStyles();
        initLottieSearchGlobal();
        initLottieUserGlobal();
    }

    function injectGlobalLottieStyles() {
        if (!document.getElementById('lottie-global-styles')) {
            const style = document.createElement('style');
            style.id = 'lottie-global-styles';
            style.textContent = `
                /* Global Search Lottie Icon Color overrides */
                .search-lottie-icon svg path,
                .search-lottie-icon svg [stroke] {
                    stroke: #FFFA07 !important;
                }
                .search-lottie-icon svg [fill]:not([fill="none"]) {
                    fill: #FFFA07 !important;
                }

                /* Hide the Lottie background box and any extra square outline layers */
                .user-lottie-icon svg g[aria-label*="background"],
                .user-lottie-icon svg g[id*="background"],
                .user-lottie-icon svg g[class*="background"],
                .user-lottie-icon svg [aria-label*="background"] path,
                .user-lottie-icon svg [id*="background"] path {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                }

                /* Global User Profile Lottie Icon Color — Trắng #FFFFFF trên nền vàng */
                .user-lottie-icon svg path,
                .user-lottie-icon svg [stroke] {
                    stroke: #FFFFFF !important;
                    stroke-width: 2.2px !important;
                }
                .user-lottie-icon svg path {
                    fill: #000000 !important;
                    fill-opacity: 1 !important;  /* Override fill-opacity="0" từ JSON */
                }

                /* Vertically align icon and text inside login button */
                .nav-auth-btn {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                }

                .user-lottie-icon {
                    vertical-align: middle !important;
                    margin-bottom: 4px !important;
                    margin-right: -4px !important; /* Desktop: kéo chữ sát icon */
                }

                /* ── Mobile: icon đứng một mình → reset margin, căn giữa thực sự ── */
                @media (max-width: 768px) {
                    .user-lottie-icon {
                        margin: 0 !important;
                        width: 36px !important;
                        height: 36px !important;
                        overflow: hidden !important;
                    }
                    /* Scale SVG 2.2x → zoom vào hình người vốn chỉ chiếm 42% canvas 48x48 */
                    .user-lottie-icon svg {
                        transform: scale(1.9) translateY(-2px) !important;
                        transform-origin: center !important;
                    }
                    /* Giảm stroke vì scale đã phóng to rồi */
                    .user-lottie-icon svg path,
                    .user-lottie-icon svg [stroke] {
                        stroke-width: 1.8px !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function initLottieSearchGlobal() {
        return; // Disabled lottie icon replacement to keep crisp SVG search icons without 404 errors
        icons.forEach(icon => {
            if (icon.textContent.trim() === 'search' || icon.classList.contains('search-icon') || icon.classList.contains('mobile-inline-search-icon')) {
                if (icon.hasAttribute('data-lottie-initialized')) return;
                
                const lottieContainer = document.createElement('div');
                lottieContainer.className = icon.className;
                lottieContainer.classList.remove('material-icons-round', 'material-icons', 'material-icons-outlined', 'text-gray-500');
                lottieContainer.classList.add('search-lottie-icon');
                
                // Add specific styling - using content-box to keep padding outer bounds intact
                lottieContainer.style.setProperty('width', '24px', 'important');
                lottieContainer.style.setProperty('height', '24px', 'important');
                lottieContainer.style.setProperty('box-sizing', 'content-box', 'important');
                lottieContainer.style.setProperty('display', 'inline-flex', 'important');
                lottieContainer.style.setProperty('align-items', 'center', 'important');
                lottieContainer.style.setProperty('justify-content', 'center', 'important');
                lottieContainer.style.setProperty('cursor', 'pointer', 'important');
                lottieContainer.setAttribute('data-lottie-initialized', 'true');
                
                icon.parentNode.insertBefore(lottieContainer, icon);
                icon.remove();

                const anim = lottie.loadAnimation({
                    container: lottieContainer,
                    renderer: 'svg',
                    loop: true,
                    autoplay: false,
                    path: '/icons/search-zoom.json?v=3'
                });

                const triggerArea = lottieContainer.closest('form') || lottieContainer.parentNode;
                
                triggerArea.addEventListener('mouseenter', () => {
                    anim.play();
                });
                triggerArea.addEventListener('mouseleave', () => {
                    anim.stop();
                });

                lottieContainer.addEventListener('click', (e) => {
                    const input = triggerArea.querySelector('input');
                    if (input) {
                        e.preventDefault();
                        input.focus();
                    } else if (triggerArea.tagName === 'FORM') {
                        triggerArea.submit();
                    }
                });
            }
        });
    }

    function initLottieUserGlobal() {
        const replaceUserIcon = (icon) => {
            if (icon.hasAttribute('data-lottie-initialized')) return;
            icon.setAttribute('data-lottie-initialized', 'true');

            const lottieContainer = document.createElement('div');
            lottieContainer.className = icon.className;
            lottieContainer.classList.remove('material-icons-round', 'material-icons', 'material-icons-outlined', 'text-gray-500');
            lottieContainer.classList.add('user-lottie-icon');

            // Desktop: 20px (gốc). Mobile: CSS media query override lên 36px
            lottieContainer.style.width = '20px';
            lottieContainer.style.height = '20px';
            lottieContainer.style.setProperty('box-sizing', 'content-box', 'important');
            lottieContainer.style.setProperty('display', 'inline-flex', 'important');
            lottieContainer.style.setProperty('align-items', 'center', 'important');
            lottieContainer.style.setProperty('justify-content', 'center', 'important');

            icon.parentNode.insertBefore(lottieContainer, icon);
            icon.remove();

            const anim = lottie.loadAnimation({
                container: lottieContainer,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: '/icons/user-profile.json?v=4'
            });

            anim.setSpeed(0.6); // 0.5-0.7x speed
        };

        const scanAndReplace = () => {
            const authBtns = document.querySelectorAll('.nav-auth-btn');
            authBtns.forEach(authBtn => {
                const icon = authBtn.querySelector('.material-icons-round, .material-icons, .material-icons-outlined');
                if (icon && (icon.textContent.trim() === 'person' || icon.classList.contains('person-icon'))) {
                    replaceUserIcon(icon);
                }
            });
        };

        // 1. Initial scan & replace
        scanAndReplace();

        // 2. Set up MutationObserver to automatically handle dynamic updates (e.g. from user-ui.js)
        let isScanning = false;
        const observer = new MutationObserver((mutations) => {
            if (isScanning) return;
            const hasAuthChange = mutations.some(m => {
                return Array.from(m.addedNodes).some(node => node.nodeType === 1 && (node.matches ? (node.matches('.nav-auth-btn') || node.querySelector('.nav-auth-btn')) : false));
            });
            if (hasAuthChange) {
                isScanning = true;
                scanAndReplace();
                setTimeout(() => { isScanning = false; }, 200);
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
});

