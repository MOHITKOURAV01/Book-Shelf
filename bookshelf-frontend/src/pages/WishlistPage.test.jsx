import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';

import WishlistPage from './WishlistPage.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';
import * as bookService from '../services/bookService.js';
import { createI18nForTests } from '../test/i18nTestInstance.js';

/**
 * The regression: this page filtered `src/data/books.js`, a hardcoded copy of
 * the catalogue that no longer matches the API. A wishlisted book the file
 * did not have vanished silently; the eight `s*` ids that exist only in the
 * file rendered cards for books the API 404s. See #328.
 */

vi.mock('../services/bookService.js', async () => {
  const actual = await vi.importActual('../services/bookService.js');
  return { ...actual, getBooksByIds: vi.fn() };
});

vi.mock('../components/SkeletonLoader.jsx', () => ({
  default: () => <div data-testid="skeleton">loading</div>,
}));

/*
 * BookCard is stubbed. It pulls in useCart and WishlistButton, which would
 * make every test here require a CartProvider — these tests are about which
 * books the page resolves and in what order, not about how a card renders.
 */
vi.mock('../components/BookCard.jsx', () => ({
  default: ({ book }) => <h3 data-testid="book-card">{book.title}</h3>,
}));

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const quietOnes = {
  id: 'b1',
  title: 'The Quiet Ones',
  author: 'A. Writer',
  price: 349,
  rating: 4.5,
  inventory: 8,
  genre: 'Fiction',
};

const fieldNotes = {
  id: 'b2',
  title: 'Field Notes',
  author: 'B. Author',
  price: 199,
  rating: 4.1,
  inventory: 10,
  genre: 'Nonfiction',
};

/*
 * As in OrderHistory.test.jsx: a real i18next instance, so a key that does
 * not resolve shows up as a failing assertion rather than as the literal
 * default the uninitialised `t` hands back. See #367.
 */
function renderPage({
  wishlist = [],
  loading = false,
  toggleWishlist = vi.fn(),
  language = 'en',
} = {}) {
  const value = {
    wishlist,
    loading,
    toggleWishlist,
    isWishlisted: (id) => wishlist.includes(id),
    count: wishlist.length,
  };

  return render(
    <I18nextProvider i18n={createI18nForTests(language)}>
      <MemoryRouter>
        <WishlistContext.Provider value={value}>
          <WishlistPage />
        </WishlistContext.Provider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('WishlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders books from the API, not from the local copy', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes, fieldNotes],
      missingIds: [],
      failedIds: [],
    });

    renderPage({ wishlist: ['b1', 'b2'] });

    expect(await screen.findByText('The Quiet Ones')).toBeInTheDocument();
    expect(screen.getByText('Field Notes')).toBeInTheDocument();
    expect(bookService.getBooksByIds).toHaveBeenCalledWith(
      ['b1', 'b2'],
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('keeps the wishlist order regardless of which response landed first', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      // Returned back to front.
      books: [fieldNotes, quietOnes],
      missingIds: [],
      failedIds: [],
    });

    renderPage({ wishlist: ['b1', 'b2'] });

    await screen.findByText('The Quiet Ones');
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings.indexOf('The Quiet Ones')).toBeLessThan(headings.indexOf('Field Notes'));
  });

  it('says so when a saved book is no longer in the catalogue, instead of dropping it', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes],
      missingIds: ['s3'],
      failedIds: [],
    });

    renderPage({ wishlist: ['b1', 's3'] });

    expect(
      await screen.findByText('1 saved book is no longer in the catalogue.')
    ).toBeInTheDocument();
  });

  it('offers to clear the stale ids, and clears them', async () => {
    const user = userEvent.setup();
    const toggleWishlist = vi.fn();

    bookService.getBooksByIds.mockResolvedValue({
      books: [],
      missingIds: ['s3', 's4'],
      failedIds: [],
    });

    renderPage({ wishlist: ['s3', 's4'], toggleWishlist });

    await user.click(
      await screen.findByRole('button', { name: 'Remove them from my wishlist' })
    );

    expect(toggleWishlist).toHaveBeenCalledWith('s3');
    expect(toggleWishlist).toHaveBeenCalledWith('s4');
    expect(toggleWishlist).toHaveBeenCalledTimes(2);
  });

  it('does not offer to remove a book that merely failed to load', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [],
      missingIds: [],
      failedIds: ['b1'],
    });

    renderPage({ wishlist: ['b1'] });

    expect(
      await screen.findByText(
        '1 saved book could not be loaded just now. It has not been removed.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Remove it from my wishlist/ })
    ).not.toBeInTheDocument();
  });

  it('shows an error rather than an empty wishlist when the request fails', async () => {
    bookService.getBooksByIds.mockRejectedValue({
      status: 500,
      message: 'Internal server error. Our team has been notified.',
    });

    renderPage({ wishlist: ['b1'] });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Internal server error. Our team has been notified.'
    );
    expect(screen.queryByText('Your wishlist is currently empty.')).not.toBeInTheDocument();
  });

  it('shows the empty state for a genuinely empty wishlist without calling the API', async () => {
    renderPage({ wishlist: [] });

    expect(await screen.findByText('Your wishlist is currently empty.')).toBeInTheDocument();
    expect(bookService.getBooksByIds).not.toHaveBeenCalled();
  });

  it('waits for the wishlist itself before deciding it is empty', () => {
    // A signed-in user's wishlist is a round trip of its own; resolving the
    // interim empty list would flash "your wishlist is empty" at them.
    renderPage({ wishlist: [], loading: true });

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Your wishlist is currently empty.')).not.toBeInTheDocument();
  });

  it('reports the count of books it actually resolved', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes],
      missingIds: ['s3'],
      failedIds: [],
    });

    renderPage({ wishlist: ['b1', 's3'] });

    await waitFor(() => expect(screen.getByText('1 item')).toBeInTheDocument());
  });
});

