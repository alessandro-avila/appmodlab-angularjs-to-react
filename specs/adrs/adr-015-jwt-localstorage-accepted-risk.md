# ADR-015 — The JWT stays in `localStorage`: an accepted, owned, unresolved risk

- **Status:** accepted — **the risk it records remains OPEN**
- **Date:** 2026-08-25
- **Phase:** P → `tech-stack-resolution`
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** ADR-005 (server survives unchanged; Security rejected as a *separate* path but
  recommended as a follow-on), ADR-002 (**Q-8**, **Q-12**), ADR-003 (constraint **C-1**), ADR-013
  (the store is the read model; this is the persistence), increment plan §1.2, §10.4, §13 item 13
- **Answers:** increment plan §13 item 13

> **This ADR does not fix anything.** It records a decision to *not* fix something, the reasons that
> decision is defensible today, the conditions under which it stops being defensible, and the person
> accountable for revisiting it. It is written because §10.4 requires that the retention be
> *"deliberate, not by omission"*, and because a risk that is never written down is indistinguishable
> from a risk nobody noticed.

## Context

### What exists today, measured

`localStorage['authToken']` is the application's **only durable session artefact** (NFR-F001-001):

| | Site |
|---|---|
| Written | `app/services/auth.service.js:22` |
| Removed | `app/services/auth.service.js:33` (in `logout()`, which **has no callers**) |
| Read | `app/services/auth.service.js:43`, `app/app.js:21` |

Nothing else in `app/` touches browser storage. The Restangular interceptor (`app/app.js:20-28`)
reads the key on every request and sets `Authorization: Bearer …`.

### The surrounding weaknesses, so this one is not judged in isolation

Four are recorded as NFRs and one was proven by execution at the baseline gate:

| Ref | Finding | Disposition |
|---|---|---|
| NFR-F001-002 | Credentials compared in plaintext against a seed array, transmitted over `http://` | **Server-side.** ADR-005 defers to the post-migration Security path. |
| NFR-F001-003 | `var JWT_SECRET = 'globaltravel-secret-key-2024'` (`api-mock/server.js:13`) | **Server-side.** Same deferral. |
| NFR-F001-004 | Authorisation is authentication only — the `role` claim is never consulted | **Q-1**: expected at this stage. |
| NFR-F001-005 | Ownership never evaluated; every collection returns everything | **Q-7**: scheduled inside the migration. |
| Executed | **The guard tests token presence, not validity.** A planted `not-a-real-jwt` opens `/expenses` and `/itinerary` in full. | **Q-8 / ADR-010**: the real guard ships in Inc-6. |

The last row deserves emphasis: **today, the storage mechanism is not the weakest link in this
system.** An attacker does not need to steal a token, because any non-empty string under that key
opens every screen. That changes during the migration — Inc-6 ships a guard that validates — which is
precisely when the storage question becomes worth asking.

### Why the mechanism cannot simply be changed mid-migration

This is the constraint that makes retention **required** rather than merely tolerated, and it is
structural rather than a matter of appetite.

**§1.2 — one origin, because `localStorage` is origin-scoped.** The plan's whole no-bridge design
rests on the two clients sharing a browser origin so that a user signed in on the AngularJS side
arrives at a React route already authenticated:

> Shared state survives the crossing only through `localStorage` (the JWT) and the server.

**§4.4 — Inc-0 deletes and modifies nothing under `app/`.** *"**Deleted** — **nothing.** Not one file
under `app/`, not one line of `bower.json` … This is the increment where 'clean up while we're here'
does the most damage."* Inc-0's exit criteria include `git diff --stat -- app/` returning empty.

Moving the token to an `httpOnly` cookie would require the AngularJS interceptor at `app/app.js:20-28`
to stop reading `localStorage` — a modification to legacy source that Inc-0 forbids and that every
subsequent increment would have to carry. It would additionally require `api-mock/server.js` to issue
`Set-Cookie`, CORS to run with credentials, and a CSRF defence to appear — server changes that ADR-005
places outside this work: *"`api-mock/server.js` — **unchanged in structure**."*

**So for Inc-0 through Inc-5, `localStorage` is not a choice. It is a load-bearing element of the
migration's architecture.** The choice is real only from Inc-6, when `app/` is deleted.

## Decision

**The JWT remains in `localStorage` under the key `authToken` for the entire duration of this lab,
including after cutover. The React client reads and writes the same key the AngularJS client uses.
This is recorded as an accepted risk with a named owner. It is not resolved, and it is not silent.**

