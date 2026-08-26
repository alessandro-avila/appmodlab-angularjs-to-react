/**
 * FLIGHTS ROUTE — migrated to React in Increment 1.
 *
 * The placeholder is replaced by the real screen. The ledger row for `/flights`
 * flips to `owner: 'react'` in the same increment, which is what stops the front
 * door redirecting this path to `/#!/flights` and starts Vite serving the React
 * document for it.
 */
import type { ReactElement } from 'react';
import { FlightSearch } from '../features/flight-search/FlightSearch';

export function Flights(): ReactElement {
  return <FlightSearch />;
}
