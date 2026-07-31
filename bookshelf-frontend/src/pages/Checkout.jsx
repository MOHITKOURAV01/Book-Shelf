import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext.jsx';
import { saveOrder } from '../utils/orderStorage.js';
import './Checkout.css';

export default function Checkout() {
  const { cart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'India',
  });

  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [shippingError, setShippingError] = useState('');

  // Redirect to home if the cart is empty (and we haven't just placed an order)
  useEffect(() => {
    if (cart.length === 0 && !isSuccess) {
      navigate('/');
    }
  }, [cart, navigate, isSuccess]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleShippingChange = (e) => {
    setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
    if (shippingError) setShippingError('');
  };

  const nextStep = () => {
    if (step === 1) {
      const { fullName, address, city, zipCode } = shippingDetails;
      if (!fullName.trim() || !address.trim() || !city.trim() || !zipCode.trim()) {
        setShippingError('Please fill out all required shipping fields.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => s - 1);

  const handlePlaceOrder = () => {
    // Build and persist the order before clearing the cart
    const saved = saveOrder({
      items: cart,
      total,
      paymentMethod,
      shippingDetails,
    });
    setPlacedOrder(saved);
    clearCart();
    setIsSuccess(true);
  };

  // ── Success screen ────────────────────────────────────────────────────
  if (isSuccess && placedOrder) {
    return (
      <div className="checkout-container checkout-success">
        <div className="checkout-success__icon">✓</div>
        <h2 className="checkout-success__title">Order Placed!</h2>
        <p className="checkout-success__body">
          Thank you, <strong>{placedOrder.shippingDetails.fullName}</strong>. Your order{' '}
          <strong>{placedOrder.id}</strong> has been confirmed and will be shipped to{' '}
          {placedOrder.shippingDetails.city} soon.
        </p>
        <div className="checkout-success__summary">
          {placedOrder.items.map((item) => (
            <div key={item.id} className="checkout-success__item">
              <span>{item.title} × {item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="checkout-success__total">
            <span>Total paid</span>
            <span>₹{placedOrder.total}</span>
          </div>
        </div>
        <div className="checkout-success__actions">
          <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
            View Order History
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  // ── Multi-step checkout ───────────────────────────────────────────────
  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Checkout</h1>
        <div className="checkout-steps">
          <span className={`step-indicator ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            1. Shipping
          </span>
          <span className={`step-indicator ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            2. Payment
          </span>
          <span className={`step-indicator ${step >= 3 ? 'active' : ''}`}>
            3. Review
          </span>
        </div>
      </div>

      {/* ── Step 1: Shipping ──────────────────────────────────────── */}
      {step === 1 && (
        <div className="checkout-form-container">
          <h2>Shipping Details</h2>
          {shippingError && (
            <p className="checkout-field-error">{shippingError}</p>
          )}
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text" id="fullName" name="fullName"
                value={shippingDetails.fullName}
                onChange={handleShippingChange}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                type="text" id="address" name="address"
                value={shippingDetails.address}
                onChange={handleShippingChange}
                placeholder="123 Book Street"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text" id="city" name="city"
                  value={shippingDetails.city}
                  onChange={handleShippingChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="zipCode">Zip / PIN Code</label>
                <input
                  type="text" id="zipCode" name="zipCode"
                  value={shippingDetails.zipCode}
                  onChange={handleShippingChange}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="country">Country</label>
              <select id="country" name="country" value={shippingDetails.country} onChange={handleShippingChange}>
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
            <div className="checkout-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
              <button type="submit" className="btn btn-primary">Proceed to Payment</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Payment ───────────────────────────────────────── */}
      {step === 2 && (
        <div className="checkout-form-container">
          <h2>Payment Method</h2>
          <div className="payment-options">
            <label className="payment-option">
              <input type="radio" name="payment" value="credit-card"
                checked={paymentMethod === 'credit-card'}
                onChange={() => setPaymentMethod('credit-card')} />
              Credit / Debit Card
            </label>
            <label className="payment-option">
              <input type="radio" name="payment" value="upi"
                checked={paymentMethod === 'upi'}
                onChange={() => setPaymentMethod('upi')} />
              UPI (Google Pay, PhonePe, Paytm)
            </label>
            <label className="payment-option">
              <input type="radio" name="payment" value="cod"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')} />
              Cash on Delivery (COD)
            </label>
          </div>
          <div className="checkout-actions">
            <button className="btn btn-secondary" onClick={prevStep}>Back</button>
            <button className="btn btn-primary" onClick={nextStep}>Review Order</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="checkout-form-container">
          <h2>Order Review</h2>
          <div className="order-review">
            {cart.map((item) => (
              <div key={item.id} className="review-item">
                <div className="review-item-details">
                  <h4>{item.title}</h4>
                  <p>by {item.author} &nbsp;·&nbsp; Qty: {item.quantity}</p>
                </div>
                <div className="review-item-price">₹{item.price * item.quantity}</div>
              </div>
            ))}
            <div className="review-shipping-info">
              <p>Ship to: <strong>{shippingDetails.fullName}</strong>, {shippingDetails.city}, {shippingDetails.country}</p>
              <p>Payment: <strong>{paymentMethod === 'credit-card' ? 'Credit/Debit Card' : paymentMethod === 'upi' ? 'UPI' : 'Cash on Delivery'}</strong></p>
            </div>
            <div className="review-total">
              <span>Total to Pay:</span>
              <span>₹{total}</span>
            </div>
          </div>
          <div className="checkout-actions">
            <button className="btn btn-secondary" onClick={prevStep}>Back</button>
            <button className="btn btn-primary" onClick={handlePlaceOrder}>Place Order</button>
          </div>
        </div>
      )}
    </div>
  );
}
