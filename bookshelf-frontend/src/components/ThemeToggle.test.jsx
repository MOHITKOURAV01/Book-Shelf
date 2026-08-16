import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ThemeToggle from './ThemeToggle.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { useTheme } from '../hooks/useTheme.js';

/**
 * Installs a controllable matchMedia. jsdom does not implement it, and the
 * component's behaviour depends on what it reports.
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

  return mediaQueryList;
}

function renderToggle(props) {
  return render(
    <ThemeProvider>
      <ThemeToggle {...props} />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies the light theme and offers to switch to dark', () => {
    renderToggle();

    expect(
      screen.getByRole('button', { name: /switch to dark theme/i })
    ).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('switches to dark when clicked, and persists the choice', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(
      screen.getByRole('button', { name: /switch to light theme/i })
    ).toBeInTheDocument();
  });

  it('reports its state through aria-pressed', async () => {
    const user = userEvent.setup();
    renderToggle();

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies a saved dark preference on mount, with no click', () => {
    window.localStorage.setItem('theme', 'dark');

    renderToggle();

    // The regression from #296: the theme was resolved on mount and then
    // never written to the document, so a saved preference did nothing
    // until the user clicked something.
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(
      screen.getByRole('button', { name: /switch to light theme/i })
    ).toBeInTheDocument();
  });

  it('falls back to the OS preference when nothing is saved', () => {
    mockMatchMedia(true);

    renderToggle();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    // Following the OS is not an explicit choice and must not be persisted.
    expect(window.localStorage.getItem('theme')).toBeNull();
  });

  it('defaults to the floating variant and accepts an inline one', () => {
    const { unmount } = renderToggle();
    expect(screen.getByRole('button')).toHaveClass('theme-toggle--floating');
    unmount();

    renderToggle({ variant: 'inline', className: 'nav__theme-toggle' });
    const button = screen.getByRole('button');
    expect(button).toHaveClass('theme-toggle--inline');
    expect(button).toHaveClass('nav__theme-toggle');
  });

  it('is a submit-safe button', () => {
    renderToggle();
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('throws a useful error outside the provider', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<ThemeToggle />)).toThrow(/must be used inside a/i);

    consoleError.mockRestore();
  });

  /**
   * The heart of #296: two components reading the theme used to hold two
   * independent copies of it, so clicking one left the other stale.
   */
  it('stays in sync with every other consumer of the theme', async () => {
    const user = userEvent.setup();

    function ThemeReadout() {
      const { theme } = useTheme();
      return <span data-testid="readout">{theme}</span>;
    }

    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeToggle variant="inline" />
        <ThemeReadout />
      </ThemeProvider>
    );

    const [first, second] = screen.getAllByRole('button');

    await user.click(first);

    expect(screen.getByTestId('readout')).toHaveTextContent('dark');
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // One click on the *other* button, one change. Previously the second
    // button needed two clicks because its private state was a step behind.
    await user.click(second);

    expect(screen.getByTestId('readout')).toHaveTextContent('light');
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
