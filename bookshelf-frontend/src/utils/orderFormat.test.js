import { describe, it, expect } from 'vitest';

import {
  countOrderItems,
  formatMoney,
  formatOrderDate,
  formatTotalSpent,
  isRenderableOrder,
  lineTotal,
  orderCurrency,
  orderMoney,
  orderReference,
  primaryStatus,
  totalSpent,
} from './orderFormat.js';

/**
 * The bug these exist for: OrderCard read `order.paymentStatus.toLowerCase()`
 * and `order.shippingStatus.toLowerCase()` unguarded, and `shippingStatus` is
 * not a field on the server Order model — it belonged to the localStorage
 * shape the page used to read. Every helper here has to survive a partial
 * document. See #326.
 */

describe('primaryStatus', () => {
  it('leads with a payment problem over the fulfilment status', () => {
    expect(primaryStatus({ status: 'processing', paymentStatus: 'failed' })).toEqual({
      key: 'failed',
      label: 'Payment failed',
      tone: 'danger',
    });
  });

  it('flags a pending payment as a warning', () => {
    const result = primaryStatus({ status: 'pending', paymentStatus: 'pending' });
    expect(result.label).toBe('Payment pending');
    expect(result.tone).toBe('warning');
  });

  it('shows fulfilment once the money has settled', () => {
    expect(primaryStatus({ status: 'delivered', paymentStatus: 'paid' })).toEqual({
      key: 'delivered',
      label: 'Delivered',
      tone: 'success',
    });
  });

  it('treats shipped and confirmed as informational', () => {
    expect(primaryStatus({ status: 'shipped', paymentStatus: 'paid' }).tone).toBe('info');
    expect(primaryStatus({ status: 'confirmed', paymentStatus: 'paid' }).tone).toBe('info');
  });

  it('renders a status the frontend has not been taught, rather than a blank badge', () => {
    expect(primaryStatus({ status: 'awaiting_pickup', paymentStatus: 'paid' }).label).toBe(
      'Awaiting Pickup'
    );
  });

  it('falls back to pending for an order with no status at all', () => {
    expect(primaryStatus({}).label).toBe('Pending');
    expect(primaryStatus(null).label).toBe('Pending');
    expect(primaryStatus(undefined).label).toBe('Pending');
  });

  it('does not throw on a non-string status', () => {
    expect(() => primaryStatus({ status: 42, paymentStatus: 'paid' })).not.toThrow();
    expect(primaryStatus({ status: 42, paymentStatus: 'paid' }).label).toBe('Pending');
  });
});

describe('formatMoney', () => {
  /*
   * The `$` these used to assert was the bug, not the expectation. The
   * catalogue is priced in rupees and the order history rendered the same
   * numbers with a dollar sign — and the payment intent behind them really
   * was created in USD, so the card was charged dollars for a rupee price.
   * See #335. Amounts are formatted in the shop's currency now, which is
   * INR, and an order that records its own currency is rendered in that.
   */
  it('formats an amount in the shop currency', () => {
    expect(formatMoney(1047)).toBe('₹1,047.00');
    expect(formatMoney(52.35)).toBe('₹52.35');
    expect(formatMoney(0)).toBe('₹0.00');
  });

  it('accepts a numeric string, which is what a JSON body can carry', () => {
    expect(formatMoney('19.99')).toBe('₹19.99');
  });

  it('renders an order in the currency it was charged in', () => {
    expect(formatMoney(19.99, 'USD')).toBe('$19.99');
    expect(formatMoney(19.99, 'INR')).toBe('₹19.99');
  });

  it('falls back to the shop currency for an order that recorded none', () => {
    // Every order written before #335 is in this state. The deployment's own
    // currency is the right guess, because it is the only one ever used.
    expect(formatMoney(19.99, undefined)).toBe('₹19.99');
    expect(formatMoney(19.99, '')).toBe('₹19.99');
  });

  it('shows an em dash rather than "NaN" for a missing amount', () => {
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney('not a number')).toBe('—');
    expect(formatMoney(Infinity)).toBe('—');
  });
});

describe('orderCurrency', () => {
  it('reads the currency the order recorded', () => {
    expect(orderCurrency({ currency: 'USD' })).toBe('USD');
    expect(orderCurrency({ currency: 'INR' })).toBe('INR');
  });

  it('is undefined when the order has none, rather than guessing here', () => {
    expect(orderCurrency({})).toBeUndefined();
    expect(orderCurrency({ currency: '' })).toBeUndefined();
    expect(orderCurrency({ currency: '   ' })).toBeUndefined();
    expect(orderCurrency(null)).toBeUndefined();
    expect(orderCurrency(undefined)).toBeUndefined();
  });
});

describe('orderMoney', () => {
  it('binds a formatter to one order\'s currency', () => {
    const money = orderMoney({ currency: 'USD' });

    expect(money(10)).toBe('$10.00');
    expect(money(null)).toBe('—');
  });

  it('falls back for an order with no recorded currency', () => {
    expect(orderMoney({})(10)).toBe('₹10.00');
    expect(orderMoney(null)(10)).toBe('₹10.00');
  });
});

