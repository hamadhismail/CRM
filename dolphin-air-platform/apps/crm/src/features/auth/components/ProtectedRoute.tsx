import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';
import { StaffRole } from '../types';

export function ProtectedRoute({ roles, permissions }: { roles?: readonly StaffRole[]; permissions?: readonly string[] }) {
  const { user, loading, needsOrganizationSelection, accessDenied } = useAuth();
  if (loading) return <main className="auth-loading" aria-live="polite">Checking your session…</main>;
  if (accessDenied) return <Navigate to="/access-denied" replace />;
  if (needsOrganizationSelection) return <Navigate to="/select-organization" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  if (permissions && !permissions.every((permission) => user.permissions.includes(permission))) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
