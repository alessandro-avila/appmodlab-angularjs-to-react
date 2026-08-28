/**
 * EXPENSE RECONCILIATION — component tests.
 *
 * The emphasis is on what a model test cannot reach: the ref-driven receipt
 * picker, the three-second flash, the repaired date filter and alert, and the
 * defects that must survive the port.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpenseReport } from '../../types/expense';

const getReports = vi.fn();
const getReportDetails = vi.fn();
const submitReport = vi.fn();
const deleteReport = vi.fn();

vi.mock('./expense-api', () => ({
  getReports: () => getReports(),
  getReportDetails: (...a: unknown[]) => getReportDetails(...a),
  submitReport: (...a: unknown[]) => submitReport(...a),
  deleteReport: (...a: unknown[]) => deleteReport(...a),
}));

const { ExpenseReconciliation } = await import('./ExpenseReconciliation');
const { notificationStore } = await import('../../stores/notification-store');
const { authStore } = await import('../../stores/auth-store');

const EXP_1: ExpenseReport = {
  id: 'exp-1',
  userId: 1,
  title: 'NYC Business Trip Expenses',
  tripDestination: 'New York',
  travelRequestId: null,
  status: 'pending',
  submittedAt: '2024-03-20T10:00:00Z',
  submittedBy: 'Sarah Johnson',
  totalAmount: 1875.5,
  expenses: [
    { id: 'e-1', date: '2024-03-15', category: 'flights', description: 'SFO to JFK round trip', amount: 930, currency: 'USD' },
    { id: 'e-2', date: '2024-03-15', category: 'hotels', description: 'Grand Hyatt - 3 nights', amount: 750, currency: 'USD' },
    { id: 'e-3', date: '2024-03-16', category: 'meals', description: 'Client dinner at Nobu', amount: 145.5, currency: 'USD' },
    { id: 'e-4', date: '2024-03-17', category: 'transport', description: 'Uber rides', amount: 50, currency: 'USD' },
  ],
};

const EXP_2: ExpenseReport = {
  id: 'exp-2',
  userId: 1,
  title: 'Q1 Miscellaneous',
  tripDestination: 'Local',
  travelRequestId: null,
  status: 'draft',
  submittedAt: null,
  submittedBy: 'Sarah Johnson',
  totalAmount: 250,
  expenses: [
    { id: 'e-5', date: '2024-02-10', category: 'other', description: 'Office supplies', amount: 150, currency: 'USD' },
    { id: 'e-6', date: '2024-02-20', category: 'meals', description: 'Team lunch', amount: 100, currency: 'USD' },
  ],
};

beforeEach(() => {
  getReports.mockReset();
  getReportDetails.mockReset();
  submitReport.mockReset();
  deleteReport.mockReset();
  notificationStore.setState({ notifications: [] });
  // The store is module-level; a live session planted by one test would
  // otherwise change the attribution asserted by another.
  authStore.getState().clearSession();
  getReports.mockResolvedValue([EXP_1, EXP_2]);
  getReportDetails.mockImplementation((id: string) =>
    Promise.resolve(id === 'exp-1' ? EXP_1 : EXP_2),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderScreen(): Promise<void> {
  render(<ExpenseReconciliation />);
  await waitFor(() => {
    expect(screen.getByText('NYC Business Trip Expenses')).toBeTruthy();
  });
}

function rows(): string[] {
  return [...document.querySelectorAll('tbody tr td:first-child')].map(
    (c) => c.textContent?.trim() ?? '',
  );
}

function tile(label: string): string | undefined {
  const panel = [...document.querySelectorAll('.panel-body')].find(
    (p) => p.querySelector('small')?.textContent === label,
  );
  return panel?.querySelector('h3')?.textContent ?? undefined;
}

async function openForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: /New Report/ }));
  await waitFor(() => {
    expect(screen.getByLabelText('Report Title *')).toBeTruthy();
  });
}

/* ------------------------------------------------------------- dashboard */

