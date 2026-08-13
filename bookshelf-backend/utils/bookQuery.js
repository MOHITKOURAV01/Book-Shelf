/**
 * Query parsing and in-memory querying for the book catalogue.
 *
 * These are pure functions over a plain array. The catalogue lives in a JSON
 * file, so there is no database to push the work down into — but keeping the
 * logic here rather than in the controller means it can be tested without an
 * HTTP server, and means swapping the JSON file for a real collection later
 * only touches the repository.
 */

export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 100;

/**
 * Sorts the API accepts. The keys match the values the catalogue page already
 * puts in its sort <select>, so the frontend needs no change.
 */
export const SORT_OPTIONS = {
  price_asc: { field: 'price', direction: 1 },
  price_desc: { field: 'price', direction: -1 },
  rating_asc: { field: 'rating', direction: 1 },
  rating_desc: { field: 'rating', direction: -1 },
  title_asc: { field: 'title', direction: 1 },
  title_desc: { field: 'title', direction: -1 },
};

/**
 * The catalogue page sends `genre=All` to mean "no genre filter". Treat it as
 * a sentinel rather than as a genre nobody's book will ever match.
 */
const ALL_GENRES_SENTINEL = 'all';

export class QueryValidationError extends Error {
  constructor(parameter, message) {
    super(message);
    this.name = 'QueryValidationError';
    this.status = 400;
    this.parameter = parameter;
  }
}

/**
 * Accepts either repeated params (`?genre=Fiction&genre=Poetry`, which Express
 * gives us as an array) or a comma separated list (`?genre=Fiction,Poetry`).
 */
function toList(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const raw = Array.isArray(value) ? value : String(value).split(',');

  return raw.map((entry) => String(entry).trim()).filter(Boolean);
}

function parseInteger(value, parameter, { min, max, fallback }) {
  if (value === undefined || value === '') {
    return fallback;
  }

  // Number() would accept '1e3', ' 12 ' and '0x10'. Be strict: the client is
  // building these from form controls, so anything else is a bug worth
  // surfacing rather than guessing at.
  if (!/^-?\d+$/.test(String(value).trim())) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be a whole number, received "${value}"`
    );
  }

  const parsed = Number.parseInt(String(value).trim(), 10);

  if (min !== undefined && parsed < min) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be at least ${min}, received ${parsed}`
    );
  }

  if (max !== undefined && parsed > max) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be at most ${max}, received ${parsed}`
    );
  }

  return parsed;
}

function parseNumber(value, parameter, { min } = {}) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be a number, received "${value}"`
    );
  }

  if (min !== undefined && parsed < min) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be at least ${min}, received ${parsed}`
    );
  }

  return parsed;
}

function parseBoolean(value, parameter) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const normalised = String(value).trim().toLowerCase();

  if (normalised === 'true') return true;
  if (normalised === 'false') return false;

  throw new QueryValidationError(
    parameter,
    `${parameter} must be true or false, received "${value}"`
  );
}

/**
 * Turn a raw Express `req.query` into a validated, normalised shape.
 * Unknown parameters are ignored. Throws QueryValidationError on bad input.
 */
export function parseBookQuery(query = {}) {
  const search = query.search === undefined ? '' : String(query.search).trim();

  const genres = toList(query.genre).filter(
    (genre) => genre.toLowerCase() !== ALL_GENRES_SENTINEL
  );

  const minPrice = parseNumber(query.minPrice, 'minPrice', { min: 0 });
  const maxPrice = parseNumber(query.maxPrice, 'maxPrice', { min: 0 });

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new QueryValidationError(
      'minPrice',
      `minPrice (${minPrice}) cannot be greater than maxPrice (${maxPrice})`
    );
  }

  const minRating = parseNumber(query.minRating, 'minRating', { min: 0 });
  const inStock = parseBoolean(query.inStock, 'inStock');

  let sort;
  if (query.sort !== undefined && query.sort !== '') {
    sort = String(query.sort).trim();
    if (!Object.prototype.hasOwnProperty.call(SORT_OPTIONS, sort)) {
      throw new QueryValidationError(
        'sort',
        `sort must be one of: ${Object.keys(SORT_OPTIONS).join(', ')}. Received "${query.sort}"`
      );
    }
  }

  const page = parseInteger(query.page, 'page', { min: 1, fallback: 1 });
  const limit = parseInteger(query.limit, 'limit', {
    min: 1,
    max: MAX_LIMIT,
    fallback: DEFAULT_LIMIT,
  });

  return {
    search,
    genres,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    sort,
    page,
    limit,
  };
}

export function filterBooks(books, filters = {}) {
  const {
    search = '',
    genres = [],
    minPrice,
    maxPrice,
    minRating,
    inStock,
  } = filters;

  const needle = search.toLowerCase();
  // Compare genres case-insensitively so "fiction" from a URL still matches
  // the "Fiction" stored in books.json.
  const wantedGenres = genres.map((genre) => genre.toLowerCase());

  return books.filter((book) => {
    if (needle) {
      const haystack = `${book.title ?? ''} ${book.author ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    if (wantedGenres.length > 0) {
      if (!wantedGenres.includes(String(book.genre ?? '').toLowerCase())) {
        return false;
      }
    }

    if (minPrice !== undefined && book.price < minPrice) return false;
    if (maxPrice !== undefined && book.price > maxPrice) return false;
    if (minRating !== undefined && book.rating < minRating) return false;

    if (inStock !== undefined) {
      const available = (book.inventory ?? 0) > 0;
      if (available !== inStock) return false;
    }

    return true;
  });
}

export function sortBooks(books, sort) {
  if (!sort) {
    return books;
  }

  const { field, direction } = SORT_OPTIONS[sort];

  // Copy first — callers pass the cached catalogue array and sort() mutates.
  return [...books].sort((a, b) => {
    const left = a[field];
    const right = b[field];

    if (typeof left === 'string' || typeof right === 'string') {
      return String(left).localeCompare(String(right)) * direction;
    }

    return (left - right) * direction;
  });
}

export function paginate(books, page, limit) {
  const totalBooks = books.length;
  const totalPages = totalBooks === 0 ? 0 : Math.ceil(totalBooks / limit);
  const start = (page - 1) * limit;

  return {
    // A page past the end yields an empty slice rather than a 404 — the
    // catalogue shrinking under a bookmarked ?page=5 is not an error.
    books: books.slice(start, start + limit),
    page,
    limit,
    totalBooks,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && totalBooks > 0,
  };
}

/**
 * Run the whole pipeline. Filter first, then sort, then slice, so totalBooks
 * describes the filtered set and not the whole catalogue.
 */
export function queryBooks(books, filters) {
  const filtered = filterBooks(books, filters);
  const sorted = sortBooks(filtered, filters.sort);
  const paginated = paginate(sorted, filters.page, filters.limit);

  return {
    ...paginated,
    appliedFilters: {
      search: filters.search,
      genres: filters.genres,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      inStock: filters.inStock,
      sort: filters.sort ?? null,
    },
  };
}

/**
 * Distinct genres with a count each, so the catalogue sidebar can stop
 * hardcoding its genre list.
 */
export function collectGenres(books) {
  const counts = new Map();

  for (const book of books) {
    const genre = book.genre;
    if (!genre) continue;
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
