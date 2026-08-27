import { useEffect } from 'react';

import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  pageDescription,
  pageTitle,
} from '../utils/pageTitle.js';

/**
 * Set the document title and meta description for the page that mounts this.
 *
 * Nothing in the app did this. Every route rendered
 * "BookShelf — Find your next read", which meant a screen reader announced
 * the same page name on every navigation, browser history was eight identical
 * entries, and `ShareButton` — which defaults its share title to
 * `document.title` — shared the site tagline attached to a specific book's
 * URL. See #337.
 *
 * Two decisions worth stating.
 *
 * **It restores on unmount.** Not to the site default, but to whatever it
 * found. React unmounts the outgoing route before mounting the incoming one
 * for a sibling route change, so restoring is what stops a book's name
 * lingering over the next page in the window between the two. A route with no
 * title of its own gets the default because the layout sets it, not because
 * this hook cleared it.
 *
 * **It is reactive, not once-on-mount.** The book page's title depends on a
 * fetch. Passing `null` while it loads leaves the default in place, and the
 * real title lands when the record does — which is also the moment the
 * `<h1>` appears, so the tab and the page agree.
 *
 * There is no react-helmet here on purpose. It is a dependency, an extra
 * provider in main.jsx and a second rendering pass, and it exists to solve
 * server-side rendering and tag deduplication — neither of which this app has
 * or needs. Two `document` writes in an effect is the whole feature.
 */
export function usePageMetadata({ title, description } = {}) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const previousTitle = document.title;
    document.title = pageTitle(title);

    const meta = ensureDescriptionTag();
    const previousDescription = meta?.getAttribute('content') ?? null;

    if (meta) {
      meta.setAttribute('content', pageDescription(description));
    }

    return () => {
      document.title = previousTitle;

      if (!meta) {
        return;
      }

      if (previousDescription === null) {
        meta.setAttribute('content', DEFAULT_DESCRIPTION);
      } else {
        meta.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}

/**
 * The `<meta name="description">` tag, created if the document has none.
 *
 * It is declared in index.html, so in the real app this always finds it. It
 * is created here for the case index.html is not the document — a test that
 * renders a component directly, which is most of them.
 */
function ensureDescriptionTag() {
  if (typeof document === 'undefined') {
    return null;
  }

  const existing = document.querySelector('meta[name="description"]');

  if (existing) {
    return existing;
  }

  const created = document.createElement('meta');
  created.setAttribute('name', 'description');
  created.setAttribute('content', DEFAULT_DESCRIPTION);
  document.head.appendChild(created);

  return created;
}

/** The title alone, for a page with nothing particular to describe. */
export function useDocumentTitle(title) {
  usePageMetadata({ title });
}

export { DEFAULT_TITLE };

export default usePageMetadata;
