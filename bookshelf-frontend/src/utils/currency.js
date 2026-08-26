import { CURRENCY_CODE } from '../config/env.js';

/**
 * Money, formatted one way.
 *
 * There were four money formatters in this app and they did not agree (#335):
 *
 *   utils/bookFormat.js  formatPrice   ₹, en-IN, 0–2 decimals
 *   components/CartDrawer.jsx formatPrice ₹, no grouping, 2 decimals
 *   pages/Checkout.jsx   formatRupees  ₹, en-IN, 2 decimals
 *   utils/orderFormat.js formatMoney   $, en-US, 2 decimals
 *
 * So the same book was ₹349 in the grid, ₹349.00 in the drawer, ₹349.00 at
 * checkout and $349.00 in the order history — and the payment intent behind
 * all of it was created in USD, which meant the last of those four was the
 * only one telling the truth about what the card was charged.
 *
 * This is the only formatter now. It mirrors `bookshelf-backend/config/
 * currency.js`, which is the authority: the backend prices the order, creates
 * the intent, records the currency on the order document and returns it in
 * the create-intent response. `bookshelf-backend/tests/currency.test.js`
 * reads this file and asserts the two tables agree, so they cannot drift.
 */

/**
 * Must match SUPPORTED_CURRENCIES in bookshelf-backend/config/currency.js.
 *
 * `exponent` is the number of decimal places, which is also what Stripe means
 * by minor units. Both entries are 2; it is stated rather than assumed
 * because it is not universal, and because a hardcoded 100 is exactly the
 * assumption that made the backend's old `Math.round(amount * 100)` unsafe.
 */
export const SUPPORTED_CURRENCIES = Object.freeze({
  INR: Object.freeze({
    code: 'INR',
    symbol: '₹',
    // Spoken form, for an aria-label — see the note in the backend table.
    name: 'rupees',
    locale: 'en-IN',
    exponent: 2,
  }),
  USD: Object.freeze({
    code: 'USD',
    symbol: '$',
    name: 'dollars',
    locale: 'en-US',
    exponent: 2,
  }),
});

/** Must match DEFAULT_CURRENCY in the backend config. */
export const DEFAULT_CURRENCY_CODE = 'INR';

/**
 * The definition for a code, falling back rather than throwing.
 *
 * A formatter is called during render, on data that came off the network or
 * out of localStorage. An unknown code is a reason to show the default's
 * symbol, not a reason to blank the page — that lesson is #309.
 */
export function currencyFor(code) {
  if (typeof code === 'string') {
    const found = SUPPORTED_CURRENCIES[code.trim().toUpperCase()];
    if (found) {
      return found;
    }
  }

  return SUPPORTED_CURRENCIES[DEFAULT_CURRENCY_CODE];
}

/** What this deployment trades in, from VITE_CURRENCY. */
export const CURRENCY = currencyFor(CURRENCY_CODE);

/**
 * Is this something that can be rendered as an amount at all?
 *
 * `Number(null)` and `Number('')` are both 0, and `Number(true)` is 1, so
 * coercing first would render a *missing* total as "₹0.00" — a customer being
 * told their order was free. Only a number, or a string that is meant to be
 * one, gets past here.
 */
function toAmount(value) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Format an amount.
 *
 * Options:
 *   currency        code to render in; defaults to this deployment's
 *   minimumFractionDigits / maximumFractionDigits
 *                   default to the currency's own exponent
 *   fallback        what to render for an unusable amount; '—' by default,
 *                   because "₹NaN" and "₹0.00" are both worse than a dash
 */
export function formatMoney(value, options = {}) {
  const {
    currency: code,
    minimumFractionDigits,
    maximumFractionDigits,
    fallback = '—',
  } = options;

  const amount = toAmount(value);

  if (amount === null) {
    return fallback;
  }

  const currency = code ? currencyFor(code) : CURRENCY;

  const minimum = minimumFractionDigits ?? currency.exponent;
  const maximum = Math.max(maximumFractionDigits ?? currency.exponent, minimum);

  const digits = Math.abs(amount).toLocaleString(currency.locale, {
    minimumFractionDigits: minimum,
    maximumFractionDigits: maximum,
  });

  /*
   * The sign goes outside the symbol: -₹25.00, not ₹-25.00. Formatting the
   * absolute value and putting the sign back is what makes that possible —
   * `toLocaleString` on a negative produces "-25.00", and prefixing a symbol
   * to that gives the wrong one of the two.
   *
   * `Math.abs` before formatting also means a value that rounds to zero from
   * below renders as ₹0.00 rather than -₹0.00.
   */
  const negative = amount < 0 && Number(digits.replace(/[^0-9]/g, '')) !== 0;

  return `${negative ? '-' : ''}${currency.symbol}${digits}`;
}

/**
 * A catalogue price.
 *
 * Books are whole numbers in the catalogue, so a trailing `.00` on every card
 * is noise — this drops it while still showing paise when a price has them.
 * Returns null for an unusable price so a caller can omit the element
 * entirely rather than render an empty one; that is what BookCard does.
 */
export function formatPrice(value, options = {}) {
  const amount = toAmount(value);

  if (amount === null) {
    return null;
  }

  return formatMoney(amount, {
    ...options,
    minimumFractionDigits: 0,
    maximumFractionDigits: CURRENCY.exponent,
  });
}

/** The symbol alone, for a label or an input prefix. */
export function currencySymbol(code) {
  return (code ? currencyFor(code) : CURRENCY).symbol;
}

/**
 * The spoken name, for an aria-label.
 *
 * A symbol is not a substitute here: how a screen reader announces `₹` varies
 * by reader and by voice, and several say nothing at all. "Minimum price in
 * rupees" always works.
 */
export function currencyName(code) {
  return (code ? currencyFor(code) : CURRENCY).name;
}

export default {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY_CODE,
  CURRENCY,
  currencyFor,
  currencySymbol,
  currencyName,
  formatMoney,
  formatPrice,
};
