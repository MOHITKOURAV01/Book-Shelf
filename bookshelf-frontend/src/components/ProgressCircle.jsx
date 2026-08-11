import React from "react";
import "./ProgressCircle.css";

export default function ProgressCircle({
  value = 0,
  size = "md",
  stroke = 8,
  variant = "primary",
  showValue = true,
  label = "",
  className = ""
}) {
  const progress = Math.min(100, Math.max(0, Number(value) || 0));
  const sizes = { sm: 72, md: 110, lg: 160 };
  const dimension = sizes[size] || sizes.md;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`progress-circle progress-circle--${size} progress-circle--${variant} ${className}`}
      style={{ "--circle-size": `${dimension}px` }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={label || `${progress}% complete`}
    >
      <svg
        className="progress-circle__svg"
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
      >
        <circle
          className="progress-circle__track"
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="progress-circle__value"
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>

      <div className="progress-circle__content">
        {showValue && <strong>{progress}%</strong>}
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}
