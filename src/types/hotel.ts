/**
 * Hotel contract types, generated from `specs/contracts/api/hotel-booking.yaml`
 * and verified against the running mock API during Increment 2 discovery
 * (`specs/docs/architecture/hotel-booking-room-path.md`).
 *
 * ADR-011 §4: the TypeScript type is INFERRED FROM the schema, never declared
 * beside it.
 *
 * TWO SHAPES SHARE THE NAME "room", AND THE DIFFERENCE CAUSED A REAL DEFECT.
 * A HOTEL has `pricePerNight`; a ROOM has `price`. The legacy controller read
 * `pricePerNight` off a room (`hotel-booking.controller.js:231`), which does not
 * exist there, and the booking total was `NaN`. The types below make that
 * mistake a compile error.
 */
import { z } from 'zod';

/**
 * The room shape embedded in a hotel (`type, price, available` — three keys).
 * NEVER RENDERED: `selectHotel()` overwrites `hotel.rooms` with the richer
 * payload from `/api/hotels/:id/rooms` before the panel appears. Modelled so the
 * hotel schema validates, not because anything consumes it.
 */
export const EmbeddedRoomSchema = z.object({
  type: z.string(),
  price: z.number(),
  available: z.number(),
});

export const HotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  rating: z.number(),
  reviewCount: z.number(),
  /** Note: on a HOTEL this field exists. On a ROOM it does not. */
  pricePerNight: z.number(),
  amenities: z.array(z.string()),
  featured: z.boolean(),
  rooms: z.array(EmbeddedRoomSchema),
  // NO `address` — the API never sends one. `hotel-booking.feature:91` pins
  // that the address is never shown, and it is PRESERVED.
});
export type Hotel = z.infer<typeof HotelSchema>;
export const HotelListSchema = z.array(HotelSchema);

/**
 * The room shape from `GET /api/hotels/:id/rooms` — five keys, and **no `id`**.
 *
 * The absence of `id` is the root cause of P-7: the legacy template repeated
 * `track by room.id`, producing five `undefined` keys, so AngularJS threw
 * `ngRepeat:dupes` and the table never rendered. Declaring an `id` here would
 * make the compiler agree with a field the server has never sent.
 *
 * `type` IS unique within a response (verified across every sampled response),
 * so it is the natural key — for React's list keys and for the booking payload.
 */
export const RoomSchema = z.object({
  type: z.string(),
  price: z.number(),
  available: z.number(),
  beds: z.string(),
  maxGuests: z.number(),
});
export type Room = z.infer<typeof RoomSchema>;
export const RoomListSchema = z.array(RoomSchema);

/**
 * `POST /api/bookings/hotels` response.
 *
 * Note `confirmationNumber` — the legacy controller read `confirmationCode`
 * (`hotel-booking.controller.js:237`), which does not exist here, so the
 * notification rendered the literal text "undefined".
 *
 * Unlike the flight equivalent, this one is CORRECTED rather than reproduced.
 * increment-plan §6.5 scenario 24 authorises it under ADR-005 and Q-3: the
 * scenario documenting it exists only because the room table never rendered, so
 * there is no reachable behaviour to preserve.
 */
export const HotelBookingSchema = z.object({
  confirmationNumber: z.string(),
  hotelId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  status: z.string(),
  bookedAt: z.string(),
});
export type HotelBooking = z.infer<typeof HotelBookingSchema>;

export type HotelSortBy = 'recommended' | 'priceLow' | 'priceHigh' | 'rating';

export interface HotelSearchParams {
  city: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  rooms: number;
}

export interface HotelFilters {
  minRating: number;
  maxPrice: number;
  amenities: string[];
  sortBy: HotelSortBy;
}
