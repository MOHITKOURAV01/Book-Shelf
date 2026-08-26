import { useState } from 'react';
import { Link } from 'react-router-dom';

import OrderDetails from './OrderDetails.jsx';
import {
  countOrderItems,
  formatOrderDate,
  orderMoney,
  orderReference,
  primaryStatus,
} from '../../utils/orderFormat.js';
import './OrderCard.css';

/**
 * One order in the history.
 *
 * The previous version rendered `order.paymentStatus.toLowerCase()` and
 * `order.shippingStatus.toLowerCase()` straight into class names. Neither was
 * guarded, and `shippingStatus` is not a field on the server `Order` model at
 * all — it belonged to the localStorage shape this page used to read — so the
 * first real order threw. Everything is read through the helpers in
 * utils/orderFormat.js now, which return something renderable for every
 * input. See #326.
 */
export default function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);

  // Bound to this order's recorded currency rather than to whatever the shop
  // is configured for today — an order charged in one currency must not be
  // relabelled with another. See #335.
  const money = orderMoney(order);
  const status = primaryStatus(order);
  const reference = orderReference(order);
  const bookCount = countOrderItems(order);
  const detailsId = `order-details-${order?._id ?? order?.id ?? 'unknown'}`;

  return (
    <div className="order-card">
      <div className="order-summary">
        <div className="order-info">
          <h3>Order {reference}</h3>
          <p className="order-date">{formatOrderDate(order?.createdAt)}</p>
        </div>

        <div className="order-status">
          <span className={`status-badge status-badge--${status.tone}`}>{status.label}</span>
          <span className="order-item-count">
            {bookCount} {bookCount === 1 ? 'book' : 'books'}
          </span>
        </div>

        <div className="order-total">
          <p>Total: {money(order?.total)}</p>
        </div>

        <div className="order-expand">
          {/*
            Was a click handler on the whole summary row, which is not
            reachable by keyboard and announces nothing. The button is the
            control, and it says what it controls.
          */}
          <button
            type="button"
            className="expand-btn"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls={detailsId}
          >
            {expanded ? '▲ Hide Details' : '▼ View Details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div id={detailsId}>
          <OrderDetails order={order} />
          {(order?._id ?? order?.id) && (
            <p className="order-card__full-link">
              <Link to={`/account/orders/${order._id ?? order.id}`}>
                Open the full order
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
