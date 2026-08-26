/**
 * Environment configuration, read in one place.
 *
 * Vite inlines `import.meta.env.*` at build time — the value baked into the
 * bundle is whatever was set when `vite build` ran, and cannot be changed
 * afterwards. Reading it here rather than scattered through the services
 * means there is one place to look when a deployment is pointed at the wrong
 * backend, and one place that validates the value.
 */

const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

/**
 * Strip trailing slashes so `${base}/books` cannot produce `//books`.
 * A double slash is not always harmless — Express treats `/api//books` as a
 * different path from `/api/books` and will 404 it.
 */
export function normaliseBaseUrl(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
}

function readApiBaseUrl() {
  const raw = import.meta.env?.VITE_API_BASE_URL;
  const normalised = normaliseBaseUrl(raw);

  if (!normalised) {
    // Defaulting keeps `npm run dev` working with no setup, which is what
    // the hardcoded value was really doing. The difference is that a
    // deployment can now override it.
    return DEFAULT_API_BASE_URL;
  }

  // Catch the obvious footgun early rather than as a confusing CORS or
  // mixed-content failure on the first request.
  if (!/^https?:\/\//i.test(normalised) && !normalised.startsWith('/')) {
    console.error(
      `[config] VITE_API_BASE_URL should start with http://, https:// or "/". ` +
        `Got "${raw}". Falling back to ${DEFAULT_API_BASE_URL}.`
    );
    return DEFAULT_API_BASE_URL;
  }

  return normalised;
}

export const API_BASE_URL = readApiBaseUrl();

/**
 * The currency this deployment trades in.
 *
 * Must match `CURRENCY` in the backend's environment — the backend is what
 * actually prices the order and creates the payment intent, so a mismatch
 * means displaying one currency and charging another, which is the bug #335
 * was filed for. Left unvalidated here on purpose: `utils/currency.js`
 * resolves it against the supported table and falls back rather than
 * throwing, because a formatter runs during render.
 */
export const CURRENCY_CODE = (import.meta.env?.VITE_CURRENCY ?? '').trim();

export const IS_PRODUCTION = import.meta.env?.PROD === true;

/**
 * Shipping a bundle that talks to localhost is the failure this whole module
 * exists to prevent, so say so loudly if it happens.
 */
if (IS_PRODUCTION && API_BASE_URL.includes('localhost')) {
  console.error(
    '[config] This production build points at localhost. ' +
      'Set VITE_API_BASE_URL before running `vite build`.'
  );
}

export default { API_BASE_URL, CURRENCY_CODE, IS_PRODUCTION, normaliseBaseUrl };
