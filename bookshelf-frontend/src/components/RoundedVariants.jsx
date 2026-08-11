import React from "react";
import "./RoundedVariants.css";

export default function RoundedVariants({
  children = "Rounded Component",
  variant = "md",
  className = ""
}) {
  return (
    <div className={`rounded-variant rounded-variant--${variant} ${className}`}>
      {children}
    </div>
  );
}
