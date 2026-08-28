/**
 * React entry point.
 *
 * React 19: `createRoot(container).render(<App />)`.
 * NOT React 18's `ReactDOM.render(<App />, container)`, which is removed in 19.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { restoreSession } from './lib/auth-service';
import { initTestSeam } from './lib/test-seam';
/**
 * The application's own stylesheet, moved out of `app/assets/css/` at the
 * cutover. It is not legacy cruft — it styles the React screens, and the
 * baseline pins its effects directly: four `text-transform: uppercase` rules
 * are why the expense empty-state button reads "CREATE YOUR FIRST REPORT".
 *
 * Imported here rather than <link>ed so it is part of the module graph, which
 * makes dev and build agree. Through the hybrid period it was fetched from the
 * AngularJS static server via the proxy, and the production build never had it
 * at all.
 */
import './styles/app.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root is missing from index.html');
}

// The identity seam must exist on every route, not just the feature routes
// that publish a scope. DEV-only; a no-op in a production build.
initTestSeam();

/**
 * THE C-1 REPAIR runs before the first paint is committed, not inside a
 * component effect.
 *
 * In an effect it would run twice under StrictMode, and — worse — it would run
 * AFTER the guard had already decided, so a reload would flash the login
 * screen before restoring the traveller. Kicking it off here means the store's
 * `restoring` flag is already true (it is seeded from the presence of a token)
 * by the time anything renders.
 *
 * It is deliberately not awaited: the shell must paint immediately, and every
 * consumer reads `restoring` rather than assuming an answer.
 */
void restoreSession();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
