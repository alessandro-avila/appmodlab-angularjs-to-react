/**
 * HOTEL-BOOKING MODEL — unit tests.
 *
 * Several cases pin behaviour that DIFFERS from flight-search, and the
 * differences are real rather than accidental — see the check-out rule.
 */
import { describe, it, expect } from 'vitest';
import type { Hotel, HotelFilters, HotelSearchParams, Room } from '../../types/hotel';
import { toInputValue } from '../../lib/format';
import {
  AVAILABLE_AMENITIES,
  VALIDATION_MESSAGES,
  validateSearch,
  reconcileCheckOut,
  nightCount,
  starCount,
  toggleAmenity,
  applyFilters,
  sortHotels,
  formatHotelPrice,
  formatMaxPriceLabel,
  stayTotal,
  roomKey,
  isRoomAvailable,
  bookingTotal,
  formatBookingTotal,
  bookedNotification,
  foundNotification,
} from './hotel-booking-model';

function hotel(over: Partial<Hotel> = {}): Hotel {
  return {
    id: 'h1',
    name: 'Sheraton Boston',
    city: 'Boston',
    rating: 4,
    reviewCount: 95,
    pricePerNight: 300,
    amenities: ['Gym', 'Parking'],
    featured: false,
    rooms: [],
    ...over,
  };
}

function room(over: Partial<Room> = {}): Room {
  return { type: 'Standard King', price: 183, available: 10, beds: '1 King', maxGuests: 2, ...over };
}

const params = (over: Partial<HotelSearchParams> = {}): HotelSearchParams => ({
  city: 'Boston',
  checkIn: new Date(2026, 7, 10),
  checkOut: new Date(2026, 7, 13),
  guests: 1,
  rooms: 1,
  ...over,
});

const filters = (over: Partial<HotelFilters> = {}): HotelFilters => ({
  minRating: 0,
  maxPrice: 1000,
  amenities: [],
  sortBy: 'recommended',
  ...over,
});

/* ------------------------------------------------------------- validation */

describe('validateSearch — controller:94-105', () => {
  it('refuses a missing city', () => {
    expect(validateSearch(params({ city: '' }))).toBe(VALIDATION_MESSAGES.missingCity);
  });

  it('refuses missing dates', () => {
    expect(validateSearch(params({ checkIn: null }))).toBe(VALIDATION_MESSAGES.missingDates);
    expect(validateSearch(params({ checkOut: null }))).toBe(VALIDATION_MESSAGES.missingDates);
  });

  it('checks the city BEFORE the dates', () => {
    expect(validateSearch(params({ city: '', checkIn: null }))).toBe(
      VALIDATION_MESSAGES.missingCity,
    );
  });

  it('accepts a complete search', () => {
    expect(validateSearch(params())).toBeNull();
  });
});

/* ----------------------------------------------------------- date coupling */

describe('reconcileCheckOut — controller:45-54', () => {
  it('sets check-out to the day after when there is none — feature:46', () => {
    // NOTE the difference from flight-search: hotel booking has NO "previous
    // value" guard, so the FIRST check-in chosen does move check-out. In
    // flight-search the first departure date deliberately leaves the return
    // date alone. Both are pinned by their own scenarios.
    const out = reconcileCheckOut(new Date(2026, 7, 12), null);
    expect(toInputValue(out)).toBe('2026-08-13');
  });

  it('discards a check-out that is not after the check-in — feature:61', () => {
    const out = reconcileCheckOut(new Date(2026, 7, 20), new Date(2026, 7, 15));
    expect(toInputValue(out)).toBe('2026-08-21');
  });

  it('treats an equal check-out as needing to move (isSameOrAfter)', () => {
    const out = reconcileCheckOut(new Date(2026, 7, 15), new Date(2026, 7, 15));
    expect(toInputValue(out)).toBe('2026-08-16');
  });

  it('leaves a later check-out alone', () => {
    const out = reconcileCheckOut(new Date(2026, 7, 10), new Date(2026, 7, 20));
    expect(toInputValue(out)).toBe('2026-08-20');
  });

  it('does nothing without a check-in', () => {
    const out = reconcileCheckOut(null, new Date(2026, 7, 20));
    expect(toInputValue(out)).toBe('2026-08-20');
  });
});

