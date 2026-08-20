/**
 * Display helpers for a book record.
 *
 * These exist because the pages did this:
 *
 *     <span>★ {book.rating.toFixed(1)}</span>
 *
 * `rating` is not required by anything — not by the Order schema, not by
 * `books.json`, not by the query layer, which reads it as `book.rating` and
 * compares it against a filter. One record without it threw
 * `TypeError: Cannot read properties of undefined (reading 'toFixed')` and
 * took down the whole page rather than leaving one line blank. See #317.
 */

/** Books whose stock is at or below this are worth warning about. */
export const LOW_STOCK_THRESHOLD = 3;

/**
 * `null` rather than a fabricated 0.0 when there is no rating — a book nobody
 * has rated is not a book everybody rated badly. Callers decide what to draw
 * for `null`.
 */
export function formatRating(rating) {
  // `Number(null)` is 0 and `Number('')` is 0, so neither can be left to the
  // isFinite check — an unrated book would render as ★ 0.0.
  if (rating === null || rating === undefined || rating === '') {
    return null;
  }

  const value = Number(rating);

  if (!Number.isFinite(value)) {
    return null;
  }

  return value.toFixed(1);
}

/** Rupees, grouped the Indian way, matching the rest of the shop. */
export function formatPrice(price) {
  if (price === null || price === undefined || price === '') {
    return null;
  }

  const value = Number(price);

  if (!Number.isFinite(value)) {
    return null;
  }

  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Whether a book can be added to a cart.
 *
 * A record with no `inventory` field at all is treated as available. That is
 * the frontend's local copy of the catalogue, which has never had the field —
 * refusing to sell everything the moment this helper is introduced would be a
 * worse bug than the one it fixes.
 */
export function isInStock(book) {
  if (!book || book.inventory === undefined || book.inventory === null) {
    return true;
  }

  const inventory = Number(book.inventory);
  return Number.isFinite(inventory) && inventory > 0;
}

/**
 * A short sentence about availability, or null when there is nothing worth
 * saying — a well-stocked book does not need a badge.
 */
export function describeStock(book) {
  if (!book || book.inventory === undefined || book.inventory === null) {
    return null;
  }

  const inventory = Number(book.inventory);

  if (!Number.isFinite(inventory)) {
    return null;
  }

  if (inventory <= 0) {
    return 'Out of stock';
  }

  if (inventory <= LOW_STOCK_THRESHOLD) {
    return `Only ${inventory} left`;
  }

  return 'In stock';
}

export default {
  LOW_STOCK_THRESHOLD,
  formatRating,
  formatPrice,
  isInStock,
  describeStock,
};
