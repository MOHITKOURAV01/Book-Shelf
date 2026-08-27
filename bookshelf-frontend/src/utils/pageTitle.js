/**
 * What goes in the browser tab.
 *
 * Every route in this app rendered the same title. `index.html` set
 *
 *     <title>BookShelf — Find your next read</title>
 *
 * and nothing ever changed it: `grep -rn "document.title" src` found exactly
 * one hit, and it was a *read* — `ShareButton` defaulting its share title to
 * whatever the document happened to be called. There was no react-helmet, no
 * hook, and no title handling in the route table. See #337.
 *
 * The title is not decoration. It is what a screen reader announces on
 * navigation, which is the primary "where am I now" signal and the whole of
 * WCAG 2.4.2; it is what browser history, the tab strip, bookmarks and
 * open-tab search key on; and, because of that one read in ShareButton, it
 * was what a shared book page called itself.
 *
 * The building lives here, separate from the DOM writing in
 * `hooks/useDocumentTitle.js`, so the rules about what a title looks like can
 * be asserted without rendering anything.
 */

/** The shop. Appears in every title, last, so the distinctive part is first. */
export const SITE_NAME = 'BookShelf';

/** What the home page and the document default are called. */
export const DEFAULT_TITLE = `${SITE_NAME} — Find your next read`;

/** Cap on the whole title. Beyond this a tab shows an ellipsis anyway. */
export const MAX_TITLE_LENGTH = 70;

function clean(value) {
  if (typeof value !== 'string') {
    return '';
  }

  // Collapse whitespace: a book title from the API can carry a newline, and a
  // newline in a <title> renders as a literal gap in the tab.
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Truncate on a word boundary where there is one nearby.
 *
 * Cutting mid-word reads as a rendering fault rather than as an abbreviation.
 * The ellipsis is the single character, not three dots, so it counts as one
 * towards the limit.
 */
function truncate(value, limit) {
  if (value.length <= limit) {
    return value;
  }

  const hard = value.slice(0, limit - 1);
  const lastSpace = hard.lastIndexOf(' ');

  // Only prefer the word boundary if it is not so far back that it eats most
  // of the string.
  const cut = lastSpace > limit * 0.6 ? hard.slice(0, lastSpace) : hard;

  return `${cut.trimEnd()}…`;
}

/**
 * A page title.
 *
 * `pageTitle(null)` and `pageTitle('')` give the default, so a page that has
 * not decided yet — a book still loading — is titled the site rather than
 * "— BookShelf".
 *
 * The page's own name comes first because a tab is narrow and the shop name
 * is the half every tab shares. "The Quiet Ones — Boo…" tells the reader
 * which tab is which; "BookShelf — The Q…" does not.
 */
export function pageTitle(name) {
  const cleaned = clean(name);

  if (cleaned === '') {
    return DEFAULT_TITLE;
  }

  if (cleaned === SITE_NAME) {
    return DEFAULT_TITLE;
  }

  const suffix = ` — ${SITE_NAME}`;

  /*
   * Idempotent: a name that already carries the suffix is returned as it is
   * rather than given a second one.
   *
   * This is not hypothetical. `bookTitle` composes with `pageTitle`, and the
   * first version of it returned a finished title — which the hook then put
   * through here again, producing
   * "The Quiet Ones by M. Arora — BookShelf — BookShelf". The composition is
   * fixed at its source below; this makes the same mistake impossible for the
   * next caller, and it is what `does not append the suffix twice` asserts.
   */
  if (cleaned.endsWith(suffix)) {
    return cleaned;
  }

  return `${truncate(cleaned, MAX_TITLE_LENGTH - suffix.length)}${suffix}`;
}

/**
 * The page *name* for a book — "The Quiet Ones by M. Arora".
 *
 * Deliberately not a finished title: it composes with `pageTitle`, which is
 * what appends the shop name, and which the hook calls on whatever it is
 * given. Returning a finished title here produced
 * "The Quiet Ones by M. Arora — BookShelf — BookShelf".
 *
 * Takes the whole record rather than the title alone so the author can be
 * included when there is room and dropped when there is not — two books with
 * similar titles are told apart by their author far more often than by any
 * other field.
 */
export function bookTitle(book) {
  const title = clean(book?.title);

  if (title === '') {
    return 'Book';
  }

  const author = clean(book?.author);

  if (author === '') {
    return title;
  }

  const withAuthor = `${title} by ${author}`;
  const budget = MAX_TITLE_LENGTH - ` — ${SITE_NAME}`.length;

  // Drop the author rather than truncate into the middle of their name.
  return withAuthor.length <= budget ? withAuthor : title;
}

/** Cap on a meta description. Search engines cut around 160 characters. */
export const MAX_DESCRIPTION_LENGTH = 160;

/** The site-wide description, for a route that has nothing better to say. */
export const DEFAULT_DESCRIPTION =
  'Browse and buy books from the BookShelf catalogue — fiction, mystery, ' +
  'sci-fi, poetry and more, with a wishlist and a fast checkout.';

/** A meta description, cleaned and capped. */
export function pageDescription(text) {
  const cleaned = clean(text);

  if (cleaned === '') {
    return DEFAULT_DESCRIPTION;
  }

  return truncate(cleaned, MAX_DESCRIPTION_LENGTH);
}

/** The description for a book page, built from what the record actually has. */
export function bookDescription(book) {
  const title = clean(book?.title);

  if (title === '') {
    return DEFAULT_DESCRIPTION;
  }

  const author = clean(book?.author);
  const genre = clean(book?.genre);

  const opening = author ? `${title} by ${author}` : title;
  const middle = genre ? ` A ${genre} title` : ' A title';

  return pageDescription(
    `${opening}. ${middle.trim()} from the BookShelf catalogue. ` +
      'Read the details, add it to your wishlist, or buy it now.'
  );
}

export default {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  pageTitle,
  bookTitle,
  pageDescription,
  bookDescription,
};
