import React from "react";
import "./ReadingSessionCard.css";

export default function ReadingSessionCard({
  title = "Morning Reading",
  book = "Atomic Habits",
  duration = "32 min",
  pages = 18,
  progress = 72,
  date = "Today",
  status = "Completed",
  variant = "blue",
  className = ""
}) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <article
      className={`reading-session-card reading-session-card--${variant} ${className}`.trim()}
      tabIndex="0"
    >
      <div className="reading-session-card__header">
        <div className="reading-session-card__icon" aria-hidden="true">
          📖
        </div>

        <div className="reading-session-card__heading">
          <p className="reading-session-card__date">{date}</p>
          <h3 className="reading-session-card__title">{title}</h3>
          <p className="reading-session-card__book">{book}</p>
        </div>

        <span className="reading-session-card__status">
          {status}
        </span>
      </div>

      <div
        className="reading-session-card__progress"
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={safeProgress}
      >
        <span
          className="reading-session-card__progress-fill"
          style={{ "--session-progress": `${safeProgress}%` }}
        />
      </div>

      <div className="reading-session-card__stats">
        <div>
          <span>Duration</span>
          <strong>{duration}</strong>
        </div>
        <div>
          <span>Pages</span>
          <strong>{pages}</strong>
        </div>
        <div>
          <span>Progress</span>
          <strong>{safeProgress}%</strong>
        </div>
      </div>
    </article>
  );
}
