import React from "react";
import "./PulseAnimation.css";

export default function PulseAnimation({
  children = "Pulse",
  duration = 2,
  scale = 1.04,
  color = "primary",
  paused = false,
  className = ""
}) {
  return (
    <div
      className={`pulse-animation pulse-animation--${color} ${paused ? "pulse-animation--paused" : ""} ${className}`}
      style={{ "--pulse-duration": `${duration}s`, "--pulse-scale": scale }}
    >
      {children}
    </div>
  );
}
