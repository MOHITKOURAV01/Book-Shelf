import './WishlistButton.css';
import { useState } from 'react';

export default function WishlistButton({
  active = false,
  onToggle = () => {},
}) {
  const [isActive, setIsActive] = useState(active);

  const handleClick = () => {
    const next = !isActive;
    setIsActive(next);
    onToggle(next);
  };

  return (
    <button
      className={`wishlist-button ${isActive ? 'wishlist-button--active' : ''}`}
      onClick={handleClick}
      aria-label="Toggle Wishlist"
      title={isActive ? 'Remove from Wishlist' : 'Add to Wishlist'}
    >
      <span className="wishlist-button__icon">{isActive ? '♥' : '♡'}</span>
      <span className="wishlist-button__text">
        {isActive ? 'Wishlisted' : 'Wishlist'}
      </span>
    </button>
  );
}
