/**
 * AUTH SERVICE — the login/logout actions of `app/services/auth.service.js`.
 *
 * Split from `stores/auth-store.ts` deliberately to avoid an import cycle:
 * the API client reads the token from the store, so the store must not import
 * the client. This module composes the two.
 *
 *   auth-store.ts  (state + localStorage)      <- imported by api-client.ts
 *   api-client.ts  (fetch + validation)        <- imported by auth-service.ts
 *   auth-service.ts (login / logout)
 */
import { z } from 'zod';
import { request } from './api-client';
import { authStore } from '../stores/auth-store';
import { LoginResponseSchema, UserSchema, type LoginResponse } from '../types/api';

/**
 * Port of `auth.service.js:17-27`.
 *
 * Legacy, verbatim:
 *     $http.post('http://localhost:3000/api/auth/login', { email, password })
 *       .then(function (response) {
 *         localStorage.setItem('authToken', response.data.token);   // :22
 *         $rootScope.currentUser = response.data.user;              // :23
 *         $rootScope.$broadcast('auth:login', response.data.user);  // :24
 *         return response.data;                                     // :25
 *       });
 *
 * Preserved: the same endpoint, the same request body, the same token key, the
 * same ordering (persist, then set user), and the same return value.
 *
 * Two differences, both required by decisions already taken:
 *   - The URL comes from the environment, not a literal (finding A-5).
 *   - A rejection is no longer unhandled (finding P-8). The legacy chain has no
 *     rejection handler at all, so a failed login rejects into nothing. Plan
 *     §4.2 requires the client to have "one error policy"; the caller decides
 *     what to show. This is unobservable in Inc-0 because React owns no route.
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await request(
    '/auth/login',
    LoginResponseSchema,
    { method: 'POST', body: { email, password }, anonymous: true },
  );
  authStore.getState().setSession(data.token, data.user); // :22 + :23 + :24
  return data; // :25
}

/**
 * Port of `auth.service.js:32-36`, plus the server call the legacy version
 * never made.
 *
 * SIGN-OUT IS NET-NEW (ADR-010). The legacy `logout()` had no caller, no
 * control on any of the six screens, and `$rootScope` carried zero
 * `auth:logout` listeners at all times — the event was dead in both
 * directions. Increment 6 gives it a control in the navbar.
 *
 * `POST /api/auth/logout` has always existed server-side and always answered
 * 200, even without a session (`authentication.feature` pins that). It is
 * called for completeness and its outcome is deliberately ignored: the session
 * is a client-side artefact, so sign-out must succeed even if the network
 * does not. Clearing first would risk the request going out unauthenticated;
 * clearing in `finally` keeps the order honest and the result unconditional.
 */
export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', z.unknown(), { method: 'POST', body: {} });
  } catch {
    // Sign-out is local. A server that cannot be reached does not get to keep
    // the traveller signed in.
  } finally {
    authStore.getState().clearSession(); // :33 + :34 + :35
  }
}

/**
 * THE C-1 REPAIR — identity restoration on boot (ADR-003 constraint C-1,
 * authorised by ADR-010).
 *
 * The legacy portal nulled `$rootScope.currentUser` on every boot
 * (`app/app.js:40`) while the token survived in `localStorage`, leaving an
 * authenticated-but-anonymous session that degraded to hardcoded values —
 * "Demo User" on an expense report, a blank traveller line on a request.
 * `GET /api/auth/me` answered exactly the question that was never asked.
 *
 * This also converts the route guard from a PRESENCE check into a VALIDITY
 * check without touching the guard: an unreadable or expired token gets a 401
 * here, the session is cleared, and `isAuthenticated()` — the same
 * `!!localStorage.getItem('authToken')` it has always been — then answers
 * false on its own. The predicate did not change; the facts it reads did.
 *
 * A 401 needs no handling here: `request()` already clears the session and
 * raises the "session has expired" notice through the client's one error
 * policy (ADR-018), which is exactly the behaviour a rejected data call gets.
 * Repeating it would raise the notice twice. Any OTHER failure deliberately
 * leaves the token alone — a network blip is not proof that the session is
 * bad, and silently signing someone out on a flaky connection would be worse
 * than the defect this repairs.
 */
export async function restoreSession(): Promise<void> {
  const store = authStore.getState();
  if (!store.isAuthenticated() || store.getCurrentUser()) {
    store.setRestoring(false);
    return;
  }
  try {
    const user = await request('/auth/me', UserSchema, { method: 'GET' });
    authStore.getState().setUser(user);
  } catch {
    // Handled by the client's error policy, or deliberately survivable.
  } finally {
    authStore.getState().setRestoring(false);
  }
}
