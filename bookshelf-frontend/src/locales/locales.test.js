import { describe, it, expect } from 'vitest';

import en from './en.json';
import es from './es.json';
import fr from './fr.json';

/**
 * The locale bundles, checked against each other.
 *
 * Nothing checked them before, and nothing could: no test rendered a page
 * against an initialised i18next instance, so a key that existed in `en.json`
 * and nowhere else fell back to English in the browser with no signal
 * anywhere. That is the same blind spot that let `t is not defined` reach
 * main in two pages at once (#367) — the translation layer had no tests of
 * any kind.
 *
 * These are cheap and they hold for every key added from here on.
 */

const BUNDLES = { es, fr };

/** `{ 'wishlist.title': 'Your Wishlist', ... }` */
function flatten(object, prefix = '') {
  const out = {};

  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }

  return out;
}

/** The `{{name}}` placeholders in a string, sorted, for comparison. */
function placeholders(value) {
  return [...String(value).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort();
}

const flatEn = flatten(en);

describe('locale bundles', () => {
  it.each(Object.keys(BUNDLES))('%s covers every key in en', (language) => {
    const missing = Object.keys(flatEn).filter(
      (key) => !(key in flatten(BUNDLES[language]))
    );

    expect(missing).toEqual([]);
  });

  it.each(Object.keys(BUNDLES))('%s has no key en does not', (language) => {
    const extra = Object.keys(flatten(BUNDLES[language])).filter(
      (key) => !(key in flatEn)
    );

    // An extra key is dead weight at best and a typo of a real one at worst —
    // and a typo reads as a translation that simply never appears.
    expect(extra).toEqual([]);
  });

  it.each(Object.keys(BUNDLES))(
    '%s interpolates the same values as en',
    (language) => {
      const flat = flatten(BUNDLES[language]);

      const mismatched = Object.entries(flatEn)
        .filter(([key, value]) => {
          if (!(key in flat)) return false;
          return (
            placeholders(value).join(',') !== placeholders(flat[key]).join(',')
          );
        })
        .map(([key]) => key);

      // A translation that drops {{count}} renders a sentence with a hole in
      // it, and one that invents a placeholder renders the braces literally.
      expect(mismatched).toEqual([]);
    }
  );

  it('gives every plural key both an _one and an _other form', () => {
    const incomplete = [];

    for (const [language, bundle] of Object.entries({ en, ...BUNDLES })) {
      const keys = Object.keys(flatten(bundle));

      for (const key of keys) {
        if (!key.endsWith('_one')) continue;

        const other = `${key.slice(0, -'_one'.length)}_other`;

        if (!keys.includes(other)) {
          incomplete.push(`${language}: ${key} without ${other}`);
        }
      }
    }

    // i18next resolves the plural form itself; a missing _other means the
    // key falls through and renders as the key name.
    expect(incomplete).toEqual([]);
  });

  it('leaves no value blank', () => {
    const blank = [];

    for (const [language, bundle] of Object.entries({ en, ...BUNDLES })) {
      for (const [key, value] of Object.entries(flatten(bundle))) {
        if (typeof value !== 'string' || value.trim() === '') {
          blank.push(`${language}: ${key}`);
        }
      }
    }

    expect(blank).toEqual([]);
  });
});
