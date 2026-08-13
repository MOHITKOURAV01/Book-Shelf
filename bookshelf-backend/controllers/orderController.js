import orderRepository from '../repositories/orderRepository.js';
import { canAccess } from '../utils/roles.js';

// @desc    Get logged in user orders
// @route   GET /api/orders/mine
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderRepository.findByUserId(req.user._id);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private — the owner, or an admin
const getOrderById = async (req, res, next) => {
  try {
    const order = await orderRepository.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Was `order.userId.toString() === req.user.id || req.user.isAdmin`.
    // The User model has no isAdmin field — it has `role` — so that half of
    // the condition was always undefined and admins got a 403 on anyone
    // else's order.
    if (!canAccess(req.user, order.userId)) {
      return res
        .status(403)
        .json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    // Mongoose 7+ reports a malformed ObjectId as a CastError; the old check
    // was on error.kind, which is no longer populated for this case.
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }

    next(error);
  }
};

// @desc    Get every order
// @route   GET /api/orders
// @access  Admin
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderRepository.findAll();
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export { getMyOrders, getOrderById, getAllOrders };
