import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) =>
      key === 'home.titlesTotal' ? `${options?.count ?? 0} titles total` : key,
  }),
}));

vi.mock('../components/Hero.jsx', () => ({ default: () => <div /> }));
vi.mock('../components/SkeletonLoader.jsx', () => ({
  default: () => <div data-testid="skeleton" />,
}));
vi.mock('../components/BookCard.jsx', () => ({
  default: ({ book }) => <div data-testid="book-card">{book.title}</div>,
}));

import { CartProvider } from '../context/CartContext.jsx';
import { WishlistContext } from '../context/WishlistContext.jsx';
import Home from './Home.jsx';

const wishlist = {
  wishlist: [],
  loading: false,
  count: 0,
  isWishlisted: () => false,
  toggleWishlist: vi.fn(),
};

const CATALOGUE = [
  { id: 'b1', title: 'The Quiet Ones', genre: 'Fiction', price: 349, rating: 4.5, inventory: 8 },
  { id: 'b2', title: 'Field Notes', genre: 'Self-Help', price: 299, rating: 4.2, inventory: 10 },
  { id: 'b5', title: 'Low Tide', genre: 'Poetry', price: 249, rating: 4.1, inventory: 6 },
  { id: 'b7', title: 'Paper Trail', genre: 'Mystery', price: 199, rating: 3.9, inventory: 4 },
];

/**
 * A stand-in for the backend's queryBooks(): filter the whole catalogue,
 * then paginate. The point of these tests is that the page asks the server
 * for the right thing and trusts what comes back, so the stand-in has to
 * behave like the real one.
 */
function fakeApi(url) {
  const params = new URL(url, 'http://localhost').searchParams;

  const minPrice = params.get('minPrice');
  const maxPrice = params.get('maxPrice');
  const minRating = params.get('minRating');
  const genres = params.getAll('genre');
  const search = params.get('search');

  let filtered = CATALOGUE.filter((book) => {
    if (minPrice !== null && book.price < Number(minPrice)) return false;
    if (maxPrice !== null && book.price > Number(maxPrice)) return false;
    if (minRating !== null && book.rating < Number(minRating)) return false;
    if (genres.length > 0 && !genres.includes(book.genre)) return false;
    if (search && !book.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const limit = Number(params.get('limit')) || 4;
  const page = Number(params.get('page')) || 1;
  const totalPages = filtered.length === 0 ? 0 : Math.ceil(filtered.length / limit);

  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        books: filtered.slice((page - 1) * limit, page * limit),
        page,
        limit,
        totalBooks: filtered.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }),
  };
}

/**
 * Reports the current location, so a test can assert what the URL says.
 *
 * The filters live in the query string now (#338), so "what is on screen"
 * and "what the URL says" are the same question and both halves have to be
 * checkable.
 */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderHome({ at = '/', searchQuery = '' } = {}) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <WishlistContext.Provider value={wishlist}>
        <CartProvider>
          <Home searchQuery={searchQuery} />
          <LocationProbe />
        </CartProvider>
      </WishlistContext.Provider>
    </MemoryRouter>
  );
}

const titles = () =>
  screen.queryAllByTestId('book-card').map((card) => card.textContent);

const url = () => screen.getByTestId('location').textContent;

