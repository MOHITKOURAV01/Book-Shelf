/**
 * The "recently viewed" list, in localStorage.
 *
 * `components/RecentlyViewed.jsx` has read this key since the day it was
 * added. Nothing has ever written it:
 *
 *     $ grep -rn "recentlyViewed" src
 *     src/components/RecentlyViewed.jsx:19:  localStorage.getItem('recentlyViewed')
 *     src/components/UserDashboard.jsx:21:  recentlyViewed = [   # an unrelated prop
 *
 * One read, no writes. `stored` was always null, the effect returned early,
 * and the component rendered null on every page for its entire existence.
 * See #318.
 *
 * The write side lives here rather than inline in the page for two reasons:
 * it can be tested without rendering anything, and every rule about the list
 * — the cap, the dedup, the ordering — has one home instead of being
 * reimplemented by the next caller.
 */

export const STORAGE_KEY = 'recentlyViewed';

/**
 * How many ids to keep.
 *
 * Eight fits the horizontal strip on a wide screen without the list becoming
 * a second, worse browsing history. The cap is applied on write, so the value
 * can be lowered later without leaving a long list stranded in someone's
 * browser.
 */
export const MAX_ENTRIES = 8;

/**
 * Read the stored ids, newest first.
 *
 * Total for anything localStorage can hold. The value is shared with other
 * tabs, older versions of this app, and anyone with devtools open — the same
 * reasoning that hardened the cart in #309. A browsing-history nicety is not
 * worth a white screen.
 */
export function readRecentlyViewed() {
  let raw;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    // Safari private browsing and blocked third-party storage throw on read,
    // not just on write.
    console.error('[recentlyViewed] could not read from storage:', error);
    return [];
  }

  if (!raw) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('[recentlyViewed] stored value was not JSON:', error);
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const seen = new Set();
  const ids = [];

  for (const entry of parsed) {
    // Ids are strings in books.json but a hand-written value could be
    // anything; numbers are coerced rather than discarded because the app
    // itself compares with String() on both sides.
    const id =
      typeof entry === 'string'
        ? entry.trim()
        : typeof entry === 'number' && Number.isFinite(entry)
          ? String(entry)
          : null;

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    ids.push(id);

    if (ids.length >= MAX_ENTRIES) {
      break;
    }
  }

  return ids;
}

/**
 * Move a book to the front of the list.
 *
 * Revisiting a book moves it rather than adding a second entry — a list that
 * reads "A, A, A, B" after three looks at A is not a history, it is a log.
 *
 * Returns the new list so a caller can use it without reading back.
 */
export function recordBookView(bookId) {
  const id =
    typeof bookId === 'string'
      ? bookId.trim()
      : typeof bookId === 'number' && Number.isFinite(bookId)
        ? String(bookId)
        : '';

  if (!id) {
    return readRecentlyViewed();
  }

  const existing = readRecentlyViewed();
  const next = [id, ...existing.filter((entry) => entry !== id)].slice(
    0,
    MAX_ENTRIES
  );

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // Quota exceeded, or storage disabled. The customer is looking at a book;
    // failing to note that down is not a reason to interrupt them.
    console.error('[recentlyViewed] could not save to storage:', error);
  }

  return next;
}

/** Everything except `excludeId`, for a page that is already showing it. */
export function readRecentlyViewedExcept(excludeId) {
  if (excludeId === undefined || excludeId === null || excludeId === '') {
    return readRecentlyViewed();
  }

  const excluded = String(excludeId);
  return readRecentlyViewed().filter((id) => id !== excluded);
}

/**
 * Drop ids from the list.
 *
 * Used for the ids the catalogue answered 404 for. A book that has been
 * delisted is not coming back, and leaving its id in storage means asking the
 * API about it on every page load for as long as the browser keeps the value
 * — eight ids, one request each, forever.
 *
 * Only a 404 should reach this. An id whose request merely *failed* must stay:
 * that book probably still exists, and forgetting a reader's history because
 * their connection dropped is a worse bug than the one this fixes.
 *
 * Returns the new list.
 */
export function forgetBookViews(ids) {
  const doomed = new Set(
    (Array.isArray(ids) ? ids : [ids])
      .filter((id) => typeof id === 'string' || typeof id === 'number')
      .map((id) => String(id))
  );

  if (doomed.size === 0) {
    return readRecentlyViewed();
  }

  const next = readRecentlyViewed().filter((id) => !doomed.has(id));

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('[recentlyViewed] could not save to storage:', error);
  }

  return next;
}

export function clearRecentlyViewed() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[recentlyViewed] could not clear storage:', error);
  }
}

export default {
  STORAGE_KEY,
  MAX_ENTRIES,
  readRecentlyViewed,
  readRecentlyViewedExcept,
  recordBookView,
  forgetBookViews,
  clearRecentlyViewed,
};
