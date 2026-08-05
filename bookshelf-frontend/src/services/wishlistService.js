import axios from 'axios';

const API_URL = '/api/wishlist';

// Configure axios with credentials for cookies
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

const getWishlist = async () => {
  const response = await api.get(API_URL);
  return response.data;
};

const toggleWishlist = async (bookId) => {
  const response = await api.post(API_URL, { bookId });
  return response.data;
};

const mergeWishlist = async (localWishlist) => {
  const response = await api.post(`${API_URL}/merge`, { localWishlist });
  return response.data;
};

const wishlistService = {
  getWishlist,
  toggleWishlist,
  mergeWishlist,
};

export default wishlistService;
