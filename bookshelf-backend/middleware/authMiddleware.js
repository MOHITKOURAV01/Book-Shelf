import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isAdmin } from '../utils/roles.js';
import { getJwtConfig } from '../config/jwt.js';
import { SESSION_COOKIE_NAME } from '../utils/cookies.js';

/**
 * Requires a valid session cookie.
 *
 * On success req.user is the full Mongoose user document with the password
 * removed — not the JWT payload. Controllers can rely on req.user._id and
 * req.user.role being present.
 */
export const protect = async (req, res, next) => {
  // req.cookies is undefined if cookie-parser has not run, so guard it
  // rather than throwing a TypeError inside auth middleware.
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }

  try {
    // The secret comes from config/jwt.js, which has already established that
    // there is a real one. The `|| 'fallback_secret'` that used to be here
    // meant a server started without JWT_SECRET would happily *verify* tokens
    // signed with a constant published in this repository.
    const { secret } = getJwtConfig();
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId).select('-password');

    // A token outlives the account it was issued for. Without this the
    // middleware called next() with req.user === null anyway, and the first
    // handler to touch req.user._id threw a TypeError that surfaced as a
    // 500 — when the right answer is 401.
    if (!user) {
      res.status(401);
      return next(new Error('Not authorized, user no longer exists'));
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    next(new Error('Not authorized, token failed'));
  }
};

/**
 * Requires an admin. Must be mounted after `protect`.
 */
export const admin = (req, res, next) => {
  if (!req.user) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }

  if (!isAdmin(req.user)) {
    res.status(403);
    return next(new Error('Not authorized as an admin'));
  }

  next();
};
