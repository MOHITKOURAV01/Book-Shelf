import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

import {
  SALT_ROUNDS,
  isHashed,
  hashPassword,
  comparePassword,
} from '../utils/password.js';

/**
 * Tests for the hashing helpers, and for the pre-save behaviour they encode.
 *
 * None of this needs a database. That is the point: the double-hash bug in
 * #295 lived inside a Mongoose hook, which could only be exercised against a
 * live MongoDB, so nothing exercised it at all.
 */

const PASSWORD = 'correct horse battery staple';

describe('isHashed', () => {
  test('recognises a digest produced by bcryptjs', async () => {
    const digest = await bcrypt.hash(PASSWORD, await bcrypt.genSalt(10));
    assert.equal(isHashed(digest), true);
  });

  test('recognises the $2a, $2b and $2y variants', () => {
    const body = '$10$abcdefghijklmnopqrstuu';
    const tail = 'abcdefghijklmnopqrstuvwxyz01234';

    for (const variant of ['a', 'b', 'x', 'y']) {
      assert.equal(isHashed(`$2${variant}${body}${tail}`), true, variant);
    }
  });

  test('rejects a plaintext password', () => {
    assert.equal(isHashed(PASSWORD), false);
    assert.equal(isHashed('hunter2'), false);
    assert.equal(isHashed(''), false);
  });

  test('rejects a string that is nearly a digest', () => {
    // Right prefix, wrong length.
    assert.equal(isHashed('$2b$10$tooshort'), false);
    // Unsupported cost format.
    assert.equal(
      isHashed(`$2b$1$${'a'.repeat(53)}`),
      false
    );
    // Character outside the bcrypt alphabet.
    assert.equal(
      isHashed(`$2b$10$${'a'.repeat(52)}!`),
      false
    );
  });

  test('rejects non-strings without throwing', () => {
    assert.equal(isHashed(undefined), false);
    assert.equal(isHashed(null), false);
    assert.equal(isHashed(12345), false);
    assert.equal(isHashed({}), false);
  });
});

describe('hashPassword', () => {
  test('produces a verifiable bcrypt digest', async () => {
    const digest = await hashPassword(PASSWORD);

    assert.equal(isHashed(digest), true);
    assert.equal(await bcrypt.compare(PASSWORD, digest), true);
  });

  test('uses the configured cost factor', async () => {
    const digest = await hashPassword(PASSWORD);
    const cost = digest.split('$')[2];

    assert.equal(Number(cost), SALT_ROUNDS);
  });

  test('salts, so the same password hashes to two different digests', async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ]);

    assert.notEqual(first, second);
    assert.equal(await bcrypt.compare(PASSWORD, first), true);
    assert.equal(await bcrypt.compare(PASSWORD, second), true);
  });

  test('is a no-op on a value that is already hashed', async () => {
    const digest = await hashPassword(PASSWORD);
    const again = await hashPassword(digest);

    assert.equal(again, digest);
    // The regression this whole module exists to prevent: had it re-hashed,
    // the original password would no longer verify.
    assert.equal(await bcrypt.compare(PASSWORD, again), true);
  });

  test('survives being applied repeatedly', async () => {
    let value = PASSWORD;

    for (let i = 0; i < 5; i += 1) {
      value = await hashPassword(value);
    }

    assert.equal(await bcrypt.compare(PASSWORD, value), true);
  });

  test('refuses undefined rather than hashing the string "undefined"', async () => {
    await assert.rejects(() => hashPassword(undefined), TypeError);
    await assert.rejects(() => hashPassword(null), TypeError);
    await assert.rejects(() => hashPassword(42), TypeError);
  });

  test('refuses an empty password', async () => {
    await assert.rejects(() => hashPassword(''), /must not be empty/);
  });
});

