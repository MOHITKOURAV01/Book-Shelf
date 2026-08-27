import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useCart } from '../hooks/useCart.js';
import { useFocusTrap, useScrollLock } from '../hooks/useFocusTrap.js';
import { formatMoney } from '../utils/currency.js';
import './CartDrawer.css';

export default function CartDrawer() {
  const { t } = useTranslation();
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
        tabIndex={-1}
      >
        <div className="cart-drawer__header">
          <h2 id="cart-drawer-title">{t('cart.title', 'Your Cart')}</h2>
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
              <h3>{t('cart.emptyTitle', 'Your cart is empty')}</h3>
              <p>{t('cart.emptySubtitle', 'Browse our collection and add your favorite books.')}</p>
              <button
                type="button"
                className="cart-drawer__shop-btn"
                onClick={handleStartShopping}
              >
                {t('cart.continueShopping', 'Start Shopping')}
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
                        {t('cart.remove', 'Remove')}
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
              <span>{t('cart.subtotal', 'Subtotal')}</span>
              <span>{formatMoney(subtotal)}</span>
            </div>

            <div className="cart-drawer__footer-actions">
              <button type="button" className="cart-drawer__clear-btn" onClick={clearCart}>
                {t('cart.clearCart', 'Clear Cart')}
              </button>
              <button
                type="button"
                className="cart-drawer__checkout-btn"
                onClick={handleCheckout}
              >
                {t('cart.checkout', 'Proceed to Checkout')}
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
