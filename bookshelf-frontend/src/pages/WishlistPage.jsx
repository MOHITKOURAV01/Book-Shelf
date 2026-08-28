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

  /*
   * The line that was missing.
   *
   * `useTranslation` was imported and `t(...)` was called four times in the
   * markup, but the hook was never called. `t` was a free variable, so the
   * <h1> threw `ReferenceError: t is not defined` on the first render and the
   * ErrorBoundary took the page. Same omission as OrderHistory. See #367.
   */
  const { t } = useTranslation();

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
            {loading
              ? t('common.loading', 'Loading…')
              : t('wishlist.itemCount', {
                  count,
                  defaultValue_one: '{{count}} item',
                  defaultValue_other: '{{count}} items',
                })}
          </p>
        </header>

        {loading && (
          <div className="catalog__grid" aria-busy="true">
            <SkeletonLoader variant="card" count={4} />
          </div>
        )}

        {!loading && error && (
          <div className="wishlist-page__error" role="alert">
            <h2>{t('wishlist.loadError', 'We could not load your wishlist')}</h2>
            <p>
              {error.message ||
                t('common.genericError', 'Something went wrong. Please try again.')}
            </p>
          </div>
        )}

        {!loading && !error && missingIds.length > 0 && (
          <div className="wishlist-page__notice" role="status">
            <p>
              {t('wishlist.missingNotice', {
                count: missingIds.length,
                defaultValue_one: '{{count}} saved book is no longer in the catalogue.',
                defaultValue_other:
                  '{{count}} saved books are no longer in the catalogue.',
              })}
            </p>
            <button
              type="button"
              className="wishlist-page__notice-btn"
              onClick={removeMissing}
            >
              {t('wishlist.removeMissing', {
                count: missingIds.length,
                defaultValue_one: 'Remove it from my wishlist',
                defaultValue_other: 'Remove them from my wishlist',
              })}
            </button>
          </div>
        )}

        {!loading && !error && failedIds.length > 0 && (
          <div className="wishlist-page__notice wishlist-page__notice--warning" role="status">
            <p>
              {t('wishlist.failedNotice', {
                count: failedIds.length,
                defaultValue_one:
                  '{{count}} saved book could not be loaded just now. It has not been removed.',
                defaultValue_other:
                  '{{count}} saved books could not be loaded just now. They have not been removed.',
              })}
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
