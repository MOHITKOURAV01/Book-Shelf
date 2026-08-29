import React from "react";
// The stylesheet is Bookstartent.css — this file and its CSS were renamed
// together and the import was not. Its own header comment still says
// "FavoriteCategories.css", and every rule in it is a .favorite-categories
// one, so this is the right file under the wrong name rather than a missing
// one. See #368.
import "./Bookstartent.css";

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