import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import * as bookService from '../services/bookService.js';
import {
  STORAGE_KEY,
  readRecentlyViewed,
  recordBookView,
} from '../utils/recentlyViewed.js';
import RecentlyViewed from './RecentlyViewed.jsx';

/**
 * The strip resolves its stored ids against the API.
 *
 * The regression (#336): it resolved them against `src/data/books.js`, the
 * deprecated local snapshot of the catalogue, with
 * `books.find(...)` + `.filter(Boolean)`. That is three bugs in one line — a
 * price edited in the backend never reached the strip, a book added to the
 * backend produced `undefined` and was silently dropped, and the snapshot's
 * missing `inventory` field made every sold-out book look available.
 *
 * The earlier bugs this component had are still covered here: nothing ever
 * wrote the stored list (#318), and it was mounted in the layout shell with
 * no `currentBookId`, so it was declared on the checkout and the login form
 * and a book appeared in its own "recently viewed" strip.
 */

vi.mock('../services/bookService.js', async () => {
  const actual = await vi.importActual('../services/bookService.js');
  return { ...actual, getBooksByIds: vi.fn() };
});

vi.mock('./BookCard.jsx', () => ({
  default: ({ book }) => (
    <div data-testid="book-card" data-price={book.price} data-inventory={book.inventory}>
      {book.title}
    </div>
  ),
}));

/** What the API serves. Deliberately not what the old local file held. */
const CATALOGUE = {
  b1: { id: 'b1', title: 'The Quiet Ones', price: 349, inventory: 8 },
  b2: { id: 'b2', title: 'Field Notes', price: 299, inventory: 10 },
  b3: { id: 'b3', title: 'Half Moon Bay', price: 399, inventory: 0 },
  // A book that exists only in the API — the case the local snapshot could
  // never render, because it has no record for it.
  b9: { id: 'b9', title: 'The Ninth', price: 559, inventory: 4 },
};

const [first, second, third] = [CATALOGUE.b1, CATALOGUE.b2, CATALOGUE.b3];

/** Resolve from CATALOGUE, 404ing anything it does not have. */
function serveCatalogue(overrides = {}) {
  bookService.getBooksByIds.mockImplementation(async (ids) => {
    const books = [];
    const missingIds = [];

    for (const id of ids) {
      const book = overrides[id] ?? CATALOGUE[id];
      if (book) {
        books.push(book);
      } else {
        missingIds.push(id);
      }
    }

    return { books, missingIds, failedIds: [] };
  });
}

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

const strip = () => document.querySelector('.recently-viewed');

