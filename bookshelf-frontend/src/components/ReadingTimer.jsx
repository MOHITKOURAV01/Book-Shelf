import React, { useEffect, useState } from "react";
import "./ReadingTimer.css";

export default function ReadingTimer({
  initialSeconds = 0,
  targetMinutes = 30,
  variant = "blue",
  title = "Reading Session",
  autoStart = false,
  className = ""
}) {
  const [seconds, setSeconds] = useState(Math.max(0, Number(initialSeconds) || 0));
  const [running, setRunning] = useState(Boolean(autoStart));

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(v => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const target = Math.max(1, (Number(targetMinutes) || 30) * 60);
  const progress = Math.min(100, (seconds / target) * 100);

  const formatTime = value => {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    return h
      ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
      : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  return (
    <section className={`reading-timer reading-timer--${variant} ${className}`.trim()}>
      <div className="reading-timer__header">
        <div>
          <p className="reading-timer__eyebrow">Reading time</p>
          <h3 className="reading-timer__title">{title}</h3>
        </div>
        <span className={`reading-timer__status reading-timer__status--${running ? "active" : "paused"}`}>
          <i aria-hidden="true" />{running ? "Reading" : "Paused"}
        </span>
      </div>

      <div className="reading-timer__display" aria-live="polite">
        <strong>{formatTime(seconds)}</strong>
        <span>minutes read</span>
      </div>

      <div className="reading-timer__track" role="progressbar"
        aria-label="Reading goal progress" aria-valuemin="0"
        aria-valuemax="100" aria-valuenow={Math.round(progress)}>
        <span className="reading-timer__fill"
          style={{ "--reading-timer-progress": `${progress}%` }} />
      </div>

      <div className="reading-timer__goal">
        <span>Goal: {targetMinutes} min</span>
        <strong>{Math.round(progress)}%</strong>
      </div>

      <div className="reading-timer__controls">
        <button type="button" className="reading-timer__button reading-timer__button--primary"
          onClick={() => setRunning(v => !v)}>
          {running ? "Pause" : "Start"}
        </button>
        <button type="button" className="reading-timer__button reading-timer__button--secondary"
          onClick={() => { setRunning(false); setSeconds(0); }}>
          Reset
        </button>
      </div>
    </section>
  );
}
