/**
 * THE FRONT DOOR — after cutover, an ordinary SPA dev server.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT THIS USED TO BE, AND WHY IT MATTERED
 * ─────────────────────────────────────────────────────────────────────────
 * Through Increments 0-5 this file was the strangler fig. It read
 * `src/lib/route-ledger.ts` and routed each URL to whichever application owned
 * it, so two applications appeared to the browser as ONE site.
 *
 * One origin was mandatory, not tidy: the JWT lives in `localStorage`, which is
 * origin-scoped. Serving React from a second port would have made a user signed
 * in on the AngularJS side arrive at a React route as a stranger, forcing
 * either a token hand-off or a duplicate login screen — both excluded by
 * ADR-005 (plan §1.2).
 *
 * The hard part was an asymmetry: React routes are REAL PATHS (`/flights`)
 * while AngularJS routes were FRAGMENTS under a single path (`/#!/flights`),
 * and a fragment is never sent to a server. The legacy static server had no
 * `/flights` resource at all, so an unmigrated route could not be proxied — it
 * had to be 302-redirected to the hash form. That is what let ONE address
 * survive the whole migration:
 *
 *   Increment 0:  GET /flights  ->  302 /#!/flights   (AngularJS answers)
 *   Increment 1:  GET /flights  ->  200 React document (React answers)
 *
 * The address a user typed never changed. Only who answered it did.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT IT IS NOW
 * ─────────────────────────────────────────────────────────────────────────
 * Increment 6 moved the last two ledger rows and deleted the AngularJS
 * application. With no second application there is nothing to route to, so the
 * ledger middleware and the legacy proxy leg are both gone. The API proxy
 * remains — it is the seam that carried the entire migration and was never
 * touched (`api-mock/` is byte-identical to the day the baseline was captured).
 *
 *   /api/...        -> proxied to :3000 (the mock API)
 *   everything else -> the React document, and the router decides
 *
 * The `historyApiFallback` behaviour Vite gives an SPA by default is what makes
 * `/expenses` and `/#!/flights` both serve the React document; the router then
 * reproduces `$urlRouterProvider.otherwise('/login')` for anything unknown.
 */
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env['VITE_API_PROXY_TARGET'] ?? 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '^/api(/|$)': { target: apiTarget, changeOrigin: true },
      },
    },
    preview: { port: 4173, strictPort: true },
    build: { outDir: 'dist-react', emptyOutDir: true, sourcemap: true },
  };
});
