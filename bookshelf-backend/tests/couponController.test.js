import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for coupon validation logic.
 *
 * Exercises the discount computation extracted from couponController.js.
 */

function computeDiscount(coupon, subtotal) {
  if (!coupon.active) return { valid: false, reason: 'inactive' };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, reason: 'expired' };
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return { valid: false, reason: 'limit' };
  if (subtotal < coupon.minOrderAmount) return { valid: false, reason: 'min_order' };

  let discount = coupon.discountType === 'percentage'
    ? Math.round((subtotal * coupon.discountValue) / 100 * 100) / 100
    : coupon.discountValue;

  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);

  return { valid: true, discount };
}

describe('computeDiscount', () => {
  it('calculates percentage discount correctly', () => {
    const result = computeDiscount({ active: true, discountType: 'percentage', discountValue: 10, minOrderAmount: 0, maxDiscount: 0, maxUses: 0, usedCount: 0 }, 200);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.discount, 20);
  });

  it('calculates fixed discount correctly', () => {
    const result = computeDiscount({ active: true, discountType: 'fixed', discountValue: 50, minOrderAmount: 0, maxDiscount: 0, maxUses: 0, usedCount: 0 }, 200);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.discount, 50);
  });

  it('caps discount at subtotal', () => {
    const result = computeDiscount({ active: true, discountType: 'fixed', discountValue: 500, minOrderAmount: 0, maxDiscount: 0, maxUses: 0, usedCount: 0 }, 100);
    assert.strictEqual(result.discount, 100);
  });

  it('applies maxDiscount cap', () => {
    const result = computeDiscount({ active: true, discountType: 'percentage', discountValue: 50, minOrderAmount: 0, maxDiscount: 30, maxUses: 0, usedCount: 0 }, 200);
    assert.strictEqual(result.discount, 30);
  });

  it('rejects inactive coupons', () => {
    const result = computeDiscount({ active: false, discountType: 'fixed', discountValue: 10, minOrderAmount: 0, maxDiscount: 0, maxUses: 0, usedCount: 0 }, 100);
    assert.strictEqual(result.valid, false);
  });

  it('rejects expired coupons', () => {
    const past = new Date(Date.now() - 86400000);
    const result = computeDiscount({ active: true, expiresAt: past, discountType: 'fixed', discountValue: 10, minOrderAmount: 0, maxDiscount: 0, maxUses: 0, usedCount: 0 }, 100);
    assert.strictEqual(result.valid, false);
  });

  it('rejects when maxUses reached', () => {
    const result = computeDiscount({ active: true, discountType: 'fixed', discountValue: 10, minOrderAmount: 0, maxDiscount: 0, maxUses: 5, usedCount: 5 }, 100);
    assert.strictEqual(result.valid, false);
  });

  it('rejects when subtotal below minimum', () => {
    const result = computeDiscount({ active: true, discountType: 'fixed', discountValue: 10, minOrderAmount: 200, maxDiscount: 0, maxUses: 0, usedCount: 0 }, 100);
    assert.strictEqual(result.valid, false);
  });
});
