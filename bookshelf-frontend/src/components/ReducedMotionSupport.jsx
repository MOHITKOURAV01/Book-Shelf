import React from "react";
import "./ReducedMotionSupport.css";

export default function ReducedMotionSupport({
  children,
  className = "",
  disableMotion = false
}) {
  return (
    <div
      className={`reduced-motion-support ${
        disableMotion ? "reduced-motion-support--disabled" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