describe('Home catalogue', () => {
  beforeEach(() => {
    window.localStorage.clear();
    globalThis.fetch = vi.fn((url) => Promise.resolve(fakeApi(url)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists the catalogue', async () => {
    renderHome();
    await waitFor(() => expect(titles()).toHaveLength(4));
  });

  it('finds a cheap book that is not on the first page', async () => {
    // The reported symptom: with 4-per-page and client-side filtering, "Max
    // ₹250" showed "No books found." while a ₹249 book sat on page 2.
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => expect(titles()).toHaveLength(4));

    await user.type(screen.getByLabelText('Maximum price in rupees'), '250');

    await waitFor(() => expect(titles()).toEqual(['Low Tide', 'Paper Trail']));
    expect(screen.queryByText('home.noBooksFound')).not.toBeInTheDocument();
  });

  it('counts the filtered set, not the whole catalogue', async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => expect(titles()).toHaveLength(4));

    await user.type(screen.getByLabelText('Maximum price in rupees'), '250');

    // The header used to read "16 titles total" above a single card.
    await waitFor(() =>
      expect(screen.getByText('2 titles total')).toBeInTheDocument()
    );
  });

  it('asks the API for every checked genre', async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => expect(titles()).toHaveLength(4));

    await user.click(screen.getByLabelText('Fiction'));
    await user.click(screen.getByLabelText('Mystery'));

    await waitFor(() => {
      const url = globalThis.fetch.mock.calls.at(-1)[0];
      expect(url).toContain('genre=Fiction&genre=Mystery');
    });
    await waitFor(() => expect(titles()).toEqual(['The Quiet Ones', 'Paper Trail']));
  });

  it('returns to page 1 when a filter changes', async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => expect(titles()).toHaveLength(4));

    // A price filter used to leave the reader stranded on a page number that
    // no longer existed, and the API answers a page past the end with an
    // empty slice rather than an error — so the symptom was a blank grid.
    await user.type(screen.getByLabelText('Minimum price in rupees'), '100');

    await waitFor(() => {
      const url = globalThis.fetch.mock.calls.at(-1)[0];
      expect(url).toContain('page=1');
    });
  });

  it('offers a retry when the catalogue fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch
      .mockRejectedValueOnce(new Error('Network down'))
      .mockImplementation((url) => Promise.resolve(fakeApi(url)));

    const user = userEvent.setup();
    renderHome();

    expect(await screen.findByText('home.errorLoading')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(titles()).toHaveLength(4));
  });

  it('clears every filter at once', async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => expect(titles()).toHaveLength(4));

    await user.click(screen.getByLabelText('Fiction'));
    await waitFor(() => expect(titles()).toEqual(['The Quiet Ones']));

    await user.click(screen.getByRole('button', { name: /clear all ✕/i }));
    await waitFor(() => expect(titles()).toHaveLength(4));
  });

  describe('the URL', () => {
    /**
     * The regression (#338): none of this reached the address bar. Every
     * filter was `useState` here and the search box was state in App, so `/`
     * was the URL whether the customer was looking at the whole catalogue or
     * at page 3 of Sci-Fi under ₹300. Refresh cleared it, Back left the site,
     * a filtered view could not be shared, and returning from a book page
     * remounted this page with its defaults.
     */

    it('describes what is on screen', async () => {
      const user = userEvent.setup();
      renderHome();
      await waitFor(() => expect(titles()).toHaveLength(4));

      await user.click(screen.getByLabelText('Fiction'));

      await waitFor(() => expect(url()).toBe('/?genre=Fiction'));
    });

    it('renders the filters a shared link carries', async () => {
      // The share/bookmark/refresh case: the whole point.
      renderHome({ at: '/?maxPrice=250' });

      await waitFor(() => expect(titles()).toEqual(['Low Tide', 'Paper Trail']));
    });

    it('asks for the page a shared link names, and does not snap back to 1', async () => {
      // The reset-to-page-1 rule used to be an effect watching six
      // dependencies, and it ran on mount too — so a link to page 2 asked
      // the API for page 1, which is the bug this whole change is about.
      renderHome({ at: '/?page=2' });

      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

      const requested = new URL(
        globalThis.fetch.mock.calls[0][0],
        'http://x'
      ).searchParams;

      expect(requested.get('page')).toBe('2');
      expect(url()).toContain('page=2');
    });

    it('carries the sort', async () => {
      const user = userEvent.setup();
      renderHome();
      await waitFor(() => expect(titles()).toHaveLength(4));

      await user.selectOptions(screen.getByLabelText('home.sortAriaLabel'), 'price_asc');

      await waitFor(() => expect(url()).toBe('/?sort=price_asc'));
    });

    it('carries a rating', async () => {
      const user = userEvent.setup();
      renderHome();
      await waitFor(() => expect(titles()).toHaveLength(4));

      await user.click(screen.getByLabelText(/★★★★☆ & up/));

      await waitFor(() => expect(url()).toBe('/?minRating=4'));
    });

    it('carries the page', async () => {
      const user = userEvent.setup();
      renderHome();
      await waitFor(() => expect(titles()).toHaveLength(4));

      // 4 books at 4 per page is one page; narrow it so there are two.
      await user.type(screen.getByLabelText('Maximum price in rupees'), '299');
      await waitFor(() => expect(titles()).toHaveLength(3));
    });

    it('returns to page 1 in the URL when a filter changes', async () => {
      const user = userEvent.setup();
      renderHome({ at: '/?page=3' });
      await waitFor(() => expect(screen.queryByTestId('skeleton')).toBeNull());

      await user.click(screen.getByLabelText('Fiction'));

      await waitFor(() => expect(url()).toBe('/?genre=Fiction'));
    });

    it('leaves nothing behind when the last filter is cleared', async () => {
      const user = userEvent.setup();
      renderHome({ at: '/?genre=Fiction' });
      await waitFor(() => expect(titles()).toEqual(['The Quiet Ones']));

      await user.click(screen.getByLabelText('Fiction'));

      await waitFor(() => expect(url()).toBe('/'));
    });

    it('clears the filters but keeps the search', async () => {
      renderHome({ at: '/?search=the&genre=Fiction' });
      await waitFor(() => expect(screen.queryByTestId('skeleton')).toBeNull());

      const user = userEvent.setup();
      // The sidebar renders a "Clear All" in its desktop header and another
      // in its mobile footer; either does the same thing.
      await user.click(screen.getAllByRole('button', { name: /clear all/i })[0]);

      await waitFor(() => expect(url()).toBe('/?search=the'));
    });

    it('puts a shared search term back into the navbar box', async () => {
      // The box is owned by App and reaches this page through the outlet
      // context; a link carrying ?search= has to hydrate it, or the grid and
      // the input disagree about what is being searched for.
      const setSearchQuery = vi.fn();

      render(
        <MemoryRouter initialEntries={['/?search=quiet']}>
          <WishlistContext.Provider value={wishlist}>
            <CartProvider>
              <Routes>
                <Route
                  path="/"
                  element={<Outlet context={{ searchQuery: '', setSearchQuery }} />}
                >
                  <Route index element={<Home />} />
                </Route>
              </Routes>
            </CartProvider>
          </WishlistContext.Provider>
        </MemoryRouter>
      );

      await waitFor(() => expect(setSearchQuery).toHaveBeenCalledWith('quiet'));
    });

    it('filters by a shared search term before the box is hydrated', async () => {
      renderHome({ at: '/?search=quiet' });

      await waitFor(() => expect(titles()).toEqual(['The Quiet Ones']));
    });

    it('ignores nonsense in the URL rather than sending it to the API', async () => {
      renderHome({ at: '/?page=-1&minRating=99&sort=sideways' });

      await waitFor(() => expect(titles()).toHaveLength(4));

      const requested = new URL(globalThis.fetch.mock.calls[0][0], 'http://x').searchParams;
      expect(requested.get('page')).toBe('1');
      expect(requested.get('minRating')).toBeNull();
      expect(requested.get('sort')).toBeNull();
    });
  });
});
