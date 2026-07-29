import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import ThemeToggle from './components/ThemeToggle.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import { books, genres } from './data/books.js';
import './App.css';

export default function App() {
  const [activeGenre, setActiveGenre] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="app">
      <ThemeToggle />
      <ScrollToTop />
      <CustomCursor />

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

      <Footer />
      
      <CartDrawer />
    </div>
  );
}
