# The Strangler Fig Entry Point

> How two applications — AngularJS 1.6 and React 19 — serve one site, and how a
> route moves from one to the other. **Increments 1–5 all depend on this**, so it
> is documented before any feature is migrated.

---

## 1. The problem in one sentence

The React client must take over the AngularJS client **one route at a time**,
without the two ever being loaded into the same page, and without a user losing
their session when they cross between them.

---

## 2. Why one origin, and not two ports

The obvious approach — run React on `:5173`, AngularJS on `:8080`, send people to
whichever they need — **does not work**, for one specific reason:

> The JWT lives in `localStorage`, and `localStorage` is **origin-scoped**.

A user signed in on `http://localhost:8080` has a token that a page on
`http://localhost:5173` cannot read. They would arrive at every React route as a
stranger. Fixing that needs either a token hand-off between origins (a bridge by
another name) or a second login screen inside Increment 0 (a migrated feature in
the walking skeleton). Both were excluded by the increment plan (§1.2).

So there is **one origin**: the Vite dev server on `:5173`. It is the *front
door*. Both applications are served through it, and both therefore share one
`localStorage`, one cookie jar, and one session.

```
                    ┌──────────────────────────────────┐
   browser  ───────▶│   FRONT DOOR   :5173  (Vite)     │
                    │   holds the ROUTE LEDGER         │
                    └───────┬─────────────┬────────────┘
                            │             │
              ┌─────────────▼───┐   ┌─────▼──────────────────┐
              │ React 19        │   │ proxy                  │
              │ (served here)   │   ├──────────┬─────────────┤
              └─────────────────┘   │  :8080   │   :3000     │
                                    │ AngularJS│  mock API   │
                                    └──────────┴─────────────┘
```

**Verified:** signing in through the front door and then opening the React shell
shows the *same* `authToken`. That single fact is what makes the whole design
work.

---

## 3. The asymmetry that makes this non-obvious

This is the part that is easy to get wrong, and the part that *was* got wrong on
the first attempt.

| | URL shape | What the server receives |
|---|---|---|
| **React** | `/flights` | `GET /flights` |
| **AngularJS** | `/#!/flights` | `GET /` — the fragment is **never sent** |

AngularJS (via UI-Router) expresses **all seven states as fragments under the
single path `/`**. The legacy static server has no `/flights` resource at all.

So the naive front door — "proxy `/flights` to `:8080`" — returns **404**. It was
observed exactly like that:

```
/flights     404      <-- first attempt: proxied the real path to the legacy server
```

The fix is a **redirect**, not a proxy:

```
GET /flights  ->  302 Location: /#!/flights  ->  browser asks for /  ->  AngularJS routes on the fragment
```

That is what the `legacyHash` column in the ledger is for.

**302, not 301** — deliberately. The mapping is temporary; it disappears the
moment the row migrates, and a permanently-cached redirect would keep sending
users to the legacy screen *after* React had taken the route over.

---

## 4. The route ledger

One array, in [`src/lib/route-ledger.ts`](../../src/lib/route-ledger.ts), read by
**two** consumers so they can never disagree:

1. **`vite.config.mts`** — builds the front-door middleware.
2. **`src/App.tsx`** — builds the React route tree.

```ts
{ path: '/flights', legacyState: 'flights', legacyHash: '#!/flights',
  owner: 'angularjs', migratesIn: 'Inc-1', requireAuth: true }
```

Ownership today (Increment 0 — **React owns nothing a user can reach**):

| Path | Legacy state | Owner | Migrates in |
|---|---|---|---|
| `/login` | `login` | AngularJS | Inc-6 |
| `/dashboard` | `dashboard` | AngularJS | Inc-6 |
| `/flights` | `flights` | AngularJS | **Inc-1** |
| `/hotels` | `hotels` | AngularJS | Inc-2 |
| `/itinerary` | `itinerary` | AngularJS | Inc-3 |
| `/travel-request` | `travelRequest` | AngularJS | Inc-4 |
| `/expenses` | `expenses` | AngularJS | Inc-5 |

