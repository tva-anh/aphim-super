// TMDB API Integration for Actor Images
// Proxied securely through backend /api/tmdb to hide API key

const TMDB_PROXY_BASE = '/api/tmdb';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

// Wrapper to fetch TMDB data directly & cleanly
async function fetchWithProxy(targetUrl) {
    try {
        const response = await fetch(targetUrl);
        if (response && response.ok) return response;
    } catch (err) {}
    return { ok: false };
}

// Load actor images from TMDB based on movie data
async function loadActorImagesFromTMDB(movie) {
    if (!movie) return false;

    // Check cache first
    const cacheKey = `tmdb_actors_${movie.slug}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        const cachedData = JSON.parse(cached);
        updateActorAvatars(movie.actor, cachedData);
        return true;
    }

    try {
        // Try exact TMDB ID matching first if provided by Ophim API
        if (movie.tmdb && movie.tmdb.id && String(movie.tmdb.id).trim() !== '') {
            try {
                const tmdbType = movie.tmdb.type === 'tv' ? 'tv' : 'movie';
                const tmdbId = movie.tmdb.id;
                
                const creditsUrl = `${TMDB_PROXY_BASE}/${tmdbType}/${tmdbId}/credits`;
                const creditsResponse = await fetchWithProxy(creditsUrl);
                
                if (creditsResponse.ok) {
                    const creditsData = await creditsResponse.json();
                    if (creditsData.cast && creditsData.cast.length > 0) {
                        sessionStorage.setItem(cacheKey, JSON.stringify(creditsData.cast));
                        updateActorAvatars(movie.actor, creditsData.cast);
                        return true;
                    }
                }
            } catch (err) {}
        }

        // Try multiple search strategies (Fallback if TMDB ID is missing)
        const searchStrategies = [
            { query: movie.origin_name, year: movie.year, label: 'origin name + year' },
            { query: movie.name, year: movie.year, label: 'VN name + year' },
            { query: movie.origin_name, year: null, label: 'origin name only' },
            { query: movie.name, year: null, label: 'VN name only' }
        ];

        for (const strategy of searchStrategies) {
            if (!strategy.query) continue;

            const searchQuery = encodeURIComponent(strategy.query);
            const yearParam = strategy.year ? `&year=${strategy.year}` : '';
            const searchUrl = `${TMDB_PROXY_BASE}/search/movie?query=${searchQuery}${yearParam}`;

            try {
                const searchResponse = await fetchWithProxy(searchUrl);
                if (!searchResponse || !searchResponse.ok) continue;

                const searchData = await searchResponse.json();

                if (searchData.results && searchData.results.length > 0) {
                    const tmdbMovie = searchData.results[0];

                    // Get movie credits
                    const creditsUrl = `${TMDB_PROXY_BASE}/movie/${tmdbMovie.id}/credits`;
                    const creditsResponse = await fetchWithProxy(creditsUrl);
                    if (!creditsResponse || !creditsResponse.ok) continue;
                    const creditsData = await creditsResponse.json();

                    if (creditsData.cast && creditsData.cast.length > 0) {
                        sessionStorage.setItem(cacheKey, JSON.stringify(creditsData.cast));
                        updateActorAvatars(movie.actor, creditsData.cast);
                        return true;
                    }
                }
            } catch (err) {
                continue;
            }
        }

        return false;

    } catch (error) {
        return false;
    }
}

// Try searching for actors directly by name
async function trySearchActorsDirectly(movie) {
    if (!movie.actor || movie.actor.length === 0) {
        console.log('⚠️ No actors to search for');
        return false;
    }

    console.log('🔍 Searching for actors directly...');
    const actorElements = document.querySelectorAll('[data-actor-name]');
    let foundCount = 0;

    // Search for each actor individually
    for (let i = 0; i < Math.min(movie.actor.length, 10); i++) {
        const actorName = movie.actor[i];
        const actorElement = actorElements[i];

        if (!actorElement) continue;

        try {
            const searchQuery = encodeURIComponent(actorName);
            const searchUrl = `${TMDB_PROXY_BASE}/search/person?query=${searchQuery}`;

            const response = await fetchWithProxy(searchUrl);
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const actor = data.results[0];

                if (actor.profile_path) {
                    const imageUrl = TMDB_IMAGE_BASE + actor.profile_path;

                    const avatarContainer = actorElement.querySelector('.actor-avatar-container');
                    if (avatarContainer) {
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.alt = actorName;
                        img.className = 'w-full h-full object-cover';

                        img.onload = () => {
                            avatarContainer.innerHTML = '';
                            avatarContainer.appendChild(img);

                            const gradientClasses = [
                                'bg-gradient-to-br', 'from-red-500', 'to-red-700',
                                'from-blue-500', 'to-blue-700', 'from-green-500', 'to-green-700',
                                'from-yellow-500', 'to-yellow-700', 'from-purple-500', 'to-purple-700',
                                'from-pink-500', 'to-pink-700', 'from-indigo-500', 'to-indigo-700',
                                'from-teal-500', 'to-teal-700'
                            ];
                            avatarContainer.classList.remove(...gradientClasses);
                        };

                        img.onerror = () => {};

                        foundCount++;
                    }
                }
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error) {}
    }

    return foundCount > 0;
}

// Update actor avatars with TMDB images
function updateActorAvatars(localActors, tmdbCast) {
    if (!localActors || localActors.length === 0) {
        return;
    }

// Global Client-Side Actor Avatar Cache
window.__actorAvatarClientCache = window.__actorAvatarClientCache || new Map();

async function getActorAvatarClient(actorName) {
    if (!actorName || actorName === 'Đang cập nhật') return null;
    const key = actorName.trim().toLowerCase();
    
    // 1. Check in-memory map
    if (window.__actorAvatarClientCache.has(key)) {
        return window.__actorAvatarClientCache.get(key);
    }
    
    // 2. Check sessionStorage
    try {
        const stored = sessionStorage.getItem(`actor_avatar_${key}`);
        if (stored !== null) {
            window.__actorAvatarClientCache.set(key, stored || null);
            return stored || null;
        }
    } catch (e) {}

    // 3. Fetch from API
    try {
        const res = await fetch(`/api/actor-avatar?name=${encodeURIComponent(actorName)}`);
        if (res.ok) {
            const data = await res.json();
            const url = (data && data.success && data.url) ? data.url : '';
            window.__actorAvatarClientCache.set(key, url || null);
            try {
                sessionStorage.setItem(`actor_avatar_${key}`, url);
            } catch (e) {}
            return url || null;
        }
    } catch (e) {}
    
    return null;
}

// Attach to window so movie-detail.js can also access
window.getActorAvatarClient = getActorAvatarClient;

    actorElements.forEach(async (element) => {
        const actorName = element.getAttribute('data-actor-name');
        const avatarContainer = element.querySelector('.actor-avatar-container');

        if (!avatarContainer) {
            return;
        }

        // Try to find matching actor in TMDB data
        let tmdbActor = null;

        // Method 1: Try exact match or partial match by name
        tmdbActor = tmdbCast.find(cast => {
            const tmdbName = cast.name.toLowerCase();
            const localName = actorName.toLowerCase();

            // Remove Vietnamese accents for better matching
            const normalizedTmdb = removeVietnameseAccents(tmdbName);
            const normalizedLocal = removeVietnameseAccents(localName);

            return normalizedTmdb === normalizedLocal ||
                normalizedTmdb.includes(normalizedLocal) ||
                normalizedLocal.includes(normalizedTmdb);
        });

        // Update avatar if actor found and has profile image
        if (tmdbActor && tmdbActor.profile_path) {
            const imageUrl = TMDB_IMAGE_BASE + tmdbActor.profile_path;

            // Create image element
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = actorName;
            img.className = 'w-full h-full object-cover';

            img.onload = () => {
                avatarContainer.innerHTML = '';
                avatarContainer.appendChild(img);

                const gradientClasses = [
                    'bg-gradient-to-br', 'from-red-500', 'to-red-700',
                    'from-blue-500', 'to-blue-700', 'from-green-500', 'to-green-700',
                    'from-yellow-500', 'to-yellow-700', 'from-purple-500', 'to-purple-700',
                    'from-pink-500', 'to-pink-700', 'from-indigo-500', 'to-indigo-700',
                    'from-teal-500', 'to-teal-700'
                ];
                avatarContainer.classList.remove(...gradientClasses);
            };

            img.onerror = () => {};
        } else {
            // Multi-source fallback via cached client avatar resolver
            const avatarUrl = await getActorAvatarClient(actorName);
            if (avatarUrl) {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = actorName;
                img.className = 'w-full h-full object-cover';
                img.onload = () => {
                    avatarContainer.innerHTML = '';
                    avatarContainer.appendChild(img);
                    const gradientClasses = [
                        'bg-gradient-to-br', 'from-red-500', 'to-red-700',
                        'from-blue-500', 'to-blue-700', 'from-green-500', 'to-green-700',
                        'from-yellow-500', 'to-yellow-700', 'from-purple-500', 'to-purple-700',
                        'from-pink-500', 'to-pink-700', 'from-indigo-500', 'to-indigo-700',
                        'from-teal-500', 'to-teal-700'
                    ];
                    avatarContainer.classList.remove(...gradientClasses);
                };
            }
        }
    });
}

// Helper function to remove Vietnamese accents for better name matching
function removeVietnameseAccents(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

// --- HERO BANNER IMAGE FETCHING ---
async function getHeroImagesFromTMDB(movie) {
    if (!movie) return null;

    const cacheKey = `tmdb_hero_${movie.slug}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    try {
        let tmdbMovie = null;

        // Ưu tiên tải ảnh từ PhimAPI images endpoint vì rất nhanh và chính xác
        try {
            const imagesUrl = `https://ophim1.com/v1/api/phim/${movie.slug}/images`;
            const response = await fetch(imagesUrl);
            if (response.ok) {
                const json = await response.json();
                if (json.success && json.data && json.data.images && json.data.images.length > 0) {
                    const backdropImg = json.data.images.find(img => img.type === 'backdrop' || img.aspect_ratio > 1);
                    const posterImg = json.data.images.find(img => img.type === 'poster' || img.aspect_ratio < 1);
                    if (backdropImg || posterImg) {
                        const result = {
                            backdrop: backdropImg ? `https://image.tmdb.org/t/p/original${backdropImg.file_path}` : null,
                            poster: posterImg ? `https://image.tmdb.org/t/p/w780${posterImg.file_path}` : null
                        };
                        sessionStorage.setItem(cacheKey, JSON.stringify(result));
                        return result;
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to load images from PhimAPI, trying TMDB API...', err);
        }

        // 1. Exact ID match (if Ophim provides tmdb.id)
        if (movie.tmdb && movie.tmdb.id && String(movie.tmdb.id).trim() !== '') {
            try {
                const tmdbType = movie.tmdb.type === 'tv' ? 'tv' : 'movie';
                const tmdbId = movie.tmdb.id;
                const detailUrl = `${TMDB_PROXY_BASE}/${tmdbType}/${tmdbId}?language=vi-VN`;
                const response = await fetchWithProxy(detailUrl);
                if (response.ok) {
                    tmdbMovie = await response.json();
                }
            } catch (err) {}
        }

        // 2. Fallback to Search
        if (!tmdbMovie) {
            const searchStrategies = [
                { query: movie.origin_name, year: movie.year },
                { query: movie.name, year: movie.year },
                { query: movie.origin_name, year: null },
                { query: movie.name, year: null }
            ];

            for (const strategy of searchStrategies) {
                if (!strategy.query) continue;
                const query = encodeURIComponent(strategy.query);
                const yearParam = strategy.year ? `&year=${strategy.year}` : '';
                const searchUrl = `${TMDB_PROXY_BASE}/search/multi?query=${query}${yearParam}&language=vi-VN`;

                try {
                    const res = await fetchWithProxy(searchUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                            tmdbMovie = data.results[0];
                            break;
                        }
                    }
                } catch (err) { continue; }
            }
        }

        if (tmdbMovie && (tmdbMovie.backdrop_path || tmdbMovie.poster_path)) {
            // Build original/high-res URLs
            const result = {
                backdrop: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}` : null,
                poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w780${tmdbMovie.poster_path}` : null
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
            return result;
        }
    } catch (e) {}
    
    // Cache null so we don't retry failed movies
    sessionStorage.setItem(cacheKey, JSON.stringify(null));
    return null;
}

// --- FETCH TRENDING MOVIES FROM TMDB ---
async function getTrendingFromTMDB() {
    // We fetch trending movies for the week
    const trendingUrl = `${TMDB_PROXY_BASE}/trending/movie/week?language=vi-VN`;
    try {
        const response = await fetchWithProxy(trendingUrl);
        if (response.ok) {
            const data = await response.json();
            return data.results || [];
        }
    } catch (e) {
        console.error('Error fetching TMDB Trending:', e);
    }
    return [];
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadActorImagesFromTMDB, getHeroImagesFromTMDB, getTrendingFromTMDB };
} else {
    window.getHeroImagesFromTMDB = getHeroImagesFromTMDB;
    window.getTrendingFromTMDB = getTrendingFromTMDB;
}

