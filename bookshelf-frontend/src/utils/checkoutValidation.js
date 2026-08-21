/**
 * Checkout input handling: what the customer typed, and what the cart holds.
 *
 * Kept out of the page component on purpose. The page cannot be exercised
 * without Stripe.js and a live payment intent; these rules can, and they are
 * the part that decides what gets charged and where it gets shipped.
 *
 * The bug this exists to close: `Checkout.jsx` did not read the cart at all.
 * It posted a literal
 *
 *     items: [{ id: 'book-1', title: 'Sample Book', price: 19.99, quantity: 1 }]
 *
 * along with a hardcoded "Jane Doe, 123 Main St" address, for every customer,
 * on every checkout. `book-1` is not a catalogue id — the catalogue uses
 * `b1`…`b8` — so since #297 the backend has rejected it outright and the page
 * has hung on "Loading checkout..." with the failure only in the console.
 * See #315.
 */

/**
 * Fields the API's `shippingAddress` accepts, in the order they should be
 * presented. The backend's Order schema names them `name`, `address`, `city`,
 * `postalCode`, `country`; the form uses the same names so nothing has to be
 * translated on the way out.
 */
export const ADDRESS_FIELDS = [
  {
    name: 'name',
    label: 'Full name',
    autoComplete: 'name',
    placeholder: 'A. Sharma',
    maxLength: 100,
  },
  {
    name: 'address',
    label: 'Street address',
    autoComplete: 'street-address',
    placeholder: '221B Baker Street',
    maxLength: 200,
  },
  {
    name: 'city',
    label: 'City',
    autoComplete: 'address-level2',
    placeholder: 'Mumbai',
    maxLength: 100,
  },
  {
    name: 'postalCode',
    label: 'Postal code',
    autoComplete: 'postal-code',
    placeholder: '400001',
    maxLength: 16,
  },
  {
    name: 'country',
    label: 'Country',
    autoComplete: 'country-name',
    placeholder: 'India',
    maxLength: 60,
  },
];

export const EMPTY_ADDRESS = ADDRESS_FIELDS.reduce(
  (blank, field) => ({ ...blank, [field.name]: '' }),
  {}
);

/**
 * Deliberately loose. Postal codes differ by country far more than any single
 * regex can express, and a checkout that refuses a valid address is a worse
 * failure than one that accepts a typo — the courier can read "400 001".
 * These rules only catch the empty and the obviously-not-an-address.
 */
const MIN_LENGTHS = {
  name: 2,
  address: 5,
  city: 2,
  postalCode: 3,
  country: 2,
};

const POSTAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,14}$/;

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Trim every field and collapse runs of whitespace.
 *
 * Returned separately from validation so the caller can write the normalised
 * values back into the form. A customer who pasted a trailing space should
 * see it disappear, not be told their address is wrong.
 */
export function normaliseAddress(address = {}) {
  const normalised = {};

  for (const field of ADDRESS_FIELDS) {
    normalised[field.name] = collapseWhitespace(address[field.name]);
  }

  return normalised;
}

/**
 * Validate a normalised address.
 *
 * Returns `{ field: message }` — an object rather than an array, because the
 * form renders each message next to its own input and looking them up by
 * name is what it actually needs.
 */
export function validateAddress(address = {}) {
  const errors = {};
  const normalised = normaliseAddress(address);

  for (const { name, label, maxLength } of ADDRESS_FIELDS) {
    const value = normalised[name];

    if (value === '') {
      errors[name] = `${label} is required.`;
      continue;
    }

    if (value.length < MIN_LENGTHS[name]) {
      errors[name] = `${label} looks too short.`;
      continue;
    }

    if (value.length > maxLength) {
      errors[name] = `${label} must be ${maxLength} characters or fewer.`;
    }
  }

  if (!errors.postalCode && !POSTAL_CODE_PATTERN.test(normalised.postalCode)) {
    errors.postalCode =
      'Postal code may only contain letters, numbers, spaces and hyphens.';
  }

  return errors;
}

export function isAddressValid(address) {
  return Object.keys(validateAddress(address)).length === 0;
}

/**
 * Turn the cart into the `items` array the API expects.
 *
 * Only the id and the quantity are sent. The price is deliberately *not* —
 * `prepareCheckout()` prices every line from `books.json` itself, so a client
 * that sent a price would either be ignored or, worse, believed. Sending it
 * invites the second.
 *
 * Lines that cannot produce a usable id or a positive integer quantity are
 * dropped here rather than posted for the server to reject one at a time.
 * A cart entry with no id got there through a bug on this side; the customer
 * should not be shown a 400 about it.
 */
export function toOrderItems(cart = []) {
  if (!Array.isArray(cart)) {
    return [];
  }

  const merged = new Map();

  for (const item of cart) {
    if (item === null || typeof item !== 'object') {
      continue;
    }

    const rawId = item.bookId ?? item.id;

    if (typeof rawId !== 'string' || rawId.trim() === '') {
      continue;
    }

    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      continue;
    }

    const bookId = rawId.trim();
    // The cart keys on book id so duplicates should be impossible, but a
    // hand-edited `cart` in localStorage can hold two lines for one book and
    // the API rejects the whole request if it sees them separately.
    merged.set(bookId, (merged.get(bookId) ?? 0) + quantity);
  }

  return [...merged.entries()].map(([bookId, quantity]) => ({
    bookId,
    quantity,
  }));
}

/** Number of books, not number of lines. */
export function countItems(cart = []) {
  if (!Array.isArray(cart)) {
    return 0;
  }

  return cart.reduce((total, item) => {
    const quantity = Number(item?.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? total + quantity : total;
  }, 0);
}

/**
 * The cart subtotal, for the order summary only.
 *
 * The authoritative total comes back from the API in `amount`. This is what
 * the customer is looking at while they type their address, before any
 * request has been made.
 */
export function cartSubtotal(cart = []) {
  if (!Array.isArray(cart)) {
    return 0;
  }

  return cart.reduce((total, item) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);

    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return total;
    }

    return total + price * quantity;
  }, 0);
}

/**
 * Pull something a human can act on out of a failed create-intent call.
 *
 * The API answers a bad cart with `{ message, errors: [{ field, message }] }`
 * (see `CheckoutValidationError`), a bad reservation with a plain
 * `{ message }` and a 409, and `utils/api.js` normalises transport failures
 * into `{ status, message, code }`. All three land here.
 */
export function describeCheckoutError(error) {
  if (!error) {
    return 'Checkout could not be started. Please try again.';
  }

  const details = error.original?.response?.data ?? error.response?.data;
  const fieldErrors = details?.errors;

  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const first = fieldErrors[0];

    if (/Book not found/i.test(first?.message ?? '')) {
      return 'One of the books in your cart is no longer available. Remove it and try again.';
    }

    return first?.message ?? 'Your cart could not be processed.';
  }

  if (error.status === 409) {
    return (
      details?.message ??
      'Some of these books were bought while you were checking out. Please review your cart.'
    );
  }

  if (error.code === 'NETWORK_ERROR') {
    return 'We could not reach the shop. Check your connection and try again.';
  }

  return details?.message ?? error.message ?? 'Checkout could not be started.';
}

export default {
  ADDRESS_FIELDS,
  EMPTY_ADDRESS,
  normaliseAddress,
  validateAddress,
  isAddressValid,
  toOrderItems,
  countItems,
  cartSubtotal,
  describeCheckoutError,
};
