import { formatMoney, lineTotal } from '../../utils/orderFormat.js';
import './OrderDetails.css';

/**
 * The expanded body of an order card.
 *
 * Takes the whole order rather than just `items`, so it can show what was
 * paid alongside what was bought.
 *
 * The line shape is the one the server writes in `utils/checkout.js`:
 * `{ bookId, title, price, quantity }`. The previous version rendered
 * `item.image` and `item.author` — fields that only existed in the
 * localStorage orders this page used to read — and called
 * `item.price.toFixed(2)` unguarded. See #326.
 */
export default function OrderDetails({ order }) {
  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="order-details">
      <h4>Purchased Items</h4>

      {items.length === 0 ? (
        <p className="order-details__empty">
          This order has no line items recorded against it.
        </p>
      ) : (
        <div className="order-items-list">
          {items.map((item, index) => (
            // bookId is the natural key, but it is not guaranteed unique
            // within an order and can be missing, so the index backs it up.
            <div key={`${item?.bookId ?? 'item'}-${index}`} className="order-item">
              <div className="order-item-info">
                <h5>{item?.title || 'Untitled book'}</h5>
                <p className="order-item-unit">{formatMoney(item?.price)} each</p>
              </div>
              <div className="order-item-price-qty">
                <p className="order-item-line-total">{formatMoney(lineTotal(item))}</p>
                <p>Qty: {item?.quantity ?? '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <dl className="order-details__totals">
        <div className="order-details__total-row">
          <dt>Subtotal</dt>
          <dd>{formatMoney(order?.subtotal)}</dd>
        </div>
        <div className="order-details__total-row">
          <dt>Tax</dt>
          <dd>{formatMoney(order?.tax)}</dd>
        </div>
        <div className="order-details__total-row">
          <dt>Shipping</dt>
          <dd>{formatMoney(order?.shipping)}</dd>
        </div>
        <div className="order-details__total-row order-details__total-row--grand">
          <dt>Total</dt>
          <dd>{formatMoney(order?.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
