import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDuration,
  assertUsableSecret,
  loadJwtConfig,
  ConfigError,
  MIN_SECRET_LENGTH,
  DEFAULT_EXPIRES_IN,
} from '../config/jwt.js';

// A secret that passes every rule, so tests about other things are not
// accidentally testing the secret rules.
const GOOD_SECRET = 'a'.repeat(MIN_SECRET_LENGTH);

/**
 * Runs `fn` with console.warn silenced and returns what it wrote.
 * loadJwtConfig warns on the development path and the test output should not
 * be full of it.
 */
function captureWarnings(fn) {
  const original = console.warn;
  const lines = [];
  console.warn = (...args) => lines.push(args.join(' '));
  try {
    const result = fn();
    return { result, lines };
  } finally {
    console.warn = original;
  }
}

test('parseDuration', async (t) => {
  await t.test('reads a bare number as seconds, matching jsonwebtoken', () => {
    assert.equal(parseDuration('60'), 60 * 1000);
    assert.equal(parseDuration('1'), 1000);
  });

  await t.test('accepts a number argument as seconds', () => {
    assert.equal(parseDuration(90), 90 * 1000);
  });

  await t.test('handles every short unit', () => {
    assert.equal(parseDuration('500ms'), 500);
    assert.equal(parseDuration('30s'), 30 * 1000);
    assert.equal(parseDuration('15m'), 15 * 60 * 1000);
    assert.equal(parseDuration('12h'), 12 * 60 * 60 * 1000);
    assert.equal(parseDuration('7d'), 7 * 24 * 60 * 60 * 1000);
    assert.equal(parseDuration('2w'), 14 * 24 * 60 * 60 * 1000);
  });

  await t.test('handles the long unit spellings jsonwebtoken allows', () => {
    assert.equal(parseDuration('2 days'), 2 * 24 * 60 * 60 * 1000);
    assert.equal(parseDuration('1 hour'), 60 * 60 * 1000);
    assert.equal(parseDuration('45 minutes'), 45 * 60 * 1000);
  });

  await t.test('is case insensitive and tolerates surrounding space', () => {
    assert.equal(parseDuration('  7D '), 7 * 24 * 60 * 60 * 1000);
    assert.equal(parseDuration('12H'), 12 * 60 * 60 * 1000);
  });

  await t.test('accepts a fractional amount', () => {
    assert.equal(parseDuration('1.5h'), 90 * 60 * 1000);
  });

  await t.test('rejects an unknown unit rather than guessing', () => {
    assert.throws(() => parseDuration('7 fortnights'), ConfigError);
    assert.throws(() => parseDuration('10y'), ConfigError);
  });

  await t.test('does not require a space before a long unit', () => {
    assert.equal(parseDuration('7days'), 7 * 24 * 60 * 60 * 1000);
    assert.equal(parseDuration('90mins'), 90 * 60 * 1000);
  });

  await t.test('rejects the shapes that used to reach jsonwebtoken', () => {
    // The point of parsing here is that these are caught at boot. Before this
    // module existed, jsonwebtoken threw on them inside the login handler and
    // the operator found out from a 500.
    assert.throws(() => parseDuration('soon'), ConfigError);
    assert.throws(() => parseDuration('d7'), ConfigError); // unit before amount
    assert.throws(() => parseDuration('7d5h'), ConfigError); // compound
    assert.throws(() => parseDuration(''), ConfigError);
    assert.throws(() => parseDuration('  '), ConfigError);
  });

  await t.test('rejects zero and negative lifetimes', () => {
    assert.throws(() => parseDuration('0h'), ConfigError);
    assert.throws(() => parseDuration(-5), ConfigError);
    assert.throws(() => parseDuration(0), ConfigError);
  });

  await t.test('rejects non-finite numbers', () => {
    assert.throws(() => parseDuration(Number.NaN), ConfigError);
    assert.throws(() => parseDuration(Number.POSITIVE_INFINITY), ConfigError);
  });

  await t.test('rejects types that are neither string nor number', () => {
    assert.throws(() => parseDuration(null), ConfigError);
    assert.throws(() => parseDuration({ days: 7 }), ConfigError);
  });
});

