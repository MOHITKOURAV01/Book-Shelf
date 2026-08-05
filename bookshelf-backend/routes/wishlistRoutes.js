import express from 'express';
import {
  getWishlist,
  toggleWishlist,
  mergeWishlist
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getWishlist)
  .post(protect, toggleWishlist);

router.post('/merge', protect, mergeWishlist);

export default router;
