/**
 * FRONT DOOR — the strangler fig's routing rule.
 *
 * These are the tests increments 1–5 depend on. The last block is the
 * important one: it proves that flipping a ledger row is the ONLY thing an
 * increment has to do to move a route.
 */
import { describe, it, expect } from 'vitest';
import { decide, pathnameOf, isViteInternal } from './front-door';
import { ROUTE_LEDGER, type LedgerRow } from './route-ledger';

describe('front door — ownership after Increment 4', () => {
  it('serves the legacy document at the root', () => {
    expect(decide('/')).toEqual({ kind: 'proxy-to-legacy' });
  });

  it('serves /flights from React — the row Increment 1 moved', () => {
    expect(decide('/flights')).toEqual({ kind: 'react' });
  });

  it('still redirects every UNMIGRATED product route to its legacy hash form', () => {
    // The legacy static server has no /hotels resource — its states are
    // fragments under '/'. Proxying the real path would 404, which is exactly
    // the bug this rule exists to prevent.
    for (const path of ['/login', '/dashboard', '/expenses']) {
      expect(decide(path).kind, `${path} should still redirect`).toBe('redirect-to-legacy-hash');
    }
  });

  it('serves /travel-request from React — the row Increment 4 moved', () => {
    expect(decide('/travel-request')).toEqual({ kind: 'react' });
  });

  it('redirects to the exact hash URL the legacy router understands', () => {
    expect(decide('/expenses')).toEqual({
      kind: 'redirect-to-legacy-hash',
      location: '/#!/expenses',
    });
    expect(decide('/dashboard')).toEqual({
      kind: 'redirect-to-legacy-hash',
      location: '/#!/dashboard',
    });
  });

  it('serves the shell health route from React', () => {
    expect(decide('/__shell')).toEqual({ kind: 'react' });
  });

  it('sends /api to the mock API for BOTH applications', () => {
    expect(decide('/api/auth/me')).toEqual({ kind: 'proxy-to-api' });
    expect(decide('/api')).toEqual({ kind: 'proxy-to-api' });
  });

  it('sends legacy static assets to the legacy server', () => {
    expect(decide('/assets/css/style.css')).toEqual({ kind: 'proxy-to-legacy' });
    expect(decide('/components/hotel-booking/hotel-booking.template.html')).toEqual({
      kind: 'proxy-to-legacy',
    });
    expect(decide('/bower_components/angular/angular.js')).toEqual({ kind: 'proxy-to-legacy' });
  });

  it('never touches Vite internals, or the dev server cannot boot', () => {
    for (const p of ['/@vite/client', '/src/main.tsx', '/node_modules/.vite/deps/react.js']) {
      expect(decide(p)).toEqual({ kind: 'vite-internal' });
    }
  });
});

describe('front door — url parsing', () => {
  it('ignores the query string', () => {
    expect(pathnameOf('/flights?from=BOS')).toBe('/flights');
  });

  it('ignores a fragment, which the server never receives anyway', () => {
    expect(pathnameOf('/#!/flights')).toBe('/');
  });

  it('treats a bare hash URL as the legacy root document', () => {
    // This is what the browser actually sends for /#!/flights: just '/'.
    expect(decide('/#!/flights')).toEqual({ kind: 'proxy-to-legacy' });
  });

  it('recognises vite internals by prefix', () => {
    expect(isViteInternal('/@react-refresh')).toBe(true);
    expect(isViteInternal('/flights')).toBe(false);
  });
});

describe('front door — what the NEXT increment changes', () => {
  /** The ledger as it will look after Inc-5 flips the expenses row. */
  const afterInc5: readonly LedgerRow[] = ROUTE_LEDGER.map((r) =>
    r.path === '/expenses' ? { ...r, owner: 'react' as const } : r,
  );

  it('flipping ONE row moves that route to React', () => {
    expect(decide('/expenses', afterInc5)).toEqual({ kind: 'react' });
  });

  it('and leaves every other route exactly where it was', () => {
    for (const row of afterInc5.filter((r) => r.owner === 'angularjs')) {
      expect(decide(row.path, afterInc5).kind, `${row.path} must not move`).toBe(
        'redirect-to-legacy-hash',
      );
    }
    expect(decide('/flights', afterInc5)).toEqual({ kind: 'react' });
    expect(decide('/hotels', afterInc5)).toEqual({ kind: 'react' });
    expect(decide('/itinerary', afterInc5)).toEqual({ kind: 'react' });
    expect(decide('/travel-request', afterInc5)).toEqual({ kind: 'react' });
    expect(decide('/', afterInc5)).toEqual({ kind: 'proxy-to-legacy' });
    expect(decide('/api/hotels', afterInc5)).toEqual({ kind: 'proxy-to-api' });
  });

  it('so the SAME address survives the migration — only the answerer changes', () => {
    // Before its increment: /expenses -> 302 -> the AngularJS screen
    expect(decide('/expenses').kind).toBe('redirect-to-legacy-hash');
    // After:                 /expenses -> 200 -> the React screen
    expect(decide('/expenses', afterInc5).kind).toBe('react');
  });

  it('rolling a row back restores the legacy route in one edit', () => {
    // Plan §2.3: the ledger row can be flipped back in one line, which is the
    // entire rollback story. Proven here against the row Increment 1 moved.
    const rolledBack: readonly LedgerRow[] = ROUTE_LEDGER.map((r) =>
      r.path === '/flights' ? { ...r, owner: 'angularjs' as const } : r,
    );
    expect(decide('/flights', rolledBack)).toEqual({
      kind: 'redirect-to-legacy-hash',
      location: '/#!/flights',
    });
  });
});
