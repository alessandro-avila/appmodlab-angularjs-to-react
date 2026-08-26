import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The shell's unit/component suite.
 *
 * Deliberately separate from the Karma suite (`npm test`), which keeps running
 * the 19 AngularJS tests unchanged — ADR-008 §3: the new runner arrives
 * "alongside the AngularJS suite, not in place of it".
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
    // The legacy Karma suite and the Playwright baseline live elsewhere and
    // must never be swept into this runner.
    exclude: ['node_modules/**', 'test/**', 'tests/**', 'dist/**', 'dist-react/**'],
  },
});
