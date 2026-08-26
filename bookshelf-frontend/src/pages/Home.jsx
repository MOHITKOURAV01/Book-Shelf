import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Hero from '../components/Hero.jsx';
import FilterSidebar from '../components/FilterSidebar.jsx';
import BookCard from '../components/BookCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { useBookCatalog } from '../hooks/useBookCatalog.js';
import { useCatalogFilters } from '../hooks/useCatalogFilters.js';
import { hasActiveFilters } from '../utils/catalogQuery.js';
import { currencySymbol } from '../utils/currency.js';

// Genre list is static because the catalogue is. GET /api/books/genres
// exists and returns these with counts; wiring it up is a separate change.
const ALL_GENRES = ['All', 'Fiction', 'Sci-Fi', 'Mystery', 'Self-Help', 'Poetry'];

const PAGE_SIZE = 4;

export default function Home({ searchQuery: searchQueryProp }) {
  const { t } = useTranslation();

  /*
   * The filters live in the URL now, not in `useState` here.
   *
   * They used to be six pieces of component state, so the address bar read
   * `/` whether the customer was looking at the whole catalogue or at page 3
   * of Sci-Fi under ₹300 rated 4 and up. A refresh cleared everything, Back
   * left the site rather than undoing a filter, a filtered view could not be
   * shared, and — worst of the four — opening a book and pressing Back
   * remounted this page with its defaults, so the search text and the page
   * were gone. See #338.
   *
   * There is deliberately no mirrored copy in state. The URL being the only
   * source of truth is what makes Back and Forward work with nothing to keep
   * in sync.
   */
  const { filters, setGenre, setMinPrice, setMaxPrice, setMinRating, setSort, setPage, setSearch, clearFilters } =
    useCatalogFilters();

  /*
   * The search box lives in the navbar, which the App layout renders, so its
   * value reaches this page through the outlet context. The prop is kept as
   * an override so Home can still be rendered standalone in tests.
   *
   * Two directions to reconcile, and they are not symmetric:
   *
   *   - URL to box, once. Landing on `/?search=mystery` — a bookmark, a
   *     shared link, a Back — has to put the text back in the input, which
   *     App owns.
   *   - Box to URL, on every change. Typing is what drives the search, and it
   *     is written with `replace: true` so seven keystrokes are one history
   *     entry rather than seven.
   */
  const outletContext = useOutletContext();
  const setSearchQuery = outletContext?.setSearchQuery;
  const searchQuery = searchQueryProp ?? outletContext?.searchQuery ?? '';

  const hydrated = useRef(false);
  const lastTyped = useRef(searchQuery);

  useEffect(() => {
    if (hydrated.current) {
      return;
    }

    hydrated.current = true;

    // Only when the URL has something to say. An empty parameter must not
    // clear a box the customer has already typed into — which is what
    // happens on a client-side navigation back to `/`.
    if (filters.search !== '' && filters.search !== searchQuery && setSearchQuery) {
      lastTyped.current = filters.search;
      setSearchQuery(filters.search);
    }
  }, [filters.search, searchQuery, setSearchQuery]);

  /*
   * Box to URL, on a *change* to the box rather than on any divergence
   * between the two.
   *
   * The difference matters. Writing whenever they differ makes the box
   * authoritative, so an empty box overwrites a `?search=` that arrived in a
   * shared link — and "Clear filters", which deliberately keeps the search,
   * would have it wiped a render later by a box that never caught up. The
   * URL is the source of truth; the box only pushes when the customer types
   * into it.
   */
  useEffect(() => {
    if (searchQuery === lastTyped.current) {
      return;
    }

    lastTyped.current = searchQuery;
    setSearch(searchQuery.trim());
  }, [searchQuery, setSearch]);

  // The search the *grid* is filtered by is the URL's, so a shared link shows
  // the shared results even before the box has been hydrated.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The active-filter chips said "Min ₹250" whatever the shop was priced in.
  // See #335.
  const symbol = currencySymbol();

  const catalogFilters = useMemo(
    () => ({
      search: filters.search,
      genres: filters.genres,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      sort: filters.sort,
      page: filters.page,
      limit: PAGE_SIZE,
    }),
    [
      filters.search,
      filters.genres,
      filters.minPrice,
      filters.maxPrice,
      filters.minRating,
      filters.sort,
      filters.page,
    ]
  );

  /*
   * Every filter goes to the API, which filters the whole catalogue and then
   * paginates it. Previously the price, rating and multi-genre filters ran in
   * a useMemo over the four books the server had already paged down to — so
   * "Max ₹250" showed "No books found." while a ₹249 book sat on page 2, and
   * the header still read "16 titles total" above it. See #319.
   */
  const { books, totalBooks, totalPages, loading, error, reload } =
    useBookCatalog(catalogFilters);

  const filtersActive = hasActiveFilters({
    genres: filters.genres,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
  });

  /*
   * Returning to page 1 when the query changes is `useCatalogFilters`'s job
   * now, applied at the point of change rather than by an effect watching six
   * dependencies afterwards.
   *
   * That matters here: an effect would run on mount too, and stamp on the
   * page number that came out of the URL. `/?search=mystery&page=2` would
   * render page 2 for one frame and then jump to page 1, which is exactly the
   * bug this whole change is about.
   */

  const handlePageChange = (page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Hero />
      <main className="catalog" id="catalog">
        <div className="catalog__inner">

          <div className="catalog__header">
            <h2 className="catalog__title">{t('home.featuredTitle')}</h2>
            {/* Counts the filtered set, because the server counted it. */}
            <p className="catalog__count">
              {t('home.titlesTotal', { count: totalBooks })}
            </p>
          </div>

          <div className="catalog__layout">

            <FilterSidebar
              genres={ALL_GENRES}
              selectedGenres={filters.genres}
              onGenreChange={setGenre}
              minPrice={filters.minPrice}
              onMinPriceChange={setMinPrice}
              maxPrice={filters.maxPrice}
              onMaxPriceChange={setMaxPrice}
              minRating={filters.minRating}
              onMinRatingChange={setMinRating}
              onClearFilters={clearFilters}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen((open) => !open)}
            />

            <div className="catalog__grid-container">

              <div className="catalog__controls">
                <select
                  id="sort-select"
                  className="catalog__sort-select"
                  value={filters.sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label={t('home.sortAriaLabel')}
                >
                  <option value="">{t('home.sortDefault')}</option>
                  <option value="price_asc">{t('home.sortPriceAsc')}</option>
                  <option value="price_desc">{t('home.sortPriceDesc')}</option>
                  <option value="rating_desc">{t('home.sortRatingDesc')}</option>
                  <option value="title_asc">{t('home.sortTitleAsc')}</option>
                </select>
              </div>

              {filtersActive && (
                <div className="catalog__filter-summary">
                  <span>Active filters:</span>
                  {filters.genres.map((genre) => (
                    <span key={genre} className="catalog__filter-tag">
                      {genre}
                      <button
                        onClick={() => setGenre(genre, false)}
                        aria-label={`Remove ${genre} filter`}
                      >✕</button>
                    </span>
                  ))}
                  {filters.minPrice !== '' && (
                    <span className="catalog__filter-tag">
                      Min {symbol}{filters.minPrice}
                      <button onClick={() => setMinPrice('')} aria-label="Remove min price filter">✕</button>
                    </span>
                  )}
                  {filters.maxPrice !== '' && (
                    <span className="catalog__filter-tag">
                      Max {symbol}{filters.maxPrice}
                      <button onClick={() => setMaxPrice('')} aria-label="Remove max price filter">✕</button>
                    </span>
                  )}
                  {filters.minRating !== null && (
                    <span className="catalog__filter-tag">
                      {'★'.repeat(filters.minRating)} & up
                      <button onClick={() => setMinRating(null)} aria-label="Remove rating filter">✕</button>
                    </span>
                  )}
                  <button className="catalog__filter-tag" onClick={clearFilters}>
                    Clear all ✕
                  </button>
                </div>
              )}

              {loading ? (
                <div className="catalog__grid">
                  <SkeletonLoader variant="card" count={PAGE_SIZE} />
                </div>
              ) : error ? (
                <div className="catalog__empty">
                  <h3>{t('home.errorLoading')}</h3>
                  <p className="catalog__error-detail">{error}</p>
                  <button className="catalog__empty-btn" onClick={reload}>
                    Try again
                  </button>
                </div>
              ) : books.length === 0 ? (
                <div className="catalog__empty">
                  <h3>{t('home.noBooksFound')}</h3>
                  {filtersActive && (
                    <button className="catalog__empty-btn" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="catalog__grid">
                    {books.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                  {/* totalPages describes the filtered set now, so the pager
                      no longer offers pages that render empty. */}
                  <Pagination
                    currentPage={filters.page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </>
              )}

            </div>{/* end .catalog__grid-container */}
          </div>{/* end .catalog__layout */}
        </div>
      </main>
    </>
  );
}
