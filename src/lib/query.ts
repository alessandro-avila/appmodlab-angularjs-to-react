/**
 * A MINIMAL QUERY CACHE — for idempotent resources only.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS AND WHY IT IS NOT A DATA-CACHE LIBRARY
 * ─────────────────────────────────────────────────────────────────────────
 * `specs/tech-stack.md:122` specifies AGAINST TanStack Query, SWR, "any data
 * cache", citing NFR-F005-003 and NFR-F007-004:
 *
 *   "Every submission issues a fresh request; nothing is cached. Because the
 *    server generates hotels per call, two identical searches return different
 *    result sets."
 *
 * That rationale is about SEARCH endpoints, which are non-idempotent: caching
 * them would be observably wrong. It is not about `GET /api/trips`, which
 * returns a stable server-owned resource.
 *
 * So this module is deliberately narrow. It caches ONE kind of thing — an
 * idempotent GET — and it is used by exactly one caller, the itinerary. The
 * flight and hotel searches keep going straight through `api-client`, uncached,
 * and both NFRs continue to hold. See ADR-021.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IT REPLACES
 * ─────────────────────────────────────────────────────────────────────────
 * `$rootScope.$broadcast('itinerary:refresh')` — broadcast from two producers
 * (`flight-search.controller.js:221`, `hotel-booking.controller.js:238`) and
 * subscribed by a consumer that was never alive at the same time
 * (`itinerary.controller.js:223`). ADR-013 mapped it to a store concern; this
 * increment replaces it with invalidation instead, so the dependency is a
 * function call a reader can follow rather than a string two files apart.
 */
import { announce } from './test-seam';

export interface Query<T> {
  /** Cached value if fresh, otherwise a fresh fetch. */
  read(): Promise<T>;
  /** Marks the cache stale and tells every live subscriber to reload. */
  invalidate(): void;
  /** Subscribe to invalidations. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Test/debug only — what is currently held, without fetching. */
  peek(): T | undefined;
}

export interface QueryOptions {
  /**
   * Announced on every invalidation, so the harness can observe that the
   * itinerary was asked to refresh — the behaviour
   * `flight-search.feature:231` pins. The legacy announced the same name
   * through `$rootScope`; only the mechanism underneath has changed.
   */
  readonly announceAs?: string;
}

export function createQuery<T>(
  fetcher: () => Promise<T>,
  options: QueryOptions = {},
): Query<T> {
  let cached: T | undefined;
  let inFlight: Promise<T> | undefined;
  let fresh = false;
  const listeners = new Set<() => void>();

  return {
    async read(): Promise<T> {
      if (fresh && cached !== undefined) return cached;
      // Collapse concurrent reads onto one request. Without this a route that
      // mounts twice in quick succession issues two identical GETs.
      inFlight ??= fetcher()
        .then((value) => {
          cached = value;
          fresh = true;
          return value;
        })
        .finally(() => {
          inFlight = undefined;
        });
      return inFlight;
    },

    invalidate(): void {
      fresh = false;
      cached = undefined;
      if (options.announceAs !== undefined) announce(options.announceAs);
      for (const listener of listeners) listener();
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    peek(): T | undefined {
      return cached;
    },
  };
}
