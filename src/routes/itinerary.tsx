/**
 * ITINERARY ROUTE — placeholder.
 *
 * Mirrors the legacy `itinerary` state (app/app.routes.js), which today loads
 * `components/...` via templateUrl and its AngularJS controller.
 *
 * Increment 0 migrates nothing. This route is replaced with the real screen in
 * **Inc-3**, at which point the ledger row for `/itinerary` flips to
 * `owner: 'react'` and the front door stops proxying it to :8080.
 */
import type { ReactElement } from 'react';
import { Placeholder } from './placeholder';

export function Itinerary(): ReactElement {
  return <Placeholder path="/itinerary" title="Itinerary" />;
}
