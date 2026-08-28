# Step 14 · Cutover

> **Phase** 2 · Deliver (final) &nbsp;|&nbsp; **Branch** [`lab/14-cutover`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/14-cutover) &nbsp;|&nbsp; **Parent** `lab/13-deliver-inc5-expenses`
> **Human gate** 🧑‍⚖️ PR Review &nbsp;|&nbsp; **Status** ⏳ Pending

---

## 🎯 Goal

Delete AngularJS — **and build the one screen it still owns.**

All five feature modules are React. What remains under `app/` is scaffolding for an application
nobody runs — plus, uniquely, the **login screen**, which is still the real thing. Per **ADR-010**
the authentication *surface* was deferred to this increment, because with no in-page bridge the login
screen cannot move until `/` moves. Alongside the scaffolding sits Bower, Grunt, Karma, and a
committed `bower_components/`.

So this increment is two jobs that only work together:

1. **Build** the React login screen, and the sign-out control that has never existed anywhere
   (`authentication.feature:124` — *"No screen offers a way to sign out"*).
2. **Delete** everything AngularJS and make React the single entry point.

It is the only increment where deletion and net-new behaviour land in the same PR — which is exactly
why it goes last and alone.

> The safety net is doing something different here. Through increments 1–5 the
> `@existing-behavior` suite proved *"the migrated module behaves like the old one"*. Now it proves
> *"nothing was still quietly depending on the old one"*. Same tests, different question.

> **Watch the asymmetry.** Increments 1–5 mostly *preserved*. This one carries the largest net-new
> Gherkin delta in the project, because the auth surface was never migrated — it was postponed.
> Treat it as a feature increment that happens to end in a deletion, not as a cleanup.

---

## ✅ Prerequisites

- [ ] [Step 13](13-deliver-inc5-expenses.md) merged and green
- [ ] All five React routes green; the full `@existing-behavior` suite passes
- [ ] You know what is left under `app/` — [step 13](13-deliver-inc5-expenses.md)'s outcome
      answered this

---

## 🌿 Branch setup

```bash
git switch lab/13-deliver-inc5-expenses
git switch -c lab/14-cutover
git checkout main -- docs/ README.md   # current lab instructions
```