describe('the dashboard renders every aggregate', () => {
  it('shows the counts and totals to the cent', async () => {
    await renderScreen();
    expect(tile('Reports')).toBe('2');
    expect(tile('Total Submitted')).toBe('$2,125.50');
    expect(tile('Pending')).toBe('$1,875.50');
    expect(tile('Approved')).toBe('$0.00');
    expect(tile('Avg per Report')).toBe('$1,062.75');
    expect(tile('This Month')).toBe('$0.00');
  });

  it('does NOT move when a filter is applied', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('button', { name: 'Pending' }));
    await waitFor(() => {
      expect(rows()).toEqual(['NYC Business Trip Expenses']);
    });
    // The average is over ALL reports, so it must be unchanged.
    expect(tile('Avg per Report')).toBe('$1,062.75');
    expect(tile('Reports')).toBe('2');
  });

  it('never displays the top category', async () => {
    await renderScreen();
    const tiles = [...document.querySelectorAll('.panel-body small')].map((s) => s.textContent);
    expect(tiles).not.toContain('flights');
    expect(document.body.textContent).not.toMatch(/Top Category/i);
  });
});

/* ----------------------------------------------------------- the list */

describe('the report list', () => {
  it('puts the UNDATED draft first', async () => {
    await renderScreen();
    expect(rows()).toEqual(['Q1 Miscellaneous', 'NYC Business Trip Expenses']);
  });

  it('renders the undated draft as "Invalid date"', async () => {
    await renderScreen();
    const draft = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('Q1 Miscellaneous'),
    )!;
    expect(within(draft as HTMLElement).getByText('Invalid date')).toBeTruthy();
  });

  it('renders a real submission date', async () => {
    await renderScreen();
    const nyc = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('NYC Business'),
    )!;
    expect(within(nyc as HTMLElement).getByText('Mar 20, 2024')).toBeTruthy();
  });

  it('renders the total UNGROUPED in the list', async () => {
    await renderScreen();
    const nyc = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('NYC Business'),
    )!;
    expect(within(nyc as HTMLElement).getByText('$1875.50')).toBeTruthy();
  });

  it('offers Delete on a draft and withholds it from a pending report', async () => {
    await renderScreen();
    const draft = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('Q1 Miscellaneous'),
    )!;
    const pending = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('NYC Business'),
    )!;
    expect(draft.querySelectorAll('td:last-child button')).toHaveLength(2);
    expect(pending.querySelectorAll('td:last-child button')).toHaveLength(1);
  });
});

/* -------------------------------------------------- filters and the repair */

describe('filters', () => {
  it('narrows by status', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('button', { name: 'Draft' }));
    await waitFor(() => {
      expect(rows()).toEqual(['Q1 Miscellaneous']);
    });
  });

  /** DEFECT PRESERVED: the Draft button's ng-class defined only the unselected state. */
  it('gives the Draft button NO highlight when selected, unlike the others', async () => {
    const user = userEvent.setup();
    await renderScreen();

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    await user.click(draftBtn);
    expect(draftBtn.className).not.toMatch(/btn-(primary|warning|success|danger|default)/);

    const pendingBtn = screen.getByRole('button', { name: 'Pending' });
    await user.click(pendingBtn);
    expect(pendingBtn.className).toMatch(/btn-warning/);
  });

  it('searches title and destination', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(screen.getByLabelText('Search reports'), 'local');
    await waitFor(() => {
      expect(rows()).toEqual(['Q1 Miscellaneous']);
    });
  });

  it('offers to create a first report when a filter matches nothing', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(screen.getByRole('button', { name: 'Rejected' }));
    await waitFor(() => {
      expect(screen.getByText('No expense reports found')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /Create Your First Report/ })).toBeTruthy();
  });

  it('excludes the undated draft under any date bound', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(screen.getByLabelText('From date'), '2020-01-01');
    await waitFor(() => {
      expect(rows()).toEqual(['NYC Business Trip Expenses']);
    });
  });

  /** THE REPAIR — ADR-005. Clearing used to leave the table narrowed. */
  it('brings every report back when the date is cleared', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const from = screen.getByLabelText('From date');

    await user.type(from, '2025-01-01');
    await waitFor(() => {
      expect(rows()).toEqual([]);
    });

    await user.clear(from);
    await waitFor(() => {
      expect(rows()).toEqual(['Q1 Miscellaneous', 'NYC Business Trip Expenses']);
    });
  });
});

