import {
  required,
  isString,
  maxLength,
  trim,
  isNumber,
  minNumber,
} from '../utils/validators.js';

export const createBookSchema = {
  title: {
    normalise: trim,
    rules: [required('title'), isString('title'), maxLength('title', 200)],
  },
  author: {
    normalise: trim,
    rules: [required('author'), isString('author'), maxLength('author', 100)],
  },
  genre: {
    normalise: trim,
    rules: [required('genre'), isString('genre'), maxLength('genre', 50)],
  },
  price: {
    rules: [
      required('price'),
      isNumber('price'),
      minNumber('price', 0),
    ],
  },
  inventory: {
    rules: [
      required('inventory'),
      isNumber('inventory'),
      minNumber('inventory', 0),
    ],
  },
  rating: {
    rules: [
      isNumber('rating'),
      minNumber('rating', 0),
      (val) => (typeof val === 'number' && val > 5 ? 'rating must be at most 5' : null),
    ],
  },
  description: {
    normalise: trim,
    rules: [isString('description'), maxLength('description', 2000)],
  },
  coverImage: {
    normalise: trim,
    rules: [isString('coverImage')],
  },
  pages: {
    rules: [
      isNumber('pages'),
      minNumber('pages', 1),
    ],
  },
};

export const updateBookSchema = {
  title: {
    normalise: trim,
    rules: [isString('title'), maxLength('title', 200)],
  },
  author: {
    normalise: trim,
    rules: [isString('author'), maxLength('author', 100)],
  },
  genre: {
    normalise: trim,
    rules: [isString('genre'), maxLength('genre', 50)],
  },
  price: {
    rules: [
      isNumber('price'),
      minNumber('price', 0),
    ],
  },
  inventory: {
    rules: [
      isNumber('inventory'),
      minNumber('inventory', 0),
    ],
  },
  rating: {
    rules: [
      isNumber('rating'),
      minNumber('rating', 0),
      (val) => (typeof val === 'number' && val > 5 ? 'rating must be at most 5' : null),
    ],
  },
  description: {
    normalise: trim,
    rules: [isString('description'), maxLength('description', 2000)],
  },
  coverImage: {
    normalise: trim,
    rules: [isString('coverImage')],
  },
  pages: {
    rules: [
      isNumber('pages'),
      minNumber('pages', 1),
    ],
  },
};

export const updateStockSchema = {
  inventory: {
    rules: [
      required('inventory'),
      isNumber('inventory'),
      minNumber('inventory', 0),
    ],
  },
};
