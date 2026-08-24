import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import CartDrawer from './CartDrawer.jsx';
import { CartContext } from '../context/CartContext.jsx';

/**
 * The regression: the drawer rendered unconditionally and was hidden with a
 * CSS transform, so every page carried an `aria-modal` dialog and a run of
 * invisible tab stops. See #327.
 */

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

function makeCart(overrides = {}) {
  return {
    cart: [],
    isCartOpen: false,
    setIsCartOpen: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    maxQuantity: 10,
    ...overrides,
  };
}

function renderDrawer(value) {
  return render(
    <MemoryRouter>
      <CartContext.Provider value={value}>
        <button type="button">page button</button>
        <CartDrawer />
      </CartContext.Provider>
    </MemoryRouter>
  );
}

const twoItems = [
  { id: 'b1', title: 'The Quiet Ones', price: 349, quantity: 2 },
  { id: 'b2', title: 'Field Notes', price: 199, quantity: 1 },
];

describe('CartDrawer when closed', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('puts no dialog in the accessibility tree', () => {
    renderDrawer(makeCart({ cart: twoItems }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves no tab stops behind — this was the keyboard trap', () => {
    renderDrawer(makeCart({ cart: twoItems }));

    // Every control the closed drawer used to leave in the tab order.
    expect(screen.queryByRole('button', { name: 'Close cart drawer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear Cart' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Proceed to Checkout' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove The Quiet Ones from cart' })
    ).not.toBeInTheDocument();
  });

  it('does not lock the page scroll', () => {
    renderDrawer(makeCart({ cart: twoItems }));

    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('tabbing past the page content does not land inside the cart', async () => {
    const user = userEvent.setup();
    renderDrawer(makeCart({ cart: twoItems }));

    await user.tab();
    expect(screen.getByRole('button', { name: 'page button' })).toHaveFocus();

    await user.tab();
    // Nothing from the drawer to receive it.
    expect(document.body).toHaveFocus();
  });
});

describe('CartDrawer when open', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('renders the dialog with an accessible name', () => {
    renderDrawer(makeCart({ cart: twoItems, isCartOpen: true }));

    expect(screen.getByRole('dialog', { name: 'Your Cart' })).toBeInTheDocument();
  });

  it('moves focus into the dialog on open', () => {
    renderDrawer(makeCart({ cart: twoItems, isCartOpen: true }));

    expect(screen.getByRole('button', { name: 'Close cart drawer' })).toHaveFocus();
  });

  it('locks the page scroll while open', () => {
    renderDrawer(makeCart({ cart: twoItems, isCartOpen: true }));

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores the previous overflow rather than clobbering it with "unset"', () => {
    document.body.style.overflow = 'scroll';

    const { unmount } = renderDrawer(makeCart({ cart: twoItems, isCartOpen: true }));
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('scroll');

    document.body.style.overflow = '';
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const setIsCartOpen = vi.fn();

    renderDrawer(makeCart({ cart: twoItems, isCartOpen: true, setIsCartOpen }));
    await user.keyboard('{Escape}');

    expect(setIsCartOpen).toHaveBeenCalledWith(false);
  });

  it('wraps Tab from the last control back to the first', async () => {
    const user = userEvent.setup();
    renderDrawer(makeCart({ cart: [], isCartOpen: true }));

    // Empty cart: Close, then Start Shopping.
    const close = screen.getByRole('button', { name: 'Close cart drawer' });
    const shop = screen.getByRole('button', { name: 'Start Shopping' });

    expect(close).toHaveFocus();
    await user.tab();
    expect(shop).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });

  it('wraps Shift+Tab from the first control back to the last', async () => {
    const user = userEvent.setup();
    renderDrawer(makeCart({ cart: [], isCartOpen: true }));

    expect(screen.getByRole('button', { name: 'Close cart drawer' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Start Shopping' })).toHaveFocus();
  });

  it('trap boundaries follow the cart — the stale-NodeList bug', async () => {
    const user = userEvent.setup();

    // Rendered with two items, then re-rendered with one, the way removing a
    // line actually happens. The old trap cached its boundaries on open, so
    // `lastElement` became a detached node and Shift+Tab went nowhere.
    const { rerender } = render(
      <MemoryRouter>
        <CartContext.Provider value={makeCart({ cart: twoItems, isCartOpen: true })}>
          <CartDrawer />
        </CartContext.Provider>
      </MemoryRouter>
    );

    rerender(
      <MemoryRouter>
        <CartContext.Provider value={makeCart({ cart: [twoItems[0]], isCartOpen: true })}>
          <CartDrawer />
        </CartContext.Provider>
      </MemoryRouter>
    );

    const checkout = screen.getByRole('button', { name: 'Proceed to Checkout' });
    checkout.focus();
    expect(checkout).toHaveFocus();

    // Checkout is the last control; Tab must wrap to Close, not escape.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close cart drawer' })).toHaveFocus();
  });

  it('renders line totals and a subtotal', () => {
    renderDrawer(makeCart({ cart: twoItems, isCartOpen: true }));

    const list = screen.getByRole('list');
    // 349 x 2
    expect(within(list).getByText('₹698.00')).toBeInTheDocument();
    // 199 x 1 appears twice on that line: as the unit price and as the line
    // total. Both are correct; the assertion just has to allow for it.
    expect(within(list).getAllByText('₹199.00')).toHaveLength(2);
    // 349*2 + 199
    expect(screen.getByText('₹897.00')).toBeInTheDocument();
  });

  it('shows an em dash instead of throwing on a malformed price', () => {
    // A cart is restored from localStorage, so a price can be anything.
    renderDrawer(
      makeCart({ cart: [{ id: 'b1', title: 'Broken', price: 'free', quantity: 1 }], isCartOpen: true })
    );

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes and navigates to checkout', async () => {
    const user = userEvent.setup();
    const setIsCartOpen = vi.fn();

    renderDrawer(makeCart({ cart: twoItems, isCartOpen: true, setIsCartOpen }));
    await user.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));

    expect(setIsCartOpen).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith('/checkout');
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const setIsCartOpen = vi.fn();

    const { container } = renderDrawer(
      makeCart({ cart: twoItems, isCartOpen: true, setIsCartOpen })
    );

    await user.click(container.querySelector('.cart-drawer-backdrop'));
    expect(setIsCartOpen).toHaveBeenCalledWith(false);
  });
});
