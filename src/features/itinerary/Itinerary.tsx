/**
 * ITINERARY — the React port of `app/components/itinerary/*`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TWO CONTROLS THAT WERE DEAD IN ANGULARJS NOW WORK (ADR-005, ADR-022)
 * ─────────────────────────────────────────────────────────────────────────
 * The status filter and Add Note do nothing in the legacy app: both sit inside
 * an `ng-if`/`ng-repeat` child scope and write to a property the controller
 * never reads (finding P-2). The logic behind each is complete and correct and
 * merely unreachable.
 *
 * ADR-005's scenario classification lists "the four dead controls" under
 * **Supersede** — *"the scenario encodes a defect that ADR-001/002 already
 * decided to fix"* — and its rejection of the Fix-Bugs path says those defects
 * *"are resolved by being reimplemented correctly"*. React having no scope
 * chain is the mechanism; ADR-005 is the authorisation. Both are needed, and
 * both are present here.
 *
 * So each control is ordinary React state: one value, written by the control
 * and read by the logic. `filterStatus` drives `filterDays()`; a row's
 * `noteDrafts[id]` is what `handleAddNote(id)` posts.
 *
 * Contrast `flight:selected` (ADR-013, ADR-022): identical dead code, dropped
 * rather than revived, because no decision authorises it. The difference is
 * authorisation, not mechanism.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { notify } from '../../stores/notification-store';
import { ApiError } from '../../lib/api-client';
import { publishScope, clearScope } from '../../lib/test-seam';
import { formatMoneyCurrency } from '../../lib/format';
import type { Trip, ItineraryItem, ItineraryNote } from '../../types/itinerary';
import { itineraryQuery, getTripDetails, addNote, cancelItem } from './itinerary-api';
import {
  decorateTrip,
  sortTripsByStart,
  groupItemsByDay,
  calculateTotals,
  filterDays,
  formatTime,
  formatItemCost,
  formatNoteTimestamp,
  getItemIcon,
  getStatusLabel,
  getTripStatusLabel,
  type DecoratedTrip,
  type ItineraryDay,
  type ItineraryTotals,
} from './itinerary-model';

/**
 * ADR-017 — what `printContent.find('.btn, .no-print').remove()` used to do by
 * DOM surgery, expressed as CSS.
 *
 * ONE source of truth: the stylesheet is generated from this list, and the same
 * list is published on the test seam so the print scenarios assert exactly what
 * the browser is told, not a second copy of it.
 */
const PRINT_HIDDEN_SELECTORS = [
  'body > *',
  '.no-print',
  '#itinerary-details .btn',
  '#itinerary-details .btn-group',
] as const;

const PRINT_STYLES = `
@media print {
  body > * { display: none !important; }
  body .itinerary-container { display: block !important; }
  .itinerary-container > .row:not(:has(#itinerary-details)) { display: none !important; }
  .itinerary-container .page-header { display: none !important; }
  #itinerary-details { display: block !important; }
  #itinerary-details .btn,
  #itinerary-details .btn-group,
  .no-print { display: none !important; }
}
`;

const VIEW_LIST = 'list';
const VIEW_TIMELINE = 'timeline';

