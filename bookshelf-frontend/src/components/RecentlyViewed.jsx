import { useState, useEffect } from 'react';
import BookCard from './BookCard';
import { books } from '../data/books';
import './RecentlyViewed.css';

export default function RecentlyViewed({ currentBookId }) {
  const [recentBooks, setRecentBooks] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      if (stored) {
        let parsed = JSON.parse(stored);
        
        // Filter out current book if provided
        if (currentBookId) {
          parsed = parsed.filter(id => String(id) !== String(currentBookId));
        }

        // Map IDs to actual book objects
        const mappedBooks = parsed
          .map(id => books.find(b => String(b.id) === String(id)))
          .filter(Boolean); // Remove undefined/null if any ID is invalid
          
        setRecentBooks(mappedBooks);
      }
    } catch (e) {
      console.error('Failed to parse recently viewed books:', e);
    }
  }, [currentBookId]);

  if (recentBooks.length === 0) {
    return null;
  }

  // Handle Add to cart for recently viewed (placeholder if needed, but BookCard expects it)
  const handleAddToCart = (book) => {
    // Ideally this would use a global cart context or dispatch
    console.log('Added to cart from recently viewed:', book.title);
  };

  return (
    <section className="recently-viewed">
      <div className="recently-viewed__inner">
        <h2 className="recently-viewed__title">Recently Viewed</h2>
        <div className="recently-viewed__scroll">
          {recentBooks.map(book => (
            <div key={book.id} className="recently-viewed__item">
              <BookCard book={book} onAddToCart={handleAddToCart} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
