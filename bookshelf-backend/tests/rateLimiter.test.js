import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createRateLimiter,
  ipKeyGenerator,
  ipAndEmailKeyGenerator,
} from '../middleware/rateLimiter.js';

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

/**
 * Key derivation.
 *
 * The reported bug is not in the counting — it is in what the counter is
 * keyed on. See #298.
 */
describe('ipKeyGenerator', () => {
  test('uses req.ip when Express has resolved one', () => {
    assert.equal(ipKeyGenerator({ ip: '203.0.113.7' }), '203.0.113.7');
  });

  test('falls back to the socket address', () => {
    assert.equal(
      ipKeyGenerator({ socket: { remoteAddress: '203.0.113.9' } }),
      '203.0.113.9'
    );
  });

  test('falls back to a shared bucket rather than to no limit', () => {
    // Unidentifiable callers sharing one bucket is the safe direction for a
    // limiter to fail.
    assert.equal(ipKeyGenerator({}), 'unknown');
  });
});

describe('ipAndEmailKeyGenerator', () => {
  const req = (ip, email) => ({ ip, body: email === undefined ? {} : { email } });

  test('combines the address and the account', () => {
    assert.equal(
      ipAndEmailKeyGenerator(req('203.0.113.7', 'alice@example.com')),
      '203.0.113.7|alice@example.com'
    );
  });

  test('separates two accounts on the same address', () => {
    const alice = ipAndEmailKeyGenerator(req('203.0.113.7', 'alice@example.com'));
    const bob = ipAndEmailKeyGenerator(req('203.0.113.7', 'bob@example.com'));

    assert.notEqual(alice, bob);
  });

  test('separates the same account on two addresses', () => {
    const home = ipAndEmailKeyGenerator(req('203.0.113.7', 'alice@example.com'));
    const cafe = ipAndEmailKeyGenerator(req('198.51.100.4', 'alice@example.com'));

    assert.notEqual(home, cafe);
  });

  test('normalises the email the way the validators do', () => {
    // This middleware runs before validateBody, so the email arrives raw.
    // Without normalising, changing the casing would hand an attacker a
    // fresh budget on every request.
    const canonical = ipAndEmailKeyGenerator(req('203.0.113.7', 'alice@example.com'));

    for (const variant of [
      'ALICE@EXAMPLE.COM',
      '  Alice@Example.com  ',
      'aLiCe@ExAmPlE.cOm',
    ]) {
      assert.equal(ipAndEmailKeyGenerator(req('203.0.113.7', variant)), canonical, variant);
    }
  });

  test('falls back to the address alone when there is no usable email', () => {
    for (const email of [undefined, '', '   ', null, 42]) {
      assert.equal(
        ipAndEmailKeyGenerator(req('203.0.113.7', email)),
        '203.0.113.7|-'
      );
    }
  });

  test('survives a request with no body at all', () => {
    assert.equal(ipAndEmailKeyGenerator({ ip: '203.0.113.7' }), '203.0.113.7|-');
  });
});

/**
 * The behaviour the key change buys, expressed against a limiter rather than
 * against the key function.
 */
describe('login limiting behaviour', () => {
  function callWith(limiter, { ip = '10.0.0.1', email, statusCode = 200 } = {}) {
    const req = { ip, body: email === undefined ? {} : { email } };
    const res = makeRes();
    let nextCalled = false;

    limiter(req, res, () => {
      nextCalled = true;
    });

    res.statusCode = nextCalled ? statusCode : res.statusCode;
    res.finish();

    return { res, allowed: nextCalled };
  }

  test('exhausting one account does not lock out another on the same address', () => {
    // Keyed on the address alone — which is what it did — the victim below
    // gets a 429 having made no requests at all.
    const limiter = createRateLimiter({
      max: 3,
      windowMs: 60_000,
      keyGenerator: ipAndEmailKeyGenerator,
    });

    const attacker = { ip: '203.0.113.7', email: 'target@example.com', statusCode: 401 };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      callWith(limiter, attacker);
    }

    assert.equal(callWith(limiter, attacker).allowed, false);

    const bystander = callWith(limiter, {
      ip: '203.0.113.7',
      email: 'someone-else@example.com',
    });

    assert.equal(bystander.allowed, true);
  });

  test('still bounds guesses against a single account', () => {
    const limiter = createRateLimiter({
      max: 3,
      windowMs: 60_000,
      keyGenerator: ipAndEmailKeyGenerator,
    });

    const target = { ip: '203.0.113.7', email: 'target@example.com', statusCode: 401 };

    assert.equal(callWith(limiter, target).allowed, true);
    assert.equal(callWith(limiter, target).allowed, true);
    assert.equal(callWith(limiter, target).allowed, true);
    assert.equal(callWith(limiter, target).allowed, false);
  });

  test('a per-address ceiling still catches a spray across many accounts', () => {
    // Per-account limits never trip when every attempt is a different
    // account, so the looser per-IP limiter is what bounds credential
    // stuffing.
    const limiter = createRateLimiter({
      max: 5,
      windowMs: 60_000,
      keyGenerator: ipKeyGenerator,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = callWith(limiter, {
        ip: '203.0.113.7',
        email: `victim-${attempt}@example.com`,
        statusCode: 401,
      });
      assert.equal(result.allowed, true, `attempt ${attempt}`);
    }

    const blocked = callWith(limiter, {
      ip: '203.0.113.7',
      email: 'victim-6@example.com',
    });

    assert.equal(blocked.allowed, false);
  });

  test('a successful login clears only that account, not the whole address', () => {
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 60_000,
      resetOnSuccess: true,
      keyGenerator: ipAndEmailKeyGenerator,
    });

    const alice = { ip: '203.0.113.7', email: 'alice@example.com' };
    const bob = { ip: '203.0.113.7', email: 'bob@example.com', statusCode: 401 };

    callWith(limiter, bob);
    callWith(limiter, bob);

    callWith(limiter, { ...alice, statusCode: 200 }); // succeeds, clears alice

    assert.equal(callWith(limiter, bob).allowed, false);
    assert.equal(callWith(limiter, alice).allowed, true);
  });
});
