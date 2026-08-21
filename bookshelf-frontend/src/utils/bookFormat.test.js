import { describe, it, expect } from 'vitest';
import {
  LOW_STOCK_THRESHOLD,
  describeStock,
  formatPrice,
  formatRating,
  isInStock,
} from './bookFormat.js';

describe('formatRating', () => {
  it('renders one decimal place', () => {
    expect(formatRating(4.5)).toBe('4.5');
    expect(formatRating(4)).toBe('4.0');
    expect(formatRating('4.25')).toBe('4.3');
  });

  it('returns null rather than throwing when a book has no rating', () => {
    // The crash this replaces: `book.rating.toFixed(1)` on a record without
    // one took down the whole page.
    expect(formatRating(undefined)).toBeNull();
    expect(formatRating(null)).toBeNull();
    expect(formatRating('')).toBeNull();
    expect(formatRating('unrated')).toBeNull();
    expect(formatRating(NaN)).toBeNull();
  });

  it('does not invent a 0.0 for an unrated book', () => {
    expect(formatRating(undefined)).not.toBe('0.0');
  });
});

describe('formatPrice', () => {
  it('formats rupees with Indian grouping', () => {
    expect(formatPrice(349)).toBe('₹349');
    expect(formatPrice(123456)).toBe('₹1,23,456');
  });

  it('returns null for an unusable price', () => {
    expect(formatPrice(undefined)).toBeNull();
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice('')).toBeNull();
    expect(formatPrice('free')).toBeNull();
  });
});

describe('isInStock', () => {
  it('reads the inventory field the API returns', () => {
    expect(isInStock({ inventory: 8 })).toBe(true);
    expect(isInStock({ inventory: 1 })).toBe(true);
    expect(isInStock({ inventory: 0 })).toBe(false);
    expect(isInStock({ inventory: -2 })).toBe(false);
  });

  it('treats a record with no inventory field as available', () => {
    // src/data/books.js has never carried the field. Refusing to sell
    // everything the moment this helper lands would be a worse bug.
    expect(isInStock({ id: 'b1' })).toBe(true);
    expect(isInStock(null)).toBe(true);
  });
});

describe('describeStock', () => {
  it('says nothing about a well-stocked book', () => {
    expect(describeStock({ inventory: 10 })).toBe('In stock');
  });

  it('warns when only a few are left', () => {
    expect(describeStock({ inventory: LOW_STOCK_THRESHOLD })).toBe(
      `Only ${LOW_STOCK_THRESHOLD} left`
    );
    expect(describeStock({ inventory: 1 })).toBe('Only 1 left');
  });

  it('reports a sold-out book', () => {
    expect(describeStock({ inventory: 0 })).toBe('Out of stock');
  });

  it('stays quiet when there is no inventory data to report', () => {
    expect(describeStock({ id: 'b1' })).toBeNull();
    expect(describeStock({ inventory: 'many' })).toBeNull();
    expect(describeStock(null)).toBeNull();
  });
});
