import { useContext } from 'react';
import { Link } from 'react-router-dom';
import WishlistButton from './WishlistButton.jsx';
import { CartContext } from '../context/CartContext.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';
import './BookCard.css';

export default function BookCard({ book }) {
  const { addToCart } = useContext(CartContext);
  const { wishlist, toggleWishlist } = useContext(WishlistContext);

  return (
    <article className="book-card">
      <Link to={`/book/${book.id}`} className="book-card__link">
        <div className="book-card__cover" style={{ '--cover-color': book.cover }}>
          <span className="book-card__genre">{book.genre}</span>
          <span className="book-card__cover-title">{book.title}</span>
        </div>
      </Link>

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
          <button className="book-card__add" onClick={() => addToCart(book)}>
            Add to cart
          </button>
          <WishlistButton active={wishlist?.includes(book.id)} onToggle={() => toggleWishlist(book.id)} />
        </div>
      </div>
    </article>
  );
}
