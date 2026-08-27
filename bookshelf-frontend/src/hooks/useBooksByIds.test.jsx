import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import * as bookService from '../services/bookService.js';
import { useBooksByIds, isCanceled } from './useBooksByIds.js';

/**
 * The shared id-resolver behind the wishlist (#328) and the Recently Viewed
 * strip (#336).
 *
 * Both used to do `books.filter(b => ids.includes(b.id))` against
 * `src/data/books.js`, a hardcoded local snapshot of the catalogue. That is a
 * silent drop in one direction and a phantom card in the other. The rules
 * that replace it — ordering, deduplication of effects, 404 vs failure, abort
 * on unmount — are all easy to get subtly wrong, which is why they live in
 * one hook and are asserted here rather than twice over in two page tests.
 */

vi.mock('../services/bookService.js', async () => {
  const actual = await vi.importActual('../services/bookService.js');
  return { ...actual, getBooksByIds: vi.fn() };
});

const book = (id, title) => ({ id, title });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBooksByIds', () => {
  it('resolves ids to books', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [book('b1', 'One'), book('b2', 'Two')],
      missingIds: [],
      failedIds: [],
    });

    const { result } = renderHook(() => useBooksByIds(['b1', 'b2']));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books.map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(result.current.error).toBeNull();
  });

  it('follows the order of the ids, not the order of the responses', async () => {
    // The requests run concurrently, so the response order is whichever
    // finished first. A list that reshuffles between loads is its own bug.
    bookService.getBooksByIds.mockResolvedValue({
      books: [book('b3', 'Three'), book('b1', 'One'), book('b2', 'Two')],
      missingIds: [],
      failedIds: [],
    });

    const { result } = renderHook(() => useBooksByIds(['b1', 'b2', 'b3']));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
  });

  it('separates a 404 from a request that did not complete', async () => {
    // Saying "no longer in the catalogue" about a book that is merely
    // unreachable is a lie told by a flaky network.
    bookService.getBooksByIds.mockResolvedValue({
      books: [book('b1', 'One')],
      missingIds: ['gone'],
      failedIds: ['unreachable'],
    });

    const { result } = renderHook(() =>
      useBooksByIds(['b1', 'gone', 'unreachable'])
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.missingIds).toEqual(['gone']);
    expect(result.current.failedIds).toEqual(['unreachable']);
  });

  it('requests nothing for an empty list and settles immediately', async () => {
    const { result } = renderHook(() => useBooksByIds([]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books).toEqual([]);
    expect(bookService.getBooksByIds).not.toHaveBeenCalled();
  });

  it('treats a non-array as an empty list rather than throwing', async () => {
    const { result } = renderHook(() => useBooksByIds(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books).toEqual([]);
  });

  it('does not refetch when the caller passes a new array with the same ids', async () => {
    // A caller holding the ids in state hands back a new identity on every
    // render. Depending on the array itself would refetch forever.
    bookService.getBooksByIds.mockResolvedValue({
      books: [book('b1', 'One')],
      missingIds: [],
      failedIds: [],
    });

    const { result, rerender } = renderHook(({ ids }) => useBooksByIds(ids), {
      initialProps: { ids: ['b1'] },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(bookService.getBooksByIds).toHaveBeenCalledTimes(1);

    rerender({ ids: ['b1'] });
    rerender({ ids: ['b1'] });

    expect(bookService.getBooksByIds).toHaveBeenCalledTimes(1);
  });

  it('does refetch when the ids actually change', async () => {
    bookService.getBooksByIds.mockResolvedValue({
      books: [],
      missingIds: [],
      failedIds: [],
    });

    const { rerender } = renderHook(({ ids }) => useBooksByIds(ids), {
      initialProps: { ids: ['b1'] },
    });

    await waitFor(() => expect(bookService.getBooksByIds).toHaveBeenCalledTimes(1));

    rerender({ ids: ['b1', 'b2'] });

    await waitFor(() => expect(bookService.getBooksByIds).toHaveBeenCalledTimes(2));
  });

  it('reports a failure without leaving stale books on screen', async () => {
    bookService.getBooksByIds.mockRejectedValue({
      status: 500,
      message: 'Internal server error.',
    });

    const { result } = renderHook(() => useBooksByIds(['b1']));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.books).toEqual([]);
    expect(result.current.error).toMatchObject({ status: 500 });
  });

  it('never renders a cancellation as an error', async () => {
    // A cancellation does not reach the API client's normalisation, so it
    // keeps the Axios shape. A page that unmounted mid-request would flash
    // "canceled" into its error slot.
    bookService.getBooksByIds.mockRejectedValue({ code: 'ERR_CANCELED' });

    const { result } = renderHook(() => useBooksByIds(['b1']));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('aborts the request when it unmounts', async () => {
    let signal;
    bookService.getBooksByIds.mockImplementation(async (ids, options) => {
      signal = options?.signal;
      return { books: [], missingIds: [], failedIds: [] };
    });

    const { unmount } = renderHook(() => useBooksByIds(['b1']));

    await waitFor(() => expect(signal).toBeDefined());
    expect(signal.aborted).toBe(false);

    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('does not apply a response that arrived after the ids changed', async () => {
    const slow = { books: [book('old', 'Old')], missingIds: [], failedIds: [] };
    const fast = { books: [book('new', 'New')], missingIds: [], failedIds: [] };

    let resolveSlow;
    bookService.getBooksByIds
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSlow = resolve; }))
      .mockResolvedValueOnce(fast);

    const { result, rerender } = renderHook(({ ids }) => useBooksByIds(ids), {
      initialProps: { ids: ['old'] },
    });

    rerender({ ids: ['new'] });
    await waitFor(() => expect(result.current.books.map((b) => b.id)).toEqual(['new']));

    // The first request finishes last. It must not paint over the current one.
    resolveSlow(slow);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.books.map((b) => b.id)).toEqual(['new']);
  });

  describe('enabled: false', () => {
    it('requests nothing and stays loading', async () => {
      const { result } = renderHook(() => useBooksByIds(['b1'], { enabled: false }));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(bookService.getBooksByIds).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
    });

    it('fetches as soon as it is enabled', async () => {
      bookService.getBooksByIds.mockResolvedValue({
        books: [book('b1', 'One')],
        missingIds: [],
        failedIds: [],
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useBooksByIds(['b1'], { enabled }),
        { initialProps: { enabled: false } }
      );

      expect(bookService.getBooksByIds).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => expect(result.current.books).toHaveLength(1));
    });
  });
});

describe('isCanceled', () => {
  it('recognises every shape a cancellation arrives in', () => {
    expect(isCanceled({ name: 'CanceledError' })).toBe(true);
    expect(isCanceled({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isCanceled({ original: { code: 'ERR_CANCELED' } })).toBe(true);
  });

  it('does not swallow a real failure', () => {
    expect(isCanceled({ status: 500, code: 'SERVER_ERROR' })).toBe(false);
    expect(isCanceled(null)).toBe(false);
    expect(isCanceled(undefined)).toBe(false);
    expect(isCanceled(new Error('boom'))).toBe(false);
  });
});
