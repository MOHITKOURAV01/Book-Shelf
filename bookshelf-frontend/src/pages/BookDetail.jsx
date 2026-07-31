import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import RecentlyViewed from '../components/RecentlyViewed';
import { books } from '../data/books';
import './BookDetail.css';

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  
  useEffect(() => {
    // Find book by ID
    const foundBook = books.find(b => String(b.id) === String(id));
    setBook(foundBook);
    
    if (foundBook) {
      // Track recently viewed
      try {
        const stored = localStorage.getItem('recentlyViewed');
        let viewedList = stored ? JSON.parse(stored) : [];
        
        // Remove if it exists to push to front
        viewedList = viewedList.filter(bookId => String(bookId) !== String(foundBook.id));
        
        // Add to front
        viewedList.unshift(foundBook.id);
        
        // Cap at 10 items
        if (viewedList.length > 10) {
          viewedList = viewedList.slice(0, 10);
        }
        
        localStorage.setItem('recentlyViewed', JSON.stringify(viewedList));
      } catch (e) {
        console.error('Failed to update recently viewed:', e);
      }
    }
  }, [id]);

  if (!book) {
    return (
      <div className="book-detail-page">
        <Navbar cartCount={0} onCartClick={() => {}} />
        <main className="book-detail-main not-found">
          <h2>Book Not Found</h2>
          <Link to="/" className="btn-return">Return Home</Link>
        </main>
        <Footer />
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { books } from '../data/books.js';
import Rating from '../components/Rating.jsx';
import WishlistButton from '../components/WishlistButton.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { CartContext } from '../context/CartContext.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';
import { useTranslation } from 'react-i18next';
import './BookDetail.css';

export default function BookDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToCart } = useContext(CartContext);
  const { wishlist, toggleWishlist } = useContext(WishlistContext);

  const book = books.find((item) => item.id === id);

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
        <h2>{t('bookDetail.notFound')}</h2>
        <Link to="/" className="book-detail-back-link">{t('bookDetail.returnToCatalog')}</Link>
      </div>
    );
  }

  return (
    <div className="book-detail-page">
      <Navbar cartCount={0} onCartClick={() => {}} />
      <div className="nav-spacer" />
      
      <main className="book-detail-main">
        <div className="book-detail-content">
          <div className="book-detail-image-container">
            <img src={book.coverImage} alt={book.title} className="book-detail-image" />
          </div>
          <div className="book-detail-info">
            <h1 className="book-detail-title">{book.title}</h1>
            <p className="book-detail-author">by {book.author}</p>
            <p className="book-detail-price">${book.price.toFixed(2)}</p>
            <p className="book-detail-description">{book.description}</p>
            <button className="btn-add-to-cart">Add to Cart</button>
          </div>
        </div>
      </main>

      <RecentlyViewed currentBookId={book.id} />
      
      <Footer />
    </div>
  const relatedBooks = books
    .filter((b) => b.genre === book.genre && b.id !== book.id)
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
          <p className="book-detail-author">{t('bookDetail.by')} {book.author}</p>

          <div className="book-detail-metadata">
            <span className="book-detail-badge">{book.genre}</span>
            <span className="book-detail-rating">★ {book.rating.toFixed(1)}</span>
            <span className="book-detail-price">₹{book.price}</span>
          </div>

          <div className="book-detail-description">
            <p>{book.description || t('bookDetail.noDescription')}</p>
          </div>

          <div className="book-detail-extra-info">
            {book.isbn && <p><strong>{t('bookDetail.isbn')}</strong> {book.isbn}</p>}
            {book.year && <p><strong>{t('bookDetail.publicationYear')}</strong> {book.year}</p>}
          </div>

          <div className="book-detail-actions">
            <button className="book-detail-add-btn" onClick={() => addToCart(book)}>
              {t('bookDetail.addToCart')}
            </button>
            <WishlistButton active={wishlist?.includes(book.id)} onToggle={() => toggleWishlist(book.id)} />
          </div>
        </div>
      </div>
      
      <div className="book-review-section">
        <h2 className="book-review-title">{t('bookDetail.writeReview')}</h2>
        <form className="book-review-form" onSubmit={handleReviewSubmit}>
          <div className="book-review-rating">
            <Rating value={rating} onChange={setRating} />
          </div>
          {error && <p className="book-review-error">{error}</p>}
          {successMsg && <p className="book-review-success">{successMsg}</p>}
          <textarea
            className="book-review-textarea"
            placeholder={t('bookDetail.reviewPlaceholder')}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <button type="submit" className="book-review-submit-btn">{t('bookDetail.submitReview')}</button>
        </form>
      </div>

      {relatedBooks.length > 0 && (
        <div className="book-related-section">
          <h2 className="book-related-title">{t('bookDetail.relatedBooks')}</h2>
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
