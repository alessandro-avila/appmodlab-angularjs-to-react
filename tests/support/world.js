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
 * that change is load-bearing rather than cosmetic.
 *
 * The suite signs in once and reuses the resulting storage state. `localStorage`
 * is ORIGIN-SCOPED, so a token captured on `http://localhost:8080` is invisible
 * to a page on any other origin. Once one module is served by React, driving the
 * legacy server directly would mean the React route saw no token at all, the
 * route guard would bounce every scenario to the login screen, and the whole
 * feature would time out.
 *
 * The front door exists precisely to remove that problem: one origin serving
 * both applications, so one `localStorage` and one session (increment-plan
 * §1.2). Every page object now opens paths relative to BASE_URL:
 *
 *   BASE_URL + '/flights'      -> React     (migrated in Inc-1)
 *   BASE_URL + '/#!/hotels'    -> AngularJS (proxied to :8080, unmigrated)
 *
 * Both apps therefore share the session, which is what lets the suite migrate
 * one module at a time.
 *
 * `npm run shell:dev` must be running as well as `npm start`.
 */
const BASE_URL = process.env.BASELINE_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.BASELINE_API_URL || 'http://localhost:3000';

/** The legacy server, still reachable directly for anything that needs it. */
const LEGACY_URL = process.env.BASELINE_LEGACY_URL || 'http://localhost:8080';

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

module.exports = { BASE_URL, API_URL, LEGACY_URL, BaselineWorld };
