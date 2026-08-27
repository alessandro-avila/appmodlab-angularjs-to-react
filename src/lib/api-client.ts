/**
 * API CLIENT — replaces Restangular and the two hardcoded URLs.
 *
 * It is the ONE place a payload enters the client (tech-stack.md §5), and it
 * owns four things, per increment plan §13 item 4 and ADR-011 §4:
 *
 *   1. ONE base URL, from the environment    (finding A-5: app/app.js:14 and
 *                                             auth.service.js:18 hold literals)
 *   2. ONE Authorization header              (replaces the Restangular
 *                                             interceptor at app/app.js:20-28)
 *   3. ONE error policy                      (finding P-8: across the 5 legacy
 *                                             services `.then` appears 9 times
 *                                             and `.catch` ZERO times)
 *   4. RUNTIME RESPONSE VALIDATION           (finding P-7)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY (4) EXISTS AND IS NOT REDUNDANT WITH TYPESCRIPT
 * ─────────────────────────────────────────────────────────────────────────
 * Types are erased at runtime. P-7 is the proof: `/api/hotels/:id/rooms`
 * returns five objects with NO `id` field, while the legacy template repeats
 * `track by room.id`. A generated type declaring `id: string` compiles clean
 * and makes the compiler agree with the bug. The server is JavaScript and
 * stays JavaScript (ADR-005), so no compiler checks what it actually sends.
 *
 * Typing and validation are two mechanisms. This is the second one.
 */
import type { z } from 'zod';
import { apiBaseUrl } from './config';
import { authorizationHeader, handleUnauthorized } from '../stores/auth-store';
import { notify } from '../stores/notification-store';
import { ApiErrorSchema } from '../types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** A response that did not match its contract. This is the P-7 guard. */
export class ContractViolationError extends Error {
  readonly issues: readonly string[];
  constructor(path: string, issues: readonly string[]) {
    super(`Response from ${path} did not match its contract: ${issues.join('; ')}`);
    this.name = 'ContractViolationError';
    this.issues = issues;
  }
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  /** Login must not send an Authorization header — there is no token yet. */
  readonly anonymous?: boolean;
  readonly signal?: AbortSignal;
}

/** Injectable so tests can drive the client without a live server. */
export interface ApiClientDeps {
  readonly fetch: typeof globalThis.fetch;
  readonly baseUrl: () => string;
  readonly onUnauthorized: () => void;
  /** ADR-018 — the session-expiry policy. Authenticated 401s only. */
  readonly onSessionRejected: () => void;
}

const defaultDeps: ApiClientDeps = {
  fetch: (...args) => globalThis.fetch(...args),
  baseUrl: apiBaseUrl,
  onUnauthorized: handleUnauthorized,
  onSessionRejected: () => {
    notify('Your session has expired. Please sign in again.', 'error');
  },
};

/**
 * Performs a request and validates the response against `schema`.
 *
 * Every external call has error handling — there is no path out of this
 * function that returns unvalidated data or swallows a failure (P-8).
 */
export async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  options: RequestOptions = {},
  deps: ApiClientDeps = defaultDeps,
): Promise<z.infer<S>> {
  const { method = 'GET', body, anonymous = false, signal } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!anonymous) Object.assign(headers, authorizationHeader());

  const url = `${deps.baseUrl()}${path}`;

  let response: Response;
  try {
    response = await deps.fetch(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    // Network-level failure: DNS, refused connection, CORS, abort.
    throw new ApiError(`Network request to ${path} failed`, 0, cause);
  }

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // The 401 path (plan §4.2). Clearing the session is the MECHANISM; ADR-018
    // decided the POLICY in Increment 3 — a rejected session says so, and the
    // reactive route guard returns the traveller to the login screen.
    //
    // Guarded on `anonymous` because a 401 from the login endpoint means "wrong
    // password", not "your session expired". Login must keep its own message.
    if (response.status === 401) {
      deps.onUnauthorized();
      if (!anonymous) deps.onSessionRejected();
    }
    const parsed = ApiErrorSchema.safeParse(raw);
    const message = parsed.success ? parsed.data.error : `Request to ${path} failed`;
    throw new ApiError(message, response.status, raw);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ContractViolationError(
      path,
      result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  return result.data;
}

export const apiClient = { request };
