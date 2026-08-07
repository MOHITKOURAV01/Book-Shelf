import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/payments';

const axiosInstance = axios.create({
  withCredentials: true, // Needed if we are using cookies for authentication
});

const createPaymentIntent = async (paymentDetails) => {
  const response = await axiosInstance.post(`${API_URL}/create-intent`, paymentDetails);
  return response.data;
};

const paymentService = {
  createPaymentIntent,
};

export default paymentService;
