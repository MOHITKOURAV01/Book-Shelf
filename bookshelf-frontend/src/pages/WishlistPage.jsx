import { useContext } from 'react';
import { WishlistContext } from '../context/WishlistContext.jsx';
import { books } from '../data/books.js';
import BookCard from '../components/BookCard.jsx';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { useNavigate } from 'react-router-dom';
import './WishlistPage.css';

export default function WishlistPage() {
  const { wishlist, loading } = useContext(WishlistContext);
  const navigate = useNavigate();

  // Find books that are in the wishlist
  const wishlistedBooks = books.filter(book => wishlist.includes(book.id));

  const handleAddToCart = (book) => {
    // Note: Since Cart state is in App.jsx and there's no CartContext,
    // For now we will alert. A proper implementation would require CartContext.
    alert(`Added ${book.title} to cart`);
  };

  return (
    <div className="app">
      <Navbar cartCount={0} onCartClick={() => navigate('/checkout')} />
      <div className="nav-spacer" />
      
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
              {wishlistedBooks.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
