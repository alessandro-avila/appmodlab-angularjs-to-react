# ▶️ Running the apps

[← Back to the lab index](./README.md)

Two applications live in this repository: the **AngularJS original** and the **React
rewrite**. They are on different branches. Both use the same mock API, so you can run
either one and see identical data.

---

## 🅰️ The AngularJS original

```bash
git switch lab/00-spec2cloud-init
npm install
npm start
```

Open **http://localhost:8080**

`npm start` runs the mock API on `:3000` and serves the app with Grunt on `:8080`.
`bower_components/` is committed, so there is no `bower install` step.

**Tests**

```bash
npm test          # Karma + Jasmine
```

> ⚠️ **11 of 11 specs fail, by design.** That is the starting condition of the lab, not a
> broken checkout — see [Step 01](01-b1-extract.md).

---

## ⚛️ The React rewrite

```bash
git switch lab/final-solution     # or lab/14-cutover
npm install
npm start
```

Open **http://localhost:5173**

`npm start` runs the mock API on `:3000` and Vite on `:5173`. There is no `:8080` — the
AngularJS server was removed at the cutover.

**Tests**

```bash
npm test              # 459 unit tests (Vitest)
npm run test:baseline # 258 Gherkin scenarios (Cucumber + Playwright) — needs npm start running, ~11 min
npm run verify        # typecheck + lint + unit + build
```

**Production build**

```bash
npm run build     # outputs dist-react/
npm run preview   # serves the build on :4173
```

---

## 🔑 Signing in

Both apps accept the same accounts:

| | Email | Password |
|---|---|---|
| Employee | `demo@globaltravel.com` | `password` |
| Manager | `manager@globaltravel.com` | `password` |

Only the React app validates credentials — the AngularJS original accepts anything and
logs in as a hardcoded user.

---

## 🧪 A five-minute walkthrough

Works on either app. The React version is at `:5173`, the original at `:8080`.

1. **Sign in.** On React, try a wrong password first — you get *"Email or password is
   incorrect."* The original has no rejection path at all.
2. **Flights** — search `SFO` → `JFK` with both dates. Then drag **Max Price**, set
   **Stops → Non-stop**, and click **PRICE** / **DURATION** to re-sort.
3. **Hotels** — search `New York` with both dates, then **VIEW ROOMS** to expand the room
   table.
4. **Itinerary** — pick a trip and use the **All / Confirmed / Pending / Cancelled**
   filters. These do nothing in the original; they work in React.

   > **PRINT** opens the browser's print dialog and will block the tab until you close it.
5. **Travel Requests** — **NEW REQUEST**, submit empty to see validation, then fill the
   cost fields and watch the total roll up.
6. **Expenses** — **NEW REPORT**, add a line item or two.

**Sign Out** is in the navbar on every screen (React only).

---

## ♻️ Resetting the data

The mock API keeps everything in memory and has no reset endpoint. To get a clean slate,
**restart `npm start`** — that reseeds the fixtures.

---

## 🔎 Confirming which app you are running

Open the browser console:

```js
typeof angular    // AngularJS: "object"   ·   React: "undefined"
```

Or check the URL — `:8080` is the original, `:5173` is React.

To confirm the API is reachable from the app:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/api/airports   # expect 200
```

On Windows PowerShell use `curl.exe` and `-o NUL`.
