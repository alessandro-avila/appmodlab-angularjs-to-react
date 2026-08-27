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
  # Two headline findings, both caused by AngularJS scope inheritance:
  #
  #   * The status filter is DEAD. The filter buttons live inside an ng-if,
  #     which creates a child scope; "filterStatus = 'pending'" therefore writes
  #     a NEW property on the child and shadows the controller's. The
  #     controller's $watch never fires. The button lights up, so it looks like
  #     it worked, and nothing is filtered.
  #
  #   * Add Note is DEAD. The note box sits inside ng-repeat, so each row gets
  #     its own scope and typing writes newNote onto THAT row. addNote() reads
  #     the controller's newNote, which stays empty, and returns at its guard.
  #     No request, no note, no error.
  #
  # Both are proven twice over: once through the interface (nothing happens) and
  # once by driving the controller directly (the logic underneath is correct).
  # Scenarios that reach past the interface are tagged @bypasses-ui.
  #
  # The mock API keeps trips in a mutable module-level array, so cancelling an
  # item persists for the life of the server process. Scenarios that cancel are
  # tagged @mutates-fixture and the fixture is restored around them.
  #
  # ---------------------------------------------------------------------------
  # INCREMENT 3 — this screen is now React. What changed, and what did not:
  #
  #   SUPERSEDED (2)
  #     * the trip total is derived by the SERVER          Q-6  / ADR-020
  #     * a booked flight now reaches the itinerary        Q-3 / SEAM-3 / ADR-020
  #
  #   NET-NEW (5)
  #     * a booked hotel reaches the itinerary too         SEAM-3, second producer
  #     * printing, 4 scenarios                            ADR-017 (no baseline existed)
  #
  #   PRESERVED AGAINST THE PLAN (8)
  #     Increment plan §7.4 said to revive both dead controls because React has
  #     no scope chain. ADR-019 refuses: a control that starts working because
  #     the framework stopped preventing it is an unauthorised behaviour change.
  #     The status filter and Add Note are both still dead, deliberately, and
  #     @bypasses-ui stays at 3 where §7.4 predicted 0.
  #
  #   The two headline findings above therefore still stand, and are now
  #   reproduced on purpose rather than inherited.
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
  # PRESERVED by ADR-019, against increment plan §7.4.
  #
  # §7.4 classified the next four scenarios as SUPERSEDE, reasoning that React
  # has no scope chain so the filter starts working. It does — by accident, not
  # by decision. ADR-019 keeps it dead: the React route models both scopes
  # explicitly, so the button still highlights and nothing is still filtered.
  #
  # "the controller" below means the state behind the interface. In AngularJS
  # that was the controller scope; in React it is the parent value the filtering
  # logic reads, published through the test seam. The step wording is unchanged
  # deliberately (plan §1.4) — the contract should not churn for terminology.
  # ---------------------------------------------------------------------------
  Scenario Outline: Choosing a status highlights the button but filters nothing
    When I filter the itinerary by "<status>"
    Then the "<status>" filter button is highlighted
    But all 3 days are still shown
    And the statuses still shown are "confirmed, confirmed, pending, confirmed, confirmed"

    Examples:
      | status    |
      | Confirmed |
      | Pending   |
      | Cancelled |

  Scenario: The chosen status never reaches the controller
    When I filter the itinerary by "Pending"
    Then the controller still holds the status filter "all"
    And the controller has computed no filtered days

  @bypasses-ui
  Scenario: Set on the controller instead, the filter works — and keeps whole days
    # Proves the filtering logic is correct and merely unreachable. It also
    # shows the logic keeps a day WHOLE when any one item matches, so a
    # "pending" filter still displays the confirmed meeting alongside it.
    When I set the status filter to "pending" on the controller directly
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
  # PRESERVED by ADR-019, against increment plan §7.4.
  #
  # Add Note is dead control 2 of 4. §7.4 classified the next four scenarios as
  # SUPERSEDE; ADR-019 keeps the control inert. The note box still holds what
  # was typed and addNote() still reads a value the box never writes to, so it
  # returns at its guard — no request, no note, no notification.
  #
  # @bypasses-ui therefore stays at 3 for the suite, where §7.4 predicted 0.
  # The tag survives because the controls it reaches past survive.
  # ---------------------------------------------------------------------------
  Scenario: Typing a note and adding it does nothing at all
    When I type the note "Bring the signed contract" against the first itinerary row
    And I add that note
    Then no note request is sent
    And the first itinerary row carries no note
    And the note I typed is still sitting in the box
    And no notification is raised

  Scenario: The note I type never reaches the controller
    When I type the note "Bring the signed contract" against the first itinerary row
    Then the controller's note box is empty

  @bypasses-ui
  Scenario: Added through the controller, a note is credited to nobody in particular
    # currentUser is set only during the login exchange and never persisted —
    # localStorage holds the token alone. On any reload or restored session the
    # controller's fallback wins, so notes are credited to "You" rather than to
    # the person who wrote them.
    When I add the note "Bring the signed contract" by driving the controller directly
    Then the first itinerary row shows a note reading "Bring the signed contract"
    And that note is attributed to "You"
    And the portal does not remember who is signed in
    And a note request is sent carrying the text but no author

  @bypasses-ui
  Scenario: A note is shown immediately but never stored
    # The controller pushes the note into the local model before — and
    # regardless of — the server's answer, and the server reads a field the
    # client never sends. Reloading loses the note.
    When I add the note "Bring the signed contract" by driving the controller directly
    Then the first itinerary row shows a note reading "Bring the signed contract"
    But the server has stored no note against that item

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
