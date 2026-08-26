import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

import paymentService from '../services/paymentService.js';
import CheckoutForm from '../components/CheckoutForm.jsx';
import { useCart } from '../hooks/useCart.js';
import {
  ADDRESS_FIELDS,
  EMPTY_ADDRESS,
  cartSubtotal,
  countItems,
  describeCheckoutError,
  normaliseAddress,
  toOrderItems,
  validateAddress,
} from '../utils/checkoutValidation.js';
import { formatMoney } from '../utils/currency.js';
import './Checkout.css';

/**
 * loadStripe is called once at module scope, not per render — the Stripe
 * object is expensive and recreating it on every render breaks Elements.
 *
 * No `|| 'pk_test_mock_stripe_key_123'` fallback. A publishable key is not a
 * secret, but a *fake* one fails at the point where a customer is trying to
 * pay, which is the worst place to discover a missing environment variable.
 * Missing means missing, and the page says so.
 */
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/**
 * The summary renders in the currency the *server* priced the order in, not
 * in one this page assumes.
 *
 * This used to be a local `formatRupees`, while the payment intent behind the
 * card form was created in USD — so the panel said ₹1,157.84 and the Stripe
 * element next to it said $1,157.84. `POST /api/payments/create-intent`
 * returns the currency now, and it is what the totals below are labelled
 * with. Before the call has been made there is nothing authoritative to go
 * on, so the deployment's own currency stands in. See #335.
 */
const money = (amount, currency) =>
  formatMoney(amount ?? 0, { currency, fallback: formatMoney(0, { currency }) });

/**
 * Checkout, in two steps.
 *
 * Step one collects the shipping address. Step two mounts Stripe Elements
 * against the client secret that came back. Nothing is sent to the API until
 * the address validates, and nothing is sent at all if the cart is empty —
 * previously the effect fired on mount unconditionally and created a
 * server-side order for a customer who had not filled anything in and might
 * not have had a cart. See #315.
 */
