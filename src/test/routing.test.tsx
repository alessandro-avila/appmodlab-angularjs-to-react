/**
 * ROUTE TREE + GUARD — the React port of `$stateChangeStart` (app/app.js:32-37)
 * and `$urlRouterProvider.otherwise('/login')` (app/app.routes.js:10).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import { AppRoutes } from '../App';
import { authStore } from '../stores/auth-store';
import type { User } from '../types/api';

const SARAH: User = {
  id: 1,
  name: 'Sarah Johnson',
  email: 'demo@globaltravel.com',
  department: 'Engineering',
  role: 'employee',
};

function renderAt(path: string): ReactElement {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  ) as unknown as ReactElement;
}

const GUARDED = ['/dashboard', '/expenses'];
/** Migrated routes render a real screen rather than a placeholder. */
const GUARDED_MIGRATED = [
  { path: '/flights', testId: 'flight-search' },
  { path: '/hotels', testId: 'hotel-booking' },
  { path: '/itinerary', testId: 'itinerary' },
  { path: '/travel-request', testId: 'travel-request' },
];

describe('router guard — a stranger is sent to login (app/app.js:32-37)', () => {
  for (const path of [...GUARDED, ...GUARDED_MIGRATED.map((r) => r.path)]) {
    it(`redirects ${path} to the login screen with no token`, () => {
      renderAt(path);
      expect(screen.getByTestId('login')).toBeInTheDocument();
      expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument();
    });
  }

  it('does NOT guard /login itself — it has no data.requireAuth', () => {
    renderAt('/login');
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });
});

describe('router guard — a signed-in user reaches every guarded route', () => {
  for (const path of GUARDED) {
    it(`renders the ${path} placeholder with a token present`, () => {
      authStore.getState().setSession('jwt-abc', SARAH);
      renderAt(path);
      expect(screen.getByTestId('placeholder')).toBeInTheDocument();
      expect(screen.getByTestId('placeholder')).toHaveAttribute('data-route', path);
    });
  }

  for (const { path, testId } of GUARDED_MIGRATED) {
    it(`renders the MIGRATED ${path} screen with a token present`, () => {
      // Increment 1 replaced this placeholder with the real React screen.
      authStore.getState().setSession('jwt-abc', SARAH);
      renderAt(path);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument();
    });
  }

  it('DEFECT PRESERVED: a junk token satisfies the guard', () => {
    // The legacy guard calls isAuthenticated(), which is presence-only. The
    // baseline proved "a planted token of not-a-real-jwt opens /expenses and
    // /itinerary in full". Q-8 / ADR-010 fix this in Inc-6.
    window.localStorage.setItem('authToken', 'not-a-real-jwt');
    renderAt('/expenses');
    expect(screen.getByTestId('placeholder')).toHaveAttribute('data-route', '/expenses');
  });
});

describe('route tree — mirrors all seven UI-Router states', () => {
  it('serves the login screen as a real path, not a hash', () => {
    renderAt('/login');
    expect(screen.getByRole('button', { name: 'Enter Portal' })).toBeInTheDocument();
  });

  it('falls back to login for an unknown address (otherwise("/login"))', () => {
    // authentication.feature:72 — "An unknown address falls back to the login screen".
    renderAt('/no-such-route');
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('serves the shell health route without a token — it is not a product route', () => {
    renderAt('/__shell');
    expect(screen.getByTestId('shell-health')).toBeInTheDocument();
    expect(screen.getByTestId('shell-status')).toHaveTextContent('ok');
  });

  it('the health route reports each ledger row against its current owner', () => {
    renderAt('/__shell');
    // Increments 1, 2, 3 and 4 have each moved one row.
    expect(screen.getByTestId('ledger-owner-flights')).toHaveTextContent('react');
    expect(screen.getByTestId('ledger-owner-hotels')).toHaveTextContent('react');
    expect(screen.getByTestId('ledger-owner-itinerary')).toHaveTextContent('react');
    expect(screen.getByTestId('ledger-owner-travelRequest')).toHaveTextContent('react');
    for (const state of ['login', 'dashboard', 'expenses']) {
      expect(screen.getByTestId(`ledger-owner-${state}`)).toHaveTextContent('angularjs');
    }
  });
});

describe('shell chrome — carries no sign-out control before Inc-6', () => {
  it('offers no sign-out affordance anywhere', () => {
    // Plan §4.2: shipping sign-out early turns authentication.feature:124's
    // six per-area rows red one increment at a time. The baseline proved no
    // legacy screen contains "log out" or "sign out".
    authStore.getState().setSession('jwt-abc', SARAH);
    renderAt('/dashboard');
    expect(screen.queryByText(/sign\s*out/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/log\s*out/i)).not.toBeInTheDocument();
  });
});
