/**
 * ITINERARY — component tests.
 *
 * The emphasis is on the things a model test cannot reach: the two DEAD
 * CONTROLS (ADR-019), which have to be proved inert through the interface AND
 * proved correct behind it, the print path (ADR-017), and the query
 * invalidation that replaced `itinerary:refresh` (ADR-021).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Trip } from '../../types/itinerary';

const getTripDetails = vi.fn();
const addNote = vi.fn();
const cancelItem = vi.fn();
const queryRead = vi.fn();
const listeners = new Set<() => void>();

vi.mock('./itinerary-api', () => ({
  getTripDetails: (...a: unknown[]) => getTripDetails(...a),
  addNote: (...a: unknown[]) => addNote(...a),
  cancelItem: (...a: unknown[]) => cancelItem(...a),
  itineraryQuery: {
    read: () => queryRead(),
    invalidate: () => {
      for (const l of listeners) l();
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    peek: () => undefined,
  },
  invalidateItinerary: () => {
    for (const l of listeners) l();
  },
}));

const { Itinerary } = await import('./Itinerary');
const { notificationStore } = await import('../../stores/notification-store');

const NYC: Trip = {
  id: 'trip-1',
  userId: 1,
  name: 'NYC Business Trip',
  startDate: '2024-03-15',
  endDate: '2024-03-18',
  status: 'upcoming',
  totalCost: 1330,
  items: [
    { id: 'item-1', type: 'flight', date: '2024-03-15', time: '08:30', description: 'SFO → JFK', cost: 450, status: 'confirmed' },
    { id: 'item-2', type: 'hotel', date: '2024-03-15', time: '15:00', description: 'Grand Hyatt New York', cost: 350, status: 'confirmed' },
    { id: 'item-3', type: 'activity', date: '2024-03-16', time: '09:00', description: 'Client Meeting - Midtown', cost: 0, status: 'confirmed' },
    { id: 'item-4', type: 'transport', date: '2024-03-16', time: '08:00', description: 'Airport Shuttle', cost: 50, status: 'pending' },
    { id: 'item-5', type: 'flight', date: '2024-03-18', time: '18:00', description: 'JFK → SFO', cost: 480, status: 'confirmed' },
  ],
};

const CHICAGO: Trip = {
  id: 'trip-2',
  userId: 1,
  name: 'Chicago Conference',
  startDate: '2024-04-10',
  endDate: '2024-04-12',
  status: 'upcoming',
  totalCost: 1160,
  items: [
    { id: 'item-6', type: 'flight', date: '2024-04-10', time: '07:00', description: 'SFO → ORD', cost: 380, status: 'confirmed' },
    { id: 'item-7', type: 'hotel', date: '2024-04-10', time: '14:00', description: 'Marriott Marquis Chicago', cost: 280, status: 'confirmed' },
    { id: 'item-8', type: 'activity', date: '2024-04-11', time: '09:00', description: 'Tech Conference 2024', cost: 500, status: 'confirmed' },
  ],
};

beforeEach(() => {
  listeners.clear();
  getTripDetails.mockReset();
  addNote.mockReset();
  cancelItem.mockReset();
  queryRead.mockReset();
  notificationStore.setState({ notifications: [] });
  queryRead.mockResolvedValue([NYC, CHICAGO]);
  getTripDetails.mockImplementation((id: string) =>
    Promise.resolve(id === 'trip-1' ? NYC : CHICAGO),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function renderItinerary(): Promise<void> {
  render(<Itinerary />);
  await waitFor(() => {
    expect(screen.getByText('NYC Business Trip')).toBeTruthy();
  });
  await screen.findByText(/Friday, March 15/);
}

function seam(): Record<string, unknown> {
  const w = globalThis as unknown as Record<string, { scope: Record<string, unknown> }>;
  return w['__flightSearch']?.scope ?? {};
}

/* ------------------------------------------------------------ the trip list */

