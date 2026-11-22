import { LogOut, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';

export function WorkspacePage() {
  const { user, logout } = useAuth();
  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <div className="brand-lockup"><span className="brand-lockup__mark" aria-hidden="true">D</span><span>Dolphin Air Services</span></div>
        <div className="workspace-topbar__right"><span className="workspace-user">{user?.displayName}<small>{user?.role}</small></span><button type="button" className="workspace-logout" onClick={() => void logout()}><LogOut size={16} /> Sign out</button></div>
      </header>
      <section className="workspace-welcome"><p>Staff workspace</p><h1>Welcome, {user?.displayName}</h1><span>Your identity is verified. CRM modules will appear here as they are built.</span>{user?.permissions.includes('identity.users.read') && <Link className="workspace-admin-link" to="/staff"><Shield size={17} /> Manage team access</Link>}</section>
    </main>
  );
}
