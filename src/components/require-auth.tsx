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
 * DEFECT PRESERVED: the predicate tests token PRESENCE, not validity, so a
 * planted junk token opens every screen — FRD-authentication Known Limitation
 * 8, superseded in Inc-6 by Q-8 / ADR-010. Do not "fix" this here.
 */
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../stores/auth-store';

export interface RequireAuthProps {
  readonly children: ReactElement;
}

export function RequireAuth({ children }: RequireAuthProps): ReactElement {
  // Subscribing through the store keeps the guard reactive: clearing the
  // session (e.g. from the API client's 401 path) re-evaluates it.
  const authenticated = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
