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
import { useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import './CartDrawer.css';

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen } = useContext(CartContext);
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

      // Focus the first element when the drawer opens
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

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isCartOpen, setIsCartOpen]);

  return (
    <>
      <div className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)} />
      <div 
        className={`cart-drawer ${isCartOpen ? 'open' : ''}`} 
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your Cart"
      >
        <div className="cart-drawer-header">
          <h2>Your Cart</h2>
          <button className="cart-drawer-close" onClick={() => setIsCartOpen(false)} aria-label="Close cart">&times;</button>
        </div>
        
        <div className="cart-drawer-content">
          {!cart.length ? (
            <div className="cart-drawer-empty">
              <div className="cart-drawer-empty-icon">🛍️</div>
              <h3>Your cart is empty</h3>
              <p>Looks like you haven't added any books to your cart yet.</p>
              <button className="cart-drawer-empty-btn" onClick={handleStartShopping}>
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
            <ul className="cart-drawer-list">
              {cart.map((item) => (
                <li key={item.id} className="cart-drawer-item">
                  <div className="cart-drawer-item-details">
                    <h3 className="cart-drawer-item-title">{item.title}</h3>
                    <p className="cart-drawer-item-quantity">Quantity: {item.quantity}</p>
                    <p className="cart-drawer-item-price">Price: ₹{item.price}</p>
                  </div>
                  <div className="cart-drawer-item-subtotal">
                    ₹{item.price * item.quantity}
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
          <div className="cart-drawer-footer">
            <div className="cart-drawer-total">
              <span>Total:</span>
              <span>₹{total}</span>
            </div>
            <button 
              className="cart-drawer-checkout-btn" 
              onClick={handleCheckout} 
              style={{
                width: '100%', 
                marginTop: '15px', 
                padding: '12px', 
                border: 'none', 
                borderRadius: '6px', 
                fontSize: '1rem', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                backgroundColor: 'var(--primary-color)', 
                color: 'white',
                transition: 'background-color 0.3s ease'
              }}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
