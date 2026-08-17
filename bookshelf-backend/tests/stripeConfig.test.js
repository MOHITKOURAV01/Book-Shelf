import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateSecretKey,
  validateWebhookSecret,
  loadStripeConfig,
  StripeConfigError,
} from '../config/stripe.js';

// Deliberately short and underscore-separated. A realistic-looking Stripe key
// here trips GitHub's push protection, and the validator only inspects the
// prefix anyway.
const GOOD_KEY = 'sk_test_fixture_key';
const GOOD_WEBHOOK_SECRET = 'whsec_fixture_secret';

test('validateSecretKey', async (t) => {
  await t.test('accepts a test key and a live key', () => {
    assert.equal(validateSecretKey(GOOD_KEY), GOOD_KEY);
    assert.equal(validateSecretKey('sk_live_fixture_key'), 'sk_live_fixture_key');
  });

  await t.test('accepts a restricted key', () => {
    assert.equal(validateSecretKey('rk_test_restricted'), 'rk_test_restricted');
  });

  await t.test('trims', () => {
    assert.equal(validateSecretKey(`  ${GOOD_KEY} `), GOOD_KEY);
  });

  await t.test('rejects a missing key', () => {
    assert.throws(() => validateSecretKey(undefined), StripeConfigError);
    assert.throws(() => validateSecretKey(''), StripeConfigError);
    assert.throws(() => validateSecretKey('   '), StripeConfigError);
  });

  await t.test('rejects the old hardcoded fallback by name', () => {
    assert.throws(
      () => validateSecretKey('sk_test_mock_stripe_key_123'),
      (error) =>
        error instanceof StripeConfigError && /placeholder/i.test(error.message)
    );
  });

  await t.test('rejects the placeholder from .env.example', () => {
    assert.throws(() => validateSecretKey('sk_test_your_key_here'), StripeConfigError);
  });

  await t.test('names the mistake when given a publishable key', () => {
    // Easy to do, and otherwise surfaces much later as an opaque 401.
    assert.throws(
      () => validateSecretKey('pk_test_fixture_key'),
      (error) => /publishable key/i.test(error.message)
    );
  });

  await t.test('rejects something that is not a Stripe key at all', () => {
    assert.throws(() => validateSecretKey('hunter2'), StripeConfigError);
  });
});

test('validateWebhookSecret', async (t) => {
  await t.test('accepts a whsec_ value', () => {
    assert.equal(validateWebhookSecret(GOOD_WEBHOOK_SECRET), GOOD_WEBHOOK_SECRET);
  });

  await t.test('rejects a missing secret and explains why it matters', () => {
    assert.throws(
      () => validateWebhookSecret(undefined),
      (error) =>
        error instanceof StripeConfigError &&
        /signature verification/i.test(error.message)
    );
  });

  await t.test('rejects the exact fallback that used to be compiled in', () => {
    // This is the value that made forged payment_intent.succeeded events
    // possible on any deployment that forgot the variable.
    assert.throws(
      () => validateWebhookSecret('whsec_test_mock_webhook_secret_123'),
      StripeConfigError
    );
  });

  await t.test('rejects the placeholder from .env.example', () => {
    assert.throws(() => validateWebhookSecret('whsec_your_secret_here'), StripeConfigError);
  });

  await t.test('rejects a value with the wrong prefix', () => {
    assert.throws(() => validateWebhookSecret('sk_test_something'), StripeConfigError);
    assert.throws(() => validateWebhookSecret('random-string'), StripeConfigError);
  });
});

test('loadStripeConfig', async (t) => {
  await t.test('reads both credentials and pins the API version', () => {
    const config = loadStripeConfig({
      STRIPE_SECRET_KEY: GOOD_KEY,
      STRIPE_WEBHOOK_SECRET: GOOD_WEBHOOK_SECRET,
    });

    assert.equal(config.secretKey, GOOD_KEY);
    assert.equal(config.webhookSecret, GOOD_WEBHOOK_SECRET);
    assert.equal(config.apiVersion, '2023-10-16');
  });

  await t.test('has no fallback for either value', () => {
    assert.throws(() => loadStripeConfig({}), StripeConfigError);

    assert.throws(
      () => loadStripeConfig({ STRIPE_SECRET_KEY: GOOD_KEY }),
      StripeConfigError
    );

    assert.throws(
      () => loadStripeConfig({ STRIPE_WEBHOOK_SECRET: GOOD_WEBHOOK_SECRET }),
      StripeConfigError
    );
  });
});
