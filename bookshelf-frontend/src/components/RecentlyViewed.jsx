import { useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import BookCard from './BookCard.jsx';
import { books } from '../data/books.js';
import {
  readRecentlyViewedExcept,
  recordBookView,
} from '../utils/recentlyViewed.js';
import './RecentlyViewed.css';

/**
 * A strip of books the reader has looked at recently.
 *
 * Two things were wrong with this component (#318).
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
 * book id derived from the path. That keeps the whole feature — the read, the
 * write and the visibility rule — in one file that can be tested on its own,
 * and it leaves BookDetail and Home untouched, which matters while #317 and
 * #319 are open against both of them.
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
  const [recentBooks, setRecentBooks] = useState([]);

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

  useEffect(() => {
    if (!isVisibleRoute) {
      setRecentBooks([]);
      return;
    }

    const ids = readRecentlyViewedExcept(currentBookId);

    // Ids are resolved against the local catalogue copy. Unknown ids are
    // dropped rather than rendered as gaps — see #317 for why that copy still
    // exists and what should replace it.
    setRecentBooks(
      ids
        .map((id) => books.find((book) => String(book.id) === id))
        .filter(Boolean)
    );
  }, [isVisibleRoute, currentBookId, location.key]);

  // Nothing to show — render nothing rather than a heading over an empty row.
  if (!isVisibleRoute || recentBooks.length === 0) {
    return null;
  }

  return (
    <section className="recently-viewed" aria-labelledby="recently-viewed-title">
      <div className="recently-viewed__inner">
        <h2 className="recently-viewed__title" id="recently-viewed-title">
          {title}
        </h2>
        <div className="recently-viewed__scroll">
          {recentBooks.map((book) => (
            <div key={book.id} className="recently-viewed__item">
              <BookCard book={book} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
