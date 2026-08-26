/**
 * TRAVEL REQUEST ROUTE — placeholder.
 *
 * Mirrors the legacy `travelRequest` state (app/app.routes.js), which today loads
 * `components/...` via templateUrl and its AngularJS controller.
 *
 * Increment 0 migrates nothing. This route is replaced with the real screen in
 * **Inc-4**, at which point the ledger row for `/travel-request` flips to
 * `owner: 'react'` and the front door stops proxying it to :8080.
 */
import type { ReactElement } from 'react';
import { Placeholder } from './placeholder';

export function TravelRequest(): ReactElement {
  return <Placeholder path="/travel-request" title="Travel Request" />;
}
