import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import ThemeToggle from './components/ThemeToggle.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import RecentlyViewed from './components/RecentlyViewed.jsx';
import { books, genres } from './data/books.js';
import CartDrawer from './components/CartDrawer.jsx';

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
