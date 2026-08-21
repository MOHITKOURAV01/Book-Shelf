import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

/*
 * The theme toggle and i18n are chrome the navbar merely hosts; stubbing them
 * keeps these tests about routing, the cart badge and the session.
 */
vi.mock('./ThemeToggle.jsx', () => ({
  default: () => <button type="button">theme</button>,
}));

vi.mock('react-i18next', () => ({
  // i18n is only initialised by importing src/i18n.js for its side effect,
  // which no test does. Returning '' from t() exercises the same `|| fallback`
  // path the app takes before initialisation completes.
  useTranslation: () => ({ t: () => '' }),
}));

import { CartProvider } from '../context/CartContext.jsx';
import { AuthContext } from '../context/AuthContext.jsx';
import Navbar, { cartItemCount } from './Navbar.jsx';

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location">
      {location.pathname}
      {location.hash}
    </span>
  );
}

function renderNavbar({ cart = [], auth = null, initialEntry = '/' } = {}) {
  window.localStorage.setItem('cart', JSON.stringify(cart));

  const setSearchQuery = vi.fn();

  const tree = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <CartProvider>
        <Navbar searchQuery="" setSearchQuery={setSearchQuery} />
        <LocationProbe />
        <Routes>
          <Route path="/" element={<h1 id="catalog">home</h1>} />
          <Route path="/book/:id" element={<h1>book</h1>} />
          <Route path="/login" element={<h1>login</h1>} />
          <Route path="/profile" element={<h1>profile</h1>} />
        </Routes>
      </CartProvider>
    </MemoryRouter>
  );

  render(
    auth ? (
      <AuthContext.Provider value={auth}>{tree}</AuthContext.Provider>
    ) : (
      tree
    )
  );

  return { setSearchQuery };
}

const signedIn = (overrides = {}) => ({
  isAuthenticated: true,
  user: { name: 'Asha', _id: 'u1' },
  loading: false,
  logout: vi.fn().mockResolvedValue(undefined),
  login: vi.fn(),
  register: vi.fn(),
  checkAuth: vi.fn(),
  ...overrides,
});

describe('cartItemCount', () => {
  it('counts books rather than cart lines', () => {
    // The badge read `cart.length`: five copies of one book showed "1".
    expect(cartItemCount([{ id: 'b1', quantity: 5 }])).toBe(5);
    expect(
      cartItemCount([
        { id: 'b1', quantity: 2 },
        { id: 'b2', quantity: 3 },
      ])
    ).toBe(5);
  });

  it('ignores lines whose quantity is unusable', () => {
    expect(cartItemCount([{ quantity: 'lots' }, { quantity: -1 }, { quantity: 2 }])).toBe(2);
  });

  it('survives a cart that is not an array', () => {
    expect(cartItemCount(null)).toBe(0);
    expect(cartItemCount(undefined)).toBe(0);
    expect(cartItemCount('cart')).toBe(0);
  });
});

describe('Navbar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('routing', () => {
    it('routes the brand client-side instead of reloading the document', async () => {
      const user = userEvent.setup();
      renderNavbar({ initialEntry: '/book/b1' });

      const brand = screen.getByRole('link', { name: /bookshelf/i });
      // A plain <a href="/"> tears down and rebuilds the whole React tree.
      expect(brand).toHaveAttribute('href', '/');

      await user.click(brand);
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });

    it('takes the catalogue anchors home from a book page', async () => {
      const user = userEvent.setup();
      renderNavbar({ initialEntry: '/book/b1' });

      await user.click(screen.getByRole('link', { name: 'Browse' }));

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('/#catalog')
      );
    });

    it('scrolls the hash target into view, which React Router does not do', async () => {
      const user = userEvent.setup();
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;

      renderNavbar({ initialEntry: '/book/b1' });
      await user.click(screen.getByRole('link', { name: 'Browse' }));

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    });

    it('uses no plain anchors for in-app destinations', () => {
      renderNavbar();

      for (const link of screen.getAllByRole('link')) {
        // react-router renders <a>, but it attaches a click handler; a raw
        // anchor is detectable by an absolute or protocol-relative href.
        expect(link.getAttribute('href')).toMatch(/^\/(?!\/)/);
      }
    });
  });

  describe('cart badge', () => {
    it('shows the number of books, not the number of lines', () => {
      renderNavbar({ cart: [{ id: 'b1', title: 'The Quiet Ones', price: 349, quantity: 5 }] });
      expect(screen.getByTestId('cart-count')).toHaveTextContent('5');
    });

    it('adds up across lines', () => {
      renderNavbar({
        cart: [
          { id: 'b1', price: 349, quantity: 2 },
          { id: 'b2', price: 299, quantity: 3 },
        ],
      });
      expect(screen.getByTestId('cart-count')).toHaveTextContent('5');
    });

    it('renders no badge at all for an empty cart', () => {
      renderNavbar({ cart: [] });
      expect(screen.queryByTestId('cart-count')).not.toBeInTheDocument();
    });

    it('describes the cart contents to screen readers', () => {
      renderNavbar({ cart: [{ id: 'b1', price: 349, quantity: 3 }] });
      expect(screen.getByLabelText('Open cart, 3 books')).toBeInTheDocument();
    });

    it('says "book" rather than "books" for one', () => {
      renderNavbar({ cart: [{ id: 'b1', price: 349, quantity: 1 }] });
      expect(screen.getByLabelText('Open cart, 1 book')).toBeInTheDocument();
    });
  });

  describe('session', () => {
    it('offers Login when signed out', () => {
      renderNavbar();
      expect(screen.getAllByRole('link', { name: 'Login' }).length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
    });

    it('stops telling a signed-in user to log in', () => {
      renderNavbar({ auth: signedIn() });
      expect(screen.queryByRole('link', { name: 'Login' })).not.toBeInTheDocument();
    });

    it('exposes Profile and My orders once signed in', () => {
      renderNavbar({ auth: signedIn() });
      expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
      expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute(
        'href',
        '/account/orders'
      );
    });

    it('logs out and returns to the shop', async () => {
      const user = userEvent.setup();
      const auth = signedIn();
      renderNavbar({ auth, initialEntry: '/profile' });

      await user.click(screen.getByRole('button', { name: /log out/i }));

      await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('location')).toHaveTextContent('/');
    });

    it('still navigates away when the logout request fails', async () => {
      const user = userEvent.setup();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const auth = signedIn({ logout: vi.fn().mockRejectedValue(new Error('offline')) });
      renderNavbar({ auth, initialEntry: '/profile' });

      await user.click(screen.getByRole('button', { name: /log out/i }));

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'));
    });

    it('renders the signed-out view rather than throwing without AuthProvider', () => {
      // The navbar is chrome; it must not be the thing that takes the page down.
      expect(() => renderNavbar()).not.toThrow();
    });
  });

  describe('mobile menu', () => {
    it('closes itself when the cart is opened from it', async () => {
      const user = userEvent.setup();
      renderNavbar({ cart: [{ id: 'b1', price: 349, quantity: 1 }] });

      await user.click(screen.getByRole('button', { name: /toggle menu/i }));
      expect(screen.getByRole('button', { name: /^Cart \(1\)$/ })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^Cart \(1\)$/ }));
      expect(screen.queryByRole('button', { name: /^Cart \(1\)$/ })).not.toBeInTheDocument();
    });

    it('reports its own state to assistive technology', async () => {
      const user = userEvent.setup();
      renderNavbar();

      const hamburger = screen.getByRole('button', { name: /toggle menu/i });
      expect(hamburger).toHaveAttribute('aria-expanded', 'false');

      await user.click(hamburger);
      expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
