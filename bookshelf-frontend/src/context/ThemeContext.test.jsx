import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ThemeProvider,
  resolveTheme,
  PREFERENCE,
  STORAGE_KEY,
} from './ThemeContext.jsx';
import { useTheme } from '../hooks/useTheme.js';

/**
 * A controllable prefers-color-scheme, with a handle to fire a change the way
 * the OS would.
 */
function mockMatchMedia(initialMatches = false) {
  const listeners = new Set();

  const mediaQueryList = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_event, handler) => listeners.add(handler),
    removeEventListener: (_event, handler) => listeners.delete(handler),
    addListener: (handler) => listeners.add(handler),
    removeListener: (handler) => listeners.delete(handler),
    dispatchEvent: vi.fn(),
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mediaQueryList),
  });

  return {
    mediaQueryList,
    emit(matches) {
      mediaQueryList.matches = matches;
      act(() => {
        for (const handler of listeners) {
          handler({ matches });
        }
      });
    },
    listenerCount: () => listeners.size,
  };
}

/** Renders the whole context surface so assertions read off the DOM. */
function Probe() {
  const {
    theme,
    isDark,
    preference,
    isSystemPreference,
    setTheme,
    toggleTheme,
    useSystemTheme,
  } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
      <span data-testid="preference">{preference}</span>
      <span data-testid="is-system">{String(isSystemPreference)}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme('light')}>force light</button>
      <button onClick={() => setTheme('dark')}>force dark</button>
      <button onClick={useSystemTheme}>follow system</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );
}

const themeText = () => screen.getByTestId('theme').textContent;
const preferenceText = () => screen.getByTestId('preference').textContent;

describe('resolveTheme', () => {
  it('returns an explicit preference unchanged', () => {
    expect(resolveTheme(PREFERENCE.DARK, false)).toBe('dark');
    expect(resolveTheme(PREFERENCE.LIGHT, true)).toBe('light');
  });

  it('follows the system when the preference is system', () => {
    expect(resolveTheme(PREFERENCE.SYSTEM, true)).toBe('dark');
    expect(resolveTheme(PREFERENCE.SYSTEM, false)).toBe('light');
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies data-theme on mount', () => {
    renderProvider();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('starts on the system preference when nothing is stored', () => {
    mockMatchMedia(true);
    renderProvider();

    expect(themeText()).toBe('dark');
    expect(preferenceText()).toBe(PREFERENCE.SYSTEM);
    expect(screen.getByTestId('is-system')).toHaveTextContent('true');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores a stored explicit preference', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    renderProvider();

    expect(themeText()).toBe('dark');
    expect(preferenceText()).toBe('dark');
    expect(screen.getByTestId('is-system')).toHaveTextContent('false');
  });

  it('ignores a junk value in storage rather than applying it', () => {
    window.localStorage.setItem(STORAGE_KEY, 'neon');
    renderProvider();

    expect(themeText()).toBe('light');
    expect(preferenceText()).toBe(PREFERENCE.SYSTEM);
  });

  it('persists an explicit choice', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText('force dark'));

    expect(themeText()).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('clears storage when the user goes back to following the system', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    renderProvider();

    await user.click(screen.getByText('follow system'));

    expect(preferenceText()).toBe(PREFERENCE.SYSTEM);
    expect(themeText()).toBe('light');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignores an unrecognised value passed to setTheme', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    function BadCaller() {
      const { setTheme } = useTheme();
      return <button onClick={() => setTheme('sepia')}>bad</button>;
    }

    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
        <BadCaller />
      </ThemeProvider>
    );

    await user.click(screen.getByText('bad'));

    expect(themeText()).toBe('light');
    expect(warn).toHaveBeenCalled();
  });

  describe('following the OS', () => {
    it('tracks a system change while the preference is system', () => {
      const media = mockMatchMedia(false);
      renderProvider();

      expect(themeText()).toBe('light');

      media.emit(true);

      expect(themeText()).toBe('dark');
      // Following along is not a choice, so nothing is written.
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(preferenceText()).toBe(PREFERENCE.SYSTEM);
    });

    it('keeps tracking after more than one system change', () => {
      // The old hook stopped after the first: its handler called setTheme,
      // which wrote to localStorage, and the handler's own guard then read
      // that back as an explicit choice and refused to act again.
      const media = mockMatchMedia(false);
      renderProvider();

      media.emit(true);
      expect(themeText()).toBe('dark');

      media.emit(false);
      expect(themeText()).toBe('light');

      media.emit(true);
      expect(themeText()).toBe('dark');
    });

    it('stops following once the user chooses explicitly', async () => {
      const user = userEvent.setup();
      const media = mockMatchMedia(false);
      renderProvider();

      await user.click(screen.getByText('force light'));
      media.emit(true);

      expect(themeText()).toBe('light');
      expect(preferenceText()).toBe('light');
    });

    it('picks the system theme back up when the user opts back in', async () => {
      const user = userEvent.setup();
      const media = mockMatchMedia(false);
      renderProvider();

      await user.click(screen.getByText('force light'));
      media.emit(true);
      expect(themeText()).toBe('light');

      await user.click(screen.getByText('follow system'));

      // No reload needed — the listener stayed subscribed throughout.
      expect(themeText()).toBe('dark');
    });

    it('unsubscribes on unmount', () => {
      const media = mockMatchMedia(false);
      const { unmount } = renderProvider();

      expect(media.listenerCount()).toBe(1);
      unmount();
      expect(media.listenerCount()).toBe(0);
    });
  });

  describe('toggleTheme', () => {
    it('flips what is on screen', async () => {
      const user = userEvent.setup();
      renderProvider();

      await user.click(screen.getByText('toggle'));
      expect(themeText()).toBe('dark');

      await user.click(screen.getByText('toggle'));
      expect(themeText()).toBe('light');
    });

    it('flips away from the system theme in one click', async () => {
      // Preference is 'system' resolving to dark. Clicking means "make it
      // light" — the user is reacting to what they can see, not to the
      // preference they never set.
      const user = userEvent.setup();
      mockMatchMedia(true);
      renderProvider();

      expect(themeText()).toBe('dark');

      await user.click(screen.getByText('toggle'));

      expect(themeText()).toBe('light');
      expect(preferenceText()).toBe('light');
    });
  });

  describe('resilience', () => {
    it('survives localStorage being unavailable', () => {
      const getItem = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('SecurityError');
        });
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('SecurityError');
        });

      expect(() => renderProvider()).not.toThrow();
      expect(themeText()).toBe('light');

      getItem.mockRestore();
      setItem.mockRestore();
    });

    it('survives matchMedia being missing', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      expect(() => renderProvider()).not.toThrow();
      expect(themeText()).toBe('light');
    });

    it('picks up a change made in another tab', () => {
      renderProvider();
      expect(themeText()).toBe('light');

      window.localStorage.setItem(STORAGE_KEY, 'dark');
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'dark' })
        );
      });

      expect(themeText()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('ignores storage events for unrelated keys', () => {
      renderProvider();

      window.localStorage.setItem('cart', '[]');
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', { key: 'cart', newValue: '[]' })
        );
      });

      expect(themeText()).toBe('light');
    });
  });
});

describe('useTheme', () => {
  it('throws outside a provider instead of returning undefined', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);

    consoleError.mockRestore();
  });
});
