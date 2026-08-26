import Order from '../models/Order.js';

class OrderRepository {
  async findByUserId(userId) {
    return await Order.find({ userId }).sort({ createdAt: -1 });
  }

  async findById(id) {
    return await Order.findById(id);
  }

  async findAll() {
    return await Order.find({}).sort({ createdAt: -1 });
  }

  /**
   * Orders still holding inventory they have not paid for, reserved before
   * `before`.
   *
   * Filtered on `paymentStatus` rather than on `status`: an order sits at
   * `status: 'pending'` with `paymentStatus: 'paid'` for as long as
   * fulfilment takes to pick it up, and sweeping that would take stock away
   * from a customer who has already been charged.
   *
   * `reservationReleasedAt: null` also matches documents where the field is
   * absent, which is every order written before #329.
   */
  async findExpiredReservations({ before, limit = 200 } = {}) {
    return await Order.find({
      reservationReleasedAt: null,
      $or: [
        {
          // Still ambiguous — the customer may be mid-card-form — so these
          // only qualify once the hold is older than the TTL.
          paymentStatus: 'pending',
          $or: [
            { reservedAt: { $lte: before } },
            // Orders from before `reservedAt` existed fall back to
            // createdAt, so they are swept rather than held forever by a
            // missing field.
            { reservedAt: { $exists: false }, createdAt: { $lte: before } },
          ],
        },
        {
          /*
           * Terminal and unpaid: a declined card, or a canceled intent.
           * Nobody is going to pay for these, so there is nothing to wait
           * for. They are here because the webhook marks them and never
           * calls restoreInventory — the stock was being destroyed just as
           * permanently as by an abandoned tab.
           */
          paymentStatus: { $in: ['failed', 'canceled'] },
        },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  async create(orderData) {
    const order = new Order(orderData);
    return await order.save();
  }

  async save(orderDocument) {
    return await orderDocument.save();
  }
}

export default new OrderRepository();
