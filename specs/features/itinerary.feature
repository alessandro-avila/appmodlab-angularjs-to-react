@existing-behavior @feature-itinerary
Feature: Itinerary
  # Green baseline (Track A) — this file records what the legacy AngularJS
  # itinerary screen DOES TODAY, not what it ought to do. Several scenarios
  # below assert behaviour that is plainly wrong; that is deliberate. They are
  # the regression net the React migration has to break on purpose.
  #
  # Unlike flights and hotels, the trip fixtures are HARDCODED in the mock API
  # (server.js:142), not randomised — so these scenarios can assert literal
  # names, dates and amounts.
  #
  # Two headline findings, both caused by AngularJS scope inheritance — and both
  # RESOLVED in Increment 3, when the screen became React (ADR-005, ADR-022).
  # They are recorded here because the baseline pinned them and the superseding
  # scenarios below are only legible against what they replaced:
  #
  #   * The status filter WAS DEAD. The filter buttons live inside an ng-if,
  #     which creates a child scope; "filterStatus = 'pending'" therefore wrote
  #     a NEW property on the child and shadowed the controller's. The
  #     controller's $watch never fired. The button lit up, so it looked like
  #     it worked, and nothing was filtered.
  #
  #   * Add Note WAS DEAD. The note box sits inside ng-repeat, so each row got
  #     its own scope and typing wrote newNote onto THAT row. addNote() read
  #     the controller's newNote, which stayed empty, and returned at its guard.
  #     No request, no note, no error.
  #
  # Each was proven twice over: once through the interface (nothing happened)
  # and once by driving the controller directly (the logic underneath was
  # correct). That second kind of scenario carried @bypasses-ui. With both
  # controls reachable there is nothing left to reach past, and the tag is gone
  # from this file and from the suite.
  #
  # The mock API keeps trips in a mutable module-level array, so cancelling an
  # item persists for the life of the server process. Scenarios that cancel are
  # tagged @mutates-fixture and the fixture is restored around them.
  #
  # ---------------------------------------------------------------------------
  # INCREMENT 3 — this screen is now React. What changed, and what did not:
  #
  #   SUPERSEDED (11)
  #     * the trip total is derived by the SERVER          Q-6  / ADR-020
  #     * a booked flight now reaches the itinerary        Q-3 / SEAM-3 / ADR-020
  #     * the status filter WORKS, 5 scenarios             ADR-005 / ADR-022
  #     * Add Note WORKS, 4 scenarios                      ADR-005 / ADR-022
  #         - credited to the person who wrote it          ADR-003 C-1
  #         - and the note is actually stored              plan §7.4 row 23
  #
  #   NET-NEW (5)
  #     * a booked hotel reaches the itinerary too         SEAM-3, second producer
  #     * printing, 4 scenarios                            ADR-017 (no baseline existed)
  #
  #   @bypasses-ui is now ZERO across the whole suite. Every scenario that
  #   carried it existed only to reach behind a dead control; with both controls
  #   working, each becomes an ordinary UI scenario. The two headline findings
  #   in the block above are therefore RESOLVED, not reproduced — ADR-005
  #   classifies the four dead controls as Supersede, and ADR-022 records why
  #   that is authorisation rather than an accident of framework.
  # ---------------------------------------------------------------------------

  Background:
    Given I am signed in to the travel portal
    And I am on the itinerary page

  # ------------------------------------------------------------ the trip list

  Scenario: My trips are listed with the earliest first
    Then the trips listed are "NYC Business Trip, Chicago Conference"

  Scenario: A trip shows its dates and how long it lasts
    Then the trip "NYC Business Trip" shows the dates "Mar 15, 2024 - Mar 18, 2024"
    And the trip "NYC Business Trip" is described as lasting "3 days"

  Scenario: A trip's status is recomputed from today's date and overrides the stored one
    # The API sends status "upcoming" for both trips. The controller throws that
    # away and derives the status from the dates, which are in the past.
    Then the server describes every trip as "upcoming"
    But the trip "NYC Business Trip" is shown as "completed"
    And the trip "Chicago Conference" is shown as "completed"

  Scenario: A trip that has already happened does not show a countdown
    Then no trip shows a countdown to departure

  @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by Q-6 / ADR-020 — the total is now derived by the SERVER.
  #
  # `itinerary.service.js:19` used to overwrite what the API sent, so the server
  # said 2450 and the screen said $1,330.00. The server derives the total itself
  # now and the client renders what it is given, so the two agree.
  #
  # The stored 2450 stays in the fixture on purpose. Deriving on read rather
  # than correcting the fixture means that if the derivation is ever removed,
  # 2450 reappears and this scenario fails loudly instead of silently agreeing.
  # ---------------------------------------------------------------------------
  Scenario: A trip's cost is derived by the server from its items
    Then the server prices the trip "trip-1" at 1330
    And the trip "NYC Business Trip" is priced at "$1,330.00"

  Scenario: No trip shows a destination
    # The template binds trip.destination; the trips carry no such field.
    Then no trip in the list shows a destination

  Scenario: The earliest trip is opened without being asked for
    Then the open trip is "NYC Business Trip"

  # --------------------------------------------------------- the trip summary

  Scenario: The summary leaves transport out of its cards but keeps it in the total
    # Flights $930 + Hotels $350 + Activities $0 = $1,280, yet the total reads
    # $1,330. The missing $50 is the airport shuttle, which has no card.
    Then the summary cards read:
      | Flights    | $930.00   |
      | Hotels     | $350.00   |
      | Activities | $0.00     |
      | Total      | $1,330.00 |
    And the summary cards do not add up to the total shown

  Scenario: A trip without transport does add up
    When I open the trip "Chicago Conference"
    Then the summary cards read:
      | Flights    | $380.00   |
      | Hotels     | $280.00   |
      | Activities | $500.00   |
      | Total      | $1,160.00 |
    And the summary cards do add up to the total shown

  Scenario: The details heading ends with a separator and nothing after it
    # "{{selectedTrip.name}} — {{selectedTrip.destination}}" with no destination.
    Then the details heading begins "NYC Business Trip —"
    And the details heading has nothing after the separator

  # -------------------------------------------------------- the day breakdown

  Scenario: A day with no items is left out, and the numbering skips with it
    # 17 March has nothing booked, so it is absent — but 18 March keeps its
    # position and is labelled Day 4 of a trip described as lasting 3 days.
    Then the days shown are "Day 1, Day 2, Day 4"
    And the day headings read:
      | Day 1 — Friday, March 15   |
      | Day 2 — Saturday, March 16 |
      | Day 4 — Monday, March 18   |

  Scenario: Items inside a day are ordered by time
    Then the items on "Day 2" are ordered "Airport Shuttle, Client Meeting - Midtown"

  Scenario: Every row's headline is blank and only the smaller description carries the text
    # The template binds item.title; the items only carry description.
    Then no itinerary row shows a headline
    And the first itinerary row describes "SFO → JFK"

  Scenario: A row shows its time, status and cost
    Then the first itinerary row reads the time "8:30 AM"
    And the first itinerary row is labelled "confirmed"
    And the first itinerary row costs "$450.00"

  # ---------------------------------------------------------- the status filter

  @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005, per increment plan §7.4 rows 15-17.
  #
  # ADR-005's scenario classification lists "the four dead controls" under
  # Supersede — "the scenario encodes a defect that ADR-001/002 already decided
  # to fix" — and its rejection of the Fix-Bugs path says those defects "are
  # resolved by being reimplemented correctly". The status filter is one of the
  # four. It works.
  #
  # The three baseline scenarios this replaces asserted, in order: that the
  # button highlighted but nothing filtered; that the chosen status never
  # reached the controller; and — reaching past the interface — that the logic
  # underneath was correct all along. That last one was @bypasses-ui. All three
  # collapse into ordinary UI scenarios now that the control is reachable.
  # ---------------------------------------------------------------------------
  Scenario Outline: Choosing a status filters the itinerary to matching days
    When I filter the itinerary by "<status>"
    Then the "<status>" filter button is highlighted
    And the number of days shown is <days>

    Examples:
      | status    | days |
      | Confirmed | 3    |
      | Pending   | 1    |
      | Cancelled | 0    |

  @inc-3
  # SUPERSEDED by ADR-005. The chosen status now reaches the filtering logic —
  # this is the scenario that pinned the scope-shadowing defect (P-2) directly.
  Scenario: The chosen status reaches the filtering logic
    When I filter the itinerary by "Pending"
    Then the controller still holds the status filter "pending"
    And the controller has computed filtered days

  @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 — and @bypasses-ui is REMOVED.
  #
  # The baseline drove the controller directly, because the button could not
  # reach the logic. It can now, so the same assertion is made through the
  # interface. The behaviour proved here is unchanged: a day survives WHOLE when
  # any one of its items matches, so a "pending" filter still displays the
  # confirmed meeting that shares the day.
  # ---------------------------------------------------------------------------
  Scenario: Filtering keeps a whole day when any one item matches
    When I filter the itinerary by "Pending"
    Then only 1 day is still shown
    And the statuses still shown are "pending, confirmed"

  # -------------------------------------------------------- switching between trips

  Scenario: Opening another trip loads its own days and totals
    When I open the trip "Chicago Conference"
    Then the open trip is "Chicago Conference"
    And the days shown are "Day 1, Day 2"
    And the trip total reads "$1,160.00"

  Scenario: Opening a trip scrolls the page down to its details
    When I scroll back to the top
    And I open the trip "Chicago Conference"
    Then the page has scrolled away from the top

  # ------------------------------------------------------------------- notes

  @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005, per increment plan §7.4 rows 20-23.
  #
  # Add Note is dead control 2 of 4, and the same authorisation applies: ADR-005
  # classifies the four dead controls as Supersede, "resolved by being
  # reimplemented correctly". The note box now writes the draft that the add
  # button posts, so the control works.
  #
  # Two repairs travel with it, both named by §7.4:
  #
  #   row 22, ADR-003 C-1 — ATTRIBUTION. The legacy credited the note to
  #   $rootScope.currentUser, set only inside the login handler and never
  #   persisted, so the "You" fallback always won on a restored session. The
  #   note is now credited by the SERVER from the authenticated caller. That is
  #   a stronger repair than the plan anticipated: it needs no client-side
  #   identity, so it does not require the C-1 rehydration that auth-store.ts
  #   schedules for Inc-6, and authentication.feature:156/:165 stay green.
  #
  #   row 23 — PERSISTENCE. POST /api/itinerary-items/:id/notes read
  #   `req.body.notes` while every client posted `{ text, createdAt }`, so it
  #   stored `undefined` and also replaced the whole array. It appends now.
  # ---------------------------------------------------------------------------
  Scenario: Typing a note and adding it records the note
    When I type the note "Bring the signed contract" against the first itinerary row
    And I add that note
    Then a note request is sent
    And the first itinerary row shows a note reading "Bring the signed contract"
    And the note box is empty again
    And the last notification reads "Note added"

  @inc-3
  # SUPERSEDED by ADR-005. The typed note now reaches the logic that posts it —
  # this is the scenario that pinned the ngRepeat scope-shadowing directly.
  Scenario: The note I type reaches the add handler
    When I type the note "Bring the signed contract" against the first itinerary row
    Then the controller's note box holds "Bring the signed contract"

  @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 + ADR-003 C-1 — and @bypasses-ui is REMOVED.
  #
  # The baseline drove the controller because the box could not reach the
  # handler, and recorded the consequence: the note was credited to "You" and
  # the request carried no author at all. Both are repaired.
  # ---------------------------------------------------------------------------
  Scenario: A note is credited to the person who wrote it
    When I type the note "Bring the signed contract" against the first itinerary row
    And I add that note
    Then the first itinerary row shows a note reading "Bring the signed contract"
    And that note is attributed to "Sarah Johnson"

  @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by ADR-005 — and @bypasses-ui is REMOVED.
  #
  # The baseline pinned the note as shown-but-never-stored: the client pushed it
  # into the local model regardless of the server's answer, and the server read
  # a field the client never sent. What is shown is now what was stored, so a
  # reload keeps it.
  # ---------------------------------------------------------------------------
  Scenario: A note that is shown has been stored
    When I type the note "Bring the signed contract" against the first itinerary row
    And I add that note
    Then the first itinerary row shows a note reading "Bring the signed contract"
    And the server has stored that note against the item

  # -------------------------------------------------------------- cancelling

  @mutates-fixture
  Scenario: Cancelling asks me to confirm first
    When I cancel the item "Airport Shuttle"
    Then I am asked "Are you sure you want to cancel this item?"

  @mutates-fixture
  Scenario: Declining the confirmation cancels nothing
    When I decline to confirm cancelling the item "Airport Shuttle"
    Then no cancellation request is sent
    And the item "Airport Shuttle" is still labelled "pending"

  @mutates-fixture
  Scenario: Confirming marks the item cancelled and takes its button away
    When I cancel the item "Airport Shuttle"
    Then a cancellation request is sent for that item
    And the item "Airport Shuttle" is labelled "cancelled"
    And the item "Airport Shuttle" is shown in the cancelled style
    And the item "Airport Shuttle" can no longer be cancelled
    And the last notification reads "transport cancelled"

  @mutates-fixture
  # ---------------------------------------------------------------------------
  # PRESERVED, and it is the answer to increment plan §7.5.
  #
  # §7.5 carried this scenario as UNCLASSIFIED: Q-6 makes the total server-
  # derived but is silent on whether cancelled items are excluded. The Inc-3
  # gate answered INCLUDED (ADR-020), on the plan's own default — Q-6 moved who
  # computes the total, not what the total means.
  #
  # The assertion is unchanged but it now pins a SERVER behaviour, and it is the
  # regression test for anyone who later assumes "derived" implies "excludes
  # cancelled".
  # ---------------------------------------------------------------------------
  Scenario: A cancelled item still counts towards the trip total
    # The server sums every item regardless of status, so cancelling changes
    # nothing about what the trip appears to cost. Until Inc-3 this was
    # calculateTotals() in the client; it is the same rule, moved.
    Given the trip total reads "$1,330.00"
    When I cancel the item "Airport Shuttle"
    Then the trip total still reads "$1,330.00"

  # -------------------------------------------------------------- view modes

  Scenario: The timeline view replaces the list and drops the costs
    When I switch to the timeline view
    Then the list view is no longer on the page
    And the timeline shows 5 entries
    And the timeline shows no costs

  Scenario: Switching back restores the list
    When I switch to the timeline view
    And I switch back to the list view
    Then the list view is on the page again

  # --------------------------------------------------- cross-feature coupling

  @inc-3
  # ---------------------------------------------------------------------------
  # SUPERSEDED by Q-3 / SEAM-3 / ADR-020.
  #
  # The baseline pinned the seam as broken: "the booking POST succeeds and the
  # app announces it, but nothing is written to any trip". Q-3 decided a booking
  # must persist and appear on the itinerary, and SEAM-3 was marked
  # defect-to-fix, so both booking endpoints now append an itinerary item.
  #
  # The client half is query invalidation, not a store event: the booking
  # mutation invalidates the itinerary query and the data reloads. That is why
  # this scenario needs no event plumbing to observe — it just refetches.
  #
  # Both producers are pinned, because the plan requires SEAM-3 verified from
  # flight AND hotel.
  # ---------------------------------------------------------------------------
  Scenario: A booked flight reaches the itinerary
    Given I note how many itinerary items exist
    When I book a flight from the flight search page
    Then the flight booking is accepted
    And one more itinerary item exists than before
    And the itinerary shows the newly booked flight

  @inc-3
  # NET-NEW — the second producer. Nothing pinned the hotel side of SEAM-3 at
  # all, because in the baseline neither producer reached the consumer.
  Scenario: A booked hotel reaches the itinerary
    Given I note how many itinerary items exist
    When I book a hotel from the hotel booking page
    Then the hotel booking is accepted
    And one more itinerary item exists than before
    And the itinerary shows the newly booked hotel

  # ------------------------------------------------------------------- printing

  @inc-3
  # ---------------------------------------------------------------------------
  # NET-NEW — ADR-017. There is no baseline for printing.
  #
  # The legacy path cloned #itinerary-details into a popup and wrote a document
  # by hand, pulling Bootstrap from a CDN at print time. Track A never captured
  # it, because a popup plus a native print dialog was not drivable.
  #
  # It is drivable now: window.print is stubbed and asserted. These four
  # scenarios are the first coverage this control has ever had.
  # ---------------------------------------------------------------------------
  Scenario: Printing asks the browser to print the page it is on
    When I print the itinerary
    Then the browser is asked to print
    And no second window is opened

  @inc-3
  Scenario: The printed itinerary keeps the trip and its days
    When I print the itinerary
    Then the printed itinerary includes the trip summary
    And the printed itinerary includes every day of the trip

  @inc-3
  Scenario: The printed itinerary leaves out the controls
    # `printContent.find('.btn, .no-print').remove()` becomes @media print CSS.
    When I print the itinerary
    Then the printed itinerary leaves out the buttons
    And the printed itinerary leaves out the note boxes

  @inc-3
  Scenario: The printed page is titled Itinerary
    # The legacy popup set <title>Itinerary</title>, which browsers put in the
    # print header. Reproduced deliberately — ADR-017 change 3 of 4.
    When I print the itinerary
    Then the document was titled "Itinerary" while printing
    And the document title is restored afterwards
