# Karma retirement — the 19-to-N mapping

> **ADR-008 §2:** *"The 19 tests are retired as `FlightSearchController` is
> retired, in Inc-1, and are replaced in the same increment by React unit tests
> covering the same assertions. Inc-1 does not close until the replacement
> assertions exist and pass."*
>
> **Increment plan §5.6 exit criterion:** *"All 19 Karma assertions have a
> named, passing React replacement (auditable list at the gate)."*

This is that list.

## Why they were retired now, and not earlier or later

`test/spec/flight-search.spec.js` instantiates `FlightSearchController` through
`angular-mocks`. Increment 1 deletes that controller, so all 19 tests fail with
`[$controller:ctrlreg]` the moment the module is removed — verified:

```
HeadlessChrome 151.0.0: Executed 19 of 19 (19 FAILED) ERROR
Error: [$controller:ctrlreg] .../$controller/ctrlreg?p0=FlightSearchController
```

They could not be kept, and they were not deleted silently. Each one is
accounted for below.

> **Q-11 context.** ADR-002 recorded that this suite was **stale and carried no
> authority**: 11 of its 19 tests were already failing before any migration
> work, because four of its assertions describe a client redesign that was never
> written (`popularRoutes`, a `POST` flight search, a `{ airlines, priceRange }`
> filter shape). The green baseline, not this suite, is the specification. The
> replacements below assert what the application **does**.

## The mapping

`M` = `src/features/flight-search/flight-search-model.test.ts`
`C` = `src/features/flight-search/FlightSearch.test.tsx`

| # | Karma assertion | Replaced by | Where |
|---|---|---|---|
| 1 | should initialize with default search params | *starts as a round trip with one economy passenger and no dates* | C |
| 2 | should initialize with empty results | *shows no results before a search* | C |
| 3 | should set loading to false after init | *is not loading after mounting* | C |
| 4 | should not request anything on init | *requests nothing on init* | C |
| 5 | should not offer popular routes | *offers no popular routes* | C |
| 6 | should initialize the filters the screen actually offers | *offers exactly the filters the screen has, and only after a search* | C |
| 7 | should validate required fields before searching | *refuses a missing origin* · *refuses a missing destination* · *refuses a missing departure date* · *checks the route BEFORE the dates* · *refuses to search until origin and destination are given* | M, C |
| 8 | should search for flights with valid params | *searches with the parameters entered and lists what comes back* | C |
| 9 | should refuse a round trip without a return date | *refuses a round trip with no return date* (model) · *refuses a round trip with no return date* (component) | M, C |
| 10 | should handle search errors gracefully | *handles a failure without crashing, and says so* | C |
| 11 | should reset the maximum price filter to the dearest result | *resets the maximum price filter to the top of the new range* · *settles the filter BELOW the dearest flight — feature:118* | C, M |
| 12 | should filter by airline | *filters by exact airline* | M |
| 13 | should filter by number of stops | *treats the stops filter as "at most", not "exactly"* | M |
| 14 | should treat the stop filter as an upper bound | *treats the stops filter as "at most", not "exactly"* · *combines filters* | M |
| 15 | should sort flights by price | *sorts ascending by default and descending when reversed* · *sorts by duration* · *sorts by departure time as a 24-hour clock* | M |
| 16 | should reverse the order when the same column is chosen twice | *reverses the column already sorted* · *toggles back on a third click* | M |
| 17 | should select a flight and broadcast event | *opens the details of the flight chosen* · **_does NOT announce `flight:selected` — the event is dropped, not ported_** | C |
| 18 | should push the return date out when departure passes it | *pushes the return date to the day after when departure moves past it* (model) · *pushes the return date out when the departure date passes it* (component) | M, C |
| 19 | should clear the return date when the trip becomes one way | *clears the return date when the trip becomes one way* · *keeps the return field in the DOM when hidden, as ng-show did* | C |

**19 retired → 68 replacement assertions** (49 model + 19 component), all passing.

## The one assertion whose MEANING was inverted, deliberately

**#17, "should select a flight and broadcast event."**

The Karma test asserted that selecting a flight calls
`$rootScope.$broadcast('flight:selected', flight)`. The React replacement
asserts the **opposite** — that no such announcement is made.

That is not a weakened test; it is the correct one, and it is authorised:

- **ADR-013** maps `flight:selected` to **no store concern**. It is *dropped,
  not ported*.
- Increment plan **§2.4** explains why: the event's only listener was the
  hotel-booking controller, and the two controllers were never alive at the same
  time, so the pre-fill **never happened**. A React store could trivially make it
  work — which would be a user-visible behaviour change that nothing authorises.
- `hotel-booking.feature:209` pins the absence, and Increment 2 must satisfy it
  **by construction**: there is no pre-fill mechanism at all.

Asserting the absence is what stops the pre-fill being implemented by accident in
a later increment.

## What replaces `npm test`

| Before | After |
|---|---|
| `npm test` → Karma + Jasmine, 19 AngularJS tests | `npm test` → Vitest, the React suite |
| `npm run test:watch` → Karma watch | `npm run test:watch` → Vitest watch |
| `npm run test:baseline` → Cucumber + Playwright | **unchanged** |

Removed from `devDependencies`: `karma`, `karma-jasmine`,
`karma-chrome-launcher`, `jasmine-core`.
Deleted: `test/spec/flight-search.spec.js` (416 lines), `test/karma.conf.js` (75).

`angular-mocks` stays in `bower.json`, which is **untouched** until cutover.
