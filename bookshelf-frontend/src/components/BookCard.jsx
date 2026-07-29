import { Link } from 'react-router-dom';
import './BookCard.css';

export default function BookCard({ book, onAddToCart }) {
  return (
    <article className="book-card">
      <Link to={`/books/${book.id}`} className="book-card__cover-link" style={{textDecoration: 'none', color: 'inherit'}}>
        <div className="book-card__cover" style={{ '--cover-color': book.cover }}>
          <span className="book-card__genre">{book.genre}</span>
          <span className="book-card__cover-title">{book.title}</span>
        </div>
      </Link>

      <div className="book-card__body">
        <Link to={`/books/${book.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
          <h3 className="book-card__title">{book.title}</h3>
        </Link>
        <p className="book-card__author">{book.author}</p>

        <div className="book-card__meta">
          <span className="book-card__rating">★ {book.rating.toFixed(1)}</span>
          <span className="book-card__price">₹{book.price}</span>
        </div>

        <button className="book-card__add" onClick={() => onAddToCart(book)}>
          Add to cart
        </button>
      </div>
    </article>
  );
}
