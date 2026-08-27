import { useEffect, useMemo, useRef, useState } from 'react';

import { getBooksByIds } from '../services/bookService.js';

/**
 * A request this hook deliberately dropped on unmount.
 *
 * A cancellation never reaches the API client's error normalisation, so it
 * keeps the Axios shape. It is not a failure and must never be rendered — a
 * page that unmounted mid-request would otherwise flash "canceled" into its
 * error slot.
 */
export function isCanceled(error) {
  return (
    error?.name === 'CanceledError' ||
    error?.code === 'ERR_CANCELED' ||
    error?.original?.code === 'ERR_CANCELED'
  );
}

/**
 * Resolve a list of book ids against the catalogue.
 *
 * This is the shared half of `useWishlistBooks`, extracted because a second
 * caller appeared: the Recently Viewed strip was still resolving its stored
 * ids against `src/data/books.js`, the hardcoded local snapshot, and needed
 * exactly the same thing — see #336 and, for the wishlist, #328.
 *
 * Everything that made the wishlist version careful applies identically here,
 * and none of it is obvious enough to want written twice:
 *
 *   - The result follows the order of `ids`, not the order the responses
 *     happened to arrive in, so a list does not reshuffle between loads.
 *   - The effect keys on the joined ids rather than on the array, because a
 *     caller holding the array in state hands back a new identity on every
 *     render and the effect would refetch forever.
 *   - The request is aborted on unmount and on a change of ids, and the
 *     cancellation is swallowed rather than rendered.
 *   - `missingIds` (the catalogue answered 404) is reported separately from
 *     `failedIds` (the request did not complete). Saying "no longer in the
 *     catalogue" about a book that is merely unreachable would be a lie told
 *     by a flaky network.
 *
 * @param {string[]} ids
 * @param {{ enabled?: boolean }} options
 *   `enabled: false` holds the hook in its loading state without fetching —
 *   for a caller whose ids are themselves still loading. Resolving the empty
 *   interim list would flash an empty state.
 */
export function useBooksByIds(ids, { enabled = true } = {}) {
  const [books, setBooks] = useState([]);
  const [missingIds, setMissingIds] = useState([]);
  const [failedIds, setFailedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const key = useMemo(() => (Array.isArray(ids) ? ids.join(',') : ''), [ids]);

  // Read inside the effect so `ids` itself is not a dependency.
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const requested = Array.isArray(idsRef.current) ? idsRef.current : [];

    if (requested.length === 0) {
      setBooks([]);
      setMissingIds([]);
      setFailedIds([]);
      setError(null);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    getBooksByIds(requested, { signal: controller.signal })
      .then((result) => {
        if (!active) {
          return;
        }

        const byId = new Map(result.books.map((book) => [book.id, book]));
        setBooks(requested.map((id) => byId.get(id)).filter(Boolean));

        setMissingIds(result.missingIds);
        setFailedIds(result.failedIds);
      })
      .catch((requestError) => {
        if (!active || isCanceled(requestError)) {
          return;
        }

        setBooks([]);
        setError(requestError);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, enabled]);

  return { books, missingIds, failedIds, loading, error };
}

export default useBooksByIds;
