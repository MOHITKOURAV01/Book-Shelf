import orderRepository from '../repositories/orderRepository.js';
import { createPaymentIntent } from '../services/stripeService.js';
import {
  getBookById,
  updateInventoryWithOCC,
  restoreInventory,
} from '../repositories/bookRepository.js';
import { prepareCheckout, CheckoutValidationError } from '../utils/checkout.js';
import { format } from '../utils/money.js';

/**
 * @desc    Create a payment intent for a cart
 * @route   POST /api/payments/create-intent
 * @access  Public — guests can check out
 *
 * The route is unauthenticated, so every value in the body is hostile until
 * proved otherwise. Previously `items` was iterated straight off the request:
 * a missing array was a 500, and a negative quantity passed the stock check,
 * *added* inventory to books.json and produced an order with a negative
 * total. See #297.
 *
 * Order of operations, and why:
 *
 *   1. Validate and price. Nothing is written until the whole cart is known
 *      to be good — a request that fails here has touched nothing.
 *   2. Reserve inventory. Before the payment, because the alternative is
 *      overselling in the window between charging and reserving.
 *   3. Create the order and the payment intent. Anything that fails from
 *      here on releases the reservation before returning.
 */
export const createIntent = async (req, res, next) => {
  const { items, shippingAddress } = req.body ?? {};

  let checkout;

  try {
    checkout = prepareCheckout(items, getBookById);
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return res.status(400).json({
        message: 'Invalid checkout request',
        errors: error.errors,
      });
    }

    return next(error);
  }

  // Reserve stock. A version mismatch or insufficient stock is the client's
  // answer (409), not a server fault.
  try {
    updateInventoryWithOCC(checkout.reservation);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }

  let reservationHeld = true;
  // Declared before `release` so the closure can mark it; it is only
  // assigned once the order has actually been created.
  let savedOrder;

  const release = (reason) => {
    if (!reservationHeld) {
      return;
    }

    reservationHeld = false;

    const { failed } = restoreInventory(checkout.reservation);

    // If the order exists, record that its hold is gone. Without this the
    // sweeper would find it still `pending` and restore the same lines a
    // second time. See #329.
    if (savedOrder && !savedOrder.reservationReleasedAt) {
      savedOrder.reservationReleasedAt = new Date();
    }

    if (failed.length > 0) {
      // Worth a loud log: the shop's stock is now understated and only a
      // human can reconcile it.
      console.error(
        `[checkout] released reservation after ${reason}, but ${failed.length} ` +
          'line(s) could not be restored:',
        failed
      );
    }
  };

  try {
    savedOrder = await orderRepository.create({
      userId: req.user ? req.user._id : null,
      items: checkout.orderItems,
      shippingAddress: shippingAddress || {},
      subtotal: checkout.subtotal,
      tax: checkout.tax,
      shipping: checkout.shipping,
      total: checkout.total,
      status: 'pending',
      paymentStatus: 'pending',
      /*
       * When the hold started. The reservation above is a durable change to
       * books.json, so it needs a durable record of when it happened —
       * otherwise nothing can tell an abandoned checkout from one the
       * customer is still filling in, and the stock is held forever. See
       * #329.
       */
      reservedAt: new Date(),
    });
  } catch (error) {
    release('the order could not be saved');
    return next(error);
  }

  try {
    const paymentIntent = await createPaymentIntent(checkout.total, 'usd', {
      orderId: savedOrder._id.toString(),
      userId: req.user ? req.user._id.toString() : 'guest',
    });

    savedOrder.stripePaymentIntentId = paymentIntent.id;
    await orderRepository.save(savedOrder);

    // Past this point the reservation belongs to the order, and the webhook
    // is responsible for it: payment_intent.payment_failed and
    // payment_intent.canceled are where it gets released.
    reservationHeld = false;

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      orderId: savedOrder._id,
      amount: {
        subtotal: checkout.subtotal,
        tax: checkout.tax,
        shipping: checkout.shipping,
        total: checkout.total,
      },
    });
  } catch (error) {
    release('the payment intent could not be created');

    // Leave a trace rather than an order stuck at 'pending' forever with no
    // payment intent attached to it.
    try {
      savedOrder.status = 'payment_failed';
      savedOrder.paymentStatus = 'failed';
      await orderRepository.save(savedOrder);
    } catch (saveError) {
      console.error(
        `[checkout] could not mark order ${savedOrder._id} as failed:`,
        saveError
      );
    }

    console.error(
      `[checkout] payment intent failed for order ${savedOrder._id} ` +
        `(total ${format(checkout.minorUnits.total)}):`,
      error.message
    );

    return next(error);
  }
};
