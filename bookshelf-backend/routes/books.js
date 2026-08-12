import express from 'express';
import {
  getAllBooks,
  getBook,
  getBookGenres,
} from '../controllers/bookController.js';

const router = express.Router();

router.get('/', getAllBooks);

// Must be registered before '/:id', otherwise Express matches "genres" as an
// id and this route becomes unreachable.
router.get('/genres', getBookGenres);

router.get('/:id', getBook);

export default router;
