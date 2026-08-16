import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  THEMES,
  THEME_STORAGE_KEY,
  isValidTheme,
  resolveTheme,
  readSavedTheme,
  readPrefersDark,
  applyInitialTheme,
} from './themeBoot.js';

const INDEX_HTML = path.resolve(__dirname, '../../index.html');

/**
 * Pull the first inline <script> — the theme bootstrap — out of index.html.
 * Only inline scripts; the module script at the bottom has a src.
 */
function readBootScript() {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);

  if (!match) {
    throw new Error('No inline <script> found in index.html');
  }

  return match[1];
}

/**
 * A localStorage stand-in. `throws: true` models Safari private browsing and
 * a browser with site data blocked, where even reading throws.
 */
function fakeStorage({ value, throws = false } = {}) {
  return {
    getItem(key) {
      if (throws) {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }
      return key === THEME_STORAGE_KEY ? (value ?? null) : null;
    },
    setItem() {
      if (throws) {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      }
    },
  };
}

function fakeWindow({ savedTheme, prefersDark = false, storageThrows = false } = {}) {
  return {
    localStorage: fakeStorage({ value: savedTheme, throws: storageThrows }),
    matchMedia: (query) => ({
      matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
      media: query,
    }),
  };
}

/** A bare document with just the root element the script touches. */
function fakeDocument() {
  const attributes = new Map();
  return {
    attributes,
    documentElement: {
      setAttribute: (name, value) => attributes.set(name, value),
      getAttribute: (name) => attributes.get(name) ?? null,
    },
  };
}

/**
 * Run the real inline script from index.html against fake globals.
 *
 * The script refers to bare `localStorage`, `window` and `document`, so they
 * are passed as parameters of the wrapper function.
 */
function runBootScript({ savedTheme, prefersDark = false, storageThrows = false } = {}) {
  const source = readBootScript();
  const win = fakeWindow({ savedTheme, prefersDark, storageThrows });
  const doc = fakeDocument();

  // eslint-disable-next-line no-new-func
  const run = new Function('window', 'document', 'localStorage', source);
  run(win, doc, win.localStorage);

  return doc.documentElement.getAttribute('data-theme');
}

describe('the inline theme script in index.html', () => {
  it('parses — this is the regression the whole file exists for', () => {
    // Before the fix this threw `SyntaxError: Unexpected token 'catch'`: an
    // `else {` was never closed, so the browser discarded the whole block and
    // data-theme was never set. Nothing caught it, because an inline script in
    // index.html is not linted and not bundled.
    expect(() => new Function(readBootScript())).not.toThrow();
  });

  it('applies a saved dark theme', () => {
    expect(runBootScript({ savedTheme: 'dark' })).toBe('dark');
  });

  it('applies a saved light theme even when the OS prefers dark', () => {
    // An explicit choice beats the system preference. The old script computed
    // `isDark = saved === 'dark' || (!saved && prefersDark)` first, which got
    // this right, and then a second copy of the logic overwrote it.
    expect(runBootScript({ savedTheme: 'light', prefersDark: true })).toBe('light');
  });

  it('follows the OS when nothing is saved', () => {
    expect(runBootScript({ prefersDark: true })).toBe('dark');
    expect(runBootScript({ prefersDark: false })).toBe('light');
  });

  it('ignores a saved value that is not a theme', () => {
    expect(runBootScript({ savedTheme: 'purple', prefersDark: true })).toBe('dark');
    expect(runBootScript({ savedTheme: '', prefersDark: false })).toBe('light');
  });

  it('still sets an attribute when storage throws', () => {
    // Safari private browsing, or site data blocked. The page must still have
    // a defined theme rather than none.
    expect(runBootScript({ storageThrows: true })).toBe('light');
  });

  it('always sets data-theme, whatever the inputs', () => {
    const cases = [
      { savedTheme: 'dark' },
      { savedTheme: 'light' },
      { savedTheme: undefined, prefersDark: true },
      { savedTheme: 'nonsense' },
      { storageThrows: true },
    ];

    for (const options of cases) {
      expect(runBootScript(options)).toMatch(/^(light|dark)$/);
    }
  });

  it('does not write to localStorage', () => {
    // Recording the resolved value would turn "no preference, follow the OS"
    // into an explicit choice on first load, and the app would stop following
    // the OS without the user ever having chosen anything.
    const writes = [];
    const source = readBootScript();
    const win = fakeWindow({ prefersDark: true });
    win.localStorage.setItem = (key, value) => writes.push([key, value]);

    // eslint-disable-next-line no-new-func
    new Function('window', 'document', 'localStorage', source)(
      win,
      fakeDocument(),
      win.localStorage
    );

    expect(writes).toEqual([]);
  });

  it('agrees with resolveTheme() for every combination', () => {
    // The inline script cannot import the module, so this is what keeps the
    // two implementations honest.
    for (const savedTheme of ['light', 'dark', undefined, 'bogus']) {
      for (const prefersDark of [true, false]) {
        expect(runBootScript({ savedTheme, prefersDark })).toBe(
          resolveTheme({ savedTheme, prefersDark })
        );
      }
    }
  });
});

