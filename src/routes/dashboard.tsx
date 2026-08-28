/**
 * DASHBOARD ROUTE — a faithful port of the legacy `dashboard` state
 * (`app/app.routes.js:27-31`), which was an inline template.
 *
 * Legacy, verbatim:
 *   <div class="container"><h1>GlobalTravel Corp Portal</h1><ul>
 *     <li><a ui-sref="flights">Search Flights</a></li>
 *     <li><a ui-sref="hotels">Book Hotels</a></li>
 *     <li><a ui-sref="itinerary">Manage Itinerary</a></li>
 *     <li><a ui-sref="travelRequest">Submit Travel Request</a></li>
 *     <li><a ui-sref="expenses">Expense Reconciliation</a></li>
 *   </ul></div>
 *
 * The five link LABELS are pinned by `The dashboard is the way into every
 * module`, so they are reproduced exactly — note they differ from the navbar's
 * labels, which are shorter, and the baseline pins both sets separately.
 *
 * NO BUTTONS. `The dashboard carries no controls at all` asserts the dashboard
 * has none, and it PRESERVES because sign-out lives in the navbar (see
 * `root-layout.tsx` for why that placement was chosen).
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router';

const MODULES: readonly (readonly [string, string])[] = [
  ['/flights', 'Search Flights'],
  ['/hotels', 'Book Hotels'],
  ['/itinerary', 'Manage Itinerary'],
  ['/travel-request', 'Submit Travel Request'],
  ['/expenses', 'Expense Reconciliation'],
];

export function Dashboard(): ReactElement {
  return (
    <div className="container" data-testid="dashboard">
      <h1>GlobalTravel Corp Portal</h1>
      <ul>
        {MODULES.map(([path, label]) => (
          <li key={path}>
            <Link to={path}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
