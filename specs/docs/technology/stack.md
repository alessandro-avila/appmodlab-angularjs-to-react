# Technology Stack — globaltravel-portal

_Extracted on 2026-08-03 by `codebase-scanner`. This is a factual inventory of the project as it exists._

**Scope of this scan:** `app/`, `api-mock/`, `test/`, `bower.json`, `package.json`, `Gruntfile.js`.
`node_modules/` was excluded. `bower_components/` was excluded from file-level inventory by
instruction — see [Vendored dependencies](#vendored-dependencies).

**Source of truth:** code. Where `README.md` or a filename disagrees with the code, the code is
recorded here and the disagreement is listed in [Documentation vs code](#documentation-vs-code).

---

## Languages

File counts cover the in-scope directories and root manifests only (30 files total).

| Language | File Count | Percentage | Config File |
|----------|-----------|------------|-------------|
| JavaScript | 22 | 61.1% | `package.json` (no `tsconfig.json` present) |
| HTML | 6 | 16.7% | — |
| CSS | 1 | 2.8% | — |
| JSON (manifests) | 2 | 5.6% | `package.json`, `bower.json` |

Counting only the three in-scope source directories (`app/`, `api-mock/`, `test/`), the totals are
22 `.js`, 6 `.html`, 1 `.css` — 29 files.

No TypeScript, JSX, `.mjs`, `.cjs`, SCSS, LESS, SQL, or shell scripts are present in scope.

### JavaScript language level

| Aspect | Observed value | Evidence |
|--------|---------------|----------|
| Variable declarations | `var` only | All 22 `.js` files; no `let`/`const` in `app/`, `api-mock/`, `test/` |
| Strict mode | `'use strict';` inside IIFEs | `app/app.js:6`, all `app/**` files; `test/spec/flight-search.spec.js:9` |
| Module system | None in `app/` — global `angular` namespace + IIFE | `app/app.js:5` `(function() {` … `})();` |
| Module system | CommonJS in `api-mock/` and build/test config | `api-mock/server.js:6` `require('express')`; `Gruntfile.js:1` `module.exports` |
| Browser globals used without injection | `$` (jQuery), `_` (Lodash), `moment` | `app/components/flight-search/flight-search.controller.js:74,101,113`; `app/filters/date-format.filter.js:21` |

---

## Frameworks

| Framework | Version constraint | Category | Detected From |
|-----------|-------------------|----------|---------------|
| AngularJS | `1.6.10` (exact) | Front-end web framework | `bower.json` `dependencies.angular`; pinned again in `bower.json` `resolutions.angular` |
| angular-ui-router | `~0.4.3` | Client-side router | `bower.json`; module `ui.router` listed in `app/app.js:9` |
| Restangular | `~1.6.1` | HTTP/REST client abstraction | `bower.json`; module `restangular` listed in `app/app.js:11`; configured `app/app.js:13-29` |
| angular-ui-bootstrap | `~2.5.6` | UI component library | `bower.json`; module `ui.bootstrap` listed in `app/app.js:10`; script tag `app/index.html:54` |
| Bootstrap | `~3.3.7` | CSS/JS UI kit | `bower.json`; `app/index.html:12,56` |
| jQuery | `~2.2.4` | DOM library | `bower.json`; `app/index.html:48` |
| jQuery UI | `~1.12.1` | jQuery widget library (datepicker) | `bower.json`; `app/index.html:14,49` |
| Lodash | `~4.17.4` | Utility library | `bower.json`; `app/index.html:50` |
| Moment.js | `~2.18.1` | Date library | `bower.json`; `app/index.html:51` |
| Express | `^4.18.0` | Node.js HTTP server (mock API) | `package.json` `dependencies`; `api-mock/server.js:6,11` |
| Jasmine | `jasmine-core ^2.8.0` | Test assertion framework | `package.json` `devDependencies`; `test/karma.conf.js:22` `frameworks: ['jasmine']` |
| Karma | `^1.7.1` | Test runner | `package.json` `devDependencies`; `test/karma.conf.js` |
| angular-mocks | `1.6.10` (exact) | AngularJS test harness | `bower.json` `devDependencies`; `test/karma.conf.js:34` |

### AngularJS module composition

`app/app.js:7-11` declares one module, `globalTravelApp`, with three dependencies:

```js
angular.module('globalTravelApp', ['ui.router', 'ui.bootstrap', 'restangular'])
```

| Declared module dependency | Loaded in `index.html` | Referenced in `app/` source | Evidence |
|---------------------------|------------------------|-----------------------------|----------|
| `ui.router` | Yes — `app/index.html:53` | Yes — `$stateProvider`/`$urlRouterProvider` in `app/app.routes.js:8`; `ui-sref` in `app/index.html:25-29` and templates | — |
| `restangular` | Yes — `app/index.html:55` | Yes — `RestangularProvider` `app/app.js:13`; `Restangular` injected into 8 services | — |
| `ui.bootstrap` | Yes — `app/index.html:54` | **No usage found.** A repository-wide search of `app/` for `uib-`, `$uibModal`, `uibDate` returns zero matches. | grep over `app/**` |

Modal dialogs in the templates are Bootstrap 3 markup driven by the jQuery plugin, not by
`ui.bootstrap`: `$('#bookingConfirmationModal').modal('show')`
(`app/components/hotel-booking/hotel-booking.controller.js:224`),
`$('#requestDetailModal').modal('show')`
(`app/components/travel-request/travel-request.controller.js:246`),
`$('#expenseDetailModal').modal('show')`
(`app/components/expense-reconciliation/expense.controller.js:228`).

---

## AngularJS registration inventory

Counted by `.controller(`, `.service(`, `.directive(`, `.filter(` calls in `app/`.

| Registration type | Files | Registrations | Names |
|-------------------|-------|---------------|-------|
| Modules | 1 | 1 | `globalTravelApp` |
| Controllers (named) | 5 | 5 | `FlightSearchController`, `HotelBookingController`, `ItineraryController`, `TravelRequestController`, `ExpenseController` |
| Controllers (inline in route config) | — | 1 | anonymous controller on the `login` state, `app/app.routes.js:16` |
| Services — application level | 3 | 3 | `ApiService`, `AuthService`, `UserService` |
| Services — feature level | 5 | 5 | `FlightSearchService`, `HotelBookingService`, `ItineraryService`, `TravelRequestService`, `ExpenseService` |
| Directives | 3 | 3 | `gtApprovalStatus`, `gtCurrencyInput`, `gtDatePicker` |
| Filters | 2 | **4** | `usdCurrency`, `gtDateFormat`, `gtTimeAgo`, `gtDuration` |

> **Filter count:** two files register four filters. `app/filters/date-format.filter.js` chains
> three `.filter()` calls: `gtDateFormat` (line 14), `gtTimeAgo` (line 47), `gtDuration` (line 60).
> `app/filters/currency.filter.js` registers one: `usdCurrency` (line 12).

### Registered names vs file names

| File | Registered name(s) | Usage as attribute/element/pipe in `app/` |
|------|-------------------|-------------------------------------------|
| `app/directives/approval-status.directive.js` | `gtApprovalStatus` (`restrict: 'E'`) | none found (`<gt-approval-status>` — 0 matches) |
| `app/directives/currency-input.directive.js` | `gtCurrencyInput` (`restrict: 'A'`) | none found (`gt-currency-input` as an attribute — 0 matches; the string appears only as a CSS class the directive adds at runtime, `currency-input.directive.js:27`, and in `app/assets/css/style.css:121,126`) |
| `app/directives/date-picker.directive.js` | `gtDatePicker` (`restrict: 'A'`) | none found (`gt-date-picker` — 0 matches) |
| `app/filters/currency.filter.js` | `usdCurrency` | none found (`| usdCurrency` — 0 matches) |
| `app/filters/date-format.filter.js` | `gtDateFormat`, `gtTimeAgo`, `gtDuration` | none found (0 matches each) |

All three directives and all four filters are registered on the module and loaded by
`app/index.html:80-86`; no template in `app/` references any of them. Date inputs in the templates
are plain `<input type="text">` elements wired to the jQuery UI datepicker directly from the
controllers (`$('#departDate').datepicker(...)`,
`app/components/flight-search/flight-search.controller.js:72`), not via the `gtDatePicker`
directive. Currency formatting in `hotel-booking.controller.js:255` and
`expense.controller.js:266` calls `$filter('currency')`, which is AngularJS's built-in filter, not
the application's `usdCurrency`.

### Services registered but never injected

| Service | Injected anywhere in `app/` or `test/`? |
|---------|------------------------------------------|
| `ApiService` | No — the only occurrence of the identifier is its own registration, `app/services/api.service.js:9` |
| `UserService` | No — the only occurrence is its own registration, `app/services/user.service.js:8` |

---

## Build Tools

| Tool | Version constraint | Purpose | Config File |
|------|-------------------|---------|-------------|
| npm | not pinned (no `.npmrc`, no `engines` field) | Node package manager | `package.json` |
| Bower | not declared in any manifest | Front-end package manager | `bower.json` |
| Grunt | `^1.0.4` | Task runner | `Gruntfile.js` |
| grunt-contrib-concat | `^1.0.1` | Concatenate app JS into `dist/js/app.js` | `Gruntfile.js:14-28` |
| grunt-contrib-uglify | `^3.4.0` | Minify to `dist/js/app.min.js` | `Gruntfile.js:30-40` |
| grunt-contrib-cssmin | `^2.2.1` | Minify `app/assets/css/**/*.css` to `dist/css/style.min.css` | `Gruntfile.js:42-48` |
| grunt-contrib-copy | `^1.0.0` | Copy HTML, images and `bower_components/` into `dist/` | `Gruntfile.js:50-74` |
| grunt-contrib-connect | `^1.0.2` | Static dev server on port 8080 | `Gruntfile.js:76-90` |
| grunt-contrib-watch | `^1.1.0` | Watch `app/**/*` with livereload | `Gruntfile.js:92-97` |
| concurrently | `^9.1.2` | Run API and web server together | `package.json` `scripts.start` |
| Karma | `^1.7.1` | Browser test runner | `test/karma.conf.js` |
| karma-jasmine | `^1.1.2` | Jasmine adapter for Karma | `test/karma.conf.js:22` |
| karma-chrome-launcher | `^2.2.0` | Chrome/ChromeHeadless launcher | `test/karma.conf.js:62-67,69` |

**No** bundler (Webpack, Vite, Rollup, Parcel, esbuild), transpiler (Babel, SWC, `tsc`), CSS
preprocessor, linter config, formatter config, or code generator is present in the repository.

### Grunt tasks

| Task | Composition | Defined at |
|------|-------------|------------|
| `build` | `concat`, `uglify`, `cssmin`, `copy` | `Gruntfile.js:107` |
| `serve` | `connect:server`, `watch` | `Gruntfile.js:108` |
| `default` | `build` | `Gruntfile.js:109` |

`concat.dist.src` (`Gruntfile.js:19-25`) globs, in order: `app/app.js`, `app/app.routes.js`,
`app/components/**/*.js`, `app/directives/**/*.js`, `app/filters/**/*.js`, `app/services/**/*.js`.
This ordering places `app/components/**` before `app/services/**`, the reverse of the load order in
`app/index.html:66-81`.

`copy.main.files` (`Gruntfile.js:53-72`) includes a source of `app/assets/images/`. That directory
does not exist in the repository — `app/assets/` contains only `css/style.css`.

`concat.options.separator` is `';'` (`Gruntfile.js:16-18`).

### Container detection in build config

`Gruntfile.js:7-8` and `test/karma.conf.js:15-16` both compute an `inContainer` boolean from
`process.env.CODESPACES`, `process.env.REMOTE_CONTAINERS`, `process.env.DEVCONTAINER` and the
existence of `/.dockerenv`. `karma.conf.js` additionally reads `process.env.CI`.

| Setting | Value when `inContainer` is true | Value when false | Location |
|---------|----------------------------------|------------------|----------|
| connect hostname | `'*'` | `'localhost'` | `Gruntfile.js:84` |
| connect open browser | `false` | `true` | `Gruntfile.js:87` |
| Karma browser | `ChromeHeadlessContainer` (`--no-sandbox --disable-dev-shm-usage --disable-gpu`) | `ChromeHeadless` | `test/karma.conf.js:62-69` |

`test/karma.conf.js:71` sets `singleRun: !!process.env.CI` and line 60 sets
`autoWatch: !process.env.CI`. The `npm test` script passes `--single-run` on the command line,
which overrides the config value.

---

## Runtime Dependencies

### npm (`package.json` `dependencies`) — server side

| Package | Version constraint |
|---------|-------------------|
| express | `^4.18.0` |
| cors | `^2.8.5` |
| body-parser | `^1.20.0` |
| jsonwebtoken | `^9.0.0` |

### Bower (`bower.json` `dependencies`) — browser side

| Package | Version constraint |
|---------|-------------------|
| angular | `1.6.10` |
| angular-ui-router | `~0.4.3` |
| angular-ui-bootstrap | `~2.5.6` |
| jquery | `~2.2.4` |
| jquery-ui | `~1.12.1` |
| bootstrap | `~3.3.7` |
| restangular | `~1.6.1` |
| lodash | `~4.17.4` |
| moment | `~2.18.1` |

Full inventory with resolved versions and purposes: `specs/docs/technology/dependencies.md`.

## Dev Dependencies

### npm (`package.json` `devDependencies`)

`concurrently ^9.1.2`, `grunt ^1.0.4`, `grunt-contrib-concat ^1.0.1`, `grunt-contrib-uglify ^3.4.0`,
`grunt-contrib-cssmin ^2.2.1`, `grunt-contrib-watch ^1.1.0`, `grunt-contrib-connect ^1.0.2`,
`grunt-contrib-copy ^1.0.0`, `karma ^1.7.1`, `karma-jasmine ^1.1.2`, `karma-chrome-launcher ^2.2.0`,
`jasmine-core ^2.8.0` — 12 packages.

### Bower (`bower.json` `devDependencies`)

`angular-mocks 1.6.10` — 1 package.

---

## Vendored dependencies

`bower_components/` is committed to the repository. Per instruction its contents were not
inventoried file by file. The facts recorded are:

- The directory exists at the repository root and is tracked by git.
- Ten package directories are present: `angular`, `angular-mocks`, `angular-ui-bootstrap`,
  `angular-ui-router`, `bootstrap`, `jquery`, `jquery-ui`, `lodash`, `moment`, `restangular`.
- `.bowerrc` is present at the repository root and contains `{ "directory": "bower_components" }`.
- Nine of the ten package directories carry a `.bower.json` manifest recording the resolved
  version. `bower_components/jquery-ui/` carries no `.bower.json`, `bower.json` or `package.json`;
  its resolved version is not determinable from a manifest.
- Every vendor path referenced by `app/index.html:12,14,15,48-56` and `test/karma.conf.js:26-34`
  resolves to a file that exists under `bower_components/` (10 of 10 checked).
- Both `app/index.html:12,14,15,48-56` and `test/karma.conf.js:26-34` load assets directly from
  `bower_components/` by relative path; there is no copy or bundling step between
  `bower_components/` and the served application in `serve` mode.
- `Gruntfile.js:66-71` copies the whole of `bower_components/` into `dist/bower_components/` during
  `build`.

---

## Entry Points

| File | Type | Start command | Notes |
|------|------|---------------|-------|
| `api-mock/server.js` | Server (Node.js/Express) | `npm run api` → `node api-mock/server.js` | Listens on port `3000`, hardcoded at `api-mock/server.js:12`; `app.listen` at line 705 |
| `app/index.html` | Web (browser) | `npm run serve` → `grunt serve` | Served by `grunt-contrib-connect` on port `8080`, hardcoded `Gruntfile.js:79`; base paths `['app', '.']` |
| `app/app.js` | Web (AngularJS bootstrap) | — | Module `globalTravelApp`, bootstrapped by `ng-app` attribute on `<html>`, `app/index.html:2` |
| `test/karma.conf.js` | Test runner config | `npm test` → `karma start test/karma.conf.js --single-run` | `basePath: '../'` |
| `Gruntfile.js` | Build config | `npm run build` → `npm run clean && grunt build` | — |

Combined start: `npm start` → `concurrently -k -n api,web -c cyan,green "npm:api" "npm:serve"`.

No CLI binaries, serverless handlers, background workers, scheduled jobs, or queue consumers exist
in scope.

---

## Routing

`app/app.routes.js` registers **7** UI-Router states via `$stateProvider`.

| State | URL | Template source | Controller | `data.requireAuth` |
|-------|-----|-----------------|------------|--------------------|
| `login` | `/login` | inline `template` string | inline anonymous | absent |
| `dashboard` | `/dashboard` | inline `template` string | none | `true` |
| `flights` | `/flights` | `components/flight-search/flight-search.template.html` | `FlightSearchController` | `true` |
| `hotels` | `/hotels` | `components/hotel-booking/hotel-booking.template.html` | `HotelBookingController` | `true` |
| `itinerary` | `/itinerary` | `components/itinerary/itinerary.template.html` | `ItineraryController` | `true` |
| `travelRequest` | `/travel-request` | `components/travel-request/travel-request.template.html` | `TravelRequestController` | `true` |
| `expenses` | `/expenses` | `components/expense-reconciliation/expense.template.html` | `ExpenseController` | `true` |

`$urlRouterProvider.otherwise('/login')` — `app/app.routes.js:10`.

`$locationProvider` is not referenced anywhere in `app/` (0 matches for `locationProvider`,
`hashPrefix`, `html5Mode`). No `<base href>` tag is present in `app/index.html`. The AngularJS
1.6 defaults therefore apply: hash-based URLs with the `!` hash prefix.

---

## Directory Structure

```
.
├── app/                                    AngularJS browser application
│   ├── index.html                          single HTML page; 9 vendor + 18 app script tags
│   ├── app.js                              module declaration, Restangular config, run block
│   ├── app.routes.js                       7 UI-Router states
│   ├── assets/
│   │   └── css/style.css                   583 lines, hand-written CSS (no preprocessor)
│   ├── components/                         5 feature folders, each controller + service + template
│   │   ├── expense-reconciliation/
│   │   ├── flight-search/
│   │   ├── hotel-booking/
│   │   ├── itinerary/
│   │   └── travel-request/
│   ├── directives/                         3 files, 3 directives
│   ├── filters/                            2 files, 4 filters
│   └── services/                           3 application-level services
├── api-mock/
│   └── server.js                           Express server, 718 lines, 36 route handlers
├── test/
│   ├── karma.conf.js                       Karma + Jasmine config
│   └── spec/
│       └── flight-search.spec.js           1 spec file, 11 test cases
├── bower_components/                       vendored + committed (not inventoried)
├── bower.json                              9 runtime + 1 dev browser dependency
├── package.json                            4 runtime + 12 dev npm dependencies
├── package-lock.json                       lockfileVersion 3
├── Gruntfile.js                            build + serve tasks
└── dist/                                   build output (not present until `npm run build`)
```

Tests are in a separate top-level `test/` directory, not colocated with source. There is no `src/`
directory, no monorepo tooling (no workspaces, Lerna, Nx, or Turborepo), and no
`packages/`/`apps/` layout.

### Absent from the repository

The following are absent in scope. Each is a factual observation, not a gap assessment.

| Item | Status |
|------|--------|
| `Dockerfile`, `docker-compose.yml`, `.dockerignore` | not present |
| `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml` | not present |
| `infra/`, `terraform/`, `bicep/`, `cdk/`, `azure.yaml` | not present |
| `.env`, `.env.example`, or any env file | not present |
| `tsconfig.json`, `.babelrc`, `.eslintrc*`, `.prettierrc*` | not present |
| `.nvmrc`, `.tool-versions`, `engines` field in `package.json` | not present |
| `app/assets/images/` (referenced by `Gruntfile.js:68`) | not present |
| `dist/` (build output) | not present |
| Coverage tooling or reports (`coverage/`, `lcov.info`, karma-coverage) | not present |

A `.devcontainer/` directory with `devcontainer.json` and `devcontainer-lock.json` is present at the
repository root.

---

## Configuration values embedded in source

| Value | Location | Mechanism |
|-------|----------|-----------|
| `http://localhost:3000/api` | `app/app.js:14` | `RestangularProvider.setBaseUrl(...)`, literal |
| `http://localhost:3000/api/auth/login` | `app/services/auth.service.js:18` | `$http.post(...)`, literal |
| `3000` | `api-mock/server.js:12` | `var PORT = 3000;` |
| `globaltravel-secret-key-2024` | `api-mock/server.js:13` | `var JWT_SECRET = '...';` |
| `8080` | `Gruntfile.js:79` | `connect.server.options.port` |
| `9876` | `test/karma.conf.js:54` | `config.port` |
| `https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css` | `app/components/itinerary/itinerary.controller.js:171` | written into the print window document |
| `https://globaltravel.com/shared/…` | `api-mock/server.js:508` | response body literal |
| `https://globaltravel.com/receipts/…` | `api-mock/server.js:696` | response body literal |

No environment variable is read by `app/` or `api-mock/`. The only `process.env` reads in the
repository are the container/CI detection flags in `Gruntfile.js:7-8` and `test/karma.conf.js:15-16,60,71`.

---

## Documentation vs code

Per the extraction rule that code is the source of truth, the following statements in `README.md`
differ from what the source declares. Both values are recorded; the code value is the one used
throughout this document.

| `README.md` | Line | Code | Evidence |
|-------------|------|------|----------|
| "5 feature modules, 3 directives, **2 filters**, 3 services" | 50 | 5 feature folders, 3 directives, **4 registered filters** in 2 files, 3 application-level services (+5 feature-level services) | `app/filters/date-format.filter.js:14,47,60`; `app/filters/currency.filter.js:12` |
| "**8** Bower packages (angular, ui-router, ui-bootstrap, restangular, jquery, jquery-ui, moment, lodash)" | 51 | **9** runtime Bower dependencies — the list omits `bootstrap ~3.3.7` — plus 1 dev dependency (`angular-mocks`) | `bower.json:11-21` |
| "`api-mock/server.js` (**~36 routes**)" | 53 | exactly **36** route handlers | counted from `api-mock/server.js`; enumerated in `specs/contracts/api/` |
| "Mock API … **~36 routes**" | 355 | exactly **36** route handlers | as above |
| "1 Karma spec file, 11 tests, **0% meaningful coverage**" | 55 | 1 spec file, 11 test cases; no coverage tooling is configured, so no coverage figure exists in the repository | `test/karma.conf.js:50` (`preprocessors: {}`), no `coverage/` directory |
| "`.filter('currency')` … `.filter('dateFormat')`" | 246-247 | registered filter names are `usdCurrency`, `gtDateFormat`, `gtTimeAgo`, `gtDuration` | `app/filters/*.js` |
| "`ui.bootstrap` is declared in `app/app.js` but **never used**" | 386 | agrees with code — 0 matches for `uib-`, `$uibModal`, `uibDate` in `app/` | grep over `app/**` |
| "`npm test` … expected: 11 failures" | 348 | agrees with code — 11 of 11 executed, 11 failed | run recorded in `specs/docs/testing/coverage.md` |

Filenames that differ from the identifiers registered inside them are listed in
[Registered names vs file names](#registered-names-vs-file-names).

---

## Additional Observations

- One `package.json` and one `bower.json` — single project, not a monorepo.
- `package.json` and `bower.json` both declare `name: "globaltravel-portal"`, `version: "1.6.0"`,
  `description: "GlobalTravel Corp - Corporate Travel Booking Portal"`, and `private: true`.
  `bower.json` additionally declares `main: "app/app.js"`, `license: "MIT"`, and
  `authors: ["GlobalTravel Corp"]`.
- `package-lock.json` is present and committed (`lockfileVersion: 3`). No `bower.lock` exists —
  Bower has no lock file format.
- `app/index.html:9` embeds an SVG favicon as a `data:` URI.
- `api-mock/server.js` holds all state in module-level JavaScript arrays
  (`users`, `trips`, `travelRequests`, `expenseReports`) — restarting the process resets them.
  No database driver, ORM, connection string, or persistence library appears in `package.json`.
- Three `app.use(...)` global middlewares are registered in `api-mock/server.js:15-17`: `cors()`,
  `bodyParser.json()`, `bodyParser.urlencoded({ extended: true })`. `cors()` is called with no
  options.
- The application-level `authMiddleware` (`api-mock/server.js:23-35`) is applied per route, not
  globally. Three routes carry no auth middleware: `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/airports`.
- The browser application reads and writes `localStorage` under the key `authToken`
  (`app/app.js:20`, `app/services/auth.service.js:24,34,42`).
- `app/app.js:32` registers a listener for the `$stateChangeStart` event. That event is emitted by
  angular-ui-router 0.x.
- Total lines in scope: 5,966 — `app/` 4,925 (of which 2,619 are `.js`), `api-mock/` 718,
  `test/` 323. Largest single file: `api-mock/server.js` at 718 lines.
