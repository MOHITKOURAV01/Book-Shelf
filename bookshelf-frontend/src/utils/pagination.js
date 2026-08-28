/**
 * Which page numbers a pager should show.
 *
 * `Pagination` built its list with
 *
 *     for (let i = 1; i <= totalPages; i++) pages.push(i);
 *
 * which is fine while the catalogue is a fixed 16 titles and four pages. It
 * stops being fine the moment the catalogue grows — the admin CRUD endpoints
 * added in #364 mean it can — because the control is then a block of numbers
 * taller than the grid above it, every one of them re-rendering on every page
 * change. See #369.
 *
 * The arithmetic lives here rather than in the component because it is the
 * part with edge cases: the first pages, the last pages, a window wider than
 * the whole range, and the two places where an ellipsis would replace exactly
 * one number and should not. None of that needs a DOM to be checked.
 */

/** Marker for a skipped run. Not a number, so a caller cannot render it as one. */
export const ELLIPSIS = 'ellipsis';

/** Pages either side of the current one. 1 gives `4 [5] 6`. */
export const DEFAULT_SIBLINGS = 1;

/** Pages pinned at each end. 1 gives `1 … 4 [5] 6 … 50`. */
export const DEFAULT_BOUNDARIES = 1;

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function range(from, to) {
  const out = [];

  for (let page = from; page <= to; page += 1) {
    out.push(page);
  }

  return out;
}

/**
 * Bring a page number into `1..totalPages`.
 *
 * `?page=7` on a three-page result set is a URL a reader can type, and the
 * API answers a page past the end with an empty slice rather than an error —
 * so without this the symptom is a blank grid under a pager that still
 * offers Next.
 */
export function clampPage(page, totalPages) {
  const total = toPositiveInteger(totalPages, 1);
  const wanted = toPositiveInteger(page, 1);

  return Math.min(wanted, total);
}

/**
 * The page list to render, as numbers and `ELLIPSIS` markers.
 *
 * The window is held to a fixed width as it runs into either end, so the
 * control does not shrink on page 1 and grow again in the middle. The
 * boundary cases still vary by one entry — `[1 … 47 48 49 50]` against
 * `[1 … 4 5 6 … 50]` — because the far ellipsis has nothing left to hide.
 *
 * An ellipsis is only used where it actually saves something. Replacing a
 * single skipped page with `…` costs the reader a click and saves no space,
 * so that case renders the number instead — which is why `[1, 2, 3, …]`
 * appears rather than `[1, …, 3, …]`.
 */
export function pageWindow({
  currentPage = 1,
  totalPages = 1,
  siblings = DEFAULT_SIBLINGS,
  boundaries = DEFAULT_BOUNDARIES,
} = {}) {
  const total = toPositiveInteger(totalPages, 1);
  const current = clampPage(currentPage, total);
  const sibling = Math.max(0, Number.isInteger(siblings) ? siblings : DEFAULT_SIBLINGS);
  const boundary = Math.max(1, Number.isInteger(boundaries) ? boundaries : DEFAULT_BOUNDARIES);

  // Widest the control can ever be: both boundaries, both ellipses, the
  // current page and its siblings. Below this, showing everything is both
  // shorter and easier to use.
  const maxEntries = boundary * 2 + sibling * 2 + 3;

  if (total <= maxEntries) {
    return range(1, total);
  }

  const start = Math.max(current - sibling, boundary + 1);
  const end = Math.min(current + sibling, total - boundary);

  // Keep the window the same width when it runs into either end, so the
  // control does not shrink on page 1 and grow again in the middle.
  const windowSize = sibling * 2 + 1;
  const shiftedStart = Math.max(boundary + 1, Math.min(start, total - boundary - windowSize + 1));
  const shiftedEnd = Math.min(total - boundary, Math.max(end, boundary + windowSize));

  const head = range(1, boundary);
  const middle = range(shiftedStart, shiftedEnd);
  const tail = range(total - boundary + 1, total);

  const pages = [...head];

  // gap of exactly one -> render the number; more than one -> an ellipsis.
  const leftGap = shiftedStart - boundary - 1;

  if (leftGap === 1) {
    pages.push(boundary + 1);
  } else if (leftGap > 1) {
    pages.push(ELLIPSIS);
  }

  pages.push(...middle);

  const rightGap = total - boundary - shiftedEnd;

  if (rightGap === 1) {
    pages.push(shiftedEnd + 1);
  } else if (rightGap > 1) {
    pages.push(ELLIPSIS);
  }

  pages.push(...tail);

  return pages;
}

export default { ELLIPSIS, DEFAULT_SIBLINGS, DEFAULT_BOUNDARIES, clampPage, pageWindow };
