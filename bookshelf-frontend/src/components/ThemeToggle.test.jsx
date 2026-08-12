import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle.jsx';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage and reset data-theme before each test
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders correctly with default theme (light)', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /Switch to dark theme/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('🌙');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles theme to dark when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(screen.getByRole('button', { name: /Switch to light theme/i })).toBeInTheDocument();
    expect(button).toHaveTextContent('☀️');
  });

  it('initializes with saved theme from localStorage', () => {
    window.localStorage.setItem('theme', 'dark');
    render(<ThemeToggle />);
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const button = screen.getByRole('button', { name: /Switch to light theme/i });
    expect(button).toBeInTheDocument();
  });
});
