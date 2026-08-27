import { useCallback, useEffect, useMemo, useState } from 'react';

import { useBooksByIds } from './useBooksByIds.js';
import {
  forgetBookViews,
  readRecentlyViewedExcept,
} from '../utils/recentlyViewed.js';

/**
 * The reader's recent history, as books rather than as ids.
 *
 * The strip used to resolve its ids against `src/data/books.js`:
 *
 *     ids.map((id) => books.find((book) => String(book.id) === id))
 *        .filter(Boolean)
 *
 * That file is the deprecated local snapshot of the catalogue, and says so in
 * its own header — no `inventory` field, prices that go stale the moment the
 * catalogue is edited, and no record at all for a book added to the backend.
 * All three showed up on screen (#336):
 *
 *   - A price edited in the backend updated in the grid and did not update in
 *     the strip below it, on the same page.
 *   - A book added to the backend produced `undefined` from `find`, which
 *     `.filter(Boolean)` dropped silently. Viewed, and then simply absent.
 *   - `isInStock()` treats a missing `inventory` as available, so a sold-out
 *     book kept an enabled "Add to cart" in the strip while the identical
 *     card above it read "Out of stock".
 *
 * It reads the API now, through the same `useBooksByIds` the wishlist uses.
 *
 * The ids themselves are re-read on every navigation rather than held in
 * state: `recordBookView` writes to localStorage from a different effect in
 * the same component, so state seeded once at mount would be one navigation
 * behind.
 *
 * @param {{ excludeId?: string, locationKey?: string, enabled?: boolean }} options
 *   `excludeId` is the book the page is already showing. `locationKey` is
 *   React Router's `location.key`, which changes on every navigation and is
 *   what makes the stored list re-read. `enabled: false` reads nothing and
 *   requests nothing — the strip is hidden on most routes, and hooks cannot
 *   be called conditionally, so the caller says so here instead.
 */
export function useRecentlyViewedBooks({
  excludeId,
  locationKey,
  enabled = true,
} = {}) {
  const [ids, setIds] = useState(() =>
    enabled ? readRecentlyViewedExcept(excludeId) : []
  );

  useEffect(() => {
    setIds(enabled ? readRecentlyViewedExcept(excludeId) : []);
  }, [excludeId, locationKey, enabled]);

  const { books, missingIds, failedIds, loading, error } = useBooksByIds(ids, {
    enabled,
  });

  /*
   * Ids the catalogue answered 404 for are dropped from storage.
   *
   * A delisted book is not coming back, and leaving it in the list means
   * asking the API about it on every page load for as long as the browser
   * keeps the value. `failedIds` is deliberately not touched — those books
   * probably still exist, and forgetting a reader's history because their
   * connection dropped would be worse than the bug being fixed.
   */
  const missingKey = missingIds.join(',');

  useEffect(() => {
    if (missingKey === '') {
      return;
    }

    forgetBookViews(missingKey.split(','));
  }, [missingKey]);

  const refresh = useCallback(() => {
    setIds(enabled ? readRecentlyViewedExcept(excludeId) : []);
  }, [excludeId, enabled]);

  return useMemo(
    () => ({ books, missingIds, failedIds, loading, error, refresh }),
    [books, missingIds, failedIds, loading, error, refresh]
  );
}

export default useRecentlyViewedBooks;
