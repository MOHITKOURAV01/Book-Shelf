import { useEffect } from 'react';
import './CheckoutGateway.css';

export default function CheckoutGateway({ onProceedToGuest, onProceedToAuth }) {
  useEffect(() => {
    // Automatically skip the gateway if the user is authenticated
    const isAuth = localStorage.getItem('isAuthenticated');
    if (isAuth) {
      onProceedToAuth();
    }
  }, [onProceedToAuth]);

  return (
    <div className="checkout-gateway">
      <div className="checkout-gateway__inner">
        <h2 className="checkout-gateway__title">Checkout</h2>
        <p className="checkout-gateway__subtitle">Choose how you would like to proceed with your order.</p>
        
        <div className="checkout-gateway__options">
          <div className="checkout-gateway__option">
            <h3>Already have an account?</h3>
            <p>Log in for faster checkout and to track your order history.</p>
            <button className="btn-primary" onClick={() => window.location.href = '/login'}>
              Log In
            </button>
          </div>
          
          <div className="checkout-gateway__divider">OR</div>
          
          <div className="checkout-gateway__option">
            <h3>New here?</h3>
            <p>Create an account to save your details for future purchases.</p>
            <button className="btn-secondary" onClick={() => window.location.href = '/signup'}>
              Create Account
            </button>
          </div>
          
          <div className="checkout-gateway__divider">OR</div>
          
          <div className="checkout-gateway__option">
            <h3>Fast checkout without creating an account</h3>
            <p>You can complete your purchase as a guest. No account required.</p>
            <button className="btn-secondary" onClick={onProceedToGuest}>
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