describe('nightCount — controller:258-263', () => {
  it('counts whole nights', () => {
    expect(nightCount(new Date(2026, 7, 10), new Date(2026, 7, 13))).toBe(3);
  });

  it('is zero when only a check-out is set — feature:57', () => {
    expect(nightCount(null, new Date(2026, 7, 13))).toBe(0);
  });

  it('is zero when only a check-in is set', () => {
    expect(nightCount(new Date(2026, 7, 10), null)).toBe(0);
  });

  it('is one night for consecutive days — feature:46', () => {
    expect(nightCount(new Date(2026, 7, 12), new Date(2026, 7, 13))).toBe(1);
  });
});

/* ------------------------------------------------------------------ stars */

describe('starCount — controller:250-252', () => {
  it('rounds the rating, as new Array(Math.round(r)) did', () => {
    expect(starCount(4)).toBe(4);
    expect(starCount(4.4)).toBe(4);
    expect(starCount(4.5)).toBe(5);
  });
});

/* ---------------------------------------------------------------- filters */

describe('filters — controller:134-174', () => {
  const set = [
    hotel({ id: 'a', rating: 3, pricePerNight: 100, amenities: ['Gym'], featured: false }),
    hotel({ id: 'b', rating: 5, pricePerNight: 500, amenities: ['Gym', 'Pool'], featured: true }),
    hotel({ id: 'c', rating: 4, pricePerNight: 300, amenities: ['Pool'], featured: false }),
  ];

  it('keeps hotels at or above the minimum rating', () => {
    expect(applyFilters(set, filters({ minRating: 4 })).map((h) => h.id).sort()).toEqual(['b', 'c']);
  });

  it('keeps hotels at or below the maximum price', () => {
    expect(applyFilters(set, filters({ maxPrice: 300 })).map((h) => h.id).sort()).toEqual(['a', 'c']);
  });

  it('requires a hotel to have ALL chosen amenities — feature:120', () => {
    expect(applyFilters(set, filters({ amenities: ['Gym', 'Pool'] })).map((h) => h.id)).toEqual(['b']);
  });

  it('empties the list for an impossible combination — feature:127', () => {
    expect(applyFilters(set, filters({ minRating: 5, maxPrice: 50 }))).toEqual([]);
  });

  it('offers exactly eight amenities — feature:116', () => {
    expect(AVAILABLE_AMENITIES).toHaveLength(8);
  });

  it('toggleAmenity adds then removes', () => {
    expect(toggleAmenity([], 'Gym')).toEqual(['Gym']);
    expect(toggleAmenity(['Gym', 'Pool'], 'Gym')).toEqual(['Pool']);
  });

  it('does not mutate the input array', () => {
    const before = set.map((h) => h.id);
    applyFilters(set, filters({ sortBy: 'priceHigh' }));
    expect(set.map((h) => h.id)).toEqual(before);
  });
});

/* ---------------------------------------------------------------- sorting */

describe('sortHotels — controller:157-171', () => {
  const set = [
    hotel({ id: 'a', rating: 3, pricePerNight: 100, featured: false }),
    hotel({ id: 'b', rating: 5, pricePerNight: 500, featured: false }),
    hotel({ id: 'c', rating: 4, pricePerNight: 300, featured: true }),
  ];

  it('orders by price low to high — feature:138', () => {
    expect(sortHotels(set, 'priceLow').map((h) => h.pricePerNight)).toEqual([100, 300, 500]);
  });

  it('orders by price high to low — feature:143', () => {
    expect(sortHotels(set, 'priceHigh').map((h) => h.pricePerNight)).toEqual([500, 300, 100]);
  });

  it('orders by guest rating, descending — feature:148', () => {
    expect(sortHotels(set, 'rating').map((h) => h.rating)).toEqual([5, 4, 3]);
  });

  it('puts featured hotels first, then rating — feature:153', () => {
    expect(sortHotels(set, 'recommended').map((h) => h.id)).toEqual(['c', 'b', 'a']);
  });
});

