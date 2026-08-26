/**
 * FLIGHT SEARCH — component tests.
 *
 * These cover the retired Karma assertions that are about the SCREEN rather
 * than pure logic: initialisation, the search round trip, error handling, and
 * selection. The pure-logic replacements live in `flight-search-model.test.ts`.
 *
 * The full 19-to-N retirement mapping is in
 * `docs/architecture/karma-retirement.md` (ADR-008 §2).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Flight } from '../../types/flight';

const searchFlights = vi.fn();
const bookFlight = vi.fn();

vi.mock('./flight-search-api', () => ({
  searchFlights: (...args: unknown[]) => searchFlights(...args),
  bookFlight: (...args: unknown[]) => bookFlight(...args),
}));

const { FlightSearch } = await import('./FlightSearch');
const { notificationStore } = await import('../../stores/notification-store');

function flight(over: Partial<Flight> = {}): Flight {
  return {
    id: 'f1',
    airline: 'United',
    origin: 'SFO',
    destination: 'JFK',
    departDate: '2026-08-26T14:57:44.537Z',
    departureTime: '08:30',
    arrivalTime: '17:00',
    durationMinutes: 510,
    stops: 0,
    price: 300,
    cabinClass: 'economy',
    booked: false,
    ...over,
  };
}

beforeEach(() => {
  searchFlights.mockReset();
  bookFlight.mockReset();
  notificationStore.setState({ notifications: [] });
});

async function fillRoute(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('From'), 'SFO');
  await user.type(screen.getByLabelText('To'), 'JFK');
}

/* ------------------------------------------------------------ initialisation */

describe('initialisation — replaces the Karma "Initialization" block', () => {
  it('starts as a round trip with one economy passenger and no dates', () => {
    render(<FlightSearch />);
    expect(screen.getByRole('button', { name: 'Round Trip' })).toHaveClass('btn-primary');
    expect(screen.getByLabelText('From')).toHaveValue('');
    expect(screen.getByLabelText('To')).toHaveValue('');
    expect(screen.getByLabelText('Departure')).toHaveValue('');
    expect(screen.getByLabelText('Return')).toHaveValue('');
    expect(screen.getByLabelText('Passengers')).toHaveValue('1');
    expect(screen.getByLabelText('Cabin')).toHaveValue('economy');
  });

  it('shows no results before a search', () => {
    render(<FlightSearch />);
    expect(screen.queryByTestId('flight-row')).not.toBeInTheDocument();
    expect(screen.queryByText(/flights found/i)).not.toBeInTheDocument();
  });

  it('is not loading after mounting', () => {
    render(<FlightSearch />);
    expect(screen.queryByTestId('search-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search Flights' })).toBeEnabled();
  });

  it('requests nothing on init', () => {
    render(<FlightSearch />);
    expect(searchFlights).not.toHaveBeenCalled();
  });

  it('offers no popular routes', () => {
    // The legacy service had getPopularRoutes(); no screen ever called it, and
    // the failing Karma spec described a redesign that was never built (Q-11).
    render(<FlightSearch />);
    expect(screen.queryByText(/popular/i)).not.toBeInTheDocument();
  });

  it('offers exactly the filters the screen has, and only after a search', () => {
    render(<FlightSearch />);
    expect(screen.queryByTestId('filter-airline')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-stops')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-depart-time')).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------- search */

describe('search — replaces the Karma "Search Flights" block', () => {
  it('refuses to search until origin and destination are given', async () => {
    const user = userEvent.setup();
    render(<FlightSearch />);
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));

    expect(screen.getByTestId('validation-error')).toHaveTextContent(
      'Please enter origin and destination.',
    );
    expect(searchFlights).not.toHaveBeenCalled();
  });

  it('refuses a round trip with no return date', async () => {
    const user = userEvent.setup();
    render(<FlightSearch />);
    await fillRoute(user);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));

    expect(screen.getByTestId('validation-error')).toHaveTextContent(
      'Please select a return date for round trips.',
    );
    expect(searchFlights).not.toHaveBeenCalled();
  });

  it('searches with the parameters entered and lists what comes back', async () => {
    const user = userEvent.setup();
    searchFlights.mockResolvedValue([flight({ id: 'a', price: 300 }), flight({ id: 'b', price: 500 })]);

    render(<FlightSearch />);
    await fillRoute(user);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    await user.type(screen.getByLabelText('Return'), '2026-08-30');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));

    await waitFor(() => expect(screen.getAllByTestId('flight-row')).toHaveLength(2));
    const sent = searchFlights.mock.calls[0]?.[0] as { origin: string; destination: string };
    expect(sent.origin).toBe('SFO');
    expect(sent.destination).toBe('JFK');
    expect(screen.getByText('2 flights found')).toBeInTheDocument();
  });

  it('announces the UNFILTERED count found', async () => {
    const user = userEvent.setup();
    searchFlights.mockResolvedValue([flight({ id: 'a' }), flight({ id: 'b' }), flight({ id: 'c' })]);

    render(<FlightSearch />);
    await fillRoute(user);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    await user.type(screen.getByLabelText('Return'), '2026-08-30');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));

    await waitFor(() =>
      expect(notificationStore.getState().notifications.at(-1)?.message).toBe('Found 3 flights'),
    );
  });

  it('handles a failure without crashing, and says so', async () => {
    const user = userEvent.setup();
    searchFlights.mockRejectedValue(new Error('boom'));

    render(<FlightSearch />);
    await fillRoute(user);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    await user.type(screen.getByLabelText('Return'), '2026-08-30');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));

    await waitFor(() =>
      expect(screen.getByTestId('validation-error')).toHaveTextContent(
        'Failed to search flights. Please try again.',
      ),
    );
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe('Flight search failed');
  });

  it('resets the maximum price filter to the top of the new range', async () => {
    const user = userEvent.setup();
    // min 230, max 430 — a whole number of 50-steps, so no C-4 snap here.
    searchFlights.mockResolvedValue([flight({ id: 'a', price: 230 }), flight({ id: 'b', price: 430 })]);

    render(<FlightSearch />);
    await fillRoute(user);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    await user.type(screen.getByLabelText('Return'), '2026-08-30');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));

    await waitFor(() => expect(screen.getByText(/Max Price/)).toHaveTextContent('$430'));
  });
});

