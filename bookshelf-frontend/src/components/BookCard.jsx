import { useContext } from 'react';
import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';
import { useCart } from '../hooks/useCart.js';
import './BookCard.css';

/**
 * BookCard — displays a single book as a card.
 *
 * Props:
 *   book        {object}   required — the book data object
 *   onAddToCart {function} optional — override the default cart addToCart.
 *                          Useful where the book object the parent holds
 *                          differs from what the cart expects
 *                          (e.g. RecentlyViewed). Falls back to addToCart.
 */
export default function BookCard({ book, onAddToCart }) {
  const { wishlist, toggleWishlist } = useContext(WishlistContext);
  const { addToCart } = useCart();
  const isWishlisted = wishlist?.includes(book.id);

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(book);
      return;
    }
    addToCart(book);
  };

  return (
    <article className="book-card">
      <div className="book-card__cover" style={{ '--cover-color': book.cover }}>
        <span className="book-card__genre">{book.genre}</span>
        <span className="book-card__cover-title">{book.title}</span>
        <div className="book-card__wishlist-overlay">
          <WishlistButton
            active={isWishlisted}
            onToggle={() => toggleWishlist(book.id)}
          />
        </div>
      </div>

      {/* Body — title, author, rating/price, actions */}
      <div className="book-card__body">
        <Link to={`/book/${book.id}`} className="book-card__link">
          <h3 className="book-card__title">{book.title}</h3>
        </Link>
        <p className="book-card__author">{book.author}</p>

        <div className="book-card__meta">
          <span className="book-card__rating">★ {book.rating.toFixed(1)}</span>
          <span className="book-card__price">₹{book.price}</span>
        </div>

        <div className="book-card__actions">
          <button className="book-card__add" onClick={handleAddToCart}>
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}
