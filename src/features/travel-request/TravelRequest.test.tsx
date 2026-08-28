/**
 * TRAVEL REQUEST — component tests.
 *
 * The emphasis is on the three things a model test cannot reach: that the form
 * shows ONE complaint at a time through the interface, that the confirmation is
 * genuinely BLOCKING, and that the repaired alert dismisses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TravelRequest } from '../../types/travel-request';

const getRequests = vi.fn();
const submitRequest = vi.fn();
const updateRequest = vi.fn();
const cancelRequest = vi.fn();

vi.mock('./travel-request-api', () => ({
  getRequests: () => getRequests(),
  submitRequest: (...a: unknown[]) => submitRequest(...a),
  updateRequest: (...a: unknown[]) => updateRequest(...a),
  cancelRequest: (...a: unknown[]) => cancelRequest(...a),
}));

const { TravelRequestScreen } = await import('./TravelRequest');
const { notificationStore } = await import('../../stores/notification-store');
const { authStore } = await import('../../stores/auth-store');

const COSTED = { flights: 1200, hotels: 800, meals: 300, transport: 150, other: 50 };

const LONDON: TravelRequest = {
  id: 'tr-1',
  userId: 1,
  destination: 'London, UK',
  departDate: '2024-05-01',
  returnDate: '2024-05-05',
  purpose: 'Client onboarding meetings',
  department: 'Engineering',
  justification: 'Need to meet with new enterprise client.',
  estimatedCosts: COSTED,
  totalEstimate: 2500,
  travelers: [{ name: 'Sarah Johnson', email: 'demo@globaltravel.com' }],
  needsVisa: false,
  needsInsurance: true,
  status: 'pending',
  createdAt: '2024-02-15T10:30:00Z',
};

const TOKYO: TravelRequest = {
  ...LONDON,
  id: 'tr-2',
  destination: 'Tokyo, Japan',
  purpose: 'Annual technology conference',
  status: 'approved',
  createdAt: '2024-02-10T09:00:00Z',
  totalEstimate: 4300,
};

beforeEach(() => {
  getRequests.mockReset();
  submitRequest.mockReset();
  updateRequest.mockReset();
  cancelRequest.mockReset();
  notificationStore.setState({ notifications: [] });
  // The store is module-level; a session planted by one test would otherwise
  // change the attribution asserted by another.
  authStore.getState().clearSession();
  getRequests.mockResolvedValue([LONDON, TOKYO]);
});

async function renderScreen(): Promise<void> {
  render(<TravelRequestScreen />);
  await waitFor(() => {
    expect(screen.getByText('London, UK')).toBeTruthy();
  });
}

function rows(): string[] {
  return [...document.querySelectorAll('tbody tr td:first-child')].map(
    (c) => c.textContent?.trim() ?? '',
  );
}

async function openForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: /New Request/ }));
  await waitFor(() => {
    expect(screen.getByLabelText('Destination *')).toBeTruthy();
  });
}

function complaint(): string | null {
  return document.querySelector('.alert-danger')?.textContent?.trim() ?? null;
}

/* ------------------------------------------------------------- the list */

describe('the request list', () => {
  it('lists requests newest first', async () => {
    await renderScreen();
    expect(rows()).toEqual(['London, UK', 'Tokyo, Japan']);
  });

  it('counts requests by status', async () => {
    await renderScreen();
    const cards = [...document.querySelectorAll('.panel-body')]
      .filter((c) => c.querySelector('h2'))
      .map((c) => [c.querySelector('p')?.textContent, c.querySelector('h2')?.textContent]);
    expect(cards).toEqual([
      ['Total Requests', '2'],
      ['Pending', '1'],
      ['Approved', '1'],
      ['Rejected', '0'],
    ]);
  });

  it('renders the estimate UNGROUPED in the table', async () => {
    await renderScreen();
    const row = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('London, UK'),
    )!;
    expect(within(row as HTMLElement).getByText('$2500.00')).toBeTruthy();
  });

  it('offers edit and cancel only on a pending request', async () => {
    await renderScreen();
    const london = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('London, UK'),
    )!;
    const tokyo = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('Tokyo, Japan'),
    )!;
    expect(london.querySelectorAll('td:last-child button')).toHaveLength(3);
    expect(tokyo.querySelectorAll('td:last-child button')).toHaveLength(1);
  });
});

/* ------------------------------------------------------- the repaired search */

