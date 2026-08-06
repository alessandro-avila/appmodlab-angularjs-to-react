# Green baseline for F-015 / F-016 / F-017 — Expense Reconciliation.
#
# Every scenario below describes what the AngularJS application does TODAY. It is a
# regression net for the React migration, not a statement of intent. Where the code
# is wrong, the scenario records the wrong behaviour and says so.
#
# Six findings were proved by execution against the running app and are pinned here so
# they survive into the migration as decisions rather than accidents:
#
#   1. THE DATE-RANGE FILTER IS ONE-WAY. `$watch('dateRange')` re-filters only when a
#      bound is set (`controller:50-54`). Clearing both dates leaves `filteredReports`
#      narrowed, so the table stays filtered while both inputs read empty. Touching the
#      search box or a status button escapes it, because those run through $watchGroup.
#
#   2. THE ERROR ALERT CANNOT BE DISMISSED. `ng-if="errorMessage"` creates a child scope;
#      `ng-click="errorMessage = ''"` writes to the child, never the controller
#      (`template:16-18`). Fourth confirmed instance of this defect class, after the
#      itinerary status filter, the itinerary Add Note control, and the travel-request
#      error alert.
#
#   3. THE DETAIL MODAL SHOWS TWO BLANK FIELDS. `getReportDetails` re-fetches the report
#      and does not re-apply `submittedFormatted` / `expenseCount` (`service:31-44`), both
#      of which the modal binds (`template:339`, `:351`). Every report shows "Submitted:"
#      with no date and " expense items" with no number.
#
#   4. THE STATUS FILTER AND SEARCH BOX WORK HERE. They sit outside every `ng-if`, and
#      both seeded reports carry `title` and `tripDestination`, so the unguarded
#      `.toLowerCase()` at `controller:102-103` has nothing to trip over. Contrast the
#      travel-request search, which is inert for exactly the opposite reason.
#
#   5. THE DRAFT FILTER BUTTON GIVES NO VISUAL CONFIRMATION. Its `ng-class` defines only
#      the unselected state (`template:245-246`), so selecting it strips `btn-default`
#      and adds nothing.
#
#   6. A SUBMITTED REPORT IS STORED AS A DRAFT. Neither side ever writes a status other
#      than 'draft' (`api-mock/server.js:625`), so the Approved tile is structurally $0.00
#      and a submitted report stays deletable. This is SEAM-4.
#
# Fixture: the seeded reports exp-1 (pending, $1875.50, 4 items) and exp-2 (draft,
# $250.00, 2 items, submittedAt null) are rebuilt before and after every scenario.

