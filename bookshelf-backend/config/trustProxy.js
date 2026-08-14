/**
 * How much of X-Forwarded-For to believe.
 *
 * Express derives `req.ip` from the socket unless `trust proxy` is set, in
 * which case it walks X-Forwarded-For instead. That setting was never
 * configured, so behind a reverse proxy — which is every real deployment —
 * `req.ip` was the proxy's own address, identical for every visitor. The
 * login rate limiter keys on `req.ip`, so every user in the world shared one
 * bucket: ten bad passwords from one script held the login endpoint at 429
 * for everybody. See #298.
 *
 * The naive fix is `app.set('trust proxy', true)`, and it is worse than the
 * bug. X-Forwarded-For is a client-supplied header. Trusting all of it means
 * an attacker sends a different value on every request, gets a fresh
 * identity each time and bypasses the limiter entirely — while a
 * well-behaved user still shares a bucket with their whole office.
 *
 * The safe form is a hop count. `trust proxy = 1` tells Express to take the
 * entry one from the *end* of the chain, which the outermost proxy appended
 * and the client cannot control. Set it to the number of proxies actually in
 * front of this app.
 *
 * Accepted values for TRUST_PROXY:
 *
 *   unset / "false" / "0" / "off"  trust nothing (default — correct locally)
 *   "1", "2", ...                  number of trusted hops (what you want)
 *   "loopback" | "linklocal" |     Express's named ranges
 *     "uniquelocal"
 *   "10.0.0.0/8, 192.168.0.1"      explicit addresses or subnets
 *   "true" / "on"                  trust the whole header (unsafe — warns)
 */

const FALSEY = new Set(['', 'false', '0', 'off', 'no']);
const TRUTHY = new Set(['true', 'on', 'yes']);
const NAMED_RANGES = new Set(['loopback', 'linklocal', 'uniquelocal']);

/**
 * Turn the raw env value into something `app.set('trust proxy', ...)` accepts.
 *
 * Returns `{ value, warning }`. The warning is a string a caller should log,
 * or null. Parsing never throws: refusing to boot over a proxy setting would
 * be a worse outcome than booting with the safe default and saying so.
 */
export function parseTrustProxy(raw) {
  if (raw === undefined || raw === null) {
    return { value: false, warning: null };
  }

  const normalised = String(raw).trim().toLowerCase();

  if (FALSEY.has(normalised)) {
    return { value: false, warning: null };
  }

  if (TRUTHY.has(normalised)) {
    return {
      value: true,
      warning:
        'TRUST_PROXY=true trusts the whole X-Forwarded-For header, which the ' +
        'client controls. Anyone can then forge a fresh IP per request and ' +
        'walk past the rate limiter. Set it to the number of proxies in ' +
        'front of this app instead (usually TRUST_PROXY=1).',
    };
  }

  // A hop count. The safe answer, so it is checked before the list form —
  // otherwise "1" would be read as an IP address.
  if (/^\d+$/.test(normalised)) {
    const hops = Number.parseInt(normalised, 10);

    if (hops === 0) {
      return { value: false, warning: null };
    }

    return { value: hops, warning: null };
  }

  if (NAMED_RANGES.has(normalised)) {
    return { value: normalised, warning: null };
  }

  // A comma-separated list of addresses, subnets or named ranges. Express
  // parses these itself; passing the original casing through because IPv6
  // literals are conventionally lowercase but hostnames are not ours to
  // normalise.
  const entries = String(raw)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length > 0) {
    return { value: entries.join(', '), warning: null };
  }

  return {
    value: false,
    warning: `TRUST_PROXY value "${raw}" was not understood. Trusting no proxy.`,
  };
}

/**
 * Apply the setting to an Express app and report what happened.
 *
 * The production warning is the one that matters: a deployment on Render,
 * Railway, Fly, Heroku or behind nginx with TRUST_PROXY unset is almost
 * certainly suffering the shared-bucket bug, and nothing else in the system
 * will tell anyone.
 */
export function configureTrustProxy(app, env = process.env) {
  const { value, warning } = parseTrustProxy(env.TRUST_PROXY);

  app.set('trust proxy', value);

  if (warning) {
    console.warn(`[config] ${warning}`);
  }

  if (value === false && env.NODE_ENV === 'production') {
    console.warn(
      '[config] NODE_ENV=production with TRUST_PROXY unset. If this app sits ' +
        'behind a proxy or load balancer, req.ip is the proxy for every ' +
        'request and per-IP rate limits apply to all users at once. Set ' +
        'TRUST_PROXY to the number of proxies in front of it.'
    );
  }

  return value;
}

export default { parseTrustProxy, configureTrustProxy };
