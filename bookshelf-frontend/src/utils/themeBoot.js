/**
 * The theme decision, in one place.
 *
 * The `<script>` in index.html has to make this decision before the browser
 * paints anything, which means it has to run before the bundle exists — so it
 * cannot import this module. What it can do is implement the same three lines,
 * and be tested against this one. `themeBoot.test.js` reads the inline script
 * out of index.html, executes it, and asserts it agrees with `resolveTheme`
 * for every input.
 *
 * That test exists because of what happened to the original: two attempts at
 * this logic got stacked on top of each other in a merge, leaving an `else {`
 * that was never closed. The whole block was a SyntaxError, so the browser
 * discarded it and `data-theme` was simply absent until React mounted. The
 * `try { } catch (e) {}` around it looked like the errors were handled — but a
 * syntax error happens at compile time, before the `try` exists, so it never
 * entered the block.
 *
 * An inline script in index.html is invisible to ESLint, is not part of the
 * bundle, and had no test touching it. That is how it reached main.
 */

export const THEME_STORAGE_KEY = 'theme';

export const THEMES = Object.freeze({ LIGHT: 'light', DARK: 'dark' });

export function isValidTheme(value) {
  return value === THEMES.LIGHT || value === THEMES.DARK;
}

/**
 * Which theme to paint with.
 *
 * An explicit saved choice always wins. Anything else — never set, cleared, or
 * a stale value from an older version of the app — falls back to the operating
 * system preference.
 */
export function resolveTheme({ savedTheme, prefersDark } = {}) {
  if (isValidTheme(savedTheme)) {
    return savedTheme;
  }

  return prefersDark ? THEMES.DARK : THEMES.LIGHT;
}

/**
 * Read the saved theme without letting storage failures escape.
 *
 * `localStorage` is not always there to be read: Safari in private browsing
 * throws on access, and so does any browser with site data blocked. A theme
 * preference is not worth taking the page down for.
 */
export function readSavedTheme(storage) {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return isValidTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function readPrefersDark(win) {
  try {
    return Boolean(win?.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Resolve and apply, returning what was applied.
 *
 * Deliberately does not *write* to storage. Recording the resolved value would
 * turn "I have no preference, follow the OS" into an explicit choice on first
 * load, and the app would stop following the OS from then on without the user
 * ever having chosen anything.
 */
export function applyInitialTheme(doc = document, win = window) {
  const theme = resolveTheme({
    savedTheme: readSavedTheme(win?.localStorage),
    prefersDark: readPrefersDark(win),
  });

  doc.documentElement.setAttribute('data-theme', theme);

  return theme;
}

export default applyInitialTheme;
