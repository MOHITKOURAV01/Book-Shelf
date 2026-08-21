import { describe, it, expect, vi } from 'vitest';

import {
  CART_STORAGE_KEY,
  MAX_QUANTITY,
  MAX_CART_ITEMS,
  isValidQuantity,
  clampQuantity,
  normaliseCartItem,
  normaliseCart,
  readCart,
  writeCart,
  cartSubtotal,
  cartCount,
} from './cartStorage.js';

const silent = { warn: () => {}, error: () => {} };

function fakeStorage(initial) {
  const map = new Map(initial ? [[CART_STORAGE_KEY, initial]] : []);
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
}

function throwingStorage(message = 'The operation is insecure.') {
  return {
    getItem() {
      throw new DOMException(message, 'SecurityError');
    },
    setItem() {
      throw new DOMException(message, 'QuotaExceededError');
    },
  };
}

const book = (overrides = {}) => ({
  id: 'b1',
  title: 'A Book',
  price: 12.5,
  quantity: 1,
  ...overrides,
});

describe('isValidQuantity', () => {
  it('accepts whole numbers of at least one', () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(42)).toBe(true);
  });

  it('rejects NaN — the value that used to pass the guard', () => {
    // `NaN <= 0` is false, so NaN sailed through `if (newQuantity <= 0)`.
    expect(isValidQuantity(Number.NaN)).toBe(false);
  });

  it('rejects zero, negatives, fractions and Infinity', () => {
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(-1)).toBe(false);
    expect(isValidQuantity(1.5)).toBe(false);
    expect(isValidQuantity(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rejects non-numbers', () => {
    expect(isValidQuantity('2')).toBe(false);
    expect(isValidQuantity(null)).toBe(false);
    expect(isValidQuantity(undefined)).toBe(false);
  });
});

describe('clampQuantity', () => {
  it('passes a good quantity through', () => {
    expect(clampQuantity(3)).toBe(3);
  });

  it('caps at the maximum', () => {
    expect(clampQuantity(999999999)).toBe(MAX_QUANTITY);
  });

  it('floors a fraction', () => {
    expect(clampQuantity(2.9)).toBe(2);
  });

  it('accepts a numeric string', () => {
    expect(clampQuantity('4')).toBe(4);
  });

  it('returns null for anything unusable', () => {
    expect(clampQuantity(Number.NaN)).toBeNull();
    expect(clampQuantity(0)).toBeNull();
    expect(clampQuantity(-5)).toBeNull();
    expect(clampQuantity('abc')).toBeNull();
    expect(clampQuantity(undefined)).toBeNull();
    expect(clampQuantity(null)).toBeNull();
    expect(clampQuantity({})).toBeNull();
  });
});

describe('normaliseCartItem', () => {
  it('keeps a valid item and its extra fields', () => {
    const item = normaliseCartItem(book({ author: 'Someone', cover: '/x.png' }));

    expect(item).toMatchObject({
      id: 'b1',
      price: 12.5,
      quantity: 1,
      author: 'Someone',
      cover: '/x.png',
    });
  });

  it('rejects an item with no id', () => {
    // Two items with `id: undefined` matched each other via
    // `item.id === book.id`, so different books collapsed into one line.
    expect(normaliseCartItem(book({ id: undefined }))).toBeNull();
    expect(normaliseCartItem(book({ id: '' }))).toBeNull();
    expect(normaliseCartItem(book({ id: '   ' }))).toBeNull();
    expect(normaliseCartItem(book({ id: null }))).toBeNull();
  });

  it('accepts a numeric id and stores it as a string', () => {
    expect(normaliseCartItem(book({ id: 7 })).id).toBe('7');
  });

  it('rejects an item with no usable price', () => {
    expect(normaliseCartItem(book({ price: undefined }))).toBeNull();
    expect(normaliseCartItem(book({ price: Number.NaN }))).toBeNull();
    expect(normaliseCartItem(book({ price: -1 }))).toBeNull();
    expect(normaliseCartItem(book({ price: 'free' }))).toBeNull();
  });

  it('accepts a price of zero and a numeric string price', () => {
    expect(normaliseCartItem(book({ price: 0 })).price).toBe(0);
    expect(normaliseCartItem(book({ price: '9.99' })).price).toBe(9.99);
  });

  it('rejects an item with no quantity — the NaN subtotal case', () => {
    // `item.price * item.quantity` with quantity undefined is NaN, and the
    // drawer's + button then does `undefined + 1`.
    expect(normaliseCartItem({ id: 'b1', price: 10 })).toBeNull();
  });

  it('rejects things that are not objects', () => {
    expect(normaliseCartItem(null)).toBeNull();
    expect(normaliseCartItem('b1')).toBeNull();
    expect(normaliseCartItem(42)).toBeNull();
    expect(normaliseCartItem(['b1'])).toBeNull();
  });
});

