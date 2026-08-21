import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('./BookCard.jsx', () => ({
  default: ({ book }) => <div data-testid="book-card">{book.title}</div>,
}));

import { books } from '../data/books.js';
import {
  STORAGE_KEY,
  readRecentlyViewed,
  recordBookView,
} from '../utils/recentlyViewed.js';
import RecentlyViewed from './RecentlyViewed.jsx';

const catalogue = books.filter((book) => String(book.id).startsWith('b'));
const [first, second, third] = catalogue;

/**
 * The component is mounted in the layout shell, so it is rendered on every
 * route. These tests mount it the same way.
 */
function renderAt(pathname, props = {}) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <RecentlyViewed {...props} />
      <Routes>
        <Route path="*" element={<span data-testid="page" />} />
      </Routes>
    </MemoryRouter>
  );
}

const titles = () =>
  screen.queryAllByTestId('book-card').map((card) => card.textContent);

describe('RecentlyViewed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('recording', () => {
    it('records the visit, which nothing in the app ever did', async () => {
      renderAt(`/book/${first.id}`);

      await waitFor(() => expect(readRecentlyViewed()).toEqual([first.id]));
    });

    it('moves a revisited book to the front rather than duplicating it', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(['b4', first.id, 'b6'])
      );

      renderAt(`/book/${first.id}`);

      await waitFor(() =>
        expect(readRecentlyViewed()).toEqual([first.id, 'b4', 'b6'])
      );
    });

    it('records an id that is not in the catalogue without throwing', async () => {
      renderAt('/book/not-a-book');

      await waitFor(() => expect(readRecentlyViewed()).toEqual(['not-a-book']));
    });

    it('records nothing on a route that is not a book page', async () => {
      renderAt('/checkout');

      await waitFor(() => expect(readRecentlyViewed()).toEqual([]));
    });
  });

  describe('visibility', () => {
    beforeEach(() => {
      recordBookView(first.id);
      recordBookView(second.id);
    });

    it('shows on the catalogue', () => {
      renderAt('/');
      expect(titles()).toEqual([second.title, first.title]);
    });

    it('shows on a book page', async () => {
      renderAt(`/book/${third.id}`);
      await waitFor(() =>
        expect(titles()).toEqual([second.title, first.title])
      );
    });

    for (const route of ['/login', '/checkout', '/privacy', '/nonsense']) {
      it(`renders nothing on ${route}`, () => {
        // It used to be declared on all of these, because the layout shell
        // mounted it unconditionally.
        const { container } = renderAt(route);
        expect(container.querySelector('.recently-viewed')).toBeNull();
      });
    }
  });

  describe('the current book', () => {
    it('is excluded from its own strip', async () => {
      recordBookView(first.id);
      recordBookView(second.id);

      renderAt(`/book/${second.id}`);

      await waitFor(() => expect(titles()).toEqual([first.title]));
    });

    it('leaves nothing to render when it is the only entry', async () => {
      recordBookView(first.id);

      const { container } = renderAt(`/book/${first.id}`);

      await waitFor(() =>
        expect(container.querySelector('.recently-viewed')).toBeNull()
      );
    });

    it('can still be overridden by the prop', async () => {
      recordBookView(first.id);
      recordBookView(second.id);

      renderAt('/', { currentBookId: second.id });

      await waitFor(() => expect(titles()).toEqual([first.title]));
    });
  });

  describe('resilience', () => {
    it('renders nothing when nothing has been viewed', () => {
      const { container } = renderAt('/');
      expect(container.querySelector('.recently-viewed')).toBeNull();
    });

    it('skips ids that no longer resolve to a book', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([first.id, 'deleted-book', third.id])
      );

      renderAt('/');

      expect(titles()).toEqual([first.title, third.title]);
    });

    it('survives a corrupted stored value', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      window.localStorage.setItem(STORAGE_KEY, '{not json');

      const { container } = renderAt('/');
      expect(container.querySelector('.recently-viewed')).toBeNull();
    });
  });

  describe('markup', () => {
    it('labels the section for assistive technology', () => {
      recordBookView(first.id);
      renderAt('/');

      expect(
        screen.getByRole('region', { name: 'Recently Viewed' })
      ).toBeInTheDocument();
    });

    it('accepts a heading override', () => {
      recordBookView(first.id);
      renderAt('/', { title: 'Pick up where you left off' });

      expect(
        screen.getByRole('heading', { name: 'Pick up where you left off' })
      ).toBeInTheDocument();
    });
  });
});
