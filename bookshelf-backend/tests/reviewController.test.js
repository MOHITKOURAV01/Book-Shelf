import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for the review controller logic.
 *
 * These tests exercise the rating-aggregation helper and the breakdown
 * computation without spinning up an HTTP server.  Run with:
 *
 *   node --test tests/reviewController.test.js
 */

// ── Helpers extracted for testing ──────────────────────────────────────────

/**
 * Recalculate the star distribution from an array of review objects.
 * Kept in sync with the aggregation in reviewController.js so it can be
 * tested independently.
 */
function computeBreakdown(reviews) {
  const counts = [0, 0, 0, 0, 0]; // index 0 → 1 star, … index 4 → 5 stars

  for (const r of reviews) {
    if (r.hidden) continue;
    const idx = Math.round(r.rating) - 1;
    if (idx >= 0 && idx < 5) {
      counts[idx] += 1;
    }
  }

  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: counts[star - 1],
  }));
}

function computeAverage(reviews) {
  const visible = reviews.filter((r) => !r.hidden);
  if (visible.length === 0) return 0;
  const sum = visible.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / visible.length) * 10) / 10;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('reviewController helpers', () => {
  const sampleReviews = [
    { rating: 5, hidden: false },
    { rating: 4, hidden: false },
    { rating: 5, hidden: false },
    { rating: 3, hidden: false },
    { rating: 1, hidden: false },
  ];

  describe('computeBreakdown', () => {
    it('returns correct counts for a mix of ratings', () => {
      const result = computeBreakdown(sampleReviews);
      assert.deepStrictEqual(result, [
        { star: 5, count: 2 },
        { star: 4, count: 1 },
        { star: 3, count: 1 },
        { star: 2, count: 0 },
        { star: 1, count: 1 },
      ]);
    });

    it('returns zero counts when the review list is empty', () => {
      const result = computeBreakdown([]);
      for (const entry of result) {
        assert.strictEqual(entry.count, 0);
      }
    });

    it('ignores hidden reviews', () => {
      const reviews = [
        { rating: 5, hidden: false },
        { rating: 5, hidden: true },
        { rating: 5, hidden: true },
      ];
      const result = computeBreakdown(reviews);
      const fiveStar = result.find((b) => b.star === 5);
      assert.strictEqual(fiveStar.count, 1);
    });

    it('clamps out-of-range ratings without crashing', () => {
      const reviews = [
        { rating: 0, hidden: false },
        { rating: 6, hidden: false },
        { rating: 3, hidden: false },
      ];
      // 0 maps to index -1 (skipped), 6 maps to index 5 (skipped)
      const result = computeBreakdown(reviews);
      const threeStar = result.find((b) => b.star === 3);
      assert.strictEqual(threeStar.count, 1);
    });
  });

  describe('computeAverage', () => {
    it('computes the arithmetic mean rounded to one decimal', () => {
      const avg = computeAverage(sampleReviews);
      // (5+4+5+3+1) / 5 = 3.6
      assert.strictEqual(avg, 3.6);
    });

    it('returns 0 for an empty list', () => {
      assert.strictEqual(computeAverage([]), 0);
    });

    it('excludes hidden reviews from the average', () => {
      const reviews = [
        { rating: 5, hidden: false },
        { rating: 1, hidden: true },
      ];
      assert.strictEqual(computeAverage(reviews), 5);
    });
  });
});

describe('review validators (schema shape)', () => {
  // Import the schema objects at test time — they are plain objects with
  // no side effects so this is safe.
  const schemas = await import('../validators/reviewValidators.js');

  it('createReviewSchema has all required fields', () => {
    const { createReviewSchema } = schemas;
    assert.ok(createReviewSchema.bookId, 'bookId is missing');
    assert.ok(createReviewSchema.rating, 'rating is missing');
    assert.ok(createReviewSchema.title, 'title is missing');
    assert.ok(createReviewSchema.body, 'body is missing');
  });

  it('each field has at least one rule', () => {
    for (const [field, config] of Object.entries(schemas.createReviewSchema)) {
      assert.ok(
        Array.isArray(config.rules) && config.rules.length > 0,
        `${field} has no rules`
      );
    }
  });
});
