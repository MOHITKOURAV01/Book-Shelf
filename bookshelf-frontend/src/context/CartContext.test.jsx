import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CartProvider } from './CartContext.jsx';
import { useCart } from '../hooks/useCart.js';
import { CART_STORAGE_KEY, MAX_QUANTITY } from '../utils/cartStorage.js';

/**
 * Stands in for the parts of CartDrawer and Navbar that matter here.
 * `cart.reduce` on the first line is deliberate: that is exactly what
 * CartDrawer does, and it is what threw when the stored cart was not an array.
 */
function CartProbe() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div>
      <span data-testid="count">{cart.length}</span>
      <span data-testid="subtotal">{String(subtotal)}</span>
      <span data-testid="ids">{cart.map((item) => `${item.id}:${item.quantity}`).join(',')}</span>

      <button onClick={() => addToCart({ id: 'b1', title: 'One', price: 10 })}>add b1</button>
      <button onClick={() => addToCart({ title: 'No id', price: 10 })}>add broken</button>
      <button onClick={() => updateQuantity('b1', Number.NaN)}>set NaN</button>
      <button onClick={() => updateQuantity('b1', 5)}>set 5</button>
      <button onClick={() => updateQuantity('b1', 0)}>set 0</button>
      <button onClick={() => updateQuantity('b1', 100000)}>set huge</button>
      <button onClick={() => removeFromCart('b1')}>remove b1</button>
      <button onClick={clearCart}>clear</button>
    </div>
  );
}

function renderCart() {
  return render(
    <CartProvider>
      <CartProbe />
    </CartProvider>
  );
}

let warnSpy;

beforeEach(() => {
  localStorage.clear();
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  localStorage.clear();
});

describe('loading a cart from localStorage', () => {
  it('loads a valid cart', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ id: 'b1', title: 'One', price: 10, quantity: 2 }])
    );

    renderCart();

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('subtotal')).toHaveTextContent('20');
  });

  it('does not crash when the stored cart is an object', () => {
    // The reported bug. `{}` is valid JSON, so the old try/catch never fired,
    // and `cart.reduce` threw on the first line of CartDrawer's render — on
    // every route, because App mounts CartDrawer everywhere.
    localStorage.setItem(CART_STORAGE_KEY, '{}');

    expect(() => renderCart()).not.toThrow();
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('does not crash on any of the other shapes that parse', () => {
    for (const raw of ['"hello"', '42', 'null', 'true', '[1,2,3]']) {
      localStorage.setItem(CART_STORAGE_KEY, raw);

      const { unmount } = renderCart();
      expect(screen.getByTestId('count')).toHaveTextContent('0');
      unmount();
    }
  });

  it('does not crash on malformed JSON', () => {
    localStorage.setItem(CART_STORAGE_KEY, '{not json');

    expect(() => renderCart()).not.toThrow();
  });

  it('drops an item with no quantity instead of producing a NaN subtotal', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ id: 'b1', title: 'One', price: 10 }])
    );

    renderCart();

    expect(screen.getByTestId('subtotal')).toHaveTextContent('0');
    expect(screen.getByTestId('subtotal')).not.toHaveTextContent('NaN');
  });

  it('keeps the good entries from a partly bad cart', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ id: 'b1', price: 10, quantity: 1 }, 'junk', { nope: true }])
    );

    renderCart();

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

describe('addToCart', () => {
  it('adds a book and persists it', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText('add b1'));

    expect(screen.getByTestId('ids')).toHaveTextContent('b1:1');
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY))).toHaveLength(1);
  });

  it('increments an existing line rather than duplicating it', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText('add b1'));
    await user.click(screen.getByText('add b1'));

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('ids')).toHaveTextContent('b1:2');
  });

  it('refuses a book with no id', async () => {
    // Two items with `id: undefined` matched each other, so different books
    // collapsed into a single line.
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText('add broken'));

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('updateQuantity', () => {
  it('sets a valid quantity', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText('add b1'));
    await user.click(screen.getByText('set 5'));

    expect(screen.getByTestId('ids')).toHaveTextContent('b1:5');
  });

  it('ignores NaN instead of storing it', async () => {
    // `NaN <= 0` is false, so NaN passed the old guard and was stored. Every
    // total then rendered NaN, and it survived a reload because it was
    // persisted.
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText('add b1'));
    await user.click(screen.getByText('set NaN'));

    expect(screen.getByTestId('ids')).toHaveTextContent('b1:1');
    expect(screen.getByTestId('subtotal')).toHaveTextContent('10');
    expect(screen.getByTestId('subtotal')).not.toHaveTextContent('NaN');
  });

  it('removes the line when the quantity reaches zero', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText('add b1'));
    await user.click(screen.getByText('set 0'));

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('caps an absurd quantity', async () => {
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByText('add b1'));
    await user.click(screen.getByText('set huge'));

    expect(screen.getByTestId('ids')).toHaveTextContent(`b1:${MAX_QUANTITY}`);
  });
});

describe('persistence', () => {
  it('survives a remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderCart();

    await user.click(screen.getByText('add b1'));
    await user.click(screen.getByText('set 5'));
    unmount();

    renderCart();
    expect(screen.getByTestId('ids')).toHaveTextContent('b1:5');
  });

  it('does not crash when writing to storage fails', async () => {
    // Safari private browsing throws on every setItem; a full quota throws
    // once. Either way the old bare setItem threw out of useEffect.
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

    try {
      const user = userEvent.setup();
      renderCart();

      await user.click(screen.getByText('add b1'));

      // Still works in memory.
      expect(screen.getByTestId('ids')).toHaveTextContent('b1:1');
    } finally {
      setItem.mockRestore();
    }
  });
});

describe('cross-tab sync', () => {
  it('picks up a cart written by another tab', () => {
    renderCart();
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    act(() => {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify([{ id: 'b9', price: 3, quantity: 4 }])
      );
      window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
    });

    expect(screen.getByTestId('ids')).toHaveTextContent('b9:4');
  });

  it('ignores an unrelated storage key', () => {
    renderCart();

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('re-validates what the other tab wrote', () => {
    // An older build in another tab could have written anything.
    renderCart();

    act(() => {
      localStorage.setItem(CART_STORAGE_KEY, '{}');
      window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});
