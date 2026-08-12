import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './routes/AppRoutes.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { CartProvider } from './context/CartContext.jsx';

// Side-effect import: this is what actually calls i18n.init(). Nothing
// imported it before, so every useTranslation() call in the app was running
// against an uninitialised i18next instance.
import './i18n.js';

import './index.css';

/*
 * Provider order matters here.
 *
 * WishlistProvider reads AuthContext to decide whether to load the wishlist
 * from the API or from localStorage, so it has to sit inside AuthProvider.
 * CartProvider is independent of both — it only touches localStorage — but it
 * has to be above the router, because Navbar and CartDrawer both consume it
 * and they are rendered by the App layout on every route.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  </React.StrictMode>
);
