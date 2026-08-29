/**
 * RatingBreakdown — horizontal bar chart showing the distribution of star
 * ratings for a book.  The five bars are labelled 5→1 (best first) and each
 * one is filled proportionally to the count of reviews at that star level.
 */
export default function RatingBreakdown({ breakdown = [], totalReviews = 0 }) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) {
    return null;
  }

  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <div className="rating-breakdown" role="img" aria-label="Rating distribution">
      {breakdown.map(({ star, count }) => {
        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        const barWidth = Math.round((count / maxCount) * 100);

        return (
          <div key={star} className="rating-breakdown__row">
            <span className="rating-breakdown__label">{star} ★</span>
            <div className="rating-breakdown__track">
              <div
                className="rating-breakdown__fill"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="rating-breakdown__count">
              {count}
              <span className="rating-breakdown__pct"> ({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
