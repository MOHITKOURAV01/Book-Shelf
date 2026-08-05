import { useMemo, useState } from 'react';

import ThemeToggle from './components/ThemeToggle.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';

import CustomCursor from './components/CustomCursor.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import BookCard from './components/BookCard.jsx';
import Footer from './components/Footer.jsx';
import RecentlyViewed from './components/RecentlyViewed.jsx';
import { books, genres } from './data/books.js';
import CartDrawer from './components/CartDrawer.jsx';
import { books, genres } from './data/books.js';
import './App.css';

import { useNavigate } from 'react-router-dom';

export default function App() {
  const [activeGenre, setActiveGenre] = useState('All');
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  const visibleBooks = useMemo(() => {
    if (activeGenre === 'All') return books;
    return books.filter((book) => book.genre === activeGenre);
  }, [activeGenre]);

  function handleAddToCart(book) {
    setCart((prev) => {
      const existingItem = prev.find(item => item.id === book.id);
      if (existingItem) {
        return prev.map(item => 
          item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...book, quantity: 1 }];
    });
    setIsCartOpen(true);
  }

  function handleUpdateQuantity(id, newQuantity) {
    if (newQuantity < 1) return;
    setCart((prev) => prev.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
  }

  function handleRemoveItem(id) {
    setCart((prev) => prev.filter(item => item.id !== id));
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);


import Home from './pages/Home.jsx';
import AboutUs from './pages/AboutUs.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsOfService from './pages/TermsOfService.jsx';
import BookDetail from './pages/BookDetail.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Checkout from './pages/Checkout.jsx';

import OrderHistory from './pages/OrderHistory.jsx';

import './App.css';

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cart, setCart] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const selectedGenres = searchParams.getAll('genre');
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minRating = Number(searchParams.get('minRating')) || 0;

  const handleGenreChange = (genre, checked) => {
    const params = new URLSearchParams(searchParams);
    let currentGenres = params.getAll('genre');
    if (checked) {
      if (!currentGenres.includes(genre)) {
        params.append('genre', genre);
      }
    } else {
      params.delete('genre');
      currentGenres.filter(g => g !== genre).forEach(g => params.append('genre', g));
    }
    setSearchParams(params);
  };

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === '' || value === 0 || value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const visibleBooks = useMemo(() => {
    return books.filter((book) => {
      if (selectedGenres.length > 0 && !selectedGenres.includes(book.genre)) return false;
      if (minPrice && book.price < Number(minPrice)) return false;
      if (maxPrice && book.price > Number(maxPrice)) return false;
      if (minRating && book.rating < minRating) return false;
      return true;
    });
  }, [selectedGenres, minPrice, maxPrice, minRating]);

  function handleAddToCart(book) {
    setCart((prev) => [...prev, book]);
  }
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="app">
      <ThemeToggle />
      <ScrollToTop />
      <CustomCursor />

      <Navbar cartCount={cart.length} onCartClick={() => navigate('/checkout')} />
      <div className="nav-spacer" />
      <Hero />

      <main className="catalog" id="catalog">
        <div className="catalog__inner">
          <div className="catalog__header">
            <h2 className="catalog__title">Browse the catalog</h2>
            <p className="catalog__count">{visibleBooks.length} titles</p>
          </div>

          <GenreFilter
            genres={genres}
            active={activeGenre}
            onSelect={setActiveGenre}
          />

          <div className="catalog__grid">
            {visibleBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </main>

      <Navbar cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />
      
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />

      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="nav-spacer" />

      <Routes>
        <Route path="/" element={<Home searchQuery={searchQuery} />} />
        <Route path="/book/:id" element={<BookDetail />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <RecentlyViewed />
      <Footer />
      
      <CartDrawer />
    </div>
  );
}
