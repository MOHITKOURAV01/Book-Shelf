import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import express from 'express';
import { checkoutLimiter } from '../middleware/rateLimiter.js';

/**
 * POST /api/payments/create-intent is anonymous — guests can check out — and
 * every successful call reserves inventory in books.json before any money
 * changes hands. There was nothing throttling it, while /api/auth has had a
 * limiter since #275. 78 units across the whole catalogue went to zero in
 * well under a minute. See #329.
 *
 * The limiter is mounted on a bare route here rather than on the real
 * controller: the controller reserves stock and talks to Stripe, and the
 * thing under test is whether the limiter answers 429 before any of that is
 * reached.
 */

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.post('/api/payments/create-intent', checkoutLimiter, (req, res) => {
    res.status(200).json({ reached: true });
  });

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  checkoutLimiter.reset();
});

function createIntent() {
  return fetch(`${baseUrl}/api/payments/create-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ bookId: 'b1', quantity: 1 }] }),
  });
}

describe('checkout rate limit', () => {
  test('lets an ordinary checkout through', async () => {
    checkoutLimiter.reset();

    const response = await createIntent();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-ratelimit-limit'), '20');
    assert.equal(response.headers.get('x-ratelimit-remaining'), '19');
  });

  test('answers 429 once the budget is spent, before the controller runs', async () => {
    checkoutLimiter.reset();

    // The limit is 20 an hour: far above what a real customer needs, far
    // below what it takes to drain a shop of 78 units.
    for (let i = 0; i < 20; i += 1) {
      const allowed = await createIntent();
      assert.equal(allowed.status, 200, `request ${i + 1} should have been allowed`);
    }

    const blocked = await createIntent();

    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));

    const body = await blocked.json();
    assert.match(body.message, /Too many checkout attempts/);
    // The 200 handler stands in for the controller; a 429 must not reach it.
    assert.equal(body.reached, undefined);
  });
});
