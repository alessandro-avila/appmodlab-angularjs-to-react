# ADR-012 — Routing: real paths, React Router 8 declarative mode, and legacy hash URLs break

- **Status:** proposed — decided at the Tech-Stack Review gate
- **Date:** 2026-08-25
- **Phase:** P → `tech-stack-resolution`
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** ADR-005 (follow-on decision 2), ADR-011 (TypeScript), increment plan §1.2, §1.3,
  §2.3, §10.4, §13 items 2, 3 and 10; assessment finding **A-7**
- **Answers:** increment plan §13 item 2 (router, hash vs real paths), item 3 (front door), item 10
  (hash-route compatibility — *"either answer is fine, silence is not"*)

## Context

### Real paths are forced, not preferred

Assessment finding **A-7** filed hash-versus-real-paths as a tech-stack preference. Increment plan
§1.2 demonstrated it is not:

> A front door can only route on the **path**; the fragment (`#!/flights`) is never sent to the
> server. AngularJS expresses all 7 states as fragments under the single path `/`. Therefore React
> routes must be real paths for route ownership to be expressible at all.

The plan depends on this at its foundation. §1.3 makes *"one row of the route ledger moves from
AngularJS to React"* the unit of increment progress, and §2.3 makes ledger-flip and legacy-route-
deletion two separate commits so a row can be flipped back in one line. A fragment-based React router
would put every React route under path `/` alongside AngularJS, leaving the front door with nothing to
route on and the ledger with nothing to express. **The plan would be unbuildable.**

So there is no decision to take on *real paths*. There are three that remain:

1. Which router, and in which of its modes.
2. What plays the front door.
3. What happens to `#!/flights` — the one §13 explicitly refuses to leave silent.

### What the URL space actually looks like during the migration

Worth stating precisely, because it makes the third question smaller than it first appears.

All seven AngularJS states live under the single path `/`. An unmigrated module therefore **has no
real path at all** — its address is `/#!/hotels`, which is path `/` plus a fragment the server never
sees. Migrated modules acquire a real path for the first time. The ledger is not a mapping from old
paths to new paths; it is a **list of real paths that did not previously exist**, which grows by one
row per increment:

| | Inc-0 | Inc-1 | Inc-2 | Inc-3 | Inc-4 | Inc-5 | Inc-6 |
|---|---|---|---|---|---|---|---|
| Real paths owned by React | — | `/flights` | `+/hotels` | `+/itinerary` | `+/travel-request` | `+/expenses` | `+/`, `/login` |
| `/` and `/#!/…` | NG | NG | NG | NG | NG | NG | **deleted** |

Two consequences follow, and both matter to the third question:

- **A hash URL for an unmigrated module keeps working throughout Inc-0…Inc-5**, by construction, with
  no compatibility work of any kind. AngularJS still owns `/`.
- **A hash URL for a *migrated* module stops working at that module's own increment**, not at
  cutover, because §2.3 step 6 deletes the ui-router state once the React route is green. This is
  already the plan's decided behaviour and is not reopened here.

The residual question is therefore narrow: at **Inc-6**, when `app/` is deleted and React takes `/`,
what happens to someone holding `/#!/flights`?

## Decision

### 1. Router — `react-router@8`, Declarative mode

**Package:** `react-router` 8.3.0 (released 2026-06-17). Note that **`react-router-dom` no longer
exists** — v8 dropped it; imports come from `react-router` and `react-router/dom`. A stack document
naming `react-router-dom` would be naming a package frozen on the v7 line.

**Mode: Declarative** (`<BrowserRouter>` + `<Routes>`/`<Route>`), not Data mode, not Framework mode.

React Router documents three modes whose features are additive, *"at the cost of architectural
control"*, and names Declarative mode as the fit for *"standard client-side routing … or apps using
their own data-sync abstractions"*. That is this application exactly:

- **Data mode** (`createBrowserRouter` + loaders/actions) would move data fetching into the router.
  Increment plan §13 item 4 already places it in a single API client — *"one base URL from config, one
  auth header, one error policy"* — and ADR-011 §4 adds response validation to that same client as the
  fourth thing it owns. Loaders would create a second place where a response enters the application,
  which is precisely the duplication both decisions exist to prevent.
- **Framework mode** brings a Vite plugin, SSR, pre-rendering and route-module splitting. **Q-12 put
  deployment out of scope.** Every one of those features serves a deployment that will not happen, and
  Framework mode's file-system route conventions would additionally take ownership of the route ledger
  — which §1.3 requires to be explicit data the increments edit, not a directory layout.

