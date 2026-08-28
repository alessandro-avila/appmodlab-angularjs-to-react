/**
 * THE ROUTE LEDGER — the strangler fig's single source of truth.
 *
 * Increment plan §1.3: "An increment is 'one row of the ledger moves from
 * AngularJS to React'."
 *
 * This file is imported by TWO consumers, which is the whole point:
 *
 *   1. `vite.config.ts` — to build the dev-server proxy (the front door).
 *      Anything NOT owned by React is proxied to the legacy AngularJS server.
 *   2. `src/App.tsx` — to build the React route tree.
 *
 * Because both read the same array, the front door and the router can never
 * disagree about who owns a URL. Plan §1.2 requires exactly this: "the ledger
 * is data, not scattered conditionals".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW AN INCREMENT MOVES A ROW
 * ─────────────────────────────────────────────────────────────────────────
 * Increment 1 (flight-search) changes ONE word in this file:
 *
 *     { path: '/flights', ..., owner: 'angularjs' }
 *                          ->  owner: 'react'
 *
 * That single edit simultaneously:
 *   - stops the front door proxying /flights to :8080
 *   - starts Vite serving the React document for /flights
 *   - flips the ledger assertions in the shell test suite
 *
 * Rolling back is the same edit in reverse (plan §2.3: the ledger row can be
 * flipped back in one line, which is the entire rollback story).
 */

export type RouteOwner = 'angularjs' | 'react';

export interface LedgerRow {
  /** The real path, post-migration. Never a hash fragment — see ADR-012. */
  readonly path: string;
  /** The UI-Router state this mirrors, from app/app.routes.js. */
  readonly legacyState: string;
  /** The legacy hash URL a user would have used. Informational: ADR-012 breaks these at Inc-6. */
  readonly legacyHash: string;
  /** Who answers this URL today. */
  readonly owner: RouteOwner;
  /** The increment that takes ownership. */
  readonly migratesIn: string;
  /** Whether the legacy route guard demanded a token (app/app.routes.js `data.requireAuth`). */
  readonly requireAuth: boolean;
}

/**
 * All seven UI-Router states from app/app.routes.js, mirrored.
 *
 * Increment 1 moved the FIRST row: `/flights` is now owned by React. Every
 * other row is still AngularJS, so the remaining 4 feature modules and the
 * login/dashboard pair keep answering exactly as before.
 */
export const ROUTE_LEDGER: readonly LedgerRow[] = [
  { path: '/login', legacyState: 'login', legacyHash: '#!/login', owner: 'angularjs', migratesIn: 'Inc-6', requireAuth: false },
  { path: '/dashboard', legacyState: 'dashboard', legacyHash: '#!/dashboard', owner: 'angularjs', migratesIn: 'Inc-6', requireAuth: true },
  { path: '/flights', legacyState: 'flights', legacyHash: '#!/flights', owner: 'react', migratesIn: 'Inc-1', requireAuth: true },
  { path: '/hotels', legacyState: 'hotels', legacyHash: '#!/hotels', owner: 'react', migratesIn: 'Inc-2', requireAuth: true },
  { path: '/itinerary', legacyState: 'itinerary', legacyHash: '#!/itinerary', owner: 'react', migratesIn: 'Inc-3', requireAuth: true },
  { path: '/travel-request', legacyState: 'travelRequest', legacyHash: '#!/travel-request', owner: 'react', migratesIn: 'Inc-4', requireAuth: true },
  { path: '/expenses', legacyState: 'expenses', legacyHash: '#!/expenses', owner: 'angularjs', migratesIn: 'Inc-5', requireAuth: true },
];

/**
 * The React shell's own health route. Deliberately NOT a product route.
 *
 * Plan §4.2 requires the router tree to have "one trivial route that is not a
 * product route (a shell health route)". It is how Inc-0 proves React is
 * mounted and routing without owning anything a baseline scenario observes.
 */
export const SHELL_HEALTH_PATH = '/__shell';

export function reactOwnedPaths(ledger: readonly LedgerRow[] = ROUTE_LEDGER): string[] {
  return ledger.filter((r) => r.owner === 'react').map((r) => r.path);
}

export function legacyOwnedPaths(ledger: readonly LedgerRow[] = ROUTE_LEDGER): string[] {
  return ledger.filter((r) => r.owner === 'angularjs').map((r) => r.path);
}

export function ownerOf(path: string, ledger: readonly LedgerRow[] = ROUTE_LEDGER): RouteOwner | null {
  return ledger.find((r) => r.path === path)?.owner ?? null;
}

/**
 * Paths the legacy app owns that are NOT ledger rows: its static assets.
 * The front door must forward these to :8080 for the whole migration.
 */
export const LEGACY_STATIC_PREFIXES: readonly string[] = ['/components', '/assets', '/bower_components'];
