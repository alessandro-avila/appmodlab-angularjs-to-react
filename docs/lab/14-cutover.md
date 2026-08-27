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

> ⏳ **Pending** — filled in from the real run.
>
> Paste back:
> 1. `git --no-pager diff --stat lab/13-deliver-inc5-expenses..lab/14-cutover` — expect a large
>    negative number, and note what `bower_components/` alone accounted for
> 2. The `package.json` diff
> 3. Full build, full unit suite, full Playwright
> 4. **Anything referenced only from `app/index.html`** that had to be rescued
> 5. Whether every FRD's Current Implementation was actually rewritten, or just tagged
> 6. Manual pass: login + all five features
> 7. What broke that the tests did not catch

---

## 🧑‍⚖️ Human gate — PR Review

> 🔴 **Blast radius: irreversible in spirit.** Recoverable from git, but this is the commit the
> repo is judged on.

- [ ] **The React login screen exists and works**, and the auth-surface Gherkin delta was reviewed
      before any deletion happened (ADR-010)
- [ ] **Sign-out exists** — net-new behaviour, with its own scenarios, not a port
- [ ] `app/`, `bower.json`, `.bowerrc`, `bower_components/`, `Gruntfile.js` all gone
- [ ] **The front door's proxy leg is retired** — one origin, one document, one app (plan §10.2)
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

← Back to [the walkthrough index](README.md)
