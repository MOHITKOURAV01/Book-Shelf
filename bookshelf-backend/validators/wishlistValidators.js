import { required, trim } from '../utils/validators.js';
import {
  bookIdRule,
  wishlistBatchRule,
  normaliseWishlistField,
} from '../utils/wishlist.js';

/**
 * POST /api/wishlist
 *
 * `validateBody` replaces req.body with only the fields named here, which is
 * the same protection the auth routes get: a request carrying an extra key
 * cannot smuggle it through to the database.
 */
export const toggleWishlistSchema = {
  bookId: {
    normalise: trim,
    rules: [required('bookId'), bookIdRule('bookId')],
  },
};

/**
 * POST /api/wishlist/merge
 *
 * Runs on every login and register, so it is the endpoint most likely to be
 * hit with whatever happens to be in a browser's localStorage — including
 * whatever a previous version of the frontend put there.
 */
export const mergeWishlistSchema = {
  localWishlist: {
    normalise: normaliseWishlistField,
    rules: [required('localWishlist'), wishlistBatchRule('localWishlist')],
  },
};
