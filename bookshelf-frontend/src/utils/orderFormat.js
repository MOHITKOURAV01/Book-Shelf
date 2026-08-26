/**
 * Presentation helpers for a server `Order`.
 *
 * The order history used to read `localStorage`, where the app itself wrote
 * every field and could rely on their shape. It reads `GET /api/orders/mine`
 * now, and a document that came back from Mongo is not a guarantee: an order
 * written by an older build, or one whose webhook has not landed yet, can be
 * missing anything the schema does not mark required.
 *
 * `OrderCard` was calling `order.paymentStatus.toLowerCase()` and
 * `order.shippingStatus.toLowerCase()` unguarded — and `shippingStatus` is
 * not a field on the server model at all, so that was a TypeError on the
 * first real order. Everything here returns something renderable for every
 * input. See #326.
 */

/**
 * `status` on the model, which tracks fulfilment.
 * Matches the enum in bookshelf-backend/models/Order.js.
 */
export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  canceled: 'Canceled',
  payment_failed: 'Payment failed',
};

/** `paymentStatus` on the model, which tracks the money. */
export const PAYMENT_STATUS_LABELS = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  canceled: 'Payment canceled',
};

/**
 * Which of the two a card should lead with.
 *
 * They disagree more often than you would think — an order sits at
 * `status: 'pending'` with `paymentStatus: 'paid'` for as long as it takes
 * fulfilment to pick it up. The payment is the half a customer is anxious
 * about, so a payment that has not gone through wins; otherwise fulfilment
 * is the more informative of the two.
 */
export function primaryStatus(order) {
  const payment = order?.paymentStatus;

  if (payment === 'failed' || payment === 'canceled' || payment === 'pending') {
    return {
      key: payment,
      label: PAYMENT_STATUS_LABELS[payment],
      tone: payment === 'pending' ? 'warning' : 'danger',
    };
  }

  const status = typeof order?.status === 'string' ? order.status : 'pending';
  const label = ORDER_STATUS_LABELS[status] ?? formatUnknownStatus(status);

  const tone =
    status === 'delivered'
      ? 'success'
      : status === 'canceled' || status === 'payment_failed'
        ? 'danger'
        : status === 'shipped' || status === 'confirmed'
          ? 'info'
          : 'warning';

  return { key: status, label, tone };
}

/**
 * A status the frontend has not been taught about yet — the enum grew, or the
 * document predates it. Render it rather than dropping it: "Awaiting Pickup"
 * tells the customer more than a blank badge does.
 */
function formatUnknownStatus(status) {
  if (typeof status !== 'string' || status.trim() === '') {
    return 'Unknown';
  }

  return status
    .trim()
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Money, as the server means it.
 *
 * Totals are major units of the currency the payment intent is created in,
 * which is USD (`createPaymentIntent(checkout.total, 'usd')`). A missing or
 * non-numeric amount renders as an em dash rather than as "$NaN" — an order
 * still being written by the webhook is a normal thing to catch mid-flight.
 */
export function formatMoney(amount) {
  /*
   * `Number(null)` and `Number('')` are both 0, and `Number(true)` is 1, so
   * coercing first would render a *missing* total as "$0.00" — a customer
   * being told their order was free. Only a number, or a string that is
   * meant to be one, gets past here.
   */
  if (typeof amount !== 'number' && typeof amount !== 'string') {
    return '—';
  }

  if (typeof amount === 'string' && amount.trim() === '') {
    return '—';
  }

  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return '—';
  }

  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A date the customer can read, or an em dash if the value is unusable. */
export function formatOrderDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * A short, stable handle for an order.
 *
 * A Mongo ObjectId is 24 hex characters and nobody reads it out loud. The
 * last six are enough to tell two of a customer's orders apart, and the full
 * id stays available for anyone who needs to quote it to support.
 */
export function orderReference(order) {
  const id = order?._id ?? order?.id;

  if (typeof id !== 'string' || id.length === 0) {
    return '—';
  }

  return id.length > 6 ? `#${id.slice(-6).toUpperCase()}` : `#${id.toUpperCase()}`;
}

/** Total books, not total lines. Three copies of one book is three books. */
export function countOrderItems(order) {
  if (!Array.isArray(order?.items)) {
    return 0;
  }

  return order.items.reduce((total, item) => {
    const quantity = Number(item?.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? total + quantity : total;
  }, 0);
}

/**
 * What one line cost. Falls back to `undefined` — not to zero — when either
 * half is unusable, so `formatMoney` shows an em dash instead of claiming the
 * line was free.
 */
export function lineTotal(item) {
  const price = Number(item?.price);
  const quantity = Number(item?.quantity);

  if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
    return undefined;
  }

  return price * quantity;
}

/**
 * Is this an order worth showing at all?
 *
 * Anything can come back from the network. A card needs an id to key on and
 * to link to; without one there is nothing to render and nothing to click.
 */
export function isRenderableOrder(order) {
  return Boolean(order && typeof order === 'object' && (order._id || order.id));
}

export default {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  countOrderItems,
  formatMoney,
  formatOrderDate,
  isRenderableOrder,
  lineTotal,
  orderReference,
  primaryStatus,
};