Plus `/__shell` — a **non-product** health route that React does own. It exists
so Increment 0 can prove React mounted and routed without owning any screen a
baseline scenario observes.

---

## 5. The routing rule, in order

Implemented as one pure function, `decide()`, in
[`src/lib/front-door.ts`](../../src/lib/front-door.ts) — extracted from the Vite
config **specifically so it can be unit-tested**, because increments 1–5 depend
on it being right.

| # | Request | Decision |
|---|---|---|
| 1 | `/@vite/*`, `/src/*`, `/node_modules/*` | `vite-internal` — untouched, or the dev server cannot boot |
| 2 | `/api/*` | `proxy-to-api` → `:3000`, shared by **both** apps |
| 3 | `/__shell` | `react` |
| 4 | ledger row, `owner: 'react'` | `react` |
| 5 | ledger row, `owner: 'angularjs'` | `redirect-to-legacy-hash` → `/#!/…` |
| 6 | anything else (`/`, `/assets/*`, `/components/*`, `/bower_components/*`) | `proxy-to-legacy` → `:8080` |

Rule 6 is what serves the legacy document itself. A request for `/#!/flights`
arrives at the server as plain `/`, so it lands here and gets the AngularJS
`index.html` — which then routes on the fragment client-side.

**Observed, through the running front door:**

```
/                 200      AngularJS
/login            302   -> /#!/login
/dashboard        302   -> /#!/dashboard
/flights          302   -> /#!/flights
/hotels           302   -> /#!/hotels
/itinerary        302   -> /#!/itinerary
/travel-request   302   -> /#!/travel-request
/expenses         302   -> /#!/expenses
/__shell          200      React
/api/airports     200      (mock API)
```

---

## 6. How an increment moves a route

**Increment 1 changes one word.**

```diff
- { path: '/flights', …, owner: 'angularjs', migratesIn: 'Inc-1' }
+ { path: '/flights', …, owner: 'react',     migratesIn: 'Inc-1' }
```

That single edit simultaneously:

- stops the front door redirecting `/flights` to the legacy hash,
- starts Vite serving the React document for `/flights`,
- flips the ledger assertions in the shell test suite,
- and changes **nothing** for the other six routes.

The user-facing address `/flights` is **identical before and after**. Only the
answerer changes. That is the property that makes the ledger row the unit of
progress, of review, and of rollback.

This is pinned by tests, not by hope — `front-door.test.ts` builds a hypothetical
post-Inc-1 ledger and asserts both that `/flights` moves *and* that every other
route stays exactly where it was.

### Rollback

The same edit in reverse. One word, one line. That is the entire rollback story,
and it is why the increment plan (§2.3) requires the ledger flip and the deletion
of the legacy route to be **two separate commits** — between them the legacy
implementation still exists and the row can be flipped back.

---

## 7. What deliberately does *not* happen

- **No in-page interop bridge.** The two apps never co-render. Crossing between
  them is a full document navigation, so the browser tears the outgoing app down
  before the incoming one boots. There is no `$rootScope`-to-React-state bridge,
  no dual router, and no Restangular/`fetch` coexistence layer — and none of it
  has to be written, or later deleted.
- **Shared state crosses only two ways:** `localStorage` (the JWT) and the
  server. Both are origin-scoped or global, which is why §2 matters.
- **The legacy app keeps working standalone.** `npm start` still serves it on
  `:8080` with no front door involved. The baseline suite talks to `:8080`
  directly and never goes through Vite — which is why Increment 0 cannot break
  it.

---

## 8. Running it

```bash
npm start          # legacy AngularJS :8080  +  mock API :3000   (unchanged)
npm run shell:dev  # the front door :5173  — use this one
```

Ports are kept deliberately separate — Grunt `connect` on `:8080`, LiveReload on
`:35729`, Vite on `:5173`, preview on `:4173`. Putting Vite on `:8080` would mean
`npm start` and the React dev server could not run at the same time, and both are
needed for the whole of increments 1–5.

Configuration comes from `.env` (copy `.env.example`); there is **no hardcoded
API origin anywhere in `src/`** — that was finding A-5, and it is now enforced by
a test asserting the config reader *throws* when the variable is missing.
