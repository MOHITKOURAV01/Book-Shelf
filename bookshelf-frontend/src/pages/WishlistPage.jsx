import { useNavigate } from 'react-router-dom';

import { useWishlist } from '../hooks/useWishlist.js';
import { useWishlistBooks } from '../hooks/useWishlistBooks.js';
import BookCard from '../components/BookCard.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import './WishlistPage.css';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

/*
 * The wishlist, resolved against the catalogue the rest of the app reads.
 *
 * This page used to filter `src/data/books.js` — the hardcoded local copy
 * that says in its own header it is a frontend-only draft, and which has
 * drifted from the API: 16 books there (`s1`–`s8`, `b1`–`b8`) against 8 the
 * API serves (`b1`–`b8`). The book detail page was moved onto the API in
 * #317 and the catalogue in #319; this was the last page still reading the
 * stale file. See #328.
 *
 * The navbar, footer and page wrapper come from the App layout, so this
 * renders only its own content.
 */
export default function WishlistPage() {
  usePageMetadata({
    title: 'Your wishlist',
    description:
      'The books you have saved to read or buy later, from the BookShelf catalogue.',
  });

  const { toggleWishlist } = useWishlist();
  const { books, missingIds, failedIds, loading, error } = useWishlistBooks();
  const navigate = useNavigate();

  const count = books.length;

  const removeMissing = () => {
    // toggleWishlist on an id that is in the list removes it.
    missingIds.forEach((id) => toggleWishlist(id));
  };

  return (
    <main className="wishlist-page">
      <div className="wishlist-page__inner">
        <header className="wishlist-page__header">
          <h1 className="wishlist-page__title">Your Wishlist</h1>
          <p className="wishlist-page__subtitle">
            {loading ? 'Loading…' : `${count} ${count === 1 ? 'item' : 'items'}`}
          </p>
        </header>

        {loading && (
          <div className="catalog__grid" aria-busy="true">
            <SkeletonLoader variant="card" count={4} />
          </div>
        )}

        {/*
          An error is not an empty wishlist. "Your wishlist is currently
          empty" when the request failed tells a customer the list they
          curated has been lost.
        */}
        {!loading && error && (
          <div className="wishlist-page__error" role="alert">
            <h2>We could not load your wishlist</h2>
            <p>{error.message || 'Something went wrong. Please try again.'}</p>
          </div>
        )}

        {/*
          Ids the catalogue answered 404 for. Silently dropping them is what
          the old page did, and it is why a book could disappear from a
          wishlist with nothing on screen to explain it.
        */}
        {!loading && !error && missingIds.length > 0 && (
          <div className="wishlist-page__notice" role="status">
            <p>
              {missingIds.length === 1
                ? '1 saved book is no longer in the catalogue.'
                : `${missingIds.length} saved books are no longer in the catalogue.`}
            </p>
            <button
              type="button"
              className="wishlist-page__notice-btn"
              onClick={removeMissing}
            >
              Remove {missingIds.length === 1 ? 'it' : 'them'} from my wishlist
            </button>
          </div>
        )}

        {/*
          A book that could not be fetched is a different case: it may well
          still exist, so it must not be offered for removal.
        */}
        {!loading && !error && failedIds.length > 0 && (
          <div className="wishlist-page__notice wishlist-page__notice--warning" role="status">
            <p>
              {failedIds.length === 1
                ? '1 saved book could not be loaded just now. It has not been removed.'
                : `${failedIds.length} saved books could not be loaded just now. They have not been removed.`}
            </p>
          </div>
        )}

        {!loading && !error && count === 0 && missingIds.length === 0 && (
          <div className="wishlist-page__empty">
            <p>Your wishlist is currently empty.</p>
            <button
              type="button"
              className="wishlist-page__browse-btn"
              onClick={() => navigate('/#catalog')}
            >
              Browse Books
            </button>
          </div>
        )}

        {!loading && !error && count > 0 && (
          <div className="catalog__grid">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
