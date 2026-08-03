import React from "react";
import "./FavoriteCategories.css";

export default function FavoriteCategories({
  categories = [],
  selected = "",
  onSelect = () => {},
}) {
  if (!categories.length) {
    return (
      <div className="favorite-categories__empty">
        No favorite categories available.
      </div>
    );
  }

  return (
    <div className="favorite-categories">
      {categories.map((category) => (
        <button
          key={category}
          className={`favorite-category ${
            selected === category
              ? "favorite-category--active"
              : ""
          }`}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}