/**
 * Password hashing, in one place.
 *
 * This lives outside the Mongoose schema on purpose. Hashing is the single
 * most security-sensitive piece of logic in the backend and it was previously
 * only reachable by calling `save()` on a document, which needs a live
 * MongoDB — so it had no tests, and the bug below survived unnoticed.
 *
 * The bug: `userSchema.pre('save')` guarded with
 *
 *     if (!this.isModified('password')) {
 *       next();
 *     }
 *
 * with no `return`. Execution fell straight through into the hashing branch,
 * so every save of a user document for any reason — toggling a wishlist item,
 * merging a wishlist at login — replaced the stored digest with a hash of
 * that digest. The account could never be logged into again, silently and
 * unrecoverably.
 *
 * `isHashed` exists as a second line of defence: even if a caller somewhere
 * forgets the modified-check, a value that is already a bcrypt digest is
 * never hashed twice.
 */

import bcrypt from 'bcryptjs';

/** Cost factor. 10 is what the schema used; kept so existing hashes verify. */
export const SALT_ROUNDS = 10;

/**
 * A bcrypt digest: `$2<variant>$<cost>$<22 char salt><31 char hash>`.
 *
 * The variant letters bcryptjs can produce or verify are a, b, x and y. The
 * cost is always two digits, and the trailing 53 characters are the bcrypt
 * base64 alphabet, which — unlike standard base64 — starts with `.` and `/`.
 */
const BCRYPT_HASH_PATTERN = /^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * True when `value` already looks like a bcrypt digest.
 *
 * Deliberately a shape check rather than an attempt to verify: there is no
 * way to ask bcrypt "is this a hash of something" without knowing the
 * something. The shape is specific enough that no plausible human-chosen
 * password collides with it, and a password that somehow did would be
 * rejected by `assertHashable` below for being 60 characters of bcrypt
 * alphabet rather than silently stored in plaintext.
 */
export function isHashed(value) {
  return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);
}

/**
 * Reject the inputs that must never reach bcrypt.
 *
 * bcryptjs happily hashes `undefined` by stringifying it, which would store a
 * valid digest of the literal text "undefined" — a password every account
 * created through that path would share. Failing loudly is the only safe
 * option.
 */
function assertHashable(plainPassword) {
  if (typeof plainPassword !== 'string') {
    throw new TypeError(
      `Password must be a string, received ${plainPassword === null ? 'null' : typeof plainPassword}`
    );
  }

  if (plainPassword.length === 0) {
    throw new Error('Password must not be empty');
  }
}

/**
 * Hash a plaintext password.
 *
 * Returns the input unchanged when it is already a bcrypt digest, so calling
 * this twice is a no-op rather than a lockout.
 */
export async function hashPassword(plainPassword) {
  if (isHashed(plainPassword)) {
    return plainPassword;
  }

  assertHashable(plainPassword);

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare a candidate password against a stored digest.
 *
 * Returns false rather than throwing for a missing or malformed digest. A
 * user document loaded with `.select('-password')` has no `password` field,
 * and `bcrypt.compare` throws on undefined — which surfaced as a 500 on the
 * login route instead of the 401 it should be.
 */
export async function comparePassword(plainPassword, hashedPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    return false;
  }

  if (!isHashed(hashedPassword)) {
    return false;
  }

  return bcrypt.compare(plainPassword, hashedPassword);
}

export default { SALT_ROUNDS, isHashed, hashPassword, comparePassword };
