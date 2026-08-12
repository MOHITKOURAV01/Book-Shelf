import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { createRateLimiter } from '../middleware/rateLimiter.js';

/**
 * A clock the tests drive by hand, so the window can be crossed without
 * anything sleeping for fifteen minutes.
 */
function makeClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
}

/** Minimal Express res double, including the 'finish' event. */
function makeRes() {
  const listeners = { finish: [] };

  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    on(event, listener) {
      (listeners[event] ??= []).push(listener);
    },
    finish() {
      for (const listener of listeners.finish) listener();
    },
  };
}

function call(limiter, { ip = '10.0.0.1', statusCode = 200 } = {}) {
  const req = { ip };
  const res = makeRes();
  let nextCalled = false;

  limiter(req, res, () => {
    nextCalled = true;
  });

  res.statusCode = nextCalled ? statusCode : res.statusCode;
  res.finish();

  return { res, nextCalled, allowed: nextCalled };
}

describe('createRateLimiter', () => {
  test('allows requests up to the limit', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      assert.equal(call(limiter).allowed, true, `attempt ${attempt}`);
    }
  });

  test('answers 429 once the limit is passed', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 });

    call(limiter);
    call(limiter);
    const third = call(limiter);

    assert.equal(third.allowed, false);
    assert.equal(third.res.statusCode, 429);
    assert.match(third.res.body.message, /too many/i);
  });

  test('sets Retry-After on the rejection', () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 60_000,
      now: clock.now,
    });

    call(limiter);
    const blocked = call(limiter);

    assert.equal(blocked.res.headers['Retry-After'], '60');
  });

  test('reports limit and remaining on every response', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });

    const first = call(limiter);
    assert.equal(first.res.headers['X-RateLimit-Limit'], '3');
    assert.equal(first.res.headers['X-RateLimit-Remaining'], '2');

    const second = call(limiter);
    assert.equal(second.res.headers['X-RateLimit-Remaining'], '1');
  });

  test('never reports negative remaining', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });

    call(limiter);
    call(limiter);
    const third = call(limiter);

    assert.equal(third.res.headers['X-RateLimit-Remaining'], '0');
  });

  test('counts each address separately', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });

    assert.equal(call(limiter, { ip: '10.0.0.1' }).allowed, true);
    assert.equal(call(limiter, { ip: '10.0.0.2' }).allowed, true);
    assert.equal(call(limiter, { ip: '10.0.0.1' }).allowed, false);
  });

  test('starts a fresh window once the old one expires', () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 1000,
      now: clock.now,
    });

    assert.equal(call(limiter).allowed, true);
    assert.equal(call(limiter).allowed, false);

    clock.advance(1001);

    assert.equal(call(limiter).allowed, true);
  });

  test('does not expire the window early', () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 1000,
      now: clock.now,
    });

    call(limiter);
    clock.advance(999);

    assert.equal(call(limiter).allowed, false);
  });

  test('clears the counter after a success when resetOnSuccess is set', () => {
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 60_000,
      resetOnSuccess: true,
    });

    call(limiter, { statusCode: 401 }); // failed login
    call(limiter, { statusCode: 200 }); // succeeded, counter clears

    // Two more failures should still be allowed through.
    assert.equal(call(limiter, { statusCode: 401 }).allowed, true);
    assert.equal(call(limiter, { statusCode: 401 }).allowed, true);
  });

  test('leaves the counter alone after a failure', () => {
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 60_000,
      resetOnSuccess: true,
    });

    call(limiter, { statusCode: 401 });
    call(limiter, { statusCode: 401 });

    assert.equal(call(limiter, { statusCode: 401 }).allowed, false);
  });

  test('does not clear the counter when resetOnSuccess is off', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });

    call(limiter, { statusCode: 200 });
    call(limiter, { statusCode: 200 });

    assert.equal(call(limiter).allowed, false);
  });

  test('falls back to a shared key when the address is unknown', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });

    const req = {};
    const res = makeRes();
    let allowed = false;
    limiter(req, res, () => {
      allowed = true;
    });

    assert.equal(allowed, true);
  });

  test('prune drops expired entries', () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      max: 5,
      windowMs: 1000,
      now: clock.now,
    });

    call(limiter, { ip: '10.0.0.1' });
    call(limiter, { ip: '10.0.0.2' });
    assert.equal(limiter.size(), 2);

    clock.advance(1001);
    limiter.prune(clock.now());

    assert.equal(limiter.size(), 0);
  });

  test('reset clears everything', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });

    call(limiter);
    assert.equal(call(limiter).allowed, false);

    limiter.reset();

    assert.equal(call(limiter).allowed, true);
  });
});
