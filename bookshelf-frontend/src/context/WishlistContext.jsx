import React, { createContext, useState, useEffect, useContext } from 'react';
import wishlistService from '../services/wishlistService.js';
import { AuthContext } from './AuthContext.jsx';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);

  // Load wishlist based on auth status
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      loadBackendWishlist();
    } else {
      loadLocalWishlist();
    }
  }, [isAuthenticated, authLoading]);

  const loadLocalWishlist = () => {
    try {
      const local = localStorage.getItem('wishlist');
      if (local) {
        setWishlist(JSON.parse(local));
      }
    } catch (error) {
      console.error('Error loading local wishlist:', error);
    }
    setLoading(false);
  };

  const loadBackendWishlist = async () => {
    try {
      setLoading(true);
      const data = await wishlistService.getWishlist();
      setWishlist(data);
    } catch (error) {
      console.error('Error loading backend wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async (bookId) => {
    if (isAuthenticated) {
      try {
        const updatedWishlist = await wishlistService.toggleWishlist(bookId);
        setWishlist(updatedWishlist);
      } catch (error) {
        console.error('Error toggling wishlist:', error);
      }
    } else {
      setWishlist((prev) => {
        let newWishlist;
        if (prev.includes(bookId)) {
          newWishlist = prev.filter((id) => id !== bookId);
        } else {
          newWishlist = [...prev, bookId];
        }
        localStorage.setItem('wishlist', JSON.stringify(newWishlist));
        return newWishlist;
      });
    }
  };

  // Called from AuthContext on login/register
  const mergeLocalWishlist = async () => {
    try {
      const local = localStorage.getItem('wishlist');
      if (local) {
        const localArray = JSON.parse(local);
        if (localArray.length > 0) {
          const merged = await wishlistService.mergeWishlist(localArray);
          setWishlist(merged);
        }
      }
      localStorage.removeItem('wishlist');
    } catch (error) {
      console.error('Error merging wishlist:', error);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        toggleWishlist,
        mergeLocalWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