/* ------------------------------------------------------ the repaired alert */

describe('the error alert dismisses (ADR-005)', () => {
  it('goes away when closed', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: /Submit Report/ }));
    await waitFor(() => {
      expect(document.querySelector('.alert-danger')?.textContent).toContain(
        'Report title is required.',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(document.querySelector('.alert-danger')).toBeNull();
    });
  });

  it('returns if the report is still wrong', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    const submit = screen.getByRole('button', { name: /Submit Report/ });
    await user.click(submit);
    await waitFor(() => expect(document.querySelector('.alert-danger')).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(document.querySelector('.alert-danger')).toBeNull());

    await user.click(submit);
    await waitFor(() => {
      expect(document.querySelector('.alert-danger')?.textContent).toContain(
        'Report title is required.',
      );
    });
  });

  it('refuses a titled report with no line items', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.type(screen.getByLabelText('Report Title *'), 'Empty Report');
    await user.click(screen.getByRole('button', { name: /Submit Report/ }));
    await waitFor(() => {
      expect(document.querySelector('.alert-danger')?.textContent).toContain(
        'Add at least one expense item.',
      );
    });
    expect(submitReport).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------- line items */

describe('line items', () => {
  async function enterLine(
    user: ReturnType<typeof userEvent.setup>,
    description: string,
    amount: string,
    category = 'Meals',
  ): Promise<void> {
    if (description !== '') {
      await user.type(screen.getByLabelText('Description'), description);
    }
    if (amount !== '') {
      await user.type(screen.getByLabelText('Amount'), amount);
    }
    if (category !== '') {
      await user.selectOptions(screen.getByLabelText('Category'), category);
    }
  }

  it('adds a complete line, announces it and totals it', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await enterLine(user, 'Client dinner', '84.25');
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    await waitFor(() => {
      expect(screen.getByText('Client dinner')).toBeTruthy();
    });
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe('Expense item added');
    // The row's own amount cell, not the footer total or the breakdown bar.
    const line = document.querySelector('#new-expense-report tbody tr')!;
    expect(within(line as HTMLElement).getByText('$84.25')).toBeTruthy();
    // The entry fields are cleared.
    expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('');
  });

  it('refuses an incomplete line SILENTLY, flashing three fields', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await enterLine(user, 'Coffee', '');
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    await waitFor(() => {
      expect(document.querySelectorAll('.expense-required.has-error')).toHaveLength(3);
    });
    expect(notificationStore.getState().notifications).toHaveLength(0);
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2); // the report list only
  });

  it('treats a ZERO amount as missing', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await enterLine(user, 'Zero item', '0');
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    await waitFor(() => {
      expect(document.querySelectorAll('.expense-required.has-error')).toHaveLength(3);
    });
  });

  it('flashes the date, description and amount fields', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    await waitFor(() => {
      const labels = [...document.querySelectorAll('.expense-required.has-error label')].map(
        (l) => l.textContent,
      );
      expect(labels).toEqual(['Date', 'Description', 'Amount']);
    });
  });

  it('recomputes the total when a line is removed', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await enterLine(user, 'Flight', '300', 'Airfare');
    await user.click(screen.getByRole('button', { name: /Add$/ }));
    await waitFor(() => expect(screen.getByText('Flight')).toBeTruthy());
    await enterLine(user, 'Hotel', '200', 'Hotel');
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    const footerTotal = (): string | undefined =>
      document.querySelector('#new-expense-report tfoot td:nth-child(2) strong')?.textContent ??
      undefined;

    await waitFor(() => expect(footerTotal()).toBe('$500.00'));

    await user.click(document.querySelectorAll('.btn-xs.btn-danger')[0] as HTMLElement);

    await waitFor(() => {
      expect(footerTotal()).toBe('$200.00');
    });
  });

  it('buckets an uncategorised line under a blank label', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await enterLine(user, 'Uncategorised item', '11.11', '');
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    await waitFor(() => {
      expect(screen.getByText('Uncategorised item')).toBeTruthy();
    });
    const bar = document.querySelector('.progress-bar');
    expect(bar?.textContent?.trim().startsWith(':')).toBe(true);
  });
});

