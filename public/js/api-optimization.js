// API Request Optimization
class APIOptimizer {
    constructor() {
        this.requestQueue = [];
        this.isProcessing = false;
        this.maxConcurrentRequests = 3;
        this.requestTimeout = 10000; // 10 seconds
    }

    // Queue request with concurrency control
    async queueRequest(fn, priority = 0) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ fn, resolve, reject, priority });
            this.requestQueue.sort((a, b) => b.priority - a.priority);
            this.processQueue();
        });
    }

    // Process request queue
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        const activeRequests = [];

        while (this.requestQueue.length > 0 && activeRequests.length < this.maxConcurrentRequests) {
            const { fn, resolve, reject } = this.requestQueue.shift();

            const promise = Promise.race([
                fn(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
                )
            ])
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    activeRequests.splice(activeRequests.indexOf(promise), 1);
                    if (activeRequests.length === 0 && this.requestQueue.length > 0) {
                        this.processQueue();
                    }
                });

            activeRequests.push(promise);
        }

        if (activeRequests.length > 0) {
            await Promise.allSettled(activeRequests);
        }

        this.isProcessing = false;

        if (this.requestQueue.length > 0) {
            this.processQueue();
        }
    }

    // Batch requests
    async batchRequests(requests, batchSize = 3) {
        const results = [];

        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch);
            results.push(...batchResults);
        }

        return results;
    }
}

// Initialize API optimizer
const apiOptimizer = new APIOptimizer();

// Extend fetch with timeout
const originalFetch = window.fetch;
window.fetch = function (...args) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), 10000)
    );

    return Promise.race([
        originalFetch.apply(this, args),
        timeout
    ]);
};

// Add request deduplication to MovieAPI
const originalFetch2 = MovieAPI.prototype.fetchWithAuth;
MovieAPI.prototype.fetchWithAuth = async function (url, options = {}) {
    // Use request queue for better concurrency control
    return apiOptimizer.queueRequest(
        () => originalFetch2.call(this, url, options),
        options.priority || 0
    );
};
