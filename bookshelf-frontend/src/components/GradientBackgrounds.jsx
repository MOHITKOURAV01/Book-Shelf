import React from "react";
import "./GradientBackgrounds.css";

export default function GradientBackgrounds({
  children,
  variant = "blue-purple",
  direction = "135deg",
  animated = false,
  className = ""
}) {
  return (
    <div
      className={`gradient-background gradient-background--${variant} ${
        animated ? "gradient-background--animated" : ""
      } ${className}`}
      style={{ "--gradient-direction": direction }}
    >
      {children}
    </div>
  );
}
