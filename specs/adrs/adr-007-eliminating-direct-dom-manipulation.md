# ADR-007: Eliminating Direct DOM Manipulation

- **Status:** accepted
- **Date:** 2026-08-06
- **Deciders:** Product owner (hackathon), spec2cloud orchestrator
- **Related:** ADR-005 (path selection), ADR-006 (migration order)

## Context

The modernization assessment found **46 direct DOM-manipulation sites** in the client (finding P-1,
Critical). This is not incidental jQuery sprinkled over an otherwise declarative application. jQuery
owns validation display, modal visibility, animation, scroll position, print content and — in one
case — an entire widget's state. The framework is fighting the framework.

The sites are not 46 independent problems. They fall into **7 recurring patterns**, each repeated
across modules:

| Cat | Pattern | Sites | Where |
|---|---|---:|---|
| 1 | jQuery UI datepicker bound to a DOM id, `onSelect` → manual `$apply` | 8 | flight-search ×2, hotel-booking ×2, travel-request ×2, expense ×2 |
| 2 | Bootstrap 3 modal shown imperatively — `$('#x').modal('show')` | 3 | hotel-booking:241, travel-request:246, expense:223 |
| 3 | Scroll-into-view — `$('html, body').animate({scrollTop: …})` | 4 | flight-search:205, hotel-booking:204, itinerary:84, travel-request:156 |
| 4 | Show/hide with fade/slide, competing with `ng-if`/`ng-show` | 6 | expense:146, travel-request:139, itinerary:131/133, flight-search:104/126 |
| 5 | Validation flash — `addClass('has-error').delay(3000).queue(…)` | 4 | flight-search, hotel-booking, expense, travel-request |
| 6 | DOM as data source — `$('#itinerary-details').clone()` for print | 1 | itinerary:172 |
| 7 | Imperative input trigger — `$('#receiptFileInput').trigger('click')` | 1 | expense:248 |
| — | *(dead per Q-10)* `.css('transform')` loop driven by `.animate({dummy:1})` | 6 | approval-status.directive.js:97-103 |

Two aggravating factors make this Critical rather than High.

**Every category writes state the framework cannot see.** Modal visibility lives in a DOM class, not
in `$scope`. Field validity lives in a `has-error` class, not in a model. This is why eight manual
`$scope.$apply()` calls exist (finding P-4) — they drag jQuery's world back into the digest. One
(`expense.controller.js:256`) is a bare, unguarded `$apply()`.

**Category 5 is already inconsistent.** Three modules add `has-error` and remove it after 3 seconds;
`travel-request.controller.js:204` adds it and never removes it, so the field stays red until reload
(FRD limitation 13). The same intent has two different behaviours today, and a per-site migration
would faithfully preserve both.

If each of the 46 sites is migrated ad hoc by whoever happens to be in that file, the result is 46
micro-decisions, inconsistent outcomes across modules, and the same divergence re-created in React.

## Decision

**Decide per category, not per site. Seven decisions, applied uniformly.**

| Cat | Target pattern | Lands in |
|---|---|---|
| 1 | **One shared date-input component.** State lives in React; no DOM ids, no imperative init. Replaces all 8 sites *and* the abandoned `date-picker.directive.js`. | **Inc-0** |
| 2 | **Modals are rendered from state, not shown imperatively.** An `isOpen` boolean in the owning component drives a shared modal component with focus management. | **Inc-0** |
| 3 | **Scroll is a declarative effect on the target**, triggered by the state change that caused it — not an imperative call from the handler. | **Inc-0** |
| 4 | **Conditional rendering only.** Visibility is a render decision. Transitions, if kept, are CSS on the rendered element. Never two mechanisms on one element. | per increment |
| 5 | **Validation state is model state.** One error shape per form, one presentation, no timers. The 3-second auto-clear and the never-clearing variant are both superseded. | **Inc-0** (pattern), per increment (application) |
| 6 | **Print renders from data, not from cloned DOM.** A dedicated print view reads the same model the screen reads. | Inc-3 |
| 7 | **File input is driven by a ref**, not a selector-based synthetic click. | Inc-5 |

**Four categories must be resolved in Inc-0** — 1, 2, 3 and the *pattern* for 5 — because four of
five feature modules need them on day one and a later change would mean touching every already-
migrated module.

**Two supporting rules:**

- **No `document.querySelector`, no `getElementById`, and no direct style or class mutation** in
  migrated code. Where an imperative escape hatch is genuinely required (category 7), it goes through
  a React ref.
