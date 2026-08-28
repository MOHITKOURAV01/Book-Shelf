import React from "react";
import "./BookReviewSummary.css";

export default function BookReviewSummary({
  rating = 4.6,
  reviewCount = 128,
  totalRatings = 150,
  breakdown = { 5: 72, 4: 18, 3: 6, 2: 3, 1: 1 },
  title = "Reader reviews",
  variant = "gold",
  showBreakdown = true,
  compact = false
}) {
  const safeTotal = totalRatings || 1;

  return (
    <section
      className={`book-review-summary book-review-summary--${variant}${
        compact ? " book-review-summary--compact" : ""
      }`}
      aria-label={title}
    >
      <div className="book-review-summary__header">
        <div>
          <p className="book-review-summary__eyebrow">Community feedback</p>
          <h3 className="book-review-summary__title">{title}</h3>
        </div>
        <span className="book-review-summary__count">
          {reviewCount.toLocaleString()} reviews
        </span>
      </div>

      <div className="book-review-summary__body">
        <div className="book-review-summary__score">
          <strong>{Number(rating).toFixed(1)}</strong>
          <div className="book-review-summary__stars" aria-label={`${rating} out of 5`}>
            {"★★★★★"}
          </div>
          <span>out of 5</span>
        </div>

        {showBreakdown && (
          <div className="book-review-summary__breakdown">
            {[5, 4, 3, 2, 1].map((stars) => {
              const value = Number(breakdown[stars] || 0);
              const percentage = Math.min(100, Math.max(0, (value / safeTotal) * 100));

              return (
                <div className="book-review-summary__row" key={stars}>
                  <span className="book-review-summary__label">
                    {stars} <span aria-hidden="true">★</span>
                  </span>
                  <div
                    className="book-review-summary__track"
                    role="progressbar"
                    aria-valuenow={Math.round(percentage)}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`${stars} star ratings`}
                  >
                    <span style={{ "--review-progress": `${percentage}%` }} />
                  </div>
                  <span className="book-review-summary__percentage">
                    {Math.round(percentage)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
