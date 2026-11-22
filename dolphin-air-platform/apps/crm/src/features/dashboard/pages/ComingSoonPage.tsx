import { ArrowLeft, Clock3 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const LABELS: Record<string, string> = {
  leads: 'Leads',
  inquiries: 'Inquiries',
  settings: 'Settings',
};

export function ComingSoonPage() {
  const { module = 'workspace' } = useParams();
  const label = LABELS[module] ?? 'Workspace';

  return (
    <section className="coming-soon-page" aria-labelledby="coming-soon-heading">
      <span className="coming-soon-page__icon" aria-hidden="true"><Clock3 size={22} /></span>
      <p className="dashboard-eyebrow">Workspace module</p>
      <h2 id="coming-soon-heading">{label} is not available yet</h2>
      <p>This area will be enabled when its authorized API, permissions and data workflows are implemented.</p>
      <Link to="/"><ArrowLeft size={15} /> Return to dashboard</Link>
    </section>
  );
}
