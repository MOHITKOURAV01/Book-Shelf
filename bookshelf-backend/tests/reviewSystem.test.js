import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import reviewRepository from '../repositories/reviewRepository.js';
import { createReview, voteHelpful, deleteReview } from '../controllers/reviewController.js';

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('Interactive Book Review & Rating System', () => {
  beforeEach(() => {
    reviewRepository.clearMemoryCache();
  });

  test('createReview creates review and updates stats', async () => {
    const req = {
      params: { id: 'b1' },
      body: {
        rating: 5,
        title: 'Outstanding Masterpiece',
        comment: 'This book completely transformed my understanding of software architecture!',
      },
      user: { _id: 'user_1', name: 'Alice Smith', email: 'alice@example.com' },
    };
    const res = makeRes();

    await createReview(req, res, () => {});

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.review.rating, 5);
    assert.equal(res.body.review.title, 'Outstanding Masterpiece');

    const stats = await reviewRepository.getReviewStats('b1');
    assert.equal(stats.totalCount, 1);
    assert.equal(stats.averageRating, 5);
  });

  test('createReview prevents duplicate submission for same book by same user', async () => {
    const req1 = {
      params: { id: 'b1' },
      body: { rating: 5, title: 'First Review', comment: 'Great!' },
      user: { _id: 'user_1', email: 'alice@example.com' },
    };
    const res1 = makeRes();
    await createReview(req1, res1, () => {});

    const req2 = {
      params: { id: 'b1' },
      body: { rating: 4, title: 'Second Review', comment: 'Still good!' },
      user: { _id: 'user_1', email: 'alice@example.com' },
    };
    const res2 = makeRes();
    await createReview(req2, res2, () => {});

    assert.equal(res2.statusCode, 400);
    assert.match(res2.body.message, /already submitted a review/);
  });

  test('voteHelpful increments helpful votes', async () => {
    const created = await reviewRepository.createReview({
      bookId: 'b1',
      userId: 'user_1',
      userName: 'Bob',
      rating: 4,
      title: 'Solid Book',
      comment: 'Very informative read.',
    });

    const req = { params: { id: created._id } };
    const res = makeRes();

    await voteHelpful(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.helpfulVotes, 1);
  });

  test('deleteReview allows review owner to delete review', async () => {
    const created = await reviewRepository.createReview({
      bookId: 'b1',
      userId: 'user_1',
      userName: 'Bob',
      rating: 4,
      title: 'Solid Book',
      comment: 'Very informative read.',
    });

    const req = {
      params: { id: created._id },
      user: { _id: 'user_1', role: 'user' },
    };
    const res = makeRes();

    await deleteReview(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /deleted successfully/);

    const stats = await reviewRepository.getReviewStats('b1');
    assert.equal(stats.totalCount, 0);
  });
});
