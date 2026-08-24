import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/api.js', () => ({
  default: { get: vi.fn() },
}));

const api = (await import('../utils/api.js')).default;
const { getBooksByIds, BookNotFoundError } = await import('./bookService.js');

/**
 * The wishlist stores ids and nothing else, so something has to turn them
 * into books. That used to be a filter over a stale hardcoded array, which
 * silently dropped anything it did not recognise. See #328.
 */

function bookResponse(book) {
  return { data: book };
}

/** The normalised shape utils/api.js rejects with. */
function notFound(id) {
  return { status: 404, code: 'NOT_FOUND', message: `Book not found: ${id}` };
}

describe('getBooksByIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves every id against the API', async () => {
    api.get.mockImplementation((url) =>
      Promise.resolve(bookResponse({ id: url.split('/').pop(), title: url }))
    );

    const result = await getBooksByIds(['b1', 'b2']);

    expect(result.books.map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(result.missingIds).toEqual([]);
    expect(result.failedIds).toEqual([]);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('reports a 404 as missing rather than dropping it silently', async () => {
    api.get.mockImplementation((url) =>
      url.endsWith('s3')
        ? Promise.reject(notFound('s3'))
        : Promise.resolve(bookResponse({ id: 'b1' }))
    );

    const result = await getBooksByIds(['b1', 's3']);

    expect(result.books.map((b) => b.id)).toEqual(['b1']);
    expect(result.missingIds).toEqual(['s3']);
    expect(result.failedIds).toEqual([]);
  });

  it('separates "not in the catalogue" from "could not be fetched"', async () => {
    // Saying a book has been delisted when the request merely timed out
    // would be a lie told by a flaky network.
    api.get.mockImplementation((url) => {
      if (url.endsWith('s3')) return Promise.reject(notFound('s3'));
      if (url.endsWith('b2')) {
        return Promise.reject({ status: 0, code: 'NETWORK_ERROR', message: 'Network error.' });
      }
      return Promise.resolve(bookResponse({ id: 'b1' }));
    });

    const result = await getBooksByIds(['b1', 'b2', 's3']);

    expect(result.books.map((b) => b.id)).toEqual(['b1']);
    expect(result.missingIds).toEqual(['s3']);
    expect(result.failedIds).toEqual(['b2']);
  });

  it('treats the service\'s own BookNotFoundError as missing', async () => {
    api.get.mockRejectedValue(new BookNotFoundError('b9'));

    const result = await getBooksByIds(['b9']);

    expect(result.missingIds).toEqual(['b9']);
    expect(result.failedIds).toEqual([]);
  });

  it('one failure does not lose the books that did resolve', async () => {
    api.get.mockImplementation((url) =>
      url.endsWith('b2')
        ? Promise.reject({ status: 500, message: 'boom' })
        : Promise.resolve(bookResponse({ id: url.split('/').pop() }))
    );

    const result = await getBooksByIds(['b1', 'b2', 'b3']);

    expect(result.books.map((b) => b.id)).toEqual(['b1', 'b3']);
    expect(result.failedIds).toEqual(['b2']);
  });

  it('fetches each id once even if the list repeats it', async () => {
    api.get.mockResolvedValue(bookResponse({ id: 'b1' }));

    const result = await getBooksByIds(['b1', 'b1', 'b1']);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result.books).toHaveLength(1);
  });

  it('ignores entries that are not usable ids', async () => {
    api.get.mockResolvedValue(bookResponse({ id: 'b1' }));

    await getBooksByIds(['b1', '', '   ', null, undefined, 42]);

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('makes no request at all for an empty or invalid list', async () => {
    expect(await getBooksByIds([])).toEqual({ books: [], missingIds: [], failedIds: [] });
    expect(await getBooksByIds(null)).toEqual({ books: [], missingIds: [], failedIds: [] });
    expect(await getBooksByIds(undefined)).toEqual({ books: [], missingIds: [], failedIds: [] });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('passes the abort signal through to every request', async () => {
    api.get.mockResolvedValue(bookResponse({ id: 'b1' }));
    const controller = new AbortController();

    await getBooksByIds(['b1', 'b2'], { signal: controller.signal });

    for (const call of api.get.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ signal: controller.signal }));
    }
  });
});
