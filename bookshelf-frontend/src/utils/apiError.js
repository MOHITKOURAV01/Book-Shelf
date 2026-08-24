/**
 * Reading an error that came back from `utils/api.js`.
 *
 * The shared client normalises every failure in its response interceptor and
 * rejects with a plain object:
 *
 *     { status, message, code, original }
 *
 * There is no `response` on it — the raw Axios error is kept under `original`.
 * Four pages were still written against the Axios shape (`err.response.data.
 * message`, `err.response.status === 404`), and because optional chaining on a
 * missing property is silent, they did not break loudly. They just stopped
 * being able to say anything specific: every sign-in failure rendered as
 * "Failed to login", and the 404 branch on the order details page became dead
 * code. See #325.
 *
 * These helpers accept whatever they are handed — a normalised error, a raw
 * Axios error that never reached the interceptor (a cancellation, or a call
 * that used axios directly), a plain `Error`, or a string — because a helper
 * whose job is to describe a failure must not be able to fail itself.
 */

/** Codes `utils/api.js` assigns. Re-exported so callers compare a constant. */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  SETUP_ERROR: 'SETUP_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/**
 * The HTTP status behind an error, or `undefined` if there wasn't one.
 *
 * Checked in the order a value is most likely to be trustworthy: the
 * normalised field first, then the raw response under `original`, then a
 * response hanging directly off the error.
 *
 * `status: 0` is what the interceptor uses for "no response at all". It is a
 * real value and is returned as-is; callers asking about a specific HTTP code
 * will not match it.
 */
export function statusOf(error) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidates = [
    error.status,
    error.original?.response?.status,
    error.response?.status,
  ];

  for (const candidate of candidates) {
    if (Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/** The `code` the interceptor assigned, if this error went through it. */
export function codeOf(error) {
  return typeof error?.code === 'string' ? error.code : undefined;
}

/**
 * The message the *server* sent, if it sent one.
 *
 * The backend answers failures as `{ message }` (see
 * `middleware/errorMiddleware.js`), and validation failures as
 * `{ message, errors }` (see `middleware/validateBody.js`). This digs the
 * body out of whichever shape the error arrived in and returns the message
 * only when it is a non-empty string — an empty one is no more use than none.
 */
export function serverMessage(error) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const body = error.original?.response?.data ?? error.response?.data;
  const message = body?.message;

  if (typeof message === 'string' && message.trim() !== '') {
    return message.trim();
  }

  return undefined;
}

/**
 * Field-level validation errors, as `{ field: message }`.
 *
 * `validateBody` answers a bad body with `{ message, errors: [{ field, message
 * }] }`. Returning a map rather than the raw array is what a form actually
 * wants: it can look up the field it is rendering without scanning.
 *
 * Returns an empty object when there are none, so callers can spread the
 * result unconditionally.
 */
export function fieldErrors(error) {
  const body = error?.original?.response?.data ?? error?.response?.data;
  const errors = body?.errors;

  if (!Array.isArray(errors)) {
    return {};
  }

  const mapped = {};

  for (const entry of errors) {
    const field = entry?.field ?? entry?.param ?? entry?.path;
    const message = entry?.message ?? entry?.msg;

    if (typeof field === 'string' && typeof message === 'string' && message.trim()) {
      // First message per field wins. A field with two complaints is one
      // field with a problem, and stacking them reads as noise.
      if (!(field in mapped)) {
        mapped[field] = message.trim();
      }
    }
  }

  return mapped;
}

/**
 * A sentence to put in front of the user.
 *
 * Preference order, and the reasoning:
 *
 *   1. What the server said. It is the only party that knows *why* — "Invalid
 *      email or password", "Email already registered", the rate limiter's
 *      "Too many requests". Throwing that away, which is what these pages
 *      were doing, is the whole bug.
 *   2. The interceptor's normalised message, which already has sensible
 *      wording for the network and 5xx cases where the server said nothing.
 *   3. A plain `Error`'s own message — covers the errors the app throws
 *      itself, e.g. `BookNotFoundError` from `services/bookService.js`.
 *   4. The caller's fallback.
 *
 * A 500's message is deliberately *not* preferred: the backend echoes
 * `err.message` for unhandled errors, which is an internal detail worded for a
 * log, not for a customer. The normalised "Internal server error" is better
 * for the reader and leaks less.
 */
export function describeApiError(error, fallback = DEFAULT_MESSAGE) {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const status = statusOf(error);
  const fromServer = serverMessage(error);

  if (fromServer && !(Number.isFinite(status) && status >= 500)) {
    return fromServer;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

/** 401 — the session is missing or has expired. */
export function isUnauthorized(error) {
  return statusOf(error) === 401 || codeOf(error) === ERROR_CODES.UNAUTHORIZED;
}

/** 403 — signed in, but not allowed. */
export function isForbidden(error) {
  return statusOf(error) === 403 || codeOf(error) === ERROR_CODES.FORBIDDEN;
}

/**
 * 404 — the thing asked for is not there.
 *
 * Also true for the app's own not-found errors (`BookNotFoundError` sets
 * `status = 404` without going near HTTP), which is what lets a page treat
 * "the API said 404" and "we decided this id is unusable" the same way.
 */
export function isNotFound(error) {
  return statusOf(error) === 404 || codeOf(error) === ERROR_CODES.NOT_FOUND;
}

/** 429 — the caller has been throttled. */
export function isRateLimited(error) {
  return statusOf(error) === 429 || codeOf(error) === ERROR_CODES.RATE_LIMITED;
}

/** No response reached us: offline, DNS, timeout, connection reset. */
export function isNetworkError(error) {
  return codeOf(error) === ERROR_CODES.NETWORK_ERROR || statusOf(error) === 0;
}

/**
 * A request the caller deliberately dropped.
 *
 * Cancellations never reach the interceptor's normalisation, so they keep the
 * Axios shape. They are not failures and must never be rendered — a component
 * that unmounted mid-request would otherwise flash "canceled" into its error
 * slot.
 */
export function isCanceled(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    error.name === 'CanceledError' ||
    error.code === 'ERR_CANCELED' ||
    error.original?.code === 'ERR_CANCELED' ||
    error.original?.name === 'CanceledError'
  );
}

export default {
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
};
