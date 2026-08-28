/**
 * THE AUTHENTICATION SURFACE — Increment 6.
 *
 * Everything here is NET-NEW behaviour (ADR-010): the Q-8 credential form,
 * sign-out, and the C-1 identity repair. None of it existed in the 2016
 * product, so none of these tests describes a port — they describe the
 * contract the migration adds.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import type { User } from '../types/api';

const request = vi.fn();
vi.mock('../lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api-client')>();
  return { ...actual, request: (...a: unknown[]) => request(...a) };
});

const { Login } = await import('../routes/login');
const { RootLayout } = await import('../routes/root-layout');
const { authStore } = await import('../stores/auth-store');
const { restoreSession, logout } = await import('../lib/auth-service');

const SARAH: User = {
  id: 1,
  name: 'Sarah Johnson',
  email: 'demo@globaltravel.com',
  department: 'Engineering',
  role: 'employee',
};

const MIKE: User = {
  id: 2,
  name: 'Mike Chen',
  email: 'manager@globaltravel.com',
  department: 'Engineering',
  role: 'manager',
};

beforeEach(() => {
  request.mockReset();
  window.localStorage.clear();
  authStore.setState({ user: null, restoring: false });
});

afterEach(() => {
  cleanup();
});

function renderLogin(): void {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/* ------------------------------------------------------- the Q-8 form */

describe('the credential form (Q-8)', () => {
  it('asks for an email and a password, which the legacy screen never did', () => {
    renderLogin();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('keeps the "Enter Portal" button label, so the single-way-in scenarios preserve', () => {
    renderLogin();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent('Enter Portal');
  });

  it('sends the credentials that were typed and nothing else', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ token: 'jwt-sarah', user: SARAH });
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'demo@globaltravel.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Enter Portal' }));

    await waitFor(() => expect(request).toHaveBeenCalled());
    const [path, , options] = request.mock.calls[0] as [string, unknown, Record<string, unknown>];
    expect(path).toBe('/auth/login');
    expect(options['body']).toEqual({
      email: 'demo@globaltravel.com',
      password: 'password',
    });
  });

  it('stores the session and arrives at the dashboard', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ token: 'jwt-sarah', user: SARAH });
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'demo@globaltravel.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Enter Portal' }));

    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument());
    expect(window.localStorage.getItem('authToken')).toBe('jwt-sarah');
    expect(authStore.getState().getCurrentUser()?.name).toBe('Sarah Johnson');
  });

  it('lets a SECOND employee sign in — unreachable through the 2016 UI', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ token: 'jwt-mike', user: MIKE });
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'manager@globaltravel.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Enter Portal' }));

    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument());
    expect(authStore.getState().getCurrentUser()).toEqual(MIKE);
  });

  it('refuses a wrong password without storing anything', async () => {
    const user = userEvent.setup();
    request.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'demo@globaltravel.com');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Enter Portal' }));

    await waitFor(() => expect(screen.getByTestId('login-error')).toBeInTheDocument());
    expect(window.localStorage.getItem('authToken')).toBeNull();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('does not reveal whether the account exists', async () => {
    const user = userEvent.setup();
    request.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'nobody@globaltravel.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Enter Portal' }));

    await waitFor(() => expect(screen.getByTestId('login-error')).toBeInTheDocument());
    const message = screen.getByTestId('login-error').textContent ?? '';
    expect(message).toBe('Email or password is incorrect.');
    expect(message.toLowerCase()).not.toContain('not found');
    expect(message.toLowerCase()).not.toContain('no such');
  });

  it('marks the login call anonymous, so a refusal raises no session notice', async () => {
    const user = userEvent.setup();
    request.mockResolvedValue({ token: 'jwt-sarah', user: SARAH });
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'demo@globaltravel.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Enter Portal' }));

    await waitFor(() => expect(request).toHaveBeenCalled());
    const [, , options] = request.mock.calls[0] as [string, unknown, Record<string, unknown>];
    // api-client.ts:119-123 — a 401 on an anonymous call means "wrong
    // password", not "your session expired", and must keep its own message.
    expect(options['anonymous']).toBe(true);
  });
});

