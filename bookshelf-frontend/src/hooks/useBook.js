import { useCallback, useEffect, useRef, useState } from 'react';

import { getBookById, BookNotFoundError } from '../services/bookService.js';

/**
 * One book, from the API.
 *
 * Returns:
 *   book      the record, or null while loading / on failure
 *   loading   true while a request is in flight
 *   notFound  the id is genuinely not in the catalogue (a 404), as distinct
 *             from "we could not ask" — the page renders different things
 *             for those two and conflating them is how a network blip starts
 *             telling customers a book has been withdrawn
 *   error     a message for anything else
 *   reload    retry, for the error state's button
 *
 * The page this replaces did a synchronous `books.find(...)` against a
 * hardcoded array and then faked a request with
 * `setTimeout(() => setLoading(false), 700)` — a fixed delay wrapped around
 * nothing. See #317.
 */
export function useBook(bookId) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(Boolean(bookId));
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  // Bumped to force a refetch without changing the id.
  const [attempt, setAttempt] = useState(0);

  // Guards against a slow response for the previous id landing after a fast
  // one for the current id — navigating between two book pages quickly is
  // enough to hit it.
  const requestIdRef = useRef(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!bookId) {
      setBook(null);
      setLoading(false);
      setNotFound(true);
      setError(null);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const controller = new AbortController();
    let cancelled = false;

    const isStale = () => cancelled || requestIdRef.current !== requestId;

    setLoading(true);
    setNotFound(false);
    setError(null);

    getBookById(bookId, { signal: controller.signal })
      .then((data) => {
        if (isStale()) return;
        setBook(data);
        setLoading(false);
      })
      .catch((caught) => {
        if (isStale()) return;

        if (caught instanceof BookNotFoundError || caught?.status === 404) {
          setBook(null);
          setNotFound(true);
          setLoading(false);
          return;
        }

        // An aborted request is not a failure the customer needs told about;
        // something else is already replacing this state.
        if (caught?.code === 'ERR_CANCELED' || caught?.name === 'CanceledError') {
          return;
        }

        console.error(`[book] could not load ${bookId}:`, caught);
        setBook(null);
        setError(
          caught?.message ?? 'This book could not be loaded. Please try again.'
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [bookId, attempt]);

  return { book, loading, notFound, error, reload };
}

export default useBook;
