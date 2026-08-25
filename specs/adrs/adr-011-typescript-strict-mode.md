# ADR-011 — TypeScript in strict mode is the target language

- **Status:** proposed — decided at the Tech-Stack Review gate
- **Date:** 2026-08-25
- **Phase:** P → `tech-stack-resolution` (Phase 1d equivalent)
- **Deciders:** product owner, orchestrator
- **Supersedes:** **ADR-005 on the language choice only.** Every other decision in ADR-005 — the
  Modernize path, React 19, the increment shape, the baseline disposition, the rejection of Rewrite /
  Cloud-Native / Security / Performance / Extend / Fix-Bugs — stands unchanged.
- **Depends on:** ADR-005 (path selection), ADR-008 (testing strategy), ADR-009 (explicit date
  parsing), assessment finding **P-7**, increment plan §1.5, §13
- **Related:** ADR-016 (toolchain — the linter consequence of this decision)

## Context

### What changed, and what did not

ADR-005 chose **JavaScript, not TypeScript**, and booked the cost explicitly:

> **JavaScript, not TypeScript, is a deliberate cost.** The repository conventions anticipate shared
> contract types under `src/shared/`. Without a compiler, the API contract cannot be enforced at
> build time. Mitigation: `specs/contracts/api/` remains the normative source, contract shapes are
> documented in JSDoc, and conformance is asserted at the **test** layer — which is where the 15
> server-level scenarios already sit. **This must not be quietly reversed later without a new ADR.**

**The requirement has since been clarified: TypeScript is the landing stack.** That is a change to
the input, not the discovery of an error in the output.

This distinction is worth stating plainly, because the alternative framing is both wrong and
corrosive. ADR-005 did not misjudge. Given a hackathon with no deployment target (**Q-12**), a
4462-line client being replaced wholesale, and no stated language requirement, choosing the lower-
ceremony option and *naming its cost in the same paragraph* was sound reasoning. It identified
precisely the thing that would be lost, proposed a specific mitigation for it, and demanded a new
ADR before the decision could be reversed. This is that ADR, arriving through the door ADR-005 left
open. The procedure ADR-005 specified is the procedure being followed.

What follows therefore supersedes one row of ADR-005's scope table:

| Concern | ADR-005 | ADR-011 |
|---|---|---|
| Language | ES5 → Modern JavaScript (ESM), **no TypeScript** | Modern **TypeScript**, ESM, `strict: true` |

### The boundary this decision does not cross

**The server stays JavaScript.** ADR-005 keeps `api-mock/server.js` (634 lines) *"unchanged in
structure"*, and nothing here disturbs that. TypeScript applies to the **new React client only**.

That is not a footnote — it is the central fact of the second half of this ADR. The API contract runs
between a **type-checked client** and an **untyped server**, and a compiler can only see one side of
it.

### Timing

This decision lands before Increment 0 writes its first file, which is the only moment it is cheap.
`app/` is not being converted — it is being deleted and re-authored (ADR-005). There is no
JavaScript-to-TypeScript migration to perform, no `allowJs` phase, no incremental `// @ts-check`
adoption. The client is authored in TypeScript from its first line or it is not.

## Decision

**The React client is authored in TypeScript with `strict: true`, plus
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Response payloads crossing the HTTP
boundary are additionally validated at runtime against a schema. These are two mechanisms, not one.**

### 1. The compiler configuration

```jsonc
{
  "compilerOptions": {
    "strict": true,                     // the requirement
    "noUncheckedIndexedAccess": true,   // collections[i] is T | undefined
    "exactOptionalPropertyTypes": true, // `field?: T` is not `field: T | undefined`
    "verbatimModuleSyntax": true,
    "target": "ES2022",
    "module": "preserve",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true                      // the bundler emits; tsc only checks
  }
}
```

The two options beyond `strict` are not decoration. Both were chosen against specific findings:

- `noUncheckedIndexedAccess` — every screen in this application renders a collection from the API.
  **P-7 is an indexing defect**: five array elements whose assumed key did not exist.
- `exactOptionalPropertyTypes` — **ADR-009 (3)** requires that *"an absent date renders as absent"*,
  never the literal text `"Invalid date"`. That obligation is about the difference between *absent*
  and *present-and-undefined*. This flag is the compiler-level expression of the same distinction.

**Language version: TypeScript 7.0.2** (GA 2026-08-20 — the Go-native port of the compiler).

