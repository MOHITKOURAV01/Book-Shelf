import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseBookQuery,
  filterBooks,
  sortBooks,
  paginate,
  queryBooks,
  collectGenres,
  QueryValidationError,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../utils/bookQuery.js';

// A fixed catalogue so the tests do not move when data/books.json changes.
const CATALOGUE = [
  { id: 'b1', title: 'The Quiet Ones', author: 'M. Arora', genre: 'Fiction', price: 349, rating: 4.5, inventory: 8 },
  { id: 'b2', title: 'Field Notes', author: 'D. Kapoor', genre: 'Self-Help', price: 299, rating: 4.2, inventory: 10 },
  { id: 'b3', title: 'Half Moon Bay', author: 'S. Rhee', genre: 'Mystery', price: 399, rating: 4.7, inventory: 0 },
  { id: 'b4', title: 'Static', author: 'A. Voss', genre: 'Sci-Fi', price: 449, rating: 4.3, inventory: 10 },
  { id: 'b5', title: 'Low Tide', author: 'R. Menon', genre: 'Poetry', price: 249, rating: 4.0, inventory: 5 },
  { id: 'b6', title: 'Quiet Water', author: 'M. Arora', genre: 'Fiction', price: 199, rating: 3.8, inventory: 2 },
];

const ids = (books) => books.map((book) => book.id);

describe('parseBookQuery', () => {
  test('applies defaults for an empty query', () => {
    const parsed = parseBookQuery({});

    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, DEFAULT_LIMIT);
    assert.equal(parsed.search, '');
    assert.deepEqual(parsed.genres, []);
    assert.equal(parsed.sort, undefined);
  });

  test('ignores unknown parameters instead of failing', () => {
    const parsed = parseBookQuery({ colour: 'red', utm_source: 'newsletter' });

    assert.equal(parsed.page, 1);
    assert.equal(parsed.limit, DEFAULT_LIMIT);
  });

  test('trims the search term', () => {
    assert.equal(parseBookQuery({ search: '  quiet  ' }).search, 'quiet');
  });

  test('treats genre=All as no genre filter', () => {
    assert.deepEqual(parseBookQuery({ genre: 'All' }).genres, []);
    assert.deepEqual(parseBookQuery({ genre: 'all' }).genres, []);
  });

  test('accepts a repeated genre parameter', () => {
    const parsed = parseBookQuery({ genre: ['Fiction', 'Poetry'] });
    assert.deepEqual(parsed.genres, ['Fiction', 'Poetry']);
  });

  test('accepts a comma separated genre parameter', () => {
    const parsed = parseBookQuery({ genre: 'Fiction, Poetry' });
    assert.deepEqual(parsed.genres, ['Fiction', 'Poetry']);
  });

  test('drops the All sentinel from a mixed list', () => {
    const parsed = parseBookQuery({ genre: ['All', 'Mystery'] });
    assert.deepEqual(parsed.genres, ['Mystery']);
  });

  test('rejects a non-numeric page', () => {
    assert.throws(
      () => parseBookQuery({ page: 'abc' }),
      (error) => {
        assert.ok(error instanceof QueryValidationError);
        assert.equal(error.status, 400);
        assert.equal(error.parameter, 'page');
        return true;
      }
    );
  });

  test('rejects page below 1', () => {
    assert.throws(() => parseBookQuery({ page: '-1' }), QueryValidationError);
    assert.throws(() => parseBookQuery({ page: '0' }), QueryValidationError);
  });

  test('rejects a limit above the maximum', () => {
    assert.throws(
      () => parseBookQuery({ limit: String(MAX_LIMIT + 1) }),
      (error) => error.parameter === 'limit'
    );
  });

  test('rejects a float dressed up as a page', () => {
    assert.throws(() => parseBookQuery({ page: '1.5' }), QueryValidationError);
  });

  test('rejects an unknown sort', () => {
    assert.throws(
      () => parseBookQuery({ sort: 'nonsense' }),
      (error) => {
        assert.equal(error.parameter, 'sort');
        assert.match(error.message, /price_asc/);
        return true;
      }
    );
  });

  test('accepts an empty sort as "no sort"', () => {
    assert.equal(parseBookQuery({ sort: '' }).sort, undefined);
  });

  test('rejects minPrice greater than maxPrice', () => {
    assert.throws(
      () => parseBookQuery({ minPrice: '500', maxPrice: '100' }),
      (error) => error.parameter === 'minPrice'
    );
  });

  test('rejects a negative price bound', () => {
    assert.throws(() => parseBookQuery({ minPrice: '-5' }), QueryValidationError);
  });

  test('parses inStock as a boolean', () => {
    assert.equal(parseBookQuery({ inStock: 'true' }).inStock, true);
    assert.equal(parseBookQuery({ inStock: 'FALSE' }).inStock, false);
    assert.equal(parseBookQuery({}).inStock, undefined);
  });

  test('rejects a non-boolean inStock', () => {
    assert.throws(() => parseBookQuery({ inStock: 'yes' }), QueryValidationError);
  });
});

