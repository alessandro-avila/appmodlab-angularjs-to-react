/**
 * ROOT LAYOUT — the React shell's chrome.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIGN-OUT LIVES HERE, AND ONLY WHEN SIGNED IN
 * ─────────────────────────────────────────────────────────────────────────
 * Sign-out is NET-NEW in Increment 6 (ADR-010). It did not exist in the 2016
 * product: `AuthService.logout` had no caller, no screen offered the control,
 * and `$rootScope` carried zero `auth:logout` listeners at all times.
 *
 * Plan §10.4 left the placement open — navbar or dashboard — and required a
 * decision either way. **The navbar** is chosen because it is the only chrome
 * all six screens share. On the dashboard the control would be unreachable
 * from the five feature screens, so signing out would mean navigating home
 * first. That also settles the pending scenario `The dashboard carries no
 * controls at all`, which PRESERVES.
 *
 * It renders only when authenticated. That is what lets `The navigation bar
 * advertises the protected areas to a stranger` — which asserts the navbar
 * "offers no way to sign out" — stay PRESERVED for a signed-out visitor while
 * all six rows of the sign-out outline supersede for a signed-in one.
 */
import type { ReactElement } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { NotificationArea } from '../components/notification-area';
import { useAuthStore } from '../stores/auth-store';
import { logout } from '../lib/auth-service';

export function RootLayout(): ReactElement {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signedIn = useAuthStore((s) => s.isAuthenticated());

  async function signOut(): Promise<void> {
    await logout();
    await navigate('/login');
  }

  return (
    <>
      <nav className="navbar navbar-inverse navbar-fixed-top">
        <div className="container">
          <div className="navbar-header">
            <Link className="navbar-brand" to="/dashboard">
              GlobalTravel Corp
            </Link>
          </div>
          <ul className="nav navbar-nav">
            <li>
              <Link to="/flights">Flights</Link>
            </li>
            <li>
              <Link to="/hotels">Hotels</Link>
            </li>
            <li>
              <Link to="/itinerary">Itinerary</Link>
            </li>
            <li>
              {/* "Travel Requests", plural — app/index.html:34. The dashboard
                  says "Submit Travel Request", singular. The baseline pins
                  both label sets separately, so they must not be unified. */}
              <Link to="/travel-request">Travel Requests</Link>
            </li>
            <li>
              <Link to="/expenses">Expenses</Link>
            </li>
          </ul>

          {signedIn ? (
            <ul className="nav navbar-nav navbar-right">
              {user ? (
                <li>
                  <span data-testid="nav-identity">{user.name}</span>
                </li>
              ) : null}
              <li>
                <button
                  type="button"
                  className="btn btn-link navbar-btn"
                  onClick={() => void signOut()}
                  data-testid="sign-out"
                >
                  Sign Out
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </nav>

      <NotificationArea />

      <main data-testid="shell-outlet">
        <Outlet />
      </main>
    </>
  );
}
