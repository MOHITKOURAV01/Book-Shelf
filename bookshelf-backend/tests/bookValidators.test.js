import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { validate } from '../utils/validators.js';
import {
  createBookSchema,
  updateBookSchema,
  updateStockSchema,
} from '../validators/bookValidators.js';

function fieldsWithErrors(errors) {
  return errors.map((error) => error.field);
}

describe('createBookSchema', () => {
  test('accepts a valid book payload', () => {
    const { errors, values } = validate(
      {
        title: ' The Great Gatsby ',
        author: ' F. Scott Fitzgerald ',
        genre: ' Classic ',
        price: 15.99,
        inventory: 10,
        rating: 4.5,
        description: 'A masterpiece of American literature.',
        pages: 180,
      },
      createBookSchema
    );

    assert.deepEqual(errors, []);
    assert.equal(values.title, 'The Great Gatsby');
    assert.equal(values.author, 'F. Scott Fitzgerald');
    assert.equal(values.genre, 'Classic');
    assert.equal(values.price, 15.99);
    assert.equal(values.inventory, 10);
  });

  test('rejects missing required fields', () => {
    const { errors } = validate({}, createBookSchema);
    const fields = fieldsWithErrors(errors).sort();
    assert.deepEqual(fields, ['author', 'genre', 'inventory', 'price', 'title']);
  });

  test('rejects negative price or inventory', () => {
    const { errors } = validate(
      {
        title: 'Test',
        author: 'Test Author',
        genre: 'Test Genre',
        price: -10,
        inventory: -5,
      },
      createBookSchema
    );
    const fields = fieldsWithErrors(errors).sort();
    assert.deepEqual(fields, ['inventory', 'price']);
  });

  test('rejects rating greater than 5', () => {
    const { errors } = validate(
      {
        title: 'Test',
        author: 'Test Author',
        genre: 'Test Genre',
        price: 10,
        inventory: 5,
        rating: 6,
      },
      createBookSchema
    );
    assert.deepEqual(fieldsWithErrors(errors), ['rating']);
  });
});

describe('updateBookSchema', () => {
  test('accepts partial updates', () => {
    const { errors, values } = validate(
      {
        price: 19.99,
        inventory: 20,
      },
      updateBookSchema
    );

    assert.deepEqual(errors, []);
    assert.equal(values.price, 19.99);
    assert.equal(values.inventory, 20);
  });

  test('rejects invalid fields in partial update', () => {
    const { errors } = validate(
      { price: 'free' },
      updateBookSchema
    );

    assert.deepEqual(fieldsWithErrors(errors), ['price']);
  });
});

describe('updateStockSchema', () => {
  test('accepts valid inventory number', () => {
    const { errors } = validate({ inventory: 50 }, updateStockSchema);
    assert.deepEqual(errors, []);
  });

  test('rejects missing or negative inventory', () => {
    const { errors } = validate({ inventory: -1 }, updateStockSchema);
    assert.deepEqual(fieldsWithErrors(errors), ['inventory']);
  });
});
