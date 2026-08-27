/**
 * Tests for the minimal query cache (ADR-021) — the `itinerary:refresh`
 * replacement.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQuery } from './query';

beforeEach(() => {
  const w = globalThis as unknown as Record<string, unknown>;
  w['__flightSearch'] = { scope: null, events: {} };
});

function seamEvents(): Record<string, number> {
  const w = globalThis as unknown as Record<string, { events: Record<string, number> }>;
  return w['__flightSearch']?.events ?? {};
}

describe('createQuery — caching an idempotent resource', () => {
  it('fetches once and serves the cached value afterwards', async () => {
    const fetcher = vi.fn(() => Promise.resolve(['a']));
    const q = createQuery(fetcher);

    expect(await q.read()).toEqual(['a']);
    expect(await q.read()).toEqual(['a']);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('collapses concurrent reads onto a single request', async () => {
    let resolve: ((v: string[]) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<string[]>((r) => {
          resolve = r;
        }),
    );
    const q = createQuery(fetcher);

    const a = q.read();
    const b = q.read();
    resolve?.(['x']);

    expect(await a).toEqual(['x']);
    expect(await b).toEqual(['x']);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('refetches after invalidation', async () => {
    let n = 0;
    const fetcher = vi.fn(() => Promise.resolve([`call-${(n += 1)}`]));
    const q = createQuery(fetcher);

    expect(await q.read()).toEqual(['call-1']);
    q.invalidate();
    expect(await q.read()).toEqual(['call-2']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('drops the cached value on invalidation so nothing stale can be peeked', async () => {
    const q = createQuery(() => Promise.resolve(['a']));
    await q.read();
    expect(q.peek()).toEqual(['a']);
    q.invalidate();
    expect(q.peek()).toBeUndefined();
  });
});

describe('createQuery — invalidation replaces the broadcast', () => {
  it('notifies every live subscriber', () => {
    const q = createQuery(() => Promise.resolve(1));
    const first = vi.fn();
    const second = vi.fn();
    q.subscribe(first);
    q.subscribe(second);

    q.invalidate();

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('stops notifying after unsubscribe — a route that unmounts is not called', () => {
    const q = createQuery(() => Promise.resolve(1));
    const listener = vi.fn();
    const unsubscribe = q.subscribe(listener);

    unsubscribe();
    q.invalidate();

    expect(listener).not.toHaveBeenCalled();
  });

  it('announces on the seam so flight-search.feature:231 still observes a refresh', () => {
    const q = createQuery(() => Promise.resolve(1), { announceAs: 'itinerary:refresh' });

    q.invalidate();
    q.invalidate();

    expect(seamEvents()['itinerary:refresh']).toBe(2);
  });

  it('announces nothing when no name is configured', () => {
    const q = createQuery(() => Promise.resolve(1));
    q.invalidate();
    expect(Object.keys(seamEvents())).toHaveLength(0);
  });
});