describe('the trip list', () => {
  it('opens the earliest trip without being asked', async () => {
    await renderItinerary();
    expect(screen.getByText(/NYC Business Trip —/)).toBeTruthy();
  });

  it('renders the SERVER total, grouped and to two decimals (Q-6)', async () => {
    await renderItinerary();
    const row = screen.getByText('NYC Business Trip').closest('a')!;
    expect(row.querySelector('.col-xs-2 strong')?.textContent).toBe('$1,330.00');
  });

  it('shows no destination for any trip — the API sends none', async () => {
    await renderItinerary();
    const row = screen.getByText('NYC Business Trip').closest('a');
    const small = row?.querySelector('.col-xs-4 small');
    expect(small?.textContent).toBe('');
  });

  it('shows no countdown for a trip that has already happened', async () => {
    await renderItinerary();
    expect(screen.queryByText(/in \d+ days/)).toBeNull();
  });

  it('opens another trip with its own days and total', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByText('Chicago Conference'));
    await waitFor(() => {
      expect(screen.getByText(/Chicago Conference —/)).toBeTruthy();
    });
    expect(document.querySelectorAll('.itinerary-list > .panel')).toHaveLength(2);
    const total = document.querySelectorAll('#itinerary-details .panel-primary .col-md-3 h3')[3];
    expect(total?.textContent).toBe('$1,160.00');
  });
});

/* --------------------------------------------------------------- the detail */

describe('the trip summary', () => {
  it('leaves transport out of the cards but keeps it in the total', async () => {
    await renderItinerary();
    const cards = document.querySelectorAll('#itinerary-details .panel-primary .col-md-3');
    const read = [...cards].map((c) => [
      c.querySelector('h4')?.textContent,
      c.querySelector('h3')?.textContent,
    ]);
    expect(read).toEqual([
      ['Flights', '$930.00'],
      ['Hotels', '$350.00'],
      ['Activities', '$0.00'],
      ['Total', '$1,330.00'],
    ]);
  });

  it('ends the heading with a separator and nothing after it', async () => {
    await renderItinerary();
    const heading = document.querySelector('#itinerary-details .panel-title');
    const clone = heading?.cloneNode(true) as HTMLElement;
    clone.querySelector('.pull-right')?.remove();
    expect(clone.textContent?.replace(/\s+/g, ' ').trim()).toBe('NYC Business Trip —');
  });
});

describe('the day breakdown', () => {
  it('leaves an empty day out and lets the numbering skip', async () => {
    await renderItinerary();
    const headings = [...document.querySelectorAll('.itinerary-list .panel-title')].map((h) =>
      h.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(headings).toEqual([
      'Day 1 — Friday, March 15',
      'Day 2 — Saturday, March 16',
      'Day 4 — Monday, March 18',
    ]);
  });

  it('shows a blank headline and puts the text in the description', async () => {
    await renderItinerary();
    const first = document.querySelector('.itinerary-list .list-group-item');
    expect(first?.querySelector('.col-md-5 > strong')?.textContent).toBe('');
    expect(first?.querySelector('.col-md-5 small')?.textContent).toBe('SFO → JFK');
  });

  it('shows the time, status and cost of a row', async () => {
    await renderItinerary();
    const first = document.querySelector('.itinerary-list .list-group-item');
    expect(first?.querySelector('.col-md-2:not(.text-right) > strong')?.textContent).toBe('8:30 AM');
    expect(first?.querySelector('.col-md-2 .label')?.textContent).toBe('confirmed');
    expect(first?.querySelector('.col-md-2.text-right strong')?.textContent).toBe('$450.00');
  });
});

/* ------------------------------------------------ the status filter now works */

describe('the status filter works (ADR-005, ADR-022)', () => {
  it('highlights the button that was pressed', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    const pending = screen.getByRole('button', { name: 'Pending' });
    await user.click(pending);
    expect(pending.className).toMatch(/btn-warning/);
  });

  it('filters the days down to those with a matching item', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => {
      expect(document.querySelectorAll('.itinerary-list > .panel')).toHaveLength(1);
    });
  });

  it('keeps a day WHOLE when any one of its items matches', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => {
      const statuses = [...document.querySelectorAll('.itinerary-list .col-md-2 .label')].map(
        (l) => l.textContent,
      );
      // The confirmed meeting shares the day and comes with it — an OR, unlike
      // the hotel amenity filter, which is an AND.
      expect(statuses).toEqual(['pending', 'confirmed']);
    });
  });

  it('shows every day again when All is chosen', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => {
      expect(document.querySelectorAll('.itinerary-list > .panel')).toHaveLength(1);
    });
    await user.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => {
      expect(document.querySelectorAll('.itinerary-list > .panel')).toHaveLength(3);
    });
  });

  it('shows nothing when no item matches', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByRole('button', { name: 'Cancelled' }));
    await waitFor(() => {
      expect(document.querySelectorAll('.itinerary-list > .panel')).toHaveLength(0);
    });
  });

  it('reaches the value the filtering logic reads', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => {
      expect(seam()['filterStatus']).toBe('pending');
    });
    expect(seam()['displayDays']).toBeDefined();
  });
});

