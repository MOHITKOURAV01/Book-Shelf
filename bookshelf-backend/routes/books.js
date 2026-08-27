import express from 'express';
import {
  getAllBooks,
  getBook,
  getBookGenres,
  createBook,
  updateBook,
  deleteBook,
  updateBookStock,
} from '../controllers/bookController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateBody.js';
import {
  createBookSchema,
  updateBookSchema,
  updateStockSchema,
} from '../validators/bookValidators.js';

const router = express.Router();

router.get('/', getAllBooks);

// Must be registered before '/:id', otherwise Express matches "genres" as an
// id and this route becomes unreachable.
router.get('/genres', getBookGenres);

router.get('/:id', getBook);

router.post('/', protect, admin, validateBody(createBookSchema), createBook);
router.put('/:id', protect, admin, validateBody(updateBookSchema), updateBook);
router.delete('/:id', protect, admin, deleteBook);
router.patch('/:id/stock', protect, admin, validateBody(updateStockSchema), updateBookStock);

export default router;
