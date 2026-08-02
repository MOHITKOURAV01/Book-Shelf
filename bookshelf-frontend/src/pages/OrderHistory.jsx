import { useState, useEffect } from 'react';
import OrderCard from '../components/orders/OrderCard.jsx';
import EmptyOrders from '../components/orders/EmptyOrders.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { getOrders } from '../utils/orderStorage.js';
import './OrderHistory.css';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Brief artificial delay so the skeleton loader is visible and
    // the page doesn't feel like it flashes — mirrors the previous behaviour.
    const timer = setTimeout(() => {
      setOrders(getOrders());
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="page-container order-history-page">
      <h2>Your Order History</h2>

      <div className="orders-meta">
        <span className="orders-meta-count">{loading ? '…' : orders.length}</span>
        {loading
          ? 'Loading orders…'
          : `${orders.length === 1 ? 'order' : 'orders'} placed`}
      </div>

      {loading ? (
        <div className="orders-list">
          <SkeletonLoader variant="order" count={3} />
        </div>
      ) : orders.length > 0 ? (
        <div className="orders-list">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <EmptyOrders />
      )}
    </div>
  );
}