/* ------------------------------------------------------------- receipts */

describe('the receipt picker uses a ref, not jQuery', () => {
  it('clicks the hidden input when the paperclip is pressed', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);

    const input = document.querySelector('#receiptFileInput') as HTMLInputElement;
    expect(input.style.display).toBe('none');
    const clicked = vi.spyOn(input, 'click').mockImplementation(() => {});

    await user.click(screen.getByTitle('Attach Receipt'));

    expect(clicked).toHaveBeenCalledOnce();
  });

  it('shows the chosen file name', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);

    const input = document.querySelector('#receiptFileInput') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'receipt.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(screen.getByText('receipt.png')).toBeTruthy();
    });
  });

  it('marks the line with a paperclip once added', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);

    const input = document.querySelector('#receiptFileInput') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'receipt.png', { type: 'image/png' }));
    await user.type(screen.getByLabelText('Description'), 'Receipted taxi');
    await user.type(screen.getByLabelText('Amount'), '30');
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    await waitFor(() => {
      expect(document.querySelectorAll('.glyphicon-paperclip.text-success')).toHaveLength(1);
    });
  });

  it('shows a dash for a line with no receipt', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openForm(user);
    await user.type(screen.getByLabelText('Description'), 'No receipt here');
    await user.type(screen.getByLabelText('Amount'), '12');
    await user.click(screen.getByRole('button', { name: /Add$/ }));

    await waitFor(() => {
      const cells = [...document.querySelectorAll('td .text-muted')].map((c) => c.textContent);
      expect(cells).toContain('—');
    });
  });
});

/* ---------------------------------------------------------------- submit */

describe('submitting', () => {
  it('stores the report and credits Demo User', async () => {
    const user = userEvent.setup();
    submitReport.mockResolvedValue({ ...EXP_2, id: 'exp-3', title: 'Berlin Client Visit' });
    await renderScreen();
    await openForm(user);
    await user.type(screen.getByLabelText('Report Title *'), 'Berlin Client Visit');
    await user.type(screen.getByLabelText('Description'), 'Hotel night');
    await user.type(screen.getByLabelText('Amount'), '120');
    await user.selectOptions(screen.getByLabelText('Category'), 'Hotel');
    await user.click(screen.getByRole('button', { name: /Add$/ }));
    await waitFor(() => expect(screen.getByText('Hotel night')).toBeTruthy());

    await user.click(screen.getByRole('button', { name: /Submit Report/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledOnce());
    const body = submitReport.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body['submittedBy']).toBe('Demo User');
    expect(body['title']).toBe('Berlin Client Visit');
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
      'Expense report submitted successfully!',
    );
  });

  /**
   * The other branch of controller:194. Every SCENARIO exercises the
   * placeholder, because the suite signs in by planting a token and identity
   * is never read back from it (ADR-003 C-1). That made a hardcoded
   * 'Demo User' indistinguishable from the real expression under the whole
   * baseline — so the conditional is pinned here instead, where a live
   * session can actually be constructed.
   */
  it('credits a live session to the signed-in traveller, not the placeholder', async () => {
    const user = userEvent.setup();
    authStore.getState().setSession('token.abc.def', {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@globaltravel.example',
      department: 'Engineering',
      role: 'employee',
    });
    await renderScreen();
    await waitFor(() => expect(screen.getByText('Expense Reconciliation')).toBeTruthy());

    await openForm(user);
    await user.type(screen.getByLabelText('Report Title *'), 'Berlin Client Visit');
    await user.type(screen.getByLabelText('Description'), 'Hotel night');
    await user.type(screen.getByLabelText('Amount'), '120');
    await user.selectOptions(screen.getByLabelText('Category'), 'Hotel');
    await user.click(screen.getByRole('button', { name: /Add$/ }));
    await waitFor(() => expect(screen.getByText('Hotel night')).toBeTruthy());

    await user.click(screen.getByRole('button', { name: /Submit Report/ }));

    await waitFor(() => expect(submitReport).toHaveBeenCalledOnce());
    const body = submitReport.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body['submittedBy']).toBe('Sarah Johnson');
  });
});

