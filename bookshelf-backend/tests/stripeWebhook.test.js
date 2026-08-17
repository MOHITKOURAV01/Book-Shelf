import test from 'node:test';
import assert from 'node:assert/strict';

import { createStripeWebhookHandler } from '../webhook/stripeWebhook.js';
import { StripeConfigError } from '../config/stripe.js';
import { ProcessedEventStore } from '../utils/webhookEvents.js';

const ORDER_ID = '507f1f77bcf86cd799439011';

function paymentEvent(type, overrides = {}) {
  return {
    id: overrides.id ?? 'evt_1',
    type,
    data: {
      object: {
        id: 'pi_1',
        metadata:
          'metadata' in overrides ? overrides.metadata : { orderId: ORDER_ID },
      },
    },
  };
}

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const silentLogger = { log() {}, warn() {}, error() {} };

/**
 * Build a handler with everything faked, and hand back the fakes so a test
 * can assert on what the handler did to them.
 */
function harness({ event, verifyThrows, order, saveThrows, findThrows } = {}) {
  const saved = [];

  const orders = {
    async findById(id) {
      if (findThrows) throw findThrows;
      return id === ORDER_ID ? order ?? null : null;
    },
    async save(document) {
      if (saveThrows) throw saveThrows;
      saved.push(document);
      return document;
    },
  };

  const store = new ProcessedEventStore();

  const handler = createStripeWebhookHandler({
    verify() {
      if (verifyThrows) throw verifyThrows;
      return event;
    },
    orders,
    store,
    logger: silentLogger,
  });

  const req = { headers: { 'stripe-signature': 't=1,v1=abc' }, body: Buffer.from('{}') };

  return { handler, req, saved, store };
}

test('signature verification', async (t) => {
  await t.test('a bad signature is 400 and nothing is written', async () => {
    const { handler, req, saved } = harness({
      verifyThrows: new Error('Webhook signature verification failed: no match'),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(saved.length, 0);
  });

  await t.test('the response does not echo the internal error', async () => {
    const { handler, req } = harness({
      verifyThrows: new Error('Webhook signature verification failed: secrets differ'),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.body.message, 'Signature verification failed');
    assert.ok(!JSON.stringify(res.body).includes('secrets differ'));
  });

  await t.test('a missing signing secret refuses rather than falling back', async () => {
    // The whole point of the change: with no configured secret the endpoint
    // stops working. It does not verify against a repository constant.
    const { handler, req, saved } = harness({
      verifyThrows: new StripeConfigError('STRIPE_WEBHOOK_SECRET is not set.'),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Webhook is not configured');
    assert.equal(saved.length, 0);
  });
});

test('events Stripe should stop resending get a 2xx', async (t) => {
  await t.test('an event type we do not handle', async () => {
    const { handler, req } = harness({ event: paymentEvent('charge.refunded') });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.handled, false);
  });

  await t.test('metadata with no orderId', async () => {
    const { handler, req } = harness({
      event: paymentEvent('payment_intent.succeeded', { metadata: {} }),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.match(res.body.reason, /no orderId/);
  });

  await t.test('an orderId that is not an ObjectId — the old retry loop', async () => {
    // This used to be: findById -> CastError -> 500 -> Stripe retries for
    // three days -> same CastError every time.
    const { handler, req } = harness({
      event: paymentEvent('payment_intent.succeeded', {
        metadata: { orderId: 'not-an-objectid' },
      }),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.match(res.body.reason, /not a valid ObjectId/);
  });

  await t.test('an order that does not exist', async () => {
    const { handler, req } = harness({
      event: paymentEvent('payment_intent.succeeded'),
      order: null,
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.match(res.body.reason, /not found/);
  });
});

test('applying an event', async (t) => {
  await t.test('marks a pending order paid and saves once', async () => {
    const order = { paymentStatus: 'pending', status: 'pending' };
    const { handler, req, saved } = harness({
      event: paymentEvent('payment_intent.succeeded'),
      order,
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.handled, true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].paymentStatus, 'paid');
    assert.equal(saved[0].status, 'confirmed');
    assert.ok(saved[0].receiptNumber);
    assert.ok(saved[0].paidAt instanceof Date);
  });

  await t.test('refuses to cancel a paid order', async () => {
    const order = { paymentStatus: 'paid', status: 'confirmed' };
    const { handler, req, saved } = harness({
      event: paymentEvent('payment_intent.canceled'),
      order,
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.handled, false);
    assert.equal(saved.length, 0, 'nothing should have been written');
    assert.equal(order.paymentStatus, 'paid');
    assert.equal(order.status, 'confirmed');
  });

  await t.test('refuses to fail a paid order', async () => {
    const order = { paymentStatus: 'paid', status: 'confirmed' };
    const { handler, req, saved } = harness({
      event: paymentEvent('payment_intent.payment_failed'),
      order,
    });

    await handler(req, fakeResponse());

    assert.equal(saved.length, 0);
    assert.equal(order.paymentStatus, 'paid');
  });
});

test('duplicate delivery', async (t) => {
  await t.test('the same event id is applied once', async () => {
    const order = { paymentStatus: 'pending', status: 'pending' };
    const { handler, req, saved } = harness({
      event: paymentEvent('payment_intent.succeeded'),
      order,
    });

    const first = fakeResponse();
    await handler(req, first);

    const second = fakeResponse();
    await handler(req, second);

    assert.equal(first.body.handled, true);
    assert.equal(second.statusCode, 200);
    assert.equal(second.body.handled, false);
    assert.match(second.body.reason, /duplicate/);
    assert.equal(saved.length, 1);
  });

  await t.test('an unusable event is remembered too', async () => {
    const { handler, req, store } = harness({
      event: paymentEvent('payment_intent.succeeded', { metadata: {} }),
    });

    await handler(req, fakeResponse());

    assert.equal(store.has('evt_1'), true);
  });
});

test('transient failures', async (t) => {
  await t.test('a database read failure is a 500 so Stripe retries', async () => {
    const { handler, req } = harness({
      event: paymentEvent('payment_intent.succeeded'),
      findThrows: new Error('connection timed out'),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 500);
  });

  await t.test('a write failure is a 500 and is not marked processed', async () => {
    // Marking it processed would mean the retry is discarded as a duplicate
    // and the payment is never recorded.
    const { handler, req, store } = harness({
      event: paymentEvent('payment_intent.succeeded'),
      order: { paymentStatus: 'pending', status: 'pending' },
      saveThrows: new Error('write concern error'),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(store.has('evt_1'), false);
  });

  await t.test('the 500 body does not leak the database error', async () => {
    const { handler, req } = harness({
      event: paymentEvent('payment_intent.succeeded'),
      findThrows: new Error('mongodb://user:password@host failed'),
    });
    const res = fakeResponse();

    await handler(req, res);

    assert.equal(res.body.message, 'Failed to process event');
    assert.ok(!JSON.stringify(res.body).includes('password'));
  });
});
