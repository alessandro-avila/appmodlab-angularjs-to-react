# ADR-023 — Decommissioning the AngularJS Application

- **Status:** proposed — decided at the Increment 6 PR Review gate
- **Date:** 2026-08-28
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** ADR-005 (no strangler-fig bridge; the HTTP API is the seam), ADR-010 (the
  authentication surface lands with the cutover), ADR-012 (real paths; legacy hash URLs break),
  ADR-016 (npm + Vite replace Bower + Grunt)
- **Increment plan:** §10

## Context

Six increments moved the seven UI-Router states to React one row of the route ledger at a time. At
the start of Increment 6 the ledger read five `react` rows and two `angularjs` rows — `/login` and
`/dashboard`, which ADR-010 held back deliberately because they share the single `/` document and
because the authentication *surface* (the Q-8 credential form, sign-out) is net-new behaviour rather
than a port.

Increment 6 moved those last two rows. With no AngularJS route left to serve, the second application
and its entire build chain become dead weight: they cannot be reached, and nothing in the React
application imports them.

### The deletion was gated on green, not on confidence

The sequence mattered and was followed literally:

1. Build the React login screen, the sign-out control and the C-1 identity repair.
2. Flip the last two ledger rows; retire the front door's legacy legs.
3. **Run the full baseline with React owning every route — 258/258 — while every legacy file was
   still on disk.**
4. Only then delete.

Had step 3 failed, step 4 would not have happened and the ledger rows could have been flipped back
in one line each (plan §2.3). Deleting first would have destroyed that option.

### The evidence standard

The instruction for this increment was explicit: *"Do not delete anything you have not first proved
is unreferenced… 'It looks like part of the old app' is not evidence, and `app/index.html` may be
loading things the module graph does not mention."*

That warning was correct, and it caught a real defect. `app/index.html` linked two stylesheets that
the React document ALSO linked, through the front-door proxy:

```html
<link rel="stylesheet" href="/bower_components/bootstrap/dist/css/bootstrap.min.css" />
<link rel="stylesheet" href="/assets/css/style.css" />
```

Neither was in the module graph. Deleting `bower_components/` and `app/` on the strength of the
import graph alone would have removed both stylesheets from a running application — and the failure
would have been subtle rather than loud: `app/assets/css/style.css` carries four
`text-transform: uppercase` rules, so the first symptom was three baseline scenarios failing on
`'Create Your First Report'` where the baseline pins `'CREATE YOUR FIRST REPORT'`.

Investigating that also exposed a **pre-existing inconsistency the proxy had been hiding**: at build
time Vite resolved `/bower_components/...` from the project root (it existed on disk) but
`/assets/css/style.css` resolved to nothing, because that path only existed on the legacy server. The
dev server and the production build had therefore disagreed about the application's styling for the
entire migration, and nobody had noticed because Q-12 put deployment out of scope.

## Decision

**Delete the AngularJS application and its entire build chain. Relocate the two assets that are
genuinely still needed. Keep `api-mock/` untouched.**

### Deleted, with the evidence that justified each removal

| Removed | Size | Evidence it was unreferenced |
|---|---:|---|
| `app/` | 8 files | The route ledger has no `angularjs` row; the front door has no leg that reaches `:8080`; no file outside `app/` imports it (grep across `*.ts,*.tsx,*.js,*.mts,*.json,*.html` excluding `node_modules`, `dist`, `specs`, `.spec2cloud` returns only historical prose in `state.json`). Its two live CSS assets were relocated FIRST (below). |
| `bower_components/` | 964 tracked files | The only live references were `app/index.html` (deleted) and `Gruntfile.js` (deleted). The React application's complete external import graph is `react`, `react-dom/client`, `react-router`, `date-fns`, `zod`, `zustand` — none of the nine Bower packages appears in it. |
| `bower.json`, `.bowerrc` | 651 + 41 bytes | Their sole function is to populate `bower_components/`. No npm script invokes `bower`. |
| `Gruntfile.js` | 3,024 bytes | Invoked only by `npm run serve` and `npm run build`, both rewired to Vite. Its `concat`/`uglify`/`cssmin`/`copy` targets read exclusively from `app/` and `bower_components/`. |
| `grunt` + 6 `grunt-contrib-*` devDependencies | — | Their only consumer was `Gruntfile.js`. |
| `dist/` | 931 files | The Grunt build output. Untracked (`git ls-files dist` → 0) and gitignored, so this is local housekeeping rather than a repository change. |

