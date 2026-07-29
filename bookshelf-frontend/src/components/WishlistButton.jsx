import "./WishlistButton.css";
import { useState } from "react";

export default function WishlistButton({ active=false, onToggle=()=>{} }) {
  const handleClick=()=>{
    onToggle(!active);
  };

  return (
    <button
      className={`wishlist-button ${active ? "wishlist-button--active" : ""}`}
      onClick={handleClick}
      aria-label="Toggle Wishlist"
      title={active ? "Remove from Wishlist" : "Add to Wishlist"}
    >
      <span className="wishlist-button__icon">
        {active ? "♥" : "♡"}
      </span>
      <span className="wishlist-button__text">
        {active ? "Wishlisted" : "Wishlist"}
      </span>
    </button>
  );
}
