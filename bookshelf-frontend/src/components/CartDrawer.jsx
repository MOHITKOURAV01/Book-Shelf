import { useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import './CartDrawer.css';

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleStartShopping = () => {
    setIsCartOpen(false);
    navigate('/');
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  useEffect(() => {
    if (isCartOpen) {
      previousFocusRef.current = document.activeElement;
      
      const focusableElements = drawerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus the first element (close button usually)
      if (firstElement) {
        firstElement.focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setIsCartOpen(false);
          return;
        }

        if (e.key === 'Tab') {
          if (focusableElements.length === 0) {
            e.preventDefault();
            return;
          }

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isCartOpen, setIsCartOpen]);

  return (
    <>
      <div 
        className={`cart-drawer-backdrop ${isCartOpen ? 'is-open' : ''}`} 
        onClick={() => setIsCartOpen(false)} 
        aria-hidden="true"
      />
      
      <div 
        ref={drawerRef}
        className={`cart-drawer ${isCartOpen ? 'is-open' : ''}`} 
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
      >
        <div className="cart-drawer__header">
          <h2>Your Cart</h2>
          <button 
            className="cart-drawer__close" 
            onClick={() => setIsCartOpen(false)} 
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
              <button className="cart-drawer__shop-btn" onClick={handleStartShopping}>
                Start Shopping
              </button>
            </div>
          ) : (
            <ul className="cart-drawer__list">
              {cart.map((item) => (
                <li key={item.id} className="cart-drawer__item">
                  {item.cover && (
                    <img src={item.cover} alt={`Cover of ${item.title}`} className="cart-item__cover" />
                  )}
                  <div className="cart-item__details">
                    <h4 className="cart-item__title">{item.title}</h4>
                    <p className="cart-item__price">₹{item.price.toFixed(2)}</p>
                    
                    <div className="cart-item__actions">
                      <div className="cart-item__quantity">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                        >
                          +
                        </button>
                      </div>
                      
                      <button 
                        className="cart-item__remove"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="cart-item__subtotal">
                    ₹{(item.price * item.quantity).toFixed(2)}
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
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="cart-drawer__footer-actions">
              <button className="cart-drawer__clear-btn" onClick={clearCart}>
                Clear Cart
              </button>
              <button className="cart-drawer__checkout-btn" onClick={handleCheckout}>
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