@existing-behavior @feature-expense-reconciliation
Feature: Expense reconciliation as the legacy portal performs it

  Background:
    Given I am signed in to the travel portal
    And I am on the expenses page

  # ---------------------------------------------------------------- dashboard

  Scenario: The spending dashboard summarises every stored report on arrival
    Then the expense dashboard shows "2" reports
    And the expense dashboard tile "Total Submitted" reads "$2,125.50"
    And the expense dashboard tile "Pending" reads "$1,875.50"
    And the expense dashboard tile "Avg per Report" reads "$1,062.75"

  Scenario: The approved total is structurally zero because no report can reach that status
    Then the expense dashboard tile "Approved" reads "$0.00"
    And no stored expense report has the status "approved"

  Scenario: This month's spending is zero because every seeded report predates the current month
    Then the expense dashboard tile "This Month" reads "$0.00"

  Scenario: The top spending category is derived across all reports but never displayed
    Then the derived top expense category is "flights"
    And no dashboard tile displays the top expense category

  Scenario: The dashboard is recomputed when a report is added
    When I start a new expense report
    And I name the expense report "Dashboard Refresh Check"
    And I enter an expense line for "Taxi" costing "60" under category "Ground Transport"
    And I add the expense line
    And I submit the expense report
    Then the expense dashboard shows "3" reports
    And the expense dashboard tile "Total Submitted" reads "$2,185.50"

  # ---------------------------------------------------------------- report list

  Scenario: Both seeded reports are listed with their formatted columns
    Then the expense report list contains "NYC Business Trip Expenses" and "Q1 Miscellaneous"
    And the expense report row "NYC Business Trip Expenses" reads:
      | destination | New York     |
      | items       | 4 items      |
      | total       | $1875.50     |
      | status      | pending      |
      | submitted   | Mar 20, 2024 |

  Scenario: A report with no submission date renders the words "Invalid date"
    Then the expense report row "Q1 Miscellaneous" shows the submitted column as "Invalid date"

  Scenario: The undated draft sorts above the dated report in a most-recent-first list
    Then the expense reports appear in the order "Q1 Miscellaneous, NYC Business Trip Expenses"

  Scenario: Delete is offered for a draft and withheld from a pending report
    Then the expense report "Q1 Miscellaneous" offers the actions "View, Delete"
    And the expense report "NYC Business Trip Expenses" offers the actions "View"

  # ---------------------------------------------------------------- status filter

  Scenario Outline: Filtering by status narrows the report list
    When I filter expense reports by "<status>"
    Then the expense report list contains exactly "<remaining>"

    Examples:
      | status   | remaining                  |
      | Pending  | NYC Business Trip Expenses |
      | Draft    | Q1 Miscellaneous           |

  Scenario: The filter controls belong to the controller scope, so the status filter works
    Then the expense status filter shares the controller scope
    And the expense search box shares the controller scope

  Scenario: The Draft filter is applied but the button shows no sign of being selected
    When I filter expense reports by "Draft"
    Then the expense filter is set to "draft"
    And the "Draft" expense filter button carries no highlight class
    And the "Pending" expense filter button carries a highlight class when selected

  Scenario: Filtering by a status no report holds offers to create a first report though two exist
    When I filter expense reports by "Rejected"
    Then no expense reports are listed
    And the expense empty state invites me to "CREATE YOUR FIRST REPORT"
    And 2 expense reports are still stored

  # ---------------------------------------------------------------- search

  Scenario: Searching by title narrows the list
    When I search expense reports for "nyc"
    Then the expense report list contains exactly "NYC Business Trip Expenses"

  Scenario: Searching by destination narrows the list
    When I search expense reports for "local"
    Then the expense report list contains exactly "Q1 Miscellaneous"

  Scenario: Search and status filter apply together
    When I filter expense reports by "Pending"
    And I search expense reports for "local"
    Then no expense reports are listed

  Scenario: A search that matches nothing keeps the typed text in the box
    When I search expense reports for "zzz-no-such-report"
    Then no expense reports are listed
    And the expense search box still reads "zzz-no-such-report"

  # ---------------------------------------------------------------- date range

  Scenario: A from-date excludes reports submitted before it
    When I set the expense from-date to "01/01/2025"
    Then no expense reports are listed

  Scenario: The undated draft is excluded by any date bound
    When I set the expense from-date to "01/01/2020"
    Then the expense report list contains exactly "NYC Business Trip Expenses"

  Scenario: Clearing the dates does not bring the reports back
    When I set the expense from-date to "01/01/2025"
    And I clear the expense from-date
    Then the expense from-date reads ""
    And the recorded expense date range is empty
    And no expense reports are listed

  Scenario: Touching the search box escapes the stuck date filter
    When I set the expense from-date to "01/01/2025"
    And I clear the expense from-date
    And I search expense reports for "a"
    And I search expense reports for ""
    Then the expense report list contains "NYC Business Trip Expenses" and "Q1 Miscellaneous"

  Scenario: The from-date has no calendar until the new report form is opened
    Then clicking the expense from-date opens no calendar
    When I start a new expense report
    Then clicking the expense from-date opens a calendar

  Scenario: Choosing a from-date from the calendar reaches the filter
    When I start a new expense report
    And I pick the first available day from the expense from-date calendar
    Then the recorded expense date range start is not empty

  # ---------------------------------------------------------------- the form

  Scenario: The new report button opens an empty form
    Then the new expense report button reads "NEW REPORT"
    When I start a new expense report
    Then the expense report form is open
    And the expense report form holds no line items

  Scenario: The category dropdown offers twelve values that no stored expense uses
    When I start a new expense report
    Then the expense category dropdown offers "Airfare, Hotel, Meals, Ground Transport, Car Rental, Fuel, Parking, Tips, Phone/Internet, Office Supplies, Entertainment, Other"
    And every stored expense line uses a category outside that list

  Scenario: The currency dropdown offers six values that change nothing
    When I start a new expense report
    Then the expense currency dropdown offers "USD, EUR, GBP, JPY, CAD, AUD"
    When I enter an expense line for "Paris metro" costing "18" under category "Ground Transport" in "EUR"
    And I add the expense line
    Then the expense line total is "18"
    And the expense line total is rendered as "$18.00"

  Scenario: Cancelling the form discards the title and every line item
    When I start a new expense report
    And I name the expense report "Will be discarded"
    And I enter an expense line for "Coffee" costing "7" under category "Meals"
    And I add the expense line
    And I cancel the expense report form
    Then the expense report form is closed
    When I start a new expense report
    Then the expense report title box is empty
    And the expense report form holds no line items

  # ---------------------------------------------------------------- line items

  Scenario: A complete line item is added, announced and totalled
    When I start a new expense report
    And I enter an expense line for "Client dinner" costing "84.25" under category "Meals"
    And I add the expense line
    Then the expense report form holds 1 line item
    And I see a notification containing "Expense item added"
    And the expense line table shows 1 row
    And the expense line total is rendered as "$84.25"
    And the expense category breakdown reads "Meals: $84.25"
    And the expense entry fields are cleared

  Scenario Outline: An incomplete line item is refused in silence with three fields flashed
    When I start a new expense report
    And I enter an expense line for "<description>" costing "<amount>" under category "Meals"
    And I add the expense line
    Then the expense report form holds no line items
    And 3 expense entry fields are flashed
    And no expense notification is raised

    Examples: description or amount missing, and zero counts as missing
      | description | amount |
      | Coffee      |        |
      |             | 9.99   |
      | Zero item   | 0      |

  Scenario: The flashed fields are the date, description and amount
    When I start a new expense report
    And I add the expense line
    Then the flashed expense fields are labelled "Date, Description, Amount"

  Scenario: The flash clears itself after three seconds
    When I start a new expense report
    And I add the expense line
    Then 3 expense entry fields are flashed
    And no expense entry field is flashed 3 seconds later

  Scenario: A line item with no category is accepted and buckets under a blank label
    When I start a new expense report
    And I enter an expense line for "Uncategorised item" costing "11.11"
    And I add the expense line
    Then the expense report form holds 1 line item
    And the first expense line has no category
    And the expense category breakdown has a blank label

  Scenario: Removing one of two line items recomputes the total
    When I start a new expense report
    And I enter an expense line for "Flight" costing "300" under category "Airfare"
    And I add the expense line
    And I enter an expense line for "Hotel" costing "200" under category "Hotel"
    And I add the expense line
    Then the expense line total is "500"
    When I remove the first expense line
    Then the expense report form holds 1 line item
    And the expense line total is "200"

  Scenario: Removing the last line item leaves a stale total in the model but hides it from view
    When I start a new expense report
    And I enter an expense line for "Only item" costing "42" under category "Meals"
    And I add the expense line
    Then the expense line total is "42"
    When I remove the first expense line
    Then the expense report form holds no line items
    And the expense line total is still "42"
    And the expense line table is hidden

  # ---------------------------------------------------------------- expense date

  Scenario: Picking an expense date fills the field with a raw JavaScript date string
    When I start a new expense report
    And I pick the first available day from the expense date calendar
    Then the expense date field shows a raw JavaScript date string

  Scenario: Future days cannot be chosen as an expense date
    When I start a new expense report
    And I open the expense date calendar
    Then the calendar cannot advance to the next month
    And most days in the expense date calendar are unselectable

  # ---------------------------------------------------------------- receipts

  Scenario: Attaching a receipt records the file name and marks the line item
    When I start a new expense report
    And I attach a receipt file to the expense entry
    Then the expense entry shows the attached receipt name
    When I enter an expense line for "Receipted taxi" costing "30" under category "Ground Transport"
    And I add the expense line
    Then the expense line table shows 1 paperclip

  Scenario: A line item without a receipt shows a dash
    When I start a new expense report
    And I enter an expense line for "No receipt here" costing "12" under category "Meals"
    And I add the expense line
    Then the expense line table shows 1 receipt dash

  # ---------------------------------------------------------------- submit

  Scenario: A report without a title is refused
    When I start a new expense report
    And I submit the expense report
    Then the expense error reads "Report title is required."
    And 2 expense reports are still stored

  Scenario: A titled report with no line items is refused
    When I start a new expense report
    And I name the expense report "Empty Report"
    And I submit the expense report
    Then the expense error reads "Add at least one expense item."

  Scenario: The expense error alert cannot be dismissed
    When I start a new expense report
    And I submit the expense report
    Then the expense error reads "Report title is required."
    When I press the close button on the expense error
    Then the expense error is still shown
    And the controller still holds the expense error message
    And the expense error alert sits on a different scope from the controller

  Scenario: A submitted report is stored as a draft, credited to Demo User, and stays deletable
    When I start a new expense report
    And I name the expense report "Berlin Client Visit"
    And I describe the expense trip destination as "Berlin, Germany"
    And I enter an expense line for "Hotel night" costing "120" under category "Hotel"
    And I add the expense line
    And I submit the expense report
    Then I see a notification containing "Expense report submitted successfully!"
    And the expense report form is closed
    And the stored expense report "Berlin Client Visit" has the status "draft"
    And the stored expense report "Berlin Client Visit" was submitted by "Demo User"
    And the stored expense report "Berlin Client Visit" carries a submission date
    And the expense report "Berlin Client Visit" offers the actions "View, Delete"

  Scenario: The notes field is stored with the report
    When I start a new expense report
    And I name the expense report "Noted Report"
    And I enter an expense line for "Parking" costing "15" under category "Parking"
    And I add the expense line
    And I note "Reimburse to personal account" on the expense report
    And I submit the expense report
    Then the stored expense report "Noted Report" carries the note "Reimburse to personal account"

  # ---------------------------------------------------------------- detail modal

  Scenario: Opening a report lists its lines and totals them by category
    When I open the expense report "NYC Business Trip Expenses"
    Then the expense detail dialogue is shown
    And the expense detail dialogue is titled "NYC Business Trip Expenses pending"
    And the expense detail dialogue lists 4 expense lines
    And the expense detail dialogue totals by category:
      | flights   | 930   |
      | hotels    | 750   |
      | meals     | 145.5 |
      | transport | 50    |

  Scenario: The detail dialogue shows no submission date and no item count
    When I open the expense report "NYC Business Trip Expenses"
    Then the expense detail dialogue shows "Submitted" as blank
    And the expense detail dialogue shows an unnumbered item count

  Scenario: A draft opens the same way and shows its own lines
    When I open the expense report "Q1 Miscellaneous"
    Then the expense detail dialogue is titled "Q1 Miscellaneous draft"
    And the expense detail dialogue lists 2 expense lines
    And the expense detail dialogue shows "Submitted By" as "Sarah Johnson"

  Scenario: The dialogue closes on Close
    When I open the expense report "Q1 Miscellaneous"
    And I close the expense detail dialogue
    Then the expense detail dialogue is hidden

  # ---------------------------------------------------------------- delete

  Scenario: Deleting a draft asks first and removes it from the server
    When I delete the expense report "Q1 Miscellaneous"
    Then I am asked "Are you sure you want to delete this expense report?"
    And I see a notification containing "Expense report deleted"
    And the expense report list contains exactly "NYC Business Trip Expenses"
    And 1 expense report is still stored

  Scenario: Declining the confirmation keeps the report
    When I decline to delete the expense report "Q1 Miscellaneous"
    Then the expense report list contains "NYC Business Trip Expenses" and "Q1 Miscellaneous"
    And 2 expense reports are still stored

  # ---------------------------------------------------------------- seams

  Scenario: A linked travel request id is stored without being checked (SEAM-5)
    When I start a new expense report
    And I name the expense report "Unlinked Report"
    And I link the expense report to travel request "does-not-exist-999"
    And I enter an expense line for "Rail fare" costing "45" under category "Ground Transport"
    And I add the expense line
    And I submit the expense report
    Then the stored expense report "Unlinked Report" is linked to travel request "does-not-exist-999"
    And no travel request "does-not-exist-999" exists on the server

  Scenario: There is no approval endpoint for an expense report (SEAM-4)
    Then the server refuses to approve an expense report
    And the server refuses to reject an expense report

  Scenario: The statistics route is shadowed by the report-by-id route
    Then requesting expense statistics returns "404"
    And the expense statistics error reads "Expense report not found"

  Scenario: The receipt endpoint answers even though the portal never calls it
    Then posting a receipt for expense "e-1" returns "200"

  Scenario: Expense reports are not served without a token
    Then requesting expense reports without a token returns "401"
