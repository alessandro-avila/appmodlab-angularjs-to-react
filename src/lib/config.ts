/**
 * Runtime configuration.
 *
 * Assessment finding A-5: the legacy client hardcodes `http://localhost:3000`
 * in TWO places —
 *   - `app/app.js:14`            RestangularProvider.setBaseUrl('http://localhost:3000/api')
 *   - `app/services/auth.service.js:18`  $http.post('http://localhost:3000/api/auth/login', ...)
 *
 * Neither survives. The React client reads its base URL from the environment
 * and nowhere else. There is no literal fallback URL in this file on purpose:
 * a silent default is how a hardcoded origin creeps back in.
 */

/** Vite replaces `import.meta.env.VITE_*` at build time. */
interface ShellEnv {
  readonly VITE_API_URL?: string | undefined;
}

export class MissingConfigError extends Error {
  constructor(key: string) {
    super(
      `${key} is not set. Copy .env.example to .env (see README). ` +
        `The API base URL must come from the environment — it is never hardcoded (finding A-5).`,
    );
    this.name = 'MissingConfigError';
  }
}

/**
 * Reads the API base URL from the environment.
 *
 * Exported with an injectable env so the test suite can prove both the
 * present and absent cases without mutating `import.meta`.
 */
export function readApiBaseUrl(env: ShellEnv): string {
  const raw = env.VITE_API_URL;
  if (raw === undefined || raw.trim() === '') {
    throw new MissingConfigError('VITE_API_URL');
  }
  // Normalise away a trailing slash so callers can always join with '/path'.
  return raw.trim().replace(/\/+$/, '');
}

export function apiBaseUrl(): string {
  return readApiBaseUrl(import.meta.env as ShellEnv);
}
