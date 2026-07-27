import { createContext, useState, useEffect } from 'react';

export const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    try {
      const storedWishlist = localStorage.getItem('wishlist');
      return storedWishlist ? JSON.parse(storedWishlist) : [];
    } catch (error) {
      console.error('Failed to parse wishlist from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  function toggleWishlist(bookId) {
    setWishlist((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  }

  function addToWishlist(bookId) {
    setWishlist((prev) => {
      if (prev.includes(bookId)) return prev;
      return [...prev, bookId];
    });
  }

  function removeFromWishlist(bookId) {
    setWishlist((prev) => prev.filter((id) => id !== bookId));
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