test('assertUsableSecret', async (t) => {
  await t.test('returns a good secret, trimmed', () => {
    assert.equal(assertUsableSecret(`  ${GOOD_SECRET}  `), GOOD_SECRET);
  });

  await t.test('rejects a missing secret', () => {
    assert.throws(() => assertUsableSecret(undefined), ConfigError);
    assert.throws(() => assertUsableSecret(''), ConfigError);
    assert.throws(() => assertUsableSecret('   '), ConfigError);
  });

  await t.test('rejects the old hardcoded fallback by name', () => {
    // The exact string that used to be compiled into generateToken.js and
    // authMiddleware.js. Setting it explicitly must not be a way back in.
    assert.throws(
      () => assertUsableSecret('fallback_secret'),
      (error) =>
        error instanceof ConfigError && /placeholder/i.test(error.message)
    );
  });

  await t.test('rejects the placeholder from .env.example', () => {
    assert.throws(() => assertUsableSecret('change-me'), ConfigError);
    assert.throws(() => assertUsableSecret('CHANGE-ME'), ConfigError);
  });

  await t.test('rejects other obvious placeholders, case insensitively', () => {
    for (const value of ['secret', 'password', 'JWT_SECRET', 'Test']) {
      assert.throws(
        () => assertUsableSecret(value),
        ConfigError,
        `expected "${value}" to be rejected`
      );
    }
  });

  await t.test('rejects a secret that is merely short', () => {
    const short = 'x'.repeat(MIN_SECRET_LENGTH - 1);
    assert.throws(
      () => assertUsableSecret(short),
      (error) =>
        error instanceof ConfigError &&
        error.message.includes(String(MIN_SECRET_LENGTH))
    );
  });

  await t.test('accepts a secret of exactly the minimum length', () => {
    assert.equal(assertUsableSecret(GOOD_SECRET), GOOD_SECRET);
  });

  await t.test('tells the reader how to generate one', () => {
    assert.throws(
      () => assertUsableSecret(undefined),
      (error) => error.message.includes('openssl rand -hex 32')
    );
  });
});

test('loadJwtConfig', async (t) => {
  await t.test('uses the configured secret and lifetime', () => {
    const config = loadJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: GOOD_SECRET,
      JWT_EXPIRES_IN: '12h',
    });

    assert.equal(config.secret, GOOD_SECRET);
    assert.equal(config.expiresIn, '12h');
    assert.equal(config.isProduction, true);
  });

  await t.test('derives maxAgeMs from expiresIn — the bug this fixes', () => {
    // The cookie used to be pinned at 7 days no matter what the token said.
    const oneHour = loadJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: GOOD_SECRET,
      JWT_EXPIRES_IN: '1h',
    });
    assert.equal(oneHour.maxAgeMs, 60 * 60 * 1000);

    const thirtyDays = loadJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: GOOD_SECRET,
      JWT_EXPIRES_IN: '30d',
    });
    assert.equal(thirtyDays.maxAgeMs, 30 * 24 * 60 * 60 * 1000);

    assert.notEqual(oneHour.maxAgeMs, thirtyDays.maxAgeMs);
  });

  await t.test('defaults the lifetime to 7d when unset', () => {
    const config = loadJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: GOOD_SECRET,
    });

    assert.equal(config.expiresIn, DEFAULT_EXPIRES_IN);
    assert.equal(config.maxAgeMs, 7 * 24 * 60 * 60 * 1000);
  });

  await t.test('treats a blank JWT_EXPIRES_IN as unset', () => {
    const config = loadJwtConfig({
      NODE_ENV: 'production',
      JWT_SECRET: GOOD_SECRET,
      JWT_EXPIRES_IN: '   ',
    });

    assert.equal(config.expiresIn, DEFAULT_EXPIRES_IN);
  });

  await t.test('refuses to start in production without a secret', () => {
    assert.throws(
      () => loadJwtConfig({ NODE_ENV: 'production' }),
      (error) => error instanceof ConfigError && /JWT_SECRET/.test(error.message)
    );
  });

  await t.test('refuses a placeholder secret in production', () => {
    assert.throws(
      () => loadJwtConfig({ NODE_ENV: 'production', JWT_SECRET: 'fallback_secret' }),
      ConfigError
    );
  });

  await t.test('refuses a short secret in production', () => {
    assert.throws(
      () => loadJwtConfig({ NODE_ENV: 'production', JWT_SECRET: 'short' }),
      ConfigError
    );
  });

  await t.test('generates a random dev secret rather than using a constant', () => {
    const { result: first, lines } = captureWarnings(() =>
      loadJwtConfig({ NODE_ENV: 'development' })
    );
    const { result: second } = captureWarnings(() =>
      loadJwtConfig({ NODE_ENV: 'development' })
    );

    // The important property: not a constant. The old fallback was the same
    // string on every machine and in every clone of this repo.
    assert.notEqual(first.secret, second.secret);
    assert.notEqual(first.secret, 'fallback_secret');
    assert.equal(first.secret.length, 64); // 32 random bytes, hex encoded
    assert.equal(first.isProduction, false);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /JWT_SECRET is not set/);
  });

  await t.test('still validates an explicit secret outside production', () => {
    // Supplying a bad one is a mistake worth reporting even in development.
    assert.throws(
      () => loadJwtConfig({ NODE_ENV: 'development', JWT_SECRET: 'secret' }),
      ConfigError
    );
  });

  await t.test('treats an unset NODE_ENV as not production', () => {
    const { result } = captureWarnings(() => loadJwtConfig({}));
    assert.equal(result.isProduction, false);
  });

  await t.test('reports a malformed lifetime at load, not at first login', () => {
    assert.throws(
      () =>
        loadJwtConfig({
          NODE_ENV: 'production',
          JWT_SECRET: GOOD_SECRET,
          JWT_EXPIRES_IN: '7 fortnights',
        }),
      ConfigError
    );
  });
});
