import test from 'node:test';
import assert from 'node:assert/strict';

import { createReservationSweeper } from '../services/reservationSweeper.js';

const NOW = Date.UTC(2026, 2, 14, 12, 0, 0);
const MINUTE = 60 * 1000;

const silentLogger = { log() {}, warn() {}, error() {} };

function order(overrides = {}) {
  return {
    _id: overrides._id ?? 'order-1',
    status: 'pending',
    paymentStatus: 'pending',
    items: [{ bookId: 'b1', title: 'The Quiet Ones', price: 349, quantity: 2 }],
    createdAt: new Date(NOW - 60 * MINUTE),
    reservedAt: new Date(NOW - 60 * MINUTE),
    ...overrides,
  };
}

/**
 * A stand-in for orderRepository. `findExpiredReservations` returns whatever
 * it is given, so these tests drive the sweeper's behaviour rather than
 * Mongo's query semantics.
 */
function fakeOrders(pending = []) {
  const saved = [];

  return {
    saved,
    calls: [],
    async findExpiredReservations(args) {
      this.calls.push(args);
      return pending;
    },
    async save(doc) {
      saved.push(doc);
      return doc;
    },
  };
}

/** A stand-in for restoreInventory, recording what it was asked to put back. */
function fakeRestore({ failFor = [] } = {}) {
  const calls = [];

  const restore = (lines) => {
    calls.push(lines);

    const failed = lines
      .filter((line) => failFor.includes(line.bookId))
      .map((line) => ({ bookId: line.bookId, reason: 'book not found' }));

    return {
      restored: lines.filter((line) => !failFor.includes(line.bookId)),
      failed,
    };
  };

  restore.calls = calls;
  return restore;
}

