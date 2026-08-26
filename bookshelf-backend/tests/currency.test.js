import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  CurrencyConfigError,
  resolveCurrency,
  loadCurrencyConfig,
  getCurrencyConfig,
  resetCurrencyConfigCache,
  minorUnitsPerMajor,
  formatAmount,
} from '../config/currency.js';

/**
 * The currency of the shop.
 *
 * The bug these cover (#335): the catalogue is priced in rupees, the UI
 * rendered `₹`, and `createPaymentIntent(total, 'usd')` charged dollars. The
 * number was right and the unit was wrong — ₹349 displayed, $349.00 taken.
 *
 * The last test in this file is the one that matters most. There are two
 * currency tables, one per package, because the frontend cannot import from
 * the backend. Two tables that must agree and are never compared are two
 * tables that will stop agreeing, so this reads the frontend's and asserts
 * the codes, symbols, locales and exponents line up.
 */

describe('resolveCurrency', () => {
  test('defaults to the currency the catalogue is priced in', () => {
    assert.equal(DEFAULT_CURRENCY, 'INR');
    assert.equal(resolveCurrency(undefined).code, 'INR');
    assert.equal(resolveCurrency(null).code, 'INR');
    assert.equal(resolveCurrency('').code, 'INR');
    assert.equal(resolveCurrency('   ').code, 'INR');
  });

  test('accepts a supported code in any case', () => {
    assert.equal(resolveCurrency('usd').code, 'USD');
    assert.equal(resolveCurrency('USD').code, 'USD');
    assert.equal(resolveCurrency(' Usd ').code, 'USD');
    assert.equal(resolveCurrency('inr').code, 'INR');
  });

  test('refuses a currency the shop cannot price in', () => {
    assert.throws(() => resolveCurrency('EUR'), CurrencyConfigError);
    assert.throws(() => resolveCurrency('JPY'), CurrencyConfigError);
  });

  test('the refusal names the supported values and both tables to update', () => {
    try {
      resolveCurrency('GBP');
      assert.fail('should have thrown');
    } catch (error) {
      assert.match(error.message, /INR, USD/);
      assert.match(error.message, /config\/currency\.js/);
      assert.match(error.message, /bookshelf-frontend\/src\/utils\/currency\.js/);
    }
  });

  test('every supported currency is fully described', () => {
    for (const [key, currency] of Object.entries(SUPPORTED_CURRENCIES)) {
      assert.equal(currency.code, key, `${key}: code should match its key`);
      assert.equal(
        currency.stripeCode,
        key.toLowerCase(),
        `${key}: Stripe wants a lowercase ISO code`
      );
      assert.equal(typeof currency.symbol, 'string');
      assert.notEqual(currency.symbol, '');
      assert.equal(typeof currency.name, 'string');
      assert.notEqual(currency.name, '');
      assert.match(currency.locale, /^[a-z]{2}-[A-Z]{2}$/);
      assert.ok(Number.isInteger(currency.exponent) && currency.exponent >= 0);
      assert.ok(Number.isFinite(currency.defaultShipping));
      assert.ok(currency.defaultShipping >= 0);
    }
  });

  test('the tables are frozen, so nothing can edit the shop currency at runtime', () => {
    assert.throws(() => {
      SUPPORTED_CURRENCIES.INR.symbol = '$';
    }, TypeError);

    assert.equal(SUPPORTED_CURRENCIES.INR.symbol, '₹');
  });
});

describe('loadCurrencyConfig', () => {
  test('reads CURRENCY from the environment it is given', () => {
    assert.equal(loadCurrencyConfig({ CURRENCY: 'USD' }).code, 'USD');
    assert.equal(loadCurrencyConfig({ CURRENCY: 'INR' }).code, 'INR');
    assert.equal(loadCurrencyConfig({}).code, 'INR');
  });

  test('a bad CURRENCY is a startup-time refusal, not a silent fallback', () => {
    assert.throws(
      () => loadCurrencyConfig({ CURRENCY: 'dollars' }),
      CurrencyConfigError
    );
  });
});

describe('getCurrencyConfig', () => {
  test('caches, and the cache can be dropped for a test', () => {
    resetCurrencyConfigCache();

    const first = getCurrencyConfig();
    const second = getCurrencyConfig();

    assert.equal(first, second, 'should hand back the same frozen object');

    resetCurrencyConfigCache();
    assert.equal(getCurrencyConfig().code, first.code);
  });
});

