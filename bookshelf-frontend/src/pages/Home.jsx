import { useMemo, useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Hero from '../components/Hero.jsx';
import FilterSidebar from '../components/FilterSidebar.jsx';
import BookCard from '../components/BookCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { API_BASE_URL } from '../config/env.js';

// Genre list is static since the backend catalogue is fixed.
// If the backend adds a GET /api/genres endpoint in the future, replace this.
const ALL_GENRES = ['All', 'Fiction', 'Sci-Fi', 'Mystery', 'Self-Help', 'Poetry'];

export default function Home({ searchQuery: searchQueryProp }) {
  const { t } = useTranslation();

  // The search box lives in the navbar, which the App layout renders, so the
  // query reaches this page through the outlet context. The prop is kept as
  // an override so Home can still be rendered standalone in tests.
  const outletContext = useOutletContext();
  const searchQuery = searchQueryProp ?? outletContext?.searchQuery ?? '';

  // ── Server-side data ──────────────────────────────────────────────────
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Pagination ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const limit = 4; // books per page

  // ── Sort (server-side) ────────────────────────────────────────────────
  const [activeSort, setActiveSort] = useState('');

  // ── FilterSidebar state ───────────────────────────────────────────────
  const [selectedGenres, setSelectedGenres] = useState([]);  // multi-select checkboxes
  const [minPrice, setMinPrice] = useState('');              // client-side price filter
  const [maxPrice, setMaxPrice] = useState('');              // client-side price filter
  const [minRating, setMinRating] = useState(null);          // client-side rating filter
  const [sidebarOpen, setSidebarOpen] = useState(false);     // mobile toggle

  // ── Derived: single genre for API (backend takes one string) ──────────
  // If exactly one genre is selected, pass it. Otherwise fetch everything
  // and rely on client-side filtering for multi-select or "show all" cases.
  const apiGenre = selectedGenres.length === 1 ? selectedGenres[0] : 'All';

  // ── Helpers ───────────────────────────────────────────────────────────

  const handleGenreChange = useCallback((genre, checked) => {
    setSelectedGenres(prev =>
      checked ? [...prev, genre] : prev.filter(g => g !== genre)
    );
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedGenres([]);
    setMinPrice('');
    setMaxPrice('');
    setMinRating(null);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minRating !== null;

  // ── Reset page when any upstream filter changes ───────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, apiGenre, activeSort]);

  // ── Fetch books from backend ──────────────────────────────────────────
  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: currentPage,
          limit: limit,
          genre: apiGenre,
          search: searchQuery,
          ...(activeSort && { sort: activeSort }),
        });
        const response = await fetch(
          `${API_BASE_URL}/books?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to load books');
        }

        const data = await response.json();
        setBooks(data.books || data);
        setTotalPages(data.totalPages || 1);
        setTotalBooks(data.totalBooks || (data.books || data).length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, [currentPage, apiGenre, activeSort, searchQuery]);

  // ── Client-side filter on fetched page ───────────────────────────────
  // Applied after the fetch so server pagination stays accurate for genre/search/sort.
  // Price and rating filters narrow the displayed results within the current page.
  const displayedBooks = useMemo(() => {
    let result = books;

    // Multi-genre: if more than one genre is checked, filter the fetched batch
    if (selectedGenres.length > 1) {
      result = result.filter(b => selectedGenres.includes(b.genre));
    }

    if (minPrice !== '') {
      result = result.filter(b => b.price >= Number(minPrice));
    }

    if (maxPrice !== '') {
      result = result.filter(b => b.price <= Number(maxPrice));
    }

    if (minRating !== null) {
      result = result.filter(b => b.rating >= minRating);
    }

    return result;
  }, [books, selectedGenres, minPrice, maxPrice, minRating]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <Hero />
      <main className="catalog" id="catalog">
        <div className="catalog__inner">

          {/* Page title + book count */}
          <div className="catalog__header">
            <h2 className="catalog__title">{t('home.featuredTitle')}</h2>
            <p className="catalog__count">{t('home.titlesTotal', { count: totalBooks })}</p>
          </div>

          {/* Two-column layout: sidebar | grid */}
          <div className="catalog__layout">

            {/* ── Left: filter sidebar ─────────────────────── */}
            <FilterSidebar
              genres={ALL_GENRES}
              selectedGenres={selectedGenres}
              onGenreChange={handleGenreChange}
              minPrice={minPrice}
              onMinPriceChange={setMinPrice}
              maxPrice={maxPrice}
              onMaxPriceChange={setMaxPrice}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              onClearFilters={handleClearFilters}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(o => !o)}
            />

            {/* ── Right: sort bar + grid + pagination ─────── */}
            <div className="catalog__grid-container">

              {/* Sort dropdown */}
              <div className="catalog__controls">
                <select
                  id="sort-select"
                  className="catalog__sort-select"
                  value={activeSort}
                  onChange={(e) => { setActiveSort(e.target.value); setCurrentPage(1); }}
                  aria-label={t('home.sortAriaLabel')}
                >
                  <option value="">{t('home.sortDefault')}</option>
                  <option value="price_asc">{t('home.sortPriceAsc')}</option>
                  <option value="price_desc">{t('home.sortPriceDesc')}</option>
                  <option value="rating_desc">{t('home.sortRatingDesc')}</option>
                  <option value="title_asc">{t('home.sortTitleAsc')}</option>
                </select>
              </div>

              {/* Active filter tags */}
              {hasActiveFilters && (
                <div className="catalog__filter-summary">
                  <span>Active filters:</span>
                  {selectedGenres.map(g => (
                    <span key={g} className="catalog__filter-tag">
                      {g}
                      <button
                        onClick={() => handleGenreChange(g, false)}
                        aria-label={`Remove ${g} filter`}
                      >✕</button>
                    </span>
                  ))}
                  {minPrice !== '' && (
                    <span className="catalog__filter-tag">
                      Min ₹{minPrice}
                      <button onClick={() => setMinPrice('')} aria-label="Remove min price filter">✕</button>
                    </span>
                  )}
                  {maxPrice !== '' && (
                    <span className="catalog__filter-tag">
                      Max ₹{maxPrice}
                      <button onClick={() => setMaxPrice('')} aria-label="Remove max price filter">✕</button>
                    </span>
                  )}
                  {minRating !== null && (
                    <span className="catalog__filter-tag">
                      {'★'.repeat(minRating)} & up
                      <button onClick={() => setMinRating(null)} aria-label="Remove rating filter">✕</button>
                    </span>
                  )}
                  <button className="catalog__filter-tag" onClick={handleClearFilters}>
                    Clear all ✕
                  </button>
                </div>
              )}

              {/* Books grid */}
              {loading ? (
                <div className="catalog__grid">
                  <SkeletonLoader variant="card" count={4} />
                </div>
              ) : error ? (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--leather)' }}>
                  {t('home.errorLoading')}
                </p>
              ) : displayedBooks.length === 0 ? (
                <div className="catalog__empty">
                  <h3>{t('home.noBooksFound')}</h3>
                  {hasActiveFilters && (
                    <button className="catalog__empty-btn" onClick={handleClearFilters}>
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="catalog__grid">
                    {displayedBooks.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
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