export function Itinerary(): ReactElement {
  const [trips, setTrips] = useState<readonly DecoratedTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<DecoratedTrip | null>(null);
  const [itineraryTrip, setItineraryTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [viewMode, setViewMode] = useState<string>(VIEW_LIST);

  // --- the two controls AngularJS left unreachable, now ordinary state ---
  /** Written by the filter buttons AND read by filterDays(). One value. */
  const [filterStatus, setFilterStatus] = useState('all');
  /** One note draft per row, keyed by item id, read by handleAddNote(). */
  const [noteDrafts, setNoteDrafts] = useState<Readonly<Record<string, string>>>({});

  /** Notes as the SERVER returned them, keyed by item id. */
  const [serverNotes, setServerNotes] = useState<Readonly<Record<string, readonly ItineraryNote[]>>>({});
  const [cancelledIds, setCancelledIds] = useState<readonly string[]>([]);

  const detailsRef = useRef<HTMLDivElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  /* ------------------------------------------------------------- loading */

  const loadTrips = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const loaded = await itineraryQuery.read();
      const now = new Date();
      const decorated = sortTripsByStart(loaded).map((t) => decorateTrip(t, now));
      setTrips(decorated);

      // `itinerary.controller.js:44-46` — the earliest trip opens without being
      // asked for. On a refresh the trip already open stays open.
      const keep = decorated.find((t) => t.id === selectedIdRef.current);
      const next = keep ?? decorated[0];
      if (next !== undefined) await openTrip(next, { scroll: keep === undefined ? false : false });
    } catch (error) {
      // `itinerary.controller.js:47-49` — the legacy caught every failure
      // identically, which is how a rejected session came to be reported as an
      // empty itinerary. ADR-018 splits the two: a 401 is a SESSION event,
      // already reported by the API client, and the route guard is about to
      // return the traveller to the login screen. Naming the data here as well
      // would restate the misdiagnosis the ADR exists to remove.
      if (error instanceof ApiError && error.status === 401) return;
      setErrorMessage('Failed to load trips. Please try again.');
      notify('Failed to load itinerary', 'error');
    } finally {
      setIsLoading(false);
    }
    // openTrip is stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTrip = useCallback(
    async (trip: DecoratedTrip, options: { scroll: boolean } = { scroll: true }): Promise<void> => {
      setSelectedTrip(trip);
      selectedIdRef.current = trip.id;
      setIsLoading(true);
      try {
        const details = await getTripDetails(trip.id);
        setItineraryTrip(details);
        if (options.scroll) {
          // ADR-007 category 3: `$('html, body').animate({scrollTop: ...})`
          // becomes a declarative scroll. jsdom implements neither, hence the
          // optional call.
          detailsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        }
      } catch {
        setErrorMessage('Failed to load trip details.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadTrips();
    // The itinerary:refresh replacement. A booking invalidates the query and
    // every live view reloads — no pub/sub, and the dependency is a function
    // call rather than a string in two other files (ADR-021).
    const unsubscribe = itineraryQuery.subscribe(() => {
      void loadTrips();
    });
    return () => {
      unsubscribe();
      clearScope();
    };
  }, [loadTrips]);

  /* -------------------------------------------------------------- derived */

  const items = useMemo<readonly ItineraryItem[]>(() => {
    if (itineraryTrip === null) return [];
    return itineraryTrip.items.map((item) =>
      cancelledIds.includes(item.id) ? { ...item, status: 'cancelled' } : item,
    );
  }, [itineraryTrip, cancelledIds]);

  const days = useMemo<readonly ItineraryDay[]>(() => {
    if (itineraryTrip === null) return [];
    return groupItemsByDay(items, itineraryTrip.startDate);
  }, [items, itineraryTrip]);

  const totals = useMemo<ItineraryTotals>(() => calculateTotals(items), [items]);

  /**
   * `displayDays` — `getFilteredDays()` at `itinerary.controller.js:114-123`.
   *
   * Computed from the same `filterStatus` the buttons write, so choosing a
   * status now filters. `undefined` for "all" keeps the template's
   * `displayDays || itinerary.days` fallback meaningful.
   */
  const displayDays = useMemo<readonly ItineraryDay[] | undefined>(() => {
    if (filterStatus === 'all') return undefined;
    return filterDays(days, filterStatus);
  }, [days, filterStatus]);

  const visibleDays = displayDays ?? days;

  /* ------------------------------------------------------------ the seam */

  useEffect(() => {
    publishScope({
      trips,
      selectedTrip,
      itinerary:
        itineraryTrip === null
          ? null
          : { ...itineraryTrip, items, days, totals },
      isLoading,
      errorMessage,
      viewMode,
      filterStatus,
      displayDays,
      noteDrafts,
    });
  }, [
    trips,
    selectedTrip,
    itineraryTrip,
    items,
    days,
    totals,
    isLoading,
    errorMessage,
    viewMode,
    filterStatus,
    displayDays,
    noteDrafts,
  ]);

  /* -------------------------------------------------------------- actions */

  /**
   * `addNote()` — `itinerary.controller.js:139-154`, reimplemented correctly.
   *
   * Two repairs come with the control being reachable, both authorised by
   * ADR-005 via increment plan §7.4 rows 22 and 23:
   *
   *   ATTRIBUTION (row 22, ADR-003 C-1). The legacy credited the note to
   *   `$rootScope.currentUser`, which is set only inside the login handler and
   *   never persisted, so the `'You'` fallback always won on a restored
   *   session. The note is now credited by the SERVER from the authenticated
   *   caller, so the client needs no identity of its own — which is why this
   *   repair does not require the client-side C-1 rehydration that
   *   `auth-store.ts` schedules for Inc-6.
   *
   *   PERSISTENCE (row 23). The server read `req.body.notes` while the client
   *   posted `{ text, createdAt }`, so nothing was ever stored. It appends now.
   *
   * The rendered note is the SERVER's, not a locally constructed guess, so what
   * is shown immediately is exactly what a reload will show.
   */
  const runAddNote = useCallback(async (itemId: string, text: string): Promise<void> => {
    try {
      const item = await addNote(itemId, text);
      setServerNotes((prev) => ({ ...prev, [itemId]: item.notes ?? [] }));
      setNoteDrafts((prev) => ({ ...prev, [itemId]: '' }));
      notify('Note added', 'success');
    } catch {
      notify('Failed to add note', 'error');
    }
  }, []);

  /** Reads the draft the row's own input writes. `controller:140`'s guard. */
  const handleAddNote = useCallback(
    (itemId: string): void => {
      const draft = noteDrafts[itemId] ?? '';
      if (draft.trim() === '') return;
      void runAddNote(itemId, draft);
    },
    [noteDrafts, runAddNote],
  );

  const handleCancelItem = useCallback(
    async (item: ItineraryItem): Promise<void> => {
      // eslint-disable-next-line no-alert
      if (!globalThis.confirm('Are you sure you want to cancel this item?')) return;
      try {
        await cancelItem(item.id);
        setCancelledIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
        notify(`${item.type} cancelled`, 'warning');
      } catch {
        notify('Failed to cancel item', 'error');
      }
    },
    [],
  );

  /**
   * ADR-017 — print the live document. No clone, no popup, no CDN.
   *
   * The title is set for the duration of the call because browsers put the
   * document title in the print header, and the legacy popup declared
   * `<title>Itinerary</title>`. Restoring it afterwards keeps the change
   * invisible on screen.
   */
  const handlePrint = useCallback((): void => {
    const previous = document.title;
    document.title = 'Itinerary';
    try {
      globalThis.print();
    } finally {
      document.title = previous;
    }
  }, []);

  /* --------------------------------------------------------------- render */

  const heading = selectedTrip === null ? '' : selectedTrip.name;

  return (
    <div className="container-fluid itinerary-container" data-testid="itinerary">
      <style data-testid="print-styles">{PRINT_STYLES}</style>

      <div className="row">
        <div className="col-md-12">
          <h2 className="page-header">
            <i className="glyphicon glyphicon-list-alt"></i> My Itinerary
            <div className="pull-right">
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn ${viewMode === VIEW_LIST ? 'btn-primary' : 'btn-default'}`}
                  onClick={() => {
                    setViewMode(VIEW_LIST);
                  }}
                >
                  <i className="glyphicon glyphicon-th-list"></i> List
                </button>
                <button
                  className={`btn ${viewMode === VIEW_TIMELINE ? 'btn-primary' : 'btn-default'}`}
                  onClick={() => {
                    setViewMode(VIEW_TIMELINE);
                  }}
                >
                  <i className="glyphicon glyphicon-time"></i> Timeline
                </button>
              </div>
              <button className="btn btn-default btn-sm no-print" onClick={handlePrint}>
                <i className="glyphicon glyphicon-print"></i> Print
              </button>
            </div>
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center" style={{ padding: '40px' }}>
          <i className="glyphicon glyphicon-refresh glyphicon-spin" style={{ fontSize: '32px' }}></i>
          <p>Loading itinerary...</p>
        </div>
      ) : null}

      {errorMessage !== '' ? (
        <div className="alert alert-danger">
          <i className="glyphicon glyphicon-exclamation-sign"></i> {errorMessage}
        </div>
      ) : null}

      {trips.length > 0 ? (
        <div className="row">
          <div className="col-md-12">
            <div className="panel panel-default">
              <div className="panel-heading">
                <h4 className="panel-title">My Trips</h4>
              </div>
              <div className="list-group">
                {trips.map((trip) => (
                  <a
                    href=""
                    key={trip.id}
                    className={`list-group-item${selectedTrip?.id === trip.id ? ' active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      void openTrip(trip);
                    }}
                  >
                    <div className="row">
                      <div className="col-xs-4">
                        <strong>{trip.name}</strong>
                        <br />
                        {/* Binds trip.destination, which the API never sends.
                            PRESERVED — the baseline pins that no trip shows a
                            destination. Rendered empty, deliberately. */}
                        <small></small>
                      </div>
                      <div className="col-xs-3">
                        <small>
                          {trip.startFormatted} - {trip.endFormatted}
                        </small>
                        <br />
                        <small className="text-muted">{trip.duration} days</small>
                      </div>
                      <div className="col-xs-3">
                        <span className={`label ${getTripStatusLabel(trip.derivedStatus)}`}>
                          {trip.derivedStatus}
                        </span>
                        {trip.daysUntil > 0 ? (
                          <span className="text-muted">
                            <small>in {trip.daysUntil} days</small>
                          </span>
                        ) : null}
                      </div>
                      <div className="col-xs-2 text-right">
                        {/* `${{trip.totalCost | number:2}}` — grouped, 2dp.
                            Since Q-6 this value is the server's. */}
                        <strong>{formatMoneyCurrency(trip.totalCost)}</strong>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && trips.length === 0 ? (
        <div className="text-center" style={{ padding: '60px' }}>
          <i className="glyphicon glyphicon-briefcase" style={{ fontSize: '64px', color: '#ccc' }}></i>
          <h3 className="text-muted">No trips yet</h3>
          <p className="text-muted">Book a flight or hotel to get started!</p>
        </div>
      ) : null}

      {itineraryTrip !== null && selectedTrip !== null ? (
        <div id="itinerary-details" ref={detailsRef}>
          <div className="row">
            <div className="col-md-12">
              <div className="panel panel-primary">
                <div className="panel-heading">
                  <h3 className="panel-title">
                    {/* "{{name}} — {{destination}}" with no destination. The
                        dangling separator is PRESERVED. */}
                    {heading} —{' '}
                    <span className="pull-right">
                      {selectedTrip.startFormatted} to {selectedTrip.endFormatted}
                    </span>
                  </h3>
                </div>
                <div className="panel-body">
                  <div className="row">
                    <SummaryCard label="Flights" amount={totals.flights} tone="text-primary" />
                    <SummaryCard label="Hotels" amount={totals.hotels} tone="text-info" />
                    <SummaryCard label="Activities" amount={totals.activities} tone="text-success" />
                    {/* No card for `transport`, which is nevertheless summed
                        into the total below. PRESERVED — the cards do not add
                        up, by design of the original. */}
                    <SummaryCard label="Total" amount={totals.total} tone="text-danger" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              {/* Ordinary React state (ADR-005, ADR-022): the value these
                  buttons write is the value filterDays() reads. */}
              <div className="btn-group btn-group-sm" style={{ marginBottom: '15px' }}>
                {(['all', 'confirmed', 'pending', 'cancelled'] as const).map((status) => (
                  <button
                    key={status}
                    className={`btn ${filterStatus === status ? FILTER_TONE[status] : 'btn-default'}`}
                    onClick={() => {
                      setFilterStatus(status);
                    }}
                  >
                    {FILTER_LABEL[status]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {viewMode === VIEW_LIST ? (
            <div className="itinerary-list">
              {visibleDays.map((day) => (
                <div className="panel panel-default" key={day.date}>
                  <div className="panel-heading">
                    <h4 className="panel-title">
                      <i className="glyphicon glyphicon-calendar"></i> Day {day.dayNumber} —{' '}
                      {day.dateFormatted}
                    </h4>
                  </div>
                  <div className="list-group">
                    {day.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        notes={serverNotes[item.id] ?? item.notes ?? []}
                        draft={noteDrafts[item.id] ?? ''}
                        onDraftChange={(value) => {
                          setNoteDrafts((prev) => ({ ...prev, [item.id]: value }));
                        }}
                        onAddNote={() => {
                          handleAddNote(item.id);
                        }}
                        onCancel={() => {
                          void handleCancelItem(item);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {viewMode === VIEW_TIMELINE ? (
            <div className="itinerary-timeline">
              {visibleDays.map((day) => (
                <div className="row" key={day.date}>
                  <div className="col-md-2 text-right">
                    <h5>
                      <strong>Day {day.dayNumber}</strong>
                    </h5>
                    <p className="text-muted">{day.dateFormatted}</p>
                  </div>
                  <div className="col-md-10">
                    <div
                      className="timeline-line"
                      style={{
                        borderLeft: '3px solid #337ab7',
                        paddingLeft: '20px',
                        marginBottom: '20px',
                      }}
                    >
                      {day.items.map((item) => (
                        <div key={item.id} style={{ marginBottom: '15px' }}>
                          <div className="panel panel-default panel-sm">
                            <div className="panel-body">
                              <i className={`glyphicon ${getItemIcon(item.type)} text-primary`}></i>{' '}
                              <strong>{formatTime(item.time)}</strong> —{' '}
                              {/* item.title again: blank. PRESERVED. */}
                              <span className={`label ${getStatusLabel(item.status)} pull-right`}>
                                {item.status}
                              </span>
                              <p className="text-muted" style={{ marginTop: '5px' }}>
                                {item.description}
                              </p>
                              {/* The timeline shows NO costs. PRESERVED. */}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const FILTER_LABEL: Readonly<Record<string, string>> = {
  all: 'All',
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

const FILTER_TONE: Readonly<Record<string, string>> = {
  all: 'btn-primary',
  confirmed: 'btn-success',
  pending: 'btn-warning',
  cancelled: 'btn-danger',
};

function SummaryCard(props: { label: string; amount: number; tone: string }): ReactElement {
  return (
    <div className="col-md-3 text-center">
      <h4>{props.label}</h4>
      {/* `${{value | number:2}}` — grouped, two decimals. */}
      <h3 className={props.tone}>{formatMoneyCurrency(props.amount)}</h3>
    </div>
  );
}

interface ItemRowProps {
  readonly item: ItineraryItem;
  readonly notes: readonly ItineraryNote[];
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onAddNote: () => void;
  readonly onCancel: () => void;
}

function ItemRow({
  item,
  notes,
  draft,
  onDraftChange,
  onAddNote,
  onCancel,
}: ItemRowProps): ReactElement {
  const time = formatTime(item.time);
  return (
    <div
      className={`list-group-item${item.status === 'cancelled' ? ' list-group-item-danger' : ''}`}
    >
      <div className="row">
        <div className="col-md-1 text-center">
          <i className={`glyphicon ${getItemIcon(item.type)}`} style={{ fontSize: '24px' }}></i>
        </div>
        <div className="col-md-2">
          <strong>{time === '' ? 'TBD' : time}</strong>
          <br />
          <span className={`label ${getStatusLabel(item.status)}`}>{item.status}</span>
        </div>
        <div className="col-md-5">
          {/* Binds item.title, which items do not carry. Every headline is
              blank and only the smaller description carries the text.
              PRESERVED — rendered as an empty <strong>, deliberately. */}
          <strong></strong>
          <br />
          <small className="text-muted">{item.description}</small>
          {item.confirmationCode !== undefined ? (
            <div>
              <small>
                <strong>Confirmation:</strong> {item.confirmationCode}
              </small>
            </div>
          ) : null}
        </div>
        <div className="col-md-2 text-right">
          {/* `'$' + cost.toFixed(2)` — UNGROUPED. Not the same rendering as the
              trip total above; see itinerary-model.formatItemCost. */}
          <strong>{formatItemCost(item.cost)}</strong>
        </div>
        <div className="col-md-2 text-right no-print">
          {item.status !== 'cancelled' ? (
            <button className="btn btn-xs btn-danger" onClick={onCancel}>
              <i className="glyphicon glyphicon-remove"></i> Cancel
            </button>
          ) : null}
        </div>
      </div>

      {notes.length > 0 ? (
        <div className="row" style={{ marginTop: '10px' }}>
          <div className="col-md-11 col-md-offset-1">
            {notes.map((note, index) => (
              <div className="well well-sm" key={`${note.createdAt}-${index}`}>
                <small>
                  <strong>{note.author}</strong> — {formatNoteTimestamp(note.createdAt)}
                </small>
                <br />
                <small>{note.text}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Ordinary React state (ADR-005, ADR-022): the draft this input writes
          is the draft handleAddNote() posts for this row. */}
      <div className="row no-print" style={{ marginTop: '5px' }}>
        <div className="col-md-10 col-md-offset-1">
          <div className="input-group input-group-sm">
            <input
              type="text"
              className="form-control"
              placeholder="Add a note..."
              value={draft}
              onChange={(e) => {
                onDraftChange(e.target.value);
              }}
            />
            <span className="input-group-btn">
              <button className="btn btn-default" onClick={onAddNote}>
                <i className="glyphicon glyphicon-plus"></i>
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { PRINT_HIDDEN_SELECTORS, PRINT_STYLES };
