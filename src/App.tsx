/**
 * THE REACT ROUTE TREE — mirrors all seven UI-Router states from
 * `app/app.routes.js`.
 *
 * ADR-012: react-router 8 in DECLARATIVE mode (<BrowserRouter> + <Routes>),
 * on REAL PATHS. Not Data mode (data fetching belongs to the one API client,
 * not to loaders) and not Framework mode (its file-system conventions would
 * take ownership of the route ledger, which plan §1.3 needs to stay explicit
 * data).
 *
 * Real paths are structural, not cosmetic: the front door can only route on
 * the PATH, because the fragment (`#!/flights`) is never sent to the server.
 * AngularJS expresses all 7 states as fragments under the single path `/`, so
 * hash-shaped React routes would make route ownership inexpressible and the
 * whole plan unbuildable (plan §1.2).
 *
 * `requireAuth` per route is copied from the ledger, which copied it from
 * `app/app.routes.js`'s `data: { requireAuth: true }`.
 */
import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { RootLayout } from './routes/root-layout';
import { RequireAuth } from './components/require-auth';
import { Login } from './routes/login';
import { PortalRoot } from './routes/portal-root';
import { Dashboard } from './routes/dashboard';
import { Flights } from './routes/flights';
import { Hotels } from './routes/hotels';
import { Itinerary } from './routes/itinerary';
import { TravelRequest } from './routes/travel-request';
import { Expenses } from './routes/expenses';
import { ShellHealth } from './routes/shell-health';
import { SHELL_HEALTH_PATH } from './lib/route-ledger';

/** The route tree, without a Router — so tests can supply their own. */
export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/*
          `/` — the portal root. ADR-012 §3: a legacy hash address such as
          `/#!/flights` transmits `GET /`, so this is where every one of them
          lands. Login for a stranger, dashboard for a signed-in user. Rendered,
          not redirected, so the fragment survives in the address bar exactly as
          the ADR describes.
        */}
        <Route index element={<PortalRoot />} />

        {/* login — requireAuth: false (app.routes.js:13-26) */}
        <Route path="/login" element={<Login />} />

        {/* The shell's own health route. Not a product route. */}
        <Route path={SHELL_HEALTH_PATH} element={<ShellHealth />} />

        {/* The six guarded states — data: { requireAuth: true } */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/flights"
          element={
            <RequireAuth>
              <Flights />
            </RequireAuth>
          }
        />
        <Route
          path="/hotels"
          element={
            <RequireAuth>
              <Hotels />
            </RequireAuth>
          }
        />
        <Route
          path="/itinerary"
          element={
            <RequireAuth>
              <Itinerary />
            </RequireAuth>
          }
        />
        <Route
          path="/travel-request"
          element={
            <RequireAuth>
              <TravelRequest />
            </RequireAuth>
          }
        />
        <Route
          path="/expenses"
          element={
            <RequireAuth>
              <Expenses />
            </RequireAuth>
          }
        />

        {/*
          `$urlRouterProvider.otherwise('/login')` — app/app.routes.js:10.
          An unknown address falls back to the login screen, which
          `authentication.feature:72` pins as existing behaviour.
        */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  );
}

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
