import axios from 'axios';
import { API_BASE_URL } from '../config/env.js';

/**
 * Methods that are safe to retry.
 *
 * GET and HEAD only. A retried POST can create two orders or two payment
 * intents — a dropped response is indistinguishable from a dropped request,
 * so the client cannot know whether the first one already took effect.
 */
const RETRYABLE_METHODS = new Set(['get', 'head']);

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

/**
 * Callbacks to run when the API says the session is gone. AuthContext
 * registers one at startup.
 *
 * A subscription rather than a direct import, so the interceptor does not
 * have to reach into React context or hard-code a window.location redirect
 * — either would tie the transport layer to the routing layer and make this
 * module untestable.
 */
const unauthorizedHandlers = new Set();

export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

function notifyUnauthorized(normalizedError) {
  for (const handler of unauthorizedHandlers) {
    try {
      handler(normalizedError);
    } catch (handlerError) {
      // One bad subscriber must not stop the others, and must not replace
      // the original error the caller is waiting on.
      console.error('[api] onUnauthorized handler threw:', handlerError);
    }
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  // The API authenticates with an httpOnly cookie, so credentials have to be
  // sent cross-origin. Without this every authenticated request from a
  // deployed frontend arrives anonymous.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Worth retrying: no response at all (network blip or timeout), or a 5xx /
 * 429 where the server is saying it could not serve this one right now. A
 * 4xx is the request's own fault and will fail identically next time.
 */
function isRetryable(error) {
  const method = String(error.config?.method ?? '').toLowerCase();

  if (!RETRYABLE_METHODS.has(method)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  const { status } = error.response;
  return status >= 500 || status === 429;
}

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    // Auth travels in an httpOnly cookie, so there is no token to attach
    // here. Kept as the extension point for a future bearer-token flow.
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;

    if (config && isRetryable(error)) {
      config.__retryCount = config.__retryCount ?? 0;

      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        // Exponential backoff: 300ms, then 600ms.
        await delay(RETRY_BASE_DELAY_MS * 2 ** (config.__retryCount - 1));
        return api(config);
      }
    }

    let normalizedError = {
      status: 500,
      message: 'Something went wrong. Please try again later.',
      code: 'UNKNOWN_ERROR',
      original: error
    };

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      normalizedError.status = status;

      switch (status) {
        case 401:
          normalizedError.message = data?.message || 'Unauthorized access. Please login again.';
          normalizedError.code = 'UNAUTHORIZED';
          break;
        case 403:
          normalizedError.message = data?.message || 'Forbidden access. You do not have permission.';
          normalizedError.code = 'FORBIDDEN';
          break;
        case 404:
          normalizedError.message = data?.message || 'Resource not found.';
          normalizedError.code = 'NOT_FOUND';
          break;
        case 429:
          normalizedError.message = data?.message || 'Too many requests. Please slow down and try again.';
          normalizedError.code = 'RATE_LIMITED';
          break;
        case 500:
          normalizedError.message = data?.message || 'Internal server error. Our team has been notified.';
          normalizedError.code = 'SERVER_ERROR';
          break;
        default:
          normalizedError.message = data?.message || 'An unexpected error occurred.';
          normalizedError.code = 'HTTP_ERROR';
      }
    } else if (error.request) {
      // The request was made but no response was received
      normalizedError.status = 0;
      normalizedError.message = 'Network error. Please check your internet connection.';
      normalizedError.code = 'NETWORK_ERROR';
    } else {
      // Something happened in setting up the request that triggered an Error
      normalizedError.message = error.message;
      normalizedError.code = 'SETUP_ERROR';
    }

    // Fires after normalisation so subscribers see the same shape callers
    // do, and exactly once per failed request — the retry path returns
    // above and never reaches here.
    if (normalizedError.code === 'UNAUTHORIZED') {
      notifyUnauthorized(normalizedError);
    }

    // Return the normalized error instead of raw Axios error
    return Promise.reject(normalizedError);
  }
);

export default api;
