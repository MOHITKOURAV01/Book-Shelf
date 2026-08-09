import React from "react";
import "./NineGradientPresets.css";

export default function NineGradientPresets({
  children,
  preset = "blue-purple",
  direction = "135deg",
  animated = false,
  className = ""
}) {
  return (
    <div
      className={`nine-gradient-presets nine-gradient-presets--${preset} ${
        animated ? "nine-gradient-presets--animated" : ""
      } ${className}`}
      style={{ "--gradient-direction": direction }}
    >
      {children}
    </div>
  );
}
