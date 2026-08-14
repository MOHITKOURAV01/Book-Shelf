import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_MINOR_UNITS,
  MoneyError,
  applyRate,
  format,
  multiply,
  sum,
  toMajorUnits,
  toMinorUnits,
} from '../utils/money.js';

describe('toMinorUnits', () => {
  test('converts whole major units exactly', () => {
    assert.equal(toMinorUnits(349), 34900);
    assert.equal(toMinorUnits(0), 0);
  });

  test('rounds to the nearest minor unit', () => {
    assert.equal(toMinorUnits(5.99), 599);
    assert.equal(toMinorUnits(19.995), 2000);
    assert.equal(toMinorUnits(0.005), 1);
  });

  test('handles values that float multiplication gets wrong', () => {
    // 1.005 * 100 is 100.49999999999999 in binary floating point. Rounding
    // here is what stops that leaking into a total.
    assert.equal(toMinorUnits(1.1), 110);
    assert.equal(toMinorUnits(2.675), 268);
  });

  test('rejects anything that is not a finite non-negative number', () => {
    assert.throws(() => toMinorUnits(-1), MoneyError);
    assert.throws(() => toMinorUnits(NaN), MoneyError);
    assert.throws(() => toMinorUnits(Infinity), MoneyError);
    assert.throws(() => toMinorUnits('349'), MoneyError);
    assert.throws(() => toMinorUnits(undefined), MoneyError);
  });
});

describe('toMajorUnits', () => {
  test('round-trips with toMinorUnits', () => {
    for (const amount of [0, 5.99, 349, 1047.35, 0.01]) {
      assert.equal(toMajorUnits(toMinorUnits(amount)), amount);
    }
  });

  test('rejects a non-integer minor amount', () => {
    assert.throws(() => toMajorUnits(52.35), MoneyError);
  });
});

describe('multiply', () => {
  test('is exact for the catalogue prices', () => {
    assert.equal(multiply(34900, 3), 104700);
  });

  test('allows a zero quantity', () => {
    assert.equal(multiply(34900, 0), 0);
  });

  test('rejects a negative or fractional quantity', () => {
    assert.throws(() => multiply(34900, -5), MoneyError);
    assert.throws(() => multiply(34900, 1.5), MoneyError);
  });

  test('refuses to build an amount beyond the ceiling', () => {
    assert.throws(() => multiply(34900, 1e9), MoneyError);
  });
});

describe('sum', () => {
  test('adds minor amounts exactly', () => {
    assert.equal(sum([104700, 5235, 599]), 110534);
  });

  test('is zero for an empty list', () => {
    assert.equal(sum([]), 0);
  });

  test('rejects a non-integer member', () => {
    assert.throws(() => sum([100, 52.35]), MoneyError);
  });

  test('refuses to exceed the ceiling', () => {
    assert.throws(() => sum([MAX_MINOR_UNITS, 1]), MoneyError);
  });
});

describe('applyRate', () => {
  test('computes 5% tax as an integer', () => {
    // The float version of this produced 52.35000000000001.
    assert.equal(applyRate(104700, 0.05), 5235);
  });

  test('rounds half up', () => {
    assert.equal(applyRate(101, 0.05), 5); // 5.05 -> 5
    assert.equal(applyRate(110, 0.05), 6); // 5.5  -> 6
  });

  test('is zero for a zero rate or a zero amount', () => {
    assert.equal(applyRate(104700, 0), 0);
    assert.equal(applyRate(0, 0.05), 0);
  });

  test('rejects a negative or non-numeric rate', () => {
    assert.throws(() => applyRate(100, -0.05), MoneyError);
    assert.throws(() => applyRate(100, '5%'), MoneyError);
  });
});

describe('format', () => {
  test('renders two decimal places', () => {
    assert.equal(format(110534), '1105.34');
    assert.equal(format(0), '0.00');
    assert.equal(format(5), '0.05');
  });
});

/**
 * The arithmetic the old controller got wrong.
 *
 * With the whole-number prices currently in books.json the float version
 * happens to land on the right answer, which is exactly why this went
 * unnoticed. It stops being true the moment a price has decimals — and the
 * checkout page in the frontend already posts 19.99.
 */
describe('the arithmetic the old controller got wrong', () => {
  /** What paymentController.js used to do. */
  function priceWithFloats(price, quantity) {
    const subtotal = price * quantity;
    const tax = subtotal * 0.05;
    const total = subtotal + tax + 5.99;
    return { subtotal, tax, total };
  }

  /** What it does now. */
  function priceWithIntegers(price, quantity) {
    const subtotal = multiply(toMinorUnits(price), quantity);
    const tax = applyRate(subtotal, 0.05);
    const total = sum([subtotal, tax, toMinorUnits(5.99)]);
    return { subtotal, tax, total };
  }

  test('binary drift undercharges by a cent at 12.95 x 6', () => {
    const floats = priceWithFloats(12.95, 6);
    const integers = priceWithIntegers(12.95, 6);

    // The subtotal is not even 77.70.
    assert.equal(floats.subtotal, 77.69999999999999);

    // stripeService charges Math.round(amount * 100).
    assert.equal(Math.round(floats.total * 100), 8757);
    assert.equal(integers.total, 8758);
  });

  test('and at 7.35 x 2 and 13.45 x 6', () => {
    assert.equal(Math.round(priceWithFloats(7.35, 2).total * 100), 2142);
    assert.equal(priceWithIntegers(7.35, 2).total, 2143);

    assert.equal(Math.round(priceWithFloats(13.45, 6).total * 100), 9072);
    assert.equal(priceWithIntegers(13.45, 6).total, 9073);
  });

  test('a float total can hold a fraction of a cent, which nothing can charge', () => {
    const floats = priceWithFloats(19.99, 3);

    // This is what was written to the order document.
    assert.equal(floats.tax, 2.9985);
    assert.equal(floats.total, 68.9585);

    // Stripe rounds, so the order says one thing and the customer is
    // charged another.
    assert.equal(Math.round(floats.total * 100) / 100, 68.96);

    const integers = priceWithIntegers(19.99, 3);
    assert.equal(integers.total, 6896);
    assert.equal(toMajorUnits(integers.total), 68.96);
  });

  test('the value handed to Stripe survives its own *100 round trip', () => {
    // stripeService does Math.round(amount * 100). Because the number given
    // to it came from an integer, this is exact rather than approximate —
    // for every cart shape, not just the convenient ones.
    for (const [price, quantity] of [
      [349, 3],
      [12.95, 6],
      [19.99, 3],
      [7.35, 2],
      [0.01, 1],
    ]) {
      const { total } = priceWithIntegers(price, quantity);
      assert.equal(Math.round(toMajorUnits(total) * 100), total);
    }
  });
});
