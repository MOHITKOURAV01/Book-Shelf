import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import * as bookService from '../services/bookService.js';
import { STORAGE_KEY, readRecentlyViewed } from '../utils/recentlyViewed.js';
import { useRecentlyViewedBooks } from './useRecentlyViewedBooks.js';

/**
 * The reader's history, resolved against the catalogue.
 *
 * Split out from the component so the parts that are easy to get wrong — when
 * the stored list is re-read, which ids get pruned, what `enabled` suppresses
 * — can be asserted without rendering a router and a book card. See #336.
 */

vi.mock('../services/bookService.js', async () => {
  const actual = await vi.importActual('../services/bookService.js');
  return { ...actual, getBooksByIds: vi.fn() };
});

const CATALOGUE = {
  b1: { id: 'b1', title: 'One' },
  b2: { id: 'b2', title: 'Two' },
  b3: { id: 'b3', title: 'Three' },
};

function serveCatalogue() {
  bookService.getBooksByIds.mockImplementation(async (ids) => {
    const books = [];
    const missingIds = [];

    for (const id of ids) {
      if (CATALOGUE[id]) {
        books.push(CATALOGUE[id]);
      } else {
        missingIds.push(id);
      }
    }

    return { books, missingIds, failedIds: [] };
  });
}

const store = (...ids) =>
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  serveCatalogue();
});

describe('useRecentlyViewedBooks', () => {
  it('resolves the stored ids against the API', async () => {
    store('b1', 'b2');

    const { result } = renderHook(() => useRecentlyViewedBooks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('excludes the book the page is already showing', async () => {
    store('b1', 'b2', 'b3');

    const { result } = renderHook(() =>
      useRecentlyViewedBooks({ excludeId: 'b2' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books.map((b) => b.id)).toEqual(['b1', 'b3']);
    expect(bookService.getBooksByIds.mock.calls[0][0]).not.toContain('b2');
  });

  it('re-reads storage when the location key changes', async () => {
    // recordBookView writes from a sibling effect in the same component, so a
    // list read once at mount would be one navigation behind.
    store('b1');

    const { result, rerender } = renderHook(
      ({ locationKey }) => useRecentlyViewedBooks({ locationKey }),
      { initialProps: { locationKey: 'first' } }
    );

    await waitFor(() => expect(result.current.books).toHaveLength(1));

    store('b2', 'b1');
    rerender({ locationKey: 'second' });

    await waitFor(() =>
      expect(result.current.books.map((b) => b.id)).toEqual(['b2', 'b1'])
    );
  });

  it('prunes an id the catalogue answered 404 for', async () => {
    store('b1', 'delisted', 'b2');

    const { result } = renderHook(() => useRecentlyViewedBooks());

    await waitFor(() => expect(result.current.missingIds).toEqual(['delisted']));
    await waitFor(() => expect(readRecentlyViewed()).toEqual(['b1', 'b2']));
  });

  it('keeps an id whose request only failed', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [CATALOGUE.b1],
      missingIds: [],
      failedIds: ['b2'],
    });

    store('b1', 'b2');

    const { result } = renderHook(() => useRecentlyViewedBooks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.failedIds).toEqual(['b2']);
    expect(readRecentlyViewed()).toEqual(['b1', 'b2']);
  });

  it('does not prune on every render once it has pruned', async () => {
    store('b1', 'delisted');

    const { rerender } = renderHook(() => useRecentlyViewedBooks());

    await waitFor(() => expect(readRecentlyViewed()).toEqual(['b1']));

    const callsAfterPrune = bookService.getBooksByIds.mock.calls.length;
    rerender();
    rerender();

    expect(bookService.getBooksByIds.mock.calls.length).toBe(callsAfterPrune);
  });

  it('requests nothing when nothing has been viewed', async () => {
    const { result } = renderHook(() => useRecentlyViewedBooks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(bookService.getBooksByIds).not.toHaveBeenCalled();
  });

  it('reads and requests nothing when disabled', async () => {
    store('b1', 'b2');

    const { result } = renderHook(() =>
      useRecentlyViewedBooks({ enabled: false })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(bookService.getBooksByIds).not.toHaveBeenCalled();
    expect(result.current.books).toEqual([]);
  });

  it('starts working the moment it is enabled', async () => {
    store('b1');

    const { result, rerender } = renderHook(
      ({ enabled }) => useRecentlyViewedBooks({ enabled }),
      { initialProps: { enabled: false } }
    );

    expect(bookService.getBooksByIds).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.books).toHaveLength(1));
  });

  it('surfaces a failure rather than hanging', async () => {
    bookService.getBooksByIds.mockRejectedValue({ status: 500 });
    store('b1');

    const { result } = renderHook(() => useRecentlyViewedBooks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatchObject({ status: 500 });
    expect(result.current.books).toEqual([]);
  });

  it('re-reads on demand through refresh()', async () => {
    store('b1');

    const { result } = renderHook(() => useRecentlyViewedBooks());

    await waitFor(() => expect(result.current.books).toHaveLength(1));

    store('b1', 'b2');
    result.current.refresh();

    await waitFor(() => expect(result.current.books).toHaveLength(2));
  });
});
