import React, { useCallback } from "react";
import "./DisabledStateSupport.css";

export default function DisabledStateSupport({
  children = "Action",
  disabled = false,
  loading = false,

  variant = "primary",
  size = "md",

  fullWidth = false,

  leftIcon = null,
  rightIcon = null,

  type = "button",

  title = "",

  className = "",

  onClick = () => {},

  ...props
}) {

  const handleClick = useCallback(
    (event) => {
      if (disabled || loading) {
        event.preventDefault();
        return;
      }

      onClick(event);
    },
    [disabled, loading, onClick]
  );

  const buttonClasses = [
    "disabled-btn",
    `disabled-btn--${variant}`,
    `disabled-btn--${size}`,
    fullWidth && "disabled-btn--full",
    disabled && "disabled-btn--disabled",
    loading && "disabled-btn--loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      title={title}
      disabled={disabled || loading}
      className={buttonClasses}
      onClick={handleClick}
      aria-disabled={disabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="disabled-btn__spinner"></span>
          <span className="disabled-btn__text">
            Loading...
          </span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="disabled-btn__icon">
              {leftIcon}
            </span>
          )}

          <span className="disabled-btn__text">
            {children}
          </span>

          {rightIcon && (
            <span className="disabled-btn__icon">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
}