/**
 * EXPENSE RECONCILIATION — the React port of
 * `app/components/expense-reconciliation/*`. The last AngularJS feature module.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ONE DEFECT CLASS REPAIRED, TWICE
 * ─────────────────────────────────────────────────────────────────────────
 * Both under ADR-005's Supersede row, which names "the four dead controls" and
 * "the un-dismissable alerts" in one sentence (see also ADR-022):
 *
 *   THE DATE FILTER works both ways. The legacy `$watch('dateRange')`
 *   re-filtered only when a bound was SET, so clearing both left the table
 *   narrowed while the inputs read empty. Fourth and last of the four.
 *
 *   THE ERROR ALERT dismisses. Its close button sat inside the alert's own
 *   `ng-if`, so the assignment landed on a child scope. Fourth and last
 *   instance of the scope-shadowing class.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEFECTS DELIBERATELY PRESERVED
 * ─────────────────────────────────────────────────────────────────────────
 *   - the undated draft renders the literal words "Invalid date"
 *   - and sorts ABOVE the dated report in a most-recent-first list
 *   - the detail dialogue shows a blank submitted date and a blank item count
 *   - the Draft filter button gives no visual sign of being selected
 *   - removing the last line leaves a stale total in the model
 *   - a submitted report is stored as a draft (SEAM-4)
 *
 * The currency-input directive and the usdCurrency filter are NOT ported: both
 * had zero consumers, so there is no behaviour to reproduce (Q-10, §13 item 9).
 * Money renders through the shared `formatMoneyCurrency`, which reproduces the
 * BUILT-IN Angular `currency` filter the template actually used.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { notify } from '../../stores/notification-store';
import { ApiError } from '../../lib/api-client';
import { authStore } from '../../stores/auth-store';
import { publishScope, clearScope } from '../../lib/test-seam';
import { formatMoneyCurrency, formatMoneyFixed } from '../../lib/format';
import { Modal } from '../../components/modal';
import { useConfirm } from '../../components/confirm-dialog';
import type { ExpenseReport } from '../../types/expense';
import { getReports, getReportDetails, submitReport, deleteReport } from './expense-api';
import {
  EXPENSE_CATEGORIES,
  CURRENCIES,
  EMPTY_RANGE,
  applyFilters,
  calculateDashboard,
  categoryBreakdown,
  detailCategoryTotals,
  emptyEntry,
  emptyReport,
  entryIsComplete,
  formatLineDate,
  formatSubmitted,
  recomputeTotal,
  statusClass,
  type DateRange,
  type EntryDraft,
  type ExpenseDraftLine,
  type ReportDraft,
} from './expense-model';

const FILTERS = ['all', 'draft', 'pending', 'approved', 'rejected'] as const;
const FILTER_LABEL: Readonly<Record<string, string>> = {
  all: 'All',
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

/**
 * DEFECT PRESERVED: the Draft button's `ng-class` defines only the UNSELECTED
 * state (`template:245-246`), so choosing it strips `btn-default` and adds
 * nothing. Every other button gains a colour. A scenario pins the asymmetry.
 */
const FILTER_SELECTED_TONE: Readonly<Record<string, string>> = {
  all: 'btn-primary',
  draft: '',
  pending: 'btn-warning',
  approved: 'btn-success',
  rejected: 'btn-danger',
};

/** `.expense-required` flashes for three seconds — `controller:156-158`. */
const FLASH_MS = 3000;

let lineSequence = 0;

