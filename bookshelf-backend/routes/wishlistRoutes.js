import express from 'express';
import {
  getWishlist,
  toggleWishlist,
  mergeWishlist
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  toggleWishlistSchema,
  mergeWishlistSchema,
} from '../validators/wishlistValidators.js';

const router = express.Router();

// These were the only write endpoints in the API with no validation in front
// of them — every other one goes through validateBody, see authRoutes.js. As
// well as rejecting bad input, validateBody replaces req.body with only the
// fields named in the schema, so an extra key in the request body cannot
// reach the database.
router.route('/')
  .get(protect, getWishlist)
  .post(protect, validateBody(toggleWishlistSchema), toggleWishlist);

router.post(
  '/merge',
  protect,
  validateBody(mergeWishlistSchema),
  mergeWishlist
);

export default router;
