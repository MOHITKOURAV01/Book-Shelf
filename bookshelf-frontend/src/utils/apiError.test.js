import { describe, it, expect } from 'vitest';

import {
  ERROR_CODES,
  codeOf,
  describeApiError,
  fieldErrors,
  isCanceled,
  isForbidden,
  isNetworkError,
  isNotFound,
  isRateLimited,
  isUnauthorized,
  serverMessage,
  statusOf,
} from './apiError.js';

/**
 * Build an error the way `utils/api.js` builds one, so these tests fail if the
 * interceptor's contract changes rather than passing against a shape only
 * this file believes in.
 */
function normalised({ status, code, message, data }) {
  const axiosError = new Error('Request failed');
  axiosError.response = { status, data };

  return {
    status,
    code,
    message,
    original: axiosError,
  };
}

/** An error that never reached the interceptor — raw Axios. */
function rawAxios({ status, data }) {
  const error = new Error('Request failed');
  error.response = { status, data };
  error.isAxiosError = true;
  return error;
}

describe('statusOf', () => {
  it('reads the normalised status', () => {
    expect(statusOf(normalised({ status: 401, code: 'UNAUTHORIZED' }))).toBe(401);
  });

  it('falls back to the raw response when the error was never normalised', () => {
    expect(statusOf(rawAxios({ status: 404 }))).toBe(404);
  });

  it('returns 0 for the no-response case rather than treating it as absent', () => {
    expect(statusOf(normalised({ status: 0, code: 'NETWORK_ERROR' }))).toBe(0);
  });

  it('returns undefined for an error with no status anywhere', () => {
    expect(statusOf(new Error('boom'))).toBeUndefined();
    expect(statusOf(null)).toBeUndefined();
    expect(statusOf('a string')).toBeUndefined();
  });
});

describe('serverMessage', () => {
  it('digs the message out of a normalised error', () => {
    const error = normalised({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized access. Please login again.',
      data: { message: 'Invalid email or password' },
    });

    expect(serverMessage(error)).toBe('Invalid email or password');
  });

  it('digs it out of a raw Axios error too', () => {
    const error = rawAxios({ status: 409, data: { message: 'Email already registered' } });
    expect(serverMessage(error)).toBe('Email already registered');
  });

  it('ignores a blank message', () => {
    expect(serverMessage(normalised({ status: 400, data: { message: '   ' } }))).toBeUndefined();
  });

  it('ignores a non-string message', () => {
    expect(serverMessage(normalised({ status: 400, data: { message: 42 } }))).toBeUndefined();
  });

  it('is undefined when the server sent no body', () => {
    expect(serverMessage(normalised({ status: 500 }))).toBeUndefined();
  });
});

describe('fieldErrors', () => {
  it('maps validateBody output to field -> message', () => {
    const error = normalised({
      status: 400,
      data: {
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'email must be a valid email address' },
          { field: 'password', message: 'password must be at least 8 characters' },
        ],
      },
    });

    expect(fieldErrors(error)).toEqual({
      email: 'email must be a valid email address',
      password: 'password must be at least 8 characters',
    });
  });

  it('keeps the first message when a field appears twice', () => {
    const error = normalised({
      status: 400,
      data: {
        errors: [
          { field: 'password', message: 'password is required' },
          { field: 'password', message: 'password must be at least 8 characters' },
        ],
      },
    });

    expect(fieldErrors(error)).toEqual({ password: 'password is required' });
  });

  it('skips entries missing a field or a message', () => {
    const error = normalised({
      status: 400,
      data: { errors: [{ message: 'orphaned' }, { field: 'name' }, null, 'nonsense'] },
    });

    expect(fieldErrors(error)).toEqual({});
  });

  it('returns an empty object when there are no field errors', () => {
    expect(fieldErrors(normalised({ status: 401 }))).toEqual({});
    expect(fieldErrors(undefined)).toEqual({});
  });
});

