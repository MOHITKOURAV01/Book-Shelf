import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const confirmPayment = vi.fn();
const stripe = { confirmPayment };
const elements = {};

vi.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => stripe,
  useElements: () => elements,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import CheckoutForm from './CheckoutForm.jsx';

function renderForm(props = {}) {
  const onPaid = vi.fn();
  const onNavigate = vi.fn();
  render(
    <CheckoutForm orderId="order-1" onPaid={onPaid} onNavigate={onNavigate} {...props} />
  );
  return { onPaid, onNavigate };
}

async function pay() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /pay now/i }));
}

describe('CheckoutForm', () => {
  beforeEach(() => {
    confirmPayment.mockReset();
  });

  it('does not throw when confirmPayment resolves without an error', async () => {
    // The regression from #315: the old code read `error.type` unconditionally,
    // and the successful path is exactly the one where `error` is absent.
    confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_1', status: 'succeeded' },
    });

    const { onPaid, onNavigate } = renderForm();
    await pay();

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith(
      '/order-confirmation?orderId=order-1',
      { replace: true }
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the cart only after the payment actually succeeds', async () => {
    confirmPayment.mockResolvedValue({
      error: { type: 'card_error', message: 'Your card was declined.' },
    });

    const { onPaid, onNavigate } = renderForm();
    await pay();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your card was declined.'
    );
    expect(onPaid).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not show a raw Stripe message for errors not written for customers', async () => {
    confirmPayment.mockResolvedValue({
      error: { type: 'api_connection_error', message: 'Request to Stripe failed: ECONNRESET' },
    });

    renderForm();
    await pay();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unexpected error/i);
    expect(alert).not.toHaveTextContent('ECONNRESET');
  });

  it('treats a processing intent as done — the webhook finishes it', async () => {
    confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_2', status: 'processing' },
    });

    const { onPaid, onNavigate } = renderForm();
    await pay();

    await waitFor(() => expect(onPaid).toHaveBeenCalled());
    expect(onNavigate).toHaveBeenCalled();
  });

  it('re-enables the button when the intent still needs a payment method', async () => {
    confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_3', status: 'requires_payment_method' },
    });

    const { onPaid } = renderForm();
    await pay();

    expect(await screen.findByRole('alert')).toHaveTextContent(/did not go through/i);
    expect(onPaid).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /pay now/i })).toBeEnabled()
    );
  });

  it('recovers when Stripe.js rejects rather than resolving', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    confirmPayment.mockRejectedValue(new Error('network down'));

    const { onPaid } = renderForm();
    await pay();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not reach the payment provider/i
    );
    expect(onPaid).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /pay now/i })).toBeEnabled()
    );
  });

  it('percent-encodes the order id it puts in the return url', async () => {
    confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_4', status: 'succeeded' },
    });

    const { onNavigate } = renderForm({ orderId: 'order/1 &2' });
    await pay();

    await waitFor(() => expect(onNavigate).toHaveBeenCalled());
    expect(onNavigate.mock.calls[0][0]).toBe(
      '/order-confirmation?orderId=order%2F1%20%262'
    );
    expect(confirmPayment.mock.calls[0][0].confirmParams.return_url).toContain(
      'order%2F1%20%262'
    );
  });

  it('asks Stripe not to redirect unless the payment method requires it', async () => {
    confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_5', status: 'succeeded' },
    });

    renderForm();
    await pay();

    expect(confirmPayment.mock.calls[0][0].redirect).toBe('if_required');
  });
});
