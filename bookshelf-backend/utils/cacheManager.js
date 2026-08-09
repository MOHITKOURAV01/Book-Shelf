import NodeCache from 'node-cache';

// Initialize cache with standard TTL of 5 minutes (300 seconds)
// and check for expired keys every 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

class CacheManager {
  get(key) {
    return cache.get(key);
  }

  set(key, value, ttl = 300) {
    return cache.set(key, value, ttl);
  }

  del(key) {
    return cache.del(key);
  }

  flush() {
    return cache.flushAll();
  }
}

export default new CacheManager();
