import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { resetJwtConfigCache, MIN_SECRET_LENGTH } from '../config/jwt.js';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  clearSessionCookieOptions,
} from '../utils/cookies.js';
import generateToken from '../utils/generateToken.js';
import { logoutUser } from '../controllers/authController.js';

const SECRET = 'b'.repeat(MIN_SECRET_LENGTH);

/**
 * Point the config at a known environment. node --test gives each test file
 * its own process, so mutating process.env here cannot leak into another file.
 */
function configure({ expiresIn, nodeEnv = 'test' } = {}) {
  process.env.JWT_SECRET = SECRET;
  process.env.NODE_ENV = nodeEnv;

  if (expiresIn === undefined) {
    delete process.env.JWT_EXPIRES_IN;
  } else {
    process.env.JWT_EXPIRES_IN = expiresIn;
  }

  resetJwtConfigCache();
}

/** The two bits of the Express response that generateToken touches. */
function fakeResponse() {
  const cookies = [];
  return {
    cookies,
    cookie(name, value, options) {
      cookies.push({ name, value, options });
      return this;
    },
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('sessionCookieOptions', async (t) => {
  await t.test('is httpOnly and same-site strict', () => {
    configure();
    const options = sessionCookieOptions({ maxAgeMs: 1000 });

    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, 'strict');
  });

  await t.test('states path explicitly so set and clear cannot drift', () => {
    configure();
    assert.equal(sessionCookieOptions().path, '/');
    assert.equal(clearSessionCookieOptions().path, '/');
  });

  await t.test('sets secure only in production', () => {
    configure({ nodeEnv: 'production' });
    assert.equal(sessionCookieOptions().secure, true);

    configure({ nodeEnv: 'development' });
    assert.equal(sessionCookieOptions().secure, false);
  });

  await t.test('omits maxAge when none is given', () => {
    configure();
    assert.ok(!('maxAge' in sessionCookieOptions()));
  });

  await t.test('clear options expire in the past and carry no maxAge', () => {
    configure();
    const options = clearSessionCookieOptions();

    assert.equal(options.expires.getTime(), 0);
    assert.ok(!('maxAge' in options));
  });

  await t.test('clear options match the set options attribute for attribute', () => {
    configure({ nodeEnv: 'production' });
    const set = sessionCookieOptions({ maxAgeMs: 5000 });
    const clear = clearSessionCookieOptions();

    // Everything a browser keys a cookie on has to be identical, or logout
    // adds a second cookie instead of replacing the first.
    for (const key of ['httpOnly', 'secure', 'sameSite', 'path']) {
      assert.equal(clear[key], set[key], `${key} differs between set and clear`);
    }
  });
});

test('generateToken', async (t) => {
  await t.test('signs a token the configured secret verifies', () => {
    configure();
    const res = fakeResponse();

    generateToken(res, 'user-1', 'a@example.com', 'user');

    assert.equal(res.cookies.length, 1);
    assert.equal(res.cookies[0].name, SESSION_COOKIE_NAME);

    const decoded = jwt.verify(res.cookies[0].value, SECRET);
    assert.equal(decoded.userId, 'user-1');
    assert.equal(decoded.email, 'a@example.com');
    assert.equal(decoded.role, 'user');
  });

  await t.test('the old hardcoded secret no longer verifies anything', () => {
    configure();
    const res = fakeResponse();

    generateToken(res, 'user-1', 'a@example.com', 'user');

    assert.throws(() => jwt.verify(res.cookies[0].value, 'fallback_secret'));
  });

  await t.test('cookie maxAge tracks JWT_EXPIRES_IN', () => {
    configure({ expiresIn: '1h' });
    const res = fakeResponse();

    generateToken(res, 'user-1', 'a@example.com', 'user');

    // Previously this was 7 * 24 * 60 * 60 * 1000 regardless.
    assert.equal(res.cookies[0].options.maxAge, 60 * 60 * 1000);
  });

  await t.test('cookie expiry and token expiry describe the same moment', () => {
    configure({ expiresIn: '2h' });
    const res = fakeResponse();

    generateToken(res, 'user-1', 'a@example.com', 'user');

    const { exp, iat } = jwt.decode(res.cookies[0].value);
    const tokenLifetimeMs = (exp - iat) * 1000;

    assert.equal(res.cookies[0].options.maxAge, tokenLifetimeMs);
  });

  await t.test('defaults to a seven day cookie when JWT_EXPIRES_IN is unset', () => {
    configure();
    const res = fakeResponse();

    generateToken(res, 'user-1', 'a@example.com', 'user');

    assert.equal(res.cookies[0].options.maxAge, 7 * 24 * 60 * 60 * 1000);
  });

  await t.test('carries the role, so admin checks have something to read', () => {
    configure();
    const res = fakeResponse();

    generateToken(res, 'user-9', 'admin@example.com', 'admin');

    assert.equal(jwt.verify(res.cookies[0].value, SECRET).role, 'admin');
  });
});

test('logoutUser', async (t) => {
  await t.test('clears the cookie with the attributes it was set with', () => {
    configure({ nodeEnv: 'production' });

    const setRes = fakeResponse();
    generateToken(setRes, 'user-1', 'a@example.com', 'user');

    const logoutRes = fakeResponse();
    logoutUser({}, logoutRes);

    const set = setRes.cookies[0];
    const cleared = logoutRes.cookies[0];

    assert.equal(cleared.name, set.name);
    assert.equal(cleared.value, '');
    assert.equal(cleared.options.expires.getTime(), 0);

    for (const key of ['httpOnly', 'secure', 'sameSite', 'path']) {
      assert.equal(cleared.options[key], set.options[key]);
    }
  });

  await t.test('answers 200', () => {
    configure();
    const res = fakeResponse();

    logoutUser({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Logged out successfully');
  });
});
