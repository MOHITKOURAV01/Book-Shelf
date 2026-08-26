import { describe, it, expect } from 'vitest';

import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY_CODE,
  CURRENCY,
  currencyFor,
  currencySymbol,
  formatMoney,
  formatPrice,
} from './currency.js';

/**
 * One formatter, for money.
 *
 * The regression (#335): there were four, and they disagreed. The same book
 * rendered as ₹349 on its card, ₹349.00 in the cart drawer, ₹349.00 at
 * checkout and $349.00 in the order history — and the payment intent behind
 * all of it was created in USD, so the card was charged dollars for a
 * rupee-priced catalogue.
 *
 * These tests are about the two properties that broke: an amount is always
 * labelled with the currency it is actually in, and an unusable amount never
 * renders as a number.
 */

describe('the currency table', () => {
  it('defaults to the currency the catalogue is priced in', () => {
    expect(DEFAULT_CURRENCY_CODE).toBe('INR');
    expect(CURRENCY.code).toBe('INR');
    expect(CURRENCY.symbol).toBe('₹');
  });

  it('describes every supported currency fully', () => {
    for (const [code, currency] of Object.entries(SUPPORTED_CURRENCIES)) {
      expect(currency.code).toBe(code);
      expect(currency.symbol).toBeTruthy();
      expect(currency.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(Number.isInteger(currency.exponent)).toBe(true);
    }
  });

  it('is frozen, so a render cannot mutate the shop currency', () => {
    expect(() => {
      SUPPORTED_CURRENCIES.INR.symbol = '$';
    }).toThrow();

    expect(SUPPORTED_CURRENCIES.INR.symbol).toBe('₹');
  });
});

describe('currencyFor', () => {
  it('resolves a code in any case', () => {
    expect(currencyFor('usd').code).toBe('USD');
    expect(currencyFor('USD').code).toBe('USD');
    expect(currencyFor(' inr ').code).toBe('INR');
  });

  it('falls back rather than throwing on an unknown code', () => {
    // A formatter runs during render, on data off the network. #309 is the
    // lesson: one bad stored value must not be able to blank the page.
    expect(currencyFor('EUR').code).toBe(DEFAULT_CURRENCY_CODE);
    expect(currencyFor(null).code).toBe(DEFAULT_CURRENCY_CODE);
    expect(currencyFor(undefined).code).toBe(DEFAULT_CURRENCY_CODE);
    expect(currencyFor(42).code).toBe(DEFAULT_CURRENCY_CODE);
    expect(currencyFor({}).code).toBe(DEFAULT_CURRENCY_CODE);
  });
});

describe('currencySymbol', () => {
  it('gives the configured symbol by default and a named one on request', () => {
    expect(currencySymbol()).toBe('₹');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('INR')).toBe('₹');
  });
});

describe('formatMoney', () => {
  it('formats in the shop currency, grouped the way that locale groups', () => {
    expect(formatMoney(1047)).toBe('₹1,047.00');
    expect(formatMoney(52.35)).toBe('₹52.35');
    expect(formatMoney(0)).toBe('₹0.00');
  });

  it('groups en-IN the Indian way, which en-US does not', () => {
    // 1,23,456 rather than 123,456 — the reason the locale is part of the
    // currency definition rather than left to the browser default.
    expect(formatMoney(123456)).toBe('₹1,23,456.00');
    expect(formatMoney(123456, { currency: 'USD' })).toBe('$123,456.00');
  });

  it('labels an amount with the currency it is given', () => {
    expect(formatMoney(19.99, { currency: 'USD' })).toBe('$19.99');
    expect(formatMoney(19.99, { currency: 'INR' })).toBe('₹19.99');
  });

  it('accepts a numeric string, because JSON is not always typed', () => {
    expect(formatMoney('19.99')).toBe('₹19.99');
    expect(formatMoney('1047')).toBe('₹1,047.00');
  });

  it('shows a dash rather than a number for an amount it does not have', () => {
    // Not "₹0.00" — that tells a customer their order was free. Not "₹NaN"
    // either. `Number(null)` and `Number('')` are both 0, which is why these
    // are checked before any coercion.
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('')).toBe('—');
    expect(formatMoney('   ')).toBe('—');
    expect(formatMoney(NaN)).toBe('—');
    expect(formatMoney(Infinity)).toBe('—');
    expect(formatMoney(true)).toBe('—');
    expect(formatMoney({})).toBe('—');
    expect(formatMoney([])).toBe('—');
  });

  it('takes a caller-supplied fallback', () => {
    expect(formatMoney(null, { fallback: 'Free' })).toBe('Free');
    expect(formatMoney(undefined, { fallback: '₹0.00' })).toBe('₹0.00');
  });

  it('honours explicit fraction digits', () => {
    expect(formatMoney(349, { minimumFractionDigits: 0 })).toBe('₹349');
    expect(
      formatMoney(349.456, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    ).toBe('₹349.46');
  });

  it('never lets maximum fall below minimum', () => {
    // Intl throws a RangeError on min > max, which during a render is a blank
    // page rather than a badly formatted price.
    expect(() =>
      formatMoney(1, { minimumFractionDigits: 2, maximumFractionDigits: 0 })
    ).not.toThrow();
  });

  it('formats a negative amount rather than refusing it', () => {
    // A refund line is a legitimate negative.
    expect(formatMoney(-25)).toBe('-₹25.00');
  });
});

describe('formatPrice', () => {
  it('drops the trailing zeros a whole-rupee catalogue does not need', () => {
    expect(formatPrice(349)).toBe('₹349');
    expect(formatPrice(123456)).toBe('₹1,23,456');
  });

  it('still shows the minor units when a price has them', () => {
    expect(formatPrice(349.5)).toBe('₹349.5');
    expect(formatPrice(349.55)).toBe('₹349.55');
  });

  it('returns null so a caller can omit the element entirely', () => {
    // BookCard renders `{priceLabel && <span …>}` — a null means no empty
    // price element rather than a dash floating in the card.
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
    expect(formatPrice('')).toBeNull();
    expect(formatPrice(NaN)).toBeNull();
    expect(formatPrice('not a price')).toBeNull();
  });

  it('accepts zero, which is a price and not a missing value', () => {
    expect(formatPrice(0)).toBe('₹0');
  });
});
