import crypto from 'crypto';

/**
 * Session token configuration, resolved once and validated up front.
 *
 * Two things used to be wrong, and both came from reading the environment
 * inline at the point of use:
 *
 *   1. `process.env.JWT_SECRET || 'fallback_secret'` appeared in two files.
 *      A deployment that forgot the variable signed real sessions with a
 *      string that is committed to this repository, so anyone could mint a
 *      token for any account — including one carrying `role: 'admin'`.
 *
 *   2. The token's lifetime came from JWT_EXPIRES_IN but the cookie's maxAge
 *      was hardcoded to seven days. Setting JWT_EXPIRES_IN=1h left the browser
 *      holding a cookie for another six days that the server rejects on every
 *      request.
 *
 * Both are the same class of bug: a value that has to agree with itself in
 * more than one place, and no single place that owns it. This module is that
 * place. Nothing else reads JWT_SECRET or JWT_EXPIRES_IN.
 */

/**
 * Values that are syntactically a secret but are obviously not one. The old
 * hardcoded fallback is on the list so a deployment cannot reintroduce it by
 * setting it explicitly, and so is the placeholder from .env.example — copying
 * that file and forgetting to edit it is the likeliest way to end up here.
 */
const REJECTED_SECRETS = new Set([
  'fallback_secret',
  'change-me',
  'changeme',
  'secret',
  'jwt_secret',
  'your-secret-here',
  'your_jwt_secret',
  'test',
  'password',
]);

/**
 * 32 characters is not a cryptographic argument, it is a floor. A HS256 key
 * shorter than the 256-bit digest it feeds adds nothing, and anything a human
 * typed from memory is below it.
 */
export const MIN_SECRET_LENGTH = 32;

export const DEFAULT_EXPIRES_IN = '7d';

/**
 * Thrown for anything wrong with the configuration itself. Distinct from a
 * request-time error because the only sensible response is to refuse to start.
 */
export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

const UNIT_TO_MS = {
  ms: 1,
  millisecond: 1,
  milliseconds: 1,
  s: 1000,
  sec: 1000,
  secs: 1000,
  second: 1000,
  seconds: 1000,
  m: 60 * 1000,
  min: 60 * 1000,
  mins: 60 * 1000,
  minute: 60 * 1000,
  minutes: 60 * 1000,
  h: 60 * 60 * 1000,
  hr: 60 * 60 * 1000,
  hrs: 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  weeks: 7 * 24 * 60 * 60 * 1000,
};

/**
 * Convert a jsonwebtoken-style lifetime to milliseconds.
 *
 * The point is not to reimplement `ms` — it is that we need the number to
 * derive the cookie's maxAge from, and asking jsonwebtoken for it is not
 * possible without signing a token first. Parsing the same string ourselves
 * means the cookie and the token cannot drift apart.
 *
 * A bare number means seconds, matching jsonwebtoken's own rule. Anything
 * unparseable throws here, at boot, rather than turning the first login of the
 * day into a 500.
 */
export function parseDuration(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw new ConfigError(
        `JWT lifetime must be a positive number of seconds, received ${value}`
      );
    }
    return Math.floor(value * 1000);
  }

  if (typeof value !== 'string') {
    throw new ConfigError(
      `JWT lifetime must be a string or a number, received ${typeof value}`
    );
  }

  const raw = value.trim();

  if (raw === '') {
    throw new ConfigError('JWT lifetime cannot be empty');
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw) * 1000;
  }

  const match = /^(\d+(?:\.\d+)?)\s*([a-z]+)$/i.exec(raw);

  if (!match) {
    throw new ConfigError(
      `JWT lifetime "${value}" is not a recognised duration. ` +
        'Use a number of seconds, or a value like 30m, 12h, 7d, 2w.'
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = UNIT_TO_MS[unit];

  if (multiplier === undefined) {
    throw new ConfigError(
      `JWT lifetime "${value}" uses an unknown unit "${match[2]}". ` +
        'Supported units: ms, s, m, h, d, w.'
    );
  }

  if (amount <= 0) {
    throw new ConfigError(
      `JWT lifetime "${value}" must be greater than zero.`
    );
  }

  return Math.floor(amount * multiplier);
}

/**
 * Reject a secret that would not actually protect anything.
 *
 * Returns the secret so callers can write `const s = assertUsableSecret(...)`.
 */
export function assertUsableSecret(secret) {
  if (typeof secret !== 'string' || secret.trim() === '') {
    throw new ConfigError(
      'JWT_SECRET is not set. The API signs session cookies with it, so ' +
        'starting without one would mean every session is forgeable. ' +
        'Generate one with: openssl rand -hex 32'
    );
  }

  const trimmed = secret.trim();

  if (REJECTED_SECRETS.has(trimmed.toLowerCase())) {
    throw new ConfigError(
      `JWT_SECRET is set to "${trimmed}", which is a placeholder that appears ` +
        'in this repository. Anyone reading the source could sign a token ' +
        'for any account. Generate a real one with: openssl rand -hex 32'
    );
  }

  if (trimmed.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(
      `JWT_SECRET is ${trimmed.length} characters; at least ` +
        `${MIN_SECRET_LENGTH} are required. Generate one with: ` +
        'openssl rand -hex 32'
    );
  }

  return trimmed;
}

/**
 * Build the config from an environment.
 *
 * Takes `env` as an argument rather than reading process.env directly so the
 * tests can exercise every branch without mutating global state.
 *
 * Outside production a missing secret is replaced with a random one rather
 * than being fatal, so `npm run dev` still works on a fresh clone with no
 * setup. That is deliberately not the same as the old behaviour: the old
 * fallback was a constant every reader of this repo knows, this one is 32
 * random bytes that exist only for the life of the process. The cost is that
 * sessions do not survive a restart in development, which is the correct
 * trade and is said out loud in the warning.
 */
export function loadJwtConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';

  let secret;

  if (!env.JWT_SECRET && !isProduction) {
    secret = crypto.randomBytes(32).toString('hex');
    console.warn(
      '[config] JWT_SECRET is not set. Generated a random one for this ' +
        'process — sessions will not survive a restart. Set JWT_SECRET in ' +
        '.env to keep them. This is refused outright in production.'
    );
  } else {
    secret = assertUsableSecret(env.JWT_SECRET);
  }

  const expiresIn = env.JWT_EXPIRES_IN?.trim() || DEFAULT_EXPIRES_IN;
  const maxAgeMs = parseDuration(expiresIn);

  return {
    secret,
    expiresIn,
    // Single source of truth for the cookie. Derived, never typed twice.
    maxAgeMs,
    isProduction,
  };
}

let cached = null;

/**
 * The resolved config.
 *
 * Lazy on purpose. Resolving at import time would mean importing
 * authMiddleware in a unit test throws unless that test happens to have a
 * valid JWT_SECRET in its environment, which couples every test file to this
 * one. `assertJwtConfig()` is called explicitly from server.js so a real boot
 * still fails fast.
 */
export function getJwtConfig() {
  if (!cached) {
    cached = loadJwtConfig();
  }
  return cached;
}

/**
 * Call once at startup. Turns a misconfiguration into a refusal to start with
 * an actionable message, instead of a 500 on the first login or — worse — a
 * server that runs happily and issues forgeable tokens.
 */
export function assertJwtConfig() {
  return getJwtConfig();
}

/** Test seam. Not used by application code. */
export function resetJwtConfigCache() {
  cached = null;
}

export default getJwtConfig;
