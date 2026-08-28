/**
 * TRAVEL REQUEST — the React port of `app/components/travel-request/*`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED, AND ON WHOSE AUTHORITY
 * ─────────────────────────────────────────────────────────────────────────
 * Two defects are REPAIRED, both under ADR-005's Supersede row, which names
 * "the four dead controls" and "the un-dismissable alerts" in one sentence and
 * resolves them "by being reimplemented correctly" (see also ADR-022):
 *
 *   THE SEARCH now searches. The legacy threw a TypeError out of the digest on
 *   every keystroke — see `applyFilters` in the model.
 *
 *   THE COMPLAINT now dismisses. Its close button sat inside the alert's own
 *   `ng-if`, so `errorMessage = ''` landed on a child scope and the parent
 *   stayed truthy. React has no scope chain and, more to the point, ADR-005
 *   authorises the repair.
 *
 * Everything else is preserved, including things that look like bugs:
 *   - the traveller line in the detail dialogue is blank (no `travelerName`)
 *   - no approval chain is shown, though the server holds one (SEAM-2, Q-1)
 *   - the travel policy is never fetched (SEAM-1)
 *   - cancelling under a status filter leaves the row on screen while the
 *     summary cards already disagree
 *   - validation is fail-fast, ordered, one message at a time
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { notify } from '../../stores/notification-store';
import { publishScope, clearScope } from '../../lib/test-seam';
import { formatMoneyCurrency, formatMoneyFixed } from '../../lib/format';
import { Modal } from '../../components/modal';
import { useConfirm } from '../../components/confirm-dialog';
import type { TravelRequest } from '../../types/travel-request';
import { getRequests, submitRequest, updateRequest, cancelRequest } from './travel-request-api';
import {
  DEPARTMENTS,
  TRAVEL_PURPOSES,
  emptyDraft,
  totalEstimate,
  tripDuration,
  validateDraft,
  applyFilters,
  statusCounts,
  statusClass,
  formatListDate,
  formatSubmittedAt,
  type RequestDraft,
  type EstimatedCostKey,
} from './travel-request-model';

const COST_FIELDS: readonly { key: EstimatedCostKey; label: string }[] = [
  { key: 'flights', label: 'Flights' },
  { key: 'hotels', label: 'Hotels' },
  { key: 'meals', label: 'Meals' },
  { key: 'transport', label: 'Transport' },
  { key: 'other', label: 'Other' },
];

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;
const FILTER_LABEL: Readonly<Record<string, string>> = {
  all: 'All',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};
const FILTER_TONE: Readonly<Record<string, string>> = {
  all: 'btn-primary',
  pending: 'btn-warning',
  approved: 'btn-success',
  rejected: 'btn-danger',
};

export function TravelRequestScreen(): ReactElement {
  const [requests, setRequests] = useState<readonly TravelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorField, setErrorField] = useState<'destination' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>(emptyDraft);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);

  /**
   * The filtered view is a SNAPSHOT, refreshed when the filters change or the
   * list reloads — not derived on every render.
   *
   * That is load-bearing. `cancelRequest()` mutates the row in place and never
   * re-runs applyFilters(), so a request cancelled under the Pending filter
   * stays on screen under a filter it no longer matches, while the summary
   * cards — recomputed every digest — already disagree. The baseline pins that
   * contradiction, so the snapshot is preserved.
   */
  const [filtered, setFiltered] = useState<readonly TravelRequest[]>([]);

  const formRef = useRef<HTMLDivElement | null>(null);
  /**
   * The current requests, readable without making the snapshot depend on them.
   *
   * `$watchGroup(['searchQuery', 'filterStatus'], applyFilters)` watches ONLY
   * those two. A change to `requests` does not recompute the view — which is
   * exactly why an in-place cancel leaves the row on screen. Depending on
   * `requests` here would quietly repair a defect the baseline pins.
   */
  const requestsRef = useRef<readonly TravelRequest[]>([]);
  const { confirm, dialog } = useConfirm();

  const counts = useMemo(() => statusCounts(requests), [requests]);
  const draftTotal = useMemo(() => totalEstimate(draft.estimatedCosts), [draft.estimatedCosts]);
  const draftDuration = useMemo(
    () => tripDuration(draft.departDate, draft.returnDate),
    [draft.departDate, draft.returnDate],
  );

  /* ------------------------------------------------------------- loading */

  const loadRequests = useCallback(async (): Promise<readonly TravelRequest[]> => {
    setIsLoading(true);
    setErrorMessage('');
    setErrorField(null);
    try {
      const loaded = await getRequests();
      setRequests(loaded);
      requestsRef.current = loaded;
      return loaded;
    } catch {
      setErrorMessage('Failed to load travel requests.');
      notify('Failed to load requests', 'error');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await loadRequests();
      setFiltered(applyFilters(loaded, 'all', ''));
    })();
    return () => {
      clearScope();
    };
  }, [loadRequests]);

  /**
   * `$watchGroup(['searchQuery', 'filterStatus'], applyFilters)` —
   * `controller:65-67`. ONLY these two recompute the snapshot. `requests` is
   * read through a ref on purpose; see its declaration.
   */
  useEffect(() => {
    setFiltered(applyFilters(requestsRef.current, filterStatus, searchQuery));
  }, [filterStatus, searchQuery]);

  /* ---------------------------------------------------------- the seam */

  useEffect(() => {
    publishScope({
      requests,
      filteredRequests: filtered,
      isLoading,
      errorMessage,
      showForm,
      editMode,
      filterStatus,
      searchQuery,
      selectedRequest,
      newRequest: { ...draft, totalEstimate: draftTotal, tripDuration: draftDuration ?? 0 },
    });
  }, [
    requests,
    filtered,
    isLoading,
    errorMessage,
    showForm,
    editMode,
    filterStatus,
    searchQuery,
    selectedRequest,
    draft,
    draftTotal,
    draftDuration,
  ]);

  /* -------------------------------------------------------------- form */

  const toggleForm = useCallback((): void => {
    setShowForm((was) => !was);
    setEditMode(false);
    setDraft(emptyDraft());
    setErrorMessage('');
    setErrorField(null);
  }, []);

  const startEdit = useCallback((request: TravelRequest): void => {
    setEditMode(true);
    setShowForm(true);
    setErrorMessage('');
    setErrorField(null);
    setDraft({
      id: request.id,
      destination: request.destination,
      departDate: request.departDate,
      returnDate: request.returnDate,
      purpose: request.purpose,
      department: request.department,
      justification: request.justification ?? '',
      estimatedCosts: { ...request.estimatedCosts },
      needsVisa: request.needsVisa,
      needsInsurance: request.needsInsurance,
      notes: request.notes ?? '',
    });
    // ADR-007 category 3: the jQuery scroll becomes a declarative one.
    globalThis.setTimeout(() => {
      formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  /**
   * `submitRequest()` — `controller:163-195`.
   *
   * Validation runs first and returns on the FIRST failure, so exactly one
   * complaint is shown. See `validateDraft` for why the order is contractual.
   */
  const handleSubmit = useCallback(async (): Promise<void> => {
    const failure = validateDraft(draft);
    if (failure !== null) {
      setErrorMessage(failure.message);
      setErrorField(failure.field);
      return;
    }
    setErrorMessage('');
    setErrorField(null);
    setIsLoading(true);

    // controller:172-173 — currentUser is never persisted (ADR-003 C-1), so a
    // restored session files the request under the fallback. PRESERVED: the
    // baseline pins "Demo User", and repairing it here is Inc-6's work.
    const body = {
      ...draft,
      totalEstimate: draftTotal,
      tripDuration: draftDuration ?? 0,
      submittedAt: new Date().toISOString(),
      travelerName: 'Demo User',
      travelerEmail: 'demo@globaltravel.com',
      travelers: [{ name: '', email: '' }],
    };

    try {
      if (editMode && draft.id !== undefined) {
        await updateRequest(draft.id, body);
      } else {
        await submitRequest(body);
      }
      notify(
        `${editMode ? 'Travel request updated' : 'Travel request submitted'} successfully!`,
        'success',
      );
      setShowForm(false);
      setEditMode(false);
      setDraft(emptyDraft());
      const loaded = await loadRequests();
      setFiltered(applyFilters(loaded, filterStatus, searchQuery));
    } catch {
      setErrorMessage('Failed to submit request. Please try again.');
      notify('Request submission failed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [draft, draftTotal, draftDuration, editMode, loadRequests, filterStatus, searchQuery]);

  /**
   * `cancelRequest()` — `controller:231-240`.
   *
   * The confirmation is BLOCKING: nothing happens until the user answers yes.
   * The row is then updated IN PLACE and applyFilters() is deliberately NOT
   * re-run, which is what keeps a cancelled request on screen under the Pending
   * filter — a contradiction the baseline pins.
   */
  const handleCancel = useCallback(
    async (request: TravelRequest): Promise<void> => {
      const yes = await confirm('Are you sure you want to cancel this travel request?');
      if (!yes) return;

      try {
        await cancelRequest(request.id);
        const patch = (r: TravelRequest): TravelRequest =>
          r.id === request.id ? { ...r, status: 'cancelled' } : r;
        setRequests((prev) => {
          const next = prev.map(patch);
          requestsRef.current = next;
          return next;
        });
        setFiltered((prev) => prev.map(patch));
        notify('Travel request cancelled', 'warning');
      } catch {
        notify('Failed to cancel request', 'error');
      }
    },
    [confirm],
  );

  const setCost = useCallback((key: EstimatedCostKey, raw: string): void => {
    setDraft((prev) => ({
      ...prev,
      estimatedCosts: { ...prev.estimatedCosts, [key]: raw === '' ? 0 : Number(raw) },
    }));
  }, []);

  /* ------------------------------------------------------------ render */

  return (
    <div className="container-fluid travel-request-container" data-testid="travel-request">
      <div className="row">
        <div className="col-md-12">
          <h2 className="page-header">
            <i className="glyphicon glyphicon-send"></i> Travel Requests
            <button className="btn btn-primary pull-right" onClick={toggleForm}>
              <i className={`glyphicon ${showForm ? 'glyphicon-minus' : 'glyphicon-plus'}`}></i>{' '}
              {showForm ? 'Cancel' : 'New Request'}
            </button>
          </h2>
        </div>
      </div>

      {/* The complaint. Its close button now works — ADR-005. */}
      {errorMessage !== '' ? (
        <div className="alert alert-danger">
          <i className="glyphicon glyphicon-exclamation-sign"></i> {errorMessage}
          <button
            type="button"
            className="close"
            aria-label="Dismiss"
            onClick={() => {
              setErrorMessage('');
              setErrorField(null);
            }}
          >
            &times;
          </button>
        </div>
      ) : null}

      {showForm ? (
        <div id="travel-request-form" ref={formRef}>
          <div className="panel panel-primary">
            <div className="panel-heading">
              <h3 className="panel-title">{editMode ? 'Edit' : 'New'} Travel Request</h3>
            </div>
            <div className="panel-body">
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit();
                }}
              >
                <h4>
                  <i className="glyphicon glyphicon-globe"></i> Trip Details
                </h4>
                <hr />
                <div className="row">
                  <div
                    className={`col-md-4${errorField === 'destination' ? ' has-error' : ''}`}
                    id="destinationField"
                  >
                    <div className="form-group">
                      <label htmlFor="trDestination">Destination *</label>
                      <input
                        id="trDestination"
                        type="text"
                        className="form-control"
                        placeholder="City, Country"
                        value={draft.destination}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, destination: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label htmlFor="trPurpose">Purpose *</label>
                      <select
                        id="trPurpose"
                        className="form-control"
                        value={draft.purpose}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, purpose: e.target.value }));
                        }}
                      >
                        <option value="">Select purpose...</option>
                        {TRAVEL_PURPOSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label htmlFor="trDepartment">Department *</label>
                      <select
                        id="trDepartment"
                        className="form-control"
                        value={draft.department}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, department: e.target.value }));
                        }}
                      >
                        <option value="">Select department...</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="trDepartDate">Departure Date *</label>
                      {/* ADR-009 / ADR-014: a native date input, parsed with an
                          explicit format. The jQuery UI datepicker is gone. */}
                      <input
                        id="trDepartDate"
                        type="date"
                        className="form-control"
                        value={draft.departDate}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, departDate: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="trReturnDate">Return Date *</label>
                      <input
                        id="trReturnDate"
                        type="date"
                        className="form-control"
                        value={draft.returnDate}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, returnDate: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Duration</label>
                      <p className="form-control-static">
                        {/* `ng-if="tripDuration > 0"` — a backwards range hides
                            the badge rather than showing a negative one. */}
                        {draftDuration !== null && draftDuration > 0 ? (
                          <span className="label label-info">{draftDuration} day(s)</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="checkbox" style={{ marginTop: '30px' }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.needsVisa}
                          onChange={(e) => {
                            setDraft((p) => ({ ...p, needsVisa: e.target.checked }));
                          }}
                        />{' '}
                        Visa Required
                      </label>
                    </div>
                    <div className="checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={draft.needsInsurance}
                          onChange={(e) => {
                            setDraft((p) => ({ ...p, needsInsurance: e.target.checked }));
                          }}
                        />{' '}
                        Travel Insurance
                      </label>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <div className="form-group">
                      <label htmlFor="trJustification">Business Justification</label>
                      <textarea
                        id="trJustification"
                        className="form-control"
                        rows={3}
                        placeholder="Explain the business need for this trip..."
                        value={draft.justification}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, justification: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <h4>
                  <i className="glyphicon glyphicon-usd"></i> Estimated Costs
                </h4>
                <hr />
                <div className="row">
                  {COST_FIELDS.map((field) => (
                    <div className="col-md-2" key={field.key}>
                      <div className="form-group">
                        <label htmlFor={`trCost-${field.key}`}>{field.label}</label>
                        <div className="input-group">
                          <span className="input-group-addon">$</span>
                          <input
                            id={`trCost-${field.key}`}
                            type="number"
                            className="form-control"
                            min="0"
                            step="0.01"
                            value={draft.estimatedCosts[field.key]}
                            onChange={(e) => {
                              setCost(field.key, e.target.value);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Total Estimate</label>
                      {/* `${{totalEstimate | number:2}}` — GROUPED. */}
                      <p className="form-control-static h4 text-primary">
                        {formatMoneyCurrency(draftTotal)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <div className="form-group">
                      <label htmlFor="trNotes">Additional Notes</label>
                      <textarea
                        id="trNotes"
                        className="form-control"
                        rows={2}
                        placeholder="Any additional information..."
                        value={draft.notes}
                        onChange={(e) => {
                          setDraft((p) => ({ ...p, notes: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12 text-right">
                    <button type="button" className="btn btn-default" onClick={toggleForm}>
                      Cancel
                    </button>{' '}
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                      <i className="glyphicon glyphicon-send"></i>{' '}
                      {editMode ? 'Update' : 'Submit'} Request
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {requests.length > 0 ? (
        <div className="row">
          <SummaryCard tone="panel-default" value={counts.all} label="Total Requests" muted />
          <SummaryCard tone="panel-warning" value={counts.pending} label="Pending" />
          <SummaryCard tone="panel-success" value={counts.approved} label="Approved" />
          <SummaryCard tone="panel-danger" value={counts.rejected} label="Rejected" />
        </div>
      ) : null}

      <div className="row">
        <div className="col-md-6">
          <div className="btn-group">
            {FILTERS.map((status) => (
              <button
                key={status}
                className={`btn btn-sm ${filterStatus === status ? FILTER_TONE[status] : 'btn-default'}`}
                onClick={() => {
                  setFilterStatus(status);
                }}
              >
                {FILTER_LABEL[status]}
              </button>
            ))}
          </div>
        </div>
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-addon">
              <i className="glyphicon glyphicon-search"></i>
            </span>
            {/* Searches for real now — ADR-005. See applyFilters in the model. */}
            <input
              type="text"
              className="form-control"
              placeholder="Search requests..."
              aria-label="Search requests"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
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
                <th>Destination</th>
                <th>Purpose</th>
                <th>Travel Dates</th>
                <th>Duration</th>
                <th>Estimate</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id}>
                  <td>
                    <strong>{req.destination}</strong>
                  </td>
                  <td>{req.purpose}</td>
                  <td>
                    {formatListDate(req.departDate)} - {formatListDate(req.returnDate)}
                  </td>
                  <td>{tripDuration(req.departDate, req.returnDate) ?? 0} days</td>
                  {/* `totalFormatted` — UNGROUPED, unlike the form total. */}
                  <td>{formatMoneyFixed(req.totalEstimate)}</td>
                  <td>
                    <span className={`label ${statusClass(req.status)}`}>{req.status}</span>
                  </td>
                  <td>
                    <small>{formatSubmittedAt(req.createdAt)}</small>
                  </td>
                  <td>
                    <div className="btn-group btn-group-xs">
                      <button
                        className="btn btn-default"
                        title="View Details"
                        onClick={() => {
                          setSelectedRequest(req);
                        }}
                      >
                        <i className="glyphicon glyphicon-eye-open"></i>
                      </button>
                      {req.status === 'pending' ? (
                        <button
                          className="btn btn-default"
                          title="Edit"
                          onClick={() => {
                            startEdit(req);
                          }}
                        >
                          <i className="glyphicon glyphicon-pencil"></i>
                        </button>
                      ) : null}
                      {req.status === 'pending' ? (
                        <button
                          className="btn btn-danger"
                          title="Cancel"
                          onClick={() => {
                            void handleCancel(req);
                          }}
                        >
                          <i className="glyphicon glyphicon-remove"></i>
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
          <i className="glyphicon glyphicon-inbox" style={{ fontSize: '48px', color: '#ccc' }}></i>
          <h4 className="text-muted">No travel requests found</h4>
          <button className="btn btn-primary" onClick={toggleForm}>
            <i className="glyphicon glyphicon-plus"></i> Create Your First Request
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
        id="requestDetailModal"
        open={selectedRequest !== null}
        title={`Travel Request — ${selectedRequest?.destination ?? ''}`}
        onClose={() => {
          setSelectedRequest(null);
        }}
      >
        {selectedRequest === null ? null : (
          <>
            <div className="row">
              <div className="col-md-6">
                {/* travelerName is absent on every seeded request, so this line
                    renders blank. PRESERVED — the baseline pins it. */}
                <p>
                  <strong>Traveler:</strong> {selectedRequest.travelerName ?? ''}
                </p>
                <p>
                  <strong>Department:</strong> {selectedRequest.department}
                </p>
                <p>
                  <strong>Purpose:</strong> {selectedRequest.purpose}
                </p>
                <p>
                  <strong>Dates:</strong> {formatListDate(selectedRequest.departDate)} –{' '}
                  {formatListDate(selectedRequest.returnDate)}
                </p>
                <p>
                  <strong>Duration:</strong>{' '}
                  {tripDuration(selectedRequest.departDate, selectedRequest.returnDate) ?? 0} days
                </p>
              </div>
              <div className="col-md-6">
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`label ${statusClass(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </p>
                <p>
                  <strong>Total Estimate:</strong> {formatMoneyFixed(selectedRequest.totalEstimate)}
                </p>
                <p>
                  <strong>Visa Required:</strong> {selectedRequest.needsVisa ? 'Yes' : 'No'}
                </p>
                <p>
                  <strong>Travel Insurance:</strong>{' '}
                  {selectedRequest.needsInsurance ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
            {selectedRequest.justification !== undefined && selectedRequest.justification !== '' ? (
              <div className="row">
                <div className="col-md-12">
                  <h5>Business Justification</h5>
                  <p className="well well-sm">{selectedRequest.justification}</p>
                </div>
              </div>
            ) : null}
            <div className="row">
              <div className="col-md-12">
                <h5>Cost Breakdown</h5>
                <table className="table table-condensed">
                  <tbody>
                    {COST_FIELDS.map((field) => (
                      <tr key={field.key}>
                        <td>{field.label}</td>
                        {/* `number:2` — GROUPED, unlike the Total row below.
                            Both renderings are pinned by the baseline. */}
                        <td className="text-right">
                          {formatMoneyCurrency(selectedRequest.estimatedCosts[field.key])}
                        </td>
                      </tr>
                    ))}
                    <tr className="active">
                      <td>
                        <strong>Total</strong>
                      </td>
                      <td className="text-right">
                        <strong>{formatMoneyFixed(selectedRequest.totalEstimate)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* NO approval chain. SEAM-2 is ACCEPTED (Q-1) and the baseline
                pins that nothing here can approve or reject. */}
          </>
        )}
      </Modal>

      {dialog}
    </div>
  );
}

function SummaryCard(props: {
  tone: string;
  value: number;
  label: string;
  muted?: boolean;
}): ReactElement {
  return (
    <div className="col-md-3">
      <div className={`panel ${props.tone} text-center`}>
        <div className="panel-body">
          <h2>{props.value}</h2>
          <p className={props.muted === true ? 'text-muted' : undefined}>{props.label}</p>
        </div>
      </div>
    </div>
  );
}
