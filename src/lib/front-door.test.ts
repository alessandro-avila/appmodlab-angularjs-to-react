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

describe('front door — Increment 0 ownership', () => {
  it('serves the legacy document at the root', () => {
    expect(decide('/')).toEqual({ kind: 'proxy-to-legacy' });
  });

  it('redirects EVERY product route to its legacy hash form', () => {
    // The legacy static server has no /flights resource — its states are
    // fragments under '/'. Proxying the real path would 404, which is exactly
    // the bug this rule exists to prevent.
    const decisions = ROUTE_LEDGER.map((r) => [r.path, decide(r.path)] as const);
    for (const [path, decision] of decisions) {
      expect(decision.kind, `${path} should redirect`).toBe('redirect-to-legacy-hash');
    }
  });

  it('redirects to the exact hash URL the legacy router understands', () => {
    expect(decide('/flights')).toEqual({
      kind: 'redirect-to-legacy-hash',
      location: '/#!/flights',
    });
    expect(decide('/travel-request')).toEqual({
      kind: 'redirect-to-legacy-hash',
      location: '/#!/travel-request',
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
    expect(decide('/components/flight-search/flight-search.template.html')).toEqual({
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

describe('front door — what Increment 1 changes', () => {
  /** The ledger as it will look after Inc-1 flips one row. */
  const afterInc1: readonly LedgerRow[] = ROUTE_LEDGER.map((r) =>
    r.path === '/flights' ? { ...r, owner: 'react' as const } : r,
  );

  it('flipping ONE row moves that route to React', () => {
    expect(decide('/flights', afterInc1)).toEqual({ kind: 'react' });
  });

  it('and leaves every other route exactly where it was', () => {
    for (const row of afterInc1.filter((r) => r.path !== '/flights')) {
      expect(decide(row.path, afterInc1).kind, `${row.path} must not move`).toBe(
        'redirect-to-legacy-hash',
      );
    }
    expect(decide('/', afterInc1)).toEqual({ kind: 'proxy-to-legacy' });
    expect(decide('/api/flights', afterInc1)).toEqual({ kind: 'proxy-to-api' });
  });

  it('so the SAME address survives the migration — only the answerer changes', () => {
    // Increment 0: /flights -> 302 -> the AngularJS screen
    expect(decide('/flights').kind).toBe('redirect-to-legacy-hash');
    // Increment 1: /flights -> 200 -> the React screen
    expect(decide('/flights', afterInc1).kind).toBe('react');
  });

  it('rolling the row back restores the legacy route in one edit', () => {
    // Plan §2.3: the ledger row can be flipped back in one line, which is the
    // entire rollback story.
    expect(decide('/flights', ROUTE_LEDGER).kind).toBe('redirect-to-legacy-hash');
  });
});
