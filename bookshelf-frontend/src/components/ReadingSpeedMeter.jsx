import React from "react";
import "./ReadingSpeedMeter.css";

export default function ReadingSpeedMeter({
  wpm = 320,
  label = "Reading speed",
  target = 300,
  unit = "WPM",
  variant = "blue",
  showTarget = true,
  className = ""
}) {
  const safeWpm = Math.max(0, Number(wpm) || 0);
  const safeTarget = Math.max(1, Number(target) || 1);
  const percentage = Math.min(100, Math.round((safeWpm / safeTarget) * 100));

  let level = "slow";
  if (safeWpm >= safeTarget) level = "excellent";
  else if (safeWpm >= safeTarget * 0.75) level = "good";
  else if (safeWpm >= safeTarget * 0.5) level = "average";

  return (
    <section
      className={`reading-speed-meter reading-speed-meter--${variant} ${className}`}
      aria-label={`${label}: ${safeWpm} ${unit}`}
    >
      <div className="reading-speed-meter__header">
        <div>
          <p className="reading-speed-meter__label">{label}</p>
          <div className="reading-speed-meter__value">
            <strong>{safeWpm}</strong>
            <span>{unit}</span>
          </div>
        </div>

        <span className={`reading-speed-meter__level reading-speed-meter__level--${level}`}>
          {level}
        </span>
      </div>

      <div
        className="reading-speed-meter__track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={safeTarget}
        aria-valuenow={Math.min(safeWpm, safeTarget)}
        aria-label={`${percentage}% of reading speed target`}
      >
        <div
          className="reading-speed-meter__fill"
          style={{ "--reading-speed-progress": `${percentage}%` }}
        />
        <span className="reading-speed-meter__marker" aria-hidden="true" />
      </div>

      <div className="reading-speed-meter__footer">
        <span>
          {showTarget ? `Target: ${safeTarget} ${unit}` : `${percentage}% of target`}
        </span>
        <strong>{percentage}%</strong>
      </div>
    </section>
  );
}
