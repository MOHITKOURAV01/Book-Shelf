import { describe, it, expect } from 'vitest';

import {
  countOrderItems,
  formatMoney,
  formatOrderDate,
  isRenderableOrder,
  lineTotal,
  orderReference,
  primaryStatus,
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
  it('formats an amount to two places', () => {
    expect(formatMoney(1047)).toBe('$1,047.00');
    expect(formatMoney(52.35)).toBe('$52.35');
    expect(formatMoney(0)).toBe('$0.00');
  });

  it('accepts a numeric string, which is what a JSON body can carry', () => {
    expect(formatMoney('19.99')).toBe('$19.99');
  });

  it('shows an em dash rather than "$NaN" for a missing amount', () => {
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney('not a number')).toBe('—');
    expect(formatMoney(Infinity)).toBe('—');
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
