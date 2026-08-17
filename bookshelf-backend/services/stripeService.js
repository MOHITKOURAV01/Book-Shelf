import Stripe from 'stripe';
import dotenv from 'dotenv';
import { getStripeConfig } from '../config/stripe.js';

dotenv.config();

let client = null;

/**
 * The Stripe client, built on first use.
 *
 * This used to be constructed at module load with a fallback key:
 *
 *   new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_123')
 *
 * `sk_test_mock_stripe_key_123` is not a real key, so the failure landed on
 * whichever customer first tried to check out, as a 500 carrying a raw Stripe
 * error message. Constructing lazily off a validated config means the failure
 * says what is actually wrong, and says it once.
 */
export function getStripeClient() {
  if (!client) {
    const { secretKey, apiVersion } = getStripeConfig();
    client = new Stripe(secretKey, { apiVersion });
  }
  return client;
}

/** Test seam. Not used by application code. */
export function resetStripeClient() {
  client = null;
}

export const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await getStripeClient().paymentIntents.create({
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

/**
 * Verify a webhook signature against the configured signing secret.
 *
 * The secret is no longer a parameter. It was, and the one caller passed
 * `process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock_webhook_secret_123'`
 * — a value published in this repository. Signature verification is the only
 * thing standing between the public webhook endpoint and a forged
 * `payment_intent.succeeded`, so the secret is read from validated config here
 * and cannot be supplied, defaulted or overridden by a caller.
 */
export const verifyWebhookSignature = (payload, signature) => {
  const { webhookSecret } = getStripeConfig();

  try {
    return getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
};

export default { getStripeClient, createPaymentIntent, verifyWebhookSignature };
