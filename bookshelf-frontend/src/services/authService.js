import api from '../utils/api.js';

// Paths are relative to the shared client's baseURL, so the host is
// configured in exactly one place (src/config/env.js).

// Register user
const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// Login user
const login = async (userData) => {
  const response = await api.post('/auth/login', userData);
  return response.data;
};

// Logout user
const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// Get current user profile
const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
};

export default authService;
