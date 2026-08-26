import { Link } from 'react-router-dom';

import OrderCard from '../components/orders/OrderCard.jsx';
import EmptyOrders from '../components/orders/EmptyOrders.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { useOrders } from '../hooks/useOrders.js';
import { countOrderItems, formatMoney } from '../utils/orderFormat.js';
import './OrderHistory.css';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

/**
 * The order history.
 *
 * This page used to read a `localStorage` key called `orders`. Nothing wrote
 * that key — `saveOrder()` was exported and never imported — because checkout
 * has been server-side since #315. So the page the navbar links to reported
 * "0 orders placed" no matter how many orders the customer had actually
 * placed, while the same orders sat in the database behind a second, almost
 * identical page at `/account/orders`. There is one order history now, and it
 * reads the API. See #326.
 */
export default function OrderHistory() {
  usePageMetadata({
    title: 'Your orders',
    description:
      'Every order you have placed with BookShelf, with its status, contents and total.',
  });

  const { orders, loading, error, refetch } = useOrders();

  const orderCount = orders.length;
  const bookCount = orders.reduce((total, order) => total + countOrderItems(order), 0);

  // Only orders that were actually paid for count towards what was spent.
  // Including a failed or pending payment would tell a customer they had
  // spent money they have not been charged.
  const totalSpent = orders.reduce((total, order) => {
    if (order.paymentStatus !== 'paid') {
      return total;
    }

    const amount = Number(order.total);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);

  return (
    <div className="page-container order-history-page">
      <header className="order-history__header">
        <h2>Your Order History</h2>
        {!loading && !error && orderCount > 0 && (
          <p className="order-history__summary" data-testid="order-history-summary">
            {`${orderCount} ${orderCount === 1 ? 'order' : 'orders'}`} &middot;{' '}
            {`${bookCount} ${bookCount === 1 ? 'book' : 'books'}`} &middot;{' '}
            {`${formatMoney(totalSpent)} paid`}
          </p>
        )}
      </header>

      {loading && (
        <div className="orders-list" aria-busy="true" aria-label="Loading orders">
          <SkeletonLoader variant="order" count={3} />
        </div>
      )}

      {/*
        An error is not an empty list. Showing "No orders yet" when the
        request failed tells a customer their orders are gone, which is the
        most alarming thing this page could possibly say.
      */}
      {!loading && error && (
        <div className="order-history__error" role="alert">
          <h3>We could not load your orders</h3>
          <p>{error.message || 'Something went wrong. Please try again.'}</p>
          <div className="order-history__error-actions">
            <button type="button" className="order-history__retry" onClick={refetch}>
              Try again
            </button>
            {error.status === 401 && (
              <Link className="order-history__signin" to="/login?redirect=/orders">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}

      {!loading && !error && orderCount === 0 && <EmptyOrders />}

      {!loading && !error && orderCount > 0 && (
        <div className="orders-list">
          {orders.map((order) => (
            <OrderCard key={order._id ?? order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