describe('the search works (ADR-005)', () => {
  it('narrows the list to matching requests', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(screen.getByLabelText('Search requests'), 'London');
    await waitFor(() => {
      expect(rows()).toEqual(['London, UK']);
    });
  });

  it('empties the table when nothing matches', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(screen.getByLabelText('Search requests'), 'zzzznowhere');
    await waitFor(() => {
      expect(screen.getByText('No travel requests found')).toBeTruthy();
    });
  });

  it('keeps the text that was typed', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const box = screen.getByLabelText('Search requests');
    await user.type(box, 'Tokyo');
    expect((box as HTMLInputElement).value).toBe('Tokyo');
  });

  it('combines with the status filter', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('button', { name: 'Approved' }));
    await user.type(screen.getByLabelText('Search requests'), 'London');
    await waitFor(() => {
      expect(rows()).toEqual([]);
    });
  });

  it('restores the full list when cleared', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const box = screen.getByLabelText('Search requests');
    await user.type(box, 'London');
    await waitFor(() => {
      expect(rows()).toEqual(['London, UK']);
    });
    await user.clear(box);
    await waitFor(() => {
      expect(rows()).toEqual(['London, UK', 'Tokyo, Japan']);
    });
  });
});

/* ------------------------------------------------- validation through the UI */

describe('validation is fail-fast and shows one complaint at a time', () => {
  it('complains about the destination on an empty form', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: /Submit Request/ }));
    await waitFor(() => {
      expect(complaint()).toContain('Destination is required.');
    });
  });

  it('shows exactly ONE complaint, never a list', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: /Submit Request/ }));
    await waitFor(() => {
      expect(document.querySelectorAll('.alert-danger')).toHaveLength(1);
    });
    // None of the later messages leak in alongside the first.
    const text = complaint() ?? '';
    expect(text).not.toContain('Travel dates are required.');
    expect(text).not.toContain('Department is required.');
  });

  it('moves to the next complaint as each field is satisfied, in order', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    const submit = screen.getByRole('button', { name: /Submit Request/ });

    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Destination is required.'));

    await user.type(screen.getByLabelText('Destination *'), 'Oslo, Norway');
    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Travel dates are required.'));

    await user.type(screen.getByLabelText('Departure Date *'), '2026-09-10');
    await user.type(screen.getByLabelText('Return Date *'), '2026-09-05');
    await user.click(submit);
    await waitFor(() =>
      expect(complaint()).toContain('Return date must be after departure date.'),
    );

    await user.clear(screen.getByLabelText('Return Date *'));
    await user.type(screen.getByLabelText('Return Date *'), '2026-09-17');
    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Travel purpose is required.'));

    await user.selectOptions(screen.getByLabelText('Purpose *'), 'Conference');
    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Department is required.'));

    await user.selectOptions(screen.getByLabelText('Department *'), 'Engineering');
    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Please provide cost estimates.'));

    expect(submitRequest).not.toHaveBeenCalled();
  });

  it('marks the destination field when it is the field at fault', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: /Submit Request/ }));
    await waitFor(() => {
      expect(document.querySelector('#destinationField')?.className).toMatch(/has-error/);
    });
  });

  it('stops marking the field once the destination is given', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    const submit = screen.getByRole('button', { name: /Submit Request/ });
    await user.click(submit);
    await waitFor(() =>
      expect(document.querySelector('#destinationField')?.className).toMatch(/has-error/),
    );
    await user.type(screen.getByLabelText('Destination *'), 'Oslo');
    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Travel dates are required.'));
    expect(document.querySelector('#destinationField')?.className).not.toMatch(/has-error/);
  });
});

/* --------------------------------------------- the repaired alert (ADR-005) */

describe('the complaint dismisses (ADR-005)', () => {
  it('goes away when dismissed', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: /Submit Request/ }));
    await waitFor(() => expect(complaint()).toContain('Destination is required.'));

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(document.querySelector('.alert-danger')).toBeNull();
    });
  });

  it('returns if the form is submitted again while still wrong', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    const submit = screen.getByRole('button', { name: /Submit Request/ });
    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Destination is required.'));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(document.querySelector('.alert-danger')).toBeNull());

    await user.click(submit);
    await waitFor(() => expect(complaint()).toContain('Destination is required.'));
  });
});

/* ------------------------------------------------------ the form's own maths */

