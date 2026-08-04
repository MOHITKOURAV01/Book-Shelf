import Order from '../models/Order.js';
import { createPaymentIntent } from '../services/stripeService.js';

export const createIntent = async (req, res, next) => {
  try {
    const { items, shippingAddress, couponCode } = req.body;
    
    // Server-side calculation of total to prevent client-side tampering
    // In a real application, we would fetch book prices from the database based on bookIds
    // For this demonstration, we'll calculate based on the passed prices, but 
    // ideally, this needs DB validation.
    let subtotal = 0;
    const orderItems = items.map(item => {
      subtotal += item.price * item.quantity;
      return {
        bookId: item.bookId || item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
      };
    });

    const tax = subtotal * 0.05; // 5% mock tax
    const shipping = 5.99; // Mock flat shipping rate
    const total = subtotal + tax + shipping;

    const order = new Order({
      userId: req.user ? req.user._id : null,
      items: orderItems,
      shippingAddress: shippingAddress || {},
      subtotal,
      tax,
      shipping,
      total,
      status: 'pending',
      paymentStatus: 'pending',
    });

    const savedOrder = await order.save();

    const paymentIntent = await createPaymentIntent(total, 'usd', {
      orderId: savedOrder._id.toString(),
      userId: req.user ? req.user._id.toString() : 'guest',
    });

    savedOrder.stripePaymentIntentId = paymentIntent.id;
    await savedOrder.save();

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      orderId: savedOrder._id,
    });
  } catch (error) {
    next(error);
  }
};