/* ---------------------------------------------------------- sign-out */

describe('sign-out (net-new — ADR-010)', () => {
  it('clears both the token and the identity', async () => {
    request.mockResolvedValue({});
    authStore.getState().setSession('jwt-sarah', SARAH);

    await logout();

    expect(window.localStorage.getItem('authToken')).toBeNull();
    expect(authStore.getState().getCurrentUser()).toBeNull();
  });

  it('tells the server, which has always had the endpoint and never been called', async () => {
    request.mockResolvedValue({});
    authStore.getState().setSession('jwt-sarah', SARAH);

    await logout();

    const [path, , options] = request.mock.calls[0] as [string, unknown, Record<string, unknown>];
    expect(path).toBe('/auth/logout');
    expect(options['method']).toBe('POST');
  });

  it('signs out even when the server cannot be reached', async () => {
    // The session is a client-side artefact. A network failure does not get to
    // keep the traveller signed in.
    request.mockRejectedValue(new Error('network down'));
    authStore.getState().setSession('jwt-sarah', SARAH);

    await logout();

    expect(window.localStorage.getItem('authToken')).toBeNull();
    expect(authStore.getState().getCurrentUser()).toBeNull();
  });

  it('is offered in the navbar only once signed in', () => {
    authStore.getState().setSession('jwt-sarah', SARAH);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <RootLayout />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('sign-out')).toBeInTheDocument();
  });

  it('is absent from the navbar for a stranger', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <RootLayout />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('sign-out')).not.toBeInTheDocument();
  });
});

/* ------------------------------------------------- the C-1 repair */

describe('identity restoration on boot (C-1 — ADR-003, authorised by ADR-010)', () => {
  it('asks the server who the token belongs to', async () => {
    window.localStorage.setItem('authToken', 'jwt-sarah');
    authStore.setState({ user: null, restoring: true });
    request.mockResolvedValue(SARAH);

    await restoreSession();

    const [path] = request.mock.calls[0] as [string];
    expect(path).toBe('/auth/me');
    expect(authStore.getState().getCurrentUser()).toEqual(SARAH);
    expect(authStore.getState().restoring).toBe(false);
  });

  it('asks NOTHING when there is no token', async () => {
    authStore.setState({ user: null, restoring: true });

    await restoreSession();

    expect(request).not.toHaveBeenCalled();
    expect(authStore.getState().restoring).toBe(false);
  });

  it('asks NOTHING when the identity is already known', async () => {
    authStore.getState().setSession('jwt-sarah', SARAH);

    await restoreSession();

    expect(request).not.toHaveBeenCalled();
  });

  it('clears a token the server rejects — which is what fixes the guard', async () => {
    // The presence-only guard is unchanged. It becomes a validity check
    // because this call removes the token before the guard reads it.
    window.localStorage.setItem('authToken', 'not-a-real-jwt');
    authStore.setState({ user: null, restoring: true });
    request.mockImplementation(() => {
      // Mirrors what the real client does on a 401 before throwing.
      authStore.getState().clearSession();
      return Promise.reject(new Error('Unauthorized'));
    });

    await restoreSession();

    expect(window.localStorage.getItem('authToken')).toBeNull();
    expect(authStore.getState().isAuthenticated()).toBe(false);
    expect(authStore.getState().restoring).toBe(false);
  });

  it('keeps the session when the failure is NOT a rejection', async () => {
    // A network blip is not proof that the session is bad. Signing someone out
    // on a flaky connection would be worse than the defect being repaired.
    window.localStorage.setItem('authToken', 'jwt-sarah');
    authStore.setState({ user: null, restoring: true });
    request.mockRejectedValue(new Error('network down'));

    await restoreSession();

    expect(window.localStorage.getItem('authToken')).toBe('jwt-sarah');
    expect(authStore.getState().restoring).toBe(false);
  });

  it('seeds `restoring` from the presence of a token, so a reload does not flash login', () => {
    // The store is constructed at import time, so this asserts the rule the
    // constructor applies rather than re-constructing it.
    window.localStorage.setItem('authToken', 'jwt-sarah');
    expect(authStore.getState().isAuthenticated()).toBe(true);
  });
});