Baseline requirements carried by this choice, all verified on the host: **Node ≥ 22.22.0** (host runs
22.22.2 — a narrow margin, so `engines` must be pinned in `package.json` during Inc-0), **React ≥
19.2.7**, **Vite ≥ 7**, and **ESM-only**.

### 2. Front door — the Vite dev server's proxy, with the ledger as data

**Vite 8's `server.proxy` is the front door.** One origin, as §1.2 requires. The React application is
served by Vite; everything the ledger has not yet claimed is proxied to the two existing servers:

| Request path | Proxied to | Owner |
|---|---|---|
| `/api/*` | `localhost:3000` — `api-mock/server.js` | unchanged throughout |
| `/`, `/bower_components/*`, `/components/*`, `/assets/*` | `localhost:8080` — `grunt serve` | AngularJS, until Inc-6 |
| a ledger path (`/flights`, …) | *not proxied* — Vite serves the React document | React |

`server.proxy` accepts regular-expression keys, so the ledger is expressible as a **single data
structure** that each increment edits by one row, satisfying §1.2's requirement that *"the ledger is
data, not scattered conditionals"*. Vite's proxy middleware runs ahead of its SPA fallback, so an
unclaimed path reaches the legacy server rather than being swallowed by `index.html`.

**No reverse proxy is introduced.** §1.2 permitted either a bundler dev server or a thin reverse
proxy, and the dev server is chosen because it adds no process, no configuration file outside
`vite.config.ts`, and nothing to deploy. Under **Q-12** the front door exists only in development;
there is no production topology to mirror.

At Inc-6 the legacy proxy rules are deleted with `app/`, and the front door becomes an ordinary Vite
server with one `/api` rule.

### 3. Legacy hash URLs — **they break. Deliberately, and with the outcome stated.**

**At Inc-6, `/#!/flights` and every other legacy hash address stop resolving to the module they name.
No redirect shim is written.**

**The precise observable behaviour** — this is the part that must not be left vague:

1. The browser transmits `GET /`; the fragment is never sent.
2. The front door serves the React document at `/`.
3. React's router matches on `pathname === "/"` and renders the portal root — the login screen for a
   stranger, the dashboard for a signed-in user.
4. The fragment remains in the address bar and is ignored.

**There is no error, no 404, and no blank page.** The user lands on the portal root. That outcome is
not new behaviour requiring justification — it is the behaviour the baseline already pins in
`authentication.feature:72`, *"An unknown address falls back to the login screen"*, which is a
**PRESERVE** scenario in the Inc-6 delta. After cutover a legacy hash address simply *is* an unknown
address, and the existing fallback handles it correctly.

**Why break rather than redirect:**

1. **There is no population to serve.** **Q-12** removed deployment from scope. Nothing is deployed,
   nobody has bookmarked anything, no external page links in, and there is no search index. A
   redirect table would be code whose entire user base is the empty set.
2. **No scenario asks for it.** Not one of the 235 baseline scenarios asserts that a hash URL survives
   cutover. §10.4 files hash-route compatibility as **NET-NEW**, meaning it is behaviour the
   application does not have and would be *acquiring*. Under ADR-005, acquiring behaviour requires an
   authorising decision — and the honest reading is that nothing authorises it, because nothing needs
   it.
3. **The test suite does not need it either.** §0.5 counts 14 `#!/` literals outside `world.js`.
   Inc-0 moves all of them behind `BASE_URL` and a shared route map (§4.2), so each increment
   re-points by one line. The harness reaches screens through the route map, never through a legacy
   address that a shim would have to rescue.
4. **§13's own instruction.** *"Not in scope and not to be smuggled in… Every entry traces to a
   finding or an FRD. Anything that does not, does not go in the stack."* A redirect table traces to
   neither.

**The cost, stated rather than waved away.** If a hash URL is later found in a document, chat message
or wiki page written during the hackathon, its holder lands on the portal root and must navigate one
step. That is the whole cost, and it is bounded by the fact that no such artefact is known to exist.

**Reversal is cheap and was verified, which is part of why breaking is safe.** A client-side shim is
roughly ten lines — the fragment is unavailable to the server, so any redirect must run in the
browser after the React document loads. It was built and tested during stack resolution:

```
/#!/hotels  -> redirected to /hotels, screen "hotels", location.pathname === "/hotels"   ✅
/#!/nope    -> left alone; renders the portal root rather than guessing                  ✅
/flights    -> real path, screen "flights"                                               ✅
```

The mechanism works and is available on an afternoon's notice. It is not adopted, because *"it works"*
is not a reason to ship something nothing requires.