test('reservation sweeper', async (t) => {
  await t.test('puts back the stock an abandoned checkout was holding', async () => {
    const orders = fakeOrders([order()]);
    const restore = fakeRestore();

    const sweeper = createReservationSweeper({
      orders,
      restore,
      logger: silentLogger,
      now: () => NOW,
    });

    const result = await sweeper.sweep();

    assert.deepEqual(restore.calls, [[{ bookId: 'b1', quantity: 2 }]]);
    assert.equal(result.released, 1);
    assert.equal(result.restored, 1);
  });

  await t.test('marks the order so a second sweep cannot restore it again', async () => {
    const held = order();
    const orders = fakeOrders([held]);

    const sweeper = createReservationSweeper({
      orders,
      restore: fakeRestore(),
      logger: silentLogger,
      now: () => NOW,
    });

    await sweeper.sweep();

    assert.equal(orders.saved.length, 1);
    assert.equal(held.status, 'canceled');
    assert.equal(held.paymentStatus, 'canceled');
    assert.ok(held.reservationReleasedAt instanceof Date);
  });

  await t.test('a second sweep over the same order is a no-op', async () => {
    const held = order();
    const orders = fakeOrders([held]);
    const restore = fakeRestore();

    const sweeper = createReservationSweeper({
      orders,
      restore,
      logger: silentLogger,
      now: () => NOW,
    });

    await sweeper.sweep();
    await sweeper.sweep();

    // Restored once, not twice — this is what the marker is for.
    assert.equal(restore.calls.length, 1);
  });

  await t.test('leaves a checkout that is still inside the TTL', async () => {
    const orders = fakeOrders([order({ reservedAt: new Date(NOW - 2 * MINUTE) })]);
    const restore = fakeRestore();

    const sweeper = createReservationSweeper({
      orders,
      restore,
      logger: silentLogger,
      now: () => NOW,
    });

    const result = await sweeper.sweep();

    assert.equal(restore.calls.length, 0);
    assert.equal(result.released, 0);
    assert.equal(result.skipped, 1);
  });

  await t.test('never touches an order that has been paid for', async () => {
    const orders = fakeOrders([order({ paymentStatus: 'paid' })]);
    const restore = fakeRestore();

    const sweeper = createReservationSweeper({
      orders,
      restore,
      logger: silentLogger,
      now: () => NOW,
    });

    await sweeper.sweep();

    assert.equal(restore.calls.length, 0);
    assert.equal(orders.saved.length, 0);
  });

  await t.test('queries for holds older than the TTL', async () => {
    const orders = fakeOrders([]);

    const sweeper = createReservationSweeper({
      orders,
      restore: fakeRestore(),
      ttlMs: 30 * MINUTE,
      logger: silentLogger,
      now: () => NOW,
    });

    await sweeper.sweep();

    assert.equal(orders.calls.length, 1);
    assert.equal(orders.calls[0].before.getTime(), NOW - 30 * MINUTE);
  });

  await t.test('restores the stock even when marking the order fails', async () => {
    // The stock is the part that matters. The order stays pending and the
    // next sweep will try again.
    const orders = fakeOrders([order()]);
    orders.save = async () => {
      throw new Error('mongo is down');
    };

    const restore = fakeRestore();
    const errors = [];

    const sweeper = createReservationSweeper({
      orders,
      restore,
      logger: { ...silentLogger, error: (msg) => errors.push(msg) },
      now: () => NOW,
    });

    const result = await sweeper.sweep();

    assert.equal(restore.calls.length, 1);
    assert.equal(result.released, 0);
    assert.ok(errors.some((e) => String(e).includes('could not')));
  });

  await t.test('reports lines that could not be restored', async () => {
    const orders = fakeOrders([order()]);
    const restore = fakeRestore({ failFor: ['b1'] });
    const errors = [];

    const sweeper = createReservationSweeper({
      orders,
      restore,
      logger: { ...silentLogger, error: (msg) => errors.push(msg) },
      now: () => NOW,
    });

    const result = await sweeper.sweep();

    assert.equal(result.failed, 1);
    assert.equal(errors.length, 1);
  });

  await t.test('a query failure does not throw into the interval', async () => {
    // A sweeper that throws on a schedule takes the process down with it.
    const orders = {
      async findExpiredReservations() {
        throw new Error('mongo is down');
      },
      async save(doc) {
        return doc;
      },
    };

    const sweeper = createReservationSweeper({
      orders,
      restore: fakeRestore(),
      logger: silentLogger,
      now: () => NOW,
    });

    const result = await sweeper.sweep();

    assert.equal(result.released, 0);
    assert.ok(result.error instanceof Error);
  });

  await t.test('will not run two overlapping sweeps', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });

    const orders = {
      queries: 0,
      async findExpiredReservations() {
        this.queries += 1;
        await gate;
        return [];
      },
      async save(doc) {
        return doc;
      },
    };

    const sweeper = createReservationSweeper({
      orders,
      restore: fakeRestore(),
      logger: silentLogger,
      now: () => NOW,
    });

    const first = sweeper.sweep();
    const second = await sweeper.sweep(); // returns immediately

    release();
    await first;

    assert.equal(orders.queries, 1);
    assert.equal(second.released, 0);
  });

  await t.test('handles a batch of mixed orders in one pass', async () => {
    const orders = fakeOrders([
      order({ _id: 'abandoned' }),
      order({ _id: 'fresh', reservedAt: new Date(NOW - MINUTE) }),
      order({ _id: 'paid', paymentStatus: 'paid' }),
      order({ _id: 'declined', paymentStatus: 'failed', reservedAt: new Date(NOW - MINUTE) }),
    ]);

    const sweeper = createReservationSweeper({
      orders,
      restore: fakeRestore(),
      logger: silentLogger,
      now: () => NOW,
    });

    const result = await sweeper.sweep();

    assert.equal(result.released, 2);
    assert.equal(result.skipped, 2);
    assert.deepEqual(orders.saved.map((o) => o._id), ['abandoned', 'declined']);
  });
});
