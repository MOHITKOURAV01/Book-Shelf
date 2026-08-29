import React from 'react';
import AdminAnalytics from '../components/AdminAnalytics.jsx';
import BulkUpload from '../components/BulkUpload.jsx';
import UserTable from '../components/UserTable.jsx';
import LibraryManagementSystem from '../components/LibraryManagementSystem.jsx';
import { usePageMetadata } from '../hooks/usePageMetadata.js';

export default function AdminInventoryPage() {
  usePageMetadata({
    title: 'Admin Management & Inventory',
    description: 'Manage book inventory, upload stock, and view system metrics.',
  });

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
        🛠️ Admin Dashboard & Inventory System
      </h1>
      <p style={{ color: 'var(--ink-soft, #64748b)', marginBottom: '24px' }}>
        Complete store overview, batch catalog operations, and library control.
      </p>

      {/* Analytics Overview */}
      <section style={{ marginBottom: '32px' }}>
        <AdminAnalytics />
      </section>

      {/* Library Management System */}
      <section style={{ marginBottom: '32px' }}>
        <LibraryManagementSystem />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Bulk Upload */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Batch Operations</h2>
          <BulkUpload />
        </div>

        {/* User Management */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>User Roster</h2>
          <UserTable />
        </div>
      </div>
    </main>
  );
}
