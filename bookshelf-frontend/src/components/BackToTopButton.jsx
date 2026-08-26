import { useEffect, useState } from 'react';
import './BackToTopButton.css';

/**
 * The floating "back to top" button.
 *
 * Renamed from `ScrollToTop`. That name said this component reset the scroll
 * position on navigation, and App.jsx rendered it at the top of the layout
 * exactly as though it did — but it never read the location and had no
 * route-change effect at all. Nothing in the app reset scroll, so opening a
 * book from the bottom of the catalogue landed on the book page already
 * scrolled past its own title. See #339, where `RouteChangeHandler` now does
 * the thing this was named after.
 */
const SCROLL_THRESHOLD = 400;

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    }

    // Check the initial scroll position (e.g. on page refresh mid-scroll).
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleClick() {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  return (
    <button
      type="button"
      className={`back-to-top ${visible ? 'back-to-top--visible' : ''}`}
      onClick={handleClick}
      aria-label="Scroll back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    ></button>
  );
}
