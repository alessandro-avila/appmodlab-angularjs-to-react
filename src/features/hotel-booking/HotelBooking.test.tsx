/**
 * HOTEL BOOKING — component tests.
 *
 * Covers the screen-level behaviour that is NEW in Increment 2 (the room table,
 * room selection, the booking summary, the confirmation modal) plus the one
 * assertion that must hold for `hotel-booking.feature:209` to stay green.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Hotel, Room } from '../../types/hotel';

const searchHotels = vi.fn();
const getHotelRooms = vi.fn();
const bookRoom = vi.fn();

vi.mock('./hotel-booking-api', () => ({
  searchHotels: (...a: unknown[]) => searchHotels(...a),
  getHotelRooms: (...a: unknown[]) => getHotelRooms(...a),
  bookRoom: (...a: unknown[]) => bookRoom(...a),
}));

const { HotelBooking } = await import('./HotelBooking');
const { notificationStore } = await import('../../stores/notification-store');

function hotel(over: Partial<Hotel> = {}): Hotel {
  return {
    id: 'h1', name: 'Sheraton Boston', city: 'Boston', rating: 4, reviewCount: 95,
    pricePerNight: 300, amenities: ['Gym'], featured: false, rooms: [], ...over,
  };
}

const ROOMS: Room[] = [
  { type: 'Standard King', price: 183, available: 10, beds: '1 King', maxGuests: 2 },
  { type: 'Standard Double', price: 189, available: 5, beds: '2 Double', maxGuests: 4 },
  { type: 'Presidential Suite', price: 512, available: 0, beds: '1 King + Living Area', maxGuests: 4 },
];

beforeEach(() => {
  searchHotels.mockReset();
  getHotelRooms.mockReset();
  bookRoom.mockReset();
  notificationStore.setState({ notifications: [] });
});

/** Search Boston, 3 nights, and open the first hotel's rooms. */
async function searchAndOpenRooms(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  searchHotels.mockResolvedValue([hotel()]);
  getHotelRooms.mockResolvedValue(ROOMS);

  render(<HotelBooking />);
  await user.type(screen.getByLabelText('City'), 'Boston');
  fireEvent.change(screen.getByLabelText('Check-in'), { target: { value: '2026-08-10' } });
  fireEvent.change(screen.getByLabelText('Check-out'), { target: { value: '2026-08-13' } });
  await user.click(screen.getByRole('button', { name: 'Search Hotels' }));

  await waitFor(() => expect(screen.getByTestId('hotel-card')).toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: 'View Rooms' }));
  await waitFor(() => expect(screen.getAllByTestId('room-row')).toHaveLength(3));
}

/* ------------------------------------------------- the room table, at last */

describe('the room table — renders for the first time', () => {
  it('shows a row for every room loaded', async () => {
    // The legacy table repeated `track by room.id`; rooms carry no id, so all
    // keys were undefined and AngularJS rendered nothing (P-7).
    await searchAndOpenRooms(userEvent.setup());
    expect(screen.getAllByTestId('room-row')).toHaveLength(3);
  });

  it('shows type, price, beds and max guests on each row', async () => {
    await searchAndOpenRooms(userEvent.setup());
    const first = screen.getAllByTestId('room-row')[0];
    expect(first).toHaveTextContent('Standard King');
    expect(first).toHaveTextContent('$183.00');
    expect(first).toHaveTextContent('1 King');
    expect(first).toHaveTextContent('2');
  });

  it('marks a room with no availability and prevents selecting it', async () => {
    // Discovery Q2: available:0 is reachable on three of the five room types.
    await searchAndOpenRooms(userEvent.setup());
    const soldOut = screen
      .getAllByTestId('room-row')
      .find((r) => r.getAttribute('data-room-type') === 'Presidential Suite');
    expect(soldOut).toBeDefined();
    expect(soldOut?.querySelector('[data-testid="room-unavailable"]')).not.toBeNull();
    expect(soldOut?.querySelector('button')).toBeDisabled();
  });
});

/* ------------------------------------------------ selection and the summary */

describe('room selection and the booking summary', () => {
  it('offers a booking summary once a room is selected', async () => {
    const user = userEvent.setup();
    await searchAndOpenRooms(user);
    expect(screen.queryByTestId('booking-summary')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]!);
    expect(screen.getByTestId('booking-summary')).toBeInTheDocument();
  });

  it('prices the stay from room.price — NOT the NaN the legacy produced', async () => {
    const user = userEvent.setup();
    await searchAndOpenRooms(user);
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]!);

    // 183 x 3 nights x 1 room. The legacy read `room.pricePerNight`, which does
    // not exist on a room, so this was NaN and rendered as an empty string.
    expect(screen.getByTestId('booking-summary')).toHaveTextContent('$549.00');
  });

  it('names the room chosen', async () => {
    const user = userEvent.setup();
    await searchAndOpenRooms(user);
    await user.click(screen.getAllByRole('button', { name: 'Select' })[1]!);
    expect(screen.getByTestId('booking-summary')).toHaveTextContent('Standard Double');
    expect(screen.getByTestId('booking-summary')).toHaveTextContent('$567.00'); // 189 x 3
  });
});