/* ------------------------------------------------------------- the detail */

describe('the detail dialogue', () => {
  async function openDetail(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
    const nyc = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('NYC Business'),
    )!;
    await user.click(nyc.querySelector('button[title="View"]') as HTMLElement);
    return screen.findByTestId('expenseDetailModal');
  }

  it('lists the lines and totals them by category', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const modal = await openDetail(user);
    expect(within(modal).getByText('SFO to JFK round trip')).toBeTruthy();
    // The line's own amount cell, not the "By Category" well beneath it.
    const flightRow = [...modal.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('SFO to JFK'),
    )!;
    expect(within(flightRow as HTMLElement).getByText('$930.00')).toBeTruthy();
  });

  /** DEFECT PRESERVED: getReportDetails never re-applies these two fields. */
  it('shows a BLANK submitted date and a BLANK item count', async () => {
    const user = userEvent.setup();
    await renderScreen();
    const modal = await openDetail(user);

    const submitted = [...modal.querySelectorAll('p')].find((p) =>
      p.textContent?.startsWith('Submitted:'),
    );
    expect(submitted?.textContent?.replace('Submitted:', '').trim()).toBe('');

    const count = [...modal.querySelectorAll('p.text-muted')].find((p) =>
      p.textContent?.includes('expense items'),
    );
    expect(count?.textContent?.trim()).toBe('expense items');
  });

  it('closes on Close', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await openDetail(user);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByTestId('expenseDetailModal')).toBeNull();
    });
  });
});

/* ---------------------------------------------------------------- delete */

describe('deleting a draft', () => {
  function deleteButton(): HTMLElement {
    const draft = [...document.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('Q1 Miscellaneous'),
    )!;
    return draft.querySelector('button.btn-danger') as HTMLElement;
  }

  it('asks first and sends nothing until confirmed', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(deleteButton());

    await waitFor(() => {
      expect(screen.getByTestId('confirm-message').textContent).toBe(
        'Are you sure you want to delete this expense report?',
      );
    });
    expect(deleteReport).not.toHaveBeenCalled();
  });

  it('keeps the report when declined', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.click(deleteButton());
    const dialog = await screen.findByTestId('confirm-dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(deleteReport).not.toHaveBeenCalled();
    expect(rows()).toContain('Q1 Miscellaneous');
  });

  it('removes it once confirmed', async () => {
    const user = userEvent.setup();
    deleteReport.mockResolvedValue({ message: 'Expense report deleted' });
    await renderScreen();
    await user.click(deleteButton());
    const dialog = await screen.findByTestId('confirm-dialog');
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(deleteReport).toHaveBeenCalledWith('exp-2'));
    await waitFor(() => {
      expect(rows()).toEqual(['NYC Business Trip Expenses']);
    });
    expect(notificationStore.getState().notifications.at(-1)?.message).toBe(
      'Expense report deleted',
    );
  });
});
