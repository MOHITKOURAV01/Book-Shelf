import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import api from '../utils/api.js';
import { unsubscribeStockAlert } from '../services/stockAlertService.js';
import './StockAlertsPage.css';

/**
 * StockAlertsPage — shows all back-in-stock alerts the current user has set.
 * Fetches alert list from a dedicated endpoint and lets the user remove them.
 */

async function getMyAlerts({ signal } = {}) {
  const response = await api.get('/stock-alerts/mine', { signal });
  return response.data;
}

export default function StockAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    getMyAlerts({ signal: c.signal })
      .then((data) => { setAlerts(Array.isArray(data) ? data : data.alerts || []); setLoading(false); })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') { setError(err.message || 'Failed to load alerts'); setLoading(false); } });
    return () => c.abort();
  }, []);

  const handleRemove = async (bookId) => {
    try {
      await unsubscribeStockAlert(bookId);
      setAlerts((prev) => prev.filter((a) => a.bookId !== bookId));
    } catch (err) {
      setError(err.message || 'Failed to remove alert');
    }
  };

  return (
    <main className="alerts-page">
      <h1 className="alerts-page__title">My Stock Alerts</h1>
      <p className="alerts-page__subtitle">Books you're waiting to come back in stock.</p>

      {error && <div className="alerts-page__error">{error}<button onClick={() => setError('')}>✕</button></div>}

      {loading && (
        <div className="alerts-page__loading">
          {[1, 2, 3].map((i) => <div key={i} className="alerts-page__skeleton" />)}
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="alerts-page__empty">
          <p>You don't have any stock alerts yet.</p>
          <Link to="/" className="alerts-page__browse">Browse books</Link>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <ul className="alerts-page__list">
          {alerts.map((alert) => (
            <li key={alert.bookId} className="alerts-page__item">
              <div className="alerts-page__info">
                <Link to={`/book/${alert.bookId}`} className="alerts-page__book-link">
                  {alert.bookTitle || alert.bookId}
                </Link>
                <span className="alerts-page__date">
                  Subscribed {new Date(alert.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                className="alerts-page__remove"
                onClick={() => handleRemove(alert.bookId)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
