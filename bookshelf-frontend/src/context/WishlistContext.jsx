import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import wishlistService from '../services/wishlistService.js';
import { AuthContext } from './AuthContext.jsx';

/**
 * The wishlist, for whoever is signed in right now.
 *
 * The bug this rewrite exists to close: the provider never cleared its state
 * when the session ended. `loadLocalWishlist` returned early when
 * localStorage was empty — which it always is after a login, because the
 * merge removes the key — so `setWishlist` was simply never called on the way
 * out. The signed-out user's books stayed on screen, their hearts stayed
 * filled, and the next person to sign in on that browser saw them until a
 * network round trip happened to overwrite them. Click a heart inside that
 * window and one user's book id was written to another user's account. See
 * #299.
 *
 * Two rules keep it closed:
 *
 *   1. State is keyed to an identity. The moment the identity changes the
 *      list is emptied, synchronously, before any request is issued. No state
 *      ever spans two users.
 *   2. Every async load carries the identity it was started for. A response
 *      that arrives after the identity has moved on is dropped rather than
 *      applied.
 */

export const WishlistContext = createContext(undefined);

const STORAGE_KEY = 'wishlist';

/** Signed out is an identity too, and a distinct one from "not resolved yet". */
const ANONYMOUS = 'anonymous';

/**
 * localStorage throws in Safari private browsing and wherever storage is
 * blocked. A wishlist is not worth crashing the app over.
 */
function readLocalWishlist() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    // Anything can be in localStorage — another tab, an older version of the
    // app, a user with devtools open.
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === 'string')
      : [];
  } catch (error) {
    console.error('[wishlist] could not read the local wishlist:', error);
    return [];
  }
}

function writeLocalWishlist(bookIds) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookIds));
  } catch (error) {
    console.error('[wishlist] could not save the local wishlist:', error);
  }
}

function clearLocalWishlist() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[wishlist] could not clear the local wishlist:', error);
  }
}

/** The API returns an array of ids; be defensive about what actually arrives. */
function asBookIds(value) {
  return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
}

export const WishlistProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useContext(AuthContext);

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Who the current list belongs to. A user id when signed in, ANONYMOUS when
   * signed out, null while auth is still resolving.
   */
  const identity = authLoading
    ? null
    : isAuthenticated && user?._id
      ? String(user._id)
      : ANONYMOUS;

  /**
   * Bumped every time a load starts. An in-flight response compares against
   * it and drops itself if it lost the race — otherwise a slow response for
   * user A can land after user B has signed in and overwrite their list.
   */
  const loadIdRef = useRef(0);

  /** The identity the current state belongs to, for toggleWishlist to check. */
  const identityRef = useRef(identity);
  identityRef.current = identity;

  useEffect(() => {
    if (identity === null) {
      // Auth has not resolved yet. Nothing is known, so nothing is shown.
      return undefined;
    }

    const loadId = loadIdRef.current + 1;
    loadIdRef.current = loadId;

    // Clear first, synchronously. This is the fix: whatever the previous
    // identity had is gone before a single byte is requested for the new one,
    // so there is no window in which one user sees another's list.
    setWishlist([]);
    setLoading(true);

    let cancelled = false;
    const isCurrent = () => !cancelled && loadIdRef.current === loadId;

    async function load() {
      if (identity === ANONYMOUS) {
        if (isCurrent()) {
          setWishlist(readLocalWishlist());
          setLoading(false);
        }
        return;
      }

      const local = readLocalWishlist();

      try {
        // Merge before loading, in that order, awaited. Previously
        // AuthContext fired the merge while this effect fired the load, in
        // the same tick, with no ordering between them — so the GET usually
        // won and came back without the just-merged items, which then only
        // appeared after a full reload.
        const data =
          local.length > 0
            ? await wishlistService.mergeWishlist(local)
            : await wishlistService.getWishlist();

        if (!isCurrent()) {
          return;
        }

        setWishlist(asBookIds(data));

        // Only once the server has acknowledged the merge. Clearing it
        // first — which is what AuthContext did, in a block that ran whether
        // or not the request had succeeded — loses the items outright if the
        // merge fails.
        if (local.length > 0) {
          clearLocalWishlist();
        }
      } catch (error) {
        console.error('[wishlist] could not load the wishlist:', error);

        if (isCurrent()) {
          // Deliberately not falling back to `local`: showing a signed-in
          // user a list that is not theirs is the failure being fixed. An
          // empty list is wrong but honest, and the local copy is still in
          // storage to be merged on the next successful load.
          setWishlist([]);
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [identity]);

  const toggleWishlist = useCallback(async (bookId) => {
    if (typeof bookId !== 'string' || bookId === '') {
      return;
    }

    const identityAtCall = identityRef.current;

    if (identityAtCall === null) {
      // Auth has not resolved. Acting now would write to whichever identity
      // turns out to be current, which is the bug in miniature.
      return;
    }

    if (identityAtCall === ANONYMOUS) {
      setWishlist((previous) => {
        const next = previous.includes(bookId)
          ? previous.filter((id) => id !== bookId)
          : [...previous, bookId];

        writeLocalWishlist(next);
        return next;
      });
      return;
    }

    try {
      const data = await wishlistService.toggleWishlist(bookId);

      // The session can end mid-request. Applying the response then would put
      // the previous user's list back on screen.
      if (identityRef.current !== identityAtCall) {
        return;
      }

      setWishlist(asBookIds(data));
    } catch (error) {
      console.error('[wishlist] could not update the wishlist:', error);
    }
  }, []);

  const isWishlisted = useCallback(
    (bookId) => wishlist.includes(bookId),
    [wishlist]
  );

  const value = useMemo(
    () => ({
      wishlist,
      loading,
      toggleWishlist,
      isWishlisted,
      count: wishlist.length,
    }),
    [wishlist, loading, toggleWishlist, isWishlisted]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistProvider;
