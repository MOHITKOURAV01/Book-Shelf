import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import app from '../app.js';

/**
 * Smoke tests for the Express app itself.
 *
 * The point is to have CI actually exercise the server wiring — that the app
 * module imports cleanly, binds, routes, and hands unknown paths to the
 * notFound/errorHandler pair. No database is involved: server.js owns the
 * Mongoose connection, app.js does not, so the app can be listened on
 * directly.
 *
 * These assertions are deliberately limited to endpoints whose behaviour is
 * stable, so they do not have to be rewritten every time a route changes.
 */

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    // Port 0 asks the OS for a free port, so a developer already running the
    // server on 5000 does not make this fail.
    server = app.listen(0, resolve);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('app', () => {
  test('serves the root health check', async () => {
    const response = await fetch(`${baseUrl}/`);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /API is running/);
  });

  test('answers 404 for an unknown route', async () => {
    const response = await fetch(`${baseUrl}/api/definitely-not-a-route`);

    assert.equal(response.status, 404);
  });

  test('returns JSON with a message for an unknown route', async () => {
    // notFound() creates the error and errorHandler serialises it, so this
    // covers both halves of the middleware pair.
    const response = await fetch(`${baseUrl}/api/definitely-not-a-route`);
    const body = await response.json();

    assert.equal(typeof body.message, 'string');
    assert.match(body.message, /Not Found/);
  });

  test('includes the offending path in the 404 message', async () => {
    const response = await fetch(`${baseUrl}/api/some-missing-thing`);
    const body = await response.json();

    assert.match(body.message, /some-missing-thing/);
  });

  test('mounts the books router', async () => {
    // Only that the route exists and is not a 404 — the response shape is
    // the books API's business, not this file's.
    const response = await fetch(`${baseUrl}/api/books`);

    assert.equal(response.status, 200);
  });

  test('requires a session for the wishlist', async () => {
    const response = await fetch(`${baseUrl}/api/wishlist`);

    assert.equal(response.status, 401);
  });

  test('requires a session for the current user', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);

    assert.equal(response.status, 401);
  });
});
