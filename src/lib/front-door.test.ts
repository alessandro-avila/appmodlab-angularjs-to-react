/**
 * FRONT DOOR — after the cutover.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THESE TESTS USED TO PROVE
 * ─────────────────────────────────────────────────────────────────────────
 * Through Increments 0-5 this file pinned the strangler fig: that `/flights`
 * served React while `/hotels` 302-redirected to `/#!/hotels`, that legacy
 * static assets proxied to :8080, and — the important one — that flipping a
 * single ledger row was the ONLY edit an increment needed to move a route.
 *
 * Every one of those assertions described a MECHANISM that Increment 6
 * deliberately removes. There is no second application to redirect to, no
 * legacy server to proxy to, and no mixed-ownership ledger to consult. Keeping
 * them would mean keeping the strangler fig alive purely so its tests could
 * pass, which is the opposite of what a cutover is for.
 *
 * They are replaced, not deleted-and-forgotten: what the migration achieved is
 * asserted below as an END STATE, and the ledger's `migratesIn` column remains
 * the record of which increment moved what.
 */
import { describe, it, expect } from 'vitest';
import { decide, pathnameOf, isViteInternal } from './front-door';
import { ROUTE_LEDGER } from './route-ledger';

describe('front door — the end state after cutover', () => {
  it('serves the REACT document at the root, where AngularJS used to answer', () => {
    expect(decide('/')).toEqual({ kind: 'react' });
  });

  it('serves every product route from React', () => {
    for (const path of [
      '/login',
      '/dashboard',
      '/flights',
      '/hotels',
      '/itinerary',
      '/travel-request',
      '/expenses',
    ]) {
      expect(decide(path), path).toEqual({ kind: 'react' });
    }
  });

  it('serves the shell health route from React', () => {
    expect(decide('/__shell')).toEqual({ kind: 'react' });
  });

  it('serves an UNKNOWN path from React, for the router to resolve', () => {
    // Replaces the old "proxy it to the legacy server" leg. The router's
    // catch-all reproduces $urlRouterProvider.otherwise('/login'), so the
    // observable outcome is the one the baseline pins.
    expect(decide('/somewhere-that-does-not-exist')).toEqual({ kind: 'react' });
  });

  it('serves a legacy hash address from React — it arrives as "/"', () => {
    // ADR-012 §3: the fragment is never transmitted, so this is a GET /.
    expect(decide('/#!/flights')).toEqual({ kind: 'react' });
  });

  it('still proxies /api — the one seam that survived the migration', () => {
    expect(decide('/api/auth/me')).toEqual({ kind: 'proxy-to-api' });
    expect(decide('/api')).toEqual({ kind: 'proxy-to-api' });
  });

  it('never touches Vite internals, or the dev server cannot boot', () => {
    for (const p of ['/@vite/client', '/src/main.tsx', '/node_modules/.vite/deps/react.js']) {
      expect(decide(p)).toEqual({ kind: 'vite-internal' });
    }
  });

  it('has NO decision that reaches a legacy application', () => {
    // The structural proof that the fig has been cut down: across every path
    // the migration ever routed, nothing resolves anywhere but React or the
    // API. `proxy-to-legacy` and `redirect-to-legacy-hash` no longer exist as
    // outcomes — this test would fail to compile if they were reintroduced
    // without being handled.
    const paths = [
      '/',
      '/#!/flights',
      '/assets/css/style.css',
      '/bower_components/angular/angular.js',
      '/components/hotel-booking/hotel-booking.template.html',
      ...ROUTE_LEDGER.map((r) => r.path),
    ];
    for (const p of paths) {
      expect(['react', 'proxy-to-api', 'vite-internal'], p).toContain(decide(p).kind);
    }
  });
});

describe('route ledger — the record of what moved when', () => {
  it('shows every row owned by React', () => {
    expect(ROUTE_LEDGER.every((r) => r.owner === 'react')).toBe(true);
  });

  it('still records the increment each route migrated in', () => {
    const byIncrement = Object.fromEntries(ROUTE_LEDGER.map((r) => [r.path, r.migratesIn]));
    expect(byIncrement).toEqual({
      '/login': 'Inc-6',
      '/dashboard': 'Inc-6',
      '/flights': 'Inc-1',
      '/hotels': 'Inc-2',
      '/itinerary': 'Inc-3',
      '/travel-request': 'Inc-4',
      '/expenses': 'Inc-5',
    });
  });
});

describe('front door — url parsing', () => {
  it('ignores the query string', () => {
    expect(pathnameOf('/flights?from=BOS')).toBe('/flights');
  });

  it('ignores a fragment, which the server never receives anyway', () => {
    expect(pathnameOf('/#!/flights')).toBe('/');
  });

  it('recognises vite internals by prefix', () => {
    expect(isViteInternal('/@react-refresh')).toBe(true);
    expect(isViteInternal('/flights')).toBe(false);
  });
});