### What this means concretely

- The React token store (Inc-0, §4.2 *"auth plumbing, no auth surface"*) reads `localStorage['authToken']`
  — the same key, so a session established on either client is honoured by the other.
- `authentication.feature:95` *"Entering the portal stores a session token"* is **PRESERVE** and stays
  green through Inc-6. §10.4 already states this: *"JWT-in-`localStorage` is preserved deliberately,
  not by omission."*
- ADR-013 governs the in-memory read model; this ADR governs the persistence. Sign-out and the 401
  path clear **both**, from one function, so a cleared store cannot coexist with a surviving token.

### The risk, stated without softening

`localStorage` is readable by any JavaScript executing on the origin. **A single successful XSS gives
an attacker the bearer token, which is valid for 24 hours (`api-mock/server.js:286`), cannot be
revoked (the server holds no session state and `POST /api/auth/logout` returns a message and nothing
else, `:295-297`), and carries the user's identity and role claims.** An `httpOnly` cookie would make
the token unreadable to script, converting token theft into a session-riding attack that is bounded by
the browser rather than exportable.

**One honest nuance, offered as context and not as mitigation:** the React client will present a
materially smaller XSS surface than the one it replaces — React escapes interpolated content by
default, and ADR-007 removes **46 direct DOM-manipulation sites** including the jQuery-driven
validation and modal handling. That lowers the *likelihood*. It does not touch the *consequence*, and
the consequence is what this ADR is about.

### Why acceptance is defensible **today**

1. **Nothing is deployed.** **Q-12** removed production deployment from scope. There is no origin an
   attacker can reach, no user session to steal, and no real data behind the token — the seed array
   holds two fictional users with the password `password`.
2. **The migration requires it** through Inc-5, per §1.2 and §4.4 above.
3. **It is not the binding constraint.** Until Inc-6 ships a validating guard, the token's storage is
   irrelevant to an attacker who can type any string into that key and reach every screen.
4. **The correct fix is server-side and already scheduled elsewhere.** `httpOnly` cookies, secret
   management and credential hashing form one coherent piece of work. ADR-005 rejected Security as a
   *parallel* path specifically to avoid building things twice, and recommended it *"as a follow-on
   path after the migration completes"*. Doing half of it now, against a client being deleted, is the
   waste ADR-005 argued against.

### Why it is recorded as accepted-and-open rather than resolved

Because the reasons above are **contingent on Q-12**, and Q-12 is a scope decision, not a law of
nature. Every justification in this ADR evaporates the moment something is deployed. A risk whose
justification is *"nobody can reach it"* must be re-examined the instant somebody can, and the only
mechanism that guarantees re-examination is a written owner and a written trigger.

### Owner and triggers

