import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CheckoutGateway from '../components/CheckoutGateway';
import GuestCheckoutForm from '../components/GuestCheckoutForm';
import './Checkout.css';

export default function Checkout() {
  const [checkoutStep, setCheckoutStep] = useState('gateway'); // 'gateway', 'form', 'success'

  const handleProceedToGuest = () => {
    setCheckoutStep('form');
  };

  const handleProceedToAuth = () => {
    // If we had an authenticated checkout form, we'd go there.
    // For this mock, we'll just go straight to the form step since the guest form can be reused or skipped if they already have saved addresses.
    setCheckoutStep('form');
  };

  const handleOrderComplete = () => {
    setCheckoutStep('success');
  };

  return (
    <div className="checkout-page">
      <Navbar cartCount={0} onCartClick={() => {}} />
      <div className="nav-spacer" />
      
      <main className="checkout-main">
        {checkoutStep === 'gateway' && (
          <CheckoutGateway 
            onProceedToGuest={handleProceedToGuest} 
            onProceedToAuth={handleProceedToAuth} 
          />
        )}
        
        {checkoutStep === 'form' && (
          <GuestCheckoutForm onOrderComplete={handleOrderComplete} />
        )}
        
        {checkoutStep === 'success' && (
          <div className="checkout-success">
            <h2>Order Placed Successfully!</h2>
            <p>Thank you for your purchase.</p>
            <button className="btn-primary" onClick={() => window.location.href = '/'}>
              Return to Home
            </button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
