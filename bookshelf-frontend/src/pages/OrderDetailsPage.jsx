import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import orderService from '../services/orderService';
import { OrderStatusBadge, LoadingSkeleton } from '../components/orders/OrderComponents';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await orderService.getOrderById(id);
        setOrder(data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
            setError('This order could not be found.');
        } else {
            setError('Unable to load order details.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div style={{ textAlign: 'center', margin: '4rem auto', padding: '2rem', maxWidth: '600px', background: '#fff', borderRadius: '12px' }}>
        <h3 style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</h3>
        <Link to="/account/orders" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: 'var(--leather, #8b5a2b)', color: '#fff', textDecoration: 'none', borderRadius: '8px' }}>
          Back to Orders
        </Link>
      </div>
    );
  }
  if (!order) return null;

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      <Link to="/account/orders" style={{ display: 'inline-block', marginBottom: '1.5rem', color: 'var(--leather, #8b5a2b)', textDecoration: 'none', fontWeight: '500' }}>
        &larr; Back to Orders
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#221e19', margin: 0 }}>Order Details</h2>
        <OrderStatusBadge status={order.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column: Items and Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Items */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Purchased Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: '600', margin: 0 }}>{item.title}</p>
                    <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>Qty: {item.quantity}</p>
                  </div>
                  <p style={{ fontWeight: '500', margin: 0 }}>${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Order Totals</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>${order.subtotal?.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><span>${order.shipping?.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><span>${order.tax?.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #e5e7eb', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                <span>Total</span><span>${order.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Info, Addresses */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Order Summary */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Order Info</h3>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Order ID:</strong> {order._id}</p>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Payment Status:</strong> <span style={{ textTransform: 'capitalize' }}>{order.paymentStatus}</span></p>
            {order.transactionId && <p style={{ margin: '0 0 0.5rem 0' }}><strong>Transaction ID:</strong> {order.transactionId}</p>}
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Shipping Address</h3>
              <p style={{ margin: '0 0 0.25rem 0' }}>{order.shippingAddress.name}</p>
              <p style={{ margin: '0 0 0.25rem 0' }}>{order.shippingAddress.address}</p>
              <p style={{ margin: '0 0 0.25rem 0' }}>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
              <p style={{ margin: '0 0 0.25rem 0' }}>{order.shippingAddress.country}</p>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
             <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>Order Timeline</h3>
             <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
               <li style={{ paddingBottom: '1rem', borderLeft: '2px solid #10b981', paddingLeft: '1rem', position: 'relative' }}>
                 <div style={{ position: 'absolute', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', left: '-6px', top: '5px' }}></div>
                 <p style={{ margin: 0, fontWeight: 'bold' }}>Order placed</p>
                 <small style={{ color: '#666' }}>{new Date(order.createdAt).toLocaleDateString()}</small>
               </li>
               <li style={{ paddingBottom: order.status === 'delivered' ? '1rem' : 0, borderLeft: order.status === 'delivered' ? '2px solid #10b981' : '2px solid transparent', paddingLeft: '1rem', position: 'relative' }}>
                 <div style={{ position: 'absolute', width: '10px', height: '10px', background: order.status === 'delivered' ? '#10b981' : '#d1d5db', borderRadius: '50%', left: '-6px', top: '5px' }}></div>
                 <p style={{ margin: 0, fontWeight: order.status === 'delivered' ? 'bold' : 'normal', color: order.status === 'delivered' ? '#000' : '#666' }}>Delivered</p>
               </li>
             </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