export function ExpenseReconciliation(): ReactElement {
  const [reports, setReports] = useState<readonly ExpenseReport[]>([]);
  const [filtered, setFiltered] = useState<readonly ExpenseReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showNewReport, setShowNewReport] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(EMPTY_RANGE);
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
  const [flashing, setFlashing] = useState(false);

  const [report, setReport] = useState<ReportDraft>(emptyReport);
  const [entry, setEntry] = useState<EntryDraft>(() => emptyEntry(new Date()));

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { confirm, dialog } = useConfirm();

  const dashboard = useMemo(() => calculateDashboard(reports, new Date()), [reports]);
  const breakdown = useMemo(() => categoryBreakdown(report.expenses), [report.expenses]);

  /** Today, for the expense date's `max` — the legacy datepicker's `maxDate: 0`. */
  const todayValue = useMemo(() => emptyEntry(new Date()).date, []);

  /* ------------------------------------------------------------- loading */

  const loadReports = useCallback(async (): Promise<readonly ExpenseReport[]> => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const loaded = await getReports();
      setReports(loaded);
      return loaded;
    } catch (error) {
      // ADR-018: a 401 is a SESSION event, already reported by the API client,
      // and the reactive guard is about to return the traveller to the login
      // screen. Naming the data here as well would restate the misdiagnosis
      // the ADR exists to remove — and would mask the session notice, since
      // the harness reads the LAST notification.
      if (error instanceof ApiError && error.status === 401) return [];
      setErrorMessage('Failed to load expense reports.');
      notify('Failed to load expenses', 'error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await loadReports();
      setFiltered(applyFilters(loaded, 'all', '', EMPTY_RANGE));
    })();
    return () => {
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
      clearScope();
    };
  }, [loadReports]);

  /**
   * Every filter input recomputes the view — including the date range, whose
   * clearing the legacy ignored. That guard is not reproduced (ADR-005).
   */
  useEffect(() => {
    setFiltered(applyFilters(reports, filterStatus, searchQuery, dateRange));
  }, [reports, filterStatus, searchQuery, dateRange]);

  /* ---------------------------------------------------------- the seam */

  useEffect(() => {
    publishScope({
      reports,
      filteredReports: filtered,
      dashboard,
      isLoading,
      errorMessage,
      showNewReport,
      filterStatus,
      searchQuery,
      dateRange,
      /**
       * `getReportDetails()` attached `categoryTotals` to the report
       * (`expense.service.js:41-43`), so the scenarios read it off the model.
       * Attached here for the same reason — and note it does NOT attach
       * `submittedFormatted` or `expenseCount`, which is the preserved defect
       * behind the dialogue's two blank fields.
       */
      selectedReport:
        selectedReport === null
          ? null
          : {
              ...selectedReport,
              categoryTotals: Object.fromEntries(detailCategoryTotals(selectedReport.expenses)),
            },
      /**
       * Published in the LEGACY MODEL's shape, not the component's.
       *
       * `_getEmptyReport()` carried a `categoryBreakdown` object and
       * `_getEmptyExpense()` carried `amount: null`. The component holds the
       * amount as a string, because that is what a controlled input needs; the
       * seam converts back so scenarios written against the AngularJS model
       * keep working (plan §1.4 — the contract should not churn).
       */
      newReport: { ...report, categoryBreakdown: Object.fromEntries(breakdown) },
      newExpense: {
        ...entry,
        amount: entry.amount === '' ? null : Number(entry.amount),
      },
    });
  }, [
    reports,
    filtered,
    dashboard,
    isLoading,
    errorMessage,
    showNewReport,
    filterStatus,
    searchQuery,
    dateRange,
    selectedReport,
    report,
    entry,
    breakdown,
  ]);

  /* -------------------------------------------------------------- form */

  const toggleNewReport = useCallback((): void => {
    setShowNewReport((was) => !was);
    setReport(emptyReport());
    setEntry(emptyEntry(new Date()));
    setErrorMessage('');
  }, []);

  /**
   * `addExpense()` — `controller:153-171`.
   *
   * An incomplete entry is refused SILENTLY: three fields flash for three
   * seconds and no notification is raised. A zero amount counts as missing,
   * because the legacy guard is falsy-based.
   */
  const addExpense = useCallback((): void => {
    if (!entryIsComplete(entry)) {
      setFlashing(true);
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        setFlashing(false);
      }, FLASH_MS);
      return;
    }

    lineSequence += 1;
    const line: ExpenseDraftLine = {
      id: `exp_${String(lineSequence)}`,
      date: entry.date,
      category: entry.category,
      description: entry.description,
      amount: Number(entry.amount),
      currency: entry.currency,
      receiptName: entry.receiptName,
      notes: entry.notes,
    };

    setReport((prev) => {
      const expenses = [...prev.expenses, line];
      return { ...prev, expenses, totalAmount: recomputeTotal(expenses, prev.totalAmount) };
    });
    setEntry(emptyEntry(new Date()));
    notify('Expense item added', 'info');
  }, [entry]);

  /**
   * `removeExpense()` — `controller:174-176`.
   *
   * Removing the LAST line leaves the total untouched, because the legacy watch
   * is guarded by `expenses.length > 0`. The table is hidden by then so the
   * stale figure is invisible, but a scenario reads it off the model.
   */
  const removeExpense = useCallback((index: number): void => {
    setReport((prev) => {
      const expenses = prev.expenses.filter((_, i) => i !== index);
      return { ...prev, expenses, totalAmount: recomputeTotal(expenses, prev.totalAmount) };
    });
  }, []);

  /**
   * `submitReport()` — `controller:179-213`. Two checks, fail-fast.
   *
   * The server stores everything as a draft (SEAM-4), so a "submitted" report
   * comes back deletable. Preserved.
   */
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (report.title === '') {
      setErrorMessage('Report title is required.');
      return;
    }
    if (report.expenses.length === 0) {
      setErrorMessage('Add at least one expense item.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await submitReport({
        ...report,
        submittedAt: new Date().toISOString(),
        // controller:194 — `$rootScope.currentUser ? .name : 'Demo User'`,
        // ported as the same CONDITIONAL rather than as its usual answer.
        //
        // In the suite the answer is always the placeholder, because sign-in
        // happens by planting a token in storage and identity is never read
        // back from it (ADR-003 C-1, which increment 0 mirrored rather than
        // repaired — the store's `user` is in-memory only). Hardcoding the
        // placeholder would give the right answer for every scenario and the
        // wrong one for a live session that submits without reloading, which
        // no scenario covers. Port the branch, not the observed value.
        submittedBy: authStore.getState().getCurrentUser()?.name ?? 'Demo User',
        expenses: report.expenses.map((l) => ({ ...l })),
      });
      notify('Expense report submitted successfully!', 'success');
      setShowNewReport(false);
      setReport(emptyReport());
      const loaded = await loadReports();
      setFiltered(applyFilters(loaded, filterStatus, searchQuery, dateRange));
    } catch {
      setErrorMessage('Failed to submit expense report.');
      notify('Expense submission failed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [report, loadReports, filterStatus, searchQuery, dateRange]);

  const viewReport = useCallback(async (row: ExpenseReport): Promise<void> => {
    setSelectedReport(row);
    setIsLoading(true);
    try {
      const details = await getReportDetails(row.id);
      setSelectedReport(details);
    } catch {
      setErrorMessage('Failed to load report details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (row: ExpenseReport): Promise<void> => {
      const yes = await confirm('Are you sure you want to delete this expense report?');
      if (!yes) return;
      try {
        await deleteReport(row.id);
        setReports((prev) => prev.filter((r) => r.id !== row.id));
        notify('Expense report deleted', 'warning');
      } catch {
        notify('Failed to delete report', 'error');
      }
    },
    [confirm],
  );

  /**
   * `uploadReceipt()` — `controller:246-249`, which was
   * `$('#receiptFileInput').trigger('click')`.
   *
   * A ref replaces the jQuery lookup and `.click()` replaces the trigger. The
   * input stays hidden and the visible behaviour is unchanged: same button,
   * and the chosen file's name appears beneath the row. Nothing is uploaded —
   * the legacy never called its own upload endpoint either, and a scenario
   * pins that the endpoint answers but is never used.
   */
  const openFilePicker = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const onReceiptSelected = useCallback((files: FileList | null): void => {
    const file = files?.[0];
    if (file === undefined) return;
    setEntry((prev) => ({ ...prev, receiptName: file.name }));
  }, []);

  /* ------------------------------------------------------------ render */

  const flashClass = (base: string): string =>
    `${base}${flashing ? ' has-error' : ''}`;

  return (
    <div className="container-fluid expense-container" data-testid="expenses">
      <div className="row">
        <div className="col-md-12">
          <h2 className="page-header">
            <i className="glyphicon glyphicon-usd"></i> Expense Reconciliation
            <button className="btn btn-primary pull-right" onClick={toggleNewReport}>
              <i className="glyphicon glyphicon-plus"></i> New Report
            </button>
          </h2>
        </div>
      </div>

      {/* The alert dismisses now — ADR-005. */}
      {errorMessage !== '' ? (
        <div className="alert alert-danger">
          <i className="glyphicon glyphicon-exclamation-sign"></i> {errorMessage}
          <button
            type="button"
            className="close"
            aria-label="Dismiss"
            onClick={() => {
              setErrorMessage('');
            }}
          >
            &times;
          </button>
        </div>
      ) : null}

      <div className="row">
        <Tile value={String(dashboard.reportCount)} label="Reports" tone="panel-default" muted />
        <Tile value={formatMoneyCurrency(dashboard.totalSubmitted)} label="Total Submitted" tone="panel-info" />
        <Tile value={formatMoneyCurrency(dashboard.totalPending)} label="Pending" tone="panel-warning" />
        <Tile value={formatMoneyCurrency(dashboard.totalApproved)} label="Approved" tone="panel-success" />
        <Tile value={formatMoneyCurrency(dashboard.avgAmount)} label="Avg per Report" tone="panel-default" muted />
        <Tile value={formatMoneyCurrency(dashboard.recentMonth)} label="This Month" tone="panel-default" muted />
        {/* dashboard.topCategory is computed and never displayed. Preserved. */}
      </div>

      {showNewReport ? (
        <div id="new-expense-report">
          <div className="panel panel-primary">
            <div className="panel-heading">
              <h3 className="panel-title">New Expense Report</h3>
            </div>
            <div className="panel-body">
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="expTitle">Report Title *</label>
                    <input
                      id="expTitle"
                      type="text"
                      className="form-control"
                      placeholder="e.g., NYC Client Visit - Oct 2024"
                      value={report.title}
                      onChange={(e) => {
                        setReport((p) => ({ ...p, title: e.target.value }));
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="expDestination">Trip Destination</label>
                    <input
                      id="expDestination"
                      type="text"
                      className="form-control"
                      placeholder="City, Country"
                      value={report.tripDestination}
                      onChange={(e) => {
                        setReport((p) => ({ ...p, tripDestination: e.target.value }));
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label htmlFor="expTravelRequestId">Related Travel Request ID</label>
                    {/* SEAM-5 — stored without ever being checked. */}
                    <input
                      id="expTravelRequestId"
                      type="text"
                      className="form-control"
                      placeholder="Optional"
                      value={report.travelRequestId}
                      onChange={(e) => {
                        setReport((p) => ({ ...p, travelRequestId: e.target.value }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <h4>
                <i className="glyphicon glyphicon-list"></i> Add Expense Items
              </h4>
              <hr />
              <div className="row">
                <div className="col-md-2">
                  <div className={flashClass('form-group expense-required')}>
                    <label htmlFor="expenseDate">Date</label>
                    {/* ADR-009 / ADR-014. `max` carries the datepicker's
                        `maxDate: 0` — no future expense dates. */}
                    <input
                      id="expenseDate"
                      type="date"
                      className="form-control"
                      max={todayValue}
                      value={entry.date}
                      onChange={(e) => {
                        setEntry((p) => ({ ...p, date: e.target.value }));
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="form-group">
                    <label htmlFor="expenseCategory">Category</label>
                    <select
                      id="expenseCategory"
                      className="form-control"
                      value={entry.category}
                      onChange={(e) => {
                        setEntry((p) => ({ ...p, category: e.target.value }));
                      }}
                    >
                      <option value="">Select...</option>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className={flashClass('form-group expense-required')}>
                    <label htmlFor="expenseDescription">Description</label>
                    <input
                      id="expenseDescription"
                      type="text"
                      className="form-control"
                      placeholder="What was this expense for?"
                      value={entry.description}
                      onChange={(e) => {
                        setEntry((p) => ({ ...p, description: e.target.value }));
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <div className={flashClass('form-group expense-required')}>
                    <label htmlFor="expenseAmount">Amount</label>
                    <div className="input-group">
                      <span className="input-group-addon">$</span>
                      {/* A plain number input, exactly as the legacy had it.
                          gtCurrencyInput was never applied to this field. */}
                      <input
                        id="expenseAmount"
                        type="number"
                        className="form-control"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={entry.amount}
                        onChange={(e) => {
                          setEntry((p) => ({ ...p, amount: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-md-1">
                  <div className="form-group">
                    <label htmlFor="expenseCurrency">Currency</label>
                    {/* Six values that change nothing — a scenario pins that. */}
                    <select
                      id="expenseCurrency"
                      className="form-control"
                      value={entry.currency}
                      onChange={(e) => {
                        setEntry((p) => ({ ...p, currency: e.target.value }));
                      }}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-2" style={{ paddingTop: '25px' }}>
                  <button
                    className="btn btn-info btn-sm"
                    title="Attach Receipt"
                    onClick={openFilePicker}
                  >
                    <i className="glyphicon glyphicon-paperclip"></i>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="receiptFileInput"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      onReceiptSelected(e.target.files);
                    }}
                  />{' '}
                  <button className="btn btn-success" onClick={addExpense}>
                    <i className="glyphicon glyphicon-plus"></i> Add
                  </button>
                </div>
              </div>
              {entry.receiptName !== '' ? (
                <div className="text-muted" style={{ marginTop: '-10px', marginBottom: '10px' }}>
                  <i className="glyphicon glyphicon-file"></i> {entry.receiptName}
                </div>
              ) : null}

              {report.expenses.length > 0 ? (
                <div>
                  <table className="table table-striped table-condensed">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Receipt</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.expenses.map((line, index) => (
                        <tr key={line.id}>
                          <td>{formatLineDate(line.date)}</td>
                          <td>
                            <span className="label label-default">{line.category}</span>
                          </td>
                          <td>{line.description}</td>
                          <td>{formatMoneyFixed(line.amount)}</td>
                          <td>
                            {line.receiptName !== '' ? (
                              <i
                                className="glyphicon glyphicon-paperclip text-success"
                                title={line.receiptName}
                              ></i>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-xs btn-danger"
                              onClick={() => {
                                removeExpense(index);
                              }}
                            >
                              <i className="glyphicon glyphicon-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="active">
                        <td colSpan={3} className="text-right">
                          <strong>Total</strong>
                        </td>
                        <td>
                          <strong>{formatMoneyCurrency(report.totalAmount)}</strong>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="row">
                    <div className="col-md-6">
                      <h5>Category Breakdown</h5>
                      {[...breakdown.entries()].map(([category, amount]) => (
                        <div className="progress" key={category}>
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{
                              width: `${String((amount / (report.totalAmount || 1)) * 100)}%`,
                              minWidth: '60px',
                            }}
                          >
                            {category}: {formatMoneyCurrency(amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="row" style={{ marginTop: '15px' }}>
                <div className="col-md-8">
                  <div className="form-group">
                    <label htmlFor="expNotes">Notes</label>
                    <textarea
                      id="expNotes"
                      className="form-control"
                      rows={2}
                      placeholder="Additional notes..."
                      value={report.notes}
                      onChange={(e) => {
                        setReport((p) => ({ ...p, notes: e.target.value }));
                      }}
                    />
                  </div>
                </div>
                <div className="col-md-4 text-right" style={{ paddingTop: '25px' }}>
                  <button className="btn btn-default" onClick={toggleNewReport}>
                    Cancel
                  </button>{' '}
                  <button
                    className="btn btn-primary"
                    disabled={isLoading}
                    onClick={() => {
                      void handleSubmit();
                    }}
                  >
                    <i className="glyphicon glyphicon-send"></i> Submit Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="row">
        <div className="col-md-4">
          <div className="btn-group btn-group-sm">
            {FILTERS.map((status) => (
              <button
                key={status}
                className={`btn ${
                  filterStatus === status ? FILTER_SELECTED_TONE[status] ?? '' : 'btn-default'
                }`.trim()}
                onClick={() => {
                  setFilterStatus(status);
                }}
              >
                {FILTER_LABEL[status]}
              </button>
            ))}
          </div>
        </div>
        <div className="col-md-4">
          <div className="input-group input-group-sm">
            <span className="input-group-addon">
              <i className="glyphicon glyphicon-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search reports..."
              aria-label="Search reports"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="col-md-4">
          <div className="input-group input-group-sm">
            {/* Native date inputs (ADR-009/ADR-014), and clearing them
                un-filters — the repair ADR-005 authorises. */}
            <input
              type="date"
              id="reportStartDate"
              className="form-control"
              aria-label="From date"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange((p) => ({ ...p, start: e.target.value }));
              }}
            />
            <span className="input-group-addon">to</span>
            <input
              type="date"
              id="reportEndDate"
              className="form-control"
              aria-label="To date"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange((p) => ({ ...p, end: e.target.value }));
              }}
            />
          </div>
        </div>
      </div>
      <br />

      {filtered.length > 0 ? (
        <div className="panel panel-default">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>Title</th>
                <th>Destination</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.title}</strong>
                  </td>
                  <td>{row.tripDestination === '' ? '—' : row.tripDestination}</td>
                  <td>{row.expenses.length} items</td>
                  <td>
                    <strong>{formatMoneyFixed(row.totalAmount)}</strong>
                  </td>
                  <td>
                    <span className={`label ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                  {/* "Invalid date" for the undated draft. PRESERVED. */}
                  <td>
                    <small>{formatSubmitted(row.submittedAt)}</small>
                  </td>
                  <td>
                    <div className="btn-group btn-group-xs">
                      <button
                        className="btn btn-default"
                        title="View"
                        onClick={() => {
                          void viewReport(row);
                        }}
                      >
                        <i className="glyphicon glyphicon-eye-open"></i>
                      </button>
                      {row.status === 'draft' ? (
                        <button
                          className="btn btn-danger"
                          title="Delete"
                          onClick={() => {
                            void handleDelete(row);
                          }}
                        >
                          <i className="glyphicon glyphicon-trash"></i>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && filtered.length === 0 ? (
        <div className="text-center" style={{ padding: '40px' }}>
          <i className="glyphicon glyphicon-credit-card" style={{ fontSize: '48px', color: '#ccc' }}></i>
          <h4 className="text-muted">No expense reports found</h4>
          <button className="btn btn-primary" onClick={toggleNewReport}>
            <i className="glyphicon glyphicon-plus"></i> Create Your First Report
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-center" style={{ padding: '40px' }}>
          <i className="glyphicon glyphicon-refresh glyphicon-spin" style={{ fontSize: '32px' }}></i>
          <p>Loading...</p>
        </div>
      ) : null}

      <Modal
        id="expenseDetailModal"
        open={selectedReport !== null}
        title={
          selectedReport === null ? (
            ''
          ) : (
            <>
              <i className="glyphicon glyphicon-usd"></i> {selectedReport.title}{' '}
              <span className={`label ${statusClass(selectedReport.status)}`}>
                {selectedReport.status}
              </span>
            </>
          )
        }
        onClose={() => {
          setSelectedReport(null);
        }}
      >
        {selectedReport === null ? null : (
          <>
            <div className="row">
              <div className="col-md-6">
                <p>
                  <strong>Submitted By:</strong> {selectedReport.submittedBy ?? ''}
                </p>
                <p>
                  <strong>Destination:</strong>{' '}
                  {selectedReport.tripDestination === '' ? '—' : selectedReport.tripDestination}
                </p>
                {/* DEFECT PRESERVED: getReportDetails never re-applies
                    submittedFormatted, so this renders blank for every
                    report — including the one that has a date. */}
                <p>
                  <strong>Submitted:</strong>{' '}
                </p>
              </div>
              <div className="col-md-6 text-right">
                <h2 className="text-primary">{formatMoneyFixed(selectedReport.totalAmount)}</h2>
                {/* DEFECT PRESERVED: expenseCount is likewise never re-applied. */}
                <p className="text-muted"> expense items</p>
              </div>
            </div>
            <hr />
            <h5>Expense Items</h5>
            <table className="table table-striped table-condensed">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedReport.expenses.map((line, index) => (
                  <tr key={`${line.id}-${String(index)}`}>
                    <td>{formatLineDate(line.date)}</td>
                    <td>
                      <span className="label label-default">{line.category}</span>
                    </td>
                    <td>{line.description}</td>
                    <td className="text-right">{formatMoneyFixed(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="active">
                  <td colSpan={3} className="text-right">
                    <strong>Total</strong>
                  </td>
                  <td className="text-right">
                    <strong>{formatMoneyFixed(selectedReport.totalAmount)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            <div>
              <h5>By Category</h5>
              <div className="row">
                {[...detailCategoryTotals(selectedReport.expenses).entries()].map(
                  ([category, total]) => (
                    <div className="col-md-4" key={category}>
                      <div className="well well-sm text-center">
                        <strong>{category}</strong>
                        <br />
                        {formatMoneyCurrency(total)}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {dialog}
    </div>
  );
}

function Tile(props: {
  value: string;
  label: string;
  tone: string;
  muted?: boolean;
}): ReactElement {
  return (
    <div className="col-md-2">
      <div className={`panel ${props.tone} text-center`}>
        <div className="panel-body">
          <h3>{props.value}</h3>
          <small className={props.muted === true ? 'text-muted' : undefined}>{props.label}</small>
        </div>
      </div>
    </div>
  );
}
