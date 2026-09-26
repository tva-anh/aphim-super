window.autoHealMovieImage = async function(imgEl, slug, movieTitle) {
    if (!imgEl) return;
    
    let step = parseInt(imgEl.dataset.healStep || '0', 10);
    step += 1;
    imgEl.dataset.healStep = String(step);
    
    const oldSrc = imgEl.src || '';
    const cleanSlug = slug || imgEl.getAttribute('data-tmdb-slug') || imgEl.getAttribute('data-slug') || '';
    const nameStr = movieTitle || imgEl.alt || imgEl.getAttribute('data-tmdb-name') || cleanSlug.replace(/-/g, ' ');

    // STEP 1: Fast CDN retry / mirror rewrite
    if (step === 1) {
        if (oldSrc.includes('phimimg.com/uploads/movies/') && !oldSrc.includes('/202') && !oldSrc.includes('/upload/vod/')) {
            imgEl.src = oldSrc.replace('phimimg.com/uploads/movies/', 'phimimg.com/upload/vod/');
            return;
        }
        const cleanUrl = oldSrc.split('?')[0];
        imgEl.src = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'retry=' + Date.now();
        return;
    }

    // STEP 2: Fetch PhimAPI detail for exact live poster URL
    if (step <= 2 && cleanSlug) {
        try {
            const res = await fetch('https://phimapi.com/phim/' + cleanSlug);
            if (res.ok) {
                const data = await res.json();
                if (data && data.movie) {
                    const liveImg = data.movie.poster_url || data.movie.thumb_url;
                    if (liveImg && liveImg !== oldSrc) {
                        imgEl.src = liveImg.startsWith('http') ? liveImg : ('https://phimimg.com/' + liveImg.replace(/^\//, ''));
                        return;
                    }
                }
            }
        } catch (e) {}
    }

    // STEP 3: Search PhimAPI by keyword if slug lookup failed
    if (step <= 3 && nameStr) {
        try {
            const searchKeyword = nameStr.replace(/xem phim/gi, '').replace(/\(\d+\)/g, '').trim();
            const res = await fetch('https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(searchKeyword));
            if (res.ok) {
                const data = await res.json();
                const items = data?.data?.items || data?.items || [];
                if (items && items.length > 0) {
                    const match = items[0];
                    const matchImg = match.poster_url || match.thumb_url;
                    if (matchImg) {
                        imgEl.src = matchImg.startsWith('http') ? matchImg : ('https://phimimg.com/' + matchImg.replace(/^\//, ''));
                        return;
                    }
                }
            }
        } catch (e) {}
    }

    // STEP 4: Query TMDB Image Search
    if (step <= 4 && nameStr) {
        try {
            const cleanTitle = nameStr.replace(/^mini\s+/i, '').split('(')[0].replace(/xem phim/gi, '').trim();
            const res = await fetch('/api/tmdb/search/multi?query=' + encodeURIComponent(cleanTitle) + '&language=vi-VN');
            if (res.ok) {
                const data = await res.json();
                if (data && data.results && data.results.length > 0) {
                    const tmdbMatch = data.results[0];
                    const path = tmdbMatch.poster_path || tmdbMatch.backdrop_path;
                    if (path) {
                        imgEl.src = 'https://image.tmdb.org/t/p/w500' + path;
                        return;
                    }
                }
            }
        } catch (e) {}
    }

    // STEP 5: Premium Fallback Card SVG with Movie Title
    const displayTitle = (nameStr || 'APhim').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fallbackSvg = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1f2c'/%3E%3Cstop offset='100%25' stop-color='%230b0e14'/%3E%3C/linearGradient%3E%3ClinearGradient id='gold' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23ffd700'/%3E%3Cstop offset='100%25' stop-color='%23f59e0b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='600' fill='url(%23bg)'/%3E%3Ccircle cx='200' cy='220' r='60' fill='rgba(255,215,0,0.1)' stroke='url(%23gold)' stroke-width='3'/%3E%3Cpath d='M185 195 L225 220 L185 245 Z' fill='%23ffd700'/%3E%3Ctext x='200' y='360' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-size='22' font-weight='bold'%3E" + encodeURIComponent(displayTitle) + "%3C/text%3E%3Ctext x='200' y='400' text-anchor='middle' fill='%23ffd700' font-family='sans-serif' font-size='14' font-weight='600' letter-spacing='2'%3EA PHIM CINEMA%3C/text%3E%3C/svg%3E";

    imgEl.src = fallbackSvg;
    imgEl.onerror = null;
};

window.getCleanMovieImageUrl = function(rawUrl) {
    if (!rawUrl) return 'https://aphim.top/android-chrome-512x512.png';
    let url = String(rawUrl).trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url.replace(/img\.ophimimg\.com/g, 'phimimg.com').replace(/phimapi\.com\/uploads/g, 'phimimg.com/uploads');
    }
    const clean = url.replace(/^\//, '');
    if (clean.startsWith('upload/') || clean.startsWith('uploads/')) {
        return 'https://phimimg.com/' + clean;
    }
    return 'https://phimimg.com/uploads/movies/' + clean;
};

// API Service for phimapi.com and Backend
class MovieAPI {
    constructor() {
        this.useBackend = API_CONFIG.USE_BACKEND_FOR_MOVIES || false;
        this.backendURL = API_CONFIG.BACKEND_URL;
        this.ophimURL = API_CONFIG.OPHIM_URL;
        this.ophim17URL = API_CONFIG.OPHIM17_URL;
        this.useMultipleSources = API_CONFIG.USE_MULTIPLE_SOURCES;
    }

    // Helper to fetch with timeout (default 6 seconds)
    async fetchWithTimeout(url, options = {}) {
        const { timeout = 3000, ...rest } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                ...rest,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (err) {
            clearTimeout(id);
            throw err;
        }
    }

    // Standardize & normalize API response for all endpoints across OPhim and PhimAPI
    normalizeResponse(data) {
        if (!data) return null;
        const items = data.data?.items || data.items || [];
        const item = data.data?.item || data.item || null;
        const isSuccess = ((data && (data.status === 'success' || data.status === true || data.status)) || data.status === true || data.status);
        return {
            status: isSuccess ? 'success' : false,
            data: {
                items,
                item,
                params: data.data?.params || data.params,
                seoOnPage: data.data?.seoOnPage || data.seoOnPage,
                sections: data.data?.sections || data.sections
            }
        };
    }

    // Wrapper to fetch from primary OPhim URL or fallback OPhim mirrors (phimapi.com -> phimapi.com -> phimapi.com)    // Main fetch wrapper that tries multiple APIs
    async fetchWithFallback(endpoint, options = {}, preferredSource = 'both') {
        let cleanEndpoint = endpoint;
        if (cleanEndpoint.startsWith('https://')) {
            cleanEndpoint = new URL(cleanEndpoint).pathname + new URL(cleanEndpoint).search;
        }
        if (cleanEndpoint.startsWith('/v1/api')) {
            cleanEndpoint = cleanEndpoint.substring('/v1/api'.length);
        }
        if (!cleanEndpoint.startsWith('/')) {
            cleanEndpoint = '/' + cleanEndpoint;
        }

        const paramStr = cleanEndpoint.includes('?') ? cleanEndpoint.substring(cleanEndpoint.indexOf('?')) : '';
        const basePath = cleanEndpoint.includes('?') ? cleanEndpoint.substring(0, cleanEndpoint.indexOf('?')) : cleanEndpoint;

        let urlsToTry = [];
        if (basePath.startsWith('/phim/')) {
            urlsToTry = [
                `https://phimapi.com${basePath}${paramStr}`,
                `https://phimapi.com/v1/api${basePath}${paramStr}`
            ];
        } else if (preferredSource === 'phimapi') {
            urlsToTry = [
                `https://phimapi.com/v1/api${basePath}${paramStr}`,
                `https://phimapi.com${basePath}${paramStr}`
            ];
        } else if (preferredSource === 'ophim1') {
            urlsToTry = [
                `https://phimapi.com/v1/api${basePath}${paramStr}`,
                `https://phimapi.com${basePath}${paramStr}`
            ];
        } else {
            urlsToTry = [
                `https://phimapi.com/v1/api${basePath}${paramStr}`,
                `https://phimapi.com${basePath}${paramStr}`
            ];
        }

        if (basePath.includes('phim-moi-cap-nhat')) {
            urlsToTry.unshift(`https://phimapi.com/danh-sach/phim-moi-cap-nhat${paramStr}`);
        }

        const uniqueUrls = Array.from(new Set(urlsToTry.filter(Boolean)));
        let lastError = null;

        for (const url of uniqueUrls) {
            try {
                const response = await this.fetchWithTimeout(url, options);
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response;
                    }
                }
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError || new Error('All OPhim API mirrors failed');
    }

    // Helper to filter out hidden movies from list responses and fix absolute image paths
    filterHiddenMovies(data) {
        if (!data) return data;
        
        // INTERCEPT AND FIX IMAGE URLS (If from Ophim1 or relative, ensure phimimg.com fallback)
        try {
            const rawDomain = data.pathImage || data.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com';
            const safeDomain = (rawDomain.includes('phimimg.com') || rawDomain.includes('phimapi.com')) ? 'https://phimimg.com' : rawDomain;
            const items = data.data?.items || data.items || [];
            if (Array.isArray(items)) {
                for (const item of items) {
                    if (item.poster_url) {
                        if (item.poster_url.includes('phimimg.com')) {
                            item.poster_url = item.poster_url.replace('phimimg.com', 'phimimg.com');
                        } else if (!item.poster_url.startsWith('http')) {
                            item.poster_url = `${safeDomain}/${item.poster_url.replace(/^\//, '')}`;
                        }
                    }
                    if (item.thumb_url) {
                        if (item.thumb_url.includes('phimimg.com')) {
                            item.thumb_url = item.thumb_url.replace('phimimg.com', 'phimimg.com');
                        } else if (!item.thumb_url.startsWith('http')) {
                            item.thumb_url = `${safeDomain}/${item.thumb_url.replace(/^\//, '')}`;
                        }
                    } else if (item.poster_url) {
                        item.thumb_url = item.poster_url;
                    }
                    if (!item.poster_url && item.thumb_url) {
                        item.poster_url = item.thumb_url;
                    }
                }
            }
        } catch (e) {}

        if (!data.data || !Array.isArray(data.data.items)) return data;
        
        try {
            const hiddenMoviesList = JSON.parse(localStorage.getItem('cinestream_hidden_movies') || '[]');
            
            // HARDCODED BANNED MOVIES (DMCA, BÁO CÁO VI PHẠM: 489339a89ce51782)
            const hardcodedBanned = ['trai-cam', 'moi-thu-la-loi-co-ay', 'michael', 'dac-vu-xuyen-quoc-gia', 'xac-song-thanh-pho-chet-phan-2'];
            const allBanned = [...hiddenMoviesList, ...hardcodedBanned];
            
            if (allBanned.length > 0) {
                data.data.items = data.data.items.filter(movie => !allBanned.includes(movie.slug));
            }
        } catch (e) {
            console.warn('Error filtering hidden movies:', e);
        }
        return data;
    }

    // Get auth token
    getAuthToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    // Fetch with auth header
    async fetchWithAuth(url, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await this.fetchWithTimeout(url, {
            ...options,
            headers
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
            window.location.href = 'login.html';
            throw new Error('Phiên đăng nhập đã hết hạn');
        }

        return response;
    }

    // Fetch movie list    // 1. Get latest movies
    async getMovieList(page = 1, preferredSource = 'both') {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies?page=${page}&limit=20`);
                const data = await response.json();
                return this.filterHiddenMovies(data);
            } else {
                let fetchPromises = [];
                const endpoint = `/danh-sach/phim-moi-cap-nhat?page=${page}`;
                
                if (preferredSource === 'phimapi' || preferredSource === 'both') {
                    fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'phimapi' })));
                }
                if (preferredSource === 'ophim1' || preferredSource === 'both') {
                    fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'ophim1' })));
                }

                const results = await Promise.allSettled(fetchPromises);
                
                let combinedItems = [];
                let firstValidData = null;
                const seenSlugs = new Set();

                for (const res of results) {
                    if (res.status === 'fulfilled' && res.value) {
                        const { data, source } = res.value;
                        const domainImage = data.pathImage || data.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com';

                        const isSuccess = data.status === 'success' || data.status === true;
                        if (!firstValidData && isSuccess) firstValidData = data;
                        
                        const items = data.items || data.data?.items || [];
                        for (const item of items) {
                            if (!seenSlugs.has(item.slug)) {
                                seenSlugs.add(item.slug);
                                
                                if (domainImage) {
                                    if (item.thumb_url && !item.thumb_url.startsWith('http')) {
                                        item.thumb_url = `${domainImage}/${item.thumb_url.replace(/^\//, '')}`;
                                    }
                                    if (item.poster_url && !item.poster_url.startsWith('http')) {
                                        item.poster_url = `${domainImage}/${item.poster_url.replace(/^\//, '')}`;
                                    }
                                }
                                
                                combinedItems.push(item);
                            }
                        }
                    }
                }

                if (combinedItems.length === 0) throw new Error('API failed');

                const mergedData = {
                    ...firstValidData,
                    items: combinedItems,
                    data: firstValidData?.data ? { ...firstValidData.data, items: combinedItems } : undefined
                };

                return this.filterHiddenMovies(mergedData);
            }
        } catch (error) {
            console.error('Error fetching movie list:', error);
            return null;
        }
    }

    // Fetch movie detail by slug
    async getMovieDetail(slug) {
        // --- BLOCK DMCA REPORTED SLUGS (Mã báo cáo: 489339a89ce51782 - trai-cam) ---
        const hardcodedBanned = ['trai-cam', 'moi-thu-la-loi-co-ay', 'michael', 'dac-vu-xuyen-quoc-gia', 'xac-song-thanh-pho-chet-phan-2'];
        if (slug && hardcodedBanned.includes(slug.toLowerCase())) {
            console.warn(`[API BLOCK] Phim ${slug} bị chặn theo báo cáo 489339a89ce51782`);
            window.location.href = '/';
            return null;
        }
        
        // --- AUTO BLOCK HIDDEN SLUGS ---
        try {
            const hiddenMoviesList = JSON.parse(localStorage.getItem('cinestream_hidden_movies') || '[]');
            const allBanned = [...hiddenMoviesList, ...hardcodedBanned];
            
            if (allBanned.includes(slug)) {
                window.location.href = '/';
                return null;
            }
        } catch (e) {}
        
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/${slug}`);
                const data = await response.json();

                console.log('Backend movie detail response:', data);

                // Always return data if we got a response
                // The backend should handle the format
                return data;
                        } else {
                const response = await this.fetchWithFallback(`/api/movie-merged/${slug}`, {
                    headers: { 'accept': 'application/json' }
                });
                const mergedData = await response.json();
                
                // Format the merged data to match the expected structure
                // /api/movie-merged returns { status: true, movie: {...}, episodes: [...] }
                // The old code expects { data: { item: {...} } } or similar
                if (mergedData && mergedData.status && mergedData.movie) {
                     return {
                         status: true,
                         data: {
                             item: {
                                 ...mergedData.movie,
                                 episodes: mergedData.episodes
                             }
                         }
                     };
                }
                
                return null;
            }
        } catch (error) {
            console.error('Error fetching movie detail:', error);
            return null;
        }
    }

    // Search movies
    async searchMovies(keyword, page = 1, preferredSource = 'both') {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/search?q=${encodeURIComponent(keyword)}&page=${page}`);
                const data = await response.json();

                console.log('Backend search response:', data);

                // Check both success and status fields
                if (data.success || (data && (data.status === 'success' || data.status === true || data.status))) {
                    return this.filterHiddenMovies(data); // Return the whole response
                }
                return null;
            } else {
                const response = await this.fetchWithFallback(`/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`, {
                    headers: { 'accept': 'application/json' }
                }, preferredSource);
                const data = await response.json();
                return this.filterHiddenMovies(data);
            }
        } catch (error) {
            console.error('Error searching movies:', error);
            return null;
        }
    }

    // Get movies by category
    async getMoviesByCategory(categorySlug, page = 1, preferredSource = 'both') {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies?category=${categorySlug}&page=${page}`);
                const data = await response.json();

                // Backend now returns Ophim-compatible format
                if (data.success) {
                    return this.filterHiddenMovies({
                        status: 'success',
                        data: data.data
                    });
                }
                return null;
            } else {
                let endpoint = '/danh-sach/' + categorySlug + '?page=' + page;
                if (categorySlug.startsWith('the-loai/') || categorySlug.startsWith('quoc-gia/')) {
                    endpoint = '/' + categorySlug + '?page=' + page;
                } else if (!categorySlug.includes('/')) {
                    const mainCategories = ['hanh-dong', 'tinh-cam', 'hai-huoc', 'vien-tuong', 'vo-thuat', 'kinh-di', 'tam-ly', 'than-thoai', 'hoat-hinh', 'phieu-luu', 'chieu-rap'];
                    if (mainCategories.includes(categorySlug)) {
                        endpoint = '/the-loai/' + categorySlug + '?page=' + page;
                    } else {
                        endpoint = '/danh-sach/' + categorySlug + '?page=' + page;
                    }
                }
                
                let fetchPromises = [];
                if (preferredSource === 'phimapi' || preferredSource === 'both') {
                    fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'phimapi' })));
                }
                if (preferredSource === 'ophim1' || preferredSource === 'both') {
                    fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'ophim1' })));
                }

                const results = await Promise.allSettled(fetchPromises);
                
                let combinedItems = [];
                let firstValidData = null;
                const seenSlugs = new Set();

                for (const res of results) {
                    if (res.status === 'fulfilled' && res.value) {
                        const { data, source } = res.value;
                        const domainImage = data.pathImage || data.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com';

                        const isSuccess = data.status === 'success' || data.status === true;
                        if (!firstValidData && isSuccess) firstValidData = data;
                        
                        const items = data.items || data.data?.items || [];
                        for (const item of items) {
                            if (!seenSlugs.has(item.slug)) {
                                seenSlugs.add(item.slug);
                                
                                if (domainImage) {
                                    if (item.thumb_url && !item.thumb_url.startsWith('http')) {
                                        item.thumb_url = `${domainImage}/${item.thumb_url.replace(/^\//, '')}`;
                                    }
                                    if (item.poster_url && !item.poster_url.startsWith('http')) {
                                        item.poster_url = `${domainImage}/${item.poster_url.replace(/^\//, '')}`;
                                    }
                                }
                                
                                combinedItems.push(item);
                            }
                        }
                    }
                }

                if (combinedItems.length === 0) throw new Error('API failed');

                const mergedData = {
                    ...firstValidData,
                    items: combinedItems,
                    data: firstValidData?.data ? { ...firstValidData.data, items: combinedItems } : undefined
                };

                return this.filterHiddenMovies(mergedData);
            }
        } catch (error) {
            console.error('Error fetching category movies:', error);
            return null;
        }
    }

    // Get movies by country
    async getMoviesByCountry(countrySlug, page = 1, preferredSource = 'both') {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies?country=${countrySlug}&page=${page}`);
                const data = await response.json();

                // Backend now returns Ophim-compatible format
                if (data.success) {
                    return this.filterHiddenMovies({
                        status: 'success',
                        data: data.data
                    });
                }
                return null;
            } else {
                const endpoint = `/quoc-gia/${countrySlug}?page=${page}`;
                let fetchPromises = [];
                if (preferredSource === 'phimapi' || preferredSource === 'both') {
                    fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'phimapi' })));
                }
                if (preferredSource === 'ophim1' || preferredSource === 'both') {
                    fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'ophim1' })));
                }

                const results = await Promise.allSettled(fetchPromises);
                
                let combinedItems = [];
                let firstValidData = null;
                const seenSlugs = new Set();

                for (const res of results) {
                    if (res.status === 'fulfilled' && res.value) {
                        const { data, source } = res.value;
                        const domainImage = data.pathImage || data.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com';

                        const isSuccess = data.status === 'success' || data.status === true;
                        if (!firstValidData && isSuccess) firstValidData = data;
                        
                        const items = data.items || data.data?.items || [];
                        for (const item of items) {
                            if (!seenSlugs.has(item.slug)) {
                                seenSlugs.add(item.slug);
                                
                                if (domainImage) {
                                    if (item.thumb_url && !item.thumb_url.startsWith('http')) {
                                        item.thumb_url = `${domainImage}/${item.thumb_url.replace(/^\//, '')}`;
                                    }
                                    if (item.poster_url && !item.poster_url.startsWith('http')) {
                                        item.poster_url = `${domainImage}/${item.poster_url.replace(/^\//, '')}`;
                                    }
                                }
                                
                                combinedItems.push(item);
                            }
                        }
                    }
                }

                if (combinedItems.length === 0) throw new Error('API failed');

                const mergedData = {
                    ...firstValidData,
                    items: combinedItems,
                    data: firstValidData?.data ? { ...firstValidData.data, items: combinedItems } : undefined
                };

                return this.filterHiddenMovies(mergedData);
            }
        } catch (error) {
            console.error('Error fetching country movies:', error);
            return null;
        }
    }

    // Get stream URL (requires authentication if using backend)
    async getStreamURL(slug, episodeSlug) {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/${slug}/stream/${episodeSlug}`);
                const data = await response.json();

                if (data.success) {
                    return data.data.streamURL;
                }
                throw new Error(data.message || 'Không thể lấy link phim');
            } else {
                // Direct Ophim - get from movie detail
                const movieData = await this.getMovieDetail(slug);
                if (movieData && movieData.data && movieData.data.item) {
                    const episodes = movieData.data.item.episodes;
                    for (const server of episodes) {
                        const episode = server.server_data?.find(ep => ep.slug === episodeSlug);
                        if (episode) {
                            return episode.link_m3u8;
                        }
                    }
                }
                throw new Error('Không tìm thấy link phim');
            }
        } catch (error) {
            console.error('Error getting stream URL:', error);
            throw error;
        }
    }

    // Get home movies (alias to getMovieList)
    async getHome() {
        try {
            if (this.useBackend) {
                const response = await this.fetchWithAuth(`${this.backendURL}/movies/home`);
                const data = await response.json();
                return this.filterHiddenMovies(this.normalizeResponse(data));
            } else {
                const response = await this.fetchWithFallback('/home', {
                    headers: { 'accept': 'application/json' }
                });
                const data = await response.json();
                return this.filterHiddenMovies(this.normalizeResponse(data));
            }
        } catch (e) {
            console.warn('Error in getHome:', e);
            return null;
        }
    }

    // Get movies from multiple sources / category
    async getMoviesFromMultipleSources(page = 1, categoryOrList = 'phim-bo', preferredSource = 'both') {
        try {
            let endpoint = `/danh-sach/${categoryOrList}?page=${page}`;
            if (categoryOrList.startsWith('the-loai/') || categoryOrList.startsWith('quoc-gia/')) {
                endpoint = `/${categoryOrList}?page=${page}`;
            } else if (!categoryOrList.includes('/')) {
                const mainCategories = ['hanh-dong', 'tinh-cam', 'hai-huoc', 'vien-tuong', 'vo-thuat', 'kinh-di', 'tam-ly', 'than-thoai', 'hoat-hinh', 'phieu-luu', 'chieu-rap'];
                if (mainCategories.includes(categoryOrList)) {
                    endpoint = `/the-loai/${categoryOrList}?page=${page}`;
                } else {
                    endpoint = `/danh-sach/${categoryOrList}?page=${page}`;
                }
            }
            
            let fetchPromises = [];
            if (preferredSource === 'phimapi' || preferredSource === 'both') {
                fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'phimapi' })));
            }
            if (preferredSource === 'ophim1' || preferredSource === 'both') {
                fetchPromises.push(this.fetchWithTimeout(`https://phimapi.com/v1/api${endpoint}`, { headers: { 'accept': 'application/json' }, timeout: 3000 }).then(r => r.json()).then(data => ({ data, source: 'ophim1' })));
            }

            const results = await Promise.allSettled(fetchPromises);
            
            let combinedItems = [];
            let firstValidData = null;
            const seenSlugs = new Set();

            for (const res of results) {
                if (res.status === 'fulfilled' && res.value) {
                    const { data, source } = res.value;
                    const domainImage = data.pathImage || data.data?.APP_DOMAIN_CDN_IMAGE || 'https://phimimg.com';

                    const isSuccess = data.status === 'success' || data.status === true;
                    if (!firstValidData && isSuccess) firstValidData = data;
                    
                    const items = data.items || data.data?.items || [];
                    for (const item of items) {
                        if (!seenSlugs.has(item.slug)) {
                            seenSlugs.add(item.slug);
                            
                            if (domainImage) {
                                if (item.thumb_url && !item.thumb_url.startsWith('http')) {
                                    item.thumb_url = `${domainImage}/${item.thumb_url.replace(/^\//, '')}`;
                                }
                                if (item.poster_url && !item.poster_url.startsWith('http')) {
                                    item.poster_url = `${domainImage}/${item.poster_url.replace(/^\//, '')}`;
                                }
                            }
                            
                            combinedItems.push(item);
                        }
                    }
                }
            }

            if (combinedItems.length === 0) return null;

            const mergedData = {
                ...firstValidData,
                items: combinedItems,
                data: firstValidData?.data ? { ...firstValidData.data, items: combinedItems } : undefined
            };

            return this.normalizeResponse(mergedData);
        } catch (err) {
            console.warn('Error in getMoviesFromMultipleSources:', err);
            return null;
        }
    }

    // Get all categories
    async getCategories() {
        try {
            const res = await this.fetchWithFallback('/the-loai');
            const rawData = await res.json();
            return this.normalizeResponse(rawData);
        } catch (err) {
            console.warn('Error fetching categories:', err);
            return null;
        }
    }

    // Get all countries
    async getCountries() {
        try {
            const res = await this.fetchWithFallback('/quoc-gia');
            const rawData = await res.json();
            return this.normalizeResponse(rawData);
        } catch (err) {
            console.warn('Error fetching countries:', err);
            return null;
        }
    }

    // Get movie gallery images
    async getMovieImages(slug) {
        if (!slug) return null;
        if (this.useBackend && this.backendURL) {
            try {
                const response = await this.fetchWithTimeout(`${this.backendURL}/phim/${slug}/images`, { timeout: 3000 });
                if (response.ok) return await response.json();
            } catch (error) {}
        }
        return null;
    }

    // Get image URL
    getImageURL(imagePath, width = 400, quality = 80, isPriority = false) {
        if (!imagePath) return '/apple-touch-icon.png';

        let fullUrl = imagePath;
        if (fullUrl.includes('phimimg.com')) {
            fullUrl = fullUrl.replace('phimimg.com', 'phimimg.com');
        } else if (!imagePath.startsWith('http')) {
            let filename = imagePath.replace(/^\//, "");
            if (!filename.startsWith('uploads/')) {
                filename = 'uploads/movies/' + filename;
            }
            fullUrl = `https://phimimg.com/${filename}`;
        }

        // Use imageOptimizer for advanced compression and caching
        if (typeof imageOptimizer !== 'undefined' && typeof imageOptimizer.optimizeImageUrl === 'function') {
            return imageOptimizer.optimizeImageUrl(fullUrl, width, quality, isPriority);
        }

        return fullUrl;
    }

    // Get list of categories
    async getCategories() {
        try {
            const response = await this.fetchWithFallback(`/the-loai`, {
                headers: { 'accept': 'application/json' }
            });
            const data = await response.json();

            console.log('Categories API response:', data);

            if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data) {
                // Check if data.data.items exists (new format)
                if (data.data.items && Array.isArray(data.data.items)) {
                    console.log('Categories array from items:', data.data.items);
                    return data.data.items;
                }

                // Fallback to old format
                let categories = [];

                if (Array.isArray(data.data)) {
                    categories = data.data;
                } else if (typeof data.data === 'object') {
                    categories = Object.entries(data.data).map(([key, value]) => {
                        if (typeof value === 'object' && value.slug && value.name) {
                            return value;
                        } else if (typeof value === 'string') {
                            return { slug: key, name: value };
                        } else if (typeof value === 'object' && value.name) {
                            return { slug: key, name: value.name };
                        }
                        return { slug: key, name: key };
                    });
                }

                console.log('Categories converted to array:', categories);
                return categories;
            }
            return [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    // Get list of countries
    async getCountries() {
        // API /quoc-gia không trả về danh sách, dùng danh sách cố định
        return [
            { slug: 'viet-nam', name: 'Việt Nam' },
            { slug: 'trung-quoc', name: 'Trung Quốc' },
            { slug: 'han-quoc', name: 'Hàn Quốc' },
            { slug: 'nhat-ban', name: 'Nhật Bản' },
            { slug: 'thai-lan', name: 'Thái Lan' },
            { slug: 'au-my', name: 'Âu Mỹ' },
            { slug: 'dai-loan', name: 'Đài Loan' },
            { slug: 'hong-kong', name: 'Hồng Kông' },
            { slug: 'an-do', name: 'Ấn Độ' },
            { slug: 'anh', name: 'Anh' },
            { slug: 'phap', name: 'Pháp' },
            { slug: 'canada', name: 'Canada' },
            { slug: 'duc', name: 'Đức' },
            { slug: 'tay-ban-nha', name: 'Tây Ban Nha' },
            { slug: 'tho-nhi-ky', name: 'Thổ Nhĩ Kỳ' },
            { slug: 'ha-lan', name: 'Hà Lan' },
            { slug: 'indonesia', name: 'Indonesia' },
            { slug: 'nga', name: 'Nga' },
            { slug: 'mexico', name: 'Mexico' },
            { slug: 'ba-lan', name: 'Ba Lan' },
            { slug: 'uc', name: 'Úc' },
            { slug: 'thuy-dien', name: 'Thụy Điển' },
            { slug: 'malaysia', name: 'Malaysia' },
            { slug: 'brazil', name: 'Brazil' },
            { slug: 'philippines', name: 'Philippines' },
            { slug: 'bo-dao-nha', name: 'Bồ Đào Nha' },
            { slug: 'y', name: 'Ý' },
            { slug: 'dan-mach', name: 'Đan Mạch' },
            { slug: 'uae', name: 'UAE' },
            { slug: 'na-uy', name: 'Na Uy' },
            { slug: 'thuy-si', name: 'Thụy Sĩ' },
            { slug: 'chau-phi', name: 'Châu Phi' },
            { slug: 'nam-phi', name: 'Nam Phi' },
            { slug: 'ukraina', name: 'Ukraina' },
            { slug: 'a-rap-xe-ut', name: 'Ả Rập Xê Út' }
        ];
    }

    // Fetch from Ophim17 (secondary source)
    async getMovieListFromOphim17(page = 1) {
        try {
            const response = await this.fetchWithTimeout(`${this.ophim17URL}/danh-sach/phim-moi-cap-nhat?page=${page}`, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching from Ophim17:', error);
            return null;
        }
    }

    async getMoviesByCategoryFromOphim17(categorySlug, page = 1) {
        try {
            let endpoint = '/the-loai/' + categorySlug + '.json?slug=' + categorySlug;
            if (categorySlug.startsWith('the-loai/') || categorySlug.startsWith('quoc-gia/')) {
                const actualSlug = categorySlug.split('/')[1];
                endpoint = '/' + categorySlug + '.json?slug=' + actualSlug;
            } else if (!categorySlug.includes('/')) {
                const mainCategories = ['hanh-dong', 'tinh-cam', 'hai-huoc', 'vien-tuong', 'vo-thuat', 'kinh-di', 'tam-ly', 'than-thoai', 'hoat-hinh', 'phieu-luu', 'chieu-rap'];
                if (mainCategories.includes(categorySlug)) {
                    endpoint = '/the-loai/' + categorySlug + '.json?slug=' + categorySlug;
                } else {
                    endpoint = '/danh-sach/' + categorySlug + '.json?slug=' + categorySlug;
                }
            }
            
            const response = await this.fetchWithFallback('https://ophim17.cc/_next/data/9m2K2U6N0P-F6B_g0Y1M3' + endpoint, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching category from Ophim17:', error);
            return null;
        }
    }

    // Combine movies from multiple sources
    async getMoviesFromMultipleSources(page = 1, categorySlug = null) {
        if (!this.useMultipleSources) {
            // Use single source
            if (categorySlug) {
                return await this.getMoviesByCategory(categorySlug, page);
            }
            return await this.getMovieList(page);
        }

        try {
            // Fetch from both sources in parallel
            const promises = [];

            if (categorySlug) {
                promises.push(this.getMoviesByCategory(categorySlug, page));
                promises.push(this.getMoviesByCategoryFromOphim17(categorySlug, page));
            } else {
                promises.push(this.getMovieList(page));
                promises.push(this.getMovieListFromOphim17(page));
            }

            const results = await Promise.allSettled(promises);

            // Combine results
            let allMovies = [];
            let combinedData = {
                status: 'success',
                data: {
                    items: [],
                    params: null
                }
            };

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    const data = result.value;
                    if ((data && (data.status === 'success' || data.status === true || data.status)) && data.data && data.data.items) {
                        allMovies = allMovies.concat(data.data.items);

                        // Use params from first source
                        if (!combinedData.data.params && data.data.params) {
                            combinedData.data.params = data.data.params;
                        }
                    }
                }
            });

            // Remove duplicates based on slug
            const uniqueMovies = [];
            const seenSlugs = new Set();

            allMovies.forEach(movie => {
                if (!seenSlugs.has(movie.slug)) {
                    seenSlugs.add(movie.slug);
                    uniqueMovies.push(movie);
                }
            });

            combinedData.data.items = uniqueMovies;

            console.log(`Combined ${uniqueMovies.length} unique movies from ${results.length} sources`);

            return combinedData;
        } catch (error) {
            console.error('Error combining multiple sources:', error);
            // Fallback to single source
            if (categorySlug) {
                return await this.getMoviesByCategory(categorySlug, page);
            }
            return await this.getMovieList(page);
        }
    }

    // Get Movie Images (TMDB Posters / Backdrops)
    async getMovieImages(slug) {
        if (!slug) return null;
        if (this.useBackend && this.backendURL) {
            try {
                const response = await this.fetchWithTimeout(`${this.backendURL}/phim/${slug}/images`, { timeout: 3000 });
                if (response.ok) return await response.json();
            } catch (error) {}
        }
        return null;
    }

    // Get Movie Peoples (TMDB Cast & Directors)
    async getMoviePeoples(slug) {
        if (!slug) return null;
        if (this.useBackend && this.backendURL) {
            try {
                const response = await this.fetchWithTimeout(`${this.backendURL}/phim/${slug}/peoples`, { timeout: 3000 });
                if (response.ok) return await response.json();
            } catch (error) {}
        }
        return null;
    }

    // Get Movie Keywords (TMDB Tags)
    async getMovieKeywords(slug) {
        try {
            const response = await this.fetchWithFallback(`/phim/${slug}/keywords`, {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error(`Error fetching keywords for ${slug}:`, error);
            return null;
        }
    }

    // Get List of Release Years
    async getYears() {
        try {
            const response = await this.fetchWithFallback('/nam-phat-hanh', {
                headers: { 'accept': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching release years:', error);
            return null;
        }
    }

    // Get Movies by Release Year
    async getMoviesByYear(year, page = 1) {
        try {
            const response = await this.fetchWithFallback(`/nam-phat-hanh/${year}?page=${page}`, {
                headers: { 'accept': 'application/json' }
            });
            const data = await response.json();
            return this.filterHiddenMovies(data);
        } catch (error) {
            console.error(`Error fetching movies for year ${year}:`, error);
            return null;
        }
    }

    // --- SEO Utilities ---
    // Inject Canonical Tag to fix Google Search Console Duplicate Errors
    // Inject Canonical Tag to fix Google Search Console Duplicate Errors
    injectCanonical() {
        try {
            const url = new URL(window.location.href);
            // Remove common tracking parameters that cause duplicate content issues
            const paramsToRemove = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
            paramsToRemove.forEach(param => url.searchParams.delete(param));
            
            // Treat page=1 as identical to base URL
            if (url.searchParams.get('page') === '1') {
                url.searchParams.delete('page');
            }
            
            // SEO FIX: If on watch page, point canonical back to /phim/:slug
            if (url.pathname.includes('watch.html') || url.pathname.includes('/xem-phim/')) {
                const slug = url.searchParams.get('slug') || (url.pathname.includes('/xem-phim/') ? url.pathname.split('/xem-phim/')[1]?.split('/')[0] : '');
                if (slug) {
                    url.pathname = `/phim/${slug}`;
                    url.search = '';
                }
            }
            
            const canonicalUrl = url.toString().split('#')[0]; // Remove hash fragment

            let link = document.querySelector("link[rel='canonical']");
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', 'canonical');
                document.head.appendChild(link);
            }
            link.setAttribute('href', canonicalUrl);
        } catch (e) {
            console.error('Error injecting canonical tag:', e);
        }
    }

    // Dynamic Meta Tags Updater
    updateSEOMeta(title, description, image) {
        if (title) {
            document.title = title;
            let ogTitle = document.querySelector("meta[property='og:title']");
            if (ogTitle) ogTitle.setAttribute('content', title);
        }
        if (description) {
            // Trim description for SEO (optimal is ~150-160 chars)
            const cleanDesc = description.replace(/(<([^>]+)>)/gi, "").substring(0, 160) + "...";
            let metaDesc = document.querySelector("meta[name='description']");
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.setAttribute('name', 'description');
                document.head.appendChild(metaDesc);
            }
            metaDesc.setAttribute('content', cleanDesc);
            
            let ogDesc = document.querySelector("meta[property='og:description']");
            if (ogDesc) ogDesc.setAttribute('content', cleanDesc);
        }
        if (image) {
            let ogImage = document.querySelector("meta[property='og:image']");
            if (!ogImage) {
                ogImage = document.createElement('meta');
                ogImage.setAttribute('property', 'og:image');
                document.head.appendChild(ogImage);
            }
            ogImage.setAttribute('content', image);
        }
    }
}

// Initialize API
const movieAPI = new MovieAPI();
if (typeof window !== 'undefined') {
    window.movieAPI = movieAPI;
    window.MovieAPI = MovieAPI;
}

// 🚀 Auto-inject Canonical Tag on every page load & global image error fallback for broken Ophim CDN
document.addEventListener('DOMContentLoaded', () => {
    movieAPI.injectCanonical();
});

if (typeof window !== 'undefined') {
    window.addEventListener('error', function (e) {
        if (e && e.target && e.target.tagName === 'IMG') {
            const img = e.target;
            if (!img.dataset.fallbackTried) {
                img.dataset.fallbackTried = '1';
                if (img.src && img.src.includes('phimimg.com')) {
                    img.src = img.src.replace('phimimg.com', 'phimimg.com');
                } else if (img.src && img.src.includes('phimapi.com')) {
                    img.src = img.src.replace('phimapi.com', 'phimimg.com');
                } else if (img.src && !img.src.includes('android-chrome')) {
                    img.src = 'https://aphim.top/android-chrome-512x512.png';
                }
            }
        }
    }, true);
}




