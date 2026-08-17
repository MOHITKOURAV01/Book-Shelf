import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HANDLED_EVENT_TYPES,
  isHandledEventType,
  extractPaymentContext,
  decideTransition,
  generateReceiptNumber,
  isValidObjectId,
  ProcessedEventStore,
} from '../utils/webhookEvents.js';

const ORDER_ID = '507f1f77bcf86cd799439011';

function paymentEvent(type, overrides = {}) {
  return {
    id: overrides.id ?? 'evt_test_1',
    type,
    data: {
      object: {
        id: overrides.paymentIntentId ?? 'pi_test_1',
        metadata: 'metadata' in overrides ? overrides.metadata : { orderId: ORDER_ID },
      },
    },
  };
}

test('isValidObjectId', async (t) => {
  await t.test('accepts 24 hex characters', () => {
    assert.equal(isValidObjectId(ORDER_ID), true);
    assert.equal(isValidObjectId('AAAAAAAAAAAAAAAAAAAAAAAA'.toLowerCase()), true);
  });

  await t.test('rejects the shapes that used to reach Mongoose', () => {
    // Each of these produced a CastError -> 500 -> Stripe retry loop.
    assert.equal(isValidObjectId('not-an-objectid'), false);
    assert.equal(isValidObjectId(''), false);
    assert.equal(isValidObjectId('507f1f77bcf86cd79943901'), false); // 23 chars
    assert.equal(isValidObjectId('507f1f77bcf86cd7994390111'), false); // 25
    assert.equal(isValidObjectId('507f1f77bcf86cd79943901z'), false); // non-hex
    assert.equal(isValidObjectId(undefined), false);
    assert.equal(isValidObjectId(null), false);
    assert.equal(isValidObjectId(12345), false);
  });
});

test('isHandledEventType', async (t) => {
  await t.test('accepts the three payment intent events', () => {
    for (const type of HANDLED_EVENT_TYPES) {
      assert.equal(isHandledEventType(type), true, type);
    }
  });

  await t.test('rejects everything else', () => {
    assert.equal(isHandledEventType('charge.refunded'), false);
    assert.equal(isHandledEventType('customer.created'), false);
    assert.equal(isHandledEventType(undefined), false);
  });
});

test('extractPaymentContext', async (t) => {
  await t.test('pulls the order id and payment intent id', () => {
    const context = extractPaymentContext(paymentEvent('payment_intent.succeeded'));

    assert.equal(context.ok, true);
    assert.equal(context.orderId, ORDER_ID);
    assert.equal(context.paymentIntentId, 'pi_test_1');
  });

  await t.test('reports a missing payment intent object', () => {
    const context = extractPaymentContext({ type: 'payment_intent.succeeded', data: {} });

    assert.equal(context.ok, false);
    assert.match(context.reason, /no payment intent/i);
  });

  await t.test('reports missing metadata', () => {
    const context = extractPaymentContext(
      paymentEvent('payment_intent.succeeded', { metadata: undefined })
    );

    assert.equal(context.ok, false);
    assert.match(context.reason, /no orderId/i);
  });

  await t.test('reports an orderId that is not an ObjectId', () => {
    // The retry-loop bug: this used to go straight to findById.
    const context = extractPaymentContext(
      paymentEvent('payment_intent.succeeded', { metadata: { orderId: 'nope' } })
    );

    assert.equal(context.ok, false);
    assert.match(context.reason, /not a valid ObjectId/);
  });

  await t.test('survives a completely empty event', () => {
    assert.equal(extractPaymentContext({}).ok, false);
    assert.equal(extractPaymentContext(undefined).ok, false);
  });
});

test('decideTransition — payment_intent.succeeded', async (t) => {
  await t.test('marks a pending order paid', () => {
    const order = { paymentStatus: 'pending', status: 'pending' };
    const decision = decideTransition(
      order,
      paymentEvent('payment_intent.succeeded'),
      { paymentIntentId: 'pi_abc', now: new Date('2026-01-02T03:04:05Z') }
    );

    assert.equal(decision.action, 'apply');
    assert.equal(decision.changes.paymentStatus, 'paid');
    assert.equal(decision.changes.status, 'confirmed');
    assert.equal(decision.changes.transactionId, 'pi_abc');
    assert.equal(decision.changes.paidAt.toISOString(), '2026-01-02T03:04:05.000Z');
    assert.match(decision.changes.receiptNumber, /^RCPT-2026-[0-9A-F]{10}$/);
  });

  await t.test('is idempotent — a redelivery changes nothing', () => {
    const order = { paymentStatus: 'paid', status: 'confirmed' };
    const decision = decideTransition(order, paymentEvent('payment_intent.succeeded'));

    assert.equal(decision.action, 'skip');
    assert.match(decision.reason, /already paid/);
  });

  await t.test('keeps an existing receipt number rather than reissuing', () => {
    const order = {
      paymentStatus: 'failed',
      status: 'payment_failed',
      receiptNumber: 'RCPT-2025-ORIGINAL',
    };
    const decision = decideTransition(order, paymentEvent('payment_intent.succeeded'));

    assert.equal(decision.changes.receiptNumber, 'RCPT-2025-ORIGINAL');
  });

  await t.test('recovers an order that had been marked failed', () => {
    // A failed attempt followed by a successful retry is normal.
    const order = { paymentStatus: 'failed', status: 'payment_failed' };
    const decision = decideTransition(order, paymentEvent('payment_intent.succeeded'));

    assert.equal(decision.action, 'apply');
    assert.equal(decision.changes.paymentStatus, 'paid');
  });

  await t.test('does not mutate the order it is given', () => {
    const order = { paymentStatus: 'pending', status: 'pending' };
    decideTransition(order, paymentEvent('payment_intent.succeeded'));

    assert.equal(order.paymentStatus, 'pending');
    assert.equal(order.status, 'pending');
  });
});