describe('describeApiError', () => {
  it("prefers the server's own message — the whole point of #325", () => {
    const error = normalised({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized access. Please login again.',
      data: { message: 'Invalid email or password' },
    });

    expect(describeApiError(error, 'Failed to login')).toBe('Invalid email or password');
  });

  it('surfaces the rate limiter, which the old code rendered as a generic failure', () => {
    const error = normalised({
      status: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again.',
      data: { message: 'Too many login attempts. Please try again in 15 minutes.' },
    });

    expect(describeApiError(error, 'Failed to login')).toBe(
      'Too many login attempts. Please try again in 15 minutes.'
    );
  });

  it('falls back to the normalised message for a network failure', () => {
    const error = {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your internet connection.',
      original: new Error('Network Error'),
    };

    expect(describeApiError(error, 'Failed to login')).toBe(
      'Network error. Please check your internet connection.'
    );
  });

  it('does not echo a 500 body, which is worded for a log rather than a customer', () => {
    const error = normalised({
      status: 500,
      code: 'SERVER_ERROR',
      message: 'Internal server error. Our team has been notified.',
      data: { message: "Cannot read properties of undefined (reading '_id')" },
    });

    expect(describeApiError(error)).toBe('Internal server error. Our team has been notified.');
  });

  it('uses the message of an error the app threw itself', () => {
    const error = new Error('Book not found: b9');
    error.status = 404;

    expect(describeApiError(error, 'fallback')).toBe('Book not found: b9');
  });

  it('accepts a bare string', () => {
    expect(describeApiError('Your cart is empty.')).toBe('Your cart is empty.');
  });

  it('falls back for anything it cannot read', () => {
    expect(describeApiError(null, 'fallback')).toBe('fallback');
    expect(describeApiError(undefined, 'fallback')).toBe('fallback');
    expect(describeApiError({}, 'fallback')).toBe('fallback');
    expect(describeApiError('   ', 'fallback')).toBe('fallback');
  });

  it('has a default fallback so a caller cannot render "undefined"', () => {
    expect(describeApiError(null)).toBe('Something went wrong. Please try again.');
  });
});

describe('classification helpers', () => {
  it('recognises 401 by status and by code', () => {
    expect(isUnauthorized(normalised({ status: 401 }))).toBe(true);
    expect(isUnauthorized({ code: ERROR_CODES.UNAUTHORIZED })).toBe(true);
    expect(isUnauthorized(normalised({ status: 403 }))).toBe(false);
  });

  it('recognises 403', () => {
    expect(isForbidden(normalised({ status: 403 }))).toBe(true);
    expect(isForbidden(normalised({ status: 401 }))).toBe(false);
  });

  it('recognises 404, including the app\'s own not-found errors', () => {
    expect(isNotFound(normalised({ status: 404 }))).toBe(true);

    const bookNotFound = new Error('Book not found: b9');
    bookNotFound.status = 404;
    expect(isNotFound(bookNotFound)).toBe(true);

    expect(isNotFound(normalised({ status: 500 }))).toBe(false);
  });

  it('recognises 429', () => {
    expect(isRateLimited(normalised({ status: 429 }))).toBe(true);
    expect(isRateLimited(normalised({ status: 400 }))).toBe(false);
  });

  it('recognises the no-response case', () => {
    expect(isNetworkError({ status: 0, code: 'NETWORK_ERROR' })).toBe(true);
    expect(isNetworkError(normalised({ status: 500 }))).toBe(false);
  });

  it('recognises a cancellation in both shapes', () => {
    const bare = new Error('canceled');
    bare.code = 'ERR_CANCELED';
    expect(isCanceled(bare)).toBe(true);

    const named = new Error('canceled');
    named.name = 'CanceledError';
    expect(isCanceled(named)).toBe(true);

    expect(isCanceled({ original: { code: 'ERR_CANCELED' } })).toBe(true);
    expect(isCanceled(normalised({ status: 500 }))).toBe(false);
    expect(isCanceled(null)).toBe(false);
  });

  it('reads the code when there is one', () => {
    expect(codeOf(normalised({ status: 404, code: 'NOT_FOUND' }))).toBe('NOT_FOUND');
    expect(codeOf(new Error('boom'))).toBeUndefined();
  });
});
