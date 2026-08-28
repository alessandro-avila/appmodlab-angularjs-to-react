/**
 * LOGIN ROUTE — the Q-8 credential form (ADR-002 Q-8, ADR-010).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED, AND WHAT DELIBERATELY DID NOT
 * ─────────────────────────────────────────────────────────────────────────
 * The legacy login screen had NO inputs: one button that posted a pair of
 * constants (`app/app.routes.js:20`). The green baseline pinned it — "0 input,
 * select or textarea elements and exactly one button". Q-8 authorises the real
 * form, because the API has always checked credentials and a second employee
 * (Mike Chen) has always existed server-side, unreachable through the UI.
 *
 * The BUTTON LABEL is kept as "Enter Portal". It is a perfectly good submit
 * label, and keeping it lets `authentication.feature`'s "the login screen
 * offers a single way in" stay PRESERVED on both the opening scenario and the
 * walk-back-to-login one, rather than superseding for a cosmetic reason.
 *
 * The async ordering carried from `app.routes.js:18-19` is also kept: wait for
 * the token before navigating, or the requireAuth guard bounces straight back.
 *
 * A rejected credential is NOT a session-expiry event. The API client already
 * distinguishes them — a 401 from an `anonymous` call raises no session notice
 * (`api-client.ts:119-123`) — so the message shown here is the login screen's
 * own, and it deliberately does not reveal whether the account exists.
 */
import { useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { login } from '../lib/auth-service';

/** Generalised so it cannot leak whether the account exists. */
const REJECTED = 'Email or password is incorrect.';

export function Login(): ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      // login() is async — wait for the token before changing route,
      // otherwise the requireAuth guard bounces back to /login.
      // (The comment above is carried from app/app.routes.js:18-19.)
      await login(email, password);
      await navigate('/dashboard');
    } catch {
      // The legacy chain had NO rejection handler (finding P-8), so a failed
      // login failed silently. It cannot here: a form the user typed into must
      // say why it was refused.
      setError(REJECTED);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" data-testid="login">
      <h2>Login</h2>
      <p>Sign in with your GlobalTravel Corp account</p>

      <form onSubmit={(e) => void submit(e)} data-testid="login-form">
        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            data-testid="login-email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            data-testid="login-password"
          />
        </div>

        {error ? (
          <div className="alert alert-danger" role="alert" data-testid="login-error">
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={busy} data-testid="enter-portal">
          Enter Portal
        </button>
      </form>
    </div>
  );
}
