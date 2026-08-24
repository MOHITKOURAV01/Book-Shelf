import { useEffect, useRef } from 'react';

/**
 * Selector for things that can take focus.
 *
 * `[tabindex]:not([tabindex="-1"])` deliberately excludes programmatic focus
 * targets — an element with tabindex="-1" is focusable by script but is not
 * in the tab order, so a trap must not treat it as a boundary.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Is this element actually reachable?
 *
 * `querySelectorAll` will happily return a button inside a section that has
 * since been collapsed, or one that has been hidden since the list was built.
 *
 * The check deliberately avoids `offsetParent` and `getClientRects()`, which
 * are the usual way to ask this in a browser: jsdom does no layout, so both
 * report "invisible" for *every* element and the trap would find nothing to
 * hold. `getComputedStyle` is implemented in both, and `inert` and `disabled`
 * are attribute checks that need no layout at all.
 */
function isReachable(element) {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if (element.hidden || element.closest('[inert]')) {
    return false;
  }

  const style = element.ownerDocument?.defaultView?.getComputedStyle?.(element);

  if (style && (style.display === 'none' || style.visibility === 'hidden')) {
    return false;
  }

  return true;
}

/**
 * Keep Tab inside a container while it is open.
 *
 * The important difference from the implementation this replaces: the
 * focusable elements are queried **at Tab time**, not cached when the trap is
 * set up.
 *
 * `querySelectorAll` returns a static NodeList. The cart drawer captured one
 * on open and never refreshed it, so removing the last item left `lastElement`
 * pointing at a **detached node** — `.focus()` on it silently does nothing,
 * and Shift+Tab from the first element went nowhere. The trap broke in the
 * exact direction it exists to hold, and only for a cart the customer had
 * just edited. See #327.
 *
 * @param {object}   options
 * @param {boolean}  options.active     Whether the trap is engaged.
 * @param {Function} [options.onEscape] Called when Escape is pressed.
 * @returns {import('react').RefObject} Ref to put on the container.
 */
export function useFocusTrap({ active, onEscape } = {}) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Held in a ref so a caller passing an inline arrow does not tear the
  // listener down and rebuild it on every render.
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    // Where focus was before the dialog opened, so it can go back there.
    // Restoring to <body> is what happens otherwise, which drops a keyboard
    // user at the top of the document.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousFocusRef.current = previouslyFocused;

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isReachable);

    const initial = getFocusable();

    if (initial.length > 0) {
      initial[0].focus();
    } else {
      /*
       * A dialog with nothing focusable in it still has to receive focus, or
       * the user is left standing outside a modal they cannot enter. The
       * container is given tabindex="-1" by the caller for exactly this.
       */
      container.focus?.();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      // Queried now, not when the trap was set up. This is the fix.
      const focusable = getFocusable();

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      /*
       * Focus can be outside the container even while the trap is engaged —
       * the element that had it was just removed, or something outside called
       * focus(). Pull it back rather than letting Tab walk off into the page
       * behind the dialog.
       */
      if (!container.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      /*
       * Only restore focus if it is still inside the container. If something
       * else has taken it in the meantime — the user clicked a link on the
       * page as the drawer closed — yanking it back is worse than leaving it.
       */
      const target = previousFocusRef.current;
      previousFocusRef.current = null;

      if (target && document.contains(target)) {
        target.focus();
      }
    };
  }, [active]);

  return containerRef;
}

/**
 * Prevent the page behind a modal from scrolling, and put back whatever was
 * there before.
 *
 * The drawer used to set `document.body.style.overflow = 'unset'` on cleanup,
 * which is not "restore" — it is "clobber". Any other scroll lock held at the
 * same time was silently released.
 */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

export default useFocusTrap;
