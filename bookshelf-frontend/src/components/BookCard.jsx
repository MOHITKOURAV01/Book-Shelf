import { useContext } from 'react';
import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton.jsx';
import { CartContext } from '../context/CartContext.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';
import './BookCard.css';

/**
 * BookCard — displays a single book as a card.
 *
 * Props:
 *   book        {object}   required — the book data object
 *   onAddToCart {function} optional — override the default CartContext addToCart.
 *                          Useful for contexts where the book object returned by the
 *                          parent differs from what CartContext would receive
 *                          (e.g. RecentlyViewed). Falls back to CartContext.addToCart.
 */
export default function BookCard({ book, onAddToCart }) {
  const { addToCart } = useContext(CartContext);
  const { wishlist, toggleWishlist } = useContext(WishlistContext);

  // Allow callers to override the add-to-cart behaviour; default to global context.
  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(book);
    } else {
      addToCart(book);
    }
  };

  return (
    <article className="book-card">
      {/* Cover — clicking navigates to the detail page */}
      <Link to={`/book/${book.id}`} className="book-card__cover-link">
        <div className="book-card__cover" style={{ '--cover-color': book.cover }}>
          {book.coverImage && (
            <img
              src={book.coverImage}
              alt={book.title}
              loading="lazy"
              className="book-card__cover-image"
            />
          )}
          <span className="book-card__genre">{book.genre}</span>
          <span className="book-card__cover-title">{book.title}</span>
        </div>
      </Link>

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
          <WishlistButton
            active={wishlist?.includes(book.id)}
            onToggle={() => toggleWishlist(book.id)}
          />
        </div>
      </div>
    </article>
  );
}
