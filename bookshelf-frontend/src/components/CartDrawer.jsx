import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCart } from '../hooks/useCart.js';
import { useFocusTrap, useScrollLock } from '../hooks/useFocusTrap.js';
/*
 * `item.price.toFixed(2)` threw on anything that was not a number, and a cart
 * comes out of localStorage — see #309, where one malformed value took the
 * whole app down. `formatMoney` returns an em dash for an unusable amount.
 *
 * It was replaced by a local `₹${amount.toFixed(2)}` helper, which was the
 * third of four disagreeing money formatters in this app and the only one
 * that did no digit grouping — ₹1234.00 in the drawer for the same cart the
 * checkout summary showed as ₹1,234.00. See #335.
 */
import { formatMoney } from '../utils/currency.js';
import './CartDrawer.css';

/**
 * The cart, as a slide-over dialog.
 *
 * This component is mounted by the App layout on every route, and it used to
 * render its markup unconditionally — open and closed were a CSS distinction
 * only, with the panel pushed off-screen by a transform. That hid it from
 * sighted mouse users and from nobody else:
 *
 *   - `aria-modal="true"` was on an element present on every page, so a
 *     screen reader user landed on the site already inside a dialog called
 *     "Shopping Cart" that they had not opened, with the real page treated
 *     as background.
 *   - An off-screen transform does not remove anything from the tab order.
 *     Tabbing past the footer walked into the invisible drawer — Close, then
 *     every quantity control, every Remove, then Clear Cart and Proceed to
 *     Checkout. Focus vanished, and Enter could clear the cart or navigate
 *     to /checkout from a control the user could not see.
 *
 * Nothing renders when the cart is closed. See #327.
 */
export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const navigate = useNavigate();

  const closeCart = useCallback(() => setIsCartOpen(false), [setIsCartOpen]);

  const drawerRef = useFocusTrap({ active: isCartOpen, onEscape: closeCart });
  useScrollLock(isCartOpen);

  const handleStartShopping = () => {
    closeCart();
    navigate('/');
  };

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  if (!isCartOpen) {
    return null;
  }

  const subtotal = cart.reduce((sum, item) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);

    return Number.isFinite(price) && Number.isFinite(quantity)
      ? sum + price * quantity
      : sum;
  }, 0);

  return (
    <>
      <div className="cart-drawer-backdrop is-open" onClick={closeCart} aria-hidden="true" />

      <div
        ref={drawerRef}
        className="cart-drawer is-open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        // So the dialog can still receive focus if it somehow contains
        // nothing focusable; see useFocusTrap.
        tabIndex={-1}
      >
        <div className="cart-drawer__header">
          <h2 id="cart-drawer-title">Your Cart</h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={closeCart}
            aria-label="Close cart drawer"
          >
            ✕
          </button>
        </div>

        <div className="cart-drawer__content">
          {cart.length === 0 ? (
            <div className="cart-drawer__empty">
              <span className="cart-drawer__empty-icon" role="img" aria-label="Shopping bag">
                🛍️
              </span>
              <h3>Your cart is empty</h3>
              <p>Browse our collection and add your favorite books.</p>
              <button
                type="button"
                className="cart-drawer__shop-btn"
                onClick={handleStartShopping}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <ul className="cart-drawer__list">
              {cart.map((item) => (
                <li key={item.id} className="cart-drawer__item">
                  {item.cover && (
                    <img
                      src={item.cover}
                      alt={`Cover of ${item.title}`}
                      className="cart-item__cover"
                    />
                  )}
                  <div className="cart-item__details">
                    <h4 className="cart-item__title">{item.title}</h4>
                    <p className="cart-item__price">{formatMoney(item.price)}</p>

                    <div className="cart-item__actions">
                      <div className="cart-item__quantity">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-item__remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="cart-item__subtotal">
                    {formatMoney(lineTotal(item))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-drawer__subtotal">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            <div className="cart-drawer__footer-actions">
              <button type="button" className="cart-drawer__clear-btn" onClick={clearCart}>
                Clear Cart
              </button>
              <button
                type="button"
                className="cart-drawer__checkout-btn"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * What one line costs, or undefined when either half is unusable — so
 * `formatMoney` shows a dash rather than claiming the line was free.
 */
function lineTotal(item) {
  const price = Number(item?.price);
  const quantity = Number(item?.quantity);

  if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
    return undefined;
  }

  return price * quantity;
}
