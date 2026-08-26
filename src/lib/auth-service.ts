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
import { request } from './api-client';
import { authStore } from '../stores/auth-store';
import { LoginResponseSchema, type LoginResponse } from '../types/api';

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
 * Port of `auth.service.js:32-36`. Issues no HTTP request, exactly as the
 * legacy version does not.
 *
 * NOTE: this has NO CALLER in Increment 0, and that is deliberate. The legacy
 * `logout()` also has no callers (FRD-authentication Known Limitation 2) and
 * no screen offers a sign-out control. Plan §4.2 is explicit that the React
 * chrome "must carry no sign-out control" before Inc-6, because sign-out is
 * net-new behaviour that supersedes all six rows of
 * `authentication.feature:124`.
 */
export function logout(): void {
  authStore.getState().clearSession(); // :33 + :34 + :35
}
