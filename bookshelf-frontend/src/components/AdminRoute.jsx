import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/**
 * AdminRoute — a route guard that requires both authentication and the
 * admin role.  Wraps the same loading / redirect pattern as ProtectedRoute
 * but adds the role check.
 *
 * Usage:
 *   <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
 */
export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}
        aria-busy="true"
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
