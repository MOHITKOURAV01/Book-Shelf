import React, { useMemo, useState } from "react";
import "./ReadingCalendar.css";

export default function ReadingCalendar({
  year: initialYear = new Date().getFullYear(),
  month: initialMonth = new Date().getMonth(),
  activity = {},
  variant = "green",
  showLegend = true,
  onDateClick,
  className = ""
}) {
  const [viewDate, setViewDate] = useState(
    new Date(initialYear, initialMonth, 1)
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const cells = useMemo(() => {
    const result = [];
    for (let i = 0; i < firstDay; i++) result.push({ empty: true, key: `empty-${i}` });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      result.push({ key: date, day, date, data: activity[date] ?? 0 });
    }
    return result;
  }, [activity, daysInMonth, firstDay, month, year]);

  const level = (value) => {
    const n = typeof value === "number"
      ? value
      : Number(value?.minutes ?? value?.pages ?? 0);
    if (n <= 0) return 0;
    if (n < 20) return 1;
    if (n < 40) return 2;
    if (n < 60) return 3;
    return 4;
  };

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long", year: "numeric"
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  return (
    <section className={`reading-calendar reading-calendar--${variant} ${className}`}>
      <header className="reading-calendar__header">
        <div>
          <h2 className="reading-calendar__title">Reading Calendar</h2>
          <p className="reading-calendar__month">{monthLabel}</p>
        </div>
        <div className="reading-calendar__controls">
          <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
          <button type="button" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
          <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} aria-label="Next month">›</button>
        </div>
      </header>

      <div className="reading-calendar__weekdays" aria-hidden="true">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <span key={d}>{d}</span>)}
      </div>

      <div className="reading-calendar__grid">
        {cells.map(cell => cell.empty ? (
          <span key={cell.key} className="reading-calendar__empty" />
        ) : (
          <button
            key={cell.key}
            type="button"
            className={`reading-calendar__day reading-calendar__day--level-${level(cell.data)} ${cell.date === todayKey ? "reading-calendar__day--today" : ""}`}
            onClick={() => onDateClick?.(cell.date, cell.data)}
            aria-label={`${cell.date} reading activity`}
          >
            {cell.day}
          </button>
        ))}
      </div>

      {showLegend && (
        <footer className="reading-calendar__legend">
          <span>Less</span>
          {[0,1,2,3,4].map(n => <i key={n} className={`reading-calendar__legend-cell reading-calendar__legend-cell--${n}`} />)}
          <span>More</span>
        </footer>
      )}
    </section>
  );
}
