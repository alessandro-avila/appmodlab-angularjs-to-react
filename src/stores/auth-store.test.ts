/**
 * AUTH STORE — behavioural equivalence with `app/services/auth.service.js`.
 *
 * These tests are the proof that the port preserves behaviour. Each case cites
 * the legacy line it pins. Two of them deliberately assert DEFECTS, because
 * reproducing them is what keeps the green baseline green.
 */
import { describe, it, expect } from 'vitest';
import {
  authStore,
  AUTH_TOKEN_KEY,
  authorizationHeader,
  handleUnauthorized,
} from '../stores/auth-store';
import type { User } from '../types/api';

const SARAH: User = {
  id: 1,
  name: 'Sarah Johnson',
  email: 'demo@globaltravel.com',
  department: 'Engineering',
  role: 'employee',
};

describe('auth store — the localStorage key', () => {
  it('is exactly "authToken"', () => {
    // Written by app/services/auth.service.js:22, seeded by the Karma spec at
    // test/spec/flight-search.spec.js:24, and captured in the Playwright
    // storage state every baseline scenario starts from. Renaming it silently
    // breaks all three, so it is asserted as a literal.
    expect(AUTH_TOKEN_KEY).toBe('authToken');
  });

  it('writes the token under that exact key, readable by the legacy app', () => {
    authStore.getState().setSession('jwt-abc', SARAH); // auth.service.js:22
    expect(window.localStorage.getItem('authToken')).toBe('jwt-abc');
  });

  it('removes that exact key on clear', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    authStore.getState().clearSession(); // auth.service.js:33
    expect(window.localStorage.getItem('authToken')).toBeNull();
  });

  it('honours a token planted directly by a test or storage state', () => {
    // This is how the Playwright storage state and the Karma spec set up a
    // signed-in session. The store must read storage, not a cached flag.
    window.localStorage.setItem('authToken', 'planted-by-fixture');
    expect(authStore.getState().isAuthenticated()).toBe(true);
    expect(authStore.getState().getToken()).toBe('planted-by-fixture');
  });
});

describe('auth store — isAuthenticated (auth.service.js:43)', () => {
  it('is false with no token', () => {
    expect(authStore.getState().isAuthenticated()).toBe(false);
  });

  it('is true with a token', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    expect(authStore.getState().isAuthenticated()).toBe(true);
  });

  it('DEFECT PRESERVED: tests presence, not validity — junk opens every screen', () => {
    // FRD-authentication Known Limitation 8, proven at the baseline gate:
    // "A planted token of not-a-real-jwt opens /expenses and /itinerary in full."
    // The legacy predicate is `!!localStorage.getItem('authToken')`, which is
    // true for ANY non-empty string. Q-8 / ADR-010 fix this in Inc-6; fixing it
    // here would supersede baseline scenarios five increments early.
    window.localStorage.setItem('authToken', 'not-a-real-jwt');
    expect(authStore.getState().isAuthenticated()).toBe(true);
  });

  it('is false for an empty-string token, matching the !! coercion', () => {
    window.localStorage.setItem('authToken', '');
    expect(authStore.getState().isAuthenticated()).toBe(false);
  });
});

describe('auth store — currentUser (auth.service.js:23, :34, :51)', () => {
  it('starts null, exactly as app/app.js:40 initialises it', () => {
    expect(authStore.getState().getCurrentUser()).toBeNull();
  });

  it('holds the user after a session is set', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    expect(authStore.getState().getCurrentUser()).toEqual(SARAH);
  });

  it('clears the user on clearSession', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    authStore.getState().clearSession();
    expect(authStore.getState().getCurrentUser()).toBeNull();
  });

  it('DEFECT PRESERVED (ADR-003 C-1): the user is in-memory only, the token is durable', () => {
    // localStorage holds authToken ALONE. After a reload the token survives and
    // the user does not, so the app renders as "You" rather than the author
    // (FRD-itinerary corrected assumption 5). authentication.feature:156 pins
    // this. The repair — calling GET /api/auth/me on boot — lands in Inc-6.
    authStore.getState().setSession('jwt-abc', SARAH);

    // Simulate a page reload: storage persists, the store is reconstructed.
    authStore.setState({ user: null });

    expect(window.localStorage.getItem('authToken')).toBe('jwt-abc');
    expect(authStore.getState().isAuthenticated()).toBe(true);
    expect(authStore.getState().getCurrentUser()).toBeNull();
  });
});

describe('auth store — readable from OUTSIDE React (ADR-013)', () => {
  it('authorizationHeader is empty with no session', () => {
    expect(authorizationHeader()).toEqual({});
  });

  it('authorizationHeader mirrors the Restangular interceptor (app/app.js:23)', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    expect(authorizationHeader()).toEqual({ Authorization: 'Bearer jwt-abc' });
  });

  it('handleUnauthorized clears the session from a non-component', () => {
    authStore.getState().setSession('jwt-abc', SARAH);
    handleUnauthorized();
    expect(authStore.getState().getToken()).toBeNull();
    expect(authStore.getState().getCurrentUser()).toBeNull();
  });
});
