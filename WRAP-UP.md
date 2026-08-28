# ✅ GlobalTravel Corp — the finished React application

This branch is the **end state** of the AngularJS → React modernisation. AngularJS is gone.
This is the application you run.

If you want to know *how* it got here, every step is documented on `main` under
[`docs/lab/`](docs/lab/README.md). This page is the summary.

---

## ▶️ Run it

```bash
npm install
npm start
```

Open **http://localhost:5173**

| Account | Email | Password |
|---|---|---|
| Employee | `demo@globaltravel.com` | `password` |
| Manager | `manager@globaltravel.com` | `password` |

`npm start` runs the mock API on `:3000` and Vite on `:5173`. There is no `:8080` — the
AngularJS static server was removed at the cutover.

```bash
npm test              # 459 unit tests
npm run test:baseline # 258 Gherkin scenarios (needs npm start running, ~11 min)
npm run verify        # typecheck + lint + unit + build
npm run build         # production build → dist-react/
```

Full instructions, including how to run the AngularJS original for comparison, are in
[Running the apps](docs/lab/running-the-apps.md).

---

## 📊 What changed

| | Before | After |
|---|---|---|
| Framework | AngularJS 1.6 (EOL Jan 2022) | **React 19** |
| Language | JavaScript, no types | **TypeScript** (strict) |
| Build | Grunt + Bower | **Vite 8** |
| Routing | UI-Router, hash URLs | **react-router 8**, real paths |
| State | `$scope` + `$rootScope` events | **Zustand** stores |
| HTTP | `$http` + a hand-rolled service | **`fetch`** + **Zod** validation at the boundary |
| Dates | Moment.js, loose parsing | **date-fns**, explicit parsing |
| DOM | jQuery in controllers | React rendering only |
| Tests | Karma + Jasmine — **11/11 failing** | **459 unit + 258 scenarios, all green** |
| Specs | none | PRD, 6 FRDs, contracts, **24 ADRs** |

**975 files and 384,709 lines of AngularJS and its build chain were deleted.**

---

## 🧱 How it is built

```
src/
  main.tsx            entry point — mounts React
  App.tsx             router configuration
  routes/             one file per URL (11)
  features/           the five business features (15)
  components/         shared UI: modal, confirm dialog, notifications, auth guard
  stores/             Zustand: auth, notifications
  lib/                api client, query cache, route ledger
  types/              Zod schemas — the contract with the API
  styles/             app.css
```

Six routes, all React: `/login`, `/dashboard`, `/flights`, `/hotels`, `/itinerary`,
`/travel-request`, `/expenses`.

**22 components, 28 supporting modules, 0 JavaScript files.**

The mock API in `api-mock/` is **byte-identical to the day the migration began**, apart from
three authorised fixes. It was the stable seam the whole rewrite was built against.

---

## ✅ What works

All five features reached parity, verified in a browser screen by screen:

- **Flights** — search, price/stops/airline/time filters, three sort orders, booking
- **Hotels** — search, amenity filters, sorting, room selection, booking
- **Itinerary** — trip list, cost summary, list & timeline views, printing, and the four
  status filters that were **dead in AngularJS**
- **Travel Requests** — submission, validation, live cost roll-up, status filtering
- **Expenses** — reports, line items, categories, currencies, receipts

Plus three things the original could not do: **real credential validation**, **sign-out**,
and **signing in as a second user** (the original hardcoded one).

---

## 🐛 Known and deliberate

- **JWT is stored in `localStorage`** — carried over from the original. Recorded as
  `RISK-001`, accepted, owner `@alessandro-avila`. Not a defect; a documented risk.
- **Submitted expense reports are stored as drafts** — `SEAM-4`, a mock-API limitation.
- **The itinerary uses `window.confirm`** where two other screens use a React dialog.
- **Bootstrap 3 is vendored** into `public/vendor/` rather than managed as a dependency.
- **`flight-search.feature:183` asserts only a message prefix.** Tracked as `FOLLOW-1` —
  it is why a real defect survived six increments.

Four presentation defects found *after* the suite went green were repaired under
[ADR-024](specs/adrs/adr-024-presentation-defect-repairs.md). Three of them had been
shipping in the AngularJS original for years.

---

## 🧭 Where the reasoning lives

| | |
|---|---|
| `specs/adrs/` | 24 Architecture Decision Records — every significant choice, with alternatives |
| `specs/frd-*.md` | 6 Feature Requirement Documents |
| `specs/features/` | 258 Gherkin scenarios |
| `specs/increment-plan.md` | how the work was ordered |
| `specs/tech-stack.md` | every resolved version, with rationale |
| `docs/lab/` (on `main`) | the 15-step walkthrough of how this was done |

---

## 💡 The three things worth remembering

1. **The API was never touched.** `api-mock/` is byte-identical, and 14 API-only scenarios
   were never re-pointed across six increments. A stable seam is what makes an incremental
   rewrite possible.

2. **Tests pinned behaviour, not intentions.** The baseline captured what the app *did* —
   including its bugs. That is what let six increments land without silent drift, and it is
   also why four presentation defects survived: every assertion reads `innerText`.

3. **Escalating beat guessing, every time.** Wherever the specification and the code
   disagreed, the work stopped and asked. Five contradictions were caught that way; each
   would have propagated through every later increment.

---

<sub>Built with GitHub Copilot CLI using the spec2cloud brownfield pathway.
Total model cost: **~$1,174** — see [the breakdown](docs/lab/token-economics.md).</sub>
