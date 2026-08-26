import './SkipLink.css';

/**
 * "Skip to content", the first tab stop on every page.
 *
 * There was none — `grep -rn "skip-link\|Skip to" src` returned nothing. A
 * keyboard user arriving at any page had to tab through the entire navbar
 * before reaching anything they came for: the brand, two section links, three
 * public links, up to two account links, login or logout, the search input,
 * the theme toggle, the cart button and the hamburger. Twelve to fourteen
 * stops, on every page, every time. See #339.
 *
 * An `<a href="#…">` rather than a button, because it has to work as a link:
 * it is announced as one, and activating it moves the browser's own sequential
 * focus point, which a `focus()` call alone does not.
 *
 * The click handler is what makes it work in a single-page app anyway. A bare
 * hash link would put `#main-content` in the URL, which React Router treats as
 * a navigation — and the app's own hash-scroll effect would then try to
 * interpret it. Focusing the target directly and preventing the default does
 * the useful half without touching the address bar.
 *
 * It is visually hidden until focused. Hidden with a clip rectangle rather
 * than `display: none` or `visibility: hidden`, because both of those remove
 * an element from the tab order entirely — which would make a skip link that
 * cannot be reached by the only people who need it.
 */
export default function SkipLink({ targetId = 'main-content', children = 'Skip to content' }) {
  const handleClick = (event) => {
    const target = document.getElementById(targetId);

    if (!target) {
      // Let the browser try the hash. Better than swallowing the click.
      return;
    }

    event.preventDefault();

    try {
      target.focus();
    } catch {
      return;
    }

    // Focusing scrolls the target into view in most browsers, but not all,
    // and not when it is already partly visible under a fixed header.
    try {
      target.scrollIntoView?.({ block: 'start' });
    } catch {
      // A nicety on top of a nicety.
    }
  };

  return (
    <a className="skip-link" href={`#${targetId}`} onClick={handleClick}>
      {children}
    </a>
  );
}
