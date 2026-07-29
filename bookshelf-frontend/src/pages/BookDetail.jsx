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
  );
}
