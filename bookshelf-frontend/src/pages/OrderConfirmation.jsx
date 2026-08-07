import React, { useEffect, useState } from 'react';
import { useStripe, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useSearchParams, Link } from 'react-router-dom';

const OrderConfirmationContent = () => {
  const stripe = useStripe();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState(null);

  const clientSecret = searchParams.get('payment_intent_client_secret');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!stripe || !clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent.status) {
        case 'succeeded':
          setMessage('Payment succeeded! Thank you for your order.');
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          break;
        default:
          setMessage('Something went wrong.');
          break;
      }
    });
  }, [stripe, clientSecret]);

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', background: '#fff', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#221e19', marginBottom: '1rem' }}>Order Confirmation</h2>
      {orderId && <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>Order ID: <strong>{orderId}</strong></p>}
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', fontWeight: 'bold' }}>{message || 'Checking payment status...'}</p>
      
      <Link to="/" style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--leather)', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
        Return to Home
      </Link>
    </div>
  );
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_stripe_key_123');

export default function OrderConfirmation() {
  return (
    <Elements stripe={stripePromise}>
      <OrderConfirmationContent />
    </Elements>
  );
}