describe('the form computes as I type', () => {
  it('adds the cost categories, GROUPED', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.clear(screen.getByLabelText('Flights'));
    await user.type(screen.getByLabelText('Flights'), '900');
    await user.clear(screen.getByLabelText('Hotels'));
    await user.type(screen.getByLabelText('Hotels'), '600');
    await waitFor(() => {
      expect(screen.getByText('$1,500.00')).toBeTruthy();
    });
  });

  it('shows the duration once the dates make sense', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.type(screen.getByLabelText('Departure Date *'), '2026-09-10');
    await user.type(screen.getByLabelText('Return Date *'), '2026-09-17');
    await waitFor(() => {
      expect(screen.getByText('7 day(s)')).toBeTruthy();
    });
  });

  it('hides the duration for a backwards range rather than showing a negative', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.type(screen.getByLabelText('Departure Date *'), '2026-09-10');
    await user.type(screen.getByLabelText('Return Date *'), '2026-09-05');
    await waitFor(() => {
      expect(screen.queryByText(/day\(s\)/)).toBeNull();
    });
  });

  it('clears what was typed when the form is abandoned and reopened', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.type(screen.getByLabelText('Destination *'), 'Oslo, Norway');
    // The form's own Cancel, not the header toggle and not a row action.
    const formCancel = document.querySelector(
      '#travel-request-form button.btn-default',
    ) as HTMLElement;
    await user.click(formCancel);
    await user.click(screen.getByRole('button', { name: /New Request/ }));
    await waitFor(() => {
      expect((screen.getByLabelText('Destination *') as HTMLInputElement).value).toBe('');
    });
  });
});

/* ------------------------------------------------- the blocking confirmation */

describe('cancelling requires an explicit confirmation', () => {
  function cancelButton(): HTMLElement {
    const london = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('London, UK'),
    )!;
    return london.querySelector('button.btn-danger') as HTMLElement;
  }

  it('asks before doing anything', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(cancelButton());

    await waitFor(() => {
      expect(screen.getByTestId('confirm-message').textContent).toBe(
        'Are you sure you want to cancel this travel request?',
      );
    });
    // BLOCKING: nothing has been sent while the question is on screen.
    expect(cancelRequest).not.toHaveBeenCalled();
  });

  it('does nothing when declined', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(cancelButton());
    const dialog = await screen.findByTestId('confirm-dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });
    expect(cancelRequest).not.toHaveBeenCalled();
  });

  it('cancels only after an explicit confirm', async () => {
    const user = userEvent.setup();
    cancelRequest.mockResolvedValue({ ...LONDON, status: 'cancelled' });
    await renderScreen();
    await user.click(cancelButton());
    await screen.findByTestId('confirm-dialog');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => {
      expect(cancelRequest).toHaveBeenCalledWith('tr-1');
    });
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
      'Travel request cancelled',
    );
  });

  /**
   * The row is patched in place and the filtered snapshot is NOT recomputed,
   * so a request cancelled under the Pending filter stays on screen while the
   * summary cards already disagree. The baseline pins the contradiction.
   */
  it('leaves a cancelled request on screen under the Pending filter', async () => {
    const user = userEvent.setup();
    cancelRequest.mockResolvedValue({ ...LONDON, status: 'cancelled' });
    await renderScreen();
    await user.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => expect(rows()).toEqual(['London, UK']));

    await user.click(cancelButton());
    await screen.findByTestId('confirm-dialog');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => {
      expect(cancelRequest).toHaveBeenCalled();
    });
    expect(rows()).toEqual(['London, UK']);
    const pendingCard = [...document.querySelectorAll('.panel-body')].find(
      (c) => c.querySelector('p')?.textContent === 'Pending',
    );
    expect(pendingCard?.querySelector('h2')?.textContent).toBe('0');
  });
});

/* ------------------------------------------------------------- the detail */

describe('the detail dialogue', () => {
  async function openDetail(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    const london = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('London, UK'),
    )!;
    await user.click(london.querySelector('button[title="View Details"]') as HTMLElement);
    return screen.findByTestId('requestDetailModal');
  }

  it('is headed with the destination', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const modal = await openDetail(user);
    expect(within(modal).getByText('Travel Request — London, UK')).toBeTruthy();
  });

  it('shows a BLANK traveller, because no request carries a name', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const modal = await openDetail(user);
    const line = [...modal.querySelectorAll('p')].find((p) =>
      p.textContent?.startsWith('Traveler:'),
    );
    expect(line?.textContent?.replace('Traveler:', '').trim()).toBe('');
  });

  it('breaks the estimate down GROUPED, with an UNGROUPED total', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const modal = await openDetail(user);
    const cells = [...modal.querySelectorAll('table tr')].map((r) =>
      [...r.querySelectorAll('td')].map((c) => c.textContent?.trim()),
    );
    expect(cells).toEqual([
      ['Flights', '$1,200.00'],
      ['Hotels', '$800.00'],
      ['Meals', '$300.00'],
      ['Transport', '$150.00'],
      ['Other', '$50.00'],
      ['Total', '$2500.00'],
    ]);
  });

  it('says nothing about approvals — SEAM-2 is accepted', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const modal = await openDetail(user);
    expect(modal.textContent).not.toMatch(/approval/i);
    expect(within(modal).queryByRole('button', { name: /approve|reject/i })).toBeNull();
  });
});

