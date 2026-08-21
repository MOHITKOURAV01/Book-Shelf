import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Rating from '../components/Rating.jsx';
import WishlistButton from '../components/WishlistButton.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import BookCard from '../components/BookCard.jsx';
import { useBook } from '../hooks/useBook.js';
import { useCart } from '../hooks/useCart.js';
import { useWishlist } from '../hooks/useWishlist.js';
import { getBooks } from '../services/bookService.js';
import {
  describeStock,
  formatPrice,
  formatRating,
  isInStock,
} from '../utils/bookFormat.js';
import './BookDetail.css';

/**
 * The book detail page.
 *
 * It used to read `src/data/books.js` — a hardcoded copy of the backend's
 * `books.json`, kept in the repo for a frontend-only draft and never removed.
 * The grid on Home has fetched `/api/books` since #274, so the two views of
 * the same book disagreed about its price and rating, the detail page had no
 * idea whether anything was in stock (`inventory` does not exist in the local
 * copy), and a book added to the catalogue rendered "Book Not Found" on its
 * own page. See #317.
 */
export default function BookDetail() {
  const { t } = useTranslation();
  const { id } = useParams();

  const { book, loading, notFound, error, reload } = useBook(id);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [related, setRelated] = useState([]);

  // The review form belongs to whichever book is on screen.
  useEffect(() => {
    setRating(0);
    setReviewText('');
    setReviewError('');
    setSuccessMsg('');
  }, [id]);

  /*
   * Related books come from the same API, filtered by genre. The old page
   * scanned the local array; now that the catalogue is paged and filtered
   * server-side, asking the server is both cheaper and correct.
   *
   * A failure here is silent on purpose. "You might also like" is a garnish;
   * it must not turn a working book page into an error page.
   */
  useEffect(() => {
    if (!book?.genre) {
      setRelated([]);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    getBooks({ genre: book.genre, limit: 5 }, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        const others = (data?.books ?? [])
          .filter((candidate) => String(candidate.id) !== String(book.id))
          .slice(0, 4);
        setRelated(others);
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [book?.id, book?.genre]);

  const handleReviewSubmit = (event) => {
    event.preventDefault();

    if (rating === 0) {
      setReviewError('Please select a rating before submitting.');
      return;
    }

    setReviewError('');

    // TODO: POST /api/reviews once the endpoint exists.
    setRating(0);
    setReviewText('');
    setSuccessMsg('Thank you! Your review has been submitted.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (loading) {
    return (
      <main className="book-detail-page">
        <SkeletonLoader variant="detail" count={1} />
      </main>
    );
  }

  if (notFound) {
    return (
      <div className="book-detail-not-found">
        <h2>{t('bookDetail.notFound') || 'Book Not Found'}</h2>
        <Link to="/" className="book-detail-back-link">
          {t('bookDetail.returnToCatalog') || 'Return to Catalog'}
        </Link>
      </div>
    );
  }

  // A book that could not be fetched is not a book that does not exist, and
  // the page must not say it is.
  if (error || !book) {
    return (
      <div className="book-detail-not-found">
        <h2>We could not load this book</h2>
        <p className="book-detail-error-message">{error}</p>
        <button type="button" className="book-detail-retry" onClick={reload}>
          Try again
        </button>
        <Link to="/" className="book-detail-back-link">
          {t('bookDetail.returnToCatalog') || 'Return to Catalog'}
        </Link>
      </div>
    );
  }

  const ratingLabel = formatRating(book.rating);
  const priceLabel = formatPrice(book.price);
  const stockLabel = describeStock(book);
  const available = isInStock(book);

  return (
    <main className="book-detail-page">
      <div className="book-detail-container">
        <div
          className="book-detail-image-wrapper"
          style={{ '--cover-color': book.cover }}
        >
          <div className="book-detail-cover">
            <span className="book-detail-cover-genre">{book.genre}</span>
            <span className="book-detail-cover-title">{book.title}</span>
          </div>
        </div>

        <div className="book-detail-content">
          <h1 className="book-detail-title">{book.title}</h1>
          <p className="book-detail-author">
            {t('bookDetail.by') || 'by'} {book.author}
          </p>

          <div className="book-detail-metadata">
            {book.genre && <span className="book-detail-badge">{book.genre}</span>}
            {/* Rendered only when there is one — `.toFixed` on undefined used
                to take the page down. */}
            {ratingLabel && (
              <span className="book-detail-rating">★ {ratingLabel}</span>
            )}
            {priceLabel && <span className="book-detail-price">{priceLabel}</span>}
            {stockLabel && (
              <span
                className={`book-detail-stock ${
                  available ? '' : 'book-detail-stock--out'
                }`}
              >
                {stockLabel}
              </span>
            )}
          </div>

          <div className="book-detail-description">
            <p>{book.description || t('bookDetail.noDescription')}</p>
          </div>

          <div className="book-detail-extra-info">
            {book.isbn && (
              <p>
                <strong>{t('bookDetail.isbn') || 'ISBN:'}</strong> {book.isbn}
              </p>
            )}
            {book.year && (
              <p>
                <strong>{t('bookDetail.publicationYear') || 'Year:'}</strong>{' '}
                {book.year}
              </p>
            )}
          </div>

          <div className="book-detail-actions">
            {/*
              The primary add-to-cart button in the app, on the page that had
              no idea whether the book existed in the warehouse. A sold-out
              book could be added here and only failed at the reservation
              step during checkout.
            */}
            <button
              className="book-detail-add-btn"
              onClick={() => addToCart(book)}
              disabled={!available}
            >
              {available
                ? t('bookDetail.addToCart') || 'Add to Cart'
                : 'Out of stock'}
            </button>
            <WishlistButton
              active={isWishlisted(book.id)}
              onToggle={() => toggleWishlist(book.id)}
            />
          </div>
        </div>
      </div>

      <div className="book-review-section">
        <h2 className="book-review-title">
          {t('bookDetail.writeReview') || 'Write a Review'}
        </h2>
        <form className="book-review-form" onSubmit={handleReviewSubmit}>
          <div className="book-review-rating">
            <Rating value={rating} onChange={setRating} />
          </div>
          {reviewError && <p className="book-review-error">{reviewError}</p>}
          {successMsg && <p className="book-review-success">{successMsg}</p>}
          <textarea
            className="book-review-textarea"
            placeholder={
              t('bookDetail.reviewPlaceholder') || 'Share your thoughts...'
            }
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            rows={4}
            maxLength={1000}
          />
          <button type="submit" className="book-review-submit-btn">
            {t('bookDetail.submitReview') || 'Submit'}
          </button>
        </form>
      </div>

      {related.length > 0 && (
        <div className="book-related-section">
          <h2 className="book-related-title">
            {t('bookDetail.relatedBooks') || 'Related Books'}
          </h2>
          <div className="book-related-grid">
            {related.map((relatedBook) => (
              <BookCard key={relatedBook.id} book={relatedBook} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
