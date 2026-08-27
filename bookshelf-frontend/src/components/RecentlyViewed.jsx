import { useEffect, useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import BookCard from './BookCard.jsx';
import { useRecentlyViewedBooks } from '../hooks/useRecentlyViewedBooks.js';
import { recordBookView } from '../utils/recentlyViewed.js';
import './RecentlyViewed.css';

/**
 * A strip of books the reader has looked at recently.
 *
 * Two things were wrong with this component originally (#318).
 *
 * The list it reads was never written. `grep -rn recentlyViewed src` found a
 * single `getItem` and no `setItem` anywhere in the application, so `stored`
 * was always null, the effect returned early, and the component rendered
 * null on every page for its entire existence.
 *
 * It was also mounted in App.jsx — the layout shell — with no
 * `currentBookId`. So it was declared on the login form, the checkout page
 * and the 404 page, none of which are places you browse books; and on
 * /book/:id the book being read would have appeared in its own "recently
 * viewed" strip, which is exactly what the `currentBookId` prop was written
 * to prevent and never received.
 *
 * Rather than move the mount into each page, the component gates itself: one
 * mount point in the shell, an explicit allow-list of routes, and the current
 * book id derived from the path.
 *
 * The third thing, fixed here (#336): the ids were resolved against
 * `src/data/books.js`, the deprecated local snapshot of the catalogue. That
 * meant stale prices next to fresh ones on the same page, a missing
 * `inventory` field reading as "in stock", and a book added to the backend
 * silently dropped from a history the reader had just made. It reads the API
 * now, through the same hook the wishlist uses.
 *
 * Props:
 *   currentBookId  optional override; normally derived from the route
 *   title          optional heading override
 */

/**
 * Where a browsing history belongs: the catalogue, and a book page.
 *
 * Anywhere else it is either noise (a legal page) or an active distraction
 * (a checkout, where the job is to finish paying).
 */
export const VISIBLE_ROUTES = ['/', '/book/:id'];

/** The book page pattern, which also supplies the id to record and exclude. */
const BOOK_ROUTE = '/book/:id';

export default function RecentlyViewed({
  currentBookId: currentBookIdProp,
  title = 'Recently Viewed',
}) {
  const location = useLocation();

  const bookRouteMatch = useMemo(
    () => matchPath(BOOK_ROUTE, location.pathname),
    [location.pathname]
  );

  const currentBookId = currentBookIdProp ?? bookRouteMatch?.params?.id;

  const isVisibleRoute = useMemo(
    () => VISIBLE_ROUTES.some((pattern) => matchPath(pattern, location.pathname)),
    [location.pathname]
  );

  /*
   * The write half of the feature. Recording here rather than in BookDetail
   * keeps the read and the write in one place — and the component is mounted
   * on every route, so it always observes the navigation.
   *
   * recordBookView is total: an id that is not in the catalogue is stored and
   * then dropped when the list is resolved for display, rather than rejected
   * here on a guess about what a valid id looks like.
   */
  useEffect(() => {
    if (currentBookId) {
      recordBookView(currentBookId);
    }
  }, [currentBookId]);

  /*
   * `location.key` changes on every navigation, which is what re-reads the
   * stored ids: `recordBookView` above writes to localStorage from a sibling
   * effect, so a list read once at mount would be one navigation behind.
   *
   * The hook is called unconditionally, because hooks cannot be called
   * conditionally — `enabled` is how the visibility rule reaches it. Without
   * that the checkout page would fetch a strip it never renders, once per
   * navigation.
   */
  const { books, loading, error } = useRecentlyViewedBooks({
    excludeId: currentBookId,
    locationKey: location.key,
    enabled: isVisibleRoute,
  });

  if (!isVisibleRoute) {
    return null;
  }

  /*
   * Nothing to show — render nothing rather than a heading over an empty row.
   *
   * Three cases collapse to the same answer here, and they collapse
   * deliberately:
   *
   *   - Nothing viewed yet. Always was this.
   *   - Still loading. The strip used to appear fully formed because the
   *     lookup was synchronous; it is a request now, and a heading over a
   *     row that is about to have an unknown number of cards in it would
   *     push the footer around as the response lands. It appears when it is
   *     ready.
   *   - The request failed. This is a nicety at the bottom of a page the
   *     reader came for something else — an error panel under "Recently
   *     Viewed" would be louder than the feature is worth. The wishlist page,
   *     where the list *is* the page, reports its failures; this does not.
   */
  if (loading || error || books.length === 0) {
    return null;
  }

  return (
    <section className="recently-viewed" aria-labelledby="recently-viewed-title">
      <div className="recently-viewed__inner">
        <h2 className="recently-viewed__title" id="recently-viewed-title">
          {title}
        </h2>
        <div className="recently-viewed__scroll">
          {books.map((book) => (
            <div key={book.id} className="recently-viewed__item">
              <BookCard book={book} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
