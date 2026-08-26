/**
 * The currency the shop trades in, resolved once and validated.
 *
 * There was no such thing before, and the app held three incompatible opinions
 * at the same time (#335):
 *
 *   - `data/books.json` prices books at 349, 499, 299 — rupee amounts.
 *   - The catalogue, the cart drawer and the checkout summary rendered them
 *     with a `₹` sign.
 *   - `services/stripeService.js` created every payment intent with
 *     `currency = 'usd'`, and the order history rendered the result with `$`.
 *
 * A customer saw ₹349 and was charged $349.00. The number was right and the
 * unit was wrong, which is the worst way for a price to be wrong: nothing
 * looks broken until the card statement arrives.
 *
 * So the currency is configuration now, it has exactly one home, and both the
 * amount charged and the amount displayed are derived from it. The frontend
 * mirror lives in `bookshelf-frontend/src/utils/currency.js` and is kept
 * honest by `tests/currency.test.js` asserting the two tables agree.
 */

export class CurrencyConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CurrencyConfigError';
  }
}

/**
 * What the shop knows how to price in.
 *
 * `exponent` is the number of decimal places the currency has, which is also
 * what Stripe means by minor units. It is 2 for both of these, but it is
 * stated rather than assumed because it is not universal — JPY is 0, and
 * `Math.round(amount * 100)` would charge a Japanese customer a hundred times
 * the price. Adding a zero-decimal currency to this table should not require
 * finding every place that hardcoded 100.
 *
 * `defaultShipping` is in major units. It was a single hardcoded 5.99 in
 * utils/checkout.js — a dollar figure sitting next to a catalogue of rupee
 * prices, charged unchanged whichever currency the intent was created in.
 */
export const SUPPORTED_CURRENCIES = Object.freeze({
  INR: Object.freeze({
    code: 'INR',
    // What Stripe wants: lowercase ISO 4217.
    stripeCode: 'inr',
    symbol: '₹',
    // Spoken form, for an aria-label. "Minimum price in ₹" is what a screen
    // reader is handed if the symbol is used there, and how a symbol is
    // announced varies by screen reader and by voice — some say nothing at
    // all. "Minimum price in rupees" is unambiguous.
    name: 'rupees',
    locale: 'en-IN',
    exponent: 2,
    defaultShipping: 49,
  }),
  USD: Object.freeze({
    code: 'USD',
    stripeCode: 'usd',
    symbol: '$',
    name: 'dollars',
    locale: 'en-US',
    exponent: 2,
    defaultShipping: 5.99,
  }),
});

/**
 * INR, because that is what the catalogue is priced in.
 *
 * Defaulting to USD would keep the Stripe call unchanged and leave every
 * displayed price wrong, which is the bug. Defaulting to the currency the
 * data is actually in means an existing deployment that sets nothing starts
 * charging what it has been advertising.
 */
export const DEFAULT_CURRENCY = 'INR';

/**
 * Resolve a currency code to its definition.
 *
 * Case-insensitive, because `CURRENCY=inr` in a .env file is not a mistake
 * worth refusing to start over.
 */
export function resolveCurrency(code) {
  if (code === undefined || code === null || String(code).trim() === '') {
    return SUPPORTED_CURRENCIES[DEFAULT_CURRENCY];
  }

  const normalised = String(code).trim().toUpperCase();
  const currency = SUPPORTED_CURRENCIES[normalised];

  if (!currency) {
    throw new CurrencyConfigError(
      `CURRENCY is set to "${code}", which this shop does not support. ` +
        `Supported values: ${Object.keys(SUPPORTED_CURRENCIES).join(', ')}. ` +
        'Adding one means adding it to config/currency.js here and to ' +
        'bookshelf-frontend/src/utils/currency.js, which must agree.'
    );
  }

  return currency;
}

export function loadCurrencyConfig(env = process.env) {
  return resolveCurrency(env.CURRENCY);
}

let cached = null;

/**
 * Resolved lazily, for the same reason getStripeConfig() is: importing a
 * module must not be able to throw on configuration, because app.js is
 * imported by tests that have no interest in it.
 */
export function getCurrencyConfig() {
  if (!cached) {
    cached = loadCurrencyConfig();
  }
  return cached;
}

/** Test seam. Not used by application code. */
export function resetCurrencyConfigCache() {
  cached = null;
}

/** Minor units per major unit for a currency — 100 for a 2-decimal one. */
export function minorUnitsPerMajor(currency) {
  return 10 ** currency.exponent;
}

/**
 * Format for a log line or an error message. Not for the UI — the UI formats
 * with Intl, in the browser's own idea of the locale.
 */
export function formatAmount(majorUnits, currency = getCurrencyConfig()) {
  /*
   * Checked before any coercion, because `Number(null)` and `Number('')` are
   * both 0 — so a missing amount would be logged as "₹0.00", which reads as a
   * fact rather than as an absence. The same trap is guarded the same way in
   * the frontend's utils/currency.js.
   */
  if (typeof majorUnits !== 'number' && typeof majorUnits !== 'string') {
    return `${currency.symbol}—`;
  }

  const value = Number(majorUnits);

  if (!Number.isFinite(value)) {
    return `${currency.symbol}—`;
  }

  return `${currency.symbol}${value.toFixed(currency.exponent)}`;
}

export default {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  CurrencyConfigError,
  resolveCurrency,
  loadCurrencyConfig,
  getCurrencyConfig,
  resetCurrencyConfigCache,
  minorUnitsPerMajor,
  formatAmount,
};
