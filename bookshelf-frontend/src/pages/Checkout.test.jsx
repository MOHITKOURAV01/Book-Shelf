import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

/*
 * Stripe is mocked wholesale. The point of these tests is *what gets sent to
 * the payment API* — which was the entire bug in #315 — and that question is
 * answered before Stripe.js is involved at all.
 */
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({ id: 'stripe' })),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => null,
  useElements: () => null,
}));

const createPaymentIntent = vi.fn();

vi.mock('../services/paymentService.js', () => ({
  default: {
    createPaymentIntent: (...args) => createPaymentIntent(...args),
  },
}));

const CART = [
  { id: 'b1', title: 'The Quiet Ones', price: 349, quantity: 2, cover: '#7A2E2E' },
  { id: 'b3', title: 'Half Moon Bay', price: 399, quantity: 1, cover: '#B85C2C' },
];

const ADDRESS = {
  name: 'A. Sharma',
  address: '221B Baker Street',
  city: 'Mumbai',
  postalCode: '400001',
  country: 'India',
};

let Checkout;
let CartProvider;

async function loadCheckout({ publishableKey = 'pk_test_fake' } = {}) {
  vi.resetModules();
  vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', publishableKey);
  // Imported after the env is stubbed: the module reads the key at load time
  // so that loadStripe is called once rather than once per render. The cart
  // provider has to come from the same fresh module graph, or the page reads
  // a different CartContext instance than the test rendered.
  Checkout = (await import('./Checkout.jsx')).default;
  CartProvider = (await import('../context/CartContext.jsx')).CartProvider;
}

function renderCheckout(cart = CART) {
  window.localStorage.setItem('cart', JSON.stringify(cart));

  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <CartProvider>
        <Checkout />
      </CartProvider>
    </MemoryRouter>
  );
}

async function fillAddress(user, overrides = {}) {
  const values = { ...ADDRESS, ...overrides };

  for (const [label, value] of [
    ['Full name', values.name],
    ['Street address', values.address],
    ['City', values.city],
    ['Postal code', values.postalCode],
    ['Country', values.country],
  ]) {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    if (value) {
      await user.type(input, value);
    }
  }
}

describe('Checkout', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    createPaymentIntent.mockReset();
    await loadCheckout();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('does not contact the payment API on mount', async () => {
    renderCheckout();

    // The old page fired the request from a mount effect, so an order was
    // created before the customer had typed anything.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /shipping address/i })).toBeInTheDocument()
    );
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('shows an empty-cart state instead of checking out with nothing', async () => {
    renderCheckout([]);

    expect(screen.getByRole('heading', { name: /your cart is empty/i })).toBeInTheDocument();
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('refuses to submit an incomplete address and names each missing field', async () => {
    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(5);
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('sends the real cart contents, not a hardcoded sample book', async () => {
    const user = userEvent.setup();
    createPaymentIntent.mockResolvedValue({
      clientSecret: 'pi_secret_123',
      orderId: 'order-1',
      amount: { subtotal: 1097, tax: 54.85, shipping: 5.99, total: 1157.84 },
    });

    renderCheckout();
    await fillAddress(user);
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => expect(createPaymentIntent).toHaveBeenCalledTimes(1));

    const payload = createPaymentIntent.mock.calls[0][0];

    expect(payload.items).toEqual([
      { bookId: 'b1', quantity: 2 },
      { bookId: 'b3', quantity: 1 },
    ]);
    expect(JSON.stringify(payload)).not.toMatch(/Sample Book|book-1|Jane Doe/);
  });

  it('sends the address the customer typed', async () => {
    const user = userEvent.setup();
    createPaymentIntent.mockResolvedValue({ clientSecret: 'pi_secret_123' });

    renderCheckout();
    await fillAddress(user, { city: '  Pune  ' });
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => expect(createPaymentIntent).toHaveBeenCalled());

    expect(createPaymentIntent.mock.calls[0][0].shippingAddress).toEqual({
      ...ADDRESS,
      city: 'Pune',
    });
  });

  it('mounts the payment step once the API returns a client secret', async () => {
    const user = userEvent.setup();
    createPaymentIntent.mockResolvedValue({
      clientSecret: 'pi_secret_123',
      orderId: 'order-1',
      amount: { subtotal: 1097, tax: 54.85, shipping: 5.99, total: 1157.84 },
    });

    renderCheckout();
    await fillAddress(user);
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    expect(await screen.findByTestId('payment-element')).toBeInTheDocument();
    // Server-calculated amounts, shown only once the server has calculated them.
    expect(screen.getByText('₹1,157.84')).toBeInTheDocument();
  });

  it('surfaces a rejected cart instead of hanging on a spinner forever', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    createPaymentIntent.mockRejectedValue({
      status: 400,
      original: {
        response: {
          data: {
            message: 'Invalid checkout request',
            errors: [{ field: 'items[0].bookId', message: 'Book not found: book-1' }],
          },
        },
      },
    });

    renderCheckout();
    await fillAddress(user);
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
    // Still on the address step, with the button usable again.
    expect(
      screen.getByRole('button', { name: /continue to payment/i })
    ).toBeEnabled();
  });

  it('says so when no publishable key was built in, rather than using a fake one', async () => {
    await loadCheckout({ publishableKey: '' });
    renderCheckout();

    expect(
      screen.getByRole('heading', { name: /checkout unavailable/i })
    ).toBeInTheDocument();
  });
});