describe('minorUnitsPerMajor', () => {
  test('derives from the exponent rather than assuming 100', () => {
    assert.equal(minorUnitsPerMajor(SUPPORTED_CURRENCIES.INR), 100);
    assert.equal(minorUnitsPerMajor(SUPPORTED_CURRENCIES.USD), 100);

    // The reason it is a function at all: a zero-decimal currency would make
    // `Math.round(amount * 100)` charge a hundred times the price.
    assert.equal(minorUnitsPerMajor({ exponent: 0 }), 1);
    assert.equal(minorUnitsPerMajor({ exponent: 3 }), 1000);
  });
});

describe('formatAmount', () => {
  test('uses the symbol and decimal places of the currency it is given', () => {
    assert.equal(formatAmount(1047, SUPPORTED_CURRENCIES.INR), '₹1047.00');
    assert.equal(formatAmount(1047, SUPPORTED_CURRENCIES.USD), '$1047.00');
    assert.equal(formatAmount(52.35, SUPPORTED_CURRENCIES.INR), '₹52.35');
  });

  test('does not print NaN into a log line', () => {
    assert.equal(formatAmount(undefined, SUPPORTED_CURRENCIES.INR), '₹—');
    assert.equal(formatAmount(null, SUPPORTED_CURRENCIES.INR), '₹—');
    assert.equal(formatAmount('nonsense', SUPPORTED_CURRENCIES.INR), '₹—');
  });

  test('defaults to the configured currency', () => {
    resetCurrencyConfigCache();
    assert.equal(formatAmount(10), '₹10.00');
  });
});

describe('the frontend currency table agrees with this one', () => {
  /**
   * Read as text and parsed with a regex rather than imported: the frontend
   * module is ESM built for Vite and reads `import.meta.env`, which does not
   * exist under plain Node. The table itself is a plain object literal, and
   * the point is to catch a symbol or an exponent changing on one side only.
   */
  const source = readFileSync(
    fileURLToPath(
      new URL('../../bookshelf-frontend/src/utils/currency.js', import.meta.url)
    ),
    'utf8'
  );

  function frontendEntry(code) {
    const block = source.match(
      new RegExp(`${code}:\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\)`)
    );

    assert.ok(block, `frontend currency table has no ${code} entry`);

    const field = (name) => {
      const match = block[1].match(new RegExp(`${name}:\\s*'([^']*)'`));
      return match ? match[1] : null;
    };

    const numeric = (name) => {
      const match = block[1].match(new RegExp(`${name}:\\s*([0-9.]+)`));
      return match ? Number(match[1]) : null;
    };

    return {
      code: field('code'),
      symbol: field('symbol'),
      name: field('name'),
      locale: field('locale'),
      exponent: numeric('exponent'),
    };
  }

  for (const code of Object.keys(SUPPORTED_CURRENCIES)) {
    test(`${code} matches`, () => {
      const mine = SUPPORTED_CURRENCIES[code];
      const theirs = frontendEntry(code);

      assert.equal(theirs.code, mine.code, `${code}: code`);
      assert.equal(theirs.symbol, mine.symbol, `${code}: symbol`);
      assert.equal(theirs.name, mine.name, `${code}: spoken name`);
      assert.equal(theirs.locale, mine.locale, `${code}: locale`);
      assert.equal(theirs.exponent, mine.exponent, `${code}: exponent`);
    });
  }

  test('the frontend supports exactly the currencies the backend does', () => {
    const declared = [...source.matchAll(/^\s{2}([A-Z]{3}):\s*Object\.freeze/gm)].map(
      (match) => match[1]
    );

    assert.deepEqual(
      declared.sort(),
      Object.keys(SUPPORTED_CURRENCIES).sort(),
      'a currency added on one side must be added on the other'
    );
  });

  test('the frontend default is the backend default', () => {
    const match = source.match(/DEFAULT_CURRENCY_CODE\s*=\s*'([A-Z]{3})'/);

    assert.ok(match, 'frontend does not declare DEFAULT_CURRENCY_CODE');
    assert.equal(match[1], DEFAULT_CURRENCY);
  });
});
