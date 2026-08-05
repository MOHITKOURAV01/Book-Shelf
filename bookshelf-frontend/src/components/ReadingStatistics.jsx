import React from "react";
import "./ReadingStatistics.css";

export default function ReadingStatistics({
  booksRead = 24,
  pagesRead = 8450,
  readingHours = 126,
  currentStreak = 18,
  longestStreak = 42,
  averageRating = 4.6
}) {
  const stats = [
    {
      label: "Books Read",
      value: booksRead,
      icon: "📚"
    },
    {
      label: "Pages Read",
      value: pagesRead,
      icon: "📄"
    },
    {
      label: "Reading Hours",
      value: readingHours,
      icon: "⏰"
    },
    {
      label: "Current Streak",
      value: `${currentStreak} Days`,
      icon: "🔥"
    },
    {
      label: "Longest Streak",
      value: `${longestStreak} Days`,
      icon: "🏆"
    },
    {
      label: "Average Rating",
      value: averageRating,
      icon: "⭐"
    }
  ];

  return (
    <section className="reading-statistics">
      <h2 className="reading-statistics__title">
        Reading Statistics
      </h2>

      <div className="reading-statistics__grid">
        {stats.map((item) => (
          <div
            className="reading-statistics__card"
            key={item.label}
          >
            <div className="reading-statistics__icon">
              {item.icon}
            </div>

            <h3>{item.value}</h3>

            <p>{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}