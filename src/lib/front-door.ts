/**
 * FRONT-DOOR DECISION LOGIC — extracted from `vite.config.ts` so it can be
 * unit-tested.
 *
 * The config file wires this into Vite middleware; this module holds the
 * actual rule. Increments 1–5 depend on the rule being right, so it is pinned
 * by tests rather than by reading the config.
 */
import { ROUTE_LEDGER, SHELL_HEALTH_PATH, type LedgerRow } from './route-ledger';

/** Vite's own module graph and dev assets. Never proxied, never redirected. */
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
  /** Redirect to the legacy hash URL on this same origin. */
  | { readonly kind: 'redirect-to-legacy-hash'; readonly location: string }
  /** Hand to the proxy, which forwards to the legacy static server. */
  | { readonly kind: 'proxy-to-legacy' }
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

export function ledgerRowFor(
  pathname: string,
  ledger: readonly LedgerRow[] = ROUTE_LEDGER,
): LedgerRow | undefined {
  return ledger.find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`));
}

/**
 * The whole front door, as one pure function.
 *
 * The ordering matters and is asserted by the tests:
 *   1. Vite internals win over everything, or the dev server cannot boot.
 *   2. The API prefix is shared by both applications.
 *   3. The shell health route is React's.
 *   4. A ledger row goes to its owner — React directly, AngularJS via a
 *      redirect to the hash form, because the legacy server has no such path.
 *   5. Anything else is the legacy app's (its root document, its #!/ URLs
 *      which arrive as '/', and its static assets).
 */
export function decide(
  url: string | undefined,
  ledger: readonly LedgerRow[] = ROUTE_LEDGER,
): FrontDoorDecision {
  const pathname = pathnameOf(url);

  if (isViteInternal(pathname)) return { kind: 'vite-internal' };
  if (pathname === '/api' || pathname.startsWith('/api/')) return { kind: 'proxy-to-api' };
  if (pathname === SHELL_HEALTH_PATH) return { kind: 'react' };

  const row = ledgerRowFor(pathname, ledger);
  if (row === undefined) return { kind: 'proxy-to-legacy' };
  if (row.owner === 'react') return { kind: 'react' };

  return { kind: 'redirect-to-legacy-hash', location: `/${row.legacyHash}` };
}
