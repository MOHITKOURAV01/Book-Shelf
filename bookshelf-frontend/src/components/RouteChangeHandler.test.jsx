import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { useRef } from 'react';

import RouteChangeHandler from './RouteChangeHandler.jsx';

/**
 * Scroll and focus on navigation.
 *
 * The regression (#339): neither happened. App.jsx rendered a component
 * called `ScrollToTop`, which reads as though scroll restoration were
 * handled — it is a floating back-to-top button that never looks at the
 * location. A pushState navigation does not reset the scroll offset on its
 * own, so every page inherited the last one's: open a book from the bottom of
 * the catalogue and the book page arrives already scrolled past its own
 * title. Focus was left behind the same way, so the next Tab restarted from
 * the top of the navbar.
 */

let scrollTo;

function Harness({ initialEntry = '/' } = {}) {
  const contentRef = useRef(null);

  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <RouteChangeHandler contentRef={contentRef} />
      <nav>
        <Link to="/book/b1">book</Link>
        <Link to="/wishlist">wishlist</Link>
        <Link to="/#catalog">catalog</Link>
        <Link to="/?page=2">page two</Link>
      </nav>
      <div id="main-content" ref={contentRef} tabIndex={-1}>
        <Routes>
          <Route path="/" element={<h1>home</h1>} />
          <Route path="/book/:id" element={<h1>book</h1>} />
          <Route path="/wishlist" element={<h1>wishlist</h1>} />
        </Routes>
      </div>
    </MemoryRouter>
  );
}

beforeEach(() => {
  scrollTo = vi.fn();
  window.scrollTo = scrollTo;

  // jsdom has no matchMedia; the default is "no reduced-motion preference".
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RouteChangeHandler', () => {
  it('does nothing on the first render', () => {
    // A page load is not a navigation. The browser is already where it should
    // be — and may deliberately not be at the top, because a reload mid-page
    // restores the offset. Stealing focus on arrival would be wrong too:
    // nobody navigated, so nothing needs announcing.
    render(<Harness />);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it('scrolls to the top on a navigation', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'book' }));

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, left: 0 })
    );
  });

  it('moves focus to the content', async () => {
    // So the next Tab continues from where the content starts, instead of
    // restarting at the top of the navbar.
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'wishlist' }));

    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });

  it('focuses without scrolling, so it does not undo the reset', async () => {
    // Focusing an element scrolls it into view by default, and this container
    // starts below a fixed navbar — which would put the page back a hundred
    // pixels from where the scroll reset just put it.
    const user = userEvent.setup();
    render(<Harness />);

    const content = document.getElementById('main-content');
    const focus = vi.spyOn(content, 'focus');

    await user.click(screen.getByRole('link', { name: 'book' }));

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('leaves a hash navigation alone', async () => {
    // `/#catalog` from a book page means "go home and scroll to the
    // catalogue", and Navbar's own effect does that. Scrolling to the top
    // here would fight it, and whichever ran last would win.
    const user = userEvent.setup();
    render(<Harness initialEntry="/book/b1" />);

    await user.click(screen.getByRole('link', { name: 'catalog' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('reacts to a query-string change, not just a path change', async () => {
    // Paging the catalogue changes only `?page=`, and page 2 should start at
    // the top of page 2.
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'page two' }));

    expect(scrollTo).toHaveBeenCalled();
  });

  it('scrolls instantly when the reader prefers reduced motion', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'book' }));

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' })
    );
  });

  it('scrolls smoothly when they do not', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'book' }));

    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    );
  });

  it('falls back to the two-argument form when options are not supported', async () => {
    // `scrollTo({...})` is not universally implemented, and this runs from an
    // effect — where an exception takes the tree down. That is the lesson of
    // the unguarded scrollIntoView in Navbar, which was failing half the test
    // runs on main.
    window.scrollTo = vi.fn((arg) => {
      if (typeof arg === 'object') {
        throw new TypeError('not supported');
      }
    });

    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'book' }));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('survives a browser that cannot scroll at all', async () => {
    window.scrollTo = vi.fn(() => {
      throw new Error('nope');
    });

    const user = userEvent.setup();

    expect(() => render(<Harness />)).not.toThrow();
    await expect(
      user.click(screen.getByRole('link', { name: 'book' }))
    ).resolves.not.toThrow();
  });

  it('survives a content element that is not there', async () => {
    // The ref is null until the layout has mounted its wrapper, and a
    // navigation must not depend on that having happened.
    function NoContent() {
      const contentRef = useRef(null);

      return (
        <MemoryRouter>
          <RouteChangeHandler contentRef={contentRef} />
          <Link to="/elsewhere">go</Link>
        </MemoryRouter>
      );
    }

    const user = userEvent.setup();
    render(<NoContent />);

    await user.click(screen.getByRole('link', { name: 'go' }));

    expect(scrollTo).toHaveBeenCalled();
  });

  it('renders nothing of its own', () => {
    const { container } = render(<Harness />);

    // It is behaviour, not markup — the layout's DOM is exactly what the
    // layout put there.
    expect(container.querySelector('#main-content')).not.toBeNull();
    expect(container.textContent).not.toContain('undefined');
  });
});
