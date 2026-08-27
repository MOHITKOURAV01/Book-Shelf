import { describe, it, expect } from 'vitest';

import {
  DEFAULT_PAGE,
  RATING_VALUES,
  SORT_VALUES,
  emptyFilters,
  readCatalogParams,
  sameFilters,
  shouldResetPage,
  writeCatalogParams,
} from './catalogUrl.js';

/**
 * The catalogue's filters, as a query string.
 *
 * The regression (#338): there was no query string. Every filter was
 * `useState` in Home and the search box was state in App, so the address bar
 * read `/` no matter what was on screen — refresh cleared everything, Back
 * left the site instead of undoing a filter, and returning from a book page
 * remounted the catalogue with its defaults.
 *
 * A query string is hand-editable, stale-bookmarkable and attacker-supplied,
 * so the reading half is written to be total: anything unusable falls back to
 * "not filtering by that". Passing a bad value straight through to the API
 * would earn a 400 and turn an old bookmark into an error page.
 */

const params = (query) => new URLSearchParams(query);
const read = (query) => readCatalogParams(params(query));
const write = (filters, existing) =>
  writeCatalogParams(filters, existing).toString();

describe('readCatalogParams', () => {
  it('reads every filter the catalogue offers', () => {
    expect(
      read('search=quiet&genre=Fiction&genre=Poetry&minPrice=100&maxPrice=400&minRating=4&sort=price_asc&page=3')
    ).toEqual({
      search: 'quiet',
      genres: ['Fiction', 'Poetry'],
      minPrice: '100',
      maxPrice: '400',
      minRating: 4,
      sort: 'price_asc',
      page: 3,
    });
  });

  it('gives the empty state for a bare URL', () => {
    expect(read('')).toEqual(emptyFilters());
  });

  it('does not hand out a shared mutable default', () => {
    // `genres` is an array. A frozen shared default is a bug waiting for the
    // first caller that pushes to it.
    const first = emptyFilters();
    first.genres.push('Fiction');

    expect(emptyFilters().genres).toEqual([]);
  });

  it('keeps a price as the string that was typed', () => {
    // Normalising through Number would turn `?minPrice=250.00` into `250` in
    // the input while the customer is looking at it.
    expect(read('minPrice=250.00').minPrice).toBe('250.00');
  });

  it('treats prices as strings so a cleared box is not "at least 0"', () => {
    // `Number('')` is 0, and a `minPrice=0` reads as a deliberate filter.
    expect(read('minPrice=').minPrice).toBe('');
    expect(read('').minPrice).toBe('');
  });

  it('rejects a negative or non-numeric price', () => {
    expect(read('minPrice=-5').minPrice).toBe('');
    expect(read('maxPrice=cheap').maxPrice).toBe('');
    expect(read('minPrice=NaN').minPrice).toBe('');
  });

  it('accepts repeated genre parameters, which is what the API expects', () => {
    expect(read('genre=Fiction&genre=Mystery').genres).toEqual([
      'Fiction',
      'Mystery',
    ]);
  });

  it('collapses duplicate genres, because one checkbox cannot be ticked twice', () => {
    expect(read('genre=Fiction&genre=Fiction').genres).toEqual(['Fiction']);
  });

  it('drops the "All" sentinel and empty genres', () => {
    expect(read('genre=All&genre=all&genre=&genre=Poetry').genres).toEqual([
      'Poetry',
    ]);
  });

  it('ignores a sort value the catalogue does not offer', () => {
    for (const sort of SORT_VALUES) {
      expect(read(`sort=${sort}`).sort).toBe(sort);
    }

    expect(read('sort=price_sideways').sort).toBe('');
    expect(read('sort=').sort).toBe('');
  });

  it('ignores a rating outside the ones the filter offers', () => {
    for (const rating of RATING_VALUES) {
      expect(read(`minRating=${rating}`).minRating).toBe(rating);
    }

    expect(read('minRating=5').minRating).toBeNull();
    expect(read('minRating=0').minRating).toBeNull();
    expect(read('minRating=4.5').minRating).toBeNull();
    expect(read('minRating=four').minRating).toBeNull();
  });

  it('falls back to page 1 for a page that is not one', () => {
    expect(read('page=0').page).toBe(DEFAULT_PAGE);
    expect(read('page=-3').page).toBe(DEFAULT_PAGE);
    expect(read('page=1.5').page).toBe(DEFAULT_PAGE);
    expect(read('page=last').page).toBe(DEFAULT_PAGE);
  });

  it('trims the search term', () => {
    expect(read('search=%20%20quiet%20%20').search).toBe('quiet');
  });

  it('does not throw on nonsense input', () => {
    expect(readCatalogParams(null)).toEqual(emptyFilters());
    expect(readCatalogParams(undefined)).toEqual(emptyFilters());
    expect(readCatalogParams({})).toEqual(emptyFilters());
  });
});

