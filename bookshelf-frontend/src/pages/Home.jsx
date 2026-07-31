import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Hero from '../components/Hero.jsx';
import GenreFilter from '../components/GenreFilter.jsx';
import BookCard from '../components/BookCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';

export default function Home({ searchQuery = '' }) {
  const { t } = useTranslation();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeSort, setActiveSort] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const limit = 4; // Items per page

  // Reset to page 1 when search, genre, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeGenre, activeSort]);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
            page: currentPage,
            limit: limit,
            genre: activeGenre,
            search: searchQuery,
            ...(activeSort && { sort: activeSort }),
        });
        const response = await fetch(`http://localhost:5000/api/books?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to load books");
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
  }, [currentPage, activeGenre, activeSort, searchQuery]);

  const genres = useMemo(() => {
    return ['All', 'Fiction', 'Sci-Fi', 'Mystery', 'Self-Help', 'Poetry']; // hardcoded from mock since pagination limits scope
  }, []);

  return (
    <>
      <Hero />
      <main className="catalog" id="catalog">
        <div className="catalog__inner">
          <div className="catalog__header">
            <h2 className="catalog__title">{t('home.featuredTitle')}</h2>
            <p className="catalog__count">{t('home.titlesTotal', { count: totalBooks })}</p>
          </div>

          <GenreFilter genres={genres} active={activeGenre} onSelect={setActiveGenre} />

          <div className="catalog__controls">
            <select
              id="sort-select"
              className="catalog__sort-select"
              value={activeSort}
              onChange={(e) => setActiveSort(e.target.value)}
              aria-label={t('home.sortAriaLabel')}
            >
              <option value="">{t('home.sortDefault')}</option>
              <option value="price_asc">{t('home.sortPriceAsc')}</option>
              <option value="price_desc">{t('home.sortPriceDesc')}</option>
              <option value="rating_desc">{t('home.sortRatingDesc')}</option>
              <option value="title_asc">{t('home.sortTitleAsc')}</option>
            </select>
          </div>

          {loading ? (
            <div className="catalog__grid">
              <SkeletonLoader variant="card" count={4} />
            </div>
          ) : error ? (
            <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--error)' }}>{t('home.errorLoading')}</p>
          ) : books.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>{t('home.noBooksFound')}</p>
          ) : (
            <>
              <div className="catalog__grid">
                {books.map((book) => (
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
        </div>
      </main>
    </>
  );
}
