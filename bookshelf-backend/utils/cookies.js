import { getJwtConfig } from '../config/jwt.js';

export const SESSION_COOKIE_NAME = 'token';

/**
 * The attributes the session cookie is set with.
 *
 * These live here rather than inline at the two call sites because a cookie is
 * only cleared if the clearing call matches the setting call. `logout` used to
 * send `{ httpOnly: true, expires: new Date(0) }` while `generateToken` sent
 * httpOnly, secure, sameSite and maxAge — they happened to still match on the
 * fields browsers key on (name, domain, path), but nothing kept them that way.
 * Adding a `domain` to one and not the other would have produced a logout that
 * silently leaves the user logged in.
 *
 * `path` is stated explicitly for the same reason. It defaults to '/', but a
 * default that has to agree across two files is a default worth writing down.
 */
export function sessionCookieOptions({ maxAgeMs } = {}) {
  const { isProduction } = getJwtConfig();

  const options = {
    httpOnly: true,
    // Never send the session over plaintext HTTP in production. Left off in
    // development because localhost is not served over TLS and the browser
    // would drop the cookie entirely.
    secure: isProduction,
    // The frontend is a separate origin but a same-site deployment; 'strict'
    // is what the app has always used and nothing here needs cross-site POSTs
    // to carry the session.
    sameSite: 'strict',
    path: '/',
  };

  if (maxAgeMs !== undefined) {
    options.maxAge = maxAgeMs;
  }

  return options;
}

/**
 * Options for removing the cookie.
 *
 * Same attributes, no maxAge, an expiry in the past. Derived from the setter
 * so the two cannot drift.
 */
export function clearSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    expires: new Date(0),
  };
}
