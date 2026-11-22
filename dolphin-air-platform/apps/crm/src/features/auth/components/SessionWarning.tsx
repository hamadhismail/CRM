import { useAuth } from '../../../app/providers/AuthProvider';

export function SessionWarning() {
  const { sessionWarning, continueSession, logout } = useAuth();
  if (!sessionWarning) return null;
  return (
    <div className="session-scrim" role="presentation">
      <section className="session-dialog" role="alertdialog" aria-modal="true" aria-labelledby="session-title">
        <p className="session-dialog__label">Security timeout</p>
        <h2 id="session-title">Your session is about to expire</h2>
        <p>Continue working to keep your session open, or sign out now.</p>
        <div className="session-dialog__actions">
          <button className="button button--quiet" onClick={() => void logout()}>Sign out</button>
          <button className="button button--primary" onClick={() => void continueSession()}>Continue session</button>
        </div>
      </section>
    </div>
  );
}
