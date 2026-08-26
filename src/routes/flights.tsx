/**
 * FLIGHT SEARCH ROUTE — placeholder.
 *
 * Mirrors the legacy `flights` state (app/app.routes.js), which today loads
 * `components/...` via templateUrl and its AngularJS controller.
 *
 * Increment 0 migrates nothing. This route is replaced with the real screen in
 * **Inc-1**, at which point the ledger row for `/flights` flips to
 * `owner: 'react'` and the front door stops proxying it to :8080.
 */
import type { ReactElement } from 'react';
import { Placeholder } from './placeholder';

export function Flights(): ReactElement {
  return <Placeholder path="/flights" title="Flight Search" />;
}
