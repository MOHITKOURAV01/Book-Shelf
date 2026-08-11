import React from "react";
import "./StatusBadge.css";

export default function StatusBadge({
  status = "active",
  label,
  dot = true,
  size = "md",
  variant,
  className = ""
}) {
  const text = label || status.replace(/[-_]/g, " ");
  const selectedVariant = variant || status;

  return (
    <span
      className={[
        "status-badge",
        `status-badge--${selectedVariant}`,
        `status-badge--${size}`,
        className
      ].filter(Boolean).join(" ")}
      role="status"
      aria-label={`Status: ${text}`}
    >
      {dot && <span className="status-badge__dot" aria-hidden="true" />}
      <span className="status-badge__label">{text}</span>
    </span>
  );
}
