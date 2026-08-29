import { useState, useEffect } from 'react';

import AdminKpiCard from '../components/AdminKpiCard.jsx';
import AdminSalesChart from '../components/AdminSalesChart.jsx';
import AdminTopBooks from '../components/AdminTopBooks.jsx';
import AdminRecentOrders from '../components/AdminRecentOrders.jsx';
import { getDashboardStats } from '../services/adminService.js';

import '../components/AdminKpiCard.css';
import '../components/AdminSalesChart.css';
import '../components/AdminTopBooks.css';
import '../components/AdminRecentOrders.css';
import './AdminDashboard.css';

/**
 * AdminDashboard — the full admin analytics page.
 *
 * Fetches KPIs from the backend on mount and passes them to KPI cards.
 * The chart, top-books, and recent-orders sections each fetch their own
 * data independently so a slow aggregation does not block the KPIs.
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    getDashboardStats({ signal: controller.signal })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.code !== 'ERR_CANCELED') {
          setError(err.message || 'Failed to load dashboard stats');
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  function formatCurrency(value) {
    return `₹${(value || 0).toLocaleString()}`;
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <h1 className="admin-dashboard__title">Admin Dashboard</h1>
          <p className="admin-dashboard__subtitle">
            Real-time analytics and store performance
          </p>
        </div>
      </header>

      {error && (
        <div className="admin-dashboard__error">
          <p>{error}</p>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <section className="admin-dashboard__kpis">
        <AdminKpiCard
          icon="💰"
          label="Total Revenue"
          value={loading ? undefined : formatCurrency(stats?.totalRevenue)}
          loading={loading}
        />
        <AdminKpiCard
          icon="📦"
          label="Total Orders"
          value={loading ? undefined : stats?.totalOrders?.toLocaleString()}
          loading={loading}
        />
        <AdminKpiCard
          icon="👥"
          label="Total Users"
          value={loading ? undefined : stats?.totalUsers?.toLocaleString()}
          loading={loading}
        />
        <AdminKpiCard
          icon="📚"
          label="Books in Catalogue"
          value={loading ? undefined : stats?.totalBooks?.toLocaleString()}
          loading={loading}
        />
        <AdminKpiCard
          icon="🧾"
          label="Avg. Order Value"
          value={loading ? undefined : formatCurrency(stats?.avgOrderValue)}
          loading={loading}
        />
      </section>

      {/* ── Sales Chart ────────────────────────────────────────────── */}
      <section className="admin-dashboard__section">
        <AdminSalesChart />
      </section>

      {/* ── Two-column: Top Books + Recent Orders ──────────────────── */}
      <section className="admin-dashboard__grid">
        <div className="admin-dashboard__col">
          <AdminTopBooks />
        </div>
        <div className="admin-dashboard__col">
          <AdminRecentOrders />
        </div>
      </section>
    </main>
  );
}
