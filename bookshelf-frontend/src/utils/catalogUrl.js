/**
 * The catalogue's filter state, as a query string.
 *
 * Everything that narrowed the catalogue was component state and nothing
 * else — `useState` in Home for the genres, prices, rating, sort and page,
 * and the search box held even further away, in App, passed down through the
 * outlet context. None of it reached the URL, so the address bar read `/`
 * whether the customer was looking at the whole catalogue or at page 3 of
 * Sci-Fi under ₹300 rated 4 and up. See #338.
 *
 * Four consequences, all of them the same missing thing:
 *
 *   - Refresh lost every filter.
 *   - Back did not undo a filter; it left the site.
 *   - A filtered view could not be shared or bookmarked.
 *   - Returning from a book page remounted Home with `useState` defaults, so
 *     the search text and the page were gone. That is the one that bites: the
 *     customer searched, paged, opened a book, pressed Back, and had to start
 *     again.
 *
 * These are pure functions over `URLSearchParams`, deliberately: this is a
 * mapping, and a mapping is far easier to be sure about as assertions than as
 * a page that has to be rendered with a router around it.
 *
 * The parameter names are the ones `utils/catalogQuery.js` already sends to
 * the API. One vocabulary for the URL and the request means there is nothing
 * to translate between them and nothing to get out of step.
 */

/** Matches the page size Home asks for. */
export const DEFAULT_PAGE = 1;

/**
 * What "no filter at all" looks like.
 *
 * Frozen, and rebuilt by `emptyFilters()` rather than handed out directly:
 * `genres` is an array, and a shared mutable default is a bug waiting for
 * the first caller that pushes to it.
 */
const EMPTY = Object.freeze({
  search: '',
  genres: Object.freeze([]),
  // Strings, not numbers. These drive `<input type="number">`, which yields a
  // string and an empty one when cleared — and `Number('')` is 0, so a
  // cleared "Min" box held as a number would read as a deliberate "at least
  // 0" filter. utils/catalogQuery.js makes the same distinction.
  minPrice: '',
  maxPrice: '',
  // A number or null, because the rating filter is a radio group with a
  // "clear" affordance rather than a text input.
  minRating: null,
  sort: '',
  page: DEFAULT_PAGE,
});

export function emptyFilters() {
  return { ...EMPTY, genres: [] };
}

/** Sort values the catalogue offers. Anything else in the URL is ignored. */
export const SORT_VALUES = Object.freeze([
  'price_asc',
  'price_desc',
  'rating_desc',
  'title_asc',
]);

/** Rating values the filter offers. */
export const RATING_VALUES = Object.freeze([1, 2, 3, 4]);

/**
 * A non-negative price as a *string*, or '' when the value is unusable.
 *
 * Kept as the string the customer typed rather than normalised through
 * Number, so `?minPrice=250.00` does not silently become `250` in the input
 * while they are looking at it.
 */
function readPrice(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return '';
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    return '';
  }

  return raw.trim();
}

function readPage(raw) {
  const value = Number(raw);

  if (!Number.isInteger(value) || value < 1) {
    return DEFAULT_PAGE;
  }

  return value;
}

function readRating(raw) {
  const value = Number(raw);
  return RATING_VALUES.includes(value) ? value : null;
}

/**
 * Read the filter state out of a URL.
 *
 * Total: every value in a query string is attacker-supplied or, far more
 * often, hand-edited or stale from an old bookmark. Anything unusable falls
 * back to "not filtering by that" rather than throwing or being passed
 * through to the API, which would answer a bad parameter with a 400 and turn
 * a stale bookmark into an error page.
 *
 * @param {URLSearchParams} params
 */
