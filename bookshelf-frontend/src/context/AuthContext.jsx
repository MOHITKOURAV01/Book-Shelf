import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService.js';
import { onUnauthorized } from '../utils/api.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // The API client cannot import this context without a cycle, so it exposes
  // a subscription instead. A 401 from any request now drops the local
  // session, rather than leaving the user on a page that silently fails to
  // load with no prompt to log in again.
  useEffect(() => {
    return onUnauthorized(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
  }, []);

  const checkAuth = async () => {
    try {
      const data = await authService.getCurrentUser();
      if (data && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData) => {
    const data = await authService.login(userData);
    if (data && data.user) {
      setUser(data.user);
      setIsAuthenticated(true);
      await mergeWishlist();
    }
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    if (data && data.user) {
      setUser(data.user);
      setIsAuthenticated(true);
      await mergeWishlist();
    }
    return data;
  };

  const mergeWishlist = async () => {
    try {
      const local = localStorage.getItem('wishlist');
      if (local) {
        const localArray = JSON.parse(local);
        if (localArray.length > 0) {
          // Dynamic import to avoid circular dependencies if any, or just import at the top
          const wishlistService = (await import('../services/wishlistService.js')).default;
          await wishlistService.mergeWishlist(localArray);
        }
      }
      localStorage.removeItem('wishlist');
    } catch (error) {
      console.error('Error merging wishlist during auth:', error);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
