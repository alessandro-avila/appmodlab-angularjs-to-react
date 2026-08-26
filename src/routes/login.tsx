/**
 * LOGIN ROUTE — a faithful mirror of the legacy login state
 * (`app/app.routes.js:13-26`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A BUTTON AND NOT A CREDENTIAL FORM
 * ─────────────────────────────────────────────────────────────────────────
 * The legacy login screen has NO inputs. It is one button labelled "Enter
 * Portal" that calls `AuthService.login('demo@globaltravel.com', 'password')`
 * with hardcoded credentials (`app.routes.js:20`). The green baseline proved
 * it: the login view contains "0 input, select or textarea elements and
 * exactly one button".
 *
 * A real multi-user credential form is **Q-8**, which is NET-NEW behaviour
 * scheduled for **Inc-6** (ADR-010). Building it here would supersede
 * `authentication.feature:43`, `:82` and `:89` five increments early, in the
 * increment whose Gherkin delta must be a literal 0 / 235 / 0.
 *
 * So this route reproduces the legacy behaviour exactly — including the
 * hardcoded credentials and the async ordering bug-fix comment carried in the
 * legacy source, which waits for the token before navigating so the
 * requireAuth guard does not bounce back to /login.
 *
 * It is NOT reachable by a user in Increment 0: the front door still routes
 * /login to AngularJS. It exists to prove the auth store port works end to end.
 */
import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router';
import { login } from '../lib/auth-service';
import { notify } from '../stores/notification-store';

/** `app/app.routes.js:20` — the hardcoded demo credentials, unchanged. */
const DEMO_EMAIL = 'demo@globaltravel.com';
const DEMO_PASSWORD = 'password';

export function Login(): ReactElement {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function enter(): Promise<void> {
    setBusy(true);
    try {
      // login() is async — wait for the token before changing route,
      // otherwise the requireAuth guard bounces back to /login.
      // (The comment above is carried from app/app.routes.js:18-19.)
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      await navigate('/dashboard');
    } catch (error) {
      // The legacy chain has NO rejection handler (finding P-8) so a failed
      // login fails silently. The React client has one error policy (plan
      // §4.2). Unobservable in Inc-0 — no user can reach this route.
      notify(error instanceof Error ? error.message : 'Sign-in failed', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" data-testid="login">
      <h2>Login</h2>
      <p>Mock login - click to enter</p>
      <button type="button" onClick={() => void enter()} disabled={busy} data-testid="enter-portal">
        Enter Portal
      </button>
    </div>
  );
}
