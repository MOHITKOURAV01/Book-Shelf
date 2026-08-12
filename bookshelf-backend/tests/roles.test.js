import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { ROLES, isAdmin, isOwner, canAccess } from '../utils/roles.js';
import { admin } from '../middleware/authMiddleware.js';

/**
 * Stand-in for a Mongo ObjectId: distinct object identity, same string value.
 * This is the thing the old ownership check got wrong — two ObjectIds
 * wrapping the same id are not `===` each other.
 */
function objectId(hex) {
  return { toString: () => hex };
}

const OWNER_ID = objectId('507f1f77bcf86cd799439011');
const OTHER_ID = objectId('507f1f77bcf86cd799439022');

const regularUser = { _id: OWNER_ID, role: ROLES.USER };
const adminUser = { _id: OTHER_ID, role: ROLES.ADMIN };

function runAdmin(user) {
  const req = user === undefined ? {} : { user };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
  };
  let nextArg = 'not-called';

  admin(req, res, (error) => {
    nextArg = error;
  });

  return { statusCode: res.statusCode, error: nextArg };
}

describe('isAdmin', () => {
  test('is true for a user with the admin role', () => {
    assert.equal(isAdmin(adminUser), true);
  });

  test('is false for a regular user', () => {
    assert.equal(isAdmin(regularUser), false);
  });

  test('is false for null or undefined', () => {
    assert.equal(isAdmin(null), false);
    assert.equal(isAdmin(undefined), false);
  });

  test('is false for the isAdmin field the old code looked for', () => {
    // A document carrying isAdmin:true but role:'user' must not pass. The
    // model has no isAdmin field; role is the only source of truth.
    assert.equal(isAdmin({ role: ROLES.USER, isAdmin: true }), false);
  });

  test('is false when role is missing entirely', () => {
    assert.equal(isAdmin({ _id: OWNER_ID }), false);
  });
});

describe('isOwner', () => {
  test('matches two ObjectIds with the same value', () => {
    // `order.userId === user._id` is false for distinct ObjectId instances,
    // which is exactly why both sides are stringified.
    assert.equal(isOwner(regularUser, objectId('507f1f77bcf86cd799439011')), true);
  });

  test('matches a plain string id', () => {
    assert.equal(isOwner(regularUser, '507f1f77bcf86cd799439011'), true);
  });

  test('does not match a different id', () => {
    assert.equal(isOwner(regularUser, OTHER_ID), false);
  });

  test('is false when the resource has no owner', () => {
    assert.equal(isOwner(regularUser, null), false);
    assert.equal(isOwner(regularUser, undefined), false);
  });

  test('does not treat two missing ids as a match', () => {
    assert.equal(isOwner({ _id: null }, null), false);
  });

  test('is false for no user at all', () => {
    assert.equal(isOwner(null, OWNER_ID), false);
  });
});

describe('canAccess', () => {
  test('allows the owner', () => {
    assert.equal(canAccess(regularUser, OWNER_ID), true);
  });

  test('allows an admin who is not the owner', () => {
    // The case that was broken: this returned false before.
    assert.equal(canAccess(adminUser, OWNER_ID), true);
  });

  test('denies a stranger', () => {
    const stranger = { _id: objectId('507f1f77bcf86cd799439033'), role: ROLES.USER };
    assert.equal(canAccess(stranger, OWNER_ID), false);
  });

  test('denies a missing user', () => {
    assert.equal(canAccess(null, OWNER_ID), false);
  });
});

describe('admin middleware', () => {
  test('calls next with no error for an admin', () => {
    const result = runAdmin(adminUser);
    assert.equal(result.error, undefined);
  });

  test('answers 403 for a regular user', () => {
    const result = runAdmin(regularUser);

    assert.equal(result.statusCode, 403);
    assert.match(result.error.message, /admin/i);
  });

  test('answers 401 when protect did not attach a user', () => {
    const result = runAdmin(undefined);

    assert.equal(result.statusCode, 401);
    assert.match(result.error.message, /no token/i);
  });

  test('answers 401 when the user is null', () => {
    const result = runAdmin(null);
    assert.equal(result.statusCode, 401);
  });
});
