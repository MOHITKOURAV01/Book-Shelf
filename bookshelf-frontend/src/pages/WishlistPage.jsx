import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useWishlist } from '../hooks/useWishlist.js';
import { useWishlistBooks } from '../hooks/useWishlistBooks.js';
import BookCard from '../components/BookCard.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import './WishlistPage.css';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

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
    missingIds.forEach((id) => toggleWishlist(id));
  };

  return (
    <main className="wishlist-page">
      <div className="wishlist-page__inner">
        <header className="wishlist-page__header">
          <h1 className="wishlist-page__title">{t('wishlist.title', 'Your Wishlist')}</h1>
          <p className="wishlist-page__subtitle">
            {loading ? t('common.loading', 'Loading…') : `${count} ${count === 1 ? 'item' : 'items'}`}
          </p>
        </header>

        {loading && (
          <div className="catalog__grid" aria-busy="true">
            <SkeletonLoader variant="card" count={4} />
          </div>
        )}

        {!loading && error && (
          <div className="wishlist-page__error" role="alert">
            <h2>We could not load your wishlist</h2>
            <p>{error.message || 'Something went wrong. Please try again.'}</p>
          </div>
        )}

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
            <p>{t('wishlist.emptyTitle', 'Your wishlist is currently empty.')}</p>
            <button
              type="button"
              className="wishlist-page__browse-btn"
              onClick={() => navigate('/#catalog')}
            >
              {t('wishlist.browseBooks', 'Browse Books')}
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
