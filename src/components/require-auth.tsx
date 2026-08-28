/**
 * ROUTE GUARD — the React port of the `$stateChangeStart` guard at
 * `app/app.js:32-37`.
 *
 * Legacy, verbatim:
 *     $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
 *       if (toState.data && toState.data.requireAuth && !AuthService.isAuthenticated()) {
 *         event.preventDefault();
 *         $state.go('login');
 *       }
 *     });
 *
 * The mapping:
 *   - `toState.data.requireAuth`  -> the `requireAuth` column of the route ledger,
 *                                    copied from `app/app.routes.js`
 *   - `AuthService.isAuthenticated()` -> `authStore.isAuthenticated()`, which is
 *                                    the SAME presence-only predicate
 *   - `event.preventDefault(); $state.go('login')` -> <Navigate to="/login" replace />
 *
 * `replace` matters: UI-Router's preventDefault means the blocked URL never
 * enters history, so the user cannot press Back into it. A push would leave a
 * dead entry the legacy app does not have.
 *
 * THE PREDICATE IS UNCHANGED IN INC-6, AND THAT IS THE POINT.
 *
 * Through Increments 0-5 this tested token PRESENCE, not validity, so a
 * planted junk token opened every screen (FRD-authentication Known Limitation
 * 8). Q-8 / ADR-010 scheduled the repair for Inc-6 — and the repair is NOT a
 * branch added here. `restoreSession()` asks `GET /api/auth/me` on boot, and
 * an unreadable or expired token is cleared before this guard ever runs. The
 * same `!!localStorage.getItem('authToken')` then answers false on its own.
 * The guard became a validity check by gaining a FACT, not a condition.
 *
 * `restoring` exists so the guard does not bounce a signed-in traveller to
 * login in the moment between boot and the identity answer. A present token
 * means "probably authenticated, ask again shortly" — which is why a reload
 * leaves the traveller where they were.
 */
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../stores/auth-store';

export interface RequireAuthProps {
  readonly children: ReactElement;
}

export function RequireAuth({ children }: RequireAuthProps): ReactElement | null {
  // Subscribing through the store keeps the guard reactive: clearing the
  // session (e.g. from the API client's 401 path) re-evaluates it.
  const authenticated = useAuthStore((s) => s.isAuthenticated());
  const restoring = useAuthStore((s) => s.restoring);
  const location = useLocation();

  if (authenticated && restoring) return null;

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
