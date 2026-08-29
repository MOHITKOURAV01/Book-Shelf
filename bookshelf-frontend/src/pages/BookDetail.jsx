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
import { usePageMetadata } from '../hooks/usePageMetadata.js';
import { bookDescription, bookTitle } from '../utils/pageTitle.js';
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
import AIBookSummaryCard from '../components/AIBookSummaryCard.jsx';
import BookChapterList from '../components/BookChapterList.jsx';
import BookReviewSummary from '../components/BookReviewSummary.jsx';
import BookDimensions from '../components/BookDimensions.jsx';
import BookWeight from '../components/BookWeight.jsx';
import ISBNCopy from '../components/ISBNCopy.jsx';
import BookMetadata from '../components/BookMetadata.jsx';
import QRCodeGenerator from '../components/QRCodeGenerator.jsx';
import BookBadge from '../components/BookBadge.jsx';
import VerifiedPurchaseBadge from '../components/VerifiedPurchaseBadge.jsx';
import BookSpine from '../components/BookSpine.jsx';
import BookAvailability from '../components/BookAvailability.jsx';
import BookActions from '../components/BookActions.jsx';

export default function BookDetail() {
  const { t } = useTranslation();
  const { id } = useParams();

  const { book, loading, notFound, error, reload } = useBook(id);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  usePageMetadata({
    title: notFound ? 'Book not found' : book ? bookTitle(book) : null,
    description: notFound ? 'That book is not in the BookShelf catalogue.' : bookDescription(book),
  });

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [related, setRelated] = useState([]);

  useEffect(() => {
    setRating(0);
    setReviewText('');
    setReviewError('');
    setSuccessMsg('');
  }, [id]);

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

  const sampleChapters = [
    { id: 'c1', number: 1, title: 'Introduction & Foundations', duration: '12 min', completed: true },
    { id: 'c2', number: 2, title: 'Core Concepts & Principles', duration: '18 min', completed: false },
    { id: 'c3', number: 3, title: 'Practical Application', duration: '25 min', completed: false },
    { id: 'c4', number: 4, title: 'Advanced Strategies', duration: '20 min', completed: false },
  ];

  const bookMetadataObj = {
    Publisher: book.publisher || 'BookShelf Publishing',
    Format: 'Hardcover',
    Language: 'English',
    Edition: '1st Edition (2026)',
    Pages: book.pages || '340 pages',
  };

  return (
    <main className="book-detail-page">
      <div className="book-detail-container">
        <div className="book-detail-image-wrapper" style={{ '--cover-color': book.cover }}>
          <div className="book-detail-cover">
            <span className="book-detail-cover-genre">{book.genre}</span>
            <span className="book-detail-cover-title">{book.title}</span>
          </div>
          <div style={{ marginTop: '16px' }}>
            <BookSpine title={book.title} author={book.author} color={book.cover} />
          </div>
        </div>

        <div className="book-detail-content">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <BookBadge type="bestSeller" />
            <BookBadge type="editorsPick" />
          </div>

          <h1 className="book-detail-title">{book.title}</h1>
          <p className="book-detail-author">
            {t('bookDetail.by') || 'by'} {book.author}
          </p>

          <div className="book-detail-metadata">
            {book.genre && <span className="book-detail-badge">{book.genre}</span>}
            {ratingLabel && <span className="book-detail-rating">★ {ratingLabel}</span>}
            {priceLabel && <span className="book-detail-price">{priceLabel}</span>}
            {stockLabel && (
              <span className={`book-detail-stock ${available ? '' : 'book-detail-stock--out'}`}>
                {stockLabel}
              </span>
            )}
          </div>

          <div style={{ margin: '12px 0' }}>
            <BookAvailability stock={book.inventory ?? (available ? 10 : 0)} inStock={available} />
          </div>

          <div className="book-detail-description">
            <p>{book.description || t('bookDetail.noDescription')}</p>
          </div>

          <div style={{ margin: '16px 0' }}>
            <ISBNCopy isbn={book.isbn || '978-1-60309-502-0'} />
          </div>

          <div className="book-detail-actions">
            <button
              className="book-detail-add-btn"
              onClick={() => addToCart(book)}
              disabled={!available}
            >
              {available ? t('bookDetail.addToCart') || 'Add to Cart' : 'Out of stock'}
            </button>
            <WishlistButton
              active={isWishlisted(book.id)}
              onToggle={() => toggleWishlist(book.id)}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <BookActions
              onAddToCart={() => addToCart(book)}
              onWishlist={() => toggleWishlist(book.id)}
              isWishlisted={isWishlisted(book.id)}
            />
          </div>
        </div>
      </div>

      {/* Specifications & Overview */}
      <section style={{ margin: '32px 0' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>Book Specifications</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <BookDimensions width="15 cm" height="23 cm" thickness="2.5 cm" />
          <BookWeight weight="450g" unit="g" />
          <BookMetadata title="Publication Details" metadata={bookMetadataObj} />
        </div>
      </section>

      {/* AI Summary Card */}
      <section style={{ margin: '32px 0' }}>
        <AIBookSummaryCard
          title={book.title}
          author={book.author}
          summary={book.description || 'An insightful look into themes, characters, and narrative concepts.'}
          keyPoints={['Thought-provoking plot', 'Deep character development', 'Highly recommended for enthusiasts']}
        />
      </section>

      {/* Chapter List */}
      <section style={{ margin: '32px 0' }}>
        <BookChapterList chapters={sampleChapters} title={`Table of Contents for ${book.title}`} />
      </section>

      {/* QR Code Sharing */}
      <section style={{ margin: '32px 0', background: 'var(--surface-color, #f8fafc)', padding: '20px', borderRadius: '12px' }}>
        <QRCodeGenerator
          value={window.location.href}
          title={`Share "${book.title}" via QR Code`}
          downloadName={`book-${book.id}-qr`}
        />
      </section>

      {/* Review Section */}
      <div className="book-review-section">
        <BookReviewSummary
          rating={book.rating || 4.5}
          reviewCount={book.reviewsCount || 42}
          totalRatings={50}
        />
        <div style={{ margin: '16px 0 24px 0' }}>
          <VerifiedPurchaseBadge />
        </div>

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
            placeholder={t('bookDetail.reviewPlaceholder') || 'Share your thoughts...'}
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
