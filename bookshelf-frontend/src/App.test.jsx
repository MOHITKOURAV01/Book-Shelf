import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';

/*
 * The layout shell, not the pages. Everything App mounts that has its own
 * behaviour is stubbed, because what is being asserted here is the wiring:
 * that there is one focusable content wrapper, that the skip link points at
 * it, and that a navigation resets scroll and moves focus into it. See #339.
 */

vi.mock('./components/CustomCursor.jsx', () => ({ default: () => null }));
vi.mock('./components/RecentlyViewed.jsx', () => ({ default: () => null }));
vi.mock('./components/CartDrawer.jsx', () => ({ default: () => null }));
vi.mock('./components/Footer.jsx', () => ({ default: () => <footer /> }));
vi.mock('./components/BackToTopButton.jsx', () => ({ default: () => null }));

vi.mock('./components/Navbar.jsx', () => ({
  default: () => (
    <nav>
      <Link to="/">brand</Link>
      <Link to="/wishlist">wishlist</Link>
      <input aria-label="Search" />
      <button type="button">cart</button>
    </nav>
  ),
}));

const { default: App } = await import('./App.jsx');

let scrollTo;

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<main><h1>home</h1></main>} />
          <Route path="wishlist" element={<main><h1>wishlist</h1></main>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  scrollTo = vi.fn();
  window.scrollTo = scrollTo;
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App layout', () => {
  it('gives every route one focusable content wrapper', () => {
    // Pages own their own <main> — six render one, five render none — so
    // there was no single element a skip link or a focus move could target.
    renderApp();

    const content = document.getElementById('main-content');

    expect(content).not.toBeNull();
    expect(content).toHaveAttribute('tabindex', '-1');
    expect(content).toContainElement(screen.getByRole('heading', { name: 'home' }));
  });

  it('does not nest a second main landmark', () => {
    // The wrapper is a <div>. Two `main` landmarks is worse for a screen
    // reader than one unlabelled container.
    renderApp();

    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('puts the skip link before the navbar in the tab order', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.tab();

    expect(document.activeElement).toBe(
      screen.getByRole('link', { name: 'Skip to content' })
    );
  });

  it('skips the whole navbar in one keystroke', async () => {
    // The alternative was twelve to fourteen tab stops, on every page.
    const user = userEvent.setup();
    renderApp();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });

  it('resets scroll and moves focus on a navigation', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('link', { name: 'wishlist' }));

    expect(await screen.findByRole('heading', { name: 'wishlist' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });

  it('does not steal focus on the initial load', () => {
    // Nobody navigated, so nothing needs announcing.
    renderApp();

    expect(document.activeElement).toBe(document.body);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
