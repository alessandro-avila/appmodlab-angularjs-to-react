/**
 * TRAVEL REQUEST ROUTE — migrated in Increment 4.
 *
 * The ledger row for `/travel-request` is now `owner: 'react'`, so the front
 * door serves this route instead of redirecting to `#!/travel-request`.
 */
import type { ReactElement } from 'react';
import { TravelRequestScreen } from '../features/travel-request/TravelRequest';

export function TravelRequest(): ReactElement {
  return <TravelRequestScreen />;
}
