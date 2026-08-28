/**
 * ROUTE LEDGER — the strangler fig's invariants.
 *
 * These tests are the gate on Increment 0's central claim: React owns no
 * product route, so all 235 baseline scenarios still reach the legacy app.
 *
 * They are also the tests that CHANGE in increments 1–5. When Inc-1 flips
 * /flights to 'react', the first test here fails and must be updated to
 * `['/flights']` — which is exactly the point. The ledger cannot move without
 * a deliberate, reviewed edit.
 */
import { describe, it, expect } from 'vitest';
import {
  ROUTE_LEDGER,
  SHELL_HEALTH_PATH,
  reactOwnedPaths,
  legacyOwnedPaths,
  ownerOf,
} from './route-ledger';

describe('route ledger — ownership after Increment 4', () => {
  it('React owns exactly the migrated routes', () => {
    // Increment 1 moved the first row. This assertion is the ledger's
    // changelog: it must be edited deliberately, per increment.
    expect(reactOwnedPaths()).toEqual(['/flights', '/hotels', '/itinerary', '/travel-request']);
  });

  it('AngularJS still owns the other three', () => {
    expect(legacyOwnedPaths()).toEqual(['/login', '/dashboard', '/expenses']);
  });

  it('the shell health route is not a product route', () => {
    // Plan §4.2 requires "one trivial route that is not a product route".
    expect(ROUTE_LEDGER.some((r) => r.path === SHELL_HEALTH_PATH)).toBe(false);
  });
});

describe('route ledger — mirrors app/app.routes.js exactly', () => {
  it('has one row per UI-Router state, in declaration order', () => {
    expect(ROUTE_LEDGER.map((r) => r.legacyState)).toEqual([
      'login',
      'dashboard',
      'flights',
      'hotels',
      'itinerary',
      'travelRequest',
      'expenses',
    ]);
  });

  it('maps each state to the same url the legacy router used', () => {
    // app/app.routes.js: url: '/login', '/dashboard', '/flights', '/hotels',
    // '/itinerary', '/travel-request', '/expenses'
    expect(ROUTE_LEDGER.map((r) => r.path)).toEqual([
      '/login',
      '/dashboard',
      '/flights',
      '/hotels',
      '/itinerary',
      '/travel-request',
      '/expenses',
    ]);
  });

  it('copies requireAuth from the legacy state definitions', () => {
    // Only `login` omits data.requireAuth; the other six declare it true.
    expect(ownerOf('/login')).toBe('angularjs');
    const requireAuthByState = Object.fromEntries(
      ROUTE_LEDGER.map((r) => [r.legacyState, r.requireAuth]),
    );
    expect(requireAuthByState).toEqual({
      login: false,
      dashboard: true,
      flights: true,
      hotels: true,
      itinerary: true,
      travelRequest: true,
      expenses: true,
    });
  });

  it('uses real paths, never hash fragments (ADR-012)', () => {
    // A fragment is never sent to the server, so a hash-shaped React route
    // makes route ownership inexpressible and the plan unbuildable (§1.2).
    for (const row of ROUTE_LEDGER) {
      expect(row.path.startsWith('/')).toBe(true);
      expect(row.path).not.toContain('#');
    }
  });

  it('records the legacy hash for each row, for the Inc-6 break (ADR-012)', () => {
    expect(ROUTE_LEDGER.map((r) => r.legacyHash)).toEqual([
      '#!/login',
      '#!/dashboard',
      '#!/flights',
      '#!/hotels',
      '#!/itinerary',
      '#!/travel-request',
      '#!/expenses',
    ]);
  });
});

describe('route ledger — the migration schedule', () => {
  it('assigns each feature route to the increment that takes it', () => {
    const schedule = Object.fromEntries(ROUTE_LEDGER.map((r) => [r.legacyState, r.migratesIn]));
    expect(schedule).toEqual({
      login: 'Inc-6',
      dashboard: 'Inc-6',
      flights: 'Inc-1',
      hotels: 'Inc-2',
      itinerary: 'Inc-3',
      travelRequest: 'Inc-4',
      expenses: 'Inc-5',
    });
  });

  it('ownerOf returns null for a path that is not a ledger row', () => {
    expect(ownerOf('/not-a-route')).toBeNull();
  });
});