**Gherkin consequence for Inc-6.** §10.4 budgets 1–2 NET-NEW scenarios for this decision. This ADR
fixes the count at **one**, and its shape:

```gherkin
@net-new @adr-012
Scenario: A legacy hash address lands on the portal root
  Given the portal has been migrated and the AngularJS client is gone
  When I open the old address "/#!/flights"
  Then I am shown the portal root
  And I am not shown the flight search screen
```

It is written and approved at the Inc-6 Step 1b gate like any other scenario. Its purpose is to make
the break **asserted** rather than merely true — so that if someone later adds a shim, a test fails
and the decision is revisited on purpose.

## Alternatives considered

### Hash routing in React — rejected, and it would have been fatal

`createHashRouter` exists and would have made every legacy URL keep working for free, with zero
compatibility work. It is rejected because §1.2 proves it makes the plan unbuildable: with React
routes under `/` as fragments, the front door cannot tell a React request from an AngularJS request,
route ownership becomes inexpressible, and the ledger — the plan's unit of progress, its rollback
mechanism, and its review boundary — has nothing to record. This is the alternative that looks
cheapest and costs the most.

### A permanent hash-redirect shim — rejected

Covered in §3. Cheap, verified working, and serving nobody. Reversal is one afternoon if that ever
stops being true.

### A redirect shim retired after N weeks — rejected

The usual compromise: ship the shim, delete it later. Rejected because the deletion date is the part
that never happens, and because it inherits the flaw of the option above without inheriting its one
virtue — it still serves nobody, and now also generates a follow-up nobody will action. **Q-12** means
there is no observability to tell us whether it was ever used.

### TanStack Router — rejected, but it was a real contender

Type-safe routing with typed params and search-param schemas is a genuine fit for an ADR-011 codebase,
and its typed-search-params handling is arguably better than React Router's. It is rejected on
**baseline shape** rather than quality: the router's job in this plan is to own seven flat, parameter-
free paths and to be flipped one row at a time by an increment. That is the least demanding routing
problem a React application can have. Adopting a file-generation step and a route tree for it would
add a build-time code generator to the increment that §4.4 requires to add as little as possible.
React Router's declarative mode expresses the ledger as a list of `<Route>` elements an increment
edits by hand — which is what the plan asks for.

### Framework mode with `ssr: false` — rejected

Would have supplied the front door for free via its own Vite plugin. Rejected because it takes
ownership of the route ledger through file-system conventions (§1.3 needs it explicit), and because
its remaining machinery — pre-rendering, route-module splitting, middleware — exists for a deployment
**Q-12** cancelled.

## Consequences

**Positive.**
- Route ownership is expressible, so §1.3's ledger, §2.3's two-commit rollback and §1.4's one-line
  page-object re-point all work as designed.
- One origin, so the JWT in `localStorage` survives crossings between the two clients (§1.2) with no
  token hand-off and no duplicate login screen in Inc-0.
- Declarative mode leaves data fetching entirely to the API client, keeping ADR-011 §4's single
  validation point single.
- The break is **asserted by a scenario**, not merely allowed to happen.

**Negative / accepted.**
- Legacy hash addresses stop naming their module at Inc-6. Cost bounded in §3.
- Crossing between React and AngularJS is a full document navigation, so it is visibly slower than
  client-side routing. §1.6 already accepted this; it disappears at Inc-6.
- **Node ≥ 22.22.0** is a hard floor from `react-router@8`, and the host clears it by two patch
  versions. `engines` must be pinned in Inc-0 or a contributor on 22.21 sees an opaque install
  failure.
- ESM-only; irrelevant to a new client, and noted only because the legacy toolchain is CommonJS
  throughout.

**Blocked / unblocked.**
- **Unblocks** Inc-0's front door, route ledger and router tree (§4.2).
- **Closes** §13 items 2, 3 and 10, and ADR-005 follow-on decision 2.
- **Does not touch** §13 item 11 (Q-7 ownership enforcement) or item 12 (the 401 policy). Item 12 is
  needed by **Inc-3, not Inc-6**, and remains open for the gate.

## Verification

Reproduced on `react-router` 8.3.0 with React 19.2.8 under TypeScript 7.0.2 strict:

```
real path /flights                       -> renders the flights screen          ✅
legacy hash /#!/hotels via shim          -> /hotels (mechanism proven available) ✅
unmapped hash /#!/nope via shim          -> portal root, no guessing             ✅
tsc --strict over router + store + JSX   -> exit 0                               ✅
```

The shim rows demonstrate that the rejected option was rejected on its merits and not because it was
difficult.
