import { FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthProvider';

export function LoginPage() {
  const { user, needsOrganizationSelection, accessDenied, providerReady, providerError, login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;
  if (needsOrganizationSelection) return <Navigate to="/select-organization" replace />;
  if (accessDenied) return <Navigate to="/access-denied" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, remember);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(remember);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Dolphin Air Services staff workspace">
        <div className="brand-panel__decoration brand-panel__decoration--one" aria-hidden="true" />
        <div className="brand-panel__decoration brand-panel__decoration--two" aria-hidden="true" />
        <div className="brand-panel__content">
          <div className="brand-lockup"><span className="brand-lockup__mark" aria-hidden="true">D</span><span>Dolphin Air Services</span></div>
          <div className="brand-panel__message">
            <p className="brand-panel__rule" aria-hidden="true" />
            <h1>Welcome to your<br />staff workspace.</h1>
            <p>Sign in with your approved staff account to continue.</p>
          </div>
          <div className="brand-panel__footer"><ShieldCheck size={16} strokeWidth={1.8} /><span>Access is limited to authorized staff</span></div>
        </div>
      </section>

      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <div className="mobile-brand-lockup"><span className="brand-lockup__mark" aria-hidden="true">D</span><span>Dolphin Air Services</span></div>
          <div className="login-heading">
            <h2 id="login-title">Welcome back</h2>
            <p>Enter your staff credentials to sign in.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="field-label" htmlFor="staff-email">Work email</label>
            <input
              id="staff-email"
              className="text-field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={loading || !providerReady}
            />

            <div className="field-label-row"><label className="field-label" htmlFor="staff-password">Password</label></div>
            <div className="password-field-wrap">
              <LockKeyhole size={17} className="password-field-icon" aria-hidden="true" />
              <input
                id="staff-password"
                className="text-field text-field--password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={loading || !providerReady}
              />
              <button
                className="password-visibility"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                disabled={!providerReady}
              >{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>

            <label className="remember-control">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={!providerReady} />
              <span>Keep me signed in on this device</span>
            </label>

            {(error || providerError) && <p className="form-error" role="alert">{error || providerError}</p>}

            <button className="button button--primary login-submit" type="submit" disabled={loading || !providerReady || !email || !password}>
              <span>{loading ? 'Signing in…' : 'Sign in'}</span><ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <div className="login-divider"><span>or</span></div>
          <button className="button button--google" type="button" disabled={loading || !providerReady} onClick={() => void handleGoogleSignIn()}>
            <GoogleMark /><span>Continue with Google</span>
          </button>
          <p className="login-help">Need access or a password reset? Contact your Dolphin Air administrator.</p>
        </div>
        <footer className="login-footer"><span>© {new Date().getFullYear()} Dolphin Air Services</span><span>Staff access</span></footer>
      </section>
    </main>
  );
}

function GoogleMark() {
  return <svg className="google-mark" aria-hidden="true" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.92c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6c4.51-4.17 7.09-10.31 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.99 23.99 0 0 0 0 21.56l7.98-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.45-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}
