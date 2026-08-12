import { getBooks, getBookById } from '../repositories/bookRepository.js';
import {
  parseBookQuery,
  queryBooks,
  collectGenres,
  QueryValidationError,
} from '../utils/bookQuery.js';

// @desc    List books with search, filter, sort and pagination
// @route   GET /api/books
// @access  Public
export const getAllBooks = (req, res, next) => {
  try {
    const filters = parseBookQuery(req.query);
    const result = queryBooks(getBooks(), filters);

    res.status(200).json(result);
  } catch (error) {
    // A bad query string is the client's mistake, not a server fault, so it
    // is answered here rather than handed to the generic error handler
    // (which would turn it into a 500).
    if (error instanceof QueryValidationError) {
      return res.status(400).json({
        message: error.message,
        parameter: error.parameter,
      });
    }

    next(error);
  }
};

// @desc    Distinct genres in the catalogue, with counts
// @route   GET /api/books/genres
// @access  Public
export const getBookGenres = (req, res, next) => {
  try {
    res.status(200).json({ genres: collectGenres(getBooks()) });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch a single book
// @route   GET /api/books/:id
// @access  Public
export const getBook = (req, res, next) => {
  try {
    const book = getBookById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: `Book not found: ${req.params.id}`,
      });
    }

    res.status(200).json(book);
  } catch (error) {
    next(error);
  }
};
