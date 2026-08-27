/**
 * The test seam that replaces what AngularJS gave the harness for free.
 *
 * The green baseline reads state the screen does not render — chiefly the
 * numeric `filters.maxPrice` behind the range slider and the `priceRange` it is
 * derived from — and it observes `$rootScope` broadcasts. In AngularJS both
 * were reachable through `angular.element(...).scope()` and the injector.
 *
 * React has no equivalent, so the flight-search route publishes a
 * SCOPE-SHAPED snapshot under the same property names the scenarios already
 * use. `tests/pages/flight-search.page.js` reads it, which is what lets the
 * feature file and the step definitions stay unchanged when the module migrates
 * (increment-plan §1.4).
 *
 * This is deliberately DEV-ONLY. The baseline runs against the Vite dev server
 * behind the front door, so the seam is present exactly where it is needed and
 * absent from a production build. It is removed entirely at cutover.
 */
import type { Flight, Filters, PriceRange, SearchParams, SortField } from '../types/flight';

export interface FlightSearchScope {
  searchParams: SearchParams;
  flights: Flight[];
  filteredFlights: Flight[];
  selectedFlight: Flight | null;
  filters: Filters;
  priceRange: PriceRange;
  airlines: string[];
  sortField: SortField;
  sortReverse: boolean;
  isLoading: boolean;
  hasSearched: boolean;
  errorMessage: string;
}

/**
 * Every migrated feature publishes its own scope shape. The harness reads
 * whatever the route it is driving has published, exactly as
 * `angular.element(...).scope()` returned whatever controller was on screen.
 */
export type PublishedScope = Record<string, unknown>;

interface TestSeam {
  scope: PublishedScope | null;
  /**
   * Counts of announcements the app makes to the rest of the system. Replaces
   * `$rootScope.$broadcast` for the harness.
   *
   * `itinerary:refresh` is announced on booking exactly as the legacy
   * controllers do, and — exactly as in the legacy app — NOTHING CONSUMES IT.
   * ADR-013 defers the consumer to Increment 3.
   */
  events: Record<string, number>;
}

const SEAM_KEY = '__flightSearch';

function seamEnabled(): boolean {
  return import.meta.env.DEV;
}

function seam(): TestSeam | null {
  if (!seamEnabled()) return null;
  const w = globalThis as unknown as Record<string, TestSeam | undefined>;
  w[SEAM_KEY] ??= { scope: null, events: {} };
  return w[SEAM_KEY] ?? null;
}

export function publishScope(scope: PublishedScope): void {
  const s = seam();
  if (s) s.scope = scope;
}

export function clearScope(): void {
  const s = seam();
  if (s) s.scope = null;
}

/**
 * The React stand-in for `$rootScope.$broadcast(name)`.
 *
 * Announces that something happened. Like the legacy broadcast for
 * `itinerary:refresh`, it has no subscriber — the announcement is the
 * behaviour, and the consumer arrives in a later increment.
 */
export function announce(name: string): void {
  const s = seam();
  if (s) s.events[name] = (s.events[name] ?? 0) + 1;
}
