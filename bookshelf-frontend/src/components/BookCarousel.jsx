import './BookCarousel.css';
import { useRef } from 'react';
import BookCard from '../BookCard/BookCard';

export default function BookCarousel({
  books = [],
  onAddToCart = () => {},
  title = 'Featured Books',
}) {
  const trackRef = useRef(null);

  const scroll = (direction) => {
    if (!trackRef.current) return;
    const amount = 320;
    trackRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="book-carousel">
      <div className="book-carousel__header">
        <h2 className="book-carousel__title">{title}</h2>

        <div className="book-carousel__controls">
          <button
            className="book-carousel__button"
            onClick={() => scroll('left')}
            aria-label="Previous"
          >
            ←
          </button>

          <button
            className="book-carousel__button"
            onClick={() => scroll('right')}
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      <div className="book-carousel__track" ref={trackRef}>
        {books.map((book) => (
          <div className="book-carousel__item" key={book.id}>
            <BookCard book={book} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>
    </section>
  );
}
