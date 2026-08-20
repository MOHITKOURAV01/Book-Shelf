import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getBookById = vi.fn();

vi.mock('../services/bookService.js', async () => {
  const actual = await vi.importActual('../services/bookService.js');
  return {
    ...actual,
    getBookById: (...args) => getBookById(...args),
  };
});

import { BookNotFoundError } from '../services/bookService.js';
import { useBook } from './useBook.js';

function Probe({ bookId }) {
  const { book, loading, notFound, error, reload } = useBook(bookId);

  return (
    <div>
      <span data-testid="state">
        {loading ? 'loading' : notFound ? 'not-found' : error ? 'error' : 'ready'}
      </span>
      <span data-testid="title">{book?.title ?? ''}</span>
      <span data-testid="error">{error ?? ''}</span>
      <button onClick={reload}>reload</button>
    </div>
  );
}

const BOOK = { id: 'b1', title: 'The Quiet Ones', price: 349, rating: 4.5, inventory: 8 };

describe('useBook', () => {
  beforeEach(() => {
    getBookById.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the book from the API', async () => {
    getBookById.mockResolvedValue(BOOK);

    render(<Probe bookId="b1" />);

    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    expect(screen.getByTestId('title')).toHaveTextContent('The Quiet Ones');
    expect(getBookById).toHaveBeenCalledWith('b1', expect.objectContaining({ signal: expect.anything() }));
  });

  it('distinguishes a missing book from a failed request', async () => {
    getBookById.mockRejectedValue(new BookNotFoundError('b9'));

    render(<Probe bookId="b9" />);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('not-found'));
  });

  it('does not claim a book is missing when the network failed', async () => {
    // A blip must not tell a customer the book has been withdrawn.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getBookById.mockRejectedValue({ status: 0, code: 'NETWORK_ERROR', message: 'Network error.' });

    render(<Probe bookId="b1" />);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    expect(screen.getByTestId('error')).toHaveTextContent('Network error.');
  });

  it('stays quiet when the request was aborted', async () => {
    getBookById.mockRejectedValue({ name: 'CanceledError', code: 'ERR_CANCELED' });

    render(<Probe bookId="b1" />);

    // Nothing replaces the state; the component that triggered the abort does.
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('loading'));
  });

  it('refetches on reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getBookById
      .mockRejectedValueOnce({ status: 500, message: 'Server error' })
      .mockResolvedValueOnce(BOOK);

    const user = userEvent.setup();
    render(<Probe bookId="b1" />);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    await user.click(screen.getByRole('button', { name: 'reload' }));

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    expect(getBookById).toHaveBeenCalledTimes(2);
  });

  it('ignores a slow response for a book the reader has already navigated away from', async () => {
    let resolveFirst;
    getBookById
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ...BOOK, id: 'b2', title: 'Field Notes' });

    const { rerender } = render(<Probe bookId="b1" />);
    rerender(<Probe bookId="b2" />);

    await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('Field Notes'));

    // The stale response lands late and must be dropped.
    resolveFirst(BOOK);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByTestId('title')).toHaveTextContent('Field Notes');
  });

  it('treats a missing id as not found rather than requesting it', async () => {
    render(<Probe bookId={undefined} />);

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('not-found'));
    expect(getBookById).not.toHaveBeenCalled();
  });
});
