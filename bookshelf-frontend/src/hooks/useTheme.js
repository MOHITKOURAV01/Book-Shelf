import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext.jsx';

/**
 * Read the current theme.
 *
 * This used to be a full implementation — its own `useState`, its own
 * `localStorage` writes, its own `matchMedia` listener — which meant every
 * component that called it got a *private* copy of the theme. Navbar had one,
 * ThemeToggle had another, and the two disagreed the moment either was
 * clicked. It is now a consumer of the single ThemeContext. See #296.
 *
 * Throws when used outside the provider rather than handing back `undefined`
 * and letting the caller blow up on the destructuring line, matching the
 * pattern `useCart` already established.
 *
 * Returns:
 *   theme               'light' | 'dark' — what is on screen right now
 *   isDark              convenience boolean
 *   preference          'system' | 'light' | 'dark' — what the user asked for
 *   isSystemPreference  true while the app is following the OS
 *   setTheme(next)      pick 'light' or 'dark' explicitly
 *   toggleTheme()       flip whatever is currently on screen
 *   useSystemTheme()    go back to following the OS
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error(
      'useTheme() must be used inside a <ThemeProvider>. ' +
        'Check that ThemeProvider wraps the component tree in main.jsx.'
    );
  }

  return context;
}

export default useTheme;
