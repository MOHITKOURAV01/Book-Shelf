import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/auth';

const axiosInstance = axios.create({
  withCredentials: true,
});

// Register user
const register = async (userData) => {
  const response = await axiosInstance.post(`${API_URL}/register`, userData);
  return response.data;
};

// Login user
const login = async (userData) => {
  const response = await axiosInstance.post(`${API_URL}/login`, userData);
  return response.data;
};

// Logout user
const logout = async () => {
  const response = await axiosInstance.post(`${API_URL}/logout`);
  return response.data;
};

// Get current user profile
const getCurrentUser = async () => {
  const response = await axiosInstance.get(`${API_URL}/me`);
  return response.data;
};

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
};

export default authService;