/*
 * Same omission as OrderHistory, same first render, same crash:
 * `useTranslation` imported, `t(...)` called four times, the hook never
 * called. All 9 tests above failed with `ReferenceError: t is not defined`.
 * See #367.
 *
 * These cover the strings the page was still building by hand next to the
 * translated ones — the item count and the three notices.
 */
describe('WishlistPage in other languages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('translates the heading and the item count together', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes, fieldNotes],
      missingIds: [],
      failedIds: [],
    });

    renderPage({ wishlist: ['b1', 'b2'], language: 'es' });

    expect(
      await screen.findByRole('heading', { name: 'Mi Lista de Deseos' })
    ).toBeInTheDocument();
    // The count was `${count} items`, a template literal, directly under it.
    expect(screen.getByText('2 artículos')).toBeInTheDocument();
  });

  it('picks the singular form for one item', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes],
      missingIds: [],
      failedIds: [],
    });

    renderPage({ wishlist: ['b1'], language: 'fr' });

    expect(await screen.findByText('1 article')).toBeInTheDocument();
  });

  it('translates the stale-id notice and its button', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes],
      missingIds: ['s3', 's4'],
      failedIds: [],
    });

    renderPage({ wishlist: ['b1', 's3', 's4'], language: 'es' });

    expect(
      await screen.findByText('2 libros guardados ya no están en el catálogo.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Quitarlos de mi lista de deseos' })
    ).toBeInTheDocument();
  });

  it('translates the could-not-load notice', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes],
      missingIds: [],
      failedIds: ['b9'],
    });

    renderPage({ wishlist: ['b1', 'b9'], language: 'fr' });

    expect(
      await screen.findByText(/n’a pas pu être chargé pour le moment/)
    ).toBeInTheDocument();
  });

  it('translates the empty state', async () => {
    renderPage({ wishlist: [], language: 'es' });

    expect(
      await screen.findByText('Tu lista de deseos está vacía')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Explorar Catálogo' })
    ).toBeInTheDocument();
  });

  it('renders no raw translation keys', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [quietOnes],
      missingIds: ['s3'],
      failedIds: ['b9'],
    });

    const { container } = renderPage({
      wishlist: ['b1', 's3', 'b9'],
      language: 'fr',
    });
    await screen.findByText('The Quiet Ones');

    expect(container.textContent).not.toMatch(/\b(wishlist|common)\.[a-zA-Z]/);
  });
});
