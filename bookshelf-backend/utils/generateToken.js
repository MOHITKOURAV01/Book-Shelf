import jwt from 'jsonwebtoken';
import { getJwtConfig } from '../config/jwt.js';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './cookies.js';

/**
 * Sign a session token and attach it as an httpOnly cookie.
 *
 * The secret and the lifetime both come from config/jwt.js. That module has
 * already refused to start the process if the secret is missing, too short or
 * a known placeholder, so there is no `|| 'fallback_secret'` to fall through
 * to here — the previous version of this file would sign real sessions with a
 * constant published in this repository whenever JWT_SECRET was unset.
 *
 * The cookie's maxAge is the token's own lifetime in milliseconds rather than
 * a hardcoded seven days. They were two independent numbers before, so
 * JWT_EXPIRES_IN=1h produced a cookie the browser kept for a week and the
 * server rejected for all but the first hour of it.
 */
const generateToken = (res, userId, email, role) => {
  const { secret, expiresIn, maxAgeMs } = getJwtConfig();

  const token = jwt.sign({ userId, email, role }, secret, { expiresIn });

  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions({ maxAgeMs }));

  return token;
};

export default generateToken;
