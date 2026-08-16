/**
 * Stripe credentials, resolved once and validated.
 *
 * Both credentials used to have a hardcoded fallback:
 *
 *   new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_123')
 *   process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock_webhook_secret_123'
 *
 * The webhook one is the dangerous half. `POST /api/payments/webhook` is
 * public and unauthenticated by design — signature verification is the entire
 * reason to believe a request came from Stripe. Verifying against a string
 * printed in this repository means anyone can sign their own
 * `payment_intent.succeeded` and have an order marked paid.
 *
 * There is no safe default for either value, so there is no default.
 */

export class StripeConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StripeConfigError';
  }
}

/**
 * The exact fallbacks that used to be compiled in. Listed so that setting one
 * explicitly is not a way to reintroduce the hole.
 */
const REJECTED_VALUES = new Set([
  'sk_test_mock_stripe_key_123',
  'whsec_test_mock_webhook_secret_123',
  'sk_test_your_key_here',
  'whsec_your_secret_here',
  'change-me',
]);

function assertNotPlaceholder(name, value) {
  if (REJECTED_VALUES.has(value)) {
    throw new StripeConfigError(
      `${name} is set to "${value}", which is a placeholder from this ` +
        'repository rather than a real credential. Take the real value from ' +
        'the Stripe dashboard.'
    );
  }
}

/**
 * Stripe secret keys are `sk_test_...` or `sk_live_...`. Checking the prefix
 * catches the common mistake of pasting the *publishable* key (`pk_...`),
 * which otherwise fails much later as an opaque 401 from Stripe.
 */
export function validateSecretKey(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new StripeConfigError(
      'STRIPE_SECRET_KEY is not set. Payments cannot be created without it. ' +
        'Copy it from https://dashboard.stripe.com/apikeys.'
    );
  }

  const key = value.trim();
  assertNotPlaceholder('STRIPE_SECRET_KEY', key);

  if (key.startsWith('pk_')) {
    throw new StripeConfigError(
      'STRIPE_SECRET_KEY looks like a publishable key (pk_...). The ' +
        'publishable key belongs in the frontend as ' +
        'VITE_STRIPE_PUBLISHABLE_KEY; this needs the secret key (sk_...).'
    );
  }

  if (!key.startsWith('sk_') && !key.startsWith('rk_')) {
    throw new StripeConfigError(
      `STRIPE_SECRET_KEY should start with "sk_" (or "rk_" for a restricted ` +
        `key). Received a value starting "${key.slice(0, 4)}".`
    );
  }

  return key;
}

/**
 * Webhook signing secrets are `whsec_...`, from the dashboard or from
 * `stripe listen` when testing locally.
 */
export function validateWebhookSecret(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new StripeConfigError(
      'STRIPE_WEBHOOK_SECRET is not set. Signature verification is the only ' +
        'thing that makes the webhook endpoint safe to expose, so it cannot ' +
        'run without one. Get it from the endpoint page in the Stripe ' +
        'dashboard, or from `stripe listen` locally.'
    );
  }

  const secret = value.trim();
  assertNotPlaceholder('STRIPE_WEBHOOK_SECRET', secret);

  if (!secret.startsWith('whsec_')) {
    throw new StripeConfigError(
      `STRIPE_WEBHOOK_SECRET should start with "whsec_". Received a value ` +
        `starting "${secret.slice(0, 6)}".`
    );
  }

  return secret;
}

export function loadStripeConfig(env = process.env) {
  return {
    secretKey: validateSecretKey(env.STRIPE_SECRET_KEY),
    webhookSecret: validateWebhookSecret(env.STRIPE_WEBHOOK_SECRET),
    apiVersion: '2023-10-16',
  };
}

let cached = null;

/**
 * Resolved lazily rather than at import time.
 *
 * Importing this module must not throw — `webhook/stripeWebhook.js` is
 * imported by `app.js`, which unit tests import, and those tests have no
 * business needing Stripe credentials. The validation happens on first real
 * use, and the callers below turn a StripeConfigError into a refusal rather
 * than falling back to anything.
 */
export function getStripeConfig() {
  if (!cached) {
    cached = loadStripeConfig();
  }
  return cached;
}

/** Test seam. Not used by application code. */
export function resetStripeConfigCache() {
  cached = null;
}