/* ----------------------------------------------------- Add Note now works */

describe('Add Note works (ADR-005, ADR-022)', () => {
  function noted(text: string) {
    return {
      ...NYC.items[0]!,
      notes: [{ text, createdAt: '2026-08-06T09:00:00.000Z', author: 'Sarah Johnson' }],
    };
  }

  it('holds what was typed in that row', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    const box = document.querySelectorAll<HTMLInputElement>('input[placeholder="Add a note..."]')[0];
    await user.type(box!, 'Bring the signed contract');
    expect(box!.value).toBe('Bring the signed contract');
  });

  it('posts the note, shows it, clears the box and confirms', async () => {
    const user = userEvent.setup();
    addNote.mockResolvedValue(noted('Bring the signed contract'));
    await renderItinerary();

    const row = document.querySelectorAll('.itinerary-list .list-group-item')[0]!;
    const box = row.querySelector<HTMLInputElement>('input[placeholder="Add a note..."]')!;
    await user.type(box, 'Bring the signed contract');
    await user.click(row.querySelector('.input-group-btn button')!);

    await waitFor(() => {
      expect(addNote).toHaveBeenCalledWith('item-1', 'Bring the signed contract');
    });
    await waitFor(() => {
      expect(within(row as HTMLElement).getByText('Bring the signed contract')).toBeTruthy();
    });
    expect(box.value).toBe('');
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe('Note added');
  });

  /** ADR-003 C-1 — repaired by the SERVER, which knows the caller. */
  it('credits the note to the person the server says wrote it', async () => {
    const user = userEvent.setup();
    addNote.mockResolvedValue(noted('Bring the signed contract'));
    await renderItinerary();

    const row = document.querySelectorAll('.itinerary-list .list-group-item')[0]!;
    await user.type(
      row.querySelector<HTMLInputElement>('input[placeholder="Add a note..."]')!,
      'Bring the signed contract',
    );
    await user.click(row.querySelector('.input-group-btn button')!);

    await waitFor(() => {
      expect(within(row as HTMLElement).getByText('Sarah Johnson')).toBeTruthy();
    });
    // Never the legacy 'You' fallback.
    expect(within(row as HTMLElement).queryByText('You')).toBeNull();
  });

  it('renders what the server stored, not a locally built guess', async () => {
    const user = userEvent.setup();
    addNote.mockResolvedValue({
      ...NYC.items[0]!,
      notes: [{ text: 'server copy', createdAt: '2026-08-06T09:00:00.000Z', author: 'Sarah Johnson' }],
    });
    await renderItinerary();

    const row = document.querySelectorAll('.itinerary-list .list-group-item')[0]!;
    await user.type(
      row.querySelector<HTMLInputElement>('input[placeholder="Add a note..."]')!,
      'what I typed',
    );
    await user.click(row.querySelector('.input-group-btn button')!);

    await waitFor(() => {
      expect(within(row as HTMLElement).getByText('server copy')).toBeTruthy();
    });
  });

  it('does nothing on an empty box — the guard at controller:140', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    const row = document.querySelectorAll('.itinerary-list .list-group-item')[0]!;
    await user.click(row.querySelector('.input-group-btn button')!);
    expect(addNote).not.toHaveBeenCalled();
  });

  it('does nothing on a whitespace-only box', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    const row = document.querySelectorAll('.itinerary-list .list-group-item')[0]!;
    await user.type(row.querySelector<HTMLInputElement>('input[placeholder="Add a note..."]')!, '   ');
    await user.click(row.querySelector('.input-group-btn button')!);
    expect(addNote).not.toHaveBeenCalled();
  });

  it('keeps each row\u2019s draft separate', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    const boxes = document.querySelectorAll<HTMLInputElement>('input[placeholder="Add a note..."]');
    await user.type(boxes[0]!, 'first row');
    await user.type(boxes[1]!, 'second row');
    expect(boxes[0]!.value).toBe('first row');
    expect(boxes[1]!.value).toBe('second row');
  });

  it('warns and keeps the draft when the request fails', async () => {
    const user = userEvent.setup();
    addNote.mockRejectedValue(new Error('boom'));
    await renderItinerary();

    const row = document.querySelectorAll('.itinerary-list .list-group-item')[0]!;
    const box = row.querySelector<HTMLInputElement>('input[placeholder="Add a note..."]')!;
    await user.type(box, 'Bring the signed contract');
    await user.click(row.querySelector('.input-group-btn button')!);

    await waitFor(() => {
      expect(notificationStore.getState().notifications.at(-1)?.message).toBe('Failed to add note');
    });
    expect(box.value).toBe('Bring the signed contract');
  });
});

