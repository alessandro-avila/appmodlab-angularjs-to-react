/**
 * API CLIENT — env base URL, auth header, error policy, response validation.
 *
 * The P-7 case is the important one: it proves that typing alone would NOT
 * have caught the rooms defect, and that the schema does.
 */
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { request, ApiError, ContractViolationError, type ApiClientDeps } from './api-client';
import { authStore } from '../stores/auth-store';
import type { User } from '../types/api';

const SARAH: User = {
  id: 1,
  name: 'Sarah Johnson',
  email: 'demo@globaltravel.com',
  department: 'Engineering',
  role: 'employee',
};

function depsReturning(body: unknown, status = 200): { deps: ApiClientDeps; calls: RequestInit[]; urls: string[] } {
  const calls: RequestInit[] = [];
  const urls: string[] = [];
  const deps: ApiClientDeps = {
    fetch: ((url: string, init: RequestInit) => {
      urls.push(String(url));
      calls.push(init);
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      } as Response);
    }) as unknown as typeof globalThis.fetch,
    baseUrl: () => '/api',
    onUnauthorized: vi.fn(),
    onSessionRejected: vi.fn(),
  };
  return { deps, calls, urls };
}

describe('api client — the base URL comes from config, never a literal', () => {
  it('prefixes the configured base URL', async () => {
    const { deps, urls } = depsReturning(SARAH);
    await request('/auth/me', z.unknown(), {}, deps);
    expect(urls[0]).toBe('/api/auth/me');
  });
});

describe('api client — the Authorization header (replaces app/app.js:20-28)', () => {
  /** Reads the header off the recorded call, failing loudly if none was made. */
  function headerOf(calls: RequestInit[]): string | undefined {
    const first = calls[0];
    expect(first, 'no request was recorded').toBeDefined();
    const headers = first?.headers as Record<string, string> | undefined;
    return headers?.['Authorization'];
  }

  it('omits the header with no session', async () => {
    const { deps, calls } = depsReturning(SARAH);
    await request('/auth/me', z.unknown(), {}, deps);
    expect(headerOf(calls)).toBeUndefined();
  });

  it('sends "Bearer <token>" when a session exists', async () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    const { deps, calls } = depsReturning(SARAH);
    await request('/auth/me', z.unknown(), {}, deps);
    expect(headerOf(calls)).toBe('Bearer jwt-abc');
  });

  it('omits the header for an anonymous request, as login must', async () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    const { deps, calls } = depsReturning({ token: 't', user: SARAH });
    await request('/auth/login', z.unknown(), { method: 'POST', anonymous: true }, deps);
    expect(headerOf(calls)).toBeUndefined();
  });
});

describe('api client — one error policy (closes finding P-8)', () => {
  it('throws ApiError on a non-2xx, carrying the server message', async () => {
    // Legacy: across the 5 services `.then` appears 9 times and `.catch` ZERO
    // times, so every failure is unhandled. Here every failure is an exception.
    const { deps } = depsReturning({ error: 'Invalid credentials' }, 401);
    await expect(request('/auth/login', z.unknown(), {}, deps)).rejects.toThrow(ApiError);
    await expect(request('/auth/login', z.unknown(), {}, deps)).rejects.toThrow(
      'Invalid credentials',
    );
  });

  it('calls the 401 handler so the session is cleared', async () => {
    const { deps } = depsReturning({ error: 'Unauthorized' }, 401);
    await expect(request('/trips', z.unknown(), {}, deps)).rejects.toThrow(ApiError);
    expect(deps.onUnauthorized).toHaveBeenCalledOnce();
  });

  it('does NOT call the 401 handler on other failures', async () => {
    const { deps } = depsReturning({ error: 'Not found' }, 404);
    await expect(request('/trips/nope', z.unknown(), {}, deps)).rejects.toThrow(ApiError);
    expect(deps.onUnauthorized).not.toHaveBeenCalled();
  });

  // ADR-018 — the session-expiry policy, decided in Increment 3.
  it('reports a rejected session on an authenticated 401', async () => {
    const { deps } = depsReturning({ error: 'Invalid token' }, 401);
    await expect(request('/trips', z.unknown(), {}, deps)).rejects.toThrow(ApiError);
    expect(deps.onSessionRejected).toHaveBeenCalledOnce();
  });

  it('stays SILENT on an anonymous 401 — a bad login is not an expired session', async () => {
    const { deps } = depsReturning({ error: 'Invalid credentials' }, 401);
    await expect(
      request('/auth/login', z.unknown(), { method: 'POST', anonymous: true }, deps),
    ).rejects.toThrow(ApiError);
    expect(deps.onSessionRejected).not.toHaveBeenCalled();
  });

  it('does not report a rejected session on a non-401 failure', async () => {
    const { deps } = depsReturning({ error: 'Boom' }, 500);
    await expect(request('/trips', z.unknown(), {}, deps)).rejects.toThrow(ApiError);
    expect(deps.onSessionRejected).not.toHaveBeenCalled();
  });

  it('wraps a network-level failure rather than letting it escape raw', async () => {
    const deps: ApiClientDeps = {
      fetch: (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof globalThis.fetch,
      baseUrl: () => '/api',
      onUnauthorized: vi.fn(),
      onSessionRejected: vi.fn(),
    };
    await expect(request('/trips', z.unknown(), {}, deps)).rejects.toThrow(ApiError);
  });
});

describe('api client — runtime response validation (ADR-011 §4, finding P-7)', () => {
  const RoomSchema = z.object({
    type: z.string(),
    price: z.number(),
    available: z.number(),
    beds: z.string(),
    maxGuests: z.number(),
  });

  /** The real payload shape of GET /api/hotels/:id/rooms — note: NO `id`. */
  const REAL_ROOMS = [
    { type: 'Standard', price: 180, available: 4, beds: '1 Queen', maxGuests: 2 },
    { type: 'Deluxe', price: 260, available: 2, beds: '1 King', maxGuests: 3 },
  ];

  it('accepts a payload that matches its contract', async () => {
    const { deps } = depsReturning(REAL_ROOMS);
    const rooms = await request('/hotels/h-1/rooms', RoomSchema.array(), {}, deps);
    expect(rooms).toHaveLength(2);
  });

  it('REJECTS the wrong contract at the boundary, naming the field', async () => {
    // This is the P-7 guard. A generated type declaring `id: string` would
    // compile clean and make the compiler agree with the bug; the schema is
    // what disagrees. The legacy template's `track by room.id` produced a
    // duplicate-key set of undefineds and rendered nothing.
    const WithId = RoomSchema.extend({ id: z.string() });
    const { deps } = depsReturning(REAL_ROOMS);

    await expect(request('/hotels/h-1/rooms', WithId.array(), {}, deps)).rejects.toThrow(
      ContractViolationError,
    );

    try {
      await request('/hotels/h-1/rooms', WithId.array(), {}, deps);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ContractViolationError);
      expect((error as ContractViolationError).issues.join(' ')).toMatch(/id/);
    }
  });

  it('rejects a wrong primitive type', async () => {
    const { deps } = depsReturning([{ ...REAL_ROOMS[0], price: '180' }]);
    await expect(request('/hotels/h-1/rooms', RoomSchema.array(), {}, deps)).rejects.toThrow(
      ContractViolationError,
    );
  });
});
