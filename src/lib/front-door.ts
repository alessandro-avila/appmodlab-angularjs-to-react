/**
 * FRONT-DOOR DECISION LOGIC — extracted from `vite.config.mts` so it can be
 * unit-tested.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AT CUTOVER THIS BECAME ALMOST NOTHING, WHICH IS THE POINT.
 * ─────────────────────────────────────────────────────────────────────────
 * Through Increments 0-5 the front door was the strangler fig: it read the
 * route ledger and sent each URL to whichever application owned it, serving
 * React for a migrated row and 302-redirecting to the `#!/` form otherwise.
 * The redirect existed because AngularJS expressed every state as a FRAGMENT
 * under `/`, and a fragment is never sent to a server — so an unmigrated route
 * could not be proxied by path, only redirected to.
 *
 * Increment 6 moved the last two rows. There is no second application to route
 * to, so the legacy legs are gone: no `proxy-to-legacy`, no
 * `redirect-to-legacy-hash`. What remains is an ordinary SPA dev server with
 * an API proxy.
 *
 * Unknown paths now go to REACT rather than to the legacy server. The router's
 * catch-all reproduces `$urlRouterProvider.otherwise('/login')`, so the
 * observable outcome — an unknown address lands on the login screen — is
 * unchanged from the baseline.
 */
import { SHELL_HEALTH_PATH } from './route-ledger';

/** Vite's own module graph and dev assets. Never proxied. */
export const VITE_INTERNAL_PREFIXES: readonly string[] = [
  '/@',
  '/src/',
  '/node_modules/',
  '/__vite',
  '/favicon.ico',
];

export type FrontDoorDecision =
  /** Vite serves the React document. */
  | { readonly kind: 'react' }
  /** Hand to the proxy, which forwards to the mock API. */
  | { readonly kind: 'proxy-to-api' }
  /** Vite's own asset — leave it entirely alone. */
  | { readonly kind: 'vite-internal' };

export function pathnameOf(url: string | undefined): string {
  return (url ?? '/').split('?')[0]?.split('#')[0] ?? '/';
}

export function isViteInternal(pathname: string): boolean {
  return VITE_INTERNAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * The whole front door, as one pure function.
 *
 * The ordering still matters and is still asserted by the tests:
 *   1. Vite internals win over everything, or the dev server cannot boot.
 *   2. The API prefix is proxied to the mock API — the ONE thing this file
 *      still routes elsewhere, and the seam that survived the migration
 *      untouched.
 *   3. Everything else is React's, including `/` and every unknown path.
 */
export function decide(url: string | undefined): FrontDoorDecision {
  const pathname = pathnameOf(url);

  if (isViteInternal(pathname)) return { kind: 'vite-internal' };
  if (pathname === '/api' || pathname.startsWith('/api/')) return { kind: 'proxy-to-api' };
  if (pathname === SHELL_HEALTH_PATH) return { kind: 'react' };

  return { kind: 'react' };
}
