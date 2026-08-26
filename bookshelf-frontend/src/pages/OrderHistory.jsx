import { Link } from 'react-router-dom';

import OrderCard from '../components/orders/OrderCard.jsx';
import EmptyOrders from '../components/orders/EmptyOrders.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { useOrders } from '../hooks/useOrders.js';
import { countOrderItems, formatTotalSpent } from '../utils/orderFormat.js';
import './OrderHistory.css';

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
  const { orders, loading, error, refetch } = useOrders();

  const orderCount = orders.length;
  const bookCount = orders.reduce((total, order) => total + countOrderItems(order), 0);

  /*
   * Only orders that were actually paid for count towards what was spent —
   * including a failed or pending payment would tell a customer they had
   * spent money they have not been charged.
   *
   * The sum is per currency. This was a plain `reduce` adding every total
   * together, which was correct only while the currency was hardcoded; a
   * history spanning two currencies would have produced a number that is not
   * an amount of anything. See #335.
   */
  const spent = formatTotalSpent(orders);

  return (
    <div className="page-container order-history-page">
      <header className="order-history__header">
        <h2>Your Order History</h2>
        {!loading && !error && orderCount > 0 && (
          <p className="order-history__summary" data-testid="order-history-summary">
            {`${orderCount} ${orderCount === 1 ? 'order' : 'orders'}`} &middot;{' '}
            {`${bookCount} ${bookCount === 1 ? 'book' : 'books'}`} &middot;{' '}
            {`${spent} paid`}
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
