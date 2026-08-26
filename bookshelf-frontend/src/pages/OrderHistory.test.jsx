import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import OrderHistory from './OrderHistory.jsx';
import orderService from '../services/orderService.js';

/**
 * The regression: this page read a localStorage key that nothing wrote, so it
 * reported "0 orders placed" no matter what the customer had bought. See
 * #326.
 */

vi.mock('../services/orderService.js', () => ({
  default: { getMyOrders: vi.fn(), getOrderById: vi.fn() },
}));

vi.mock('../components/SkeletonLoader.jsx', () => ({
  default: () => <div data-testid="skeleton">loading</div>,
}));

const paidOrder = {
  _id: '65f1a2b3c4d5e6f7a8b9c0d1',
  createdAt: '2026-03-14T10:00:00.000Z',
  status: 'delivered',
  paymentStatus: 'paid',
  items: [
    { bookId: 'b1', title: 'The Quiet Ones', price: 349, quantity: 2 },
    { bookId: 'b2', title: 'Field Notes', price: 199, quantity: 1 },
  ],
  subtotal: 897,
  tax: 44.85,
  shipping: 5.99,
  total: 947.84,
};

const unpaidOrder = {
  _id: '75f1a2b3c4d5e6f7a8b9c0d2',
  createdAt: '2026-03-15T10:00:00.000Z',
  status: 'pending',
  paymentStatus: 'pending',
  items: [{ bookId: 'b3', title: 'Another Fiction', price: 100, quantity: 1 }],
  subtotal: 100,
  tax: 5,
  shipping: 5.99,
  total: 110.99,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <OrderHistory />
    </MemoryRouter>
  );
}

describe('OrderHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the orders the API returns', async () => {
    orderService.getMyOrders.mockResolvedValue([paidOrder, unpaidOrder]);

    renderPage();

    expect(await screen.findByText('Order #B9C0D1')).toBeInTheDocument();
    expect(screen.getByText('Order #B9C0D2')).toBeInTheDocument();
    expect(screen.queryByText('No orders yet')).not.toBeInTheDocument();
  });

  it('counts books rather than lines, and only totals what was actually paid', async () => {
    orderService.getMyOrders.mockResolvedValue([paidOrder, unpaidOrder]);

    renderPage();

    // 2 orders; 2 + 1 + 1 = 4 books; only the paid order's 947.84 counts.
    const summary = await screen.findByTestId('order-history-summary');
    expect(summary).toHaveTextContent('2 orders');
    expect(summary).toHaveTextContent('4 books');
    expect(summary).toHaveTextContent('$947.84 paid');
  });

  it('names itself in the browser tab', async () => {
    // Every route used to render "BookShelf — Find your next read". See #337.
    orderService.getMyOrders.mockResolvedValue([]);

    renderPage();

    await waitFor(() => expect(document.title).toBe('Your orders — BookShelf'));
  });

  it('shows the empty state only when the request actually succeeded', async () => {
    orderService.getMyOrders.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
  });

  it('shows an error — not "no orders" — when the request fails', async () => {
    orderService.getMyOrders.mockRejectedValue({
      status: 500,
      code: 'SERVER_ERROR',
      message: 'Internal server error. Our team has been notified.',
    });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Internal server error. Our team has been notified.'
    );
    // Telling a customer their orders are gone is the worst thing this page
    // could say when the truth is that the request broke.
    expect(screen.queryByText('No orders yet')).not.toBeInTheDocument();
  });

  it('offers a sign-in link when the session has expired', async () => {
    orderService.getMyOrders.mockRejectedValue({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized access. Please login again.',
    });

    renderPage();

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login?redirect=/orders'
    );
  });

  it('retries on request', async () => {
    const user = userEvent.setup();
    orderService.getMyOrders
      .mockRejectedValueOnce({ status: 500, message: 'Internal server error.' })
      .mockResolvedValueOnce([paidOrder]);

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Order #B9C0D1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not white-screen when the response is not an array', async () => {
    // `orders.filter is not a function` used to take the whole page down.
    orderService.getMyOrders.mockResolvedValue({ message: 'Not authorised' });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server sent back something this page could not read.'
    );
  });

  it('drops entries with nothing to key on rather than crashing on them', async () => {
    orderService.getMyOrders.mockResolvedValue([paidOrder, null, {}, 'nonsense']);

    renderPage();

    expect(await screen.findByText('Order #B9C0D1')).toBeInTheDocument();
    expect(screen.getByTestId('order-history-summary')).toHaveTextContent('1 order');
  });

  it('survives an order missing every optional field', async () => {
    orderService.getMyOrders.mockResolvedValue([{ _id: 'abcdef123456' }]);

    renderPage();

    expect(await screen.findByText('Order #123456')).toBeInTheDocument();
    expect(screen.getByText('Total: —')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('expands an order to show its line items', async () => {
    const user = userEvent.setup();
    orderService.getMyOrders.mockResolvedValue([paidOrder]);

    renderPage();

    const toggle = await screen.findByRole('button', { name: /view details/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(screen.getByText('The Quiet Ones')).toBeInTheDocument();
    expect(screen.getByText('Field Notes')).toBeInTheDocument();
    // 349 x 2
    expect(screen.getByText('$698.00')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('links an expanded order to its full detail page', async () => {
    const user = userEvent.setup();
    orderService.getMyOrders.mockResolvedValue([paidOrder]);

    renderPage();

    await user.click(await screen.findByRole('button', { name: /view details/i }));

    expect(screen.getByRole('link', { name: 'Open the full order' })).toHaveAttribute(
      'href',
      '/account/orders/65f1a2b3c4d5e6f7a8b9c0d1'
    );
  });

  it('shows the skeleton while the request is in flight', async () => {
    let resolve;
    orderService.getMyOrders.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    renderPage();

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();

    resolve([]);
    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
  });
});
