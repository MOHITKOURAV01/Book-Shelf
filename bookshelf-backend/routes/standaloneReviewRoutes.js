import express from 'express';
import { voteHelpful, deleteReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/:id/helpful', protect, voteHelpful);
router.delete('/:id', protect, deleteReview);

export default router;