describe('totalSpent', () => {
  const paid = (total, currency) => ({ paymentStatus: 'paid', total, currency });

  it('adds up only what was actually paid for', () => {
    const { totals, mixed } = totalSpent([
      paid(100, 'INR'),
      { paymentStatus: 'pending', total: 999, currency: 'INR' },
      { paymentStatus: 'failed', total: 500, currency: 'INR' },
      paid(47.84, 'INR'),
    ]);

    expect(mixed).toBe(false);
    expect(totals).toEqual([{ currency: 'INR', amount: 147.84 }]);
  });

  it('keeps currencies apart rather than adding rupees to dollars', () => {
    // 1047 + 12.99 is not an amount of anything. This is the case a plain
    // reduce over `order.total` got silently wrong. See #335.
    const { totals, mixed } = totalSpent([paid(1047, 'INR'), paid(12.99, 'USD')]);

    expect(mixed).toBe(true);
    expect(totals).toEqual([
      { currency: 'INR', amount: 1047 },
      { currency: 'USD', amount: 12.99 },
    ]);
  });

  it('groups orders with no recorded currency together, not as a second one', () => {
    const { totals, mixed } = totalSpent([paid(10, undefined), paid(5, undefined)]);

    expect(mixed).toBe(false);
    expect(totals).toEqual([{ currency: undefined, amount: 15 }]);
  });

  it('ignores a total that is not a number', () => {
    const { totals } = totalSpent([paid(10, 'INR'), paid(null, 'INR'), paid('x', 'INR')]);

    expect(totals).toEqual([{ currency: 'INR', amount: 10 }]);
  });

  it('reports zero rather than an empty list for a history with nothing paid', () => {
    expect(totalSpent([]).totals).toEqual([{ currency: undefined, amount: 0 }]);
    expect(totalSpent(null).totals).toEqual([{ currency: undefined, amount: 0 }]);
    expect(totalSpent([{ paymentStatus: 'pending', total: 9 }]).totals).toEqual([
      { currency: undefined, amount: 0 },
    ]);
  });
});

describe('formatTotalSpent', () => {
  it('renders a single-currency history as one figure', () => {
    expect(
      formatTotalSpent([{ paymentStatus: 'paid', total: 947.84, currency: 'INR' }])
    ).toBe('₹947.84');
  });

  it('renders a mixed history as a breakdown, not a meaningless sum', () => {
    expect(
      formatTotalSpent([
        { paymentStatus: 'paid', total: 1047, currency: 'INR' },
        { paymentStatus: 'paid', total: 12.99, currency: 'USD' },
      ])
    ).toBe('₹1,047.00 + $12.99');
  });
});

describe('formatOrderDate', () => {
  it('formats an ISO timestamp', () => {
    expect(formatOrderDate('2026-03-14T10:00:00.000Z')).toMatch(/2026/);
  });

  it('returns an em dash for a missing or unparseable date', () => {
    expect(formatOrderDate(undefined)).toBe('—');
    expect(formatOrderDate('')).toBe('—');
    expect(formatOrderDate('yesterday')).toBe('—');
  });
});

describe('orderReference', () => {
  it('shortens an ObjectId to something a human can quote', () => {
    expect(orderReference({ _id: '65f1a2b3c4d5e6f7a8b9c0d1' })).toBe('#B9C0D1');
  });

  it('accepts `id` as well as `_id`', () => {
    expect(orderReference({ id: 'abcdef123456' })).toBe('#123456');
  });

  it('does not slice an id that is already short', () => {
    expect(orderReference({ _id: 'ab12' })).toBe('#AB12');
  });

  it('returns an em dash when there is no id', () => {
    expect(orderReference({})).toBe('—');
    expect(orderReference(null)).toBe('—');
  });
});

describe('countOrderItems', () => {
  it('counts books, not lines', () => {
    expect(
      countOrderItems({ items: [{ quantity: 3 }, { quantity: 2 }] })
    ).toBe(5);
  });

  it('ignores lines with an unusable quantity', () => {
    expect(
      countOrderItems({ items: [{ quantity: 2 }, { quantity: -1 }, { quantity: 'x' }, {}] })
    ).toBe(2);
  });

  it('is zero when items is missing or not an array', () => {
    expect(countOrderItems({})).toBe(0);
    expect(countOrderItems({ items: 'nope' })).toBe(0);
    expect(countOrderItems(null)).toBe(0);
  });
});

describe('lineTotal', () => {
  it('multiplies price by quantity', () => {
    expect(lineTotal({ price: 349, quantity: 3 })).toBe(1047);
  });

  it('is undefined — not zero — when either half is unusable', () => {
    expect(lineTotal({ price: 349 })).toBeUndefined();
    expect(lineTotal({ quantity: 3 })).toBeUndefined();
    expect(lineTotal({ price: 'free', quantity: 1 })).toBeUndefined();
    expect(lineTotal(null)).toBeUndefined();
  });

  it('pairs with formatMoney so an unusable line reads as an em dash', () => {
    expect(formatMoney(lineTotal({ price: 349 }))).toBe('—');
  });
});

describe('isRenderableOrder', () => {
  it('accepts an order with either id field', () => {
    expect(isRenderableOrder({ _id: 'abc' })).toBe(true);
    expect(isRenderableOrder({ id: 'abc' })).toBe(true);
  });

  it('rejects anything with nothing to key on', () => {
    expect(isRenderableOrder({})).toBe(false);
    expect(isRenderableOrder(null)).toBe(false);
    expect(isRenderableOrder('an order')).toBe(false);
    expect(isRenderableOrder(undefined)).toBe(false);
  });
});
