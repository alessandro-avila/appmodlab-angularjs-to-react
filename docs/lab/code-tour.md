# 🔬 Is this really React? — a code tour

[← Back to the lab index](./README.md)

A reasonable question after a migration: **how do I know the AngularJS is actually gone,
and that these are real React components rather than a thin wrapper?**

Here is how to check, from the outside in. Run these on `lab/final-solution`.

```bash
git switch lab/final-solution
```

---

## 1️⃣ The fastest check: the browser console

Start the app (`npm start`), open **http://localhost:5173**, and open DevTools:

```js
typeof angular      // "undefined"
typeof jQuery       // "undefined"
typeof moment       // "undefined"

// AngularJS leaves fingerprints in the DOM. Count them:
document.querySelectorAll('[ng-model],[ng-repeat],[ng-click],[ui-view],[ui-sref]').length   // 0
document.querySelectorAll('.ng-scope,.ng-binding,.ng-pristine').length                      // 0

// React leaves its own. The fiber is attached to the root node:
Object.keys(document.getElementById('root')).find(k => k.startsWith('__react'))
// → "__reactContainer$..."
```

`angular` is undefined, no `ng-*` anywhere, and a React fiber on `#root`. That is not a
wrapper — nothing AngularJS is loaded at all.

Check what the page actually pulls in:

```js
[...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))
// → ["/@vite/client", "/src/main.tsx"]
```

Two scripts. In the original there were **fourteen**.

---

## 2️⃣ The dependency list

```bash
node -e "const p=require('./package.json'); console.log(Object.keys(p.dependencies).join(', '))"
```

```
body-parser, cors, date-fns, express, jsonwebtoken,
react, react-dom, react-router, zod, zustand
```

No `angular`, `jquery`, `moment`, `lodash`, `restangular`, `bower`, `grunt`, or `karma`.
`express` and friends are the mock API, not the app.

And the legacy build chain is gone from disk entirely:

```bash
ls app bower_components Gruntfile.js bower.json    # all: No such file or directory
```

---

## 3️⃣ The source tree

```
src/
  main.tsx        entry point — createRoot(...).render(<App />)
  App.tsx         router configuration
  routes/         one file per URL          (11)
  features/       the five business features (15)
  components/     shared UI                  (4)
  stores/         Zustand state              (2)
  lib/            api client, cache, ledger  (8)
  types/          Zod schemas                (6)
```

Count what is there:

```bash
# 22 components, 28 modules, and zero JavaScript files
find src -name '*.tsx' -not -name '*.test.*' | wc -l
find src -name '*.ts'  -not -name '*.test.*' | wc -l
find src -name '*.js'  | wc -l          # 0
```

Every file is TypeScript. There is no `.js` in `src/` at all.

---

## 4️⃣ The components themselves

Open any feature — say `src/features/flight-search/FlightSearch.tsx`. You will find:

| React idiom | Occurrences across `src/` |
|---|---:|
| `useState(` | 26 |
| `useCallback(` | 34 |
| `useEffect(` | 18 |
| `useMemo(` | 9 |
| Zustand store / `useStore(` | 4 |

And the AngularJS equivalents — `.controller()`, `.directive()`, `.factory()`, `$scope`,
`$http`, `$q` — appear **zero** times in executable code.

### ⚠️ Careful: grep will mislead you here

Search for `$rootScope` in `src/` and you get **31 hits**. They are all in *comments*.

This codebase deliberately documents where each behaviour came from, so almost every file
cites the AngularJS line it replaces:

```ts
/**
 * NOTIFICATION STORE — the React port of the `notification:add` handler at
 * `app/app.js:44-50`.
 *
 *     $rootScope.notifications = [];                       // app.js:41
 *     $rootScope.$on('notification:add', function (...) {
 */
```

There are two other traps:

- `ng-model` matches **`hotel-boo`*`king-model`*`.ts`** — an import path, not a directive.
- `front-door.test.ts` contains the string `/bower_components/angular/angular.js` because it
  **asserts that path is no longer served**.

Of 46 raw matches for AngularJS patterns, **zero are executable code**. Filter comments out
before drawing conclusions:

```bash
# only look at lines that are not comments
grep -rn '\$scope\|\$rootScope\|angular\.' src --include='*.ts' --include='*.tsx' \
  | grep -v '^\s*[0-9]*:\s*[*/]'
```

---

## 5️⃣ The routing table

`src/lib/route-ledger.ts` was the migration's control surface. Every route carries an owner:

```ts
{ path: '/flights', legacyState: 'flights', legacyHash: '#!/flights',
  owner: 'react', migratesIn: 'Inc-1', requireAuth: true },
```

During the migration a route read `owner: 'angularjs'` until its increment landed, then
flipped to `'react'`. Today:

```bash
grep -c "owner: 'react'"     src/lib/route-ledger.ts   # 7
grep -c "owner: 'angularjs'" src/lib/route-ledger.ts   # 0  (only a comment example)
```

**All seven routes are React-owned.** That file is the single most direct answer to the
question.

---

## 6️⃣ Old pattern → new pattern

Useful when reading the code with AngularJS in mind:

| AngularJS | React equivalent | Where |
|---|---|---|
| `.controller()` + `$scope` | function component + `useState` | `features/*/[Feature].tsx` |
| `.factory()` service | plain module functions | `features/*/[feature]-model.ts` |
| `$http` | `fetch` wrapper + **Zod** parse | `lib/api-client.ts` |
| `$rootScope.$on/$broadcast` | Zustand store subscription | `stores/notification-store.ts` |
| `.directive()` | component | `components/*.tsx` |
| `.filter()` | plain function | `features/*/[feature]-model.ts` |
| UI-Router `$stateProvider` | `react-router` route objects | `App.tsx`, `routes/` |
| `ng-repeat` | `array.map()` in JSX | throughout |
| `ng-click` | `onClick` | throughout |
| `ng-model` | `value` + `onChange` | throughout |
| `ng-if` / `ng-show` | `{cond ? … : null}` | throughout |
| jQuery DOM writes | React rendering | *removed entirely* |
| Moment.js | `date-fns` | `lib/`, models |

Note the split that did not exist before: each feature has a **`.tsx` for rendering** and a
**`-model.ts` for logic**. The model files hold no React at all, which is why they can be
unit-tested directly — that separation is where most of the 459 unit tests live.

---

## 7️⃣ Provenance is written down

The strongest evidence is not a grep result. Open almost any file and you will find the
legacy line it replaces, and the ADR that authorised any difference:

```ts
// controller:220 — the legacy code read `confirmationCode` from a payload
// that carries `confirmationNumber`, so it showed "Confirmation: undefined".
// Repaired under ADR-024 D-3; see bookedNotification().
```

Every behavioural difference between the two applications is traceable to a numbered
decision in [`specs/adrs/`](https://github.com/alessandro-avila/appmodlab-angularjs-to-react/tree/lab/final-solution/specs/adrs).
That is the real proof this was a migration rather than a rewrite that happened to land in
roughly the same place.

---

## ✅ The one-minute version

| Check | Expected |
|---|---|
| `typeof angular` in console | `undefined` |
| `ng-*` attributes in DOM | `0` |
| React fiber on `#root` | present |
| `<script src>` count | 2 |
| `.js` files in `src/` | `0` |
| `owner: 'react'` in the route ledger | `7 / 7` |
| `app/`, `bower_components/`, `Gruntfile.js` | do not exist |

If all seven hold, there is no AngularJS left to hide.
