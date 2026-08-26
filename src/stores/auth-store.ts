/**
 * AUTH STORE — the React port of `app/services/auth.service.js`.
 *
 * ADR-013: a vanilla Zustand store, not a React context. The discriminating
 * requirement is that TWO consumers are not components — the API client (which
 * builds the Authorization header) and the 401 handler (which clears the
 * session). A context cannot be read outside the React tree, so the token
 * would end up in a context AND a module variable: two copies reconciled by
 * discipline, which is exactly the $rootScope defect (P-5) in new syntax.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BEHAVIOUR IS PRESERVED EXACTLY. The mapping, per legacy line:
 * ─────────────────────────────────────────────────────────────────────────
 *  auth.service.js:22  localStorage.setItem('authToken', token)   -> same key, same value
 *  auth.service.js:23  $rootScope.currentUser = user              -> store slice `user`
 *  auth.service.js:24  $broadcast('auth:login', user)             -> store update (ADR-013: absorbed,
 *                                                                    not replayed — the event was
 *                                                                    NEVER DELIVERED in the legacy
 *                                                                    app; its 3 listeners live on
 *                                                                    feature routes that are never
 *                                                                    alive at the same time)
 *  auth.service.js:33  localStorage.removeItem('authToken')       -> same key
 *  auth.service.js:34  $rootScope.currentUser = null              -> store slice cleared
 *  auth.service.js:35  $broadcast('auth:logout')                  -> store update (no listeners existed)
 *  auth.service.js:43  !!localStorage.getItem('authToken')        -> IDENTICAL predicate, see below
 *  auth.service.js:51  return $rootScope.currentUser              -> read the store slice
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TWO LEGACY DEFECTS ARE DELIBERATELY REPRODUCED, NOT FIXED
 * ─────────────────────────────────────────────────────────────────────────
 * 1. `isAuthenticated()` tests token PRESENCE, never validity (FRD-authentication
 *    Known Limitation 8). A planted `not-a-real-jwt` opens every screen. Fixing
 *    it here would be an unauthorised behaviour change: Q-8 / ADR-010 schedule
 *    the real guard for Inc-6.
 * 2. `user` is in-memory only and does NOT survive a reload (ADR-003 constraint
 *    C-1) — `localStorage` holds the token alone. The repair (calling
 *    GET /api/auth/me on boot) is scheduled for Inc-6, where
 *    `authentication.feature:156` and `:165` supersede.
 *
 * Both are marked below so nobody "tidies" them early.
 */
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { User } from '../types/api';

/**
 * The localStorage key. DO NOT RENAME.
 *
 * It is written by `app/services/auth.service.js:22`, seeded by the Karma spec
 * at `test/spec/flight-search.spec.js:24`, and captured in the Playwright
 * storage state at `tests/.auth/state.json` that every green-baseline scenario
 * starts from. Renaming it is a one-word edit that silently breaks all three.
 */
export const AUTH_TOKEN_KEY = 'authToken';

export interface AuthState {
  /** Mirrors $rootScope.currentUser: in-memory only, lost on reload (C-1). */
  readonly user: User | null;
  /** Mirrors auth.service.js:22/:33 — the durable artefact. */
  setSession(token: string, user: User): void;
  clearSession(): void;
  /** Mirrors auth.service.js:43 — PRESENCE only, deliberately not validity. */
  isAuthenticated(): boolean;
  /** Mirrors auth.service.js:51. */
  getCurrentUser(): User | null;
  getToken(): string | null;
}

/**
 * `localStorage` access is wrapped because the legacy accessor is unguarded
 * (FRD-authentication NFR-F001-004: "a browser that blocks storage would throw
 * out of this method"). The React client must not crash the shell on a
 * SecurityError, but it must still report "not authenticated" — which is the
 * same answer the legacy predicate gives when the key is absent.
 */
function safeReadToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(AUTH_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function safeWriteToken(token: string): void {
  try {
    globalThis.localStorage?.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    /* storage blocked — the session simply does not persist */
  }
}

function safeRemoveToken(): void {
  try {
    globalThis.localStorage?.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* storage blocked */
  }
}

export const authStore = createStore<AuthState>((set, get) => ({
  user: null,

  setSession: (token, user) => {
    safeWriteToken(token); // auth.service.js:22
    set({ user }); // auth.service.js:23 + :24 (broadcast absorbed into state)
  },

  clearSession: () => {
    safeRemoveToken(); // auth.service.js:33
    set({ user: null }); // auth.service.js:34 + :35
  },

  // auth.service.js:43 — `!!localStorage.getItem('authToken')`, unchanged.
  // Reads storage directly rather than a cached flag, exactly as the legacy
  // predicate does, so a token planted by a test is honoured identically.
  isAuthenticated: () => !!safeReadToken(),

  getCurrentUser: () => get().user, // auth.service.js:51
  getToken: () => safeReadToken(),
}));

/** Component-side subscription with a selector (ADR-013). */
export const useAuthStore = <T,>(selector: (state: AuthState) => T): T => useStore(authStore, selector);

/**
 * Read by the API client, which is a module and not a component.
 * Mirrors the Restangular interceptor at `app/app.js:20-28`.
 */
export function authorizationHeader(): Record<string, string> {
  const token = authStore.getState().getToken();
  return token === null ? {} : { Authorization: `Bearer ${token}` };
}

/**
 * The 401 path (plan §4.2 — "the 401 handling path"). Called by the API client
 * from outside React. Clears BOTH the durable token and the in-memory user
 * from one function, so a cleared store can never coexist with a live token.
 *
 * NOTE: what the UI then DOES about a 401 — redirect, message, silent — is the
 * session-expiry POLICY, which is still open (plan §13 item 12) and is needed
 * by Inc-3. This is the mechanism only.
 */
export function handleUnauthorized(): void {
  authStore.getState().clearSession();
}
