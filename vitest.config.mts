import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The application's unit/component suite — `npm test`.
 *
 * It ARRIVED alongside the AngularJS Karma suite rather than replacing it
 * (ADR-008 §3), which is why the two coexisted for a while. Karma and its
 * 19 AngularJS tests were retired in Increment 1 with an auditable 19 -> 68
 * mapping, and the AngularJS application itself was deleted at the cutover
 * (ADR-023). This is now the only unit runner.
 *
 * `src/test/**` is excluded from tsconfig's `noUnusedLocals` pain by being
 * ordinary source; the runner picks up `*.test.ts(x)` anywhere under src/.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // The Playwright/Cucumber baseline lives in tests/ and must never be swept
    // into this runner — it drives a real browser against a running server.
    exclude: ['node_modules/**', 'tests/**', 'dist-react/**'],
  },
});
