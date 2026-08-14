import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { books } from '../data/books.js';
import Rating from '../components/Rating.jsx';
import WishlistButton from '../components/WishlistButton.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { useCart } from '../hooks/useCart.js';
import { useWishlist } from '../hooks/useWishlist.js';
import { useTranslation } from 'react-i18next';
import BookCard from '../components/BookCard.jsx';
import './BookDetail.css';

export default function BookDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const book = books.find((item) => String(item.id) === String(id));

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, [id]);

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating before submitting.');
      return;
    }
    setError('');

    const payload = {
      bookId: book.id,
      rating,
      review: reviewText,
    };

    // TODO: Send to POST /api/reviews

    // Reset form
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

  if (!book) {
    return (
      <div className="book-detail-not-found">
        <h2>{t('bookDetail.notFound') || 'Book Not Found'}</h2>
        <Link to="/" className="book-detail-back-link">{t('bookDetail.returnToCatalog') || 'Return to Catalog'}</Link>
      </div>
    );
  }

  const relatedBooks = books
    .filter((b) => b.genre === book.genre && String(b.id) !== String(book.id))
    .slice(0, 4);

  return (
    <main className="book-detail-page">
      <div className="book-detail-container">
        <div className="book-detail-image-wrapper" style={{ '--cover-color': book.cover }}>
          <div className="book-detail-cover">
            <span className="book-detail-cover-genre">{book.genre}</span>
            <span className="book-detail-cover-title">{book.title}</span>
          </div>
        </div>

        <div className="book-detail-content">
          <h1 className="book-detail-title">{book.title}</h1>
          <p className="book-detail-author">{t('bookDetail.by') || 'by'} {book.author}</p>

          <div className="book-detail-metadata">
            <span className="book-detail-badge">{book.genre}</span>
            <span className="book-detail-rating">★ {book.rating.toFixed(1)}</span>
            <span className="book-detail-price">₹{book.price}</span>
          </div>

          <div className="book-detail-description">
            <p>{book.description || t('bookDetail.noDescription')}</p>
          </div>

          <div className="book-detail-extra-info">
            {book.isbn && <p><strong>{t('bookDetail.isbn') || 'ISBN:'}</strong> {book.isbn}</p>}
            {book.year && <p><strong>{t('bookDetail.publicationYear') || 'Year:'}</strong> {book.year}</p>}
          </div>

          <div className="book-detail-actions">
            <button className="book-detail-add-btn" onClick={() => addToCart(book)}>
              {t('bookDetail.addToCart') || 'Add to Cart'}
            </button>
            <WishlistButton active={isWishlisted(book.id)} onToggle={() => toggleWishlist(book.id)} />
          </div>
        </div>
      </div>
      
      <div className="book-review-section">
        <h2 className="book-review-title">{t('bookDetail.writeReview') || 'Write a Review'}</h2>
        <form className="book-review-form" onSubmit={handleReviewSubmit}>
          <div className="book-review-rating">
            <Rating value={rating} onChange={setRating} />
          </div>
          {error && <p className="book-review-error">{error}</p>}
          {successMsg && <p className="book-review-success">{successMsg}</p>}
          <textarea
            className="book-review-textarea"
            placeholder={t('bookDetail.reviewPlaceholder') || 'Share your thoughts...'}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <button type="submit" className="book-review-submit-btn">{t('bookDetail.submitReview') || 'Submit'}</button>
        </form>
      </div>

      {relatedBooks.length > 0 && (
        <div className="book-related-section">
          <h2 className="book-related-title">{t('bookDetail.relatedBooks') || 'Related Books'}</h2>
          <div className="book-related-grid">
            {relatedBooks.map(relatedBook => (
              <BookCard key={relatedBook.id} book={relatedBook} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
