/**
 * Small validation primitives.
 *
 * Each rule takes the raw value and returns either an error string or null.
 * They are plain functions rather than a schema library so they can be unit
 * tested directly and so the backend gains no new dependency.
 */

// Deliberately permissive. The point is to catch "notanemail" and obvious
// typos, not to adjudicate RFC 5322 — the only real proof an address works is
// sending mail to it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 100;
export const MAX_EMAIL_LENGTH = 254; // the practical limit for an address

export function isMissing(value) {
  return value === undefined || value === null;
}

export function required(field) {
  return (value) => {
    if (isMissing(value)) {
      return `${field} is required`;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return `${field} cannot be empty`;
    }
    return null;
  };
}

export function isString(field) {
  return (value) => {
    if (isMissing(value)) return null; // `required` reports this
    if (typeof value !== 'string') {
      return `${field} must be a string`;
    }
    return null;
  };
}

export function maxLength(field, max) {
  return (value) => {
    if (typeof value !== 'string') return null;
    if (value.length > max) {
      return `${field} must be at most ${max} characters`;
    }
    return null;
  };
}

export function minLength(field, min) {
  return (value) => {
    if (typeof value !== 'string') return null;
    if (value.length < min) {
      return `${field} must be at least ${min} characters`;
    }
    return null;
  };
}

export function isNumber(field) {
  return (value) => {
    if (isMissing(value)) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `${field} must be a number`;
    }
    return null;
  };
}

export function minNumber(field, min) {
  return (value) => {
    if (typeof value !== 'number') return null;
    if (value < min) {
      return `${field} must be at least ${min}`;
    }
    return null;
  };
}

export function isEmail(field = 'email') {
  return (value) => {
    if (typeof value !== 'string' || value.trim() === '') return null;
    if (!EMAIL_PATTERN.test(value.trim())) {
      return `${field} must be a valid email address`;
    }
    return null;
  };
}

/**
 * Normalisers run before the rules, so a rule never has to think about
 * surrounding whitespace.
 */
export function trim(value) {
  return typeof value === 'string' ? value.trim() : value;
}

export function lowercase(value) {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

export function normaliseEmail(value) {
  return lowercase(trim(value));
}

/**
 * Run a field spec against a body.
 *
 * spec is `{ [field]: { normalise?: fn, rules: [fn] } }`. Returns the errors
 * found and the normalised values, so the caller decides what to do with
 * either. Only fields named in the spec end up in `values` — an unexpected
 * key in the request body is dropped rather than passed through to the
 * database.
 */
export function validate(body = {}, spec = {}) {
  const errors = [];
  const values = {};

  for (const [field, config] of Object.entries(spec)) {
    const raw = body[field];
    const normalise = config.normalise;
    const value = normalise ? normalise(raw) : raw;

    values[field] = value;

    for (const rule of config.rules ?? []) {
      const message = rule(value);
      if (message) {
        errors.push({ field, message });
        // One error per field. Reporting "password is required" and
        // "password must be at least 8 characters" together is noise.
        break;
      }
    }
  }

  return { errors, values };
}
