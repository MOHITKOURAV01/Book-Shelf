/**
 * Reading and writing the cart, defensively.
 *
 * CartContext initialised its state straight from localStorage:
 *
 *   const storedCart = localStorage.getItem('cart');
 *   return storedCart ? JSON.parse(storedCart) : [];
 *
 * with a try/catch that only covers JSON.parse *throwing*. Valid JSON that is
 * not a cart parses fine and is handed to useState — and `{}` is valid JSON.
 * CartDrawer then calls `cart.reduce(...)` on the first line of its render,
 * App renders CartDrawer on every route, and React unmounts the tree on an
 * uncaught render error. One bad value in storage and every page is blank,
 * with a reload no help because the value is still there.
 *
 * So: parsing is not validating. Nothing that comes out of localStorage is
 * trusted here — not the shape of the array, not the fields on each item, not
 * the types of those fields.
 *
 * A corrupt cart should cost the user their cart. It should not cost them the
 * site.
 */

export const CART_STORAGE_KEY = 'cart';

/** Matches the `max` QuantitySelector already enforces. */
export const MAX_QUANTITY = 99;

/**
 * A ceiling on distinct lines. There was none; the cart is written to
 * localStorage on every change, and storage quota is per origin, so an
 * unbounded cart eventually takes the quota down with it.
 */
export const MAX_CART_ITEMS = 100;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * A usable line quantity: a whole number from 1 to MAX_QUANTITY.
 *
 * `NaN` is the case worth naming. `updateQuantity`'s guard was
 * `if (newQuantity <= 0)`, and `NaN <= 0` is `false`, so NaN passed straight
 * through and was stored — after which every total in the app renders `NaN`,
 * and the value is persisted so a reload does not clear it. The drawer's +
 * button reaches this with `item.quantity + 1` whenever a stored item has no
 * quantity at all.
 */
export function isValidQuantity(value) {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 1;
}

/**
 * Coerce to a usable quantity, or null when there is nothing sensible to use.
 *
 * Returning null rather than defaulting to 1 lets the caller decide: reading
 * from storage drops the item, while an explicit updateQuantity(id, NaN) is
 * ignored so a stored good value is not replaced by a guess.
 */
export function clampQuantity(value) {
  const numeric = typeof value === 'string' ? Number(value) : value;

  if (!isFiniteNumber(numeric)) {
    return null;
  }

  const rounded = Math.floor(numeric);

  if (rounded < 1) {
    return null;
  }

  return Math.min(rounded, MAX_QUANTITY);
}

/**
 * Validate one cart line.
 *
 * Requires an id and a price, because both are load-bearing: `addToCart`
 * matches on `item.id === book.id`, so two items with `id: undefined` collapse
 * into one line, and `subtotal` multiplies by price. Everything else —
 * title, author, cover — is carried through untouched, so this does not have
 * to know the shape of a book.
 */
export function normaliseCartItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const id =
    typeof item.id === 'string'
      ? item.id.trim()
      : isFiniteNumber(item.id)
        ? String(item.id)
        : null;

  if (!id) {
    return null;
  }

  const price = typeof item.price === 'string' ? Number(item.price) : item.price;

  if (!isFiniteNumber(price) || price < 0) {
    return null;
  }

  const quantity = clampQuantity(item.quantity);

  if (quantity === null) {
    return null;
  }

  return { ...item, id, price, quantity };
}

/**
 * Turn anything at all into a cart.
 *
 * Reports what it threw away so the caller can say so once in the console
 * rather than failing silently — a cart that quietly loses a line is its own
 * kind of bug.
 */
export function normaliseCart(value) {
  if (!Array.isArray(value)) {
    return { items: [], dropped: value === undefined || value === null ? 0 : 1 };
  }

  const items = [];
  const seen = new Set();
  let dropped = 0;

  for (const entry of value) {
    const item = normaliseCartItem(entry);

    if (!item) {
      dropped += 1;
      continue;
    }

    // A duplicate id would give two lines the cart's own logic can never
    // separate: removeFromCart filters on id and would drop both.
    if (seen.has(item.id)) {
      dropped += 1;
      continue;
    }

    if (items.length >= MAX_CART_ITEMS) {
      dropped += 1;
      continue;
    }

    seen.add(item.id);
    items.push(item);
  }

  return { items, dropped };
}

/**
 * Read the cart. Never throws, and never returns a non-array.
 */
export function readCart(storage, logger = console) {
  let raw;

  try {
    raw = storage?.getItem(CART_STORAGE_KEY);
  } catch (error) {
    // Storage unavailable outright: Safari private browsing, site data
    // blocked. Not worth taking the page down for.
    logger.warn('[cart] localStorage is unavailable; starting with an empty cart.', error);
    return [];
  }

  if (!raw) {
    return [];
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logger.warn('[cart] stored cart is not valid JSON; discarding it.', error);
    return [];
  }

  const { items, dropped } = normaliseCart(parsed);

  if (dropped > 0) {
    logger.warn(
      `[cart] discarded ${dropped} unusable ${dropped === 1 ? 'entry' : 'entries'} ` +
        'from the stored cart.'
    );
  }

  return items;
}

/**
 * Write the cart. Returns false instead of throwing when it cannot.
 *
 * The old effect was a bare `localStorage.setItem(...)` with no try. setItem
 * throws QuotaExceededError when storage is full, and throws on *every* call
 * in Safari private browsing — and an exception from inside useEffect takes
 * the tree down exactly like a render error does. Adding an item to the cart
 * should not be able to blank the page.
 */
export function writeCart(storage, items, logger = console) {
  try {
    storage?.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    logger.warn(
      '[cart] could not save the cart; it will work for this session only.',
      error
    );
    return false;
  }
}

/** Total price of a cart. Safe against an empty or odd input. */
export function cartSubtotal(items) {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((sum, item) => {
    const line = (item?.price ?? 0) * (item?.quantity ?? 0);
    return sum + (Number.isFinite(line) ? line : 0);
  }, 0);
}

/** Total number of books, counting quantities. */
export function cartCount(items) {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((sum, item) => sum + (clampQuantity(item?.quantity) ?? 0), 0);
}
