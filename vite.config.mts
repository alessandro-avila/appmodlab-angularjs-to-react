/**
 * THE FRONT DOOR — the strangler fig's entry point.
 *
 * Read `src/lib/route-ledger.ts` first; this file turns that ledger into an
 * actual HTTP router.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY ONE ORIGIN
 * ─────────────────────────────────────────────────────────────────────────
 * Two applications must appear to the browser as ONE site, because the JWT
 * lives in `localStorage` and `localStorage` is origin-scoped. If React were
 * served from a second port, a user signed in on the AngularJS side would
 * arrive at a React route as a stranger, and we would need either a token
 * hand-off or a duplicate login screen in Increment 0 (plan §1.2). Both are
 * excluded. So: one origin — the Vite dev server on :5173 — holding the ledger.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE ASYMMETRY THAT MAKES THIS NON-OBVIOUS
 * ─────────────────────────────────────────────────────────────────────────
 * React routes are REAL PATHS:            /flights
 * AngularJS routes are FRAGMENTS under a single path:   /#!/flights
 *
 * A fragment is never sent to the server. The legacy static server therefore
 * has NO `/flights` resource — asking it for one returns 404. So an unmigrated
 * route cannot simply be proxied; the front door must REDIRECT the real path
 * to the legacy hash form and let the browser re-ask for `/`.
 *
 * That is what `legacyHash` in the ledger is for, and it is the mechanism that
 * lets one address survive the whole migration:
 *
 *   Increment 0:  GET /flights  ->  302 /#!/flights   (AngularJS answers)
 *   Increment 1:  GET /flights  ->  200 React document (React answers)
 *
 * The address a user types never changes. Only who answers it does — which is
 * precisely what makes the ledger row the unit of progress (plan §1.3).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REQUEST ROUTING, IN ORDER
 * ─────────────────────────────────────────────────────────────────────────
 *   /api/...                          -> proxied to :3000 (mock API, both apps)
 *   /__shell                          -> React (the shell health route)
 *   ledger row owned by 'react'       -> React document
 *   ledger row owned by 'angularjs'   -> 302 to its legacyHash on this origin
 *   everything else (/, /assets, /components, /bower_components, /#!/...)
 *                                     -> proxied to :8080 (legacy static)
 *
 * Exactly one document answers any given URL, and the two apps never
 * co-render. Crossing between them is a full document navigation, which is
 * why no interop bridge is needed: the browser tears the outgoing app down
 * before the incoming one boots.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHAT INCREMENT 1 CHANGES HERE
 * ─────────────────────────────────────────────────────────────────────────
 * Nothing. It changes `owner` on one ledger row; this file follows.
 */
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { decide, isViteInternal, pathnameOf, ledgerRowFor } from './src/lib/front-door';

/**
 * The ledger, as middleware.
 *
 * The RULE lives in `src/lib/front-door.ts` and is unit-tested there; this is
 * only the wiring. Registered from `configureServer`, which Vite runs BEFORE
 * it installs the proxy — so these decisions are made first and the proxy only
 * sees what is left over.
 */
function frontDoor(): Plugin {
  return {
    name: 'strangler-fig-front-door',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const decision = decide(req.url);

        if (decision.kind === 'redirect-to-legacy-hash') {
          // The legacy server has no such path — its states are fragments
          // under '/' — so redirect to the hash form on THIS origin. 302, not
          // 301: the mapping is temporary and must not be cached past the
          // increment that migrates the row.
          res.statusCode = 302;
          res.setHeader('Location', decision.location);
          res.setHeader('Cache-Control', 'no-store');
          res.end();
          return undefined;
        }

        // 'react', 'vite-internal' -> Vite handles it.
        // 'proxy-to-legacy', 'proxy-to-api' -> fall through to the proxy.
        return next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env['VITE_API_PROXY_TARGET'] ?? 'http://localhost:3000';
  const legacyTarget = env['VITE_LEGACY_URL'] ?? 'http://localhost:8080';

  return {
    plugins: [frontDoor(), react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // The mock API, shared by both applications.
        '^/api(/|$)': { target: apiTarget, changeOrigin: true },
        // Everything the front door did not claim belongs to the legacy app:
        // its root document, its #!/ URLs (which arrive as '/'), and its
        // static assets under /assets, /components and /bower_components.
        '^/(?!@|src/|node_modules/|__vite|__shell).*': {
          target: legacyTarget,
          changeOrigin: true,
          bypass(req) {
            const pathname = pathnameOf(req.url);
            if (isViteInternal(pathname)) return req.url;
            // A ledger row owned by React is served the SPA document instead.
            if (ledgerRowFor(pathname)?.owner === 'react') return '/index.html';
            return undefined;
          },
        },
      },
    },
    preview: { port: 4173, strictPort: true },
    build: { outDir: 'dist-react', emptyOutDir: true, sourcemap: true },
  };
});
