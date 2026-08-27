/**
 * ITINERARY ROUTE — migrated in Increment 3.
 *
 * The ledger row for `/itinerary` is now `owner: 'react'`, so the front door
 * serves this route instead of redirecting to `#!/itinerary` on :8080.
 */
import type { ReactElement } from 'react';
import { Itinerary as ItineraryScreen } from '../features/itinerary/Itinerary';

export function Itinerary(): ReactElement {
  return <ItineraryScreen />;
}
