import api from '../utils/api.js';

/**
 * The catalogue, from the API.
 *
 * `src/data/books.js` is a hardcoded copy of `bookshelf-backend/data/books.json`
 * that says so in its own header comment — "Kept local here for the
 * frontend-only draft". Home was moved onto the API in #274; the book detail
 * page was not, so the grid and the page it links to have been reading
 * different data ever since. Nothing keeps the two files in sync and nothing
 * would fail if they diverged. See #317.
 *
 * Every function here goes through `utils/api.js`, so it inherits the retry
 * policy (GETs only), the 10s timeout and the normalised error shape
 * `{ status, message, code }`.
 */

/** Raised for a book id the catalogue does not have. */
export class BookNotFoundError extends Error {
  constructor(bookId) {
    super(`Book not found: ${bookId}`);
    this.name = 'BookNotFoundError';
    this.status = 404;
    this.bookId = bookId;
  }
}

/**
 * Fetch one book.
 *
 * `signal` is passed through to axios so a component that unmounts, or that
 * asks for a different id, can drop the request it no longer wants.
 */
export async function getBookById(bookId, { signal } = {}) {
  if (typeof bookId !== 'string' || bookId.trim() === '') {
    throw new BookNotFoundError(String(bookId));
  }

  try {
    const response = await api.get(`/books/${encodeURIComponent(bookId.trim())}`, {
      signal,
    });
    return response.data;
  } catch (error) {
    // utils/api.js normalises to { status, code, message }; a bare axios
    // cancellation is not normalised and keeps its own shape.
    if (error?.status === 404) {
      throw new BookNotFoundError(bookId);
    }
    throw error;
  }
}

/**
 * Fetch a page of the catalogue.
 *
 * `params` maps straight onto what `utils/bookQuery.js` parses — `search`,
 * `genre` (repeatable), `minPrice`, `maxPrice`, `minRating`, `inStock`,
 * `sort`, `page`, `limit`.
 */
export async function getBooks(params = {}, { signal } = {}) {
  const response = await api.get('/books', { params, signal });
  return response.data;
}

/** Distinct genres with counts, from GET /api/books/genres. */
export async function getGenres({ signal } = {}) {
  const response = await api.get('/books/genres', { signal });
  return response.data?.genres ?? [];
}

export default { getBookById, getBooks, getGenres, BookNotFoundError };
