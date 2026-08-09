import orderRepository from '../repositories/orderRepository.js';

// @desc    Get logged in user orders
// @route   GET /api/orders/mine
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await orderRepository.findByUserId(req.user.id);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await orderRepository.findById(req.params.id);

    if (order) {
      // Check if user is admin or user owns order
      if (order.userId.toString() === req.user.id || req.user.isAdmin) {
        res.json(order);
      } else {
        res.status(403).json({ message: 'Not authorized to view this order' });
      }
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    if (error.kind === 'ObjectId') {
        res.status(404).json({ message: 'Order not found' });
    } else {
        res.status(500).json({ message: 'Server Error' });
    }
  }
};

export { getMyOrders, getOrderById };
