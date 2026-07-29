import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ThemeToggle from './components/ThemeToggle.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import CustomCursor from './components/CustomCursor.jsx';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import BookCard from './components/BookCard.jsx';
import Footer from './components/Footer.jsx';
import { books, genres } from './data/books.js';
import './App.css';

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cart, setCart] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const selectedGenres = searchParams.getAll('genre');
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minRating = Number(searchParams.get('minRating')) || 0;

  const handleGenreChange = (genre, checked) => {
    const params = new URLSearchParams(searchParams);
    let currentGenres = params.getAll('genre');
    if (checked) {
      if (!currentGenres.includes(genre)) {
        params.append('genre', genre);
      }
    } else {
      params.delete('genre');
      currentGenres.filter(g => g !== genre).forEach(g => params.append('genre', g));
    }
    setSearchParams(params);
  };

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === '' || value === 0 || value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const visibleBooks = useMemo(() => {
    return books.filter((book) => {
      if (selectedGenres.length > 0 && !selectedGenres.includes(book.genre)) return false;
      if (minPrice && book.price < Number(minPrice)) return false;
      if (maxPrice && book.price > Number(maxPrice)) return false;
      if (minRating && book.rating < minRating) return false;
      return true;
    });
  }, [selectedGenres, minPrice, maxPrice, minRating]);

  function handleAddToCart(book) {
    setCart((prev) => [...prev, book]);
  }

  return (
    <div className="app">
      <ThemeToggle />
      <ScrollToTop />
      <CustomCursor />
      
      <Navbar cartCount={cart.length} onCartClick={() => {}} />
      <div className="nav-spacer" />
      <Hero />

      <main className="catalog" id="catalog">
        <div className="catalog__inner">
          <div className="catalog__header">
            <h2 className="catalog__title">Browse the catalog</h2>
            <p className="catalog__count">{visibleBooks.length} titles</p>
          </div>

          <div className="catalog__layout">
            <FilterSidebar
              genres={genres}
              selectedGenres={selectedGenres}
              onGenreChange={handleGenreChange}
              minPrice={minPrice}
              onMinPriceChange={(val) => updateParam('minPrice', val)}
              maxPrice={maxPrice}
              onMaxPriceChange={(val) => updateParam('maxPrice', val)}
              minRating={minRating}
              onMinRatingChange={(val) => updateParam('minRating', val)}
              onClearFilters={handleClearFilters}
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <div className="catalog__grid-container">
              {visibleBooks.length === 0 ? (
                <div className="catalog__empty">
                  <h3>No books found matching your filters.</h3>
                  <button onClick={handleClearFilters} className="catalog__empty-btn">Clear Filters</button>
                </div>
              ) : (
                <div className="catalog__grid">
                  {visibleBooks.map((book) => (
                    <BookCard key={book.id} book={book} onAddToCart={handleAddToCart} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
