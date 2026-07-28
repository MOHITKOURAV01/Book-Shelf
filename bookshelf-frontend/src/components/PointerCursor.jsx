import React, {
  useState,
  useRef,
  useCallback,
  forwardRef,
} from "react";
import "./PointerCursor.css";

const PointerCursor = forwardRef(
  (
    {
      as: Component = "div",

      children,

      className = "",

      disabled = false,

      loading = false,

      fullWidth = false,

      animated = true,

      ripple = true,

      cursor = "pointer",

      title = "",

      tabIndex = 0,

      style = {},

      onClick = () => {},

      onMouseEnter = () => {},

      onMouseLeave = () => {},

      onFocus = () => {},

      onBlur = () => {},

      onKeyDown = () => {},

      onDoubleClick = () => {},

      onContextMenu = () => {},

      ...props
    },
    ref
  ) => {
    const internalRef = useRef(null);

    const elementRef = ref || internalRef;

    const [hovered, setHovered] = useState(false);

    const [focused, setFocused] = useState(false);

    const [ripples, setRipples] = useState([]);

    const createRipple = useCallback(
      (event) => {
        if (!ripple || disabled) return;

        const rect =
          event.currentTarget.getBoundingClientRect();

        const size = Math.max(rect.width, rect.height);

        const x = event.clientX - rect.left - size / 2;

        const y = event.clientY - rect.top - size / 2;

        const newRipple = {
          id: Date.now(),
          x,
          y,
          size,
        };

        setRipples((prev) => [...prev, newRipple]);

        setTimeout(() => {
          setRipples((prev) =>
            prev.filter((r) => r.id !== newRipple.id)
          );
        }, 600);
      },
      [disabled, ripple]
    );

    const handleClick = useCallback(
      (event) => {
        if (disabled || loading) return;

        createRipple(event);

        onClick(event);
      },
      [disabled, loading, createRipple, onClick]
    );

    const handleMouseEnter = useCallback(
      (event) => {
        setHovered(true);
        onMouseEnter(event);
      },
      [onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (event) => {
        setHovered(false);
        onMouseLeave(event);
      },
      [onMouseLeave]
    );

    const handleFocus = useCallback(
      (event) => {
        setFocused(true);
        onFocus(event);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (event) => {
        setFocused(false);
        onBlur(event);
      },
      [onBlur]
    );

    const handleKeyDown = useCallback(
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          if (!disabled) {
            onClick(event);
          }
        }

        onKeyDown(event);
      },
      [disabled, onClick, onKeyDown]
    );

    const classes = [
      "pointer-element",

      animated && "pointer-element--animated",

      hovered && "pointer-element--hover",

      focused && "pointer-element--focus",

      disabled && "pointer-element--disabled",

      loading && "pointer-element--loading",

      fullWidth && "pointer-element--full",

      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Component
        ref={elementRef}
        title={title}
        tabIndex={disabled ? -1 : tabIndex}
        className={classes}
        style={{
          cursor: disabled
            ? "not-allowed"
            : cursor,
          ...style,
        }}
        aria-disabled={disabled}
        aria-busy={loading}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {loading ? (
          <span className="pointer-element__loading">
            Loading...
          </span>
        ) : (
          children
        )}

        {ripple &&
          ripples.map((item) => (
            <span
              key={item.id}
              className="pointer-element__ripple"
              style={{
                width: item.size,
                height: item.size,
                left: item.x,
                top: item.y,
              }}
            />
          ))}
      </Component>
    );
  }
);

PointerCursor.displayName = "PointerCursor";

export default PointerCursor;
