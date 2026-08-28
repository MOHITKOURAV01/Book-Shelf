import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import OrderCard from '../components/orders/OrderCard.jsx';
import EmptyOrders from '../components/orders/EmptyOrders.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { useOrders } from '../hooks/useOrders.js';
import { countOrderItems, formatTotalSpent } from '../utils/orderFormat.js';
import './OrderHistory.css';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

export default function OrderHistory() {
  usePageMetadata({
    title: 'Your orders',
    description:
      'Every order you have placed with BookShelf, with its status, contents and total.',
  });

  /*
   * The line that was missing.
   *
   * `useTranslation` was imported at the top of this file and `t(...)` was
   * called three times in the markup below, but the hook was never called,
   * so `t` was a free variable and the first JSX expression that reached it
   * threw `ReferenceError: t is not defined` — on the first render, before
   * anything painted. See #367.
   */
  const { t } = useTranslation();

  const { orders, loading, error, refetch } = useOrders();

  const orderCount = orders.length;
  const bookCount = orders.reduce((total, order) => total + countOrderItems(order), 0);
  const spent = formatTotalSpent(orders);

  return (
    <div className="page-container order-history-page">
      <header className="order-history__header">
        <h2>{t('orderHistory.title', 'Your Order History')}</h2>
        {!loading && !error && orderCount > 0 && (
          <p className="order-history__summary" data-testid="order-history-summary">
            {/*
              The summary sat next to a translated heading as three untranslated
              template literals, so the page read as half-Spanish under `es`.
              i18next picks the singular or plural form from `count`, which is
              also what makes this correct in languages whose plural rules are
              not English's.
            */}
            {t('orderHistory.orderCount', {
              count: orderCount,
              defaultValue_one: '{{count}} order',
              defaultValue_other: '{{count}} orders',
            })}{' '}
            &middot;{' '}
            {t('orderHistory.bookCount', {
              count: bookCount,
              defaultValue_one: '{{count}} book',
              defaultValue_other: '{{count}} books',
            })}{' '}
            &middot;{' '}
            {t('orderHistory.totalPaid', {
              amount: spent,
              defaultValue: '{{amount}} paid',
            })}
          </p>
        )}
      </header>

      {loading && (
        <div className="orders-list" aria-busy="true" aria-label="Loading orders">
          <SkeletonLoader variant="order" count={3} />
        </div>
      )}

      {!loading && error && (
        <div className="order-history__error" role="alert">
          <h3>{t('orderHistory.loadError', 'We could not load your orders')}</h3>
          <p>
            {error.message ||
              t('common.genericError', 'Something went wrong. Please try again.')}
          </p>
          <div className="order-history__error-actions">
            <button type="button" className="order-history__retry" onClick={refetch}>
              {t('orderHistory.retry', 'Try again')}
            </button>
            {error.status === 401 && (
              <Link className="order-history__signin" to="/login?redirect=/orders">
                {t('orderHistory.signIn', 'Sign in')}
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
