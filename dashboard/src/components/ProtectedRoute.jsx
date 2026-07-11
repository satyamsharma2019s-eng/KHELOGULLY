import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();

  if (!ready) return null; // avoid flash-redirect before auth state loads
  if (!user) return <Navigate to="/login" replace />;

  // Dashboard is scout/teacher/admin only, matching roleGuard on the backend.
  if (!['scout', 'teacher', 'admin'].includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper font-body">
        <p className="text-ink-soft">
          Your account role does not have access to the scout dashboard.
        </p>
      </div>
    );
  }

  return children;
}