Selected over TypeScript 6.0.3, the final JavaScript-implementation release, on one specific ground.
The compiler team's own parity table records *"Same types as TS 6.0"* and *"Same errors, locations,
and messages as TS 6.0"*, and the entire documented breaking-change surface of the port
(`typescript-go/CHANGES.md`) lies in **JavaScript** inference: JSDoc type syntax, expando
declarations, and CommonJS assignment patterns. **This codebase type-checks zero JavaScript files.**
The risk surface is not small here — it is empty by construction, because the one thing TS 7 changed
is the one thing this project does not do.

> **Stated cost, not hidden.** TS 7.0.2 was five days old at the time of writing, and it forces a
> linter change — `typescript-eslint` hard-fails against it (verified: `npm ERESOLVE`, peer
> `typescript ">=4.8.4 <6.1.0"`). **ADR-016** takes that decision and carries the evidence. The
> fallback, if TS 7 proves unstable during Inc-0, is TypeScript 6.0.3 with `typescript-eslint` —
> both verified compatible, and the source *code* does not change under either. The trigger for
> falling back is a compiler defect that blocks Inc-0's exit criteria, not inconvenience.

### 2. What strict mode now enforces

Every claim below was executed against the candidate stack, not inferred. A negative probe of five
deliberate contract violations was compiled with `tsc` under the configuration above:

| # | Violation | Caught | Diagnostic |
|---|---|---|---|
| 1 | Reading a field the contract does not have (`room.id`) | ✅ | `TS2339: Property 'id' does not exist on type …` |
| 2 | Passing a raw string where a parsed `Date` is required — **ADR-009 (1)** | ✅ | `TS2345: Argument of type 'string' is not assignable to parameter of type 'Date'` |
| 3 | Skipping the unparseable-date branch — **ADR-009 (4)** | ✅ | `TS2531: Object is possibly 'null'` |
| 4 | Wrong primitive against the contract (`r.beds * 2`) | ✅ | `TS2362: The left-hand side of an arithmetic operation must be of type …` |
| 5 | Unchecked index access on a collection | ✅ | `TS2322: Type '… \| undefined' is not assignable to type '…'` |

`tsc` exit code **1**, five errors, zero false negatives.

So the specific capability ADR-005 recorded as lost — *"the API contract cannot be enforced at build
time"* — is restored, for the class of defect that is **structural**: field names, arity, primitive
types, nullability, and the reachability of error branches. `specs/contracts/api/` remains the
normative source; the difference is that its shapes are now expressed as declared types that the
compiler reads, rather than as JSDoc comments that nothing reads.

### 3. What strict mode does not buy — and this is the load-bearing paragraph

**Types are erased at runtime. A declared type is a claim about the program, not a check on the
data.** Where the data comes from outside the program, the compiler has nothing to check it against
and will faithfully agree with whatever the type says — including when the type is wrong.

**P-7 is the proof, and it is not hypothetical.** `hotel-booking.template.html:184` repeats
`room in selectedHotel.rooms track by room.id`. `/api/hotels/:id/rooms` returns five objects keyed
`type, price, available, beds, maxGuests` — **no `id`**. All five track-keys are `undefined`, a
duplicate-key set, so AngularJS throws `ngRepeat:dupes` and renders nothing. That is the mechanism
behind *"hotel booking cannot be completed through the UI"*.

The question this ADR must answer honestly is: **would TypeScript have prevented it?** It was tested
against the running API rather than argued:

```ts
interface RoomWithId { id: string; type: string; price: number; /* … */ }

async function fetchRooms(url: string): Promise<RoomWithId[]> {
  const res = await fetch(url, { headers: authHeader() });
  return (await res.json()) as RoomWithId[];   // strict mode: no error
}
```

```
tsc --strict                 -> exit 0, no diagnostics
runtime, live api-mock:
  rooms.length               -> 5
  rooms.map(r => r.id)       -> every element undefined
  new Set(...).size          -> 1        <- the duplicate-key set, reproduced
  Object.keys(rooms[0])      -> ["type","price","available","beds","maxGuests"]
```

**The compiler agreed with the bug.** Worse: had a type been *generated* from a contract that claimed
rooms carry an `id`, every downstream consumer would have type-checked cleanly while indexing a field
that has never existed in any response. Strict mode would have converted a loud runtime failure into
a confident, silent, statically-blessed one.

