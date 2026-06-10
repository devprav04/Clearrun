import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role) && !user.is_superuser) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="text-center">
          <h2 className="t-heading mb-2" style={{ color: 'var(--red)' }}>Access Denied</h2>
          <p className="t-body">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