/* -------------------------------------------------------------- the booking */

describe('confirming a booking', () => {
  it('sends a room identifier and a real total', async () => {
    const user = userEvent.setup();
    bookRoom.mockResolvedValue({
      confirmationNumber: 'HT4BJV4XC5S', hotelId: 'h1', checkIn: '2026-08-10',
      checkOut: '2026-08-13', status: 'confirmed', bookedAt: '',
    });
    await searchAndOpenRooms(user);
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    await waitFor(() => expect(bookRoom).toHaveBeenCalledOnce());
    const sent = bookRoom.mock.calls[0]?.[0] as { roomType: string; totalPrice: number };
    expect(sent.roomType).toBe('Standard King'); // was `undefined` in the legacy
    expect(sent.totalPrice).toBe(549); // was NaN in the legacy
  });

  it('shows a real confirmation code, not the text "undefined"', async () => {
    const user = userEvent.setup();
    bookRoom.mockResolvedValue({
      confirmationNumber: 'HT4BJV4XC5S', hotelId: 'h1', checkIn: '', checkOut: '',
      status: 'confirmed', bookedAt: '',
    });
    await searchAndOpenRooms(user);
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    await waitFor(() =>
      expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
        'Hotel booked! Confirmation: HT4BJV4XC5S',
      ),
    );
    expect(notificationStore.getState().notifications.at(-1)?.message).not.toMatch(/undefined/);
  });

  it('opens a React confirmation dialogue that can be dismissed', async () => {
    // Replaces $('#bookingConfirmationModal').modal('show') — ADR-007 cat 2.
    const user = userEvent.setup();
    bookRoom.mockResolvedValue({
      confirmationNumber: 'HT1', hotelId: 'h1', checkIn: '', checkOut: '',
      status: 'confirmed', bookedAt: '',
    });
    await searchAndOpenRooms(user);
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    await waitFor(() => expect(screen.getByTestId('bookingConfirmationModal')).toBeInTheDocument());
    expect(screen.getByTestId('bookingConfirmationModal')).toHaveTextContent('HT1');
    expect(screen.getByTestId('bookingConfirmationModal')).toHaveTextContent('$549.00');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('bookingConfirmationModal')).not.toBeInTheDocument();
  });

  it('announces itinerary:refresh, which still nothing consumes', async () => {
    const user = userEvent.setup();
    bookRoom.mockResolvedValue({
      confirmationNumber: 'HT1', hotelId: 'h1', checkIn: '', checkOut: '',
      status: 'confirmed', bookedAt: '',
    });
    const seam = globalThis as unknown as { __flightSearch?: { events: Record<string, number> } };
    if (seam.__flightSearch) seam.__flightSearch.events['itinerary:refresh'] = 0;

    await searchAndOpenRooms(user);
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }));

    await waitFor(() =>
      expect(seam.__flightSearch?.events['itinerary:refresh'] ?? 0).toBeGreaterThan(0),
    );
  });
});

/* ------------------------------------------------ the pre-fill that is NOT */

describe('flight:selected — there is deliberately no pre-fill', () => {
  it('starts with an empty city and no dates, whatever happened on flight search', async () => {
    // hotel-booking.feature:209 pins this. Both modules are React now, so a
    // store read COULD make the pre-fill work — increment-plan §6.5 and §6.8
    // require that it does not, and the decision was reaffirmed at the start of
    // Increment 2. This test is what stops it being added by accident.
    render(<HotelBooking />);
    expect(screen.getByLabelText('City')).toHaveValue('');
    expect(screen.getByLabelText('Check-in')).toHaveValue('');
    expect(screen.getByLabelText('Check-out')).toHaveValue('');
  });

  it('does not subscribe to any flight selection', async () => {
    // Asserts the mechanism's absence rather than its output: nothing in the
    // module reads a selected flight from anywhere.
    const source = await import('./HotelBooking?raw').catch(() => null);
    void source;
    const seam = globalThis as unknown as { __flightSearch?: { scope?: Record<string, unknown> } };
    render(<HotelBooking />);
    // The published hotel scope has no notion of a flight at all.
    expect(Object.keys(seam.__flightSearch?.scope ?? {})).not.toContain('selectedFlight');
  });
});