test('decideTransition — payment_intent.payment_failed', async (t) => {
  await t.test('marks a pending order failed', () => {
    const order = { paymentStatus: 'pending', status: 'pending' };
    const decision = decideTransition(order, paymentEvent('payment_intent.payment_failed'));

    assert.equal(decision.action, 'apply');
    assert.equal(decision.changes.paymentStatus, 'failed');
    assert.equal(decision.changes.status, 'payment_failed');
  });

  await t.test('refuses to mark a paid order failed', () => {
    // Out-of-order delivery: a failed first attempt arriving after the
    // successful second one. The old handler applied this unconditionally.
    const order = { paymentStatus: 'paid', status: 'confirmed' };
    const decision = decideTransition(order, paymentEvent('payment_intent.payment_failed'));

    assert.equal(decision.action, 'skip');
    assert.match(decision.reason, /paid order failed/);
  });

  await t.test('is idempotent', () => {
    const order = { paymentStatus: 'failed', status: 'payment_failed' };
    assert.equal(
      decideTransition(order, paymentEvent('payment_intent.payment_failed')).action,
      'skip'
    );
  });
});

test('decideTransition — payment_intent.canceled', async (t) => {
  await t.test('cancels a pending order', () => {
    const order = { paymentStatus: 'pending', status: 'pending' };
    const decision = decideTransition(order, paymentEvent('payment_intent.canceled'));

    assert.equal(decision.action, 'apply');
    assert.equal(decision.changes.paymentStatus, 'canceled');
    assert.equal(decision.changes.status, 'canceled');
  });

  await t.test('refuses to cancel a paid order — the bug from the issue', () => {
    const order = { paymentStatus: 'paid', status: 'confirmed' };
    const decision = decideTransition(order, paymentEvent('payment_intent.canceled'));

    assert.equal(decision.action, 'skip');
    assert.match(decision.reason, /cancel a paid order/);
  });

  await t.test('is idempotent', () => {
    const order = { paymentStatus: 'canceled', status: 'canceled' };
    assert.equal(
      decideTransition(order, paymentEvent('payment_intent.canceled')).action,
      'skip'
    );
  });
});

test('decideTransition — general', async (t) => {
  await t.test('skips when the order does not exist', () => {
    const decision = decideTransition(null, paymentEvent('payment_intent.succeeded'));

    assert.equal(decision.action, 'skip');
    assert.match(decision.reason, /not found/);
  });

  await t.test('skips an event type it does not handle', () => {
    const order = { paymentStatus: 'pending' };
    const decision = decideTransition(order, paymentEvent('charge.refunded'));

    assert.equal(decision.action, 'skip');
    assert.match(decision.reason, /unhandled event type/);
  });

  await t.test(
    'succeeded then canceled then succeeded leaves the order paid',
    () => {
      // Replay a plausible out-of-order sequence end to end.
      const order = { paymentStatus: 'pending', status: 'pending' };

      const apply = (event) => {
        const decision = decideTransition(order, event, { paymentIntentId: 'pi_1' });
        if (decision.action === 'apply') Object.assign(order, decision.changes);
      };

      apply(paymentEvent('payment_intent.succeeded'));
      apply(paymentEvent('payment_intent.canceled'));
      apply(paymentEvent('payment_intent.payment_failed'));
      apply(paymentEvent('payment_intent.succeeded'));

      assert.equal(order.paymentStatus, 'paid');
      assert.equal(order.status, 'confirmed');
    }
  );
});

test('generateReceiptNumber', async (t) => {
  await t.test('has the documented shape', () => {
    assert.match(generateReceiptNumber(2026), /^RCPT-2026-[0-9A-F]{10}$/);
  });

  await t.test('does not collide across many draws', () => {
    // The old Math.random() version drew from roughly 36^6 with no unique
    // index behind it.
    const seen = new Set();
    for (let i = 0; i < 5000; i += 1) {
      seen.add(generateReceiptNumber(2026));
    }
    assert.equal(seen.size, 5000);
  });

  await t.test('defaults to the current year', () => {
    const year = new Date().getFullYear();
    assert.ok(generateReceiptNumber().startsWith(`RCPT-${year}-`));
  });
});

test('ProcessedEventStore', async (t) => {
  await t.test('recognises a repeat', () => {
    const store = new ProcessedEventStore();

    assert.equal(store.add('evt_1'), true);
    assert.equal(store.has('evt_1'), true);
    assert.equal(store.add('evt_1'), false);
  });

  await t.test('does not record an empty id', () => {
    const store = new ProcessedEventStore();

    assert.equal(store.add(undefined), false);
    assert.equal(store.add(''), false);
    assert.equal(store.size, 0);
  });

  await t.test('stays bounded, dropping oldest first', () => {
    const store = new ProcessedEventStore({ maxSize: 3 });

    store.add('a');
    store.add('b');
    store.add('c');
    store.add('d');

    assert.equal(store.size, 3);
    assert.equal(store.has('a'), false, 'oldest should have been evicted');
    assert.equal(store.has('d'), true);
  });

  await t.test('clears', () => {
    const store = new ProcessedEventStore();
    store.add('evt_1');
    store.clear();

    assert.equal(store.size, 0);
    assert.equal(store.has('evt_1'), false);
  });
});
