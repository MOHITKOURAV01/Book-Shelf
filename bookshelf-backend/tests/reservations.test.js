import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_RESERVATION_TTL_MS,
  decideRelease,
  holdsReservation,
  isExpired,
  planSweep,
  requiresExpiry,
  reservationLines,
} from '../utils/reservations.js';

const NOW = Date.UTC(2026, 2, 14, 12, 0, 0);
const MINUTE = 60 * 1000;

function order(overrides = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    status: 'pending',
    paymentStatus: 'pending',
    items: [{ bookId: 'b1', title: 'The Quiet Ones', price: 349, quantity: 2 }],
    createdAt: new Date(NOW - 60 * MINUTE),
    reservedAt: new Date(NOW - 60 * MINUTE),
    ...overrides,
  };
}

test('holdsReservation', async (t) => {
  await t.test('a pending order with lines is holding stock', () => {
    assert.equal(holdsReservation(order()), true);
  });

  await t.test('a paid order is never swept — the customer was charged', () => {
    assert.equal(holdsReservation(order({ paymentStatus: 'paid' })), false);
  });

  await t.test('paid is judged on paymentStatus, not on fulfilment status', () => {
    // An order sits at status 'pending' with paymentStatus 'paid' until
    // fulfilment picks it up. Sweeping that takes stock from a paying
    // customer.
    assert.equal(
      holdsReservation(order({ status: 'pending', paymentStatus: 'paid' })),
      false
    );
  });

  await t.test('a failed payment is still holding stock, because nothing gave it back', () => {
    // The webhook marks the order and never calls restoreInventory.
    assert.equal(holdsReservation(order({ paymentStatus: 'failed' })), true);
    assert.equal(holdsReservation(order({ paymentStatus: 'canceled' })), true);
  });

  await t.test('an already-released hold is not released twice', () => {
    assert.equal(
      holdsReservation(order({ reservationReleasedAt: new Date(NOW) })),
      false
    );
  });

  await t.test('an order with no lines is holding nothing', () => {
    assert.equal(holdsReservation(order({ items: [] })), false);
    assert.equal(holdsReservation(order({ items: undefined })), false);
  });

  await t.test('rejects anything that is not an order', () => {
    assert.equal(holdsReservation(null), false);
    assert.equal(holdsReservation(undefined), false);
    assert.equal(holdsReservation('an order'), false);
  });
});

test('requiresExpiry', async (t) => {
  await t.test('pending has to wait — the customer may still be typing', () => {
    assert.equal(requiresExpiry(order({ paymentStatus: 'pending' })), true);
  });

  await t.test('failed and canceled do not — nobody is going to pay', () => {
    assert.equal(requiresExpiry(order({ paymentStatus: 'failed' })), false);
    assert.equal(requiresExpiry(order({ paymentStatus: 'canceled' })), false);
  });
});

test('isExpired', async (t) => {
  await t.test('true once the hold is older than the TTL', () => {
    const held = order({ reservedAt: new Date(NOW - 31 * MINUTE) });
    assert.equal(isExpired(held, { now: NOW }), true);
  });

  await t.test('false while it is still inside the TTL', () => {
    const held = order({ reservedAt: new Date(NOW - 29 * MINUTE) });
    assert.equal(isExpired(held, { now: NOW }), false);
  });

  await t.test('true exactly at the boundary', () => {
    const held = order({ reservedAt: new Date(NOW - DEFAULT_RESERVATION_TTL_MS) });
    assert.equal(isExpired(held, { now: NOW }), true);
  });

  await t.test('falls back to createdAt for orders written before reservedAt existed', () => {
    const legacy = order({ reservedAt: undefined, createdAt: new Date(NOW - 90 * MINUTE) });
    assert.equal(isExpired(legacy, { now: NOW }), true);
  });

  await t.test('a hold with no timestamp at all is left alone', () => {
    // A sweeper that guesses is a sweeper that eventually cancels a live
    // order.
    const undated = order({ reservedAt: undefined, createdAt: undefined });
    assert.equal(isExpired(undated, { now: NOW }), false);
  });

  await t.test('an unparseable timestamp is left alone', () => {
    const bad = order({ reservedAt: 'not a date', createdAt: undefined });
    assert.equal(isExpired(bad, { now: NOW }), false);
  });

  await t.test('honours a custom TTL', () => {
    const held = order({ reservedAt: new Date(NOW - 10 * MINUTE) });
    assert.equal(isExpired(held, { now: NOW, ttlMs: 5 * MINUTE }), true);
    assert.equal(isExpired(held, { now: NOW, ttlMs: 15 * MINUTE }), false);
  });
});

