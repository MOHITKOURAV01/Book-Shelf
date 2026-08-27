import { useEffect, useState } from 'react';
import { useStripe, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useSearchParams, Link } from 'react-router-dom';

import { useCart } from '../hooks/useCart.js';
import './Checkout.css';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

const STATUS_MESSAGES = {
  succeeded: 'Payment succeeded. Thank you for your order.',
  processing: 'Your payment is processing. We will email you when it settles.',
  requires_payment_method:
    'Your payment was not successful. Please try again with another method.',
};

const OrderConfirmationContent = () => {
  const stripe = useStripe();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [message, setMessage] = useState(null);

  const clientSecret = searchParams.get('payment_intent_client_secret');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!stripe || !clientSecret) {
      return;
    }

    let cancelled = false;

    stripe
      .retrievePaymentIntent(clientSecret)
      .then(({ paymentIntent, error }) => {
        if (cancelled) {
          return;
        }

        // retrievePaymentIntent resolves with an `error` and no intent when
        // the secret is stale or malformed. Reading `paymentIntent.status`
        // straight through threw a TypeError on that path.
        if (error || !paymentIntent) {
          setMessage(
            'We could not confirm this payment. Check your orders, or contact us before paying again.'
          );
          return;
        }

        setMessage(STATUS_MESSAGES[paymentIntent.status] ?? 'Something went wrong.');

        // Customers whose payment method redirected away never passed
        // through the in-page success branch, so their cart was still full
        // when they landed back here. See #315.
        if (
          paymentIntent.status === 'succeeded' ||
          paymentIntent.status === 'processing'
        ) {
          clearCart();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage('We could not reach the payment provider to confirm this order.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stripe, clientSecret, clearCart]);

  return (
    <main className="checkout">
      <div className="checkout__panel checkout__panel--message">
        <h1 className="checkout__title">Order confirmation</h1>

        {orderId && (
          <p>
            Order ID: <strong>{orderId}</strong>
          </p>
        )}

        <p role="status">
          {message ?? (clientSecret ? 'Checking payment status…' : 'No payment to confirm.')}
        </p>

        <Link className="checkout__link-btn" to="/">
          Return to the shop
        </Link>
      </div>
    </main>
  );
};

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function OrderConfirmation() {
  /*
   * On the outer component, not on OrderConfirmationContent — that one is
   * only mounted when Stripe is configured, and the "payments are not
   * configured" branch below is still a page that needs a name.
   */
  usePageMetadata({
    title: 'Order confirmation',
    description: 'Your BookShelf order confirmation and payment status.',
  });

  if (!stripePromise) {
    return (
      <main className="checkout">
        <div className="checkout__panel checkout__panel--message">
          <h1 className="checkout__title">Order confirmation</h1>
          <p>Payments are not configured for this deployment.</p>
          <Link className="checkout__link-btn" to="/">
            Return to the shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <OrderConfirmationContent />
    </Elements>
  );
}
