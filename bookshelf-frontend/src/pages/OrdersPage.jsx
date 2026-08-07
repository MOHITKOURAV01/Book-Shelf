import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../services/orderService';
import { OrderStatusBadge, EmptyOrders, LoadingSkeleton } from '../components/orders/OrderComponents';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getMyOrders();
        setOrders(data);
      } catch (err) {
        setError('Unable to load your orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: '2rem' }}>{error}</div>;
  if (orders.length === 0) return <EmptyOrders />;

  const totalOrders = orders.length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalSpent = orders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      <h2 style={{ color: '#221e19', marginBottom: '1.5rem' }}>My Orders</h2>
      
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>Total orders</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalOrders}</p>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>Processing</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{processingOrders}</p>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>Delivered</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{deliveredOrders}</p>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>Total spent</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* Orders List */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '1rem', color: '#4b5563', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Order ID</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Total</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '1rem', color: '#4b5563', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{order._id}</td>
                  <td style={{ padding: '1rem' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>${order.total.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}><OrderStatusBadge status={order.status} /></td>
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/account/orders/${order._id}`} style={{ color: 'var(--leather, #8b5a2b)', textDecoration: 'none', fontWeight: '500' }}>
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
