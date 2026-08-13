import React from "react";
import "./ReadingGoalRing.css";

export default function ReadingGoalRing({
  value = 0,
  goal = 100,
  label = "Reading Goal",
  unit = "pages",
  size = "md",
  stroke = 10,
  variant = "blue",
  showPercentage = true,
  className = ""
}) {
  const safeGoal = Math.max(Number(goal) || 0, 1);
  const current = Math.max(Number(value) || 0, 0);
  const percentage = Math.min((current / safeGoal) * 100, 100);

  const sizes = {
    sm: 110,
    md: 160,
    lg: 210
  };

  const dimension = sizes[size] || sizes.md;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={`reading-goal-ring reading-goal-ring--${variant} reading-goal-ring--${size} ${className}`}
      role="group"
      aria-label={`${label}: ${current} of ${safeGoal} ${unit}`}
      style={{
        "--ring-size": `${dimension}px`,
        "--ring-stroke": stroke,
        "--ring-circumference": circumference
      }}
    >
      <div className="reading-goal-ring__visual">
        <svg
          className="reading-goal-ring__svg"
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          aria-hidden="true"
        >
          <circle
            className="reading-goal-ring__track"
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
          />
          <circle
            className="reading-goal-ring__progress"
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="reading-goal-ring__content">
          {showPercentage && (
            <strong>{Math.round(percentage)}%</strong>
          )}
          <span>{label}</span>
        </div>
      </div>

      <div className="reading-goal-ring__details">
        <strong>{current}</strong>
        <span>/ {safeGoal} {unit}</span>
      </div>

      <div className="reading-goal-ring__message">
        {percentage >= 100
          ? "Goal completed! 🎉"
          : `${Math.max(safeGoal - current, 0)} ${unit} remaining`}
      </div>
    </div>
  );
}