/* ----------------------------------------------------------------- selection */

describe('selection — replaces the Karma "Flight Selection" block', () => {
  it('opens the details of the flight chosen', async () => {
    const user = userEvent.setup();
    searchFlights.mockResolvedValue([flight({ id: 'a', airline: 'United', price: 300 })]);

    render(<FlightSearch />);
    await fillRoute(user);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    await user.type(screen.getByLabelText('Return'), '2026-08-30');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await waitFor(() => expect(screen.getByTestId('flight-row')).toBeInTheDocument());

    await user.click(screen.getByTestId('flight-row'));
    expect(screen.getByText('Selected Flight Details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book This Flight' })).toBeInTheDocument();
  });

  it('does NOT announce flight:selected — the event is dropped, not ported', async () => {
    // The Karma test asserted `$rootScope.$broadcast('flight:selected', ...)`.
    // ADR-013 maps that event to NO store concern: its only listener was the
    // hotel-booking controller, which was never alive at the same time, so the
    // pre-fill never happened. Making it work would be an unauthorised
    // behaviour change, and `hotel-booking.feature:209` must keep passing BY
    // CONSTRUCTION. The replacement asserts the absence.
    const user = userEvent.setup();
    searchFlights.mockResolvedValue([flight({ id: 'a' })]);

    render(<FlightSearch />);
    await fillRoute(user);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    await user.type(screen.getByLabelText('Return'), '2026-08-30');
    await user.click(screen.getByRole('button', { name: 'Search Flights' }));
    await waitFor(() => expect(screen.getByTestId('flight-row')).toBeInTheDocument());
    await user.click(screen.getByTestId('flight-row'));

    const seam = (globalThis as unknown as { __flightSearch?: { events: Record<string, number> } })
      .__flightSearch;
    expect(seam?.events['flight:selected'] ?? 0).toBe(0);
  });
});

/* --------------------------------------------------------------------- dates */

describe('dates — replaces the Karma "Dates" block', () => {
  it('clears the return date when the trip becomes one way', async () => {
    const user = userEvent.setup();
    render(<FlightSearch />);

    await user.type(screen.getByLabelText('Return'), '2026-08-20');
    expect(screen.getByLabelText('Return')).toHaveValue('2026-08-20');

    await user.click(screen.getByRole('button', { name: 'One Way' }));
    expect(screen.getByLabelText('Return')).toHaveValue('');
  });

  it('keeps the return field in the DOM when hidden, as ng-show did', async () => {
    // The legacy template used ng-show, which hides without removing. The
    // scenario "Switching to a one way trip clears the return date" reads the
    // field's value, which requires it to exist.
    const user = userEvent.setup();
    render(<FlightSearch />);
    await user.click(screen.getByRole('button', { name: 'One Way' }));
    expect(screen.getByLabelText('Return')).toBeInTheDocument();
  });

  it('pushes the return date out when the departure date passes it', async () => {
    const user = userEvent.setup();
    render(<FlightSearch />);

    await user.type(screen.getByLabelText('Departure'), '2026-08-10');
    await user.type(screen.getByLabelText('Return'), '2026-08-20');

    // Set the new departure date ATOMICALLY, which is what choosing a date in a
    // real date input does. Clearing first would drive the model through null,
    // and the legacy rule deliberately does nothing when there is no PREVIOUS
    // departure date — that is the "first date chosen" case covered separately.
    fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-08-25' } });

    await waitFor(() => expect(screen.getByLabelText('Return')).toHaveValue('2026-08-26'));
  });

  it('leaves the return date alone when the FIRST departure date is chosen', async () => {
    const user = userEvent.setup();
    render(<FlightSearch />);

    await user.type(screen.getByLabelText('Return'), '2026-08-20');
    fireEvent.change(screen.getByLabelText('Departure'), { target: { value: '2026-08-25' } });

    expect(screen.getByLabelText('Return')).toHaveValue('2026-08-20');
  });

  it('accepts a typed departure date — net-new, ADR-009 item 5', async () => {
    // The legacy text field never delivered a typed value to the model.
    const user = userEvent.setup();
    render(<FlightSearch />);
    await user.type(screen.getByLabelText('Departure'), '2026-08-25');
    expect(screen.getByLabelText('Departure')).toHaveValue('2026-08-25');
  });
});
