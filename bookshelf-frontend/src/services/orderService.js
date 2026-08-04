import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/api\/payments$/, '')}/api/orders` : 'http://localhost:5000/api/orders';

const axiosInstance = axios.create({
  withCredentials: true,
});

const getMyOrders = async () => {
  const response = await axiosInstance.get(`${API_URL}/mine`);
  return response.data;
};

const getOrderById = async (id) => {
  const response = await axiosInstance.get(`${API_URL}/${id}`);
  return response.data;
};

const orderService = {
  getMyOrders,
  getOrderById,
};

export default orderService;