- **jQuery, jQuery UI and Bootstrap's JavaScript are removed when the last AngularJS module is
  removed**, not incrementally. They must remain loaded while any un-migrated module still uses them
  (findings D-5, D-6). Bootstrap **CSS** is unaffected and is carried forward per ADR-005.

**This ADR decides target patterns, not packages.** No date library, modal library, animation library
or form library is selected here. Those remain deferred to `tech-stack-resolution` per ADR-005. A
decision such as "modals render from state" constrains the choice without making it.

## Behavioural consequences that are not refactors

Three categories change what the user experiences, so they need new or amended Gherkin rather than a
re-pointed scenario:

- **Category 5 supersedes two different behaviours.** The 3-second flash disappears; so does
  travel-request's permanently red field. Whatever replaces them is net-new behaviour.
- **Category 2 adds focus management** that does not exist today (finding X-1: zero ARIA attributes,
  no focus trap on any modal).
- **Category 4 removes animation timing** that some baseline scenarios currently wait through.

These are recorded as behavioural deltas for the affected increments, per ADR-005's three-way
classification of the baseline.

## Alternatives Considered

### Port each site individually as its module is migrated

The default if nothing is decided. Rejected because it guarantees inconsistency: four datepicker
implementations instead of one, and category 5's existing divergence faithfully reproduced. It also
defers every cross-cutting decision into feature increments, where it competes for review attention
with product behaviour. The 46 sites are 7 problems; treating them as 46 is the error.

### Keep jQuery and call it from React effects

Genuinely cheaper in the short term — the datepicker and modal code would transfer nearly verbatim,
and the migration would move faster through Inc-1 and Inc-2. Rejected because it preserves the exact
defect the migration exists to remove: state living in the DOM where the framework cannot see it. It
would also make jQuery permanent, since nothing would ever force its removal, and it would carry
jQuery 2.2.4 (end-of-life) and jQuery UI (maintenance-only) into the new stack indefinitely. The
manual-sync problem would not disappear either — it would change shape from `$scope.$apply()` into
effect-dependency bugs, which are harder to spot.

### Adopt a component library that covers all seven categories at once

Attractive: one dependency supplies date input, modal, transitions and form validation with
accessibility already handled. Rejected **at this gate only, on grounds of authority rather than
merit** — selecting a component library is a `tech-stack-resolution` decision, and pre-empting it
here would violate ADR-005. This ADR is deliberately written to be satisfiable *by* such a library:
every target pattern above states a behavioural requirement that a component library could fulfil.
The decision is deferred, not foreclosed.

### Wrap jQuery behind an abstraction layer, migrate the layer later

The strangler pattern applied at the DOM level: define an interface, back it with jQuery, swap the
implementation once React is in place. Rejected because the abstraction would have to model
imperative DOM operations to be useful, and modelling `.animate().delay().queue()` in a React-facing
API is more work than replacing it. The layer would also be written once and deleted once, never
reaching a second consumer. Category 5's inconsistency would have to be encoded into the interface —
either two methods or a flag — which is inconsistency preserved in a nicer wrapper.

### Leave the dead category (approval-status.directive.js:97-103)

Not rejected — **adopted**. The 6 `.css('transform')` sites in `approval-status.directive.js` are in
dead code per Q-10 and are deleted unported along with the rest of the directive. They are counted in
this ADR's context for completeness and excluded from the 46 that need decisions.

## Consequences

**Positive**

- 46 sites collapse to 7 decisions, four of which land once in Inc-0 and are then reused five times.
- The `initDatepickers` quadruplication (P-3) is resolved by construction, and the abandoned
  `date-picker.directive.js` is finally superseded by something that has consumers.
- All 8 manual `$apply()` calls disappear with the digest cycle (P-4).
- Category 2's focus management is the first real accessibility improvement in the product (X-1).
- Validation state becomes inspectable in the model rather than discoverable only by reading class
  names (P-10, P-11).

**Negative**

- Inc-0 grows. Four cross-cutting components must exist before a single feature is migrated, which
  makes the first increment larger and its human gate less visually satisfying.
- Three categories change user-visible behaviour, so they generate new Gherkin rather than reusing
  baseline scenarios — additional specification work at each affected increment.
- jQuery cannot be removed until the last AngularJS module is gone, so the hybrid period carries both
  the old libraries and the new components. Bundle size is worse in the middle than at either end.

**Neutral**

- The category taxonomy is derived from the current code. If a migration uncovers an eighth pattern —
  plausibly in hotel-booking's never-rendered booking path (P-7) — this ADR is amended rather than
  bypassed.
