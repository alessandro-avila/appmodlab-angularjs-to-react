/**
 * HOTELS ROUTE — migrated to React in Increment 2.
 *
 * The ledger row for `/hotels` flips to `owner: 'react'` in the same increment,
 * which stops the front door redirecting this path to `/#!/hotels`.
 */
import type { ReactElement } from 'react';
import { HotelBooking } from '../features/hotel-booking/HotelBooking';

export function Hotels(): ReactElement {
  return <HotelBooking />;
}
