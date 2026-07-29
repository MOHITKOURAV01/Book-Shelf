import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CartDrawer.css';

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem
}) {
  const drawerRef = useRef(null);
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trap focus (simple approach: just autofocus the close button when opened)
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const closeBtn = drawerRef.current.querySelector('.cart-drawer__close');
      if (closeBtn) closeBtn.focus();
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div 
        className={`cart-drawer-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        ref={drawerRef}
        className={`cart-drawer ${isOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
      >
        <div className="cart-drawer__header">
          <h2>Cart</h2>
          <button 
            className="cart-drawer__close" 
            onClick={onClose}
            aria-label="Close cart drawer"
          >
            ✕
          </button>
        </div>

        <div className="cart-drawer__content">
          {cart.length === 0 ? (
            <div className="cart-drawer__empty">
              <span className="cart-drawer__empty-icon" role="img" aria-label="Shopping bag">🛍️</span>
              <h3>Your cart is empty</h3>
              <p>Browse our collection and add your favorite books.</p>
              <button className="cart-drawer__shop-btn" onClick={onClose}>
                Start Shopping
              </button>
            </div>
          ) : (
            <ul className="cart-drawer__list">
              {cart.map((item) => (
                <li key={item.id} className="cart-drawer__item">
                  <img src={item.cover} alt={`Cover of ${item.title}`} className="cart-item__cover" />
                  
                  <div className="cart-item__details">
                    <h4 className="cart-item__title">{item.title}</h4>
                    <p className="cart-item__price">${item.price.toFixed(2)}</p>
                    
                    <div className="cart-item__actions">
                      <div className="cart-item__quantity">
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                        >
                          +
                        </button>
                      </div>
                      
                      <button 
                        className="cart-item__remove"
                        onClick={() => onRemoveItem(item.id)}
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        Remove
                      </button>
                    </div>
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
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <button 
              className="cart-drawer__checkout-btn"
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
