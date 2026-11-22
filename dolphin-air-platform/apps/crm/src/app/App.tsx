import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { SessionWarning } from '../features/auth/components/SessionWarning';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { StaffUsersPage } from '../features/staff/pages/StaffUsersPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { WorkspaceShell } from '../features/dashboard/components/WorkspaceShell';
import { UnauthorizedPage } from './UnauthorizedPage';
import { ComingSoonPage } from '../features/dashboard/pages/ComingSoonPage';
import { LeadsPage } from '../features/leads/pages/LeadsPage';
import { OrganizationAccessPage } from '../features/auth/pages/OrganizationAccessPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/select-organization" element={<OrganizationAccessPage />} />
          <Route path="/access-denied" element={<OrganizationAccessPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route element={<ProtectedRoute permissions={['profile.read']} />}>
            <Route element={<WorkspaceShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/coming-soon/:module" element={<ComingSoonPage />} />
              <Route element={<ProtectedRoute permissions={['leads.read']} />}>
                <Route path="/leads" element={<LeadsPage />} />
              </Route>
            </Route>
          </Route>
          <Route element={<ProtectedRoute permissions={['identity.users.read']} />}>
            <Route path="/staff" element={<StaffUsersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SessionWarning />
      </BrowserRouter>
    </AuthProvider>
  );
}
