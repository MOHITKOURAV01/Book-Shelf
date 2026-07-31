import './FilterSidebar.css';

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
  onToggle
}) {
  return (
    <aside className={`filter-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="filter-sidebar__header-mobile">
        <h3 className="filter-sidebar__title">Filters</h3>
        <button className="filter-sidebar__toggle" onClick={onToggle}>
          {isOpen ? 'Close' : 'Filter'}
        </button>
      </div>

      <div className="filter-sidebar__content">
        <div className="filter-sidebar__header-desktop">
          <h3 className="filter-sidebar__title">Filters</h3>
          <button className="filter-sidebar__clear" onClick={onClearFilters}>
            Clear All
          </button>
        </div>

        <div className="filter-group">
          <h4 className="filter-group__title">Category</h4>
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
        </div>

        <div className="filter-group">
          <h4 className="filter-group__title">Price</h4>
          <div className="filter-price-inputs">
            <label className="filter-price-input">
              <span className="filter-price-input__prefix">Min: $</span>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => onMinPriceChange(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="filter-price-input">
              <span className="filter-price-input__prefix">Max: $</span>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => onMaxPriceChange(e.target.value)}
                placeholder="Any"
              />
            </label>
          </div>
        </div>

        <div className="filter-group">
          <h4 className="filter-group__title">Minimum Rating</h4>
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
          </div>
        </div>
        
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
