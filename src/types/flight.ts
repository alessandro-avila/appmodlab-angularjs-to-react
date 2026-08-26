/**
 * Flight contract types, generated from `specs/contracts/api/flight-search.yaml`
 * and verified against the running mock API.
 *
 * ADR-011 §4: the TypeScript type is INFERRED FROM the schema, never declared
 * beside it. Verified payload keys:
 *   id, airline, origin, destination, departDate, departureTime, arrivalTime,
 *   durationMinutes, stops, price, cabinClass, booked
 *
 * TWO ABSENCES ARE DELIBERATE AND LOAD-BEARING:
 *
 * 1. There is NO `flightNumber`. The legacy template renders
 *    `{{flight.flightNumber}}`, which is undefined and therefore blank —
 *    pinned by `flight-search.feature:177` "Flights are offered without a
 *    flight number". Adding it to the schema would make the compiler agree with
 *    a field the server has never sent (finding P-7).
 *
 * 2. `departDate` is whatever the generator stamps — always "now" — regardless
 *    of the departure date requested. Pinned by `flight-search.feature:62`.
 */
import { z } from 'zod';

export const FlightSchema = z.object({
  id: z.string(),
  airline: z.string(),
  origin: z.string(),
  destination: z.string(),
  /** Full ISO timestamp. The generator ignores the requested date — feature:62. */
  departDate: z.string(),
  /** "HH:mm", 24-hour, zero-padded. */
  departureTime: z.string(),
  arrivalTime: z.string(),
  durationMinutes: z.number(),
  stops: z.number(),
  price: z.number(),
  cabinClass: z.string(),
  booked: z.boolean(),
});
export type Flight = z.infer<typeof FlightSchema>;

export const FlightListSchema = z.array(FlightSchema);

/**
 * POST /api/flights/:id/book response.
 *
 * NOTE the field name: `confirmationNumber`. The legacy controller reads
 * `booking.confirmationCode` (`flight-search.controller.js:220`), which does not
 * exist on this payload, so the notification it builds ends in the literal text
 * "undefined". That defect is reproduced deliberately — see
 * `src/features/flight-search/flight-search-model.ts`.
 */
export const FlightBookingSchema = z.object({
  confirmationNumber: z.string(),
  flightId: z.string(),
  status: z.string(),
  bookedAt: z.string(),
});
export type FlightBooking = z.infer<typeof FlightBookingSchema>;

export type TripType = 'roundtrip' | 'oneway';
export type StopsFilter = 'any' | '0' | '1' | '2';
export type DepartTimeRange = 'any' | 'morning' | 'afternoon' | 'evening';
export type SortField = 'price' | 'durationMinutes' | 'departureTime';

export interface SearchParams {
  origin: string;
  destination: string;
  /** null until chosen — mirrors the legacy `$scope.searchParams.departDate`. */
  departDate: Date | null;
  returnDate: Date | null;
  passengers: number;
  cabinClass: string;
  tripType: TripType;
}

export interface Filters {
  maxPrice: number;
  stops: StopsFilter;
  airline: string;
  departTimeRange: DepartTimeRange;
}

export interface PriceRange {
  min: number;
  max: number;
}
