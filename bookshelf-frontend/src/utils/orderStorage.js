/**
 * orderStorage.js — localStorage utility for persisting placed orders.
 *
 * Order shape:
 * {
 *   id:              string   — "ORD-<timestamp>"
 *   createdAt:       string   — ISO date string
 *   items:           CartItem[]  — { id, title, author, price, quantity, cover }
 *   total:           number   — total in rupees
 *   paymentMethod:   string   — 'credit-card' | 'upi' | 'cod'
 *   shippingDetails: object   — { fullName, address, city, zipCode, country }
 *   paymentStatus:   string   — 'Paid' | 'Pending'
 *   shippingStatus:  string   — 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
 * }
 */

const STORAGE_KEY = 'orders';

/**
 * Retrieve all saved orders from localStorage.
 * Returns an empty array if no orders exist or parsing fails.
 */
export function getOrders() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('[orderStorage] Failed to parse orders:', err);
    return [];
  }
}

/**
 * Save a new order to the front of the orders list.
 * @param {object} orderData — the full order object (without id/createdAt)
 * @returns {object} the saved order with generated id and createdAt
 */
export function saveOrder(orderData) {
  const newOrder = {
    id: `ORD-${Date.now()}`,
    createdAt: new Date().toISOString(),
    paymentStatus: orderData.paymentMethod === 'cod' ? 'Pending' : 'Paid',
    shippingStatus: 'Processing',
    ...orderData,
  };

  const existing = getOrders();
  const updated = [newOrder, ...existing];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[orderStorage] Failed to save order:', err);
  }

  return newOrder;
}

/**
 * Clear all saved orders (useful for testing/reset).
 */
export function clearOrders() {
  localStorage.removeItem(STORAGE_KEY);
}