describe('normaliseCart', () => {
  it('keeps a valid cart intact', () => {
    const { items, dropped } = normaliseCart([book(), book({ id: 'b2' })]);

    expect(items).toHaveLength(2);
    expect(dropped).toBe(0);
  });

  it('turns the values that used to white-screen the app into an empty cart', () => {
    // Each of these is valid JSON, so the old try/catch never fired, and each
    // made `cart.reduce` throw on CartDrawer's first line.
    for (const value of [{}, 'hello', 42, null, true]) {
      expect(normaliseCart(value).items).toEqual([]);
    }
  });

  it('drops only the bad entries from a mixed cart', () => {
    const { items, dropped } = normaliseCart([
      book(),
      { id: 'b2' },
      'nonsense',
      book({ id: 'b3' }),
    ]);

    expect(items.map((item) => item.id)).toEqual(['b1', 'b3']);
    expect(dropped).toBe(2);
  });

  it('drops duplicate ids', () => {
    // removeFromCart filters on id, so two lines sharing one would both go.
    const { items, dropped } = normaliseCart([book(), book({ quantity: 5 })]);

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(dropped).toBe(1);
  });

  it('caps the number of lines', () => {
    const many = Array.from({ length: MAX_CART_ITEMS + 10 }, (_, i) =>
      book({ id: `b${i}` })
    );
    const { items, dropped } = normaliseCart(many);

    expect(items).toHaveLength(MAX_CART_ITEMS);
    expect(dropped).toBe(10);
  });

  it('clamps an absurd quantity rather than dropping the line', () => {
    const { items } = normaliseCart([book({ quantity: 999999999 })]);
    expect(items[0].quantity).toBe(MAX_QUANTITY);
  });
});

describe('readCart', () => {
  it('reads a valid cart', () => {
    const cart = readCart(fakeStorage(JSON.stringify([book()])), silent);
    expect(cart).toHaveLength(1);
  });

  it('returns an empty array when nothing is stored', () => {
    expect(readCart(fakeStorage(), silent)).toEqual([]);
  });

  it('returns an empty array for malformed JSON', () => {
    expect(readCart(fakeStorage('{not json'), silent)).toEqual([]);
  });

  it('returns an empty array for JSON that is not a cart', () => {
    expect(readCart(fakeStorage('{}'), silent)).toEqual([]);
    expect(readCart(fakeStorage('"hello"'), silent)).toEqual([]);
    expect(readCart(fakeStorage('42'), silent)).toEqual([]);
  });

  it('never returns a non-array', () => {
    for (const raw of ['{}', '"x"', '42', 'null', 'true', '[1,2,3]']) {
      expect(Array.isArray(readCart(fakeStorage(raw), silent))).toBe(true);
    }
  });

  it('survives storage being unavailable', () => {
    expect(readCart(throwingStorage(), silent)).toEqual([]);
    expect(readCart(undefined, silent)).toEqual([]);
  });

  it('says once what it discarded', () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    readCart(fakeStorage(JSON.stringify([book(), 'junk', 'more junk'])), logger);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatch(/discarded 2 unusable entries/);
  });
});

describe('writeCart', () => {
  it('writes and reports success', () => {
    const storage = fakeStorage();

    expect(writeCart(storage, [book()], silent)).toBe(true);
    expect(JSON.parse(storage.map.get(CART_STORAGE_KEY))).toHaveLength(1);
  });

  it('returns false instead of throwing when the quota is exceeded', () => {
    // The old effect had no try. An exception out of useEffect takes the tree
    // down exactly like a render error — adding to the cart blanked the page.
    expect(() => writeCart(throwingStorage(), [book()], silent)).not.toThrow();
    expect(writeCart(throwingStorage(), [book()], silent)).toBe(false);
  });

  it('round-trips through readCart', () => {
    const storage = fakeStorage();
    writeCart(storage, [book(), book({ id: 'b2', quantity: 3 })], silent);

    const read = readCart(storage, silent);
    expect(read.map((item) => [item.id, item.quantity])).toEqual([
      ['b1', 1],
      ['b2', 3],
    ]);
  });
});

describe('cartSubtotal', () => {
  it('adds up price times quantity', () => {
    expect(cartSubtotal([book({ price: 10, quantity: 2 }), book({ id: 'b2', price: 5 })])).toBe(25);
  });

  it('is zero for an empty or invalid cart', () => {
    expect(cartSubtotal([])).toBe(0);
    expect(cartSubtotal({})).toBe(0);
    expect(cartSubtotal(undefined)).toBe(0);
  });

  it('never returns NaN, even given a malformed line', () => {
    expect(cartSubtotal([{ id: 'b1' }, { id: 'b2', price: 5, quantity: 2 }])).toBe(10);
  });
});

describe('cartCount', () => {
  it('counts quantities, not lines', () => {
    expect(cartCount([book({ quantity: 2 }), book({ id: 'b2', quantity: 3 })])).toBe(5);
  });

  it('ignores unusable quantities', () => {
    expect(cartCount([{ id: 'b1', quantity: Number.NaN }, book({ id: 'b2' })])).toBe(1);
  });

  it('is zero for anything that is not a cart', () => {
    expect(cartCount(null)).toBe(0);
    expect(cartCount({})).toBe(0);
  });
});
