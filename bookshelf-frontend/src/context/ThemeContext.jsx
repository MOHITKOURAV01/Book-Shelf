import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

/**
 * The one owner of the theme.
 *
 * Before this, theme lived in two places at once: a private `useState` inside
 * ThemeToggle, and a second, unrelated `useState` inside the `useTheme` hook
 * that Navbar called. Both mounted on every route, both writing `data-theme`
 * and `localStorage.theme`, neither aware of the other. Clicking one toggle
 * left the other showing the wrong icon and believing the wrong thing, so the
 * second button needed two clicks to do anything. See #296.
 *
 * Theme is global state. There is exactly one of it here.
 */

export const STORAGE_KEY = 'theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** What the user has asked for, which is not the same as what is on screen. */
export const PREFERENCE = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
});

const THEMES = Object.freeze({ LIGHT: 'light', DARK: 'dark' });

export const ThemeContext = createContext(undefined);

/**
 * localStorage throws in Safari private browsing and when a browser blocks
 * storage for third-party frames. A theme preference is not worth crashing
 * the app over, so every access is guarded and simply degrades to
 * "follow the system".
 */
function readStoredPreference() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === THEMES.LIGHT || saved === THEMES.DARK
      ? saved
      : PREFERENCE.SYSTEM;
  } catch {
    return PREFERENCE.SYSTEM;
  }
}

function writeStoredPreference(preference) {
  try {
    if (preference === PREFERENCE.SYSTEM) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    // Preference will not survive a reload. Nothing else breaks.
  }
}

/**
 * matchMedia is missing in some test environments and in older browsers.
 * Treat its absence as "the system prefers light" rather than throwing during
 * the first render.
 */
function systemPrefersDark() {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * Resolve a preference to the theme actually shown.
 *
 * Keeping "system" distinct from the light/dark it currently resolves to is
 * the whole point. The old hook collapsed the two — its system-change
 * listener called `setTheme`, which persisted to localStorage, so the first
 * time the OS flipped, the app recorded that as an explicit user choice and
 * stopped following the OS from then on. The listener disabled itself the
 * first time it fired.
 */
export function resolveTheme(preference, prefersDark) {
  if (preference === PREFERENCE.LIGHT || preference === PREFERENCE.DARK) {
    return preference;
  }

  return prefersDark ? THEMES.DARK : THEMES.LIGHT;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredPreference);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  const theme = resolveTheme(preference, prefersDark);
  const isDark = theme === THEMES.DARK;

  /**
   * Apply the theme to the document.
   *
   * useLayoutEffect rather than useEffect so the attribute is set before the
   * browser paints — with useEffect a user who has chosen dark gets one
   * frame of light first. This is also the step `useTheme` was missing
   * entirely: it computed an initial theme in its state initialiser and then
   * never wrote it anywhere, so a saved preference did nothing until the
   * user clicked.
   */
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  /**
   * Persist the preference, not the resolved theme. Writing "dark" here
   * because the OS happens to be dark would silently convert "follow the
   * system" into an explicit choice.
   */
  useEffect(() => {
    writeStoredPreference(preference);
  }, [preference]);

  /**
   * Follow the OS while the preference is "system". The listener stays
   * subscribed regardless of preference — it only updates what the system
   * currently says, and `resolveTheme` decides whether that matters. That
   * way switching back to "system" is immediately correct without a reload.
   */
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DARK_QUERY);
    const handleChange = (event) => setPrefersDark(event.matches);

    // Safari below 14 only has the deprecated addListener form.
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }

    return undefined;
  }, []);

  /**
   * Keep tabs in step. Without this, toggling the theme in one tab leaves
   * every other open tab on the old theme until it is reloaded — and the
   * next write from those tabs would clobber the choice just made.
   */
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== null && event.key !== STORAGE_KEY) {
        return;
      }

      setPreference(readStoredPreference());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = useCallback((next) => {
    if (next !== THEMES.LIGHT && next !== THEMES.DARK) {
      console.warn(
        `[theme] setTheme expects "light" or "dark", received "${next}". Ignoring.`
      );
      return;
    }

    setPreference(next);
  }, []);

  const useSystemTheme = useCallback(() => {
    setPreference(PREFERENCE.SYSTEM);
  }, []);

  /**
   * Toggle from what is on screen, not from the preference. If the
   * preference is "system" and the system is dark, the user clicking the
   * toggle means "make it light" — they are reacting to what they can see.
   */
  const toggleTheme = useCallback(() => {
    setPreference(isDark ? THEMES.LIGHT : THEMES.DARK);
  }, [isDark]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      preference,
      isSystemPreference: preference === PREFERENCE.SYSTEM,
      setTheme,
      toggleTheme,
      useSystemTheme,
    }),
    [theme, isDark, preference, setTheme, toggleTheme, useSystemTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export default ThemeProvider;
