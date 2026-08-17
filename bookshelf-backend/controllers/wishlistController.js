import userRepository from '../repositories/userRepository.js';
import { getBookById } from '../repositories/bookRepository.js';
import {
  normaliseWishlistBatch,
  MAX_WISHLIST_SIZE,
} from '../utils/wishlist.js';

/**
 * Every handler here ends with `next(error)` rather than its own
 * `res.status(500).json({ message: 'Server error', error: error.message })`.
 *
 * That pattern did three things wrong: it bypassed the errorHandler mounted in
 * app.js, so wishlist failures had a different response shape from every other
 * route; it returned the raw internal message to the client unconditionally,
 * when errorMiddleware.js deliberately withholds internals outside
 * development; and it reported client mistakes as 500s, which makes a bad
 * request indistinguishable from a broken server in any error-rate graph.
 */

/**
 * Reject an id that is not in the catalogue.
 *
 * Nothing checked this, so `{"bookId":"does-not-exist"}` was stored happily
 * and the wishlist page rendered a gap where a book should be. The catalogue
 * is a cached in-memory array, so this costs nothing.
 */
function findBookOr404(bookId, res) {
  const book = getBookById(bookId);

  if (!book) {
    res.status(404).json({ message: `Book not found: ${bookId}` });
    return null;
  }

  return book;
}

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res, next) => {
  try {
    // Was findById, which loads the whole user document — password hash
    // included — to read one field off it.
    const wishlist = await userRepository.getWishlist(req.user._id);

    if (wishlist === null) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(wishlist);
  } catch (error) {
    return next(error);
  }
};

// @desc    Toggle book in wishlist
// @route   POST /api/wishlist
// @access  Private
export const toggleWishlist = async (req, res, next) => {
  try {
    // Shape and length are enforced by validateBody(toggleWishlistSchema) on
    // the route, and bookId arrives trimmed. The old handler's entire check
    // was `if (!bookId)`, so 123, true, [] and {"$ne":null} all got through.
    const { bookId } = req.body;

    if (!findBookOr404(bookId, res)) {
      return undefined;
    }

    // One atomic operation, not a read followed by a whole-array overwrite.
    // A $pull that matches tells us the book was there and is now gone.
    const afterRemoval = await userRepository.removeFromWishlist(
      req.user._id,
      bookId
    );

    if (afterRemoval !== null) {
      return res.json(afterRemoval);
    }

    // Not present, so add it — unless the list is full. The size check lives
    // inside the query, so two concurrent adds cannot both see room for one.
    const afterAddition = await userRepository.addToWishlist(
      req.user._id,
      bookId,
      { maxSize: MAX_WISHLIST_SIZE }
    );

    if (afterAddition !== null) {
      return res.json(afterAddition);
    }

    // The update matched nothing. Either the user is gone or the guard
    // rejected; only now is it worth a second query to find out which.
    if (!(await userRepository.exists(req.user._id))) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(409).json({
      message: `Wishlist is full. It can hold at most ${MAX_WISHLIST_SIZE} books.`,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Merge a guest's local wishlist into the account
// @route   POST /api/wishlist/merge
// @access  Private
export const mergeWishlist = async (req, res, next) => {
  try {
    const { localWishlist } = req.body;

    // validateBody has already rejected a non-array, an oversized batch and
    // any malformed entry. Re-normalising here is what turns the validated
    // input into the deduplicated list to write; it is cheap, and it keeps
    // this handler correct if it is ever mounted without the middleware.
    const { ids, errors } = normaliseWishlistBatch(localWishlist);

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (ids.length === 0) {
      const wishlist = await userRepository.getWishlist(req.user._id);

      if (wishlist === null) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json(wishlist);
    }

    const unknown = ids.filter((id) => !getBookById(id));

    if (unknown.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: unknown.map((id) => ({
          field: 'localWishlist',
          message: `Book not found: ${id}`,
        })),
      });
    }

    const merged = await userRepository.addManyToWishlist(req.user._id, ids, {
      maxSize: MAX_WISHLIST_SIZE,
    });

    if (merged !== null) {
      return res.json(merged);
    }

    if (!(await userRepository.exists(req.user._id))) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(409).json({
      message:
        `Merging ${ids.length} books would take the wishlist over its limit ` +
        `of ${MAX_WISHLIST_SIZE}.`,
    });
  } catch (error) {
    return next(error);
  }
};
