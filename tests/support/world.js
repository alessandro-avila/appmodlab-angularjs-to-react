/**
 * Cucumber World for the green baseline.
 *
 * One browser for the whole run; a fresh context per scenario built from a
 * stored authenticated state. Logging in once and reusing storage state keeps
 * the suite fast and — more importantly — avoids the reload trap recorded as
 * C-1 in ADR-003: after a page reload the token survives but the in-memory
 * user does not, so a scenario that re-authenticated by reloading would be
 * running as nobody.
 */
const { setWorldConstructor, World, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(60 * 1000);

/**
 * THE ORIGIN THE SUITE DRIVES.
 *
 * Increment 1 moved this from the legacy static server to the FRONT DOOR, and
 * that change was load-bearing rather than cosmetic.
 *
 * The suite signs in once and reuses the resulting storage state. `localStorage`
 * is ORIGIN-SCOPED, so a token captured on `http://localhost:8080` was invisible
 * to a page on any other origin. Once one module was served by React, driving the
 * legacy server directly would have meant the React route saw no token at all,
 * the route guard would have bounced every scenario to the login screen, and the
 * whole feature would have timed out.
 *
 * The front door existed precisely to remove that problem: one origin serving
 * both applications, so one `localStorage` and one session (increment-plan
 * §1.2). While the migration was in flight, page objects addressed:
 *
 *   BASE_URL + '/flights'      -> React     (migrated in Inc-1)
 *   BASE_URL + '/#!/hotels'    -> AngularJS (proxied to :8080, unmigrated)
 *
 * AT THE CUTOVER (Inc-6, ADR-023) the AngularJS application was deleted, so
 * there is no second origin and no proxy leg. Every area is a real path on
 * :5173, and the only thing still routed elsewhere is `/api`. The one-origin
 * requirement outlived the reason it was introduced: the session still lives
 * in origin-scoped `localStorage`.
 *
 * `npm start` runs everything the suite needs — the mock API on :3000 and Vite
 * on :5173. There is no third process.
 */
const BASE_URL = process.env.BASELINE_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.BASELINE_API_URL || 'http://localhost:3000';

// `LEGACY_URL` was removed at the cutover. It pointed at the AngularJS static
// server on :8080 for anything that needed to bypass the front door; nothing
// consumed it by the end, and the server it named no longer exists.

class BaselineWorld extends World {
  constructor(options) {
    super(options);
    this.baseUrl = BASE_URL;
    this.apiUrl = API_URL;
    /** scratch space for values a scenario needs to remember between steps */
    this.memory = {};
  }
}

setWorldConstructor(BaselineWorld);

module.exports = { BASE_URL, API_URL, BaselineWorld };