/* ------------------------------------------------------- creating + editing */

describe('creating and editing', () => {
  async function fillComplete(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.type(screen.getByLabelText('Destination *'), 'Berlin, Germany');
    await user.type(screen.getByLabelText('Departure Date *'), '2026-09-10');
    await user.type(screen.getByLabelText('Return Date *'), '2026-09-17');
    await user.selectOptions(screen.getByLabelText('Purpose *'), 'Conference');
    await user.selectOptions(screen.getByLabelText('Department *'), 'Engineering');
    await user.clear(screen.getByLabelText('Flights'));
    await user.type(screen.getByLabelText('Flights'), '900');
  }

  it('submits a complete request and closes the form', async () => {
    const user = userEvent.setup();
    submitRequest.mockResolvedValue({ ...LONDON, id: 'tr-3', destination: 'Berlin, Germany' });
    await renderScreen();
    await openForm(user);
    await fillComplete(user);
    await user.click(screen.getByRole('button', { name: /Submit Request/ }));

    await waitFor(() => {
      expect(submitRequest).toHaveBeenCalledOnce();
    });
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
      'Travel request submitted successfully!',
    );
    await waitFor(() => {
      expect(screen.queryByLabelText('Destination *')).toBeNull();
    });
  });

  it('falls back to the placeholder only when identity is unknown', async () => {
    // The fallback branch of controller:172-173. It is no longer the ordinary
    // path — the C-1 repair in Increment 6 means a restored session knows the
    // traveller — but it is still the branch taken when nobody is signed in.
    const user = userEvent.setup();
    authStore.getState().clearSession();
    submitRequest.mockResolvedValue({ ...LONDON, id: 'tr-3' });
    await renderScreen();
    await openForm(user);
    await fillComplete(user);
    await user.click(screen.getByRole('button', { name: /Submit Request/ }));

    await waitFor(() => expect(submitRequest).toHaveBeenCalled());
    const body = submitRequest.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body['travelerName']).toBe('Demo User');
    expect(body['travelers']).toEqual([{ name: '', email: '' }]);
  });

  it('files the request under the signed-in traveller (C-1 repaired)', async () => {
    const user = userEvent.setup();
    authStore.getState().setSession('jwt-abc', {
      id: 1,
      name: 'Sarah Johnson',
      email: 'demo@globaltravel.com',
      department: 'Engineering',
      role: 'employee',
    });
    submitRequest.mockResolvedValue({ ...LONDON, id: 'tr-3' });
    await renderScreen();
    await openForm(user);
    await fillComplete(user);
    await user.click(screen.getByRole('button', { name: /Submit Request/ }));

    await waitFor(() => expect(submitRequest).toHaveBeenCalled());
    const body = submitRequest.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body['travelerName']).toBe('Sarah Johnson');
    expect(body['travelerEmail']).toBe('demo@globaltravel.com');
  });

  it('opens the edit form already filled in, offering Update', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const london = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('London, UK'),
    )!;
    await user.click(london.querySelector('button[title="Edit"]') as HTMLElement);

    await waitFor(() => {
      expect((screen.getByLabelText('Destination *') as HTMLInputElement).value).toBe('London, UK');
    });
    expect(screen.getByText('$2,500.00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Update Request/ })).toBeTruthy();
  });

  it('sends an update rather than a create when editing', async () => {
    const user = userEvent.setup();
    updateRequest.mockResolvedValue({ ...LONDON, destination: 'London, England' });
    await renderScreen();
    const london = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('London, UK'),
    )!;
    await user.click(london.querySelector('button[title="Edit"]') as HTMLElement);
    await waitFor(() => {
      expect((screen.getByLabelText('Destination *') as HTMLInputElement).value).toBe('London, UK');
    });
    await user.clear(screen.getByLabelText('Destination *'));
    await user.type(screen.getByLabelText('Destination *'), 'London, England');
    await user.click(screen.getByRole('button', { name: /Update Request/ }));

    await waitFor(() => {
      expect(updateRequest).toHaveBeenCalledOnce();
    });
    expect(submitRequest).not.toHaveBeenCalled();
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
      'Travel request updated successfully!',
    );
  });
});

/* ---------------------------------------------------------------- SEAM-1 */

describe('SEAM-1 — the travel policy', () => {
  it('is never fetched and never mentioned', async () => {
    await renderScreen();
    expect(document.body.textContent).not.toMatch(/policy|limit/i);
  });
});
