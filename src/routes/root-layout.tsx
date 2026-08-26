/**
 * ROOT LAYOUT — the React shell's chrome.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS CHROME CARRIES NO SIGN-OUT CONTROL, DELIBERATELY.
 * ─────────────────────────────────────────────────────────────────────────
 * Plan §4.2: "It must carry no sign-out control: sign-out is net-new and
 * belongs to Inc-6, and shipping it early turns
 * `authentication.feature:124`'s per-area rows red one increment at a time."
 *
 * The legacy navbar (`app/index.html`) advertises the five feature areas and
 * offers no way to sign out — the baseline proved "no screen among all six
 * contains the string 'log out' or 'sign out'". This mirrors that.
 */
import type { ReactElement } from 'react';
import { Link, Outlet } from 'react-router';
import { NotificationArea } from '../components/notification-area';

export function RootLayout(): ReactElement {
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
              <Link to="/travel-request">Travel Request</Link>
            </li>
            <li>
              <Link to="/expenses">Expenses</Link>
            </li>
          </ul>
        </div>
      </nav>

      <NotificationArea />

      <main data-testid="shell-outlet">
        <Outlet />
      </main>
    </>
  );
}
