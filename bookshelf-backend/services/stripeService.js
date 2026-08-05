import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Using placeholder secret key if environment variable is missing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_123', {
  apiVersion: '2023-10-16',
});

export const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });
    return paymentIntent;
  } catch (error) {
    throw new Error(`Stripe PaymentIntent Error: ${error.message}`);
  }
};

export const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
};

export default stripe;
