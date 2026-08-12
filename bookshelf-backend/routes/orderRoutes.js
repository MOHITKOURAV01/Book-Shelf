import express from 'express';
import {
  getMyOrders,
  getOrderById,
  getAllOrders,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// '/mine' must stay above '/:id' or Express matches "mine" as an order id.
router.route('/').get(protect, admin, getAllOrders);
router.route('/mine').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);

export default router;
