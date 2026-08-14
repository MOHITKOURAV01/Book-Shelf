import { useContext } from 'react';
import { WishlistContext } from '../context/WishlistContext.jsx';

/**
 * Access the wishlist.
 *
 * Prefer this over `useContext(WishlistContext)` directly. Reading the context
 * straight gives you `undefined` when the provider is missing, and every
 * caller then blows up on the destructuring line with a message that points
 * at the consumer rather than at the missing provider. This throws with the
 * actual cause instead — the same pattern `useCart` already uses.
 *
 * Returns:
 *   wishlist              array of book ids for the current session
 *   loading               true while the list is being fetched
 *   count                 wishlist.length
 *   isWishlisted(bookId)  membership test, so callers stop writing
 *                         `wishlist.includes(...)` by hand
 *   toggleWishlist(id)    add or remove; writes to the API when signed in and
 *                         to localStorage when not
 */
export function useWishlist() {
  const context = useContext(WishlistContext);

  if (context === undefined) {
    throw new Error(
      'useWishlist() must be used inside a <WishlistProvider>. ' +
        'Check that WishlistProvider wraps the component tree in main.jsx.'
    );
  }

  return context;
}

export default useWishlist;
