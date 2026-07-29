import { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BookCard from '../components/BookCard.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { books } from '../data/books.js';
import { WishlistContext } from '../context/WishlistContext.jsx';
import './Wishlist.css';

export default function Wishlist() {
  const { wishlist } = useContext(WishlistContext);
  const wishlistedBooks = books.filter((book) => wishlist.includes(book.id));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="wishlist-page">
      <div className="wishlist__inner">
        <div className="wishlist__header">
          <h2 className="wishlist__title">Your Wishlist</h2>
          <p className="wishlist__count">{wishlistedBooks.length} items</p>
        </div>

        {loading ? (
          <div className="catalog__grid">
            <SkeletonLoader variant="card" count={4} />
          </div>
        ) : wishlistedBooks.length === 0 ? (
          <div className="wishlist__empty">
            <p>Your wishlist is empty.</p>
            <Link to="/" className="wishlist__back-link">Return to Catalog</Link>
          </div>
        ) : (
          <div className="catalog__grid">
            {wishlistedBooks.map((book) => (
              <BookCard 
                key={book.id} 
                book={book} 
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
