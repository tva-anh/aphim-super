// Data Caching & Performance Optimization
class DataCache {
    constructor() {
        this.cachePrefix = 'aphim_cache_v4_';
        this.cacheDuration = 1000 * 60 * 30; // 30 minutes
        this.requestCache = new Map(); // In-memory cache for ongoing requests
    }

    // Generate cache key
    getCacheKey(type, params = {}) {
        const paramStr = Object.entries(params)
            .sort()
            .map(([k, v]) => `${k}=${v}`)
            .join('&');
        return `${this.cachePrefix}${type}${paramStr ? '_' + paramStr : ''}`;
    }

    // Get from cache
    getFromCache(type, params = {}) {
        const key = this.getCacheKey(type, params);
        const cached = localStorage.getItem(key);

        if (!cached) return null;

        try {
            const data = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is still valid
            if (now - data.timestamp < this.cacheDuration) {
                // console.log(`✓ Cache hit: ${key}`);
                return data.value;
            } else {
                // Cache expired
                localStorage.removeItem(key);
                return null;
            }
        } catch (error) {
            console.error('Cache parse error:', error);
            localStorage.removeItem(key);
            return null;
        }
    }

    // Save to cache
    saveToCache(type, params = {}, value) {
        const key = this.getCacheKey(type, params);
        try {
            const data = {
                timestamp: Date.now(),
                value: value
            };
            localStorage.setItem(key, JSON.stringify(data));
            // console.log(`✓ Cached: ${key}`);
        } catch (error) {
            console.error('Cache save error:', error);
        }
    }

    // Deduplicate requests - prevent multiple identical requests
    async deduplicateRequest(key, requestFn) {
        // If request is already in progress, wait for it
        if (this.requestCache.has(key)) {
            // console.log(`⏳ Waiting for duplicate request: ${key}`);
            return this.requestCache.get(key);
        }

        // Start new request
        const promise = requestFn();
        this.requestCache.set(key, promise);

        try {
            const result = await promise;
            return result;
        } finally {
            // Clean up after request completes
            this.requestCache.delete(key);
        }
    }

    // Clear all cache
    clearAllCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.cachePrefix)) {
                localStorage.removeItem(key);
            }
        });
        // console.log('✓ Cache cleared');
    }

    // Clear specific cache type
    clearCacheType(type) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(`${this.cachePrefix}${type}`)) {
                localStorage.removeItem(key);
            }
        });
        // console.log(`✓ Cache cleared for type: ${type}`);
    }
}

// Initialize cache
const dataCache = new DataCache();

// Extend MovieAPI with caching
const originalGetMovieList = MovieAPI.prototype.getMovieList;
MovieAPI.prototype.getMovieList = async function (page = 1) {
    const cacheKey = `movies_list_${page}`;

    // Check cache first
    const cached = dataCache.getFromCache('movies_list', { page });
    if (cached) return cached;

    // Deduplicate requests
    const result = await dataCache.deduplicateRequest(cacheKey, () =>
        originalGetMovieList.call(this, page)
    );

    // Save to cache
    if (result) {
        dataCache.saveToCache('movies_list', { page }, result);
    }

    return result;
};

const originalGetMovieDetail = MovieAPI.prototype.getMovieDetail;
MovieAPI.prototype.getMovieDetail = async function (slug) {
    const cacheKey = `movie_detail_${slug}`;

    // Check cache first
    const cached = dataCache.getFromCache('movie_detail', { slug });
    if (cached) return cached;

    // Deduplicate requests
    const result = await dataCache.deduplicateRequest(cacheKey, () =>
        originalGetMovieDetail.call(this, slug)
    );

    // Save to cache
    if (result) {
        dataCache.saveToCache('movie_detail', { slug }, result);
    }

    return result;
};

const originalSearchMovies = MovieAPI.prototype.searchMovies;
MovieAPI.prototype.searchMovies = async function (keyword, page = 1) {
    const cacheKey = `search_${keyword}_${page}`;

    // Check cache first
    const cached = dataCache.getFromCache('search', { keyword, page });
    if (cached) return cached;

    // Deduplicate requests
    const result = await dataCache.deduplicateRequest(cacheKey, () =>
        originalSearchMovies.call(this, keyword, page)
    );

    // Save to cache
    if (result) {
        dataCache.saveToCache('search', { keyword, page }, result);
    }

    return result;
};

const originalGetMoviesByCategory = MovieAPI.prototype.getMoviesByCategory;
MovieAPI.prototype.getMoviesByCategory = async function (categorySlug, page = 1) {
    const cacheKey = `category_${categorySlug}_${page}`;

    // Check cache first
    const cached = dataCache.getFromCache('category', { categorySlug, page });
    if (cached) return cached;

    // Deduplicate requests
    const result = await dataCache.deduplicateRequest(cacheKey, () =>
        originalGetMoviesByCategory.call(this, categorySlug, page)
    );

    // Save to cache
    if (result) {
        dataCache.saveToCache('category', { categorySlug, page }, result);
    }

    return result;
};

const originalGetMoviesByCountry = MovieAPI.prototype.getMoviesByCountry;
MovieAPI.prototype.getMoviesByCountry = async function (countrySlug, page = 1) {
    const cacheKey = `country_${countrySlug}_${page}`;

    // Check cache first
    const cached = dataCache.getFromCache('country', { countrySlug, page });
    if (cached) return cached;

    // Deduplicate requests
    const result = await dataCache.deduplicateRequest(cacheKey, () =>
        originalGetMoviesByCountry.call(this, countrySlug, page)
    );

    // Save to cache
    if (result) {
        dataCache.saveToCache('country', { countrySlug, page }, result);
    }

    return result;
};

const originalGetCategories = MovieAPI.prototype.getCategories;
MovieAPI.prototype.getCategories = async function () {
    // Check cache first
    const cached = dataCache.getFromCache('categories');
    if (cached) return cached;

    // Deduplicate requests
    const result = await dataCache.deduplicateRequest('categories', () =>
        originalGetCategories.call(this)
    );

    // Save to cache
    if (result) {
        dataCache.saveToCache('categories', {}, result);
    }

    return result;
};

const originalGetCountries = MovieAPI.prototype.getCountries;
MovieAPI.prototype.getCountries = async function () {
    // Check cache first
    const cached = dataCache.getFromCache('countries');
    if (cached) return cached;

    // Deduplicate requests
    const result = await dataCache.deduplicateRequest('countries', () =>
        originalGetCountries.call(this)
    );

    // Save to cache
    if (result) {
        dataCache.saveToCache('countries', {}, result);
    }

    return result;
};

// Parallel loading helper
async function loadDataInParallel(tasks) {
    return Promise.allSettled(tasks);
}

// Preload critical data
async function preloadCriticalData() {
    // console.log('🚀 Preloading critical data...');

    const tasks = [
        movieAPI.getCategories(),
        movieAPI.getCountries(),
        movieAPI.getMovieList(1)
    ];

    const results = await loadDataInParallel(tasks);

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            // console.log(`✓ Preloaded task ${index + 1}`);
        } else {
            // console.warn(`✗ Preload task ${index + 1} failed:`, result.reason);
        }
    });
}
