/**
 * HOTEL BOOKING ROUTE — placeholder.
 *
 * Mirrors the legacy `hotels` state (app/app.routes.js), which today loads
 * `components/...` via templateUrl and its AngularJS controller.
 *
 * Increment 0 migrates nothing. This route is replaced with the real screen in
 * **Inc-2**, at which point the ledger row for `/hotels` flips to
 * `owner: 'react'` and the front door stops proxying it to :8080.
 */
import type { ReactElement } from 'react';
import { Placeholder } from './placeholder';

export function Hotels(): ReactElement {
  return <Placeholder path="/hotels" title="Hotel Booking" />;
}
