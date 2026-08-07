import React from 'react';

export const OrderStatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return { bg: '#fef3c7', text: '#d97706' };
      case 'shipped': return { bg: '#dbeafe', text: '#2563eb' };
      case 'delivered': return { bg: '#d1fae5', text: '#059669' };
      case 'canceled': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f3f4f6', text: '#4b5563' };
    }
  };
  const { bg, text } = getStatusColor(status);
  return (
    <span style={{
      backgroundColor: bg,
      color: text,
      padding: '4px 8px',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: '500',
      textTransform: 'capitalize'
    }}>
      {status}
    </span>
  );
};

export const EmptyOrders = () => (
  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
    <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#221e19' }}>No orders yet</h3>
    <p style={{ color: '#666', marginBottom: '1.5rem' }}>Looks like you haven’t purchased any books yet.</p>
    <a href="/" style={{
      display: 'inline-block',
      padding: '10px 20px',
      backgroundColor: 'var(--leather, #8b5a2b)',
      color: '#fff',
      textDecoration: 'none',
      borderRadius: '8px',
      fontWeight: '600'
    }}>Browse Books</a>
  </div>
);

export const LoadingSkeleton = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <div className="spinner" style={{ margin: '0 auto', borderTopColor: 'var(--leather, #8b5a2b)' }}>Loading...</div>
  </div>
);
