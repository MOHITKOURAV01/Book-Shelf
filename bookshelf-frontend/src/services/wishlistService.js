import api from '../utils/api.js';

const getWishlist = async () => {
  const response = await api.get('/wishlist');
  return response.data;
};

const toggleWishlist = async (bookId) => {
  const response = await api.post('/wishlist', { bookId });
  return response.data;
};

const mergeWishlist = async (localWishlist) => {
  const response = await api.post('/wishlist/merge', { localWishlist });
  return response.data;
};

const wishlistService = {
  getWishlist,
  toggleWishlist,
  mergeWishlist,
};

export default wishlistService;
