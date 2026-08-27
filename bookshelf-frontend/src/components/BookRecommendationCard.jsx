import React from "react";
import "./BookRecommendationCard.css";

export default function BookRecommendationCard({
  title = "The Midnight Library",
  author = "Matt Haig",
  cover = "",
  description = "A thoughtful story about choices, possibilities, and the lives we could have lived.",
  rating = 4.6,
  category = "Fiction",
  reason = "Recommended for you",
  actionLabel = "View Book",
  onAction,
  variant = "blue",
  className = ""
}) {
  const safeRating = Math.min(5, Math.max(0, Number(rating) || 0));

  return (
    <article
      className={`book-recommendation-card book-recommendation-card--${variant} ${className}`}
    >
      <div className="book-recommendation-card__cover-wrap">
        {cover ? (
          <img
            className="book-recommendation-card__cover"
            src={cover}
            alt={`${title} book cover`}
          />
        ) : (
          <div className="book-recommendation-card__cover-placeholder" aria-hidden="true">
            <span>📖</span>
          </div>
        )}
      </div>

      <div className="book-recommendation-card__body">
        <span className="book-recommendation-card__reason">{reason}</span>

        <div className="book-recommendation-card__category">
          {category}
        </div>

        <h3 className="book-recommendation-card__title">{title}</h3>
        <p className="book-recommendation-card__author">by {author}</p>

        <div className="book-recommendation-card__rating" aria-label={`Rating ${safeRating} out of 5`}>
          <span className="book-recommendation-card__stars" aria-hidden="true">
            {"★".repeat(Math.floor(safeRating))}
            {"☆".repeat(5 - Math.floor(safeRating))}
          </span>
          <strong>{safeRating.toFixed(1)}</strong>
        </div>

        <p className="book-recommendation-card__description">
          {description}
        </p>

        <button
          type="button"
          className="book-recommendation-card__action"
          onClick={() => onAction?.({ title, author, category, rating: safeRating })}
        >
          {actionLabel}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
