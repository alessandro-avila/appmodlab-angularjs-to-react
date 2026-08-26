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

const GUARDED = ['/dashboard', '/flights', '/hotels', '/itinerary', '/travel-request', '/expenses'];

describe('router guard — a stranger is sent to login (app/app.js:32-37)', () => {
  for (const path of GUARDED) {
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
    it(`renders ${path} with a token present`, () => {
      authStore.getState().setSession('jwt-abc', SARAH);
      renderAt(path);
      expect(screen.getByTestId('placeholder')).toBeInTheDocument();
      expect(screen.getByTestId('placeholder')).toHaveAttribute('data-route', path);
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

  it('the health route reports every ledger row as AngularJS-owned', () => {
    renderAt('/__shell');
    for (const state of ['login', 'dashboard', 'flights', 'hotels', 'itinerary', 'travelRequest', 'expenses']) {
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
