import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import paymentService from '../services/paymentService.js';
import CheckoutForm from '../components/CheckoutForm.jsx';

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_stripe_key_123');

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    // In a real app, you would pass the actual cart items here
    const fetchPaymentIntent = async () => {
      try {
        const data = await paymentService.createPaymentIntent({
          items: [{ id: 'book-1', title: 'Sample Book', price: 19.99, quantity: 1 }],
          shippingAddress: {
            name: 'Jane Doe',
            address: '123 Main St',
            city: 'Anytown',
            postalCode: '12345',
            country: 'US'
          }
        });
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
      } catch (error) {
        console.error("Failed to initialize checkout:", error);
      }
    };
    fetchPaymentIntent();
  }, []);

  const appearance = {
    theme: 'stripe',
  };
  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="checkout-page" style={{ maxWidth: '500px', margin: '4rem auto', padding: '2rem', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#221e19' }}>Secure Checkout</h2>
      {clientSecret ? (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm orderId={orderId} />
        </Elements>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading checkout...</div>
      )}
    </div>
  );
}
