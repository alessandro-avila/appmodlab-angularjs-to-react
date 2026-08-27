# ADR-018 — Session-expiry policy: a rejected session is told so and returned to the login screen

- **Status:** proposed — decided at the Inc-3 PR Review gate
- **Date:** 2026-08-27
- **Phase:** 2 → increment 3 (`itinerary`)
- **Deciders:** product owner, orchestrator
- **Supersedes:** the itinerary 401 behaviour pinned by `authentication.feature:207` and `:215`
- **Depends on:** ADR-005 (follow-on decision 5), **ADR-010** (the authentication surface moves to the
  cutover increment), ADR-013 (the store), increment plan **§4.2**, **§7.4**, **§13 item 12**
- **Answers:** increment plan **§13 item 12** — the session-expiry policy, left open by Increment 0

## Context

Increment 0 built the 401 *mechanism* and deliberately stopped short of the *policy*. Both files say
so in as many words:

> `src/lib/api-client.ts:109` — *"The 401 path (plan §4.2). Clearing the session is the MECHANISM;
> what the UI does about it is the session-expiry POLICY, still open (§13 item 12)."*

> `src/stores/auth-store.ts:140` — *"…the session-expiry POLICY, which is still open (plan §13 item
> 12) **and is needed by Inc-3**. This is the mechanism only."*

Increment 3 is where it becomes observable, and it becomes observable **by construction** rather than
by choice. The chain is three links long and entirely pre-existing:

1. `api-client.ts:111` — a 401 calls `deps.onUnauthorized()`
2. `auth-store.ts:143` — `handleUnauthorized()` calls `clearSession()`, a real store mutation
3. `require-auth.tsx:39` — the guard subscribes through the store, so the mutation re-renders it and
   it returns `<Navigate to="/login" replace />`

The itinerary is the first React route that **fetches on mount**. Flight-search and hotel-booking only
call the API after the user acts, so neither has ever exercised this path — there is no scenario in
the suite today that puts a rejected token against a React route.

### What the legacy did

`itinerary.controller.js:47-49` catches every failure identically, whatever the status:

```js
}).catch(function(err) {
  $scope.errorMessage = 'Failed to load trips. Please try again.';
  $rootScope.$broadcast('notification:add', 'Failed to load itinerary', 'error');
})
```

`trips` stays `[]`, so the template's empty state renders. The traveller is shown **"No trips yet —
Book a flight or hotel to get started!"** and a red notice about *data*. Nothing anywhere says the
session was rejected. `authentication.feature:207` pins this precisely, ending with *"nothing on the
page tells me my session is the problem"*.

That is the behaviour under discussion. It is not a cosmetic defect: a user whose session has expired
is told they have no trips, which is a false statement about their data.

## Decision

**A 401 is treated as a session event, not a data event.** On any 401:

1. the session is cleared — unchanged, this is the Increment 0 mechanism;
2. a notification is raised that names **the session**: *"Your session has expired. Please sign in
   again."*;
3. the reactive guard returns the traveller to the login screen.

The traveller is never shown an empty-state screen that misdescribes their data as absent.

## Consequences

### Superseded — 2 scenarios

| Line | Scenario | Becomes |
|---:|---|---|
| `:207` | *A rejected session looks like an empty itinerary* — `"No trips yet"`, *"nothing on the page tells me my session is the problem"* | The traveller is returned to the login screen and told the session expired. |
| `:215` | *A rejected session raises a failure notice that names the data, not the session* — `"Failed to load itinerary"` | The notice names the session. |

### Plan §7.4 expected a third. It is wrong, and `:220` is preserved

§7.4 lists `:220` *Losing my session mid-visit leaves the page on screen* as superseded here. It is
not, and the mechanism says why:

- `isAuthenticated()` is `!!safeReadToken()` — it reads `localStorage` **live**, identically to
  `auth.service.js:43`.
- But `RequireAuth` re-renders only when the **store** changes. The scenario's
  `When my session token is taken away` calls the harness's `clearToken()`, which writes to
  `localStorage` from outside the app. No store mutation occurs, so nothing re-renders.

The page therefore stays on screen, exactly as the baseline pins, and `:226` *The next move … sends me
to the login screen* still passes because the guard re-evaluates on navigation. **`:220` and `:226`
are preserved, not superseded.** The distinction is real: this policy fires when *the app itself*
learns the session is bad, not when a token vanishes behind its back.

### Scope

This policy governs the 401 path only. It does not touch the presence-only `isAuthenticated()`
predicate, which stays defective on purpose until Q-8 / ADR-010 at the cutover increment. A planted
junk token still opens every screen; what changes is only what happens when the **server** rejects it.

`authentication.feature:199` — *A rejected session looks like an empty expense account* — is
**untouched**, because expenses is still AngularJS. It supersedes when that module migrates in
Increment 5, and until then the suite deliberately holds both behaviours at once.

## Alternatives considered

**Stay on the page and show a session banner.** Rejected: the guard is already reactive and already
redirects, so staying would mean *suppressing* Increment 0's mechanism to preserve a behaviour nobody
defends. It would also leave a screen whose data cannot be refreshed.

**Keep the legacy behaviour until the cutover increment (ADR-010).** Rejected on the plan's own
reasoning (§7.4): deferring it *"would leave Inc-3 shipping a React itinerary that either silently
keeps the old broken 401 behaviour, or turns three scenarios red with nothing in the plan expecting
it"*. Both outcomes are worse than deciding it here, where it is forced and visible.