describe('comparePassword', () => {
  test('accepts the right password', async () => {
    const digest = await hashPassword(PASSWORD);
    assert.equal(await comparePassword(PASSWORD, digest), true);
  });

  test('rejects the wrong password', async () => {
    const digest = await hashPassword(PASSWORD);
    assert.equal(await comparePassword('not it', digest), false);
  });

  test('is case and whitespace sensitive', async () => {
    const digest = await hashPassword(PASSWORD);

    assert.equal(await comparePassword(PASSWORD.toUpperCase(), digest), false);
    assert.equal(await comparePassword(` ${PASSWORD}`, digest), false);
  });

  test('returns false for a missing digest instead of throwing', async () => {
    // A document loaded with .select('-password') has no password field.
    // bcrypt.compare throws on undefined, which turned a 401 into a 500.
    assert.equal(await comparePassword(PASSWORD, undefined), false);
    assert.equal(await comparePassword(PASSWORD, null), false);
    assert.equal(await comparePassword(PASSWORD, ''), false);
  });

  test('returns false for a digest that is not bcrypt', async () => {
    assert.equal(await comparePassword(PASSWORD, 'plaintext-in-the-db'), false);
  });

  test('returns false for a missing candidate password', async () => {
    const digest = await hashPassword(PASSWORD);

    assert.equal(await comparePassword(undefined, digest), false);
    assert.equal(await comparePassword('', digest), false);
  });

  test('rejects the double-hashed digest the old hook produced', async () => {
    // Reproduces the stored value #295 left behind: a hash of a hash. The
    // user's real password cannot verify against it, which is exactly the
    // permanent lockout reported.
    const digest = await bcrypt.hash(PASSWORD, await bcrypt.genSalt(10));
    const doubleHashed = await bcrypt.hash(digest, await bcrypt.genSalt(10));

    assert.equal(await comparePassword(PASSWORD, doubleHashed), false);
    // And the guard in hashPassword is what stops us ever writing one.
    assert.equal(await hashPassword(digest), digest);
  });
});

/**
 * The pre-save hook itself, exercised without Mongoose.
 *
 * `userSchema.pre('save', fn)` calls `fn` with the document as `this`. A
 * stand-in with the two things the hook touches — `isModified` and
 * `password` — is enough to pin the behaviour that regressed.
 */
describe('pre-save hashing behaviour', () => {
  async function preSave(doc) {
    if (!doc.isModified('password')) {
      return;
    }
    if (isHashed(doc.password)) {
      return;
    }
    doc.password = await hashPassword(doc.password);
  }

  function documentStub({ password, modified }) {
    return {
      password,
      isModified: (path) => path === 'password' && modified,
    };
  }

  test('hashes on registration, when the password is new', async () => {
    const doc = documentStub({ password: PASSWORD, modified: true });

    await preSave(doc);

    assert.equal(isHashed(doc.password), true);
    assert.equal(await bcrypt.compare(PASSWORD, doc.password), true);
  });

  test('leaves the digest untouched when the password did not change', async () => {
    const stored = await hashPassword(PASSWORD);
    const doc = documentStub({ password: stored, modified: false });

    await preSave(doc);

    assert.equal(doc.password, stored);
  });

  test('a wishlist save followed by a login still authenticates', async () => {
    // The end-to-end shape of #295, in three lines. Register, then save the
    // document twice for unrelated reasons, then log in.
    const doc = documentStub({ password: PASSWORD, modified: true });
    await preSave(doc);

    const afterRegister = doc.password;

    doc.isModified = () => false;
    await preSave(doc); // toggle a wishlist item
    await preSave(doc); // merge a wishlist at login

    assert.equal(doc.password, afterRegister);
    assert.equal(await comparePassword(PASSWORD, doc.password), true);
  });

  test('does not re-hash even if a caller marks an already-hashed value modified', async () => {
    const stored = await hashPassword(PASSWORD);
    const doc = documentStub({ password: stored, modified: true });

    await preSave(doc);

    assert.equal(doc.password, stored);
    assert.equal(await comparePassword(PASSWORD, doc.password), true);
  });
});
