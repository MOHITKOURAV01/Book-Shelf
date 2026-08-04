import express from 'express';
import { createIntent } from '../controllers/paymentController.js';
// import { protect } from '../middleware/authMiddleware.js'; // Can be used to protect the route

const router = express.Router();

// Allow guests to checkout for now, or use protect middleware if strictly users only
router.post('/create-intent', createIntent);

export default router;
