import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  pageTitle,
  bookTitle,
  pageDescription,
  bookDescription,
} from './pageTitle.js';

/**
 * What goes in the browser tab.
 *
 * The regression (#337): nothing set it. `index.html` declared one title and
 * no route ever changed it, so a screen reader announced the same page name
 * on every navigation, browser history was N identical entries, and
 * `ShareButton` — which reads `document.title` — would attach the site
 * tagline to a specific book's URL.
 *
 * These are the rules about what a title *looks* like, kept apart from the
 * hook that writes it so they can be asserted without rendering anything.
 */

describe('pageTitle', () => {
  it('puts the page first and the shop last', () => {
    // A tab is narrow and the shop name is the half every tab shares.
    // "The Quiet Ones — Boo…" tells the reader which tab is which;
    // "BookShelf — The Q…" does not.
    expect(pageTitle('Your wishlist')).toBe('Your wishlist — BookShelf');
    expect(pageTitle('Checkout')).toBe('Checkout — BookShelf');
  });

  it('falls back to the default rather than rendering "— BookShelf"', () => {
    // A page that has not decided yet — a book still loading — must not put a
    // dangling separator in the tab.
    expect(pageTitle(null)).toBe(DEFAULT_TITLE);
    expect(pageTitle(undefined)).toBe(DEFAULT_TITLE);
    expect(pageTitle('')).toBe(DEFAULT_TITLE);
    expect(pageTitle('   ')).toBe(DEFAULT_TITLE);
    expect(pageTitle(42)).toBe(DEFAULT_TITLE);
    expect(pageTitle({})).toBe(DEFAULT_TITLE);
  });

  it('does not render the shop name twice', () => {
    expect(pageTitle(SITE_NAME)).toBe(DEFAULT_TITLE);
  });

  it('collapses whitespace, because a title from the API can carry a newline', () => {
    // A newline in a <title> renders as a literal gap in the tab.
    expect(pageTitle('Half\n  Moon   Bay')).toBe('Half Moon Bay — BookShelf');
    expect(pageTitle('  Static  ')).toBe('Static — BookShelf');
  });

  it('stays within the length a tab can show', () => {
    const long = 'A Very Long Book Title That Simply Refuses To Stop Going On And On And On';

    expect(pageTitle(long).length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(pageTitle(long)).toMatch(/…\s—\sBookShelf$/);
  });

  it('truncates on a word boundary rather than mid-word', () => {
    // A cut mid-word reads as a rendering fault, not as an abbreviation. The
    // check is that what survives is a *whole-word* prefix of the original —
    // the last visible character is still a letter either way, so asserting
    // on the character before the ellipsis proves nothing.
    const original =
      'Chapters Concerning Certain Considerably Complicated Circumstances Indeed';
    const kept = pageTitle(original).replace(' — BookShelf', '').replace('…', '');

    expect(original.startsWith(kept)).toBe(true);
    expect(original[kept.length]).toBe(' ');
  });

  it('does not eat most of the string chasing a word boundary', () => {
    // One very long word with a space near the start: the boundary is too far
    // back to be worth preferring.
    const title = pageTitle(`A ${'x'.repeat(80)}`);

    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(title.length).toBeGreaterThan(20);
  });

  it('does not append the suffix twice', () => {
    // The guard for the mistake bookTitle actually made: a name that already
    // carries the suffix is returned as it is.
    expect(pageTitle('Checkout — BookShelf')).toBe('Checkout — BookShelf');
    expect(pageTitle(pageTitle('Checkout'))).toBe('Checkout — BookShelf');
    expect(pageTitle('Checkout').match(/BookShelf/g)).toHaveLength(1);
  });

  it('always ends with the shop name', () => {
    for (const name of ['Checkout', 'x'.repeat(200), 'Log in', 'Order #ABC123']) {
      expect(pageTitle(name).endsWith(SITE_NAME)).toBe(true);
    }
  });
});

describe('bookTitle', () => {
  /**
   * It returns the page *name*, not a finished title — `pageTitle` is what
   * appends the shop name, and the hook calls it on whatever it is given.
   * The first version of this returned a finished title and the result was
   * "The Quiet Ones by M. Arora — BookShelf — BookShelf".
   */
  it('names the book and its author', () => {
    expect(bookTitle({ title: 'The Quiet Ones', author: 'M. Arora' })).toBe(
      'The Quiet Ones by M. Arora'
    );
  });

  it('does not append the suffix itself', () => {
    expect(bookTitle({ title: 'Static', author: 'A. Voss' })).not.toContain(SITE_NAME);
  });

  it('composes with pageTitle to exactly one suffix', () => {
    const title = pageTitle(bookTitle({ title: 'The Quiet Ones', author: 'M. Arora' }));

    expect(title).toBe('The Quiet Ones by M. Arora — BookShelf');
    expect(title.match(/BookShelf/g)).toHaveLength(1);
  });

  it('drops the author rather than truncating into their name', () => {
    const title = bookTitle({
      title: 'An Extremely Long Book Title That Uses Most Of The Budget',
      author: 'Someone With A Long Name',
    });

    expect(title).not.toContain('Someone With A Lo');
    expect(pageTitle(title).length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
  });

  it('manages with a title alone', () => {
    expect(bookTitle({ title: 'Static' })).toBe('Static');
    expect(bookTitle({ title: 'Static', author: '  ' })).toBe('Static');
  });

  it('does not throw on a record that is missing everything', () => {
    // Nothing requires a book to carry any particular field — #317 is the
    // whole lesson. A title is not worth a blank page.
    expect(bookTitle(null)).toBe('Book');
    expect(bookTitle(undefined)).toBe('Book');
    expect(bookTitle({})).toBe('Book');
    expect(bookTitle({ author: 'M. Arora' })).toBe('Book');
  });
});

describe('pageDescription', () => {
  it('falls back to the site description', () => {
    expect(pageDescription(null)).toBe(DEFAULT_DESCRIPTION);
    expect(pageDescription('')).toBe(DEFAULT_DESCRIPTION);
    expect(pageDescription('   ')).toBe(DEFAULT_DESCRIPTION);
  });

  it('caps at the length a search result shows', () => {
    const long = 'word '.repeat(100);

    expect(pageDescription(long).length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
  });

  it('collapses whitespace', () => {
    expect(pageDescription('one\n\ntwo   three')).toBe('one two three');
  });

  it('keeps the site description within its own cap', () => {
    expect(DEFAULT_DESCRIPTION.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
  });
});

describe('bookDescription', () => {
  it('describes the book from what the record actually has', () => {
    const description = bookDescription({
      title: 'The Quiet Ones',
      author: 'M. Arora',
      genre: 'Fiction',
    });

    expect(description).toContain('The Quiet Ones');
    expect(description).toContain('M. Arora');
    expect(description).toContain('Fiction');
    expect(description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
  });

  it('omits what the record does not have rather than writing "undefined"', () => {
    const description = bookDescription({ title: 'Static' });

    expect(description).toContain('Static');
    expect(description).not.toContain('undefined');
    expect(description).not.toContain(' by .');
  });

  it('falls back for a record with no title', () => {
    expect(bookDescription(null)).toBe(DEFAULT_DESCRIPTION);
    expect(bookDescription({})).toBe(DEFAULT_DESCRIPTION);
  });
});

describe('the document defaults in index.html', () => {
  /**
   * The defaults live in two places: this module, and the static HTML that is
   * served before React mounts. Two defaults that must agree and are never
   * compared are two defaults that will diverge.
   */
  // Resolved from the package root: under jsdom `import.meta.url` is an http
  // URL, which readFileSync cannot take.
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

  it('declares the same title', () => {
    const match = html.match(/<title>([^<]*)<\/title>/);

    expect(match).toBeTruthy();
    expect(match[1]).toBe(DEFAULT_TITLE);
  });

  it('declares a meta description, and the same one', () => {
    const match = html.match(
      /<meta\s+name="description"\s+content="([^"]*)"/s
    );

    expect(match).toBeTruthy();
    expect(match[1].replace(/\s+/g, ' ').trim()).toBe(DEFAULT_DESCRIPTION);
  });
});