export default function Checkout() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState(null);
  // Only known once the server has priced the cart; until then the summary
  // labels its subtotal with this deployment's configured currency.
  const [currency, setCurrency] = useState(undefined);

  const items = useMemo(() => toOrderItems(cart), [cart]);
  const bookCount = useMemo(() => countItems(cart), [cart]);
  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);

  const handleFieldChange = useCallback((name, value) => {
    setAddress((previous) => ({ ...previous, [name]: value }));
    // Clear this field's error as soon as the customer edits it. Leaving it
    // on screen while they type reads as "still wrong" when it may not be.
    setFieldErrors((previous) => {
      if (!previous[name]) {
        return previous;
      }
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmitAddress = async (event) => {
    event.preventDefault();

    const normalised = normaliseAddress(address);
    setAddress(normalised);

    const errors = validateAddress(normalised);
    setFieldErrors(errors);
    setFormError('');

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (items.length === 0) {
      setFormError('Your cart is empty.');
      return;
    }

    setSubmitting(true);

    try {
      // The cart, not a sample book. Only ids and quantities travel; the
      // server prices every line from the catalogue.
      const data = await paymentService.createPaymentIntent({
        items,
        shippingAddress: normalised,
      });

      if (!data?.clientSecret) {
        throw new Error('The payment could not be prepared. Please try again.');
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId ?? '');
      setAmount(data.amount ?? null);
      setCurrency(data.currency ?? data.amount?.currency);
    } catch (error) {
      // The old page swallowed this into console.error and left the customer
      // on a spinner forever. Say what happened and let them retry.
      console.error('[checkout] could not create the payment intent:', error);
      setFormError(describeCheckoutError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaid = useCallback(() => {
    // Only once the payment is actually confirmed. Clearing earlier loses the
    // cart of anyone whose card is declined.
    clearCart();
  }, [clearCart]);

  if (!stripePromise) {
    return (
      <main className="checkout">
        <div className="checkout__panel checkout__panel--message">
          <h1 className="checkout__title">Checkout unavailable</h1>
          <p>
            Payments are not configured for this deployment. Set{' '}
            <code>VITE_STRIPE_PUBLISHABLE_KEY</code> and rebuild the frontend.
          </p>
          <Link className="checkout__link-btn" to="/">
            Back to the shop
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0 && !clientSecret) {
    return (
      <main className="checkout">
        <div className="checkout__panel checkout__panel--message">
          <h1 className="checkout__title">Your cart is empty</h1>
          <p>Add a book before checking out.</p>
          <Link className="checkout__link-btn" to="/">
            Browse the shelf
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout">
      <h1 className="checkout__title">Secure checkout</h1>

      <div className="checkout__layout">
        <section className="checkout__panel" aria-labelledby="checkout-details">
          <h2 id="checkout-details" className="checkout__section-title">
            {clientSecret ? 'Payment' : 'Shipping address'}
          </h2>

          {clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <CheckoutForm
                orderId={orderId}
                onPaid={handlePaid}
                onNavigate={navigate}
              />
            </Elements>
          ) : (
            <form className="checkout__form" onSubmit={handleSubmitAddress} noValidate>
              {ADDRESS_FIELDS.map((field) => {
                const errorId = `${field.name}-error`;
                const error = fieldErrors[field.name];

                return (
                  <label className="checkout__field" key={field.name}>
                    <span className="checkout__label">{field.label}</span>
                    <input
                      className={`checkout__input ${
                        error ? 'checkout__input--invalid' : ''
                      }`}
                      name={field.name}
                      type="text"
                      value={address[field.name]}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      maxLength={field.maxLength}
                      aria-invalid={error ? 'true' : 'false'}
                      aria-describedby={error ? errorId : undefined}
                      onChange={(event) =>
                        handleFieldChange(field.name, event.target.value)
                      }
                    />
                    {error && (
                      <span className="checkout__error" id={errorId} role="alert">
                        {error}
                      </span>
                    )}
                  </label>
                );
              })}

              {formError && (
                <p className="checkout__error checkout__error--form" role="alert">
                  {formError}
                </p>
              )}

              <button
                className="checkout__submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Preparing payment…' : 'Continue to payment'}
              </button>
            </form>
          )}
        </section>

        <aside className="checkout__panel checkout__summary" aria-label="Order summary">
          <h2 className="checkout__section-title">Order summary</h2>

          <ul className="checkout__lines">
            {cart.map((item) => (
              <li className="checkout__line" key={item.id ?? item.bookId}>
                <span className="checkout__line-title">
                  {item.title}
                  <span className="checkout__line-qty"> × {item.quantity}</span>
                </span>
                <span className="checkout__line-price">
                  {money(Number(item.price ?? 0) * Number(item.quantity ?? 0), currency)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="checkout__totals">
            <div className="checkout__total-row">
              <dt>Subtotal ({bookCount} {bookCount === 1 ? 'book' : 'books'})</dt>
              <dd>{money(amount ? amount.subtotal : subtotal, currency)}</dd>
            </div>

            {/*
              Tax and shipping are decided by the server, so they only appear
              once it has told us what they are. Showing a guess next to a
              real card form is how a customer ends up disputing a charge.
            */}
            {amount && (
              <>
                <div className="checkout__total-row">
                  <dt>Tax</dt>
                  <dd>{money(amount.tax, currency)}</dd>
                </div>
                <div className="checkout__total-row">
                  <dt>Shipping</dt>
                  <dd>{money(amount.shipping, currency)}</dd>
                </div>
                <div className="checkout__total-row checkout__total-row--grand">
                  <dt>Total</dt>
                  <dd>{money(amount.total, currency)}</dd>
                </div>
              </>
            )}
          </dl>

          {!amount && (
            <p className="checkout__note">
              Tax and shipping are calculated at the next step.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
