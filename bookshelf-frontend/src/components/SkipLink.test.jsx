import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SkipLink from './SkipLink.jsx';

/**
 * "Skip to content".
 *
 * The regression (#339): there was none. `grep -rn "skip-link\\|Skip to" src`
 * returned nothing, so a keyboard user arriving at any page had to tab
 * through the whole navbar — brand, two section links, three public links, up
 * to two account links, login or logout, the search input, the theme toggle,
 * the cart button and the hamburger — before reaching what they came for.
 * Twelve to fourteen stops, on every page, every time.
 */

function renderWithTarget(props = {}) {
  return render(
    <>
      <SkipLink {...props} />
      <a href="/somewhere">a navbar link</a>
      <div id="main-content" tabIndex={-1}>
        <h1>the content</h1>
      </div>
    </>
  );
}

describe('SkipLink', () => {
  it('is a link, so it is announced as one', () => {
    // Not a button: a link is what moves the browser's own sequential focus
    // point, which a focus() call alone does not.
    renderWithTarget();

    const link = screen.getByRole('link', { name: 'Skip to content' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('is the first thing Tab reaches', async () => {
    const user = userEvent.setup();
    renderWithTarget();

    await user.tab();

    expect(document.activeElement).toBe(
      screen.getByRole('link', { name: 'Skip to content' })
    );
  });

  it('moves focus to the content when activated', async () => {
    const user = userEvent.setup();
    renderWithTarget();

    await user.click(screen.getByRole('link', { name: 'Skip to content' }));

    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });

  it('works from the keyboard, which is the only way anyone uses it', async () => {
    const user = userEvent.setup();
    renderWithTarget();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });

  it('does not put a hash in the URL', async () => {
    // A bare hash link would leave `#main-content` in the address bar, which
    // React Router treats as a navigation — and the app's own hash-scroll
    // effect would then try to interpret it.
    const user = userEvent.setup();
    renderWithTarget();

    const link = screen.getByRole('link', { name: 'Skip to content' });
    const click = vi.fn();
    link.addEventListener('click', click);

    await user.click(link);

    expect(click.mock.calls[0][0].defaultPrevented).toBe(true);
  });

  it('scrolls the content into view as well as focusing it', async () => {
    const user = userEvent.setup();
    renderWithTarget();

    const target = document.getElementById('main-content');
    target.scrollIntoView = vi.fn();

    await user.click(screen.getByRole('link', { name: 'Skip to content' }));

    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('falls back to the browser when the target is not there', async () => {
    const user = userEvent.setup();

    render(<SkipLink targetId="nothing-here" />);

    const link = screen.getByRole('link');
    const click = vi.fn();
    link.addEventListener('click', click);

    await user.click(link);

    // Not prevented: let the browser try the hash rather than swallow the
    // click and do nothing at all.
    expect(click.mock.calls[0][0].defaultPrevented).toBe(false);
  });

  it('does not throw when scrollIntoView is missing', async () => {
    // jsdom does not implement it, and neither do all browsers. An exception
    // from a click handler on the first tab stop of the page would be a bad
    // place to discover that.
    const user = userEvent.setup();
    renderWithTarget();

    const target = document.getElementById('main-content');
    delete target.scrollIntoView;

    await user.click(screen.getByRole('link', { name: 'Skip to content' }));

    expect(document.activeElement).toBe(target);
  });

  it('takes a different target and label', () => {
    render(
      <>
        <SkipLink targetId="somewhere-else">Jump to the results</SkipLink>
        <div id="somewhere-else" tabIndex={-1} />
      </>
    );

    expect(screen.getByRole('link', { name: 'Jump to the results' })).toHaveAttribute(
      'href',
      '#somewhere-else'
    );
  });
});
