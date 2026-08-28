import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Pagination from './Pagination.jsx';

/**
 * The component had no test file at all.
 *
 * These are about the two things #369 was about: how many buttons a long
 * result set produces, and what the control tells someone who is not looking
 * at it.
 */

function renderPager({ currentPage = 1, totalPages = 1, onPageChange = vi.fn(), ...rest } = {}) {
  const result = render(
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      {...rest}
    />
  );

  return { ...result, onPageChange };
}

const pageButtons = () =>
  screen
    .queryAllByRole('button', { name: /^Go to page/ })
    .map((button) => button.textContent);

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = renderPager({ totalPages: 1 });

    expect(container).toBeEmptyDOMElement();
  });

  it('shows every page while they fit', () => {
    renderPager({ currentPage: 2, totalPages: 4 });

    expect(pageButtons()).toEqual(['1', '2', '3', '4']);
  });

  it('windows a long range instead of rendering fifty buttons', () => {
    renderPager({ currentPage: 25, totalPages: 50 });

    // The reported symptom: a for-loop from 1 to totalPages put a block of
    // fifty numbers under the grid.
    expect(pageButtons()).toEqual(['1', '24', '25', '26', '50']);
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('keeps the first and last page one click away', () => {
    renderPager({ currentPage: 25, totalPages: 50 });

    expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to page 50' })).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('marks the current page with aria-current, not just a class', () => {
      renderPager({ currentPage: 3, totalPages: 10 });

      const current = screen.getByRole('button', { name: 'Go to page 3' });

      expect(current).toHaveAttribute('aria-current', 'page');
      // Every other page must not claim to be current.
      expect(
        screen.getAllByRole('button', { name: /^Go to page/ })
          .filter((button) => button.getAttribute('aria-current') === 'page')
      ).toHaveLength(1);
    });

    it('names the page buttons rather than leaving them a bare digit', () => {
      renderPager({ currentPage: 1, totalPages: 10 });

      // "3, button" out of context says nothing about what it does.
      expect(screen.getByRole('button', { name: 'Go to page 2' })).toHaveTextContent('2');
    });

    it('keeps the arrow glyphs out of the accessible name', () => {
      renderPager({ currentPage: 2, totalPages: 10 });

      // Not "left arrow Prev".
      expect(screen.getByRole('button', { name: 'Prev' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    it('hides the ellipsis from assistive technology', () => {
      renderPager({ currentPage: 25, totalPages: 50 });

      screen.getAllByText('…').forEach((gap) => {
        expect(gap).toHaveAttribute('aria-hidden', 'true');
        // Nothing to activate, so it must not be a tab stop either.
        expect(gap.tagName).toBe('SPAN');
      });
    });

    it('announces which page is showing', () => {
      renderPager({ currentPage: 5, totalPages: 50 });

      const status = screen.getByRole('status');

      expect(status).toHaveTextContent('Page 5 of 50');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('labels the landmark, so two pagers on a page are distinguishable', () => {
      renderPager({ totalPages: 4, label: 'Search results pages' });

      expect(
        screen.getByRole('navigation', { name: 'Search results pages' })
      ).toBeInTheDocument();
    });
  });

  describe('what a click does', () => {
    it('moves to the page clicked', async () => {
      const user = userEvent.setup();
      const { onPageChange } = renderPager({ currentPage: 1, totalPages: 10 });

      await user.click(screen.getByRole('button', { name: 'Go to page 3' }));

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('does nothing when the current page is clicked', async () => {
      const user = userEvent.setup();
      const { onPageChange } = renderPager({ currentPage: 3, totalPages: 10 });

      await user.click(screen.getByRole('button', { name: 'Go to page 3' }));

      // It used to fire, and Home answers onPageChange with a smooth
      // window.scrollTo — so clicking the page you are on jumped the page
      // for nothing.
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('steps with Prev and Next', async () => {
      const user = userEvent.setup();
      const { onPageChange } = renderPager({ currentPage: 5, totalPages: 10 });

      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(onPageChange).toHaveBeenLastCalledWith(6);

      await user.click(screen.getByRole('button', { name: 'Prev' }));
      expect(onPageChange).toHaveBeenLastCalledWith(4);
    });

    it('disables Prev on the first page and Next on the last', () => {
      const { unmount } = renderPager({ currentPage: 1, totalPages: 10 });
      expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
      unmount();

      renderPager({ currentPage: 10, totalPages: 10 });
      expect(screen.getByRole('button', { name: 'Prev' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('cannot be walked past the end from a page outside the range', async () => {
      const user = userEvent.setup();
      // What a hand-typed ?page=7 produces on a three-page result set. The
      // API answers a page past the end with an empty slice rather than an
      // error, so nothing upstream catches it.
      const { onPageChange } = renderPager({ currentPage: 7, totalPages: 3 });

      expect(screen.getByRole('button', { name: 'Go to page 3' })).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Go to page 1' }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('is reachable by keyboard in reading order', async () => {
      const user = userEvent.setup();
      renderPager({ currentPage: 2, totalPages: 4 });

      await user.tab();
      expect(screen.getByRole('button', { name: 'Prev' })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'Go to page 1' })).toHaveFocus();
    });
  });
});
