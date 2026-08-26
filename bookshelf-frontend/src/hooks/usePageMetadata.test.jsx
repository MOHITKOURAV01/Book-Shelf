import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

import { usePageMetadata, useDocumentTitle } from './usePageMetadata.js';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '../utils/pageTitle.js';

/**
 * Writing the title and description to the document.
 *
 * The regression (#337): nothing ever did. Every route rendered the same
 * title, so a screen reader announced the same page name on every navigation
 * (WCAG 2.4.2), browser history was N identical entries, and ShareButton —
 * which defaults its share title to `document.title` — had nothing better to
 * offer than the site tagline.
 *
 * The two properties that matter here are that it *restores* on unmount, so a
 * book's name does not linger over the next route, and that it is *reactive*,
 * so a title that depends on a fetch lands when the fetch does.
 */

function Page({ title, description }) {
  usePageMetadata({ title, description });
  return <span>page</span>;
}

const description = () =>
  document.querySelector('meta[name="description"]')?.getAttribute('content');

describe('usePageMetadata', () => {
  beforeEach(() => {
    document.title = DEFAULT_TITLE;
    document.querySelector('meta[name="description"]')?.remove();
  });

  afterEach(() => {
    document.querySelector('meta[name="description"]')?.remove();
  });

  it('sets the title of the page that mounts it', () => {
    render(<Page title="Your wishlist" />);

    expect(document.title).toBe('Your wishlist — BookShelf');
  });

  it('sets a meta description, creating the tag if the document has none', () => {
    render(<Page title="Checkout" description="Pay for your books." />);

    expect(description()).toBe('Pay for your books.');
  });

  it('uses the site description when the page gives none', () => {
    render(<Page title="Checkout" />);

    expect(description()).toBe(DEFAULT_DESCRIPTION);
  });

  it('restores what it found when the page unmounts', () => {
    // React unmounts the outgoing route before mounting the incoming one, so
    // this is what stops a book's name lingering over the next page.
    document.title = 'Something Else';

    const { unmount } = render(<Page title="Your wishlist" />);
    expect(document.title).toBe('Your wishlist — BookShelf');

    unmount();
    expect(document.title).toBe('Something Else');
  });

  it('restores the description too', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'The previous one.');
    document.head.appendChild(meta);

    const { unmount } = render(<Page title="Checkout" description="A new one." />);
    expect(description()).toBe('A new one.');

    unmount();
    expect(description()).toBe('The previous one.');
  });

  it('follows a title that changes, rather than setting it once on mount', () => {
    // The book page's title depends on a fetch: null while loading, the real
    // thing when the record arrives.
    const { rerender } = render(<Page title={null} />);
    expect(document.title).toBe(DEFAULT_TITLE);

    rerender(<Page title="The Quiet Ones by M. Arora" />);
    expect(document.title).toBe('The Quiet Ones by M. Arora — BookShelf');

    rerender(<Page title="Book not found" />);
    expect(document.title).toBe('Book not found — BookShelf');
  });

  it('leaves the default in place for a page that has not decided yet', () => {
    render(<Page title={null} />);

    expect(document.title).toBe(DEFAULT_TITLE);
    expect(document.title).not.toContain('— BookShelf —');
  });

  it('does not leak between two pages mounted in sequence', () => {
    const first = render(<Page title="Your wishlist" />);
    first.unmount();

    render(<Page title="Checkout" />);
    expect(document.title).toBe('Checkout — BookShelf');
  });

  it('takes no arguments at all without throwing', () => {
    function Bare() {
      usePageMetadata();
      return null;
    }

    expect(() => render(<Bare />)).not.toThrow();
    expect(document.title).toBe(DEFAULT_TITLE);
  });
});

describe('useDocumentTitle', () => {
  beforeEach(() => {
    document.title = DEFAULT_TITLE;
  });

  it('is the title-only shorthand', () => {
    function Page2() {
      useDocumentTitle('Your orders');
      return null;
    }

    render(<Page2 />);
    expect(document.title).toBe('Your orders — BookShelf');
  });
});
