/**
 * Money arithmetic, in integer minor units.
 *
 * The checkout totals were computed with floating point:
 *
 *     subtotal += bookRecord.price * item.quantity;
 *     const tax = subtotal * 0.05;
 *     const total = subtotal + tax + shipping;
 *
 * Three books at 349 gives a subtotal of 1047 and a tax of
 * 52.35000000000001. That value was stored on the order document and handed
 * to Stripe, which multiplies by 100 and rounds — so the amount charged and
 * the amount recorded could differ by a cent, and no amount of staring at
 * either number would explain why.
 *
 * Everything here is an integer number of the currency's smallest unit.
 * Rounding happens once, deliberately, at the points marked below.
 */

/** Minor units per major unit. Two decimal places, as for USD and INR. */
export const MINOR_UNITS_PER_MAJOR = 100;

/**
 * The largest total we are willing to construct. Not a business rule — a
 * guard so a malformed request cannot drive the arithmetic into a region
 * where an integer stops being exact. Well below Number.MAX_SAFE_INTEGER.
 */
export const MAX_MINOR_UNITS = 1_000_000_000; // ten million major units

export class MoneyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MoneyError';
  }
}

/**
 * Convert a major-unit amount (what books.json stores) to minor units.
 *
 * This is the only place a price crosses from decimal to integer, and the
 * only rounding on the way in.
 */
export function toMinorUnits(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new MoneyError(`Amount must be a finite number, received ${amount}`);
  }

  if (amount < 0) {
    throw new MoneyError(`Amount must not be negative, received ${amount}`);
  }

  return Math.round(amount * MINOR_UNITS_PER_MAJOR);
}

/**
 * Convert back to major units for display, for storage on the order, and for
 * the Stripe service — which takes a major-unit amount and does its own
 * `Math.round(amount * 100)`. Because the value handed over came from an
 * integer, that round-trip is exact rather than approximate.
 */
export function toMajorUnits(minorUnits) {
  assertMinorUnits(minorUnits);
  return minorUnits / MINOR_UNITS_PER_MAJOR;
}

function assertMinorUnits(value) {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(
      `Minor-unit amounts must be safe integers, received ${value}`
    );
  }
}

/**
 * Multiply a unit price by a quantity.
 *
 * Both are integers, so this is exact — but the product can still overflow
 * the ceiling above if a request asks for an absurd quantity, which is
 * exactly what an attacker probing the endpoint would try.
 */
export function multiply(unitMinorUnits, quantity) {
  assertMinorUnits(unitMinorUnits);

  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new MoneyError(
      `Quantity must be a non-negative integer, received ${quantity}`
    );
  }

  const product = unitMinorUnits * quantity;
  assertWithinCeiling(product);

  return product;
}

export function sum(amounts) {
  let total = 0;

  for (const amount of amounts) {
    assertMinorUnits(amount);
    total += amount;
    assertWithinCeiling(total);
  }

  return total;
}

function assertWithinCeiling(value) {
  if (value > MAX_MINOR_UNITS) {
    throw new MoneyError(
      `Amount ${value} exceeds the maximum of ${MAX_MINOR_UNITS} minor units`
    );
  }
}

/**
 * Apply a rate (0.05 for 5% tax) and round half up to the nearest minor unit.
 *
 * Half-up is what a customer expects and what most tax authorities specify.
 * `Math.round` in JavaScript rounds half *away from zero* for positives,
 * which is the same thing here because the input is never negative — the
 * guards above see to that.
 */
export function applyRate(minorUnits, rate) {
  assertMinorUnits(minorUnits);

  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0) {
    throw new MoneyError(`Rate must be a non-negative number, received ${rate}`);
  }

  return Math.round(minorUnits * rate);
}

/** Formats for a log line or an error message. Not for the UI. */
export function format(minorUnits) {
  return (minorUnits / MINOR_UNITS_PER_MAJOR).toFixed(2);
}

export default {
  MINOR_UNITS_PER_MAJOR,
  MAX_MINOR_UNITS,
  MoneyError,
  toMinorUnits,
  toMajorUnits,
  multiply,
  sum,
  applyRate,
  format,
};
