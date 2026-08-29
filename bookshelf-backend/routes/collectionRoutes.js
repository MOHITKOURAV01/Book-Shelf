import express from 'express';
import {
  getCollections, getCollection, createCollection, updateCollection,
  deleteCollection, addBook, removeBook,
} from '../controllers/collectionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCollections)
  .post(createCollection);

router.route('/:id')
  .get(getCollection)
  .put(updateCollection)
  .delete(deleteCollection);

router.post('/:id/books', addBook);
router.delete('/:id/books/:bookId', removeBook);

export default router;
