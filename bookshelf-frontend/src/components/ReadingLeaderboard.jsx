import React from "react";
import "./ReadingLeaderboard.css";

export default function ReadingLeaderboard({
  title = "Reading Leaderboard",
  subtitle = "This month's top readers",
  entries = [
    { name: "Alex Morgan", books: 18, pages: 5420, avatar: "AM", currentUser: false },
    { name: "Jordan Lee", books: 15, pages: 4610, avatar: "JL", currentUser: true },
    { name: "Taylor Smith", books: 13, pages: 3980, avatar: "TS", currentUser: false },
    { name: "Sam Wilson", books: 11, pages: 3210, avatar: "SW", currentUser: false }
  ],
  variant = "blue",
  metric = "books",
  className = ""
}) {
  const sorted = [...entries].sort((a, b) => {
    const aValue = Number(a[metric]) || 0;
    const bValue = Number(b[metric]) || 0;
    return bValue - aValue;
  });

  const formatMetric = (entry) => {
    const value = Number(entry[metric]) || 0;
    return metric === "pages" ? `${value.toLocaleString()} pages` : `${value} books`;
  };

  return (
    <section
      className={`reading-leaderboard reading-leaderboard--${variant} ${className}`}
      aria-label={title}
    >
      <header className="reading-leaderboard__header">
        <div>
          <h2 className="reading-leaderboard__title">{title}</h2>
          <p className="reading-leaderboard__subtitle">{subtitle}</p>
        </div>
        <span className="reading-leaderboard__trophy" aria-hidden="true">🏆</span>
      </header>

      <div className="reading-leaderboard__list">
        {sorted.map((entry, index) => (
          <div
            className={`reading-leaderboard__row ${
              entry.currentUser ? "reading-leaderboard__row--current" : ""
            }`}
            key={`${entry.name}-${index}`}
          >
            <div className={`reading-leaderboard__rank reading-leaderboard__rank--${index + 1}`}>
              {index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}
            </div>

            <div className="reading-leaderboard__avatar" aria-hidden="true">
              {entry.avatar || entry.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="reading-leaderboard__person">
              <strong>{entry.name}</strong>
              {entry.currentUser && <span className="reading-leaderboard__you">You</span>}
            </div>

            <div className="reading-leaderboard__metric">
              <strong>{formatMetric(entry)}</strong>
              {metric === "books" && entry.pages != null && (
                <span>{Number(entry.pages).toLocaleString()} pages</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="reading-leaderboard__empty">
          No reading activity yet.
        </div>
      )}
    </section>
  );
}
