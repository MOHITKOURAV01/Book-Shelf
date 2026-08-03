import { useState, useEffect } from 'react';
import BookCard from './BookCard';
import { books } from '../data/books';
import './RecentlyViewed.css';

/**
 * RecentlyViewed — shows a horizontal scroll strip of previously visited books.
 *
 * Reads an array of book IDs from localStorage ('recentlyViewed') and maps them
 * to book objects. The current book (if provided) is excluded from the list.
 *
 * Add-to-cart behaviour is handled by BookCard via CartContext — no prop needed.
 */
export default function RecentlyViewed({ currentBookId }) {
  const [recentBooks, setRecentBooks] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (!stored) return;

      let parsed = JSON.parse(stored);

      // Exclude the book currently being viewed
      if (currentBookId) {
        parsed = parsed.filter(id => String(id) !== String(currentBookId));
      }

      // Map IDs → book objects, dropping any stale/invalid IDs
      const mappedBooks = parsed
        .map(id => books.find(b => String(b.id) === String(id)))
        .filter(Boolean);

      setRecentBooks(mappedBooks);
    } catch (e) {
      console.error('Failed to parse recently viewed books:', e);
    }
  }, [currentBookId]);

  // Nothing to show — render nothing rather than an empty section
  if (recentBooks.length === 0) {
    return null;
  }

  return (
    <section className="recently-viewed">
      <div className="recently-viewed__inner">
        <h2 className="recently-viewed__title">Recently Viewed</h2>
        <div className="recently-viewed__scroll">
          {recentBooks.map(book => (
            <div key={book.id} className="recently-viewed__item">
              {/* BookCard uses CartContext internally — no onAddToCart prop needed */}
              <BookCard book={book} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
