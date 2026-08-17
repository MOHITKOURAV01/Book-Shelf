import crypto from 'crypto';

/**
 * Decision logic for Stripe webhook events, as pure functions.
 *
 * The handler that used to live in webhook/stripeWebhook.js made three
 * mistakes that are all easier to see — and to test — once the decisions are
 * separated from the database calls:
 *
 *   1. Only the success branch checked the order's current state. A
 *      `payment_intent.canceled` arriving after a `payment_intent.succeeded`
 *      flipped a genuinely paid order to cancelled. Stripe does not guarantee
 *      event ordering, so that is not a hypothetical.
 *
 *   2. Every failure became a 500. Stripe reads a non-2xx as "retry me", so a
 *      deterministic failure — an orderId in the metadata that is not a valid
 *      ObjectId, say — became a retry loop that Stripe would keep running for
 *      three days before disabling the endpoint, at which point real payments
 *      stop being recorded.
 *
 *   3. Nothing tracked which events had already been handled, so a retry of a
 *      delivery whose response was lost did the work twice.
 *
 * The distinction that drives all of this: "I cannot process this **yet**"
 * (database down — 500, please retry) versus "I will never be able to process
 * this" (unknown order, malformed id, event type we do not handle — 2xx, stop
 * sending it).
 */

export const HANDLED_EVENT_TYPES = Object.freeze([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
]);

/**
 * Once an order is paid it does not become unpaid because a late event says
 * so. Refunds are a separate flow with their own events.
 */
export const TERMINAL_PAYMENT_STATUSES = Object.freeze(['paid']);

/** Mongo ObjectIds are 24 hex characters. Anything else will CastError. */
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function isValidObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

/**
 * Receipt numbers.
 *
 * Was `Math.random().toString(36).substring(2, 8)` — about 36^6 values from a
 * PRNG that makes no uniqueness promise, with no unique index behind it. Two
 * orders sharing a receipt number is a support problem rather than a security
 * one, but there is no reason to accept it when crypto.randomUUID() is free.
 */
export function generateReceiptNumber(year = new Date().getFullYear()) {
  const unique = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `RCPT-${year}-${unique}`;
}

/**
 * Whether this is an event we act on.
 *
 * An unhandled type is not an error. Stripe sends whatever the endpoint is
 * subscribed to, and answering anything other than 2xx to a type we simply
 * do not care about generates retries for no reason.
 */
export function isHandledEventType(type) {
  return HANDLED_EVENT_TYPES.includes(type);
}

/**
 * Pull the bits of a payment intent event we need, and say plainly when they
 * are not usable.
 */
export function extractPaymentContext(event) {
  const paymentIntent = event?.data?.object;

  if (!paymentIntent || typeof paymentIntent !== 'object') {
    return { ok: false, reason: 'event carried no payment intent object' };
  }

  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    return { ok: false, reason: 'payment intent metadata has no orderId' };
  }

  if (!isValidObjectId(orderId)) {
    // The old handler passed this straight to findById, which threw a
    // CastError, which became a 500, which Stripe retried forever.
    return {
      ok: false,
      reason: `metadata.orderId "${orderId}" is not a valid ObjectId`,
    };
  }

  return {
    ok: true,
    orderId,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Decide what an event should do to an order.
 *
 * Returns either `{ action: 'skip', reason }` or `{ action: 'apply', changes }`.
 * Never mutates the order it is given — the caller applies `changes` and
 * saves, which keeps this function testable without a database.
 */
export function decideTransition(order, event, context = {}) {
  const { paymentIntentId, now = new Date() } = context;

  if (!order) {
    return { action: 'skip', reason: 'order not found' };
  }

  const alreadyPaid = TERMINAL_PAYMENT_STATUSES.includes(order.paymentStatus);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      if (alreadyPaid) {
        // Idempotent: a redelivery of an event we already applied.
        return { action: 'skip', reason: 'order is already paid' };
      }

      return {
        action: 'apply',
        changes: {
          paymentStatus: 'paid',
          status: 'confirmed',
          transactionId: paymentIntentId,
          paidAt: now,
          receiptNumber: order.receiptNumber || generateReceiptNumber(now.getFullYear()),
        },
      };
    }

    case 'payment_intent.payment_failed': {
      if (alreadyPaid) {
        // A failed attempt that predates the successful one. Applying it
        // would mark a paid order failed and the money would be invisible.
        return {
          action: 'skip',
          reason: 'refusing to mark a paid order failed',
        };
      }

      if (order.paymentStatus === 'failed') {
        return { action: 'skip', reason: 'order is already marked failed' };
      }

      return {
        action: 'apply',
        changes: { paymentStatus: 'failed', status: 'payment_failed' },
      };
    }

    case 'payment_intent.canceled': {
      if (alreadyPaid) {
        // The specific bug in the issue: an out-of-order cancel used to
        // overwrite a successful payment.
        return {
          action: 'skip',
          reason: 'refusing to cancel a paid order',
        };
      }

      if (order.paymentStatus === 'canceled') {
        return { action: 'skip', reason: 'order is already canceled' };
      }

      return {
        action: 'apply',
        changes: { paymentStatus: 'canceled', status: 'canceled' },
      };
    }

    default:
      return { action: 'skip', reason: `unhandled event type ${event.type}` };
  }
}

/**
 * Remembers which event ids have been processed.
 *
 * Stripe retries the *same* event id, so an id is enough to recognise a
 * redelivery. Bounded so it cannot grow without limit; oldest entries are
 * dropped first, which is the right direction — a retry of something from two
 * days ago is far less likely than a retry of something from two minutes ago.
 *
 * In process memory, with the same caveat as middleware/rateLimiter.js: on
 * more than one instance each has its own view. That is a real limitation and
 * not the last line of defence — `decideTransition` refuses to move an order
 * out of a paid state regardless, so a redelivery that slips past this store
 * still cannot do damage. Moving to Redis only means replacing this class.
 */
export class ProcessedEventStore {
  constructor({ maxSize = 1000 } = {}) {
    this.maxSize = maxSize;
    this.seen = new Set();
  }

  has(eventId) {
    return this.seen.has(eventId);
  }

  /** Returns false when the id was already present. */
  add(eventId) {
    if (!eventId) {
      return false;
    }

    if (this.seen.has(eventId)) {
      return false;
    }

    this.seen.add(eventId);

    // Set preserves insertion order, so the first key is the oldest.
    while (this.seen.size > this.maxSize) {
      const oldest = this.seen.values().next().value;
      this.seen.delete(oldest);
    }

    return true;
  }

  get size() {
    return this.seen.size;
  }

  clear() {
    this.seen.clear();
  }
}

export default {
  HANDLED_EVENT_TYPES,
  isHandledEventType,
  extractPaymentContext,
  decideTransition,
  generateReceiptNumber,
  isValidObjectId,
  ProcessedEventStore,
};
