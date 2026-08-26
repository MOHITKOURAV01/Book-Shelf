import { useMemo } from 'react';

import { useBooksByIds } from './useBooksByIds.js';
import { useWishlist } from './useWishlist.js';

/**
 * The wishlist, as books rather than as ids.
 *
 * The wishlist page used to resolve its ids against `src/data/books.js` — a
 * hardcoded copy of the catalogue that says in its own header it is a local
 * draft, and which had drifted: it held 16 books (`s1`-`s8`, `b1`-`b8`)
 * where the API serves 8 (`b1`-`b8`).
 *
 * `books.filter(b => wishlist.includes(b.id))` was wrong in both directions
 * and silent in both. A wishlisted book the local file did not have produced
 * no card and no message, while the heart stayed filled on the catalogue; and
 * the eight `s*` ids that existed *only* in the local file rendered cards for
 * books the API has never heard of, which 404 the moment they are clicked.
 * See #328.
 *
 * The fetching half now lives in `useBooksByIds`, because the Recently Viewed
 * strip turned out to have exactly the same bug and exactly the same needs.
 * See #336. What is left here is the wishlist-specific part: waiting for the
 * wishlist itself to settle before resolving anything.
 *
 * `missingIds` is the ids the catalogue answered 404 for — delisted books,
 * which the customer should be told about rather than have quietly vanish.
 * `failedIds` is the ids whose request did not complete, which is a different
 * thing: those books may well still exist, and saying otherwise would be a
 * lie told by a flaky network.
 */
export function useWishlistBooks() {
  const { wishlist, loading: wishlistLoading } = useWishlist();

  /*
   * The provider hands back a new array identity on every render. Memoising
   * on the joined ids keeps `useBooksByIds` from seeing a new array — and so
   * a new effect dependency — on every render of the page.
   */
  const key = Array.isArray(wishlist) ? wishlist.join(',') : '';
  const ids = useMemo(() => (key === '' ? [] : key.split(',')), [key]);

  /*
   * Nothing to resolve until the wishlist itself has settled — for a
   * signed-in user that is a round trip of its own, and resolving the empty
   * interim list would flash "your wishlist is empty".
   */
  const result = useBooksByIds(ids, { enabled: !wishlistLoading });

  return {
    ...result,
    loading: result.loading || wishlistLoading,
  };
}

export default useWishlistBooks;
