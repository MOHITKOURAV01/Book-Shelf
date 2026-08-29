import Coupon from '../models/Coupon.js';

// ── Public: validate a coupon code and return the discount ──────────────────

export const validateCoupon = async (req, res, next) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ message: 'Coupon code is required' });

    const coupon = await Coupon.findOne({ code });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
    if (!coupon.active) return res.status(400).json({ message: 'This coupon is no longer active' });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit' });
    }

    const subtotal = Number(req.body.subtotal) || 0;
    if (subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required`,
      });
    }

    let discount = coupon.discountType === 'percentage'
      ? Math.round((subtotal * coupon.discountValue) / 100 * 100) / 100
      : coupon.discountValue;

    if (coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    discount = Math.min(discount, subtotal);

    res.json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
    });
  } catch (error) {
    next(error);
  }
};

// ── Admin: mark a coupon as used (called after successful payment) ──────────

export const recordCouponUse = async (code) => {
  await Coupon.findOneAndUpdate(
    { code: code.toUpperCase() },
    { $inc: { usedCount: 1 } }
  );
};

// ── Admin: list all coupons ─────────────────────────────────────────────────

export const listCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(coupons.map((c) => ({ ...c, id: c._id.toString() })));
  } catch (error) {
    next(error);
  }
};

// ── Admin: create a coupon ──────────────────────────────────────────────────

export const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ message: 'Coupon created', coupon: { ...coupon.toObject(), id: coupon._id.toString() } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A coupon with that code already exists' });
    next(error);
  }
};

// ── Admin: update a coupon ──────────────────────────────────────────────────

export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon updated', coupon: { ...coupon, id: coupon._id.toString() } });
  } catch (error) {
    next(error);
  }
};

// ── Admin: delete a coupon ──────────────────────────────────────────────────

export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    next(error);
  }
};
