import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createBook,
  updateBook,
  deleteBook,
  updateBookStock,
} from '../controllers/bookController.js';
import bookRepository from '../repositories/bookRepository.js';

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('Admin Book Management Controllers', () => {
  test('createBook controller returns 201 and created book', () => {
    const originalAddBook = bookRepository.addBook;
    bookRepository.addBook = (data) => ({
      id: 'b999',
      ...data,
      __v: 0,
    });

    try {
      const req = {
        body: {
          title: 'Dune',
          author: 'Frank Herbert',
          genre: 'Sci-Fi',
          price: 24.99,
          inventory: 15,
        },
      };
      const res = makeRes();
      let nextError = null;

      createBook(req, res, (err) => {
        nextError = err;
      });

      assert.equal(nextError, null);
      assert.equal(res.statusCode, 201);
      assert.equal(res.body.message, 'Book created successfully');
      assert.equal(res.body.book.id, 'b999');
      assert.equal(res.body.book.title, 'Dune');
    } finally {
      bookRepository.addBook = originalAddBook;
    }
  });

  test('updateBook controller returns 200 on success and 404 on missing book', () => {
    const originalUpdateBook = bookRepository.updateBook;
    bookRepository.updateBook = (id, data) => {
      if (id === 'b1') {
        return { id, title: 'Updated Title', price: data.price };
      }
      return null;
    };

    try {
      // Success case
      const reqSuccess = { params: { id: 'b1' }, body: { price: 29.99 } };
      const resSuccess = makeRes();
      updateBook(reqSuccess, resSuccess, () => {});

      assert.equal(resSuccess.statusCode, 200);
      assert.equal(resSuccess.body.book.price, 29.99);

      // Not found case
      const reqNotFound = { params: { id: 'invalid' }, body: { price: 29.99 } };
      const resNotFound = makeRes();
      updateBook(reqNotFound, resNotFound, () => {});

      assert.equal(resNotFound.statusCode, 404);
      assert.match(resNotFound.body.message, /not found/i);
    } finally {
      bookRepository.updateBook = originalUpdateBook;
    }
  });

  test('deleteBook controller returns 200 on success and 404 on missing book', () => {
    const originalDeleteBook = bookRepository.deleteBook;
    bookRepository.deleteBook = (id) => id === 'b1';

    try {
      const reqSuccess = { params: { id: 'b1' } };
      const resSuccess = makeRes();
      deleteBook(reqSuccess, resSuccess, () => {});

      assert.equal(resSuccess.statusCode, 200);
      assert.equal(resSuccess.body.message, 'Book deleted successfully');

      const reqNotFound = { params: { id: 'invalid' } };
      const resNotFound = makeRes();
      deleteBook(reqNotFound, resNotFound, () => {});

      assert.equal(resNotFound.statusCode, 404);
    } finally {
      bookRepository.deleteBook = originalDeleteBook;
    }
  });

  test('updateBookStock controller updates inventory', () => {
    const originalUpdateStock = bookRepository.updateBookStock;
    bookRepository.updateBookStock = (id, inventory) => {
      if (id === 'b1') return { id, inventory };
      return null;
    };

    try {
      const req = { params: { id: 'b1' }, body: { inventory: 100 } };
      const res = makeRes();
      updateBookStock(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.book.inventory, 100);
    } finally {
      bookRepository.updateBookStock = originalUpdateStock;
    }
  });
});
