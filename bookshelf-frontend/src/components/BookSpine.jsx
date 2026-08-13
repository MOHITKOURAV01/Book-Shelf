import React from "react";
import "./BookSpine.css";

export default function BookSpine({
  title = "Untitled Book",
  author = "",
  color = "blue",
  height = 220,
  width = 58,
  vertical = true,
  onClick,
  className = ""
}) {
  const style = {
    "--book-spine-height": `${height}px`,
    "--book-spine-width": `${width}px`
  };

  return (
    <button
      type="button"
      className={[
        "book-spine",
        `book-spine--${color}`,
        vertical ? "book-spine--vertical" : "book-spine--horizontal",
        onClick ? "book-spine--interactive" : "",
        className
      ].filter(Boolean).join(" ")}
      style={style}
      onClick={onClick}
      aria-label={`${title}${author ? ` by ${author}` : ""}`}
    >
      <span className="book-spine__top" aria-hidden="true" />
      <span className="book-spine__title">{title}</span>
      {author && <span className="book-spine__author">{author}</span>}
      <span className="book-spine__bottom" aria-hidden="true" />
    </button>
  );
}
