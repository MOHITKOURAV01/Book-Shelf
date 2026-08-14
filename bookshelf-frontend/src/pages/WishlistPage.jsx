import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist.js';
import { books } from '../data/books.js';
import BookCard from '../components/BookCard.jsx';
import './WishlistPage.css';

/*
 * The navbar, footer and page wrapper used to be rendered here as well as by
 * App. Now that there is a single layout route they come from App, so this
 * page renders only its own content — otherwise the wishlist page would show
 * two navbars once the routes actually resolve.
 */
export default function WishlistPage() {
  const { wishlist, loading } = useWishlist();
  const navigate = useNavigate();

  // Find books that are in the wishlist
  const wishlistedBooks = books.filter((book) => wishlist.includes(book.id));

  return (
    <main className="wishlist-page">
      <div className="wishlist-page__inner">
        <header className="wishlist-page__header">
          <h1 className="wishlist-page__title">Your Wishlist</h1>
          <p className="wishlist-page__subtitle">
            {loading
              ? 'Loading...'
              : `${wishlistedBooks.length} ${wishlistedBooks.length === 1 ? 'item' : 'items'}`}
          </p>
        </header>

        {!loading && wishlistedBooks.length === 0 && (
          <div className="wishlist-page__empty">
            <p>Your wishlist is currently empty.</p>
            <button
              className="wishlist-page__browse-btn"
              onClick={() => navigate('/#catalog')}
            >
              Browse Books
            </button>
          </div>
        )}

        {!loading && wishlistedBooks.length > 0 && (
          <div className="catalog__grid">
            {wishlistedBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
