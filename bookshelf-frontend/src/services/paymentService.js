import api from '../utils/api.js';

const createPaymentIntent = async (paymentDetails) => {
  const response = await api.post('/payments/create-intent', paymentDetails);
  return response.data;
};

const paymentService = {
  createPaymentIntent,
};

export default paymentService;
