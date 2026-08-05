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

const BASE_URL = process.env.BASELINE_BASE_URL || 'http://localhost:8080';
const API_URL = process.env.BASELINE_API_URL || 'http://localhost:3000';

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
