import { currencyName, currencySymbol } from '../utils/currency.js';
import './FilterSidebar.css';

/**
 * FilterSidebar — collapsible filter panel for the book catalogue.
 *
 * Props:
 *   genres           string[]   full list of genre strings (including 'All')
 *   selectedGenres   string[]   currently checked genres
 *   onGenreChange    (genre: string, checked: boolean) => void
 *   minPrice         string     minimum price input value (empty string = no filter)
 *   onMinPriceChange (value: string) => void
 *   maxPrice         string     maximum price input value (empty string = no filter)
 *   onMaxPriceChange (value: string) => void
 *   minRating        number|null  minimum star rating (null = no filter)
 *   onMinRatingChange (rating: number|null) => void
 *   onClearFilters   () => void  resets all filter state
 *   isOpen           boolean    controls mobile open/close state
 *   onToggle         () => void  toggles isOpen
 */
export default function FilterSidebar({
  genres,
  selectedGenres,
  onGenreChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  minRating,
  onMinRatingChange,
  onClearFilters,
  isOpen,
  onToggle,
}) {
  // Was a hardcoded ₹ with a comment noting it had been changed from a
  // hardcoded $. Neither was right for a shop whose currency is configuration;
  // it reads the configured one now. See #335.
  const symbol = currencySymbol();
  // A word, not the symbol — see currencyName().
  const name = currencyName();

  const hasActiveFilters =
    selectedGenres.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minRating !== null;

  return (
    <aside className={`filter-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Filter books">
      {/* Mobile header — always visible, toggles the panel open */}
      <div className="filter-sidebar__header-mobile">
        <h3 className="filter-sidebar__title">Filters</h3>
        <button
          className="filter-sidebar__toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="filter-sidebar-content"
        >
          {isOpen ? 'Close ✕' : 'Filter ▼'}
        </button>
      </div>

      {/* Collapsible content */}
      <div
        className="filter-sidebar__content"
        id="filter-sidebar-content"
      >
        {/* Desktop header — always visible on large screens */}
        <div className="filter-sidebar__header-desktop">
          <h3 className="filter-sidebar__title">Filters</h3>
          {hasActiveFilters && (
            <button className="filter-sidebar__clear" onClick={onClearFilters}>
              Clear All
            </button>
          )}
        </div>

        {/* ── Genre ──────────────────────────────────────── */}
        <fieldset className="filter-group">
          <legend className="filter-group__title">Category</legend>
          <div className="filter-group__checkboxes">
            {genres.filter(g => g !== 'All').map(genre => (
              <label key={genre} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedGenres.includes(genre)}
                  onChange={(e) => onGenreChange(genre, e.target.checked)}
                />
                <span className="filter-checkbox__label">{genre}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Price range ────────────────────────────────── */}
        <fieldset className="filter-group">
          <legend className="filter-group__title">Price ({symbol})</legend>
          <div className="filter-price-inputs">
            <label className="filter-price-input">
              <span className="filter-price-input__prefix">Min {symbol}</span>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => onMinPriceChange(e.target.value)}
                placeholder="0"
                aria-label={`Minimum price in ${name}`}
              />
            </label>
            <label className="filter-price-input">
              <span className="filter-price-input__prefix">Max {symbol}</span>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                placeholder="Any"
                aria-label={`Maximum price in ${name}`}
              />
            </label>
          </div>
        </fieldset>

        {/* ── Minimum rating ─────────────────────────────── */}
        <fieldset className="filter-group">
          <legend className="filter-group__title">Minimum Rating</legend>
          <div className="filter-rating-radios">
            {[4, 3, 2, 1].map(rating => (
              <label key={rating} className="filter-radio">
                <input
                  type="radio"
                  name="minRating"
                  checked={minRating === rating}
                  onChange={() => onMinRatingChange(rating)}
                />
                <span className="filter-radio__label">
                  {'★'.repeat(rating)}{'☆'.repeat(5 - rating)} & up
                </span>
              </label>
            ))}
            {/* Allow clearing the rating filter */}
            {minRating !== null && (
              <button
                className="filter-sidebar__clear filter-rating__clear"
                onClick={() => onMinRatingChange(null)}
              >
                Any rating
              </button>
            )}
          </div>
        </fieldset>

        {/* ── Mobile footer actions ──────────────────────── */}
        <div className="filter-sidebar__mobile-actions">
          <button className="filter-sidebar__clear" onClick={onClearFilters}>
            Clear All
          </button>
          <button className="filter-sidebar__apply" onClick={onToggle}>
            Apply Filters
          </button>
        </div>
      </div>
    </aside>
  );
}
