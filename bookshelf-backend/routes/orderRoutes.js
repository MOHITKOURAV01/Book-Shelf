import express from 'express';
import { getMyOrders, getOrderById } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/mine').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);

export default router;
