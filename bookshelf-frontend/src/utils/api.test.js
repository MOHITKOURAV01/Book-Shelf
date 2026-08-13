import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { normaliseBaseUrl } from '../config/env.js';
import api, { onUnauthorized } from './api.js';

/**
 * The interceptor is exercised through axios' own adapter hook rather than
 * a network call, so these tests stay fast and offline. `adapter` is what
 * axios calls to actually perform a request, so replacing it lets us decide
 * exactly what each attempt returns.
 */
function stubAdapter(responder) {
  const calls = [];

  api.defaults.adapter = async (config) => {
    calls.push(config);
    return responder(config, calls.length);
  };

  return calls;
}

function httpError(status, config, data = {}) {
  const error = new Error(`Request failed with status code ${status}`);
  error.config = config;
  error.response = { status, data, config, headers: {} };
  return error;
}

function networkError(config) {
  const error = new Error('Network Error');
  error.config = config;
  error.request = {};
  return error;
}

const originalAdapter = api.defaults.adapter;

describe('normaliseBaseUrl', () => {
  it('strips a single trailing slash', () => {
    expect(normaliseBaseUrl('http://localhost:5000/api/')).toBe(
      'http://localhost:5000/api'
    );
  });

  it('strips several trailing slashes', () => {
    expect(normaliseBaseUrl('http://example.com/api///')).toBe(
      'http://example.com/api'
    );
  });

  it('leaves a clean URL alone', () => {
    expect(normaliseBaseUrl('https://api.example.com/api')).toBe(
      'https://api.example.com/api'
    );
  });

  it('trims surrounding whitespace', () => {
    expect(normaliseBaseUrl('  https://example.com/api  ')).toBe(
      'https://example.com/api'
    );
  });

  it('returns an empty string for a non-string', () => {
    expect(normaliseBaseUrl(undefined)).toBe('');
    expect(normaliseBaseUrl(null)).toBe('');
    expect(normaliseBaseUrl(42)).toBe('');
  });
});

describe('api client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    api.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it('resolves paths against a base URL with no doubled slash', async () => {
    const calls = stubAdapter((config) => ({
      status: 200,
      data: { ok: true },
      config,
      headers: {},
    }));

    await api.get('/books');

    const url = new URL(
      calls[0].url,
      calls[0].baseURL ?? 'http://localhost:5000/api'
    );
    expect(url.pathname).not.toContain('//');
  });

  it('sends credentials so the session cookie travels cross-origin', () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('normalises an error into status, message and code', async () => {
    stubAdapter((config) => {
      throw httpError(404, config, { message: 'Book not found: nope' });
    });

    await expect(api.get('/books/nope')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Book not found: nope',
    });
  });

  it('maps a 429 to RATE_LIMITED', async () => {
    stubAdapter((config) => {
      throw httpError(429, config, { message: 'Too many login attempts.' });
    });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  it('reports a network failure rather than a bare 500', async () => {
    stubAdapter((config) => {
      throw networkError(config);
    });

    await expect(api.post('/orders', {})).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('retries a GET that fails with a 500', async () => {
    const calls = stubAdapter((config, attempt) => {
      if (attempt < 3) throw httpError(500, config);
      return { status: 200, data: { ok: true }, config, headers: {} };
    });

    // Attach the handler before advancing the clock, otherwise the promise
    // settles with nothing listening and vitest reports it as unhandled.
    const pending = api.get('/books').then(
      (response) => response,
      (error) => error
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(await pending).toMatchObject({ status: 200 });
    expect(calls).toHaveLength(3);
  });

  it('gives up after the retry limit', async () => {
    const calls = stubAdapter((config) => {
      throw httpError(500, config);
    });

    const pending = api.get('/books').catch((error) => error);
    await vi.advanceTimersByTimeAsync(5000);

    expect(await pending).toMatchObject({ code: 'SERVER_ERROR' });
    expect(calls).toHaveLength(3); // the original plus two retries
  });

  it('never retries a POST', async () => {
    // Retrying a payment intent would create a second one — a dropped
    // response is indistinguishable from a dropped request.
    const calls = stubAdapter((config) => {
      throw httpError(500, config);
    });

    const pending = api
      .post('/payments/create-intent', {})
      .catch((error) => error);
    await vi.advanceTimersByTimeAsync(5000);

    expect(await pending).toMatchObject({ code: 'SERVER_ERROR' });
    expect(calls).toHaveLength(1);
  });

  it('does not retry a GET that fails with a 404', async () => {
    const calls = stubAdapter((config) => {
      throw httpError(404, config);
    });

    const pending = api.get('/books/nope').catch((error) => error);
    await vi.advanceTimersByTimeAsync(5000);

    expect(await pending).toMatchObject({ code: 'NOT_FOUND' });
    expect(calls).toHaveLength(1);
  });

  it('calls the unauthorized handler exactly once per failed request', async () => {
    const handler = vi.fn();
    const unsubscribe = onUnauthorized(handler);

    stubAdapter((config) => {
      throw httpError(401, config, { message: 'Not authorized, no token' });
    });

    await expect(api.get('/auth/me')).rejects.toBeTruthy();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ code: 'UNAUTHORIZED' });

    unsubscribe();
  });

  it('does not call the unauthorized handler for other statuses', async () => {
    const handler = vi.fn();
    const unsubscribe = onUnauthorized(handler);

    stubAdapter((config) => {
      throw httpError(403, config);
    });

    await expect(api.get('/orders')).rejects.toBeTruthy();
    expect(handler).not.toHaveBeenCalled();

    unsubscribe();
  });

  it('stops notifying after unsubscribe', async () => {
    const handler = vi.fn();
    onUnauthorized(handler)();

    stubAdapter((config) => {
      throw httpError(401, config);
    });

    await expect(api.get('/auth/me')).rejects.toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps notifying the others when one handler throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const bad = vi.fn(() => {
      throw new Error('subscriber blew up');
    });
    const good = vi.fn();
    const unsubBad = onUnauthorized(bad);
    const unsubGood = onUnauthorized(good);

    stubAdapter((config) => {
      throw httpError(401, config);
    });

    await expect(api.get('/auth/me')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(good).toHaveBeenCalledTimes(1);

    unsubBad();
    unsubGood();
  });
});
