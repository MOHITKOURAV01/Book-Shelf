import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import ErrorBoundary from './ErrorBoundary.jsx';

function Boom({ shouldThrow = true }) {
  if (shouldThrow) {
    throw new Error('cart.reduce is not a function');
  }
  return <p>rendered fine</p>;
}

/** Lets a test flip the child from throwing to not, to exercise "Try again". */
function Recoverable() {
  const [broken, setBroken] = useState(true);

  return (
    <>
      <button onClick={() => setBroken(false)}>repair</button>
      <ErrorBoundary>
        <Boom shouldThrow={broken} />
      </ErrorBoundary>
    </>
  );
}

let errorSpy;

beforeEach(() => {
  // React logs the caught error itself; that is expected noise here.
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('rendered fine')).toBeInTheDocument();
  });

  it('shows a message instead of a blank page when a child throws', () => {
    // Without a boundary React unmounts the whole tree and #root is empty.
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('offers a way out', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /clear saved data/i })
    ).toBeInTheDocument();
  });

  it('shows the message but not the stack', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText('cart.reduce is not a function')).toBeInTheDocument();
    expect(screen.queryByText(/ErrorBoundary\.test/)).not.toBeInTheDocument();
  });

  it('logs the component stack, which is not on the error object', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    const logged = errorSpy.mock.calls.some(
      (call) => call[0] === '[ErrorBoundary] render failed:'
    );
    expect(logged).toBe(true);
  });

  it('recovers when the underlying problem is gone', async () => {
    const user = userEvent.setup();
    render(<Recoverable />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByText('repair'));
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('rendered fine')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears localStorage from the escape hatch', async () => {
    const clear = vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {});
    const assign = vi.fn();
    const originalLocation = window.location;

    delete window.location;
    window.location = { ...originalLocation, assign };

    try {
      const user = userEvent.setup();
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      );

      await user.click(screen.getByRole('button', { name: /clear saved data/i }));

      expect(clear).toHaveBeenCalled();
      expect(assign).toHaveBeenCalledWith('/');
    } finally {
      window.location = originalLocation;
      clear.mockRestore();
    }
  });
});
