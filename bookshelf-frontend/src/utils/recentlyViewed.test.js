import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MAX_ENTRIES,
  STORAGE_KEY,
  clearRecentlyViewed,
  readRecentlyViewed,
  readRecentlyViewedExcept,
  recordBookView,
} from './recentlyViewed.js';

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY));

describe('recentlyViewed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordBookView', () => {
    it('writes the key the component has always read but nobody wrote', () => {
      recordBookView('b1');
      expect(stored()).toEqual(['b1']);
    });

    it('puts the newest book first', () => {
      recordBookView('b1');
      recordBookView('b2');
      recordBookView('b3');
      expect(stored()).toEqual(['b3', 'b2', 'b1']);
    });

    it('moves a revisited book rather than adding it twice', () => {
      recordBookView('b1');
      recordBookView('b2');
      recordBookView('b1');
      // A list reading "b1, b1, b2" is a log, not a history.
      expect(stored()).toEqual(['b1', 'b2']);
    });

    it('caps the list', () => {
      for (let i = 0; i < MAX_ENTRIES + 5; i += 1) {
        recordBookView(`b${i}`);
      }

      const list = stored();
      expect(list).toHaveLength(MAX_ENTRIES);
      expect(list[0]).toBe(`b${MAX_ENTRIES + 4}`);
      expect(list).not.toContain('b0');
    });

    it('accepts a numeric id, since ids are compared as strings everywhere', () => {
      recordBookView(7);
      expect(stored()).toEqual(['7']);
    });

    it('ignores an id that could never resolve to a book', () => {
      recordBookView('');
      recordBookView('   ');
      recordBookView(null);
      recordBookView(undefined);
      recordBookView({ id: 'b1' });
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('returns the new list without a second read', () => {
      recordBookView('b1');
      expect(recordBookView('b2')).toEqual(['b2', 'b1']);
    });

    it('does not throw when storage is full or disabled', () => {
      // Safari private browsing, and any browser at quota.
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => recordBookView('b1')).not.toThrow();
    });
  });

  describe('readRecentlyViewed', () => {
    it('returns an empty list when nothing has been recorded', () => {
      expect(readRecentlyViewed()).toEqual([]);
    });

    it('survives a value that is not JSON', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      window.localStorage.setItem(STORAGE_KEY, 'b1,b2,b3');
      expect(readRecentlyViewed()).toEqual([]);
    });

    it('survives a value that is JSON but not an array', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ b1: true }));
      expect(readRecentlyViewed()).toEqual([]);
    });

    it('drops entries that are not usable ids', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(['b1', null, 42, { id: 'b2' }, '', '  ', ['b3'], 'b4'])
      );
      expect(readRecentlyViewed()).toEqual(['b1', '42', 'b4']);
    });

    it('deduplicates a hand-edited list', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['b1', 'b1', 'b2']));
      expect(readRecentlyViewed()).toEqual(['b1', 'b2']);
    });

    it('applies the cap on read as well, so lowering it takes effect', () => {
      const long = Array.from({ length: MAX_ENTRIES + 10 }, (_, i) => `b${i}`);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(long));
      expect(readRecentlyViewed()).toHaveLength(MAX_ENTRIES);
    });

    it('does not throw when storage itself is unavailable', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new DOMException('SecurityError');
      });

      expect(readRecentlyViewed()).toEqual([]);
    });
  });

  describe('readRecentlyViewedExcept', () => {
    it('leaves out the book already on screen', () => {
      recordBookView('b1');
      recordBookView('b2');
      expect(readRecentlyViewedExcept('b2')).toEqual(['b1']);
    });

    it('compares as strings, matching how ids are compared elsewhere', () => {
      recordBookView('7');
      expect(readRecentlyViewedExcept(7)).toEqual([]);
    });

    it('excludes nothing when given no id', () => {
      recordBookView('b1');
      expect(readRecentlyViewedExcept(undefined)).toEqual(['b1']);
      expect(readRecentlyViewedExcept('')).toEqual(['b1']);
    });
  });

  describe('clearRecentlyViewed', () => {
    it('empties the list', () => {
      recordBookView('b1');
      clearRecentlyViewed();
      expect(readRecentlyViewed()).toEqual([]);
    });
  });
});
