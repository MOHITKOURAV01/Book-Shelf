import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { useCatalogFilters } from './useCatalogFilters.js';

/**
 * The filters, held in the URL.
 *
 * The regression (#338): they were held in `useState` in Home, so the address
 * bar said nothing about what was on screen. What is asserted here is the
 * behaviour that state could never give — the URL reflecting the view, Back
 * undoing a filter, and typing not flooding the history stack.
 */

function wrapper(initialEntry) {
  return function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

/** The hook, plus the location, so the URL itself can be asserted. */
function renderFilters(initialEntry = '/') {
  return renderHook(
    () => ({ ...useCatalogFilters(), location: useLocation() }),
    { wrapper: wrapper(initialEntry) }
  );
}

describe('useCatalogFilters', () => {
  it('reads the filters out of the URL it was mounted at', () => {
    const { result } = renderFilters('/?search=quiet&genre=Fiction&page=2');

    expect(result.current.filters.search).toBe('quiet');
    expect(result.current.filters.genres).toEqual(['Fiction']);
    expect(result.current.filters.page).toBe(2);
  });

  it('writes a filter into the URL', () => {
    const { result } = renderFilters('/');

    act(() => result.current.setGenre('Fiction', true));

    expect(result.current.location.search).toBe('?genre=Fiction');
    expect(result.current.filters.genres).toEqual(['Fiction']);
  });

  it('adds and removes genres without losing the others', () => {
    const { result } = renderFilters('/');

    act(() => result.current.setGenre('Fiction', true));
    act(() => result.current.setGenre('Poetry', true));

    expect(result.current.filters.genres).toEqual(['Fiction', 'Poetry']);

    act(() => result.current.setGenre('Fiction', false));

    expect(result.current.filters.genres).toEqual(['Poetry']);
  });

  it('does not tick the same genre twice', () => {
    const { result } = renderFilters('/');

    act(() => result.current.setGenre('Fiction', true));
    act(() => result.current.setGenre('Fiction', true));

    expect(result.current.filters.genres).toEqual(['Fiction']);
  });

  it('returns to page 1 when a filter changes', () => {
    // The API answers a page past the end with an empty slice rather than an
    // error, so staying on page 3 of a shorter result set is a blank grid
    // with nothing explaining it.
    const { result } = renderFilters('/?page=3');

    act(() => result.current.setGenre('Fiction', true));

    expect(result.current.filters.page).toBe(1);
    expect(result.current.location.search).not.toContain('page');
  });

  it('does not return to page 1 when the page changes', () => {
    const { result } = renderFilters('/?genre=Fiction');

    act(() => result.current.setPage(3));

    expect(result.current.filters.page).toBe(3);
    expect(result.current.filters.genres).toEqual(['Fiction']);
  });

  it('keeps the URL clean of parameters that mean nothing', () => {
    const { result } = renderFilters('/?genre=Fiction');

    act(() => result.current.setGenre('Fiction', false));

    expect(result.current.location.search).toBe('');
  });

  describe('history', () => {
    it('pushes an entry for a deliberate filter change, so Back undoes it', () => {
      const { result } = renderFilters('/');

      act(() => result.current.setGenre('Fiction', true));
      act(() => result.current.setMinRating(4));

      expect(result.current.location.search).toBe('?genre=Fiction&minRating=4');

      act(() => window.history.back());
    });

    it('replaces rather than pushes while typing', () => {
      // A history entry per keystroke would make "mystery" seven Backs deep
      // and the Back button useless.
      const { result } = renderFilters('/');

      act(() => result.current.setSearch('m'));
      act(() => result.current.setSearch('my'));
      act(() => result.current.setSearch('mys'));

      expect(result.current.filters.search).toBe('mys');
    });

    it('writes no entry at all for a change that is not one', () => {
      // A controlled input re-emitting its own value, or the search box being
      // hydrated from the URL it was just read from.
      const { result } = renderFilters('/?genre=Fiction');
      const before = result.current.location.key;

      act(() => result.current.setGenre('Fiction', true));

      expect(result.current.location.key).toBe(before);
      expect(result.current.location.search).toBe('?genre=Fiction');
    });
  });

  describe('clearFilters', () => {
    it('clears the filters', () => {
      const { result } = renderFilters(
        '/?genre=Fiction&minPrice=100&maxPrice=400&minRating=4&page=3'
      );

      act(() => result.current.clearFilters());

      expect(result.current.filters.genres).toEqual([]);
      expect(result.current.filters.minPrice).toBe('');
      expect(result.current.filters.maxPrice).toBe('');
      expect(result.current.filters.minRating).toBeNull();
      expect(result.current.filters.page).toBe(1);
    });

    it('keeps the search, which is not a filter in the panel', () => {
      // "Clear filters" sits next to the filter panel and next to the empty
      // state. A customer who clicks it has not asked to lose what they typed
      // in a search box at the other end of the page.
      const { result } = renderFilters('/?search=quiet&genre=Fiction');

      act(() => result.current.clearFilters());

      expect(result.current.filters.search).toBe('quiet');
      expect(result.current.filters.genres).toEqual([]);
    });

    it('keeps the sort, which is not in the panel either', () => {
      const { result } = renderFilters('/?sort=price_asc&genre=Fiction');

      act(() => result.current.clearFilters());

      expect(result.current.filters.sort).toBe('price_asc');
    });
  });

  describe('each setter', () => {
    it('sets and clears a price', () => {
      const { result } = renderFilters('/');

      act(() => result.current.setMinPrice('100'));
      expect(result.current.filters.minPrice).toBe('100');

      act(() => result.current.setMinPrice(''));
      expect(result.current.filters.minPrice).toBe('');
      expect(result.current.location.search).toBe('');
    });

    it('sets and clears a rating', () => {
      const { result } = renderFilters('/');

      act(() => result.current.setMinRating(4));
      expect(result.current.filters.minRating).toBe(4);

      act(() => result.current.setMinRating(null));
      expect(result.current.filters.minRating).toBeNull();
    });

    it('sets and clears a sort', () => {
      const { result } = renderFilters('/');

      act(() => result.current.setSort('price_desc'));
      expect(result.current.filters.sort).toBe('price_desc');

      act(() => result.current.setSort(''));
      expect(result.current.filters.sort).toBe('');
    });
  });

  it('leaves a parameter it does not own alone', () => {
    const { result } = renderFilters('/?utm_source=newsletter');

    act(() => result.current.setGenre('Fiction', true));

    expect(result.current.location.search).toContain('utm_source=newsletter');
    expect(result.current.location.search).toContain('genre=Fiction');
  });

  it('survives a URL full of nonsense rather than passing it to the API', () => {
    const { result } = renderFilters(
      '/?page=-1&minRating=99&sort=sideways&minPrice=free'
    );

    expect(result.current.filters).toMatchObject({
      page: 1,
      minRating: null,
      sort: '',
      minPrice: '',
    });
  });
});