describe('writeCatalogParams', () => {
  it('writes only what is actually filtering', () => {
    // `?page=1&sort=&search=` is the same view as `/`. A URL a customer might
    // copy should not be full of parameters that mean nothing.
    expect(write(emptyFilters())).toBe('');
  });

  it('omits page 1', () => {
    expect(write({ ...emptyFilters(), page: 1 })).toBe('');
    expect(write({ ...emptyFilters(), page: 2 })).toBe('page=2');
  });

  it('round-trips a full filter state', () => {
    const filters = {
      search: 'quiet',
      genres: ['Fiction', 'Poetry'],
      minPrice: '100',
      maxPrice: '400',
      minRating: 4,
      sort: 'price_asc',
      page: 3,
    };

    expect(readCatalogParams(writeCatalogParams(filters))).toEqual(filters);
  });

  it('repeats the genre parameter rather than joining it', () => {
    // `?genre=Fiction&genre=Poetry` is what Express hands the backend as an
    // array; a comma-joined value would arrive as one genre named
    // "Fiction,Poetry".
    expect(write({ ...emptyFilters(), genres: ['Fiction', 'Poetry'] })).toBe(
      'genre=Fiction&genre=Poetry'
    );
  });

  it('refuses to write a value it would not read back', () => {
    expect(write({ ...emptyFilters(), sort: 'nonsense' })).toBe('');
    expect(write({ ...emptyFilters(), minRating: 9 })).toBe('');
    expect(write({ ...emptyFilters(), minPrice: '-5' })).toBe('');
  });

  it('carries through parameters the catalogue does not own', () => {
    // So this cannot eat something another feature put in the URL.
    const existing = params('utm_source=newsletter&page=4&ref=friend');
    const result = writeCatalogParams({ ...emptyFilters(), page: 2 }, existing);

    expect(result.get('utm_source')).toBe('newsletter');
    expect(result.get('ref')).toBe('friend');
    expect(result.get('page')).toBe('2');
  });

  it('replaces its own parameters rather than appending to them', () => {
    const existing = params('genre=Fiction&genre=Poetry&search=old');
    const result = writeCatalogParams(
      { ...emptyFilters(), genres: ['Mystery'], search: 'new' },
      existing
    );

    expect(result.getAll('genre')).toEqual(['Mystery']);
    expect(result.getAll('search')).toEqual(['new']);
  });

  it('fills in defaults for a partial filter object', () => {
    expect(write({ search: 'quiet' })).toBe('search=quiet');
  });
});

describe('shouldResetPage', () => {
  it('is true for every change except the page itself', () => {
    // Changing a filter while on page 3 of a result set that no longer has
    // three pages leaves a blank grid — the API answers a page past the end
    // with an empty slice, not an error.
    expect(shouldResetPage({ search: 'quiet' })).toBe(true);
    expect(shouldResetPage({ genres: [] })).toBe(true);
    expect(shouldResetPage({ sort: 'price_asc' })).toBe(true);
    expect(shouldResetPage({ minRating: null })).toBe(true);
  });

  it('is false for a page change', () => {
    expect(shouldResetPage({ page: 3 })).toBe(false);
  });

  it('is false for nothing at all', () => {
    expect(shouldResetPage({})).toBe(false);
    expect(shouldResetPage(null)).toBe(false);
    expect(shouldResetPage(undefined)).toBe(false);
  });

  it('is true when a page change is bundled with anything else', () => {
    expect(shouldResetPage({ page: 3, search: 'quiet' })).toBe(true);
  });
});

describe('sameFilters', () => {
  it('recognises an unchanged view, so it earns no history entry', () => {
    const filters = {
      search: 'quiet',
      genres: ['Fiction'],
      minPrice: '',
      maxPrice: '',
      minRating: null,
      sort: '',
      page: 1,
    };

    expect(sameFilters(filters, { ...filters })).toBe(true);
    expect(sameFilters(filters, { ...filters, genres: ['Fiction'] })).toBe(true);
  });

  it('notices a real change in any field', () => {
    const base = emptyFilters();

    expect(sameFilters(base, { ...base, search: 'quiet' })).toBe(false);
    expect(sameFilters(base, { ...base, genres: ['Fiction'] })).toBe(false);
    expect(sameFilters(base, { ...base, minPrice: '100' })).toBe(false);
    expect(sameFilters(base, { ...base, maxPrice: '400' })).toBe(false);
    expect(sameFilters(base, { ...base, minRating: 4 })).toBe(false);
    expect(sameFilters(base, { ...base, sort: 'price_asc' })).toBe(false);
    expect(sameFilters(base, { ...base, page: 2 })).toBe(false);
  });

  it('cares about genre order, because the URL preserves it', () => {
    const a = { ...emptyFilters(), genres: ['Fiction', 'Poetry'] };
    const b = { ...emptyFilters(), genres: ['Poetry', 'Fiction'] };

    expect(sameFilters(a, b)).toBe(false);
  });

  it('does not throw on a missing operand', () => {
    expect(sameFilters(null, emptyFilters())).toBe(false);
    expect(sameFilters(emptyFilters(), undefined)).toBe(false);
    expect(sameFilters(null, null)).toBe(true);
  });
});
