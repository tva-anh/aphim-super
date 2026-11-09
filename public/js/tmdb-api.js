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
        const isVNForActor = typeof isVietnameseMovie === 'function' ? isVietnameseMovie(movie) : false;
        const searchStrategies = isVNForActor ? [
            { query: movie.name, year: movie.year, label: 'VN name + year' },
            { query: movie.name, year: null, label: 'VN name only' },
            { query: removeVietnameseAccents(movie.name), year: movie.year, label: 'No-accent VN name + year' },
            { query: removeVietnameseAccents(movie.name), year: null, label: 'No-accent VN name only' }
        ] : [
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
                        if (movie.actor && movie.actor.length > 0) {
                            const hasMatch = creditsData.cast.some(c => {
                                if (!c || !c.name) return false;
                                const cNorm = removeVietnameseAccents(c.name);
                                return movie.actor.some(a => {
                                    const aNorm = removeVietnameseAccents(cleanActorTitle(a));
                                    return cNorm === aNorm || (aNorm.length >= 4 && cNorm.includes(aNorm));
                                });
                            });
                            if (!hasMatch) continue; // Unrelated movie with same title
                        }
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
                const cleanA = cleanActorTitle(actorName);
                const aNorm = removeVietnameseAccents(cleanA);
                const actor = data.results.find(p => {
                    if (!p || !p.profile_path) return false;
                    const pNorm = removeVietnameseAccents(p.name || '');
                    const pOrig = removeVietnameseAccents(p.original_name || '');
                    if (pNorm && pNorm === aNorm) return true;
                    if (pOrig && pOrig === aNorm) return true;
                    if (pNorm && pNorm.length >= 4 && aNorm.length >= 4 && (pNorm.includes(aNorm) || aNorm.includes(pNorm))) return true;
                    return false;
                });

                if (actor && actor.profile_path) {
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

// Global Client-Side Actor Avatar Cache
window.__actorAvatarClientCache = window.__actorAvatarClientCache || new Map();

function cleanActorTitle(name) {
    if (!name) return '';
    return name.replace(/^(NSƯT|NSND|Nghệ sĩ|Đạo diễn|MC|Diễn viên)\s+/i, '').trim();
}

async function getActorAvatarClient(actorName) {
    if (!actorName || actorName === 'Đang cập nhật') return null;
    const cleanName = cleanActorTitle(actorName);
    if (!cleanName) return null;
    const key = cleanName.toLowerCase();
    
    // 1. Check in-memory map
    if (window.__actorAvatarClientCache.has(key)) {
        return window.__actorAvatarClientCache.get(key);
    }
    
    // 2. Check sessionStorage (version 2 to avoid poisoned cache)
    try {
        const stored = sessionStorage.getItem(`actor_avatar_v2_${key}`);
        if (stored !== null) {
            window.__actorAvatarClientCache.set(key, stored || null);
            return stored || null;
        }
    } catch (e) {}

    // 3. Fetch from API
    try {
        const res = await fetch(`/api/actor-avatar?name=${encodeURIComponent(cleanName)}`);
        if (res.ok) {
            const data = await res.json();
            const url = (data && data.success && data.url) ? data.url : '';
            window.__actorAvatarClientCache.set(key, url || null);
            try {
                sessionStorage.setItem(`actor_avatar_v2_${key}`, url);
            } catch (e) {}
            return url || null;
        }
    } catch (e) {}
    
    return null;
}

// Attach to window so movie-detail.js can also access
window.getActorAvatarClient = getActorAvatarClient;

// Update actor avatars with TMDB images (Zero duplicate photo guarantee)
function updateActorAvatars(localActors, tmdbCast) {
    if (!localActors || localActors.length === 0 || !tmdbCast || tmdbCast.length === 0) {
        return;
    }
    const actorElements = document.querySelectorAll('[data-actor-name], .actor-card');
    if (!actorElements || actorElements.length === 0) {
        return;
    }

    const assignedTmdbIds = new Set();
    const assignedAvatarUrls = new Set();

    actorElements.forEach(async (element) => {
        const actorName = element.getAttribute('data-actor-name');
        if (!actorName || actorName.trim().length < 2) return;
        const avatarContainer = element.querySelector('.actor-avatar-container');

        if (!avatarContainer) {
            return;
        }

        const cleanedLocal = cleanActorTitle(actorName);
        const normalizedLocal = removeVietnameseAccents(cleanedLocal);

        // Try to find matching actor in TMDB data with strict non-empty comparison
        let tmdbActor = null;
        if (normalizedLocal && normalizedLocal.length >= 2) {
            tmdbActor = tmdbCast.find(cast => {
                if (!cast || !cast.name || (cast.id && assignedTmdbIds.has(cast.id))) return false;
                const normalizedTmdb = removeVietnameseAccents(cast.name);
                const normalizedOrig = removeVietnameseAccents(cast.original_name || '');

                if (normalizedTmdb && normalizedTmdb === normalizedLocal) return true;
                if (normalizedOrig && normalizedOrig === normalizedLocal) return true;

                if (normalizedTmdb && normalizedTmdb.length >= 4 && normalizedLocal.length >= 4) {
                    if (normalizedTmdb.includes(normalizedLocal) || normalizedLocal.includes(normalizedTmdb)) return true;
                }
                if (normalizedOrig && normalizedOrig.length >= 4 && normalizedLocal.length >= 4) {
                    if (normalizedOrig.includes(normalizedLocal) || normalizedLocal.includes(normalizedOrig)) return true;
                }
                return false;
            });
        }

        if (tmdbActor && tmdbActor.id) {
            assignedTmdbIds.add(tmdbActor.id);
        }

        let imageUrl = tmdbActor && tmdbActor.profile_path ? (TMDB_IMAGE_BASE + tmdbActor.profile_path) : '';
        if (imageUrl && assignedAvatarUrls.has(imageUrl)) {
            imageUrl = ''; // Prevent duplicate avatar reuse
        }
        if (imageUrl) {
            assignedAvatarUrls.add(imageUrl);
        }

        // Update avatar if actor found and has profile image
        if (imageUrl) {
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
            if (avatarUrl && !assignedAvatarUrls.has(avatarUrl)) {
                assignedAvatarUrls.add(avatarUrl);
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
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

// 🛡️ Helper to reliably detect if a movie is Vietnamese
function isVietnameseMovie(movie) {
    if (!movie) return false;
    const countries = Array.isArray(movie.country)
        ? movie.country.map(c => (typeof c === 'object' ? (c.name || c.slug || '') : String(c)).toLowerCase())
        : [String(movie.country || '').toLowerCase()];

    const isVNCountry = countries.some(c =>
        c.includes('việt nam') || c.includes('viet nam') || c === 'vn' || c === 'viet-nam'
    );
    if (isVNCountry) return true;

    // Ký tự tiếng Việt có dấu
    const vnCharRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    const hasVnChar = vnCharRegex.test(movie.name || '');
    if (hasVnChar) {
        const isOtherCountry = countries.some(c =>
            c.includes('trung quốc') || c.includes('hàn quốc') || c.includes('nhật bản') ||
            c.includes('mỹ') || c.includes('thái lan') || c.includes('anh') || c.includes('pháp') ||
            c.includes('âu mỹ') || c.includes('hong kong') || c.includes('đài loan') ||
            c.includes('tây ban nha') || c.includes('thổ nhĩ kỳ') || c.includes('ấn độ')
        );
        if (!isOtherCountry) return true;
    }
    return false;
}

// 🛡️ Strict validation guard for TMDB search results to prevent mismatching (e.g. Vietnamese movie matching Turkish Hamlet)
function isValidTMDBResult(cand, movie, isVN) {
    if (!cand) return false;
    if (!cand.backdrop_path && !cand.poster_path) return false;

    const candTitle = (cand.title || cand.name || cand.original_title || cand.original_name || '').toLowerCase().trim();
    const candNorm = removeVietnameseAccents(candTitle);
    const movieNameNorm = removeVietnameseAccents((movie.name || '').toLowerCase().trim());
    const movieOriginNorm = removeVietnameseAccents((movie.origin_name || '').toLowerCase().trim());

    if (isVN) {
        // Phim Việt Nam: BẮT BUỘC có original_language là 'vi' HOẶC origin_country chứa 'VN'
        const isVnLang = cand.original_language === 'vi';
        const isVnCountry = Array.isArray(cand.origin_country) && cand.origin_country.includes('VN');
        if (!isVnLang && !isVnCountry) {
            // TUYỆT ĐỐI KHÔNG nhận phim nước ngoài cho phim Việt Nam!
            return false;
        }

        // Tên ứng viên phải tương đồng với tên tiếng Việt của phim
        const matchName = candNorm === movieNameNorm ||
            (candNorm.length >= 3 && movieNameNorm.includes(candNorm)) ||
            (movieNameNorm.length >= 3 && candNorm.includes(movieNameNorm));
        if (!matchName) return false;

        return true;
    }

    // Đối với phim quốc tế:
    if (movie.year) {
        const dateStr = cand.release_date || cand.first_air_date || '';
        if (dateStr && dateStr.length >= 4) {
            const candYear = parseInt(dateStr.substring(0, 4), 10);
            const mYear = parseInt(movie.year, 10);
            if (!isNaN(candYear) && !isNaN(mYear)) {
                if (Math.abs(candYear - mYear) > 2) {
                    const exactMatch = (candNorm === movieOriginNorm || candNorm === movieNameNorm);
                    if (!exactMatch) return false;
                }
            }
        }
    }

    return true;
}

// --- HERO BANNER IMAGE FETCHING ---
async function getHeroImagesFromTMDB(movie) {
    if (!movie) return null;

    // Dùng v4 cache key để xóa sạch các cache cũ bị load nhầm trước đây
    const cacheKey = `tmdb_hero_v5_${movie.slug}`;
    try {
        sessionStorage.removeItem(`tmdb_hero_${movie.slug}`);
        sessionStorage.removeItem(`tmdb_hero_v2_${movie.slug}`);
        sessionStorage.removeItem(`tmdb_hero_v3_${movie.slug}`);
        sessionStorage.removeItem(`tmdb_hero_v4_${movie.slug}`);
    } catch (e) {}

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    const isVN = isVietnameseMovie(movie);

    try {
        let tmdbMovie = null;

        // (Đã chuyển tra cứu backdrop sang Server-Side và TMDB Proxy để không bị chặn CORS)

        // 1. Exact ID match (nếu Ophim cung cấp tmdb.id)
        if (movie.tmdb && movie.tmdb.id && String(movie.tmdb.id).trim() !== '') {
            try {
                const tmdbType = movie.tmdb.type === 'tv' ? 'tv' : 'movie';
                const tmdbId = movie.tmdb.id;
                const detailUrl = `${TMDB_PROXY_BASE}/${tmdbType}/${tmdbId}?language=vi-VN`;
                const response = await fetchWithProxy(detailUrl);
                if (response.ok) {
                    const detailData = await response.json();
                    if (isValidTMDBResult(detailData, movie, isVN)) {
                        tmdbMovie = detailData;
                    }
                }
            } catch (err) {}
        }

        // 2. Fallback to Search with Strict Language & Country Guard
        if (!tmdbMovie) {
            let searchStrategies = [];
            if (isVN) {
                // Phim Việt Nam: TUYỆT ĐỐI KHÔNG tìm origin_name do Google dịch tiếng Anh (ví dụ 'Hamlet')
                searchStrategies = [
                    { query: movie.name, year: movie.year },
                    { query: movie.name, year: null },
                    { query: removeVietnameseAccents(movie.name), year: movie.year },
                    { query: removeVietnameseAccents(movie.name), year: null }
                ];
            } else {
                searchStrategies = [
                    { query: movie.origin_name, year: movie.year },
                    { query: movie.name, year: movie.year },
                    { query: movie.origin_name, year: null },
                    { query: movie.name, year: null }
                ];
            }

            for (const strategy of searchStrategies) {
                if (!strategy.query || strategy.query.trim().length === 0) continue;
                const query = encodeURIComponent(strategy.query.trim());
                const yearParam = strategy.year ? `&year=${strategy.year}` : '';
                const searchUrl = `${TMDB_PROXY_BASE}/search/multi?query=${query}${yearParam}&language=vi-VN`;

                try {
                    const res = await fetchWithProxy(searchUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.results && data.results.length > 0) {
                            // Lọc qua các ứng viên theo guard an toàn
                            const matched = data.results.find(cand => isValidTMDBResult(cand, movie, isVN));
                            if (matched) {
                                tmdbMovie = matched;
                                break;
                            }
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