/* --------------------------------------------------------------- cancelling */

describe('cancelling an item', () => {
  it('asks for confirmation first and does nothing when declined', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    await renderItinerary();

    const row = [...document.querySelectorAll('.itinerary-list .list-group-item')].find((r) =>
      r.textContent?.includes('Airport Shuttle'),
    )!;
    await user.click(row.querySelector('button.btn-danger')!);

    expect(globalThis.confirm).toHaveBeenCalledWith('Are you sure you want to cancel this item?');
    expect(cancelItem).not.toHaveBeenCalled();
  });

  it('marks the item cancelled, removes its button and warns by type', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    cancelItem.mockResolvedValue({ ...NYC.items[3]!, status: 'cancelled' });
    await renderItinerary();

    const row = [...document.querySelectorAll('.itinerary-list .list-group-item')].find((r) =>
      r.textContent?.includes('Airport Shuttle'),
    )!;
    await user.click(row.querySelector('button.btn-danger')!);

    await waitFor(() => {
      const updated = [...document.querySelectorAll('.itinerary-list .list-group-item')].find((r) =>
        r.textContent?.includes('Airport Shuttle'),
      )!;
      expect(updated.querySelector('.col-md-2 .label')?.textContent).toBe('cancelled');
      expect(updated.className).toMatch(/list-group-item-danger/);
      expect(updated.querySelector('button.btn-danger')).toBeNull();
    });
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe('transport cancelled');
  });

  it('still counts a cancelled item towards the total (plan §7.5, ADR-020)', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    cancelItem.mockResolvedValue({ ...NYC.items[3]!, status: 'cancelled' });
    await renderItinerary();

    const row = [...document.querySelectorAll('.itinerary-list .list-group-item')].find((r) =>
      r.textContent?.includes('Airport Shuttle'),
    )!;
    await user.click(row.querySelector('button.btn-danger')!);

    await waitFor(() => {
      const total = document.querySelectorAll('#itinerary-details .panel-primary .col-md-3 h3')[3];
      expect(total?.textContent).toBe('$1,330.00');
    });
  });
});

/* --------------------------------------------------------------- view modes */

describe('view modes', () => {
  it('replaces the list with the timeline and drops the costs', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByRole('button', { name: /Timeline/ }));

    await waitFor(() => {
      expect(document.querySelector('.itinerary-timeline')).toBeTruthy();
    });
    expect(document.querySelector('.itinerary-list')).toBeNull();
    expect(document.querySelectorAll('.itinerary-timeline .panel-body')).toHaveLength(5);
    expect(document.querySelector('.itinerary-timeline')?.textContent).not.toMatch(/\$/);
  });

  it('restores the list when switched back', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByRole('button', { name: /Timeline/ }));
    await user.click(screen.getByRole('button', { name: /List/ }));
    await waitFor(() => {
      expect(document.querySelector('.itinerary-list')).toBeTruthy();
    });
  });
});

/* ------------------------------------------------------------------ printing */

