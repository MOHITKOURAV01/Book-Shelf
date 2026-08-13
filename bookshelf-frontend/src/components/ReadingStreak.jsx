import React from "react";
import "./ReadingStreak.css";

export default function ReadingStreak({
  currentStreak = 0,
  longestStreak = 0,
  days = [],
  label = "Reading Streak",
  unit = "days",
  variant = "orange",
  showWeek = true,
  className = ""
}) {
  const names = ["M", "T", "W", "T", "F", "S", "S"];
  const week = days.slice(0, 7);

  return (
    <section
      className={`reading-streak reading-streak--${variant} ${className}`}
      aria-label={`${label}: ${currentStreak} ${unit}`}
    >
      <div className="reading-streak__header">
        <div className="reading-streak__icon" aria-hidden="true">🔥</div>
        <div className="reading-streak__heading">
          <p className="reading-streak__label">{label}</p>
          <div className="reading-streak__current">
            <strong>{currentStreak}</strong>
            <span>{unit}</span>
          </div>
        </div>
      </div>

      <div className="reading-streak__stats">
        <div><span>Current</span><strong>{currentStreak}</strong></div>
        <div><span>Longest</span><strong>{longestStreak}</strong></div>
      </div>

      {showWeek && (
        <div className="reading-streak__week" aria-label="Weekly reading activity">
          {Array.from({ length: 7 }, (_, index) => {
            const day = week[index];
            const active = typeof day === "object" ? !!day?.active : Boolean(day);
            const name = typeof day === "object" ? day?.label : null;

            return (
              <div
                className={`reading-streak__day ${active ? "reading-streak__day--active" : ""}`}
                key={index}
                title={name || `Day ${index + 1}`}
              >
                <span>{name || names[index]}</span>
                <i aria-hidden="true" />
              </div>
            );
          })}
        </div>
      )}

      <p className="reading-streak__message">
        {currentStreak > 0
          ? `Keep going! ${currentStreak} ${unit} in a row.`
          : "Start reading today to build your streak."}
      </p>
    </section>
  );
}
