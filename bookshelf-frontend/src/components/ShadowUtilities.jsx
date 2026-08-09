import React from "react";
import "./ShadowUtilities.css";

export default function ShadowUtilities({
  children,
  shadow = "md",
  rounded = "md",
  hover = false,
  className = ""
}) {
  return (
    <div
      className={[
        "shadow-utility",
        `shadow-utility--${shadow}`,
        `shadow-utility--rounded-${rounded}`,
        hover ? "shadow-utility--hover" : "",
        className
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