| | |
|---|---|
| **Accountable owner** | **[@alessandro-avila](https://github.com/alessandro-avila)** — the named human decider of record for ADR-001, ADR-002 and this gate. Recorded at the Tech-Stack Review gate on 2026-08-26; `riskRegister.ownerNamed` is now `true`. An ADR whose owner is a role rather than a person is half an owner. |
| **Review artefact** | A new ADR superseding this one. Closing this risk by any other means — a commit message, a checklist tick, a verbal decision — does not close it. |
| **Trigger 1** | **Any deployment, or any reversal of Q-12.** Blocking: the review must complete *before* the first deploy, not after. |
| **Trigger 2** | **Any real user data or real credential entering the system**, including a demo against a live audience with attendee-supplied data. |
| **Trigger 3** | **Completion of Inc-6.** Non-blocking, but this is the moment the §1.2 and §4.4 constraints lift and the choice becomes free. It is also when ADR-005's follow-on Security path opens, which is the natural home for the fix. |
| **Trigger 4** | **Any increment that lengthens the token's life or widens its claims** — a longer `expiresIn`, a refresh token, or additional claims. |

**Standing obligation until then:** `specs/frd-authentication.md` carries this as an open risk with
this ADR referenced, per the §10.5 FRD delta — *"a note recording that `localStorage` persistence is
retained as an accepted risk with a named follow-up."*

## Alternatives considered

### `httpOnly` cookie — rejected now, and it is the correct eventual answer

The real fix: unreadable to script, so XSS cannot exfiltrate it. Rejected for this lab because it is
**not a client decision**. It requires `api-mock/server.js` to issue `Set-Cookie`, CORS to run with
credentials, a CSRF defence to be introduced, and — decisively — the AngularJS interceptor at
`app/app.js:20-28` to be modified during increments that are forbidden from touching `app/`. ADR-005
keeps the server unchanged in structure and defers Security to a follow-on path. **This is the option
Trigger 1 and Trigger 3 exist to bring back.**

### In-memory only, with a refresh token — rejected

Removes the durable artefact entirely, at the cost of losing the session on every reload. Rejected on
two counts. It **breaks §1.2**: a full document navigation between the two clients is exactly a
reload, so an in-memory token would sign the user out at every crossing, and the migration's no-bridge
design would collapse. It also directly contradicts the **ADR-003 C-1** repair scheduled for Inc-6 —
*"Reloading the page keeps my token but forgets who I am"* is being fixed by making identity survive
reload, not by making the token stop surviving it. And a refresh-token flow is a server change of
exactly the kind ADR-005 excludes.

### `sessionStorage` — rejected, and it would have been security theatre

A one-line change, still readable by any script on the origin, so the XSS exposure is **identical**.
It buys only a shorter window, at the cost of signing the user out on every tab close — and it
**breaks §1.2** in the same way as the in-memory option, since it is not shared across a full document
navigation into a new tab. Worse, it would let the project record *"we moved the token out of
`localStorage`"* while changing nothing that matters. Rejected specifically to avoid that sentence
being available.

### Encrypting the token before storing it — rejected

The key would have to live in the same JavaScript that reads it, so any script that can read the
ciphertext can read the key. Obfuscation, recorded here only so that nobody proposes it later as a
mitigation.

### Fixing it now anyway — rejected on sequencing, not on merit

Defensible, and it would close a real hole. Rejected because it cannot be done without modifying the
AngularJS client (§4.4) and the server (ADR-005), and because a fix landed against a client scheduled
for deletion in Inc-6 must then be re-landed against React — building it twice, which is the exact
argument ADR-005 used to reject the parallel Security path.

## Consequences

**Positive.**
- §1.2's one-origin design works with no token hand-off, and no duplicate login screen in Inc-0.
- The React and AngularJS clients honour each other's sessions throughout the migration, which is what
  makes the ledger flippable one row at a time.
- `authentication.feature:95` stays green, so the retention is asserted by a scenario rather than left
  implicit.
- The risk is now **visible, owned and triggered**, which is the actual deliverable of this ADR.

**Negative / accepted — this is the section that must not be skimmed.**
- **An XSS on the portal origin yields a valid 24-hour bearer token that cannot be revoked.** Accepted
  only because **Q-12** means the origin does not exist outside a developer's machine.
- Every justification here is contingent on Q-12. **If Q-12 is reversed, this ADR is wrong from that
  moment**, and Trigger 1 makes the review blocking rather than advisory.
- The token outlives sign-out in one respect that must be understood: clearing `localStorage` removes
  the client's copy, but the server holds no session state, so **a copy already exfiltrated stays
  valid until it expires**. Sign-out is a client-side erasure, not a revocation.
- Retention will look, to a later reader, like an oversight. This document is the countermeasure, and
  it only works if the gate records the owner's name.

**Blocked / unblocked.**
- **Unblocks** Inc-0's token store (§4.2) and §10.4's PRESERVE classification of
  `authentication.feature:95`.
- **Closes** §13 item 13 — as an *accepted, owned, open* risk, which is what item 13 asks for.
- **Does not close** the 401 / session-expiry policy (§13 item 12), needed by **Inc-3**. That policy
  decides what happens when a token is *rejected*; this ADR decides only where the token is kept.
- **Feeds** ADR-005's post-migration Security path, joining NFR-F001-002 (plaintext credentials) and
  NFR-F001-003 (literal `JWT_SECRET`) as its third item.

## Gate checklist

The Tech-Stack Review gate must do all three, or this ADR has not achieved its purpose:

- [x] Record the accountable owner's **name** — not the role — against this ADR in `state.json`.
      → **[@alessandro-avila](https://github.com/alessandro-avila)**, recorded 2026-08-26.
- [x] Confirm the four triggers, and specifically that **Trigger 1 is blocking**.
      → Confirmed. Triggers 1 and 2 are both blocking; 3 and 4 are not.
- [x] Confirm the risk is carried as **open** in `state.json`, not as a decision that closes it.
      → `riskRegister.RISK-001.status` is `OPEN` with `accepted: true`. Closure requires a new ADR
      superseding this one; a commit message, checklist tick or verbal decision does not close it.
