import React from "react";
import "./ReadingHeatmap.css";

export default function ReadingHeatmap({
  data = [],
  weeks = 12,
  title = "Reading Activity",
  subtitle = "Pages read each day",
  variant = "green",
  showLegend = true,
  className = ""
}) {
  const levels = Array.from({ length: weeks * 7 }, (_, index) => {
    const item = data[index];
    return {
      value: typeof item === "number" ? item : item?.value || 0,
      date: item?.date || "",
      label: item?.label || ""
    };
  });

  const max = Math.max(...levels.map((item) => item.value), 1);

  const getLevel = (value) => {
    if (!value) return 0;
    const ratio = value / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  return (
    <section className={`reading-heatmap reading-heatmap--${variant} ${className}`}>
      <div className="reading-heatmap__header">
        <div>
          <h3 className="reading-heatmap__title">{title}</h3>
          <p className="reading-heatmap__subtitle">{subtitle}</p>
        </div>
        <strong className="reading-heatmap__total">
          {levels.reduce((sum, item) => sum + item.value, 0)}
        </strong>
      </div>

      <div
        className="reading-heatmap__grid"
        style={{ "--heatmap-weeks": weeks }}
        role="img"
        aria-label={`${title} heatmap`}
      >
        {levels.map((item, index) => (
          <span
            key={index}
            className={`reading-heatmap__cell reading-heatmap__cell--${getLevel(item.value)}`}
            title={
              item.date
                ? `${item.date}: ${item.value}`
                : `${item.value} ${subtitle.toLowerCase()}`
            }
            aria-label={`${item.date || `Day ${index + 1}`}: ${item.value}`}
          />
        ))}
      </div>

      {showLegend && (
        <div className="reading-heatmap__legend">
          <span>Less</span>
          <i className="reading-heatmap__legend-cell reading-heatmap__legend-cell--0" />
          <i className="reading-heatmap__legend-cell reading-heatmap__legend-cell--1" />
          <i className="reading-heatmap__legend-cell reading-heatmap__legend-cell--2" />
          <i className="reading-heatmap__legend-cell reading-heatmap__legend-cell--3" />
          <i className="reading-heatmap__legend-cell reading-heatmap__legend-cell--4" />
          <span>More</span>
        </div>
      )}
    </section>
  );
}
