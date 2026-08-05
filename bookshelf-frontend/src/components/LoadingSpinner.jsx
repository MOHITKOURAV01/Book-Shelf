import React from "react";
import "./LoadingSpinner.css";

export default function LoadingSpinner({
  size="md",
  color="primary",
  label="Loading...",
  fullscreen=false,
  showLabel=true,
  className=""
}){
  return (
    <div className={`loading-spinner ${fullscreen?"loading-spinner--fullscreen":""} ${className}`}>
      <div className={`loading-spinner__circle loading-spinner__circle--${size} loading-spinner__circle--${color}`}></div>
      {showLabel && <span className="loading-spinner__label">{label}</span>}
    </div>
  );
}