<sub>That third line matters. `docs/` lives on `main`; a `lab/*` branch cut from its predecessor carries whatever `docs/` looked like back then. Increment 0 was run against instructions **1935 lines out of date** because of exactly this — see [step 08](08-deliver-inc0-shell.md#-outcome).</sub>

---

## 🗣️ The prompt

```text
Phase 2, final increment — cutover. Build the login screen, then delete AngularJS.

Order matters. Per ADR-010 the authentication surface was deferred to this
increment, so AngularJS still owns sign-in. Build the React login screen and the
sign-out control first, prove them green, and only then delete anything. The auth
plumbing has been in place since increment 0; what is missing is the surface.

Sign-out is net-new. It exists nowhere in the product today — authentication.feature
asserts no screen offers it. Treat it as a new behaviour with its own scenarios, not
as a port.

Then remove the legacy application and its entire build chain: app/, bower.json,
.bowerrc, bower_components/, Gruntfile.js, the Karma config and specs, and every
dependency in package.json that exists only to serve them. React becomes the single
entry point, and npm start runs the mock API plus Vite.

The mock API stays exactly as it is. It was out of scope in step 05 and it still is.

Do not delete anything you have not first proved is unreferenced. For each thing
you remove, show me what told you it was safe — a grep, an import graph, whatever
you used. "It looks like part of the old app" is not evidence, and app/index.html
may be loading things the module graph does not mention.

Then close the specs out. Every FRD's Current Implementation section still
describes AngularJS controllers that no longer exist; rewrite them to describe the
React implementation. Write the decommission ADR. The @existing-behavior scenarios
keep their tag — they are the record of what this app did before the migration and
they must still pass.

Verify: full build, full unit suite, full Playwright, and a manual pass through all
five features plus login. Paste all of it. Stop at the PR Review gate.
```

<details>
<summary><b>Why "show me what told you it was safe"</b></summary>

Deletion is the one operation the test suite cannot fully guard. A missing feature fails loudly;
a missing *asset* fails quietly, at runtime, on a path nobody clicked during CI.

`app/index.html` is the specific hazard. Script and link tags are not part of any module graph, so
a global stylesheet, a font, or a polyfill referenced only from there is invisible to every
automated check you have. Requiring evidence per deletion turns a bulk `rm` into a series of small
justified ones.
</details>

---

## 📦 What goes

### Deleted

```
app/                              the entire legacy application
├── app.js                        module bootstrap, Restangular config, event bus
├── app.routes.js                 UI-Router states
├── index.html                    ← check for assets referenced ONLY here
├── components/                   empty after increment 5
├── directives/                   empty after increment 5
├── filters/                      empty after increment 5
└── services/                     api, auth, user — all replaced

bower.json                        Bower manifest
.bowerrc                          Bower config
bower_components/                 vendored dependencies, committed
Gruntfile.js                      Grunt build
test/karma.conf.js                Karma config
test/spec/                        the Jasmine specs, green since step 04
```

### Pruned from `package.json`

Every one of these exists only for the legacy app:

| Removed | Was for |
|---------|---------|
| `grunt` + the six `grunt-contrib-*` plugins | the Grunt build and dev server |
| `karma`, `karma-jasmine`, `karma-chrome-launcher`, `jasmine-core` | the legacy unit suite |
| `serve`, `test`, `test:watch` scripts | Grunt and Karma entry points |

Kept: `concurrently` (still orchestrates API + web), `express` / `cors` / `body-parser` /
`jsonwebtoken` (the mock API). `start` and `api` survive — `start` now runs Vite instead of Grunt.

### Kept, untouched

```
api-mock/                         out of scope since step 05
specs/                            updated, not deleted
```

---

## 📤 Outcome

> ✅ **Verified** — branch [`lab/14-cutover`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/14-cutover) ·
> [compare with `lab/13-deliver-inc5-expenses`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/compare/lab/13-deliver-inc5-expenses...lab/14-cutover)

**AngularJS is gone. `app/`, `bower_components/`, `bower.json`, `.bowerrc` and `Gruntfile.js` are
all zero files on this branch.**

| Check | Result |
|---|---|
| Full suite, **before** any deletion | ✅ **258 scenarios · 2460 steps · 11m31s** |
| Full suite, **after** the decommission | ✅ **258 · 2460 · 11m27s** |
| Unit | ✅ 459 |
| `tsc` · `oxlint` · `vite build` | ✅ clean — 504 modules, 428 kB (120 kB gzipped) |
| Manual pass | ✅ login + refusal, C-1 reload, all five features, hash landing, sign-out |
| Skip-detection · `@bypasses-ui` · `@existing-behavior` | ✅ clean · 0 · retained on all six files |

**975 files, 384,709 lines deleted.**

### The order was the safety net

Surface first, **prove green, then delete.** That 258/258 ran with every legacy file still on disk —
so a failure at that moment was still **one ledger-row edit** from rollback. Deleting first would
have thrown that away for nothing.

### The check that earned its place

This page's checklist said: *"`app/index.html` may be loading things the module graph does not
mention."* It was.

```html
<link rel="stylesheet" href="/bower_components/bootstrap/dist/css/bootstrap.min.css" />
<link rel="stylesheet" href="/assets/css/style.css" />
```

**Two stylesheets reaching the browser through the front-door proxy, neither in the module graph.**
Deleting on the import graph alone would have stripped both from a running app — and quietly, because
`style.css` carries four `text-transform: uppercase` rules. The first symptom was scenarios failing
on `'Create Your First Report'` where the baseline pins `'CREATE YOUR FIRST REPORT'`.

Chasing it exposed something bigger, hidden for the entire migration: at build time Vite resolved
`/bower_components/…` from disk but `/assets/css/style.css` resolved to **nothing**. **Dev and
production had disagreed about styling since Increment 0**, and only Q-12 — nothing is deployed —
kept it invisible. `dist-react/` is self-contained for the first time.

> An import graph tells you what the *bundler* needs. It does not tell you what the *browser* was
> being handed. When the thing you are deleting is also the thing serving your assets, ask the
> running server, not the module graph.

### Deleted with evidence, not by inference

| Removed | Size | The evidence |
|---|---:|---|
| `app/` | 8 files | No ledger row is `angularjs`; the front door has no `:8080` leg; nothing outside `app/` imports it |
| `bower_components/` | **964 files** | Only `app/index.html` and `Gruntfile.js` referenced it. React's **entire** external import graph is `react`, `react-dom/client`, `react-router`, `date-fns`, `zod`, `zustand` |
| `bower.json` · `.bowerrc` | 692 B | Their sole function is populating the above |
| `Gruntfile.js` + 7 grunt deps | 3 kB | Invoked only by `npm run serve`/`build`, both rewired |
| `dist/` | 931 files | Grunt output — untracked, gitignored |

**The Karma config and specs were already gone** — deleted in `2b2bdfa` during Increment 1 with the
19 → 68 mapping. It confirmed rather than assumed, which is the whole habit.

### The guard was repaired without being changed

`isAuthenticated()` is still `!!localStorage.getItem('authToken')` — character for character. What
changed is that `restoreSession()` now calls `GET /api/auth/me` on boot, so a **rejected token is
gone before the predicate runs**.

A presence check became a validity check by gaining a *fact*, not a branch. That is the C-1 repair
that ADR-010 authorised, Increment 0 silently deferred in a code comment, and Increment 5 nearly
wrote off as unauthorised — landing here, in the increment that always owned it.

### Both pending decisions resolved as PRESERVE

**Sign-out went in the navbar**, not the dashboard — the navbar is the only chrome all six screens
share, so on the dashboard the control would be unreachable from the five feature screens. That
settles *"the dashboard carries no controls at all"* as PRESERVE. And it renders **only when
authenticated**, which is what keeps *"the navigation bar offers no way to sign out"* preserved for a
stranger while all six rows of the sign-out outline supersede for a signed-in user.

`/login` stays reachable when signed in — nothing authorises changing it, and two scenarios depend on
it.

Gherkin delta: **13 superseded, 9 net-new**, each naming its ADR.

### Three bugs of its own, and one it found by reading

`TravelRequest.tsx` hardcoded `travelerName` instead of porting the conditional — **the same class as
Increment 5's `submittedBy` bug**, and invisible until C-1 was repaired. The test seam was created
lazily by feature routes, so `identity()` did not exist on `/dashboard`. And its React navbar said
*"Travel Request"* where the legacy says **"Travel Requests"** — caught by reading the legacy source,
not by a failing test.

That the same bug class appeared twice, two increments apart, is the useful part: **a conditional
ported as its usual answer is invisible to a suite that only ever exercises one branch.**

### The seam held

`api-mock/server.js` is **byte-identical to the day the baseline was captured**, apart from the three
authorised seam fixes. And **14 API-only scenarios were never re-pointed and never edited** across
six increments — the cleanest evidence available that the HTTP API really was the stable boundary
ADR-005 claimed it was.

### Still open, deliberately

JWT in `localStorage` (**RISK-001**, accepted, owner `@alessandro-avila`, still `OPEN`) · SEAM-4,
submitted reports stored as drafts · `window.confirm` on the itinerary where two other screens use
the React dialog · Bootstrap 3 now vendored source rather than a managed dependency.

None is a surprise. All four are written down, owned, and dated.

---

## 🧑‍⚖️ Human gate — PR Review

> 🔴 **Blast radius: irreversible in spirit.** Recoverable from git, but this is the commit the
> repo is judged on.

- [ ] **The React login screen exists and works**, and the auth-surface Gherkin delta was reviewed
      before any deletion happened (ADR-010)
- [ ] ⚠️ **The C-1 repair is built** — `GET /api/auth/me` on boot, so identity survives a reload.
      ADR-010:80 authorised it and scheduled it for **Increment 0**; Inc-0 deferred it to here in a
      **code comment with no ADR** (`auth-store.ts:37`), and Increment 5 nearly wrote it off as
      unauthorised. It is the last thing standing between the product and a permanent C-1
- [ ] **`authentication.feature:179` supersedes** once the repair lands — plan §9.3 expected this in
      Inc-5 and it was correctly preserved instead, because the repair did not exist yet
- [ ] **Sign-out exists** — net-new behaviour, with its own scenarios, not a port
- [ ] `app/`, `bower.json`, `.bowerrc`, `bower_components/`, `Gruntfile.js` all gone
- [ ] **Six of the nine bower libraries were already dead before this increment** — jQuery, jQuery
      UI, Lodash, ui-bootstrap and bootstrap.js have **zero code references** after Inc-5, and Moment
      survives only inside the unused `date-format.filter.js`. Only angular, ui-router and
      restangular are still referenced, the last only via `app.js`'s config block feeding two dead
      services. Bootstrap's **CSS** is live and is a separate question from its JS
- [ ] **Three zero-consumer files go without ceremony** — `services/api.service.js`,
      `services/user.service.js`, `filters/date-format.filter.js`. Increments 4 and 5 deleted four
      more of the same kind (`approval-status`, `currency-input`, `usdCurrency`)
- [ ] `app.js:14`'s hardcoded `http://localhost:3000/api` goes with the file — the Increment 0
      finding, closed by deletion rather than by fix
- [ ] **The front door's proxy leg is retired** — one origin, one document, one app (plan §10.2)
- [ ] **Two confirmation mechanisms are reconciled.** Increment 4 gave travel-request a React
      `useConfirm()`; the itinerary still uses the native `confirm()`, because its scenarios observe
      the native dialog. Settle it here — either is fine, silence is not
- [ ] ⚠️ **`npm run shell:preview` actually serves the app.** The front door is registered via
      `configureServer`, which is **dev-server only** — there is no `configurePreviewServer` and no
      `preview.proxy`. Nothing in the lab has ever proven the *production build* serves anything.
      After the proxy leg goes this matters less, but verify it rather than assume it
- [ ] `grep -rn "angular\|bower\|grunt\|karma\|jasmine" --include=*.json --include=*.js .` returns
      nothing outside `specs/` and `docs/`
- [ ] `package.json` has no Grunt, Karma or Jasmine left
- [ ] `npm ci && npm run build` works from a **clean clone**
- [ ] `npm start` serves the React app and the mock API
- [ ] Full unit suite green; full Playwright green, `@existing-behavior` included
- [ ] **Manual pass**: log in, search flights, book one, book a hotel, view the itinerary, submit a
      travel request, file an expense
- [ ] Every FRD's Current Implementation describes React, with real file paths
- [ ] The decommission ADR exists and lists what was removed and on what evidence
- [ ] `api-mock/` is byte-identical
- [ ] No orphaned CSS, fonts or images that only `app/index.html` referenced

---

## ⚠️ Pitfalls

<details>
<summary><b>Assets that only <code>index.html</code> knew about</b></summary>

The single most likely thing to break. A global stylesheet, a favicon, a font, a polyfill — all
referenced by tag, none by import. Delete the file and they vanish from the build without a single
error.

Diff the rendered pages, or at minimum read `app/index.html` line by line before deleting it. This
is the one place where reading beats grepping.
</details>

<details>
<summary><b>Deleting the Jasmine specs feels wrong</b></summary>

They were red at the start of the lab and you fixed them in [step 04](04-green-baseline.md), so
throwing them away feels like discarding work. But they test AngularJS controllers that no longer
exist, and Karma has been deprecated since 2023. Their value was never the assertions — it was
what fixing them taught you about the gap between what a test *claims* and what the code *does*.

That lesson is now in the FRDs. Let the files go.
</details>

<details>
<summary><b>The Playwright suite still points at :8080</b></summary>

Every `@existing-behavior` spec was written against the Grunt dev server. Kill Grunt and the base
URL is wrong. It is a config change, not a rewrite — but if it is missed, the entire suite fails
in a way that looks like the cutover broke everything.
</details>

<details>
<summary><b>Removing <code>concurrently</code> because "it was for the legacy app"</b></summary>

It orchestrates the mock API and the web server. Both still exist. It stays.
</details>

<details>
<summary><b>The FRDs get tagged instead of rewritten</b></summary>

The lazy close-out is a note at the top saying *"migrated to React"*, leaving five Current
Implementation sections describing controllers that no longer exist. The next person to read
`specs/frd-flight-search.md` then gets a detailed, confident, entirely fictional account of the
codebase.

Rewriting them is the last real work of the lab, and it is the part that makes the specs worth
having kept.
</details>

<details>
<summary><b>Rewriting the <code>@existing-behavior</code> tag away</b></summary>

Tempting — the behaviour is no longer "existing", it is just behaviour. But the tag is the
provenance: it marks every scenario that was captured from the legacy app rather than designed.
That distinction is worth more than tidy tag names, especially when someone later asks *"was this
intentional, or did we inherit it?"*
</details>

---

## 🏁 Done

The journey, end to end:

| From | To |
|------|-----|
| AngularJS 1.6.10, EOL 2022 | React 19.2.8 + **TypeScript 7 strict** |
| Bower + Grunt | Vite 8 + npm |
| UI-Router hash routes | real paths through React Router 8 |
| Restangular | one `fetch` client — **no data-cache library**, because two NFRs specify *"No caching"* |
| `$rootScope` event bus | a Zustand store — and three of the five events turned out to be dead |
| jQuery + jQuery UI in controllers | React, no jQuery |
| Moment.js, loosely parsed | `date-fns`, explicitly parsed (ADR-009) |
| Karma + Jasmine, 11/11 red | Vitest + Playwright, green |
| *nothing validated the API* | Zod at the boundary — because [P-7](06-assess.md) proved a type is not a runtime check |
| No specs | PRD, 6 FRDs, contracts, 16 ADRs, a 235-scenario Gherkin baseline |

Every behaviour change in that table is either invisible to users or written down in an ADR with
a Gherkin delta. That is the actual deliverable — the React app is just what it looks like from
the outside.

### Tag the result

`lab/14-cutover` accumulates all fourteen steps, so it *is* the finished application. Give it a name
that does not require knowing the step numbering:

```bash
git branch lab/final-solution lab/14-cutover
```

One commit, two names. `lab/final-solution` is where anyone who just wants the working React +
TypeScript app should start; `main` plus the `lab/NN-*` branches are where the reasoning lives.

---

## 🔍 Post-cutover: four defects the green suite could not see

With 258/258 green and AngularJS deleted, the application was walked screen by screen in a real
browser. **Four user-visible defects turned up.**

Three of them were **faithful reproductions of AngularJS behaviour**, verified against the legacy
source before anything was touched:

| | Defect | Legacy evidence |
|---|---|---|
| **D-1** | Every page heading clipped behind the navbar | `app/index.html` used `navbar-fixed-top`; `style.css` never set `body { padding-top }`. Measured underlap: **13px**. |
| **D-2** | Notifications piled up and never left | `app.js:44-50` pushes onto `$rootScope.notifications` with **no `$timeout`** and no removal path. |
| **D-3** | Booking a flight reported `Confirmation: undefined` | `controller:220` read `booking.confirmationCode`; the API returns `confirmationNumber`. |

The fourth was **introduced by the migration**:

| | Defect | Cause |
|---|---|---|
| **D-4** | The navbar username was illegible — **1.05:1** contrast | Increment 6 added the identity as a bare `<span>` in a navbar `<li>`. The ported stylesheet colours only `.navbar-brand` and `.navbar-nav > li > a`, so it matched nothing and inherited `#333` onto the `#1a237e` bar. WCAG AA needs 4.5:1. |

### Why 258 green scenarios missed all four

**Every assertion in the suite reads `innerText`. The text was correct in all four cases.**

What was wrong was geometry (D-1), lifetime (D-2), a value that renders as the literal string
`"undefined"` (D-3), and colour (D-4). The green baseline pinned *what the application says*. It
never pinned *whether a human can read it*.

D-3 is the sharpest illustration. `flight-search.feature:183` asserts only the message **prefix** —
so the scenario passed against `undefined`, and would pass equally against a real code. **The bug
survived six increments because the assertion stopped one token short.**

### The decision

Preserving legacy behaviour was the right default *during* the increments: it prevented
unauthorised drift while nobody had reviewed the result. It stops being the right default once the
cutover is done and a human has looked at the screen.

All four were repaired under [ADR-024](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/blob/lab/14-cutover/specs/adrs/adr-024-presentation-defect-repairs.md),
which is explicit that three were deliberate reproductions and that reversing them required
authorisation.

| | Before | After |
|---|---|---|
| D-1 | 13px **under** the navbar | 20px clearance |
| D-2 | stayed forever | expires after 8s; click to dismiss |
| D-3 | `Confirmation: undefined` | `Confirmation: GTEA6AQR448` |
| D-4 | 1.05:1 | **8.20:1** — WCAG AA |

### Two things worth stealing from the fix

**The close button that wasn't added.** The obvious fix for D-2 is a `×` on each alert. It was
rejected: `flight-search.page.js` reads `.notification-area .alert` with `allInnerTexts()`, and
`the notification counts every flight that was found` compares the result using **strict equality**.
A `×` glyph joins that string and breaks the assertion for reasons that have nothing to do with the
behaviour under test. Auto-expiry and click-to-dismiss change **lifetime without adding a single
character**, so every assertion still holds. *When a test pins text, fix the behaviour without
touching the text.*

**The test that had to change anyway.** D-3 could not be fixed that way — a unit test pinned the
literal word `undefined`. That assertion was updated and **labelled as an approved contract
change**, not quietly edited to make the code pass. The Gherkin scenario was deliberately left
alone and recorded as `FOLLOW-1`: tightening an assertion is a separate decision from fixing a
defect, and bundling them hides both.

### Result

`tsc` clean · `oxlint` clean · **459/459 unit** · **258/258 scenarios, 2460/2460 steps**

Zero regressions — including from the one behaviour change that a test had pinned.

> The lasting lesson: **a green suite proves the app says the right things, not that it works.**
> Three of these four defects were older than the migration and had been shipping in AngularJS for
> years. It took one person opening the app and looking at it to find all four in ten minutes.

← Back to [the walkthrough index](README.md)
