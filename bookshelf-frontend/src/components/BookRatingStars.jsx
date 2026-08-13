import React, { useState } from "react";
import "./BookRatingStars.css";

export default function BookRatingStars({
  rating = 0,
  maxRating = 5,
  reviewCount,
  size = "md",
  variant = "gold",
  interactive = false,
  onChange,
  showValue = true,
  showReviews = true,
  className = ""
}) {
  const [hoverRating, setHoverRating] = useState(null);

  const safeRating = Math.max(0, Math.min(Number(rating) || 0, maxRating));
  const displayedRating = hoverRating ?? safeRating;

  const getStarState = (index) => {
    const value = displayedRating - index;

    if (value >= 1) return "full";
    if (value >= 0.5) return "half";
    return "empty";
  };

  const handleSelect = (value) => {
    if (!interactive) return;
    onChange?.(value);
  };

  return (
    <div
      className={`book-rating-stars book-rating-stars--${size} book-rating-stars--${variant} ${
        interactive ? "book-rating-stars--interactive" : ""
      } ${className}`}
      onMouseLeave={() => interactive && setHoverRating(null)}
    >
      <div
        className="book-rating-stars__stars"
        role={interactive ? "radiogroup" : "img"}
        aria-label={`${safeRating} out of ${maxRating} stars${
          reviewCount !== undefined ? ` from ${reviewCount} reviews` : ""
        }`}
      >
        {Array.from({ length: maxRating }, (_, index) => {
          const state = getStarState(index);
          const value = index + 1;

          return (
            <button
              key={index}
              type="button"
              className={`book-rating-stars__star book-rating-stars__star--${state}`}
              disabled={!interactive}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              aria-checked={interactive ? safeRating === value : undefined}
              role={interactive ? "radio" : undefined}
              onMouseEnter={() => interactive && setHoverRating(value)}
              onFocus={() => interactive && setHoverRating(value)}
              onClick={() => handleSelect(value)}
            >
              <span className="book-rating-stars__star-base" aria-hidden="true">★</span>
              {state === "half" && (
                <span className="book-rating-stars__star-fill" aria-hidden="true">★</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="book-rating-stars__info">
        {showValue && (
          <strong className="book-rating-stars__value">
            {safeRating.toFixed(1)}
          </strong>
        )}

        {showReviews && reviewCount !== undefined && (
          <span className="book-rating-stars__reviews">
            ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
          </span>
        )}
      </div>
    </div>
  );
}
