import { useState, useEffect } from 'react';
import { getSalesTrend } from '../services/adminService.js';

/**
 * AdminSalesChart — a pure-CSS bar chart showing revenue per day.
 *
 * No external charting library: the bars are `<div>` elements whose width
 * is set as a percentage of the tallest bar, keeping the bundle small.
 */
export default function AdminSalesChart() {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError('');

    getSalesTrend({ period, signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setData(result.trend || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load sales data');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [period]);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="admin-chart">
      <div className="admin-chart__header">
        <h3 className="admin-chart__title">Revenue Trend</h3>
        <select
          className="admin-chart__period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {loading && (
        <div className="admin-chart__loading">
          <div className="admin-chart__bar-skeleton" />
        </div>
      )}

      {error && <p className="admin-chart__error">{error}</p>}

      {!loading && !error && data.length === 0 && (
        <p className="admin-chart__empty">No sales data for this period.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="admin-chart__bars" role="img" aria-label="Revenue per day">
          {data.map((entry) => {
            const pct = Math.round((entry.revenue / maxRevenue) * 100);
            const shortDate = entry.date.slice(5); // MM-DD

            return (
              <div key={entry.date} className="admin-chart__col">
                <span className="admin-chart__tooltip">
                  ₹{entry.revenue.toLocaleString()}
                </span>
                <div className="admin-chart__bar-track">
                  <div
                    className="admin-chart__bar"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="admin-chart__date-label">{shortDate}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
