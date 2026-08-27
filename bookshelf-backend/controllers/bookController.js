import bookRepository from '../repositories/bookRepository.js';
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
    const result = queryBooks(bookRepository.getBooks(), filters);

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
    res.status(200).json({ genres: collectGenres(bookRepository.getBooks()) });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch a single book
// @route   GET /api/books/:id
// @access  Public
export const getBook = (req, res, next) => {
  try {
    const book = bookRepository.getBookById(req.params.id);

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

// @desc    Create a new book
// @route   POST /api/books
// @access  Admin
export const createBook = (req, res, next) => {
  try {
    const newBook = bookRepository.addBook(req.body);
    res.status(201).json({
      message: 'Book created successfully',
      book: newBook,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing book
// @route   PUT /api/books/:id
// @access  Admin
export const updateBook = (req, res, next) => {
  try {
    const updated = bookRepository.updateBook(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        message: `Book not found: ${req.params.id}`,
      });
    }

    res.status(200).json({
      message: 'Book updated successfully',
      book: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Admin
export const deleteBook = (req, res, next) => {
  try {
    const success = bookRepository.deleteBook(req.params.id);
    if (!success) {
      return res.status(404).json({
        message: `Book not found: ${req.params.id}`,
      });
    }

    res.status(200).json({
      message: 'Book deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update book stock / inventory level
// @route   PATCH /api/books/:id/stock
// @access  Admin
export const updateBookStock = (req, res, next) => {
  try {
    const updated = bookRepository.updateBookStock(req.params.id, req.body.inventory);
    if (!updated) {
      return res.status(404).json({
        message: `Book not found: ${req.params.id}`,
      });
    }

    res.status(200).json({
      message: 'Stock updated successfully',
      book: updated,
    });
  } catch (error) {
    next(error);
  }
};
