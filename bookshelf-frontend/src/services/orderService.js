import api from '../utils/api.js';

const getMyOrders = async () => {
  const response = await api.get('/orders/mine');
  return response.data;
};

const getOrderById = async (id) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

const orderService = {
  getMyOrders,
  getOrderById,
};

export default orderService;
