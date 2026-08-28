import './Pagination.css';

import { ELLIPSIS, clampPage, pageWindow } from '../utils/pagination.js';

/**
 * The catalogue pager.
 *
 * Two problems it had, and both of them get worse as the catalogue grows —
 * which, since the admin CRUD endpoints landed in #364, it can:
 *
 * **It rendered one button per page.** A `for` loop from 1 to `totalPages`.
 * Fine at four pages; at fifty it is a wrapped block of numbers taller than
 * the grid it belongs to, and every one of them re-renders on every change.
 * The list is windowed now — `pageWindow()` in utils/pagination.js decides
 * what to show, so the arithmetic is testable without a DOM.
 *
 * **It told a screen reader almost nothing.** The current page was marked
 * only by a background colour, the buttons were named by a bare digit, the
 * arrows were read out as words, and swapping the grid announced nothing at
 * all. See #369.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
  siblings,
  label = 'Pagination',
}) {
  if (totalPages <= 1) return null;

  /*
   * Clamp before anything reads it.
   *
   * `?page=7` on a three-page result set is a URL a reader can type, and the
   * API answers a page past the end with an empty slice rather than an error.
   * Without this, the pager renders with nothing marked current and Next
   * still enabled above an empty grid.
   */
  const page = clampPage(currentPage, totalPages);
  const pages = pageWindow({ currentPage: page, totalPages, siblings });

  /*
   * One place that decides whether a click does anything.
   *
   * `disabled` on the arrows is not enough on its own: the current page's own
   * button used to fire `onPageChange` with the page already showing, and in
   * `Home` that also runs `window.scrollTo`, so the page jumped for nothing.
   */
  const goTo = (next) => {
    const target = clampPage(next, totalPages);

    if (target === page) return;

    onPageChange(target);
  };

  return (
    <nav className="pagination" aria-label={label}>
      <button
        type="button"
        className="pagination__button"
        onClick={() => goTo(page - 1)}
        disabled={page === 1}
      >
        {/* Decoration. Without aria-hidden this is announced as "left arrow". */}
        <span aria-hidden="true">←</span> Prev
      </button>

      <div className="pagination__pages">
        {pages.map((entry, index) =>
          entry === ELLIPSIS ? (
            /*
             * Not a button and not focusable: there is nothing here to
             * activate. `aria-hidden` keeps "horizontal ellipsis" out of the
             * announcement — the gap is already implied by the numbers
             * either side of it.
             */
            <span
              // Two ellipses can appear at once, and neither has a page
              // number to key on, so the position is the only stable key.
              key={`gap-${index}`}
              className="pagination__ellipsis"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={entry}
              className={`pagination__page ${
                page === entry ? 'pagination__page--active' : ''
              }`}
              onClick={() => goTo(entry)}
              /*
               * The one attribute that says which page is showing. The active
               * class is a colour change, which is nothing to a screen reader
               * and not much to a reader who cannot tell the two shades
               * apart.
               */
              aria-current={page === entry ? 'page' : undefined}
              // "3, button" out of context does not say what it does.
              aria-label={`Go to page ${entry}`}
            >
              {entry}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className="pagination__button"
        onClick={() => goTo(page + 1)}
        disabled={page === totalPages}
      >
        Next <span aria-hidden="true">→</span>
      </button>

      {/*
        The grid swaps its contents with no other signal that anything
        happened. This is the confirmation — polite, so it waits for a gap
        rather than interrupting, and visually hidden because the numbers
        above already say it on screen.
      */}
      <p className="pagination__status" role="status" aria-live="polite">
        Page {page} of {totalPages}
      </p>
    </nav>
  );
}
