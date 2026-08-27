import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  emptyFilters,
  readCatalogParams,
  sameFilters,
  shouldResetPage,
  writeCatalogParams,
} from '../utils/catalogUrl.js';

/**
 * The catalogue's filters, held in the URL.
 *
 * They were held in `useState` in Home, so the address bar said nothing about
 * what was on screen: a refresh cleared every filter, Back left the site
 * rather than undoing one, a filtered view could not be shared, and returning
 * from a book page remounted Home with its defaults — search text gone, page
 * back to 1. See #338.
 *
 * The URL is the single source of truth here. There is no mirrored copy in
 * state, which is what makes Back and Forward work for free: the router
 * re-renders on a history change and the filters follow, with nothing to keep
 * in sync and nothing to get out of step.
 *
 * ## History entries
 *
 * Not every change deserves one. Ticking a genre is a deliberate act and
 * should be undoable with Back. Typing is not — writing a history entry per
 * keystroke would make "mystery" seven Backs deep and the button useless.
 *
 * So `replace` is a per-change decision, defaulting to a push. The search box
 * passes `replace: true`; everything else takes the default.
 */
export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => readCatalogParams(searchParams),
    [searchParams]
  );

  /**
   * Apply a patch to the filters.
   *
   * Any change other than the page itself returns to page 1. Changing a
   * filter while on page 3 of a result set that no longer has three pages
   * leaves a blank grid — the API answers a page past the end with an empty
   * slice rather than an error, so the symptom is silent.
   */
  const update = useCallback(
    (patch, { replace = false } = {}) => {
      /*
       * A change that is not one gets no history entry at all: a controlled
       * input re-emitting its own value, or the search box being hydrated
       * from the URL it was just read from.
       *
       * This has to happen *before* setSearchParams, not inside its updater.
       * Returning the parameters unchanged from the updater still navigates —
       * the router pushes an entry regardless of whether the value differs,
       * so the guard has to be the decision not to call it.
       */
      const next = { ...filters, ...patch };

      if (shouldResetPage(patch)) {
        next.page = 1;
      }

      if (sameFilters(filters, next)) {
        return;
      }

      // The functional form for the write itself, so the parameters this
      // merges into are the current ones rather than the ones captured when
      // this callback was created.
      setSearchParams(
        (current) => {
          const merged = { ...readCatalogParams(current), ...patch };

          if (shouldResetPage(patch)) {
            merged.page = 1;
          }

          return writeCatalogParams(merged, current);
        },
        { replace }
      );
    },
    [filters, setSearchParams]
  );

  const setSearch = useCallback(
    (search) => update({ search }, { replace: true }),
    [update]
  );

  const setGenre = useCallback(
    (genre, checked) =>
      update({
        genres: checked
          ? [...filters.genres, genre].filter(
              (entry, index, all) => all.indexOf(entry) === index
            )
          : filters.genres.filter((entry) => entry !== genre),
      }),
    [filters.genres, update]
  );

  const setMinPrice = useCallback(
    (minPrice) => update({ minPrice }, { replace: true }),
    [update]
  );

  const setMaxPrice = useCallback(
    (maxPrice) => update({ maxPrice }, { replace: true }),
    [update]
  );

  const setMinRating = useCallback((minRating) => update({ minRating }), [update]);

  const setSort = useCallback((sort) => update({ sort }), [update]);

  const setPage = useCallback((page) => update({ page }), [update]);

  /**
   * Clear the filters, keeping the search.
   *
   * "Clear filters" sits next to the filter panel and next to the empty
   * state; a customer who clicks it has not asked to lose what they typed in
   * a search box at the other end of the page.
   */
  const clearFilters = useCallback(
    () =>
      update({
        ...emptyFilters(),
        search: filters.search,
        sort: filters.sort,
      }),
    [filters.search, filters.sort, update]
  );

  return {
    filters,
    update,
    setSearch,
    setGenre,
    setMinPrice,
    setMaxPrice,
    setMinRating,
    setSort,
    setPage,
    clearFilters,
  };
}

export default useCatalogFilters;
