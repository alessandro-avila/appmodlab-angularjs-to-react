/**
 * Hotel data access — replaces `hotel-booking.service.js` (Restangular).
 *
 * Goes through Increment 0's single API client, exactly as
 * `flight-search-api.ts` does, so it inherits the one base URL, the one
 * Authorization header, the one error policy and runtime response validation.
 */
import { request } from '../../lib/api-client';
import { toApiValue } from '../../lib/format';
import {
  HotelListSchema,
  RoomListSchema,
  HotelBookingSchema,
  type Hotel,
  type Room,
  type HotelBooking,
  type HotelSearchParams,
} from '../../types/hotel';

export async function searchHotels(params: HotelSearchParams): Promise<Hotel[]> {
  const query = new URLSearchParams({
    city: params.city,
    guests: String(params.guests),
    rooms: String(params.rooms),
  });
  const checkIn = toApiValue(params.checkIn);
  if (checkIn !== null) query.set('checkIn', checkIn);
  const checkOut = toApiValue(params.checkOut);
  if (checkOut !== null) query.set('checkOut', checkOut);

  return request(`/hotels?${query.toString()}`, HotelListSchema);
}

/** `GET /api/hotels/:id/rooms` — five rooms, and none of them has an `id`. */
export async function getHotelRooms(
  hotelId: string,
  params: { checkIn: Date | null; checkOut: Date | null },
): Promise<Room[]> {
  const query = new URLSearchParams();
  const checkIn = toApiValue(params.checkIn);
  if (checkIn !== null) query.set('checkIn', checkIn);
  const checkOut = toApiValue(params.checkOut);
  if (checkOut !== null) query.set('checkOut', checkOut);

  return request(`/hotels/${hotelId}/rooms?${query.toString()}`, RoomListSchema);
}

export interface HotelBookingRequest {
  hotelId: string;
  /**
   * The room `type` — the only natural key the payload offers (see the model).
   *
   * The field is named `roomType` because that is what the server reads:
   * `api-mock/server.js:449` echoes `roomType: req.body.roomType`. The legacy
   * client sent `roomId: selectedRoom.id`, which was `undefined` on both counts
   * — wrong field name AND a property rooms do not have.
   */
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
}

export async function bookRoom(booking: HotelBookingRequest): Promise<HotelBooking> {
  return request('/bookings/hotels', HotelBookingSchema, {
    method: 'POST',
    body: booking,
  });
}
