import express from 'express';
import {
  createReview,
  getBookReviews,
  voteHelpful,
  deleteReview,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(getBookReviews)
  .post(protect, createReview);

export default router;