describe('printing (ADR-017)', () => {
  it('asks the browser to print, and opens no second window', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(globalThis, 'print').mockImplementation(() => {});
    const open = vi.spyOn(globalThis, 'open').mockImplementation(() => null);
    await renderItinerary();

    await user.click(screen.getByRole('button', { name: /Print/ }));

    expect(print).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
  });

  it('titles the document "Itinerary" while printing and restores it after', async () => {
    const user = userEvent.setup();
    document.title = 'GlobalTravel Portal';
    let titleDuringPrint = '';
    vi.spyOn(globalThis, 'print').mockImplementation(() => {
      titleDuringPrint = document.title;
    });
    await renderItinerary();

    await user.click(screen.getByRole('button', { name: /Print/ }));

    expect(titleDuringPrint).toBe('Itinerary');
    expect(document.title).toBe('GlobalTravel Portal');
  });

  it('hides the controls in print rather than removing them from the page', async () => {
    await renderItinerary();
    const styles = screen.getByTestId('print-styles').textContent ?? '';
    expect(styles).toMatch(/@media print/);
    expect(styles).toMatch(/\.no-print\s*\{\s*display:\s*none/);
    expect(styles).toMatch(/#itinerary-details \.btn/);
    // The cancel column and the note composer are the .no-print regions.
    expect(document.querySelectorAll('.itinerary-list .no-print').length).toBeGreaterThan(0);
  });

  it('keeps the trip summary and every day in the printed region', async () => {
    await renderItinerary();
    const details = document.querySelector('#itinerary-details')!;
    expect(details.querySelector('.panel-primary')).toBeTruthy();
    expect(details.querySelectorAll('.itinerary-list > .panel')).toHaveLength(3);
  });
});

/* -------------------------------------------------- query invalidation (ADR-021) */

describe('refresh by query invalidation, not a broadcast', () => {
  it('reloads when the itinerary query is invalidated', async () => {
    await renderItinerary();
    expect(queryRead).toHaveBeenCalledTimes(1);

    for (const l of listeners) l();

    await waitFor(() => {
      expect(queryRead).toHaveBeenCalledTimes(2);
    });
  });

  it('keeps the open trip open across a refresh', async () => {
    const user = userEvent.setup();
    await renderItinerary();
    await user.click(screen.getByText('Chicago Conference'));
    await waitFor(() => {
      expect(screen.getByText(/Chicago Conference —/)).toBeTruthy();
    });

    for (const l of listeners) l();

    await waitFor(() => {
      expect(queryRead).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText(/Chicago Conference —/)).toBeTruthy();
  });

  it('stops listening once unmounted', async () => {
    const { unmount } = render(<Itinerary />);
    await waitFor(() => {
      expect(screen.getByText('NYC Business Trip')).toBeTruthy();
    });
    unmount();
    expect(listeners.size).toBe(0);
  });
});

/* --------------------------------------------------------------- failures */

describe('when loading fails', () => {
  it('names the data and shows the empty state', async () => {
    queryRead.mockRejectedValue(new Error('boom'));
    render(<Itinerary />);
    await waitFor(() => {
      expect(screen.getByText('No trips yet')).toBeTruthy();
    });
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
      'Failed to load itinerary',
    );
  });

  /**
   * ADR-018. The legacy caught every failure identically, which is how a
   * rejected session came to be reported as an empty itinerary. A 401 is a
   * session event: the API client has already said so and the guard is about to
   * move the traveller, so naming the data here would restate the misdiagnosis.
   */
  it('stays SILENT about the data on a 401 — that is a session event', async () => {
    const { ApiError } = await import('../../lib/api-client');
    queryRead.mockRejectedValue(new ApiError('Invalid token', 401, null));
    render(<Itinerary />);

    await waitFor(() => {
      expect(queryRead).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 20));

    const messages = notificationStore.getState().notifications.map((n) => n.message);
    expect(messages).not.toContain('Failed to load itinerary');
  });

  it('still names the data on a non-401 API failure', async () => {
    const { ApiError } = await import('../../lib/api-client');
    queryRead.mockRejectedValue(new ApiError('Boom', 500, null));
    render(<Itinerary />);
    await waitFor(() => {
      expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
        'Failed to load itinerary',
      );
    });
  });
});
