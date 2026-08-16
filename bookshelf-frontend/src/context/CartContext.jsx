import { createContext, useState, useEffect, useCallback } from 'react';

import {
  CART_STORAGE_KEY,
  MAX_CART_ITEMS,
  MAX_QUANTITY,
  clampQuantity,
  normaliseCartItem,
  readCart,
  writeCart,
} from '../utils/cartStorage.js';

export const CartContext = createContext();

/**
 * The cart.
 *
 * Everything that touches localStorage goes through utils/cartStorage.js,
 * which validates rather than trusting. The previous version handed
 * `JSON.parse(localStorage.getItem('cart'))` straight to useState — and `{}`
 * is valid JSON, so a single bad value made `cart.reduce` throw on the first
 * line of CartDrawer's render, on every route, permanently.
 */
export function CartProvider({ children }) {
  const [cart, setCart] = useState(() =>
    readCart(typeof window === 'undefined' ? null : window.localStorage)
  );

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    // writeCart swallows a failure and reports false. A full quota, or Safari
    // private browsing where setItem always throws, degrades to a cart that
    // works for this session — it does not throw out of an effect and take
    // the tree down.
    writeCart(window.localStorage, cart);
  }, [cart]);

  /**
   * Keep tabs in step.
   *
   * Two tabs open, add a book in one, and the other still showed the old cart
   * — and would overwrite storage with its stale copy on its next write. The
   * storage event fires in every *other* tab on the same origin, which is
   * exactly the signal needed.
   */
  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== null && event.key !== CART_STORAGE_KEY) {
        return;
      }

      // Re-read through the same validation as the initial load rather than
      // trusting event.newValue: another tab running an older build could
      // have written anything.
      setCart(readCart(window.localStorage));
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addToCart = useCallback((book) => {
    // A book with no id matched any other book with no id via
    // `item.id === book.id`, so two different books collapsed into one line.
    const candidate = normaliseCartItem({ ...book, quantity: 1 });

    if (!candidate) {
      console.warn('[cart] ignoring an item with no usable id or price:', book);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === candidate.id);

      if (existing) {
        const nextQuantity = clampQuantity(existing.quantity + 1);

        // Already at the per-line maximum; adding again is a no-op rather
        // than a silently ignored click that still rewrites storage.
        if (nextQuantity === null || nextQuantity === existing.quantity) {
          return prev;
        }

        return prev.map((item) =>
          item.id === candidate.id ? { ...item, quantity: nextQuantity } : item
        );
      }

      if (prev.length >= MAX_CART_ITEMS) {
        console.warn(
          `[cart] the cart already holds ${MAX_CART_ITEMS} different books.`
        );
        return prev;
      }

      return [...prev, candidate];
    });

    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((bookId) => {
    setCart((prev) => prev.filter((item) => item.id !== bookId));
  }, []);

  const updateQuantity = useCallback(
    (bookId, newQuantity) => {
      const quantity = clampQuantity(newQuantity);

      if (quantity === null) {
        // Covers 0, negatives and NaN. The old guard was
        // `if (newQuantity <= 0) removeFromCart(...)`, and `NaN <= 0` is
        // false — so NaN passed through and was stored as the quantity,
        // which made every total in the app render NaN.
        if (typeof newQuantity === 'number' && Number.isFinite(newQuantity)) {
          removeFromCart(bookId);
        }
        return;
      }

      setCart((prev) =>
        prev.map((item) => (item.id === bookId ? { ...item, quantity } : item))
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => setCart([]), []);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        maxQuantity: MAX_QUANTITY,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
