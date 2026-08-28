import React from "react";
import "./BookProgressTimeline.css";

export default function BookProgressTimeline({
  steps = [],
  currentStep,
  title = "Reading progress",
  subtitle = "Track your journey through the book",
  variant = "blue",
  showPercentage = true,
  compact = false
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step, index) =>
      step.active ?? ((step.index ?? index) === currentStep)
    )
  );

  const completedCount = steps.filter(
    (step, index) => step.completed ?? index < activeIndex
  ).length;

  const percentage = steps.length
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  return (
    <section
      className={[
        "book-progress-timeline",
        `book-progress-timeline--${variant}`,
        compact && "book-progress-timeline--compact"
      ].filter(Boolean).join(" ")}
    >
      <div className="book-progress-timeline__header">
        <div>
          <p className="book-progress-timeline__eyebrow">Book journey</p>
          <h3 className="book-progress-timeline__title">{title}</h3>
          <p className="book-progress-timeline__subtitle">{subtitle}</p>
        </div>

        {showPercentage && (
          <div className="book-progress-timeline__percentage">
            <strong>{percentage}%</strong>
            <span>complete</span>
          </div>
        )}
      </div>

      <div className="book-progress-timeline__track" role="list" style={{ "--timeline-count": steps.length }}>
        {steps.map((step, index) => {
          const completed = step.completed ?? index < activeIndex;
          const active = step.active ?? index === activeIndex;

          return (
            <div
              className={[
                "book-progress-timeline__step",
                completed && "book-progress-timeline__step--completed",
                active && "book-progress-timeline__step--active"
              ].filter(Boolean).join(" ")}
              key={step.id ?? index}
              role="listitem"
            >
              {index > 0 && (
                <span
                  className={[
                    "book-progress-timeline__connector",
                    completed && "book-progress-timeline__connector--filled"
                  ].filter(Boolean).join(" ")}
                  aria-hidden="true"
                />
              )}

              <div className="book-progress-timeline__marker">
                {completed ? "✓" : step.icon ?? index + 1}
              </div>

              <div className="book-progress-timeline__content">
                <strong>{step.title ?? `Step ${index + 1}`}</strong>
                {step.description && <span>{step.description}</span>}
                {step.meta && <small>{step.meta}</small>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
