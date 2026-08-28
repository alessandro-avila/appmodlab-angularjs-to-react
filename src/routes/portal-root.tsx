/**
 * THE PORTAL ROOT — what `/` renders.
 *
 * ADR-012 §3 specifies this exactly, and it is the landing place for every
 * legacy hash address:
 *
 *   1. The browser transmits `GET /`; the fragment is never sent.
 *   2. The front door serves the React document at `/`.
 *   3. React's router matches on `pathname === "/"` and renders the portal
 *      root — the login screen for a stranger, the dashboard for a signed-in
 *      user.
 *   4. The fragment remains in the address bar and is ignored.
 *
 * "There is no error, no 404, and no blank page."
 *
 * So this RENDERS rather than redirects. A redirect would rewrite the URL and
 * discard the fragment, which is a different observable outcome from the one
 * the ADR pins — and would also make `/#!/flights` indistinguishable from a
 * deliberate visit to `/login`.
 */
import type { ReactElement } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { Login } from './login';
import { Dashboard } from './dashboard';

export function PortalRoot(): ReactElement | null {
  const authenticated = useAuthStore((s) => s.isAuthenticated());
  const restoring = useAuthStore((s) => s.restoring);

  // Same reasoning as the route guard: do not show a signed-in traveller the
  // login screen for the moment it takes to confirm who they are.
  if (authenticated && restoring) return null;

  return authenticated ? <Dashboard /> : <Login />;
}
