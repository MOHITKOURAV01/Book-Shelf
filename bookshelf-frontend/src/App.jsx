import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop.jsx';

import CustomCursor from './components/CustomCursor.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import RecentlyViewed from './components/RecentlyViewed.jsx';
import CartDrawer from './components/CartDrawer.jsx';

import './App.css';

/**
 * App is the layout shell, not a page.
 *
 * It owns the chrome that should persist across navigations (navbar, footer,
 * cart drawer, cursor) and renders whichever page matched through <Outlet />.
 * The route table itself lives in routes/AppRoutes.jsx so there is exactly
 * one of them.
 *
 * The search input lives in the navbar but the results are rendered by Home,
 * so the query is held here and passed down through the outlet context.
 * Pages that need it read it with useOutletContext().
 */
export default function App() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="app">
      {/*
        The theme toggle used to be rendered here *as well as* in the navbar,
        as two separate components each holding their own copy of the theme.
        It now lives only in the navbar, reading the shared ThemeContext.
      */}
      <ScrollToTop />
      <CustomCursor />

      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="nav-spacer" />

      <Outlet context={{ searchQuery, setSearchQuery }} />

      <RecentlyViewed />
      <Footer />

      <CartDrawer />
    </div>
  );
}
