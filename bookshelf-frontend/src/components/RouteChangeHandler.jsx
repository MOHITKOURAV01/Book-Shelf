import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset the scroll position and move focus when the route changes.
 *
 * Neither happened. `App.jsx` rendered a component called `ScrollToTop` at
 * the top of the layout, which reads as though this were handled — but that
 * component is a floating "back to top" button. It subscribes to the `scroll`
 * event, shows itself past 400px and scrolls up when clicked; it never reads
 * the location and has no route-change effect at all. `AppRoutes.jsx` does
 * not use React Router's `<ScrollRestoration>` either, and the only
 * `window.scrollTo` in the app is in Home's pagination handler.
 *
 * A pushState navigation does not reset the scroll offset on its own, so
 * every page inherited the last one's. Open a book from the bottom of the
 * catalogue and the book page arrives already scrolled past its own title,
 * cover and price. See #339.
 *
 * Focus was left behind the same way. It stays on whatever was clicked, or
 * falls back to `<body>` when that element unmounts — so the next Tab starts
 * from the very top of the document, walking the whole navbar again. Moving
 * it to the new page's content is what lets a keyboard or screen reader user
 * continue from where the content starts.
 *
 * @param {{ contentRef: React.RefObject<HTMLElement> }} props
 *   The element to focus. The layout owns it, because pages do not: `Home`,
 *   `BookDetail`, `Checkout`, `OrderConfirmation`, `WishlistPage` and
 *   `NotFound` each render their own `<main>`, while `OrderHistory`,
 *   `Profile`, `OrderDetailsPage`, `Login` and `Register` render none. There
 *   was no single element to send focus or a skip link to.
 */
export default function RouteChangeHandler({ contentRef }) {
  const location = useLocation();

  /*
   * The first render is a page load, not a navigation.
   *
   * The browser is already at the top, and it may deliberately not be — a
   * reload mid-page restores the offset, and a deep link with a hash is
   * scrolled by the navbar's own effect. Stealing focus on arrival would also
   * be wrong: nobody navigated, so nothing needs announcing.
   */
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    /*
     * A hash is a destination. `/#catalog` from a book page means "go home
     * and scroll to the catalogue", and Navbar's effect does exactly that —
     * scrolling to the top here would fight it, and whichever ran last would
     * win, which is not a behaviour anyone can rely on.
     */
    if (location.hash) {
      return;
    }

    scrollToTop();
    focusContent(contentRef.current);
  }, [location.pathname, location.search, location.hash, contentRef]);

  return null;
}

/**
 * Instantly, or smoothly, depending on what the reader has asked for.
 *
 * `behavior: 'smooth'` on a route change is an animation nobody requested and
 * it is exactly what `prefers-reduced-motion` is for. The same check is made
 * in Navbar's hash-scroll effect and in the back-to-top button.
 */
function scrollToTop() {
  if (typeof window === 'undefined') {
    return;
  }

  const prefersReducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  )?.matches;

  try {
    window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  } catch {
    /*
     * `scrollTo` with an options object is not universally implemented, and
     * jsdom does not implement scrolling at all. Falling back rather than
     * throwing matters because this runs from an effect, where an exception
     * takes the tree down — the lesson of the unguarded `scrollIntoView` in
     * Navbar, which was failing half the test runs on main.
     */
    try {
      window.scrollTo(0, 0);
    } catch {
      // Nothing to scroll. Not a reason to break the navigation.
    }
  }
}

/**
 * Move focus to the new page's content.
 *
 * The element carries `tabIndex={-1}` so it can be focused programmatically
 * without becoming a tab stop of its own.
 *
 * `preventScroll` because the scroll reset above has already put the page
 * where it belongs, and focusing an element scrolls it into view by default —
 * which, for a container that starts below a fixed navbar, would undo the
 * reset by a hundred pixels.
 */
function focusContent(element) {
  if (!element || typeof element.focus !== 'function') {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch {
    // Older browsers ignore the options object and throw on nothing; the
    // focus is a nicety, the navigation is not.
  }
}
