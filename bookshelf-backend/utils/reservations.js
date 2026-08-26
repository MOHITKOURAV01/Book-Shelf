/**
 * Reservation expiry.
 *
 * Checkout takes inventory off the shelf *before* the customer pays, because
 * the alternative is overselling in the window between charging and
 * reserving — that was #297. The half that was never built is the other side
 * of it: nothing ever put the stock back if the customer simply walked away.
 *
 * `paymentController.createIntent` hands the reservation to the webhook once
 * the Stripe intent exists, and the webhook releases it on
 * `payment_intent.payment_failed` and `payment_intent.canceled`. A customer
 * who closes the tab at the card form produces neither event. The order sat
 * at `pending` and the books stayed reserved, permanently. With inventories
 * of 8 to 10 across 8 titles — 78 units for the whole shop — a short loop
 * against an endpoint that is anonymous and unthrottled emptied it in under a
 * minute, with no card and no charge. See #329.
 *
 * The functions here are pure: they decide *what* should happen to a set of
 * orders, and return it. Doing the database and filesystem work is the
 * caller's job. Same split as `utils/webhookEvents.js`, and for the same
 * reason — the decisions are the part worth testing, and they should be
 * testable without a Mongo instance or a writable books.json.
 */

/**
 * How long a reservation is held before it is swept.
 *
 * Thirty minutes is comfortably longer than filling in a card takes, including
 * a 3-D Secure detour and a bank app, and short enough that an abandoned cart
 * does not hold stock for the rest of the day. Configurable, because the right
 * number depends on the shop.
 */
export const DEFAULT_RESERVATION_TTL_MS = 30 * 60 * 1000;

/**
 * Terminal and unpaid. The customer is not going to be charged for this, so
 * the stock belongs back on the shelf — and there is nothing to wait for.
 *
 * These matter more than they look. The webhook marks an order `failed` or
 * `canceled` and **never calls `restoreInventory`** — the comment in
 * paymentController saying the webhook is responsible for the reservation
 * describes an intention, not the code. `restoreInventory` had exactly one
 * caller before this change, in the same request that took the stock. So a
 * declined card destroyed the reserved units just as permanently as an
 * abandoned tab did.
 */
const TERMINAL_UNPAID_STATUSES = new Set(['failed', 'canceled']);

/** The customer has been charged. The stock is theirs; never sweep it. */
const PAID_STATUSES = new Set(['paid']);

/**
 * Is this order still holding stock it has not paid for?
 *
 * `paymentStatus` is the field that matters, not `status`. An order can be
 * `status: 'pending'` with `paymentStatus: 'paid'` for as long as fulfilment
 * takes to pick it up, and sweeping that would take stock away from a
 * customer who has been charged for it — the worst possible outcome for a
 * function whose job is to be conservative.
 */
export function holdsReservation(order) {
  if (!order || typeof order !== 'object') {
    return false;
  }

  if (PAID_STATUSES.has(order.paymentStatus)) {
    return false;
  }

  // Already released. `restoreInventory` is not idempotent — running it twice
  // would hand the same units back twice and inflate the catalogue.
  if (order.reservationReleasedAt) {
    return false;
  }

  return Array.isArray(order.items) && order.items.length > 0;
}

/**
 * Does this hold have to wait out the TTL before it can be released?
 *
 * Only a `pending` one does, because "pending" is genuinely ambiguous: the
 * customer may still be typing their card number. `failed` and `canceled`
 * are not ambiguous at all — nobody is going to pay for that order — so
 * making those wait 30 minutes would hold stock off the shelf for no reason.
 */
export function requiresExpiry(order) {
  return !TERMINAL_UNPAID_STATUSES.has(order?.paymentStatus);
}

/**
 * Has the hold lasted longer than it is allowed to?
 *
 * Measured from `reservedAt` where it exists and from `createdAt` otherwise,
 * so orders written before this field existed are still swept rather than
 * being held forever by their own missing timestamp.
 */
export function isExpired(order, { now = Date.now(), ttlMs = DEFAULT_RESERVATION_TTL_MS } = {}) {
  const stamp = order?.reservedAt ?? order?.createdAt;

  if (!stamp) {
    // No timestamp at all: not provably expired, so leave it alone. A sweeper
    // that guesses is a sweeper that eventually cancels a live order.
    return false;
  }

  const reservedAt = new Date(stamp).getTime();

  if (Number.isNaN(reservedAt)) {
    return false;
  }

  return now - reservedAt >= ttlMs;
}

/**
 * The lines to hand back for an order.
 *
 * Shaped for `restoreInventory`, which takes `{ bookId, quantity }` and skips
 * anything it cannot use. Filtering here as well means a single malformed
 * line does not quietly become a restore of zero.
 */
export function reservationLines(order) {
  if (!Array.isArray(order?.items)) {
    return [];
  }

  return order.items
    .filter(
      (item) =>
        item &&
        typeof item.bookId === 'string' &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    )
    .map((item) => ({ bookId: item.bookId, quantity: item.quantity }));
}

/**
 * Decide what to do with one order.
 *
 * Returns either `{ action: 'skip', reason }` or `{ action: 'release', lines,
 * changes }`, where `changes` is what to write onto the document. The caller
 * applies it; nothing is mutated here.
 */
export function decideRelease(order, options = {}) {
  const { now = Date.now(), ttlMs = DEFAULT_RESERVATION_TTL_MS } = options;

  if (!holdsReservation(order)) {
    return { action: 'skip', reason: 'order is not holding a reservation' };
  }

  if (requiresExpiry(order) && !isExpired(order, { now, ttlMs })) {
    return { action: 'skip', reason: 'reservation has not expired yet' };
  }

  const lines = reservationLines(order);

  if (lines.length === 0) {
    return { action: 'skip', reason: 'no restorable lines' };
  }

  return {
    action: 'release',
    lines,
    changes: {
      status: 'canceled',
      paymentStatus: 'canceled',
      // The marker that makes a second sweep a no-op. Without it, two
      // overlapping runs would restore the same units twice.
      reservationReleasedAt: new Date(now),
    },
  };
}

/**
 * Plan a whole sweep.
 *
 * Separated from `decideRelease` so a caller can see, log or assert on the
 * complete set of decisions before any of them is applied.
 */
export function planSweep(orders, options = {}) {
  const list = Array.isArray(orders) ? orders : [];

  const releases = [];
  const skipped = [];

  for (const order of list) {
    const decision = decideRelease(order, options);

    if (decision.action === 'release') {
      releases.push({ order, ...decision });
    } else {
      skipped.push({ order, ...decision });
    }
  }

  return { releases, skipped };
}

export default {
  DEFAULT_RESERVATION_TTL_MS,
  decideRelease,
  holdsReservation,
  isExpired,
  planSweep,
  reservationLines,
};
