import reviewRepository from '../repositories/reviewRepository.js';
import { isAdmin } from '../utils/roles.js';

// @desc    Create a new review for a book
// @route   POST /api/books/:id/reviews
// @access  Private (Authenticated User)
export const createReview = async (req, res, next) => {
  try {
    const bookId = req.params.id;
    const { rating, title, comment } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ message: 'Review title is required' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({ message: 'Review comment is required' });
    }

    const userName = req.user.name || req.user.email.split('@')[0];

    const review = await reviewRepository.createReview({
      bookId,
      userId: req.user._id,
      userName,
      rating: Number(rating),
      title: title.trim(),
      comment: comment.trim(),
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

// @desc    Get reviews for a book with pagination & filters
// @route   GET /api/books/:id/reviews
// @access  Public
export const getBookReviews = async (req, res, next) => {
  try {
    const bookId = req.params.id;
    const { page, limit, rating, sortBy } = req.query;

    const result = await reviewRepository.getReviewsByBookId(bookId, {
      page,
      limit,
      rating,
      sortBy,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// @desc    Vote review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private (Authenticated User)
export const voteHelpful = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const review = await reviewRepository.voteHelpful(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({
      message: 'Vote recorded',
      helpfulVotes: review.helpfulVotes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Review Owner or Admin)
export const deleteReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const isUserAdmin = isAdmin(req.user);

    const success = await reviewRepository.deleteReview(reviewId, req.user._id, isUserAdmin);

    if (!success) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};
