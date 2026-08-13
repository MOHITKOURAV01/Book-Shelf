import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider } from '../context/CartContext.jsx';
import { useCart } from './useCart.js';

function CartProbe() {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } =
    useCart();

  const book = { id: 'b1', title: 'The Quiet Ones', price: 349 };

  return (
    <div>
      <span data-testid="count">{cart.length}</span>
      <span data-testid="qty">{cart[0]?.quantity ?? 0}</span>
      <button onClick={() => addToCart(book)}>add</button>
      <button onClick={() => updateQuantity('b1', 5)}>set-five</button>
      <button onClick={() => updateQuantity('b1', 0)}>set-zero</button>
      <button onClick={() => removeFromCart('b1')}>remove</button>
      <button onClick={clearCart}>clear</button>
    </div>
  );
}

describe('useCart', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a message naming the missing provider when used outside CartProvider', () => {
    // React logs the error boundary trace; silence it so the run stays readable.
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => render(<CartProbe />)).toThrow(/must be used inside a <CartProvider>/);

    consoleError.mockRestore();
  });

  it('exposes the cart when rendered inside CartProvider', () => {
    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('adds a book and increments quantity on a repeat add', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await user.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('qty')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('qty')).toHaveTextContent('2');
  });

  it('drops the line item when the quantity is set to zero', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await user.click(screen.getByRole('button', { name: 'add' }));
    await user.click(screen.getByRole('button', { name: 'set-five' }));
    expect(screen.getByTestId('qty')).toHaveTextContent('5');

    await user.click(screen.getByRole('button', { name: 'set-zero' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('persists the cart to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    await user.click(screen.getByRole('button', { name: 'add' }));

    const stored = JSON.parse(window.localStorage.getItem('cart'));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('b1');
  });

  it('recovers from unparseable localStorage instead of crashing', () => {
    window.localStorage.setItem('cart', 'not json');
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <CartProvider>
        <CartProbe />
      </CartProvider>
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    consoleError.mockRestore();
  });
});
