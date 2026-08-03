# Dependency Inventory — globaltravel-portal

_Extracted on 2026-08-03 by `dependency-inventory`. This is a factual catalog of all declared dependencies._

**Scope:** `bower.json`, `package.json`, `package-lock.json`, and the resolved-version manifests
inside `bower_components/*/.bower.json`. `node_modules/` was not walked; all npm resolved versions
come from `package-lock.json`. `bower_components/` was not inventoried file by file — see
[Vendoring](#vendoring).

**Source of truth:** the manifests and lock file. Where `README.md` disagrees, both values are
recorded in [Documentation vs manifests](#documentation-vs-manifests) and the manifest value is
used.

---

## Summary

| Metric | Value |
|--------|-------|
| Manifest files found | 2 — `package.json`, `bower.json` |
| Lock files found | 1 — `package-lock.json` (`lockfileVersion: 3`) |
| Ecosystems | npm (Node.js), Bower (browser) |
| npm direct runtime dependencies | 4 |
| npm direct dev dependencies | 12 |
| npm total entries in lock file (excl. root) | 521 |
| npm distinct package names in lock file | 390 |
| npm entries flagged `dev: true` | 437 |
| npm entries not flagged dev | 84 |
| npm entries flagged `optional: true` | 4 |
| Bower direct runtime dependencies | 9 |
| Bower direct dev dependencies | 1 |
| Bower lock file | none — Bower has no lock file format |
| Monorepo workspaces | none — single project, no `workspaces` field |

---

## Manifest: package.json (root)

Declared name `globaltravel-portal`, version `1.6.0`, `private: true`. No `engines` field, no
`workspaces` field, no `overrides`/`resolutions` field.

### Runtime Dependencies

| Package | Version Constraint | Resolved Version | Category | Purpose |
|---------|-------------------|------------------|----------|---------|
| express | `^4.18.0` | 4.22.1 | Web framework | HTTP server for the mock API — `api-mock/server.js:6,11` |
| cors | `^2.8.5` | 2.8.6 | Middleware | Cross-origin headers — registered globally, `api-mock/server.js:15` |
| body-parser | `^1.20.0` | 1.20.4 | Middleware | JSON and urlencoded body parsing — `api-mock/server.js:16-17` |
| jsonwebtoken | `^9.0.0` | 9.0.3 | Authentication | JWT sign and verify — `api-mock/server.js:29` (`jwt.verify`), `:283` (`jwt.sign`) |

### Dev Dependencies

| Package | Version Constraint | Resolved Version | Category | Purpose |
|---------|-------------------|------------------|----------|---------|
| concurrently | `^9.1.2` | 9.2.4 | Build tooling | Runs `npm:api` and `npm:serve` together — `package.json` `scripts.start` |
| grunt | `^1.0.4` | 1.6.2 | Build tooling | Task runner — `Gruntfile.js` |
| grunt-contrib-concat | `^1.0.1` | 1.0.1 | Build tooling | Concatenates app JS — `Gruntfile.js:14-28` |
| grunt-contrib-uglify | `^3.4.0` | 3.4.0 | Build tooling | Minifies concatenated JS — `Gruntfile.js:30-40` |
| grunt-contrib-cssmin | `^2.2.1` | 2.2.1 | Build tooling | Minifies CSS — `Gruntfile.js:42-48` |
| grunt-contrib-watch | `^1.1.0` | 1.1.0 | Build tooling | Watches `app/**/*` with livereload — `Gruntfile.js:92-97` |
| grunt-contrib-connect | `^1.0.2` | 1.0.2 | Build tooling | Static dev server on port 8080 — `Gruntfile.js:76-90` |
| grunt-contrib-copy | `^1.0.0` | 1.0.0 | Build tooling | Copies HTML, images, `bower_components/` to `dist/` — `Gruntfile.js:50-74` |
| karma | `^1.7.1` | 1.7.1 | Testing | Browser test runner — `test/karma.conf.js` |
| karma-jasmine | `^1.1.2` | 1.1.2 | Testing | Jasmine adapter for Karma — `test/karma.conf.js:22` |
| karma-chrome-launcher | `^2.2.0` | 2.2.0 | Testing | Launches Chrome/ChromeHeadless — `test/karma.conf.js:62-67` |
| jasmine-core | `^2.8.0` | 2.99.1 | Testing | Jasmine assertion framework |

---

## Manifest: bower.json (root)

Declared name `globaltravel-portal`, version `1.6.0`, `main: "app/app.js"`, `license: "MIT"`,
`authors: ["GlobalTravel Corp"]`, `private: true`.

`.bowerrc` at the repository root sets `{ "directory": "bower_components" }`.

### Runtime Dependencies

Resolved versions are read from `bower_components/{package}/.bower.json`.

| Package | Version Constraint | Resolved Version | Category | Purpose |
|---------|-------------------|------------------|----------|---------|
| angular | `1.6.10` | 1.6.10 | UI library | AngularJS framework — module declared `app/app.js:8` |
| angular-ui-router | `~0.4.3` | 0.4.3 | Routing | `ui.router` module, 7 states — `app/app.routes.js` |
| angular-ui-bootstrap | `~2.5.6` | 2.5.6 | UI library | `ui.bootstrap` module listed at `app/app.js:10`; **no `uib-*` directive, `$uibModal` or `uibDate` reference exists anywhere in `app/`** |
| jquery | `~2.2.4` | 2.2.4 | DOM library | Global `$` used in all 5 controllers, all 3 directives |
| jquery-ui | `~1.12.1` | 1.12.1 (banner only — see note) | UI library | `.datepicker()`, `.tooltip()` widgets — e.g. `app/directives/date-picker.directive.js:29` |
| bootstrap | `~3.3.7` | 3.3.7 | Styling | CSS grid, labels, modals — `app/index.html:12,56` |
| restangular | `~1.6.1` | 1.6.1 | HTTP client | `restangular` module, injected into 8 services |
| lodash | `~4.17.4` | 4.17.23 | Utility | Global `_` used in all 5 controllers and all 5 feature services |
| moment | `~2.18.1` | 2.18.1 | Utility | Global `moment` used in all 5 controllers, all 5 feature services, and `app/filters/date-format.filter.js` |

> **jquery-ui resolved version.** `bower_components/jquery-ui/` contains a single file,
> `jquery-ui.min.js`, plus a `themes/` tree. It carries no `.bower.json`, `bower.json` or
> `package.json`. The only version evidence in the tree is the banner comment on line 1 of
> `jquery-ui.min.js`: `/*! jQuery UI - v1.12.1 - 2016-09-14`. That is a comment, not a manifest,
> so the resolved version is recorded as **1.12.1 per file banner; not confirmable from a
> manifest**.

### Dev Dependencies

| Package | Version Constraint | Resolved Version | Category | Purpose |
|---------|-------------------|------------------|----------|---------|
| angular-mocks | `1.6.10` | 1.6.10 | Testing | `module()`, `inject()`, `$httpBackend` — loaded at `test/karma.conf.js:34` |

### Resolutions block

`bower.json:22-24` declares:

```json
"resolutions": { "angular": "1.6.10" }
```

`angular` is the only entry. Its `dependencies` constraint (`1.6.10`) and its `resolutions` entry
(`1.6.10`) are identical.

---

## Declared vs referenced

Every Bower runtime package is loaded by a `<script>` or `<link>` tag. The table records whether
the loaded package is also referenced by application source under `app/`.

| Package | Loaded by `app/index.html` | Referenced in `app/**` source | Evidence |
|---------|---------------------------|-------------------------------|----------|
| angular | line 56 | yes | `angular.module(...)`, `angular.copy(...)`, `angular.identity` |
| angular-ui-router | line 57 | yes | `$stateProvider` `app/app.routes.js:8`; `ui-sref` in `index.html:26-30` and 5 templates |
| angular-ui-bootstrap | line 58 | **no match found** | 0 hits for `uib-`, `$uibModal`, `uibDate` across `app/**` |
| jquery | line 52 | yes | `$('#departDate')` `flight-search.controller.js:74`, and 40+ further call sites |
| jquery-ui | lines 14, 53 | yes | `.datepicker(...)` `date-picker.directive.js:26`; `$.datepicker.formatDate` line 60 |
| bootstrap | lines 12, 60 | yes | `.modal('show')` `hotel-booking.controller.js:224`; `label-*`/`glyphicon-*` classes in templates |
| restangular | line 59 | yes | `RestangularProvider` `app/app.js:13`; `Restangular` injected into 8 services |
| lodash | line 54 | yes | `_.map`, `_.filter`, `_.orderBy`, `_.sumBy`, `_.groupBy` across controllers and services |
| moment | line 55 | yes | `moment(...)` across controllers, services and `date-format.filter.js` |
| angular-mocks | not loaded by `index.html` | yes, in `test/` only | `test/karma.conf.js:34`; `module()`/`inject()` `test/spec/flight-search.spec.js:14,16` |

Bootstrap's JavaScript bundle (`bower_components/bootstrap/dist/js/bootstrap.min.js`) is loaded by
`app/index.html:49` but is **not** in the `files` array of `test/karma.conf.js:26-34`. jQuery UI's
CSS (`themes/base/jquery-ui.min.css`) is loaded by `app/index.html:14`; the Karma `files` array
loads no CSS at all.

All 10 vendor asset paths referenced by `app/index.html` and `test/karma.conf.js` resolve to files
that exist under `bower_components/`.

---

## Dependency Tree Summary

Relationships below are read from `package-lock.json`. Bower has no lock file, so no Bower
transitive tree is available; the `.bower.json` manifests record no resolved transitive
dependencies for these packages.

### Immediate dependencies of each npm direct dependency

| Direct package | Immediate dependencies |
|----------------|------------------------|
| express 4.22.1 | accepts, array-flatten, body-parser, content-disposition, content-type, cookie, cookie-signature, debug, depd, encodeurl, escape-html, etag, finalhandler, fresh, http-errors, merge-descriptors, methods, on-finished, parseurl, path-to-regexp, proxy-addr, qs, range-parser, safe-buffer, send, serve-static, setprototypeof, statuses, type-is, utils-merge, vary (31) |
| cors 2.8.6 | object-assign, vary (2) |
| body-parser 1.20.4 | bytes, content-type, debug, depd, destroy, http-errors, iconv-lite, on-finished, qs, raw-body, type-is, unpipe (12) |
| jsonwebtoken 9.0.3 | jws, lodash.includes, lodash.isboolean, lodash.isinteger, lodash.isnumber, lodash.isplainobject, lodash.isstring, lodash.once, ms, semver (10) |
| concurrently 9.2.4 | chalk, rxjs, shell-quote, supports-color, tree-kill, yargs (6) |
| grunt 1.6.2 | dateformat, eventemitter2, exit, findup-sync, glob, grunt-cli, grunt-known-options, grunt-legacy-log, grunt-legacy-util, iconv-lite, js-yaml, minimatch, nopt (13) |
| grunt-contrib-concat 1.0.1 | chalk, source-map (2) |
| grunt-contrib-uglify 3.4.0 | chalk, maxmin, uglify-js, uri-path (4) |
| grunt-contrib-cssmin 2.2.1 | chalk, clean-css, maxmin (3) |
| grunt-contrib-watch 1.1.0 | async, gaze, lodash, tiny-lr (4) |
| grunt-contrib-connect 1.0.2 | async, connect, connect-livereload, http2, morgan, opn, portscanner, serve-index, serve-static (9) |
| grunt-contrib-copy 1.0.0 | chalk, file-sync-cmp (2) |
| karma 1.7.1 | bluebird, body-parser, chokidar, colors, combine-lists, connect, core-js, di, dom-serialize, expand-braces, glob, graceful-fs, http-proxy, isbinaryfile, lodash, log4js, mime, minimatch, optimist, qjobs, range-parser, rimraf, safe-buffer, socket.io, source-map, tmp, useragent (27) |
| karma-jasmine 1.1.2 | none |
| karma-chrome-launcher 2.2.0 | fs-access, which (2) |
| jasmine-core 2.99.1 | none |

### Tree shape

| Metric | Value |
|--------|-------|
| Maximum `node_modules/` nesting depth in lock file | 3 |
| Entries nested deeper than the top level | 131 of 521 |
| Entries at the top level (`node_modules/{pkg}`) | 390 of 521 |

### Shared transitive dependencies

Packages pulled in by more than one direct dependency, as recorded in the lock file:

| Package | Pulled in by |
|---------|-------------|
| body-parser | express (direct dep of express), karma |
| chalk | concurrently, grunt-contrib-concat, grunt-contrib-uglify, grunt-contrib-cssmin, grunt-contrib-copy |
| async | grunt-contrib-watch, grunt-contrib-connect |
| lodash | grunt-contrib-watch, karma |
| minimatch | grunt, karma |
| source-map | grunt-contrib-concat, karma |
| glob | grunt, karma |
| iconv-lite | grunt, body-parser |
| connect | grunt-contrib-connect, karma |
| serve-static | express, grunt-contrib-connect |
| maxmin | grunt-contrib-uglify, grunt-contrib-cssmin |
| safe-buffer | express, karma |
| range-parser | express, karma |
| supports-color | concurrently (direct), and transitively via every `chalk` consumer |

### Multiple Version Instances

58 package names resolve to more than one version in `package-lock.json`. The complete list:

| Package | Versions Present |
|---------|-----------------|
| accepts | 1.3.3, 1.3.8 |
| ansi-regex | 2.1.1, 5.0.1 |
| ansi-styles | 2.2.1, 4.3.0 |
| arr-diff | 2.0.0, 4.0.0 |
| array-slice | 0.2.3, 1.1.0 |
| array-unique | 0.2.1, 0.3.2 |
| async | 1.5.2, 2.6.4, 3.2.6 |
| braces | 0.1.5, 1.8.5, 2.3.2, 3.0.3 |
| bytes | 1.0.0, 3.1.2 |
| chalk | 1.1.3, 4.1.2 |
| component-emitter | 1.1.2, 1.2.1 |
| cookie | 0.3.1, 0.7.2 |
| debug | 2.2.0, 2.3.3, 2.6.9, 3.2.7 |
| define-property | 0.2.5, 1.0.0, 2.0.2 |
| depd | 1.1.2, 2.0.0 |
| encodeurl | 1.0.2, 2.0.0 |
| expand-brackets | 0.1.5, 2.1.4 |
| expand-range | 0.1.1, 1.8.2 |
| extend-shallow | 2.0.1, 3.0.2 |
| extglob | 0.3.2, 2.0.4 |
| fill-range | 2.2.4, 4.0.0, 7.1.1 |
| finalhandler | 1.1.2, 1.3.2 |
| findup-sync | 4.0.0, 5.0.0 |
| for-own | 0.1.5, 1.0.0 |
| has-value | 0.3.1, 1.0.0 |
| has-values | 0.1.4, 1.0.0 |
| http-errors | 1.8.1, 2.0.1 |
| iconv-lite | 0.4.24, 0.6.3 |
| is-descriptor | 0.1.7, 1.0.3 |
| is-extendable | 0.1.1, 1.0.1 |
| is-extglob | 1.0.0, 2.1.1 |
| is-glob | 2.0.1, 4.0.3 |
| is-number | 0.1.1, 2.1.0, 3.0.0, 4.0.0, 7.0.0 |
| isarray | 0.0.1, 1.0.0 |
| isobject | 2.1.0, 3.0.1 |
| kind-of | 3.2.2, 4.0.0, 6.0.3 |
| lodash | 3.10.1, 4.18.1 |
| micromatch | 2.3.11, 3.1.10, 4.0.8 |
| minimatch | 3.0.8, 3.1.5 |
| ms | 0.7.1, 0.7.2, 2.0.0, 2.1.3 |
| negotiator | 0.6.1, 0.6.3 |
| object-assign | 4.1.0, 4.1.1 |
| on-finished | 2.3.0, 2.4.1 |
| raw-body | 1.1.7, 2.5.3 |
| readable-stream | 1.0.34, 2.3.8 |
| repeat-string | 0.2.2, 1.6.1 |
| safe-buffer | 5.1.2, 5.2.1 |
| semver | 4.3.6, 7.7.4 |
| source-map | 0.5.7, 0.6.1 |
| sprintf-js | 1.0.3, 1.1.3 |
| statuses | 1.5.0, 2.0.2 |
| string_decoder | 0.10.31, 1.1.1 |
| strip-ansi | 3.0.1, 6.0.1 |
| supports-color | 2.0.0, 7.2.0, 8.1.1 |
| to-regex-range | 2.1.1, 5.0.1 |
| which | 1.3.1, 2.0.2 |

The npm-installed `lodash` (3.10.1 and 4.18.1, both transitive) is a separate installation from the
Bower-installed `lodash` 4.17.23 that the browser loads at `app/index.html:50`. Application code
under `app/` uses only the Bower copy, via the global `_`.

---

## Version Constraint Patterns

| Manifest | Section | Strategy observed |
|----------|---------|-------------------|
| `package.json` | `dependencies` | caret ranges throughout — `^4.18.0`, `^2.8.5`, `^1.20.0`, `^9.0.0` (4 of 4) |
| `package.json` | `devDependencies` | caret ranges throughout — 12 of 12 |
| `bower.json` | `dependencies` | 1 exact pin (`angular: "1.6.10"`), 8 tilde ranges (`~0.4.3`, `~2.5.6`, `~2.2.4`, `~1.12.1`, `~3.3.7`, `~1.6.1`, `~4.17.4`, `~2.18.1`) |
| `bower.json` | `devDependencies` | 1 exact pin (`angular-mocks: "1.6.10"`) |
| `bower.json` | `resolutions` | 1 exact pin (`angular: "1.6.10"`) |

Constraints whose resolved version differs from the lowest version the constraint allows:

| Package | Constraint | Resolved | Ecosystem |
|---------|-----------|----------|-----------|
| express | `^4.18.0` | 4.22.1 | npm |
| cors | `^2.8.5` | 2.8.6 | npm |
| body-parser | `^1.20.0` | 1.20.4 | npm |
| jsonwebtoken | `^9.0.0` | 9.0.3 | npm |
| concurrently | `^9.1.2` | 9.2.4 | npm |
| grunt | `^1.0.4` | 1.6.2 | npm |
| jasmine-core | `^2.8.0` | 2.99.1 | npm |
| lodash | `~4.17.4` | 4.17.23 | Bower |

### Version pinning files

| File | Present |
|------|---------|
| `.npmrc` | no |
| `.nvmrc` | no |
| `.tool-versions` | no |
| `engines` field in `package.json` | no |
| `.bowerrc` | yes — sets `directory` only, no version pinning |

### Lock files in version control

| Lock file | Present | Committed |
|-----------|---------|-----------|
| `package-lock.json` | yes | yes — tracked by git, no `.gitignore` entry |
| `yarn.lock`, `pnpm-lock.yaml` | no | — |
| Bower lock file | n/a — the format does not exist | — |

---

## Vendoring

`bower_components/` is **committed to the repository**. Per instruction its contents were not
inventoried file by file. The recorded facts:

- The directory is tracked by git and is not listed in `.gitignore`.
- It holds 10 package directories: `angular`, `angular-mocks`, `angular-ui-bootstrap`,
  `angular-ui-router`, `bootstrap`, `jquery`, `jquery-ui`, `lodash`, `moment`, `restangular` —
  one per entry in `bower.json` `dependencies` and `devDependencies`.
- 9 of the 10 carry a `.bower.json` manifest holding the resolved version. `jquery-ui` does not.
- `app/index.html` and `test/karma.conf.js` load vendor assets from `bower_components/` by
  relative path at runtime; there is no bundling or copy step in `grunt serve`.
- `Gruntfile.js:66-71` copies the entire directory into `dist/bower_components/` during
  `grunt build`.
- Because the vendored tree is committed, the packages are present in a clean checkout without
  running `bower install`. No `bower` binary is declared in `package.json`.

`node_modules/` is present in the working tree and was excluded from this inventory by instruction;
all npm figures above derive from `package-lock.json`.

---

## Documentation vs manifests

| `README.md` | Line | Manifest | Evidence |
|-------------|------|----------|----------|
| "**8** Bower packages (angular, ui-router, ui-bootstrap, restangular, jquery, jquery-ui, moment, lodash)" | 51 | **9** runtime dependencies — the README list omits `bootstrap ~3.3.7` — plus 1 dev dependency, `angular-mocks 1.6.10` | `bower.json:11-21`, `bower.json:22-24` |
| "`ui.bootstrap` is declared in `app/app.js` but **never used**. No `uib-*` directive, no `$uibModal`." | 386 | agrees — `angular-ui-bootstrap ~2.5.6` is declared in `bower.json:14`, listed as a module at `app/app.js:10`, loaded at `app/index.html:54`, and matched 0 times in `app/**` for `uib-`, `$uibModal`, `uibDate` | grep over `app/**` |
