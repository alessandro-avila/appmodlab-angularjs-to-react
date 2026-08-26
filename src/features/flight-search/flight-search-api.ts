/**
 * Flight data access — replaces `flight-search.service.js` (Restangular).
 *
 * Goes through Increment 0's single API client, so it inherits the one base URL
 * from configuration, the one Authorization header, the one error policy and
 * runtime response validation (ADR-011 §4).
 *
 * The legacy service also decorated every flight with `departureFormatted`,
 * `arrivalFormatted`, `durationFormatted`, `priceFormatted` and
 * `departDateFormatted` (`service.js:21-28`). Those are presentation concerns
 * and now live in the component, computed from the model's formatters — finding
 * P-9, "business logic embedded in templates", resolved by computing in the
 * component and rendering values.
 */
import { request } from '../../lib/api-client';
import {
  FlightListSchema,
  FlightBookingSchema,
  type Flight,
  type FlightBooking,
  type SearchParams,
} from '../../types/flight';
import { toApiValue } from './flight-search-model';

/**
 * GET /api/flights — the query the legacy Restangular `getList(params)` sent.
 *
 * `controller:107-110` formatted the dates with moment before the call; that is
 * now `toApiValue`, which formats explicitly (ADR-009 item 2).
 */
export async function searchFlights(params: SearchParams, signal?: AbortSignal): Promise<Flight[]> {
  const query = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    passengers: String(params.passengers),
    cabinClass: params.cabinClass,
    tripType: params.tripType,
  });

  const depart = toApiValue(params.departDate);
  if (depart !== null) query.set('departDate', depart);
  const back = toApiValue(params.returnDate);
  if (back !== null) query.set('returnDate', back);

  return request(
    `/flights?${query.toString()}`,
    FlightListSchema,
    signal ? { signal } : {},
  );
}

/** POST /api/flights/:id/book — `service.js:38-40` via `customPOST`. */
export async function bookFlight(
  flightId: string,
  details: { passengers: number; cabinClass: string },
): Promise<FlightBooking> {
  return request(`/flights/${flightId}/book`, FlightBookingSchema, {
    method: 'POST',
    body: details,
  });
}