test('reservationLines', async (t) => {
  await t.test('shapes lines for restoreInventory', () => {
    const held = order({
      items: [
        { bookId: 'b1', title: 'One', price: 100, quantity: 2 },
        { bookId: 'b2', title: 'Two', price: 200, quantity: 1 },
      ],
    });

    assert.deepEqual(reservationLines(held), [
      { bookId: 'b1', quantity: 2 },
      { bookId: 'b2', quantity: 1 },
    ]);
  });

  await t.test('drops lines restoreInventory could not use anyway', () => {
    const held = order({
      items: [
        { bookId: 'b1', quantity: 2 },
        { bookId: 'b2', quantity: 0 },
        { bookId: 'b3', quantity: -1 },
        { bookId: 'b4', quantity: 1.5 },
        { quantity: 3 },
        null,
      ],
    });

    assert.deepEqual(reservationLines(held), [{ bookId: 'b1', quantity: 2 }]);
  });

  await t.test('is empty for a missing item list', () => {
    assert.deepEqual(reservationLines({}), []);
    assert.deepEqual(reservationLines(null), []);
  });
});

test('decideRelease', async (t) => {
  await t.test('releases an abandoned pending checkout', () => {
    const decision = decideRelease(order(), { now: NOW });

    assert.equal(decision.action, 'release');
    assert.deepEqual(decision.lines, [{ bookId: 'b1', quantity: 2 }]);
    assert.equal(decision.changes.status, 'canceled');
    assert.equal(decision.changes.paymentStatus, 'canceled');
    assert.equal(decision.changes.reservationReleasedAt.getTime(), NOW);
  });

  await t.test('leaves a checkout the customer may still be filling in', () => {
    const fresh = order({ reservedAt: new Date(NOW - 2 * MINUTE) });
    const decision = decideRelease(fresh, { now: NOW });

    assert.equal(decision.action, 'skip');
    assert.equal(decision.reason, 'reservation has not expired yet');
  });

  await t.test('releases a declined card immediately, without waiting out the TTL', () => {
    const declined = order({
      paymentStatus: 'failed',
      status: 'payment_failed',
      reservedAt: new Date(NOW - 30 * 1000),
    });

    assert.equal(decideRelease(declined, { now: NOW }).action, 'release');
  });

  await t.test('never releases a paid order', () => {
    const paid = order({ paymentStatus: 'paid', reservedAt: new Date(NOW - 300 * MINUTE) });
    const decision = decideRelease(paid, { now: NOW });

    assert.equal(decision.action, 'skip');
    assert.equal(decision.reason, 'order is not holding a reservation');
  });

  await t.test('is idempotent — a released hold is skipped', () => {
    const released = order({ reservationReleasedAt: new Date(NOW - 5 * MINUTE) });
    assert.equal(decideRelease(released, { now: NOW }).action, 'skip');
  });

  await t.test('skips an order whose lines are all unusable', () => {
    const junk = order({ items: [{ bookId: 'b1', quantity: 0 }] });
    const decision = decideRelease(junk, { now: NOW });

    assert.equal(decision.action, 'skip');
    assert.equal(decision.reason, 'no restorable lines');
  });

  await t.test('mutates nothing', () => {
    const held = order();
    const snapshot = JSON.stringify(held);

    decideRelease(held, { now: NOW });
    assert.equal(JSON.stringify(held), snapshot);
  });
});

test('planSweep', async (t) => {
  await t.test('splits a batch into releases and skips', () => {
    const batch = [
      order({ _id: 'a', reservedAt: new Date(NOW - 60 * MINUTE) }),
      order({ _id: 'b', reservedAt: new Date(NOW - 1 * MINUTE) }),
      order({ _id: 'c', paymentStatus: 'paid' }),
      order({ _id: 'd', paymentStatus: 'failed' }),
    ];

    const { releases, skipped } = planSweep(batch, { now: NOW });

    assert.deepEqual(releases.map((r) => r.order._id), ['a', 'd']);
    assert.deepEqual(skipped.map((s) => s.order._id), ['b', 'c']);
  });

  await t.test('copes with a non-array', () => {
    assert.deepEqual(planSweep(null), { releases: [], skipped: [] });
    assert.deepEqual(planSweep(undefined), { releases: [], skipped: [] });
  });
});
