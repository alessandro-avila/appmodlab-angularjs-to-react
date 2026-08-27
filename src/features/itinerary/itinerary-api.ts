/**
 * Itinerary data access — the Restangular replacement for
 * `app/components/itinerary/itinerary.service.js`.
 *
 * Everything goes through `api-client`, which owns the base URL, the auth
 * header, the error policy and runtime response validation (ADR-011 §4).
 *
 * WHAT THE OLD SERVICE DID THAT THIS DOES NOT:
 *   `getTrips()` overwrote `trip.totalCost` with the client-side item sum
 *   (`itinerary.service.js:19`). Q-6 / ADR-020 moved that to the server, so the
 *   client renders what it is given.
 *
 *   `getTripDetails()` decorated every item with `dateFormatted`,
 *   `timeFormatted` and `costFormatted` (`:34-37`), mutating the payload on the
 *   way past. Formatting is a rendering concern and now lives in the model and
 *   the component; the payload arrives unmodified.
 */
import { request } from '../../lib/api-client';
import { createQuery } from '../../lib/query';
import {
  TripListSchema,
  TripSchema,
  ItineraryItemResponseSchema,
  type Trip,
  type ItineraryItem,
} from '../../types/itinerary';

/** GET /api/trips */
export async function getTrips(): Promise<Trip[]> {
  return request('/trips', TripListSchema);
}

/** GET /api/trips/:id */
export async function getTripDetails(tripId: string): Promise<Trip> {
  return request(`/trips/${tripId}`, TripSchema);
}

/**
 * POST /api/itinerary-items/:id/notes — `itinerary.service.js:50-53`.
 *
 * The body is unchanged from the legacy: `{ text, createdAt }`. The server
 * reads `req.body.notes`, so nothing is stored. That defect is PRESERVED — it
 * is pinned by `itinerary.feature` and nothing authorises fixing it.
 */
export async function addNote(itemId: string, text: string): Promise<ItineraryItem> {
  return request(`/itinerary-items/${itemId}/notes`, ItineraryItemResponseSchema, {
    method: 'POST',
    body: { text, createdAt: new Date().toISOString() },
  });
}

/** PUT /api/itinerary-items/:id — `itinerary.service.js:62`. */
export async function cancelItem(itemId: string): Promise<ItineraryItem> {
  return request(`/itinerary-items/${itemId}`, ItineraryItemResponseSchema, {
    method: 'PUT',
    body: { status: 'cancelled' },
  });
}

/**
 * THE ITINERARY QUERY — the replacement for `itinerary:refresh`.
 *
 * `GET /api/trips` is idempotent and server-owned, which is what makes it the
 * one resource in this app that may be cached (ADR-021). Both booking flows
 * call `invalidateItinerary()` instead of broadcasting, and any live itinerary
 * view reloads.
 *
 * `announceAs` keeps the harness's existing observation point working:
 * `flight-search.feature:231` — "the itinerary is asked to refresh" — asserts
 * the same name it always did. The behaviour is preserved; only the mechanism
 * beneath it changed, so the scenario is NOT superseded.
 */
export const itineraryQuery = createQuery(getTrips, { announceAs: 'itinerary:refresh' });

export function invalidateItinerary(): void {
  itineraryQuery.invalidate();
}
