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
    }
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    if (data && data.user) {
      setUser(data.user);
      setIsAuthenticated(true);
    }
    return data;
  };

  /*
   * Logging out clears the session here and nothing else. Every provider that
   * holds per-user state is responsible for reacting to the change — see
   * WishlistProvider, which keys its state on the user id and empties it the
   * moment that id changes.
   *
   * The local session is dropped even if the request to clear the server
   * cookie fails. A logout that leaves the previous user's data on screen
   * because the network was down is the failure mode of #299 all over again.
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[auth] logout request failed:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
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
