import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';

/**
 * The Stripe payment step.
 *
 * Two things were wrong here (#315).
 *
 * First, the result of `confirmPayment` was read as `const { error } = …` and
 * then dereferenced immediately:
 *
 *     if (error.type === 'card_error' || error.type === 'validation_error')
 *
 * `confirmPayment` resolves with an object that has *no* `error` property
 * whenever the payment did not fail — which is the successful path. That line
 * threw `TypeError: Cannot read properties of undefined (reading 'type')`, so
 * the component that a customer sees immediately after paying was the one
 * guaranteed to crash.
 *
 * Second, nothing emptied the cart. A customer who paid came back to a full
 * cart and could pay for the same books again.
 *
 * `redirect: 'if_required'` is what makes the second fixable: card payments
 * that need no 3-D Secure step resolve here rather than navigating away, so
 * there is a moment in which the success is known and the cart can be
 * cleared. Payment methods that *do* redirect still leave via `return_url`.
 */
const CheckoutForm = ({ orderId, onPaid, onNavigate }) => {
  const stripe = useStripe();
  const elements = useElements();
  const routerNavigate = useNavigate();
  const navigate = onNavigate ?? routerNavigate;

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const confirmationPath = orderId
    ? `/order-confirmation?orderId=${encodeURIComponent(orderId)}`
    : '/order-confirmation';

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not finished loading.
      return;
    }

    setIsLoading(true);
    setMessage(null);

    let result;

    try {
      result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${confirmationPath}`,
        },
        redirect: 'if_required',
      });
    } catch (thrown) {
      // confirmPayment rejects rather than resolving when Stripe.js itself
      // fails — a blocked network, mostly. Without this the rejection is
      // unhandled and the button stays disabled forever.
      console.error('[checkout] confirmPayment threw:', thrown);
      setMessage('We could not reach the payment provider. Please try again.');
      setIsLoading(false);
      return;
    }

    const { error, paymentIntent } = result ?? {};

    if (error) {
      // card_error and validation_error carry a message written for the
      // customer. Anything else is ours to explain, not Stripe's.
      setMessage(
        error.type === 'card_error' || error.type === 'validation_error'
          ? error.message
          : 'An unexpected error occurred. Your card has not been charged.'
      );
      setIsLoading(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onPaid?.(paymentIntent);
      navigate(confirmationPath, { replace: true });
      return;
    }

    if (paymentIntent?.status === 'processing') {
      // Asynchronous methods settle later. The order exists and the webhook
      // will finish it, so the cart is done with either way.
      onPaid?.(paymentIntent);
      navigate(confirmationPath, { replace: true });
      return;
    }

    if (paymentIntent?.status === 'requires_payment_method') {
      setMessage('That payment did not go through. Please try another method.');
      setIsLoading(false);
      return;
    }

    // No error, no intent: Stripe has redirected, or is about to. Leave the
    // button disabled rather than inviting a second confirmation.
    setIsLoading(false);
  };

  return (
    <form
      id="payment-form"
      onSubmit={handleSubmit}
      className="checkout__payment-form"
    >
      <PaymentElement id="payment-element" />

      <button
        className="checkout__submit"
        disabled={isLoading || !stripe || !elements}
        id="submit"
        type="submit"
      >
        {isLoading ? 'Processing…' : 'Pay now'}
      </button>

      {message && (
        <div id="payment-message" className="checkout__error" role="alert">
          {message}
        </div>
      )}
    </form>
  );
};

export default CheckoutForm;