export function readCatalogParams(params) {
  if (!params || typeof params.get !== 'function') {
    return emptyFilters();
  }

  const sort = params.get('sort') ?? '';

  return {
    search: (params.get('search') ?? '').trim(),
    // `?genre=Fiction&genre=Poetry` is what Express hands the backend as an
    // array, and it is what the multi-select means. Duplicates are collapsed
    // because two identical checkboxes cannot both be ticked.
    genres: [
      ...new Set(
        params
          .getAll('genre')
          .map((genre) => genre.trim())
          .filter((genre) => genre !== '' && genre.toLowerCase() !== 'all')
      ),
    ],
    minPrice: readPrice(params.get('minPrice')),
    maxPrice: readPrice(params.get('maxPrice')),
    minRating: readRating(params.get('minRating')),
    sort: SORT_VALUES.includes(sort) ? sort : '',
    page: readPage(params.get('page')),
  };
}

/**
 * Write filter state back into a URL.
 *
 * Defaults are omitted rather than written out. `?page=1&sort=&search=` is
 * the same view as `/`, and a URL a customer might copy should not be full of
 * parameters that mean nothing — that is the difference between a link worth
 * sharing and a link that looks broken.
 *
 * Any parameter the catalogue does not own is carried through untouched, so
 * this cannot eat something another feature put there.
 *
 * @param {object} filters
 * @param {URLSearchParams} [existing] parameters to preserve
 */
export function writeCatalogParams(filters, existing) {
  const params = new URLSearchParams();

  if (existing && typeof existing.forEach === 'function') {
    const owned = new Set([
      'search',
      'genre',
      'minPrice',
      'maxPrice',
      'minRating',
      'sort',
      'page',
    ]);

    existing.forEach((value, key) => {
      if (!owned.has(key)) {
        params.append(key, value);
      }
    });
  }

  const next = { ...emptyFilters(), ...filters };

  const search = String(next.search ?? '').trim();
  if (search !== '') {
    params.set('search', search);
  }

  for (const genre of Array.isArray(next.genres) ? next.genres : []) {
    const cleaned = String(genre ?? '').trim();
    if (cleaned !== '' && cleaned.toLowerCase() !== 'all') {
      params.append('genre', cleaned);
    }
  }

  const minPrice = readPrice(String(next.minPrice ?? ''));
  if (minPrice !== '') {
    params.set('minPrice', minPrice);
  }

  const maxPrice = readPrice(String(next.maxPrice ?? ''));
  if (maxPrice !== '') {
    params.set('maxPrice', maxPrice);
  }

  if (RATING_VALUES.includes(next.minRating)) {
    params.set('minRating', String(next.minRating));
  }

  if (SORT_VALUES.includes(next.sort)) {
    params.set('sort', next.sort);
  }

  const page = readPage(next.page);
  if (page !== DEFAULT_PAGE) {
    params.set('page', String(page));
  }

  return params;
}

/**
 * Is this a change that should return the customer to page 1?
 *
 * Everything except the page itself. Changing a filter while on page 3 of a
 * result set that no longer has three pages leaves a blank grid — the API
 * answers a page past the end with an empty slice, not an error.
 */
export function shouldResetPage(patch) {
  return Object.keys(patch ?? {}).some((key) => key !== 'page');
}

/**
 * Do two filter states describe the same view?
 *
 * Used to avoid writing a history entry for a change that is not one — a
 * controlled input re-emitting its own value, or the search box being
 * hydrated from the URL it was just read from.
 */
export function sameFilters(a, b) {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return (
    String(a.search ?? '') === String(b.search ?? '') &&
    String(a.minPrice ?? '') === String(b.minPrice ?? '') &&
    String(a.maxPrice ?? '') === String(b.maxPrice ?? '') &&
    (a.minRating ?? null) === (b.minRating ?? null) &&
    String(a.sort ?? '') === String(b.sort ?? '') &&
    readPage(a.page) === readPage(b.page) &&
    (a.genres ?? []).join('|') === (b.genres ?? []).join('|')
  );
}

export default {
  DEFAULT_PAGE,
  SORT_VALUES,
  RATING_VALUES,
  emptyFilters,
  readCatalogParams,
  writeCatalogParams,
  shouldResetPage,
  sameFilters,
};