describe('resolveTheme', () => {
  it('prefers an explicit saved choice', () => {
    expect(resolveTheme({ savedTheme: 'dark', prefersDark: false })).toBe('dark');
    expect(resolveTheme({ savedTheme: 'light', prefersDark: true })).toBe('light');
  });

  it('falls back to the system preference', () => {
    expect(resolveTheme({ prefersDark: true })).toBe(THEMES.DARK);
    expect(resolveTheme({ prefersDark: false })).toBe(THEMES.LIGHT);
  });

  it('treats an unrecognised saved value as no preference', () => {
    expect(resolveTheme({ savedTheme: 'purple', prefersDark: true })).toBe('dark');
    expect(resolveTheme({ savedTheme: null, prefersDark: false })).toBe('light');
  });

  it('defaults to light with no arguments at all', () => {
    expect(resolveTheme()).toBe(THEMES.LIGHT);
  });
});

describe('isValidTheme', () => {
  it('accepts only the two themes', () => {
    expect(isValidTheme('light')).toBe(true);
    expect(isValidTheme('dark')).toBe(true);
    expect(isValidTheme('Dark')).toBe(false);
    expect(isValidTheme('')).toBe(false);
    expect(isValidTheme(null)).toBe(false);
    expect(isValidTheme(undefined)).toBe(false);
  });
});

describe('readSavedTheme', () => {
  it('reads a valid value', () => {
    expect(readSavedTheme(fakeStorage({ value: 'dark' }))).toBe('dark');
  });

  it('returns null for an invalid value', () => {
    expect(readSavedTheme(fakeStorage({ value: 'chartreuse' }))).toBeNull();
  });

  it('returns null rather than throwing when storage is unavailable', () => {
    expect(readSavedTheme(fakeStorage({ throws: true }))).toBeNull();
    expect(readSavedTheme(undefined)).toBeNull();
  });
});

describe('readPrefersDark', () => {
  it('reports the media query result', () => {
    expect(readPrefersDark(fakeWindow({ prefersDark: true }))).toBe(true);
    expect(readPrefersDark(fakeWindow({ prefersDark: false }))).toBe(false);
  });

  it('returns false when matchMedia is missing', () => {
    expect(readPrefersDark({})).toBe(false);
    expect(readPrefersDark(undefined)).toBe(false);
  });
});

describe('applyInitialTheme', () => {
  let originalTheme;

  beforeEach(() => {
    originalTheme = document.documentElement.getAttribute('data-theme');
  });

  afterEach(() => {
    if (originalTheme === null) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', originalTheme);
    }
  });

  it('sets the attribute and returns what it set', () => {
    const doc = fakeDocument();
    const applied = applyInitialTheme(doc, fakeWindow({ savedTheme: 'dark' }));

    expect(applied).toBe('dark');
    expect(doc.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('works against a real document', () => {
    applyInitialTheme(document, fakeWindow({ savedTheme: 'dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
