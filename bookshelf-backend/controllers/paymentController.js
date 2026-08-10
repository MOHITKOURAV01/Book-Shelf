import orderRepository from '../repositories/orderRepository.js';
import { createPaymentIntent } from '../services/stripeService.js';
import { getBookById, updateInventoryWithOCC } from '../repositories/bookRepository.js';

export const createIntent = async (req, res, next) => {
  try {
    const { items, shippingAddress, couponCode } = req.body;
    
    // Server-side calculation of total to prevent client-side tampering
    // In a real application, we would fetch book prices from the database based on bookIds
    // For this demonstration, we'll calculate based on the passed prices, but 
    // ideally, this needs DB validation.
    let subtotal = 0;
    const orderItems = [];
    const itemVersions = [];

    for (const item of items) {
      const bookId = item.bookId || item.id;
      const bookRecord = getBookById(bookId);

      if (!bookRecord) {
        return res.status(404).json({ message: `Book not found: ${bookId}` });
      }

      itemVersions.push({
        bookId,
        quantity: item.quantity,
        expectedVersion: bookRecord.__v,
      });

      subtotal += bookRecord.price * item.quantity;
      
      orderItems.push({
        bookId: bookRecord.id,
        title: bookRecord.title,
        price: bookRecord.price,
        quantity: item.quantity,
      });
    }

    // Attempt OCC Inventory Update
    try {
      updateInventoryWithOCC(itemVersions);
    } catch (error) {
      return res.status(error.status || 500).json({ message: error.message });
    }

    const tax = subtotal * 0.05; // 5% mock tax
    const shipping = 5.99; // Mock flat shipping rate
    const total = subtotal + tax + shipping;

    const savedOrder = await orderRepository.create({
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

    const paymentIntent = await createPaymentIntent(total, 'usd', {
      orderId: savedOrder._id.toString(),
      userId: req.user ? req.user._id.toString() : 'guest',
    });

    savedOrder.stripePaymentIntentId = paymentIntent.id;
    await orderRepository.save(savedOrder);

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      orderId: savedOrder._id,
    });
  } catch (error) {
    next(error);
  }
};
