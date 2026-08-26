import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import Login from './Login.jsx';
import { AuthContext } from '../context/AuthContext.jsx';

/**
 * The regression these cover: the page read `err.response.data.message`, but
 * `utils/api.js` rejects with { status, message, code, original } and has no
 * `response`. Every failure — wrong password, rate limit, network — rendered
 * the same "Failed to login". See #325.
 */

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

/** An error shaped the way the API client's interceptor produces them. */
function normalisedError({ status, code, message, data }) {
  const axiosError = new Error('Request failed');
  axiosError.response = { status, data };
  return { status, code, message, original: axiosError };
}

function renderLogin(login) {
  const value = {
    login,
    isAuthenticated: false,
    loading: false,
    user: null,
    register: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  };

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

async function submitCredentials(user) {
  await user.type(screen.getByLabelText('Email'), 'reader@example.com');
  await user.type(screen.getByLabelText('Password'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: /login/i }));
}

describe('Login', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it("shows the server's reason for rejecting the credentials", async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      normalisedError({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access. Please login again.',
        data: { message: 'Invalid email or password' },
      })
    );

    renderLogin(login);
    await submitCredentials(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.queryByText('Failed to login')).not.toBeInTheDocument();
  });

  it('tells the user they have been rate limited rather than that login "failed"', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      normalisedError({
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down and try again.',
        data: { message: 'Too many login attempts. Please try again in 15 minutes.' },
      })
    );

    renderLogin(login);
    await submitCredentials(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many login attempts. Please try again in 15 minutes.'
    );
  });

  it('reports a network failure as a network failure', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Network error. Please check your internet connection.',
      original: new Error('Network Error'),
    });

    renderLogin(login);
    await submitCredentials(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Network error. Please check your internet connection.'
    );
  });

  it('marks the offending field when the API returns field errors', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      normalisedError({
        status: 400,
        code: 'HTTP_ERROR',
        message: 'An unexpected error occurred.',
        data: {
          message: 'Validation failed',
          errors: [{ field: 'email', message: 'email must be a valid email address' }],
        },
      })
    );

    renderLogin(login);
    await submitCredentials(user);

    await screen.findByText('email must be a valid email address');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'false');
  });

  it('still has a fallback when the failure carries no message at all', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue({});

    renderLogin(login);
    await submitCredentials(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to login');
  });

  it('re-enables the submit button after a failure so the user can retry', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue(
      normalisedError({ status: 401, data: { message: 'Invalid email or password' } })
    );

    renderLogin(login);
    await submitCredentials(user);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled()
    );
  });

  it('navigates to the redirect target on success', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ user: { name: 'Reader' } });

    renderLogin(login);
    await submitCredentials(user);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