/* ----------------------------------------------------------------- prices */

describe('money — matches the two legacy renderings exactly', () => {
  it('hotel prices use the currency filter: two decimals AND grouping', () => {
    // Verified against $filter('currency')(n,'$',2) running in the legacy app.
    expect(formatHotelPrice(374)).toBe('$374.00');
    expect(formatHotelPrice(1234)).toBe('$1,234.00');
    expect(formatHotelPrice(0.5)).toBe('$0.50');
  });

  it('the Max Price label uses plain concatenation: no decimals, no grouping', () => {
    // template:100 is `${{filters.maxPrice}}`, not formatCurrency.
    expect(formatMaxPriceLabel(1000)).toBe('$1000');
    expect(formatMaxPriceLabel(50)).toBe('$50');
  });

  it('a non-finite amount renders empty, as the currency filter does', () => {
    expect(formatHotelPrice(NaN)).toBe('');
  });

  it('prices the whole stay, not one night — feature:87', () => {
    expect(stayTotal(300, 3, 2)).toBe(1800);
    expect(formatHotelPrice(stayTotal(300, 3, 2))).toBe('$1,800.00');
  });
});

/* ------------------------------------------------------- rooms and booking */

describe('rooms', () => {
  it('keys a room by type, because rooms carry no id', () => {
    // The absence of `id` is what produced ngRepeat:dupes and a table that
    // never rendered (P-7). `type` is unique within a response.
    expect(roomKey(room({ type: 'Deluxe King' }))).toBe('Deluxe King');
  });

  it('treats available: 0 as unavailable — discovery Q2', () => {
    expect(isRoomAvailable(room({ available: 0 }))).toBe(false);
    expect(isRoomAvailable(room({ available: 1 }))).toBe(true);
  });
});

describe('booking total — CORRECTED under ADR-005 + Q-3', () => {
  it('prices from room.price, the field the API actually sends', () => {
    // controller:231 read `room.pricePerNight`, which a ROOM does not have (a
    // HOTEL does), so the legacy total was NaN. increment-plan §6.5 scenario 24
    // authorises the fix, because the path has never been reachable.
    expect(bookingTotal(room({ price: 183 }), 3, 1)).toBe(549);
    expect(bookingTotal(room({ price: 183 }), 3, 2)).toBe(1098);
  });

  it('renders a real total, not an empty string', () => {
    expect(formatBookingTotal(room({ price: 183 }), 3, 1)).toBe('$549.00');
  });

  it('would have been NaN had pricePerNight been used', () => {
    // Pins WHY the correction was needed, so the defect cannot quietly return.
    const legacy = (room() as unknown as { pricePerNight?: number }).pricePerNight;
    expect(legacy).toBeUndefined();
    expect(Number.isNaN((legacy as unknown as number) * 3 * 1)).toBe(true);
  });
});

describe('notifications', () => {
  it('reads confirmationNumber, the field the API actually sends', () => {
    expect(bookedNotification({ confirmationNumber: 'HT4BJV4XC5S' })).toBe(
      'Hotel booked! Confirmation: HT4BJV4XC5S',
    );
  });

  it('never renders the text "undefined"', () => {
    expect(bookedNotification({ confirmationNumber: 'X1' })).not.toMatch(/undefined/);
  });

  it('reports the count and the city — controller:124', () => {
    expect(foundNotification(15, 'Boston')).toBe('Found 15 hotels in Boston');
  });
});
