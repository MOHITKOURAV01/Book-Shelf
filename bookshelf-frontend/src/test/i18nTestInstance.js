import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

/**
 * A real, initialised i18next instance for tests.
 *
 * The app initialises i18n as a side effect of `import './i18n.js'` in
 * `main.jsx`, and nothing under test imports `main.jsx`. So every test that
 * rendered a translated page rendered it against an *uninitialised*
 * instance, where `useTranslation()` hands back a `t` that returns the
 * literal `defaultValue` and ignores the resource bundles entirely.
 *
 * That is why a page could go out rendering `wishlist.itemCount` as text and
 * no test would notice — and why the `t is not defined` crash in #367 got
 * past the suite as far as it did. It also means plurals and interpolation
 * silently do nothing, because both are features of the initialised
 * instance.
 *
 * This is a separate instance rather than a change to `setupTests.js` on
 * purpose. A global init would change the strings every existing test sees,
 * whether or not that test is about translation. Tests opt in by wrapping in
 * the provider below, and get the real bundles when they do.
 */
export function createI18nForTests(language = 'en') {
  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    interpolation: { escapeValue: false },
    // A missing key should be visible in a test run, not swallowed.
    saveMissing: false,
    react: { useSuspense: false },
  });

  return instance;
}

export default createI18nForTests;
