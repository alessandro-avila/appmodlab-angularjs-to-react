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

const GUARDED: string[] = [];
/** Every route now renders a real screen. No placeholders remain. */
const GUARDED_MIGRATED = [
  { path: '/dashboard', testId: 'dashboard' },
  { path: '/flights', testId: 'flight-search' },
  { path: '/hotels', testId: 'hotel-booking' },
  { path: '/itinerary', testId: 'itinerary' },
  { path: '/travel-request', testId: 'travel-request' },
  { path: '/expenses', testId: 'expenses' },
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

  it('THE DEFECT IS GONE: a junk token no longer satisfies the guard', () => {
    // Increments 0-5 pinned the opposite. The legacy guard called
    // isAuthenticated(), which is presence-only, and the baseline proved "a
    // planted token of not-a-real-jwt opens /expenses and /itinerary in full".
    //
    // Q-8 / ADR-010 fix it at the cutover, and the fix is NOT a new branch in
    // the guard — the predicate is unchanged. restoreSession() asks the server
    // who the bearer is, the 401 clears the session, and the same
    // `!!localStorage.getItem('authToken')` then answers false.
    //
    // Here the store is put in the state that call leaves behind: cleared, and
    // no longer restoring. The guard does the rest on its own.
    window.localStorage.setItem('authToken', 'not-a-real-jwt');
    authStore.getState().clearSession();
    renderAt('/dashboard');
    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('waits for the identity answer rather than bouncing a signed-in reload', () => {
    // C-1 repair: on a reload the token is present but the identity is not yet
    // known. Bouncing to login here would make every refresh look like a
    // sign-out, which is worse than the defect being repaired.
    window.localStorage.setItem('authToken', 'jwt-abc');
    authStore.setState({ user: null, restoring: true });
    renderAt('/dashboard');
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
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

  it('the health route reports every ledger row as React', () => {
    renderAt('/__shell');
    // Six increments each moved one or two rows. Nothing is left.
    for (const state of [
      'login',
      'dashboard',
      'flights',
      'hotels',
      'itinerary',
      'travelRequest',
      'expenses',
    ]) {
      expect(screen.getByTestId(`ledger-owner-${state}`)).toHaveTextContent('react');
    }
  });

  it('renders the portal root at "/" — login for a stranger (ADR-012)', () => {
    renderAt('/');
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('renders the portal root at "/" — the dashboard when signed in (ADR-012)', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    renderAt('/');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});

describe('shell chrome — sign-out ships in Inc-6', () => {
  it('offers a sign-out control when signed in', () => {
    // Net-new (ADR-010). It supersedes all six rows of the sign-out outline,
    // which passed unchanged through five increments because the React chrome
    // deliberately carried no such control either (plan §4.2).
    authStore.getState().setSession('jwt-abc', SARAH);
    renderAt('/dashboard');
    expect(screen.getByTestId('sign-out')).toBeInTheDocument();
  });

  it('shows the signed-in traveller by name', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    renderAt('/dashboard');
    expect(screen.getByTestId('nav-identity')).toHaveTextContent('Sarah Johnson');
  });

  it('offers NO sign-out control to a stranger', () => {
    // This is what keeps "the navigation bar offers no way to sign out"
    // PRESERVED for a signed-out visitor while the signed-in rows supersede.
    renderAt('/login');
    expect(screen.queryByTestId('sign-out')).not.toBeInTheDocument();
    expect(screen.queryByText(/sign\s*out/i)).not.toBeInTheDocument();
  });

  it('keeps the dashboard free of controls — sign-out lives in the navbar', () => {
    // Resolves the pending decision in plan §10.4: "The dashboard carries no
    // controls at all" PRESERVES because the control went to the navbar.
    authStore.getState().setSession('jwt-abc', SARAH);
    renderAt('/dashboard');
    const dashboard = screen.getByTestId('dashboard');
    expect(dashboard.querySelectorAll('button')).toHaveLength(0);
  });
});
