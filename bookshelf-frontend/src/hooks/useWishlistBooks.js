import { useEffect, useMemo, useRef, useState } from 'react';

import { getBooksByIds } from '../services/bookService.js';
import { useWishlist } from './useWishlist.js';

/**
 * A request this hook deliberately dropped on unmount.
 *
 * A cancellation never reaches the API client's error normalisation, so it
 * keeps the Axios shape. It is not a failure and must never be rendered — a
 * page that unmounted mid-request would otherwise flash "canceled" into its
 * error slot.
 */
function isCanceled(error) {
  return (
    error?.name === 'CanceledError' ||
    error?.code === 'ERR_CANCELED' ||
    error?.original?.code === 'ERR_CANCELED'
  );
}

/**
 * The wishlist, as books rather than as ids.
 *
 * The wishlist page used to resolve its ids against `src/data/books.js` — a
 * hardcoded copy of the catalogue that says in its own header it is a local
 * draft, and which has drifted: it holds 16 books (`s1`–`s8`, `b1`–`b8`)
 * where the API serves 8 (`b1`–`b8`).
 *
 * `books.filter(b => wishlist.includes(b.id))` is wrong in both directions
 * and silent in both. A wishlisted book the local file does not have produces
 * no card and no message, while the heart stays filled on the catalogue; and
 * the eight `s*` ids that exist *only* in the local file render cards for
 * books the API has never heard of, which 404 the moment they are clicked.
 * See #328.
 *
 * `missingIds` is the ids the catalogue answered 404 for — delisted books,
 * which the customer should be told about rather than have quietly vanish.
 * `failedIds` is the ids whose request did not complete, which is a different
 * thing: those books may well still exist, and saying otherwise would be a
 * lie told by a flaky network.
 */
export function useWishlistBooks() {
  const { wishlist, loading: wishlistLoading } = useWishlist();

  const [books, setBooks] = useState([]);
  const [missingIds, setMissingIds] = useState([]);
  const [failedIds, setFailedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /*
   * The provider hands back a new array identity on every render, so the
   * effect has to key on the ids themselves. Without this it refetches the
   * whole wishlist on every render of the page.
   */
  const key = useMemo(() => (Array.isArray(wishlist) ? wishlist.join(',') : ''), [wishlist]);

  // Read inside the effect so `wishlist` itself is not a dependency.
  const wishlistRef = useRef(wishlist);
  wishlistRef.current = wishlist;

  useEffect(() => {
    // Nothing to resolve until the wishlist itself has settled — for a
    // signed-in user that is a round trip of its own, and resolving the
    // empty interim list would flash "your wishlist is empty".
    if (wishlistLoading) {
      return undefined;
    }

    const ids = Array.isArray(wishlistRef.current) ? wishlistRef.current : [];

    if (ids.length === 0) {
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

    getBooksByIds(ids, { signal: controller.signal })
      .then((result) => {
        if (!active) {
          return;
        }

        // Follow the wishlist's own order rather than whichever response
        // came back first, so the list does not reshuffle between loads.
        const byId = new Map(result.books.map((book) => [book.id, book]));
        setBooks(ids.map((id) => byId.get(id)).filter(Boolean));

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
  }, [key, wishlistLoading]);

  return {
    books,
    missingIds,
    failedIds,
    loading: loading || wishlistLoading,
    error,
  };
}

export default useWishlistBooks;