describe('filterBooks', () => {
  test('returns everything when no filters are set', () => {
    assert.equal(filterBooks(CATALOGUE, {}).length, CATALOGUE.length);
  });

  test('matches a partial title, case-insensitively', () => {
    assert.deepEqual(ids(filterBooks(CATALOGUE, { search: 'quiet' })), ['b1', 'b6']);
  });

  test('searches the author as well as the title', () => {
    assert.deepEqual(ids(filterBooks(CATALOGUE, { search: 'arora' })), ['b1', 'b6']);
  });

  test('filters by a single genre, case-insensitively', () => {
    assert.deepEqual(ids(filterBooks(CATALOGUE, { genres: ['fiction'] })), ['b1', 'b6']);
  });

  test('filters by several genres at once', () => {
    assert.deepEqual(
      ids(filterBooks(CATALOGUE, { genres: ['Poetry', 'Mystery'] })),
      ['b3', 'b5']
    );
  });

  test('applies an inclusive price range', () => {
    assert.deepEqual(
      ids(filterBooks(CATALOGUE, { minPrice: 249, maxPrice: 349 })),
      ['b1', 'b2', 'b5']
    );
  });

  test('applies an inclusive rating floor', () => {
    assert.deepEqual(ids(filterBooks(CATALOGUE, { minRating: 4.5 })), ['b1', 'b3']);
  });

  test('filters on stock in both directions', () => {
    assert.deepEqual(ids(filterBooks(CATALOGUE, { inStock: false })), ['b3']);
    assert.equal(filterBooks(CATALOGUE, { inStock: true }).length, 5);
  });

  test('combines filters', () => {
    const result = filterBooks(CATALOGUE, {
      genres: ['Fiction'],
      maxPrice: 250,
    });
    assert.deepEqual(ids(result), ['b6']);
  });

  test('returns an empty array when nothing matches', () => {
    assert.deepEqual(filterBooks(CATALOGUE, { search: 'zzzz' }), []);
  });
});

describe('sortBooks', () => {
  test('leaves the order alone when no sort is given', () => {
    assert.deepEqual(ids(sortBooks(CATALOGUE, undefined)), ids(CATALOGUE));
  });

  test('sorts by price ascending and descending', () => {
    assert.equal(sortBooks(CATALOGUE, 'price_asc')[0].id, 'b6');
    assert.equal(sortBooks(CATALOGUE, 'price_desc')[0].id, 'b4');
  });

  test('sorts by rating descending', () => {
    assert.equal(sortBooks(CATALOGUE, 'rating_desc')[0].id, 'b3');
  });

  test('sorts titles alphabetically', () => {
    assert.equal(sortBooks(CATALOGUE, 'title_asc')[0].title, 'Field Notes');
    assert.equal(sortBooks(CATALOGUE, 'title_desc')[0].title, 'The Quiet Ones');
  });

  test('does not mutate the array it is given', () => {
    const original = ids(CATALOGUE);
    sortBooks(CATALOGUE, 'price_desc');
    assert.deepEqual(ids(CATALOGUE), original);
  });
});

