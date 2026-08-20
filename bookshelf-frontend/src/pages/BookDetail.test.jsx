import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const getBookById = vi.fn();
const getBooks = vi.fn();

vi.mock('../services/bookService.js', async () => {
  const actual = await vi.importActual('../services/bookService.js');
  return {
    ...actual,
    getBookById: (...args) => getBookById(...args),
    getBooks: (...args) => getBooks(...args),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: () => '' }),
}));

vi.mock('../components/SkeletonLoader.jsx', () => ({
  default: () => <div data-testid="skeleton" />,
}));

import { BookNotFoundError } from '../services/bookService.js';
import { CartProvider } from '../context/CartContext.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';
import BookDetail from './BookDetail.jsx';

const wishlist = {
  wishlist: [],
  loading: false,
  count: 0,
  isWishlisted: () => false,
  toggleWishlist: vi.fn(),
};

const BOOK = {
  id: 'b1',
  title: 'The Quiet Ones',
  author: 'M. Arora',
  genre: 'Fiction',
  price: 349,
  rating: 4.5,
  cover: '#7A2E2E',
  inventory: 8,
};

function renderDetail(bookId = 'b1') {
  window.localStorage.clear();

  return render(
    <MemoryRouter initialEntries={[`/book/${bookId}`]}>
      <WishlistContext.Provider value={wishlist}>
        <CartProvider>
          <Routes>
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/" element={<h1>home</h1>} />
          </Routes>
        </CartProvider>
      </WishlistContext.Provider>
    </MemoryRouter>
  );
}

describe('BookDetail', () => {
  beforeEach(() => {
    getBookById.mockReset();
    getBooks.mockReset();
    getBooks.mockResolvedValue({ books: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the book from the API, not the hardcoded frontend copy', async () => {
    // A price that differs from src/data/books.js proves which source won.
    getBookById.mockResolvedValue({ ...BOOK, price: 999 });

    renderDetail('b1');

    expect(await screen.findByRole('heading', { name: 'The Quiet Ones' })).toBeInTheDocument();
    expect(getBookById).toHaveBeenCalledWith('b1', expect.anything());
    expect(screen.getByText('₹999')).toBeInTheDocument();
    expect(screen.queryByText('₹349')).not.toBeInTheDocument();
  });

  it('shows a real skeleton while the request is in flight, not a 700ms timer', () => {
    getBookById.mockReturnValue(new Promise(() => {}));

    renderDetail('b1');

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders a book the local copy has never heard of', async () => {
    getBookById.mockResolvedValue({
      ...BOOK,
      id: 'b9',
      title: 'A Ninth Book',
    });

    renderDetail('b9');

    expect(await screen.findByRole('heading', { name: 'A Ninth Book' })).toBeInTheDocument();
  });

  it('says "not found" only for a genuine 404', async () => {
    getBookById.mockRejectedValue(new BookNotFoundError('b99'));

    renderDetail('b99');

    expect(await screen.findByRole('heading', { name: /book not found/i })).toBeInTheDocument();
  });

  it('offers a retry rather than "not found" when the request failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getBookById.mockRejectedValueOnce({ status: 500, message: 'Server error' });
    getBookById.mockResolvedValueOnce(BOOK);

    const user = userEvent.setup();
    renderDetail('b1');

    expect(await screen.findByRole('heading', { name: /could not load/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /book not found/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: 'The Quiet Ones' })).toBeInTheDocument();
  });

  it('shows stock, which the local copy does not carry at all', async () => {
    getBookById.mockResolvedValue({ ...BOOK, inventory: 2 });

    renderDetail('b1');

    expect(await screen.findByText('Only 2 left')).toBeInTheDocument();
  });

  it('refuses to add a sold-out book to the cart', async () => {
    getBookById.mockResolvedValue({ ...BOOK, inventory: 0 });

    renderDetail('b1');

    const button = await screen.findByRole('button', { name: /out of stock/i });
    expect(button).toBeDisabled();
    expect(screen.getByText('Out of stock', { selector: 'span' })).toBeInTheDocument();
  });

  it('renders a book with no rating instead of throwing on toFixed', async () => {
    const { rating, ...withoutRating } = BOOK;
    getBookById.mockResolvedValue(withoutRating);

    renderDetail('b1');

    expect(await screen.findByRole('heading', { name: 'The Quiet Ones' })).toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it('asks the API for related books in the same genre', async () => {
    getBookById.mockResolvedValue(BOOK);
    getBooks.mockResolvedValue({
      books: [BOOK, { ...BOOK, id: 'b7', title: 'Another Fiction' }],
    });

    renderDetail('b1');

    await waitFor(() =>
      expect(getBooks).toHaveBeenCalledWith(
        { genre: 'Fiction', limit: 5 },
        expect.anything()
      )
    );

    // BookCard prints the title on the cover and again in the body, so this
    // is a findAll rather than a findBy.
    expect((await screen.findAllByText('Another Fiction')).length).toBeGreaterThan(0);

    // The book being viewed is excluded from its own related list.
    const relatedGrid = document.querySelector('.book-related-grid');
    expect(within(relatedGrid).queryByText('The Quiet Ones')).not.toBeInTheDocument();
  });

  it('still renders the book when related books fail to load', async () => {
    getBookById.mockResolvedValue(BOOK);
    getBooks.mockRejectedValue({ status: 500, message: 'nope' });

    renderDetail('b1');

    expect(await screen.findByRole('heading', { name: 'The Quiet Ones' })).toBeInTheDocument();
  });

  it('requires a star rating before a review can be submitted', async () => {
    getBookById.mockResolvedValue(BOOK);
    const user = userEvent.setup();

    renderDetail('b1');
    await screen.findByRole('heading', { name: 'The Quiet Ones' });

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/select a rating/i)).toBeInTheDocument();
  });
});
