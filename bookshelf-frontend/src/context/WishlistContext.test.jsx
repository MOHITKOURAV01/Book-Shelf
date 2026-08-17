import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WishlistProvider } from './WishlistContext.jsx';
import { AuthContext } from './AuthContext.jsx';
import { useWishlist } from '../hooks/useWishlist.js';
import wishlistService from '../services/wishlistService.js';

vi.mock('../services/wishlistService.js', () => ({
  default: {
    getWishlist: vi.fn(),
    toggleWishlist: vi.fn(),
    mergeWishlist: vi.fn(),
  },
}));

/**
 * Stands in for AuthProvider so a test can change who is signed in without
 * going through the API.
 */
function auth({ userId = null, loading = false } = {}) {
  return {
    user: userId ? { _id: userId, name: 'Test', email: 't@example.com' } : null,
    isAuthenticated: Boolean(userId),
    loading,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  };
}

function Probe() {
  const { wishlist, loading, count, isWishlisted, toggleWishlist } =
    useWishlist();

  return (
    <div>
      <span data-testid="ids">{wishlist.join(',')}</span>
      <span data-testid="count">{count}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="has-b1">{String(isWishlisted('b1'))}</span>
      <button onClick={() => toggleWishlist('b1')}>toggle b1</button>
      <button onClick={() => toggleWishlist('b9')}>toggle b9</button>
    </div>
  );
}

function renderWith(authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <WishlistProvider>
        <Probe />
      </WishlistProvider>
    </AuthContext.Provider>
  );
}

const ids = () => screen.getByTestId('ids').textContent;

