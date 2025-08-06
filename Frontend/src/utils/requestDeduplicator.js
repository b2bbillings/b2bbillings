class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
    this.cache = new Map();
    this.lastRequestTime = new Map();
    this.DEBOUNCE_TIME = 100; // 100ms
    this.CACHE_TIME = 30000; // 30 seconds
  }

  async deduplicate(key, requestFn, options = {}) {
    const {
      debounceTime = this.DEBOUNCE_TIME,
      cacheTime = this.CACHE_TIME,
      skipCache = false,
    } = options;

    // Check if same request is already pending
    if (this.pendingRequests.has(key)) {
      console.warn(`🚫 Duplicate request blocked: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Check cache first (unless skipped)
    if (!skipCache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        console.log(`📋 Cache hit: ${key}`);
        return cached.data;
      }
    }

    // Check debounce timing
    const lastRequest = this.lastRequestTime.get(key);
    if (lastRequest && Date.now() - lastRequest < debounceTime) {
      console.warn(`⏱️ Request debounced: ${key}`);
      // Return cached data if available
      const cached = this.cache.get(key);
      if (cached) return cached.data;

      // Wait for debounce period
      await new Promise((resolve) => setTimeout(resolve, debounceTime));
    }

    // Make the request
    console.log(`🚀 Making request: ${key}`);
    this.lastRequestTime.set(key, Date.now());

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;

      // Cache successful results
      if (!skipCache) {
        this.cache.set(key, {
          data: result,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (error) {
      console.error(`❌ Request failed: ${key}`, error);
      throw error;
    }
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
    this.pendingRequests.clear();
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedItems: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export default new RequestDeduplicator();
