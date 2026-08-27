import {
  required,
  isString,
  isEmail,
  minLength,
  maxLength,
  trim,
  normaliseEmail,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
} from '../utils/validators.js';

/**
 * POST /api/auth/register
 *
 * Emails are lowercased and trimmed here rather than in the controller so
 * that the uniqueness lookup and the stored value always agree. Without it
 * "Alice@Example.com " and "alice@example.com" register as two accounts and
 * only one of them can ever log in with the address the user typed.
 */
export const registerSchema = {
  name: {
    normalise: trim,
    rules: [
      required('name'),
      isString('name'),
      maxLength('name', MAX_NAME_LENGTH),
    ],
  },
  email: {
    normalise: normaliseEmail,
    rules: [
      required('email'),
      isString('email'),
      maxLength('email', MAX_EMAIL_LENGTH),
      isEmail('email'),
    ],
  },
  password: {
    // Not trimmed: leading and trailing spaces are legitimate password
    // characters, and silently stripping them means the password the user
    // set is not the password they can log in with.
    rules: [
      required('password'),
      isString('password'),
      minLength('password', MIN_PASSWORD_LENGTH),
      maxLength('password', MAX_PASSWORD_LENGTH),
    ],
  },
};

/**
 * POST /api/auth/login
 *
 * Only presence and shape are checked. Applying the registration password
 * rules here would tell an attacker which stored passwords are too short,
 * and would lock out any account created before those rules existed.
 */
export const loginSchema = {
  email: {
    normalise: normaliseEmail,
    rules: [required('email'), isString('email'), isEmail('email')],
  },
  password: {
    rules: [required('password'), isString('password')],
  },
};

/**
 * PUT /api/auth/profile
 */
export const updateProfileSchema = {
  name: {
    normalise: trim,
    rules: [
      isString('name'),
      maxLength('name', MAX_NAME_LENGTH),
    ],
  },
  bio: {
    normalise: trim,
    rules: [
      isString('bio'),
      maxLength('bio', 500),
    ],
  },
  avatar: {
    normalise: trim,
    rules: [
      isString('avatar'),
      maxLength('avatar', 50),
    ],
  },
  readingGoal: {
    rules: [
      (val) => (val !== undefined && val !== null && (typeof val !== 'number' || val < 1) ? 'readingGoal must be a positive number' : null),
    ],
  },
  preferredGenres: {
    rules: [
      (val) => (val !== undefined && val !== null && !Array.isArray(val) ? 'preferredGenres must be an array' : null),
    ],
  },
};

/**
 * PUT /api/auth/password
 */
export const updatePasswordSchema = {
  currentPassword: {
    rules: [
      required('currentPassword'),
      isString('currentPassword'),
    ],
  },
  newPassword: {
    rules: [
      required('newPassword'),
      isString('newPassword'),
      minLength('newPassword', MIN_PASSWORD_LENGTH),
      maxLength('newPassword', MAX_PASSWORD_LENGTH),
    ],
  },
};