/** A promise whose resolution the test controls. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('WishlistProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    wishlistService.getWishlist.mockResolvedValue([]);
    wishlistService.mergeWishlist.mockResolvedValue([]);
    wishlistService.toggleWishlist.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('while auth is still resolving', () => {
    it('shows nothing and asks for nothing', () => {
      renderWith(auth({ loading: true }));

      expect(ids()).toBe('');
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(wishlistService.getWishlist).not.toHaveBeenCalled();
    });

    it('ignores a toggle rather than guessing the identity', async () => {
      const user = userEvent.setup();
      renderWith(auth({ loading: true }));

      await user.click(screen.getByText('toggle b1'));

      expect(ids()).toBe('');
      expect(wishlistService.toggleWishlist).not.toHaveBeenCalled();
    });
  });

  describe('signed out', () => {
    it('reads the list from localStorage', async () => {
      window.localStorage.setItem('wishlist', JSON.stringify(['b1', 'b2']));

      renderWith(auth());

      await waitFor(() => expect(ids()).toBe('b1,b2'));
      expect(screen.getByTestId('count')).toHaveTextContent('2');
      expect(wishlistService.getWishlist).not.toHaveBeenCalled();
    });

    it('toggles locally and persists', async () => {
      const user = userEvent.setup();
      renderWith(auth());

      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      );

      await user.click(screen.getByText('toggle b1'));

      expect(ids()).toBe('b1');
      expect(JSON.parse(window.localStorage.getItem('wishlist'))).toEqual(['b1']);

      await user.click(screen.getByText('toggle b1'));

      expect(ids()).toBe('');
      expect(JSON.parse(window.localStorage.getItem('wishlist'))).toEqual([]);
    });

    it('survives junk in localStorage', async () => {
      window.localStorage.setItem('wishlist', 'not json at all');
      vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWith(auth());

      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      );
      expect(ids()).toBe('');
    });

    it('ignores non-string entries in a stored list', async () => {
      window.localStorage.setItem('wishlist', JSON.stringify(['b1', 42, null]));

      renderWith(auth());

      await waitFor(() => expect(ids()).toBe('b1'));
    });
  });

  describe('signed in', () => {
    it('loads from the API', async () => {
      wishlistService.getWishlist.mockResolvedValue(['b3']);

      renderWith(auth({ userId: 'user-a' }));

      await waitFor(() => expect(ids()).toBe('b3'));
    });

    it('merges a local list first, then applies the merged result', async () => {
      window.localStorage.setItem('wishlist', JSON.stringify(['b1']));
      wishlistService.mergeWishlist.mockResolvedValue(['b1', 'b3']);

      renderWith(auth({ userId: 'user-a' }));

      await waitFor(() => expect(ids()).toBe('b1,b3'));

      expect(wishlistService.mergeWishlist).toHaveBeenCalledWith(['b1']);
      // The merge replaces the load; there is no second request to race it.
      expect(wishlistService.getWishlist).not.toHaveBeenCalled();
      expect(window.localStorage.getItem('wishlist')).toBeNull();
    });

    it('keeps the local list when the merge fails', async () => {
      // AuthContext used to remove the key whether or not the request had
      // succeeded, so a failed merge lost the items outright.
      window.localStorage.setItem('wishlist', JSON.stringify(['b1']));
      wishlistService.mergeWishlist.mockRejectedValue(new Error('offline'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWith(auth({ userId: 'user-a' }));

      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      );

      expect(JSON.parse(window.localStorage.getItem('wishlist'))).toEqual(['b1']);
    });

    it('toggles through the API and takes the server list as the truth', async () => {
      const user = userEvent.setup();
      wishlistService.getWishlist.mockResolvedValue([]);
      wishlistService.toggleWishlist.mockResolvedValue(['b1']);

      renderWith(auth({ userId: 'user-a' }));

      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      );

      await user.click(screen.getByText('toggle b1'));

      await waitFor(() => expect(ids()).toBe('b1'));
      expect(wishlistService.toggleWishlist).toHaveBeenCalledWith('b1');
      // Nothing was written to localStorage for a signed-in user.
      expect(window.localStorage.getItem('wishlist')).toBeNull();
    });
  });

  /**
   * The reported bug, and the reason for the rewrite.
   */
  describe('when the session changes', () => {
    it('empties the list on logout', async () => {
      wishlistService.getWishlist.mockResolvedValue(['b1', 'b2']);

      const { rerender } = renderWith(auth({ userId: 'user-a' }));
      await waitFor(() => expect(ids()).toBe('b1,b2'));

      rerender(
        <AuthContext.Provider value={auth()}>
          <WishlistProvider>
            <Probe />
          </WishlistProvider>
        </AuthContext.Provider>
      );

      // Previously loadLocalWishlist returned early on an empty
      // localStorage, so setWishlist was never called and user A's books
      // stayed on screen while signed out.
      await waitFor(() => expect(ids()).toBe(''));
      expect(screen.getByTestId('has-b1')).toHaveTextContent('false');
    });

    it('does not show one user the previous user list, even for a moment', async () => {
      const pending = deferred();
      wishlistService.getWishlist.mockResolvedValueOnce(['b1', 'b2']);

      const { rerender } = renderWith(auth({ userId: 'user-a' }));
      await waitFor(() => expect(ids()).toBe('b1,b2'));

      wishlistService.getWishlist.mockReturnValueOnce(pending.promise);

      rerender(
        <AuthContext.Provider value={auth({ userId: 'user-b' })}>
          <WishlistProvider>
            <Probe />
          </WishlistProvider>
        </AuthContext.Provider>
      );

      // User B's request has not resolved yet. The list must already be
      // empty — this is the window in which a click used to write user A's
      // book id into user B's account.
      expect(ids()).toBe('');
      expect(screen.getByTestId('has-b1')).toHaveTextContent('false');

      await act(async () => {
        pending.resolve(['b7']);
      });

      await waitFor(() => expect(ids()).toBe('b7'));
    });

    it('does not leak the previous list when the new load fails', async () => {
      wishlistService.getWishlist.mockResolvedValueOnce(['b1', 'b2']);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const { rerender } = renderWith(auth({ userId: 'user-a' }));
      await waitFor(() => expect(ids()).toBe('b1,b2'));

      wishlistService.getWishlist.mockRejectedValueOnce(new Error('500'));

      rerender(
        <AuthContext.Provider value={auth({ userId: 'user-b' })}>
          <WishlistProvider>
            <Probe />
          </WishlistProvider>
        </AuthContext.Provider>
      );

      await waitFor(() =>
        expect(screen.getByTestId('loading')).toHaveTextContent('false')
      );

      // The old catch only logged, so user A's list was what user B saw for
      // the rest of the session.
      expect(ids()).toBe('');
    });

    it('drops a response that arrives after the identity moved on', async () => {
      const slow = deferred();
      wishlistService.getWishlist.mockReturnValueOnce(slow.promise);

      const { rerender } = renderWith(auth({ userId: 'user-a' }));

      wishlistService.getWishlist.mockResolvedValueOnce(['b7']);

      rerender(
        <AuthContext.Provider value={auth({ userId: 'user-b' })}>
          <WishlistProvider>
            <Probe />
          </WishlistProvider>
        </AuthContext.Provider>
      );

      await waitFor(() => expect(ids()).toBe('b7'));

      // User A's request finally lands. It must not overwrite user B.
      await act(async () => {
        slow.resolve(['b1', 'b2']);
      });

      expect(ids()).toBe('b7');
    });
  });
});

describe('useWishlist', () => {
  it('throws outside the provider instead of returning undefined', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow(/WishlistProvider/);

    consoleError.mockRestore();
  });
});