This is why the following sentence must not appear anywhere in this project's reasoning: *"we have
TypeScript now, so the contract is enforced."* It is enforced **inside** the program. At the edge, it
is asserted and then trusted.

### 4. Where response validation happens

**A schema validates every API response at the point it enters the client, inside the single API
client, before the payload is handed to any caller.** It is not a type. It executes.

- **Location.** The one API client that increment plan §13 item 4 already requires (*"one base URL
  from config, one auth header, one error policy"*). Validation is the fourth thing it owns. There is
  exactly one place a response becomes application data, so there is exactly one place to check it.
- **Direction of derivation.** The TypeScript type is **inferred from the schema**
  (`type Room = z.infer<typeof RoomSchema>`), never declared alongside it. One artefact, so the
  checked thing and the claimed thing cannot drift. A hand-written type sitting next to a schema is
  P-7 waiting to recur.
- **Source of truth.** `specs/contracts/api/` — unchanged from ADR-005, and now with a second
  consumer.
- **Failure policy.** A response that fails validation is an error, surfaced through the client's
  single error policy. It does not reach a component. This closes **P-8** at the boundary: today
  `.then` appears nine times across the five services and `.catch` zero times.
- **Package.** `zod@4` (see `specs/tech-stack.md`). Verified against the live API:

```
schema derived from the wrong contract (id: string) -> ok=false, 5 issues:
    "0.id: Invalid input: expected string, received undefined"   … through 4.id
schema derived from the real payload                -> ok=true
```

The wrong contract fails **at the boundary, once, with the field named**, instead of surfacing as an
empty table five layers away.

> **The reason this is not optional here.** The server is JavaScript and stays JavaScript (ADR-005).
> No compiler checks that `api-mock/server.js` returns what `specs/contracts/api/` says it returns.
> P-7 is precisely a contract drift on the server side of the boundary. Typing the client cannot
> detect it; only executing a check can.

**Scope discipline.** This authorises schema validation of **HTTP responses in the API client**. It
does not authorise a form-validation library — increment plan §13 marks that an Inc-4 decision, made
when the travel-request form is visible, and it stays there.

### 5. Which of ADR-005's test-layer obligations are relaxed

ADR-005 imposed three. They are not relaxed as a block, and one of them tightens.

| # | ADR-005 obligation | Disposition |
|---|---|---|
| 1 | *"`specs/contracts/api/` remains the normative source"* | **Retained, unchanged.** It now feeds schemas, which infer types. Its authority is unaffected. |
| 2 | *"contract shapes are documented in JSDoc"* | **Retired.** Superseded by declared types. Retaining it would be actively harmful: TS 7 removed several JSDoc type-syntax features outright, so JSDoc-as-types would now degrade rather than merely duplicate. |
| 3 | *"conformance is asserted at the **test** layer"* | **Split — and this is the substance of this section.** |

Obligation 3 conflated two classes of conformance that this ADR separates:

- **Structural conformance** — does the client read fields that exist, with the right types, handling
  absence? **Relaxed.** It moves to the compiler, which checks it on every build across every call
  site, rather than only where a test happens to look. Tests written *solely* to assert that a
  consumer reads the right field names off a payload are now redundant and should not be written.
  §2's table is the evidence for the relaxation.
- **Runtime conformance** — does the *server actually send* what the contract says? **Not relaxed.
  Strengthened.** It moves from a test-time sample to a schema executed on every response in every
  environment, including production paths no test exercises. P-7 is the argument: this class is
  exactly what typing cannot do, and it is the class that produced the defect.

**Two things do not move at all, and the gate should confirm both:**

1. **The 15 API-only baseline scenarios stay exactly as they are.** Increment plan §1.5 makes them
   *"the continuous control"* across the whole migration — they never open a browser and are the
   invariant that proves the server did not move while the client was replaced. A compiler in the
   client says nothing whatsoever about them. Not one is retired, weakened, or re-pointed by this
   ADR.
2. **ADR-008 is untouched.** No scenario is edited, no test is deleted, and the *"never modify a test
   without human approval"* rule is unaffected. This ADR adds a build-time gate; it removes no
   verification. The **235-scenario green baseline remains the acceptance harness**, exactly as
   ADR-005 established.

> A compiler is not a test. It proves the program is self-consistent. It cannot prove the program is
> correct, and against an untyped server it cannot even prove the program's assumptions are true.
> Everything it does not prove is still owed to the test layer.

## Alternatives considered

### Stay on JavaScript, per ADR-005 — no longer available

The reasoning was sound and is recorded above. It is superseded because its premise — no stated
language requirement — is no longer the case. Nothing in the *technical* argument was refuted; the
input changed.

### TypeScript without `strict` — rejected

`strict: false` permits implicit `any`, which is where a payload lands the moment it is destructured.
Every one of the five diagnostics in §2 depends on strict-family checks. Non-strict TypeScript would
deliver the ceremony of a compiler and roughly the guarantees of JSDoc, which is the worst of both
positions.

### `// @ts-check` with JSDoc types on JavaScript sources — rejected

Historically the low-friction path, and it would have honoured ADR-005's JSDoc mitigation literally.
Rejected on a fact discovered during research rather than on taste: **TS 7 removed a substantial part
of JSDoc type syntax** — `?` unknown-type, Closure function types, `@enum`, `@class`, identifier-named
typedefs, automatic `typeof` insertion. This path is narrowing in the toolchain, not widening.

### Types generated from `specs/contracts/api/`, with no runtime validation — rejected, and it is the dangerous one

Superficially the most spec-faithful option: contracts are normative, so generate types from them and
trust the output. **P-7 is the refutation.** If the contract is wrong — and P-7 is a contract that is
wrong — generation propagates the error into every consumer with the compiler's endorsement. The
defect becomes *harder* to find, not easier, because the one thing that used to make it visible was
that the code looked suspicious. Generated types are safe **only** when something executes against
the real response. That is §4.

### Runtime validation without TypeScript — rejected

Schema validation alone would have closed P-7 and could have been adopted under ADR-005 without any
language change. It is rejected only because the language requirement is now settled; had it not
been, this was the highest-value single change available. Recording it here because it is the option
that shows the two mechanisms are genuinely independent: either can be adopted without the other, and
each covers what the other cannot.

## Consequences

**Positive.**
- Structural contract defects fail at build time, at every call site, in every increment.
- The two hardest ADR-009 obligations — *"an unparseable value is a validation failure"* and *"an
  absent date renders as absent"* — become compiler-enforced rather than review-enforced (§2, rows 2
  and 3).
