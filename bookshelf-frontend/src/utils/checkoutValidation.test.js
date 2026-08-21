import { describe, it, expect } from 'vitest';
import {
  ADDRESS_FIELDS,
  EMPTY_ADDRESS,
  cartSubtotal,
  countItems,
  describeCheckoutError,
  isAddressValid,
  normaliseAddress,
  toOrderItems,
  validateAddress,
} from './checkoutValidation.js';

const goodAddress = {
  name: 'A. Sharma',
  address: '221B Baker Street',
  city: 'Mumbai',
  postalCode: '400001',
  country: 'India',
};

describe('normaliseAddress', () => {
  it('trims and collapses whitespace in every field', () => {
    expect(
      normaliseAddress({
        name: '  A.   Sharma ',
        address: '221B\tBaker  Street',
        city: ' Mumbai',
        postalCode: '400 001 ',
        country: 'India ',
      })
    ).toEqual({
      name: 'A. Sharma',
      address: '221B Baker Street',
      city: 'Mumbai',
      postalCode: '400 001',
      country: 'India',
    });
  });

  it('turns missing fields into empty strings rather than undefined', () => {
    expect(normaliseAddress({})).toEqual(EMPTY_ADDRESS);
    expect(normaliseAddress()).toEqual(EMPTY_ADDRESS);
  });

  it('covers every declared field', () => {
    const normalised = normaliseAddress(goodAddress);
    for (const field of ADDRESS_FIELDS) {
      expect(normalised).toHaveProperty(field.name);
    }
  });
});

describe('validateAddress', () => {
  it('accepts a complete address', () => {
    expect(validateAddress(goodAddress)).toEqual({});
    expect(isAddressValid(goodAddress)).toBe(true);
  });

  it('reports every missing field at once, not one at a time', () => {
    const errors = validateAddress(EMPTY_ADDRESS);
    expect(Object.keys(errors).sort()).toEqual(
      ADDRESS_FIELDS.map((field) => field.name).sort()
    );
  });

  it('treats whitespace-only input as missing', () => {
    expect(validateAddress({ ...goodAddress, city: '   ' })).toHaveProperty('city');
  });

  it('rejects a field that is far too short to be real', () => {
    expect(validateAddress({ ...goodAddress, address: '1' })).toHaveProperty(
      'address'
    );
  });

  it('rejects a field longer than the API will store', () => {
    const errors = validateAddress({ ...goodAddress, name: 'x'.repeat(101) });
    expect(errors.name).toMatch(/100 characters or fewer/);
  });

  it('accepts postal codes with spaces and hyphens, as used outside India', () => {
    for (const postalCode of ['400 001', 'SW1A 1AA', '12345-6789', 'K1A0B1']) {
      expect(validateAddress({ ...goodAddress, postalCode })).toEqual({});
    }
  });

  it('rejects a postal code containing punctuation', () => {
    expect(validateAddress({ ...goodAddress, postalCode: '400/001' })).toHaveProperty(
      'postalCode'
    );
  });
});

describe('toOrderItems', () => {
  it('sends only the id and quantity, never the price', () => {
    const items = toOrderItems([
      { id: 'b1', title: 'The Quiet Ones', price: 349, quantity: 2 },
    ]);

    expect(items).toEqual([{ bookId: 'b1', quantity: 2 }]);
    expect(items[0]).not.toHaveProperty('price');
    expect(items[0]).not.toHaveProperty('title');
  });

  it('accepts either `id` or `bookId` on the cart line', () => {
    expect(toOrderItems([{ bookId: 'b2', quantity: 1 }])).toEqual([
      { bookId: 'b2', quantity: 1 },
    ]);
  });

  it('merges two lines for the same book, which the API would reject apart', () => {
    expect(
      toOrderItems([
        { id: 'b1', quantity: 2 },
        { id: 'b1', quantity: 3 },
      ])
    ).toEqual([{ bookId: 'b1', quantity: 5 }]);
  });

  it('drops lines that could never be priced', () => {
    expect(
      toOrderItems([
        { id: 'b1', quantity: 1 },
        { id: '', quantity: 1 },
        { id: '   ', quantity: 1 },
        { quantity: 1 },
        { id: 'b3', quantity: 0 },
        { id: 'b4', quantity: -2 },
        { id: 'b5', quantity: 1.5 },
        { id: 'b6' },
        null,
        'nonsense',
      ])
    ).toEqual([{ bookId: 'b1', quantity: 1 }]);
  });

  it('survives a cart that is not an array', () => {
    expect(toOrderItems(null)).toEqual([]);
    expect(toOrderItems({ id: 'b1' })).toEqual([]);
    expect(toOrderItems()).toEqual([]);
  });
});

describe('countItems', () => {
  it('counts books, not cart lines — the bug the navbar badge also has', () => {
    expect(countItems([{ id: 'b1', quantity: 5 }])).toBe(5);
    expect(
      countItems([
        { id: 'b1', quantity: 2 },
        { id: 'b2', quantity: 3 },
      ])
    ).toBe(5);
  });

  it('ignores lines with an unusable quantity', () => {
    expect(
      countItems([{ id: 'b1', quantity: 'two' }, { id: 'b2', quantity: 1 }])
    ).toBe(1);
  });
});

describe('cartSubtotal', () => {
  it('multiplies price by quantity across the cart', () => {
    expect(
      cartSubtotal([
        { price: 349, quantity: 2 },
        { price: 299, quantity: 1 },
      ])
    ).toBe(997);
  });

  it('skips lines that would poison the total with NaN', () => {
    expect(cartSubtotal([{ price: 'free', quantity: 1 }, { price: 100, quantity: 2 }])).toBe(
      200
    );
  });
});

describe('describeCheckoutError', () => {
  it('turns an unknown book id into something a customer can act on', () => {
    const message = describeCheckoutError({
      status: 400,
      original: {
        response: {
          data: {
            message: 'Invalid checkout request',
            errors: [
              { field: 'items[0].bookId', message: 'Book not found: book-1' },
            ],
          },
        },
      },
    });

    expect(message).toMatch(/no longer available/i);
  });

  it('passes through the first field error for other validation failures', () => {
    expect(
      describeCheckoutError({
        status: 400,
        response: {
          data: {
            errors: [
              { field: 'items[0].quantity', message: 'items[0].quantity must be at least 1' },
            ],
          },
        },
      })
    ).toBe('items[0].quantity must be at least 1');
  });

  it('explains a stock conflict', () => {
    expect(describeCheckoutError({ status: 409 })).toMatch(/bought while you were/i);
  });

  it('explains a network failure in the shape utils/api.js produces', () => {
    expect(
      describeCheckoutError({ status: 0, code: 'NETWORK_ERROR', message: 'Network error.' })
    ).toMatch(/could not reach the shop/i);
  });

  it('never returns an empty string', () => {
    expect(describeCheckoutError(null)).toBeTruthy();
    expect(describeCheckoutError({})).toBeTruthy();
  });
});
