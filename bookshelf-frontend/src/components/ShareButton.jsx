import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from "react";

import "./ShareButton.css";

const ShareButton = forwardRef(
  (
    {
      url = window.location.href,
      title = document.title,
      text = "Check this out!",

      label = "Copy Link",
      copiedLabel = "Copied!",

      variant = "primary",
      size = "md",

      disabled = false,
      loading = false,

      fullWidth = false,
      rounded = false,
      iconOnly = false,

      tooltip = "",

      leftIcon = "🔗",
      rightIcon = null,

      useNativeShare = false,

      className = "",

      onCopy,
      onSuccess,
      onError,
      beforeCopy,
      afterCopy,

      ...props
    },
    ref
  ) => {
    const [copied, setCopied] = useState(false);
    const [status, setStatus] = useState("idle");
    const [ripples, setRipples] = useState([]);

    const timerRef = useRef(null);

    useEffect(() => {
      return () => clearTimeout(timerRef.current);
    }, []);

    const resetStatus = () => {
      clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setCopied(false);
        setStatus("idle");
      }, 2000);
    };

    const createRipple = useCallback((event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);

      const ripple = {
        id: Date.now(),
        x: event.clientX - rect.left - size / 2,
        y: event.clientY - rect.top - size / 2,
        size,
      };

      setRipples((prev) => [...prev, ripple]);

      setTimeout(() => {
        setRipples((prev) =>
          prev.filter((item) => item.id !== ripple.id)
        );
      }, 600);
    }, []);

    const handleCopy = async (event) => {
      if (disabled || loading) return;

      createRipple(event);

      beforeCopy?.();

      setStatus("loading");

      try {
        if (useNativeShare && navigator.share) {
          await navigator.share({
            title,
            text,
            url,
          });
        } else {
          await navigator.clipboard.writeText(url);
        }

        setCopied(true);
        setStatus("success");

        onCopy?.(url);
        onSuccess?.(url);

        resetStatus();
      } catch (error) {
        console.error(error);

        setStatus("error");

        onError?.(error);
      } finally {
        afterCopy?.();
      }
    };

    const handleKeyDown = (event) => {
      if (disabled) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCopy(event);
      }
    };

    const classes = [
      "share-btn",
      `share-btn--${variant}`,
      `share-btn--${size}`,
      fullWidth && "share-btn--full",
      rounded && "share-btn--rounded",
      loading && "share-btn--loading",
      copied && "share-btn--copied",
      status === "error" && "share-btn--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={classes}
        title={tooltip}
        aria-label="Copy Link"
        aria-live="polite"
        aria-busy={loading}
        onClick={handleCopy}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {loading ? (
          <span className="share-btn__spinner" />
        ) : (
          <>
            <span className="share-btn__icon">
              {leftIcon}
            </span>

            {!iconOnly && (
              <span className="share-btn__text">
                {status === "error"
                  ? "Failed"
                  : copied
                  ? copiedLabel
                  : label}
              </span>
            )}

            {rightIcon && (
              <span className="share-btn__icon">
                {rightIcon}
              </span>
            )}
          </>
        )}

        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="share-btn__ripple"
            style={{
              width: ripple.size,
              height: ripple.size,
              left: ripple.x,
              top: ripple.y,
            }}
          />
        ))}
      </button>
    );
  }
);

ShareButton.displayName = "ShareButton";

export default ShareButton;