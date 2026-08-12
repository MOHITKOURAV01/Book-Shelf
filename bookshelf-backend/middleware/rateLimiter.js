/**
 * A fixed-window rate limiter held in process memory.
 *
 * Deliberately dependency-free. The trade-off is that the counters live in
 * one process: behind more than one instance, or on a platform that recycles
 * the process, each instance enforces its own limit. For a single-instance
 * deployment that is fine, and it is a great deal better than the nothing
 * that is here today. If this ever runs on more than one instance the store
 * needs to move to Redis — the interface below is small enough that only
 * `hits` changes.
 */

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX = 10;

/**
 * Express sets req.ip from the socket, or from X-Forwarded-For when the
 * 'trust proxy' setting is on. Falling back to a constant would put every
 * unidentifiable caller in one shared bucket, which is the safe direction to
 * fail for a limiter.
 */
function defaultKeyGenerator(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX,
  message = 'Too many requests. Please try again later.',
  keyGenerator = defaultKeyGenerator,
  resetOnSuccess = false,
  // Injectable so the tests can advance time without sleeping.
  now = () => Date.now(),
} = {}) {
  const hits = new Map();

  function prune(currentTime) {
    for (const [key, entry] of hits) {
      if (entry.expiresAt <= currentTime) {
        hits.delete(key);
      }
    }
  }

  function middleware(req, res, next) {
    const currentTime = now();
    const key = keyGenerator(req);

    let entry = hits.get(key);

    if (!entry || entry.expiresAt <= currentTime) {
      entry = { count: 0, expiresAt: currentTime + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.expiresAt - currentTime) / 1000);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({ message });
    }

    if (resetOnSuccess) {
      // Clear the counter once the response turns out to have succeeded, so
      // a legitimate user who mistypes a password a few times and then gets
      // in is not still carrying those failures.
      res.on('finish', () => {
        if (res.statusCode < 400) {
          hits.delete(key);
        }
      });
    }

    // Cheap opportunistic cleanup. Without it the map grows one entry per
    // distinct IP forever. Doing it on a fraction of requests keeps the cost
    // off the hot path; a setInterval would keep the event loop alive and
    // stop the process exiting cleanly in tests.
    if (hits.size > 1000) {
      prune(currentTime);
    }

    next();
  }

  // Exposed for tests and for a future admin endpoint.
  middleware.reset = () => hits.clear();
  middleware.size = () => hits.size;
  middleware.prune = prune;

  return middleware;
}

/**
 * Login is the endpoint worth protecting: it returns a fast, distinguishable
 * 401 for a wrong password, so it can be brute-forced as fast as the network
 * allows. Successful logins clear the counter.
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  resetOnSuccess: true,
  message:
    'Too many login attempts from this address. Please try again in a few minutes.',
});

/**
 * Registration is limited more loosely — it is about stopping a script
 * filling the users collection, not about guessing a secret.
 */
export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message:
    'Too many accounts created from this address. Please try again later.',
});

export default createRateLimiter;
