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

/*
 * `EmptyOrders` used to live here too, with an `<a href="/">` that tore down
 * and re-parsed the whole SPA — the defect #316 fixed in the navbar, in a
 * file that PR did not reach. Its only caller was pages/OrdersPage.jsx, which
 * is gone now that there is one order history; the routed empty state is
 * components/orders/EmptyOrders.jsx, which has always used a router <Link>.
 * See #326.
 */

export const LoadingSkeleton = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <div className="spinner" style={{ margin: '0 auto', borderTopColor: 'var(--leather, #8b5a2b)' }}>Loading...</div>
  </div>
);
