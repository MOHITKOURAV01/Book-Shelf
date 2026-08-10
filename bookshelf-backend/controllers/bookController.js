import { getBooks } from '../repositories/bookRepository.js';

export const getAllBooks = (req, res, next) => {
  try {
    const books = getBooks();
    res.status(200).json(books);
  } catch (error) {
    next(error);
  }
};