describe('RecentlyViewed', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    serveCatalogue();
  });

  describe('recording', () => {
    it('records the visit, which nothing in the app ever did', async () => {
      renderAt(`/book/${first.id}`);

      await waitFor(() => expect(readRecentlyViewed()).toEqual([first.id]));
    });

    it('moves a revisited book to the front rather than duplicating it', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(['b2', first.id, 'b9'])
      );

      renderAt(`/book/${first.id}`);

      await waitFor(() =>
        expect(readRecentlyViewed()).toEqual([first.id, 'b2', 'b9'])
      );
    });

    it('records an id that is not in the catalogue without throwing', async () => {
      renderAt('/book/not-a-book');

      await waitFor(() => expect(readRecentlyViewed()).toContain('not-a-book'));
    });

    it('records nothing on a route that is not a book page', async () => {
      renderAt('/checkout');

      await waitFor(() => expect(readRecentlyViewed()).toEqual([]));
    });
  });

  describe('reading the API rather than the local snapshot', () => {
    it('renders what the API returned', async () => {
      recordBookView(first.id);
      recordBookView(second.id);

      renderAt('/');

      await waitFor(() => expect(titles()).toEqual([second.title, first.title]));
      expect(bookService.getBooksByIds).toHaveBeenCalledWith(
        [second.id, first.id],
        expect.anything()
      );
    });

    it('shows the current price, not the one the snapshot froze', async () => {
      // The exact symptom: the grid updated and the strip below it did not.
      serveCatalogue({ b1: { ...CATALOGUE.b1, price: 999 } });
      recordBookView(first.id);

      renderAt('/');

      await waitFor(() =>
        expect(screen.getByTestId('book-card')).toHaveAttribute('data-price', '999')
      );
    });

    it('carries inventory through, so a sold-out book is not sellable here', async () => {
      // The local file has no `inventory` field at all, and `isInStock()`
      // treats a missing one as available — so the strip offered "Add to
      // cart" for a book the grid above showed as out of stock.
      recordBookView(third.id);

      renderAt('/');

      await waitFor(() =>
        expect(screen.getByTestId('book-card')).toHaveAttribute('data-inventory', '0')
      );
    });

    it('shows a book the snapshot never had', async () => {
      // `books.find(...)` returned undefined for this and `.filter(Boolean)`
      // dropped it: viewed, and then simply absent from the reader's history.
      recordBookView('b9');

      renderAt('/');

      await waitFor(() => expect(titles()).toEqual(['The Ninth']));
    });

    it('keeps the stored order rather than the order responses arrived in', async () => {
      recordBookView('b9');
      recordBookView(second.id);
      recordBookView(first.id);

      // Answer in a deliberately different order.
      bookService.getBooksByIds.mockResolvedValue({
        books: [CATALOGUE.b9, CATALOGUE.b1, CATALOGUE.b2],
        missingIds: [],
        failedIds: [],
      });

      renderAt('/');

      await waitFor(() =>
        expect(titles()).toEqual([first.title, second.title, 'The Ninth'])
      );
    });
  });

  describe('ids the catalogue no longer has', () => {
    it('does not render them', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([first.id, 'delisted', second.id])
      );

      renderAt('/');

      await waitFor(() => expect(titles()).toEqual([first.title, second.title]));
    });

    it('forgets a 404 so it is not re-requested on every page load', async () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([first.id, 'delisted'])
      );

      renderAt('/');

      await waitFor(() => expect(readRecentlyViewed()).toEqual([first.id]));
    });

    it('keeps an id whose request merely failed', async () => {
      // A book that could not be reached probably still exists. Forgetting a
      // reader's history because their connection dropped would be worse than
      // the bug this fixes.
      bookService.getBooksByIds.mockResolvedValue({
        books: [CATALOGUE.b1],
        missingIds: [],
        failedIds: ['b2'],
      });

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['b1', 'b2']));

      renderAt('/');

      await waitFor(() => expect(titles()).toEqual([first.title]));
      expect(readRecentlyViewed()).toEqual(['b1', 'b2']);
    });
  });

  describe('visibility', () => {
    beforeEach(() => {
      recordBookView(first.id);
      recordBookView(second.id);
    });

    it('shows on the catalogue', async () => {
      renderAt('/');
      await waitFor(() => expect(titles()).toEqual([second.title, first.title]));
    });

    it('shows on a book page', async () => {
      renderAt('/book/b9');
      await waitFor(() => expect(titles()).toEqual([second.title, first.title]));
    });

    for (const route of ['/login', '/checkout', '/privacy', '/nonsense']) {
      it(`renders nothing on ${route}`, async () => {
        // It used to be declared on all of these, because the layout shell
        // mounted it unconditionally.
        renderAt(route);

        await waitFor(() => expect(strip()).toBeNull());
        expect(bookService.getBooksByIds).not.toHaveBeenCalled();
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

    it('is not even requested', async () => {
      recordBookView(first.id);
      recordBookView(second.id);

      renderAt(`/book/${second.id}`);

      await waitFor(() => expect(titles()).toEqual([first.title]));
      for (const call of bookService.getBooksByIds.mock.calls) {
        expect(call[0]).not.toContain(second.id);
      }
    });

    it('leaves nothing to render when it is the only entry', async () => {
      recordBookView(first.id);

      renderAt(`/book/${first.id}`);

      await waitFor(() => expect(strip()).toBeNull());
    });

    it('can still be overridden by the prop', async () => {
      recordBookView(first.id);
      recordBookView(second.id);

      renderAt('/', { currentBookId: second.id });

      await waitFor(() => expect(titles()).toEqual([first.title]));
    });
  });

  describe('resilience', () => {
    it('renders nothing when nothing has been viewed', async () => {
      renderAt('/');

      await waitFor(() => expect(strip()).toBeNull());
      expect(bookService.getBooksByIds).not.toHaveBeenCalled();
    });

    it('renders nothing rather than an error panel when the request fails', async () => {
      // This is a nicety at the bottom of a page the reader came for
      // something else. The wishlist page, where the list *is* the page,
      // reports its failures; this does not.
      bookService.getBooksByIds.mockRejectedValue({
        status: 500,
        message: 'Internal server error.',
      });

      recordBookView(first.id);
      renderAt('/');

      await waitFor(() => expect(strip()).toBeNull());
    });

    it('survives a corrupted stored value', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      window.localStorage.setItem(STORAGE_KEY, '{not json');

      renderAt('/');

      await waitFor(() => expect(strip()).toBeNull());
    });
  });

  describe('markup', () => {
    it('labels the section for assistive technology', async () => {
      recordBookView(first.id);
      renderAt('/');

      expect(
        await screen.findByRole('region', { name: 'Recently Viewed' })
      ).toBeInTheDocument();
    });

    it('accepts a heading override', async () => {
      recordBookView(first.id);
      renderAt('/', { title: 'Pick up where you left off' });

      expect(
        await screen.findByRole('heading', { name: 'Pick up where you left off' })
      ).toBeInTheDocument();
    });
  });
});
