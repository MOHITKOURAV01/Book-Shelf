import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { CartContext } from '../context/CartContext.jsx';
import { useTranslation } from 'react-i18next';
import './Navbar.css';

export default function Navbar({ searchQuery, setSearchQuery }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { cart, setIsCartOpen } = useContext(CartContext);

  return (
    <div className="nav-wrapper">
      <header className="nav">
        <div className="nav__inner">
          {/* Brand — book icon visible on desktop, hidden on mobile */}
          <a href="/" className="nav__brand">
            <span className="nav__book-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            {t('navbar.logo') || 'BookShelf'}
          </a>

          {/* Desktop nav links */}
          <nav className="nav__links">
            <a href="/#shelf">The Shelf</a>
            <a href="/#catalog">{t('navbar.catalog') || 'Browse'}</a>
            <Link to="/wishlist">{t('navbar.wishlist') || 'Wishlist'}</Link>
            <Link to="/orders">{t('navbar.orders') || 'Orders'}</Link>
            <Link to="/about">{t('navbar.about') || 'About'}</Link>
            <Link to="/login">Login</Link>
          </nav>

          {/* Desktop actions */}
          <div className="nav__actions">
            <input 
              className="nav__search" 
              type="search" 
              placeholder={t('navbar.searchPlaceholder') || "Search titles, authors..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              className="nav__theme-toggle" 
              onClick={toggleTheme} 
              aria-label="Toggle dark mode"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button className="nav__cart" onClick={() => setIsCartOpen(true)} aria-label="Open cart">
              {t('navbar.cart') || 'Cart'}
              <span className="nav__cart-count">{cart.length}</span>
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="nav__hamburger"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="nav__mobile-menu">
            <a href="/#shelf" onClick={() => setMobileOpen(false)}>The Shelf</a>
            <a href="/#catalog" onClick={() => setMobileOpen(false)}>{t('navbar.catalog') || 'Browse'}</a>
            <Link to="/wishlist" onClick={() => setMobileOpen(false)}>{t('navbar.wishlist') || 'Wishlist'}</Link>
            <Link to="/orders" onClick={() => setMobileOpen(false)}>{t('navbar.orders') || 'Orders'}</Link>
            <Link to="/about" onClick={() => setMobileOpen(false)}>{t('navbar.about') || 'About'}</Link>
            <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
            <input 
              className="nav__search nav__search--mobile" 
              type="search" 
              placeholder={t('navbar.searchPlaceholder') || "Search titles, authors..."} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {/* Added cart button to mobile menu for completeness! */}
            <button className="nav__mobile-cart-btn" onClick={() => { setIsCartOpen(true); setMobileOpen(false); }}>
              {t('navbar.cart') || 'Cart'} ({cart.length})
            </button>
          </div>
        )}
      </header>
    </div>
  );
}
