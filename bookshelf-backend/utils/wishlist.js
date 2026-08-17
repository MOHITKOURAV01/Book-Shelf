/**
 * Wishlist input rules, as pure functions.
 *
 * `POST /api/wishlist` and `POST /api/wishlist/merge` were the only write
 * endpoints in the API with nothing in front of them. Everything else routes
 * through `validateBody(schema)` — see routes/authRoutes.js. The wishlist
 * controller checked `if (!bookId)` and `Array.isArray(localWishlist)` and
 * handed whatever survived to Mongoose, which cast it against
 * `wishlist: [{ type: String }]`:
 *
 *   bookId: 123           -> stored as "123"
 *   bookId: true          -> stored as "true"
 *   bookId: {"$ne": null} -> ValidationError, reported to the client as a 500
 *   bookId: ["a","b"]     -> ValidationError, reported to the client as a 500
 *
 * None of those are things the frontend sends, which is exactly why nothing
 * caught them.
 */

/**
 * Book ids in data/books.json are short slugs ("b1", "b2"). 100 characters is
 * far above anything legitimate and far below anything worth storing by
 * accident.
 */
export const MAX_BOOK_ID_LENGTH = 100;

/**
 * A cap on the whole list.
 *
 * There was none, so a loop over POST /api/wishlist with distinct random ids
 * grew one user document until it hit Mongo's 16 MB limit — at which point
 * every subsequent save on that user fails, not just the wishlist ones.
 */
export const MAX_WISHLIST_SIZE = 500;

/**
 * A cap on one merge request.
 *
 * /merge runs automatically on every login and register, so it is the easiest
 * endpoint in the app to reach, and it accepted an array of any length.
 */
export const MAX_MERGE_BATCH = 200;

/**
 * Control characters have no place in an identifier and are the usual vehicle
 * for log injection when an id is later printed.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function isValidBookId(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();

  if (trimmed === '' || trimmed.length > MAX_BOOK_ID_LENGTH) {
    return false;
  }

  return !CONTROL_CHARACTERS.test(trimmed);
}

export function normaliseBookId(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * A rule in the shape utils/validators.js expects: returns an error string or
 * null.
 */
export function bookIdRule(field = 'bookId') {
  return (value) => {
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }

    const trimmed = value.trim();

    if (trimmed === '') {
      return `${field} cannot be empty`;
    }

    if (trimmed.length > MAX_BOOK_ID_LENGTH) {
      return `${field} must be at most ${MAX_BOOK_ID_LENGTH} characters`;
    }

    if (CONTROL_CHARACTERS.test(trimmed)) {
      return `${field} contains characters that are not allowed`;
    }

    return null;
  };
}

/**
 * Normalise a merge payload: trim every entry, drop duplicates, keep order.
 *
 * Returns the cleaned list plus whatever was wrong with it, so the caller can
 * decide between "reject the request" and "take what is usable". The endpoint
 * rejects — a client sending junk has a bug worth surfacing, and silently
 * accepting half of a merge is how a wishlist quietly loses entries.
 */
export function normaliseWishlistBatch(value, { field = 'localWishlist' } = {}) {
  if (!Array.isArray(value)) {
    return { ids: [], errors: [`${field} must be an array`] };
  }

  if (value.length > MAX_MERGE_BATCH) {
    return {
      ids: [],
      errors: [
        `${field} must contain at most ${MAX_MERGE_BATCH} entries, received ${value.length}`,
      ],
    };
  }

  const errors = [];
  const ids = [];
  const seen = new Set();

  value.forEach((entry, index) => {
    if (!isValidBookId(entry)) {
      // Say which index, so a client with one bad entry in fifty can find it.
      errors.push(
        `${field}[${index}] must be a non-empty string of at most ` +
          `${MAX_BOOK_ID_LENGTH} characters`
      );
      return;
    }

    const id = entry.trim();

    // The old code deduped with `new Set([...user.wishlist, ...localWishlist])`,
    // which dedupes by identity — two objects with identical contents both
    // survived, and " b1" and "b1" were two different books.
    if (seen.has(id)) {
      return;
    }

    seen.add(id);
    ids.push(id);
  });

  return { ids, errors };
}

/**
 * The rule for the array itself, for use in a validateBody spec.
 */
export function wishlistBatchRule(field = 'localWishlist') {
  return (value) => {
    const { errors } = normaliseWishlistBatch(value, { field });
    return errors.length > 0 ? errors[0] : null;
  };
}

/**
 * Normaliser for the array, run before the rules.
 */
export function normaliseWishlistField(value) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => (typeof entry === 'string' ? entry.trim() : entry));
}

/**
 * How much room is left before MAX_WISHLIST_SIZE.
 */
export function remainingCapacity(currentSize, max = MAX_WISHLIST_SIZE) {
  return Math.max(0, max - currentSize);
}
