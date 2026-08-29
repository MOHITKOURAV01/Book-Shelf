import { describe, it, expect } from 'vitest';

import { ELLIPSIS, clampPage, pageWindow } from './pagination.js';

/**
 * The window is the part with the edge cases, so it is the part that gets
 * enumerated rather than sampled: both ends, the middle, the boundary where
 * the ellipsis first appears, and the two places where a gap of exactly one
 * page must render as a number instead. See #369.
 */
describe('clampPage', () => {
  it('leaves a page inside the range alone', () => {
    expect(clampPage(3, 10)).toBe(3);
  });

  it('brings a page past the end back to the last one', () => {
    // The reported case: a hand-typed ?page=7 on a three-page result set.
    // The API answers with an empty slice rather than an error, so nothing
    // else in the chain notices.
    expect(clampPage(7, 3)).toBe(3);
  });

  it('treats anything that is not a page number as page 1', () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(-4, 10)).toBe(1);
    expect(clampPage(2.5, 10)).toBe(1);
    expect(clampPage(undefined, 10)).toBe(1);
    expect(clampPage(NaN, 10)).toBe(1);
    expect(clampPage('sideways', 10)).toBe(1);
  });

  it('accepts a numeric string, because that is what a URL holds', () => {
    // The page number reaches Home through useSearchParams, where every
    // value is a string. Rejecting '3' would send a reader on ?page=3 to
    // page 1.
    expect(clampPage('3', 10)).toBe(3);
    expect(clampPage('30', 10)).toBe(10);
  });

  it('survives a nonsense total', () => {
    expect(clampPage(5, 0)).toBe(1);
    expect(clampPage(5, undefined)).toBe(1);
  });
});

describe('pageWindow', () => {
  it('shows every page while they still fit', () => {
    expect(pageWindow({ currentPage: 1, totalPages: 4 })).toEqual([1, 2, 3, 4]);
    expect(pageWindow({ currentPage: 4, totalPages: 7 })).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('starts eliding one page past the point where it saves anything', () => {
    // Seven fit; eight do not. The 8-page case is the first that gains from
    // an ellipsis, and it gains exactly one slot.
    expect(pageWindow({ currentPage: 1, totalPages: 7 })).toHaveLength(7);
    expect(pageWindow({ currentPage: 1, totalPages: 8 })).toEqual([
      1, 2, 3, 4, ELLIPSIS, 8,
    ]);
  });

  it('elides on the right at the start of a long range', () => {
    expect(pageWindow({ currentPage: 1, totalPages: 50 })).toEqual([
      1, 2, 3, 4, ELLIPSIS, 50,
    ]);
  });

  it('elides on both sides in the middle', () => {
    expect(pageWindow({ currentPage: 25, totalPages: 50 })).toEqual([
      1, ELLIPSIS, 24, 25, 26, ELLIPSIS, 50,
    ]);
  });

  it('elides on the left at the end of a long range', () => {
    expect(pageWindow({ currentPage: 50, totalPages: 50 })).toEqual([
      1, ELLIPSIS, 47, 48, 49, 50,
    ]);
  });

  it('renders a gap of exactly one page as that page', () => {
    // 1 … 3 4 5 … 50 would hide a single number behind an ellipsis, which
    // costs a click and saves no width.
    expect(pageWindow({ currentPage: 4, totalPages: 50 })).toEqual([
      1, 2, 3, 4, 5, ELLIPSIS, 50,
    ]);
    expect(pageWindow({ currentPage: 47, totalPages: 50 })).toEqual([
      1, ELLIPSIS, 46, 47, 48, 49, 50,
    ]);
  });

  it('holds the control to a stable width across a long range', () => {
    const widths = [];

    for (let page = 1; page <= 50; page += 1) {
      widths.push(pageWindow({ currentPage: page, totalPages: 50 }).length);
    }

    // The whole point: 50 pages must not mean 50 buttons, and the row must
    // not visibly resize as the reader walks through it.
    expect(Math.max(...widths)).toBeLessThanOrEqual(7);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(6);
  });

  it('never repeats a page and never drops out of order', () => {
    for (const total of [8, 9, 12, 50, 137]) {
      for (let page = 1; page <= total; page += 1) {
        const numbers = pageWindow({ currentPage: page, totalPages: total }).filter(
          (entry) => entry !== ELLIPSIS
        );

        expect(new Set(numbers).size).toBe(numbers.length);
        expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
        // The current page is the one the reader needs to see marked.
        expect(numbers).toContain(page);
        // Both ends stay reachable in one click, whatever the range.
        expect(numbers).toContain(1);
        expect(numbers).toContain(total);
      }
    }
  });

  it('never places an ellipsis at either end or two in a row', () => {
    for (const total of [8, 20, 50]) {
      for (let page = 1; page <= total; page += 1) {
        const entries = pageWindow({ currentPage: page, totalPages: total });

        expect(entries[0]).toBe(1);
        expect(entries.at(-1)).toBe(total);

        entries.forEach((entry, index) => {
          if (entry === ELLIPSIS) {
            expect(entries[index + 1]).not.toBe(ELLIPSIS);
          }
        });
      }
    }
  });

  it('widens with more siblings', () => {
    expect(pageWindow({ currentPage: 25, totalPages: 50, siblings: 2 })).toEqual([
      1, ELLIPSIS, 23, 24, 25, 26, 27, ELLIPSIS, 50,
    ]);
  });

  it('handles a current page outside the range', () => {
    // Clamped, so the last page is what is marked rather than nothing at all.
    expect(pageWindow({ currentPage: 99, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
  });

  it('survives being called with nothing', () => {
    expect(pageWindow()).toEqual([1]);
    expect(pageWindow({ totalPages: 0 })).toEqual([1]);
  });
});