**The Karma configuration and specs were already gone.** `test/karma.conf.js` and
`test/spec/flight-search.spec.js` were deleted in commit `2b2bdfa` during Increment 1, with an
auditable 19 → 68 test mapping. `karma`, `jasmine` and `phantom` appear nowhere in `package.json`.
Nothing was done here beyond confirming it.

### Relocated rather than deleted

| Asset | From | To | Why it survives |
|---|---|---|---|
| Application stylesheet | `app/assets/css/style.css` | `src/styles/app.css`, imported by `main.tsx` | It styles the React screens. The baseline pins its effects directly — four `text-transform: uppercase` rules drive button copy that scenarios assert on. Importing it puts it in the module graph, so dev and build finally agree. |
| Bootstrap 3 CSS + glyphicon fonts | `bower_components/bootstrap/dist/` | `public/vendor/bootstrap/{css,fonts}/` | ADR-005 carries Bootstrap 3 forward unchanged. `public/` is served as-is in dev and copied verbatim into the build, which is what makes the two agree. The `css/` + `fonts/` split is preserved because `bootstrap.min.css` references `../fonts/glyphicons-*` six times. |

Bootstrap was **not** replaced with an npm package. Doing so would change the CSS and therefore the
rendered application, which is a behaviour change no scenario authorises. ADR-005 says replacing
Bootstrap 3 is a separate decision; this ADR does not make it.

### The front door becomes an ordinary dev server

`src/lib/front-door.ts` loses `proxy-to-legacy` and `redirect-to-legacy-hash` as possible outcomes.
Only `/api` is still routed elsewhere — to the mock API, the seam that carried the whole migration
and was never touched. Everything else is the React document.

`npm start` becomes `concurrently "npm:api" "npm:dev"` — the mock API and Vite. There is no third
process.

## Consequences

**Positive**

- One application, one entry point, one build tool. `npm start` and `npm run build` no longer have
  a legacy branch.
- 975 files and 384,709 lines removed from the repository.
- The production build is **self-contained for the first time**. `dist-react/` now carries the
  Bootstrap CSS and all five glyphicon font formats, and its `index.html` references nothing outside
  itself. Before this increment, a built artefact was silently missing the application stylesheet.
- The route ledger survives as the migration's record. Every row reads `owner: 'react'`, and
  `migratesIn` still names the increment that moved it — Inc-1 flights through Inc-6 login and
  dashboard. `route-ledger.test.ts` asserts that mapping, so it cannot rot.

**Negative / accepted**

- **Rollback is no longer one line.** For five increments, reverting a route meant flipping one
  ledger row. That option ends here: rolling back now means reverting the deletion commit. This is
  inherent to a cutover and is why the deletion was gated on a green full baseline rather than on
  review alone.
- **Legacy hash URLs break, deliberately** (ADR-012 §3). `/#!/flights` no longer resolves to the
  flight search screen; it lands on the portal root — login for a stranger, the dashboard for a
  signed-in user — with the fragment left in the address bar and ignored. No redirect shim was
  written. Two net-new scenarios pin this outcome so it cannot be mistaken for breakage.
- **Bootstrap 3 is now vendored source in the repository**, not a managed dependency. It receives no
  updates and no security advisories. It is 121 kB of CSS with a known provenance and no JavaScript,
  which makes this a small and bounded risk — but it is a real one, and replacing Bootstrap 3 with a
  maintained package remains an open follow-up.
- The `dist/` housekeeping deletion is invisible to review, because the directory was untracked. It
  is recorded here so that the repository state and a working copy agree about what happened.

**Neutral**

- `api-mock/` is byte-identical to the day the green baseline was captured. It was out of scope in
  step 05 and stayed out of scope through six increments. Fourteen API-only authentication scenarios
  were never re-pointed and never edited across the entire migration — green the day before Inc-0 and
  green the day after Inc-6 — which is the cleanest available evidence that the seam held
  (plan §1.5).

## Risks that survive the migration, unresolved

These are recorded here because a decommission ADR is the last place a reader will look for "what is
still open", and none of them is closed by this increment:

- **The JWT lives in `localStorage`** (ADR-016). An accepted risk with a follow-up owner, not a
  resolved one. The scenario that pins it stays green on purpose.
- **SEAM-4 — a submitted expense report is stored as a draft.** Reproduced deliberately through the
  migration; no increment was authorised to repair it.
- **`window.confirm` on the itinerary.** Travel-request and expenses use the React `ConfirmDialog`;
  the itinerary still uses the native dialog because its scenarios observe it through Playwright's
  dialog handler and nothing authorises changing that. A cosmetic inconsistency, recorded rather than
  silently resolved.
