import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return <main className="auth-loading"><section className="unauthorized-card"><h1>Access not available</h1><p>Your staff account does not have permission to view this area.</p><Link to="/">Return to workspace</Link></section></main>;
}
