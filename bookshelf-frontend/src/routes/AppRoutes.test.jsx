import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';

/*
 * These tests are about the route table, not about the pages, so every page
 * is stubbed. The regression they guard is structural: the app used to have a
 * <Routes> inside main.jsx and a second <Routes> inside App, with the outer
 * one declared as `path="/"` rather than `path="/*"`. That meant none of the
 * inner routes could ever match — /book/:id and friends rendered nothing.
 */

vi.mock('../App.jsx', () => ({
  default: () => (
    <div>
      <nav data-testid="navbar">navbar</nav>
      <Outlet />
      <footer data-testid="footer">footer</footer>
    </div>
  ),
}));

vi.mock('../components/ProtectedRoute.jsx', () => ({
  default: ({ children }) => <div data-testid="protected">{children}</div>,
}));

const stub = (name) => ({ default: () => <div>{name}</div> });

vi.mock('../pages/Home.jsx', () => stub('home-page'));
vi.mock('../pages/BookDetail.jsx', () => stub('book-detail-page'));
vi.mock('../pages/WishlistPage.jsx', () => stub('wishlist-page'));
vi.mock('../pages/OrderHistory.jsx', () => stub('order-history-page'));
vi.mock('../pages/OrderDetailsPage.jsx', () => stub('order-details-page'));
vi.mock('../pages/OrderConfirmation.jsx', () => stub('order-confirmation-page'));
vi.mock('../pages/Checkout.jsx', () => stub('checkout-page'));
vi.mock('../pages/Profile.jsx', () => stub('profile-page'));
vi.mock('../pages/Login.jsx', () => stub('login-page'));
vi.mock('../pages/Register.jsx', () => stub('register-page'));
vi.mock('../pages/AboutUs.jsx', () => stub('about-page'));
vi.mock('../pages/PrivacyPolicy.jsx', () => stub('privacy-page'));
vi.mock('../pages/TermsOfService.jsx', () => stub('terms-page'));
vi.mock('../pages/NotFound.jsx', () => stub('not-found-page'));

const { default: AppRoutes } = await import('./AppRoutes.jsx');

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('AppRoutes', () => {
  it('renders the home page at /', () => {
    renderAt('/');
    expect(screen.getByText('home-page')).toBeInTheDocument();
  });

  it.each([
    ['/book/b1', 'book-detail-page'],
    ['/wishlist', 'wishlist-page'],
    ['/about', 'about-page'],
    ['/privacy', 'privacy-page'],
    ['/terms', 'terms-page'],
    ['/login', 'login-page'],
    ['/register', 'register-page'],
  ])('resolves %s', (path, expected) => {
    renderAt(path);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    ['/profile', 'profile-page'],
    ['/checkout', 'checkout-page'],
    ['/order-confirmation', 'order-confirmation-page'],
    ['/orders', 'order-history-page'],
    ['/account/orders/abc123', 'order-details-page'],
  ])('resolves %s behind ProtectedRoute', (path, expected) => {
    renderAt(path);
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('keeps the layout mounted on a nested route', () => {
    renderAt('/book/b1');
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('renders the layout exactly once, not once per page', () => {
    renderAt('/wishlist');
    expect(screen.getAllByTestId('navbar')).toHaveLength(1);
    expect(screen.getAllByTestId('footer')).toHaveLength(1);
  });

  it('redirects the retired /account/orders path to the one order history', () => {
    renderAt('/account/orders');
    expect(screen.getByText('order-history-page')).toBeInTheDocument();
    expect(screen.queryByText('orders-page')).not.toBeInTheDocument();
  });

  it('redirects the retired /signup path to /register', () => {
    renderAt('/signup');
    expect(screen.getByText('register-page')).toBeInTheDocument();
  });

  it('falls through to NotFound for an unknown path', () => {
    renderAt('/no/such/page');
    expect(screen.getByText('not-found-page')).toBeInTheDocument();
  });

  it('shows NotFound inside the layout rather than replacing it', () => {
    renderAt('/no/such/page');
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });
});
