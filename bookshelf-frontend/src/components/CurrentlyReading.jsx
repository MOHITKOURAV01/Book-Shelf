import React from "react";
import "./CurrentlyReading.css";

export default function CurrentlyReading({
  title = "The Midnight Library",
  author = "Matt Haig",
  cover = "",
  progress = 64,
  currentPage = 208,
  totalPages = 327,
  genre = "Fiction",
  status = "Reading now",
  variant = "blue",
  compact = false,
  onContinue
}) {
  const safeProgress = Math.min(100, Math.max(0, progress));

  return (
    <article
      className={[
        "currently-reading",
        `currently-reading--${variant}`,
        compact && "currently-reading--compact"
      ].filter(Boolean).join(" ")}
      tabIndex="0"
      aria-label={`Currently reading ${title} by ${author}`}
    >
      <div className="currently-reading__header">
        <div>
          <p className="currently-reading__eyebrow">Currently reading</p>
          <span className="currently-reading__status">
            <i aria-hidden="true" />
            {status}
          </span>
        </div>
        {genre && <span className="currently-reading__genre">{genre}</span>}
      </div>

      <div className="currently-reading__body">
        <div className="currently-reading__cover">
          {cover ? (
            <img src={cover} alt={`Cover of ${title}`} />
          ) : (
            <div className="currently-reading__cover-placeholder" aria-hidden="true">
              <span>📖</span>
            </div>
          )}
        </div>

        <div className="currently-reading__details">
          <h3 className="currently-reading__title">{title}</h3>
          <p className="currently-reading__author">by {author}</p>

          <div className="currently-reading__progress-info">
            <strong>{safeProgress}%</strong>
            <span>{currentPage} of {totalPages} pages</span>
          </div>

          <div
            className="currently-reading__track"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={safeProgress}
            aria-label="Reading progress"
          >
            <span
              className="currently-reading__fill"
              style={{ "--reading-progress": `${safeProgress}%` }}
            />
          </div>

          <div className="currently-reading__footer">
            <span>Keep going — you're making progress.</span>
            {onContinue && (
              <button
                type="button"
                className="currently-reading__button"
                onClick={onContinue}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