describe('paginate', () => {
  test('slices the requested page', () => {
    const result = paginate(CATALOGUE, 2, 2);

    assert.deepEqual(ids(result.books), ['b3', 'b4']);
    assert.equal(result.page, 2);
    assert.equal(result.totalBooks, 6);
    assert.equal(result.totalPages, 3);
    assert.equal(result.hasNextPage, true);
    assert.equal(result.hasPrevPage, true);
  });

  test('flags the first and last page correctly', () => {
    assert.equal(paginate(CATALOGUE, 1, 2).hasPrevPage, false);
    assert.equal(paginate(CATALOGUE, 3, 2).hasNextPage, false);
  });

  test('rounds a partial last page up', () => {
    assert.equal(paginate(CATALOGUE, 1, 4).totalPages, 2);
    assert.equal(paginate(CATALOGUE, 2, 4).books.length, 2);
  });

  test('returns an empty page past the end rather than erroring', () => {
    const result = paginate(CATALOGUE, 99, 10);

    assert.deepEqual(result.books, []);
    assert.equal(result.totalBooks, 6);
    assert.equal(result.hasNextPage, false);
  });

  test('handles an empty catalogue', () => {
    const result = paginate([], 1, 10);

    assert.deepEqual(result.books, []);
    assert.equal(result.totalPages, 0);
    assert.equal(result.hasPrevPage, false);
  });
});

describe('queryBooks', () => {
  test('filters before paginating, so totalBooks is the filtered count', () => {
    const result = queryBooks(
      CATALOGUE,
      parseBookQuery({ genre: 'Fiction', limit: '1' })
    );

    assert.equal(result.totalBooks, 2);
    assert.equal(result.totalPages, 2);
    assert.equal(result.books.length, 1);
  });

  test('sorts the filtered set, not just the page', () => {
    const result = queryBooks(
      CATALOGUE,
      parseBookQuery({ sort: 'price_asc', limit: '2' })
    );

    assert.deepEqual(ids(result.books), ['b6', 'b5']);
  });

  test('returns the keys the catalogue page reads', () => {
    const result = queryBooks(CATALOGUE, parseBookQuery({}));

    for (const key of ['books', 'totalPages', 'totalBooks']) {
      assert.ok(key in result, `expected "${key}" in the response`);
    }
  });

  test('echoes the filters it applied', () => {
    const result = queryBooks(
      CATALOGUE,
      parseBookQuery({ search: 'quiet', genre: 'Fiction', sort: 'price_asc' })
    );

    assert.equal(result.appliedFilters.search, 'quiet');
    assert.deepEqual(result.appliedFilters.genres, ['Fiction']);
    assert.equal(result.appliedFilters.sort, 'price_asc');
  });

  test('reports sort as null when none was requested', () => {
    const result = queryBooks(CATALOGUE, parseBookQuery({}));
    assert.equal(result.appliedFilters.sort, null);
  });
});

describe('collectGenres', () => {
  test('counts each distinct genre', () => {
    assert.deepEqual(collectGenres(CATALOGUE), [
      { name: 'Fiction', count: 2 },
      { name: 'Mystery', count: 1 },
      { name: 'Poetry', count: 1 },
      { name: 'Sci-Fi', count: 1 },
      { name: 'Self-Help', count: 1 },
    ]);
  });

  test('skips books with no genre', () => {
    const genres = collectGenres([...CATALOGUE, { id: 'b7', title: 'Untitled' }]);
    assert.equal(genres.length, 5);
  });

  test('handles an empty catalogue', () => {
    assert.deepEqual(collectGenres([]), []);
  });
});
