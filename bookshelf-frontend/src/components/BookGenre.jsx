import React from "react";
import "./BookGenre.css";

export default function BookGenre({
  genre = "Fiction",
  icon = "📚",
  variant = "primary",
  size = "md",
  clickable = false,
  onClick = () => {},
  className = "",
}) {
  const handleClick = () => {
    if (clickable) {
      onClick(genre);
    }
  };

  return (
    <span
      className={`book-genre book-genre--${variant} book-genre--${size} ${clickable ? "book-genre--clickable" : ""} ${className}`}
      onClick={handleClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <span className="book-genre__icon">
        {icon}
      </span>

      <span className="book-genre__text">
        {genre}
      </span>
    </span>
  );
}