- Schema-first derivation means one artefact per payload, so the checked shape and the claimed shape
  cannot drift.
- P-8 (nine `.then`, zero `.catch`) is closed twice: by the client's single error policy, and by
  type-aware `no-floating-promises` (ADR-016).
- `noUncheckedIndexedAccess` puts a compiler check on the exact defect class as P-7.

**Negative / accepted.**
- **A compiler creates a temptation to delete tests.** This is the main risk of this ADR, it is
  behavioural rather than technical, and §5 exists to bound it. Only the structural class relaxes.
  The 235 scenarios and the 15 API-only controls are untouched.
- **TS 7.0.2 is five days old**, and it forces the linter decision in ADR-016. Fallback and trigger
  are stated in §1.
- **`react-router@8` requires Node ≥ 22.22.0**; the verification host runs 22.22.2. `engines` must be
  pinned in `package.json` in Inc-0 or a contributor on 22.21 gets an install failure with an
  unhelpful message.
- A build step now stands between source and browser. ADR-005 already accepted this — the client has
  no build step today and Inc-0 introduces one regardless.
- Schema validation is real work per endpoint and real bytes in the bundle. Accepted: the endpoint
  count is fixed and small, and P-7 is the demonstrated cost of not doing it.

**Blocked / unblocked.**
- **Unblocks** ADR-012 … ADR-016 and `specs/tech-stack.md`.
- **Does not unblock** any increment. Inc-0 remains gated on the §0.6 clock pin and a
  `git diff -- specs/features/` that comes back empty.

## Verification

Reproduced on the candidate stack — TypeScript 7.0.2, React 19.2.8, Vitest 4.1.11, Zod 4.4.3 — against
the running `api-mock/server.js`:

```
tsc --strict, contract-conforming sources        -> exit 0
tsc --strict, 5 deliberate contract violations   -> exit 1, 5 errors, 0 missed
typed-only fetch of /api/hotels/h-1/rooms        -> compiles clean; 5 rooms; every r.id undefined
schema-validated, wrong contract                 -> rejected at the boundary, 5 issues, field named
schema-validated, real payload                   -> accepted
```

`tsc` compiling the P-7 cast to exit code 0 is the single most important line above. It is the
evidence for §3 and the reason §4 exists.
