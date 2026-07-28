import { useState } from 'react';
import OrderDetails from './OrderDetails.jsx';
import './OrderCard.css';

export default function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => setExpanded(!expanded);

  return (
    <div className="order-card">
      <div className="order-summary" onClick={toggleExpand}>
        <div className="order-info">
          <h3>Order #{order.id}</h3>
          <p className="order-date">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="order-status">
          <span className={`status-badge ${order.paymentStatus.toLowerCase()}`}>{order.paymentStatus}</span>
          <span className={`status-badge ${order.shippingStatus.toLowerCase()}`}>{order.shippingStatus}</span>
        </div>
        <div className="order-total">
          <p>Total: ${order.total.toFixed(2)}</p>
        </div>
        <div className="order-expand">
          <button className="expand-btn">
            {expanded ? '▲ Hide Details' : '▼ View Details'}
          </button>
        </div>
      </div>
      
      {expanded && <OrderDetails items={order.items} />}
    </div>
  );
}
