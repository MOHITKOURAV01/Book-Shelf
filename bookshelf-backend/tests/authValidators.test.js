import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { validate } from '../utils/validators.js';
import { validateBody } from '../middleware/validateBody.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';

const VALID_REGISTRATION = {
  name: 'Alice Kapoor',
  email: 'alice@example.com',
  password: 'correct-horse',
};

function fieldsWithErrors(errors) {
  return errors.map((error) => error.field);
}

/** Minimal Express res double — enough for the middleware under test. */
function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runMiddleware(middleware, body) {
  const req = { body };
  const res = makeRes();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
}

describe('registerSchema', () => {
  test('accepts a well formed registration', () => {
    const { errors } = validate(VALID_REGISTRATION, registerSchema);
    assert.deepEqual(errors, []);
  });

  test('reports a missing password rather than throwing', () => {
    // This is the reported bug: `password.length` on undefined threw a
    // TypeError and surfaced as a 500.
    const { errors } = validate({ email: 'a@b.com' }, registerSchema);

    assert.ok(fieldsWithErrors(errors).includes('password'));
    assert.match(
      errors.find((error) => error.field === 'password').message,
      /required/
    );
  });

  test('reports every bad field at once', () => {
    const { errors } = validate({}, registerSchema);
    assert.deepEqual(fieldsWithErrors(errors).sort(), [
      'email',
      'name',
      'password',
    ]);
  });

  test('rejects a password below the minimum length', () => {
    const { errors } = validate(
      { ...VALID_REGISTRATION, password: 'short' },
      registerSchema
    );
    assert.deepEqual(fieldsWithErrors(errors), ['password']);
  });

  test('rejects an absurdly long password instead of hashing it', () => {
    const { errors } = validate(
      { ...VALID_REGISTRATION, password: 'a'.repeat(500) },
      registerSchema
    );
    assert.deepEqual(fieldsWithErrors(errors), ['password']);
  });

  test('rejects a malformed email', () => {
    for (const email of ['notanemail', 'no@domain', 'a b@c.com', '@example.com']) {
      const { errors } = validate(
        { ...VALID_REGISTRATION, email },
        registerSchema
      );
      assert.deepEqual(
        fieldsWithErrors(errors),
        ['email'],
        `expected "${email}" to be rejected`
      );
    }
  });

  test('lowercases and trims the email', () => {
    const { values, errors } = validate(
      { ...VALID_REGISTRATION, email: '  Alice@Example.COM ' },
      registerSchema
    );

    assert.deepEqual(errors, []);
    assert.equal(values.email, 'alice@example.com');
  });

  test('trims the name', () => {
    const { values } = validate(
      { ...VALID_REGISTRATION, name: '  Alice  ' },
      registerSchema
    );
    assert.equal(values.name, 'Alice');
  });

  test('rejects a whitespace-only name', () => {
    const { errors } = validate(
      { ...VALID_REGISTRATION, name: '   ' },
      registerSchema
    );
    assert.deepEqual(fieldsWithErrors(errors), ['name']);
  });

  test('does not trim the password', () => {
    const { values } = validate(
      { ...VALID_REGISTRATION, password: ' spaced out ' },
      registerSchema
    );
    assert.equal(values.password, ' spaced out ');
  });

  test('rejects a non-string password', () => {
    const { errors } = validate(
      { ...VALID_REGISTRATION, password: 12345678 },
      registerSchema
    );
    assert.deepEqual(fieldsWithErrors(errors), ['password']);
  });

  test('reports one error per field, not a pile of them', () => {
    const { errors } = validate({ password: 'x' }, registerSchema);
    assert.equal(
      errors.filter((error) => error.field === 'password').length,
      1
    );
  });
});

describe('loginSchema', () => {
  test('accepts an email and password', () => {
    const { errors } = validate(
      { email: 'alice@example.com', password: 'anything' },
      loginSchema
    );
    assert.deepEqual(errors, []);
  });

  test('rejects a missing password', () => {
    const { errors } = validate({ email: 'alice@example.com' }, loginSchema);
    assert.deepEqual(fieldsWithErrors(errors), ['password']);
  });

  test('does not apply the registration length rule to an existing password', () => {
    // An account created before the 8 character rule must still be able to
    // log in, and rejecting short passwords here would tell an attacker
    // something about what is stored.
    const { errors } = validate(
      { email: 'alice@example.com', password: 'old' },
      loginSchema
    );
    assert.deepEqual(errors, []);
  });

  test('normalises the login email the same way as registration', () => {
    const { values } = validate(
      { email: ' Alice@Example.com ', password: 'anything' },
      loginSchema
    );
    assert.equal(values.email, 'alice@example.com');
  });
});

describe('validateBody middleware', () => {
  test('calls next and normalises the body when valid', () => {
    const { req, nextCalled } = runMiddleware(validateBody(registerSchema), {
      ...VALID_REGISTRATION,
      email: 'ALICE@example.com',
    });

    assert.equal(nextCalled, true);
    assert.equal(req.body.email, 'alice@example.com');
  });

  test('answers 400 with a field list and does not call next', () => {
    const { res, nextCalled } = runMiddleware(validateBody(registerSchema), {
      email: 'nope',
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation failed');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length >= 2);
  });

  test('drops fields the schema does not name', () => {
    // Stops a request smuggling role:"admin" through to the repository.
    const { req } = runMiddleware(validateBody(registerSchema), {
      ...VALID_REGISTRATION,
      role: 'admin',
    });

    assert.equal(req.body.role, undefined);
    assert.deepEqual(Object.keys(req.body).sort(), [
      'email',
      'name',
      'password',
    ]);
  });

  test('handles a completely absent body', () => {
    const { res, nextCalled } = runMiddleware(
      validateBody(registerSchema),
      undefined
    );

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
  });
});
