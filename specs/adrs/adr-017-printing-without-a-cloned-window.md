# ADR-017 — Printing: a print stylesheet replaces the cloned print window

- **Status:** proposed — decided at the Inc-3 PR Review gate
- **Date:** 2026-08-27
- **Phase:** 2 → increment 3 (`itinerary`)
- **Deciders:** product owner, orchestrator
- **Supersedes:** —
- **Depends on:** **ADR-007** (eliminating direct DOM manipulation — category 6), ADR-005 (path
  selection), increment plan **§7.1** and **§7.4**
- **Answers:** increment plan §7.4 *"the print view, which has no baseline at all"*

## Context

`itinerary.controller.js:170-182` prints by building a second document by hand:

```js
var printContent = $('#itinerary-details').clone();
printContent.find('.btn, .no-print').remove();
var printWindow = window.open('', '_blank');
printWindow.document.write('<html><head><title>Itinerary</title>');
printWindow.document.write('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">');
printWindow.document.write('</head><body class="container">');
printWindow.document.write(printContent.html());
printWindow.document.write('</body></html>');
printWindow.document.close();
printWindow.print();
```

This is the last of ADR-007's category 6 (`.clone()` into a detached document). It depends on jQuery,
on `window.open`, and — at the moment the user asks to print — on a **CDN being reachable**.

**There is no baseline scenario for this path.** The green baseline captured 32 itinerary scenarios
and none of them presses Print, because driving a popup and a native print dialog was out of scope for
Track A capture. So there is no recorded behaviour to preserve, and equally no recorded behaviour to
point at when deciding what "the same" would mean.

## Decision

**Print the live document with a print stylesheet and `window.print()`.** No second window, no clone,
no CDN fetch.

`@media print` hides everything except `#itinerary-details`, and hides `.no-print` and controls within
it — reproducing by CSS exactly what `printContent.find('.btn, .no-print').remove()` did by DOM
surgery.

## This is a behaviour change, and it is recorded as one

The instruction for this increment was explicit that if the printed output changes, that is a
behaviour change requiring a Gherkin delta and an ADR rather than a silent improvement. It does
change, in four ways:

| # | Legacy | Now | Why it is acceptable |
|---|--------|-----|----------------------|
| 1 | A popup window opens | Nothing opens | A popup blocker makes the legacy path throw — `window.open` returns `null` and `.document` is a TypeError. The new path cannot be blocked. |
| 2 | Styled by Bootstrap 3.3.7 fetched from `maxcdn.bootstrapcdn.com` at print time | Styled by the stylesheet already loaded | Offline, or with the CDN unreachable, the legacy print window renders unstyled. Removing a network dependency from a print action is a strict improvement in reliability, but it is still a change. |
| 3 | The print document's `<title>` is `Itinerary`, which browsers put in the page header | The document title of the app page | Reproduced deliberately: the route sets the document title while printing so the header still reads `Itinerary`. |
| 4 | Buttons and `.no-print` are **removed from a copy**; the live page is untouched | Buttons and `.no-print` are **hidden by CSS**; the live page is untouched | Same observable result on paper. |

Point 3 is the only one that would otherwise have been visible on the printed page, so it is
reproduced rather than accepted.

## Consequences

- jQuery `.clone()`, `.find().remove()`, and `window.open` all leave with this module.
- The printed content is the same subset of the page: trip summary, day panels, item rows — without
  buttons, the cancel column, or the note composers.
- **Testable for the first time.** `window.print` is stubbed in the harness and asserted; the legacy
  path could not be asserted at all, which is why no baseline exists. Four net-new scenarios cover it.
- If a future increment needs a genuinely different print layout (page breaks per day, for example),
  it is now a stylesheet change rather than a string-concatenated document.

## Alternatives considered

**Reproduce the popup faithfully.** Rejected: it would carry `window.open` and a CDN dependency into
the target stack to preserve behaviour that no scenario pins and that fails under a popup blocker.

**A dedicated `/itinerary/print` route.** Rejected as gold-plating — it solves a problem nobody
reported, and it would put a second rendering of the same data in the codebase, which is the drift
ADR-007 exists to prevent.
